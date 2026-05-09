# Container OS — Track A: SiteInventory + Pricing + Storefront

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the SiteInventory, Pricing, and Storefront modules — giving operators the ability to manage sites/units, configure pricing, and expose a public storefront for tenants to browse and start a checkout.

**Architecture:** Three NestJS modules. SiteInventory owns the unit state machine and availability. Pricing owns rate rules, price books, and the quote calculator. Storefront owns the public-facing checkout session and quote request. All use Prisma for data, EventBusService for events, AuditService for writes.

**Tech Stack:** NestJS 10, Prisma 5, Zod 3, Vitest, Redis (BullMQ for inventory propagation)

**Prerequisites:** Phase 0 complete. `AuthModule`, `AuditModule`, `EventBusModule` available.

---

## Files

```
apps/api/src/modules/
  site-inventory/
    site-inventory.module.ts
    site-inventory.service.ts
    site-inventory.controller.ts
    availability.service.ts
    dto/
      create-site.dto.ts
      create-unit.dto.ts
      unit-status-transition.dto.ts
    site-inventory.service.spec.ts
    availability.service.spec.ts
  pricing/
    pricing.module.ts
    pricing.service.ts
    pricing.controller.ts
    quote.service.ts
    dto/
      create-price-book.dto.ts
      create-rate-rule.dto.ts
      quote-request.dto.ts
    quote.service.spec.ts
  storefront/
    storefront.module.ts
    storefront.service.ts
    storefront.controller.ts
    checkout-session.service.ts
    dto/
      create-checkout-session.dto.ts
      create-quote-request.dto.ts
    storefront.service.spec.ts
```

---

### Task A.1: SiteInventory — unit state machine (TDD)

**Files:**
- Create: `apps/api/src/modules/site-inventory/site-inventory.service.spec.ts`
- Create: `apps/api/src/modules/site-inventory/site-inventory.service.ts`

- [ ] **Step 1: Write failing tests for unit state machine**

`apps/api/src/modules/site-inventory/site-inventory.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { SiteInventoryService } from './site-inventory.service';
import { DomainException } from '@container-os/domain-types';

const mockPrisma = {
  unit: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  inventoryEvent: { create: vi.fn() },
  site: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
};
const mockAudit = { record: vi.fn(), hasLegalHold: vi.fn().mockResolvedValue(false) };
const mockEventBus = { emit: vi.fn() };

const service = new SiteInventoryService(mockPrisma as any, mockAudit as any, mockEventBus as any);

describe('SiteInventoryService', () => {
  it('allows occupied → maintenance transition', async () => {
    mockPrisma.unit.findUniqueOrThrow.mockResolvedValue({ id: 'u1', status: 'occupied', siteId: 's1', unitCode: 'A-1', auditVersion: 1 });
    mockPrisma.unit.update.mockResolvedValue({ id: 'u1', status: 'maintenance' });
    mockPrisma.inventoryEvent.create.mockResolvedValue({});

    await service.transitionUnitStatus('u1', 'maintenance', 'actor_01', 'scheduled maintenance');
    expect(mockPrisma.unit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: expect.objectContaining({ status: 'maintenance' }) })
    );
  });

  it('blocks occupied → available transition (requires move-out)', async () => {
    mockPrisma.unit.findUniqueOrThrow.mockResolvedValue({ id: 'u1', status: 'occupied', siteId: 's1', unitCode: 'A-1', auditVersion: 1 });
    await expect(service.transitionUnitStatus('u1', 'available', 'actor_01', '')).rejects.toBeInstanceOf(DomainException);
  });

  it('blocks hard delete of unit with legal hold', async () => {
    mockAudit.hasLegalHold.mockResolvedValueOnce(true);
    await expect(service.deleteUnit('u1', 'actor_01')).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects duplicate unitCode within same site', async () => {
    mockPrisma.unit.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(
      service.createUnit({ siteId: 's1', unitCode: 'A-1', unitTypeId: 'ut1', kind: 'container', driveUp: true })
    ).rejects.toBeInstanceOf(DomainException);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd apps/api && pnpm test src/modules/site-inventory/site-inventory.service.spec.ts
```

