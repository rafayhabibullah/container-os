# Operations, Reports, Admin & Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose Operations (tasks, incidents, maintenance, inspections) and Access Control management endpoints, add a Reporting dashboard, wire Webhooks and API Key management, build an Audit Log viewer, and harden the API with Helmet, CORS, rate-limit docs, and security event logging.

**Architecture:** Seven new controllers are added to the NestJS app, each backed by the existing stub services (InspectionService, ReportingService, WebhookDeliveryService, AuditService, AccessControlService). A new `OperationsModule` groups the task/incident/maintenance controllers. Security hardening is applied in `main.ts`. All write endpoints under `v1/organisations/:organisationId/...` are protected by `JwtAuthGuard + OrganisationGuard`; tenant-scoped and public endpoints use `JwtAuthGuard` only.

**Tech Stack:** NestJS 10, Prisma 5, class-validator, @nestjs/throttler, helmet, Next.js 14 App Router, TypeScript, Tailwind CSS

---

## Plan Scope (6 of 6)

| Earlier plan | Covers |
|---|---|
| Plan 1 | Auth, JWT, portal shell |
| Plan 2 | Org/Site/Team management |
| Plan 3 | Units, Listings, Marketplace |
| Plan 4 | Booking, Tenant Portal |
| Plan 5 | Contracts, Invoices, Payments |

---

## What already exists — do NOT re-implement

**Schema models:**
- `Task` (id, siteId, assigneeId, status[open|in_progress|done|cancelled], dueAt, subjectRef, title, notes)
- `InspectionTemplate` (id, siteId, kind, checklistJson)
- `InspectionRun` (id, unitId, templateId, kind, result, photoIds, completedAt)
- `Incident` (id, siteId, unitId, reportedById, title, description, status[open|investigating|resolved|closed], severity, resolvedAt)
- `MaintenanceOrder` (id, siteId, unitId, requestedById, title, status, scheduledFor, completedAt, costMinor)
- `Transfer` (id, fromUnitId, toUnitId, agreementId, requestedAt, effectiveAt, status, operatorNote)
- `MetricSnapshot` (id, siteId, snapshotDate, occupancyRate, revenueMinor, arrMinor, churnRate, avgUnitRevMinor)
- `ReportRun` (id, siteId, kind, periodStart, periodEnd, status, downloadUrl)
- `AuditEvent` (id, actorId, actorType, action, subjectType, subjectId, changes, siteId, requestId)
- `LegalHold` (id, subjectRef, reason, active)
- `SecurityEvent` (id, eventType, actorId, ip, userAgent, metadata, createdAt)
- `WebhookEndpoint` (id, organisationId, url, events[], secret, active)
- `WebhookDelivery` (id, endpointId, eventType, payload, status, attemptCount, lastAttemptAt, nextRetryAt)
- `ApiClient` (id, organisationId, name, scopes[])
- `ApiKey` (id, clientId, keyHash[unique], lastUsedAt, expiresAt, revoked)
- `AccessVendor`, `AccessPoint`, `AccessGroup`, `AccessCredential`, `AccessEvent`, `LockoutState`

**Existing API modules (stub services already implemented):**
- `apps/api/src/modules/operations/` — `InspectionService` with `createInspectionRun`, `assertMoveInInspectionComplete`
- `apps/api/src/modules/reporting/` — `ReportingService` with `getOccupancyReport`, `getRevenueReport`
- `apps/api/src/modules/audit/` — `AuditService` with `record`, `hasLegalHold`, `getAuditTrail`
- `apps/api/src/modules/webhooks/` — `WebhookDeliveryService` with `enqueueDeliveries`, `computeSignature`
- `apps/api/src/modules/documents/` — `EvidencePackService`
- `apps/api/src/modules/access-control/` — `AccessControlService`
- `apps/api/src/modules/notifications/` — `NotificationsService`
- `apps/api/src/modules/auth/` — `JwtAuthGuard`, `OrganisationGuard`, `CurrentMember`, `AuthService`

