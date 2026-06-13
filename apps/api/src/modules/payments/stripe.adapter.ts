import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { ChargeInvoiceParams, ChargeInvoiceResult, PaymentAdapter } from './payment-adapter.interface';

@Injectable()
export class StripeAdapter implements PaymentAdapter {
  protected stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', { apiVersion: '2023-10-16' });
  }

  async createSetupIntent(stripeCustomerId: string, paymentMethodType: 'sepa_debit' | 'card') {
    const intent = await this.stripe.setupIntents.create({ customer: stripeCustomerId, payment_method_types: [paymentMethodType] });
    return { setupIntentId: intent.id, clientSecret: intent.client_secret };
  }

  async chargeInvoice(params: ChargeInvoiceParams): Promise<ChargeInvoiceResult> {
    const pi = await this.stripe.paymentIntents.create({ amount: params.amountMinor, currency: params.currency.toLowerCase(), customer: params.customerId, payment_method: params.paymentMethodId, confirm: true, metadata: { invoiceId: params.invoiceId }, automatic_payment_methods: { enabled: false } });
    return { providerRef: pi.id, status: this.mapStatus(pi.status) };
  }

  mapStatus(stripeStatus: string): 'pending' | 'pending_settlement' | 'succeeded' | 'failed' {
    switch (stripeStatus) {
      case 'succeeded': return 'succeeded';
      case 'processing': case 'requires_action': return 'pending_settlement';
      default: return 'failed';
    }
  }

  verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