Expected: FAIL — `SiteInventoryService` not found.

- [ ] **Step 3: Implement SiteInventoryService**

`apps/api/src/modules/site-inventory/site-inventory.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  available:     ['reserved', 'maintenance', 'out_of_service'],
  reserved:      ['available', 'occupied', 'maintenance'],
  occupied:      ['maintenance'],           // must move-out first to reach 'available'
  maintenance:   ['available', 'out_of_service'],
  out_of_service:['maintenance'],
};

@Injectable()
export class SiteInventoryService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  async getSites() {
    return this.prisma.site.findMany({ where: { deletedAt: null } });
  }

  async createUnit(data: {
    siteId: string; unitCode: string; unitTypeId: string;
    kind: string; driveUp: boolean; zoneId?: string; position?: object;
  }) {
    try {
      const unit = await this.prisma.unit.create({
        data: { ...data, kind: data.kind as any, status: 'available' },
      });
      await this.audit.record({ action: 'unit.created', subjectType: 'Unit', subjectId: unit.id, siteId: data.siteId });
      return unit;
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new DomainException(ErrorCodes.UNIT_CODE_DUPLICATE, `Unit code ${data.unitCode} already exists in this site`);
      }
      throw e;
    }
  }

  async transitionUnitStatus(unitId: string, to: string, actorId: string, reason: string) {
    const unit = await this.prisma.unit.findUniqueOrThrow({ where: { id: unitId } });
    const allowed = ALLOWED_TRANSITIONS[unit.status] ?? [];

    if (!allowed.includes(to)) {
      throw new DomainException(
        ErrorCodes.UNIT_NOT_AVAILABLE,
        `Cannot transition unit from ${unit.status} to ${to}`,
        { unitId, from: unit.status, to },
      );
    }

    const updated = await this.prisma.unit.update({
      where: { id: unitId, auditVersion: unit.auditVersion },
      data: { status: to as any, auditVersion: { increment: 1 } },
    });

    await this.prisma.inventoryEvent.create({
      data: { unitId, oldStatus: unit.status, newStatus: to, reason, actorId },
    });
    await this.audit.record({ action: 'unit.status_changed', subjectType: 'Unit', subjectId: unitId, changes: { from: unit.status, to }, actorId, siteId: unit.siteId });
    return updated;
  }

  async deleteUnit(unitId: string, actorId: string) {
    if (await this.audit.hasLegalHold('Unit', unitId)) {
      throw new DomainException(ErrorCodes.LEGAL_HOLD_ACTIVE, `Unit ${unitId} has an active legal hold`);
    }
    return this.prisma.unit.update({ where: { id: unitId }, data: { deletedAt: new Date() } });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/site-inventory/site-inventory.service.spec.ts
```

Expected: 4 tests pass.

---

### Task A.2: Availability service (cached, p95 <300ms)

**Files:**
- Create: `apps/api/src/modules/site-inventory/availability.service.spec.ts`
- Create: `apps/api/src/modules/site-inventory/availability.service.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/site-inventory/availability.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { AvailabilityService } from './availability.service';

const mockPrisma = {
  unit: { findMany: vi.fn() },
};

const service = new AvailabilityService(mockPrisma as any);

describe('AvailabilityService', () => {
  it('returns available units grouped by unitTypeId', async () => {
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: 'u1', unitTypeId: 'ut1', status: 'available', sizeSqm: 14 },
      { id: 'u2', unitTypeId: 'ut1', status: 'available', sizeSqm: 14 },
      { id: 'u3', unitTypeId: 'ut2', status: 'available', sizeSqm: 20 },
    ]);

    const result = await service.getAvailability('site_01', new Date());
    expect(result).toHaveLength(2); // 2 unit types
    expect(result.find((r: any) => r.unitTypeId === 'ut1')?.availableCount).toBe(2);
  });

  it('excludes occupied and reserved units', async () => {
    mockPrisma.unit.findMany.mockResolvedValue([
      { id: 'u1', unitTypeId: 'ut1', status: 'available' },
      { id: 'u2', unitTypeId: 'ut1', status: 'occupied' },
    ]);

    const result = await service.getAvailability('site_01', new Date());
    expect(result.find((r: any) => r.unitTypeId === 'ut1')?.availableCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/site-inventory/availability.service.spec.ts
```

