# Container OS — Track B: CRM + Reservations + Agreements + Documents

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement lead capture/deduplication, reservation lifecycle, rental agreement generation (de/en), e-signature (simple electronic), and document storage. This is the core tenancy creation flow.

**Architecture:** Four NestJS modules. CrmLeads owns customer and lead records. Reservations owns inventory holds and reservation lifecycle. Agreements owns contract templates, signing, and activation (emitting `agreement.activated`). Documents owns storage, signature envelopes, and evidence packs in MinIO.

**Tech Stack:** NestJS 10, Prisma 5, Zod 3, MinIO SDK, crypto (for evidence pack hashing), Vitest

**Prerequisites:** Phase 0 complete. Track A (SiteInventory) should be complete for unit status transitions. `EventBusService`, `AuthModule`, `AuditModule` available.

---

## Files

```
apps/api/src/modules/
  crm-leads/
    crm-leads.module.ts
    crm-leads.service.ts
    crm-leads.controller.ts
    deduplication.service.ts
    crm-leads.service.spec.ts
    deduplication.service.spec.ts
  reservations/
    reservations.module.ts
    reservations.service.ts
    reservations.controller.ts
    reservations.service.spec.ts
  agreements/
    agreements.module.ts
    agreements.service.ts
    agreements.controller.ts
    template.service.ts
    agreements.service.spec.ts
  documents/
    documents.module.ts
    documents.service.ts
    documents.controller.ts
    storage.service.ts
    evidence-pack.service.ts
    documents.service.spec.ts
```

---

### Task B.1: CRM — lead deduplication (TDD)

**Files:**
- Create: `apps/api/src/modules/crm-leads/deduplication.service.spec.ts`
- Create: `apps/api/src/modules/crm-leads/deduplication.service.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/crm-leads/deduplication.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { DeduplicationService } from './deduplication.service';

const mockPrisma = {
  customer: { findFirst: vi.fn() },
  contact: { findFirst: vi.fn() },
};

const service = new DeduplicationService(mockPrisma as any);

describe('DeduplicationService', () => {
  it('finds existing customer by exact email match', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue({ customerId: 'cust_01' });
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    const result = await service.findDuplicate('anna@example.com', undefined, undefined);
    expect(result?.customerId).toBe('cust_01');
  });

  it('returns null when no match found', async () => {
    mockPrisma.contact.findFirst.mockResolvedValue(null);
    mockPrisma.customer.findFirst.mockResolvedValue(null);
    const result = await service.findDuplicate('new@example.com', undefined, undefined);
    expect(result).toBeNull();
  });

  it('finds by phone when email does not match', async () => {
    mockPrisma.contact.findFirst
      .mockResolvedValueOnce(null)           // no email match
      .mockResolvedValueOnce({ customerId: 'cust_02' }); // phone match
    const result = await service.findDuplicate('x@x.com', '+4917612345678', undefined);
    expect(result?.customerId).toBe('cust_02');
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd apps/api && pnpm test src/modules/crm-leads/deduplication.service.spec.ts
```

- [ ] **Step 3: Implement DeduplicationService**

`apps/api/src/modules/crm-leads/deduplication.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DeduplicationService {
  constructor(private prisma: PrismaClient) {}

  async findDuplicate(email: string, phone?: string, name?: string): Promise<{ customerId: string } | null> {
    // 1. Exact email match
    const byEmail = await this.prisma.contact.findFirst({ where: { email } });
    if (byEmail) return { customerId: byEmail.customerId };

    // 2. Phone match
    if (phone) {
      const byPhone = await this.prisma.contact.findFirst({ where: { phone } });
      if (byPhone) return { customerId: byPhone.customerId };
    }

    return null;
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/crm-leads/deduplication.service.spec.ts
```

Expected: 3 tests pass.

---

### Task B.2: CRM leads service and controller

