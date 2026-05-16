# Complete In-Progress Inspection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Continue" button to in-progress inspection rows that opens a modal to fill out the checklist, notes, and photos to complete the inspection.

**Architecture:** A new `completeInspectionRun` method in `InspectionService` handles the PATCH logic server-side; a new `PATCH v1/organisations/:orgId/inspection-runs/:id` endpoint exposes it; a new `PATCH /api/inspections/[id]` Next.js proxy route forwards requests from the browser. On the frontend, a thin `InspectionsPageClient` client component holds `selectedInspection` state and renders the new `InspectionComplete` modal alongside the existing `InspectionsTable`.

**Tech Stack:** NestJS, Prisma, Next.js 14 (App Router), React, TypeScript, Vitest

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/api/src/modules/operations/inspection.service.ts` | Add `completeInspectionRun` method |
| Modify | `apps/api/src/modules/operations/inspection.service.spec.ts` | Tests for `completeInspectionRun` |
| Modify | `apps/api/src/modules/operations/org-operations.controller.ts` | Add `PATCH inspection-runs/:id` endpoint |
| Create | `apps/web/src/app/api/inspections/[id]/route.ts` | Next.js PATCH proxy to NestJS |
| Modify | `apps/web/src/app/(dashboard)/inspections/InspectionsTable.tsx` | Add `onContinue` prop + Continue button on in-progress rows |
| Create | `apps/web/src/app/(dashboard)/inspections/InspectionComplete.tsx` | Completion modal component |
| Create | `apps/web/src/app/(dashboard)/inspections/InspectionsPageClient.tsx` | Client wrapper holding selectedInspection state |
| Modify | `apps/web/src/app/(dashboard)/inspections/page.tsx` | Delegate render to `InspectionsPageClient` |

---

## Task 1: Add `completeInspectionRun` to `InspectionService` with tests

**Files:**
- Modify: `apps/api/src/modules/operations/inspection.service.ts`
- Modify: `apps/api/src/modules/operations/inspection.service.spec.ts`

- [ ] **Step 1: Add the failing tests**

Open `apps/api/src/modules/operations/inspection.service.spec.ts` and replace the file with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InspectionService } from './inspection.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  inspectionTemplate: { findFirst: vi.fn() },
  inspectionRun: { create: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  unit: { update: vi.fn() },
};
const service = new InspectionService(mockPrisma as any);

describe('InspectionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates inspection run with pass result', async () => {
    mockPrisma.inspectionTemplate.findFirst.mockResolvedValue({ id: 'tmpl_01', kind: 'move_in', checklist: [{ code: 'dry' }, { code: 'door_seal' }] });
    mockPrisma.inspectionRun.create.mockResolvedValue({ id: 'ins_01', result: 'pass' });
    const result = await service.createInspectionRun({ unitId: 'u1', siteId: 's1', kind: 'move_in', checklist: [{ code: 'dry', label: 'Dry', result: 'pass' }, { code: 'door_seal', label: 'Door seal', result: 'pass' }] });
    expect(result.result).toBe('pass');
  });

  it('sets result to fail when any item fails', async () => {
    mockPrisma.inspectionTemplate.findFirst.mockResolvedValue({ id: 'tmpl_01', kind: 'move_in', checklist: [{ code: 'dry' }] });
    mockPrisma.inspectionRun.create.mockResolvedValue({ id: 'ins_01', result: 'fail' });
    const result = await service.createInspectionRun({ unitId: 'u1', siteId: 's1', kind: 'move_in', checklist: [{ code: 'dry', label: 'Dry', result: 'fail' }] });
    expect(result.result).toBe('fail');
  });

  it('throws when move-in inspection not completed', async () => {
    mockPrisma.inspectionRun.findFirst.mockResolvedValue(null);
    await expect(service.assertMoveInInspectionComplete('u1')).rejects.toBeInstanceOf(DomainException);
  });

  describe('completeInspectionRun', () => {
    it('sets result to pass when all checklist items pass', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_01', unitId: 'u1', kind: 'routine' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_01', result: 'pass' });
      const result = await service.completeInspectionRun('ins_01', {
        checklist: [{ code: 'DOOR', label: 'Door', result: 'pass' }, { code: 'LOCK', label: 'Lock', result: 'pass' }],
      });
      expect(result.result).toBe('pass');
      expect(mockPrisma.inspectionRun.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'ins_01' },
        data: expect.objectContaining({ result: 'pass', completedAt: expect.any(Date) }),
      }));
    });

    it('sets result to fail when any checklist item fails', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_02', unitId: 'u1', kind: 'routine' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_02', result: 'fail' });
      const result = await service.completeInspectionRun('ins_02', {
        checklist: [{ code: 'DOOR', label: 'Door', result: 'pass' }, { code: 'LOCK', label: 'Lock', result: 'fail' }],
      });
      expect(result.result).toBe('fail');
    });

    it('updates unit status to available on move_out pass', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_03', unitId: 'u2', kind: 'move_out' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_03', result: 'pass' });
      await service.completeInspectionRun('ins_03', {
        checklist: [{ code: 'EMPTY', label: 'Empty', result: 'pass' }],
      });
      expect(mockPrisma.unit.update).toHaveBeenCalledWith({ where: { id: 'u2' }, data: { status: 'available' } });
    });

    it('updates unit status to maintenance on move_out fail', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_04', unitId: 'u2', kind: 'move_out' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_04', result: 'fail' });
      await service.completeInspectionRun('ins_04', {
        checklist: [{ code: 'EMPTY', label: 'Empty', result: 'fail' }],
      });
      expect(mockPrisma.unit.update).toHaveBeenCalledWith({ where: { id: 'u2' }, data: { status: 'maintenance' } });
    });

    it('does not update unit status for non-move_out inspections', async () => {
      mockPrisma.inspectionRun.findUniqueOrThrow.mockResolvedValue({ id: 'ins_05', unitId: 'u3', kind: 'move_in' });
      mockPrisma.inspectionRun.update.mockResolvedValue({ id: 'ins_05', result: 'pass' });
      await service.completeInspectionRun('ins_05', {
        checklist: [{ code: 'DOOR', label: 'Door', result: 'pass' }],
      });
      expect(mockPrisma.unit.update).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api && npx vitest run src/modules/operations/inspection.service.spec.ts
```