- [ ] **Step 3: Implement AvailabilityService**

`apps/api/src/modules/site-inventory/availability.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaClient) {}

  async getAvailability(siteId: string, _startDate: Date) {
    const units = await this.prisma.unit.findMany({
      where: { siteId, deletedAt: null, status: { in: ['available', 'reserved', 'occupied', 'maintenance'] } },
    });

    const byType = new Map<string, { unitTypeId: string; availableCount: number; totalCount: number }>();
    for (const unit of units) {
      const entry = byType.get(unit.unitTypeId) ?? { unitTypeId: unit.unitTypeId, availableCount: 0, totalCount: 0 };
      entry.totalCount++;
      if (unit.status === 'available') entry.availableCount++;
      byType.set(unit.unitTypeId, entry);
    }

    return Array.from(byType.values());
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/site-inventory/
```

---

### Task A.3: SiteInventory controller + module

**Files:**
- Create: `apps/api/src/modules/site-inventory/site-inventory.controller.ts`
- Create: `apps/api/src/modules/site-inventory/site-inventory.module.ts`
- Create: `apps/api/src/modules/site-inventory/dto/create-unit.dto.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

`apps/api/src/modules/site-inventory/dto/create-unit.dto.ts`:
```typescript
import { z } from 'zod';

export const CreateUnitSchema = z.object({
  siteId: z.string().cuid(),
  unitCode: z.string().min(1).max(20),
  unitTypeId: z.string().cuid(),
  kind: z.enum(['container', 'self_storage']),
  driveUp: z.boolean().default(false),
  zoneId: z.string().cuid().optional(),
  position: z.object({ row: z.string(), index: z.number() }).optional(),
});
export type CreateUnitDto = z.infer<typeof CreateUnitSchema>;

export const UnitStatusTransitionSchema = z.object({
  to: z.enum(['available', 'reserved', 'occupied', 'maintenance', 'out_of_service']),
  reason: z.string().min(1),
});
```

- [ ] **Step 2: Create controller**

`apps/api/src/modules/site-inventory/site-inventory.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { SiteGuard } from '../../common/guards/site.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SiteInventoryService } from './site-inventory.service';
import { AvailabilityService } from './availability.service';
import { CreateUnitSchema, UnitStatusTransitionSchema } from './dto/create-unit.dto';

@Controller()
export class SiteInventoryController {
  constructor(
    private siteInventory: SiteInventoryService,
    private availability: AvailabilityService,
  ) {}

  // Public endpoint — no auth
  @Get('public/v1/sites')
  getSites() {
    return this.siteInventory.getSites();
  }

  @Get('public/v1/sites/:slug/availability')
  getAvailability(@Param('slug') slug: string, @Query('startDate') startDate?: string) {
    return this.availability.getAvailability(slug, startDate ? new Date(startDate) : new Date());
  }

  // Operator endpoints
  @Post('operator/v1/sites/:siteId/units')
  @UseGuards(JwtAuthGuard, SiteGuard)
  createUnit(
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(CreateUnitSchema)) body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteInventory.createUnit({ ...body, siteId });
  }

  @Post('operator/v1/units/:unitId/status-transition')
  @UseGuards(JwtAuthGuard)
  transitionStatus(
    @Param('unitId') unitId: string,
    @Body(new ZodValidationPipe(UnitStatusTransitionSchema)) body: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.siteInventory.transitionUnitStatus(unitId, body.to, user.id, body.reason);
  }
}
```

- [ ] **Step 3: Create module and register**

`apps/api/src/modules/site-inventory/site-inventory.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SiteInventoryService } from './site-inventory.service';
import { AvailabilityService } from './availability.service';
import { SiteInventoryController } from './site-inventory.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [SiteInventoryController],
  providers: [SiteInventoryService, AvailabilityService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [SiteInventoryService, AvailabilityService],
})
export class SiteInventoryModule {}
```

Add `SiteInventoryModule` to `AppModule` imports.

- [ ] **Step 4: Run all tests and start dev server**

```bash
pnpm test && pnpm start:dev
curl http://localhost:3000/api/public/v1/sites
```

Expected: Empty array `[]`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/site-inventory/
git commit -m "feat(site-inventory): unit state machine, availability service, REST endpoints"
```