**Existing web pages:** dashboard, sites/*, team, settings, reservations, agreements/*, invoices/*, my-storage/*.

**Helpers:**
- `apps/web/src/lib/server-api.ts` — `serverFetch<T>(path, init?)`
- `apps/web/src/lib/api-route-helpers.ts` — `getAuthContext()`, `proxyToBackend(path, method, token, body?)`
- `apps/web/src/lib/auth.ts` — `requireAuth()`, `TokenPayload`

---

## File Map

### New (backend)
- `apps/api/src/modules/operations/operations.controller.ts` — tasks, incidents, maintenance, inspections
- `apps/api/src/modules/operations/operations.service.ts` — CRUD for Task, Incident, MaintenanceOrder
- `apps/api/src/modules/operations/operations.service.spec.ts`
- `apps/api/src/modules/reporting/reporting.controller.ts`
- `apps/api/src/modules/webhooks/webhooks.controller.ts`
- `apps/api/src/modules/webhooks/api-key.service.ts`
- `apps/api/src/modules/webhooks/api-key.service.spec.ts`
- `apps/api/src/modules/audit/audit.controller.ts`

### Modified (backend)
- `apps/api/src/modules/operations/operations.module.ts` — add controller + service
- `apps/api/src/modules/reporting/reporting.module.ts` — add controller
- `apps/api/src/modules/webhooks/webhooks.module.ts` — add controller + ApiKeyService
- `apps/api/src/modules/audit/audit.module.ts` — add controller
- `apps/api/src/app.module.ts` — verify all modules registered
- `apps/api/src/main.ts` — add helmet, CORS, global throttle logging

### New (frontend)
- `apps/web/src/app/tasks/page.tsx`
- `apps/web/src/app/tasks/TaskActions.tsx`
- `apps/web/src/app/api/tasks/route.ts`
- `apps/web/src/app/api/tasks/[taskId]/route.ts`
- `apps/web/src/app/incidents/page.tsx`
- `apps/web/src/app/incidents/IncidentActions.tsx`
- `apps/web/src/app/api/incidents/route.ts`
- `apps/web/src/app/api/incidents/[incidentId]/route.ts`
- `apps/web/src/app/reports/page.tsx`
- `apps/web/src/app/api/reports/route.ts`
- `apps/web/src/app/audit/page.tsx`
- `apps/web/src/app/settings/webhooks/page.tsx`
- `apps/web/src/app/settings/webhooks/WebhookActions.tsx`
- `apps/web/src/app/api/settings/webhooks/route.ts`
- `apps/web/src/app/api/settings/webhooks/[webhookId]/route.ts`
- `apps/web/src/app/settings/api-keys/page.tsx`
- `apps/web/src/app/settings/api-keys/ApiKeyActions.tsx`
- `apps/web/src/app/api/settings/api-keys/route.ts`
- `apps/web/src/app/api/settings/api-keys/[apiKeyId]/route.ts`

### Modified (frontend)
- `apps/web/src/app/dashboard/page.tsx` — add Operations and Reports nav cards

---

## Task 1: OperationsService (TDD)

**Files:**
- Create: `apps/api/src/modules/operations/operations.service.spec.ts`
- Create: `apps/api/src/modules/operations/operations.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/operations/operations.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationsService } from './operations.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  task: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  incident: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  maintenanceOrder: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
};

describe('OperationsService', () => {
  let service: OperationsService;

  beforeEach(() => {
    service = new OperationsService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listTasks', () => {
    it('returns tasks for the organisation sites', async () => {
      const tasks = [{ id: 't1', title: 'Fix lock', status: 'open' }];
      mockPrisma.task.findMany.mockResolvedValue(tasks);

      const result = await service.listTasks('org1', {});

      expect(result).toEqual(tasks);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ site: { organisationId: 'org1' } }) }),
      );
    });
  });

  describe('createTask', () => {
    it('creates a task linked to the site', async () => {
      const task = { id: 't1', title: 'Inspect unit', siteId: 's1' };
      mockPrisma.task.create.mockResolvedValue(task);

      const result = await service.createTask('org1', { siteId: 's1', title: 'Inspect unit' });

      expect(result).toEqual(task);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ siteId: 's1', title: 'Inspect unit', status: 'open' }),
      });
    });
  });

  describe('updateTask', () => {
    it('throws NotFoundException when task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null);
      await expect(service.updateTask('org1', 't1', { status: 'done' })).rejects.toThrow(NotFoundException);
    });

    it('updates the task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue({ id: 't1', siteId: 's1' });
      mockPrisma.task.update.mockResolvedValue({ id: 't1', status: 'done' });

      const result = await service.updateTask('org1', 't1', { status: 'done' });

      expect(result).toEqual({ id: 't1', status: 'done' });
    });
  });

  describe('listIncidents', () => {
    it('returns incidents for the organisation', async () => {
      mockPrisma.incident.findMany.mockResolvedValue([{ id: 'i1' }]);
      const result = await service.listIncidents('org1', {});
      expect(result).toEqual([{ id: 'i1' }]);
    });
  });

  describe('createIncident', () => {
    it('creates an incident', async () => {
      const incident = { id: 'i1', title: 'Broken lock', siteId: 's1' };
      mockPrisma.incident.create.mockResolvedValue(incident);

      const result = await service.createIncident('org1', {
        siteId: 's1', title: 'Broken lock', description: '', severity: 'medium',
      });

      expect(result).toEqual(incident);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
npx vitest run --testPathPattern=operations.service.spec --no-coverage
```

Expected: FAIL — `OperationsService` not found.

- [ ] **Step 3: Implement OperationsService**

Create `apps/api/src/modules/operations/operations.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async listTasks(orgId: string, filters: { siteId?: string; status?: string }) {
    return this.prisma.task.findMany({
      where: {
        site: { organisationId: orgId },
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async createTask(orgId: string, data: { siteId: string; title: string; notes?: string; assigneeId?: string; dueAt?: string }) {
    return this.prisma.task.create({
      data: {
        siteId: data.siteId,
        title: data.title,
        notes: data.notes,
        assigneeId: data.assigneeId,
        dueAt: data.dueAt ? new Date(data.dueAt) : undefined,
        status: 'open',
      },
    });
  }

  async updateTask(orgId: string, taskId: string, data: { status?: string; notes?: string; assigneeId?: string }) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, site: { organisationId: orgId } },
    });
    if (!task) throw new NotFoundException('TASK_NOT_FOUND');
    return this.prisma.task.update({ where: { id: taskId }, data: data as any });
  }

  async listIncidents(orgId: string, filters: { siteId?: string; status?: string }) {
    return this.prisma.incident.findMany({
      where: {
        site: { organisationId: orgId },
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIncident(orgId: string, data: { siteId: string; unitId?: string; title: string; description: string; severity: string }) {
    return this.prisma.incident.create({
      data: {
        siteId: data.siteId,
        unitId: data.unitId,
        title: data.title,
        description: data.description,
        severity: data.severity,
        status: 'open',
      },
    });
  }

  async updateIncident(orgId: string, incidentId: string, data: { status?: string; resolvedAt?: string }) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, site: { organisationId: orgId } },
    });
    if (!incident) throw new NotFoundException('INCIDENT_NOT_FOUND');
    return this.prisma.incident.update({
      where: { id: incidentId },
      data: {
        ...(data.status ? { status: data.status as any } : {}),
        ...(data.resolvedAt ? { resolvedAt: new Date(data.resolvedAt) } : {}),
      },
    });
  }

  async listMaintenanceOrders(orgId: string, filters: { siteId?: string }) {
    return this.prisma.maintenanceOrder.findMany({
      where: {
        site: { organisationId: orgId },
        ...(filters.siteId ? { siteId: filters.siteId } : {}),
      },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async createMaintenanceOrder(orgId: string, data: { siteId: string; unitId?: string; title: string; scheduledFor?: string; requestedById: string }) {
    return this.prisma.maintenanceOrder.create({
      data: {
        siteId: data.siteId,
        unitId: data.unitId,
        title: data.title,
        requestedById: data.requestedById,
        scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : undefined,
        status: 'open',
      },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --testPathPattern=operations.service.spec --no-coverage
```

Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/operations/operations.service.ts \
        apps/api/src/modules/operations/operations.service.spec.ts
git commit -m "feat(ops): OperationsService — tasks, incidents, maintenance (TDD)"
git push
```

---

## Task 2: ApiKeyService (TDD)

**Files:**
- Create: `apps/api/src/modules/webhooks/api-key.service.spec.ts`
- Create: `apps/api/src/modules/webhooks/api-key.service.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/modules/webhooks/api-key.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from './api-key.service';

const mockPrisma = {
  apiClient: { findMany: vi.fn(), create: vi.fn() },
  apiKey: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
};

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    service = new ApiKeyService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listClients', () => {
    it('returns API clients for the organisation', async () => {
      mockPrisma.apiClient.findMany.mockResolvedValue([{ id: 'c1', name: 'Mobile App' }]);
      const result = await service.listClients('org1');
      expect(result).toEqual([{ id: 'c1', name: 'Mobile App' }]);
      expect(mockPrisma.apiClient.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1' },
        include: { keys: { where: { revoked: false } } },
      });
    });
  });

  describe('createClient', () => {
    it('creates a client and returns the raw key on first creation', async () => {
      const client = { id: 'c1', organisationId: 'org1', name: 'Mobile App', scopes: [] };
      mockPrisma.apiClient.create.mockResolvedValue(client);
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'k1' });

      const result = await service.createClient('org1', { name: 'Mobile App', scopes: [] });

      expect(result.client).toEqual(client);
      expect(result.rawKey).toBeDefined();
      expect(typeof result.rawKey).toBe('string');
    });
  });

  describe('revokeKey', () => {
    it('marks the key as revoked', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({});
      await service.revokeKey('k1');
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { revoked: true },
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run --testPathPattern=api-key.service.spec --no-coverage
```

Expected: FAIL.

- [ ] **Step 3: Implement ApiKeyService**

Create `apps/api/src/modules/webhooks/api-key.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaClient) {}

  async listClients(orgId: string) {
    return this.prisma.apiClient.findMany({
      where: { organisationId: orgId },
      include: { keys: { where: { revoked: false } } },
    });
  }

  async createClient(orgId: string, data: { name: string; scopes: string[] }) {
    const client = await this.prisma.apiClient.create({
      data: { organisationId: orgId, name: data.name, scopes: data.scopes },
    });

    const rawKey = `sl_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    await this.prisma.apiKey.create({
      data: { clientId: client.id, keyHash, expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), revoked: false },
    });

    return { client, rawKey };
  }

  async revokeKey(keyId: string) {
    await this.prisma.apiKey.update({ where: { id: keyId }, data: { revoked: true } });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run --testPathPattern=api-key.service.spec --no-coverage
```

Expected: PASS — 3 tests passing.

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/webhooks/api-key.service.ts \
        apps/api/src/modules/webhooks/api-key.service.spec.ts
git commit -m "feat(admin): ApiKeyService — create client, list keys, revoke (TDD)"
git push
```

---

## Task 3: Operations, Reporting, Webhooks, and Audit Controllers

**Files:**
- Create: `apps/api/src/modules/operations/operations.controller.ts`
- Create: `apps/api/src/modules/reporting/reporting.controller.ts`
- Create: `apps/api/src/modules/webhooks/webhooks.controller.ts`
- Create: `apps/api/src/modules/audit/audit.controller.ts`

- [ ] **Step 1: Create OperationsController**

Create `apps/api/src/modules/operations/operations.controller.ts`:

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';

interface MemberContext { userId: string; role: string; organisationId: string; }

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class OperationsController {
  constructor(
    private readonly ops: OperationsService,
    private readonly inspections: InspectionService,
  ) {}

  @Get('tasks')
  @ApiOperation({ summary: 'List tasks' })
  listTasks(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.ops.listTasks(orgId, { siteId, status });
  }

  @Post('tasks')
  @ApiOperation({ summary: 'Create a task' })
  createTask(
    @Param('organisationId') orgId: string,
    @Body() body: { siteId: string; title: string; notes?: string; assigneeId?: string; dueAt?: string },
  ) {
    return this.ops.createTask(orgId, body);
  }

  @Patch('tasks/:taskId')
  @ApiOperation({ summary: 'Update task status or assignee' })
  updateTask(
    @Param('organisationId') orgId: string,
    @Param('taskId') taskId: string,
    @Body() body: { status?: string; notes?: string; assigneeId?: string },
  ) {
    return this.ops.updateTask(orgId, taskId, body);
  }

  @Get('incidents')
  @ApiOperation({ summary: 'List incidents' })
  listIncidents(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('status') status?: string,
  ) {
    return this.ops.listIncidents(orgId, { siteId, status });
  }

  @Post('incidents')
  @ApiOperation({ summary: 'Report an incident' })
  createIncident(
    @Param('organisationId') orgId: string,
    @Body() body: { siteId: string; unitId?: string; title: string; description: string; severity: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.ops.createIncident(orgId, { ...body, reportedById: member.userId } as any);
  }

  @Patch('incidents/:incidentId')
  @ApiOperation({ summary: 'Update incident status' })
  updateIncident(
    @Param('organisationId') orgId: string,
    @Param('incidentId') incidentId: string,
    @Body() body: { status?: string; resolvedAt?: string },
  ) {
    return this.ops.updateIncident(orgId, incidentId, body);
  }

  @Get('maintenance-orders')
  @ApiOperation({ summary: 'List maintenance orders' })
  listMaintenanceOrders(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.ops.listMaintenanceOrders(orgId, { siteId });
  }

  @Post('maintenance-orders')
  @ApiOperation({ summary: 'Create a maintenance order' })
  createMaintenanceOrder(
    @Param('organisationId') orgId: string,
    @Body() body: { siteId: string; unitId?: string; title: string; scheduledFor?: string },
    @CurrentMember() member: MemberContext,
  ) {
    return this.ops.createMaintenanceOrder(orgId, { ...body, requestedById: member.userId });
  }

  @Post('inspection-runs')
  @ApiOperation({ summary: 'Start an inspection run' })
  createInspectionRun(
    @Body() body: { unitId: string; siteId: string; kind: string; checklist: { code: string; result: string; note?: string }[] },
  ) {
    return this.inspections.createInspectionRun(body.unitId, body.siteId, body.kind, body.checklist as any);
  }
}
```

- [ ] **Step 2: Create ReportingController**

Create `apps/api/src/modules/reporting/reporting.controller.ts`:

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ReportingService } from './reporting.service';
import { PrismaClient } from '@prisma/client';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/reports')
export class ReportingController {
  constructor(
    private readonly reporting: ReportingService,
    private readonly prisma: PrismaClient,
  ) {}

  @Get('occupancy')
  @ApiOperation({ summary: 'Occupancy report for all sites in the organisation' })
  async getOccupancy(
    @Param('organisationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId, deletedAt: null }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
    const toDate = to ? new Date(to) : new Date();
    return this.reporting.getOccupancyReport(siteIds, fromDate, toDate);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue report for all sites in the organisation' })
  async getRevenue(
    @Param('organisationId') orgId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const sites = await this.prisma.site.findMany({ where: { organisationId: orgId, deletedAt: null }, select: { id: true } });
    const siteIds = sites.map((s) => s.id);
    const fromDate = from ? new Date(from) : new Date(new Date().setDate(1));
    const toDate = to ? new Date(to) : new Date();
    return this.reporting.getRevenueReport(siteIds, fromDate, toDate);
  }
}
```

- [ ] **Step 3: Create WebhooksController**

Create `apps/api/src/modules/webhooks/webhooks.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { ApiKeyService } from './api-key.service';
import { PrismaClient } from '@prisma/client';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId')
export class WebhooksController {
  constructor(
    private readonly apiKeys: ApiKeyService,
    private readonly prisma: PrismaClient,
  ) {}

  // ─── Webhooks ────────────────────────────────────────────────────────────────

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhook endpoints' })
  listWebhooks(@Param('organisationId') orgId: string) {
    return this.prisma.webhookEndpoint.findMany({ where: { organisationId: orgId } });
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Register a webhook endpoint' })
  createWebhook(
    @Param('organisationId') orgId: string,
    @Body() body: { url: string; events: string[]; secret: string },
  ) {
    return this.prisma.webhookEndpoint.create({
      data: { organisationId: orgId, url: body.url, events: body.events, secret: body.secret, active: true },
    });
  }

  @Delete('webhooks/:webhookId')
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  async deleteWebhook(@Param('organisationId') orgId: string, @Param('webhookId') webhookId: string) {
    await this.prisma.webhookEndpoint.deleteMany({ where: { id: webhookId, organisationId: orgId } });
    return { ok: true };
  }

  // ─── API Keys ────────────────────────────────────────────────────────────────

  @Get('api-keys')
  @ApiOperation({ summary: 'List API clients and keys' })
  listApiKeys(@Param('organisationId') orgId: string) {
    return this.apiKeys.listClients(orgId);
  }

  @Post('api-keys')
  @ApiOperation({ summary: 'Create API client — raw key returned once' })
  createApiKey(
    @Param('organisationId') orgId: string,
    @Body() body: { name: string; scopes: string[] },
  ) {
    return this.apiKeys.createClient(orgId, body);
  }

  @Delete('api-keys/:keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeApiKey(@Param('keyId') keyId: string) {
    return this.apiKeys.revokeKey(keyId);
  }
}
```

- [ ] **Step 4: Create AuditController**

Create `apps/api/src/modules/audit/audit.controller.ts`:

```typescript
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { OrganisationGuard } from '../../common/guards/organisation.guard';
import { AuditService } from './audit.service';
import { PrismaClient } from '@prisma/client';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganisationGuard)
@Controller('v1/organisations/:organisationId/audit')
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly prisma: PrismaClient,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Paginated audit log for the organisation' })
  async getAuditLog(
    @Param('organisationId') orgId: string,
    @Query('siteId') siteId?: string,
    @Query('action') action?: string,
    @Query('subjectType') subjectType?: string,
    @Query('page') page = '1',
  ) {
    const take = 50;
    const skip = (parseInt(page) - 1) * take;

    const sites = await this.prisma.site.findMany({
      where: { organisationId: orgId, deletedAt: null },
      select: { id: true },
    });
    const orgSiteIds = sites.map((s) => s.id);

    return this.prisma.auditEvent.findMany({
      where: {
        ...(siteId ? { siteId } : { siteId: { in: orgSiteIds } }),
        ...(action ? { action: { contains: action } } : {}),
        ...(subjectType ? { subjectType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });
  }
}
```

- [ ] **Step 5: Commit and push**

```bash
git add apps/api/src/modules/operations/operations.controller.ts \
        apps/api/src/modules/reporting/reporting.controller.ts \
        apps/api/src/modules/webhooks/webhooks.controller.ts \
        apps/api/src/modules/audit/audit.controller.ts
git commit -m "feat(ops,reports,admin,audit): add controllers for operations, reporting, webhooks, audit"
git push
```

---

## Task 4: Wire all new services and controllers into modules

**Files:**
- Modify: `apps/api/src/modules/operations/operations.module.ts`
- Modify: `apps/api/src/modules/reporting/reporting.module.ts`
- Modify: `apps/api/src/modules/webhooks/webhooks.module.ts`
- Modify: `apps/api/src/modules/audit/audit.module.ts`

- [ ] **Step 1: Read each existing module file to understand current structure**

Check these files before editing:
- `apps/api/src/modules/operations/operations.module.ts`
- `apps/api/src/modules/reporting/reporting.module.ts`
- `apps/api/src/modules/webhooks/webhooks.module.ts`
- `apps/api/src/modules/audit/audit.module.ts`

- [ ] **Step 2: Update operations.module.ts**

Add `OperationsService`, `OperationsController`, and `PrismaClient` provider. Import `AuthModule` for guards.

The updated module should look like:

```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { InspectionService } from './inspection.service';
import { OperationsService } from './operations.service';
import { OperationsController } from './operations.controller';

@Module({
  imports: [AuthModule, AuditModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    InspectionService,
    OperationsService,
  ],
  controllers: [OperationsController],
  exports: [InspectionService, OperationsService],
})
export class OperationsModule {}
```

- [ ] **Step 3: Update reporting.module.ts**

Add `ReportingController` and `PrismaClient`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    ReportingService,
  ],
  controllers: [ReportingController],
  exports: [ReportingService],
})
export class ReportingModule {}
```

- [ ] **Step 4: Update webhooks.module.ts**

Add `WebhooksController`, `ApiKeyService`, `PrismaClient`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { ApiKeyService } from './api-key.service';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    WebhookDeliveryService,
    ApiKeyService,
  ],
  controllers: [WebhooksController],
  exports: [WebhookDeliveryService, ApiKeyService],
})
export class WebhooksModule {}
```

- [ ] **Step 5: Update audit.module.ts**

Add `AuditController`:

```typescript
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthModule } from '../auth/auth.module';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';

@Module({
  imports: [AuthModule],
  providers: [
    { provide: PrismaClient, useValue: new PrismaClient() },
    AuditService,
  ],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
```

- [ ] **Step 6: Build to verify no TypeScript errors**

```bash
cd apps/api
npx nest build 2>&1 | tail -5
```

Expected: Exit 0, no errors.

- [ ] **Step 7: Run full test suite**

```bash
npx vitest run --no-coverage 2>&1 | tail -6
```

Expected: All tests pass.

- [ ] **Step 8: Commit and push**

```bash
git add apps/api/src/modules/operations/operations.module.ts \
        apps/api/src/modules/reporting/reporting.module.ts \
        apps/api/src/modules/webhooks/webhooks.module.ts \
        apps/api/src/modules/audit/audit.module.ts
git commit -m "feat(ops,reports,admin,audit): wire controllers and services into modules"
git push
```

---

## Task 5: API Hardening (main.ts)

**Files:**
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Install helmet**

```bash
cd apps/api
pnpm add helmet
pnpm add -D @types/helmet
```

Expected: `helmet` appears in `apps/api/package.json` dependencies.

- [ ] **Step 2: Read existing main.ts**

Read `apps/api/src/main.ts` to see current bootstrap code before editing.

- [ ] **Step 3: Update main.ts**

Replace the contents of `apps/api/src/main.ts` with the hardened version. The key changes are helmet, CORS, and swagger setup:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet.default());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('SiteLager API')
    .setDescription('The SiteLager REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
```

- [ ] **Step 4: Add security event recording to AuthService**

Open `apps/api/src/modules/auth/auth.service.ts`. Add a private method to record security events and call it on failed login:

In the `login` method, after the `INVALID_CREDENTIALS` throw, add a security event record. At the top of the login method, wrap the credential check to log failures:

```typescript
// In auth.service.ts — update the login method to record failed login events:
async login(dto: LoginDto): Promise<AuthResponseDto> {
  const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (!user?.passwordHash) {
    await this.recordSecurityEvent('login_failed', null, { email: dto.email, reason: 'user_not_found' });
    throw new UnauthorizedException('INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!valid) {
    await this.recordSecurityEvent('login_failed', user.id, { reason: 'wrong_password' });
    throw new UnauthorizedException('INVALID_CREDENTIALS');
  }

  // ... rest of existing login logic
}

private async recordSecurityEvent(eventType: string, actorId: string | null, metadata: object) {
  try {
    await this.prisma.securityEvent.create({ data: { eventType, actorId, metadata } });
  } catch {
    // non-critical — never throw
  }
}
```

- [ ] **Step 5: Build and verify**

```bash
npx nest build 2>&1 | tail -5
```

Expected: No errors.

- [ ] **Step 6: Commit and push**

```bash
git add apps/api/src/main.ts apps/api/src/modules/auth/auth.service.ts apps/api/package.json
git commit -m "feat(hardening): helmet, CORS, ValidationPipe global, security event logging on failed login"
git push
```

---

## Task 6: Operations Frontend Pages

**Files:**
- Create: `apps/web/src/app/tasks/page.tsx`
- Create: `apps/web/src/app/tasks/TaskActions.tsx`
- Create: `apps/web/src/app/api/tasks/route.ts`
- Create: `apps/web/src/app/api/tasks/[taskId]/route.ts`
- Create: `apps/web/src/app/incidents/page.tsx`
- Create: `apps/web/src/app/incidents/IncidentActions.tsx`
- Create: `apps/web/src/app/api/incidents/route.ts`
- Create: `apps/web/src/app/api/incidents/[incidentId]/route.ts`

- [ ] **Step 1: Create tasks page**

Create `apps/web/src/app/tasks/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TaskActions from './TaskActions';
import Link from 'next/link';

interface Task { id: string; title: string; status: string; dueAt: string | null; siteId: string; notes: string | null; }

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default async function TasksPage() {
  const user = await requireAuth();
  const tasks = await serverFetch<Task[]>(`/v1/organisations/${user.organisationId}/tasks`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          </div>
          <TaskActions type="create" />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {tasks.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No tasks yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Title</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Due</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{task.title}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? ''}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {task.dueAt ? new Date(task.dueAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <TaskActions type="update" taskId={task.id} currentStatus={task.status} />
                    </td>
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

- [ ] **Step 2: Create TaskActions client component**

Create `apps/web/src/app/tasks/TaskActions.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  type: 'create' | 'update';
  taskId?: string;
  currentStatus?: string;
}

const NEXT_STATUSES: Record<string, string[]> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

export default function TaskActions({ type, taskId, currentStatus }: Props) {
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

  if (type === 'create') {
    return showForm ? (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction('/api/tasks', 'POST', { siteId: form.get('siteId'), title: form.get('title'), dueAt: form.get('dueAt') || undefined });
      }} className="flex gap-2 items-end">
        <input name="siteId" placeholder="Site ID" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-32" />
        <input name="title" placeholder="Task title" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48" />
        <input name="dueAt" type="date" className="border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
          {loading ? '…' : 'Add'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
        {error && <p className="text-red-600 text-xs">{error}</p>}
      </form>
    ) : (
      <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
        + New task
      </button>
    );
  }

  const nextStatuses = NEXT_STATUSES[currentStatus ?? 'open'] ?? [];
  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex gap-1">
      {nextStatuses.map((status) => (
        <button key={status} onClick={() => doAction(`/api/tasks/${taskId}`, 'PATCH', { status })}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded disabled:opacity-50">
          {status.replace('_', ' ')}
        </button>
      ))}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Create task BFF routes**

Create `apps/web/src/app/api/tasks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/tasks`, 'POST', auth.token, body);
}
```

Create `apps/web/src/app/api/tasks/[taskId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { taskId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/tasks/${params.taskId}`, 'PATCH', auth.token, body);
}
```

- [ ] **Step 4: Create incidents page**

Create `apps/web/src/app/incidents/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import IncidentActions from './IncidentActions';
import Link from 'next/link';

interface Incident { id: string; title: string; status: string; severity: string; siteId: string; createdAt: string; }

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default async function IncidentsPage() {
  const user = await requireAuth();
  const incidents = await serverFetch<Incident[]>(`/v1/organisations/${user.organisationId}/incidents`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
            <h1 className="text-2xl font-bold text-slate-900">Incidents</h1>
          </div>
          <IncidentActions type="report" />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {incidents.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No incidents reported.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">Title</th>
                  <th className="text-left px-6 py-3">Severity</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Reported</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{inc.title}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_COLORS[inc.severity] ?? 'bg-slate-100 text-slate-500'}`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 capitalize">{inc.status.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{new Date(inc.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {inc.status !== 'closed' && (
                        <IncidentActions type="update" incidentId={inc.id} currentStatus={inc.status} />
                      )}
                    </td>
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

- [ ] **Step 5: Create IncidentActions client component**

Create `apps/web/src/app/incidents/IncidentActions.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  type: 'report' | 'update';
  incidentId?: string;
  currentStatus?: string;
}

export default function IncidentActions({ type, incidentId, currentStatus }: Props) {
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

  if (type === 'report') {
    return showForm ? (
      <form onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        await doAction('/api/incidents', 'POST', {
          siteId: form.get('siteId'),
          title: form.get('title'),
          description: form.get('description') || '',
          severity: form.get('severity'),
        });
      }} className="flex gap-2 items-end flex-wrap justify-end">
        <input name="siteId" placeholder="Site ID" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-28" />
        <input name="title" placeholder="Incident title" required className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-40" />
        <select name="severity" className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="submit" disabled={loading} className="bg-red-600 text-white text-sm font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
          {loading ? '…' : 'Report'}
        </button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500 px-2 py-2">Cancel</button>
        {error && <p className="text-red-600 text-xs w-full">{error}</p>}
      </form>
    ) : (
      <button onClick={() => setShowForm(true)} className="bg-red-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-700">
        Report incident
      </button>
    );
  }

  const transitions: Record<string, string[]> = {
    open: ['investigating', 'resolved'],
    investigating: ['resolved'],
    resolved: ['closed'],
  };
  const next = transitions[currentStatus ?? 'open'] ?? [];
  if (next.length === 0) return null;

  return (
    <div className="flex gap-1">
      {next.map((status) => (
        <button key={status} onClick={() => doAction(`/api/incidents/${incidentId}`, 'PATCH', { status })}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded disabled:opacity-50">
          {status}
        </button>
      ))}
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Create incident BFF routes**

Create `apps/web/src/app/api/incidents/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/incidents`, 'POST', auth.token, body);
}
```

Create `apps/web/src/app/api/incidents/[incidentId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { incidentId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/incidents/${params.incidentId}`, 'PATCH', auth.token, body);
}
```

- [ ] **Step 7: Commit and push**

```bash
git add apps/web/src/app/tasks/ apps/web/src/app/incidents/ \
        apps/web/src/app/api/tasks/ apps/web/src/app/api/incidents/
git commit -m "feat(web): tasks and incidents pages + API routes"
git push
```

---

## Task 7: Reports, Audit, Webhooks, and API Keys Frontend Pages

**Files:**
- Create: `apps/web/src/app/reports/page.tsx`
- Create: `apps/web/src/app/audit/page.tsx`
- Create: `apps/web/src/app/settings/webhooks/page.tsx`
- Create: `apps/web/src/app/settings/webhooks/WebhookActions.tsx`
- Create: `apps/web/src/app/api/settings/webhooks/route.ts`
- Create: `apps/web/src/app/api/settings/webhooks/[webhookId]/route.ts`
- Create: `apps/web/src/app/settings/api-keys/page.tsx`
- Create: `apps/web/src/app/settings/api-keys/ApiKeyActions.tsx`
- Create: `apps/web/src/app/api/settings/api-keys/route.ts`
- Create: `apps/web/src/app/api/settings/api-keys/[apiKeyId]/route.ts`

- [ ] **Step 1: Reports page**

Create `apps/web/src/app/reports/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface OccupancyItem { siteId: string; occupancyPct: number; totalUnits: number; occupiedUnits: number; }
interface RevenueItem { siteId: string; totalMinor: number; currency: string; }

export default async function ReportsPage() {
  const user = await requireAuth();
  const orgId = user.organisationId;

  const [occupancy, revenue] = await Promise.all([
    serverFetch<OccupancyItem[]>(`/v1/organisations/${orgId}/reports/occupancy`).catch(() => []),
    serverFetch<RevenueItem[]>(`/v1/organisations/${orgId}/reports/revenue`).catch(() => []),
  ]);

  const totalRevenue = revenue.reduce((sum, r) => sum + r.totalMinor, 0);
  const avgOccupancy = occupancy.length > 0
    ? Math.round(occupancy.reduce((sum, o) => sum + o.occupancyPct, 0) / occupancy.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Avg Occupancy</p>
            <p className="text-3xl font-bold text-slate-900">{avgOccupancy}%</p>
          </div>
          <div className="bg-white rounded-xl shadow p-5">
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Revenue (this month)</p>
            <p className="text-3xl font-bold text-slate-900">€{(totalRevenue / 100).toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Occupancy by site</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Site ID</th>
                <th className="text-left px-6 py-3">Occupancy</th>
                <th className="text-left px-6 py-3">Occupied / Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {occupancy.map((o) => (
                <tr key={o.siteId} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{o.siteId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${o.occupancyPct}%` }} />
                      </div>
                      <span className="text-slate-700 font-medium">{o.occupancyPct}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{o.occupiedUnits} / {o.totalUnits}</td>
                </tr>
              ))}
              {occupancy.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Audit log page**

Create `apps/web/src/app/audit/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';

interface AuditEvent {
  id: string; action: string; subjectType: string; subjectId: string;
  actorId: string | null; siteId: string | null; createdAt: string;
}

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
  const user = await requireAuth();
  const page = searchParams.page ?? '1';
  const events = await serverFetch<AuditEvent[]>(
    `/v1/organisations/${user.organisationId}/audit?page=${page}`,
  ).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Dashboard</Link>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-6 py-3">Action</th>
                <th className="text-left px-6 py-3">Subject</th>
                <th className="text-left px-6 py-3">Actor</th>
                <th className="text-left px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-blue-700">{e.action}</td>
                  <td className="px-6 py-3 text-slate-600 text-xs">{e.subjectType}:{e.subjectId.slice(0, 8)}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs font-mono">{e.actorId?.slice(0, 8) ?? 'system'}</td>
                  <td className="px-6 py-3 text-slate-400 text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">No audit events yet.</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-slate-100 flex gap-4">
            {parseInt(page) > 1 && (
              <Link href={`?page=${parseInt(page) - 1}`} className="text-sm text-blue-600 hover:underline">&larr; Previous</Link>
            )}
            {events.length === 50 && (
              <Link href={`?page=${parseInt(page) + 1}`} className="text-sm text-blue-600 hover:underline">Next &rarr;</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Webhooks settings page**

Create `apps/web/src/app/settings/webhooks/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import WebhookActions from './WebhookActions';
import Link from 'next/link';

interface Webhook { id: string; url: string; events: string[]; active: boolean; }

export default async function WebhooksPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');

  const webhooks = await serverFetch<Webhook[]>(`/v1/organisations/${user.organisationId}/webhooks`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Settings</Link>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
        </div>

        <div className="bg-white rounded-2xl shadow mb-6 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Add endpoint</h2>
          <WebhookActions type="create" />
        </div>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
          {webhooks.length === 0 ? (
            <p className="text-slate-500 text-center p-8">No webhook endpoints configured.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-6 py-3">URL</th>
                  <th className="text-left px-6 py-3">Events</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs text-slate-700">{wh.url}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{wh.events.join(', ')}</td>
                    <td className="px-6 py-4 text-right">
                      <WebhookActions type="delete" webhookId={wh.id} />
                    </td>
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

- [ ] **Step 4: WebhookActions client component**

Create `apps/web/src/app/settings/webhooks/WebhookActions.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props { type: 'create' | 'delete'; webhookId?: string; }

export default function WebhookActions({ type, webhookId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (type === 'delete') {
    return (
      <button onClick={() => { if (confirm('Delete this webhook?')) doAction(`/api/settings/webhooks/${webhookId}`, 'DELETE'); }}
        disabled={loading} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : 'Delete'}
      </button>
    );
  }

  return (
    <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      await doAction('/api/settings/webhooks', 'POST', {
        url: form.get('url'),
        events: (form.get('events') as string).split(',').map((s) => s.trim()).filter(Boolean),
        secret: form.get('secret'),
      });
      (e.target as HTMLFormElement).reset();
    }} className="flex gap-2 items-end flex-wrap">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Endpoint URL</label>
        <input name="url" type="url" required placeholder="https://yourapp.com/webhooks"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-64" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Events (comma-separated)</label>
        <input name="events" required placeholder="invoice.paid, agreement.signed"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-52" />
      </div>
      <div>
        <label className="block text-xs text-slate-600 mb-1">Secret</label>
        <input name="secret" type="password" required placeholder="webhook_secret"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-36" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Adding…' : 'Add endpoint'}
      </button>
      {error && <p className="text-red-600 text-xs w-full">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 5: Webhook BFF routes**

Create `apps/web/src/app/api/settings/webhooks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/webhooks`, 'POST', auth.token, body);
}
```

Create `apps/web/src/app/api/settings/webhooks/[webhookId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function DELETE(_request: NextRequest, { params }: { params: { webhookId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/webhooks/${params.webhookId}`, 'DELETE', auth.token);
}
```

- [ ] **Step 6: API Keys settings page**

Create `apps/web/src/app/settings/api-keys/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { redirect } from 'next/navigation';
import ApiKeyActions from './ApiKeyActions';
import Link from 'next/link';

interface ApiKey { id: string; revoked: boolean; expiresAt: string; lastUsedAt: string | null; }
interface ApiClient { id: string; name: string; scopes: string[]; keys: ApiKey[]; }

export default async function ApiKeysPage() {
  const user = await requireAuth();
  if (user.role !== 'owner') redirect('/dashboard');

  const clients = await serverFetch<ApiClient[]>(`/v1/organisations/${user.organisationId}/api-keys`).catch(() => []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700 mb-1 block">&larr; Settings</Link>
          <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        </div>

        <div className="bg-white rounded-2xl shadow mb-6 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Create API client</h2>
          <ApiKeyActions type="create" />
        </div>

        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{client.name}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Scopes: {client.scopes.join(', ') || 'none'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {client.keys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                    <p className="text-slate-500 text-xs">
                      Expires {new Date(key.expiresAt).toLocaleDateString()} ·{' '}
                      Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'never'}
                    </p>
                    <ApiKeyActions type="revoke" apiKeyId={key.id} />
                  </div>
                ))}
                {client.keys.length === 0 && <p className="text-slate-400 text-xs">No active keys.</p>}
              </div>
            </div>
          ))}
          {clients.length === 0 && (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <p className="text-slate-500">No API clients yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: ApiKeyActions client component**

Create `apps/web/src/app/settings/api-keys/ApiKeyActions.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Props { type: 'create' | 'revoke'; apiKeyId?: string; }

export default function ApiKeyActions({ type, apiKeyId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  if (type === 'revoke') {
    return (
      <button
        onClick={async () => {
          if (!confirm('Revoke this key? This cannot be undone.')) return;
          setLoading(true);
          try {
            const res = await fetch(`/api/settings/api-keys/${apiKeyId}`, { method: 'DELETE' });
            if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
            router.refresh();
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed');
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
        className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
        {loading ? '…' : 'Revoke'}
      </button>
    );
  }

  if (newKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm font-medium text-yellow-800 mb-2">Copy your API key — it will not be shown again:</p>
        <code className="block bg-white border border-yellow-200 rounded px-3 py-2 text-xs font-mono break-all text-slate-800">
          {newKey}
        </code>
        <button onClick={() => { setNewKey(null); router.refresh(); }}
          className="mt-3 text-sm text-yellow-700 hover:text-yellow-900 underline">
          I have copied the key
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      const form = new FormData(e.currentTarget);
      try {
        const res = await fetch('/api/settings/api-keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.get('name'), scopes: [] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Failed');
        setNewKey(data.rawKey);
        (e.target as HTMLFormElement).reset();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed');
      } finally {
        setLoading(false);
      }
    }} className="flex gap-2 items-end">
      <div>
        <label className="block text-xs text-slate-600 mb-1">Client name</label>
        <input name="name" type="text" required placeholder="Mobile App"
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48" />
      </div>
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50">
        {loading ? 'Creating…' : 'Create key'}
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </form>
  );
}
```

- [ ] **Step 8: API Key BFF routes**

Create `apps/web/src/app/api/settings/api-keys/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/api-keys`, 'POST', auth.token, body);
}
```

Create `apps/web/src/app/api/settings/api-keys/[apiKeyId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function DELETE(_request: NextRequest, { params }: { params: { apiKeyId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/api-keys/${params.apiKeyId}`, 'DELETE', auth.token);
}
```

- [ ] **Step 9: Commit and push**

```bash
git add apps/web/src/app/reports/ apps/web/src/app/audit/ \
        apps/web/src/app/settings/webhooks/ apps/web/src/app/settings/api-keys/ \
        apps/web/src/app/api/settings/
git commit -m "feat(web): reports, audit log, webhooks, and API keys pages"
git push
```

---

## Task 8: Dashboard Update and Final Verification

**Files:**
- Modify: `apps/web/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add operations and reports links to dashboard**

Read `apps/web/src/app/dashboard/page.tsx` first, then update the cards section to include links to Reports, Tasks, and Incidents:

Replace the `cards` array with:

```typescript
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
  ...(user.role !== 'tenant' ? [
    { label: 'Tasks', count: null, href: '/tasks', cta: 'View tasks →' },
    { label: 'Incidents', count: null, href: '/incidents', cta: 'View incidents →' },
    { label: 'Reports', count: null, href: '/reports', cta: 'View reports →' },
    { label: 'Audit log', count: null, href: '/audit', cta: 'View audit log →' },
  ] : []),
];
```

Update the card render to handle `null` counts:

```tsx
<p className="text-3xl font-bold text-slate-900 mb-2">
  {card.count !== null ? card.count : '→'}
</p>
```

Also update the settings links in the header to include webhooks and API keys:

```tsx
{user.role === 'owner' && (
  <div className="flex items-center gap-4">
    <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">Settings</Link>
    <Link href="/settings/webhooks" className="text-sm text-slate-500 hover:text-slate-700">Webhooks</Link>
    <Link href="/settings/api-keys" className="text-sm text-slate-500 hover:text-slate-700">API Keys</Link>
  </div>
)}
```

- [ ] **Step 2: Commit and push dashboard update**

```bash
git add apps/web/src/app/dashboard/page.tsx
git commit -m "feat(web): add operations and admin links to dashboard"
git push
```

- [ ] **Step 3: Run full test suite**

```bash
cd apps/api
npx vitest run --no-coverage 2>&1 | tail -8
```

Expected: All tests pass.

- [ ] **Step 4: Build verification**

```bash
npx nest build 2>&1 | tail -3
```

Expected: No errors.

- [ ] **Step 5: Final commit and push**

```bash
git add .
git commit -m "chore: Plan 6 complete — operations, reports, admin, hardening"
git push
```

---

## Self-Review Checklist

**Backend endpoints:**
- [ ] `GET /v1/organisations/:orgId/tasks` — list tasks (filter by siteId, status)
- [ ] `POST /v1/organisations/:orgId/tasks` — create task
- [ ] `PATCH /v1/organisations/:orgId/tasks/:id` — update task
- [ ] `GET /v1/organisations/:orgId/incidents` — list incidents
- [ ] `POST /v1/organisations/:orgId/incidents` — report incident
- [ ] `PATCH /v1/organisations/:orgId/incidents/:id` — update incident status
- [ ] `GET /v1/organisations/:orgId/maintenance-orders` — list orders
- [ ] `POST /v1/organisations/:orgId/maintenance-orders` — create order
- [ ] `POST /v1/organisations/:orgId/inspection-runs` — start inspection
- [ ] `GET /v1/organisations/:orgId/reports/occupancy` — occupancy report
- [ ] `GET /v1/organisations/:orgId/reports/revenue` — revenue report
- [ ] `GET /v1/organisations/:orgId/webhooks` — list webhooks
- [ ] `POST /v1/organisations/:orgId/webhooks` — register webhook
- [ ] `DELETE /v1/organisations/:orgId/webhooks/:id` — delete webhook
- [ ] `GET /v1/organisations/:orgId/api-keys` — list API clients
- [ ] `POST /v1/organisations/:orgId/api-keys` — create client + key (raw key in response)
- [ ] `DELETE /v1/organisations/:orgId/api-keys/:id` — revoke key
- [ ] `GET /v1/organisations/:orgId/audit` — paginated audit log

**Frontend pages:**
- [ ] `/tasks` — task list with status transitions
- [ ] `/incidents` — incident report form + status updates
- [ ] `/reports` — occupancy % per site, revenue summary
- [ ] `/audit` — paginated audit event table
- [ ] `/settings/webhooks` — add/delete webhook endpoints (owner only)
- [ ] `/settings/api-keys` — create client, view keys, revoke (owner only, raw key shown once)
- [ ] `/dashboard` — links to tasks, incidents, reports, audit; header links to webhooks + API keys

**Hardening:**
- [ ] `helmet()` applied in `main.ts`
- [ ] `enableCors({ origin: FRONTEND_URL })` in `main.ts`
- [ ] `ValidationPipe({ whitelist: true, transform: true })` global
- [ ] Failed login events recorded in `SecurityEvent` table
