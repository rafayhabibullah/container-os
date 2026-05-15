# Tasks Page Gap Fill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill all gaps between the `/tasks` dashboard page and the spec's Module 26 (Tasks and Operations) — covering schema, API, and UI.

**Architecture:** Add `organisationId`, `type`, `priority`, `unitId`, `tenantId`, `bookingId` to the `Task` model and add `blocked` to `TaskStatus`. Update the service/controller to accept and persist these fields. Extend the web UI to display site names, expose all new fields in the create form, add a row-click detail/edit sheet, and show `blocked` status throughout.

**Tech Stack:** Prisma (PostgreSQL), NestJS, Vitest, Next.js 14 (App Router), React, TypeScript, inline styles (Plus Jakarta Sans font, no Tailwind on dashboard pages).

---

## File Map

| File | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Add `TaskType`, `TaskPriority` enums; add `blocked` to `TaskStatus`; add new fields to `Task` |
| `apps/api/prisma/migrations/<timestamp>_task_fields/` | Generated migration with data backfill SQL |
| `apps/api/src/modules/operations/operations.service.ts` | Accept + persist new fields; allow `blocked` in updateTask |
| `apps/api/src/modules/operations/operations.service.spec.ts` | Tests for new fields and blocked transition |
| `apps/api/src/modules/operations/org-operations.controller.ts` | Widen createTask/updateTask body types; pass `organisationId` |
| `apps/web/src/app/(dashboard)/tasks/page.tsx` | Fetch members; pass sitesById + membersById to children |
| `apps/web/src/app/(dashboard)/tasks/TasksTable.tsx` | Resolve site name; add blocked; add type/priority/assignee columns; wire row click |
| `apps/web/src/app/(dashboard)/tasks/TaskActions.tsx` | Add type, priority, notes, unitId, tenantId, bookingId to create form; add assignee dropdown |
| `apps/web/src/app/(dashboard)/tasks/TaskDetailSheet.tsx` | New file — row-click detail/edit drawer |
| `apps/web/src/app/api/tasks/route.ts` | Forward new body fields |
| `apps/web/src/app/api/tasks/[taskId]/route.ts` | Already passes full body; no change needed |

---

## Task 1 — Prisma Schema: Add Enums and Fields

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add `TaskType` and `TaskPriority` enums, and `blocked` to `TaskStatus`**

In `apps/api/prisma/schema.prisma`, find the `enum TaskStatus` block and replace it, then add the two new enums:

```prisma
enum TaskStatus {
  open
  in_progress
  blocked
  completed
  cancelled
}

enum TaskType {
  move_in
  move_out
  inspect_unit
  clean_unit
  repair_unit
  verify_document
  approve_booking
  call_tenant
  collect_payment
  assign_access
  upload_contract
  other
}

enum TaskPriority {
  low
  normal
  high
  urgent
}
```

- [ ] **Step 2: Add new fields to the `Task` model**

Replace the existing `model Task` block:

```prisma
model Task {
  id             String       @id @default(cuid())
  organisationId String?
  siteId         String
  unitId         String?
  tenantId       String?
  bookingId      String?
  assigneeId     String?
  type           TaskType?
  priority       TaskPriority @default(normal)
  status         TaskStatus   @default(open)
  title          String
  notes          String?
  subjectRef     String?
  dueAt          DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
}
```

- [ ] **Step 3: Generate and apply migration**

```bash
cd apps/api
npx prisma migrate dev --name task_fields
```

Expected: migration file created, migration applied, Prisma client regenerated.

- [ ] **Step 4: Backfill `organisationId` from `Site`**

Open the generated migration SQL file (`apps/api/prisma/migrations/<timestamp>_task_fields/migration.sql`) and append at the end before the closing statements:

```sql
UPDATE "Task" t
SET "organisationId" = s."organisationId"
FROM "Site" s
WHERE s.id = t."siteId"
  AND t."organisationId" IS NULL;
```

Then re-apply:
```bash
npx prisma migrate deploy
```

