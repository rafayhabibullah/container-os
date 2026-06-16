import { Injectable } from '@nestjs/common';
import { createMollieClient, MollieClient } from '@mollie/api-client';
import { ChargeInvoiceParams, ChargeInvoiceResult, PaymentAdapter } from './payment-adapter.interface';

interface CreatePaymentLinkParams {
  invoiceId: string;
  amountMinor: number;
  currency: string;
  description: string;
  redirectUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, string>;
  customerId?: string;
  sequenceType?: 'oneoff' | 'first' | 'recurring';
}

@Injectable()
export class MollieAdapter implements PaymentAdapter {
  protected client: MollieClient;

  constructor() {
    this.client = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY ?? 'test_placeholder' });
  }

  isConfigured() {
    const apiKey = process.env.MOLLIE_API_KEY;
    return Boolean(apiKey && /^(test|live)_/.test(apiKey) && !apiKey.includes('placeholder') && apiKey !== 'test_...');
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<{ checkoutUrl: string; molliePaymentId: string }> {
    const value = (params.amountMinor / 100).toFixed(2);
    const payment = await this.client.payments.create({
      amount: { value, currency: params.currency },
      description: params.description,
      redirectUrl: params.redirectUrl,
      webhookUrl: params.webhookUrl,
      metadata: params.metadata ?? { invoiceId: params.invoiceId },
      customerId: params.customerId,
      sequenceType: params.sequenceType,
    } as any);
    const checkoutUrl = (payment as any)._links?.checkout?.href ?? '';
    return { checkoutUrl, molliePaymentId: payment.id };
  }

  async createCustomer(name: string, email: string) {
    const customer = await this.client.customers.create({ name, email });
    return { customerId: customer.id };
  }

  createOrganisationOnboardingLink(params: { organisationId: string; returnUrl: string; state: string }) {
    const clientId = process.env.MOLLIE_CONNECT_CLIENT_ID;
    if (!clientId) {
      const fallback = new URL(process.env.MOLLIE_CONNECT_FALLBACK_URL ?? 'https://www.mollie.com/dashboard');
      fallback.searchParams.set('state', params.state);
      fallback.searchParams.set('organisationId', params.organisationId);
      fallback.searchParams.set('returnUrl', params.returnUrl);
      return { onboardingUrl: fallback.toString(), mode: 'manual' };
    }
    const url = new URL('https://www.mollie.com/oauth2/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', params.returnUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('approval_prompt', 'auto');
    url.searchParams.set('scope', 'payments.write payments.read organizations.read');
    url.searchParams.set('state', params.state);
    return { onboardingUrl: url.toString(), mode: 'oauth' };
  }

  async createRecurringSubscription(params: { customerId: string; amountMinor: number; currency: string; interval: string; description: string; webhookUrl?: string; metadata?: object }) {
    const subscription = await (this.client as any).customerSubscriptions.create({
      customerId: params.customerId,
      amount: { value: (params.amountMinor / 100).toFixed(2), currency: params.currency },
      interval: params.interval,
      description: params.description,
      webhookUrl: params.webhookUrl,
      metadata: params.metadata,
    });
    return { subscriptionId: subscription.id };
  }

  async cancelRecurringSubscription(customerId: string, subscriptionId: string) {
    await (this.client as any).customerSubscriptions.cancel(subscriptionId, { customerId });
  }

  async getPayment(molliePaymentId: string): Promise<{ status: string; metadata?: Record<string, string>; customerId?: string }> {
    const payment = await this.client.payments.get(molliePaymentId);
    return { status: payment.status, metadata: (payment as any).metadata, customerId: (payment as any).customerId };
  }

  /**
   * Mollie is redirect-based (no server-side charge against a stored
   * payment method id). To satisfy the common PaymentAdapter interface,
   * this creates a payment link and returns the Mollie payment id as the
   * provider reference; the actual status transition arrives via the
   * Mollie webhook (see MollieWebhookController).
   */
  async chargeInvoice(params: ChargeInvoiceParams): Promise<ChargeInvoiceResult> {
    const { molliePaymentId } = await this.createPaymentLink({
      invoiceId: params.invoiceId,
      amountMinor: params.amountMinor,
      currency: params.currency,
      description: `Invoice ${params.invoiceId}`,
      redirectUrl: process.env.MOLLIE_REDIRECT_URL ?? 'https://app.sitelager.de/payments/return',
    });
    return { providerRef: molliePaymentId, status: 'pending' };
  }

  async getPaymentStatus(molliePaymentId: string): Promise<string> {
    const payment = await this.client.payments.get(molliePaymentId);
    return payment.status;
  }

  mapMollieStatus(mollieStatus: string): 'pending' | 'pending_settlement' | 'succeeded' | 'failed' {
    switch (mollieStatus) {
      case 'paid': return 'succeeded';
      case 'authorized': return 'pending_settlement';
      case 'pending': case 'open': return 'pending';
      default: return 'failed';
    }
  }
}
