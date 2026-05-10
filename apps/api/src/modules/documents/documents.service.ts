import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StorageService } from './storage.service';
import { EvidencePackService } from './evidence-pack.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaClient, private storage: StorageService, private evidencePack: EvidencePackService, private audit: AuditService) {}

  async initiateUpload(customerId: string, kind: string, fileName: string, locale?: string) {
    const storageKey = `documents/${customerId}/${Date.now()}/${fileName}`;
    const doc = await this.prisma.document.create({ data: { subjectType: 'Customer', subjectId: customerId, kind, storageKey, hash: 'pending', locale } });
    const uploadUrl = await this.storage.getSignedUrl(storageKey, 900);
    return { documentId: doc.id, uploadUrl, status: 'awaiting_upload' };
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
}
