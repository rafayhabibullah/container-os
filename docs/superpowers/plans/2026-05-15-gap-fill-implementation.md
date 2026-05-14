# Gap-Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the functional gaps between the current SiteLager implementation and the SITE_LAGER_MASTER_BUILD_SPEC v0.5.0.

**Architecture:** The plan is split into four independent subsystems — each produces working, testable software on its own. The backend listing layer must land before the public search and dashboard listing pages that consume it. The other subsystems (dashboard missing pages, public marketing pages, tenant portal) are independent of each other.

**Tech Stack:** Next.js 14 (App Router, Server Components), NestJS, Prisma, PostgreSQL, TypeScript, Tailwind CSS, shadcn/ui (`@sitelager/ui` Badge), `serverFetch`/`requireAuth` helpers from `@/lib`.

---

## Gap Inventory

The following gaps were identified by comparing the spec to the codebase:

| Gap | Spec Reference | Subsystem |
|---|---|---|
| No `Listing` model — units have no publishing layer | §29 | A |
| No listing management API (CRUD, publish, pause) | §29 | A |
| No public marketplace search endpoint with filters | §30 | A |
| No booking source tracking (marketplace vs manual) | §31 | A |
| Sidebar missing 6 nav items | §17.1 | B |
| No `/listings` dashboard page | §17.1, §29 | B |
| No `/bookings` dashboard page with approval workflow | §17.1, §31 | B |
| No `/payments` dashboard page | §17.1 | B |
| No `/inspections` dashboard page | §17.1 | B |
| No `/documents` dashboard page | §17.1 | B |
| No `/billing` (SaaS billing) dashboard page | §17.1, §4.2 | B |
| Homepage (`/`) redirects to login — no marketing page | §16.2 | C |
| `/storage` is a basic unfiltered list — no real search | §16.3 | C |
| No `/for-operators` SaaS landing page | §16.1 | C |
| No `/pricing` page | §16.1, §5.1 | C |
| No `/legal/privacy` or `/legal/terms` | §16.1 | C |
| Tenant portal missing Messages/Support section | §19 | D |
| Tenant portal missing Move-out Request section | §19 | D |
| Tenant portal missing Payment Methods section | §19 | D |

---

## Subsystem A — Backend Marketplace Listing Layer

### Task A1: Add `Listing` model to Prisma schema

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add enums and model to schema**

Append to `apps/api/prisma/schema.prisma` (before the closing of the file, after existing enums):

```prisma
enum ListingStatus {
  draft
  published
  paused
  fully_booked
  archived
}

enum BookingMode {
  approval_required
  instant_booking
  request_price
}

model Listing {
  id               String        @id @default(cuid())
  organisationId   String
  siteId           String
  unitId           String        @unique
  slug             String        @unique
  title            String
  description      String?
  publicPriceMinor Int?
  showPrice        Boolean       @default(true)
  depositMinor     Int?
  availableFrom    DateTime?
  bookingMode      BookingMode   @default(approval_required)
  status           ListingStatus @default(draft)
  requiredDocs     String[]
  seoTitle         String?
  seoDescription   String?
  commissionRateBp Int           @default(0)
  source           String        @default("manual")
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  organisation     Organisation  @relation(fields: [organisationId], references: [id])
  site             Site          @relation(fields: [siteId], references: [id])
  unit             Unit          @relation(fields: [unitId], references: [id])
}
```

Also add back-relations to existing models in the schema:

In `model Organisation`, add:
```prisma
  listings Listing[]
```

In `model Site`, add:
```prisma
  listings Listing[]
```

In `model Unit`, add:
```prisma
  listing Listing?
```

- [ ] **Step 2: Generate and run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_listing_model
```

Expected: migration file created, `Listing` table created in dev DB.

- [ ] **Step 3: Verify schema compiles**

```bash
npx prisma generate
```

Expected: `PrismaClient` generated without errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add Listing model with ListingStatus and BookingMode enums"
```

---

### Task A2: Listing service with CRUD and state transitions

**Files:**
- Create: `apps/api/src/modules/listings/listings.service.ts`
- Create: `apps/api/src/modules/listings/listings.module.ts`
- Create: `apps/api/src/modules/listings/dto/create-listing.dto.ts`
- Create: `apps/api/src/modules/listings/dto/update-listing.dto.ts`
- Create: `apps/api/src/modules/listings/listings.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/listings/listings.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { ListingsService } from './listings.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  listing: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('ListingsService', () => {
  let service: ListingsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ListingsService);
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    it('creates a draft listing scoped to the organisation', async () => {
      const dto = { unitId: 'unit-1', siteId: 'site-1', title: 'Big Box', bookingMode: 'approval_required' as const };
      mockPrisma.listing.create.mockResolvedValue({ id: 'list-1', status: 'draft', ...dto });
      const result = await service.createListing('org-1', dto);
      expect(mockPrisma.listing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organisationId: 'org-1', status: 'draft', source: 'manual' }),
        }),
      );
      expect(result.status).toBe('draft');
    });
  });

  describe('publishListing', () => {
    it('sets status to published when listing belongs to org', async () => {
      mockPrisma.listing.findFirst.mockResolvedValue({ id: 'list-1', organisationId: 'org-1', status: 'draft' });
      mockPrisma.listing.update.mockResolvedValue({ id: 'list-1', status: 'published' });
      const result = await service.publishListing('org-1', 'list-1');
      expect(result.status).toBe('published');
    });

    it('throws when listing does not belong to org', async () => {
      mockPrisma.listing.findFirst.mockResolvedValue(null);
      await expect(service.publishListing('org-1', 'other-list')).rejects.toThrow();
    });
  });

  describe('listListings', () => {
    it('returns only listings for the given organisation', async () => {
      mockPrisma.listing.findMany.mockResolvedValue([{ id: 'list-1', organisationId: 'org-1' }]);
      const result = await service.listListings('org-1');
      expect(mockPrisma.listing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ organisationId: 'org-1' }) }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd apps/api
npx jest src/modules/listings/listings.service.spec.ts --no-coverage
```

Expected: FAIL — `ListingsService` not found.

- [ ] **Step 3: Create DTOs**

Create `apps/api/src/modules/listings/dto/create-listing.dto.ts`:

