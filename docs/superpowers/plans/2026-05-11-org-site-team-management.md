# Org/Site/Team Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend CRUD endpoints for Organisation settings, Site management, and Team/Invitation management, then build the corresponding Next.js management UI pages.

**Architecture:** New `OrganisationModule` in the API exposes REST endpoints under `GET|PATCH /v1/organisations/:organisationId/...` protected by `JwtAuthGuard + OrganisationGuard`. Role checks (`owner` required for all write operations) are enforced in service methods, not the controller. Frontend uses server components with direct backend fetch (`serverFetch`) for reads, and Next.js API route handlers (BFF pattern) for mutations so the httpOnly `sl_access` cookie can be forwarded as a Bearer token.

**Tech Stack:** NestJS 10, Prisma 5, class-validator, slugify, Next.js 14 App Router, TypeScript, Tailwind CSS

---

## Plan Scope (2 of 6)

| Earlier plan | Covers |
|---|---|
| Plan 1 | Auth & RBAC, JWT strategy, Organisation/User/Invitation schema, unified portal shell, login/register/accept-invite pages |

| Later plan | Covers |
|---|---|
| Plan 3 | Units, Listings, Marketplace Search |
| Plan 4 | Booking, Tenant Portal |
| Plan 5 | Contracts, Invoices, Mollie Payments |
| Plan 6 | Operations, Reports, Admin, Hardening |

---

## File Map

### New (backend)
- `apps/api/src/modules/organisations/organisations.service.ts` — getOrganisation, updateOrganisation
- `apps/api/src/modules/organisations/organisations.service.spec.ts`
- `apps/api/src/modules/organisations/sites.service.ts` — listSites, createSite, getSite, updateSite, deleteSite
- `apps/api/src/modules/organisations/sites.service.spec.ts`
- `apps/api/src/modules/organisations/team.service.ts` — listMembers, removeMember, listInvitations, revokeInvitation
- `apps/api/src/modules/organisations/team.service.spec.ts`
- `apps/api/src/modules/organisations/organisations.controller.ts` — all 11 endpoints
- `apps/api/src/modules/organisations/organisations.module.ts`
- `apps/api/src/modules/organisations/dto/update-organisation.dto.ts`
- `apps/api/src/modules/organisations/dto/create-site.dto.ts`
- `apps/api/src/modules/organisations/dto/update-site.dto.ts`

### Modified (backend)
- `apps/api/src/app.module.ts` — add `OrganisationModule` import

### New (frontend)
- `apps/web/src/lib/server-api.ts` — server-component fetch with auto Bearer header
- `apps/web/src/lib/api-route-helpers.ts` — shared auth context + proxy helper for route handlers
- `apps/web/src/app/sites/page.tsx` — sites list (server component)
- `apps/web/src/app/sites/new/page.tsx` — create site form (client component)
- `apps/web/src/app/sites/[siteId]/page.tsx` — edit site (server + embedded client form)
- `apps/web/src/app/api/sites/route.ts` — POST → create site
- `apps/web/src/app/api/sites/[siteId]/route.ts` — PATCH + DELETE
- `apps/web/src/app/team/page.tsx` — members list + invite form + pending invitations (mixed)
- `apps/web/src/app/api/members/[memberId]/route.ts` — DELETE → remove member
- `apps/web/src/app/api/invitations/route.ts` — GET (list) + POST (create)
- `apps/web/src/app/api/invitations/[invitationId]/route.ts` — DELETE → revoke
- `apps/web/src/app/settings/page.tsx` — org profile (server + embedded client form)
- `apps/web/src/app/api/settings/route.ts` — PATCH → update org

### Modified (frontend)
- `apps/web/src/app/dashboard/page.tsx` — real site/member counts with nav links

---

## Task 1: DTOs

**Files:**
- Create: `apps/api/src/modules/organisations/dto/update-organisation.dto.ts`
- Create: `apps/api/src/modules/organisations/dto/create-site.dto.ts`
- Create: `apps/api/src/modules/organisations/dto/update-site.dto.ts`

- [ ] **Step 1: Create update-organisation.dto.ts**

