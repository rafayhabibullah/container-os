import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException } from '@sitelager/domain-types';
import { validateMandateReference, generateMandateReference, escapeXml } from './sepa-validation';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class MandateService {
  constructor(
    private prisma: PrismaClient,
    private documents: DocumentsService,
  ) {}

  async createMandate(
    customerId: string,
    scheme: string,
    ibanLast4?: string,
    consentSource?: string,
    stripeSetupId?: string,
    reference?: string,
    creditorId?: string,
  ) {
    const ref = reference ?? generateMandateReference(customerId);
    validateMandateReference(ref);

    return this.prisma.mandate.create({
      data: { customerId, scheme: scheme as any, reference: ref, creditorId, ibanLast4, consentSource, stripeSetupId, status: 'pending' },
    });
  }

  async activateMandate(mandateId: string) {
    return this.prisma.mandate.update({ where: { id: mandateId }, data: { status: 'active', signedAt: new Date() } });
  }

  async listMandates(customerId: string) {
    return this.prisma.mandate.findMany({ where: { customerId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }

  /**
   * Generates a pain.008.001.02 "Customer Direct Debit Initiation" XML document
   * for the given mandates, and returns the raw XML string.
   */
  async generateDirectDebitXml(mandateIds: string[], collectionDate: Date, organisationId: string): Promise<string> {
    const organisation = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!organisation) {
      throw new BadRequestException(`Organisation ${organisationId} not found`);
    }

    const mandates = await this.prisma.mandate.findMany({
      where: { id: { in: mandateIds }, deletedAt: null },
      include: { customer: true },
    });

    if (mandates.length === 0) {
      throw new BadRequestException('No mandates found for the given IDs');
    }

    const fmtDate = (d: Date) => d.toISOString().split('T')[0];
    const fmtDateTime = (d: Date) => d.toISOString().split('.')[0];
    const reqdColltnDt = fmtDate(collectionDate);
    const now = new Date();

    const msgId = `MSG-${organisationId.slice(0, 8)}-${now.getTime()}`;
    const nbOfTxs = mandates.length;
    const ctrlSum = '0.00'; // amounts not modeled per-mandate at this stage

    const creditorIban = organisation.vatId ?? 'DE00000000000000000000';
    const creditorBic = 'NOTPROVIDED';
    const creditorName = escapeXml(organisation.legalName);

    const paymentInfos = mandates
      .map((mandate) => {
        const seqTp = mandate.signedAt ? 'RCUR' : 'FRST';
        const customerData = mandate.customer?.personOrOrgData as any;
        const debtorName = escapeXml(customerData?.name ?? customerData?.companyName ?? 'Unknown Debtor');
        const debtorIban = `DEXX${mandate.ibanLast4 ?? '0000'}`;
        const signedAt = mandate.signedAt ? fmtDate(mandate.signedAt) : fmtDate(now);
        const creditorIdValue = mandate.creditorId ?? '';

        return `    <PmtInf>
      <PmtInfId>PMT-${mandate.id}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>0.00</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>${mandate.scheme === 'sepa_b2b' ? 'B2B' : 'CORE'}</Cd></LclInstrm>
        <SeqTp>${seqTp}</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${reqdColltnDt}</ReqdColltnDt>
      <Cdtr><Nm>${creditorName}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${creditorIban}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId><BIC>${creditorBic}</BIC></FinInstnId></CdtrAgt>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${escapeXml(creditorIdValue)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>
      <DrctDbtTxInf>
        <PmtId><EndToEndId>${mandate.id}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">0.00</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(mandate.reference)}</MndtId>
            <DtOfSgntr>${signedAt}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt><FinInstnId><BIC>NOTPROVIDED</BIC></FinInstnId></DbtrAgt>
        <Dbtr><Nm>${debtorName}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${debtorIban}</IBAN></Id></DbtrAcct>
      </DrctDbtTxInf>
    </PmtInf>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${fmtDateTime(now)}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${ctrlSum}</CtrlSum>
      <InitgPty><Nm>${creditorName}</Nm></InitgPty>
    </GrpHdr>
${paymentInfos}
  </CstmrDrctDbtInitn>
</Document>`;
  }

  /**
   * Generates a pain.008 direct debit batch for the given mandates and stores it
   * as a document attached to the organisation.
   */
  async createDirectDebitBatch(organisationId: string, mandateIds: string[], collectionDate: Date) {
    const xml = await this.generateDirectDebitXml(mandateIds, collectionDate, organisationId);
    const fileName = `sepa-direct-debit-batch-${collectionDate.toISOString().split('T')[0]}.xml`;

    return this.documents.storeGeneratedDocument({
      subjectType: 'Organisation',
      subjectId: organisationId,
      kind: 'sepa_direct_debit_batch',
      buffer: Buffer.from(xml, 'utf-8'),
      fileName,
      contentType: 'application/xml',
    });
  }
}