```typescript
import { IsString, IsOptional, IsInt, IsBoolean, IsIn, IsArray } from 'class-validator';

export class CreateListingDto {
  @IsString() unitId: string;
  @IsString() siteId: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() publicPriceMinor?: number;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsInt() depositMinor?: number;
  @IsOptional() @IsString() availableFrom?: string;
  @IsIn(['approval_required', 'instant_booking', 'request_price'])
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  @IsOptional() @IsArray() requiredDocs?: string[];
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}
```

Create `apps/api/src/modules/listings/dto/update-listing.dto.ts`:

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateListingDto } from './create-listing.dto';
export class UpdateListingDto extends PartialType(CreateListingDto) {}
```

- [ ] **Step 4: Create the service**

Create `apps/api/src/modules/listings/listings.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  async createListing(organisationId: string, dto: CreateListingDto) {
    const base = slugify(dto.title);
    const slug = `${base}-${Date.now()}`;
    return this.prisma.listing.create({
      data: {
        organisationId,
        siteId: dto.siteId,
        unitId: dto.unitId,
        slug,
        title: dto.title,
        description: dto.description,
        publicPriceMinor: dto.publicPriceMinor,
        showPrice: dto.showPrice ?? true,
        depositMinor: dto.depositMinor,
        availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : null,
        bookingMode: dto.bookingMode,
        requiredDocs: dto.requiredDocs ?? [],
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        status: 'draft',
        source: 'manual',
        commissionRateBp: 0,
      },
    });
  }

  listListings(organisationId: string) {
    return this.prisma.listing.findMany({
      where: { organisationId },
      include: { site: { select: { name: true } }, unit: { select: { unitCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateListing(organisationId: string, listingId: string, dto: UpdateListingDto) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: dto as object });
  }

  async publishListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'published' } });
  }

  async pauseListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'paused' } });
  }

  async archiveListing(organisationId: string, listingId: string) {
    await this.assertOwnership(organisationId, listingId);
    return this.prisma.listing.update({ where: { id: listingId }, data: { status: 'archived' } });
  }

  private async assertOwnership(organisationId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id: listingId, organisationId } });
    if (!listing) throw new NotFoundException('Listing not found');
  }
}
```

- [ ] **Step 5: Create the module**

Create `apps/api/src/modules/listings/listings.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';

@Module({ providers: [ListingsService], exports: [ListingsService] })
export class ListingsModule {}
```

- [ ] **Step 6: Run tests — expect them to pass**

```bash
cd apps/api
npx jest src/modules/listings/listings.service.spec.ts --no-coverage
```

Expected: PASS — 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/listings/
git commit -m "feat(api): add ListingsService with CRUD and state transitions"
```

---

### Task A3: Listing controller and public search endpoint

**Files:**
- Create: `apps/api/src/modules/listings/listings.controller.ts`
- Modify: `apps/api/src/modules/organisations/organisations.controller.ts` (add listing routes)
- Modify: `apps/api/src/modules/site-inventory/site-inventory.controller.ts` (add public search)
- Modify: `apps/api/src/app.module.ts` (register ListingsModule)

- [ ] **Step 1: Create listings controller**

Create `apps/api/src/modules/listings/listings.controller.ts`:

```typescript
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

@ApiTags('listings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/listings')
export class ListingsController {
  constructor(private listings: ListingsService) {}

  @Get()
  list(@Param('organisationId') orgId: string) {
    return this.listings.listListings(orgId);
  }

  @Post()
  create(@Param('organisationId') orgId: string, @Body() dto: CreateListingDto) {
    return this.listings.createListing(orgId, dto);
  }

  @Patch(':listingId')
  update(
    @Param('organisationId') orgId: string,
    @Param('listingId') listingId: string,
    @Body() dto: UpdateListingDto,
  ) {
    return this.listings.updateListing(orgId, listingId, dto);
  }

  @Post(':listingId/publish')
  publish(@Param('organisationId') orgId: string, @Param('listingId') listingId: string) {
    return this.listings.publishListing(orgId, listingId);
  }

  @Post(':listingId/pause')
  pause(@Param('organisationId') orgId: string, @Param('listingId') listingId: string) {
    return this.listings.pauseListing(orgId, listingId);
  }

  @Post(':listingId/archive')
  archive(@Param('organisationId') orgId: string, @Param('listingId') listingId: string) {
    return this.listings.archiveListing(orgId, listingId);
  }
}
```

- [ ] **Step 2: Add public search endpoint to SiteInventoryController**

In `apps/api/src/modules/site-inventory/site-inventory.controller.ts`, inject `PrismaService` and add this method:

```typescript
// Add to imports at top:
import { Query } from '@nestjs/common';
// Inject in constructor: private prisma: PrismaService

@Get('public/v1/listings')
async searchListings(
  @Query('city') city?: string,
  @Query('country') country?: string,
  @Query('minSizeSqm') minSizeSqm?: string,
  @Query('maxSizeSqm') maxSizeSqm?: string,
  @Query('bookingMode') bookingMode?: string,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
) {
  return this.prisma.listing.findMany({
    where: {
      status: 'published',
      ...(bookingMode ? { bookingMode: bookingMode as 'approval_required' | 'instant_booking' | 'request_price' } : {}),
      site: {
        ...(city ? { address: { path: ['city'], string_contains: city } } : {}),
        ...(country ? { address: { path: ['country'], string_contains: country } } : {}),
      },
      ...(minSizeSqm || maxSizeSqm
        ? {
            unit: {
              unitType: {
                sizeSqm: {
                  ...(minSizeSqm ? { gte: parseFloat(minSizeSqm) } : {}),
                  ...(maxSizeSqm ? { lte: parseFloat(maxSizeSqm) } : {}),
                },
              },
            },
          }
        : {}),
    },
    include: {
      site: { select: { name: true, slug: true, address: true } },
      unit: { select: { unitCode: true, unitType: { select: { sizeSqm: true, name: true } } } },
    },
    take: limit ? parseInt(limit, 10) : 20,
    skip: offset ? parseInt(offset, 10) : 0,
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 3: Register ListingsModule in AppModule**

In `apps/api/src/app.module.ts`, add to the imports array:

```typescript
import { ListingsModule } from './modules/listings/listings.module';
// add to @Module imports: ListingsModule
```

Also add `ListingsController` to the `ListingsModule` controllers:

In `apps/api/src/modules/listings/listings.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
```

- [ ] **Step 4: Build the API to confirm no TypeScript errors**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/listings/ apps/api/src/modules/site-inventory/site-inventory.controller.ts apps/api/src/app.module.ts
git commit -m "feat(api): add listing controller and public search endpoint"
```