Expected: existing tasks have `organisationId` populated.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(schema): add type, priority, blocked status, org/unit/tenant/booking refs to Task"
```

---

## Task 2 — OperationsService: Accept New Fields + Tests

**Files:**
- Modify: `apps/api/src/modules/operations/operations.service.ts`
- Modify: `apps/api/src/modules/operations/operations.service.spec.ts`

- [ ] **Step 1: Write failing tests for new createTask fields**

Add to `apps/api/src/modules/operations/operations.service.spec.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperationsService } from './operations.service';

const mockPrisma = {
  task: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  incident: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  maintenanceOrder: { create: vi.fn(), findMany: vi.fn() },
  site: { findMany: vi.fn() },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { on: vi.fn(), emit: vi.fn() };

let service: OperationsService;
beforeEach(() => {
  vi.clearAllMocks();
  service = new OperationsService(mockPrisma as any, mockAudit as any, mockEventBus as any);
});

describe('OperationsService.createTask', () => {
  it('creates a task with organisationId, type, and priority', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't1', status: 'open' });
    await service.createTask({
      organisationId: 'org1',
      siteId: 's1',
      title: 'Inspect unit 12',
      type: 'inspect_unit',
      priority: 'high',
    });
    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: 'org1',
        type: 'inspect_unit',
        priority: 'high',
      }),
    });
  });

  it('creates a task with optional unitId, tenantId, bookingId', async () => {
    mockPrisma.task.create.mockResolvedValue({ id: 't2', status: 'open' });
    await service.createTask({
      organisationId: 'org1',
      siteId: 's1',
      title: 'Move-in task',
      unitId: 'u1',
      tenantId: 'ten1',
      bookingId: 'bk1',
    });
    expect(mockPrisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ unitId: 'u1', tenantId: 'ten1', bookingId: 'bk1' }),
    });
  });
});

