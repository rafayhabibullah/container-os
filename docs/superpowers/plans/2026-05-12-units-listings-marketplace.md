# Units, Listings & Marketplace Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Unit Types and Units management UI for operators, Pricing (price books + rate rules) management for owners, and a public marketplace search + site detail page for prospective tenants.

**Architecture:** New `UnitTypeService` and `PricingManagementService` are added to the existing `organisations` module and wired into `OrganisationController` under `v1/organisations/:organisationId/sites/:siteId/...`. The public marketplace uses the already-existing public endpoints (`GET /public/v1/sites`, `GET /public/v1/sites/:slug/availability`) via `serverFetch` without a Bearer token. All operator/owner mutations go through Next.js BFF route handlers that call `proxyToBackend`.

**Tech Stack:** NestJS 10, Prisma 5, class-validator, Next.js 14 App Router, TypeScript, Tailwind CSS

---

## Plan Scope (3 of 6)

| Earlier plan | Covers |
|---|---|
| Plan 1 | Auth, JWT, unified portal shell, login/register/accept-invite |
| Plan 2 | Org/Site/Team management UI |

| Later plan | Covers |
|---|---|
| Plan 4 | Booking, Tenant Portal |
| Plan 5 | Contracts, Invoices, Mollie Payments |
| Plan 6 | Operations, Reports, Admin, Hardening |

---

## What already exists — do NOT re-implement

**Schema models (in `apps/api/prisma/schema.prisma`):**
- `Site`, `Zone`, `UnitType`, `Unit`, `InventoryEvent` — all fully defined
- `PriceBook` (id, siteId, name, status[draft|published|archived], effectiveFrom)
- `RateRule` (id, priceBookId, unitTypeId, amountMinor, billingCycle[monthly|fixed_term], conditions)
- `Promotion`, `FeeSchedule`, `TaxProfile`
- `LandingPageConfig`, `CheckoutSession`, `QuoteRequest`

**Existing API (`apps/api/src/modules/site-inventory/`):**
- `SiteInventoryService`: `createUnit`, `transitionUnitStatus`, `deleteUnit`, `getUnits`, `getSites`, `getSiteBySlug`
- `AvailabilityService`: `getAvailability(siteId, startDate)`
- `SiteInventoryController`: public `GET /public/v1/sites`, `GET /public/v1/sites/:slug/availability`; operator `POST /operator/v1/sites/:siteId/units`, `GET /operator/v1/units`, `POST /operator/v1/units/:unitId/status-transition`

**Existing `OrganisationController`** under `v1/organisations/:organisationId` — handles org/sites/members/invitations.

**Existing web pages:** login, register, accept-invite, dashboard, `/sites` (list/new/[siteId]), team, settings.

**Helpers:**
- `apps/web/src/lib/server-api.ts` — `serverFetch<T>(path, init?)`
- `apps/web/src/lib/api-route-helpers.ts` — `getAuthContext()`, `proxyToBackend(path, method, token, body?)`
- `apps/web/src/lib/auth.ts` — `requireAuth()`, `TokenPayload`

---

## File Map

### New (backend)
- `apps/api/src/modules/organisations/unit-type.service.ts`
- `apps/api/src/modules/organisations/unit-type.service.spec.ts`
- `apps/api/src/modules/organisations/pricing-management.service.ts`
- `apps/api/src/modules/organisations/pricing-management.service.spec.ts`
- `apps/api/src/modules/organisations/dto/create-unit-type.dto.ts`
- `apps/api/src/modules/organisations/dto/update-unit-type.dto.ts`
- `apps/api/src/modules/organisations/dto/create-price-book.dto.ts`
- `apps/api/src/modules/organisations/dto/create-rate-rule.dto.ts`

### Modified (backend)
- `apps/api/src/modules/organisations/organisations.controller.ts` — add unit-type and pricing endpoints
- `apps/api/src/modules/organisations/organisations.module.ts` — add new services

### New (frontend)
- `apps/web/src/app/sites/[siteId]/units/page.tsx`
- `apps/web/src/app/sites/[siteId]/units/new/page.tsx`
- `apps/web/src/app/sites/[siteId]/units/[unitId]/page.tsx`
- `apps/web/src/app/sites/[siteId]/units/[unitId]/UnitEditForm.tsx`
- `apps/web/src/app/api/sites/[siteId]/units/route.ts`
- `apps/web/src/app/api/sites/[siteId]/units/[unitId]/route.ts`
- `apps/web/src/app/sites/[siteId]/unit-types/page.tsx`
- `apps/web/src/app/sites/[siteId]/unit-types/new/page.tsx`
- `apps/web/src/app/api/sites/[siteId]/unit-types/route.ts`
- `apps/web/src/app/sites/[siteId]/pricing/page.tsx`
- `apps/web/src/app/sites/[siteId]/pricing/PricingActions.tsx`
- `apps/web/src/app/api/sites/[siteId]/price-books/route.ts`
- `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/route.ts`
- `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/rate-rules/route.ts`
- `apps/web/src/app/storage/page.tsx`
- `apps/web/src/app/storage/[slug]/page.tsx`

### Modified (frontend)
- `apps/web/src/app/sites/[siteId]/page.tsx` — add nav links to units, unit-types, pricing

---

## Task 1: Unit Type DTOs

**Files:**
- Create: `apps/api/src/modules/organisations/dto/create-unit-type.dto.ts`
- Create: `apps/api/src/modules/organisations/dto/update-unit-type.dto.ts`

