import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class EvidencePackService {
  constructor(private prisma: PrismaClient) {}

  async createEvidencePack(documentId: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    const envelopes = await this.prisma.signatureEnvelope.findMany({ where: { documentId } });
    const events = envelopes.flatMap((e) => (e.events as any[]) ?? []);
    const payload = JSON.stringify({ documentId, documentHash: doc.hash, events, createdAt: new Date().toISOString() });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');
    return this.prisma.evidencePack.create({ data: { documentId, events, hash } });
  }
}
