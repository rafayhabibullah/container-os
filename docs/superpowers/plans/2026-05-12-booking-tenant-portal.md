# Booking & Tenant Portal — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the end-to-end online booking flow (public checkout wizard → reservation creation), operator-facing reservations and agreements management pages, and replace the `/my-storage` stub with a real tenant portal showing active agreements and invoices.

**Architecture:** Three new backend modules are added — `CheckoutModule` (public endpoints for checkout session confirmation and customer creation), `OperatorReservationsModule` (org-scoped CRUD + status transitions + agreement creation), and `TenantPortalModule` (tenant-scoped agreement/invoice read endpoints protected by `JwtAuthGuard` only, no `OrganisationGuard`). Frontend uses server components with `serverFetch` for reads and Next.js Route Handler BFF proxies for mutations; the multi-step booking wizard at `/storage/[slug]/book` is a Client Component using React state to step through unit selection → contact details → confirmation.

**Tech Stack:** NestJS 10, Prisma 5, class-validator, Next.js 14 App Router, TypeScript, Tailwind CSS

---

## Plan Scope (4 of 6)

| Earlier plan | Covers |
|---|---|
| Plan 1 | Auth & RBAC, JWT strategy, portal shell, login/register/accept-invite pages |
| Plan 2 | Org/Site/Team management UI and API |
| Plan 3 | Units, Listings, Public Marketplace (`/storage`, `/storage/[slug]`) |

| Later plan | Covers |
|---|---|
| Plan 5 | Invoicing, Mollie Payments, SEPA mandates |
| Plan 6 | Operations, Reports, Admin hardening |

---

## What already exists — do NOT re-implement

**Schema models (in `apps/api/prisma/schema.prisma`):**
- `Reservation`, `ReservationHold`, `Agreement`, `AgreementAmendment`, `AgreementTemplate`, `Signatory`, `TerminationRequest`, `Customer`, `Contact`, `Lead`, `CheckoutSession`, `Invoice`, `InvoiceLine`

**Existing API modules:**
- `apps/api/src/modules/reservations/` — `ReservationsService.createReservation`, `confirmReservation`, `cancelReservation`; controller at `public/v1/reservations`
- `apps/api/src/modules/agreements/` — `AgreementsService.draftAgreement`, `activateAgreement`, `signAgreement`, `requestMoveOut`; controller at `operator/v1/agreements` and `tenant/v1/agreements`
- `apps/api/src/modules/storefront/` — `StorefrontService.createCheckoutSession` (creates `ReservationHold` + `CheckoutSession`); controller at `public/v1/checkout-sessions`
- `apps/api/src/modules/crm-leads/` — `CrmLeadsService.createLead` (deduplicates Customer+Contact)
- `apps/api/src/modules/notifications/` — `NotificationsService.sendNotification`
- `apps/api/src/modules/auth/` — `JwtAuthGuard` at `apps/api/src/common/guards/auth.guard.ts`, `OrganisationGuard` at `apps/api/src/common/guards/organisation.guard.ts`, `CurrentUser` decorator at `apps/api/src/common/decorators/current-user.decorator.ts`, `CurrentMember` at `apps/api/src/common/decorators/current-member.decorator.ts`

**Existing web pages (`apps/web/src/app/`):**
- `/storage/[slug]` — public site detail page (Plan 3)
- `serverFetch<T>` at `apps/web/src/lib/server-api.ts`
- `getAuthContext()`, `proxyToBackend()` at `apps/web/src/lib/api-route-helpers.ts`
- `requireAuth()`, `TokenPayload` at `apps/web/src/lib/auth.ts`

---

## File Map

### New (backend)
- `apps/api/src/modules/checkout/checkout.service.ts`
- `apps/api/src/modules/checkout/checkout.service.spec.ts`
- `apps/api/src/modules/checkout/checkout.controller.ts`
- `apps/api/src/modules/checkout/checkout.module.ts`
- `apps/api/src/modules/operator-reservations/operator-reservations.service.ts`
- `apps/api/src/modules/operator-reservations/operator-reservations.service.spec.ts`
- `apps/api/src/modules/operator-reservations/operator-reservations.controller.ts`
- `apps/api/src/modules/operator-reservations/operator-reservations.module.ts`
- `apps/api/src/modules/operator-agreements/operator-agreements.service.ts`
- `apps/api/src/modules/operator-agreements/operator-agreements.service.spec.ts`
- `apps/api/src/modules/operator-agreements/operator-agreements.controller.ts`
- `apps/api/src/modules/operator-agreements/operator-agreements.module.ts`
- `apps/api/src/modules/tenant-portal/tenant-portal.service.ts`
- `apps/api/src/modules/tenant-portal/tenant-portal.service.spec.ts`
- `apps/api/src/modules/tenant-portal/tenant-portal.controller.ts`
- `apps/api/src/modules/tenant-portal/tenant-portal.module.ts`

### Modified (backend)
- `apps/api/src/app.module.ts` — add four new module imports

### New (frontend)
- `apps/web/src/app/storage/[slug]/book/page.tsx` — multi-step booking wizard (Client Component)
- `apps/web/src/app/api/checkout/route.ts` — POST → create checkout session
- `apps/web/src/app/api/checkout/[sessionId]/confirm/route.ts` — POST → confirm checkout
- `apps/web/src/app/reservations/page.tsx` — operator reservations table
- `apps/web/src/app/api/reservations/route.ts` — GET list (proxy)
- `apps/web/src/app/api/reservations/[id]/route.ts` — PATCH status, POST agreement
- `apps/web/src/app/agreements/page.tsx` — operator agreements table
- `apps/web/src/app/agreements/[id]/page.tsx` — agreement detail
- `apps/web/src/app/api/agreements/route.ts` — GET list (proxy)
- `apps/web/src/app/api/agreements/[id]/route.ts` — GET detail, POST send, POST terminate
- `apps/web/src/app/my-storage/page.tsx` — replace stub: tenant active agreements
- `apps/web/src/app/my-storage/invoices/page.tsx` — tenant invoice list
- `apps/web/src/app/my-storage/agreements/[id]/page.tsx` — tenant agreement detail/download

---

## Task 1: CheckoutService — confirm checkout and create Customer + Reservation

**Files:**
- Create: `apps/api/src/modules/checkout/checkout.service.ts`
- Create: `apps/api/src/modules/checkout/checkout.service.spec.ts`
- Create: `apps/api/src/modules/checkout/checkout.controller.ts`
- Create: `apps/api/src/modules/checkout/checkout.module.ts`

### Step 1.1 — Write failing test