Create `apps/api/src/modules/organisations/dto/update-organisation.dto.ts`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateOrganisationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tradingName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() billingEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() supportEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vatId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() taxNumber?: string;
}
```

- [ ] **Step 2: Create create-site.dto.ts**

Create `apps/api/src/modules/organisations/dto/create-site.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ example: 'Berlin Mitte Self-Storage' })
  @IsString()
  name: string;

  @ApiProperty({ example: { street: 'Hauptstr. 1', city: 'Berlin', postalCode: '10115', country: 'DE' } })
  @IsObject()
  address: { street: string; city: string; postalCode: string; country: string };

  @ApiPropertyOptional({ example: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
```

- [ ] **Step 3: Create update-site.dto.ts**

Create `apps/api/src/modules/organisations/dto/update-site.dto.ts`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSiteDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() address?: { street: string; city: string; postalCode: string; country: string };
  @ApiPropertyOptional() @IsOptional() @IsString() timezone?: string;
  @ApiPropertyOptional({ enum: ['active', 'inactive'] }) @IsOptional() @IsEnum(['active', 'inactive']) status?: 'active' | 'inactive';
}
```

- [ ] **Step 4: Commit and push**

```bash
git add apps/api/src/modules/organisations/
git commit -m "feat(orgs): add update-organisation, create-site, update-site DTOs"
git push
```

---

## Task 2: OrganisationService (TDD)

**Files:**
- Create: `apps/api/src/modules/organisations/organisations.service.spec.ts`
- Create: `apps/api/src/modules/organisations/organisations.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/organisations/organisations.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganisationService } from './organisations.service';
import { ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  organisation: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
};

describe('OrganisationService', () => {
  let service: OrganisationService;

  beforeEach(() => {
    service = new OrganisationService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('getOrganisation', () => {
    it('returns the organisation by id', async () => {
      const org = { id: 'org1', legalName: 'Test GmbH' };
      mockPrisma.organisation.findUniqueOrThrow.mockResolvedValue(org);

      const result = await service.getOrganisation('org1');

      expect(result).toEqual(org);
      expect(mockPrisma.organisation.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'org1' } });
    });
  });

  describe('updateOrganisation', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(
        service.updateOrganisation('org1', { billingEmail: 'new@test.de' }, 'operator'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('updates organisation when role is owner', async () => {
      const updated = { id: 'org1', legalName: 'Test GmbH', billingEmail: 'new@test.de' };
      mockPrisma.organisation.update.mockResolvedValue(updated);

      const result = await service.updateOrganisation('org1', { billingEmail: 'new@test.de' }, 'owner');

      expect(result).toEqual(updated);
      expect(mockPrisma.organisation.update).toHaveBeenCalledWith({
        where: { id: 'org1' },
        data: { billingEmail: 'new@test.de' },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
pnpm test -- --testPathPattern=organisations.service.spec --no-coverage
```

Expected: FAIL — `OrganisationService` not found.

- [ ] **Step 3: Implement OrganisationService**

Create `apps/api/src/modules/organisations/organisations.service.ts`:

```typescript
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';

@Injectable()
export class OrganisationService {
  constructor(private readonly prisma: PrismaClient) {}

  async getOrganisation(orgId: string) {
    return this.prisma.organisation.findUniqueOrThrow({ where: { id: orgId } });
  }

  async updateOrganisation(orgId: string, dto: UpdateOrganisationDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.organisation.update({ where: { id: orgId }, data: dto });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=organisations.service.spec --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/organisations/organisations.service.ts \
        apps/api/src/modules/organisations/organisations.service.spec.ts
git commit -m "feat(orgs): OrganisationService — getOrganisation, updateOrganisation (owner-only)"
git push
```

---

## Task 3: SiteService (TDD)

**Files:**
- Create: `apps/api/src/modules/organisations/sites.service.spec.ts`
- Create: `apps/api/src/modules/organisations/sites.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/organisations/sites.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SiteService } from './sites.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  site: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

const baseAddress = { street: 'Hauptstr. 1', city: 'Berlin', postalCode: '10115', country: 'DE' };
const createDto = { name: 'Berlin Site', address: baseAddress, timezone: 'Europe/Berlin', currency: 'EUR' };

describe('SiteService', () => {
  let service: SiteService;

  beforeEach(() => {
    service = new SiteService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listSites', () => {
    it('returns active sites for the organisation', async () => {
      const sites = [{ id: 's1', name: 'Berlin Site', organisationId: 'org1' }];
      mockPrisma.site.findMany.mockResolvedValue(sites);

      const result = await service.listSites('org1');

      expect(result).toEqual(sites);
      expect(mockPrisma.site.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1', deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('createSite', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.createSite('org1', createDto, 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('creates site with auto-generated slug when owner', async () => {
      const created = { id: 's1', name: 'Berlin Site', slug: 'berlin-site', organisationId: 'org1' };
      mockPrisma.site.create.mockResolvedValue(created);

      const result = await service.createSite('org1', createDto, 'owner');

      expect(result).toEqual(created);
      expect(mockPrisma.site.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Berlin Site', organisationId: 'org1', slug: 'berlin-site' }),
        }),
      );
    });

    it('throws ConflictException when slug already exists', async () => {
      mockPrisma.site.create.mockRejectedValueOnce({ code: 'P2002' });
      await expect(service.createSite('org1', createDto, 'owner')).rejects.toThrow(ConflictException);
    });
  });

  describe('getSite', () => {
    it('returns the site when it belongs to the organisation', async () => {
      const site = { id: 's1', organisationId: 'org1' };
      mockPrisma.site.findFirst.mockResolvedValue(site);

      const result = await service.getSite('org1', 's1');

      expect(result).toEqual(site);
    });

    it('throws NotFoundException when site is not found', async () => {
      mockPrisma.site.findFirst.mockResolvedValue(null);
      await expect(service.getSite('org1', 's1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSite', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.updateSite('org1', 's1', { name: 'New Name' }, 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('updates site when role is owner', async () => {
      const site = { id: 's1', organisationId: 'org1' };
      const updated = { id: 's1', name: 'New Name' };
      mockPrisma.site.findFirst.mockResolvedValue(site);
      mockPrisma.site.update.mockResolvedValue(updated);

      const result = await service.updateSite('org1', 's1', { name: 'New Name' }, 'owner');

      expect(result).toEqual(updated);
      expect(mockPrisma.site.update).toHaveBeenCalledWith({ where: { id: 's1' }, data: { name: 'New Name' } });
    });
  });

  describe('deleteSite', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.deleteSite('org1', 's1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('soft-deletes site when role is owner', async () => {
      mockPrisma.site.findFirst.mockResolvedValue({ id: 's1', organisationId: 'org1' });
      mockPrisma.site.update.mockResolvedValue({});

      await service.deleteSite('org1', 's1', 'owner');

      expect(mockPrisma.site.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- --testPathPattern=sites.service.spec --no-coverage
```

Expected: FAIL — `SiteService` not found.

- [ ] **Step 3: Implement SiteService**

Create `apps/api/src/modules/organisations/sites.service.ts`:

```typescript
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import slugify from 'slugify';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaClient) {}

  async listSites(orgId: string) {
    return this.prisma.site.findMany({
      where: { organisationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSite(orgId: string, dto: CreateSiteDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    const slug = slugify(dto.name, { lower: true, strict: true });
    try {
      return await this.prisma.site.create({
        data: {
          name: dto.name,
          address: dto.address,
          timezone: dto.timezone ?? 'Europe/Berlin',
          currency: dto.currency ?? 'EUR',
          slug,
          organisationId: orgId,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('SLUG_ALREADY_EXISTS');
      throw e;
    }
  }

  async getSite(orgId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organisationId: orgId, deletedAt: null },
    });
    if (!site) throw new NotFoundException('SITE_NOT_FOUND');
    return site;
  }

  async updateSite(orgId: string, siteId: string, dto: UpdateSiteDto, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.getSite(orgId, siteId);
    return this.prisma.site.update({ where: { id: siteId }, data: dto });
  }

  async deleteSite(orgId: string, siteId: string, memberRole: string) {
    if (memberRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    await this.getSite(orgId, siteId);
    await this.prisma.site.update({ where: { id: siteId }, data: { deletedAt: new Date() } });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=sites.service.spec --no-coverage
```

Expected: PASS — 8 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/organisations/sites.service.ts \
        apps/api/src/modules/organisations/sites.service.spec.ts
git commit -m "feat(orgs): SiteService — listSites, createSite, getSite, updateSite, deleteSite"
git push
```

---

## Task 4: TeamService (TDD)

**Files:**
- Create: `apps/api/src/modules/organisations/team.service.spec.ts`
- Create: `apps/api/src/modules/organisations/team.service.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/api/src/modules/organisations/team.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamService } from './team.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  organisationMember: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
  },
  invitation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