**Files:**
- Create: `apps/api/src/modules/crm-leads/crm-leads.service.spec.ts`
- Create: `apps/api/src/modules/crm-leads/crm-leads.service.ts`
- Create: `apps/api/src/modules/crm-leads/crm-leads.controller.ts`
- Create: `apps/api/src/modules/crm-leads/crm-leads.module.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/modules/crm-leads/crm-leads.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { CrmLeadsService } from './crm-leads.service';

const mockPrisma = {
  lead: { create: vi.fn().mockResolvedValue({ id: 'lead_01', status: 'new' }), update: vi.fn() },
  customer: { create: vi.fn().mockResolvedValue({ id: 'cust_01' }) },
  contact: { create: vi.fn() },
};
const mockDedup = { findDuplicate: vi.fn().mockResolvedValue(null) };
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn() };

const service = new CrmLeadsService(mockPrisma as any, mockDedup as any, mockAudit as any, mockEventBus as any);

describe('CrmLeadsService', () => {
  it('creates lead and new customer when no duplicate found', async () => {
    const result = await service.createLead({
      siteId: 'site_01', name: 'Anna Weiss', email: 'anna@example.com',
      source: 'storefront', intent: 'business_storage',
    });
    expect(mockPrisma.customer.create).toHaveBeenCalled();
    expect(mockPrisma.lead.create).toHaveBeenCalled();
    expect(result).toHaveProperty('leadId', 'lead_01');
  });

  it('links lead to existing customer when duplicate found', async () => {
    mockDedup.findDuplicate.mockResolvedValueOnce({ customerId: 'cust_existing' });
    await service.createLead({
      siteId: 'site_01', name: 'Anna Weiss', email: 'anna@example.com',
      source: 'storefront', intent: 'private_storage',
    });
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    expect(mockPrisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerId: 'cust_existing' }) })
    );
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/crm-leads/crm-leads.service.spec.ts
```

- [ ] **Step 3: Implement CrmLeadsService**

`apps/api/src/modules/crm-leads/crm-leads.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DeduplicationService } from './deduplication.service';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';

interface CreateLeadInput {
  siteId: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  intent?: string;
  moveInDate?: Date;
  marketingConsent?: boolean;
}

@Injectable()
export class CrmLeadsService {
  constructor(
    private prisma: PrismaClient,
    private dedup: DeduplicationService,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  async createLead(input: CreateLeadInput) {
    let customerId: string;

    const existing = await this.dedup.findDuplicate(input.email, input.phone);
    if (existing) {
      customerId = existing.customerId;
    } else {
      const customer = await this.prisma.customer.create({
        data: {
          personOrOrgData: { name: input.name, email: input.email, phone: input.phone },
          marketingConsent: input.marketingConsent ?? false,
        },
      });
      await this.prisma.contact.create({ data: { customerId: customer.id, email: input.email, phone: input.phone } });
      customerId = customer.id;
    }

    const lead = await this.prisma.lead.create({
      data: { siteId: input.siteId, source: input.source, intent: input.intent, moveInDate: input.moveInDate, customerId },
    });

    await this.audit.record({ action: 'lead.created', subjectType: 'Lead', subjectId: lead.id, siteId: input.siteId });

    return { leadId: lead.id, customerId, status: lead.status, nextSuggestedAction: 'contact_within_15m' };
  }

  async getLeads(siteId: string, status?: string) {
    return this.prisma.lead.findMany({
      where: { siteId, deletedAt: null, ...(status ? { status: status as any } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/crm-leads/
```

- [ ] **Step 5: Create controller and module**

`apps/api/src/modules/crm-leads/crm-leads.controller.ts`:
```typescript
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CrmLeadsService } from './crm-leads.service';

@Controller()
export class CrmLeadsController {
  constructor(private crmLeads: CrmLeadsService) {}

  @Post('public/v1/leads')
  createLead(@Body() body: { siteId: string; name: string; email: string; phone?: string; source: string; intent?: string }) {
    return this.crmLeads.createLead({ ...body, source: body.source ?? 'storefront' });
  }

  @Get('operator/v1/leads')
  @UseGuards(JwtAuthGuard)
  getLeads(@Query('siteId') siteId: string, @Query('status') status?: string) {
    return this.crmLeads.getLeads(siteId, status);
  }
}
```

`apps/api/src/modules/crm-leads/crm-leads.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CrmLeadsService } from './crm-leads.service';
import { DeduplicationService } from './deduplication.service';
import { CrmLeadsController } from './crm-leads.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [CrmLeadsController],
  providers: [CrmLeadsService, DeduplicationService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [CrmLeadsService],
})
export class CrmLeadsModule {}
```

