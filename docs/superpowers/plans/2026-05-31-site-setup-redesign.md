# Site Setup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scattered site/unit-types/units/pricing sub-pages with a single tabbed site detail page featuring inline forms, bulk unit generation, and a simplified pricing UI.

**Architecture:** The site detail page becomes a server component shell that fetches all data in parallel and passes it to a client-side `SiteDetailTabs` component. Each tab (UnitTypesTab, UnitsTab, PricingTab) is a focused client component that calls `router.refresh()` after mutations. The price book model is preserved in the API but hidden behind a simple rate table UI.

**Tech Stack:** Next.js 14 App Router, React client components, inline styles (Plus Jakarta Sans, existing dashboard palette), existing `/api/*` proxy routes pattern via `proxyToBackend`.

**Spec:** `docs/superpowers/specs/2026-05-31-site-setup-redesign-design.md`

---

## File Map

**New files:**
- `apps/web/src/app/(dashboard)/sites/[siteId]/SiteDetailTabs.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/UnitTypesTab.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/UnitsTab.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/PricingTab.tsx`
- `apps/web/src/app/api/sites/[siteId]/unit-types/[unitTypeId]/route.ts`
- `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/publish/route.ts`
- `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/archive/route.ts`

**Modified:**
- `apps/web/src/app/(dashboard)/sites/new/page.tsx` — redirect to `#unit-types` after creation
- `apps/web/src/app/(dashboard)/sites/[siteId]/page.tsx` — full rewrite as data-fetching shell
- `apps/web/src/app/api/sites/route.ts` — add GET handler
- `apps/web/src/app/api/sites/[siteId]/unit-types/route.ts` — add GET handler
- `apps/web/src/app/api/sites/[siteId]/price-books/route.ts` — add GET handler

**Replaced with redirects:**
- `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/page.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/new/page.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/units/page.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/units/new/page.tsx` (the `new/` page.tsx)
- `apps/web/src/app/(dashboard)/sites/[siteId]/pricing/page.tsx`

**Kept unchanged:**
- `apps/web/src/app/(dashboard)/sites/[siteId]/SiteEditForm.tsx`
- `apps/web/src/app/(dashboard)/sites/[siteId]/units/[unitId]/` (unit edit pages)

---

## Task 1: Add missing API proxy routes

**Files:**
- Modify: `apps/web/src/app/api/sites/route.ts`
- Modify: `apps/web/src/app/api/sites/[siteId]/unit-types/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/unit-types/[unitTypeId]/route.ts`
- Modify: `apps/web/src/app/api/sites/[siteId]/price-books/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/publish/route.ts`
- Create: `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/archive/route.ts`

- [ ] **Step 1: Add GET to sites route**

Replace the full content of `apps/web/src/app/api/sites/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET() {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites`,
    'GET', auth.token,
  );
}

export async function POST(request: NextRequest) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites`,
    'POST', auth.token, body,
  );
}
```

- [ ] **Step 2: Add GET to unit-types route**

Replace the full content of `apps/web/src/app/api/sites/[siteId]/unit-types/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/unit-types`,
    'GET', auth.token,
  );
}

export async function POST(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/unit-types`,
    'POST', auth.token, body,
  );
}
```

- [ ] **Step 3: Create unit-type PATCH/DELETE route**

Create `apps/web/src/app/api/sites/[siteId]/unit-types/[unitTypeId]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { siteId: string; unitTypeId: string } },
) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/unit-types/${params.unitTypeId}`,
    'PATCH', auth.token, body,
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { siteId: string; unitTypeId: string } },
) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/unit-types/${params.unitTypeId}`,
    'DELETE', auth.token,
  );
}
```

- [ ] **Step 4: Add GET to price-books route**

Replace the full content of `apps/web/src/app/api/sites/[siteId]/price-books/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function GET(request: NextRequest, { params }: { params: { siteId: string } }) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books`,
    'GET', auth.token,
  );
}

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

- [ ] **Step 5: Create publish route**

