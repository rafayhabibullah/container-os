# Contracts, Invoices & Payments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up invoice generation, Mollie payment links, SEPA mandate management, delinquency policy controls, and DATEV export behind the `v1/organisations/:organisationId/` route namespace, and build the corresponding Next.js 14 App Router pages.

**Architecture:** All new backend endpoints live in a dedicated `BillingOrgController` (and sibling `DelinquencyOrgController`) registered under `v1/organisations/:organisationId/…`, protected by `JwtAuthGuard` + `OrganisationGuard`, and backed by existing services (`InvoiceRunService`, `DelinquencyService`, `MandateService`) plus a new `MollieAdapter`; a separate public controller handles the Mollie webhook. The frontend uses Server Components calling `serverFetch` for read paths and route-handler BFF proxies (`proxyToBackend`) for mutations.

**Tech Stack:** NestJS 10, Prisma 5, class-validator, Mollie Node SDK, Next.js 14 App Router, TypeScript, Tailwind CSS

---

## Prerequisite reading

Before starting, read these files:

- `apps/api/src/modules/billing/billing.module.ts` — existing module wiring
- `apps/api/src/modules/payments/stripe.adapter.ts` — template for `MollieAdapter`
- `apps/api/src/modules/payments/payments.service.ts` — existing payment flow
- `apps/api/src/modules/payments/ledger.service.ts` — `postEntry` signature
- `apps/api/src/modules/billing/delinquency.service.ts` — `checkOverdueInvoices`, `markPaid`
- `apps/api/src/modules/billing/invoice-run.service.ts` — `runForDate`
- `apps/api/src/modules/organisations/organisations.controller.ts` — guard + decorator pattern
- `apps/api/src/common/guards/organisation.guard.ts` — sets `request.member`
- `apps/web/src/lib/server-api.ts` — `serverFetch<T>`
- `apps/web/src/lib/api-route-helpers.ts` — `getAuthContext`, `proxyToBackend`
- `apps/web/src/app/sites/page.tsx` — Server Component table pattern
- `apps/web/src/app/sites/[siteId]/page.tsx` — detail page pattern

---

## Task 1 — Install Mollie SDK and extend `.env.example`

### 1.1 Install package

```bash
cd /Users/rafayhabibullah/sitelager
~/.nvm/versions/node/v20.19.5/bin/pnpm add @mollie/api-client --filter api
```

Expected output: `+ @mollie/api-client …`

### 1.2 Add env var

- [ ] Modify `apps/api/.env.example` — append:

```
MOLLIE_API_KEY=test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
MOLLIE_WEBHOOK_SECRET=whsec_placeholder
```

### 1.3 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/package.json apps/api/.env.example pnpm-lock.yaml
git commit -m "chore(payments): add @mollie/api-client dependency + env vars"
git push
```

---

## Task 2 — `MollieAdapter` service (with tests)

### 2.1 Write failing test first

- [ ] Create `apps/api/src/modules/payments/mollie.adapter.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MollieAdapter } from './mollie.adapter';

const mockMollie = {
  payments: {
    create: vi.fn(),
    get: vi.fn(),
  },
};

const adapter = new MollieAdapter();
(adapter as any).client = mockMollie;

describe('MollieAdapter', () => {
  it('createPaymentLink returns checkoutUrl from Mollie response', async () => {
    mockMollie.payments.create.mockResolvedValue({
      id: 'tr_mollie_01',
      _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_mollie_01' } },
    });
    const result = await adapter.createPaymentLink({
      invoiceId: 'inv_01',
      amountMinor: 17731,
      currency: 'EUR',
      description: 'Invoice inv_01',
      redirectUrl: 'https://app.sitelager.io/invoices/inv_01',
    });
    expect(result.checkoutUrl).toBe('https://www.mollie.com/checkout/tr_mollie_01');
    expect(result.molliePaymentId).toBe('tr_mollie_01');
    expect(mockMollie.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: { value: '177.31', currency: 'EUR' } }),
    );
  });

  it('getPaymentStatus returns status from Mollie', async () => {
    mockMollie.payments.get.mockResolvedValue({ id: 'tr_mollie_01', status: 'paid' });
    const status = await adapter.getPaymentStatus('tr_mollie_01');
    expect(status).toBe('paid');
  });

  it('mapMollieStatus converts paid -> succeeded', () => {
    expect(adapter.mapMollieStatus('paid')).toBe('succeeded');
    expect(adapter.mapMollieStatus('pending')).toBe('pending');
    expect(adapter.mapMollieStatus('open')).toBe('pending');
    expect(adapter.mapMollieStatus('failed')).toBe('failed');
    expect(adapter.mapMollieStatus('canceled')).toBe('failed');
    expect(adapter.mapMollieStatus('expired')).toBe('failed');
  });
});
```

### 2.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=mollie.adapter --no-coverage
```

Expected: `FAIL  src/modules/payments/mollie.adapter.spec.ts`

### 2.3 Implement

- [ ] Create `apps/api/src/modules/payments/mollie.adapter.ts`:

```typescript
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
```

### 2.4 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=mollie.adapter --no-coverage
```

Expected: `PASS  src/modules/payments/mollie.adapter.spec.ts` with 3 passing tests.

### 2.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/payments/mollie.adapter.ts apps/api/src/modules/payments/mollie.adapter.spec.ts
git commit -m "feat(payments): MollieAdapter — createPaymentLink, getPaymentStatus, mapMollieStatus"
git push
```

---

## Task 3 — `BillingService` extensions for org-scoped queries (with tests)

The existing `BillingService` only has `getInvoice` and `getInvoicesForSite`. We need org-scoped list/detail/void/credit-note methods.

### 3.1 Write failing tests

