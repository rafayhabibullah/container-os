import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { InvoiceRunService } from './invoice-run.service';
import { DelinquencyService } from './delinquency.service';
import { MandateService } from './mandate.service';
import { BillingController } from './billing.controller';
import { BillingOrgController } from './billing-org.controller';
import { MandateOrgController } from './mandate-org.controller';
import { DelinquencyOrgController } from './delinquency-org.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { MollieModule } from '../payments/mollie.module';
import { DocumentsModule } from '../documents/documents.module';
import { PrismaClient } from '@prisma/client';
import { InvoiceNumberService } from './invoice-number.service';
import { InvoiceDocumentService } from './invoice-document.service';
import { OrganisationModule } from '../organisations/organisations.module';

@Module({
  imports: [AuthModule, AuditModule, MollieModule, DocumentsModule, OrganisationModule],
  controllers: [BillingController, BillingOrgController, MandateOrgController, DelinquencyOrgController],
  providers: [
    BillingService,
    InvoiceRunService,
    DelinquencyService,
    MandateService,
    InvoiceNumberService,
    InvoiceDocumentService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [BillingService, InvoiceRunService, DelinquencyService, MandateService, InvoiceNumberService, InvoiceDocumentService],
})
export class BillingModule {}
