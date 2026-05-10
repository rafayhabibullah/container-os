import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventBusModule } from './events/event-bus.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './health/health.module';
import { SiteInventoryModule } from './modules/site-inventory/site-inventory.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { CrmLeadsModule } from './modules/crm-leads/crm-leads.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BillingModule } from './modules/billing/billing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { OperationsModule } from './modules/operations/operations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventBusModule,
    // Foundation
    AuthModule,
    AuditModule,
    HealthModule,
    // Domain modules — Track A
    SiteInventoryModule,
    PricingModule,
    StorefrontModule,
    // Domain modules — Track B
    CrmLeadsModule,
    ReservationsModule,
    AgreementsModule,
    DocumentsModule,
    // Domain modules — Track C
    BillingModule,
    PaymentsModule,
    // Domain modules — Track D
    AccessControlModule,
    OperationsModule,
    // Domain modules — Track E
    NotificationsModule,
    ReportingModule,
    WebhooksModule,
  ],
})
export class AppModule {}
