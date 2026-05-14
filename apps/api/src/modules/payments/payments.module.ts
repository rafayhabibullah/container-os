import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeAdapter } from './stripe.adapter';
import { MollieModule } from './mollie.module';
import { MollieWebhookController } from './mollie-webhook.controller';
import { DatevOrgController } from './datev-org.controller';
import { LedgerService } from './ledger.service';
import { DatevExportService } from './datev-export.service';
import { EInvoiceService } from './einvoice.service';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { PrismaClient } from '@prisma/client';

const stubStorage = { upload: async () => ({ storageKey: '', hash: '' }), getSignedUrl: async () => '' };

@Module({
  imports: [AuditModule, BillingModule, MollieModule],
  controllers: [PaymentsController, MollieWebhookController, DatevOrgController],
  providers: [
    PaymentsService,
    StripeAdapter,
    LedgerService,
    EInvoiceService,
    { provide: PrismaClient, useValue: new PrismaClient() },
    { provide: DatevExportService, useValue: new DatevExportService(new PrismaClient(), stubStorage) },
  ],
  exports: [PaymentsService, LedgerService],
})
export class PaymentsModule {}