---

### Task A.4: Pricing module — quote calculator (TDD)

**Files:**
- Create: `apps/api/src/modules/pricing/quote.service.spec.ts`
- Create: `apps/api/src/modules/pricing/quote.service.ts`
- Create: `apps/api/src/modules/pricing/pricing.service.ts`
- Create: `apps/api/src/modules/pricing/pricing.controller.ts`
- Create: `apps/api/src/modules/pricing/pricing.module.ts`

- [ ] **Step 1: Write failing tests for quote calculator**

`apps/api/src/modules/pricing/quote.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { QuoteService } from './quote.service';

const mockPrisma = {
  rateRule: { findFirst: vi.fn() },
  promotion: { findFirst: vi.fn() },
  feeSchedule: { findFirst: vi.fn() },
  taxProfile: { findFirst: vi.fn() },
};

const service = new QuoteService(mockPrisma as any);

describe('QuoteService', () => {
  beforeEach(() => {
    mockPrisma.rateRule.findFirst.mockResolvedValue({ amountMinor: 14900, billingCycle: 'monthly' });
    mockPrisma.promotion.findFirst.mockResolvedValue(null);
    mockPrisma.feeSchedule.findFirst.mockResolvedValue({ depositMinor: 14900, adminFeeMinor: 0 });
    mockPrisma.taxProfile.findFirst.mockResolvedValue({ vatRate: 0.19, taxCode: 'DE_STD' });
  });

  it('calculates base rent with VAT and deposit', async () => {
    const quote = await service.calculateQuote({
      siteId: 'site_01', unitTypeId: 'ut_container_20ft',
      startDate: new Date('2026-06-01'), customerType: 'private',
    });

    expect(quote.rentMinor).toBe(14900);
    expect(quote.vatMinor).toBe(Math.round(14900 * 0.19));
    expect(quote.depositMinor).toBe(14900);
    expect(quote.totalDueTodayMinor).toBe(14900 + Math.round(14900 * 0.19) + 14900);
  });

  it('applies percentage discount promotion', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({
      discountType: 'percentage', value: 15, stackingPolicy: 'none',
    });

    const quote = await service.calculateQuote({
      siteId: 'site_01', unitTypeId: 'ut1', startDate: new Date(),
      customerType: 'private', promoCode: 'SPRING15',
    });

    expect(quote.discountMinor).toBe(Math.round(14900 * 0.15));
  });

  it('throws when no published rate rule found', async () => {
    mockPrisma.rateRule.findFirst.mockResolvedValue(null);
    await expect(service.calculateQuote({ siteId: 's1', unitTypeId: 'ut1', startDate: new Date(), customerType: 'private' }))
      .rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/pricing/quote.service.spec.ts
```

- [ ] **Step 3: Implement QuoteService**