- [ ] Create `apps/api/src/modules/billing/billing.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from './billing.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  invoice: {
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  creditNote: { create: vi.fn() },
  payment: { create: vi.fn() },
  paymentAttempt: { create: vi.fn() },
};

const service = new BillingService(mockPrisma as any);

describe('BillingService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listInvoicesForOrg returns invoices filtered by orgId via siteId join', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([
      { id: 'inv_01', siteId: 's1', status: 'pending', totalMinor: 17731, dueDate: new Date(), agreement: { tenantId: 'cust_01', unit: { unitCode: 'A01' } } },
    ]);
    const result = await service.listInvoicesForOrg('org_01', {});
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ agreement: { site: { organisationId: 'org_01' } } }) }),
    );
    expect(result).toHaveLength(1);
  });

  it('listInvoicesForOrg applies siteId filter when provided', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    await service.listInvoicesForOrg('org_01', { siteId: 's1' });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ siteId: 's1' }) }),
    );
  });

  it('voidInvoice sets status to void and creates credit note', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', status: 'pending', totalMinor: 17731, siteId: 's1' });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv_01', status: 'void' });
    mockPrisma.creditNote.create.mockResolvedValue({ id: 'cn_01' });
    const result = await service.voidInvoice('inv_01', 'Manual void by operator');
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'void' } }));
    expect(mockPrisma.creditNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ invoiceId: 'inv_01', amountMinor: 17731 }) }),
    );
    expect(result).toHaveProperty('creditNoteId');
  });

  it('voidInvoice throws ForbiddenException when invoice already paid', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', status: 'paid', totalMinor: 17731 });
    await expect(service.voidInvoice('inv_01', 'test')).rejects.toThrow(ForbiddenException);
  });

  it('createMolliePayment records Payment row and returns checkoutUrl', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: 'inv_01', status: 'pending', totalMinor: 17731, currency: 'EUR', siteId: 's1',
      agreement: { tenantId: 'cust_01' },
    });
    mockPrisma.payment.create.mockResolvedValue({ id: 'pay_01' });
    const mockMollie = { createPaymentLink: vi.fn().mockResolvedValue({ checkoutUrl: 'https://mollie.com/checkout/tr_01', molliePaymentId: 'tr_01' }) };
    const result = await service.createMolliePayment('inv_01', mockMollie as any, 'https://app/invoices/inv_01');
    expect(mockPrisma.payment.create).toHaveBeenCalled();
    expect(result).toHaveProperty('checkoutUrl', 'https://mollie.com/checkout/tr_01');
  });
});
```

### 3.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=billing.service --no-coverage
```

Expected: `FAIL  src/modules/billing/billing.service.spec.ts`

### 3.3 Implement

- [ ] Modify `apps/api/src/modules/billing/billing.service.ts` — replace entire file:

```typescript
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface ListInvoicesFilter {
  siteId?: string;
  agreementId?: string;
  status?: string;
}

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaClient) {}

  async getInvoice(invoiceId: string) {
    return this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } });
  }

  async getInvoicesForSite(siteId: string) {
    return this.prisma.invoice.findMany({ where: { siteId }, orderBy: { invoiceDate: 'desc' } });
  }

  async listInvoicesForOrg(organisationId: string, filter: ListInvoicesFilter) {
    const where: Record<string, unknown> = {
      agreement: { site: { organisationId } },
    };
    if (filter.siteId) where.siteId = filter.siteId;
    if (filter.agreementId) where.agreementId = filter.agreementId;
    if (filter.status) where.status = filter.status;
    return this.prisma.invoice.findMany({
      where: where as any,
      orderBy: { invoiceDate: 'desc' },
      include: {
        lines: true,
        payments: { include: { attempts: true } },
        credits: true,
        agreement: {
          include: { customer: { select: { id: true, personOrOrgData: true } } },
        },
      },
    });
  }

  async getInvoiceDetail(invoiceId: string) {
    return this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        lines: true,
        payments: { include: { attempts: true } },
        credits: true,
        agreement: {
          include: { customer: { select: { id: true, personOrOrgData: true } } },
        },
      },
    });
  }

  async voidInvoice(invoiceId: string, reason: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    if (invoice.status === 'paid') throw new ForbiddenException('Cannot void a paid invoice');
    if (invoice.status === 'void') throw new ForbiddenException('Invoice is already void');
    await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'void' } });
    const creditNote = await this.prisma.creditNote.create({
      data: { invoiceId, amountMinor: invoice.totalMinor, reason },
    });
    return { invoiceId, status: 'void', creditNoteId: creditNote.id };
  }

  async createMolliePayment(invoiceId: string, mollieAdapter: any, redirectUrl: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { agreement: true },
    });
    const reference = `PAY-${uuidv4()}`;
    const payment = await this.prisma.payment.create({
      data: {
        invoiceId,
        method: 'bank_transfer',
        amountMinor: invoice.totalMinor,
        reference,
      },
    });
    const { checkoutUrl, molliePaymentId } = await mollieAdapter.createPaymentLink({
      invoiceId,
      amountMinor: invoice.totalMinor,
      currency: invoice.currency,
      description: `Invoice ${invoiceId}`,
      redirectUrl,
    });
    await this.prisma.paymentAttempt.create({
      data: { paymentId: payment.id, provider: 'mollie', status: 'pending', providerRef: molliePaymentId },
    });
    return { checkoutUrl, paymentId: payment.id, molliePaymentId };
  }
}
```

### 3.4 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=billing.service --no-coverage
```

Expected: `PASS  src/modules/billing/billing.service.spec.ts` with 5 passing tests.

### 3.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/billing/billing.service.ts apps/api/src/modules/billing/billing.service.spec.ts
git commit -m "feat(billing): extend BillingService with org-scoped list, void, and Mollie payment creation"
git push
```

---

## Task 4 — `BillingOrgController` with invoice endpoints (with tests)

### 4.1 Write failing test

- [ ] Create `apps/api/src/modules/billing/billing-org.controller.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Minimal integration unit — verifies method wiring without HTTP layer
const mockBilling = {
  listInvoicesForOrg: vi.fn().mockResolvedValue([{ id: 'inv_01' }]),
  getInvoiceDetail: vi.fn().mockResolvedValue({ id: 'inv_01', lines: [] }),
  voidInvoice: vi.fn().mockResolvedValue({ invoiceId: 'inv_01', status: 'void', creditNoteId: 'cn_01' }),
  createMolliePayment: vi.fn().mockResolvedValue({ checkoutUrl: 'https://mollie.com/checkout/tr_01', paymentId: 'pay_01' }),
};
const mockInvoiceRun = { runForDate: vi.fn().mockResolvedValue({ created: 2, skipped: 0, errors: 0 }) };
const mockMollie = {};

// Import after defining mocks (vitest hoisting not needed — direct instantiation)
import { BillingOrgController } from './billing-org.controller';

const controller = new BillingOrgController(mockBilling as any, mockInvoiceRun as any, mockMollie as any);

describe('BillingOrgController', () => {
  it('listInvoices calls BillingService.listInvoicesForOrg', async () => {
    const result = await controller.listInvoices('org_01', undefined, undefined, undefined);
    expect(mockBilling.listInvoicesForOrg).toHaveBeenCalledWith('org_01', {});
    expect(result).toHaveLength(1);
  });

  it('getInvoice calls BillingService.getInvoiceDetail', async () => {
    await controller.getInvoice('org_01', 'inv_01');
    expect(mockBilling.getInvoiceDetail).toHaveBeenCalledWith('inv_01');
  });

  it('runInvoices triggers InvoiceRunService.runForDate', async () => {
    const result = await controller.runInvoices('org_01', { role: 'owner' } as any);
    expect(mockInvoiceRun.runForDate).toHaveBeenCalled();
    expect(result).toHaveProperty('created', 2);
  });

  it('runInvoices throws 403 when role is not owner', async () => {
    await expect(controller.runInvoices('org_01', { role: 'member' } as any)).rejects.toThrow();
  });

  it('voidInvoice calls BillingService.voidInvoice', async () => {
    const result = await controller.voidInvoice('org_01', 'inv_01', { reason: 'Test void' });
    expect(mockBilling.voidInvoice).toHaveBeenCalledWith('inv_01', 'Test void');
    expect(result).toHaveProperty('creditNoteId');
  });

  it('payInvoice calls BillingService.createMolliePayment', async () => {
    const result = await controller.payInvoice('org_01', 'inv_01');
    expect(mockBilling.createMolliePayment).toHaveBeenCalled();
    expect(result).toHaveProperty('checkoutUrl');
  });
});
```

### 4.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=billing-org.controller --no-coverage
```