Expected: failures referencing `completeInspectionRun is not a function`.

- [ ] **Step 3: Implement `completeInspectionRun`**

Open `apps/api/src/modules/operations/inspection.service.ts` and replace with:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';

interface ChecklistItem { code: string; label: string; result: 'pass' | 'fail' | 'na'; note?: string; }

interface CreateInspectionInput {
  unitId: string;
  siteId: string;
  kind: string;
  checklist: ChecklistItem[];
  photoIds?: string[];
  notes?: string;
  contractId?: string;
  depositDeduction?: number;
}

interface CompleteInspectionInput {
  checklist: ChecklistItem[];
  notes?: string;
  photoIds?: string[];
  depositDeduction?: number;
}

@Injectable()
export class InspectionService {
  constructor(private prisma: PrismaClient) {}

  async createInspectionRun(input: CreateInspectionInput) {
    const { unitId, siteId, kind, checklist, photoIds = [], notes, contractId, depositDeduction } = input;

    const template = await this.prisma.inspectionTemplate.findFirst({ where: { siteId, kind } });
    const overallResult = checklist.every((item) => item.result !== 'fail') ? 'pass' : 'fail';

    const run = await this.prisma.inspectionRun.create({
      data: {
        unitId,
        templateId: template?.id,
        contractId,
        kind,
        result: overallResult,
        checklist: checklist as any,
        notes,
        depositDeduction,
        photoIds,
        completedAt: new Date(),
      },
    });

    if (kind === 'move_out') {
      const newStatus = overallResult === 'pass' ? 'available' : 'maintenance';
      await this.prisma.unit.update({ where: { id: unitId }, data: { status: newStatus as any } });
    }

    return { inspectionId: run.id, result: overallResult };
  }

  async completeInspectionRun(id: string, input: CompleteInspectionInput) {
    const { checklist, notes, photoIds = [], depositDeduction } = input;

    const existing = await this.prisma.inspectionRun.findUniqueOrThrow({ where: { id } });
    const overallResult = checklist.every((item) => item.result !== 'fail') ? 'pass' : 'fail';

    const run = await this.prisma.inspectionRun.update({
      where: { id },
      data: {
        checklist: checklist as any,
        notes,
        photoIds,
        depositDeduction,
        result: overallResult,
        completedAt: new Date(),
      },
    });

    if (existing.kind === 'move_out') {
      const newStatus = overallResult === 'pass' ? 'available' : 'maintenance';
      await this.prisma.unit.update({ where: { id: existing.unitId }, data: { status: newStatus as any } });
    }

    return { inspectionId: run.id, result: overallResult };
  }