Add `CrmLeadsModule` to `AppModule` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/crm-leads/
git commit -m "feat(crm-leads): lead capture, deduplication, customer creation"
```

---

### Task B.3: Reservations — idempotent confirmation with inventory lock

**Files:**
- Create: `apps/api/src/modules/reservations/reservations.service.spec.ts`
- Create: `apps/api/src/modules/reservations/reservations.service.ts`
- Create: `apps/api/src/modules/reservations/reservations.controller.ts`
- Create: `apps/api/src/modules/reservations/reservations.module.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/reservations/reservations.service.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReservationsService } from './reservations.service';
import { DomainException } from '@container-os/domain-types';

const mockPrisma = {
  reservation: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  reservationHold: { findFirst: vi.fn(), delete: vi.fn() },
  unit: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'u1', status: 'available', siteId: 's1' }) },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn() };

const service = new ReservationsService(mockPrisma as any, mockAudit as any, mockEventBus as any);

describe('ReservationsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates reservation from valid checkout session hold', async () => {
    mockPrisma.reservationHold.findFirst.mockResolvedValue({ id: 'h1', unitId: 'u1', expiresAt: new Date(Date.now() + 60000) });
    mockPrisma.reservation.create.mockResolvedValue({ id: 'res_01', status: 'pending_signature' });
    mockPrisma.reservationHold.delete.mockResolvedValue({});

    const result = await service.createReservation({ siteId: 's1', unitId: 'u1', unitTypeId: 'ut1', customerId: 'cust_01', startDate: new Date(), lockToken: 'tok_01' });
    expect(result).toHaveProperty('reservationId');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'reservation.confirmed' }));
  });

  it('rejects reservation when hold expired', async () => {
    mockPrisma.reservationHold.findFirst.mockResolvedValue(null);
    await expect(service.createReservation({ siteId: 's1', unitId: 'u1', unitTypeId: 'ut1', customerId: 'cust_01', startDate: new Date(), lockToken: 'expired_tok' }))
      .rejects.toBeInstanceOf(DomainException);
  });

  it('is idempotent on duplicate confirmation', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({ id: 'res_01', status: 'confirmed' });
    const result = await service.confirmReservation('res_01', 'cust_01');
    expect(result.status).toBe('confirmed');
    expect(mockPrisma.reservation.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/reservations/reservations.service.spec.ts
```

- [ ] **Step 3: Implement ReservationsService**

`apps/api/src/modules/reservations/reservations.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

interface CreateReservationInput {
  siteId: string; unitId: string; unitTypeId: string;
  customerId: string; startDate: Date; lockToken: string;
}

@Injectable()
export class ReservationsService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  async createReservation(input: CreateReservationInput) {
    const hold = await this.prisma.reservationHold.findFirst({
      where: { unitId: input.unitId, lockToken: input.lockToken, expiresAt: { gte: new Date() } },
    });

    if (!hold) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Reservation hold expired or invalid lock token');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h to complete
    const reservation = await this.prisma.reservation.create({
      data: { siteId: input.siteId, unitId: input.unitId, unitTypeId: input.unitTypeId, customerId: input.customerId, startDate: input.startDate, expiresAt, status: 'pending_signature' },
    });

    await this.prisma.reservationHold.delete({ where: { id: hold.id } });
    await this.audit.record({ action: 'reservation.created', subjectType: 'Reservation', subjectId: reservation.id, siteId: input.siteId });

    this.eventBus.emit({
      type: Events.RESERVATION_CONFIRMED,
      payload: { reservationId: reservation.id, customerId: input.customerId },
      meta: { workspaceId: '', siteId: input.siteId, occurredAt: new Date() },
    });

    return { reservationId: reservation.id, status: reservation.status, expiresAt: reservation.expiresAt };
  }

  async confirmReservation(reservationId: string, _customerId: string) {
    const existing = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (existing?.status === 'confirmed') return existing; // idempotent
    return this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'confirmed' } });
  }

  async cancelReservation(reservationId: string, actorId: string) {
    const res = await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'cancelled' } });
    await this.audit.record({ action: 'reservation.cancelled', subjectType: 'Reservation', subjectId: reservationId, actorId, siteId: res.siteId });
    return res;
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/reservations/
```

- [ ] **Step 5: Create controller and module, register in AppModule**

`apps/api/src/modules/reservations/reservations.controller.ts`:
```typescript
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Controller()
export class ReservationsController {
  constructor(private reservations: ReservationsService) {}