Expected: `FAIL  src/modules/billing/billing-org.controller.spec.ts`

### 4.3 Implement controller

- [ ] Create `apps/api/src/modules/billing/billing-org.controller.ts`:

```typescript
import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { BillingService } from './billing.service';
import { InvoiceRunService } from './invoice-run.service';
import { MollieAdapter } from '../payments/mollie.adapter';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class BillingOrgController {
  constructor(
    private readonly billing: BillingService,
    private readonly invoiceRun: InvoiceRunService,
    private readonly mollie: MollieAdapter,
  ) {}

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices (filter by siteId, agreementId, status)' })
  listInvoices(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('agreementId') agreementId?: string,
    @Query('status') status?: string,
  ) {
    return this.billing.listInvoicesForOrg(orgId, { siteId, agreementId, status });
  }

  @Get('invoices/:invoiceId')
  @ApiOperation({ summary: 'Get invoice detail with lines, payments, credit notes' })
  getInvoice(
    @Param('organisationId') _orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.billing.getInvoiceDetail(invoiceId);
  }

  @Post('invoices/run')
  @ApiOperation({ summary: 'Trigger invoice run for a site (owner only)' })
  async runInvoices(
    @Param('organisationId') _orgId: string,
    @CurrentMember() member: MemberContext,
  ) {
    if (member.role !== 'owner') throw new ForbiddenException('Only owners can trigger invoice runs');
    return this.invoiceRun.runForDate(new Date());
  }

  @Post('invoices/:invoiceId/void')
  @ApiOperation({ summary: 'Void an invoice and create credit note' })
  voidInvoice(
    @Param('organisationId') _orgId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() body: { reason: string },
  ) {
    return this.billing.voidInvoice(invoiceId, body.reason ?? 'Voided by operator');
  }

  @Post('invoices/:invoiceId/pay')
  @ApiOperation({ summary: 'Create Mollie payment link for invoice' })
  payInvoice(
    @Param('organisationId') orgId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    const redirectUrl = `${process.env.APP_URL ?? 'https://app.sitelager.io'}/invoices/${invoiceId}`;
    return this.billing.createMolliePayment(invoiceId, this.mollie, redirectUrl);
  }
}
```

### 4.4 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=billing-org.controller --no-coverage
```

Expected: `PASS  src/modules/billing/billing-org.controller.spec.ts` with 6 passing tests.

### 4.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/billing/billing-org.controller.ts apps/api/src/modules/billing/billing-org.controller.spec.ts
git commit -m "feat(billing): BillingOrgController — list/detail/run/void/pay invoice endpoints"
git push
```

---

## Task 5 — Mollie webhook controller (with tests)

### 5.1 Write failing test

- [ ] Create `apps/api/src/modules/payments/mollie-webhook.controller.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MollieWebhookController } from './mollie-webhook.controller';

const mockMollieAdapter = {
  getPaymentStatus: vi.fn().mockResolvedValue('paid'),
  mapMollieStatus: vi.fn().mockReturnValue('succeeded'),
};
const mockPrisma = {
  paymentAttempt: { findFirst: vi.fn(), update: vi.fn() },
  payment: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  invoice: { findUniqueOrThrow: vi.fn() },
  ledgerEntry: { create: vi.fn() },
};
const mockDelinquency = { markPaid: vi.fn() };

const controller = new MollieWebhookController(mockMollieAdapter as any, mockPrisma as any, mockDelinquency as any);

describe('MollieWebhookController', () => {
  it('handleWebhook updates payment status to succeeded when Mollie reports paid', async () => {
    mockPrisma.paymentAttempt.findFirst.mockResolvedValue({ id: 'pa_01', paymentId: 'pay_01', providerRef: 'tr_01' });
    mockPrisma.payment.findUniqueOrThrow.mockResolvedValue({ id: 'pay_01', invoiceId: 'inv_01', amountMinor: 17731 });
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', siteId: 's1', currency: 'EUR' });
    mockPrisma.payment.update.mockResolvedValue({});
    mockPrisma.paymentAttempt.update.mockResolvedValue({});
    mockPrisma.ledgerEntry.create.mockResolvedValue({});

    await controller.handleMollieWebhook({ id: 'tr_01' });

    expect(mockMollieAdapter.getPaymentStatus).toHaveBeenCalledWith('tr_01');
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'succeeded' } }),
    );
    expect(mockDelinquency.markPaid).toHaveBeenCalledWith('inv_01');
  });

  it('handleWebhook returns { received: true } even when providerRef not found (idempotent)', async () => {
    mockPrisma.paymentAttempt.findFirst.mockResolvedValue(null);
    const result = await controller.handleMollieWebhook({ id: 'tr_unknown' });
    expect(result).toEqual({ received: true });
  });
});
```

### 5.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=mollie-webhook.controller --no-coverage
```

Expected: `FAIL  src/modules/payments/mollie-webhook.controller.spec.ts`

### 5.3 Implement

- [ ] Create `apps/api/src/modules/payments/mollie-webhook.controller.ts`:

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { MollieAdapter } from './mollie.adapter';
import { DelinquencyService } from '../billing/delinquency.service';

@ApiTags('webhooks')
@Controller('v1/webhooks')
export class MollieWebhookController {
  constructor(
    private readonly mollie: MollieAdapter,
    private readonly prisma: PrismaClient,
    private readonly delinquency: DelinquencyService,
  ) {}

  @Post('mollie')
  async handleMollieWebhook(@Body() body: { id: string }) {
    const molliePaymentId = body.id;
    if (!molliePaymentId) return { received: true };

    const attempt = await this.prisma.paymentAttempt.findFirst({ where: { providerRef: molliePaymentId } });
    if (!attempt) return { received: true };

    const mollieStatus = await this.mollie.getPaymentStatus(molliePaymentId);
    const mappedStatus = this.mollie.mapMollieStatus(mollieStatus);

    await this.prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: mappedStatus } });
    await this.prisma.payment.update({ where: { id: attempt.paymentId }, data: { status: mappedStatus } });

    if (mappedStatus === 'succeeded') {
      const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: attempt.paymentId } });
      const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: payment.invoiceId } });
      await this.prisma.ledgerEntry.create({
        data: {
          type: 'invoice_payment',
          refType: 'Payment',
          refId: payment.id,
          debitAccount: '1200',
          creditAccount: '8400',
          amountMinor: payment.amountMinor,
          siteId: invoice.siteId,
        },
      });
      await this.delinquency.markPaid(payment.invoiceId);
    }

    return { received: true };
  }
}
```

