import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import PDFDocument from 'pdfkit';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';
import { DocumentsService } from '../documents/documents.service';
import { EvidencePackService } from '../documents/evidence-pack.service';

interface DraftAgreementInput { reservationId: string; billingCycle: 'monthly' | 'fixed_term'; language: 'de' | 'en'; pricingSnapshot: object; terminationRules?: object; }

@Injectable()
export class AgreementsService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditService,
    private eventBus: EventBusService,
    private documents: DocumentsService,
    private evidencePack: EvidencePackService,
  ) {}

  async draftAgreement(input: DraftAgreementInput) {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({ where: { id: input.reservationId } });
    const terminationRules = input.terminationRules ?? (input.billingCycle === 'monthly' ? { noticeDays: 30 } : { noticeDays: 30, minimumMonths: 3 });
    const agreement = await this.prisma.agreement.create({ data: { reservationId: input.reservationId, tenantId: reservation.customerId, unitId: reservation.unitId, siteId: reservation.siteId, billingCycle: input.billingCycle, language: input.language, pricingSnapshot: input.pricingSnapshot, terminationRules } });
    await this.audit.record({ action: 'agreement.drafted', subjectType: 'Agreement', subjectId: agreement.id, siteId: reservation.siteId });
    return { agreementId: agreement.id, status: agreement.status };
  }

  async generateAgreementPdf(agreementId: string): Promise<Buffer> {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const customer = await this.prisma.customer.findUnique({ where: { id: agreement.tenantId } });
    const template = await this.prisma.agreementTemplate.findFirst({
      where: { siteId: agreement.siteId, language: agreement.language, active: true },
      orderBy: { version: 'desc' },
    });

    const personOrOrgData = (customer?.personOrOrgData as any) ?? {};
    const fullName = [personOrOrgData.firstName, personOrOrgData.lastName].filter(Boolean).join(' ');
    const tenantName = personOrOrgData.name ?? personOrOrgData.companyName ?? (fullName || 'Tenant');
    const pricingSnapshot = (agreement.pricingSnapshot as any) ?? {};
    const terminationRules = (agreement.terminationRules as any) ?? {};

    const placeholders: Record<string, string> = {
      agreementId: agreement.id,
      tenantName,
      unitId: agreement.unitId,
      siteId: agreement.siteId,
      billingCycle: agreement.billingCycle,
      language: agreement.language,
      status: agreement.status,
      effectiveFrom: agreement.effectiveFrom ? agreement.effectiveFrom.toISOString().slice(0, 10) : '',
      createdAt: agreement.createdAt.toISOString().slice(0, 10),
      pricingSnapshot: JSON.stringify(pricingSnapshot),
      amountMinor: pricingSnapshot.amountMinor != null ? String(pricingSnapshot.amountMinor) : '',
      terminationRules: JSON.stringify(terminationRules),
      noticeDays: terminationRules.noticeDays != null ? String(terminationRules.noticeDays) : '',
    };

    const rawBody = template?.body ?? [
      'Storage Rental Agreement',
      'Agreement: {{agreementId}}',
      'Tenant: {{tenantName}}',
      'Unit: {{unitId}} (Site: {{siteId}})',
      'Billing cycle: {{billingCycle}}',
      'Pricing: {{pricingSnapshot}}',
      'Termination rules: {{terminationRules}}',
      'Effective from: {{effectiveFrom}}',
      'Status: {{status}}',
    ].join('\n');

    const renderedBody = rawBody.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => placeholders[key] ?? '');

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Storage Rental Agreement', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      for (const line of renderedBody.split('\n')) {
        doc.text(line);
      }
      doc.end();
    });
  }

  async activateAgreement(agreementId: string, actorId: string) {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId } });
    if (!signatories.length || !signatories.every((s) => s.status === 'signed')) throw new DomainException(ErrorCodes.AGREEMENT_PREREQUISITE_MISSING, 'All signatories must sign before activation');
    const mandate = await this.prisma.mandate.findFirst({ where: { customerId: agreement.tenantId, status: 'active' } });
    if (!mandate) throw new DomainException(ErrorCodes.MANDATE_INCOMPLETE, 'Active payment mandate required');
    const activated = await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'active', effectiveFrom: new Date() } });

    const pdfBuffer = await this.generateAgreementPdf(agreementId);
    const document = await this.documents.storeGeneratedDocument({
      subjectType: 'Agreement',
      subjectId: agreementId,
      kind: 'agreement_pdf',
      buffer: pdfBuffer,
      locale: agreement.language,
      fileName: `agreement-${agreementId}.pdf`,
    });
    await this.evidencePack.createEvidencePack(document.id);

    await this.audit.record({ action: 'agreement.activated', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: agreement.siteId });
    this.eventBus.emit({ type: Events.AGREEMENT_ACTIVATED, payload: { agreementId, tenantId: agreement.tenantId, unitId: agreement.unitId, siteId: agreement.siteId, billingCycle: agreement.billingCycle, pricingSnapshot: agreement.pricingSnapshot }, meta: { workspaceId: '', siteId: agreement.siteId, actorId, occurredAt: new Date() } });
    return activated;
  }

  async signAgreement(agreementId: string, personId: string) {
    await this.prisma.signatory.create({ data: { agreementId, personId, status: 'signed', signedAt: new Date() } });
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId } });
    if (signatories.every((s) => s.status === 'signed')) await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'signed' } });
    return { agreementId, signed: true };
  }

  async requestMoveOut(agreementId: string, requestedDate: Date) {
    return this.prisma.terminationRequest.create({ data: { agreementId, requestedDate, status: 'pending' } });
  }
}