describe('TeamService', () => {
  let service: TeamService;

  beforeEach(() => {
    service = new TeamService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listMembers', () => {
    it('returns all members with user info', async () => {
      const members = [{ id: 'm1', role: 'owner', user: { id: 'u1', name: 'Max', email: 'max@test.de' } }];
      mockPrisma.organisationMember.findMany.mockResolvedValue(members);

      const result = await service.listMembers('org1');

      expect(result).toEqual(members);
      expect(mockPrisma.organisationMember.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1' },
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('removeMember', () => {
    it('throws ForbiddenException when requesting role is operator', async () => {
      await expect(service.removeMember('org1', 'm1', 'operator', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when member is not in the organisation', async () => {
      mockPrisma.organisationMember.findFirst.mockResolvedValue(null);
      await expect(service.removeMember('org1', 'm1', 'owner', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when owner attempts to remove their own membership', async () => {
      mockPrisma.organisationMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u1', organisationId: 'org1' });
      await expect(service.removeMember('org1', 'm1', 'owner', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('removes member when owner removes a different user', async () => {
      mockPrisma.organisationMember.findFirst.mockResolvedValue({ id: 'm1', userId: 'u2', organisationId: 'org1' });
      mockPrisma.organisationMember.delete.mockResolvedValue({});

      await service.removeMember('org1', 'm1', 'owner', 'u1');

      expect(mockPrisma.organisationMember.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
    });
  });

  describe('listInvitations', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.listInvitations('org1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('returns pending invitations for owner', async () => {
      const invitations = [{ id: 'inv1', email: 'new@test.de', status: 'pending' }];
      mockPrisma.invitation.findMany.mockResolvedValue(invitations);

      const result = await service.listInvitations('org1', 'owner');

      expect(result).toEqual(invitations);
      expect(mockPrisma.invitation.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1', status: 'pending' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('revokeInvitation', () => {
    it('throws ForbiddenException when role is operator', async () => {
      await expect(service.revokeInvitation('org1', 'inv1', 'operator')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when invitation not found', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue(null);
      await expect(service.revokeInvitation('org1', 'inv1', 'owner')).rejects.toThrow(NotFoundException);
    });

    it('sets invitation status to revoked', async () => {
      mockPrisma.invitation.findFirst.mockResolvedValue({ id: 'inv1', organisationId: 'org1', status: 'pending' });
      mockPrisma.invitation.update.mockResolvedValue({});

      await service.revokeInvitation('org1', 'inv1', 'owner');

      expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv1' },
        data: { status: 'revoked' },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test -- --testPathPattern=team.service.spec --no-coverage
```

Expected: FAIL — `TeamService` not found.

- [ ] **Step 3: Implement TeamService**

Create `apps/api/src/modules/organisations/team.service.ts`:

```typescript
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaClient) {}

  async listMembers(orgId: string) {
    return this.prisma.organisationMember.findMany({
      where: { organisationId: orgId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async removeMember(orgId: string, memberId: string, requestingRole: string, requestingUserId: string) {
    if (requestingRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');

    const member = await this.prisma.organisationMember.findFirst({
      where: { id: memberId, organisationId: orgId },
    });
    if (!member) throw new NotFoundException('MEMBER_NOT_FOUND');
    if (member.userId === requestingUserId) throw new BadRequestException('CANNOT_REMOVE_SELF');

    await this.prisma.organisationMember.delete({ where: { id: memberId } });
  }

  async listInvitations(orgId: string, requestingRole: string) {
    if (requestingRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');
    return this.prisma.invitation.findMany({
      where: { organisationId: orgId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(orgId: string, invitationId: string, requestingRole: string) {
    if (requestingRole !== 'owner') throw new ForbiddenException('OWNER_REQUIRED');

    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organisationId: orgId, status: 'pending' },
    });
    if (!invitation) throw new NotFoundException('INVITATION_NOT_FOUND');

    await this.prisma.invitation.update({ where: { id: invitationId }, data: { status: 'revoked' } });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern=team.service.spec --no-coverage
```

Expected: PASS — 8 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/organisations/team.service.ts \
        apps/api/src/modules/organisations/team.service.spec.ts
git commit -m "feat(orgs): TeamService — listMembers, removeMember, listInvitations, revokeInvitation"
git push
```

---

## Task 5: OrganisationController, Module, and AppModule Wiring

**Files:**
- Create: `apps/api/src/modules/organisations/organisations.controller.ts`
- Create: `apps/api/src/modules/organisations/organisations.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create OrganisationController**

Create `apps/api/src/modules/organisations/organisations.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OrganisationService } from './organisations.service';
import { SiteService } from './sites.service';
import { TeamService } from './team.service';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

interface MemberContext {
  id: string;
  userId: string;
  role: string;
  organisationId: string;
}

@ApiTags('organisations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OrganisationController {
  constructor(
    private readonly organisations: OrganisationService,
    private readonly sites: SiteService,
    private readonly team: TeamService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get organisation profile' })
  getOrganisation(@Param('organisationId') orgId: string) {
    return this.organisations.getOrganisation(orgId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update organisation profile (owner only)' })
  updateOrganisation(
    @Param('organisationId') orgId: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.organisations.updateOrganisation(orgId, dto, member.role);
  }

  @Get('sites')
  @ApiOperation({ summary: 'List sites in organisation' })
  listSites(@Param('organisationId') orgId: string) {
    return this.sites.listSites(orgId);
  }

  @Post('sites')
  @ApiOperation({ summary: 'Create a new site (owner only)' })
  createSite(
    @Param('organisationId') orgId: string,
    @Body() dto: CreateSiteDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.sites.createSite(orgId, dto, member.role);
  }

  @Get('sites/:siteId')
  @ApiOperation({ summary: 'Get a single site' })
  getSite(@Param('organisationId') orgId: string, @Param('siteId') siteId: string) {
    return this.sites.getSite(orgId, siteId);
  }

  @Patch('sites/:siteId')
  @ApiOperation({ summary: 'Update a site (owner only)' })
  updateSite(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @Body() dto: UpdateSiteDto,
    @CurrentMember() member: MemberContext,
  ) {
    return this.sites.updateSite(orgId, siteId, dto, member.role);
  }

  @Delete('sites/:siteId')
  @ApiOperation({ summary: 'Soft-delete a site (owner only)' })
  deleteSite(
    @Param('organisationId') orgId: string,
    @Param('siteId') siteId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.sites.deleteSite(orgId, siteId, member.role);
  }

  @Get('members')
  @ApiOperation({ summary: 'List organisation members' })
  listMembers(@Param('organisationId') orgId: string) {
    return this.team.listMembers(orgId);
  }

  @Delete('members/:memberId')
  @ApiOperation({ summary: 'Remove a member (owner only)' })
  removeMember(
    @Param('organisationId') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.team.removeMember(orgId, memberId, member.role, member.userId);
  }

  @Get('invitations')
  @ApiOperation({ summary: 'List pending invitations (owner only)' })
  listInvitations(
    @Param('organisationId') orgId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.team.listInvitations(orgId, member.role);
  }

  @Delete('invitations/:invitationId')
  @ApiOperation({ summary: 'Revoke a pending invitation (owner only)' })
  revokeInvitation(
    @Param('organisationId') orgId: string,
    @Param('invitationId') invitationId: string,
    @CurrentMember() member: MemberContext,
  ) {
    return this.team.revokeInvitation(orgId, invitationId, member.role);
  }
}
```

- [ ] **Step 2: Create OrganisationModule**

Create `apps/api/src/modules/organisations/organisations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { OrganisationService } from './organisations.service';
import { SiteService } from './sites.service';
import { TeamService } from './team.service';
import { OrganisationController } from './organisations.controller';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    OrganisationService,
    SiteService,
    TeamService,
  ],
  controllers: [OrganisationController],
  exports: [OrganisationService, SiteService, TeamService],
})
export class OrganisationModule {}
```

- [ ] **Step 3: Register OrganisationModule in AppModule**

Open `apps/api/src/app.module.ts` and add the import. Find the `// Foundation` comment block and add after `AuthModule`:

```typescript
import { OrganisationModule } from './modules/organisations/organisations.module';
```

In the `imports` array, add `OrganisationModule` after `AuthModule`:

```typescript
    // Foundation
    AuthModule,
    AuditModule,
    HealthModule,
    OrganisationModule,
```

- [ ] **Step 4: Build to verify no TypeScript errors**

```bash
cd apps/api
pnpm build 2>&1 | tail -20
```

Expected: Build completes with no errors.

- [ ] **Step 5: Run full test suite**

```bash
pnpm test --no-coverage
```

Expected: All tests pass (26 test files, 80+ tests).

- [ ] **Step 6: Commit and push**

```bash
git add apps/api/src/modules/organisations/organisations.controller.ts \
        apps/api/src/modules/organisations/organisations.module.ts \
        apps/api/src/app.module.ts
git commit -m "feat(orgs): OrganisationController + Module — org, sites, members, invitations endpoints"
git push
```

---

## Task 6: Frontend — Server-Side Helpers

**Files:**
- Create: `apps/web/src/lib/server-api.ts`
- Create: `apps/web/src/lib/api-route-helpers.ts`

- [ ] **Step 1: Create server-api.ts**

This module runs only in server components and route handlers. It reads the `sl_access` cookie and forwards it as a Bearer token.

Create `apps/web/src/lib/server-api.ts`:

```typescript
import { getAccessToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function serverFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 2: Create api-route-helpers.ts**

This module is used inside Next.js route handlers (`/app/api/...`) to read the auth cookie and proxy requests to the backend.

Create `apps/web/src/lib/api-route-helpers.ts`:

```typescript
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { decodeJwt } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function getAuthContext() {
  const token = cookies().get('sl_access')?.value;
  if (!token) return null;
  const payload = decodeJwt(token);
  if (!payload) return null;
  return { token, payload };
}

export async function proxyToBackend(
  path: string,
  method: string,
  token: string,
  body?: object,
): Promise<NextResponse> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 3: Commit and push**

```bash
git add apps/web/src/lib/server-api.ts apps/web/src/lib/api-route-helpers.ts
git commit -m "feat(web): server-api helper and BFF proxy helper for route handlers"
git push
```

---

## Task 7: Frontend — Sites Pages and API Routes

**Files:**
- Create: `apps/web/src/app/sites/page.tsx`
- Create: `apps/web/src/app/sites/new/page.tsx`
- Create: `apps/web/src/app/sites/[siteId]/page.tsx`
- Create: `apps/web/src/app/api/sites/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/route.ts`

- [ ] **Step 1: Create the sites list page**

Create `apps/web/src/app/sites/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface SiteAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: SiteAddress;
}

export default async function SitesPage() {
  const user = await requireAuth();
  const sites = await serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Sites</h1>
          </div>
          {user.role === 'owner' && (
            <Link href="/sites/new" className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              + Add site
            </Link>
          )}
        </div>

        {sites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <p className="text-slate-500 mb-4">No sites yet.</p>
            {user.role === 'owner' && (
              <Link href="/sites/new" className="text-blue-600 hover:underline text-sm">Add your first site →</Link>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Name</th>
                  <th className="text-left px-6 py-3">City</th>
                  <th className="text-left px-6 py-3">Slug</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{site.name}</td>
                    <td className="px-6 py-4 text-slate-500">{site.address.city}</td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{site.slug}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${site.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {site.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {user.role === 'owner' && (
                        <Link href={`/sites/${site.id}`} className="text-blue-600 hover:underline">Edit</Link>
                      )}
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

- [ ] **Step 2: Create the new site form page**

Create `apps/web/src/app/sites/new/page.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewSitePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          address: {
            street: form.get('street'),
            city: form.get('city'),
            postalCode: form.get('postalCode'),
            country: form.get('country') || 'DE',
          },
          timezone: form.get('timezone') || 'Europe/Berlin',
          currency: form.get('currency') || 'EUR',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to create site');
      router.push('/sites');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">← Sites</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Add a new site</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Site name</label>
            <input name="name" type="text" required placeholder="Berlin Mitte Self-Storage"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Street address</label>
              <input name="street" type="text" required placeholder="Hauptstr. 1"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <input name="city" type="text" required placeholder="Berlin"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Postal code</label>
              <input name="postalCode" type="text" required placeholder="10115"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Country code</label>
              <input name="country" type="text" defaultValue="DE" maxLength={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
              <input name="timezone" type="text" defaultValue="Europe/Berlin"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
              {loading ? 'Creating…' : 'Create site'}
            </button>
            <Link href="/sites" className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the site detail/edit page**

Create `apps/web/src/app/sites/[siteId]/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import SiteEditForm from './SiteEditForm';

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
  currency: string;
}

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const site = await serverFetch<Site>(
    `/v1/organisations/${user.organisationId}/sites/${params.siteId}`,
  );

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <a href="/sites" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">← Sites</a>
        <h1 className="text-2xl font-bold text-slate-900 mb-8">{site.name}</h1>
        <SiteEditForm site={site} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create the SiteEditForm client component**

Create `apps/web/src/app/sites/[siteId]/SiteEditForm.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}

export default function SiteEditForm({ site }: { site: Site }) {
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
      const res = await fetch(`/api/sites/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          address: {
            street: form.get('street'),
            city: form.get('city'),
            postalCode: form.get('postalCode'),
            country: form.get('country'),
          },
          timezone: form.get('timezone'),
          status: form.get('status'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to update site');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${site.name}"? This cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to delete site');
      }
      router.push('/sites');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleteLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Site name</label>
        <input name="name" type="text" required defaultValue={site.name}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Street</label>
          <input name="street" type="text" required defaultValue={site.address.street}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
          <input name="city" type="text" required defaultValue={site.address.city}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Postal code</label>
          <input name="postalCode" type="text" required defaultValue={site.address.postalCode}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
          <input name="country" type="text" required defaultValue={site.address.country} maxLength={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <input name="timezone" type="text" required defaultValue={site.timezone}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select name="status" defaultValue={site.status}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <a href="/sites" className="text-sm text-slate-500 hover:text-slate-700 px-5 py-2">Cancel</a>
        </div>
        <button type="button" onClick={handleDelete} disabled={deleteLoading}
          className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
          {deleteLoading ? 'Deleting…' : 'Delete site'}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Create the sites API route (POST)**

Create `apps/web/src/app/api/sites/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites`,
    'POST',
    auth.token,
    body,
  );
}
```

- [ ] **Step 6: Create the site detail API route (PATCH + DELETE)**

Create `apps/web/src/app/api/sites/[siteId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}`,
    'PATCH',
    auth.token,
    body,
  );
}

export async function DELETE(_request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}`,
    'DELETE',
    auth.token,
  );
}
```

- [ ] **Step 7: Commit and push**

```bash
git add apps/web/src/app/sites/ apps/web/src/app/api/sites/
git commit -m "feat(web): sites list, new site, edit site pages + API routes"
git push
```

---

## Task 8: Frontend — Team Page and API Routes

**Files:**
- Create: `apps/web/src/app/team/page.tsx`
- Create: `apps/web/src/app/team/TeamActions.tsx`
- Create: `apps/web/src/app/api/members/[memberId]/route.ts`
- Create: `apps/web/src/app/api/invitations/route.ts`
- Create: `apps/web/src/app/api/invitations/[invitationId]/route.ts`

- [ ] **Step 1: Create the team page**

Create `apps/web/src/app/team/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TeamActions from './TeamActions';
import Link from 'next/link';

interface Member {
  id: string;
  role: 'owner' | 'operator' | 'tenant';
  user: { id: string; name: string | null; email: string };
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export default async function TeamPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const members = await serverFetch<Member[]>(`/v1/organisations/${orgId}/members`);
  const invitations = user.role === 'owner'
    ? await serverFetch<Invitation[]>(`/v1/organisations/${orgId}/invitations`).catch(() => [])
    : [];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        </div>

        {/* Members */}
        <div className="bg-white rounded-2xl shadow mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Members</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Role</th>
                {user.role === 'owner' && <th className="px-6 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{m.user.name ?? '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{m.user.email}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {m.role}
                    </span>
                  </td>
                  {user.role === 'owner' && (
                    <td className="px-6 py-4 text-right">
                      {m.user.id !== user.sub && (
                        <TeamActions type="remove-member" id={m.id} label="Remove" />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invite form (owner only) */}
        {user.role === 'owner' && (
          <div className="bg-white rounded-2xl shadow mb-6 p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Invite a team member</h2>
            <TeamActions type="invite-form" id="" label="" />
          </div>
        )}

        {/* Pending invitations (owner only) */}
        {user.role === 'owner' && invitations.length > 0 && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Pending invitations</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Role</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TeamActions type="revoke-invitation" id={inv.id} label="Revoke" />
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

- [ ] **Step 2: Create the TeamActions client component**

Create `apps/web/src/app/team/TeamActions.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  type: 'remove-member' | 'revoke-invitation' | 'invite-form';
  id: string;
  label: string;
}

export default function TeamActions({ type, id, label }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRemoveMember() {
    if (!confirm('Remove this member from the organisation?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to remove member');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeInvitation() {
    if (!confirm('Revoke this invitation?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Failed to revoke invitation');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), role: form.get('role') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to send invitation');
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'remove-member') {
    return (
      <button onClick={handleRemoveMember} disabled={loading}
        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : label}
      </button>
    );
  }

  if (type === 'revoke-invitation') {
    return (
      <button onClick={handleRevokeInvitation} disabled={loading}
        className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50">
        {loading ? '…' : label}
      </button>
    );
  }

  return (
    <form onSubmit={handleInvite} className="flex gap-3 items-end flex-wrap">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input name="email" type="email" required placeholder="colleague@company.de"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
        <select name="role"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="operator">Operator</option>
          <option value="tenant">Tenant</option>
        </select>
      </div>
      <button type="submit" disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Sending…' : 'Send invite'}
      </button>
      {error && <p className="text-red-600 text-sm w-full mt-1">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 3: Create the remove-member API route**

Create `apps/web/src/app/api/members/[memberId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function DELETE(_request: NextRequest, { params }: { params: { memberId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/members/${params.memberId}`,
    'DELETE',
    auth.token,
  );
}
```

- [ ] **Step 4: Create the invitations API routes**

Create `apps/web/src/app/api/invitations/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/invitations`,
    'POST',
    auth.token,
    body,
  );
}
```

Create `apps/web/src/app/api/invitations/[invitationId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function DELETE(_request: NextRequest, { params }: { params: { invitationId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/invitations/${params.invitationId}`,
    'DELETE',
    auth.token,
  );
}
```

- [ ] **Step 5: Commit and push**

```bash
git add apps/web/src/app/team/ apps/web/src/app/api/members/ apps/web/src/app/api/invitations/
git commit -m "feat(web): team page — members list, invite form, pending invitations + API routes"
git push
```

---

## Task 9: Frontend — Settings Page and API Route

**Files:**
- Create: `apps/web/src/app/settings/page.tsx`
- Create: `apps/web/src/app/settings/OrgSettingsForm.tsx`
- Create: `apps/web/src/app/api/settings/route.ts`

- [ ] **Step 1: Create the settings page**

Create `apps/web/src/app/settings/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import OrgSettingsForm from './OrgSettingsForm';
import Link from 'next/link';

interface Organisation {
  id: string;
  legalName: string;
  tradingName: string | null;
  slug: string;
  billingEmail: string;
  supportEmail: string | null;
  phone: string | null;
  website: string | null;
  vatId: string | null;
  taxNumber: string | null;
  plan: string;
  status: string;
}

export default async function SettingsPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');

  const org = await serverFetch<Organisation>(`/v1/organisations/${user.organisationId}`);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-4 block">← Dashboard</Link>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Organisation settings</h1>
        <p className="text-slate-500 text-sm mb-8">
          Plan: <strong className="capitalize">{org.plan}</strong> ·
          Status: <strong className="capitalize">{org.status}</strong>
        </p>
        <OrgSettingsForm org={org} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the OrgSettingsForm client component**

Create `apps/web/src/app/settings/OrgSettingsForm.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Organisation {
  id: string;
  legalName: string;
  tradingName: string | null;
  billingEmail: string;
  supportEmail: string | null;
  phone: string | null;
  website: string | null;
  vatId: string | null;
  taxNumber: string | null;
}

export default function OrgSettingsForm({ org }: { org: Organisation }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const body: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === 'string' && value.trim()) body[key] = value.trim();
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Failed to save settings');
      setSuccess(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, name: string, defaultValue: string | null, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue ?? ''}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Legal name</label>
        <input value={org.legalName} disabled
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
        <p className="text-xs text-slate-400 mt-1">Contact support to change your legal name.</p>
      </div>

      {field('Trading name', 'tradingName', org.tradingName)}
      {field('Billing email', 'billingEmail', org.billingEmail, 'email')}
      {field('Support email', 'supportEmail', org.supportEmail, 'email')}
      {field('Phone', 'phone', org.phone)}
      {field('Website', 'website', org.website)}
      {field('VAT ID', 'vatId', org.vatId)}
      {field('Tax number', 'taxNumber', org.taxNumber)}

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">Settings saved.</p>}

      <button type="submit" disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create the settings API route**

Create `apps/web/src/app/api/settings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}`,
    'PATCH',
    auth.token,
    body,
  );
}
```

- [ ] **Step 4: Commit and push**

```bash
git add apps/web/src/app/settings/ apps/web/src/app/api/settings/
git commit -m "feat(web): organisation settings page (owner only)"
git push
```

---

## Task 10: Frontend — Dashboard Update

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Update the dashboard with real data and navigation links**

Replace the contents of `apps/web/src/app/dashboard/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireAuth();

  const [sites, members] = await Promise.all([
    serverFetch<{ id: string }[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => []),
    serverFetch<{ id: string }[]>(`/v1/organisations/${user.organisationId}/members`).catch(() => []),
  ]);

  const cards = [
    {
      label: 'Sites',
      count: sites.length,
      href: '/sites',
      cta: user.role === 'owner' ? 'Manage sites →' : 'View sites →',
    },
    {
      label: 'Team',
      count: members.length,
      href: '/team',
      cta: 'Manage team →',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <div className="flex items-center gap-4">
            {user.role === 'owner' && (
              <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">
                Settings
              </Link>
            )}
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-sm text-slate-500 hover:text-slate-700">
                Sign out
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <p className="text-slate-600 text-sm">
            Signed in as <strong>{user.role}</strong> ·{' '}
            Organisation{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">{user.organisationId}</code>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link key={card.label} href={card.href}
              className="bg-white rounded-xl shadow p-5 hover:shadow-md transition-shadow group">
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">{card.label}</p>
              <p className="text-3xl font-bold text-slate-900 mb-2">{card.count}</p>
              <p className="text-blue-600 text-sm group-hover:underline">{card.cta}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit and push**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "feat(web): dashboard shows real site + member counts with nav links"
git push
```

---

## Task 11: Full Test Suite + Smoke Test

- [ ] **Step 1: Run the full API test suite**

```bash
cd apps/api
pnpm test --no-coverage
```

Expected: All tests pass — 26 test files, 85+ tests.

- [ ] **Step 2: Start infrastructure (if not already running)**

```bash
docker compose up -d postgres redis
```

- [ ] **Step 3: Start the API**

In a terminal:

```bash
cd apps/api
pnpm dev
```

Expected: NestJS starts on port 3000. Swagger at `http://localhost:3000/docs` should show the new `organisations` tag with all endpoints.

- [ ] **Step 4: Start the web portal**

In a second terminal:

```bash
cd apps/web
pnpm dev
```

Expected: Next.js starts on port 3001.

- [ ] **Step 5: Smoke test — register and navigate**

1. Open `http://localhost:3001/register`
2. Create an account
3. Should land on `/dashboard` with Sites: 0, Team: 1
4. Click "Manage sites →" → should show the sites list with "Add site" button
5. Click "+ Add site" → fill in the form → submit → should appear in the list
6. Click "Edit" on a site → update the name → click "Save changes"
7. Click "← Dashboard" → click "Manage team →"
8. Should show your own account in the members list
9. In the invite form, enter an email and select "Operator" → send invite
10. Invitation should appear in the "Pending invitations" section
11. Click "Revoke" → invitation should disappear
12. Click "← Dashboard" → click "Settings" → update support email → save

- [ ] **Step 6: Smoke test — curl API**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"organisationName":"Curl GmbH","ownerName":"Tester","email":"tester@curl.de","password":"test1234"}' \
  | jq -r '.accessToken')

ORG_ID=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq -r '.organisationId')

# List sites (empty)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/v1/organisations/$ORG_ID/sites | jq

# Create site
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Hamburg Lager","address":{"street":"Hafenstr. 1","city":"Hamburg","postalCode":"20095","country":"DE"}}' \
  http://localhost:3000/v1/organisations/$ORG_ID/sites | jq '.id, .name, .slug'
```

Expected: Site created with id, name `Hamburg Lager`, slug `hamburg-lager`.

- [ ] **Step 7: Final commit and push**

```bash
git add .
git commit -m "chore: Plan 2 complete — org/site/team management"
git push
```

---

## Self-Review Checklist

After completing all tasks, verify:

- [ ] `GET /v1/organisations/:id` — returns org profile (any member role)
- [ ] `PATCH /v1/organisations/:id` — updates org (owner only; ForbiddenException for others)
- [ ] `GET /v1/organisations/:id/sites` — lists non-deleted sites scoped to org
- [ ] `POST /v1/organisations/:id/sites` — creates site with auto-slug (owner only)
- [ ] `GET /v1/organisations/:id/sites/:siteId` — returns site (throws 404 if not in org)
- [ ] `PATCH /v1/organisations/:id/sites/:siteId` — updates site (owner only)
- [ ] `DELETE /v1/organisations/:id/sites/:siteId` — soft-deletes site (owner only)
- [ ] `GET /v1/organisations/:id/members` — lists members with user name + email
- [ ] `DELETE /v1/organisations/:id/members/:memberId` — removes member; blocks self-removal
- [ ] `GET /v1/organisations/:id/invitations` — lists pending invitations (owner only)
- [ ] `DELETE /v1/organisations/:id/invitations/:invitationId` — revokes invitation (owner only)
- [ ] Dashboard shows real site + member counts and links to `/sites` and `/team`
- [ ] `/sites` lists all sites; "Edit" and "+ Add site" only visible to owner
- [ ] `/sites/new` creates site; redirects to `/sites` on success
- [ ] `/sites/[siteId]` pre-fills edit form with existing data; "Delete site" button works
- [ ] `/team` lists members, shows invite form + pending invitations for owner only
- [ ] `/settings` only accessible to owner (redirects others); saves org profile
- [ ] All API routes return 401 when `sl_access` cookie is missing
