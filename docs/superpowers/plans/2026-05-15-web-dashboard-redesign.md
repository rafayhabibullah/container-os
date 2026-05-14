# Operator Dashboard Redesign — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `apps/web` operator dashboard with a collapsible icon sidebar, white-card UI on a slate-50 canvas, and a consistent table pattern across all core pages.

**Architecture:** A `(dashboard)` Next.js route group wraps all authenticated pages and injects a persistent CSS-only expand-on-hover sidebar (52 px → 200 px, no JavaScript). Public pages (`login`, `register`, `accept-invite`, `storage`) stay at the `app/` root and render without a sidebar. shadcn/ui is configured with `cssVariables: false` so existing Tailwind colour tokens are preserved.

**Tech Stack:** Next.js 14, Tailwind CSS 3.4, `@sitelager/ui` (Button/Card/Badge), `lucide-react`, shadcn/ui (configured; components added on demand), `clsx`, `tailwind-merge`

---

## File Map

**Create:**
- `apps/web/src/lib/utils.ts` — `cn` helper
- `apps/web/components.json` — shadcn config
- `apps/web/src/components/sidebar.tsx` — collapsible sidebar
- `apps/web/src/app/(dashboard)/layout.tsx` — shell layout

**Move (Next.js route groups don't change URLs):**
- `src/app/dashboard/` → `src/app/(dashboard)/dashboard/`
- `src/app/sites/` → `src/app/(dashboard)/sites/`
- `src/app/invoices/` → `src/app/(dashboard)/invoices/`
- `src/app/agreements/` → `src/app/(dashboard)/agreements/`
- `src/app/audit/` → `src/app/(dashboard)/audit/`
- `src/app/customers/` → `src/app/(dashboard)/customers/`
- `src/app/incidents/` → `src/app/(dashboard)/incidents/`
- `src/app/my-storage/` → `src/app/(dashboard)/my-storage/`
- `src/app/reports/` → `src/app/(dashboard)/reports/`
- `src/app/reservations/` → `src/app/(dashboard)/reservations/`
- `src/app/settings/` → `src/app/(dashboard)/settings/`
- `src/app/tasks/` → `src/app/(dashboard)/tasks/`
- `src/app/team/` → `src/app/(dashboard)/team/`

**Stay at root (public / no sidebar):**
`login/`, `register/`, `accept-invite/`, `storage/`, `api/`, `page.tsx`

**Modify:**
- `apps/web/package.json` — add `lucide-react`
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/sites/page.tsx`
- `apps/web/src/app/(dashboard)/invoices/page.tsx`

---

### Task 1: Add lucide-react and cn utility

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/utils.ts`

- [ ] **Step 1: Install lucide-react in apps/web**

Run from repo root:
```bash
pnpm add lucide-react --filter @sitelager/web
```
Expected: `apps/web/package.json` now lists `lucide-react` in `dependencies`.

- [ ] **Step 2: Create cn utility**

Create `apps/web/src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```
Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/src/lib/utils.ts pnpm-lock.yaml
git commit -m "feat(web): add lucide-react + cn utility"
```

---

### Task 2: Configure shadcn/ui

**Files:**
- Create: `apps/web/components.json`

- [ ] **Step 1: Create components.json**

Create `apps/web/components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": false,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

`cssVariables: false` preserves our existing `tailwind.config.ts` colour tokens (`navy`, `primary`) and avoids shadcn rewriting them to CSS variables.

- [ ] **Step 2: Commit**

```bash
git add apps/web/components.json
git commit -m "feat(web): configure shadcn/ui (cssVariables: false)"
```

---

### Task 3: Create sidebar component

**Files:**
- Create: `apps/web/src/components/sidebar.tsx`

- [ ] **Step 1: Create the sidebar**

Create `apps/web/src/components/sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sites', label: 'Sites', icon: Building2 },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reservations', label: 'Reservations', icon: CalendarCheck },
  { href: '/agreements', label: 'Agreements', icon: BookOpen },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/storage', label: 'Storefront', icon: Warehouse },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="group/sidebar flex flex-col bg-white border-r border-slate-200 w-[52px] hover:w-[200px] transition-all duration-200 ease-in-out overflow-hidden shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 h-[56px] shrink-0">
        <div className="w-[28px] h-[28px] shrink-0 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white text-[11px] font-bold leading-none">S</span>
        </div>
        <span className="text-slate-900 font-bold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
          SiteLager
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-1.5 flex-1 overflow-hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg border transition-colors',
                active
                  ? 'bg-blue-50 border-blue-100 text-blue-700'
                  : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span
                className={cn(
                  'text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings pinned at bottom */}
      <div className="p-1.5 shrink-0 border-t border-slate-100">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-lg border transition-colors',
            pathname.startsWith('/settings')
              ? 'bg-blue-50 border-blue-100 text-blue-700'
              : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
            Settings
          </span>
        </Link>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/sidebar.tsx
git commit -m "feat(web): add collapsible icon sidebar component"
```

---

### Task 4: Create (dashboard) route group and move pages

**Files:**
- Create: `apps/web/src/app/(dashboard)/layout.tsx`
- Move: all authenticated page directories into `(dashboard)/`

- [ ] **Step 1: Create the shell layout**

Create `apps/web/src/app/(dashboard)/layout.tsx`:
```tsx
import { Sidebar } from '@/components/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Move authenticated pages into (dashboard)**

Run from `apps/web/src/app/`:
```bash
mkdir -p "(dashboard)"
mv dashboard sites invoices agreements audit customers incidents my-storage reports reservations settings tasks team "(dashboard)/"
```

- [ ] **Step 3: Start dev server and verify routes**

```bash
pnpm dev --filter @sitelager/web
```
Check the following (all should work with no 404s):
- http://localhost:3001/login — login page, **no sidebar**
- http://localhost:3001/dashboard — dashboard page, **sidebar visible**
- http://localhost:3001/sites — sites page, **sidebar visible**
- http://localhost:3001/invoices — invoices page, **sidebar visible**
- Hover the collapsed sidebar → it expands to 200 px and shows labels

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/
git commit -m "feat(web): (dashboard) route group with shell layout + sidebar"
```

---

### Task 5: Redesign login page

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

- [ ] **Step 1: Replace the login page**

Replace the full content of `apps/web/src/app/login/page.tsx`:
```tsx
'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Login failed');
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-base">S</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to your operator account</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={255}
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                maxLength={128}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            {error && (
              <p role="alert" className="text-red-600 text-sm">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3001/login.
Expected: centred card, blue "S" monogram above card, "Welcome back" title, email + password inputs with slate-200 borders, blue submit button. No sidebar anywhere on the page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/login/page.tsx
git commit -m "feat(web): redesign login page — centred card, monogram logo"
```

---

### Task 6: Redesign dashboard page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Replace the dashboard page**

Replace the full content of `apps/web/src/app/(dashboard)/dashboard/page.tsx`:
```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Building2, Users } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export default async function DashboardPage() {
  const user = await requireAuth();

  const [sites, members] = await Promise.all([
    serverFetch<Site[]>(`/v1/organisations/${user.organisationId}/sites`).catch(
      () => [] as Site[],
    ),
    serverFetch<{ id: string }[]>(
      `/v1/organisations/${user.organisationId}/members`,
    ).catch(() => []),
  ]);

  const stats = [
    {
      label: 'TOTAL SITES',
      value: sites.length,
      icon: Building2,
      href: '/sites',
      highlight: false,
    },
    {
      label: 'TEAM MEMBERS',
      value: members.length,
      icon: Users,
      href: '/team',
      highlight: false,
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
          <span className="text-white text-xs font-semibold uppercase">
            {user.role?.[0] ?? 'U'}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`rounded-xl p-5 border transition-shadow hover:shadow-md ${
              stat.highlight
                ? 'bg-blue-600 border-blue-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <p
              className={`text-xs font-semibold tracking-wide mb-2 ${
                stat.highlight ? 'text-blue-200' : 'text-slate-400'
              }`}
            >
              {stat.label}
            </p>
            <p
              className={`text-3xl font-bold ${
                stat.highlight ? 'text-white' : 'text-slate-900'
              }`}
            >
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Recent sites preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Sites</h2>
          <Link
            href="/sites"
            className="text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            View all →
          </Link>
        </div>
        {sites.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-400 text-center">
            No sites yet.{' '}
            <Link href="/sites/new" className="text-blue-600 hover:underline">
              Add your first site →
            </Link>
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {sites.slice(0, 5).map((site) => (
              <div
                key={site.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50/30 transition-colors"
              >
                <span className="text-sm text-slate-700 font-medium">
                  {site.name}
                </span>
                <Link
                  href={`/sites/${site.id}`}
                  className="text-sm text-blue-600 font-medium hover:text-blue-700"
                >
                  Manage →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3001/dashboard.
Expected: sidebar on left, page header with date + avatar, stat card grid, sites preview card below.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat(web): redesign dashboard — stat cards + sites preview"
```

---

### Task 7: Redesign sites page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/sites/page.tsx`

- [ ] **Step 1: Replace the sites page**

Replace the full content of `apps/web/src/app/(dashboard)/sites/page.tsx`:
```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface SiteAddress {
  city: string;
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
  const sites = await serverFetch<Site[]>(
    `/v1/organisations/${user.organisationId}/sites`,
  ).catch(() => [] as Site[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sites</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {sites.length} location{sites.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user.role === 'owner' && (
          <Link
            href="/sites/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            + Add site
          </Link>
        )}
      </div>

      {/* Search toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search sites…</span>
        </div>
      </div>

      {/* Table / empty state */}
      {sites.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400 mb-3">No sites yet.</p>
          {user.role === 'owner' && (
            <Link
              href="/sites/new"
              className="text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Add your first site →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  City
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Slug
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site, i) => (
                <tr
                  key={site.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {site.name}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {site.address?.city}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">
                    {site.slug}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={site.status === 'active' ? 'success' : 'outline'}>
                      {site.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/sites/${site.id}`}
                      className="text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {sites.length} of {sites.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3001/sites.
Expected: page header + location count, search bar, table with alternating row shading, `Badge` status indicators, Manage links, pagination footer.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/sites/page.tsx
git commit -m "feat(web): redesign sites page — table pattern, badges, pagination"
```

---

### Task 8: Redesign invoices page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/invoices/page.tsx`

- [ ] **Step 1: Replace the invoices page**

Replace the full content of `apps/web/src/app/(dashboard)/invoices/page.tsx`:
```tsx
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import Link from 'next/link';
import { Badge } from '@sitelager/ui';
import { Search } from 'lucide-react';

interface InvoiceRow {
  id: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'void';
  invoiceDate: string;
  dueDate: string;
  currency: string;
  totalMinor: number;
  agreement: {
    customer: {
      id: string;
      personOrOrgData: {
        firstName?: string;
        lastName?: string;
        companyName?: string;
        name?: string;
      };
    };
  };
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'warning',
  sent: 'default',
  paid: 'success',
  overdue: 'destructive',
  void: 'outline',
};

function formatMinor(minor: number, currency: string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(
    minor / 100,
  );
}

function tenantName(customer: InvoiceRow['agreement']['customer']) {
  const d = customer.personOrOrgData;
  if (d.companyName) return d.companyName;
  if (d.name) return d.name;
  return [d.firstName, d.lastName].filter(Boolean).join(' ') || customer.id;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: { siteId?: string; status?: string };
}) {
  const user = await requireAuth();

  const params = new URLSearchParams();
  if (searchParams?.siteId) params.set('siteId', searchParams.siteId);
  if (searchParams?.status) params.set('status', searchParams.status);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const invoices = await serverFetch<InvoiceRow[]>(
    `/v1/organisations/${user.organisationId}/invoices${qs}`,
  ).catch(() => [] as InvoiceRow[]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        {user.role === 'owner' && (
          <div className="flex gap-2">
            <Link
              href="/invoices/export"
              className="border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Export DATEV
            </Link>
            <form action="/api/billing/run-invoices" method="POST">
              <input type="hidden" name="organisationId" value={user.organisationId} />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Run invoices
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Search toolbar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">Search invoices…</span>
        </div>
      </div>

      {/* Table / empty state */}
      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm text-slate-400">No invoices found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Tenant
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Invoice date
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Due date
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Amount
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => (
                <tr
                  key={inv.id}
                  className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors ${
                    i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {tenantName(inv.agreement.customer)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {new Date(inv.invoiceDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {new Date(inv.dueDate).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono text-slate-900">
                    {formatMinor(inv.totalMinor, inv.currency)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[inv.status] ?? 'outline'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-sm text-blue-600 font-medium hover:text-blue-700"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              Showing {invoices.length} of {invoices.length}
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-400 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:3001/invoices.
Expected: page header + count, search bar, table with tenant name / dates / amount (monospace) / status badge / View link, alternating rows, pagination footer.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(dashboard)/invoices/page.tsx
git commit -m "feat(web): redesign invoices page — table pattern, status badges"
```

---

### Task 9: Full build verification

- [ ] **Step 1: Run production build**

```bash
pnpm build --filter @sitelager/web
```
Expected: exits 0. Zero TypeScript errors, zero build errors.

- [ ] **Step 2: Full smoke test in browser**

With `pnpm dev --filter @sitelager/web` running, verify all of the following:

| URL | Expected |
|-----|----------|
| `/login` | Centred card, no sidebar |
| `/dashboard` | Sidebar + stat cards + sites preview |
| `/sites` | Sidebar + table with badges |
| `/invoices` | Sidebar + table with status badges |
| Hover sidebar | Expands 52 px → 200 px, labels fade in |
| Active nav item | Blue bg + blue text |
| `/team` | Sidebar present (unchanged page content, shell applied) |
| `/settings` | Sidebar present, Settings item highlighted |

- [ ] **Step 3: Push**

```bash
git push
```