  async assertMoveInInspectionComplete(unitId: string): Promise<void> {
    const completed = await this.prisma.inspectionRun.findFirst({ where: { unitId, kind: 'move_in', completedAt: { not: null } } });
    if (!completed) throw new DomainException(ErrorCodes.INSPECTION_REQUIRED, `Move-in inspection must be completed for unit ${unitId}`);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api && npx vitest run src/modules/operations/inspection.service.spec.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/operations/inspection.service.ts apps/api/src/modules/operations/inspection.service.spec.ts
git commit -m "feat(inspections): add completeInspectionRun service method"
```

---

## Task 2: Add PATCH endpoint to `OrgOperationsController`

**Files:**
- Modify: `apps/api/src/modules/operations/org-operations.controller.ts`

- [ ] **Step 1: Add the PATCH route**

Open `apps/api/src/modules/operations/org-operations.controller.ts`. After the `@Post('inspection-runs')` block (line ~115), add:

```typescript
  @Patch('inspection-runs/:id')
  @ApiOperation({ summary: 'Complete an in-progress inspection run' })
  completeInspectionRun(
    @Param('id') id: string,
    @Body() body: {
      checklist: { code: string; label: string; result: string; note?: string }[];
      notes?: string;
      photoIds?: string[];
      depositDeduction?: number;
    },
  ) {
    return this.inspections.completeInspectionRun(id, {
      checklist: body.checklist as any,
      notes: body.notes,
      photoIds: body.photoIds,
      depositDeduction: body.depositDeduction,
    });
  }
```

Make sure `Patch` is already in the imports at the top of the file — it is (`import { ..., Patch, ... } from '@nestjs/common'`).

- [ ] **Step 2: Verify the API builds**

```bash
cd apps/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/operations/org-operations.controller.ts
git commit -m "feat(inspections): add PATCH inspection-runs/:id endpoint"
```

---

## Task 3: Add Next.js proxy route `PATCH /api/inspections/[id]`

**Files:**
- Create: `apps/web/src/app/api/inspections/[id]/route.ts`

- [ ] **Step 1: Create the proxy file**

Create `apps/web/src/app/api/inspections/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/inspection-runs/${params.id}`,
    'PATCH',
    auth.token,
    body,
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/inspections/[id]/route.ts
git commit -m "feat(inspections): add PATCH /api/inspections/[id] proxy route"
```

---

## Task 4: Add `onContinue` prop and Continue button to `InspectionsTable`

**Files:**
- Modify: `apps/web/src/app/(dashboard)/inspections/InspectionsTable.tsx`

- [ ] **Step 1: Update the component**

Open `apps/web/src/app/(dashboard)/inspections/InspectionsTable.tsx`.

1. Update the `InspectionRow` interface at the top (no change needed — it already has all fields).

2. Change the component signature from:
```typescript
export default function InspectionsTable({ inspections }: { inspections: InspectionRow[] }) {
```
to:
```typescript
export default function InspectionsTable({ inspections, onContinue }: { inspections: InspectionRow[]; onContinue: (inspection: InspectionRow) => void }) {
```

3. In the table headers, add an empty header for the actions column. Replace:
```typescript
{['Site', 'Unit', 'Kind', 'Result', 'Checklist', 'Deposit', 'Completed', 'Created'].map((h) => (
```
with:
```typescript
{['Site', 'Unit', 'Kind', 'Result', 'Checklist', 'Deposit', 'Completed', 'Created', ''].map((h) => (
```

4. After the `{/* Created */}` `<td>` block (the last column), add a new `<td>` inside the row map:

```typescript
{/* Continue action */}
<td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
  {!insp.result && (
    <button
      onClick={() => onContinue(insp)}
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: '12px',
        fontWeight: 600,
        color: '#0369a1',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '6px',
        padding: '4px 12px',
        cursor: 'pointer',
      }}
    >
      Continue
    </button>
  )}
</td>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: error about `onContinue` not passed from `page.tsx` — this is expected and will be resolved in Task 6.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/inspections/InspectionsTable.tsx
git commit -m "feat(inspections): add Continue button to in-progress rows"
```

---

## Task 5: Create `InspectionComplete` modal component

**Files:**
- Create: `apps/web/src/app/(dashboard)/inspections/InspectionComplete.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/src/app/(dashboard)/inspections/InspectionComplete.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface ChecklistItem { code: string; label: string; result: 'pass' | 'fail' | 'na'; note: string; }

interface InspectionRow {
  id: string;
  siteId: string | null;
  unitId: string;
  kind: string;
  result: string | null;
  checklist: { code: string; label: string; result: string; note?: string }[] | null;
  notes: string | null;
  depositDeduction: number | null;
  photoIds?: string[];
}

interface Props {
  inspection: InspectionRow;
  onClose: () => void;
}

const KIND_LABEL: Record<string, string> = {
  move_in: 'Move in',
  move_out: 'Move out',
  routine: 'Routine',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '9px 12px',
  color: '#0f172a',
  fontSize: '14px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: '12px',
  fontWeight: 600,
  color: '#475569',
  marginBottom: '5px',
  letterSpacing: '0.03em',
};

function normalizeChecklist(raw: InspectionRow['checklist']): ChecklistItem[] {
  if (!raw || raw.length === 0) return [];
  return raw.map((item) => ({
    code: item.code,
    label: item.label,
    result: (item.result as 'pass' | 'fail' | 'na') ?? 'na',
    note: item.note ?? '',
  }));
}

export default function InspectionComplete({ inspection, onClose }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => normalizeChecklist(inspection.checklist));
  const [notes, setNotes] = useState(inspection.notes ?? '');
  const [depositDeduction, setDepositDeduction] = useState(inspection.depositDeduction?.toString() ?? '');
  const [newPhotos, setNewPhotos] = useState<{ file: File; previewUrl: string; uploading: boolean; photoId: string | null }[]>([]);
  const existingPhotoCount = inspection.photoIds?.length ?? 0;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function updateChecklistItem(index: number, field: 'result' | 'note', value: string) {
    setChecklist((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const added = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      photoId: null as string | null,
    }));
    setNewPhotos((prev) => [...prev, ...added]);

    await Promise.all(added.map(async (item) => {
      try {
        const formData = new FormData();
        formData.append('file', item.file, item.file.name);
        const res = await fetch('/api/inspections/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));
        setNewPhotos((prev) => {
          const idx = prev.findIndex((p) => p.file === item.file);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], uploading: false, photoId: data.photoId ?? null };
          return next;
        });
      } catch {
        setNewPhotos((prev) => {
          const idx = prev.findIndex((p) => p.file === item.file);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], uploading: false };
          return next;
        });
      }
    }));

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPhotos.some((p) => p.uploading)) {
      setError('Please wait for all photos to finish uploading.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/inspections/${inspection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklist,
          notes: notes || undefined,
          photoIds: [
            ...(inspection.photoIds ?? []),
            ...newPhotos.map((p) => p.photoId).filter(Boolean),
          ],
          depositDeduction: depositDeduction ? parseFloat(depositDeduction) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message ?? 'Failed');
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  const allDone = checklist.every((i) => i.result !== 'na');
  const failCount = checklist.filter((i) => i.result === 'fail').length;
  const passCount = checklist.filter((i) => i.result === 'pass').length;

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes insp-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes insp-modal-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .insp-complete-backdrop { animation: insp-backdrop-in 0.18s ease both; }
        .insp-complete-card { animation: insp-modal-in 0.22s ease both; }
        .insp-complete-input:focus { border-color: #94a3b8 !important; box-shadow: 0 0 0 3px rgba(148,163,184,0.15) !important; }
        .insp-complete-row:hover { background: #f8fafc; }
        .result-btn { border: 1px solid #e2e8f0; border-radius: 5px; padding: 3px 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.1s; }
        .result-btn.pass { background: #f0fdf4; color: #16a34a; border-color: #bbf7d0; }
        .result-btn.fail { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .result-btn.na   { background: #f8fafc; color: #94a3b8; border-color: #e2e8f0; }
        .result-btn.selected-pass { background: #16a34a; color: #fff; border-color: #16a34a; }
        .result-btn.selected-fail { background: #dc2626; color: #fff; border-color: #dc2626; }
        .result-btn.selected-na   { background: #94a3b8; color: #fff; border-color: #94a3b8; }
      `}</style>

