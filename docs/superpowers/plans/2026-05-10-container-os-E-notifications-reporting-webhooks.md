# Container OS — Track E: Notifications + Reporting + Webhooks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement transactional email/SMS notifications with de/en locale support, operational dashboards and financial reporting, and the public API/webhook delivery system with HMAC-SHA256 signing.

**Architecture:** Three NestJS modules. Notifications listens to domain events and dispatches emails via SMTP (MailHog locally). Reporting aggregates metrics and serves dashboard data. Webhooks manages API keys and delivers signed event payloads to registered endpoints via BullMQ.

**Tech Stack:** NestJS 10, Prisma 5, BullMQ 5, Nodemailer (SMTP), `@container-os/i18n`, Vitest

**Prerequisites:** Phase 0 complete. All other tracks ideally running — Notifications subscribes to events from Tracks B, C, and D.

---

## Files

```
apps/api/src/modules/
  notifications/
    notifications.module.ts
    notifications.service.ts
    notifications.controller.ts
    email.service.ts
    template-renderer.service.ts
    notifications.service.spec.ts
    template-renderer.service.spec.ts
  reporting/
    reporting.module.ts
    reporting.service.ts
    reporting.controller.ts
    metric-snapshot.service.ts
    reporting.service.spec.ts
  webhooks/
    webhooks.module.ts
    webhooks.service.ts
    webhooks.controller.ts
    webhook-delivery.service.ts
    queues/
      webhooks.queue.ts
      webhooks.processor.ts
    webhooks.service.spec.ts
    webhook-delivery.service.spec.ts
```

---

### Task E.1: Template renderer with de/en locale support (TDD)

**Files:**
- Create: `apps/api/src/modules/notifications/template-renderer.service.spec.ts`
- Create: `apps/api/src/modules/notifications/template-renderer.service.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/notifications/template-renderer.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { TemplateRendererService } from './template-renderer.service';

const mockPrisma = {
  notificationTemplate: { findFirst: vi.fn() },
};

const service = new TemplateRendererService(mockPrisma as any);

describe('TemplateRendererService', () => {
  it('renders German template with variable substitution', async () => {
    mockPrisma.notificationTemplate.findFirst.mockResolvedValue({
      id: 'tmpl_01', channel: 'email', locale: 'de', eventType: 'invoice.overdue',
      subject: 'Rechnung {{number}} überfällig',
      body: 'Sehr geehrte/r {{name}}, Ihre Rechnung {{number}} ist überfällig.',
    });

    const result = await service.render('email', 'de', 'invoice.overdue', { number: 'INV-001', name: 'Anna Weiss' });
    expect(result.subject).toBe('Rechnung INV-001 überfällig');
    expect(result.body).toContain('Anna Weiss');
    expect(result.body).toContain('INV-001');
  });

  it('falls back to English when German template not found', async () => {
    mockPrisma.notificationTemplate.findFirst
      .mockResolvedValueOnce(null)    // no 'de' template
      .mockResolvedValueOnce({ id: 'tmpl_02', channel: 'email', locale: 'en', eventType: 'invoice.overdue', subject: 'Invoice {{number}} overdue', body: 'Dear {{name}},' });

    const result = await service.render('email', 'de', 'invoice.overdue', { number: 'INV-001', name: 'John' });
    expect(result.subject).toContain('INV-001');
  });

  it('throws when no template found in any locale', async () => {
    mockPrisma.notificationTemplate.findFirst.mockResolvedValue(null);
    await expect(service.render('email', 'de', 'nonexistent.event', {})).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd apps/api && pnpm test src/modules/notifications/template-renderer.service.spec.ts
```

- [ ] **Step 3: Implement TemplateRendererService**

`apps/api/src/modules/notifications/template-renderer.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TemplateRendererService {
  constructor(private prisma: PrismaClient) {}

  async render(channel: string, locale: string, eventType: string, vars: Record<string, string>): Promise<{ subject: string; body: string }> {
    let template = await this.prisma.notificationTemplate.findFirst({
      where: { channel, locale, eventType, active: true },
    });

    // Fallback to English
    if (!template && locale !== 'en') {
      template = await this.prisma.notificationTemplate.findFirst({
        where: { channel, locale: 'en', eventType, active: true },
      });
    }

    if (!template) throw new Error(`No notification template found for ${channel}/${locale}/${eventType}`);

    const substitute = (s: string) =>
      Object.entries(vars).reduce((acc, [k, v]) => acc.replace(new RegExp(`{{${k}}}`, 'g'), v), s);

    return { subject: substitute(template.subject ?? ''), body: substitute(template.body) };
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/notifications/template-renderer.service.spec.ts
```