- [ ] **Step 1: Create create-unit-type.dto.ts**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateUnitTypeDto {
  @ApiProperty({ example: 'Small 5m²' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0.1)
  sizeSqm: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sizeCbm?: number;

  @ApiPropertyOptional({ example: 'roller' })
  @IsOptional()
  @IsString()
  doorType?: string;

  @ApiPropertyOptional({ example: ['climate_controlled', 'ground_floor'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}
```

- [ ] **Step 2: Create update-unit-type.dto.ts**

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUnitTypeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.1) sizeSqm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sizeCbm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() doorType?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
}
```

- [ ] **Step 3: Commit and push**

```bash
git add apps/api/src/modules/organisations/dto/
git commit -m "feat(units): add CreateUnitTypeDto and UpdateUnitTypeDto"
git push
```

---

## Task 2: Pricing DTOs

**Files:**
- Create: `apps/api/src/modules/organisations/dto/create-price-book.dto.ts`
- Create: `apps/api/src/modules/organisations/dto/create-rate-rule.dto.ts`

- [ ] **Step 1: Create create-price-book.dto.ts**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreatePriceBookDto {
  @ApiProperty({ example: 'Summer 2026' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  effectiveFrom: string;
}
```

- [ ] **Step 2: Create create-rate-rule.dto.ts**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRateRuleDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  unitTypeId: string;

  @ApiProperty({ example: 8900, description: 'Amount in minor units (cents)' })
  @IsInt()
  @Min(0)
  amountMinor: number;

  @ApiProperty({ enum: ['monthly', 'fixed_term'] })
  @IsEnum(['monthly', 'fixed_term'])
  billingCycle: 'monthly' | 'fixed_term';

  @ApiPropertyOptional()
  @IsOptional()
  conditions?: object;
}
```

- [ ] **Step 3: Commit and push**

```bash
git add apps/api/src/modules/organisations/dto/
git commit -m "feat(pricing): add CreatePriceBookDto and CreateRateRuleDto"
git push
```

---

## Task 3: UnitTypeService (TDD)

**Files:**
- Create: `apps/api/src/modules/organisations/unit-type.service.spec.ts`
- Create: `apps/api/src/modules/organisations/unit-type.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/organisations/unit-type.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnitTypeService } from './unit-type.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  unitType: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('UnitTypeService', () => {
  let service: UnitTypeService;

  beforeEach(() => {
    service = new UnitTypeService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listUnitTypes', () => {
    it('returns unit types for the site', async () => {
      const types = [{ id: 'ut1', siteId: 's1', name: 'Small 5m²' }];
      mockPrisma.unitType.findMany.mockResolvedValue(types);

      const result = await service.listUnitTypes('org1', 's1');

      expect(result).toEqual(types);
      expect(mockPrisma.unitType.findMany).toHaveBeenCalledWith({
        where: { siteId: 's1' },
        orderBy: { sizeSqm: 'asc' },
      });
    });
  });

  describe('createUnitType', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.createUnitType('org1', 's1', { name: 'Small', sizeSqm: 5 }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates unit type when role is owner', async () => {
      const created = { id: 'ut1', siteId: 's1', name: 'Small', sizeSqm: 5 };
      mockPrisma.unitType.create.mockResolvedValue(created);

      const result = await service.createUnitType('org1', 's1', { name: 'Small', sizeSqm: 5 }, 'owner');

      expect(result).toEqual(created);
      expect(mockPrisma.unitType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ siteId: 's1', name: 'Small', sizeSqm: 5 }),
      });
    });
  });

  describe('updateUnitType', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.updateUnitType('org1', 's1', 'ut1', { name: 'New' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when unit type not found', async () => {
      mockPrisma.unitType.findFirst.mockResolvedValue(null);
      await expect(
        service.updateUnitType('org1', 's1', 'ut1', { name: 'New' }, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates unit type when owner', async () => {
      mockPrisma.unitType.findFirst.mockResolvedValue({ id: 'ut1', siteId: 's1' });
      mockPrisma.unitType.update.mockResolvedValue({ id: 'ut1', name: 'New' });

      const result = await service.updateUnitType('org1', 's1', 'ut1', { name: 'New' }, 'owner');

      expect(result).toEqual({ id: 'ut1', name: 'New' });
    });
  });

  describe('deleteUnitType', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.deleteUnitType('org1', 's1', 'ut1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('deletes unit type when owner', async () => {
      mockPrisma.unitType.findFirst.mockResolvedValue({ id: 'ut1', siteId: 's1' });
      mockPrisma.unitType.delete.mockResolvedValue({});

      await service.deleteUnitType('org1', 's1', 'ut1', 'owner');

      expect(mockPrisma.unitType.delete).toHaveBeenCalledWith({ where: { id: 'ut1' } });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
npx vitest run --testPathPattern=unit-type.service.spec --no-coverage
```

Expected: FAIL — `UnitTypeService` not found.

- [ ] **Step 3: Implement UnitTypeService**

Create `apps/api/src/modules/organisations/unit-type.service.ts`:

```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';

@Injectable()
export class UnitTypeService {
  constructor(private readonly prisma: PrismaClient) {}

  async listUnitTypes(_orgId: string, siteId: string) {
    return this.prisma.unitType.findMany({
      where: { siteId },
      orderBy: { sizeSqm: 'asc' },
    });
  }

  async createUnitType(_orgId: string, siteId: string, dto: CreateUnitTypeDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.unitType.create({
      data: {
        siteId,
        name: dto.name,
        sizeSqm: dto.sizeSqm,
        sizeCbm: dto.sizeCbm,
        doorType: dto.doorType,
        features: dto.features ?? [],
      },
    });
  }

  private async findUnitType(siteId: string, unitTypeId: string) {
    const unitType = await this.prisma.unitType.findFirst({ where: { id: unitTypeId, siteId } });
    if (!unitType) throw new NotFoundException('UNIT_TYPE_NOT_FOUND');
    return unitType;
  }

  async updateUnitType(_orgId: string, siteId: string, unitTypeId: string, dto: UpdateUnitTypeDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findUnitType(siteId, unitTypeId);
    return this.prisma.unitType.update({ where: { id: unitTypeId }, data: dto });
  }

  async deleteUnitType(_orgId: string, siteId: string, unitTypeId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findUnitType(siteId, unitTypeId);
    await this.prisma.unitType.delete({ where: { id: unitTypeId } });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --testPathPattern=unit-type.service.spec --no-coverage
```

Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/organisations/unit-type.service.ts \
        apps/api/src/modules/organisations/unit-type.service.spec.ts
git commit -m "feat(units): UnitTypeService — list, create, update, delete (TDD)"
git push
```

---

## Task 4: PricingManagementService (TDD)

**Files:**
- Create: `apps/api/src/modules/organisations/pricing-management.service.spec.ts`
- Create: `apps/api/src/modules/organisations/pricing-management.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/organisations/pricing-management.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PricingManagementService } from './pricing-management.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  priceBook: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  rateRule: {
    create: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
};

describe('PricingManagementService', () => {
  let service: PricingManagementService;

  beforeEach(() => {
    service = new PricingManagementService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listPriceBooks', () => {
    it('returns price books for the site', async () => {
      const books = [{ id: 'pb1', siteId: 's1', name: 'Standard' }];
      mockPrisma.priceBook.findMany.mockResolvedValue(books);

      const result = await service.listPriceBooks('s1');

      expect(result).toEqual(books);
      expect(mockPrisma.priceBook.findMany).toHaveBeenCalledWith({
        where: { siteId: 's1' },
        include: { rules: true },
        orderBy: { effectiveFrom: 'desc' },
      });
    });
  });

  describe('createPriceBook', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.createPriceBook('s1', { name: 'Test', effectiveFrom: '2026-01-01' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates price book in draft status when owner', async () => {
      const created = { id: 'pb1', siteId: 's1', name: 'Test', status: 'draft' };
      mockPrisma.priceBook.create.mockResolvedValue(created);

      const result = await service.createPriceBook('s1', { name: 'Test', effectiveFrom: '2026-01-01' }, 'owner');

      expect(result).toEqual(created);
      expect(mockPrisma.priceBook.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ siteId: 's1', name: 'Test', status: 'draft' }),
      });
    });
  });

  describe('publishPriceBook', () => {
    it('throws NotFoundException when price book not found', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue(null);
      await expect(service.publishPriceBook('s1', 'pb1', 'owner')).rejects.toThrow(NotFoundException);
    });

    it('sets status to published', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue({ id: 'pb1', siteId: 's1', status: 'draft' });
      mockPrisma.priceBook.update.mockResolvedValue({ id: 'pb1', status: 'published' });

      const result = await service.publishPriceBook('s1', 'pb1', 'owner');

      expect(result).toEqual({ id: 'pb1', status: 'published' });
      expect(mockPrisma.priceBook.update).toHaveBeenCalledWith({
        where: { id: 'pb1' },
        data: { status: 'published' },
      });
    });
  });

  describe('addRateRule', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.addRateRule('s1', 'pb1', { unitTypeId: 'ut1', amountMinor: 8900, billingCycle: 'monthly' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates rate rule when owner', async () => {
      mockPrisma.priceBook.findFirst.mockResolvedValue({ id: 'pb1', siteId: 's1' });
      const rule = { id: 'rr1', priceBookId: 'pb1', unitTypeId: 'ut1', amountMinor: 8900 };
      mockPrisma.rateRule.create.mockResolvedValue(rule);

      const result = await service.addRateRule(
        's1', 'pb1', { unitTypeId: 'ut1', amountMinor: 8900, billingCycle: 'monthly' }, 'owner',
      );

      expect(result).toEqual(rule);
    });
  });

  describe('removeRateRule', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.removeRateRule('s1', 'pb1', 'rr1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('deletes rate rule when owner', async () => {
      mockPrisma.rateRule.findFirst.mockResolvedValue({ id: 'rr1', priceBook: { siteId: 's1' } });
      mockPrisma.rateRule.delete.mockResolvedValue({});

      await service.removeRateRule('s1', 'pb1', 'rr1', 'owner');

      expect(mockPrisma.rateRule.delete).toHaveBeenCalledWith({ where: { id: 'rr1' } });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --testPathPattern=pricing-management.service.spec --no-coverage
```

Expected: FAIL — `PricingManagementService` not found.

- [ ] **Step 3: Implement PricingManagementService**

Create `apps/api/src/modules/organisations/pricing-management.service.ts`:

```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreatePriceBookDto } from './dto/create-price-book.dto';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';

@Injectable()
export class PricingManagementService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPriceBooks(siteId: string) {
    return this.prisma.priceBook.findMany({
      where: { siteId },
      include: { rules: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createPriceBook(siteId: string, dto: CreatePriceBookDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.priceBook.create({
      data: { siteId, name: dto.name, effectiveFrom: new Date(dto.effectiveFrom), status: 'draft' },
    });
  }

  private async findPriceBook(siteId: string, priceBookId: string) {
    const book = await this.prisma.priceBook.findFirst({ where: { id: priceBookId, siteId } });
    if (!book) throw new NotFoundException('PRICE_BOOK_NOT_FOUND');
    return book;
  }

  async publishPriceBook(siteId: string, priceBookId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findPriceBook(siteId, priceBookId);
    return this.prisma.priceBook.update({ where: { id: priceBookId }, data: { status: 'published' } });
  }

  async archivePriceBook(siteId: string, priceBookId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findPriceBook(siteId, priceBookId);
    return this.prisma.priceBook.update({ where: { id: priceBookId }, data: { status: 'archived' } });
  }

  async addRateRule(siteId: string, priceBookId: string, dto: CreateRateRuleDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.findPriceBook(siteId, priceBookId);
    return this.prisma.rateRule.create({
      data: {
        priceBookId,
        unitTypeId: dto.unitTypeId,
        amountMinor: dto.amountMinor,
        billingCycle: dto.billingCycle,
        conditions: dto.conditions ?? undefined,
      },
    });
  }

  async removeRateRule(siteId: string, _priceBookId: string, rateRuleId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    const rule = await this.prisma.rateRule.findFirst({
      where: { id: rateRuleId },
      include: { priceBook: true },
    });
    if (!rule || (rule.priceBook as any).siteId !== siteId) throw new NotFoundException('RATE_RULE_NOT_FOUND');
    await this.prisma.rateRule.delete({ where: { id: rateRuleId } });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --testPathPattern=pricing-management.service.spec --no-coverage
```

Expected: PASS — 8 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/organisations/pricing-management.service.ts \
        apps/api/src/modules/organisations/pricing-management.service.spec.ts
git commit -m "feat(pricing): PricingManagementService — price books + rate rules (TDD)"
git push
```

---

## Task 5: Wire new services into OrganisationController and Module

**Files:**
- Modify: `apps/api/src/modules/organisations/organisations.controller.ts`
- Modify: `apps/api/src/modules/organisations/organisations.module.ts`

- [ ] **Step 1: Add endpoints to OrganisationController**

Open `apps/api/src/modules/organisations/organisations.controller.ts`.

Add these imports at the top:

```typescript
import { UnitTypeService } from './unit-type.service';
import { PricingManagementService } from './pricing-management.service';
import { CreateUnitTypeDto } from './dto/create-unit-type.dto';
import { UpdateUnitTypeDto } from './dto/update-unit-type.dto';
import { CreatePriceBookDto } from './dto/create-price-book.dto';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';
```

Add `unitTypes: UnitTypeService` and `pricing: PricingManagementService` to the constructor.

Then add these endpoint methods to the `OrganisationController` class:

```typescript
  // ─── Unit Types ──────────────────────────────────────────────────────────────

  @Get('sites/:siteId/unit-types')
  @ApiOperation({ summary: 'List unit types for a site' })
  listUnitTypes(@Param('organisationId') orgId: string, @Param('siteId') siteId: string) {
    return this.unitTypes.listUnitTypes(orgId, siteId);
  }

  @Post('sites/:siteId/unit-types')
  @ApiOperation({ summary: 'Create unit type (owner only)' })
  createUnitType(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Body() dto: CreateUnitTypeDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.unitTypes.createUnitType(orgId, siteId, dto, member.role);
  }

  @Patch('sites/:siteId/unit-types/:unitTypeId')
  @ApiOperation({ summary: 'Update unit type (owner only)' })
  updateUnitType(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Param('unitTypeId') unitTypeId: string,
    @Body() dto: UpdateUnitTypeDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.unitTypes.updateUnitType(orgId, siteId, unitTypeId, dto, member.role);
  }

  @Delete('sites/:siteId/unit-types/:unitTypeId')
  @ApiOperation({ summary: 'Delete unit type (owner only)' })
  deleteUnitType(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Param('unitTypeId') unitTypeId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.unitTypes.deleteUnitType(orgId, siteId, unitTypeId, member.role);
  }

  // ─── Price Books ─────────────────────────────────────────────────────────────

  @Get('sites/:siteId/price-books')
  @ApiOperation({ summary: 'List price books for a site' })
  listPriceBooks(@Param('siteId') siteId: string) {
    return this.pricing.listPriceBooks(siteId);
  }

  @Post('sites/:siteId/price-books')
  @ApiOperation({ summary: 'Create price book (owner only)' })
  createPriceBook(
    @Param('siteId') siteId: string,
    @Body() dto: CreatePriceBookDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.createPriceBook(siteId, dto, member.role);
  }

  @Post('sites/:siteId/price-books/:priceBookId/publish')
  @ApiOperation({ summary: 'Publish a price book (owner only)' })
  publishPriceBook(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.publishPriceBook(siteId, priceBookId, member.role);
  }

  @Post('sites/:siteId/price-books/:priceBookId/archive')
  @ApiOperation({ summary: 'Archive a price book (owner only)' })
  archivePriceBook(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.archivePriceBook(siteId, priceBookId, member.role);
  }

  @Post('sites/:siteId/price-books/:priceBookId/rate-rules')
  @ApiOperation({ summary: 'Add rate rule to price book (owner only)' })
  addRateRule(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @Body() dto: CreateRateRuleDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.addRateRule(siteId, priceBookId, dto, member.role);
  }

  @Delete('sites/:siteId/price-books/:priceBookId/rate-rules/:rateRuleId')
  @ApiOperation({ summary: 'Remove rate rule (owner only)' })
  removeRateRule(
    @Param('siteId') siteId: string,
    @Param('priceBookId') priceBookId: string,
    @Param('rateRuleId') rateRuleId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.pricing.removeRateRule(siteId, priceBookId, rateRuleId, member.role);
  }
```

- [ ] **Step 2: Update OrganisationModule**

In `apps/api/src/modules/organisations/organisations.module.ts`, add `UnitTypeService` and `PricingManagementService` to `providers` and `exports`:

```typescript
import { UnitTypeService } from './unit-type.service';
import { PricingManagementService } from './pricing-management.service';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    OrganisationService,
    SiteService,
    TeamService,
    UnitTypeService,
    PricingManagementService,
  ],
  controllers: [OrganisationController],
  exports: [OrganisationService, SiteService, TeamService, UnitTypeService, PricingManagementService],
})
```

- [ ] **Step 3: Build to verify no TypeScript errors**

```bash
cd apps/api
npx nest build 2>&1 | tail -5
```

Expected: No output (exit 0).

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run --no-coverage 2>&1 | tail -6
```

Expected: All tests pass.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/organisations/organisations.controller.ts \
        apps/api/src/modules/organisations/organisations.module.ts
git commit -m "feat(units,pricing): wire UnitTypeService and PricingManagementService into OrganisationModule"
git push
```

---

## Task 6: Units Management Pages (Frontend)

**Files:**
- Create: `apps/web/src/app/sites/[siteId]/units/page.tsx`
- Create: `apps/web/src/app/sites/[siteId]/units/new/page.tsx`
- Create: `apps/web/src/app/sites/[siteId]/units/[unitId]/page.tsx`
- Create: `apps/web/src/app/sites/[siteId]/units/[unitId]/UnitEditForm.tsx`
- Create: `apps/web/src/app/api/sites/[siteId]/units/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/units/[unitId]/route.ts`

- [ ] **Step 1: Create units list page**

Create `apps/web/src/app/sites/[siteId]/units/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }
interface Unit {
  id: string; unitCode: string; kind: string;
  status: string; driveUp: boolean; unitType: UnitType;
}

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  reserved: 'bg-yellow-100 text-yellow-700',
  occupied: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  out_of_service: 'bg-red-100 text-red-700',
};

export default async function UnitsPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const units = await serverFetch<Unit[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/units`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/sites/${params.siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Site</Link>
            <h1 className="text-2xl font-bold text-slate-900">Units</h1>
          </div>
          {(user.role === 'owner' || user.role === 'operator') && (
            <Link href={`/sites/${params.siteId}/units/new`}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add unit
            </Link>
          )}
        </div>

        {units.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No units yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Code</th>
                  <th className="text-left px-6 py-3">Type</th>
                  <th className="text-left px-6 py-3">Kind</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono font-medium text-slate-900">{unit.unitCode}</td>
                    <td className="px-6 py-4 text-slate-600">{unit.unitType?.name ?? '—'} ({unit.unitType?.sizeSqm}m²)</td>
                    <td className="px-6 py-4 text-slate-500 capitalize">{unit.kind.replace('_', ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[unit.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {unit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/sites/${params.siteId}/units/${unit.id}`}
                        className="text-blue-600 hover:underline text-sm">Edit</Link>
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

- [ ] **Step 2: Create new unit form page**

Create `apps/web/src/app/sites/[siteId]/units/new/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import NewUnitForm from './NewUnitForm';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }

export default async function NewUnitPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const unitTypes = await serverFetch<UnitType[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`,
  ).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/sites/${params.siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Units</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Add a new unit</h1>
        <NewUnitForm siteId={params.siteId} unitTypes={unitTypes} />
      </div>
    </div>
  );
}
```

Create `apps/web/src/app/sites/[siteId]/units/new/NewUnitForm.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; }

export default function NewUnitForm({ siteId, unitTypes }: { siteId: string; unitTypes: UnitType[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: form.get('unitCode'),
          unitTypeId: form.get('unitTypeId'),
          kind: form.get('kind'),
          driveUp: form.get('driveUp') === 'on',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create unit');
      router.push(`/sites/${siteId}/units`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit code</label>
        <input name="unitCode" type="text" required placeholder="A-101"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit type</label>
        <select name="unitTypeId" required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Select a unit type…</option>
          {unitTypes.map((ut) => (
            <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Kind</label>
        <select name="kind"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="self_storage">Self Storage</option>
          <option value="container">Container</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input name="driveUp" type="checkbox" id="driveUp" className="rounded" />
        <label htmlFor="driveUp" className="text-sm text-slate-700">Drive-up access</label>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {loading ? 'Creating…' : 'Create unit'}
        </button>
        <Link href={`/sites/${siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</Link>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create unit detail/edit page**

Create `apps/web/src/app/sites/[siteId]/units/[unitId]/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import UnitEditForm from './UnitEditForm';
import Link from 'next/link';

interface Unit {
  id: string; unitCode: string; kind: string; status: string; driveUp: boolean;
}

export default async function UnitDetailPage({ params }: { params: { siteId: string; unitId: string } }) {
  const user = await requireAuth();
  const unit = await serverFetch<Unit>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/sites/${params.siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Units</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Unit {unit.unitCode}</h1>
        <UnitEditForm unit={unit} siteId={params.siteId} />
      </div>
    </div>
  );
}
```

Create `apps/web/src/app/sites/[siteId]/units/[unitId]/UnitEditForm.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Unit { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; }

const STATUSES = ['available', 'maintenance', 'out_of_service'];

export default function UnitEditForm({ unit, siteId }: { unit: Unit; siteId: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode: form.get('unitCode'),
          driveUp: form.get('driveUp') === 'on',
          status: form.get('status'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update unit');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete unit ${unit.unitCode}?`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/units/${unit.id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? 'Failed'); }
      router.push(`/sites/${siteId}/units`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
      setDeleteLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Unit code</label>
        <input name="unitCode" type="text" required defaultValue={unit.unitCode}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <select name="status" defaultValue={unit.status}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input name="driveUp" type="checkbox" id="driveUp" defaultChecked={unit.driveUp} className="rounded" />
        <label htmlFor="driveUp" className="text-sm text-slate-700">Drive-up access</label>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <a href={`/sites/${siteId}/units`} className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</a>
        </div>
        <button type="button" onClick={handleDelete} disabled={deleteLoading}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
          {deleteLoading ? 'Deleting…' : 'Delete unit'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Add unit endpoints to OrganisationController**

The existing `SiteInventoryController` handles unit operations under `operator/v1/...`. To keep units scoped to an org, add these endpoints to `OrganisationController`:

```typescript
  // ─── Units ───────────────────────────────────────────────────────────────────

  @Get('sites/:siteId/units')
  @ApiOperation({ summary: 'List units for a site' })
  listUnits(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.prisma.unit.findMany({
      where: { siteId, deletedAt: null },
      include: { unitType: true },
      orderBy: { unitCode: 'asc' },
    });
  }

  @Get('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Get a single unit' })
  getUnit(@Param('siteId') siteId: string, @Param('unitId') unitId: string) {
    return this.prisma.unit.findFirstOrThrow({
      where: { id: unitId, siteId, deletedAt: null },
      include: { unitType: true },
    });
  }
```

Wait — adding raw Prisma calls to the controller violates the service layer pattern. Instead, add `listUnits` and `getUnit` methods to the existing `SiteService` in `apps/api/src/modules/organisations/sites.service.ts`:

```typescript
  async listUnits(orgId: string, siteId: string) {
    await this.getSite(orgId, siteId); // verify org owns this site
    return this.prisma.unit.findMany({
      where: { siteId, deletedAt: null },
      include: { unitType: true },
      orderBy: { unitCode: 'asc' },
    });
  }

  async getUnit(orgId: string, siteId: string, unitId: string) {
    await this.getSite(orgId, siteId);
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, siteId, deletedAt: null },
      include: { unitType: true },
    });
    if (!unit) throw new NotFoundException('UNIT_NOT_FOUND');
    return unit;
  }

  async patchUnit(orgId: string, siteId: string, unitId: string, data: { unitCode?: string; driveUp?: boolean; status?: string }) {
    await this.getUnit(orgId, siteId, unitId);
    return this.prisma.unit.update({ where: { id: unitId }, data: data as any });
  }

  async softDeleteUnit(orgId: string, siteId: string, unitId: string) {
    await this.getUnit(orgId, siteId, unitId);
    await this.prisma.unit.update({ where: { id: unitId }, data: { deletedAt: new Date() } });
  }
```

Then add to `OrganisationController`:

```typescript
  @Get('sites/:siteId/units')
  @ApiOperation({ summary: 'List units for a site' })
  listUnits(@Param('organisationId') orgId: string, @Param('siteId') siteId: string) {
    return this.sites.listUnits(orgId, siteId);
  }

  @Get('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Get a single unit' })
  getUnit(@Param('organisationId') orgId: string, @Param('siteId') siteId: string, @Param('unitId') unitId: string) {
    return this.sites.getUnit(orgId, siteId, unitId);
  }

  @Patch('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Update a unit' })
  patchUnit(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Param('unitId') unitId: string,
    @Body() body: { unitCode?: string; driveUp?: boolean; status?: string },
  ) {
    return this.sites.patchUnit(orgId, siteId, unitId, body);
  }

  @Delete('sites/:siteId/units/:unitId')
  @ApiOperation({ summary: 'Soft-delete a unit' })
  deleteUnit(@Param('organisationId') orgId: string, @Param('siteId') siteId: string, @Param('unitId') unitId: string) {
    return this.sites.softDeleteUnit(orgId, siteId, unitId);
  }
```

- [ ] **Step 5: Create BFF API routes for units**

Create `apps/web/src/app/api/sites/[siteId]/units/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/units`,
    'POST',
    auth.token,
    body,
  );
}
```

Create `apps/web/src/app/api/sites/[siteId]/units/[unitId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { siteId: string; unitId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
    'PATCH',
    auth.token,
    body,
  );
}

export async function DELETE(_request: NextRequest, { params }: { params: { siteId: string; unitId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/units/${params.unitId}`,
    'DELETE',
    auth.token,
  );
}
```

- [ ] **Step 6: Build and verify**

```bash
cd apps/api && npx nest build 2>&1 | tail -3
```

Expected: No errors.

- [ ] **Step 7: Commit and push**

```bash
git add apps/web/src/app/sites/ apps/web/src/app/api/sites/ \
        apps/api/src/modules/organisations/sites.service.ts \
        apps/api/src/modules/organisations/organisations.controller.ts
git commit -m "feat(web): units management pages + API routes + SiteService unit methods"
git push
```

---

## Task 7: Unit Types and Pricing Pages (Frontend)

**Files:**
- Create: `apps/web/src/app/sites/[siteId]/unit-types/page.tsx`
- Create: `apps/web/src/app/sites/[siteId]/unit-types/new/page.tsx`
- Create: `apps/web/src/app/api/sites/[siteId]/unit-types/route.ts`
- Create: `apps/web/src/app/sites/[siteId]/pricing/page.tsx`
- Create: `apps/web/src/app/sites/[siteId]/pricing/PricingActions.tsx`
- Create: `apps/web/src/app/api/sites/[siteId]/price-books/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/rate-rules/route.ts`

- [ ] **Step 1: Unit types list page**

Create `apps/web/src/app/sites/[siteId]/unit-types/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[]; }

export default async function UnitTypesPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const unitTypes = await serverFetch<UnitType[]>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/sites/${params.siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Site</Link>
            <h1 className="text-2xl font-bold text-slate-900">Unit Types</h1>
          </div>
          {user.role === 'owner' && (
            <Link href={`/sites/${params.siteId}/unit-types/new`}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add type
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {unitTypes.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No unit types yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">Size (m²)</th>
                  <th className="text-left px-6 py-3">Door</th>
                  <th className="text-left px-6 py-3">Features</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {unitTypes.map((ut) => (
                  <tr key={ut.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{ut.name}</td>
                    <td className="px-6 py-4 text-slate-600">{ut.sizeSqm}</td>
                    <td className="px-6 py-4 text-slate-500">{ut.doorType ?? '—'}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{ut.features.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: New unit type form**

Create `apps/web/src/app/sites/[siteId]/unit-types/new/page.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';

export default function NewUnitTypePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const featuresRaw = (form.get('features') as string) ?? '';
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          sizeSqm: parseFloat(form.get('sizeSqm') as string),
          sizeCbm: form.get('sizeCbm') ? parseFloat(form.get('sizeCbm') as string) : undefined,
          doorType: form.get('doorType') || undefined,
          features: featuresRaw ? featuresRaw.split(',').map((f) => f.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.push(`/sites/${siteId}/unit-types`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href={`/sites/${siteId}/unit-types`} className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Unit Types</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Add unit type</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input name="name" type="text" required placeholder="Small 5m²"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Size (m²)</label>
              <input name="sizeSqm" type="number" step="0.1" min="0.1" required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Volume (m³) <span className="text-slate-400">optional</span></label>
              <input name="sizeCbm" type="number" step="0.1" min="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Door type <span className="text-slate-400">optional</span></label>
            <input name="doorType" type="text" placeholder="roller, swing, none"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Features <span className="text-slate-400">comma-separated</span></label>
            <input name="features" type="text" placeholder="climate_controlled, ground_floor"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Creating…' : 'Create unit type'}
            </button>
            <Link href={`/sites/${siteId}/unit-types`} className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Unit types BFF route**

Create `apps/web/src/app/api/sites/[siteId]/unit-types/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/unit-types`,
    'POST',
    auth.token,
    body,
  );
}
```

- [ ] **Step 4: Pricing page**

Create `apps/web/src/app/sites/[siteId]/pricing/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import PricingActions from './PricingActions';
import Link from 'next/link';

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface UnitType { id: string; name: string; }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-red-100 text-red-600',
};

export default async function PricingPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const [priceBooks, unitTypes] = await Promise.all([
    serverFetch<PriceBook[]>(`/v1/organisations/${user.organisationId}/sites/${params.siteId}/price-books`).catch(() => []),
    serverFetch<UnitType[]>(`/v1/organisations/${user.organisationId}/sites/${params.siteId}/unit-types`).catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href={`/sites/${params.siteId}`} className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Site</Link>
            <h1 className="text-2xl font-bold text-slate-900">Pricing</h1>
          </div>
          {user.role === 'owner' && (
            <PricingActions type="create-book" siteId={params.siteId} unitTypes={unitTypes} />
          )}
        </div>

        <div className="space-y-6">
          {priceBooks.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <p className="text-slate-500">No price books yet.</p>
            </div>
          )}
          {priceBooks.map((pb) => (
            <div key={pb.id} className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-slate-800">{pb.name}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[pb.status] ?? ''}`}>
                    {pb.status}
                  </span>
                  <span className="text-xs text-slate-400">from {new Date(pb.effectiveFrom).toLocaleDateString()}</span>
                </div>
                {user.role === 'owner' && pb.status !== 'archived' && (
                  <PricingActions
                    type="book-actions"
                    siteId={params.siteId}
                    priceBookId={pb.id}
                    bookStatus={pb.status}
                    unitTypes={unitTypes}
                  />
                )}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-6 py-2">Unit type</th>
                    <th className="text-left px-6 py-2">Price / month</th>
                    <th className="text-left px-6 py-2">Billing cycle</th>
                    {user.role === 'owner' && pb.status === 'draft' && <th className="px-6 py-2"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pb.rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-700">
                        {unitTypes.find((ut) => ut.id === rule.unitTypeId)?.name ?? rule.unitTypeId}
                      </td>
                      <td className="px-6 py-3 text-slate-900 font-medium">
                        €{(rule.amountMinor / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-slate-500 capitalize">{rule.billingCycle.replace('_', ' ')}</td>
                      {user.role === 'owner' && pb.status === 'draft' && (
                        <td className="px-6 py-3 text-right">
                          <PricingActions
                            type="remove-rule"
                            siteId={params.siteId}
                            priceBookId={pb.id}
                            rateRuleId={rule.id}
                            unitTypes={unitTypes}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                  {pb.rules.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-4 text-slate-400 text-center">No rate rules yet.</td></tr>
                  )}
                </tbody>
              </table>
              {user.role === 'owner' && pb.status === 'draft' && (
                <div className="px-6 py-4 border-t border-slate-100">
                  <PricingActions
                    type="add-rule"
                    siteId={params.siteId}
                    priceBookId={pb.id}
                    unitTypes={unitTypes}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: PricingActions client component**

Create `apps/web/src/app/sites/[siteId]/pricing/PricingActions.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface UnitType { id: string; name: string; }

interface Props {
  type: 'create-book' | 'book-actions' | 'add-rule' | 'remove-rule';
  siteId: string;
  priceBookId?: string;
  rateRuleId?: string;
  bookStatus?: string;
  unitTypes: UnitType[];
}

export default function PricingActions({ type, siteId, priceBookId, rateRuleId, bookStatus, unitTypes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function doAction(url: string, method: string, body?: object) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'create-book') {
    return showForm ? (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction(`/api/sites/${siteId}/price-books`, 'POST', {
          name: form.get('name'), effectiveFrom: form.get('effectiveFrom'),
        });
      }} className="flex gap-2 items-end">
        <input name="name" placeholder="Book name" required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40" />
        <input name="effectiveFrom" type="date" required
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
          {loading ? '…' : 'Create'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </form>
    ) : (
      <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
        + New price book
      </button>
    );
  }

  if (type === 'book-actions') {
    return (
      <div className="flex gap-2">
        {bookStatus === 'draft' && (
          <button onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/publish`, 'POST')}
            disabled={loading} className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50">
            {loading ? '…' : 'Publish'}
          </button>
        )}
        {bookStatus === 'published' && (
          <button onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/archive`, 'POST')}
            disabled={loading} className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50">
            {loading ? '…' : 'Archive'}
          </button>
        )}
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </div>
    );
  }

  if (type === 'remove-rule') {
    return (
      <button onClick={() => doAction(`/api/sites/${siteId}/price-books/${priceBookId}/rate-rules/${rateRuleId}`, 'DELETE')}
        disabled={loading} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : 'Remove'}
      </button>
    );
  }

  // add-rule
  return showForm ? (
    <form onSubmit={async (e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await doAction(`/api/sites/${siteId}/price-books/${priceBookId}/rate-rules`, 'POST', {
        unitTypeId: form.get('unitTypeId'),
        amountMinor: Math.round(parseFloat(form.get('amountEur') as string) * 100),
        billingCycle: form.get('billingCycle'),
      });
    }} className="flex gap-2 items-end flex-wrap">
      <select name="unitTypeId" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="">Unit type…</option>
        {unitTypes.map((ut) => <option key={ut.id} value={ut.id}>{ut.name}</option>)}
      </select>
      <input name="amountEur" type="number" step="0.01" min="0" placeholder="Price (€)" required
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28" />
      <select name="billingCycle" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
        <option value="monthly">Monthly</option>
        <option value="fixed_term">Fixed term</option>
      </select>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
        {loading ? '…' : 'Add rule'}
      </button>
      <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
      {error && <p className="text-red-600 text-xs w-full">{error}</p>}
    </form>
  ) : (
    <button onClick={() => setShowForm(true)} className="text-sm text-blue-600 hover:underline">+ Add rate rule</button>
  );
}
```

- [ ] **Step 6: Pricing BFF routes**

Create `apps/web/src/app/api/sites/[siteId]/price-books/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books`,
    'POST', auth.token, body,
  );
}
```

Create `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string; priceBookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const action = url.pathname.endsWith('/publish') ? 'publish' : 'archive';
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/${action}`,
    'POST', auth.token,
  );
}
```

Create `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/rate-rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest, { params }: { params: { siteId: string; priceBookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/rate-rules`,
    'POST', auth.token, body,
  );
}

export async function DELETE(request: NextRequest, { params }: { params: { siteId: string; priceBookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const segments = url.pathname.split('/');
  const rateRuleId = segments[segments.length - 1];
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/rate-rules/${rateRuleId}`,
    'DELETE', auth.token,
  );
}
```

- [ ] **Step 7: Commit and push**

```bash
git add apps/web/src/app/sites/ apps/web/src/app/api/sites/
git commit -m "feat(web): unit types + pricing management pages and API routes"
git push
```

---

## Task 8: Public Marketplace Pages

**Files:**
- Create: `apps/web/src/app/storage/page.tsx`
- Create: `apps/web/src/app/storage/[slug]/page.tsx`

These pages are public — they call the existing backend endpoints `GET /public/v1/sites` and `GET /public/v1/sites/:slug/availability` without a Bearer token.

- [ ] **Step 1: Create public storage search page**

Create `apps/web/src/app/storage/page.tsx`:

```tsx
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface SiteAddress { city: string; country: string; street: string; postalCode: string; }
interface Site { id: string; name: string; slug: string; address: SiteAddress; status: string; }

export default async function StoragePage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const sites = await serverFetch<Site[]>('/public/v1/sites').catch(() => []);
  const city = searchParams.city?.toLowerCase() ?? '';
  const filtered = city
    ? sites.filter((s) => s.address.city.toLowerCase().includes(city))
    : sites;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Find Storage</h1>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Sign in</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <form method="GET" className="mb-8">
          <div className="flex gap-2">
            <input
              name="city"
              type="text"
              defaultValue={searchParams.city}
              placeholder="Search by city…"
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-700">
              Search
            </button>
          </div>
        </form>

        {filtered.length === 0 ? (
          <p className="text-slate-500 text-center py-12">No storage sites found{city ? ` in "${city}"` : ''}.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((site) => (
              <Link key={site.id} href={`/storage/${site.slug}`}
                className="bg-white rounded-2xl shadow p-6 hover:shadow-md transition-shadow group">
                <h2 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600">{site.name}</h2>
                <p className="text-slate-500 text-sm">{site.address.street}</p>
                <p className="text-slate-500 text-sm">{site.address.postalCode} {site.address.city}</p>
                <p className="text-blue-600 text-sm mt-3 group-hover:underline">View availability →</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create site detail page**

Create `apps/web/src/app/storage/[slug]/page.tsx`:

```tsx
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface SiteAddress { street: string; city: string; postalCode: string; country: string; }
interface Site { id: string; name: string; slug: string; address: SiteAddress; }
interface AvailabilityItem {
  unitTypeId: string; unitTypeName: string; sizeSqm: number;
  availableCount: number; earliestAvailable: string | null;
}

export default async function StorageSiteDetailPage({ params }: { params: { slug: string } }) {
  const sites = await serverFetch<Site[]>('/public/v1/sites').catch(() => []);
  const site = sites.find((s) => s.slug === params.slug);
  if (!site) notFound();

  const availability = await serverFetch<AvailabilityItem[]>(
    `/public/v1/sites/${params.slug}/availability`,
  ).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/storage" className="text-sm text-slate-500 hover:text-slate-700 mb-2 block">&larr; All sites</Link>
          <h1 className="text-2xl font-bold text-slate-900">{site.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {site.address.street}, {site.address.postalCode} {site.address.city}
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Available storage</h2>

        {availability.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500">No units currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
            {availability.map((item) => (
              <div key={item.unitTypeId} className="bg-white rounded-2xl shadow p-6">
                <h3 className="font-semibold text-slate-900 mb-1">{item.unitTypeName}</h3>
                <p className="text-slate-500 text-sm mb-3">{item.sizeSqm} m²</p>
                <p className="text-slate-600 text-sm">
                  <strong>{item.availableCount}</strong> unit{item.availableCount !== 1 ? 's' : ''} available
                </p>
                {item.earliestAvailable && (
                  <p className="text-slate-400 text-xs mt-1">
                    Earliest: {new Date(item.earliestAvailable).toLocaleDateString()}
                  </p>
                )}
                <Link href={`/register`}
                  className="mt-4 block text-center bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700">
                  Reserve a unit
                </Link>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-slate-800 mb-3">Request a quote</h2>
          <p className="text-slate-500 text-sm mb-4">Have specific requirements? Send us a message.</p>
          <Link href={`/register`} className="text-blue-600 hover:underline text-sm">
            Create an account to get started →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add /storage to public paths in middleware**

Open `apps/web/src/middleware.ts` and add `/storage` to the `PUBLIC_PATHS` array:

```typescript
const PUBLIC_PATHS = ['/login', '/register', '/accept-invite', '/api/auth', '/storage'];
```

- [ ] **Step 4: Commit and push**

```bash
git add apps/web/src/app/storage/ apps/web/src/middleware.ts
git commit -m "feat(web): public marketplace search and site detail pages"
git push
```

---

## Task 9: Update Site Detail Page with Navigation Links

**Files:**
- Modify: `apps/web/src/app/sites/[siteId]/page.tsx`

- [ ] **Step 1: Read existing file**

Read `apps/web/src/app/sites/[siteId]/page.tsx` to see current content.

- [ ] **Step 2: Add navigation cards to site detail page**

After the site edit form, add quick nav links to Units, Unit Types, and Pricing pages. Replace the page to include:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import SiteEditForm from './SiteEditForm';
import Link from 'next/link';

interface Site {
  id: string; name: string; slug: string; status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string; currency: string;
}

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const site = await serverFetch<Site>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}`,
  );

  const navLinks = [
    { label: 'Units', href: `/sites/${params.siteId}/units`, desc: 'Manage individual storage units' },
    { label: 'Unit Types', href: `/sites/${params.siteId}/unit-types`, desc: 'Define sizes and features' },
    { label: 'Pricing', href: `/sites/${params.siteId}/pricing`, desc: 'Price books and rate rules' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">&larr; Sites</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">{site.name}</h1>

        <div className="grid grid-cols-3 gap-3 mb-8">
          {navLinks.map((link) => (
            <Link key={link.label} href={link.href}
              className="bg-white rounded-xl shadow p-4 hover:shadow-md transition-shadow group">
              <p className="font-semibold text-slate-800 group-hover:text-blue-600 text-sm">{link.label}</p>
              <p className="text-slate-400 text-xs mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>

        <SiteEditForm site={site} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit and push**

```bash
git add apps/web/src/app/sites/\[siteId\]/page.tsx
git commit -m "feat(web): add units/unit-types/pricing nav links to site detail page"
git push
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
cd apps/api
npx vitest run --no-coverage 2>&1 | tail -6
```

Expected: All tests pass (30+ test files, 100+ tests).

- [ ] **Step 2: Build verification**

```bash
npx nest build 2>&1 | tail -3
```

Expected: No errors.

- [ ] **Step 3: Final commit and push**

```bash
git add .
git commit -m "chore: Plan 3 complete — units, listings, marketplace"
git push
```

---

## Self-Review Checklist

After completing all tasks, verify:

**Backend endpoints:**
- [ ] `GET /v1/organisations/:orgId/sites/:siteId/unit-types` — list unit types
- [ ] `POST /v1/organisations/:orgId/sites/:siteId/unit-types` — create (owner only)
- [ ] `PATCH /v1/organisations/:orgId/sites/:siteId/unit-types/:id` — update (owner only)
- [ ] `DELETE /v1/organisations/:orgId/sites/:siteId/unit-types/:id` — delete (owner only)
- [ ] `GET /v1/organisations/:orgId/sites/:siteId/units` — list units
- [ ] `GET /v1/organisations/:orgId/sites/:siteId/units/:id` — single unit
- [ ] `PATCH /v1/organisations/:orgId/sites/:siteId/units/:id` — update unit
- [ ] `DELETE /v1/organisations/:orgId/sites/:siteId/units/:id` — soft-delete unit
- [ ] `GET /v1/organisations/:orgId/sites/:siteId/price-books` — list price books with rules
- [ ] `POST /v1/organisations/:orgId/sites/:siteId/price-books` — create (draft, owner only)
- [ ] `POST /v1/organisations/:orgId/sites/:siteId/price-books/:id/publish` — publish
- [ ] `POST /v1/organisations/:orgId/sites/:siteId/price-books/:id/archive` — archive
- [ ] `POST /v1/organisations/:orgId/sites/:siteId/price-books/:id/rate-rules` — add rule
- [ ] `DELETE /v1/organisations/:orgId/sites/:siteId/price-books/:id/rate-rules/:ruleId` — remove rule
- [ ] `GET /public/v1/sites` — public list (no auth)
- [ ] `GET /public/v1/sites/:slug/availability` — public availability (no auth)

**Frontend pages:**
- [ ] `/sites/[siteId]` — shows nav links to units/unit-types/pricing
- [ ] `/sites/[siteId]/units` — units table with status badges
- [ ] `/sites/[siteId]/units/new` — create unit form with unit type dropdown
- [ ] `/sites/[siteId]/units/[unitId]` — edit unit code, status, driveUp; delete button
- [ ] `/sites/[siteId]/unit-types` — unit types table
- [ ] `/sites/[siteId]/unit-types/new` — create unit type form
- [ ] `/sites/[siteId]/pricing` — price books with inline rate rule editor
- [ ] `/storage` — public marketplace with city filter
- [ ] `/storage/[slug]` — site detail with availability cards
- [ ] `/storage` accessible without login (in middleware PUBLIC_PATHS)
