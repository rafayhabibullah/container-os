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

  async initiateUpload(customerId: string, kind: string, fileName: string, locale?: string, buffer?: Buffer) {
    const storageKey = `documents/${customerId}/${Date.now()}/${fileName}`;
    const fileBuffer = buffer ?? Buffer.alloc(0);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const scanResult = await this.documentScan.scan(fileBuffer);
    const doc = await this.prisma.document.create({
      data: { subjectType: 'Customer', subjectId: customerId, kind, storageKey, hash, locale, version: 1, scanStatus: scanResult },
    });
    const uploadUrl = await this.storage.getSignedUrl(storageKey, 900);
    return { documentId: doc.id, uploadUrl, status: 'awaiting_upload' };
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
}
