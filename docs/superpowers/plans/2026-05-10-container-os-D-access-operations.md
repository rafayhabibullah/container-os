# Container OS — Track D: AccessControl + Operations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the access credential lifecycle (issue on agreement activation, suspend on lockout, restore on payment), a vendor-agnostic adapter interface with a stub implementation, and the operations module (tasks, container inspections, incidents, transfers).

**Architecture:** Two NestJS modules. AccessControl listens to `agreement.activated`, `invoice.overdue`, `invoice.paid` events and manages credentials via an `AccessVendorAdapter` interface. A `StubAccessAdapter` is the default implementation. Operations owns tasks, inspection templates/runs, incidents, and unit transfers.

**Tech Stack:** NestJS 10, Prisma 5, BullMQ 5 (access queue for async credential ops), Vitest

**Prerequisites:** Phase 0 complete. Track B (Agreements) must emit `agreement.activated`. Track C (Billing) must emit `invoice.overdue` and `invoice.paid`.

---

## Files

```
apps/api/src/modules/
  access-control/
    access-control.module.ts
    access-control.service.ts
    access-control.controller.ts
    lockout.service.ts
    adapters/
      access-vendor.adapter.ts       # interface
      stub.adapter.ts                # stub implementation
    queues/
      access.queue.ts
      access.processor.ts
    access-control.service.spec.ts
    lockout.service.spec.ts
  operations/
    operations.module.ts
    operations.service.ts
    operations.controller.ts
    inspection.service.ts
    incident.service.ts
    operations.service.spec.ts
    inspection.service.spec.ts
```

---

### Task D.1: AccessVendorAdapter interface + StubAdapter

**Files:**
- Create: `apps/api/src/modules/access-control/adapters/access-vendor.adapter.ts`
- Create: `apps/api/src/modules/access-control/adapters/stub.adapter.ts`

- [ ] **Step 1: Define the adapter interface**

`apps/api/src/modules/access-control/adapters/access-vendor.adapter.ts`:
```typescript
export interface CredentialResult {
  externalRef: string;
  maskedValue: string; // e.g. "****42" for PIN last 2 digits
}

export interface AccessVendorAdapter {
  /** Issue a new credential (PIN, card, app link) for a tenant */
  issueCredential(params: {
    agreementId: string;
    credentialType: 'pin' | 'card' | 'app';
    siteId: string;
    unitId: string;
  }): Promise<CredentialResult>;

  /** Revoke a credential (lockout or move-out) */
  revokeCredential(externalRef: string): Promise<void>;

  /** Restore a previously revoked credential */
  restoreCredential(externalRef: string): Promise<void>;

  /** Sync current state from vendor — returns true if vendor is reachable */
  healthCheck(): Promise<boolean>;
}

export const ACCESS_VENDOR_ADAPTER = Symbol('AccessVendorAdapter');
```

- [ ] **Step 2: Create StubAdapter**

`apps/api/src/modules/access-control/adapters/stub.adapter.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AccessVendorAdapter, CredentialResult } from './access-vendor.adapter';

@Injectable()
export class StubAccessAdapter implements AccessVendorAdapter {
  private credentials = new Map<string, { revoked: boolean }>();

  async issueCredential(params: { agreementId: string; credentialType: string; siteId: string; unitId: string }): Promise<CredentialResult> {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const externalRef = `stub_${params.agreementId}_${Date.now()}`;
    this.credentials.set(externalRef, { revoked: false });
    return { externalRef, maskedValue: `****${pin.slice(-2)}` };
  }

  async revokeCredential(externalRef: string): Promise<void> {
    this.credentials.set(externalRef, { revoked: true });
  }

  async restoreCredential(externalRef: string): Promise<void> {
    this.credentials.set(externalRef, { revoked: false });
  }

  async healthCheck(): Promise<boolean> {
    return true; // stub is always healthy
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/access-control/adapters/
git commit -m "feat(access-control): define AccessVendorAdapter interface + StubAdapter"
```

---

### Task D.2: AccessControl service — credential lifecycle (TDD)