- [ ] Create `apps/api/src/modules/checkout/checkout.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutService } from './checkout.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  checkoutSession: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  reservationHold: {
    findFirst: vi.fn(),
  },
  customer: { create: vi.fn() },
  contact: { create: vi.fn() },
  reservation: { create: vi.fn() },
  reservationHold: { findFirst: vi.fn(), delete: vi.fn() },
};
const mockNotifications = { sendNotification: vi.fn().mockResolvedValue(undefined) };
const mockAudit = { record: vi.fn() };

const service = new CheckoutService(
  mockPrisma as any,
  mockNotifications as any,
  mockAudit as any,
);

const validSession = {
  id: 'chk_01',
  siteId: 'site_01',
  unitTypeId: 'ut_01',
  state: 'started',
  expiresAt: new Date(Date.now() + 60_000),
  metadata: { unitId: 'unit_01', startDate: new Date().toISOString() },
};

describe('CheckoutService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.checkoutSession.findUniqueOrThrow.mockResolvedValue(validSession);
    mockPrisma.reservationHold.findFirst.mockResolvedValue({
      id: 'hold_01',
      unitId: 'unit_01',
      lockToken: 'tok_01',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockPrisma.customer.create.mockResolvedValue({ id: 'cust_01' });
    mockPrisma.contact.create.mockResolvedValue({ id: 'con_01' });
    mockPrisma.reservation.create.mockResolvedValue({
      id: 'res_01',
      status: 'pending_signature',
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    mockPrisma.reservationHold.delete.mockResolvedValue({});
    mockPrisma.checkoutSession.update.mockResolvedValue({});
  });

  it('creates customer, contact, reservation and sends confirmation email', async () => {
    const result = await service.confirmCheckout('chk_01', {
      name: 'Anna Müller',
      email: 'anna@example.com',
      phone: '+49170123456',
      marketingConsent: false,
    });
    expect(result).toHaveProperty('reservationId', 'res_01');
    expect(mockPrisma.customer.create).toHaveBeenCalledOnce();
    expect(mockPrisma.contact.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'anna@example.com' }) }),
    );
    expect(mockNotifications.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'reservation.confirmed' }),
    );
  });

  it('throws when checkout session is expired', async () => {
    mockPrisma.checkoutSession.findUniqueOrThrow.mockResolvedValue({
      ...validSession,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      service.confirmCheckout('chk_01', { name: 'X', email: 'x@x.com', phone: '', marketingConsent: false }),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('throws when reservation hold is missing or expired', async () => {
    mockPrisma.reservationHold.findFirst.mockResolvedValue(null);
    await expect(
      service.confirmCheckout('chk_01', { name: 'X', email: 'x@x.com', phone: '', marketingConsent: false }),
    ).rejects.toBeInstanceOf(DomainException);
  });
});
```

- [ ] Run test to confirm it fails:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=checkout.service --no-coverage 2>&1 | tail -20
```
Expected: `Cannot find module './checkout.service'` or similar failure.

### Step 1.2 — Implement CheckoutService

- [ ] Create `apps/api/src/modules/checkout/checkout.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

interface ConfirmCheckoutInput {
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
}

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaClient,
    private notifications: NotificationsService,
    private audit: AuditService,
  ) {}

  async confirmCheckout(sessionId: string, input: ConfirmCheckoutInput) {
    const session = await this.prisma.checkoutSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.expiresAt < new Date()) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Checkout session has expired');
    }

    const meta = session.metadata as { unitId: string; startDate: string };
    const hold = await this.prisma.reservationHold.findFirst({
      where: { unitId: meta.unitId, expiresAt: { gte: new Date() } },
    });
    if (!hold) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Unit hold has expired — please restart checkout');
    }

    const customer = await this.prisma.customer.create({
      data: {
        personOrOrgData: { name: input.name, email: input.email, phone: input.phone },
        marketingConsent: input.marketingConsent,
      },
    });
    await this.prisma.contact.create({
      data: { customerId: customer.id, email: input.email, phone: input.phone || undefined },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reservation = await this.prisma.reservation.create({
      data: {
        siteId: session.siteId,
        unitId: meta.unitId,
        unitTypeId: session.unitTypeId,
        customerId: customer.id,
        startDate: new Date(meta.startDate),
        expiresAt,
        status: 'pending_signature',
      },
    });

    await this.prisma.reservationHold.delete({ where: { id: hold.id } });
    await this.prisma.checkoutSession.update({ where: { id: sessionId }, data: { state: 'completed' } });

    await this.audit.record({
      action: 'checkout.confirmed',
      subjectType: 'Reservation',
      subjectId: reservation.id,
      siteId: session.siteId,
    });

    await this.notifications.sendNotification({
      recipientId: customer.id,
      locale: 'de',
      eventType: 'reservation.confirmed',
      channel: 'email',
      vars: {
        name: input.name,
        email: input.email,
        reservationId: reservation.id,
        startDate: meta.startDate,
      },
    });

    return { reservationId: reservation.id, customerId: customer.id, status: reservation.status, expiresAt: reservation.expiresAt };
  }
}
```

- [ ] Run test to confirm it passes:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=checkout.service --no-coverage 2>&1 | tail -20
```
Expected: `3 passed`.

### Step 1.3 — Controller + Module

- [ ] Create `apps/api/src/modules/checkout/checkout.controller.ts`:

```typescript
import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Param, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

@ApiTags('public')
@Controller('public/v1/checkout')
export class CheckoutController {
  constructor(private checkout: CheckoutService) {}

  @Post(':sessionId/confirm')
  confirmCheckout(
    @Param('sessionId') sessionId: string,
    @Body() body: { name: string; email: string; phone: string; marketingConsent: boolean },
  ) {
    return this.checkout.confirmCheckout(sessionId, body);
  }
}
```

- [ ] Create `apps/api/src/modules/checkout/checkout.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [CheckoutService],
})
export class CheckoutModule {}
```

- [ ] Build check:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx nest build 2>&1 | tail -10
```
Expected: no errors.

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/api/src/modules/checkout && git commit -m "feat(checkout): CheckoutService — confirm checkout, create Customer + Reservation, send email"
```

---

## Task 2: OperatorReservationsService — list, update status, create agreement

**Files:**
- Create: `apps/api/src/modules/operator-reservations/operator-reservations.service.ts`
- Create: `apps/api/src/modules/operator-reservations/operator-reservations.service.spec.ts`
- Create: `apps/api/src/modules/operator-reservations/operator-reservations.controller.ts`
- Create: `apps/api/src/modules/operator-reservations/operator-reservations.module.ts`

### Step 2.1 — Write failing test

- [ ] Create `apps/api/src/modules/operator-reservations/operator-reservations.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperatorReservationsService } from './operator-reservations.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  reservation: {
    findMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
  },
  agreement: { create: vi.fn() },
  site: { findMany: vi.fn() },
};
const mockAudit = { record: vi.fn() };

const service = new OperatorReservationsService(mockPrisma as any, mockAudit as any);

describe('OperatorReservationsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists reservations filtered by organisationId (via site join)', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findMany.mockResolvedValue([
      { id: 'res_01', status: 'pending_signature', siteId: 'site_01' },
    ]);
    const result = await service.listReservations('org_01', {});
    expect(result).toHaveLength(1);
    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ siteId: { in: ['site_01'] } }) }),
    );
  });

  it('cancels a reservation and records audit', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findFirstOrThrow.mockResolvedValue({ id: 'res_01', siteId: 'site_01', status: 'pending_signature' });
    mockPrisma.reservation.update.mockResolvedValue({ id: 'res_01', status: 'cancelled' });
    const result = await service.updateReservationStatus('org_01', 'res_01', 'cancelled', 'actor_01');
    expect(result.status).toBe('cancelled');
    expect(mockAudit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'reservation.cancelled' }),
    );
  });

  it('rejects status update when reservation does not belong to org', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findFirstOrThrow.mockRejectedValue(new Error('Not found'));
    await expect(
      service.updateReservationStatus('org_01', 'res_99', 'cancelled', 'actor_01'),
    ).rejects.toThrow();
  });

  it('creates a draft agreement from a confirmed reservation', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.reservation.findFirstOrThrow.mockResolvedValue({
      id: 'res_01', siteId: 'site_01', unitId: 'unit_01', customerId: 'cust_01', status: 'confirmed',
    });
    mockPrisma.reservation.update.mockResolvedValue({ id: 'res_01', status: 'converted' });
    mockPrisma.agreement.create.mockResolvedValue({ id: 'agr_01', status: 'draft' });
    const result = await service.createAgreementFromReservation('org_01', 'res_01', {
      billingCycle: 'monthly', language: 'de', pricingSnapshot: { amountMinor: 14900 },
    }, 'actor_01');
    expect(result.agreementId).toBe('agr_01');
    expect(mockPrisma.reservation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'converted' }) }),
    );
  });
});
```

