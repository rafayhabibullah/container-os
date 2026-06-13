import { Injectable } from '@nestjs/common';
import { createMollieClient, MollieClient } from '@mollie/api-client';
import { ChargeInvoiceParams, ChargeInvoiceResult, PaymentAdapter } from './payment-adapter.interface';

interface CreatePaymentLinkParams {
  invoiceId: string;
  amountMinor: number;
  currency: string;
  description: string;
  redirectUrl: string;
}

@Injectable()
export class MollieAdapter implements PaymentAdapter {
  protected client: MollieClient;

  constructor() {
    this.client = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY ?? 'test_placeholder' });
  }

  async createPaymentLink(params: CreatePaymentLinkParams): Promise<{ checkoutUrl: string; molliePaymentId: string }> {
    const value = (params.amountMinor / 100).toFixed(2);
    const payment = await this.client.payments.create({
      amount: { value, currency: params.currency },
      description: params.description,
      redirectUrl: params.redirectUrl,
      metadata: { invoiceId: params.invoiceId },
    });
    const checkoutUrl = (payment as any)._links?.checkout?.href ?? '';
    return { checkoutUrl, molliePaymentId: payment.id };
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