describe('OperationsService.updateTask', () => {
  it('allows transitioning to blocked status', async () => {
    mockPrisma.site.findMany.mockResolvedValue([{ id: 's1' }]);
    mockPrisma.task.findFirst.mockResolvedValue({ id: 't1', siteId: 's1' });
    mockPrisma.task.update.mockResolvedValue({ id: 't1', status: 'blocked' });
    const result = await service.updateTask('org1', 't1', { status: 'blocked' });
    expect(result.status).toBe('blocked');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
npx vitest run src/modules/operations/operations.service.spec.ts
```

Expected: FAIL — `createTask` doesn't accept `type`/`priority`/`organisationId`.

- [ ] **Step 3: Update `createTask` params in `operations.service.ts`**

Replace the `createTask` method:

```typescript
async createTask(params: {
  organisationId?: string;
  siteId: string;
  unitId?: string;
  tenantId?: string;
  bookingId?: string;
  title: string;
  type?: string;
  priority?: string;
  notes?: string;
  assigneeId?: string;
  subjectRef?: string;
  dueAt?: Date;
}) {
  const task = await this.prisma.task.create({ data: params as any });
  await this.audit.record({ action: 'task.created', subjectType: 'Task', subjectId: task.id, siteId: params.siteId });
  return task;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npx vitest run src/modules/operations/operations.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/src/modules/operations/operations.service.ts apps/api/src/modules/operations/operations.service.spec.ts
git commit -m "feat(ops): accept type, priority, org/unit/tenant/booking refs in createTask"
```

---

## Task 3 — OrgOperationsController: Pass New Fields

**Files:**
- Modify: `apps/api/src/modules/operations/org-operations.controller.ts`

- [ ] **Step 1: Update `createTask` body type and call**

In `org-operations.controller.ts`, replace the `createTask` handler:

```typescript
@Post('tasks')
@ApiOperation({ summary: 'Create a task' })
createTask(
  @Param('organisationId') orgId: string,
  @Body() body: {
    siteId: string;
    title: string;
    type?: string;
    priority?: string;
    notes?: string;
    assigneeId?: string;
    unitId?: string;
    tenantId?: string;
    bookingId?: string;
    dueAt?: string;
  },
) {
  return this.ops.createTask({
    organisationId: orgId,
    siteId: body.siteId,
    title: body.title,
    type: body.type,
    priority: body.priority,
    notes: body.notes,
    assigneeId: body.assigneeId,
    unitId: body.unitId,
    tenantId: body.tenantId,
    bookingId: body.bookingId,
    dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/api
npx tsc --noEmit
```

Expected: no errors related to `operations.controller.ts`.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add apps/api/src/modules/operations/org-operations.controller.ts
git commit -m "feat(ops): pass all new task fields from controller to service"
```

---

## Task 4 — Update `page.tsx`: Fetch Members, Build Lookup Maps

**Files:**
- Modify: `apps/web/src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Expand the Task interface and add Member/lookup types, fetch members**

Replace `apps/web/src/app/(dashboard)/tasks/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import TaskActions from './TaskActions';
import TasksTable from './TasksTable';

export interface Task {
  id: string;
  title: string;
  status: string;
  type: string | null;
  priority: string;
  dueAt: string | null;
  siteId: string;
  unitId: string | null;
  tenantId: string | null;
  bookingId: string | null;
  assigneeId: string | null;
  notes: string | null;
}

export interface Site {
  id: string;
  name: string;
}

export interface Member {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

export default async function TasksPage() {
  const user = await requireAuth();
  const [tasks, sites, members] = await Promise.all([
    serverFetch<Task[]>(`/v1/organisations/${user.organisationId}/tasks`).catch(() => [] as Task[]),
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
    serverFetch<Member[]>(`/v1/organisations/${user.organisationId}/members`).catch(() => [] as Member[]),
  ]);

  const sitesById  = Object.fromEntries(sites.map((s) => [s.id, s]));
  const membersById = Object.fromEntries(members.map((m) => [m.userId, m]));

  const open       = tasks.filter((t) => t.status === 'open').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const blocked    = tasks.filter((t) => t.status === 'blocked').length;
  const completed  = tasks.filter((t) => t.status === 'completed').length;
  const overdue    = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Tasks
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {overdue > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    {overdue} overdue
                  </span>
                )}
                {open > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {open} open
                  </span>
                )}
                {inProgress > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {inProgress} in progress
                  </span>
                )}
                {blocked > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fdf4ff', color: '#7e22ce', border: '1px solid #e9d5ff', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {blocked} blocked
                  </span>
                )}
                {completed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {completed} completed
                  </span>
                )}
                {tasks.length === 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    No tasks yet
                  </span>
                )}
              </div>
            </div>
            <TaskActions type="create" sites={sites} members={members} />
          </div>

          <TasksTable tasks={tasks} sitesById={sitesById} membersById={membersById} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/tasks/page.tsx
git commit -m "feat(tasks): fetch members, build sitesById/membersById lookup maps"
```

---

## Task 5 — Update `TasksTable.tsx`: Site Name, Blocked, New Columns, Row Click

**Files:**
- Modify: `apps/web/src/app/(dashboard)/tasks/TasksTable.tsx`

- [ ] **Step 1: Rewrite `TasksTable.tsx` with all fixes**

Replace the entire file:

```tsx
'use client';

import { useState, useMemo } from 'react';
import TaskActions from './TaskActions';
import TaskDetailSheet from './TaskDetailSheet';
import type { Task, Site, Member } from './page';

interface Props {
  tasks: Task[];
  sitesById: Record<string, Site>;
  membersById: Record<string, { user: { name: string } }>;
}

const STAT: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  open:        { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Open'        },
  in_progress: { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'In progress' },
  blocked:     { dot: '#a855f7', text: '#7e22ce', bg: '#fdf4ff', border: '#e9d5ff', label: 'Blocked'     },
  completed:   { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Completed'   },
  cancelled:   { dot: '#94a3b8', text: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Cancelled'   },
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  low:    { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  normal: { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  high:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent: { text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

const TYPE_LABELS: Record<string, string> = {
  move_in:         'Move-in',
  move_out:        'Move-out',
  inspect_unit:    'Inspect',
  clean_unit:      'Clean',
  repair_unit:     'Repair',
  verify_document: 'Verify doc',
  approve_booking: 'Approve booking',
  call_tenant:     'Call tenant',
  collect_payment: 'Collect payment',
  assign_access:   'Assign access',
  upload_contract: 'Upload contract',
  other:           'Other',
};

const FILTERS = [
  { key: 'all',         label: 'All'         },
  { key: 'open',        label: 'Open'        },
  { key: 'in_progress', label: 'In progress' },
  { key: 'blocked',     label: 'Blocked'     },
  { key: 'completed',   label: 'Completed'   },
  { key: 'cancelled',   label: 'Cancelled'   },
] as const;

export default function TasksTable({ tasks, sitesById, membersById }: Props) {
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const filtered = useMemo(() =>
    tasks.filter((t) => {
      const q      = query.trim().toLowerCase();
      const site   = sitesById[t.siteId]?.name ?? t.siteId;
      const matchQ = !q || t.title.toLowerCase().includes(q) || site.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || t.status === statusFilter;
      return matchQ && matchS;
    }),
    [tasks, query, statusFilter, sitesById],
  );

  const isDue = (t: Task) =>
    t.dueAt && new Date(t.dueAt) < new Date() && t.status !== 'completed' && t.status !== 'cancelled';

  return (
    <>
      <style>{`
        @keyframes task-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .task-row { animation: task-row-in 0.25s ease both; cursor: pointer; }
        .task-row:hover { background: #f8fafc !important; }
        .task-filter-btn { transition: all 0.12s ease; }
        .task-filter-btn:hover { color: #0f172a !important; }
        .task-search-box:focus-within { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {FILTERS.map((f) => {
              const active = statusFilter === f.key;
              const count  = f.key === 'all' ? tasks.length : tasks.filter((t) => t.status === f.key).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className="task-filter-btn"
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: 'none',
                    background: active ? '#f1f5f9' : 'transparent',
                    color: active ? '#0f172a' : '#94a3b8',
                    fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: active ? 600 : 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px',
                  }}
                >
                  {f.label}
                  <span style={{
                    background: active ? '#e2e8f0' : '#f8fafc',
                    color: active ? '#475569' : '#cbd5e1',
                    borderRadius: '4px', padding: '1px 6px',
                    fontSize: '11px', fontWeight: 600,
                    minWidth: '20px', textAlign: 'center',
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1 }} />

          <div
            className="task-search-box"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: '8px', padding: '7px 12px',
              minWidth: '220px', transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#94a3b8' }}>
              <path d="M7 13A6 6 0 1 0 7 1a6 6 0 0 0 0 12zM14 14l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#0f172a', fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '1px' }}>✕</button>
            )}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
              {tasks.length === 0 ? 'No tasks yet' : 'No results found'}
            </p>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>
              {tasks.length === 0 ? 'Create your first task to get started.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Site', 'Title', 'Type', 'Priority', 'Assignee', 'Status', 'Due', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 16px',
                    fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700, color: '#94a3b8',
                    letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => {
                const stat     = STAT[task.status] ?? STAT.open;
                const priColor = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
                const overdue  = isDue(task);
                const siteName = sitesById[task.siteId]?.name ?? task.siteId.slice(0, 8) + '…';
                const assigneeName = task.assigneeId
                  ? (membersById[task.assigneeId]?.user?.name ?? task.assigneeId.slice(0, 6) + '…')
                  : null;
                return (
                  <tr
                    key={task.id}
                    className="task-row"
                    onClick={() => setSelectedTask(task)}
                    style={{
                      animationDelay: `${i * 30}ms`,
                      borderBottom: i < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}
                  >
                    {/* Site */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: '13px', color: '#64748b',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        borderRadius: '5px', padding: '2px 8px',
                        whiteSpace: 'nowrap',
                      }}>
                        {siteName}
                      </span>
                    </td>

                    {/* Title */}
                    <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {task.title}
                      </span>
                      {task.notes && (
                        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                          {task.notes}
                        </p>
                      )}
                    </td>

                    {/* Type */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {task.type ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '5px', padding: '2px 8px' }}>
                          {TYPE_LABELS[task.type] ?? task.type}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                      )}
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: priColor.bg, color: priColor.text,
                        border: `1px solid ${priColor.border}`,
                        borderRadius: '20px', padding: '2px 9px',
                        fontSize: '11px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        textTransform: 'capitalize',
                      }}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {assigneeName ? (
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#475569' }}>
                          {assigneeName}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: stat.bg, color: stat.text,
                        border: `1px solid ${stat.border}`,
                        borderRadius: '20px', padding: '3px 10px',
                        fontSize: '12px', fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block' }} />
                        {stat.label}
                      </span>
                    </td>

                    {/* Due */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {task.dueAt ? (
                        <span style={{
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: '13px',
                          color: overdue ? '#dc2626' : '#64748b',
                          fontWeight: overdue ? 600 : 400,
                        }}>
                          {overdue && '⚠ '}
                          {new Date(task.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      ) : (
                        <span style={{ color: '#cbd5e1', fontSize: '13px' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <TaskActions type="update" taskId={task.id} currentStatus={task.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          sitesById={sitesById}
          membersById={membersById}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Add `blocked` to `NEXT_STATUSES` in `TaskActions.tsx`**

In `apps/web/src/app/(dashboard)/tasks/TaskActions.tsx`, replace the `NEXT_STATUSES` constant:

```typescript
const NEXT_STATUSES: Record<string, string[]> = {
  open:        ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['completed',   'blocked', 'cancelled'],
  blocked:     ['in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: 'Start',
  completed:   'Complete',
  blocked:     'Block',
  cancelled:   'Cancel',
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/tasks/TasksTable.tsx apps/web/src/app/\(dashboard\)/tasks/TaskActions.tsx
git commit -m "feat(tasks-ui): resolve site names, add blocked status, type/priority/assignee columns, row click"
```

---

## Task 6 — Update `TaskActions.tsx` Create Form: Add New Fields

**Files:**
- Modify: `apps/web/src/app/(dashboard)/tasks/TaskActions.tsx`

- [ ] **Step 1: Add `Member` interface and extend Props**

At the top of `TaskActions.tsx`, update the interfaces:

```typescript
interface Site {
  id: string;
  name: string;
}

interface Member {
  userId: string;
  user: { id: string; name: string; email: string };
}

interface Props {
  type: 'create' | 'update';
  taskId?: string;
  currentStatus?: string;
  sites?: Site[];
  members?: Member[];
}
```

Update the function signature:
```typescript
export default function TaskActions({ type, taskId, currentStatus, sites = [], members = [] }: Props) {
```

- [ ] **Step 2: Add task type and priority constants**

After the `STATUS_LABELS` constant, add:

```typescript
const TASK_TYPES = [
  { value: 'move_in',         label: 'Move-in'         },
  { value: 'move_out',        label: 'Move-out'        },
  { value: 'inspect_unit',    label: 'Inspect unit'    },
  { value: 'clean_unit',      label: 'Clean unit'      },
  { value: 'repair_unit',     label: 'Repair unit'     },
  { value: 'verify_document', label: 'Verify document' },
  { value: 'approve_booking', label: 'Approve booking' },
  { value: 'call_tenant',     label: 'Call tenant'     },
  { value: 'collect_payment', label: 'Collect payment' },
  { value: 'assign_access',   label: 'Assign access'   },
  { value: 'upload_contract', label: 'Upload contract' },
  { value: 'other',           label: 'Other'           },
];

const TASK_PRIORITIES = [
  { value: 'low',    label: 'Low'    },
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High'   },
  { value: 'urgent', label: 'Urgent' },
];
```

- [ ] **Step 3: Replace the create form body with all new fields**

In the `<form onSubmit>` handler, update the action call:

```typescript
onSubmit={async (e) => {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  await doAction('/api/tasks', 'POST', {
    siteId:    form.get('siteId'),
    title:     form.get('title'),
    type:      form.get('type') || undefined,
    priority:  form.get('priority') || 'normal',
    notes:     form.get('notes') || undefined,
    assigneeId: form.get('assigneeId') || undefined,
    unitId:    form.get('unitId') || undefined,
    tenantId:  form.get('tenantId') || undefined,
    bookingId: form.get('bookingId') || undefined,
    dueAt:     form.get('dueAt') || undefined,
  });
}}
```

Replace the form fields section (everything between `<form ...>` opening and the error/footer) with:

```tsx
<div>
  <label style={labelStyle}>SITE</label>
  <select name="siteId" required className="task-modal-input" style={inputStyle}>
    <option value="">Select a site…</option>
    {sites.map((s) => (
      <option key={s.id} value={s.id}>{s.name}</option>
    ))}
  </select>
</div>

<div>
  <label style={labelStyle}>TASK TITLE</label>
  <input
    name="title"
    placeholder="e.g. Inspect unit 12, fix gate lock…"
    required
    className="task-modal-input"
    style={inputStyle}
  />
</div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
  <div>
    <label style={labelStyle}>TYPE <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
    <select name="type" className="task-modal-input" style={inputStyle}>
      <option value="">— none —</option>
      {TASK_TYPES.map((t) => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  </div>
  <div>
    <label style={labelStyle}>PRIORITY</label>
    <select name="priority" defaultValue="normal" className="task-modal-input" style={inputStyle}>
      {TASK_PRIORITIES.map((p) => (
        <option key={p.value} value={p.value}>{p.label}</option>
      ))}
    </select>
  </div>
</div>

{members.length > 0 && (
  <div>
    <label style={labelStyle}>ASSIGNEE <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
    <select name="assigneeId" className="task-modal-input" style={inputStyle}>
      <option value="">— unassigned —</option>
      {members.map((m) => (
        <option key={m.userId} value={m.userId}>{m.user.name}</option>
      ))}
    </select>
  </div>
)}

<div>
  <label style={labelStyle}>NOTES <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
  <textarea
    name="notes"
    placeholder="Additional details…"
    rows={2}
    className="task-modal-input"
    style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
  />
</div>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
  <div>
    <label style={labelStyle}>UNIT ID <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
    <input name="unitId" placeholder="unit ID…" className="task-modal-input" style={inputStyle} />
  </div>
  <div>
    <label style={labelStyle}>TENANT ID <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
    <input name="tenantId" placeholder="tenant ID…" className="task-modal-input" style={inputStyle} />
  </div>
  <div>
    <label style={labelStyle}>BOOKING ID <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(opt)</span></label>
    <input name="bookingId" placeholder="booking ID…" className="task-modal-input" style={inputStyle} />
  </div>
</div>

<div>
  <label style={labelStyle}>DUE DATE <span style={{ color: '#cbd5e1', fontWeight: 400 }}>(optional)</span></label>
  <input
    name="dueAt"
    type="date"
    className="task-modal-input"
    style={inputStyle}
  />
</div>
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/tasks/TaskActions.tsx
git commit -m "feat(tasks-ui): add type, priority, assignee, notes, unit/tenant/booking fields to create form"
```

---

## Task 7 — Create `TaskDetailSheet.tsx`

**Files:**
- Create: `apps/web/src/app/(dashboard)/tasks/TaskDetailSheet.tsx`

- [ ] **Step 1: Create the file**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Task, Site } from './page';

const TYPE_LABELS: Record<string, string> = {
  move_in: 'Move-in', move_out: 'Move-out', inspect_unit: 'Inspect unit',
  clean_unit: 'Clean unit', repair_unit: 'Repair unit', verify_document: 'Verify document',
  approve_booking: 'Approve booking', call_tenant: 'Call tenant',
  collect_payment: 'Collect payment', assign_access: 'Assign access',
  upload_contract: 'Upload contract', other: 'Other',
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  low:    { text: '#64748b', bg: '#f8fafc', border: '#e2e8f0' },
  normal: { text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' },
  high:   { text: '#92400e', bg: '#fffbeb', border: '#fde68a' },
  urgent: { text: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open:        ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['completed',   'blocked', 'cancelled'],
  blocked:     ['in_progress', 'cancelled'],
  completed:   [],
  cancelled:   [],
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open', in_progress: 'In progress', blocked: 'Blocked', completed: 'Completed', cancelled: 'Cancelled',
};

interface Props {
  task: Task;
  sitesById: Record<string, Site>;
  membersById: Record<string, { user: { name: string; email: string } }>;
  onClose: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 12px', color: '#0f172a', fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif", outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '11px', fontWeight: 700, color: '#94a3b8',
  marginBottom: '5px', letterSpacing: '0.06em', textTransform: 'uppercase',
};

export default function TaskDetailSheet({ task, sitesById, membersById, onClose }: Props) {
  const router = useRouter();
  const [notes,   setNotes]   = useState(task.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function patch(data: object) {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function saveNotes() {
    await patch({ notes });
  }

  async function transitionStatus(status: string) {
    await patch({ status });
    onClose();
  }

  const siteName  = sitesById[task.siteId]?.name ?? task.siteId;
  const assignee  = task.assigneeId ? membersById[task.assigneeId]?.user : null;
  const priColor  = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.normal;
  const nextStatuses = STATUS_TRANSITIONS[task.status] ?? [];

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes sheet-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sheet-slide-in    { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .task-detail-backdrop { animation: sheet-backdrop-in 0.2s ease both; }
        .task-detail-sheet    { animation: sheet-slide-in    0.25s cubic-bezier(0.16,1,0.3,1) both; }
        .task-detail-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
      `}</style>

      <div
        className="task-detail-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.35)',
          backdropFilter: 'blur(2px)',
          zIndex: 50,
        }}
      />

      <div
        className="task-detail-sheet"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '420px', maxWidth: '100vw',
          background: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          boxShadow: '-8px 0 40px rgba(15,23,42,0.12)',
          zIndex: 51,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', lineHeight: 1.3 }}>
              {task.title}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', borderRadius: '4px', padding: '2px 7px', border: '1px solid #e2e8f0' }}>
                {siteName}
              </span>
              {task.type && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', background: '#f1f5f9', borderRadius: '4px', padding: '2px 7px', border: '1px solid #e2e8f0' }}>
                  {TYPE_LABELS[task.type] ?? task.type}
                </span>
              )}
              <span style={{
                fontSize: '11px', fontWeight: 700,
                color: priColor.text, background: priColor.bg,
                borderRadius: '20px', padding: '2px 8px', border: `1px solid ${priColor.border}`,
                textTransform: 'capitalize',
              }}>
                {task.priority}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px',
              width: '28px', height: '28px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#64748b', fontSize: '14px', flexShrink: 0,
            }}
          >✕</button>
        </div>

        {/* Details */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

          {/* Meta row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={labelStyle}>Status</p>
              <p style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600, margin: 0 }}>
                {STATUS_LABELS[task.status] ?? task.status}
              </p>
            </div>
            <div>
              <p style={labelStyle}>Due date</p>
              <p style={{ fontSize: '13px', color: task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'completed' && task.status !== 'cancelled' ? '#dc2626' : '#0f172a', margin: 0, fontWeight: 500 }}>
                {task.dueAt ? new Date(task.dueAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <p style={labelStyle}>Assignee</p>
              <p style={{ fontSize: '13px', color: '#0f172a', margin: 0 }}>
                {assignee ? assignee.name : '—'}
              </p>
            </div>
            <div>
              <p style={labelStyle}>Created</p>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {new Date((task as any).createdAt ?? Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Linked records */}
          {(task.unitId || task.tenantId || task.bookingId) && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {task.unitId    && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Unit:</strong> {task.unitId}</p>}
              {task.tenantId  && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Tenant:</strong> {task.tenantId}</p>}
              {task.bookingId && <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}><strong>Booking:</strong> {task.bookingId}</p>}
            </div>
          )}

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes…"
              className="task-detail-input"
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
            <button
              onClick={saveNotes}
              disabled={loading || notes === (task.notes ?? '')}
              style={{
                marginTop: '8px', padding: '7px 14px',
                background: loading || notes === (task.notes ?? '') ? '#f1f5f9' : '#0f172a',
                color: loading || notes === (task.notes ?? '') ? '#94a3b8' : '#fff',
                border: 'none', borderRadius: '7px', cursor: loading || notes === (task.notes ?? '') ? 'not-allowed' : 'pointer',
                fontSize: '12px', fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Saving…' : 'Save notes'}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 10px', margin: 0 }}>
              {error}
            </p>
          )}

          {/* Status transitions */}
          {nextStatuses.length > 0 && (
            <div>
              <p style={{ ...labelStyle, marginBottom: '8px' }}>Move to</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {nextStatuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => transitionStatus(status)}
                    disabled={loading}
                    style={{
                      padding: '7px 14px',
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '7px', color: '#475569',
                      fontSize: '12px', fontWeight: 600,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.12s, color 0.12s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color = '#475569'; }}
                  >
                    → {STATUS_LABELS[status] ?? status}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/tasks/TaskDetailSheet.tsx
git commit -m "feat(tasks-ui): add TaskDetailSheet with notes editing and status transitions"
```

---

## Task 8 — Update Next.js API Route: Forward New Fields

**Files:**
- Modify: `apps/web/src/app/api/tasks/route.ts`

- [ ] **Step 1: Verify the route already passes the full body**

The current `route.ts` already does `proxyToBackend(..., body)` — the POST handler passes the whole parsed body. No change required for the proxy itself.

However, the API now needs the `organisationId` to be populated from the JWT context (the backend already reads it from the route param `:organisationId`). Confirm the proxy URL:

```typescript
// apps/web/src/app/api/tasks/route.ts
// Current: proxyToBackend(`/v1/organisations/${auth.payload.organisationId}/tasks`, 'POST', auth.token, body);
// This is correct — orgId comes from JWT, not from the client body.
```

No changes needed — the backend controller already reads `organisationId` from the route param.

- [ ] **Step 2: Verify TypeScript compiles across the web app**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit if any fixes were needed**

```bash
git add apps/web/src/app/api/tasks/
git commit -m "chore(tasks): verify API proxy routes unchanged — orgId from JWT route param"
```

---

## Task 9 — Smoke Test

- [ ] **Step 1: Start the dev stack**

```bash
cd apps/api && npm run start:dev &
cd apps/web && npm run dev &
```

- [ ] **Step 2: Open http://localhost:3001/tasks and verify:**

- [ ] Header shows correct count badges including "blocked"
- [ ] Filter tabs include "Blocked"
- [ ] "New task" modal shows: site, title, type dropdown, priority, assignee, notes, unit/tenant/booking ID fields, due date
- [ ] Creating a task with type=inspect_unit, priority=high shows correctly in the table
- [ ] Site column shows the site name (not a truncated ID)
- [ ] Clicking a row opens the detail sheet on the right
- [ ] Detail sheet shows notes textarea — edit and save works
- [ ] Status transition buttons in the sheet work (open → in_progress, blocked, cancel)
- [ ] "Block" button on in_progress row transitions task to blocked; blocked badge appears

- [ ] **Step 3: Run API unit tests**

```bash
cd apps/api
npx vitest run
```

Expected: all tests pass including the new `operations.service.spec.ts` tests.

---

## Self-Review Checklist

- [x] `TaskType` enum covers all 11 types from spec + `other`
- [x] `TaskPriority` enum covers all 4 levels
- [x] `blocked` added to `TaskStatus` enum and all UI state maps
- [x] `organisationId`, `unitId`, `tenantId`, `bookingId` added to schema and service
- [x] Site name resolved from `sitesById` map (not truncated raw ID)
- [x] Assignee shown in table + editable in create form
- [x] Type and priority shown in table
- [x] Notes shown as subtitle in table row + editable in detail sheet
- [x] Detail sheet: status transitions, notes save, linked record display
- [x] `NEXT_STATUSES` in `TaskActions` includes `blocked` transition
- [x] `page.tsx` exports `Task`, `Site`, `Member` interfaces for use by child components
- [x] No TBD/TODO placeholders in any step