- [ ] Run test to confirm it fails:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=operator-reservations.service --no-coverage 2>&1 | tail -20
```
Expected: `Cannot find module './operator-reservations.service'`.

### Step 2.2 — Implement OperatorReservationsService

- [ ] Create `apps/api/src/modules/operator-reservations/operator-reservations.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

interface ListReservationsFilter { siteId?: string; status?: string; }
interface CreateAgreementInput { billingCycle: 'monthly' | 'fixed_term'; language: 'de' | 'en'; pricingSnapshot: object; terminationRules?: object; }

@Injectable()
export class OperatorReservationsService {
  constructor(private prisma: PrismaClient, private audit: AuditService) {}

  private async getSiteIds(organisationId: string): Promise<string[]> {
    const sites = await this.prisma.site.findMany({ where: { organisationId, deletedAt: null }, select: { id: true } });
    return sites.map((s) => s.id);
  }

  async listReservations(organisationId: string, filter: ListReservationsFilter) {
    const siteIds = await this.getSiteIds(organisationId);
    return this.prisma.reservation.findMany({
      where: {
        siteId: { in: siteIds },
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReservationStatus(organisationId: string, reservationId: string, status: string, actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const reservation = await this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, siteId: { in: siteIds } } });
    const updated = await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: status as any } });
    await this.audit.record({ action: `reservation.${status}`, subjectType: 'Reservation', subjectId: reservationId, actorId, siteId: reservation.siteId });
    return updated;
  }

  async createAgreementFromReservation(organisationId: string, reservationId: string, input: CreateAgreementInput, actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const reservation = await this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, siteId: { in: siteIds } } });
    const terminationRules = input.terminationRules ?? (input.billingCycle === 'monthly' ? { noticeDays: 30 } : { noticeDays: 30, minimumMonths: 3 });
    const agreement = await this.prisma.agreement.create({
      data: {
        reservationId,
        tenantId: reservation.customerId,
        unitId: reservation.unitId,
        siteId: reservation.siteId,
        billingCycle: input.billingCycle,
        language: input.language,
        pricingSnapshot: input.pricingSnapshot,
        terminationRules,
      },
    });
    await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'converted' } });
    await this.audit.record({ action: 'agreement.drafted', subjectType: 'Agreement', subjectId: agreement.id, actorId, siteId: reservation.siteId });
    return { agreementId: agreement.id, status: agreement.status };
  }
}
```

- [ ] Run test to confirm it passes:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=operator-reservations.service --no-coverage 2>&1 | tail -20
```
Expected: `4 passed`.

### Step 2.3 — Controller + Module

- [ ] Create `apps/api/src/modules/operator-reservations/operator-reservations.controller.ts`:

```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Patch, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperatorReservationsService } from './operator-reservations.service';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/reservations')
export class OperatorReservationsController {
  constructor(private service: OperatorReservationsService) {}

  @Get()
  list(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listReservations(orgId, { siteId, status });
  }

  @Patch(':reservationId')
  updateStatus(
    @Param('organisationId') orgId: string,
    @Param('reservationId') reservationId: string,
    @Body() body: { status: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.updateReservationStatus(orgId, reservationId, body.status, member.userId);
  }

  @Post(':reservationId/agreement')
  createAgreement(
    @Param('organisationId') orgId: string,
    @Param('reservationId') reservationId: string,
    @Body() body: { billingCycle: 'monthly' | 'fixed_term'; language: 'de' | 'en'; pricingSnapshot: object },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.createAgreementFromReservation(orgId, reservationId, body, member.userId);
  }
}
```

- [ ] Create `apps/api/src/modules/operator-reservations/operator-reservations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { OperatorReservationsService } from './operator-reservations.service';
import { OperatorReservationsController } from './operator-reservations.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [OperatorReservationsController],
  providers: [OperatorReservationsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [OperatorReservationsService],
})
export class OperatorReservationsModule {}
```

- [ ] Build check:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx nest build 2>&1 | tail -10
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/api/src/modules/operator-reservations && git commit -m "feat(operator): OperatorReservationsService + Controller — list, patch status, create agreement"
```

---

## Task 3: OperatorAgreementsService — list, detail, send for signature, terminate

**Files:**
- Create: `apps/api/src/modules/operator-agreements/operator-agreements.service.ts`
- Create: `apps/api/src/modules/operator-agreements/operator-agreements.service.spec.ts`
- Create: `apps/api/src/modules/operator-agreements/operator-agreements.controller.ts`
- Create: `apps/api/src/modules/operator-agreements/operator-agreements.module.ts`

### Step 3.1 — Write failing test

- [ ] Create `apps/api/src/modules/operator-agreements/operator-agreements.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperatorAgreementsService } from './operator-agreements.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  site: { findMany: vi.fn() },
  agreement: {
    findMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
  },
  signatory: { createMany: vi.fn() },
  terminationRequest: { create: vi.fn() },
};
const mockAudit = { record: vi.fn() };

const service = new OperatorAgreementsService(mockPrisma as any, mockAudit as any);

const siteIds = ['site_01'];
const agreement = {
  id: 'agr_01', siteId: 'site_01', tenantId: 'cust_01', unitId: 'unit_01',
  status: 'draft', billingCycle: 'monthly', pricingSnapshot: {},
  signatories: [], amendments: [],
};

describe('OperatorAgreementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.agreement.findFirstOrThrow.mockResolvedValue(agreement);
  });

  it('lists agreements for org via site join', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([agreement]);
    const result = await service.listAgreements('org_01', {});
    expect(result).toHaveLength(1);
    expect(mockPrisma.agreement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ siteId: { in: siteIds } }) }),
    );
  });

  it('returns agreement detail with signatories and amendments', async () => {
    const result = await service.getAgreement('org_01', 'agr_01');
    expect(result).toHaveProperty('id', 'agr_01');
    expect(mockPrisma.agreement.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ signatories: true, amendments: true }) }),
    );
  });

  it('sends agreement for signature and creates signatory records', async () => {
    mockPrisma.agreement.update.mockResolvedValue({ ...agreement, status: 'pending_signature' });
    mockPrisma.signatory.createMany.mockResolvedValue({ count: 1 });
    const result = await service.sendForSignature('org_01', 'agr_01', ['person_01'], 'actor_01');
    expect(result.status).toBe('pending_signature');
    expect(mockPrisma.signatory.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ personId: 'person_01' })]) }),
    );
  });

  it('creates termination request', async () => {
    mockPrisma.terminationRequest.create.mockResolvedValue({ id: 'term_01', status: 'pending' });
    const result = await service.requestTermination('org_01', 'agr_01', new Date('2026-07-01'), 'operator note', 'actor_01');
    expect(result).toHaveProperty('id', 'term_01');
    expect(mockPrisma.terminationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ agreementId: 'agr_01', status: 'pending' }) }),
    );
  });
});
```

- [ ] Run test to confirm it fails:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=operator-agreements.service --no-coverage 2>&1 | tail -20
```
Expected: module not found error.

