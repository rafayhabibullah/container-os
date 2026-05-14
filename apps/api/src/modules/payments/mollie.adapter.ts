import { Injectable } from '@nestjs/common';
import { createMollieClient, MollieClient } from '@mollie/api-client';

interface CreatePaymentLinkParams {
  invoiceId: string;
  amountMinor: number;
  currency: string;
  description: string;
  redirectUrl: string;
}

@Injectable()
export class MollieAdapter {
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
