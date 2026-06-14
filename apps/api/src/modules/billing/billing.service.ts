import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface ListInvoicesFilter {
  siteId?: string;
  agreementId?: string;
  status?: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaClient) {}

  async getInvoice(invoiceId: string) {
    return this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } });
  }

  async getInvoicesForSite(siteId: string) {
    return this.prisma.invoice.findMany({ where: { siteId, deletedAt: null }, orderBy: { invoiceDate: 'desc' } });
  }

  async listInvoicesForOrg(organisationId: string, filter: ListInvoicesFilter) {
    const orgSites = await this.prisma.site.findMany({
      where: { organisationId },
      select: { id: true },
    });
    const orgSiteIds = orgSites.map((s) => s.id);

    const where: Record<string, unknown> = {
      siteId: { in: orgSiteIds },
      deletedAt: null,
    };
    if (filter.siteId) where.siteId = filter.siteId;
    if (filter.agreementId) where.agreementId = filter.agreementId;
    if (filter.status) where.status = filter.status;
    return this.prisma.invoice.findMany({
      where: where as any,
      orderBy: { invoiceDate: 'desc' },
      include: {
        lines: true,
        payments: { include: { attempts: true } },
        credits: true,
        agreement: {
          include: { customer: { select: { id: true, personOrOrgData: true } } },
        },
      },
    });
  }

  async getInvoiceDetail(invoiceId: string) {
    return this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        lines: true,
        payments: { include: { attempts: true } },
        credits: true,
        agreement: {
          include: { customer: { select: { id: true, personOrOrgData: true } } },
        },
      },
    });
  }

  async voidInvoice(invoiceId: string, reason: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (invoice.status === 'paid') throw new ForbiddenException('Cannot void a paid invoice');
    if (invoice.status === 'void') throw new ForbiddenException('Invoice is already void');
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'void' } });
    const creditNote = await this.prisma.creditNote.create({
      data: { invoiceId, amountMinor: invoice.totalMinor, reason },
    });
    return { invoiceId, status: 'void', creditNoteId: creditNote.id };
  }

  async createMolliePayment(invoiceId: string, mollieAdapter: any, redirectUrl: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { agreement: true },
    });
    const reference = `PAY-${uuidv4()}`;
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        method: 'bank_transfer',
        amountMinor: invoice.totalMinor,
        reference,
      },
    });
    const { checkoutUrl, molliePaymentId } = await mollieAdapter.createPaymentLink({
      invoiceId,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
      description: `Invoice ${invoiceId}`,
      redirectUrl,
    });
    await this.prisma.paymentAttempt.create({
      data: { paymentId: payment.id, provider: 'mollie', status: 'pending', providerRef: molliePaymentId },
    });
    return { checkoutUrl, paymentId: payment.id, molliePaymentId };
  }
}