### Step 3.2 — Implement OperatorAgreementsService

- [ ] Create `apps/api/src/modules/operator-agreements/operator-agreements.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

interface ListAgreementsFilter { siteId?: string; status?: string; }

@Injectable()
export class OperatorAgreementsService {
  constructor(private prisma: PrismaClient, private audit: AuditService) {}

  private async getSiteIds(organisationId: string): Promise<string[]> {
    const sites = await this.prisma.site.findMany({ where: { organisationId, deletedAt: null }, select: { id: true } });
    return sites.map((s) => s.id);
  }

  async listAgreements(organisationId: string, filter: ListAgreementsFilter) {
    const siteIds = await this.getSiteIds(organisationId);
    return this.prisma.agreement.findMany({
      where: {
        siteId: { in: siteIds },
        ...(filter.siteId ? { siteId: filter.siteId } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAgreement(organisationId: string, agreementId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    return this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, siteId: { in: siteIds } },
      include: { signatories: true, amendments: true },
    });
  }

  async sendForSignature(organisationId: string, agreementId: string, personIds: string[], actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    await this.prisma.agreement.findFirstOrThrow({ where: { id: agreementId, siteId: { in: siteIds } } });
    const updated = await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'pending_signature' } });
    await this.prisma.signatory.createMany({ data: personIds.map((personId) => ({ agreementId, personId, status: 'pending' as const })) });
    await this.audit.record({ action: 'agreement.sent_for_signature', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: updated.siteId });
    return updated;
  }

  async requestTermination(organisationId: string, agreementId: string, requestedDate: Date, operatorNote: string | undefined, actorId: string) {
    const siteIds = await this.getSiteIds(organisationId);
    const agreement = await this.prisma.agreement.findFirstOrThrow({ where: { id: agreementId, siteId: { in: siteIds } } });
    const request = await this.prisma.terminationRequest.create({ data: { agreementId, requestedDate, operatorNote, status: 'pending' } });
    await this.audit.record({ action: 'agreement.termination_requested', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: agreement.siteId });
    return request;
  }
}
```

- [ ] Run test to confirm it passes:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=operator-agreements.service --no-coverage 2>&1 | tail -20
```
Expected: `4 passed`.

### Step 3.3 — Controller + Module

- [ ] Create `apps/api/src/modules/operator-agreements/operator-agreements.controller.ts`:

```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperatorAgreementsService } from './operator-agreements.service';

interface MemberContext { id: string; userId: string; role: string; organisationId: string; }

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/agreements')
export class OperatorAgreementsController {
  constructor(private service: OperatorAgreementsService) {}

  @Get()
  list(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listAgreements(orgId, { siteId, status });
  }

  @Get(':agreementId')
  getOne(@Param('organisationId') orgId: string, @Param('agreementId') agreementId: string) {
    return this.service.getAgreement(orgId, agreementId);
  }

  @Post(':agreementId/send')
  send(
    @Param('organisationId') orgId: string,
    @Param('agreementId') agreementId: string,
    @Body() body: { personIds: string[] },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.sendForSignature(orgId, agreementId, body.personIds, member.userId);
  }

  @Post(':agreementId/terminate')
  terminate(
    @Param('organisationId') orgId: string,
    @Param('agreementId') agreementId: string,
    @Body() body: { requestedDate: string; operatorNote?: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.service.requestTermination(orgId, agreementId, new Date(body.requestedDate), body.operatorNote, member.userId);
  }
}
```

- [ ] Create `apps/api/src/modules/operator-agreements/operator-agreements.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { OperatorAgreementsService } from './operator-agreements.service';
import { OperatorAgreementsController } from './operator-agreements.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [OperatorAgreementsController],
  providers: [OperatorAgreementsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [OperatorAgreementsService],
})
export class OperatorAgreementsModule {}
```

- [ ] Build check:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx nest build 2>&1 | tail -10
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/api/src/modules/operator-agreements && git commit -m "feat(operator): OperatorAgreementsService + Controller — list, detail, send, terminate"
```

---

## Task 4: TenantPortalService — tenant-scoped agreements and invoices

**Files:**
- Create: `apps/api/src/modules/tenant-portal/tenant-portal.service.ts`
- Create: `apps/api/src/modules/tenant-portal/tenant-portal.service.spec.ts`
- Create: `apps/api/src/modules/tenant-portal/tenant-portal.controller.ts`
- Create: `apps/api/src/modules/tenant-portal/tenant-portal.module.ts`

### Step 4.1 — Write failing test

- [ ] Create `apps/api/src/modules/tenant-portal/tenant-portal.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantPortalService } from './tenant-portal.service';

const mockPrisma = {
  agreement: { findMany: vi.fn(), findFirstOrThrow: vi.fn() },
  invoice: { findMany: vi.fn() },
};

const service = new TenantPortalService(mockPrisma as any);

const tenantId = 'cust_01';

const agreement = {
  id: 'agr_01', tenantId, siteId: 'site_01', unitId: 'unit_01',
  status: 'active', billingCycle: 'monthly', effectiveFrom: new Date('2026-01-01'),
  pricingSnapshot: { amountMinor: 14900 },
  signatories: [], amendments: [],
};

describe('TenantPortalService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('lists only active/signed agreements for the tenant', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([agreement]);
    const result = await service.listMyAgreements(tenantId);
    expect(result).toHaveLength(1);
    expect(mockPrisma.agreement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, status: { in: ['active', 'signed', 'pending_signature'] } }),
      }),
    );
  });

  it('returns agreement detail only when tenantId matches', async () => {
    mockPrisma.agreement.findFirstOrThrow.mockResolvedValue(agreement);
    const result = await service.getMyAgreement(tenantId, 'agr_01');
    expect(result).toHaveProperty('id', 'agr_01');
    expect(mockPrisma.agreement.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'agr_01', tenantId }) }),
    );
  });

  it('lists invoices for tenant across all agreements', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([{ id: 'agr_01' }]);
    mockPrisma.invoice.findMany.mockResolvedValue([
      { id: 'inv_01', agreementId: 'agr_01', status: 'pending', totalMinor: 14900, dueDate: new Date() },
    ]);
    const result = await service.listMyInvoices(tenantId);
    expect(result).toHaveLength(1);
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ agreementId: { in: ['agr_01'] } }) }),
    );
  });
});
```