  @Post('public/v1/reservations')
  create(@Body() body: { siteId: string; unitId: string; unitTypeId: string; customerId: string; startDate: string; lockToken: string }) {
    return this.reservations.createReservation({ ...body, startDate: new Date(body.startDate) });
  }

  @Post('public/v1/reservations/:id/confirm')
  confirm(@Param('id') id: string, @Body() body: { customerId: string }) {
    return this.reservations.confirmReservation(id, body.customerId);
  }

  @Post('public/v1/reservations/:id/cancel')
  cancel(@Param('id') id: string, @Body() body: { actorId: string }) {
    return this.reservations.cancelReservation(id, body.actorId);
  }
}
```

`apps/api/src/modules/reservations/reservations.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuditModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [ReservationsService],
})
export class ReservationsModule {}
```

Add `ReservationsModule` to `AppModule` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/reservations/
git commit -m "feat(reservations): idempotent reservation creation with hold validation"
```

---

### Task B.4: Agreements — template rendering + activation prerequisite check (TDD)

**Files:**
- Create: `apps/api/src/modules/agreements/agreements.service.spec.ts`
- Create: `apps/api/src/modules/agreements/agreements.service.ts`
- Create: `apps/api/src/modules/agreements/template.service.ts`
- Create: `apps/api/src/modules/agreements/agreements.controller.ts`
- Create: `apps/api/src/modules/agreements/agreements.module.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/agreements/agreements.service.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgreementsService } from './agreements.service';
import { DomainException } from '@container-os/domain-types';

const mockPrisma = {
  agreement: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  signatory: { findMany: vi.fn(), create: vi.fn() },
  mandate: { findFirst: vi.fn() },
  reservation: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'res_01', unitId: 'u1', tenantId: 'cust_01', siteId: 's1' }) },
  agreementTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 'tmpl_01', body: 'Mietvertrag für {{unitCode}}', language: 'de', version: '2026-05' }) },
  unit: { findUniqueOrThrow: vi.fn().mockResolvedValue({ unitCode: 'A-101', siteId: 's1' }) },
  unitType: { findUnique: vi.fn().mockResolvedValue({ name: '20ft Container', amountMinor: 14900 }) },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn() };

const service = new AgreementsService(mockPrisma as any, mockAudit as any, mockEventBus as any);

describe('AgreementsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('drafts agreement from reservation with pricing snapshot', async () => {
    mockPrisma.agreement.create.mockResolvedValue({ id: 'agr_01', status: 'draft' });
    const result = await service.draftAgreement({ reservationId: 'res_01', billingCycle: 'monthly', language: 'de', pricingSnapshot: { amountMinor: 14900 } });
    expect(result.agreementId).toBe('agr_01');
    expect(mockPrisma.agreement.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pricingSnapshot: expect.any(Object) }) })
    );
  });

  it('blocks activation when no signatory has signed', async () => {
    mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue({ id: 'agr_01', status: 'pending_signature', siteId: 's1', reservationId: 'res_01', tenantId: 'cust_01', unitId: 'u1' });
    mockPrisma.signatory.findMany.mockResolvedValue([{ status: 'pending' }]);
    mockPrisma.mandate.findFirst.mockResolvedValue({ status: 'active' });

    await expect(service.activateAgreement('agr_01', 'actor_01')).rejects.toBeInstanceOf(DomainException);
  });

  it('activates agreement and emits event when all prerequisites met', async () => {
    mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue({ id: 'agr_01', status: 'signed', siteId: 's1', reservationId: 'res_01', tenantId: 'cust_01', unitId: 'u1' });
    mockPrisma.signatory.findMany.mockResolvedValue([{ status: 'signed' }]);
    mockPrisma.mandate.findFirst.mockResolvedValue({ status: 'active' });
    mockPrisma.agreement.update.mockResolvedValue({ id: 'agr_01', status: 'active' });

    const result = await service.activateAgreement('agr_01', 'actor_01');
    expect(result.status).toBe('active');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'agreement.activated' }));
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/agreements/agreements.service.spec.ts
```