### 5.4 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=mollie-webhook.controller --no-coverage
```

Expected: `PASS  src/modules/payments/mollie-webhook.controller.spec.ts` with 2 passing tests.

### 5.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/payments/mollie-webhook.controller.ts apps/api/src/modules/payments/mollie-webhook.controller.spec.ts
git commit -m "feat(payments): MollieWebhookController — public webhook updates Payment/LedgerEntry"
git push
```

---

## Task 6 — Mandate endpoints under OrganisationController (with tests)

### 6.1 Write failing test

- [ ] Create `apps/api/src/modules/billing/mandate-org.controller.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { MandateOrgController } from './mandate-org.controller';

const mockMandate = {
  createMandate: vi.fn().mockResolvedValue({ id: 'man_01', scheme: 'sepa_core', status: 'pending' }),
  listMandates: vi.fn().mockResolvedValue([{ id: 'man_01' }]),
};

const controller = new MandateOrgController(mockMandate as any);

describe('MandateOrgController', () => {
  it('createMandate delegates to MandateService', async () => {
    const result = await controller.createMandate('org_01', 'cust_01', {
      scheme: 'sepa_core',
      ibanLast4: '4321',
    });
    expect(mockMandate.createMandate).toHaveBeenCalledWith('cust_01', 'sepa_core', '4321', 'operator', undefined);
    expect(result).toHaveProperty('id');
  });

  it('listMandates returns all mandates for customer', async () => {
    const result = await controller.listMandates('org_01', 'cust_01');
    expect(mockMandate.listMandates).toHaveBeenCalledWith('cust_01');
    expect(result).toHaveLength(1);
  });
});
```

### 6.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=mandate-org.controller --no-coverage
```

Expected: `FAIL  src/modules/billing/mandate-org.controller.spec.ts`

### 6.3 Extend `MandateService` with `listMandates`

- [ ] Modify `apps/api/src/modules/billing/mandate.service.ts` — replace entire file:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class MandateService {
  constructor(private prisma: PrismaClient) {}

  async createMandate(customerId: string, scheme: string, ibanLast4?: string, consentSource?: string, stripeSetupId?: string) {
    return this.prisma.mandate.create({
      data: { customerId, scheme: scheme as any, reference: `MAN-${Date.now()}`, ibanLast4, consentSource, stripeSetupId, status: 'pending' },
    });
  }

  async activateMandate(mandateId: string) {
    return this.prisma.mandate.update({ where: { id: mandateId }, data: { status: 'active', signedAt: new Date() } });
  }

  async listMandates(customerId: string) {
    return this.prisma.mandate.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' } });
  }
}
```

### 6.4 Implement controller

- [ ] Create `apps/api/src/modules/billing/mandate-org.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { MandateService } from './mandate.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class MandateOrgController {
  constructor(private readonly mandate: MandateService) {}

  @Post('customers/:customerId/mandates')
  @ApiOperation({ summary: 'Create a payment mandate for a customer' })
  createMandate(
    @Param('organisationId') _orgId: string,
    @Param('customerId') customerId: string,
    @Body() body: { scheme: string; ibanLast4?: string; stripeSetupId?: string },
  ) {
    return this.mandate.createMandate(customerId, body.scheme, body.ibanLast4, 'operator', body.stripeSetupId);
  }

  @Get('customers/:customerId/mandates')
  @ApiOperation({ summary: 'List payment mandates for a customer' })
  listMandates(
    @Param('organisationId') _orgId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.mandate.listMandates(customerId);
  }
}
```

### 6.5 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=mandate-org.controller --no-coverage
```

Expected: `PASS  src/modules/billing/mandate-org.controller.spec.ts` with 2 passing tests.

### 6.6 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/billing/mandate.service.ts apps/api/src/modules/billing/mandate-org.controller.ts apps/api/src/modules/billing/mandate-org.controller.spec.ts
git commit -m "feat(billing): MandateOrgController + MandateService.listMandates"
git push
```

---

## Task 7 — `DelinquencyOrgController` (with tests)

### 7.1 Write failing test

- [ ] Create `apps/api/src/modules/billing/delinquency-org.controller.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { DelinquencyOrgController } from './delinquency-org.controller';
import { ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  delinquencyPolicy: {
    findFirst: vi.fn().mockResolvedValue({ id: 'pol_01', siteId: 's1', overdueDays: 14, lockoutEnabled: true }),
    upsert: vi.fn().mockResolvedValue({ id: 'pol_01', overdueDays: 21, lockoutEnabled: false }),
  },
};
const mockDelinquency = { checkOverdueInvoices: vi.fn().mockResolvedValue(undefined) };

const controller = new DelinquencyOrgController(mockDelinquency as any, mockPrisma as any);

describe('DelinquencyOrgController', () => {
  it('getPolicy returns delinquency policy for site', async () => {
    const result = await controller.getPolicy('org_01', 's1');
    expect(mockPrisma.delinquencyPolicy.findFirst).toHaveBeenCalledWith({ where: { siteId: 's1' } });
    expect(result).toHaveProperty('overdueDays');
  });

  it('updatePolicy upserts policy for site', async () => {
    const result = await controller.updatePolicy('org_01', 's1', { overdueDays: 21, lockoutEnabled: false });
    expect(mockPrisma.delinquencyPolicy.upsert).toHaveBeenCalled();
    expect(result).toHaveProperty('overdueDays', 21);
  });

  it('runDelinquency calls DelinquencyService for owner', async () => {
    await controller.runDelinquency('org_01', { body: { siteId: 's1' } } as any, { role: 'owner' } as any);
    expect(mockDelinquency.checkOverdueInvoices).toHaveBeenCalledWith('s1');
  });

  it('runDelinquency throws ForbiddenException for non-owner', async () => {
    await expect(
      controller.runDelinquency('org_01', { body: { siteId: 's1' } } as any, { role: 'member' } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

### 7.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=delinquency-org.controller --no-coverage
```

Expected: `FAIL  src/modules/billing/delinquency-org.controller.spec.ts`

### 7.3 Implement

- [ ] Create `apps/api/src/modules/billing/delinquency-org.controller.ts`:

