import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { StorageService } from './storage.service';
import { EvidencePackService } from './evidence-pack.service';
import { AuditService } from '../audit/audit.service';
import { DocumentScanService } from './document-scan.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaClient,
    private storage: StorageService,
    private evidencePack: EvidencePackService,
    private audit: AuditService,
    private documentScan: DocumentScanService,
  ) {}

  private controlsForKind(kind: string) {
    const sensitiveKinds = new Set(['tenant_id', 'id_document', 'sepa_mandate', 'signed_contract', 'evidence_pack']);
    const retainedKinds = new Set(['contract_pdf', 'signed_contract', 'invoice_pdf', 'credit_note_pdf', 'evidence_pack', 'termination_notice', 'deposit_deduction_notice']);
    const retentionUntil = retainedKinds.has(kind)
      ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000)
      : undefined;
    return {
      sensitivity: sensitiveKinds.has(kind) ? 'sensitive' : 'normal',
      retentionUntil,
      locked: ['signed_contract', 'evidence_pack'].includes(kind),
    };
  }

  async initiateUpload(customerId: string, kind: string, fileName: string, locale?: string, buffer?: Buffer) {
    const storageKey = `documents/${customerId}/${Date.now()}/${fileName}`;
    const fileBuffer = buffer ?? Buffer.alloc(0);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const scanResult = await this.documentScan.scan(fileBuffer);
    const doc = await this.prisma.document.create({
      data: { subjectType: 'Customer', subjectId: customerId, kind, storageKey, hash, locale, version: 1, scanStatus: scanResult, ...this.controlsForKind(kind) } as any,
    });
    const uploadUrl = await this.storage.getSignedUrl(storageKey, 900);
    return { documentId: doc.id, uploadUrl, status: 'awaiting_upload' };
  }

  async completeUpload(documentId: string, buffer: Buffer, contentType: string, actorId?: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    if ((doc as any).locked) throw new Error('Locked documents cannot be overwritten');
    const scanResult = await this.documentScan.scan(buffer);
    const { hash } = await this.storage.uploadSafe(doc.storageKey, buffer, contentType);
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: { hash, scanStatus: scanResult },
    });
    if (actorId) await this.logAccess(documentId, actorId, 'upload_completed');
    return updated;
  }

  async storeGeneratedDocument(params: { subjectType: string; subjectId: string; kind: string; buffer: Buffer; locale?: string; fileName?: string; contentType?: string }) {
    const fileName = params.fileName ?? `${params.kind}.pdf`;
    const storageKey = `documents/${params.subjectType.toLowerCase()}/${params.subjectId}/${Date.now()}/${fileName}`;
    const { hash } = await this.storage.uploadSafe(storageKey, params.buffer, params.contentType ?? 'application/pdf');
    return this.prisma.document.create({
      data: {
        subjectType: params.subjectType,
        subjectId: params.subjectId,
        kind: params.kind,
        storageKey,
        hash,
        locale: params.locale,
        version: 1,
        scanStatus: 'clean',
        ...this.controlsForKind(params.kind),
      },
    });
  }

  async getDownloadUrl(storageKey: string) {
    return this.storage.getSignedUrl(storageKey, 900);
  }

  async logAccess(documentId: string, actorId: string, action: string) {
    return this.prisma.documentAccessLog.create({ data: { documentId, actorId, action } });
  }

  async createSignatureEnvelope(documentId: string) {
    return this.prisma.signatureEnvelope.create({ data: { documentId, provider: 'internal', status: 'pending', events: [] } });
  }

  async completeSignature(envelopeId: string, personId: string) {
    const event = { type: 'signed', personId, at: new Date().toISOString() };
    const envelope = await this.prisma.signatureEnvelope.update({ where: { id: envelopeId }, data: { status: 'signed', events: [event] } });
    await this.evidencePack.createEvidencePack(envelope.documentId);
    await this.audit.record({ action: 'document.signed', subjectType: 'SignatureEnvelope', subjectId: envelopeId });
    return { envelopeId, status: 'signed' };
  }

  async getTenantDocuments(tenantId: string) {
    return this.prisma.document.findMany({ where: { subjectType: 'Customer', subjectId: tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async createVersion(params: { previousDocumentId: string; buffer: Buffer; fileName?: string; contentType?: string; actorId?: string }) {
    const previous = await this.prisma.document.findUniqueOrThrow({ where: { id: params.previousDocumentId } });
    if ((previous as any).locked) throw new Error('Locked documents cannot be versioned');
    const latest = await this.prisma.document.findFirst({
      where: { subjectType: previous.subjectType, subjectId: previous.subjectId, kind: previous.kind },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? previous.version) + 1;
    const fileName = params.fileName ?? `${previous.kind}-v${version}.pdf`;
    const storageKey = `documents/${previous.subjectType.toLowerCase()}/${previous.subjectId}/${Date.now()}/${fileName}`;
    const scanStatus = await this.documentScan.scan(params.buffer);
    const { hash } = await this.storage.uploadSafe(storageKey, params.buffer, params.contentType ?? 'application/pdf');
    const doc = await this.prisma.document.create({
      data: {
        subjectType: previous.subjectType,
        subjectId: previous.subjectId,
        kind: previous.kind,
        storageKey,
        hash,
        locale: previous.locale,
        version,
        previousVersionId: latest?.id ?? previous.id,
        scanStatus,
        ...this.controlsForKind(previous.kind),
      },
    });
    if (params.actorId) await this.logAccess(doc.id, params.actorId, 'version_created');
    return doc;
  }
}
