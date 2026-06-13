import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeAdapter } from './stripe.adapter';
import { MollieAdapter } from './mollie.adapter';
import { MollieModule } from './mollie.module';
import { MollieWebhookController } from './mollie-webhook.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { DatevOrgController } from './datev-org.controller';
import { LedgerService } from './ledger.service';
import { DatevExportService } from './datev-export.service';
import { EInvoiceService } from './einvoice.service';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { PrismaClient } from '@prisma/client';
import { PAYMENT_ADAPTER } from './payment-adapter.interface';

const stubStorage = { upload: async () => ({ storageKey: '', hash: '' }), getSignedUrl: async () => '' };

export const paymentAdapterFactory = {
  provide: PAYMENT_ADAPTER,
  useFactory: (mollie: MollieAdapter, stripe: StripeAdapter) => {
    const provider = (process.env.PAYMENT_PROVIDER ?? 'mollie').toLowerCase();
    return provider === 'stripe' ? stripe : mollie;
  },
  inject: [MollieAdapter, StripeAdapter],
};

@Module({
  imports: [AuditModule, BillingModule, MollieModule],
  controllers: [PaymentsController, MollieWebhookController, StripeWebhookController, DatevOrgController],
  providers: [
    PaymentsService,
    StripeAdapter,
    paymentAdapterFactory,
    LedgerService,
    EInvoiceService,
    { provide: PrismaClient, useValue: new PrismaClient() },
    { provide: DatevExportService, useValue: new DatevExportService(new PrismaClient(), stubStorage) },
  ],
  exports: [PaymentsService, LedgerService],
})
export class PaymentsModule {}
