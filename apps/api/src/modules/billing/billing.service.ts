import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
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

  private async organisationSiteIds(organisationId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId }, select: { id: true } });
    return sites.map((site) => site.id);
  }

  private async assertInvoiceInOrganisation(invoiceId: string, organisationId: string) {
    const siteIds = await this.organisationSiteIds(organisationId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, siteId: { in: siteIds }, deletedAt: null },
      include: { lines: true },
    });
    if (!invoice) throw new NotFoundException('INVOICE_NOT_FOUND');
    return invoice;
  }

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

  async getInvoiceDetail(invoiceId: string, organisationId?: string) {
    const siteIds = organisationId ? await this.organisationSiteIds(organisationId) : undefined;
    return this.prisma.invoice.findFirstOrThrow({
      where: { id: invoiceId, ...(siteIds ? { siteId: { in: siteIds } } : {}) },
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

  async voidInvoice(invoiceId: string, reason: string, organisationId?: string) {
    const invoice = organisationId
      ? await this.assertInvoiceInOrganisation(invoiceId, organisationId)
      : await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (invoice.status === 'paid') throw new ForbiddenException('Cannot void a paid invoice');
    if (invoice.status === 'void') throw new ForbiddenException('Invoice is already void');
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'void' } });
    const creditNote = await this.prisma.creditNote.create({
      data: { invoiceId, amountMinor: invoice.totalMinor, reason },
    });
    return { invoiceId, status: 'void', creditNoteId: creditNote.id };
  }

  async createMolliePayment(invoiceId: string, mollieAdapter: any, redirectUrl: string, organisationId?: string) {
    const siteIds = organisationId ? await this.organisationSiteIds(organisationId) : undefined;
    const invoice = siteIds
      ? await this.prisma.invoice.findFirstOrThrow({
          where: { id: invoiceId, siteId: { in: siteIds } },
          include: { agreement: true },
        })
      : await this.prisma.invoice.findUniqueOrThrow({
          where: { id: invoiceId },
          include: { agreement: true },
        });
    const reference = `PAY-${uuidv4()}`;
    const site = await (this.prisma.site as any)?.findUnique?.({ where: { id: invoice.siteId }, select: { organisationId: true } });
    const invoiceOrganisationId = organisationId ?? site?.organisationId ?? undefined;
    const paymentAccount = invoiceOrganisationId
      ? await (this.prisma as any).organisationPaymentAccount.findUnique({ where: { organisationId_provider: { organisationId: invoiceOrganisationId, provider: 'mollie' } } })
      : null;
    if (invoiceOrganisationId && paymentAccount?.status !== 'connected') {
      throw new ForbiddenException('Organisation Mollie account must be connected before tenant payments can be collected');
    }
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
      metadata: {
        invoiceId,
        organisationId: invoiceOrganisationId ?? '',
        organisationPaymentAccountId: paymentAccount?.id ?? '',
      },
    });
    await this.prisma.paymentAttempt.create({
      data: { paymentId: payment.id, provider: 'mollie', status: 'pending', providerRef: molliePaymentId },
    });
    if (invoiceOrganisationId) {
      const reservation = await this.prisma.reservation.findUnique({ where: { id: invoice.agreement.reservationId }, select: { source: true } }).catch(() => null);
      const subscription = await this.prisma.organisationSubscription.findFirst({
        where: { organisationId: invoiceOrganisationId, status: { in: ['trial', 'active', 'past_due'] } },
        orderBy: { createdAt: 'desc' },
      });
      const eligible = ['marketplace', 'public', 'instant_booking'].includes(reservation?.source ?? '');
      const rateBp = eligible ? (subscription?.marketplaceRateBp ?? 0) : 0;
      await this.prisma.commissionRecord.create({
        data: {
          organisationId: invoiceOrganisationId,
          reservationId: invoice.agreement.reservationId,
          agreementId: invoice.agreementId,
          invoiceId,
          source: reservation?.source ?? 'manual',
          eligible,
          rateBp,
          baseMinor: invoice.totalMinor,
          amountMinor: Math.round(invoice.totalMinor * rateBp / 10_000),
          currency: invoice.currency,
          status: eligible && rateBp > 0 ? 'accrued' : 'not_applicable',
        },
      }).catch(() => undefined);
    }
    return { checkoutUrl, paymentId: payment.id, molliePaymentId };
  }
}
