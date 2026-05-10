import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaClient) {}
  async postEntry(params: { type: string; refType: string; refId: string; debitAccount: string; creditAccount: string; amountMinor: number; siteId?: string }) {
    return this.prisma.ledgerEntry.create({ data: params });
  }
  async getLedger(siteId: string, from?: Date, to?: Date) {
    return this.prisma.ledgerEntry.findMany({ where: { siteId, ...(from && to ? { createdAt: { gte: from, lte: to } } : {}) }, orderBy: { createdAt: 'asc' } });
  }
}