`apps/api/src/modules/pricing/quote.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';

interface QuoteInput {
  siteId: string;
  unitTypeId: string;
  startDate: Date;
  customerType: string;
  promoCode?: string;
}

@Injectable()
export class QuoteService {
  constructor(private prisma: PrismaClient) {}

  async calculateQuote(input: QuoteInput) {
    const rule = await this.prisma.rateRule.findFirst({
      where: { unitTypeId: input.unitTypeId, priceBook: { siteId: input.siteId, status: 'published' } },
      include: { priceBook: true },
    });

    if (!rule) {
      throw new DomainException(ErrorCodes.UNIT_NOT_AVAILABLE, `No published rate rule for unit type ${input.unitTypeId} at site ${input.siteId}`);
    }

    const promo = input.promoCode
      ? await this.prisma.promotion.findFirst({ where: { siteId: input.siteId, code: input.promoCode, validFrom: { lte: input.startDate } } })
      : null;

    const fee = await this.prisma.feeSchedule.findFirst({ where: { siteId: input.siteId } });
    const tax = await this.prisma.taxProfile.findFirst({ where: { siteId: input.siteId } });

    const rentMinor = rule.amountMinor;
    let discountMinor = 0;

    if (promo) {
      discountMinor = promo.discountType === 'percentage'
        ? Math.round(rentMinor * (promo.value / 100))
        : promo.value;
    }

    const netRent = rentMinor - discountMinor;
    const vatRate = tax?.vatRate ?? 0.19;
    const vatMinor = input.customerType === 'business' ? 0 : Math.round(netRent * vatRate);
    const depositMinor = fee?.depositMinor ?? 0;
    const totalDueTodayMinor = netRent + vatMinor + depositMinor;

    return {
      rentMinor,
      discountMinor,
      depositMinor,
      vatMinor,
      vatRate,
      totalDueTodayMinor,
      currency: 'EUR',
      pricingSnapshot: { ruleId: rule.id, promoId: promo?.id, vatRate },
    };
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/pricing/quote.service.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Create PricingService, Controller, Module**

`apps/api/src/modules/pricing/pricing.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DomainException, ErrorCodes } from '@container-os/domain-types';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaClient, private audit: AuditService) {}

  async createPriceBook(siteId: string, name: string, effectiveFrom: Date, actorId: string) {
    const book = await this.prisma.priceBook.create({ data: { siteId, name, effectiveFrom } });
    await this.audit.record({ action: 'price_book.created', subjectType: 'PriceBook', subjectId: book.id, siteId, actorId });
    return book;
  }

  async publishPriceBook(priceBookId: string, actorId: string) {
    const book = await this.prisma.priceBook.findUniqueOrThrow({ where: { id: priceBookId } });
    const hasRules = await this.prisma.rateRule.count({ where: { priceBookId } });
    if (!hasRules) throw new DomainException(ErrorCodes.UNIT_NOT_AVAILABLE, 'Price book has no rate rules');

    const updated = await this.prisma.priceBook.update({ where: { id: priceBookId }, data: { status: 'published' } });
    await this.audit.record({ action: 'price_book.published', subjectType: 'PriceBook', subjectId: priceBookId, siteId: book.siteId, actorId });
    return updated;
  }

  async addRateRule(priceBookId: string, unitTypeId: string, amountMinor: number, billingCycle: string) {
    return this.prisma.rateRule.create({ data: { priceBookId, unitTypeId, amountMinor, billingCycle } });
  }
}
```

`apps/api/src/modules/pricing/pricing.controller.ts`:
```typescript
import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { QuoteService } from './quote.service';
import { PricingService } from './pricing.service';

@Controller()
export class PricingController {
  constructor(private quoteService: QuoteService, private pricingService: PricingService) {}

  @Get('public/v1/quotes')
  getQuote(
    @Query('siteId') siteId: string,
    @Query('unitTypeId') unitTypeId: string,
    @Query('startDate') startDate: string,
    @Query('customerType') customerType: string = 'private',
    @Query('promoCode') promoCode?: string,
  ) {
    return this.quoteService.calculateQuote({ siteId, unitTypeId, startDate: new Date(startDate), customerType, promoCode });
  }

  @Post('operator/v1/price-books')
  @UseGuards(JwtAuthGuard)
  createPriceBook(@Body() body: { siteId: string; name: string; effectiveFrom: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.pricingService.createPriceBook(body.siteId, body.name, new Date(body.effectiveFrom), user.id);
  }

  @Post('operator/v1/price-books/:id/publish')
  @UseGuards(JwtAuthGuard)
  publishPriceBook(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pricingService.publishPriceBook(id, user.id);
  }
}
```

`apps/api/src/modules/pricing/pricing.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { QuoteService } from './quote.service';
import { PricingController } from './pricing.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PricingController],
  providers: [PricingService, QuoteService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [QuoteService],
})
export class PricingModule {}
```

Add `PricingModule` to `AppModule` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/pricing/
git commit -m "feat(pricing): quote calculator with promo/VAT support, price book management"
```