---

### Task A4: Booking source tracking in Reservation

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (add `source` field to `Reservation`)
- Modify: `apps/api/src/modules/reservations/reservations.service.ts` (accept source)

- [ ] **Step 1: Add `source` field to Reservation model**

In `apps/api/prisma/schema.prisma`, in the `Reservation` model add:

```prisma
  source     String @default("manual")
```

- [ ] **Step 2: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_reservation_source
```

Expected: migration created, column added.

- [ ] **Step 3: Pass source through when creating from checkout**

In `apps/api/src/modules/checkout/checkout.service.ts`, find the `createReservation` call and add `source: 'marketplace'` to the data payload. The exact location will be the `prisma.reservation.create` call.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/ apps/api/src/modules/checkout/checkout.service.ts
git commit -m "feat(db): track booking source (marketplace vs manual) on Reservation"
```

---

## Subsystem B — Dashboard Missing Pages

> All pages in this subsystem follow the Table Page Pattern from spec §14.6: page header with title + count + primary action, search toolbar, table card with `@sitelager/ui` `Badge`, pagination footer.

### Task B1: Update sidebar with all missing nav items

**Files:**
- Modify: `apps/web/src/components/sidebar.tsx`

- [ ] **Step 1: Write the updated NAV_ITEMS array**

Replace the `NAV_ITEMS` constant in `apps/web/src/components/sidebar.tsx`:

```typescript
import {
  LayoutGrid,
  Building2,
  FileText,
  Users,
  BarChart2,
  CalendarCheck,
  ClipboardList,
  AlertTriangle,
  BookOpen,
  Settings,
  Warehouse,
  Globe,
  CreditCard,
  ClipboardCheck,
  FolderOpen,
  Receipt,
  FileCheck,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sites', label: 'Sites', icon: Building2 },
  { href: '/listings', label: 'Listings', icon: Globe },
  { href: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { href: '/bookings', label: 'Bookings', icon: FileCheck },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/agreements', label: 'Agreements', icon: BookOpen },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/documents', label: 'Documents', icon: FolderOpen },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/billing', label: 'SiteLager Billing', icon: Receipt },
] as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/sidebar.tsx
git commit -m "feat(web): add all 6 missing nav items to sidebar per spec §17.1"
```

---

### Task B2: Marketplace Listings management page

**Files:**
- Create: `apps/web/src/app/(dashboard)/listings/page.tsx`
- Create: `apps/web/src/app/(dashboard)/listings/ListingActions.tsx`

- [ ] **Step 1: Create the client actions component**

Create `apps/web/src/app/(dashboard)/listings/ListingActions.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

interface Props {
  listingId: string;
  orgId: string;
  status: string;
}

export function ListingActions({ listingId, orgId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function transition(action: 'publish' | 'pause' | 'archive') {
    setLoading(true);
    await clientFetch(`/v1/organisations/${orgId}/listings/${listingId}/${action}`, { method: 'POST' });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      {status === 'draft' && (
        <button onClick={() => transition('publish')} disabled={loading}
          className="text-sm text-blue-600 font-medium hover:underline disabled:opacity-50">
          Publish
        </button>
      )}
      {status === 'published' && (
        <button onClick={() => transition('pause')} disabled={loading}
          className="text-sm text-amber-600 font-medium hover:underline disabled:opacity-50">
          Pause
        </button>
      )}
      {status !== 'archived' && (
        <button onClick={() => transition('archive')} disabled={loading}
          className="text-sm text-slate-400 font-medium hover:underline disabled:opacity-50">
          Archive
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the listings page**

Create `apps/web/src/app/(dashboard)/listings/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search, Plus } from 'lucide-react';
import { ListingActions } from './ListingActions';

interface ListingRow {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'paused' | 'fully_booked' | 'archived';
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  publicPriceMinor: number | null;
  showPrice: boolean;
  site: { name: string };
  unit: { unitCode: string };
  createdAt: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'default',
  published: 'success',
  paused: 'warning',
  fully_booked: 'outline',
  archived: 'outline',
};

const BOOKING_MODE_LABEL: Record<string, string> = {
  approval_required: 'Approval',
  instant_booking: 'Instant',
  request_price: 'Quote',
};