- [ ] **Step 3: Implement AgreementsService**

`apps/api/src/modules/agreements/agreements.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

interface DraftAgreementInput {
  reservationId: string;
  billingCycle: 'monthly' | 'fixed_term';
  language: 'de' | 'en';
  pricingSnapshot: object;
  terminationRules?: object;
}

@Injectable()
export class AgreementsService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  async draftAgreement(input: DraftAgreementInput) {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({ where: { id: input.reservationId } });

    const terminationRules = input.terminationRules ?? (input.billingCycle === 'monthly' ? { noticeDays: 30 } : { noticeDays: 30, minimumMonths: 3 });

    const agreement = await this.prisma.agreement.create({
      data: {
        reservationId: input.reservationId,
        tenantId: reservation.customerId,
        unitId: reservation.unitId,
        siteId: reservation.siteId,
        billingCycle: input.billingCycle,
        language: input.language,
        pricingSnapshot: input.pricingSnapshot,
        terminationRules,
      },
    });

    await this.audit.record({ action: 'agreement.drafted', subjectType: 'Agreement', subjectId: agreement.id, siteId: reservation.siteId });

    return { agreementId: agreement.id, status: agreement.status };
  }

  async activateAgreement(agreementId: string, actorId: string) {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });

    // Check all signatories have signed
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId } });
    const allSigned = signatories.length > 0 && signatories.every((s) => s.status === 'signed');
    if (!allSigned) {
      throw new DomainException(ErrorCodes.AGREEMENT_PREREQUISITE_MISSING, 'All signatories must sign before activation');
    }

    // Check active mandate exists for tenant
    const mandate = await this.prisma.mandate.findFirst({ where: { customerId: agreement.tenantId, status: 'active' } });
    if (!mandate) {
      throw new DomainException(ErrorCodes.MANDATE_INCOMPLETE, 'Active payment mandate required before activation');
    }

    const activated = await this.prisma.agreement.update({
      where: { id: agreementId },
      data: { status: 'active', effectiveFrom: new Date() },
    });

    await this.audit.record({ action: 'agreement.activated', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: agreement.siteId });

    this.eventBus.emit({
      type: Events.AGREEMENT_ACTIVATED,
      payload: { agreementId, tenantId: agreement.tenantId, unitId: agreement.unitId, siteId: agreement.siteId, billingCycle: agreement.billingCycle, pricingSnapshot: agreement.pricingSnapshot },
      meta: { workspaceId: '', siteId: agreement.siteId, actorId, occurredAt: new Date() },
    });

    return activated;
  }

  async signAgreement(agreementId: string, personId: string) {
    const signatory = await this.prisma.signatory.findFirst({ where: { agreementId, personId } });
    if (!signatory) {
      await this.prisma.signatory.create({ data: { agreementId, personId, status: 'signed', signedAt: new Date() } });
    } else {
      await this.prisma.signatory.create({ data: { agreementId, personId, status: 'signed', signedAt: new Date() } });
    }

    // Check if all signed → update agreement status
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId } });
    if (signatories.every((s) => s.status === 'signed')) {
      await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'signed' } });
    }

    return { agreementId, signed: true };
  }

  async requestMoveOut(agreementId: string, requestedDate: Date) {
    const request = await this.prisma.terminationRequest.create({
      data: { agreementId, requestedDate, status: 'pending' },
    });
    return request;
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/agreements/
```

- [ ] **Step 5: Create controller and module**