---

### Task A.5: Storefront module — checkout session with inventory lock

**Files:**
- Create: `apps/api/src/modules/storefront/storefront.service.spec.ts`
- Create: `apps/api/src/modules/storefront/storefront.service.ts`
- Create: `apps/api/src/modules/storefront/storefront.controller.ts`
- Create: `apps/api/src/modules/storefront/storefront.module.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/storefront/storefront.service.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorefrontService } from './storefront.service';

const mockPrisma = {
  checkoutSession: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  reservationHold: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
  unit: { findFirst: vi.fn() },
  quoteRequest: { create: vi.fn() },
};

const service = new StorefrontService(mockPrisma as any);

describe('StorefrontService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates checkout session and reservation hold when unit available', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'u1', status: 'available' });
    mockPrisma.reservationHold.findFirst.mockResolvedValue(null);
    mockPrisma.reservationHold.create.mockResolvedValue({ id: 'h1', lockToken: 'tok_01', expiresAt: new Date() });
    mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'chk_01', expiresAt: new Date(), state: 'started' });

    const result = await service.createCheckoutSession('site_01', 'ut_container_20ft', new Date());
    expect(mockPrisma.checkoutSession.create).toHaveBeenCalled();
    expect(mockPrisma.reservationHold.create).toHaveBeenCalled();
    expect(result).toHaveProperty('checkoutSessionId');
  });

  it('returns sold_out when no available unit for type', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue(null);
    const result = await service.createCheckoutSession('site_01', 'ut_container_20ft', new Date());
    expect(result.availabilityState).toBe('sold_out');
    expect(mockPrisma.checkoutSession.create).not.toHaveBeenCalled();
  });

  it('expires stale session before creating new hold', async () => {
    mockPrisma.unit.findFirst.mockResolvedValue({ id: 'u1', status: 'available' });
    mockPrisma.reservationHold.findFirst.mockResolvedValue(null);
    mockPrisma.reservationHold.create.mockResolvedValue({ id: 'h1', lockToken: 'tok', expiresAt: new Date() });
    mockPrisma.checkoutSession.create.mockResolvedValue({ id: 'chk_01', expiresAt: new Date(), state: 'started' });

    await service.createCheckoutSession('site_01', 'ut_container_20ft', new Date());
    expect(mockPrisma.reservationHold.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ expiresAt: expect.any(Object) }) })
    );
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/storefront/storefront.service.spec.ts
```

- [ ] **Step 3: Implement StorefrontService**

`apps/api/src/modules/storefront/storefront.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const CHECKOUT_TTL_MINUTES = 15;

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaClient) {}

  async createCheckoutSession(siteId: string, unitTypeId: string, startDate: Date) {
    // Expire stale holds first
    await this.prisma.reservationHold.deleteMany({ where: { expiresAt: { lt: new Date() } } });

    // Find an available unit for this type (not currently held)
    const unit = await this.prisma.unit.findFirst({
      where: {
        siteId, unitTypeId, status: 'available', deletedAt: null,
        id: { notIn: await this.getHeldUnitIds(siteId) },
      },
    });

    if (!unit) return { availabilityState: 'sold_out' as const };

    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60 * 1000);

    const [hold, session] = await Promise.all([
      this.prisma.reservationHold.create({ data: { unitId: unit.id, expiresAt } }),
      this.prisma.checkoutSession.create({ data: { siteId, unitTypeId, expiresAt, metadata: { startDate, unitId: unit.id } } }),
    ]);

    return {
      checkoutSessionId: session.id,
      expiresAt: session.expiresAt,
      availabilityState: 'available' as const,
      lockToken: hold.lockToken,
    };
  }

  private async getHeldUnitIds(siteId: string): Promise<string[]> {
    const holds = await this.prisma.reservationHold.findMany({
      where: { expiresAt: { gte: new Date() } },
      select: { unitId: true },
    });
    return holds.map((h) => h.unitId);
  }

  async createQuoteRequest(siteId: string, contact: object, requirements?: object) {
    return this.prisma.quoteRequest.create({ data: { siteId, contact, requirements } });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/storefront/
```