**Files:**
- Create: `apps/api/src/modules/access-control/access-control.service.spec.ts`
- Create: `apps/api/src/modules/access-control/access-control.service.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/access-control/access-control.service.spec.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessControlService } from './access-control.service';

const mockPrisma = {
  accessCredential: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  agreement: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'agr_01', unitId: 'u1', siteId: 's1', tenantId: 'cust_01' }) },
};
const mockAdapter = {
  issueCredential: vi.fn().mockResolvedValue({ externalRef: 'stub_agr_01', maskedValue: '****42' }),
  revokeCredential: vi.fn(),
  restoreCredential: vi.fn(),
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn(), on: vi.fn() };

const service = new AccessControlService(mockPrisma as any, mockAdapter as any, mockAudit as any, mockEventBus as any);

describe('AccessControlService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('issues credential on agreement activation', async () => {
    mockPrisma.accessCredential.create.mockResolvedValue({ id: 'cred_01', externalRef: 'stub_agr_01', maskedValue: '****42' });
    const result = await service.issueCredential('agr_01', 'pin');

    expect(mockAdapter.issueCredential).toHaveBeenCalledWith(expect.objectContaining({ agreementId: 'agr_01', credentialType: 'pin' }));
    expect(mockPrisma.accessCredential.create).toHaveBeenCalled();
    expect(result).toHaveProperty('credentialId');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'access.credential.issued' }));
  });

  it('revokes credential on lockout', async () => {
    mockPrisma.accessCredential.findUnique.mockResolvedValue({ id: 'cred_01', externalRef: 'stub_agr_01', status: 'active' });
    mockPrisma.accessCredential.update.mockResolvedValue({ id: 'cred_01', status: 'suspended' });

    await service.suspendCredential('agr_01');
    expect(mockAdapter.revokeCredential).toHaveBeenCalledWith('stub_agr_01');
    expect(mockPrisma.accessCredential.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'suspended' } }));
  });

  it('restores credential after payment', async () => {
    mockPrisma.accessCredential.findUnique.mockResolvedValue({ id: 'cred_01', externalRef: 'stub_agr_01', status: 'suspended' });
    mockPrisma.accessCredential.update.mockResolvedValue({ id: 'cred_01', status: 'active' });

    await service.restoreCredential('agr_01');
    expect(mockAdapter.restoreCredential).toHaveBeenCalledWith('stub_agr_01');
    expect(mockPrisma.accessCredential.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'active' } }));
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
cd apps/api && pnpm test src/modules/access-control/access-control.service.spec.ts
```

- [ ] **Step 3: Implement AccessControlService**

`apps/api/src/modules/access-control/access-control.service.ts`:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Inject } from '@nestjs/common';
import { AccessVendorAdapter, ACCESS_VENDOR_ADAPTER } from './adapters/access-vendor.adapter';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

@Injectable()
export class AccessControlService implements OnModuleInit {
  constructor(
    private prisma: PrismaClient,
    @Inject(ACCESS_VENDOR_ADAPTER) private adapter: AccessVendorAdapter,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  onModuleInit() {
    // Subscribe to domain events
    this.eventBus.on(Events.AGREEMENT_ACTIVATED, async (event: any) => {
      await this.issueCredential(event.payload.agreementId, 'pin');
    });

    this.eventBus.on(Events.INVOICE_OVERDUE, async (event: any) => {
      const agreements = await this.prisma.agreement.findMany({ where: { tenantId: event.payload.tenantId, status: 'active' } });
      for (const agr of agreements) await this.suspendCredential(agr.id);
    });

    this.eventBus.on(Events.INVOICE_PAID, async (event: any) => {
      const agreements = await this.prisma.agreement.findMany({ where: { tenantId: event.payload.tenantId, status: 'active' } });
      for (const agr of agreements) await this.restoreCredential(agr.id);
    });
  }

  async issueCredential(agreementId: string, credentialType: 'pin' | 'card' | 'app') {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const result = await this.adapter.issueCredential({ agreementId, credentialType, siteId: agreement.siteId, unitId: agreement.unitId });

    const credential = await this.prisma.accessCredential.create({
      data: { agreementId, credentialType, externalRef: result.externalRef, maskedValue: result.maskedValue, status: 'active' },
    });

    await this.audit.record({ action: 'access.credential.issued', subjectType: 'AccessCredential', subjectId: credential.id, siteId: agreement.siteId });

    this.eventBus.emit({
      type: Events.ACCESS_CREDENTIAL_ISSUED,
      payload: { agreementId, credentialId: credential.id, maskedValue: result.maskedValue },
      meta: { workspaceId: '', siteId: agreement.siteId, occurredAt: new Date() },
    });

    return { credentialId: credential.id, maskedValue: result.maskedValue };
  }

  async suspendCredential(agreementId: string) {
    const cred = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!cred || cred.status === 'suspended') return;

    await this.adapter.revokeCredential(cred.externalRef!);
    await this.prisma.accessCredential.update({ where: { agreementId }, data: { status: 'suspended' } });

    this.eventBus.emit({
      type: Events.ACCESS_LOCKOUT_ACTIVATED,
      payload: { agreementId },
      meta: { workspaceId: '', occurredAt: new Date() },
    });
  }