```typescript
import { Controller, Get, Put, Post, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { PrismaClient } from '@prisma/client';
import { DelinquencyService } from './delinquency.service';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class DelinquencyOrgController {
  constructor(
    private readonly delinquency: DelinquencyService,
    private readonly prisma: PrismaClient,
  ) {}

  @Get('sites/:siteId/delinquency-policy')
  @ApiOperation({ summary: 'Get delinquency policy for a site' })
  getPolicy(
    @Param('organisationId') _orgId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.prisma.delinquencyPolicy.findFirst({ where: { siteId } });
  }

  @Put('sites/:siteId/delinquency-policy')
  @ApiOperation({ summary: 'Upsert delinquency policy for a site (owner only)' })
  updatePolicy(
    @Param('organisationId') _orgId: string,
    @Param('siteId') siteId: string,
    @Body() body: { overdueDays?: number; lockoutEnabled?: boolean; lateFeeRules?: object },
  ) {
    return this.prisma.delinquencyPolicy.upsert({
      where: { siteId },
      create: { siteId, overdueDays: body.overdueDays ?? 14, lockoutEnabled: body.lockoutEnabled ?? true, lateFeeRules: body.lateFeeRules ?? {} },
      update: { overdueDays: body.overdueDays, lockoutEnabled: body.lockoutEnabled, lateFeeRules: body.lateFeeRules },
    });
  }

  @Post('billing/run-delinquency')
  @ApiOperation({ summary: 'Run delinquency check for a site (owner only)' })
  async runDelinquency(
    @Param('organisationId') _orgId: string,
    @Body() body: { siteId: string },
    @CurrentMember() member: MemberContext,
  ) {
    if (member.role !== 'owner') throw new ForbiddenException('Only owners can trigger delinquency runs');
    await this.delinquency.checkOverdueInvoices(body.siteId);
    return { ok: true, siteId: body.siteId };
  }
}
```

### 7.4 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=delinquency-org.controller --no-coverage
```

Expected: `PASS  src/modules/billing/delinquency-org.controller.spec.ts` with 4 passing tests.

### 7.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/billing/delinquency-org.controller.ts apps/api/src/modules/billing/delinquency-org.controller.spec.ts
git commit -m "feat(billing): DelinquencyOrgController — policy GET/PUT and run-delinquency POST"
git push
```

---

## Task 8 — DATEV export endpoints under OrganisationController (with tests)

### 8.1 Write failing test

- [ ] Create `apps/api/src/modules/payments/datev-org.controller.spec.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { DatevOrgController } from './datev-org.controller';

const mockDatevExport = {
  runExport: vi.fn().mockResolvedValue({ exportJobId: 'job_01', downloadUrl: 'https://minio/signed' }),
};
const mockPrisma = {
  exportJob: {
    create: vi.fn().mockResolvedValue({ id: 'job_01', status: 'queued' }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'job_01', status: 'done', downloadUrl: 'https://minio/signed' }),
  },
};

const controller = new DatevOrgController(mockDatevExport as any, mockPrisma as any);

describe('DatevOrgController', () => {
  it('exportDatev creates export job and triggers DatevExportService', async () => {
    const result = await controller.exportDatev('org_01', { siteIds: ['s1'], from: '2026-01-01', to: '2026-01-31' });
    expect(mockDatevExport.runExport).toHaveBeenCalledWith(
      ['s1'],
      expect.any(Date),
      expect.any(Date),
    );
    expect(result).toHaveProperty('jobId');
    expect(result).toHaveProperty('downloadUrl');
  });

  it('getExportJob returns job status and downloadUrl', async () => {
    const result = await controller.getExportJob('org_01', 'job_01');
    expect(mockPrisma.exportJob.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'job_01' } });
    expect(result).toHaveProperty('status', 'done');
    expect(result).toHaveProperty('downloadUrl');
  });
});
```

### 8.2 Run — expect FAIL

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=datev-org.controller --no-coverage
```

Expected: `FAIL  src/modules/payments/datev-org.controller.spec.ts`

### 8.3 Implement

- [ ] Create `apps/api/src/modules/payments/datev-org.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { PrismaClient } from '@prisma/client';
import { DatevExportService } from './datev-export.service';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class DatevOrgController {
  constructor(
    private readonly datevExport: DatevExportService,
    private readonly prisma: PrismaClient,
  ) {}

  @Post('export/datev')
  @ApiOperation({ summary: 'Queue and run DATEV CSV export; returns { jobId, downloadUrl }' })
  async exportDatev(
    @Param('organisationId') _orgId: string,
    @Body() body: { siteIds: string[]; from: string; to: string },
  ) {
    const from = new Date(body.from);
    const to = new Date(body.to);
    const job = await this.prisma.exportJob.create({
      data: { kind: 'datev', scope: { siteIds: body.siteIds, from: body.from, to: body.to }, status: 'queued' },
    });
    const result = await this.datevExport.runExport(body.siteIds, from, to);
    await this.prisma.exportJob.update({ where: { id: job.id }, data: { status: 'done', downloadUrl: result.downloadUrl, completedAt: new Date() } });
    return { jobId: job.id, downloadUrl: result.downloadUrl };
  }

  @Get('export/:jobId')
  @ApiOperation({ summary: 'Poll export job status and downloadUrl' })
  getExportJob(
    @Param('organisationId') _orgId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.prisma.exportJob.findUniqueOrThrow({ where: { id: jobId } });
  }
}
```

### 8.4 Run — expect PASS

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --testPathPattern=datev-org.controller --no-coverage
```

Expected: `PASS  src/modules/payments/datev-org.controller.spec.ts` with 2 passing tests.

### 8.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/payments/datev-org.controller.ts apps/api/src/modules/payments/datev-org.controller.spec.ts
git commit -m "feat(payments): DatevOrgController — org-scoped DATEV export with ExportJob tracking"
git push
```

---

## Task 9 — Wire everything into NestJS modules

### 9.1 Update `BillingModule`

- [ ] Modify `apps/api/src/modules/billing/billing.module.ts` — replace entire file:

```typescript
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
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [BillingController, BillingOrgController, MandateOrgController, DelinquencyOrgController],
  providers: [
    BillingService,
    InvoiceRunService,
    DelinquencyService,
    MandateService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [BillingService, InvoiceRunService, DelinquencyService, MandateService],
})
export class BillingModule {}
```

### 9.2 Update `PaymentsModule`

- [ ] Modify `apps/api/src/modules/payments/payments.module.ts` — replace entire file:

```typescript
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeAdapter } from './stripe.adapter';
import { MollieAdapter } from './mollie.adapter';
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
  imports: [AuditModule, BillingModule],
  controllers: [PaymentsController, MollieWebhookController, DatevOrgController],
  providers: [
    PaymentsService,
    StripeAdapter,
    MollieAdapter,
    LedgerService,
    EInvoiceService,
    { provide: PrismaClient, useValue: new PrismaClient() },
    { provide: DatevExportService, useValue: new DatevExportService(new PrismaClient(), stubStorage) },
  ],
  exports: [PaymentsService, LedgerService, MollieAdapter],
})
export class PaymentsModule {}
```

**Note:** `BillingOrgController` injects `MollieAdapter` — we must ensure `MollieAdapter` is available. Since `PaymentsModule` exports it and `BillingModule` imports `PaymentsModule`, we need to add `PaymentsModule` to `BillingModule` imports. However, this creates a circular dependency (`BillingModule` ↔ `PaymentsModule`).

**Resolution:** Move `MollieAdapter` to a dedicated lightweight `MollieModule` and import it in both.

- [ ] Create `apps/api/src/modules/payments/mollie.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MollieAdapter } from './mollie.adapter';

