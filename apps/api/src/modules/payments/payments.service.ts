import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StripeAdapter } from './stripe.adapter';
import { PAYMENT_ADAPTER, PaymentAdapter } from './payment-adapter.interface';
import { LedgerService } from './ledger.service';
import { DelinquencyService } from '../billing/delinquency.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaClient,
    @Inject(PAYMENT_ADAPTER) private paymentAdapter: PaymentAdapter,
    private stripe: StripeAdapter,
    private ledger: LedgerService,
    private delinquency: DelinquencyService,
    private eventBus: EventBusService,
  ) {}

  async chargeInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { agreement: true } });
    const mandate = await this.prisma.mandate.findFirst({ where: { customerId: invoice.agreement.tenantId, status: 'active' } });
    const providerCustomerRef = mandate?.providerRef ?? mandate?.stripeSetupId;
    if (!mandate || !providerCustomerRef) throw new Error('No active payment method for tenant');

    const reference = uuidv4();
    const payment = await this.prisma.payment.create({ data: { invoiceId, method: mandate.scheme, amountMinor: invoice.totalMinor, reference } });

    try {
      const result = await this.paymentAdapter.chargeInvoice({ invoiceId, amountMinor: invoice.totalMinor, currency: invoice.currency, customerId: providerCustomerRef, paymentMethodId: providerCustomerRef });
      const existing = await this.prisma.paymentAttempt.findFirst({ where: { providerRef: result.providerRef } });
      if (!existing) await this.prisma.paymentAttempt.create({ data: { paymentId: payment.id, provider: process.env.PAYMENT_PROVIDER ?? 'mollie', status: result.status, providerRef: result.providerRef } });

      if (result.status === 'succeeded') {
        await this.ledger.postEntry({ type: 'invoice_payment', refType: 'Invoice', refId: invoiceId, debitAccount: '1200', creditAccount: '8400', amountMinor: invoice.totalMinor, siteId: invoice.siteId });
        await this.delinquency.markPaid(invoiceId);
        this.eventBus.emit({ type: Events.PAYMENT_SUCCEEDED, payload: { invoiceId, paymentId: payment.id }, meta: { workspaceId: '', siteId: invoice.siteId, occurredAt: new Date() } });
      }
      return { paymentId: payment.id, status: result.status };
    } catch (e) {
      this.eventBus.emit({ type: Events.PAYMENT_FAILED, payload: { invoiceId, paymentId: payment.id }, meta: { workspaceId: '', siteId: invoice.siteId, occurredAt: new Date() } });
      throw e;
    }
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    const event = this.stripe.verifyWebhookSignature(payload, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.invoiceId) await this.delinquency.markPaid(pi.metadata.invoiceId);
    }
    return { received: true };
  }
}