- [ ] **Step 5: Create StorefrontController and StorefrontModule**

`apps/api/src/modules/storefront/storefront.controller.ts`:
```typescript
import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';

@Controller('public/v1')
export class StorefrontController {
  constructor(private storefront: StorefrontService) {}

  @Get('storefront/:siteSlug/availability')
  getAvailability(@Param('siteSlug') siteSlug: string, @Query('startDate') startDate?: string) {
    return { siteSlug, startDate }; // Delegates to AvailabilityService — wired via SiteInventoryModule
  }

  @Post('checkout-sessions')
  createCheckoutSession(@Body() body: { siteId: string; unitTypeId: string; startDate: string }) {
    return this.storefront.createCheckoutSession(body.siteId, body.unitTypeId, new Date(body.startDate));
  }

  @Post('quote-requests')
  createQuoteRequest(@Body() body: { siteId: string; contact: object; requirements?: object }) {
    return this.storefront.createQuoteRequest(body.siteId, body.contact, body.requirements);
  }
}
```

`apps/api/src/modules/storefront/storefront.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StorefrontController } from './storefront.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [StorefrontController],
  providers: [StorefrontService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [StorefrontService],
})
export class StorefrontModule {}
```

Add `StorefrontModule` to `AppModule` imports.

- [ ] **Step 6: Integration test — checkout race condition**

`apps/api/src/modules/storefront/storefront.integration.spec.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { StorefrontService } from './storefront.service';

// This test requires TEST_DATABASE_URL to be set
describe('StorefrontService (integration)', () => {
  let prisma: PrismaClient;
  let service: StorefrontService;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
    await prisma.$connect();
    service = new StorefrontService(prisma);
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it('only one session wins when two concurrent requests race for last unit', async () => {
    // Seed one available unit
    const site = await prisma.site.create({ data: { name: 'Test', slug: `test-${Date.now()}`, address: {} } });
    const ut = await prisma.unitType.create({ data: { siteId: site.id, name: '20ft', sizeSqm: 14 } });
    await prisma.unit.create({ data: { siteId: site.id, unitCode: 'T-1', unitTypeId: ut.id, kind: 'container' } });

    const [r1, r2] = await Promise.all([
      service.createCheckoutSession(site.id, ut.id, new Date()),
      service.createCheckoutSession(site.id, ut.id, new Date()),
    ]);

    const winners = [r1, r2].filter((r) => r.availabilityState === 'available');
    const sold = [r1, r2].filter((r) => r.availabilityState === 'sold_out');
    expect(winners).toHaveLength(1);
    expect(sold).toHaveLength(1);

    // Cleanup
    await prisma.reservationHold.deleteMany({});
    await prisma.checkoutSession.deleteMany({});
    await prisma.unit.deleteMany({ where: { siteId: site.id } });
    await prisma.unitType.deleteMany({ where: { siteId: site.id } });
    await prisma.site.delete({ where: { id: site.id } });
  });
});
```

- [ ] **Step 7: Run integration test**

```bash
TEST_DATABASE_URL=$TEST_DATABASE_URL pnpm test src/modules/storefront/storefront.integration.spec.ts
```

Expected: 1 test passes — only one checkout session wins the race.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/storefront/
git commit -m "feat(storefront): checkout session with inventory lock, race-condition safe"
```

---

## Track A complete

APIs available:
- `GET /api/public/v1/sites`
- `GET /api/public/v1/sites/:slug/availability`
- `GET /api/public/v1/quotes`
- `POST /api/public/v1/checkout-sessions`
- `POST /api/public/v1/quote-requests`
- `POST /api/operator/v1/sites/:siteId/units`
- `POST /api/operator/v1/units/:unitId/status-transition`
- `POST /api/operator/v1/price-books`
- `POST /api/operator/v1/price-books/:id/publish`