Create `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/publish/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; priceBookId: string } },
) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/publish`,
    'POST', auth.token,
  );
}
```

- [ ] **Step 6: Create archive route**

Create `apps/web/src/app/api/sites/[siteId]/price-books/[priceBookId]/archive/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, proxyToBackend } from '@/lib/api-route-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: { siteId: string; priceBookId: string } },
) {
  const auth = getAuthContext();
  if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return proxyToBackend(
    `/v1/organisations/${auth.payload.organisationId}/sites/${params.siteId}/price-books/${params.priceBookId}/archive`,
    'POST', auth.token,
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/sites/route.ts \
  apps/web/src/app/api/sites/\[siteId\]/unit-types/route.ts \
  apps/web/src/app/api/sites/\[siteId\]/unit-types/\[unitTypeId\]/route.ts \
  apps/web/src/app/api/sites/\[siteId\]/price-books/route.ts \
  apps/web/src/app/api/sites/\[siteId\]/price-books/\[priceBookId\]/publish/route.ts \
  apps/web/src/app/api/sites/\[siteId\]/price-books/\[priceBookId\]/archive/route.ts
git commit -m "feat(web): add missing API proxy routes for site setup redesign"
```

---

## Task 2: Update new-site redirect

**Files:**
- Modify: `apps/web/src/app/(dashboard)/sites/new/page.tsx`

- [ ] **Step 1: Change redirect target after site creation**

In `apps/web/src/app/(dashboard)/sites/new/page.tsx`, find the line:
```ts
router.push('/sites');
```
Replace with:
```ts
router.push(`/sites/${data.id}#unit-types`);
```

- [ ] **Step 2: Verify `data.id` is in scope**

The existing code already does `const data = await res.json()` before the redirect. The created site object returned by the API has an `id` field. No other changes needed.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(dashboard)/sites/new/page.tsx"
git commit -m "feat(web): redirect to unit-types tab after new site creation"
```

---

## Task 3: Create UnitTypesTab.tsx

**Files:**
- Create: `apps/web/src/app/(dashboard)/sites/[siteId]/UnitTypesTab.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/app/(dashboard)/sites/[siteId]/UnitTypesTab.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export interface UnitType {
  id: string;
  name: string;
  sizeSqm: number;
  sizeCbm: number | null;
  doorType: string | null;
  features: string[];
}

interface SiteSummary { id: string; name: string; }

interface Props {
  siteId: string;
  unitTypes: UnitType[];
  otherSites: SiteSummary[];
  canEdit: boolean;
}

const FEATURES = [
  { key: 'climate_controlled', label: 'Climate controlled' },
  { key: 'ground_floor',       label: 'Ground floor'       },
  { key: 'top_floor',          label: 'Top floor'          },
  { key: 'drive_up',           label: 'Drive-up'           },
  { key: 'outdoor',            label: 'Outdoor'            },
  { key: 'alarmed',            label: 'Alarmed'            },
];

const DOOR_OPTIONS = ['roller', 'swing', 'none', 'other'];

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569',
  marginBottom: '4px', letterSpacing: '0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnPrimary: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnGhost: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
  color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '9px 12px',
};
const btnSecondary: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 14px', fontWeight: 600, fontSize: '13px', color: '#475569',
  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
};

function UnitTypeForm({
  initial,
  onSave,
  onCancel,
  loading,
  error,
}: {
  initial?: UnitType;
  onSave: (data: Omit<UnitType, 'id'>) => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
}) {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(initial?.features ?? []);

  function toggleFeature(key: string) {
    setSelectedFeatures(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSave({
      name:     form.get('name') as string,
      sizeSqm:  parseFloat(form.get('sizeSqm') as string),
      sizeCbm:  form.get('sizeCbm') ? parseFloat(form.get('sizeCbm') as string) : null,
      doorType: (form.get('doorType') as string) || null,
      features: selectedFeatures,
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
        <div>
          <label style={lbl}>NAME</label>
          <input name="name" required defaultValue={initial?.name} placeholder="Small 5m²" style={inp} />
        </div>
        <div>
          <label style={lbl}>SIZE (M²)</label>
          <input name="sizeSqm" type="number" step="0.1" min="0.1" required defaultValue={initial?.sizeSqm} style={inp} />
        </div>
        <div>
          <label style={lbl}>VOLUME (M³)</label>
          <input name="sizeCbm" type="number" step="0.1" min="0" defaultValue={initial?.sizeCbm ?? ''} placeholder="optional" style={inp} />
        </div>
        <div>
          <label style={lbl}>DOOR</label>
          <select name="doorType" defaultValue={initial?.doorType ?? ''} style={inp}>
            <option value="">—</option>
            {DOOR_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>FEATURES</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {FEATURES.map(f => (
            <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedFeatures.includes(f.key)}
                onChange={() => toggleFeature(f.key)}
                style={{ width: '14px', height: '14px' }}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      {error && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Saving…' : initial ? 'Save changes' : 'Add type'}
        </button>
        <button type="button" onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
    </form>
  );
}

export default function UnitTypesTab({ siteId, unitTypes, otherSites, canEdit }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd]         = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [copyOpen, setCopyOpen]       = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError]     = useState('');

  async function handleCreate(data: Omit<UnitType, 'id'>) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setShowAdd(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleEdit(id: string, data: Omit<UnitType, 'id'>) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setEditingId(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete unit type "${name}"? This cannot be undone.`)) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/sites/${siteId}/unit-types/${id}`, { method: 'DELETE' });
      if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? 'Failed'); }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const res = await fetch(`/api/sites/${sourceSiteId}/unit-types`);
      const sourceTypes: UnitType[] = await res.json();
      if (!res.ok) throw new Error('Failed to fetch source unit types');
      const existingNames = new Set(unitTypes.map(ut => ut.name.toLowerCase()));
      const toImport = sourceTypes.filter(ut => !existingNames.has(ut.name.toLowerCase()));
      await Promise.all(toImport.map(ut =>
        fetch(`/api/sites/${siteId}/unit-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: ut.name, sizeSqm: ut.sizeSqm, sizeCbm: ut.sizeCbm, doorType: ut.doorType, features: ut.features }),
        }),
      ));
      setCopyOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : 'Failed');
    } finally { setCopyLoading(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {unitTypes.length} type{unitTypes.length !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>
                  Copy from…
                </button>
                {copyOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(15,23,42,0.10)', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                    {otherSites.map(s => (
                      <button key={s.id} disabled={copyLoading} onClick={() => handleCopyFrom(s.id)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {s.name}
                      </button>
                    ))}
                    {copyError && <p style={{ padding: '8px 14px', fontSize: '12px', color: '#dc2626', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{copyError}</p>}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setShowAdd(true); setError(''); }} style={btnPrimary}>
              + Add type
            </button>
          </div>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <UnitTypeForm
          onSave={handleCreate}
          onCancel={() => setShowAdd(false)}
          loading={loading}
          error={error}
        />
      )}

      {/* Table */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
        {unitTypes.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No unit types yet</p>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add types to define the sizes and features available at this site.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Name', 'Size (m²)', 'Volume (m³)', 'Door', 'Features', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unitTypes.map((ut, i) => (
                <>
                  {editingId === ut.id ? (
                    <tr key={`edit-${ut.id}`}>
                      <td colSpan={6} style={{ padding: '12px 16px', borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <UnitTypeForm
                          initial={ut}
                          onSave={(data) => handleEdit(ut.id, data)}
                          onCancel={() => setEditingId(null)}
                          loading={loading}
                          error={error}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={ut.id} style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none', background: '#ffffff' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeSqm}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.sizeCbm ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.doorType ?? '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.features.join(', ') || '—'}</td>
                      {canEdit && (
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button onClick={() => { setEditingId(ut.id); setError(''); }} style={{ ...btnGhost, padding: '4px 8px', fontSize: '12px' }}>Edit</button>
                          <button onClick={() => handleDelete(ut.id, ut.name)} style={{ ...btnGhost, padding: '4px 8px', fontSize: '12px', color: '#dc2626' }}>Delete</button>
                        </td>
                      )}
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/sites/[siteId]/UnitTypesTab.tsx"
git commit -m "feat(web): add UnitTypesTab with inline create/edit and copy-from"
```

---

## Task 4: Create UnitsTab.tsx

**Files:**
- Create: `apps/web/src/app/(dashboard)/sites/[siteId]/UnitsTab.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/app/(dashboard)/sites/[siteId]/UnitsTab.tsx`:

```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UnitType } from './UnitTypesTab';

interface Unit {
  id: string;
  unitCode: string;
  kind: string;
  status: string;
  driveUp: boolean;
  unitType: UnitType;
}

interface SiteSummary { id: string; name: string; }

interface Props {
  siteId: string;
  unitTypes: UnitType[];
  units: Unit[];
  otherSites: SiteSummary[];
  canEdit: boolean;
}

const UNIT_STATUS: Record<string, { dot: string; text: string; bg: string; border: string; label: string }> = {
  available:      { dot: '#16a34a', text: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Available'      },
  reserved:       { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Reserved'       },
  occupied:       { dot: '#0ea5e9', text: '#0369a1', bg: '#f0f9ff', border: '#bae6fd', label: 'Occupied'       },
  maintenance:    { dot: '#f59e0b', text: '#92400e', bg: '#fffbeb', border: '#fde68a', label: 'Maintenance'    },
  out_of_service: { dot: '#f87171', text: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Out of service' },
};

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569',
  marginBottom: '4px', letterSpacing: '0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnPrimary: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnGhost: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
  color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '9px 12px',
};
const btnSecondary: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 14px', fontWeight: 600, fontSize: '13px', color: '#475569',
  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
};

export default function UnitsTab({ siteId, unitTypes, units, otherSites, canEdit }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd]         = useState(false);
  const [showBulk, setShowBulk]       = useState(false);
  const [addLoading, setAddLoading]   = useState(false);
  const [addError, setAddError]       = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError]     = useState('');
  const [bulkProgress, setBulkProgress] = useState('');
  const [copyOpen, setCopyOpen]       = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError]     = useState('');

  // Bulk generator state
  const [bulkTypeId, setBulkTypeId]   = useState(unitTypes[0]?.id ?? '');
  const [bulkPrefix, setBulkPrefix]   = useState('A-');
  const [bulkStart, setBulkStart]     = useState(101);
  const [bulkCount, setBulkCount]     = useState(10);
  const [bulkKind, setBulkKind]       = useState('self_storage');
  const [bulkDriveUp, setBulkDriveUp] = useState(false);

  const bulkPreview = bulkCount > 0
    ? `Will create: ${bulkPrefix}${bulkStart}, ${bulkPrefix}${bulkStart + 1} … ${bulkPrefix}${bulkStart + bulkCount - 1}`
    : '';

  async function handleAddSingle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddLoading(true); setAddError('');
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/sites/${siteId}/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCode:   form.get('unitCode'),
          unitTypeId: form.get('unitTypeId'),
          kind:       form.get('kind'),
          driveUp:    (e.currentTarget.elements.namedItem('driveUp') as HTMLInputElement)?.checked ?? false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed');
      setShowAdd(false);
      router.refresh();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed');
    } finally { setAddLoading(false); }
  }

  async function handleBulkGenerate() {
    if (!bulkTypeId || bulkCount < 1) return;
    setBulkLoading(true); setBulkError(''); setBulkProgress('');
    const codes = Array.from({ length: bulkCount }, (_, i) => `${bulkPrefix}${bulkStart + i}`);
    let done = 0;
    try {
      await Promise.all(
        codes.map(async (unitCode) => {
          const res = await fetch(`/api/sites/${siteId}/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ unitCode, unitTypeId: bulkTypeId, kind: bulkKind, driveUp: bulkDriveUp }),
          });
          if (!res.ok) { const j = await res.json(); throw new Error(j.message ?? `Failed for ${unitCode}`); }
          done++;
          setBulkProgress(`Creating ${done} / ${codes.length}…`);
        }),
      );
      setShowBulk(false); setBulkProgress('');
      router.refresh();
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : 'Failed');
    } finally { setBulkLoading(false); }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const res = await fetch(`/api/sites/${sourceSiteId}/units`);
      if (!res.ok) throw new Error('Failed to fetch source units');
      const sourceUnits: Unit[] = await res.json();
      const existingCodes = new Set(units.map(u => u.unitCode));
      const toImport = sourceUnits.filter(u => !existingCodes.has(u.unitCode));
      // Map source unitTypeId → name, then match to current site by name
      const sourceTypeRes = await fetch(`/api/sites/${sourceSiteId}/unit-types`);
      const sourceTypes: UnitType[] = await sourceTypeRes.json();
      const sourceTypeMap = new Map(sourceTypes.map(t => [t.id, t.name]));
      const currentTypeByName = new Map(unitTypes.map(t => [t.name.toLowerCase(), t.id]));
      await Promise.all(toImport.map(u => {
        const typeName = sourceTypeMap.get(u.unitType?.id ?? '') ?? '';
        const mappedTypeId = currentTypeByName.get(typeName.toLowerCase());
        if (!mappedTypeId) return Promise.resolve(); // skip if no matching type
        return fetch(`/api/sites/${siteId}/units`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitCode: u.unitCode, unitTypeId: mappedTypeId, kind: u.kind, driveUp: u.driveUp }),
        });
      }));
      setCopyOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : 'Failed');
    } finally { setCopyLoading(false); }
  }

  // Group units by unit type
  const grouped = unitTypes.map(ut => ({
    type: ut,
    units: units.filter(u => u.unitType?.id === ut.id),
  })).filter(g => g.units.length > 0);
  const untyped = units.filter(u => !unitTypes.some(ut => ut.id === u.unitType?.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {units.length} unit{units.length !== 1 ? 's' : ''}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>Copy from…</button>
                {copyOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(15,23,42,0.10)', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                    {otherSites.map(s => (
                      <button key={s.id} disabled={copyLoading} onClick={() => handleCopyFrom(s.id)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {s.name}
                      </button>
                    ))}
                    {copyError && <p style={{ padding: '8px 14px', fontSize: '12px', color: '#dc2626', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{copyError}</p>}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setShowBulk(o => !o); setShowAdd(false); }} style={btnSecondary}>Generate units</button>
            <button onClick={() => { setShowAdd(o => !o); setShowBulk(false); setAddError(''); }} style={btnPrimary}>+ Add unit</button>
          </div>
        )}
      </div>

      {/* Single add form */}
      {showAdd && (
        <form onSubmit={handleAddSingle} style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ flex: '0 0 120px' }}>
            <label style={lbl}>UNIT CODE</label>
            <input name="unitCode" required placeholder="A-101" style={inp} />
          </div>
          <div style={{ flex: '0 0 200px' }}>
            <label style={lbl}>UNIT TYPE</label>
            <select name="unitTypeId" required style={inp}>
              <option value="">Select…</option>
              {unitTypes.map(ut => <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>)}
            </select>
          </div>
          <div style={{ flex: '0 0 150px' }}>
            <label style={lbl}>KIND</label>
            <select name="kind" style={inp}>
              <option value="self_storage">Self Storage</option>
              <option value="container">Container</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
            <input name="driveUp" type="checkbox" id="driveUpSingle" style={{ width: '14px', height: '14px' }} />
            <label htmlFor="driveUpSingle" style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Drive-up</label>
          </div>
          <button type="submit" disabled={addLoading} style={{ ...btnPrimary, opacity: addLoading ? 0.6 : 1 }}>
            {addLoading ? 'Creating…' : 'Add unit'}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} style={btnGhost}>Cancel</button>
          {addError && <p style={{ width: '100%', fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{addError}</p>}
        </form>
      )}

      {/* Bulk generator */}
      {showBulk && (
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 200px' }}>
              <label style={lbl}>UNIT TYPE</label>
              <select value={bulkTypeId} onChange={e => setBulkTypeId(e.target.value)} style={inp}>
                {unitTypes.map(ut => <option key={ut.id} value={ut.id}>{ut.name} ({ut.sizeSqm}m²)</option>)}
              </select>
            </div>
            <div style={{ flex: '0 0 100px' }}>
              <label style={lbl}>PREFIX</label>
              <input value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="A-" style={inp} />
            </div>
            <div style={{ flex: '0 0 90px' }}>
              <label style={lbl}>START #</label>
              <input type="number" min="1" value={bulkStart} onChange={e => setBulkStart(parseInt(e.target.value) || 1)} style={inp} />
            </div>
            <div style={{ flex: '0 0 80px' }}>
              <label style={lbl}>COUNT</label>
              <input type="number" min="1" max="200" value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value) || 1)} style={inp} />
            </div>
            <div style={{ flex: '0 0 120px' }}>
              <label style={lbl}>KIND</label>
              <select value={bulkKind} onChange={e => setBulkKind(e.target.value)} style={inp}>
                <option value="self_storage">Self Storage</option>
                <option value="container">Container</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '2px' }}>
              <input type="checkbox" id="bulkDriveUp" checked={bulkDriveUp} onChange={e => setBulkDriveUp(e.target.checked)} style={{ width: '14px', height: '14px' }} />
              <label htmlFor="bulkDriveUp" style={{ fontSize: '13px', color: '#475569', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Drive-up</label>
            </div>
          </div>
          {bulkPreview && (
            <p style={{ fontSize: '12px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 12px' }}>
              {bulkProgress || bulkPreview}
            </p>
          )}
          {bulkError && <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{bulkError}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleBulkGenerate} disabled={bulkLoading || bulkCount < 1 || !bulkTypeId} style={{ ...btnPrimary, opacity: (bulkLoading || bulkCount < 1) ? 0.6 : 1, cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>
              {bulkLoading ? bulkProgress || 'Generating…' : `Generate ${bulkCount} units`}
            </button>
            <button onClick={() => setShowBulk(false)} style={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      {units.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No units yet</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add individual units or use the generator to create them in bulk.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Code', 'Kind', 'Drive-up', 'Status', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ type, units: typeUnits }) => (
                <>
                  <tr key={`header-${type.id}`} style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <td colSpan={5} style={{ padding: '7px 16px', fontSize: '11px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {type.name} ({type.sizeSqm}m²) — {typeUnits.length} unit{typeUnits.length !== 1 ? 's' : ''}
                    </td>
                  </tr>
                  {typeUnits.map((unit, i) => {
                    const stat = UNIT_STATUS[unit.status] ?? { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: unit.status };
                    return (
                      <tr key={unit.id} style={{ borderBottom: i < typeUnits.length - 1 ? '1px solid #f8fafc' : '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{unit.unitCode}</td>
                        <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>{unit.kind.replace('_', ' ')}</td>
                        <td style={{ padding: '11px 16px', fontSize: '13px', color: unit.driveUp ? '#15803d' : '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{unit.driveUp ? 'Yes' : 'No'}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                            {stat.label}
                          </span>
                        </td>
                        <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                          <Link href={`/sites/${siteId}/units/${unit.id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit →</Link>
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
              {untyped.map((unit, i) => {
                const stat = UNIT_STATUS[unit.status] ?? { dot: '#94a3b8', text: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: unit.status };
                return (
                  <tr key={unit.id} style={{ borderBottom: i < untyped.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{unit.unitCode}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>{unit.kind.replace('_', ' ')}</td>
                    <td style={{ padding: '11px 16px', fontSize: '13px', color: unit.driveUp ? '#15803d' : '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{unit.driveUp ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: stat.bg, color: stat.text, border: `1px solid ${stat.border}`, borderRadius: '20px', padding: '2px 9px', fontSize: '12px', fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: stat.dot, display: 'inline-block', flexShrink: 0 }} />
                        {stat.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                      <Link href={`/sites/${siteId}/units/${unit.id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Edit →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/sites/[siteId]/UnitsTab.tsx"
git commit -m "feat(web): add UnitsTab with single create and bulk generator"
```

---

## Task 5: Create PricingTab.tsx

**Files:**
- Create: `apps/web/src/app/(dashboard)/sites/[siteId]/PricingTab.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/app/(dashboard)/sites/[siteId]/PricingTab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UnitType } from './UnitTypesTab';

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface SiteSummary { id: string; name: string; }

interface Props {
  siteId: string;
  unitTypes: UnitType[];
  priceBooks: PriceBook[];
  otherSites: SiteSummary[];
  canEdit: boolean;
}

const inp: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif",
  color: '#0f172a', outline: 'none', boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px',
  padding: '9px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};
const btnGhost: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
  color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
  padding: '9px 12px',
};
const btnSecondary: React.CSSProperties = {
  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
  padding: '9px 14px', fontWeight: 600, fontSize: '13px', color: '#475569',
  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
};

type RateMap = Record<string, { amountEur: string; billingCycle: string }>;

function buildInitialRates(unitTypes: UnitType[], publishedBook: PriceBook | undefined): RateMap {
  const map: RateMap = {};
  for (const ut of unitTypes) {
    const rule = publishedBook?.rules.find(r => r.unitTypeId === ut.id);
    map[ut.id] = {
      amountEur:    rule ? (rule.amountMinor / 100).toFixed(2) : '',
      billingCycle: rule?.billingCycle ?? 'monthly',
    };
  }
  return map;
}

export default function PricingTab({ siteId, unitTypes, priceBooks, otherSites, canEdit }: Props) {
  const router = useRouter();
  const publishedBook = priceBooks.find(pb => pb.status === 'published');
  const scheduledBook = priceBooks.find(pb => pb.status === 'draft' && new Date(pb.effectiveFrom) > new Date());

  const [editing, setEditing]           = useState(false);
  const [scheduling, setScheduling]     = useState(false);
  const [rates, setRates]               = useState<RateMap>(() => buildInitialRates(unitTypes, publishedBook));
  const [schedRates, setSchedRates]     = useState<RateMap>(() => buildInitialRates(unitTypes, publishedBook));
  const [schedDate, setSchedDate]       = useState('');
  const [saving, setSaving]             = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [copyOpen, setCopyOpen]         = useState(false);
  const [copyLoading, setCopyLoading]   = useState(false);
  const [copyError, setCopyError]       = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  async function createBookWithRules(
    name: string,
    effectiveFrom: string,
    rateMap: RateMap,
    publish: boolean,
  ) {
    // 1. Create price book
    const bookRes = await fetch(`/api/sites/${siteId}/price-books`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, effectiveFrom }),
    });
    const bookJson = await bookRes.json();
    if (!bookRes.ok) throw new Error(bookJson.message ?? 'Failed to create price book');
    const bookId: string = bookJson.id;

    // 2. Add rate rules
    await Promise.all(
      unitTypes
        .filter(ut => rateMap[ut.id]?.amountEur)
        .map(ut =>
          fetch(`/api/sites/${siteId}/price-books/${bookId}/rate-rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unitTypeId:   ut.id,
              amountMinor:  Math.round(parseFloat(rateMap[ut.id].amountEur) * 100),
              billingCycle: rateMap[ut.id].billingCycle,
            }),
          }),
        ),
    );

    // 3. Publish immediately if requested
    if (publish) {
      const pubRes = await fetch(`/api/sites/${siteId}/price-books/${bookId}/publish`, { method: 'POST' });
      if (!pubRes.ok) { const j = await pubRes.json(); throw new Error(j.message ?? 'Failed to publish'); }
    }
  }

  async function handleSaveNow() {
    setSaving(true); setSaveError('');
    try {
      const now = new Date().toISOString().split('T')[0];
      await createBookWithRules(`Rate update ${now}`, now, rates, true);
      setEditing(false);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  }

  async function handleSchedule() {
    if (!schedDate) { setSaveError('Please pick an effective date'); return; }
    setSaving(true); setSaveError('');
    try {
      await createBookWithRules(`Scheduled update ${schedDate}`, schedDate, schedRates, false);
      setScheduling(false);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  }

  async function handleCancelScheduled() {
    if (!scheduledBook) return;
    setCancelLoading(true);
    try {
      await fetch(`/api/sites/${siteId}/price-books/${scheduledBook.id}/archive`, { method: 'POST' });
      router.refresh();
    } finally { setCancelLoading(false); }
  }

  async function handleCopyFrom(sourceSiteId: string) {
    setCopyLoading(true); setCopyError('');
    try {
      const [pbRes, utRes] = await Promise.all([
        fetch(`/api/sites/${sourceSiteId}/price-books`),
        fetch(`/api/sites/${sourceSiteId}/unit-types`),
      ]);
      if (!pbRes.ok || !utRes.ok) throw new Error('Failed to fetch source data');
      const sourceBooks: PriceBook[] = await pbRes.json();
      const sourceTypes: UnitType[]  = await utRes.json();

      const sourcePublished = sourceBooks.find(pb => pb.status === 'published');
      if (!sourcePublished) throw new Error('Source site has no published price book');

      const sourceTypeById = new Map(sourceTypes.map(t => [t.id, t.name]));
      const currentTypeByName = new Map(unitTypes.map(t => [t.name.toLowerCase(), t.id]));

      const newRates: RateMap = { ...rates };
      const unmatched: string[] = [];

      for (const rule of sourcePublished.rules) {
        const sourceName = sourceTypeById.get(rule.unitTypeId);
        if (!sourceName) continue;
        const currentId = currentTypeByName.get(sourceName.toLowerCase());
        if (currentId) {
          newRates[currentId] = {
            amountEur:    (rule.amountMinor / 100).toFixed(2),
            billingCycle: rule.billingCycle,
          };
        } else {
          unmatched.push(sourceName);
        }
      }

      setRates(newRates);
      setEditing(true);
      setCopyOpen(false);
      if (unmatched.length > 0) {
        setCopyError(`No match for: ${unmatched.join(', ')} — set prices manually`);
      }
    } catch (err: unknown) {
      setCopyError(err instanceof Error ? err.message : 'Failed');
    } finally { setCopyLoading(false); }
  }

  const displayRates = editing ? rates : buildInitialRates(unitTypes, publishedBook);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Scheduled change notice */}
      {scheduledBook && !scheduling && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#92400e', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Rate change scheduled for {new Date(scheduledBook.effectiveFrom).toLocaleDateString('de-DE')}
          </span>
          <button onClick={handleCancelScheduled} disabled={cancelLoading}
            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, color: '#92400e', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {cancelLoading ? '…' : 'Cancel'}
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {publishedBook ? `Active since ${new Date(publishedBook.effectiveFrom).toLocaleDateString('de-DE')}` : 'No published rates yet'}
        </span>
        {canEdit && !editing && !scheduling && (
          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            {otherSites.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setCopyOpen(o => !o)} style={btnSecondary}>Copy from…</button>
                {copyOpen && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: '4px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(15,23,42,0.10)', zIndex: 10, minWidth: '180px', overflow: 'hidden' }}>
                    {otherSites.map(s => (
                      <button key={s.id} disabled={copyLoading} onClick={() => handleCopyFrom(s.id)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '10px 14px', fontSize: '13px', color: '#0f172a', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {s.name}
                      </button>
                    ))}
                    {copyError && <p style={{ padding: '8px 14px', fontSize: '12px', color: '#dc2626', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{copyError}</p>}
                  </div>
                )}
              </div>
            )}
            <button onClick={() => { setEditing(true); setRates(buildInitialRates(unitTypes, publishedBook)); setSaveError(''); }} style={btnPrimary}>
              Edit prices
            </button>
          </div>
        )}
      </div>

      {/* Copy error shown outside dropdown */}
      {copyError && !copyOpen && (
        <p style={{ fontSize: '12px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '8px 12px', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{copyError}</p>
      )}

      {/* Rate table */}
      {unitTypes.length === 0 ? (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>No unit types defined</p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Add unit types first to set prices.</p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Unit type', 'Monthly rate (€)', 'Billing cycle'].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {unitTypes.map((ut, i) => {
                const rate = displayRates[ut.id];
                return (
                  <tr key={ut.id} style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {ut.name} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400 }}>({ut.sizeSqm}m²)</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={rate?.amountEur ?? ''}
                          onChange={e => setRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], amountEur: e.target.value } }))}
                          style={{ ...inp, width: '120px' }}
                        />
                      ) : (
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {rate?.amountEur ? `€${parseFloat(rate.amountEur).toFixed(2)}` : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editing ? (
                        <select
                          value={rate?.billingCycle ?? 'monthly'}
                          onChange={e => setRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], billingCycle: e.target.value } }))}
                          style={{ ...inp, width: '140px' }}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="fixed_term">Fixed term</option>
                        </select>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#64748b', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
                          {rate?.billingCycle?.replace('_', ' ') ?? '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {editing && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={handleSaveNow} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Save & publish now'}
              </button>
              <button onClick={() => setEditing(false)} style={btnGhost}>Cancel</button>
              {saveError && <span style={{ fontSize: '12px', color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{saveError}</span>}
            </div>
          )}
        </div>
      )}

      {/* Schedule rate change */}
      {canEdit && !editing && !scheduledBook && unitTypes.length > 0 && (
        <div>
          {scheduling ? (
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Effective date</span>
                <input type="date" value={schedDate} min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  onChange={e => setSchedDate(e.target.value)} style={{ ...inp, width: '160px' }} />
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {unitTypes.map((ut, i) => {
                    const r = schedRates[ut.id];
                    return (
                      <tr key={ut.id} style={{ borderBottom: i < unitTypes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                        <td style={{ padding: '11px 16px', fontSize: '14px', fontWeight: 600, color: '#0f172a', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ut.name}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <input type="number" step="0.01" min="0" placeholder="0.00" value={r?.amountEur ?? ''}
                            onChange={e => setSchedRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], amountEur: e.target.value } }))}
                            style={{ ...inp, width: '120px' }} />
                        </td>
                        <td style={{ padding: '11px 16px' }}>
                          <select value={r?.billingCycle ?? 'monthly'}
                            onChange={e => setSchedRates(prev => ({ ...prev, [ut.id]: { ...prev[ut.id], billingCycle: e.target.value } }))}
                            style={{ ...inp, width: '140px' }}>
                            <option value="monthly">Monthly</option>
                            <option value="fixed_term">Fixed term</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={handleSchedule} disabled={saving || !schedDate} style={{ ...btnPrimary, opacity: (saving || !schedDate) ? 0.6 : 1, cursor: (saving || !schedDate) ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Scheduling…' : 'Schedule rate change'}
                </button>
                <button onClick={() => setScheduling(false)} style={btnGhost}>Cancel</button>
                {saveError && <span style={{ fontSize: '12px', color: '#dc2626', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{saveError}</span>}
              </div>
            </div>
          ) : (
            <button onClick={() => { setScheduling(true); setSchedRates(buildInitialRates(unitTypes, publishedBook)); setSaveError(''); }}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 0 }}>
              Schedule a rate change →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/sites/[siteId]/PricingTab.tsx"
git commit -m "feat(web): add PricingTab with inline edit, scheduled changes, and copy-from"
```

---

## Task 6: Create SiteDetailTabs.tsx

**Files:**
- Create: `apps/web/src/app/(dashboard)/sites/[siteId]/SiteDetailTabs.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/app/(dashboard)/sites/[siteId]/SiteDetailTabs.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import SiteEditForm from './SiteEditForm';
import UnitTypesTab, { type UnitType } from './UnitTypesTab';
import UnitsTab from './UnitsTab';
import PricingTab from './PricingTab';

type Tab = 'unit-types' | 'units' | 'pricing';

interface Site {
  id: string; name: string; slug: string; status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}

interface Unit {
  id: string; unitCode: string; kind: string; status: string; driveUp: boolean;
  unitType: UnitType;
}

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface SiteSummary { id: string; name: string; }

interface Props {
  site: Site;
  unitTypes: UnitType[];
  units: Unit[];
  priceBooks: PriceBook[];
  otherSites: SiteSummary[];
  userRole: string;
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'unit-types', label: 'Unit Types' },
  { key: 'units',      label: 'Units'      },
  { key: 'pricing',    label: 'Pricing'    },
];

export default function SiteDetailTabs({ site, unitTypes, units, priceBooks, otherSites, userRole }: Props) {
  const [activeTab, setActiveTab]           = useState<Tab>('unit-types');
  const [settingsOpen, setSettingsOpen]     = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Tab;
    if (['unit-types', 'units', 'pricing'].includes(hash)) setActiveTab(hash);
  }, []);

  function handleTabClick(tab: Tab) {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }

  const hasUnitTypes   = unitTypes.length > 0;
  const hasUnits       = units.length > 0;
  const hasPricing     = priceBooks.some(pb => pb.status === 'published');
  const showHint       = !hasUnitTypes || !hasUnits || !hasPricing;

  const canEdit = userRole === 'owner';

  const STEPS = [
    { label: 'Add unit types', done: hasUnitTypes, tab: 'unit-types' as Tab },
    { label: 'Add units',      done: hasUnits,     tab: 'units'      as Tab },
    { label: 'Set pricing',    done: hasPricing,   tab: 'pricing'    as Tab },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Getting started hint */}
      {showHint && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '24px', alignItems: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Get started</span>
          {STEPS.map((step, i) => (
            <button key={step.tab} onClick={() => handleTabClick(step.tab)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: step.done ? '#f0fdf4' : '#f1f5f9', color: step.done ? '#15803d' : '#94a3b8', border: `1px solid ${step.done ? '#bbf7d0' : '#e2e8f0'}`, flexShrink: 0 }}>
                {step.done ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: step.done ? '#15803d' : '#475569', textDecoration: step.done ? 'line-through' : 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {step.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Collapsible site settings */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: '20px', overflow: 'hidden' }}>
        <button onClick={() => setSettingsOpen(o => !o)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Site Settings</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
        </button>
        {settingsOpen && (
          <div style={{ padding: '0 20px 20px' }}>
            <SiteEditForm site={site} />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => handleTabClick(tab.key)}
            style={{
              background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #0f172a' : '2px solid transparent',
              marginBottom: '-2px', padding: '10px 18px', fontSize: '14px', fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#0f172a' : '#64748b', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color 0.12s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'unit-types' && (
        <UnitTypesTab siteId={site.id} unitTypes={unitTypes} otherSites={otherSites} canEdit={canEdit} />
      )}
      {activeTab === 'units' && (
        <UnitsTab siteId={site.id} unitTypes={unitTypes} units={units} otherSites={otherSites} canEdit={canEdit} />
      )}
      {activeTab === 'pricing' && (
        <PricingTab siteId={site.id} unitTypes={unitTypes} priceBooks={priceBooks} otherSites={otherSites} canEdit={canEdit} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/sites/[siteId]/SiteDetailTabs.tsx"
git commit -m "feat(web): add SiteDetailTabs with tab switcher, hint strip, and collapsible settings"
```

---

## Task 7: Rebuild the site detail page.tsx

**Files:**
- Modify: `apps/web/src/app/(dashboard)/sites/[siteId]/page.tsx`

- [ ] **Step 1: Replace page.tsx with the data-fetching shell**

Replace the full content of `apps/web/src/app/(dashboard)/sites/[siteId]/page.tsx`:

```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import SiteDetailTabs from './SiteDetailTabs';
import Link from 'next/link';

interface UnitType { id: string; name: string; sizeSqm: number; sizeCbm: number | null; doorType: string | null; features: string[]; }
interface Unit { id: string; unitCode: string; kind: string; status: string; driveUp: boolean; unitType: UnitType; }
interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface Site {
  id: string; name: string; slug: string; status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}
interface SiteSummary { id: string; name: string; }

export default async function SiteDetailPage({ params }: { params: { siteId: string } }) {
  const user = await requireAuth();
  const base = `/v1/organisations/${user.organisationId}`;

  const [site, unitTypes, units, priceBooks, allSites] = await Promise.all([
    serverFetch<Site>(`${base}/sites/${params.siteId}`),
    serverFetch<UnitType[]>(`${base}/sites/${params.siteId}/unit-types`).catch(() => [] as UnitType[]),
    serverFetch<Unit[]>(`${base}/sites/${params.siteId}/units`).catch(() => [] as Unit[]),
    serverFetch<PriceBook[]>(`${base}/sites/${params.siteId}/price-books`).catch(() => [] as PriceBook[]),
    serverFetch<SiteSummary[]>(`${base}/sites`).catch(() => [] as SiteSummary[]),
  ]);

  const otherSites = allSites.filter(s => s.id !== params.siteId);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '36px 40px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          <Link href="/sites" style={{ display: 'inline-block', fontSize: '13px', fontWeight: 600, color: '#64748b', textDecoration: 'none', marginBottom: '20px' }}>
            ← Sites
          </Link>

          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 24px', letterSpacing: '-0.02em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {site.name}
          </h1>

          <SiteDetailTabs
            site={site}
            unitTypes={unitTypes}
            units={units}
            priceBooks={priceBooks}
            otherSites={otherSites}
            userRole={user.role}
          />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "apps/web/src/app/(dashboard)/sites/[siteId]/page.tsx"
git commit -m "feat(web): rebuild site detail page as tabbed layout"
```

---

## Task 8: Replace old sub-pages with redirects

**Files:**
- Modify: `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/new/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/sites/[siteId]/units/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/sites/[siteId]/units/new/page.tsx`
- Modify: `apps/web/src/app/(dashboard)/sites/[siteId]/pricing/page.tsx`

- [ ] **Step 1: Replace each old sub-page with a redirect**

Replace the full content of `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function UnitTypesRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#unit-types`);
}
```

Replace the full content of `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/new/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function NewUnitTypeRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#unit-types`);
}
```

Replace the full content of `apps/web/src/app/(dashboard)/sites/[siteId]/units/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function UnitsRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#units`);
}
```

Replace the full content of `apps/web/src/app/(dashboard)/sites/[siteId]/units/new/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function NewUnitRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#units`);
}
```

Replace the full content of `apps/web/src/app/(dashboard)/sites/[siteId]/pricing/page.tsx`:
```tsx
import { redirect } from 'next/navigation';
export default function PricingRedirect({ params }: { params: { siteId: string } }) {
  redirect(`/sites/${params.siteId}#pricing`);
}
```

- [ ] **Step 2: Commit**

```bash
git add \
  "apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/page.tsx" \
  "apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/new/page.tsx" \
  "apps/web/src/app/(dashboard)/sites/[siteId]/units/page.tsx" \
  "apps/web/src/app/(dashboard)/sites/[siteId]/units/new/page.tsx" \
  "apps/web/src/app/(dashboard)/sites/[siteId]/pricing/page.tsx"
git commit -m "feat(web): redirect old sub-pages to new tabbed site detail"
```

---

## Task 9: Smoke test

- [ ] **Step 1: Start the dev server**

```bash
# Terminal 1 — start the API
cd apps/api && pnpm dev

# Terminal 2 — start the web app
cd apps/web && NEXT_PUBLIC_API_URL="http://localhost:3000/api" pnpm dev
```

- [ ] **Step 2: Verify new site redirect**

1. Go to `http://localhost:3001/sites/new`
2. Fill in site name + address, click "Create site"
3. Confirm you land on `/sites/[newId]#unit-types` with the Unit Types tab active and the "Get started" hint strip visible

- [ ] **Step 3: Verify unit types tab**

1. Click "+ Add type", fill in name + size + features (checkboxes), save
2. Confirm the row appears in the table without a page reload
3. Click "Edit" on the row, change a field, save — confirm the row updates
4. Click "Delete" — confirm the row disappears

- [ ] **Step 4: Verify units tab**

1. Switch to the Units tab
2. Click "+ Add unit", fill in code + type + kind, save — confirm the unit appears grouped under its type
3. Click "Generate units", set prefix "B-", start 101, count 5, click generate
4. Confirm 5 units appear: B-101 through B-105
5. Confirm "Get started" step 2 is now checked

- [ ] **Step 5: Verify pricing tab**

1. Switch to Pricing tab
2. Click "Edit prices", set €50.00 for each type, click "Save & publish now"
3. Confirm the table now shows the prices and "Get started" step 3 is now checked
4. Confirm the hint strip disappears once all 3 steps are done
5. Click "Schedule a rate change →", set a future date, enter new prices, click "Schedule"
6. Confirm the yellow notice appears with the scheduled date and a "Cancel" button
7. Click "Cancel" — confirm the notice disappears

- [ ] **Step 6: Verify old sub-pages redirect**

1. Navigate to `/sites/[siteId]/unit-types` — confirm redirect to `#unit-types`
2. Navigate to `/sites/[siteId]/pricing` — confirm redirect to `#pricing`

- [ ] **Step 7: Verify collapsible settings**

1. On the site detail page, click "Site Settings" — confirm the form expands
2. Edit the site name, click "Save changes" — confirm it updates
3. Click "Site Settings" again — confirm it collapses