@Module({
  providers: [MollieAdapter],
  exports: [MollieAdapter],
})
export class MollieModule {}
```

- [ ] Modify `apps/api/src/modules/billing/billing.module.ts` — add `MollieModule` import:

```typescript
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
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule, MollieModule],
  controllers: [BillingController, BillingOrgController, MandateOrgController, DelinquencyOrgController],
  providers: [
    BillingService,
    InvoiceRunService,
    DelinquencyService,
    MandateService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [BillingService, InvoiceRunService, DelinquencyService, MandateService],
})
export class BillingModule {}
```

- [ ] Update `PaymentsModule` to NOT re-provide `MollieAdapter` (it imports `MollieModule`):

```typescript
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
```

### 9.3 Build to verify compilation

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx nest build 2>&1
```

Expected: `Successfully compiled project with no errors.`

If there are compilation errors, fix them before proceeding. Common fixes:
- Missing imports: add the import path
- Circular dependency: check which module introduced it; extract the shared service into a new `XyzModule`

### 9.4 Run all tests

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --no-coverage 2>&1 | tail -20
```

Expected: all test files pass (`PASS`), zero failures.

### 9.5 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/api/src/modules/billing/billing.module.ts apps/api/src/modules/payments/payments.module.ts apps/api/src/modules/payments/mollie.module.ts
git commit -m "feat(modules): wire BillingOrgController, MandateOrgController, DelinquencyOrgController, MollieWebhookController, DatevOrgController into NestJS modules"
git push
```

---

## Task 10 — Frontend: `/invoices` list page

### 10.1 Create page

- [ ] Create `apps/web/src/app/invoices/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface InvoiceRow {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  siteId: string;
  agreement: {
    customer: {
      id: string;
      personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
    };
  };
  lines?: unknown[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-100 text-slate-400',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

function tenantName(customer: InvoiceRow['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || customer.id;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { siteId?: string; status?: string };
}) {
  const user = await requireAuth();
  const params = new URLSearchParams();
  if (searchParams?.siteId) params.set('siteId', searchParams.siteId);
  if (searchParams?.status) params.set('status', searchParams.status);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const invoices = await serverFetch<InvoiceRow[]>(
    `/v1/organisations/${user.organisationId}/invoices${qs}`,
  ).catch(() => [] as InvoiceRow[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">
              &larr; Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          </div>
          <div className="flex gap-3">
            {user.role === 'owner' && (
              <>
                <ExportDatevButton orgId={user.organisationId} />
                <RunInvoicesButton orgId={user.organisationId} />
              </>
            )}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No invoices found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Tenant</th>
                  <th className="text-left px-6 py-3">Invoice date</th>
                  <th className="text-left px-6 py-3">Due date</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {tenantName(inv.agreement.customer)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inv.invoiceDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-900">
                      {formatMinor(inv.totalMinor, inv.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status] ?? 'bg-slate-100 text-slate-500'}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Island components ────────────────────────────────────────────────────────

function RunInvoicesButton({ orgId }: { orgId: string }) {
  return (
    <form action={`/api/billing/run-invoices`} method="POST">
      <input type="hidden" name="organisationId" value={orgId} />
      <button
        type="submit"
        className="bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800"
      >
        Run invoices
      </button>
    </form>
  );
}

function ExportDatevButton({ orgId }: { orgId: string }) {
  return (
    <Link
      href={`/invoices/export`}
      className="border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50"
    >
      Export DATEV
    </Link>
  );
}
```

### 10.2 Create BFF route handler for Run Invoices

- [ ] Create `apps/web/src/app/api/billing/run-invoices/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const orgId = body.organisationId ?? ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/invoices/run`, 'POST', ctx.token);
}
```

### 10.3 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/web/src/app/invoices/page.tsx apps/web/src/app/api/billing/run-invoices/route.ts
git commit -m "feat(web): /invoices list page with run-invoices BFF route"
git push
```

---

## Task 11 — Frontend: `/invoices/[id]` detail page with Pay Now

### 11.1 Create page

- [ ] Create `apps/web/src/app/invoices/[id]/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface InvoiceLine {
  id: string;
  kind: string;
  description: string;
  amountMinor: number;
  vatRate?: number;
}

interface Payment {
  id: string;
  method: string;
  status: string;
  amountMinor: number;
  createdAt: string;
}

interface CreditNote {
  id: string;
  amountMinor: number;
  reason: string;
  createdAt: string;
}

interface InvoiceDetail {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  periodStart: string;
  periodEnd: string;
  lines: InvoiceLine[];
  payments: Payment[];
  credits: CreditNote[];
  agreement: {
    customer: {
      id: string;
      personOrOrgData: { firstName?: string; lastName?: string; companyName?: string; name?: string };
    };
  };
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-100 text-slate-400',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

function tenantName(customer: InvoiceDetail['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || customer.id;
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const invoice = await serverFetch<InvoiceDetail>(
    `/v1/organisations/${user.organisationId}/invoices/${params.id}`,
  );

  const canPay = ['pending', 'sent', 'overdue'].includes(invoice.status);
  const canVoid = user.role === 'owner' && ['pending', 'sent', 'overdue'].includes(invoice.status);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Invoices
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invoice</h1>
            <p className="text-slate-500 text-sm font-mono">{invoice.id}</p>
          </div>
          <span
            className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}
          >
            {invoice.status}
          </span>
        </div>

        {/* Meta */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-0.5">Tenant</p>
            <p className="font-medium text-slate-900">{tenantName(invoice.agreement.customer)}</p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Invoice date</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Due date</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.dueDate).toLocaleDateString('de-DE')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-0.5">Period</p>
            <p className="font-medium text-slate-900">
              {new Date(invoice.periodStart).toLocaleDateString('de-DE')} –{' '}
              {new Date(invoice.periodEnd).toLocaleDateString('de-DE')}
            </p>
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
          <h2 className="text-sm font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
            Line items
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Description</th>
                <th className="text-left px-6 py-3">Kind</th>
                <th className="text-right px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-6 py-3 text-slate-900">{line.description}</td>
                  <td className="px-6 py-3 text-slate-500">{line.kind}</td>
                  <td className="px-6 py-3 text-right font-mono text-slate-900">
                    {formatMinor(line.amountMinor, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={2} className="px-6 py-3 font-semibold text-slate-700 text-right">
                  Total
                </td>
                <td className="px-6 py-3 text-right font-bold text-slate-900 font-mono">
                  {formatMinor(invoice.totalMinor, invoice.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment history */}
        {invoice.payments.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
            <h2 className="text-sm font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
              Payment history
            </h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Method</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-right px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.payments.map((pay) => (
                  <tr key={pay.id}>
                    <td className="px-6 py-3 text-slate-700">{pay.method}</td>
                    <td className="px-6 py-3 text-slate-500">{pay.status}</td>
                    <td className="px-6 py-3 text-right font-mono">{formatMinor(pay.amountMinor, invoice.currency)}</td>
                    <td className="px-6 py-3 text-slate-400">{new Date(pay.createdAt).toLocaleDateString('de-DE')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Credit notes */}
        {invoice.credits.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
            <h2 className="text-sm font-semibold text-slate-700 px-6 py-4 border-b border-slate-100">
              Credit notes
            </h2>
            <ul className="divide-y divide-slate-100">
              {invoice.credits.map((cn) => (
                <li key={cn.id} className="px-6 py-3 flex justify-between text-sm">
                  <span className="text-slate-700">{cn.reason}</span>
                  <span className="font-mono text-slate-900">{formatMinor(cn.amountMinor, invoice.currency)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {canPay && (
            <PayNowButton orgId={user.organisationId} invoiceId={invoice.id} />
          )}
          {canVoid && (
            <VoidInvoiceButton orgId={user.organisationId} invoiceId={invoice.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Island action components ─────────────────────────────────────────────────

function PayNowButton({ orgId, invoiceId }: { orgId: string; invoiceId: string }) {
  return (
    <form action="/api/billing/pay-invoice" method="POST">
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button
        type="submit"
        className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700"
      >
        Pay now (Mollie)
      </button>
    </form>
  );
}

function VoidInvoiceButton({ orgId, invoiceId }: { orgId: string; invoiceId: string }) {
  return (
    <form action="/api/billing/void-invoice" method="POST">
      <input type="hidden" name="organisationId" value={orgId} />
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <button
        type="submit"
        className="border border-red-300 text-red-600 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-50"
      >
        Void invoice
      </button>
    </form>
  );
}
```

