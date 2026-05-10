import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaClient) {}
  async getInvoice(invoiceId: string) { return this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } }); }
  async getInvoicesForSite(siteId: string) { return this.prisma.invoice.findMany({ where: { siteId }, orderBy: { invoiceDate: 'desc' } }); }
}