      <div
        className="insp-complete-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(2px)',
          zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '24px', overflowY: 'auto',
        }}
      >
        <div
          className="insp-complete-card"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#ffffff', borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 60px rgba(15,23,42,0.18), 0 4px 16px rgba(15,23,42,0.08)',
            width: '100%', maxWidth: '520px',
            marginTop: '20px', marginBottom: '24px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Complete inspection</p>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: '3px 0 0' }}>Fill out the checklist to finish this inspection</p>
            </div>
            <button onClick={onClose} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: '14px', flexShrink: 0 }}>✕</button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Read-only summary */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { label: 'SITE', value: inspection.siteId ? inspection.siteId.slice(0, 8) + '…' : '—' },
                { label: 'UNIT', value: inspection.unitId.slice(0, 8) + '…' },
                { label: 'TYPE', value: KIND_LABEL[inspection.kind] ?? inspection.kind },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '10px', fontWeight: 700, color: '#94a3b8', margin: '0 0 2px', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Checklist */}
            {checklist.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>CHECKLIST</label>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '11px', color: '#94a3b8' }}>
                    {passCount} pass · {failCount} fail · {checklist.length - passCount - failCount} pending
                  </span>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {checklist.map((item, idx) => (
                    <div
                      key={item.code}
                      className="insp-complete-row"
                      style={{ padding: '10px 14px', borderBottom: idx < checklist.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.1s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#374151', flex: 1 }}>{item.label}</span>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          {(['pass', 'fail', 'na'] as const).map((v) => (
                            <button
                              key={v}
                              type="button"
                              className={`result-btn ${item.result === v ? `selected-${v}` : v}`}
                              onClick={() => updateChecklistItem(idx, 'result', v)}
                            >
                              {v === 'na' ? 'N/A' : v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {item.result === 'fail' && (
                        <input
                          type="text"
                          placeholder="Note reason or details…"
                          value={item.note}
                          onChange={(e) => updateChecklistItem(idx, 'note', e.target.value)}
                          style={{ ...inputStyle, marginTop: '8px', fontSize: '13px', padding: '7px 10px' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                {allDone && (
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: failCount > 0 ? '#dc2626' : '#16a34a', margin: '6px 0 0', fontWeight: 600 }}>
                    Overall result: {failCount > 0 ? `Fail (${failCount} item${failCount > 1 ? 's' : ''})` : 'Pass — all items OK'}
                  </p>
                )}
              </div>
            )}

            {/* Photos */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>
                  PHOTOS <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Add photos
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoSelect} />
              {existingPhotoCount > 0 && (
                <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#64748b', margin: '0 0 8px' }}>
                  {existingPhotoCount} photo{existingPhotoCount > 1 ? 's' : ''} already attached
                </p>
              )}
              {newPhotos.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {newPhotos.map((p, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                      <img src={p.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.uploading && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '10px', fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#64748b' }}>uploading…</span>
                        </div>
                      )}
                      {!p.uploading && (
                        <button type="button" onClick={() => removeNewPhoto(idx)} style={{ position: 'absolute', top: '3px', right: '3px', background: 'rgba(15,23,42,0.55)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '1px dashed #e2e8f0', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}
                >
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#94a3b8', margin: 0 }}>Click to add more photos</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>NOTES <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional observations or comments…"
                rows={3}
                className="insp-complete-input"
                style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
              />
            </div>

            {/* Deposit deduction — move_out only */}
            {inspection.kind === 'move_out' && (
              <div>
                <label style={labelStyle}>DEPOSIT DEDUCTION <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional, €)</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositDeduction}
                  onChange={(e) => setDepositDeduction(e.target.value)}
                  placeholder="0.00"
                  className="insp-complete-input"
                  style={inputStyle}
                />
                {depositDeduction && parseFloat(depositDeduction) > 0 && (
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '12px', color: '#f59e0b', margin: '4px 0 0' }}>
                    €{parseFloat(depositDeduction).toFixed(2)} will be noted for deposit deduction
                  </p>
                )}
              </div>
            )}

            {error && (
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '9px 12px', margin: 0 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid #f1f5f9', marginTop: '2px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{ flex: 2, background: loading ? '#e2e8f0' : '#0f172a', color: loading ? '#94a3b8' : '#ffffff', border: 'none', borderRadius: '8px', padding: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '13px', transition: 'background 0.15s' }}
              >
                {loading ? 'Saving…' : 'Complete inspection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors (or only the existing `onContinue` error from Task 4 — fixed in Task 6).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/inspections/InspectionComplete.tsx
git commit -m "feat(inspections): add InspectionComplete modal component"
```

---

## Task 6: Wire up `InspectionsPageClient` and update `page.tsx`

**Files:**
- Create: `apps/web/src/app/(dashboard)/inspections/InspectionsPageClient.tsx`
- Modify: `apps/web/src/app/(dashboard)/inspections/page.tsx`

- [ ] **Step 1: Create `InspectionsPageClient.tsx`**

Create `apps/web/src/app/(dashboard)/inspections/InspectionsPageClient.tsx`:

```typescript
'use client';

import { useState } from 'react';
import InspectionsTable from './InspectionsTable';
import InspectionComplete from './InspectionComplete';

interface InspectionRow {
  id: string;
  siteId: string | null;
  unitId: string;
  kind: string;
  result: string | null;
  checklist: { code: string; label: string; result: string; note?: string }[] | null;
  notes: string | null;
  depositDeduction: number | null;
  completedAt: string | null;
  createdAt: string;
  photoIds?: string[];
}

export default function InspectionsPageClient({ inspections }: { inspections: InspectionRow[] }) {
  const [selectedInspection, setSelectedInspection] = useState<InspectionRow | null>(null);

  return (
    <>
      <InspectionsTable
        inspections={inspections}
        onContinue={(insp) => setSelectedInspection(insp)}
      />
      {selectedInspection && (
        <InspectionComplete
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Update `page.tsx` to use `InspectionsPageClient`**

Open `apps/web/src/app/(dashboard)/inspections/page.tsx`. Replace the bottom of the file — the `<InspectionsTable inspections={inspections} />` line — with the new client component. The full updated file:

```typescript
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import InspectionActions from './InspectionActions';
import InspectionsPageClient from './InspectionsPageClient';

interface InspectionRow {
  id: string;
  siteId: string | null;
  unitId: string;
  kind: string;
  result: string | null;
  checklist: { code: string; label: string; result: string; note?: string }[] | null;
  notes: string | null;
  depositDeduction: number | null;
  completedAt: string | null;
  createdAt: string;
  photoIds?: string[];
}

interface Site {
  id: string;
  name: string;
}

export default async function InspectionsPage() {
  const user = await requireAuth();
  const [inspections, sites] = await Promise.all([
    serverFetch<InspectionRow[]>(`/v1/organisations/${user.organisationId}/inspections`).catch(() => [] as InspectionRow[]),
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(() => [] as Site[]),
  ]);

  const passed     = inspections.filter((i) => i.result === 'pass').length;
  const failed     = inspections.filter((i) => i.result === 'fail').length;
  const inProgress = inspections.filter((i) => !i.result).length;

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                Inspections
              </h1>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {failed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
                    {failed} failed
                  </span>
                )}
                {inProgress > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {inProgress} in progress
                  </span>
                )}
                {passed > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    {passed} passed
                  </span>
                )}
                {inspections.length === 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 600 }}>
                    No inspections yet
                  </span>
                )}
              </div>
            </div>
            <InspectionActions sites={sites} />
          </div>

          <InspectionsPageClient inspections={inspections} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/inspections/InspectionsPageClient.tsx apps/web/src/app/(dashboard)/inspections/page.tsx
git commit -m "feat(inspections): wire up InspectionsPageClient with complete modal"
```

---

## Task 7: Smoke test end-to-end

- [ ] **Step 1: Start the dev servers**

In one terminal: `cd apps/api && npm run start:dev`  
In another: `cd apps/web && npm run dev`

- [ ] **Step 2: Navigate to the inspections page**

Open `http://localhost:3001/inspections`.

- [ ] **Step 3: Verify the Continue button appears**

Filter by "In progress". Each row should show a blue "Continue" button in the last column. Completed rows (Pass/Fail) should have no button.

- [ ] **Step 4: Complete an inspection**

Click "Continue" on any in-progress row. The modal should open pre-populated with the existing checklist. Mark all items pass/fail/N/A. Click "Complete inspection". The modal should close and the row's status should change from "In progress" to "Pass" or "Fail".

- [ ] **Step 5: Verify move_out side effect (if applicable)**

If you completed a move_out inspection as pass, navigate to the corresponding unit and confirm its status changed to "available". For fail, confirm "maintenance".