  async restoreCredential(agreementId: string) {
    const cred = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!cred || cred.status === 'active') return;

    await this.adapter.restoreCredential(cred.externalRef!);
    await this.prisma.accessCredential.update({ where: { agreementId }, data: { status: 'active' } });

    this.eventBus.emit({
      type: Events.ACCESS_LOCKOUT_DEACTIVATED,
      payload: { agreementId },
      meta: { workspaceId: '', occurredAt: new Date() },
    });
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/access-control/access-control.service.spec.ts
```

Expected: 3 tests pass.

---

### Task D.3: LockoutService + AccessControl controller and module

**Files:**
- Create: `apps/api/src/modules/access-control/lockout.service.ts`
- Create: `apps/api/src/modules/access-control/access-control.controller.ts`
- Create: `apps/api/src/modules/access-control/access-control.module.ts`

- [ ] **Step 1: Write failing tests for LockoutService**

`apps/api/src/modules/access-control/lockout.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { LockoutService } from './lockout.service';

const mockPrisma = {
  lockoutState: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

const service = new LockoutService(mockPrisma as any);

describe('LockoutService', () => {
  it('creates active lockout state', async () => {
    mockPrisma.lockoutState.create.mockResolvedValue({ id: 'ls_01', agreementId: 'agr_01', active: true });
    const result = await service.activate('agr_01', 'invoice_overdue');
    expect(result.active).toBe(true);
    expect(mockPrisma.lockoutState.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ active: true }) }));
  });

  it('deactivates lockout state', async () => {
    mockPrisma.lockoutState.update.mockResolvedValue({ id: 'ls_01', active: false });
    await service.deactivate('agr_01');
    expect(mockPrisma.lockoutState.update).toHaveBeenCalledWith(expect.objectContaining({ data: { active: false } }));
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/access-control/lockout.service.spec.ts
```

- [ ] **Step 3: Implement LockoutService**

`apps/api/src/modules/access-control/lockout.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class LockoutService {
  constructor(private prisma: PrismaClient) {}

  async activate(agreementId: string, reason: string) {
    return this.prisma.lockoutState.create({ data: { agreementId, reason, active: true } });
  }

  async deactivate(agreementId: string) {
    return this.prisma.lockoutState.update({ where: { agreementId }, data: { active: false } });
  }

  async isLocked(agreementId: string): Promise<boolean> {
    const state = await this.prisma.lockoutState.findUnique({ where: { agreementId } });
    return state?.active ?? false;
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/access-control/
```

- [ ] **Step 5: Create controller and module**

`apps/api/src/modules/access-control/access-control.controller.ts`:
```typescript
import { Controller, Post, Param, Body, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AccessControlService } from './access-control.service';

@Controller()
export class AccessControlController {
  constructor(private accessControl: AccessControlService) {}

  @Post('operator/v1/access/credentials')
  @UseGuards(JwtAuthGuard)
  issue(@Body() body: { agreementId: string; credentialType: 'pin' | 'card' | 'app' }) {
    return this.accessControl.issueCredential(body.agreementId, body.credentialType);
  }

  @Post('operator/v1/access/points/:id/remote-open')
  @UseGuards(JwtAuthGuard)
  remoteOpen(@Param('id') _id: string, @CurrentUser() user: AuthenticatedUser) {
    // Stub — real impl calls adapter.remoteOpen()
    return { opened: true, actorId: user.id, timestamp: new Date() };
  }
}
```

`apps/api/src/modules/access-control/access-control.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { LockoutService } from './lockout.service';
import { AccessControlController } from './access-control.controller';
import { StubAccessAdapter } from './adapters/stub.adapter';
import { ACCESS_VENDOR_ADAPTER } from './adapters/access-vendor.adapter';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AccessControlController],
  providers: [
    AccessControlService,
    LockoutService,
    { provide: PrismaClient, useValue: new PrismaClient() },
    { provide: ACCESS_VENDOR_ADAPTER, useClass: StubAccessAdapter },
  ],
  exports: [AccessControlService, LockoutService],
})
export class AccessControlModule {}
```

Add `AccessControlModule` to `AppModule` imports.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/access-control/
git commit -m "feat(access-control): credential lifecycle, lockout state, stub vendor adapter, event subscriptions"
```

---

### Task D.4: Operations — mandatory inspection + incident creation (TDD)

**Files:**
- Create: `apps/api/src/modules/operations/inspection.service.spec.ts`
- Create: `apps/api/src/modules/operations/inspection.service.ts`
- Create: `apps/api/src/modules/operations/operations.service.ts`
- Create: `apps/api/src/modules/operations/incident.service.ts`
- Create: `apps/api/src/modules/operations/operations.controller.ts`
- Create: `apps/api/src/modules/operations/operations.module.ts`

- [ ] **Step 1: Write failing tests**

`apps/api/src/modules/operations/inspection.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { InspectionService } from './inspection.service';
import { DomainException } from '@container-os/domain-types';

const mockPrisma = {
  inspectionTemplate: { findFirst: vi.fn() },
  inspectionRun: { create: vi.fn(), findFirst: vi.fn() },
};

const service = new InspectionService(mockPrisma as any);

describe('InspectionService', () => {
  it('creates inspection run with checklist result', async () => {
    mockPrisma.inspectionTemplate.findFirst.mockResolvedValue({ id: 'tmpl_01', kind: 'move_in', checklist: [{ code: 'dry', label: 'Is unit dry?' }, { code: 'door_seal', label: 'Door seal OK?' }] });
    mockPrisma.inspectionRun.create.mockResolvedValue({ id: 'ins_01', result: 'pass' });

    const result = await service.createInspectionRun('u1', 's1', 'move_in', [{ code: 'dry', result: 'pass' }, { code: 'door_seal', result: 'pass' }]);
    expect(result.result).toBe('pass');
    expect(mockPrisma.inspectionRun.create).toHaveBeenCalled();
  });

  it('sets result to fail when any checklist item fails', async () => {
    mockPrisma.inspectionTemplate.findFirst.mockResolvedValue({ id: 'tmpl_01', kind: 'move_in', checklist: [{ code: 'dry' }] });
    mockPrisma.inspectionRun.create.mockResolvedValue({ id: 'ins_01', result: 'fail' });

    const result = await service.createInspectionRun('u1', 's1', 'move_in', [{ code: 'dry', result: 'fail' }]);
    expect(result.result).toBe('fail');
  });

  it('throws when move-in inspection not completed', async () => {
    mockPrisma.inspectionRun.findFirst.mockResolvedValue(null);
    await expect(service.assertMoveInInspectionComplete('u1')).rejects.toBeInstanceOf(DomainException);
  });
});
```

- [ ] **Step 2: Run test — verify FAIL**

```bash
pnpm test src/modules/operations/inspection.service.spec.ts
```

- [ ] **Step 3: Implement InspectionService**

`apps/api/src/modules/operations/inspection.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';

interface ChecklistItem {
  code: string;
  result: 'pass' | 'fail' | 'na';
  note?: string;
}

@Injectable()
export class InspectionService {
  constructor(private prisma: PrismaClient) {}

  async createInspectionRun(unitId: string, siteId: string, kind: string, checklist: ChecklistItem[], photoIds: string[] = []) {
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { siteId, kind } });
    const overallResult = checklist.every((item) => item.result !== 'fail') ? 'pass' : 'fail';

    const run = await this.prisma.inspectionRun.create({
      data: { unitId, templateId: template?.id, kind, result: overallResult, photoIds, completedAt: new Date() },
    });

    return { inspectionId: run.id, result: overallResult };
  }

  async assertMoveInInspectionComplete(unitId: string): Promise<void> {
    const completed = await this.prisma.inspectionRun.findFirst({
      where: { unitId, kind: 'move_in', completedAt: { not: null } },
    });
    if (!completed) {
      throw new DomainException(ErrorCodes.INSPECTION_REQUIRED, `Move-in inspection must be completed for unit ${unitId} before activation`);
    }
  }
}
```

- [ ] **Step 4: Run test — verify PASS**

```bash
pnpm test src/modules/operations/inspection.service.spec.ts
```

- [ ] **Step 5: Create OperationsService, IncidentService, controller and module**

`apps/api/src/modules/operations/operations.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

@Injectable()
export class OperationsService {
  constructor(private prisma: PrismaClient, private audit: AuditService, private eventBus: EventBusService) {
    // Subscribe to access denied events
    eventBus.on(Events.ACCESS_DENIED, async (event: any) => {
      await this.createIncident({ siteId: event.meta.siteId, severity: 'medium', type: 'unauthorized_access', linkedAccessEventId: event.payload.accessEventId });
    });
  }

  async createTask(params: { siteId: string; title: string; assigneeId?: string; subjectRef?: string; dueAt?: Date }) {
    const task = await this.prisma.task.create({ data: params });
    await this.audit.record({ action: 'task.created', subjectType: 'Task', subjectId: task.id, siteId: params.siteId });
    return task;
  }

  async createIncident(params: { siteId: string; severity: string; type: string; linkedAccessEventId?: string }) {
    const incident = await this.prisma.incident.create({ data: params });
    const task = await this.createTask({ siteId: params.siteId, title: `Incident: ${params.type}`, subjectRef: `Incident:${incident.id}` });
    return { incidentId: incident.id, taskId: task.id };
  }

  async createTransfer(fromUnitId: string, toUnitId: string, agreementId: string, effectiveDate: Date) {
    // Verify target unit available
    const target = await this.prisma.unit.findUniqueOrThrow({ where: { id: toUnitId } });
    if (target.status !== 'available') {
      const { DomainException, ErrorCodes } = await import('@container-os/domain-types');
      throw new DomainException(ErrorCodes.TRANSFER_TARGET_UNAVAILABLE, `Unit ${toUnitId} is not available for transfer`);
    }

    const transfer = await this.prisma.transfer.create({ data: { fromUnitId, toUnitId, agreementId, effectiveDate } });
    await this.audit.record({ action: 'transfer.created', subjectType: 'Transfer', subjectId: transfer.id });
    return transfer;
  }
}
```

`apps/api/src/modules/operations/incident.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class IncidentService {
  constructor(private prisma: PrismaClient) {}

  async resolve(incidentId: string, resolutionNote: string) {
    if (!resolutionNote?.trim()) throw new Error('Resolution note is required');
    return this.prisma.incident.update({ where: { id: incidentId }, data: { status: 'resolved', resolutionNote } });
  }

  async getOpenIncidents(siteId: string) {
    return this.prisma.incident.findMany({ where: { siteId, status: { in: ['open', 'investigating'] } }, orderBy: { createdAt: 'desc' } });
  }
}
```

`apps/api/src/modules/operations/operations.controller.ts`:
```typescript
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';
import { IncidentService } from './incident.service';

@Controller('operator/v1')
@UseGuards(JwtAuthGuard)
export class OperationsController {
  constructor(
    private operations: OperationsService,
    private inspection: InspectionService,
    private incident: IncidentService,
  ) {}

  @Post('tasks')
  createTask(@Body() body: { siteId: string; title: string; assigneeId?: string; dueAt?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.operations.createTask({ ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined });
  }

  @Post('inspections')
  createInspection(@Body() body: { unitId: string; siteId: string; kind: string; checklist: any[]; photoIds?: string[] }) {
    return this.inspection.createInspectionRun(body.unitId, body.siteId, body.kind, body.checklist, body.photoIds);
  }

  @Post('incidents')
  createIncident(@Body() body: { siteId: string; severity: string; type: string }) {
    return this.operations.createIncident(body);
  }

  @Patch('incidents/:id/resolve')
  resolveIncident(@Param('id') id: string, @Body() body: { resolutionNote: string }) {
    return this.incident.resolve(id, body.resolutionNote);
  }

  @Get('incidents')
  getOpenIncidents(@Query('siteId') siteId: string) {
    return this.incident.getOpenIncidents(siteId);
  }

  @Post('transfers')
  createTransfer(@Body() body: { fromUnitId: string; toUnitId: string; agreementId: string; effectiveDate: string }) {
    return this.operations.createTransfer(body.fromUnitId, body.toUnitId, body.agreementId, new Date(body.effectiveDate));
  }
}
```

`apps/api/src/modules/operations/operations.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { InspectionService } from './inspection.service';
import { IncidentService } from './incident.service';
import { OperationsController } from './operations.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [OperationsController],
  providers: [OperationsService, InspectionService, IncidentService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [OperationsService, InspectionService],
})
export class OperationsModule {}
```

Add `OperationsModule` to `AppModule` imports.

- [ ] **Step 6: Run all D track tests**

```bash
pnpm test src/modules/access-control/ src/modules/operations/
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/operations/
git commit -m "feat(operations): tasks, mandatory inspections, incidents (from access denied events), transfers"
```

---

## Track D complete

Events consumed: `agreement.activated`, `invoice.overdue`, `invoice.paid`, `access.denied`
Events emitted: `access.credential.issued`, `access.lockout.activated`, `access.lockout.deactivated`

APIs available:
- `POST /api/operator/v1/access/credentials`
- `POST /api/operator/v1/access/points/:id/remote-open`
- `POST /api/operator/v1/tasks`
- `POST /api/operator/v1/inspections`
- `POST /api/operator/v1/incidents`
- `PATCH /api/operator/v1/incidents/:id/resolve`
- `GET /api/operator/v1/incidents`
- `POST /api/operator/v1/transfers`
