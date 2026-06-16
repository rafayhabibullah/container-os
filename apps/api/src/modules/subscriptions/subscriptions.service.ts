import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OrgPlan, PrismaClient } from '@prisma/client';
import { MollieAdapter } from '../payments/mollie.adapter';

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
    const appUrl = process.env.APP_URL ?? 'http://localhost:3001';
    const payment = await this.mollie.createPaymentLink({
      invoiceId: `subscription:${pending.id}`,
      amountMinor: this.billedAmount(plan, billingInterval),
      currency: 'EUR',
      description: `SiteLager ${plan} - ${billingInterval}`,
      redirectUrl: redirectUrl ?? `${appUrl}/billing?checkout=return`,
      webhookUrl: this.webhookUrl(),
      customerId,
      sequenceType: 'first',
      metadata: { type: 'subscription', subscriptionId: pending.id, organisationId },
    });
    await this.prisma.organisationSubscription.update({
      where: { id: pending.id },
      data: { providerPaymentId: payment.molliePaymentId, checkoutUrl: payment.checkoutUrl, lastPaymentStatus: 'open' },
    });
    return { requiresPayment: true, checkoutUrl: payment.checkoutUrl, subscriptionId: pending.id };
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
}
