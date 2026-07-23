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

type SubscriptionInvoiceStatus = 'open' | 'paid' | 'failed';

interface BillingPeriod {
  start: Date;
  end: Date;
  amountMinor: number;
  billingReason: 'subscription_start' | 'initial_proration' | 'subscription_cycle';
  proration?: { daysCharged: number; daysInMonth: number };
}

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

  private billedAmount(plan: OrgPlan, billingInterval: string) {
    const monthly = PLANS[plan].basePriceMinor;
    return billingInterval === 'yearly' ? monthly * 10 : monthly;
  }

  private addBillingInterval(start: Date, billingInterval: string) {
    const end = new Date(start);
    if (billingInterval === 'yearly') {
      end.setUTCFullYear(end.getUTCFullYear() + 1);
      return end;
    }
    const originalDay = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const daysInTargetMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(originalDay, daysInTargetMonth));
    return end;
  }

  private initialBillingPeriod(plan: OrgPlan, billingInterval: string, start = new Date()): BillingPeriod {
    const fullAmount = this.billedAmount(plan, billingInterval);
    if (billingInterval === 'yearly') {
      return {
        start,
        end: this.addBillingInterval(start, billingInterval),
        amountMinor: fullAmount,
        billingReason: 'subscription_start',
      };
    }

    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    const day = start.getUTCDate();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const daysCharged = daysInMonth - day + 1;
    const end = new Date(Date.UTC(year, month + 1, 1));
    const prorated = day > 1;

    return {
      start,
      end,
      amountMinor: prorated ? Math.round(fullAmount * daysCharged / daysInMonth) : fullAmount,
      billingReason: prorated ? 'initial_proration' : 'subscription_start',
      proration: prorated ? { daysCharged, daysInMonth } : undefined,
    };
  }

  private recurringBillingPeriod(subscription: { currentPeriodEnd: Date; plan: OrgPlan; billingInterval: string }): BillingPeriod {
    return {
      start: subscription.currentPeriodEnd,
      end: this.addBillingInterval(subscription.currentPeriodEnd, subscription.billingInterval),
      amountMinor: this.billedAmount(subscription.plan, subscription.billingInterval),
      billingReason: 'subscription_cycle',
    };
  }

  private async nextSubscriptionInvoiceNumber() {
    const year = new Date().getFullYear();
    const sequence = await this.prisma.subscriptionInvoiceSequence.upsert({
      where: { year },
      create: { year, nextNumber: 2 },
      update: { nextNumber: { increment: 1 } },
      select: { nextNumber: true },
    });
    return `SL-${year}-${String(sequence.nextNumber - 1).padStart(6, '0')}`;
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
    amountMinor?: number;
    billingReason?: BillingPeriod['billingReason'];
    proration?: BillingPeriod['proration'];
    status?: SubscriptionInvoiceStatus;
    paidAt?: Date;
    providerPaymentId?: string;
  }) {
    const amount = params.amountMinor ?? this.billedAmount(params.plan, params.billingInterval);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const planPrice = this.billedAmount(params.plan, params.billingInterval);
    const description = params.billingReason === 'initial_proration'
      ? `SiteLager ${params.plan} - anteiliger erster Monat`
      : `SiteLager ${params.plan} (${params.billingInterval})`;
    const invoice = await this.prisma.subscriptionInvoice.create({
      data: {
        organisationId: params.organisation.id,
        subscriptionId: params.subscriptionId,
        invoiceNumber: await this.nextSubscriptionInvoiceNumber(),
        plan: params.plan,
        billingInterval: params.billingInterval,
        billingReason: params.billingReason ?? 'subscription_cycle',
        status: params.status ?? 'open',
        currency: 'EUR',
        ...this.invoiceAmounts(amount),
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        dueDate,
        paidAt: params.paidAt,
        provider: params.providerPaymentId ? 'mollie' : undefined,
        providerPaymentId: params.providerPaymentId,
        lineItems: [{
          kind: 'saas_subscription',
          description,
          amountMinor: amount,
          unitAmountMinor: planPrice,
          vatRate: 0.19,
          servicePeriodStart: params.periodStart.toISOString(),
          servicePeriodEnd: params.periodEnd.toISOString(),
          ...(params.proration ? { proration: params.proration } : {}),
        }],
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
    const period = this.initialBillingPeriod('free', 'monthly');
    const current = await this.getCurrent(organisationId);
    if (current?.providerCustomerId && current.providerSubscriptionId) {
      await this.mollie.cancelRecurringSubscription(current.providerCustomerId, current.providerSubscriptionId);
    }
    await this.prisma.organisationSubscription.updateMany({
      where: { organisationId, status: { in: ['trial', 'active', 'past_due'] } },
      data: { status: 'replaced' },
    });
    const subscription = await this.prisma.organisationSubscription.create({
      data: {
        organisationId,
        plan: 'free',
        billingInterval: 'monthly',
        ...PLANS.free,
        status: 'active',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
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

    const period = this.initialBillingPeriod(plan, billingInterval);
    await this.prisma.organisationSubscription.updateMany({ where: { organisationId, status: 'pending_payment' }, data: { status: 'replaced' } });
    const pending = await this.prisma.organisationSubscription.create({
      data: {
        organisationId,
        plan,
        billingInterval,
        ...PLANS[plan],
        provider: 'mollie',
        providerCustomerId: customerId,
        status: 'pending_payment',
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
    });
    const invoice = await this.createSubscriptionInvoice({
      organisation,
      subscriptionId: pending.id,
      plan,
      billingInterval,
      periodStart: period.start,
      periodEnd: period.end,
      amountMinor: period.amountMinor,
      billingReason: period.billingReason,
      proration: period.proration,
    });
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const payment = await this.mollie.createPaymentLink({
      invoiceId: invoice.invoiceNumber,
      amountMinor: invoice.totalMinor,
      currency: 'EUR',
      description: `${invoice.invoiceNumber} SiteLager ${plan} - ${billingInterval}`,
      redirectUrl: redirectUrl ?? `${appUrl}/settings/billing?checkout=return`,
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
    return {
      requiresPayment: true,
      checkoutUrl: payment.checkoutUrl,
      subscriptionId: pending.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      billing: {
        reason: period.billingReason,
        periodStart: period.start,
        periodEnd: period.end,
        amountMinor: period.amountMinor,
        proration: period.proration ?? null,
      },
    };
  }

  private invoiceStatusForPayment(paymentStatus: string): SubscriptionInvoiceStatus {
    if (paymentStatus === 'paid') return 'paid';
    if (['failed', 'canceled', 'expired'].includes(paymentStatus)) return 'failed';
    return 'open';
  }

  private async handleInitialPayment(
    pending: {
      id: string;
      organisationId: string;
      plan: OrgPlan;
      billingInterval: string;
      providerCustomerId: string | null;
      status: string;
      currentPeriodEnd: Date;
    },
    providerPaymentId: string,
    paymentStatus: string,
  ) {
    await this.prisma.organisationSubscription.update({
      where: { id: pending.id },
      data: { providerPaymentId, lastPaymentStatus: paymentStatus },
    });
    await this.prisma.subscriptionInvoice.updateMany({
      where: { OR: [{ providerPaymentId }, { subscriptionId: pending.id, status: { in: ['open', 'draft'] } }] },
      data: {
        provider: 'mollie',
        providerPaymentId,
        status: this.invoiceStatusForPayment(paymentStatus),
        paidAt: paymentStatus === 'paid' ? new Date() : undefined,
      },
    });

    if (paymentStatus !== 'paid') {
      if (['failed', 'canceled', 'expired'].includes(paymentStatus)) {
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
      startDate: pending.currentPeriodEnd.toISOString().slice(0, 10),
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

  private async handleRecurringPayment(
    subscription: {
      id: string;
      organisationId: string;
      plan: OrgPlan;
      billingInterval: string;
      status: string;
      currentPeriodEnd: Date;
    },
    providerPaymentId: string,
    paymentStatus: string,
  ) {
    const invoiceStatus = this.invoiceStatusForPayment(paymentStatus);
    const existingInvoice = await this.prisma.subscriptionInvoice.findUnique({ where: { providerPaymentId } });
    let invoice = existingInvoice;

    if (!invoice) {
      const organisation = await this.prisma.organisation.findUniqueOrThrow({ where: { id: subscription.organisationId } });
      const period = this.recurringBillingPeriod(subscription);
      invoice = await this.createSubscriptionInvoice({
        organisation,
        subscriptionId: subscription.id,
        plan: subscription.plan,
        billingInterval: subscription.billingInterval,
        periodStart: period.start,
        periodEnd: period.end,
        amountMinor: period.amountMinor,
        billingReason: period.billingReason,
        status: invoiceStatus,
        paidAt: paymentStatus === 'paid' ? new Date() : undefined,
        providerPaymentId,
      });
    } else if (invoice.status !== invoiceStatus) {
      invoice = await this.prisma.subscriptionInvoice.update({
        where: { id: invoice.id },
        data: {
          status: invoiceStatus,
          paidAt: paymentStatus === 'paid' ? new Date() : invoice.paidAt,
        },
      });
    }

    const becamePaid = paymentStatus === 'paid' && existingInvoice?.status !== 'paid';
    await this.prisma.organisationSubscription.update({
      where: { id: subscription.id },
      data: becamePaid
        ? {
            status: 'active',
            lastPaymentStatus: paymentStatus,
            currentPeriodStart: invoice.periodStart,
            currentPeriodEnd: invoice.periodEnd,
          }
        : {
            status: invoiceStatus === 'failed' ? 'past_due' : subscription.status,
            lastPaymentStatus: paymentStatus,
          },
    });
    return true;
  }

  async handlePaymentWebhook(providerPaymentId: string) {
    const payment = await this.mollie.getPayment(providerPaymentId);
    const pendingByPayment = await this.prisma.organisationSubscription.findUnique({ where: { providerPaymentId } });
    if (pendingByPayment) {
      return this.handleInitialPayment(pendingByPayment, providerPaymentId, payment.status);
    }

    const subscriptionId = payment.metadata?.subscriptionId;
    const subscription = subscriptionId
      ? await this.prisma.organisationSubscription.findUnique({ where: { id: subscriptionId } })
      : payment.subscriptionId
        ? await this.prisma.organisationSubscription.findFirst({ where: { providerSubscriptionId: payment.subscriptionId } })
        : null;
    if (!subscription) return false;
    if (subscription.status === 'pending_payment' || subscription.status === 'payment_failed') {
      return this.handleInitialPayment(subscription, providerPaymentId, payment.status);
    }
    return this.handleRecurringPayment(subscription, providerPaymentId, payment.status);
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

  async getBillingOverview(organisationId: string) {
    const [subscription, invoices] = await Promise.all([
      this.getCurrent(organisationId),
      this.listInvoices(organisationId),
    ]);
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
    const outstandingInvoices = invoices.filter((invoice) => ['open', 'past_due'].includes(invoice.status));

    return {
      subscription,
      invoices,
      totals: {
        paidMinor: paidInvoices.reduce((sum, invoice) => sum + invoice.totalMinor, 0),
        outstandingMinor: outstandingInvoices.reduce((sum, invoice) => sum + invoice.totalMinor, 0),
        paidInvoiceCount: paidInvoices.length,
        invoiceCount: invoices.length,
      },
      nextCharge: subscription && subscription.plan !== 'free'
        ? {
            date: subscription.currentPeriodEnd,
            estimatedAmountMinor: this.billedAmount(subscription.plan, subscription.billingInterval),
            currency: 'EUR',
          }
        : null,
      billingPolicy: !subscription
        ? null
        : subscription.billingInterval === 'monthly'
          ? {
              type: subscription.currentPeriodEnd.getUTCDate() === 1 ? 'calendar_month' : 'anniversary_month',
              firstPeriodProrated: subscription.currentPeriodEnd.getUTCDate() === 1,
            }
          : { type: 'annual_anniversary', firstPeriodProrated: false },
    };
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
    const lineItems = invoice.lineItems as {
      description?: string;
      amountMinor?: number;
      vatRate?: number;
      proration?: { daysCharged?: number; daysInMonth?: number };
    }[];
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
      const servicePeriodEnd = new Date(invoice.periodEnd.getTime() - 24 * 60 * 60 * 1000);
      pdf.fontSize(10).text(`${invoice.periodStart.toLocaleDateString('de-DE')} - ${servicePeriodEnd.toLocaleDateString('de-DE')}`);
      pdf.text(`Plan: ${invoice.plan} (${invoice.billingInterval})`);
      if (invoice.billingReason === 'initial_proration') {
        pdf.text('Abrechnungsart: Anteiliger erster Kalendermonat');
      } else if (invoice.billingReason === 'subscription_cycle') {
        pdf.text('Abrechnungsart: Regulaere Abonnementverlaengerung');
      }

      pdf.moveDown().fontSize(12).text('Positionen', { underline: true });
      pdf.moveDown(0.25);
      for (const item of lineItems) {
        pdf.fontSize(10).text(item.description ?? 'SiteLager Subscription', { continued: true });
        pdf.text(money(item.amountMinor ?? 0), { align: 'right' });
        if (item.proration?.daysCharged && item.proration.daysInMonth) {
          pdf.fontSize(9).fillColor('#64748b').text(
            `${item.proration.daysCharged} von ${item.proration.daysInMonth} Kalendertagen`,
          );
          pdf.fillColor('#0f172a');
        }
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