### 11.2 Create BFF route handlers

- [ ] Create `apps/web/src/app/api/billing/pay-invoice/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-route-helpers';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { organisationId, invoiceId } = body;

  const res = await fetch(
    `${API_URL}/v1/organisations/${organisationId}/invoices/${invoiceId}/pay`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ctx.token}` },
    },
  );
  const data = await res.json().catch(() => ({}));

  if (res.ok && data.checkoutUrl) {
    // Redirect to Mollie checkout in new tab — return URL for client redirect
    return NextResponse.json({ checkoutUrl: data.checkoutUrl }, { status: 200 });
  }
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] Create `apps/web/src/app/api/billing/void-invoice/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { organisationId, invoiceId, reason } = body;
  return proxyToBackend(
    `/v1/organisations/${organisationId}/invoices/${invoiceId}/void`,
    'POST',
    ctx.token,
    { reason: reason ?? 'Voided by operator' },
  );
}
```

### 11.3 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/web/src/app/invoices/[id]/page.tsx apps/web/src/app/api/billing/pay-invoice/route.ts apps/web/src/app/api/billing/void-invoice/route.ts
git commit -m "feat(web): /invoices/[id] detail page with Pay Now (Mollie) and Void actions"
git push
```

---

## Task 12 — Frontend: DATEV export page with polling UI

### 12.1 Create page

- [ ] Create `apps/web/src/app/invoices/export/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ExportResult {
  jobId: string;
  downloadUrl: string;
}