`apps/api/src/modules/agreements/agreements.controller.ts`:
```typescript
import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AgreementsService } from './agreements.service';

@Controller()
export class AgreementsController {
  constructor(private agreements: AgreementsService) {}

  @Post('operator/v1/agreements/draft')
  @UseGuards(JwtAuthGuard)
  draft(@Body() body: { reservationId: string; billingCycle: string; language: string; pricingSnapshot: object }) {
    return this.agreements.draftAgreement({ ...body, billingCycle: body.billingCycle as any, language: body.language as any });
  }

  @Post('operator/v1/agreements/:id/activate')
  @UseGuards(JwtAuthGuard)
  activate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.agreements.activateAgreement(id, user.id);
  }

  @Post('tenant/v1/agreements/:id/sign')
  @UseGuards(JwtAuthGuard)
  sign(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.agreements.signAgreement(id, user.id);
  }

  @Post('tenant/v1/agreements/:id/move-out-request')
  @UseGuards(JwtAuthGuard)
  moveOutRequest(@Param('id') id: string, @Body() body: { requestedDate: string }) {
    return this.agreements.requestMoveOut(id, new Date(body.requestedDate));
  }
}
```

`apps/api/src/modules/agreements/agreements.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { AgreementsController } from './agreements.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AgreementsController],
  providers: [AgreementsService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [AgreementsService],
})
export class AgreementsModule {}
```

Add `AgreementsModule` to `AppModule` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/agreements/
git commit -m "feat(agreements): draft/sign/activate lifecycle with prerequisite checks, emits agreement.activated"
```

---

### Task B.5: Documents — storage service + evidence pack

**Files:**
- Create: `apps/api/src/modules/documents/documents.service.spec.ts`
- Create: `apps/api/src/modules/documents/storage.service.ts`
- Create: `apps/api/src/modules/documents/evidence-pack.service.ts`
- Create: `apps/api/src/modules/documents/documents.service.ts`
- Create: `apps/api/src/modules/documents/documents.controller.ts`
- Create: `apps/api/src/modules/documents/documents.module.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/documents/documents.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { EvidencePackService } from './evidence-pack.service';
import * as crypto from 'crypto';

describe('EvidencePackService', () => {
  const mockPrisma = {
    document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'doc_01', hash: 'abc123', storageKey: 'docs/doc_01.pdf' }) },
    signatureEnvelope: { findMany: vi.fn().mockResolvedValue([{ id: 'env_01', status: 'signed', events: [{ type: 'signed', at: '2026-05-10T12:00:00Z' }] }]) },
    evidencePack: { create: vi.fn().mockResolvedValue({ id: 'pack_01', hash: 'expectedhash' }) },
  };

  const service = new EvidencePackService(mockPrisma as any);

  it('creates evidence pack with SHA-256 hash of events', async () => {
    const result = await service.createEvidencePack('doc_01');
    expect(mockPrisma.evidencePack.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentId: 'doc_01',
          hash: expect.stringMatching(/^[a-f0-9]{64}$/), // SHA-256 hex
        }),
      })
    );
    expect(result).toHaveProperty('id');
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/documents/documents.service.spec.ts
```

- [ ] **Step 3: Implement EvidencePackService**

`apps/api/src/modules/documents/evidence-pack.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class EvidencePackService {
  constructor(private prisma: PrismaClient) {}

  async createEvidencePack(documentId: string) {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    const envelopes = await this.prisma.signatureEnvelope.findMany({ where: { documentId } });

    const events = envelopes.flatMap((e) => (e.events as any[]) ?? []);
    const payload = JSON.stringify({ documentId, documentHash: doc.hash, events, createdAt: new Date().toISOString() });
    const hash = crypto.createHash('sha256').update(payload).digest('hex');

    return this.prisma.evidencePack.create({ data: { documentId, events, hash } });
  }
}
```

- [ ] **Step 4: Implement StorageService (MinIO)**

`apps/api/src/modules/documents/storage.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private client: Minio.Client;
  private bucket: string;

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: parseInt(process.env.MINIO_PORT ?? '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY ?? '',
      secretKey: process.env.MINIO_SECRET_KEY ?? '',
    });
    this.bucket = process.env.MINIO_BUCKET ?? 'container-os-dev';
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<{ storageKey: string; hash: string }> {
    await this.ensureBucket();
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    await this.client.putObject(this.bucket, key, Readable.from(buffer), buffer.length, { 'Content-Type': contentType });
    return { storageKey: key, hash };
  }

  async getSignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds);
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) await this.client.makeBucket(this.bucket, 'eu-central-1');
  }
}
```

- [ ] **Step 5: Implement DocumentsService**

`apps/api/src/modules/documents/documents.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { StorageService } from './storage.service';
import { EvidencePackService } from './evidence-pack.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaClient,
    private storage: StorageService,
    private evidencePack: EvidencePackService,
    private audit: AuditService,
  ) {}

  async initiateUpload(customerId: string, kind: string, fileName: string, locale?: string) {
    const documentId = `doc_${Date.now()}`;
    const storageKey = `documents/${customerId}/${documentId}/${fileName}`;

    const doc = await this.prisma.document.create({
      data: { subjectType: 'Customer', subjectId: customerId, kind, storageKey, hash: 'pending', locale },
    });

    const uploadUrl = await this.storage.getSignedUrl(storageKey, 900); // 15 min upload window
    return { documentId: doc.id, uploadUrl, status: 'awaiting_upload' };
  }

  async createSignatureEnvelope(documentId: string) {
    const envelope = await this.prisma.signatureEnvelope.create({
      data: { documentId, provider: 'internal', status: 'pending', events: [] },
    });
    return envelope;
  }

  async completeSignature(envelopeId: string, personId: string) {
    const event = { type: 'signed', personId, at: new Date().toISOString() };
    const envelope = await this.prisma.signatureEnvelope.update({
      where: { id: envelopeId },
      data: { status: 'signed', events: [event] },
    });

    // Create evidence pack
    await this.evidencePack.createEvidencePack(envelope.documentId);
    await this.audit.record({ action: 'document.signed', subjectType: 'SignatureEnvelope', subjectId: envelopeId });

    return { envelopeId, status: 'signed' };
  }

  async getTenantDocuments(tenantId: string) {
    return this.prisma.document.findMany({ where: { subjectType: 'Customer', subjectId: tenantId }, orderBy: { createdAt: 'desc' } });
  }
}
```

- [ ] **Step 6: Run test — verify PASS**

```bash
pnpm test src/modules/documents/
```

- [ ] **Step 7: Create controller and module**

`apps/api/src/modules/documents/documents.controller.ts`:
```typescript
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';

