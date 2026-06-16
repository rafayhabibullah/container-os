import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OrgPlan, PrismaClient } from '@prisma/client';
import { MollieAdapter } from '../payments/mollie.adapter';
import PDFDocument from 'pdfkit';

const PLANS: Record<OrgPlan, { basePriceMinor: number; includedSites: number; includedUnits: number; extraUnitPriceMinor: number; marketplaceRateBp: number }> = {
  free: { basePriceMinor: 0, includedSites: 1, includedUnits: 10, extraUnitPriceMinor: 0, marketplaceRateBp: 700 },
  starter: { basePriceMinor: 4900, includedSites: 1, includedUnits: 50, extraUnitPriceMinor: 50, marketplaceRateBp: 500 },
  professional: { basePriceMinor: 14900, includedSites: 5, includedUnits: 500, extraUnitPriceMinor: 30, marketplaceRateBp: 350 },
  enterprise: { basePriceMinor: 39900, includedSites: 100, includedUnits: 100000, extraUnitPriceMinor: 10, marketplaceRateBp: 200 },
};

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaClient, private readonly mollie: MollieAdapter) {}

  getPlans() {
    return PLANS;
  }

  getCurrent(organisationId: string) {
    return this.prisma.organisationSubscription.findFirst({
      where: { organisationId, status: { in: ['trial', 'active', 'past_due'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private periodEnd(billingInterval: string) {
    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (billingInterval === 'yearly' ? 12 : 1));
    return { now, currentPeriodEnd };
  }

  private billedAmount(plan: OrgPlan, billingInterval: string) {
    const monthly = PLANS[plan].basePriceMinor;
    return billingInterval === 'yearly' ? monthly * 10 : monthly;
  }

  private async nextSubscriptionInvoiceNumber() {
    const count = await this.prisma.subscriptionInvoice.count();
    const year = new Date().getFullYear();
    return `SL-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  private invoiceAmounts(totalMinor: number) {
    const netMinor = Math.round(totalMinor / 1.19);
    return { netMinor, vatMinor: totalMinor - netMinor, totalMinor };
  }

  private sellerSnapshot() {
    return {
      name: process.env.SITELAGER_LEGAL_NAME ?? 'SiteLager GmbH',
      address: process.env.SITELAGER_LEGAL_ADDRESS ?? 'Germany',
      vatId: process.env.SITELAGER_VAT_ID ?? null,
      taxNumber: process.env.SITELAGER_TAX_NUMBER ?? null,
      billingEmail: process.env.SITELAGER_BILLING_EMAIL ?? 'billing@sitelager.com',
    };
  }

  private async createSubscriptionInvoice(params: {
    organisation: { id: string; legalName: string; billingEmail: string; vatId?: string | null; taxNumber?: string | null; countryCode: string };
    subscriptionId: string;
    plan: OrgPlan;
    billingInterval: string;
    periodStart: Date;
    periodEnd: Date;
  }) {
    const amount = this.billedAmount(params.plan, params.billingInterval);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const invoice = await this.prisma.subscriptionInvoice.create({
      data: {
        organisationId: params.organisation.id,
        subscriptionId: params.subscriptionId,
        invoiceNumber: await this.nextSubscriptionInvoiceNumber(),
        plan: params.plan,
        billingInterval: params.billingInterval,
        status: 'open',
        currency: 'EUR',
        ...this.invoiceAmounts(amount),
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        dueDate,
        lineItems: [{ kind: 'saas_subscription', description: `SiteLager ${params.plan} (${params.billingInterval})`, amountMinor: amount, vatRate: 0.19 }],
        sellerSnapshot: this.sellerSnapshot(),
        buyerSnapshot: {
          organisationId: params.organisation.id,
          legalName: params.organisation.legalName,
          billingEmail: params.organisation.billingEmail,
          vatId: params.organisation.vatId,
          taxNumber: params.organisation.taxNumber,
          countryCode: params.organisation.countryCode,
        },
      },
    });
    return invoice;
  }

  private webhookUrl() {
    const publicUrl = process.env.API_PUBLIC_URL;
    if (!publicUrl) return undefined;
    try {
      const url = new URL(publicUrl);
      if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) return undefined;
      return `${url.origin}/api/v1/webhooks/mollie`;
    } catch {
      return undefined;
    }
  }

  async activateFree(organisationId: string) {
    const { now, currentPeriodEnd } = this.periodEnd('monthly');
    const current = await this.getCurrent(organisationId);
    if (current?.providerCustomerId && current.providerSubscriptionId) {
      await this.mollie.cancelRecurringSubscription(current.providerCustomerId, current.providerSubscriptionId);
    }
    await this.prisma.organisationSubscription.updateMany({
      where: { organisationId, status: { in: ['trial', 'active', 'past_due'] } },
      data: { status: 'replaced' },
    });
    const subscription = await this.prisma.organisationSubscription.create({
      data: { organisationId, plan: 'free', billingInterval: 'monthly', ...PLANS.free, status: 'active', currentPeriodStart: now, currentPeriodEnd },
    });
    await this.prisma.organisation.update({ where: { id: organisationId }, data: { plan: 'free' } });
    return subscription;
  }

  async createCheckout(organisationId: string, plan: OrgPlan, billingInterval = 'monthly', redirectUrl?: string) {
    if (!PLANS[plan]) throw new BadRequestException('UNKNOWN_PLAN');
    if (!['monthly', 'yearly'].includes(billingInterval)) throw new BadRequestException('INVALID_BILLING_INTERVAL');
    if (plan === 'free') return { requiresPayment: false, subscription: await this.activateFree(organisationId) };
    if (!this.mollie.isConfigured()) {
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Secure payment checkout is not configured yet.',
      });
    }

    const organisation = await this.prisma.organisation.findUniqueOrThrow({ where: { id: organisationId } });
    const current = await this.getCurrent(organisationId);
    let customerId = current?.providerCustomerId;
    if (!customerId) customerId = (await this.mollie.createCustomer(organisation.legalName, organisation.billingEmail)).customerId;

    const { now, currentPeriodEnd } = this.periodEnd(billingInterval);
    await this.prisma.organisationSubscription.updateMany({ where: { organisationId, status: 'pending_payment' }, data: { status: 'replaced' } });
    const pending = await this.prisma.organisationSubscription.create({
      data: { organisationId, plan, billingInterval, ...PLANS[plan], provider: 'mollie', providerCustomerId: customerId, status: 'pending_payment', currentPeriodStart: now, currentPeriodEnd },
    });
    const invoice = await this.createSubscriptionInvoice({
      organisation,
      subscriptionId: pending.id,
      plan,
      billingInterval,
      periodStart: now,
      periodEnd: currentPeriodEnd,
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const payment = await this.mollie.createPaymentLink({
      invoiceId: invoice.invoiceNumber,
      amountMinor: invoice.totalMinor,
      currency: 'EUR',
      description: `${invoice.invoiceNumber} SiteLager ${plan} - ${billingInterval}`,
      redirectUrl: redirectUrl ?? `${appUrl}/billing?checkout=return`,
      webhookUrl: this.webhookUrl(),
      customerId,
      sequenceType: 'first',
      metadata: { type: 'subscription', subscriptionId: pending.id, organisationId, subscriptionInvoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
    });
    await this.prisma.organisationSubscription.update({
      where: { id: pending.id },
      data: { providerPaymentId: payment.molliePaymentId, checkoutUrl: payment.checkoutUrl, lastPaymentStatus: 'open' },
    });
    await this.prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: { provider: 'mollie', providerPaymentId: payment.molliePaymentId, checkoutUrl: payment.checkoutUrl },
    });
    return { requiresPayment: true, checkoutUrl: payment.checkoutUrl, subscriptionId: pending.id, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber };
  }

  async handlePaymentWebhook(providerPaymentId: string) {
    const payment = await this.mollie.getPayment(providerPaymentId);
    const pending = await this.prisma.organisationSubscription.findUnique({ where: { providerPaymentId } });
    if (!pending) {
      const subscriptionId = payment.metadata?.subscriptionId;
      if (!subscriptionId) return false;
      const subscription = await this.prisma.organisationSubscription.findUnique({ where: { id: subscriptionId } });
      if (!subscription) return false;
      const successful = payment.status === 'paid';
      const { now, currentPeriodEnd } = this.periodEnd(subscription.billingInterval);
      await this.prisma.organisationSubscription.update({
        where: { id: subscription.id },
        data: successful
          ? { status: 'active', lastPaymentStatus: payment.status, currentPeriodStart: now, currentPeriodEnd }
          : { status: ['failed', 'canceled', 'expired'].includes(payment.status) ? 'past_due' : subscription.status, lastPaymentStatus: payment.status },
      });
      return true;
    }
    await this.prisma.organisationSubscription.update({ where: { id: pending.id }, data: { lastPaymentStatus: payment.status } });
    await this.prisma.subscriptionInvoice.updateMany({
      where: { OR: [{ providerPaymentId }, { subscriptionId: pending.id, status: { in: ['open', 'draft'] } }] },
      data: {
        status: payment.status === 'paid' ? 'paid' : ['failed', 'canceled', 'expired'].includes(payment.status) ? 'failed' : 'open',
        paidAt: payment.status === 'paid' ? new Date() : undefined,
      },
    });
    if (payment.status !== 'paid') {
      if (['failed', 'canceled', 'expired'].includes(payment.status)) {
        await this.prisma.organisationSubscription.update({ where: { id: pending.id }, data: { status: 'payment_failed' } });
      }
      return true;
    }
    if (pending.status === 'active') return true;
    const recurring = await this.mollie.createRecurringSubscription({
      customerId: pending.providerCustomerId!,
      amountMinor: this.billedAmount(pending.plan, pending.billingInterval),
      currency: 'EUR',
      interval: pending.billingInterval === 'yearly' ? '12 months' : '1 month',
      description: `SiteLager ${pending.plan}`,
      webhookUrl: this.webhookUrl(),
      metadata: { type: 'subscription_recurring', subscriptionId: pending.id, organisationId: pending.organisationId },
    });
    await this.prisma.organisationSubscription.updateMany({
      where: { organisationId: pending.organisationId, status: { in: ['trial', 'active', 'past_due'] } },
      data: { status: 'replaced' },
    });
    await this.prisma.organisationSubscription.update({
      where: { id: pending.id },
      data: { status: 'active', providerSubscriptionId: recurring.subscriptionId, checkoutUrl: null },
    });
    await this.prisma.organisation.update({ where: { id: pending.organisationId }, data: { plan: pending.plan } });
    return true;
  }

  async reconcileCheckout(organisationId: string) {
    const pending = await this.prisma.organisationSubscription.findFirst({
      where: { organisationId, status: 'pending_payment', providerPaymentId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending?.providerPaymentId) return { reconciled: false, paymentStatus: null, subscription: await this.getCurrent(organisationId) };
    const payment = await this.mollie.getPayment(pending.providerPaymentId);
    await this.handlePaymentWebhook(pending.providerPaymentId);
    const subscription = await this.prisma.organisationSubscription.findUnique({ where: { id: pending.id } });
    return { reconciled: true, paymentStatus: payment.status, subscription };
  }

  async changePlan(organisationId: string, plan: OrgPlan, billingInterval = 'monthly') {
    return this.createCheckout(organisationId, plan, billingInterval);
  }

  async recordMarketplaceCommission(params: { organisationId: string; reservationId?: string; agreementId?: string; invoiceId?: string; source: string; baseMinor: number }) {
    const subscription = await this.getCurrent(params.organisationId);
    const eligible = params.source === 'marketplace' && Boolean(subscription?.marketplaceRateBp);
    const rateBp = eligible ? subscription!.marketplaceRateBp : 0;
    return this.prisma.commissionRecord.create({
      data: { ...params, eligible, rateBp, amountMinor: Math.round(params.baseMinor * rateBp / 10_000), status: eligible ? 'accrued' : 'not_applicable' },
    });
  }

  listCommissions(organisationId: string) {
    return this.prisma.commissionRecord.findMany({ where: { organisationId }, orderBy: { createdAt: 'desc' } });
  }

  listInvoices(organisationId: string) {
    return this.prisma.subscriptionInvoice.findMany({ where: { organisationId }, orderBy: { invoiceDate: 'desc' } });
  }

  getInvoice(organisationId: string, invoiceId: string) {
    return this.prisma.subscriptionInvoice.findFirstOrThrow({ where: { id: invoiceId, organisationId } });
  }

  async generateInvoicePdf(organisationId: string, invoiceId: string) {
    const invoice = await this.prisma.subscriptionInvoice.findFirstOrThrow({ where: { id: invoiceId, organisationId } });
    const seller = invoice.sellerSnapshot as { name?: string; address?: string; vatId?: string | null; taxNumber?: string | null; billingEmail?: string };
    const buyer = invoice.buyerSnapshot as { legalName?: string; billingEmail?: string; vatId?: string | null; taxNumber?: string | null; countryCode?: string };
    const lineItems = invoice.lineItems as { description?: string; amountMinor?: number; vatRate?: number }[];
    const money = (minor: number) => `${(minor / 100).toFixed(2)} ${invoice.currency}`;

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);

      pdf.fontSize(20).text(`Rechnung ${invoice.invoiceNumber}`);
      pdf.moveDown(0.5).fontSize(10).fillColor('#475569');
      pdf.text(`Rechnungsdatum: ${invoice.invoiceDate.toLocaleDateString('de-DE')}`);
      pdf.text(`Faellig am: ${invoice.dueDate.toLocaleDateString('de-DE')}`);
      if (invoice.paidAt) pdf.text(`Bezahlt am: ${invoice.paidAt.toLocaleDateString('de-DE')}`);

      pdf.moveDown().fillColor('#0f172a').fontSize(12).text('Leistungserbringer', { underline: true });
      pdf.fontSize(10).text(seller.name ?? 'SiteLager');
      pdf.text(seller.address ?? 'Germany');
      if (seller.vatId) pdf.text(`USt-IdNr.: ${seller.vatId}`);
      if (seller.taxNumber) pdf.text(`Steuernummer: ${seller.taxNumber}`);
      if (seller.billingEmail) pdf.text(seller.billingEmail);

      pdf.moveDown().fontSize(12).text('Rechnungsempfaenger', { underline: true });
      pdf.fontSize(10).text(buyer.legalName ?? 'Organisation');
      if (buyer.billingEmail) pdf.text(buyer.billingEmail);
      if (buyer.vatId) pdf.text(`USt-IdNr.: ${buyer.vatId}`);
      if (buyer.taxNumber) pdf.text(`Steuernummer: ${buyer.taxNumber}`);
      if (buyer.countryCode) pdf.text(`Land: ${buyer.countryCode}`);

      pdf.moveDown().fontSize(12).text('Abrechnungszeitraum', { underline: true });
      pdf.fontSize(10).text(`${invoice.periodStart.toLocaleDateString('de-DE')} - ${invoice.periodEnd.toLocaleDateString('de-DE')}`);
      pdf.text(`Plan: ${invoice.plan} (${invoice.billingInterval})`);

      pdf.moveDown().fontSize(12).text('Positionen', { underline: true });
      pdf.moveDown(0.25);
      for (const item of lineItems) {
        pdf.fontSize(10).text(item.description ?? 'SiteLager Subscription', { continued: true });
        pdf.text(money(item.amountMinor ?? 0), { align: 'right' });
      }

      pdf.moveDown();
      pdf.fontSize(10).text(`Netto: ${money(invoice.netMinor)}`, { align: 'right' });
      pdf.text(`USt. ${(invoice.vatRate * 100).toFixed(0)}%: ${money(invoice.vatMinor)}`, { align: 'right' });
      pdf.fontSize(13).fillColor('#0f172a').text(`Gesamt: ${money(invoice.totalMinor)}`, { align: 'right' });
      pdf.moveDown().fontSize(9).fillColor('#64748b').text(`Status: ${invoice.status}`);
      pdf.text('Diese Rechnung wurde elektronisch durch SiteLager erstellt.');
      pdf.end();
    });

    return { fileName: `${invoice.invoiceNumber}.pdf`, buffer };
  }
}