export default async function ListingsPage() {
  const user = await requireAuth();
  const listings = await serverFetch<ListingRow[]>(
    `/v1/organisations/${user.organisationId}/listings`,
  ).catch(() => [] as ListingRow[]);

  const active = listings.filter((l) => l.status !== 'archived');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Marketplace Listings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {active.length} listing{active.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New listing
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search listings…</span>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No listings yet. Create one to publish units to the marketplace.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Title', 'Site', 'Unit', 'Mode', 'Price', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listings.map((listing, i) => (
                <tr
                  key={listing.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{listing.title}</td>
                  <td className="px-4 py-3 text-slate-600">{listing.site.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{listing.unit.unitCode}</td>
                  <td className="px-4 py-3 text-slate-600">{BOOKING_MODE_LABEL[listing.bookingMode]}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {listing.showPrice && listing.publicPriceMinor != null
                      ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(listing.publicPriceMinor / 100)
                      : <span className="text-slate-400">Hidden</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[listing.status]}>{listing.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <ListingActions listingId={listing.id} orgId={user.organisationId} status={listing.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">{listings.length} listing{listings.length !== 1 ? 's' : ''} total</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/listings/"
git commit -m "feat(web): add marketplace listings management page"
```

---

### Task B3: Bookings approval dashboard page

**Files:**
- Create: `apps/web/src/app/(dashboard)/bookings/page.tsx`
- Create: `apps/web/src/app/(dashboard)/bookings/BookingActions.tsx`

The Bookings page shows all reservations that came from a booking request (marketplace or direct), and lets staff approve/reject them.

- [ ] **Step 1: Create the BookingActions client component**

Create `apps/web/src/app/(dashboard)/bookings/BookingActions.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

interface Props { reservationId: string; orgId: string; status: string; }

export function BookingActions({ reservationId, orgId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: 'approve' | 'reject') {
    setLoading(true);
    await clientFetch(
      `/v1/organisations/${orgId}/reservations/${reservationId}/${action}`,
      { method: 'POST' },
    );
    router.refresh();
    setLoading(false);
  }

  if (status !== 'pending') return <span className="text-slate-400 text-xs">{status}</span>;

  return (
    <div className="flex gap-3">
      <button onClick={() => act('approve')} disabled={loading}
        className="text-sm text-green-600 font-semibold hover:underline disabled:opacity-50">
        Approve
      </button>
      <button onClick={() => act('reject')} disabled={loading}
        className="text-sm text-red-500 font-medium hover:underline disabled:opacity-50">
        Reject
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create the bookings page**

Create `apps/web/src/app/(dashboard)/bookings/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';
import { BookingActions } from './BookingActions';

interface BookingRow {
  id: string;
  status: string;
  source: string;
  startDate: string;
  expiresAt: string;
  createdAt: string;
  customerId: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'warning',
  pending_signature: 'default',
  confirmed: 'success',
  expired: 'outline',
  cancelled: 'destructive',
  converted: 'success',
};

export default async function BookingsPage() {
  const user = await requireAuth();
  const bookings = await serverFetch<BookingRow[]>(
    `/v1/organisations/${user.organisationId}/reservations`,
  ).catch(() => [] as BookingRow[]);

  const pending = bookings.filter((b) => b.status === 'pending').length;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bookings</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {bookings.length} total · {pending} pending approval
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search bookings…</span>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No bookings yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Booking ID', 'Source', 'Move-in', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking, i) => (
                <tr key={booking.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{booking.id.slice(0, 12)}…</td>
                  <td className="px-4 py-3">
                    <Badge variant={booking.source === 'marketplace' ? 'success' : 'default'}>
                      {booking.source}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(booking.startDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[booking.status] ?? 'default'}>{booking.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <BookingActions reservationId={booking.id} orgId={user.organisationId} status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/bookings/"
git commit -m "feat(web): add bookings page with approval workflow UI"
```

---

### Task B4: Payments dashboard page

**Files:**
- Create: `apps/web/src/app/(dashboard)/payments/page.tsx`

- [ ] **Step 1: Create the payments page**

Create `apps/web/src/app/(dashboard)/payments/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface PaymentRow {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  method: string;
  amountMinor: number;
  reference: string;
  createdAt: string;
  invoice: { id: string; currency: string };
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'warning',
  succeeded: 'success',
  failed: 'destructive',
  refunded: 'outline',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
}

export default async function PaymentsPage() {
  const user = await requireAuth();
  const payments = await serverFetch<PaymentRow[]>(
    `/v1/organisations/${user.organisationId}/payments`,
  ).catch(() => [] as PaymentRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payments</h1>
          <p className="text-sm text-slate-400 mt-0.5">{payments.length} record{payments.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search payments…</span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Reference', 'Method', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr key={p.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.reference}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{p.method.replace('_', ' ')}</td>
                  <td className="px-4 py-3 font-medium text-slate-900 tabular-nums">
                    {formatMinor(p.amountMinor, p.invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(p.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add payments list endpoint to billing controller**

In `apps/api/src/modules/billing/billing-org.controller.ts`, add:

```typescript
@Get('payments')
async listPayments(@Param('organisationId') orgId: string) {
  return this.prisma.payment.findMany({
    where: { invoice: { agreement: { siteId: { in: await this.siteIdsForOrg(orgId) } } } },
    include: { invoice: { select: { id: true, currency: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}

private async siteIdsForOrg(orgId: string): Promise<string[]> {
  const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
  return sites.map((s) => s.id);
}
```

Make sure `PrismaService` is injected in `BillingOrgController`.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/payments/" apps/api/src/modules/billing/billing-org.controller.ts
git commit -m "feat(web+api): add payments dashboard page and list endpoint"
```

---

### Task B5: Inspections dashboard page

**Files:**
- Create: `apps/web/src/app/(dashboard)/inspections/page.tsx`

- [ ] **Step 1: Create inspections page**

Create `apps/web/src/app/(dashboard)/inspections/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search, Plus } from 'lucide-react';

interface InspectionRow {
  id: string;
  unitId: string;
  kind: string;
  result: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default async function InspectionsPage() {
  const user = await requireAuth();
  const inspections = await serverFetch<InspectionRow[]>(
    `/v1/organisations/${user.organisationId}/inspections`,
  ).catch(() => [] as InspectionRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inspections</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {inspections.length} inspection{inspections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New inspection
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search inspections…</span>
        </div>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No inspections recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Unit', 'Kind', 'Result', 'Completed', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inspections.map((insp, i) => (
                <tr key={insp.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{insp.unitId.slice(0, 12)}…</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{insp.kind}</td>
                  <td className="px-4 py-3">
                    {insp.result
                      ? <Badge variant={insp.result === 'pass' ? 'success' : 'destructive'}>{insp.result}</Badge>
                      : <Badge variant="default">In progress</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {insp.completedAt ? new Date(insp.completedAt).toLocaleDateString('de-DE') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(insp.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add inspections list endpoint**

In `apps/api/src/modules/operations/org-operations.controller.ts`, add a `GET inspections` endpoint that queries `InspectionRun` scoped by org sites. The pattern matches existing endpoints in that controller.

```typescript
@Get('inspections')
async listInspections(@Param('organisationId') orgId: string) {
  const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
  const siteIds = sites.map((s) => s.id);
  const units = await this.prisma.unit.findMany({ where: { siteId: { in: siteIds } }, select: { id: true } });
  const unitIds = units.map((u) => u.id);
  return this.prisma.inspectionRun.findMany({
    where: { unitId: { in: unitIds } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/inspections/" apps/api/src/modules/operations/org-operations.controller.ts
git commit -m "feat(web+api): add inspections dashboard page and list endpoint"
```

---

### Task B6: Documents dashboard page

**Files:**
- Create: `apps/web/src/app/(dashboard)/documents/page.tsx`

- [ ] **Step 1: Create documents page**

Create `apps/web/src/app/(dashboard)/documents/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface DocumentRow {
  id: string;
  kind: string;
  subjectType: string;
  subjectId: string;
  locale: string | null;
  createdAt: string;
}

const KIND_VARIANT: Record<string, 'default' | 'success' | 'outline'> = {
  contract: 'success',
  invoice: 'default',
  id_document: 'outline',
};

export default async function DocumentsPage() {
  const user = await requireAuth();
  const documents = await serverFetch<DocumentRow[]>(
    `/v1/organisations/${user.organisationId}/documents`,
  ).catch(() => [] as DocumentRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-400 mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search documents…</span>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No documents stored yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Kind', 'Subject', 'Locale', 'Date'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => (
                <tr key={doc.id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <td className="px-4 py-3">
                    <Badge variant={KIND_VARIANT[doc.kind] ?? 'default'}>{doc.kind}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{doc.subjectType}</td>
                  <td className="px-4 py-3 text-slate-500">{doc.locale ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(doc.createdAt).toLocaleDateString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add documents list endpoint**

In `apps/api/src/modules/documents/documents.controller.ts`, add a GET route scoped by org. Documents are associated with agreements and customers; filter by `subjectType: 'agreement'` where agreement belongs to the org's sites.

```typescript
@Get('v1/organisations/:organisationId/documents')
@UseGuards(JwtAuthGuard, OrganisationGuard)
async listOrgDocuments(@Param('organisationId') orgId: string) {
  const sites = await this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true } });
  const siteIds = sites.map((s) => s.id);
  return this.prisma.document.findMany({
    where: { OR: [{ subjectType: 'agreement', subjectId: { in: siteIds } }, { subjectType: 'site', subjectId: { in: siteIds } }] },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/documents/" apps/api/src/modules/documents/documents.controller.ts
git commit -m "feat(web+api): add documents dashboard page and list endpoint"
```

---

### Task B7: SiteLager Billing (SaaS) page

**Files:**
- Create: `apps/web/src/app/(dashboard)/billing/page.tsx`

This page shows the organisation's current SaaS plan, usage, and a static upgrade CTA. No Mollie Connect integration yet — that's a later phase.

- [ ] **Step 1: Create billing page**

Create `apps/web/src/app/(dashboard)/billing/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';

interface OrgProfile {
  id: string;
  legalName: string;
  plan: 'starter' | 'growth' | 'pro';
}

const PLAN_DETAILS: Record<string, { label: string; price: string; sites: number; units: number }> = {
  starter: { label: 'Starter', price: '€49/mo', sites: 1, units: 50 },
  growth: { label: 'Growth', price: '€99/mo', sites: 2, units: 150 },
  pro: { label: 'Pro', price: '€199/mo', sites: 5, units: 500 },
};

export default async function BillingPage() {
  const user = await requireAuth();
  const org = await serverFetch<OrgProfile>(`/v1/organisations/${user.organisationId}`).catch(() => null);

  const plan = org?.plan ?? 'starter';
  const details = PLAN_DETAILS[plan];

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">SiteLager Billing</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage your SiteLager subscription</p>
      </div>

      {/* Current plan card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Current plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{details.label}</h2>
              <Badge variant="success">Active</Badge>
            </div>
            <p className="text-slate-500 mt-1">{details.price}</p>
          </div>
          <button className="text-sm text-blue-600 font-semibold border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-50">
            Upgrade plan
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Sites included</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{details.sites}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Units included</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{details.units}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Marketplace commission</p>
            <p className="text-lg font-bold text-green-600 mt-1">0%</p>
          </div>
        </div>
      </div>

      {/* Plan comparison */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-900 text-sm">Available plans</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {Object.entries(PLAN_DETAILS).map(([key, p]) => (
            <div key={key} className={`px-6 py-4 flex items-center justify-between ${key === plan ? 'bg-blue-50' : ''}`}>
              <div>
                <span className="font-semibold text-slate-900">{p.label}</span>
                <span className="text-slate-500 text-sm ml-3">{p.sites} site{p.sites > 1 ? 's' : ''} · {p.units} units</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">{p.price}</span>
                {key === plan
                  ? <Badge variant="success">Current</Badge>
                  : <button className="text-sm text-blue-600 font-medium hover:underline">Switch</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/billing/"
git commit -m "feat(web): add SaaS billing page showing current plan and upgrade options"
```

---

## Subsystem C — Public Marketplace Frontend

### Task C1: Marketing homepage

**Files:**
- Modify: `apps/web/src/app/page.tsx`

The homepage currently redirects to `/login`. Replace it with a real marketing page per spec §16.2.

- [ ] **Step 1: Replace the homepage**

Overwrite `apps/web/src/app/page.tsx`:

```typescript
import Link from 'next/link';
import { Search, MapPin, Zap, Shield } from 'lucide-react';

const POPULAR_CITIES = [
  { name: 'Berlin', country: 'Germany' },
  { name: 'Hamburg', country: 'Germany' },
  { name: 'Munich', country: 'Germany' },
  { name: 'Cologne', country: 'Germany' },
  { name: 'Frankfurt', country: 'Germany' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Search', desc: 'Find storage near you by city, size, and price.' },
  { step: '2', title: 'Choose', desc: 'Compare units from multiple operators side by side.' },
  { step: '3', title: 'Book', desc: 'Request a booking or book instantly — online in minutes.' },
  { step: '4', title: 'Move in', desc: 'Receive your access details and move in on your chosen date.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900">SiteLager</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/storage" className="text-slate-600 hover:text-slate-900">Find storage</Link>
            <Link href="/for-operators" className="text-slate-600 hover:text-slate-900">For operators</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-slate-900">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">
            Find storage and container space near you
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            Search, compare, and book self-storage across Europe — from local operators with real reviews.
          </p>
          <div className="flex gap-2 max-w-xl mx-auto">
            <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="City or postal code…"
                className="flex-1 text-sm outline-none placeholder-slate-400"
              />
            </div>
            <Link href="/storage"
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 flex items-center gap-2 whitespace-nowrap">
              <Search className="w-4 h-4" /> Search
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            <Link href="/for-operators" className="hover:underline">List your storage site →</Link>
          </p>
        </div>
      </section>

      {/* Popular cities */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">Popular locations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {POPULAR_CITIES.map((city) => (
              <Link key={city.name}
                href={`/storage?city=${city.name.toLowerCase()}`}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                <p className="font-semibold text-slate-900 group-hover:text-blue-600">{city.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{city.country}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-10 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-3 text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For operators CTA */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto bg-blue-600 rounded-2xl p-10 text-center text-white">
          <div className="flex justify-center gap-4 mb-4">
            <Zap className="w-6 h-6 opacity-80" />
            <Shield className="w-6 h-6 opacity-80" />
          </div>
          <h2 className="text-2xl font-bold mb-3">The operating system for modern storage sites.</h2>
          <p className="text-blue-100 mb-6 text-sm max-w-lg mx-auto">
            Manage sites, tenants, contracts, invoices, and payments from one platform.
            Publish to the marketplace with 0% commission during launch.
          </p>
          <Link href="/for-operators"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">
            Explore for operators →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-slate-900">SiteLager</span>
          </div>
          <div className="flex gap-6">
            <Link href="/for-operators" className="hover:text-slate-700">For operators</Link>
            <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
            <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): replace redirect-to-login homepage with real marketing page"
```

---

### Task C2: For-operators SaaS landing page

**Files:**
- Create: `apps/web/src/app/for-operators/page.tsx`

- [ ] **Step 1: Create the for-operators page**

Create `apps/web/src/app/for-operators/page.tsx`:

```typescript
import Link from 'next/link';
import { BarChart2, FileText, Users, Globe, Zap, Shield } from 'lucide-react';

const FEATURES = [
  { icon: Globe, title: 'Marketplace listing', desc: 'Publish your units to the SiteLager marketplace at 0% commission during launch.' },
  { icon: Users, title: 'Tenant management', desc: 'Full CRM for tenants — contracts, invoices, documents, and communication.' },
  { icon: FileText, title: 'Automated billing', desc: 'Monthly recurring invoices, SEPA mandates, dunning reminders, and lockout workflows.' },
  { icon: BarChart2, title: 'Reporting', desc: 'Occupancy rates, revenue tracking, and unit availability at a glance.' },
  { icon: Zap, title: 'Instant booking', desc: 'Let tenants book instantly online — or require manual approval for full control.' },
  { icon: Shield, title: 'Access control', desc: 'Issue and revoke access credentials per tenant, integrated with hardware vendors.' },
];

export default function ForOperatorsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900">SiteLager</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            The operating system for modern storage sites.
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            Everything you need to run your storage business — sites, tenants, contracts, invoices, payments, and marketplace listings — in one platform built for European operators.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register"
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">
              Get started free
            </Link>
            <Link href="/pricing"
              className="border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl hover:bg-slate-50">
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Everything in one place</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <f.icon className="w-6 h-6 text-blue-600 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-blue-600 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to modernise your storage operation?</h2>
        <p className="text-blue-100 mb-6 text-sm">No setup fees. Start with our Starter plan at €49/month.</p>
        <Link href="/register"
          className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">
          Create your account →
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-between text-sm text-slate-400">
          <Link href="/" className="font-semibold text-slate-900">← SiteLager</Link>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-slate-700">Pricing</Link>
            <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/for-operators/
git commit -m "feat(web): add for-operators SaaS landing page"
```

---

### Task C3: Pricing page

**Files:**
- Create: `apps/web/src/app/pricing/page.tsx`

- [ ] **Step 1: Create the pricing page**

Create `apps/web/src/app/pricing/page.tsx`:

```typescript
import Link from 'next/link';

const PLANS = [
  {
    name: 'Starter',
    price: '€49',
    period: '/month',
    tagline: 'For small operators',
    features: ['1 site', 'Up to 50 units', 'Marketplace listing', 'Basic invoices & contracts', 'Email notifications'],
    extraUnits: '€0.50/extra unit',
    cta: 'Get started',
  },
  {
    name: 'Growth',
    price: '€99',
    period: '/month',
    tagline: 'For active operators',
    features: ['2 sites', 'Up to 150 units', 'Instant booking', 'Recurring billing + dunning', 'Manager & operator roles', 'Reporting & tenant portal'],
    extraUnits: '€0.40/extra unit',
    cta: 'Start with Growth',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '€199',
    period: '/month',
    tagline: 'For multi-site operators',
    features: ['5 sites', 'Up to 500 units', 'Advanced reports', 'Multi-language contracts', 'API & webhooks', 'Priority support'],
    extraUnits: '€0.30/extra unit',
    cta: 'Contact us',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900">SiteLager</span>
          </Link>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16 px-6 bg-slate-50 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-slate-500">
            All plans include marketplace listing at <strong className="text-green-600">0% commission</strong> during launch.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl border p-8 flex flex-col ${plan.highlight ? 'border-blue-500 bg-blue-50 shadow-lg' : 'border-slate-200 bg-white'}`}>
              {plan.highlight && (
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Most popular</div>
              )}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="text-sm text-slate-500 mb-4">{plan.tagline}</p>
              <div className="mb-6">
                <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                <span className="text-slate-400 text-sm">{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="text-green-500 mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mb-4">{plan.extraUnits}/month</p>
              <Link href="/register"
                className={`block text-center font-semibold py-3 rounded-xl ${plan.highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-10 px-6 text-center text-sm text-slate-400">
        <Link href="/legal/terms" className="hover:text-slate-700 mr-4">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-slate-700">Privacy</Link>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/pricing/
git commit -m "feat(web): add pricing page with three-tier plan comparison"
```

---

### Task C4: Legal pages (Privacy + Terms)

**Files:**
- Create: `apps/web/src/app/legal/privacy/page.tsx`
- Create: `apps/web/src/app/legal/terms/page.tsx`

- [ ] **Step 1: Create legal page layout shell**

Create `apps/web/src/app/legal/privacy/page.tsx`:

```typescript
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-bold text-slate-900">SiteLager</Link>
          <Link href="/legal/terms" className="text-sm text-slate-500 hover:text-slate-700">Terms of Service</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: May 2026</p>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Who we are</h2>
            <p>SiteLager is a SaaS platform and marketplace for storage operators and tenants, operated from the European Union. This privacy policy explains how we collect, use, and protect your personal data in accordance with the GDPR.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Data we collect</h2>
            <p>We collect data you provide directly (name, email, address, payment details), data generated by your use of our service (activity logs, invoices, access events), and technical data (IP address, browser type, session data).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Legal basis for processing</h2>
            <p>We process your data on the basis of contract performance, legitimate interests, and — where required — explicit consent. You may withdraw consent at any time.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Your rights</h2>
            <p>Under GDPR you have the right to access, rectify, erase, restrict, and port your data. Contact us at privacy@sitelager.com to exercise your rights.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Retention</h2>
            <p>We retain personal data for as long as necessary to fulfil the purposes for which it was collected, or as required by law (e.g. invoice data for 10 years under German tax law).</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Contact</h2>
            <p>For privacy enquiries contact: <a href="mailto:privacy@sitelager.com" className="text-blue-600 hover:underline">privacy@sitelager.com</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
```

Create `apps/web/src/app/legal/terms/page.tsx`:

```typescript
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <Link href="/" className="font-bold text-slate-900">SiteLager</Link>
          <Link href="/legal/privacy" className="text-sm text-slate-500 hover:text-slate-700">Privacy Policy</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: May 2026</p>
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of terms</h2>
            <p>By creating a SiteLager account or using the marketplace as a visitor, you agree to these Terms of Service. If you are using SiteLager on behalf of a business, you represent that you have authority to bind that business to these terms.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Service description</h2>
            <p>SiteLager provides a SaaS platform for storage operators ("Organisations") to manage sites, units, tenants, and billing, and a public marketplace where tenants can discover and book storage units.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Organisation responsibilities</h2>
            <p>Organisations are responsible for the accuracy of their listings, compliance with local law, and honoring bookings made through the marketplace. SiteLager is a platform and not a party to the storage rental contract between Organisation and Tenant.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Marketplace commission</h2>
            <p>At launch, marketplace commission is 0%. Future commission rates will be communicated to Organisations at least 30 days in advance.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Payments</h2>
            <p>SaaS subscription fees are billed monthly in advance. Failure to pay may result in account suspension. Tenant payments pass through the Organisation's connected payment account.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Governing law</h2>
            <p>These terms are governed by the laws of the European Union and the country in which SiteLager's operating entity is registered. Disputes will be resolved in the competent courts of that jurisdiction.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/legal/
git commit -m "feat(web): add Privacy Policy and Terms of Service pages"
```

---

### Task C5: Improve public marketplace search with filters

**Files:**
- Modify: `apps/web/src/app/storage/page.tsx`

Replace the basic city-text-filter with real query params that call the new `GET /public/v1/listings` endpoint.

- [ ] **Step 1: Rewrite the storage search page**

Overwrite `apps/web/src/app/storage/page.tsx`:

```typescript
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';

interface ListingSearchResult {
  id: string;
  title: string;
  slug: string;
  status: string;
  bookingMode: string;
  publicPriceMinor: number | null;
  showPrice: boolean;
  site: { name: string; slug: string; address: { city: string; country: string } };
  unit: { unitType: { sizeSqm: number; name: string } };
}

const BOOKING_MODE_LABEL: Record<string, string> = {
  approval_required: 'Approval required',
  instant_booking: 'Instant booking',
  request_price: 'Request price',
};

export default async function StoragePage({
  searchParams,
}: {
  searchParams: { city?: string; country?: string; minSize?: string; maxSize?: string; mode?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.city) params.set('city', searchParams.city);
  if (searchParams.country) params.set('country', searchParams.country);
  if (searchParams.minSize) params.set('minSizeSqm', searchParams.minSize);
  if (searchParams.maxSize) params.set('maxSizeSqm', searchParams.maxSize);
  if (searchParams.mode) params.set('bookingMode', searchParams.mode);
  params.set('limit', '40');

  const listings = await serverFetch<ListingSearchResult[]>(
    `/public/v1/listings?${params.toString()}`,
  ).catch(() => [] as ListingSearchResult[]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">SiteLager</span>
          </Link>
          <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Sign in</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search bar */}
        <form method="GET" className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">City</label>
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input name="city" type="text" defaultValue={searchParams.city}
                placeholder="Berlin, Hamburg…"
                className="text-sm outline-none flex-1 placeholder-slate-400" />
            </div>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">Min size (m²)</label>
            <input name="minSize" type="number" defaultValue={searchParams.minSize}
              placeholder="0"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">Max size (m²)</label>
            <input name="maxSize" type="number" defaultValue={searchParams.maxSize}
              placeholder="Any"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs text-slate-500 font-medium mb-1">Booking type</label>
            <select name="mode" defaultValue={searchParams.mode}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
              <option value="">Any</option>
              <option value="instant_booking">Instant booking</option>
              <option value="approval_required">Approval required</option>
            </select>
          </div>
          <button type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </form>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-slate-900">
            {listings.length} storage unit{listings.length !== 1 ? 's' : ''}
            {searchParams.city ? ` in ${searchParams.city}` : ' available'}
          </h1>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-slate-500">No storage units found. Try adjusting your filters.</p>
            <Link href="/storage" className="mt-4 inline-block text-sm text-blue-600 hover:underline">Clear filters</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => (
              <Link key={listing.id}
                href={`/storage/${listing.site.slug}`}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-slate-900 group-hover:text-blue-600 text-sm leading-tight">{listing.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{listing.site.address.city}</p>
                  </div>
                  {listing.bookingMode === 'instant_booking' && (
                    <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full shrink-0">Instant</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{listing.unit.unitType.sizeSqm} m² · {listing.unit.unitType.name}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {listing.showPrice && listing.publicPriceMinor != null ? (
                      <span className="font-bold text-slate-900">
                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(listing.publicPriceMinor / 100)}
                        <span className="text-xs font-normal text-slate-400">/mo</span>
                      </span>
                    ) : (
                      <span className="text-sm text-slate-400">Price on request</span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 font-medium group-hover:underline">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/storage/page.tsx
git commit -m "feat(web): upgrade marketplace search with size/city/booking-mode filters"
```

---

## Subsystem D — Tenant Portal Completion

### Task D1: Payment Methods section in tenant portal

**Files:**
- Create: `apps/web/src/app/(dashboard)/my-storage/payment-methods/page.tsx`

- [ ] **Step 1: Create payment methods page**

Create `apps/web/src/app/(dashboard)/my-storage/payment-methods/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { Badge } from '@sitelager/ui';

interface Mandate {
  id: string;
  scheme: string;
  status: string;
  ibanLast4: string | null;
  signedAt: string | null;
}

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'destructive' | 'outline'> = {
  pending: 'default',
  active: 'success',
  cancelled: 'destructive',
  revoked: 'outline',
};

export default async function PaymentMethodsPage() {
  const user = await requireAuth();
  const mandates = await serverFetch<Mandate[]>(
    `/v1/tenant-portal/mandates`,
  ).catch(() => [] as Mandate[]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Payment Methods</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your registered SEPA direct debit mandates</p>
      </div>

      {mandates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-500">No payment methods registered.</p>
          <p className="text-xs text-slate-400 mt-2">Your operator will set up a payment mandate when you sign your contract.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {mandates.map((mandate, i) => (
            <div key={mandate.id}
              className={`flex items-center justify-between px-5 py-4 ${i < mandates.length - 1 ? 'border-b border-slate-100' : ''}`}>
              <div>
                <p className="font-medium text-slate-900 capitalize">
                  {mandate.scheme.replace(/_/g, ' ')}
                  {mandate.ibanLast4 && <span className="text-slate-400 font-normal ml-2">···· {mandate.ibanLast4}</span>}
                </p>
                {mandate.signedAt && (
                  <p className="text-xs text-slate-400 mt-0.5">Signed {new Date(mandate.signedAt).toLocaleDateString('de-DE')}</p>
                )}
              </div>
              <Badge variant={STATUS_VARIANT[mandate.status] ?? 'default'}>{mandate.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the mandate endpoint to tenant portal controller**

In `apps/api/src/modules/tenant-portal/tenant-portal.controller.ts`, verify or add:

```typescript
@Get('mandates')
@UseGuards(JwtAuthGuard)
getMandates(@CurrentUser() user: AuthenticatedUser) {
  return this.tenantPortal.getMandatesForUser(user.id);
}
```

In the `TenantPortalService`, implement `getMandatesForUser` to query mandates by `customerId` where the customer matches the user's tenant profile.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/my-storage/payment-methods/" apps/api/src/modules/tenant-portal/
git commit -m "feat(web+api): add payment methods page to tenant portal"
```

---

### Task D2: Move-out request section in tenant portal

**Files:**
- Create: `apps/web/src/app/(dashboard)/my-storage/move-out/page.tsx`

- [ ] **Step 1: Create move-out page**

Create `apps/web/src/app/(dashboard)/my-storage/move-out/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { clientFetch } from '@/lib/client-api';

export default function MoveOutPage() {
  const [agreementId, setAgreementId] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await clientFetch('/v1/tenant-portal/move-out-requests', {
        method: 'POST',
        body: JSON.stringify({ agreementId, requestedDate }),
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit move-out request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-lg">✓</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Move-out request submitted</h2>
          <p className="text-sm text-slate-500">Your operator will review your request and confirm the move-out date.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Request move-out</h1>
        <p className="text-sm text-slate-400 mt-0.5">Submit a move-out request to end your rental agreement</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Agreement ID</label>
            <input
              type="text"
              value={agreementId}
              onChange={(e) => setAgreementId(e.target.value)}
              placeholder="Your agreement ID from your contract"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Requested move-out date</label>
            <input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-slate-400 mt-1">Check your agreement for minimum notice period requirements.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Submitting…' : 'Submit move-out request'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add move-out endpoint in tenant portal controller**

In `apps/api/src/modules/tenant-portal/tenant-portal.controller.ts`, add:

```typescript
@Post('move-out-requests')
@UseGuards(JwtAuthGuard)
createMoveOutRequest(
  @Body() body: { agreementId: string; requestedDate: string },
  @CurrentUser() user: AuthenticatedUser,
) {
  return this.tenantPortal.createMoveOutRequest(user.id, body.agreementId, new Date(body.requestedDate));
}
```

In `TenantPortalService`, implement `createMoveOutRequest` to create a `TerminationRequest` record (model already in schema) scoped to the user's tenant profile.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/my-storage/move-out/" apps/api/src/modules/tenant-portal/
git commit -m "feat(web+api): add move-out request page and endpoint to tenant portal"
```

---

### Task D3: Update my-storage navigation with new sections

**Files:**
- Modify: `apps/web/src/app/(dashboard)/my-storage/page.tsx`

The tenant portal dashboard page should link to the new Payment Methods and Move-out sections.

- [ ] **Step 1: Add links to the tenant dashboard quick-nav**

In `apps/web/src/app/(dashboard)/my-storage/page.tsx`, find the navigation or link cards section and add:

```typescript
<Link href="/my-storage/payment-methods"
  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all">
  <h3 className="font-semibold text-slate-900 text-sm">Payment Methods</h3>
  <p className="text-xs text-slate-400 mt-1">Manage your SEPA mandates</p>
</Link>

<Link href="/my-storage/move-out"
  className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all">
  <h3 className="font-semibold text-slate-900 text-sm">Request Move-out</h3>
  <p className="text-xs text-slate-400 mt-1">End your rental agreement</p>
</Link>
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/my-storage/"
git commit -m "feat(web): add payment methods and move-out links to tenant portal nav"
```

---

## Self-Review Against Spec

### Spec Coverage Check

| Spec Requirement | Covered? | Task |
|---|---|---|
| Listing model with status/bookingMode | ✅ | A1 |
| Listing CRUD and publish/pause/archive API | ✅ | A2, A3 |
| Public marketplace search with filters | ✅ | A3, C5 |
| Booking source tracking on Reservation | ✅ | A4 |
| Sidebar: all 16 nav items per §17.1 | ✅ | B1 |
| /listings dashboard page | ✅ | B2 |
| /bookings dashboard page with approval UI | ✅ | B3 |
| /payments dashboard page | ✅ | B4 |
| /inspections dashboard page | ✅ | B5 |
| /documents dashboard page | ✅ | B6 |
| /billing (SaaS) dashboard page | ✅ | B7 |
| Marketing homepage with hero + cities + CTA | ✅ | C1 |
| /for-operators SaaS landing page | ✅ | C2 |
| /pricing page with three plans | ✅ | C3 |
| /legal/privacy and /legal/terms | ✅ | C4 |
| Marketplace search with size/city/mode filters | ✅ | C5 |
| Tenant portal: Payment Methods | ✅ | D1 |
| Tenant portal: Move-out Request | ✅ | D2 |
| Tenant portal: nav links to new sections | ✅ | D3 |

### Items deferred to future plans (not in scope of this gap-fill):

- Tenant portal Messages/Support (requires real-time or async chat module — significant work)
- City/country SEO landing pages `/storage/[country]/[city]` (requires content seeding)
- Mollie Connect onboarding for organisations to receive tenant payments
- Language dropdown in public headers (requires next-intl setup across all public routes)
- Map view in marketplace search (requires mapping library integration)
- Platform Admin UI (separate portal — large subsystem)
- ZUGFeRD / XRechnung / DATEV export (Phase 2 per spec)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-15-gap-fill-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (recommended)** — Dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