@Controller()
export class DocumentsController {
  constructor(private documents: DocumentsService) {}

  @Post('operator/v1/documents/upload')
  @UseGuards(JwtAuthGuard)
  initiateUpload(@Body() body: { customerId: string; kind: string; fileName: string; locale?: string }) {
    return this.documents.initiateUpload(body.customerId, body.kind, body.fileName, body.locale);
  }

  @Post('operator/v1/signatures/send')
  @UseGuards(JwtAuthGuard)
  createEnvelope(@Body() body: { documentId: string }) {
    return this.documents.createSignatureEnvelope(body.documentId);
  }

  @Post('tenant/v1/signatures/:envelopeId/complete')
  @UseGuards(JwtAuthGuard)
  completeSignature(@Param('envelopeId') envelopeId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documents.completeSignature(envelopeId, user.id);
  }

  @Get('tenant/v1/documents')
  @UseGuards(JwtAuthGuard)
  getDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.documents.getTenantDocuments(user.id);
  }
}
```

`apps/api/src/modules/documents/documents.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { EvidencePackService } from './evidence-pack.service';
import { DocumentsController } from './documents.controller';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, EvidencePackService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
```

Add `DocumentsModule` to `AppModule` imports.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/documents/
git commit -m "feat(documents): MinIO upload, e-sign envelopes, SHA-256 evidence packs"
```

---

## Track B complete

APIs available:
- `POST /api/public/v1/leads`
- `GET /api/operator/v1/leads`
- `POST /api/public/v1/reservations`
- `POST /api/public/v1/reservations/:id/confirm`
- `POST /api/public/v1/reservations/:id/cancel`
- `POST /api/operator/v1/agreements/draft`
- `POST /api/operator/v1/agreements/:id/activate`
- `POST /api/tenant/v1/agreements/:id/sign`
- `POST /api/tenant/v1/agreements/:id/move-out-request`
- `POST /api/operator/v1/documents/upload`
- `POST /api/operator/v1/signatures/send`
- `POST /api/tenant/v1/signatures/:id/complete`
- `GET /api/tenant/v1/documents`

Events emitted: `reservation.confirmed`, `agreement.activated`