- [ ] Run test to confirm it fails:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=tenant-portal.service --no-coverage 2>&1 | tail -20
```
Expected: module not found error.

### Step 4.2 — Implement TenantPortalService

- [ ] Create `apps/api/src/modules/tenant-portal/tenant-portal.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TenantPortalService {
  constructor(private prisma: PrismaClient) {}

  async listMyAgreements(tenantId: string) {
    return this.prisma.agreement.findMany({
      where: { tenantId, status: { in: ['active', 'signed', 'pending_signature'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyAgreement(tenantId: string, agreementId: string) {
    return this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId },
      include: { signatories: true, amendments: true },
    });
  }

  async listMyInvoices(tenantId: string) {
    const agreements = await this.prisma.agreement.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const agreementIds = agreements.map((a) => a.id);
    return this.prisma.invoice.findMany({
      where: { agreementId: { in: agreementIds } },
      orderBy: { dueDate: 'desc' },
    });
  }
}
```

- [ ] Run test to confirm it passes:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --testPathPattern=tenant-portal.service --no-coverage 2>&1 | tail -20
```
Expected: `3 passed`.

### Step 4.3 — Controller + Module

- [ ] Create `apps/api/src/modules/tenant-portal/tenant-portal.controller.ts`:

```typescript
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { TenantPortalService } from './tenant-portal.service';

@ApiTags('tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/tenant')
export class TenantPortalController {
  constructor(private service: TenantPortalService) {}

  @Get('agreements')
  listAgreements(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyAgreements(user.id);
  }

  @Get('agreements/:agreementId')
  getAgreement(@CurrentUser() user: AuthenticatedUser, @Param('agreementId') agreementId: string) {
    return this.service.getMyAgreement(user.id, agreementId);
  }

  @Get('invoices')
  listInvoices(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyInvoices(user.id);
  }
}
```

- [ ] Create `apps/api/src/modules/tenant-portal/tenant-portal.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TenantPortalService } from './tenant-portal.service';
import { TenantPortalController } from './tenant-portal.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule],
  controllers: [TenantPortalController],
  providers: [TenantPortalService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [TenantPortalService],
})
export class TenantPortalModule {}
```

- [ ] Build check:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx nest build 2>&1 | tail -10
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/api/src/modules/tenant-portal && git commit -m "feat(tenant): TenantPortalService + Controller — list agreements, invoices, detail"
```

---

## Task 5: Wire all four new modules into app.module.ts

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] Open `apps/api/src/app.module.ts` and add the four new imports. Find the existing imports array and add:

```typescript
import { CheckoutModule } from './modules/checkout/checkout.module';
import { OperatorReservationsModule } from './modules/operator-reservations/operator-reservations.module';
import { OperatorAgreementsModule } from './modules/operator-agreements/operator-agreements.module';
import { TenantPortalModule } from './modules/tenant-portal/tenant-portal.module';
```

And inside the `@Module({ imports: [...] })` array add:
```
CheckoutModule,
OperatorReservationsModule,
OperatorAgreementsModule,
TenantPortalModule,
```

- [ ] Build and run all tests:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx nest build 2>&1 | tail -10 && npx vitest run --no-coverage 2>&1 | tail -20
```
Expected: build succeeds, all tests pass.

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/api/src/app.module.ts && git commit -m "feat(api): register CheckoutModule, OperatorReservationsModule, OperatorAgreementsModule, TenantPortalModule"
```

---

## Task 6: Booking wizard — `/storage/[slug]/book`

> This is a Client Component. The multi-step form handles unit-type selection, contact details, and a final confirmation screen. It calls the BFF API routes below.

**Files:**
- Create: `apps/web/src/app/api/checkout/route.ts`
- Create: `apps/web/src/app/api/checkout/[sessionId]/confirm/route.ts`
- Create: `apps/web/src/app/storage/[slug]/book/page.tsx`

### Step 6.1 — BFF API routes

- [ ] Create `apps/web/src/app/api/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/public/v1/checkout-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] Create directory and file `apps/web/src/app/api/checkout/[sessionId]/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const body = await req.json();
  const res = await fetch(`${API_URL}/public/v1/checkout/${params.sessionId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
```

### Step 6.2 — Booking wizard page

- [ ] Create `apps/web/src/app/storage/[slug]/book/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UnitType {
  id: string;
  name: string;
  sizeSqm: number;
  features: string[];
}

interface BookingWizardProps {
  params: { slug: string };
  searchParams: { siteId?: string; unitTypes?: string };
}

type Step = 'unit' | 'contact' | 'confirm';

interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
}

interface BookingResult {
  reservationId: string;
  status: string;
  expiresAt: string;
}

export default function BookPage({ params, searchParams }: BookingWizardProps) {
  const siteId = searchParams.siteId ?? '';
  const unitTypes: UnitType[] = searchParams.unitTypes ? JSON.parse(decodeURIComponent(searchParams.unitTypes)) : [];

  const [step, setStep] = useState<Step>('unit');
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(unitTypes[0] ?? null);
  const [moveInDate, setMoveInDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [sessionId, setSessionId] = useState<string>('');
  const [lockToken, setLockToken] = useState<string>('');
  const [contact, setContact] = useState<ContactDetails>({ name: '', email: '', phone: '', marketingConsent: false });
  const [result, setResult] = useState<BookingResult | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function handleUnitSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUnitType) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, unitTypeId: selectedUnitType.id, startDate: moveInDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed to start checkout');
      if (data.availabilityState === 'sold_out') {
        setError('Sorry, no units of this type are available right now.');
        setLoading(false);
        return;
      }
      setSessionId(data.checkoutSessionId);
      setLockToken(data.lockToken);
      setStep('contact');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/checkout/${sessionId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? 'Failed to confirm booking');
      setResult(data);
      setStep('confirm');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const stepLabels: { key: Step; label: string }[] = [
    { key: 'unit', label: '1. Choose unit' },
    { key: 'contact', label: '2. Your details' },
    { key: 'confirm', label: '3. Confirmation' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Link href={`/storage/${params.slug}`} className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">
          &larr; Back to site
        </Link>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map(({ key, label }, i) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`text-sm font-medium ${step === key ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
              {i < stepLabels.length - 1 && <span className="text-slate-300">/</span>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow p-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Step 1: Unit + Move-in Date */}
          {step === 'unit' && (
            <form onSubmit={handleUnitSubmit} className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-900">Choose your unit</h2>

              {unitTypes.length > 0 ? (
                <div className="space-y-3">
                  {unitTypes.map((ut) => (
                    <label key={ut.id} className={`flex items-start gap-3 border rounded-xl p-4 cursor-pointer transition-colors ${selectedUnitType?.id === ut.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input
                        type="radio"
                        name="unitType"
                        value={ut.id}
                        checked={selectedUnitType?.id === ut.id}
                        onChange={() => setSelectedUnitType(ut)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-slate-900">{ut.name}</p>
                        <p className="text-sm text-slate-500">{ut.sizeSqm} m²</p>
                        {ut.features.length > 0 && (
                          <p className="text-xs text-slate-400 mt-1">{ut.features.join(' · ')}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No unit types available for this site.</p>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Desired move-in date</label>
                <input
                  type="date"
                  value={moveInDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !selectedUnitType}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Checking availability…' : 'Continue'}
              </button>
            </form>
          )}

          {/* Step 2: Contact Details */}
          {step === 'contact' && (
            <form onSubmit={handleContactSubmit} className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Your contact details</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Anna Müller"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="anna@example.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone number</label>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  placeholder="+49 170 123 4567"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={contact.marketingConsent}
                  onChange={(e) => setContact({ ...contact, marketingConsent: e.target.checked })}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-600">I agree to receive marketing communications (optional)</span>
              </label>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('unit')}
                  className="flex-1 border border-slate-300 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Confirming…' : 'Confirm booking'}
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && result && (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900">Booking confirmed!</h2>
              <p className="text-slate-500 text-sm">
                A confirmation email has been sent to <strong>{contact.email}</strong>.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reservation ID</span>
                  <span className="font-mono text-xs text-slate-700">{result.reservationId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="text-slate-700 capitalize">{result.status.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reserved until</span>
                  <span className="text-slate-700">{new Date(result.expiresAt).toLocaleDateString('de-DE')}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                The operator will be in touch to finalise your agreement and arrange access.
              </p>
              <Link
                href={`/storage/${params.slug}`}
                className="inline-block mt-2 text-blue-600 text-sm hover:underline"
              >
                &larr; Back to site
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/web/src/app/storage/apps/web/src/app/api/checkout && git add "apps/web/src/app/storage/[slug]/book" apps/web/src/app/api/checkout && git commit -m "feat(web): booking wizard at /storage/[slug]/book — 3-step checkout UI + BFF routes"
```

---

## Task 7: Operator reservations page — `/reservations`

**Files:**
- Create: `apps/web/src/app/reservations/page.tsx`
- Create: `apps/web/src/app/api/reservations/route.ts`
- Create: `apps/web/src/app/api/reservations/[id]/route.ts`

### Step 7.1 — BFF API routes

- [ ] Create `apps/web/src/app/api/reservations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/reservations${qs ? `?${qs}` : ''}`,
    'GET',
    ctx.token,
  );
}
```

- [ ] Create `apps/web/src/app/api/reservations/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/reservations/${params.id}`,
    'PATCH',
    ctx.token,
    body,
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  // action header distinguishes confirm vs create-agreement
  const action = req.headers.get('x-action') ?? 'agreement';
  if (action === 'agreement') {
    return proxyToBackend(
      `/v1/organisations/${ctx.payload.organisationId}/reservations/${params.id}/agreement`,
      'POST',
      ctx.token,
      body,
    );
  }
  return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
}
```

### Step 7.2 — Reservations page

- [ ] Create `apps/web/src/app/reservations/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import ReservationActions from './ReservationActions';

interface Reservation {
  id: string;
  siteId: string;
  unitId: string;
  unitTypeId: string;
  customerId: string;
  status: 'pending' | 'pending_signature' | 'confirmed' | 'expired' | 'cancelled' | 'converted';
  startDate: string;
  expiresAt: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  pending_signature: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  expired: 'bg-slate-100 text-slate-500',
  cancelled: 'bg-red-100 text-red-600',
  converted: 'bg-purple-100 text-purple-700',
};

export default async function ReservationsPage() {
  const user = await requireAuth();
  const reservations = await serverFetch<Reservation[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as Reservation[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Reservations</h1>
          </div>
        </div>

        {reservations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No reservations yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Customer</th>
                  <th className="text-left px-6 py-3">Move-in</th>
                  <th className="text-left px-6 py-3">Expires</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{r.id.slice(0, 12)}…</td>
                    <td className="px-6 py-4 text-slate-700 font-mono text-xs">{r.customerId.slice(0, 10)}…</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(r.startDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(r.expiresAt).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ReservationActions reservation={r} />
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
```

- [ ] Create `apps/web/src/app/reservations/ReservationActions.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Reservation {
  id: string;
  status: string;
}

export default function ReservationActions({ reservation }: { reservation: Reservation }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    await fetch(`/api/reservations/${reservation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  async function createAgreement() {
    setLoading(true);
    const res = await fetch(`/api/reservations/${reservation.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'agreement' },
      body: JSON.stringify({ billingCycle: 'monthly', language: 'de', pricingSnapshot: {} }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.agreementId) router.push('/agreements');
    else router.refresh();
  }

  if (reservation.status === 'cancelled' || reservation.status === 'expired' || reservation.status === 'converted') {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {reservation.status === 'pending_signature' && (
        <button
          onClick={() => updateStatus('confirmed')}
          disabled={loading}
          className="text-xs text-green-700 border border-green-300 rounded px-2 py-1 hover:bg-green-50 disabled:opacity-50"
        >
          Confirm
        </button>
      )}
      {reservation.status === 'confirmed' && (
        <button
          onClick={createAgreement}
          disabled={loading}
          className="text-xs text-purple-700 border border-purple-300 rounded px-2 py-1 hover:bg-purple-50 disabled:opacity-50"
        >
          Create agreement
        </button>
      )}
      {(reservation.status === 'pending' || reservation.status === 'pending_signature' || reservation.status === 'confirmed') && (
        <button
          onClick={() => updateStatus('cancelled')}
          disabled={loading}
          className="text-xs text-red-600 border border-red-300 rounded px-2 py-1 hover:bg-red-50 disabled:opacity-50"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/web/src/app/reservations apps/web/src/app/api/reservations && git commit -m "feat(web): /reservations operator page — table with status badges + confirm/cancel/create-agreement actions"
```

---

## Task 8: Operator agreements pages — `/agreements` and `/agreements/[id]`

**Files:**
- Create: `apps/web/src/app/agreements/page.tsx`
- Create: `apps/web/src/app/agreements/[id]/page.tsx`
- Create: `apps/web/src/app/agreements/[id]/AgreementDetailActions.tsx`
- Create: `apps/web/src/app/api/agreements/route.ts`
- Create: `apps/web/src/app/api/agreements/[id]/route.ts`

### Step 8.1 — BFF API routes

- [ ] Create `apps/web/src/app/api/agreements/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(req: NextRequest) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/agreements${qs ? `?${qs}` : ''}`,
    'GET',
    ctx.token,
  );
}
```

- [ ] Create `apps/web/src/app/api/agreements/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/agreements/${params.id}`,
    'GET',
    ctx.token,
  );
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = getAuthContext();
  if (!ctx) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = req.headers.get('x-action') ?? 'send';
  const subPath = action === 'terminate' ? 'terminate' : 'send';
  return proxyToBackend(
    `/v1/organisations/${ctx.payload.organisationId}/agreements/${params.id}/${subPath}`,
    'POST',
    ctx.token,
    body,
  );
}
```

### Step 8.2 — Agreements list page

- [ ] Create `apps/web/src/app/agreements/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  status: 'draft' | 'pending_signature' | 'signed' | 'active' | 'terminated';
  billingCycle: 'monthly' | 'fixed_term';
  effectiveFrom: string | null;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

export default async function AgreementsPage() {
  const user = await requireAuth();
  const agreements = await serverFetch<Agreement[]>(
    `/v1/organisations/${user.organisationId}/agreements`,
  ).catch(() => [] as Agreement[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Agreements</h1>
          </div>
        </div>

        {agreements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No agreements yet.</p>
            <Link href="/reservations" className="text-blue-600 text-sm hover:underline mt-2 block">
              Go to reservations to create one &rarr;
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">ID</th>
                  <th className="text-left px-6 py-3">Tenant</th>
                  <th className="text-left px-6 py-3">Billing</th>
                  <th className="text-left px-6 py-3">Effective from</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agreements.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{a.id.slice(0, 12)}…</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{a.tenantId.slice(0, 10)}…</td>
                    <td className="px-6 py-4 text-slate-600 capitalize">{a.billingCycle.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/agreements/${a.id}`} className="text-blue-600 hover:underline text-xs">
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
```

### Step 8.3 — Agreement detail page

- [ ] Create `apps/web/src/app/agreements/[id]/AgreementDetailActions.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Agreement {
  id: string;
  status: string;
}

export default function AgreementDetailActions({ agreement }: { agreement: Agreement }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showTerminate, setShowTerminate] = useState(false);
  const [requestedDate, setRequestedDate] = useState('');
  const [operatorNote, setOperatorNote] = useState('');

  async function sendForSignature() {
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'send' },
      body: JSON.stringify({ personIds: [] }),
    });
    setLoading(false);
    router.refresh();
  }

  async function submitTermination(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch(`/api/agreements/${agreement.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-action': 'terminate' },
      body: JSON.stringify({ requestedDate, operatorNote }),
    });
    setLoading(false);
    setShowTerminate(false);
    router.refresh();
  }

  if (agreement.status === 'terminated') return null;

  return (
    <div className="flex flex-col gap-3">
      {agreement.status === 'draft' && (
        <button
          onClick={sendForSignature}
          disabled={loading}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Send for signature
        </button>
      )}
      {(agreement.status === 'active' || agreement.status === 'signed') && !showTerminate && (
        <button
          onClick={() => setShowTerminate(true)}
          className="border border-red-300 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-50"
        >
          Request termination
        </button>
      )}
      {showTerminate && (
        <form onSubmit={submitTermination} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">Termination request</p>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Requested end date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">Operator note (optional)</label>
            <textarea
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowTerminate(false)} className="flex-1 border border-slate-300 text-slate-600 text-sm py-1.5 rounded-lg hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-red-600 text-white text-sm font-medium py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50">Submit</button>
          </div>
        </form>
      )}
    </div>
  );
}
```

- [ ] Create `apps/web/src/app/agreements/[id]/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AgreementDetailActions from './AgreementDetailActions';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Amendment { id: string; type: string; effectiveFrom: string; }
interface Agreement {
  id: string;
  tenantId: string;
  unitId: string;
  siteId: string;
  reservationId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  createdAt: string;
  signatories: Signatory[];
  amendments: Amendment[];
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

export default async function AgreementDetailPage({ params }: { params: { id: string } }) {
  const user = await requireAuth();
  const agreement = await serverFetch<Agreement>(
    `/v1/organisations/${user.organisationId}/agreements/${params.id}`,
  ).catch(() => null);

  if (!agreement) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/agreements" className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">&larr; Agreements</Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Agreement</h1>
            <p className="text-xs font-mono text-slate-400 mt-1">{agreement.id}</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[agreement.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {agreement.status.replace('_', ' ')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide">Details</p>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between"><dt className="text-slate-500">Billing cycle</dt><dd className="text-slate-700 capitalize">{agreement.billingCycle.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Language</dt><dd className="text-slate-700 uppercase">{agreement.language}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Effective from</dt><dd className="text-slate-700">{agreement.effectiveFrom ? new Date(agreement.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Created</dt><dd className="text-slate-700">{new Date(agreement.createdAt).toLocaleDateString('de-DE')}</dd></div>
            </dl>
          </div>

          <div className="bg-white rounded-xl shadow p-4 space-y-2">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide">Pricing snapshot</p>
            <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(agreement.pricingSnapshot, null, 2)}</pre>
          </div>
        </div>

        {/* Signatories */}
        <div className="bg-white rounded-xl shadow p-4 mb-4">
          <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Signatories</p>
          {agreement.signatories.length === 0 ? (
            <p className="text-slate-500 text-sm">No signatories assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {agreement.signatories.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-slate-600">{s.personId}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'signed' ? 'bg-green-100 text-green-700' : s.status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Amendments */}
        {agreement.amendments.length > 0 && (
          <div className="bg-white rounded-xl shadow p-4 mb-4">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Amendments</p>
            <ul className="space-y-2">
              {agreement.amendments.map((a) => (
                <li key={a.id} className="flex justify-between text-sm">
                  <span className="text-slate-700">{a.type}</span>
                  <span className="text-slate-400 text-xs">{new Date(a.effectiveFrom).toLocaleDateString('de-DE')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Actions</p>
          <AgreementDetailActions agreement={agreement} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/web/src/app/agreements apps/web/src/app/api/agreements && git commit -m "feat(web): /agreements list + /agreements/[id] detail pages with send/terminate actions"
```

---

## Task 9: Tenant portal — replace `/my-storage` stub + invoices + agreement detail

**Files:**
- Modify: `apps/web/src/app/my-storage/page.tsx`
- Create: `apps/web/src/app/my-storage/invoices/page.tsx`
- Create: `apps/web/src/app/my-storage/agreements/[id]/page.tsx`

### Step 9.1 — Replace `/my-storage` stub

- [ ] Replace contents of `apps/web/src/app/my-storage/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Agreement {
  id: string;
  siteId: string;
  unitId: string;
  status: string;
  billingCycle: string;
  effectiveFrom: string | null;
  pricingSnapshot: { amountMinor?: number };
}

const STATUS_STYLES: Record<string, string> = {
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

function formatCents(minor?: number): string {
  if (!minor) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function MyStoragePage() {
  const user = await requireAuth();
  const agreements = await serverFetch<Agreement[]>('/v1/tenant/agreements').catch(() => [] as Agreement[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">My Storage</h1>
          <Link href="/my-storage/invoices" className="text-sm text-blue-600 hover:underline">
            View invoices &rarr;
          </Link>
        </div>

        {agreements.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500 text-sm">You have no active storage agreements.</p>
            <Link href="/storage" className="text-blue-600 text-sm hover:underline mt-2 block">
              Find a storage unit &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {agreements.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-900">Unit {a.unitId.slice(0, 8)}…</p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{a.id}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-slate-400 text-xs">Billing</dt><dd className="text-slate-700 capitalize">{a.billingCycle.replace('_', ' ')}</dd></div>
                  <div><dt className="text-slate-400 text-xs">Monthly rate</dt><dd className="text-slate-700">{formatCents(a.pricingSnapshot?.amountMinor)}</dd></div>
                  <div><dt className="text-slate-400 text-xs">Start date</dt><dd className="text-slate-700">{a.effectiveFrom ? new Date(a.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
                </dl>
                <div className="mt-4">
                  <Link href={`/my-storage/agreements/${a.id}`} className="text-blue-600 text-sm hover:underline">
                    View agreement &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 9.2 — Invoices page

- [ ] Create `apps/web/src/app/my-storage/invoices/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface Invoice {
  id: string;
  agreementId: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  totalMinor: number;
  currency: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  void: 'bg-slate-100 text-slate-400',
};

function formatCents(minor: number, currency: string): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

export default async function MyInvoicesPage() {
  await requireAuth();
  const invoices = await serverFetch<Invoice[]>('/v1/tenant/invoices').catch(() => [] as Invoice[]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/my-storage" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; My Storage</Link>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500 text-sm">No invoices yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Invoice date</th>
                  <th className="text-left px-6 py-3">Due date</th>
                  <th className="text-left px-6 py-3">Amount</th>
                  <th className="text-left px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{new Date(inv.invoiceDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4 text-slate-600">{new Date(inv.dueDate).toLocaleDateString('de-DE')}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{formatCents(inv.totalMinor, inv.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[inv.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {inv.status}
                      </span>
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
```

### Step 9.3 — Tenant agreement detail page

- [ ] Create `apps/web/src/app/my-storage/agreements/[id]/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Signatory { id: string; personId: string; status: string; signedAt: string | null; }
interface Agreement {
  id: string;
  unitId: string;
  siteId: string;
  status: string;
  billingCycle: string;
  language: string;
  effectiveFrom: string | null;
  pricingSnapshot: Record<string, unknown>;
  terminationRules: Record<string, unknown>;
  createdAt: string;
  signatories: Signatory[];
}

const STATUS_STYLES: Record<string, string> = {
  pending_signature: 'bg-yellow-100 text-yellow-700',
  signed: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  terminated: 'bg-red-100 text-red-600',
};

export default async function TenantAgreementPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const agreement = await serverFetch<Agreement>(`/v1/tenant/agreements/${params.id}`).catch(() => null);
  if (!agreement) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/my-storage" className="text-sm text-slate-500 hover:text-slate-700 mb-6 block">&larr; My Storage</Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Storage Agreement</h1>
            <p className="text-xs font-mono text-slate-400 mt-1">{agreement.id}</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_STYLES[agreement.status] ?? 'bg-slate-100 text-slate-500'}`}>
            {agreement.status.replace('_', ' ')}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-4 space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Unit</dt><dd className="text-slate-700 font-mono text-xs">{agreement.unitId}</dd></div>
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Billing cycle</dt><dd className="text-slate-700 capitalize">{agreement.billingCycle.replace('_', ' ')}</dd></div>
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Start date</dt><dd className="text-slate-700">{agreement.effectiveFrom ? new Date(agreement.effectiveFrom).toLocaleDateString('de-DE') : '—'}</dd></div>
            <div><dt className="text-slate-400 text-xs uppercase tracking-wide mb-1">Language</dt><dd className="text-slate-700 uppercase">{agreement.language}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Termination rules</p>
          <pre className="text-xs text-slate-600 overflow-auto">{JSON.stringify(agreement.terminationRules, null, 2)}</pre>
        </div>

        {agreement.signatories.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-4">
            <p className="text-xs uppercase text-slate-400 font-medium tracking-wide mb-3">Signatories</p>
            <ul className="space-y-2">
              {agreement.signatories.map((s) => (
                <li key={s.id} className="flex justify-between text-sm">
                  <span className="font-mono text-xs text-slate-600">{s.personId}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'signed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {s.status}{s.signedAt ? ` · ${new Date(s.signedAt).toLocaleDateString('de-DE')}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center">
          <button
            className="border border-slate-300 text-slate-600 text-sm px-5 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            onClick={() => window.print()}
          >
            Print / Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Commit:
```bash
cd /Users/rafayhabibullah/sitelager && git add apps/web/src/app/my-storage && git commit -m "feat(web): tenant portal — /my-storage agreements, /my-storage/invoices, /my-storage/agreements/[id]"
```

---

## Task 10: Final full test run and push

- [ ] Run all API tests:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx vitest run --no-coverage 2>&1 | tail -30
```
Expected: all tests pass (new: checkout, operator-reservations, operator-agreements, tenant-portal suites).

- [ ] Build API:
```bash
cd /Users/rafayhabibullah/sitelager/apps/api && npx nest build 2>&1 | tail -10
```
Expected: `Successfully compiled`.

- [ ] Build web:
```bash
cd /Users/rafayhabibullah/sitelager/apps/web && ~/.nvm/versions/node/v20.19.5/bin/pnpm build 2>&1 | tail -20
```
Expected: no TypeScript or build errors.

- [ ] Push:
```bash
cd /Users/rafayhabibullah/sitelager && git push
```

---

## Self-review checklist

### API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/public/v1/checkout-sessions` | None | Create checkout session + ReservationHold (existing, Plan 3) |
| POST | `/public/v1/checkout/:sessionId/confirm` | None | Create Customer + Reservation from hold; send email |
| GET | `/v1/organisations/:orgId/reservations` | JWT + OrgGuard | List reservations (filter: siteId, status) |
| PATCH | `/v1/organisations/:orgId/reservations/:id` | JWT + OrgGuard | Update reservation status (confirm/cancel/convert) |
| POST | `/v1/organisations/:orgId/reservations/:id/agreement` | JWT + OrgGuard | Create draft Agreement from reservation |
| GET | `/v1/organisations/:orgId/agreements` | JWT + OrgGuard | List agreements (filter: siteId, status) |
| GET | `/v1/organisations/:orgId/agreements/:id` | JWT + OrgGuard | Get agreement detail (with signatories, amendments) |
| POST | `/v1/organisations/:orgId/agreements/:id/send` | JWT + OrgGuard | Send agreement for signature (creates Signatory records) |
| POST | `/v1/organisations/:orgId/agreements/:id/terminate` | JWT + OrgGuard | Create TerminationRequest |
| GET | `/v1/tenant/agreements` | JWT only | Tenant: list own active agreements |
| GET | `/v1/tenant/agreements/:id` | JWT only | Tenant: get own agreement detail |
| GET | `/v1/tenant/invoices` | JWT only | Tenant: list invoices across own agreements |

### Web pages

| URL | Who | Description |
|-----|-----|-------------|
| `/storage/[slug]/book` | Public | 3-step booking wizard: unit picker → contact form → confirmation |
| `/reservations` | Operator | Table of all reservations with confirm/cancel/create-agreement actions |
| `/agreements` | Operator | Table of all agreements with status badges and link to detail |
| `/agreements/[id]` | Operator | Agreement detail — signatories, amendments, send-for-signature, terminate |
| `/my-storage` | Tenant | Active agreements list with unit, billing, start date |
| `/my-storage/invoices` | Tenant | Invoice list with amount, due date, status |
| `/my-storage/agreements/[id]` | Tenant | Agreement detail with termination rules, signatories, print button |

### BFF API routes (Next.js Route Handlers)

| Method | Path | Proxies to |
|--------|------|-----------|
| POST | `/api/checkout` | `POST /public/v1/checkout-sessions` |
| POST | `/api/checkout/[sessionId]/confirm` | `POST /public/v1/checkout/:sessionId/confirm` |
| GET | `/api/reservations` | `GET /v1/organisations/:orgId/reservations` |
| PATCH | `/api/reservations/[id]` | `PATCH /v1/organisations/:orgId/reservations/:id` |
| POST | `/api/reservations/[id]` (`x-action: agreement`) | `POST /v1/organisations/:orgId/reservations/:id/agreement` |
| GET | `/api/agreements` | `GET /v1/organisations/:orgId/agreements` |
| GET | `/api/agreements/[id]` | `GET /v1/organisations/:orgId/agreements/:id` |
| POST | `/api/agreements/[id]` (`x-action: send`) | `POST /v1/organisations/:orgId/agreements/:id/send` |
| POST | `/api/agreements/[id]` (`x-action: terminate`) | `POST /v1/organisations/:orgId/agreements/:id/terminate` |