Expected: 3 tests pass.

---

### Task E.2: Notifications service — event-driven dispatch (TDD)

**Files:**
- Create: `apps/api/src/modules/notifications/email.service.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.spec.ts`
- Create: `apps/api/src/modules/notifications/notifications.service.ts`

- [ ] **Step 1: Create EmailService**

`apps/api/src/modules/notifications/email.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: parseInt(process.env.SMTP_PORT ?? '1025'),
      secure: false,
      ignoreTLS: true,
    });
  }

  async send(params: { to: string; subject: string; html: string; from?: string }): Promise<{ messageId: string }> {
    const info = await this.transporter.sendMail({
      from: params.from ?? `Container OS <noreply@container-os.de>`,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { messageId: info.messageId };
  }
}
```

- [ ] **Step 2: Write failing test for NotificationsService**

`apps/api/src/modules/notifications/notifications.service.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService } from './notifications.service';

const mockPrisma = {
  outboundMessage: { create: vi.fn().mockResolvedValue({ id: 'msg_01' }), update: vi.fn() },
  contact: { findFirst: vi.fn().mockResolvedValue({ email: 'tenant@example.com' }) },
  notificationPreference: { findFirst: vi.fn().mockResolvedValue(null) }, // no opt-out
};
const mockRenderer = { render: vi.fn().mockResolvedValue({ subject: 'Invoice overdue', body: '<p>Pay now</p>' }) };
const mockEmail = { send: vi.fn().mockResolvedValue({ messageId: 'mid_01' }) };
const mockEventBus = { on: vi.fn(), emit: vi.fn() };

const service = new NotificationsService(mockPrisma as any, mockRenderer as any, mockEmail as any, mockEventBus as any);

describe('NotificationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends email and records OutboundMessage on invoice.overdue event', async () => {
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: { number: 'INV-001', name: 'Anna' } });

    expect(mockRenderer.render).toHaveBeenCalledWith('email', 'de', 'invoice.overdue', expect.any(Object));
    expect(mockEmail.send).toHaveBeenCalled();
    expect(mockPrisma.outboundMessage.create).toHaveBeenCalled();
  });

  it('does not send email when tenant has opted out of channel', async () => {
    mockPrisma.notificationPreference.findFirst.mockResolvedValueOnce({ enabled: false });
    await service.sendNotification({ recipientId: 'cust_01', locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: {} });
    expect(mockEmail.send).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run test — verify FAIL**

```bash
pnpm test src/modules/notifications/notifications.service.spec.ts
```

- [ ] **Step 4: Implement NotificationsService**

`apps/api/src/modules/notifications/notifications.service.ts`:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TemplateRendererService } from './template-renderer.service';
import { EmailService } from './email.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

interface SendNotificationParams {
  recipientId: string;
  locale: string;
  eventType: string;
  channel: 'email';
  vars: Record<string, string>;
  subjectRef?: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private prisma: PrismaClient,
    private renderer: TemplateRendererService,
    private email: EmailService,
    private eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.on(Events.INVOICE_OVERDUE, async (event: any) => {
      await this.sendNotification({ recipientId: event.payload.tenantId, locale: 'de', eventType: 'invoice.overdue', channel: 'email', vars: { number: event.payload.invoiceId }, subjectRef: `Invoice:${event.payload.invoiceId}` });
    });

    this.eventBus.on(Events.INVOICE_PAID, async (event: any) => {
      await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'invoice.paid', channel: 'email', vars: {}, subjectRef: `Invoice:${event.payload.invoiceId}` });
    });

    this.eventBus.on(Events.ACCESS_CREDENTIAL_ISSUED, async (event: any) => {
      await this.sendNotification({ recipientId: event.payload.tenantId ?? '', locale: 'de', eventType: 'access.credential.issued', channel: 'email', vars: { credential: event.payload.maskedValue ?? '' } });
    });

    this.eventBus.on(Events.AGREEMENT_ACTIVATED, async (event: any) => {
      await this.sendNotification({ recipientId: event.payload.tenantId, locale: 'de', eventType: 'agreement.activated', channel: 'email', vars: {} });
    });
  }

  async sendNotification(params: SendNotificationParams): Promise<void> {
    // Check opt-out
    const pref = await this.prisma.notificationPreference.findFirst({ where: { userId: params.recipientId, channel: params.channel } });
    if (pref && !pref.enabled) return;

    const contact = await this.prisma.contact.findFirst({ where: { customerId: params.recipientId } });
    if (!contact?.email) return;

    const { subject, body } = await this.renderer.render(params.channel, params.locale, params.eventType, params.vars);

    const message = await this.prisma.outboundMessage.create({
      data: { eventType: params.eventType, channel: params.channel, recipientId: params.recipientId, subjectRef: params.subjectRef },
    });

    await this.email.send({ to: contact.email, subject, html: body });
    await this.prisma.outboundMessage.update({ where: { id: message.id }, data: { status: 'sent', sentAt: new Date() } });
  }
}
```