export default function DatevExportPage() {
  const [siteIds, setSiteIds] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/billing/export-datev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteIds: siteIds.split(',').map((s) => s.trim()).filter(Boolean),
          from,
          to,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Export failed: ${res.status}`);
        return;
      }
      const data: ExportResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-xl mx-auto">
        <Link href="/invoices" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Invoices
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Export to DATEV</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site IDs (comma-separated)
            </label>
            <input
              type="text"
              value={siteIds}
              onChange={(e) => setSiteIds(e.target.value)}
              placeholder="site_abc, site_xyz"
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-700 text-white font-semibold text-sm py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Generating export…' : 'Export CSV'}
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm">
            <p className="font-semibold mb-2">Export complete!</p>
            <p className="text-xs text-green-600 font-mono mb-3">Job ID: {result.jobId}</p>
            <a
              href={result.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-800"
            >
              Download DATEV CSV
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 12.2 Create BFF route handler for DATEV export

- [ ] Create `apps/web/src/app/api/billing/export-datev/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/export/datev`, 'POST', ctx.token, body);
}
```

### 12.3 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/web/src/app/invoices/export/page.tsx apps/web/src/app/api/billing/export-datev/route.ts
git commit -m "feat(web): DATEV export page at /invoices/export with polling download UI"
git push
```

---

## Task 13 — Frontend: delinquency policy form in site settings

### 13.1 Create page

- [ ] Create `apps/web/src/app/sites/[siteId]/delinquency/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface DelinquencyPolicy {
  id?: string;
  siteId: string;
  overdueDays: number;
  lockoutEnabled: boolean;
}

export default function DelinquencyPolicyPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;

  const [policy, setPolicy] = useState<DelinquencyPolicy | null>(null);
  const [overdueDays, setOverdueDays] = useState(14);
  const [lockoutEnabled, setLockoutEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/billing/delinquency-policy?siteId=${siteId}`)
      .then((r) => r.json())
      .then((data: DelinquencyPolicy | null) => {
        if (data) {
          setPolicy(data);
          setOverdueDays(data.overdueDays);
          setLockoutEnabled(data.lockoutEnabled);
        }
      })
      .catch(() => {});
  }, [siteId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/billing/delinquency-policy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, overdueDays, lockoutEnabled }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? `Save failed: ${res.status}`);
        return;
      }
      const updated: DelinquencyPolicy = await res.json();
      setPolicy(updated);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-xl mx-auto">
        <Link href={`/sites/${siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Site settings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Delinquency policy</h1>
        <p className="text-slate-500 text-sm mb-8">
          Configure when invoices are marked overdue and whether lockout is enforced.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Overdue threshold (days after due date)
            </label>
            <input
              type="number"
              min={1}
              max={90}
              value={overdueDays}
              onChange={(e) => setOverdueDays(Number(e.target.value))}
              required
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="lockout"
              type="checkbox"
              checked={lockoutEnabled}
              onChange={(e) => setLockoutEnabled(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="lockout" className="text-sm text-slate-700">
              Enable access lockout for overdue tenants
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white font-semibold text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save policy'}
          </button>
        </form>

        {saved && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
            Policy saved.
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 13.2 Create BFF route handlers for delinquency policy

- [ ] Create `apps/web/src/app/api/billing/delinquency-policy/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) return new Response(JSON.stringify({ message: 'siteId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/sites/${siteId}/delinquency-policy`, 'GET', ctx.token);
}

export async function PUT(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { siteId, ...rest } = body;
  if (!siteId) return new Response(JSON.stringify({ message: 'siteId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/sites/${siteId}/delinquency-policy`, 'PUT', ctx.token, rest);
}
```

### 13.3 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/web/src/app/sites/[siteId]/delinquency/page.tsx apps/web/src/app/api/billing/delinquency-policy/route.ts
git commit -m "feat(web): delinquency policy form at /sites/[siteId]/delinquency"
git push
```

---

## Task 14 — Frontend: mandate section on customer detail (linked from agreements)

### 14.1 Create customer mandates page

- [ ] Create `apps/web/src/app/customers/[customerId]/mandates/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Mandate {
  id: string;
  scheme: string;
  status: string;
  ibanLast4?: string;
  signedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
  failed: 'bg-red-100 text-red-700',
};

export default function CustomerMandatesPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;

  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheme, setScheme] = useState('sepa_core');
  const [ibanLast4, setIbanLast4] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMandates() {
    setLoading(true);
    const res = await fetch(`/api/billing/mandates?customerId=${customerId}`).catch(() => null);
    if (res?.ok) {
      const data: Mandate[] = await res.json();
      setMandates(data);
    }
    setLoading(false);
  }

  useEffect(() => { loadMandates(); }, [customerId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/mandates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, scheme, ibanLast4: ibanLast4 || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? 'Failed to create mandate');
        return;
      }
      setIbanLast4('');
      await loadMandates();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment mandates</h1>
        <p className="text-slate-500 text-sm font-mono mb-8">Customer: {customerId}</p>

        {/* Mandate list */}
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : mandates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-6 text-center text-slate-500 text-sm mb-6">
            No mandates yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Scheme</th>
                  <th className="text-left px-6 py-3">IBAN last 4</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mandates.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{m.scheme}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{m.ibanLast4 ?? '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[m.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add mandate form */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Add mandate</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scheme</label>
              <select
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="sepa_core">SEPA Core</option>
                <option value="sepa_b2b">SEPA B2B</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="manual_invoice">Manual invoice</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            {(scheme === 'sepa_core' || scheme === 'sepa_b2b') && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">IBAN last 4 digits</label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  value={ibanLast4}
                  onChange={(e) => setIbanLast4(e.target.value)}
                  placeholder="4321"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-blue-600 text-white font-semibold text-sm py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create mandate'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### 14.2 Create BFF route handlers for mandates

- [ ] Create `apps/web/src/app/api/billing/mandates/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const customerId = req.nextUrl.searchParams.get('customerId');
  if (!customerId) return new Response(JSON.stringify({ message: 'customerId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/customers/${customerId}/mandates`, 'GET', ctx.token);
}

export async function POST(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { customerId, ...rest } = body;
  if (!customerId) return new Response(JSON.stringify({ message: 'customerId required' }), { status: 400 });
  const orgId = ctx.payload.organisationId;
  return proxyToBackend(`/v1/organisations/${orgId}/customers/${customerId}/mandates`, 'POST', ctx.token, rest);
}
```

### 14.3 Commit

```bash
cd /Users/rafayhabibullah/sitelager
git add apps/web/src/app/customers/[customerId]/mandates/page.tsx apps/web/src/app/api/billing/mandates/route.ts
git commit -m "feat(web): customer mandate management page at /customers/[customerId]/mandates"
git push
```

---

## Task 15 — Final build + full test suite

### 15.1 Build API

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx nest build 2>&1
```

Expected: `Successfully compiled project with no errors.`

### 15.2 Run all API tests

```bash
cd /Users/rafayhabibullah/sitelager/apps/api
npx vitest run --no-coverage 2>&1 | tail -30
```

Expected: every `*.spec.ts` file shows `PASS`. No failures.

### 15.3 TypeScript check on web

```bash
cd /Users/rafayhabibullah/sitelager/apps/web
npx tsc --noEmit 2>&1
```

Expected: no errors (0 lines of output or only informational messages).

### 15.4 Final commit if any stray changes

```bash
cd /Users/rafayhabibullah/sitelager
git status
# If there are any uncommitted changes from fixes, add and commit:
git add -p
git commit -m "fix: address build/type errors after integration"
git push
```

---

## Self-review checklist

### API endpoints (all protected by `JwtAuthGuard + OrganisationGuard` unless marked public)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/v1/organisations/:orgId/invoices` | List invoices (query: siteId, agreementId, status) |
| `GET`  | `/v1/organisations/:orgId/invoices/:invoiceId` | Invoice detail with lines, payments, credit notes |
| `POST` | `/v1/organisations/:orgId/invoices/run` | Trigger invoice run (owner only) |
| `POST` | `/v1/organisations/:orgId/invoices/:invoiceId/void` | Void invoice + create credit note |
| `POST` | `/v1/organisations/:orgId/invoices/:invoiceId/pay` | Create Mollie payment link → `{ checkoutUrl }` |
| `POST` | `/v1/organisations/:orgId/customers/:customerId/mandates` | Create payment mandate |
| `GET`  | `/v1/organisations/:orgId/customers/:customerId/mandates` | List mandates |
| `GET`  | `/v1/organisations/:orgId/sites/:siteId/delinquency-policy` | Get delinquency policy |
| `PUT`  | `/v1/organisations/:orgId/sites/:siteId/delinquency-policy` | Upsert delinquency policy |
| `POST` | `/v1/organisations/:orgId/billing/run-delinquency` | Run delinquency check (owner only) |
| `POST` | `/v1/organisations/:orgId/export/datev` | Queue + run DATEV export → `{ jobId, downloadUrl }` |
| `GET`  | `/v1/organisations/:orgId/export/:jobId` | Poll export job status |
| `POST` | `/v1/webhooks/mollie` | **Public** — Mollie payment webhook |

### UI pages

| Route | Description |
|-------|-------------|
| `/invoices` | Invoice list table; Run invoices button (owner); Export DATEV link |
| `/invoices/[id]` | Invoice detail with line items, payment history, credit notes; Pay Now (Mollie); Void (owner) |
| `/invoices/export` | DATEV export form (site IDs, date range) with download link on completion |
| `/sites/[siteId]/delinquency` | Delinquency policy form (overdue days, lockout toggle) |
| `/customers/[customerId]/mandates` | Mandate list + add mandate form |

### BFF route handlers (Next.js App Router)

| Path | Method | Proxies to |
|------|--------|-----------|
| `/api/billing/run-invoices` | POST | `POST /v1/organisations/:orgId/invoices/run` |
| `/api/billing/pay-invoice` | POST | `POST /v1/organisations/:orgId/invoices/:invoiceId/pay` |
| `/api/billing/void-invoice` | POST | `POST /v1/organisations/:orgId/invoices/:invoiceId/void` |
| `/api/billing/export-datev` | POST | `POST /v1/organisations/:orgId/export/datev` |
| `/api/billing/delinquency-policy` | GET | `GET /v1/organisations/:orgId/sites/:siteId/delinquency-policy` |
| `/api/billing/delinquency-policy` | PUT | `PUT /v1/organisations/:orgId/sites/:siteId/delinquency-policy` |
| `/api/billing/mandates` | GET | `GET /v1/organisations/:orgId/customers/:customerId/mandates` |
| `/api/billing/mandates` | POST | `POST /v1/organisations/:orgId/customers/:customerId/mandates` |