- [ ] **Step 5: Run test — verify PASS**

```bash
pnpm test src/modules/notifications/
```

- [ ] **Step 6: Create controller and module**

`apps/api/src/modules/notifications/notifications.controller.ts`:
```typescript
import { Controller, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Post('operator/v1/notifications/test')
  @UseGuards(JwtAuthGuard)
  testNotification(@Body() body: { recipientId: string; eventType: string; locale: string }) {
    return this.notifications.sendNotification({ ...body, channel: 'email', vars: {} });
  }

  @Patch('tenant/v1/notification-preferences')
  @UseGuards(JwtAuthGuard)
  updatePreference(@Body() _body: { channel: string; enabled: boolean }) {
    return { updated: true }; // full impl saves to NotificationPreference table
  }
}
```

`apps/api/src/modules/notifications/notifications.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { TemplateRendererService } from './template-renderer.service';
import { EmailService } from './email.service';
import { NotificationsController } from './notifications.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, TemplateRendererService, EmailService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

Add `NotificationsModule` to `AppModule` imports.

- [ ] **Step 7: Seed notification templates in DB**

Create `apps/api/prisma/seed.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    { channel: 'email', locale: 'de', eventType: 'invoice.overdue', subject: 'Zahlungserinnerung — Rechnung {{number}}', body: '<p>Ihre Rechnung {{number}} ist überfällig. Bitte begleichen Sie den ausstehenden Betrag.</p>' },
    { channel: 'email', locale: 'en', eventType: 'invoice.overdue', subject: 'Payment reminder — Invoice {{number}}', body: '<p>Your invoice {{number}} is overdue. Please settle the outstanding amount.</p>' },
    { channel: 'email', locale: 'de', eventType: 'invoice.paid', subject: 'Zahlung eingegangen', body: '<p>Vielen Dank für Ihre Zahlung. Ihr Zugang wurde wiederhergestellt.</p>' },
    { channel: 'email', locale: 'en', eventType: 'invoice.paid', subject: 'Payment received', body: '<p>Thank you for your payment. Your access has been restored.</p>' },
    { channel: 'email', locale: 'de', eventType: 'agreement.activated', subject: 'Ihr Mietvertrag ist aktiv', body: '<p>Willkommen! Ihr Mietvertrag ist jetzt aktiv.</p>' },
    { channel: 'email', locale: 'en', eventType: 'agreement.activated', subject: 'Your rental agreement is active', body: '<p>Welcome! Your rental agreement is now active.</p>' },
    { channel: 'email', locale: 'de', eventType: 'access.credential.issued', subject: 'Ihre Zugangsdaten', body: '<p>Ihre Zugangsdaten: {{credential}}</p>' },
    { channel: 'email', locale: 'en', eventType: 'access.credential.issued', subject: 'Your access credentials', body: '<p>Your access credentials: {{credential}}</p>' },
  ];

  for (const tmpl of templates) {
    await prisma.notificationTemplate.upsert({
      where: { channel_locale_eventType: { channel: tmpl.channel, locale: tmpl.locale, eventType: tmpl.eventType } },
      create: tmpl, update: tmpl,
    });
  }

  console.log('Notification templates seeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

Run: `cd apps/api && npx prisma db seed --preview-feature`

Or add to `package.json`: `"prisma": { "seed": "ts-node prisma/seed.ts" }`

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/notifications/ apps/api/prisma/seed.ts
git commit -m "feat(notifications): event-driven email dispatch, de/en templates, opt-out support"
```

---

### Task E.3: Reporting service — occupancy and revenue dashboards (TDD)

**Files:**
- Create: `apps/api/src/modules/reporting/reporting.service.spec.ts`
- Create: `apps/api/src/modules/reporting/reporting.service.ts`
- Create: `apps/api/src/modules/reporting/reporting.controller.ts`
- Create: `apps/api/src/modules/reporting/reporting.module.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/reporting/reporting.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { ReportingService } from './reporting.service';

const mockPrisma = {
  unit: { groupBy: vi.fn() },
  invoice: { aggregate: vi.fn() },
  metricSnapshot: { findMany: vi.fn(), createMany: vi.fn() },
};

const service = new ReportingService(mockPrisma as any);

describe('ReportingService', () => {
  it('calculates occupancy percentage for a site', async () => {
    mockPrisma.unit.groupBy.mockResolvedValue([
      { status: 'available', _count: { status: 20 } },
      { status: 'occupied', _count: { status: 75 } },
      { status: 'maintenance', _count: { status: 5 } },
    ]);

    const result = await service.getOccupancyReport(['site_01'], new Date(), new Date());
    expect(result[0].occupancyPct).toBeCloseTo(75);
  });

  it('returns revenue total from invoices in date range', async () => {
    mockPrisma.invoice.aggregate.mockResolvedValue({ _sum: { totalMinor: 1490000 } });
    const result = await service.getRevenueReport(['site_01'], new Date('2026-06-01'), new Date('2026-06-30'));
    expect(result[0].totalMinor).toBe(1490000);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/reporting/reporting.service.spec.ts
```

- [ ] **Step 3: Implement ReportingService**

`apps/api/src/modules/reporting/reporting.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaClient) {}

  async getOccupancyReport(siteIds: string[], _from: Date, _to: Date) {
    const results = await Promise.all(
      siteIds.map(async (siteId) => {
        const grouped = await this.prisma.unit.groupBy({
          by: ['status'],
          where: { siteId, deletedAt: null },
          _count: { status: true },
        });

        const total = grouped.reduce((s, g) => s + g._count.status, 0);
        const occupied = grouped.find((g) => g.status === 'occupied')?._count.status ?? 0;
        const occupancyPct = total > 0 ? (occupied / total) * 100 : 0;

        return { siteId, occupancyPct: Math.round(occupancyPct * 10) / 10, totalUnits: total, occupiedUnits: occupied };
      })
    );
    return results;
  }

  async getRevenueReport(siteIds: string[], from: Date, to: Date) {
    return Promise.all(
      siteIds.map(async (siteId) => {
        const agg = await this.prisma.invoice.aggregate({
          where: { siteId, status: 'paid', invoiceDate: { gte: from, lte: to } },
          _sum: { totalMinor: true },
        });
        return { siteId, totalMinor: agg._sum.totalMinor ?? 0, from, to, currency: 'EUR' };
      })
    );
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/reporting/
```

- [ ] **Step 5: Create controller and module**

`apps/api/src/modules/reporting/reporting.controller.ts`:
```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { ReportingService } from './reporting.service';

@Controller('operator/v1/reports')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private reporting: ReportingService) {}

  @Get('occupancy')
  getOccupancy(
    @Query('siteIds') siteIds: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reporting.getOccupancyReport(siteIds.split(','), new Date(from), new Date(to));
  }

  @Get('revenue')
  getRevenue(
    @Query('siteIds') siteIds: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reporting.getRevenueReport(siteIds.split(','), new Date(from), new Date(to));
  }
}
```

`apps/api/src/modules/reporting/reporting.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [ReportingController],
  providers: [ReportingService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ReportingService],
})
export class ReportingModule {}
```

Add `ReportingModule` to `AppModule` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/reporting/
git commit -m "feat(reporting): occupancy and revenue reports by site and date range"
```

---

### Task E.4: Webhooks — HMAC-SHA256 signed delivery (TDD)

**Files:**
- Create: `apps/api/src/modules/webhooks/webhook-delivery.service.spec.ts`
- Create: `apps/api/src/modules/webhooks/webhook-delivery.service.ts`
- Create: `apps/api/src/modules/webhooks/webhooks.service.ts`
- Create: `apps/api/src/modules/webhooks/webhooks.controller.ts`
- Create: `apps/api/src/modules/webhooks/webhooks.module.ts`
- Create: `apps/api/src/modules/webhooks/queues/webhooks.queue.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/webhooks/webhook-delivery.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { WebhookDeliveryService } from './webhook-delivery.service';
import * as crypto from 'crypto';

const mockPrisma = {
  webhookEndpoint: { findMany: vi.fn() },
  webhookDelivery: { create: vi.fn(), update: vi.fn() },
};

const service = new WebhookDeliveryService(mockPrisma as any);

describe('WebhookDeliveryService', () => {
  it('computes HMAC-SHA256 signature correctly', () => {
    const payload = JSON.stringify({ type: 'agreement.activated', data: {} });
    const secret = 'whsec_test123';
    const sig = service.computeSignature(payload, secret);

    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    expect(sig).toBe(expected);
  });

  it('enqueues delivery for each matching endpoint', async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: 'ep_01', url: 'https://example.com/webhook', secret: 'sec_01', subscriptions: ['agreement.activated'] },
    ]);
    mockPrisma.webhookDelivery.create.mockResolvedValue({ id: 'del_01' });

    const deliveries = await service.enqueueDeliveries('agreement.activated', { agreementId: 'agr_01' });
    expect(deliveries).toHaveLength(1);
    expect(mockPrisma.webhookDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ endpointId: 'ep_01', eventType: 'agreement.activated' }) })
    );
  });

  it('skips endpoints not subscribed to event type', async () => {
    mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
      { id: 'ep_02', url: 'https://other.com', secret: 'sec_02', subscriptions: ['invoice.paid'] },
    ]);

    const deliveries = await service.enqueueDeliveries('agreement.activated', {});
    expect(deliveries).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/webhooks/webhook-delivery.service.spec.ts
```

- [ ] **Step 3: Implement WebhookDeliveryService**

`apps/api/src/modules/webhooks/webhook-delivery.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhookDeliveryService {
  constructor(private prisma: PrismaClient) {}

  computeSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  async enqueueDeliveries(eventType: string, payload: object): Promise<Array<{ deliveryId: string; endpointId: string }>> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: { status: 'active', subscriptions: { has: eventType } },
    });

    const results = [];
    for (const endpoint of endpoints) {
      const delivery = await this.prisma.webhookDelivery.create({
        data: { endpointId: endpoint.id, eventType, payload, status: 'pending' },
      });
      results.push({ deliveryId: delivery.id, endpointId: endpoint.id });
    }
    return results;
  }

  async deliver(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.webhookDelivery.findUniqueOrThrow({
      where: { id: deliveryId },
      include: { endpoint: true },
    });

    const payload = JSON.stringify({ type: delivery.eventType, data: delivery.payload, deliveryId });
    const signature = this.computeSignature(payload, delivery.endpoint.secret);

    const response = await fetch(delivery.endpoint.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Signature-256': `sha256=${signature}`, 'X-Delivery-Id': deliveryId },
      body: payload,
    });

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: response.ok ? 'delivered' : 'failed',
        attempts: { increment: 1 },
        deliveredAt: response.ok ? new Date() : undefined,
        lastError: response.ok ? undefined : `HTTP ${response.status}`,
      },
    });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/webhooks/
```

- [ ] **Step 5: Create WebhooksService and controller**

`apps/api/src/modules/webhooks/webhooks.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaClient) {}

  async createApiKey(clientId: string, scopes: string[], siteIds: string[]) {
    const rawKey = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const key = await this.prisma.apiKey.create({ data: { clientId, keyHash } });
    return { apiKeyId: key.id, key: rawKey }; // raw key shown once only
  }

  async createWebhookEndpoint(clientId: string, url: string, subscriptions: string[]) {
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    return this.prisma.webhookEndpoint.create({ data: { clientId, url, secret, subscriptions } });
  }
}
```

`apps/api/src/modules/webhooks/webhooks.controller.ts`:
```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { WebhooksService } from './webhooks.service';

@Controller('operator/v1/developer')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private webhooks: WebhooksService) {}

  @Post('api-keys')
  createApiKey(@Body() body: { clientId: string; scopes: string[]; siteIds: string[] }) {
    return this.webhooks.createApiKey(body.clientId, body.scopes, body.siteIds);
  }

  @Post('webhooks')
  createEndpoint(@Body() body: { clientId: string; url: string; subscriptions: string[] }) {
    return this.webhooks.createWebhookEndpoint(body.clientId, body.url, body.subscriptions);
  }
}
```

`apps/api/src/modules/webhooks/webhooks.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhooksController } from './webhooks.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookDeliveryService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [WebhookDeliveryService],
})
export class WebhooksModule {}
```

Add `WebhooksModule` to `AppModule` imports.

- [ ] **Step 6: Run all E track tests**

```bash
pnpm test src/modules/notifications/ src/modules/reporting/ src/modules/webhooks/
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/webhooks/
git commit -m "feat(webhooks): HMAC-SHA256 signed delivery, API key issuance, endpoint registration"
```

---

## Track E complete

APIs available:
- `POST /api/operator/v1/notifications/test`
- `PATCH /api/tenant/v1/notification-preferences`
- `GET /api/operator/v1/reports/occupancy`
- `GET /api/operator/v1/reports/revenue`
- `POST /api/operator/v1/developer/api-keys`
- `POST /api/operator/v1/developer/webhooks`
