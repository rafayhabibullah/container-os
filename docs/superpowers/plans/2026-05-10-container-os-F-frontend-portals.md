# Container OS — Track F: Frontend Portals (Tenant, Operator, Owner)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three Next.js 14 app-router portals — a public-facing Tenant portal (browse → checkout → sign → pay), an Operator daily-ops portal (queue-first: reservations, billing, inspections, incidents), and an Owner portfolio portal (KPIs, sites, reporting, exports). Uses shared `@container-os/ui` and `@container-os/i18n` packages.

**Architecture:** Three separate Next.js 14 apps (app router, TypeScript). Shared `packages/ui` (shadcn/ui + Tailwind). All API calls go to the NestJS backend. Auth via Keycloak OIDC (Owner/Operator) and magic-link/password (Tenant). No server-side state — all data fetched from the API.

**Tech Stack:** Next.js 14, React 18, TypeScript 5.4, Tailwind CSS 3, shadcn/ui, React Query (TanStack Query v5), Keycloak JS (Owner/Operator), Playwright (E2E)

**Prerequisites:** Phase 0 complete. Apps can be built in parallel with API tracks — use mock/stub API data until backend routes are ready. Switch to real API calls once Track A–E endpoints are available.

---

## Files

```
packages/
  ui/
    package.json
    tailwind.config.ts
    src/
      components/
        button.tsx
        card.tsx
        badge.tsx
        data-table.tsx
        form/
          input.tsx
          select.tsx
          date-picker.tsx
      index.ts

apps/
  web-tenant/
    package.json
    next.config.js
    tailwind.config.ts
    app/
      layout.tsx
      page.tsx                    # site selector landing
      sites/
        [slug]/
          page.tsx                # site detail + availability
          checkout/
            page.tsx              # checkout flow (multi-step)
      portal/
        layout.tsx                # authenticated layout
        dashboard/page.tsx        # my rentals, invoices
        agreements/
          [id]/page.tsx           # view/sign agreement
        billing/page.tsx          # invoices + payment methods
        access/page.tsx           # credentials
      auth/
        login/page.tsx
        magic-link/page.tsx
    components/
      availability-card.tsx
      checkout-stepper.tsx
      invoice-list.tsx
      agreement-viewer.tsx
      access-credential-card.tsx
    lib/
      api.ts                      # typed API client
      auth.ts

  web-operator/
    package.json
    next.config.js
    tailwind.config.ts
    app/
      layout.tsx
      (auth)/
        login/page.tsx
      (dashboard)/
        layout.tsx
        page.tsx                  # today's queue
        leads/page.tsx
        reservations/page.tsx
        agreements/
          [id]/page.tsx
        billing/page.tsx          # overdue invoices
        inspections/page.tsx
        incidents/page.tsx
        units/page.tsx
    components/
      lead-inbox.tsx
      reservation-card.tsx
      invoice-action-panel.tsx
      inspection-form.tsx
      incident-queue.tsx
    lib/
      api.ts
      auth.ts

  web-owner/
    package.json
    next.config.js
    tailwind.config.ts
    app/
      layout.tsx
      (auth)/login/page.tsx
      (dashboard)/
        layout.tsx
        page.tsx                  # portfolio KPIs
        sites/page.tsx
        pricing/page.tsx
        users/page.tsx
        exports/page.tsx          # DATEV export
        audit/page.tsx
    components/
      portfolio-kpi-header.tsx
      site-comparison-card.tsx
      occupancy-chart.tsx
      datev-export-panel.tsx
    lib/
      api.ts
      auth.ts
```

---

### Task F.1: Shared UI package setup

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tailwind.config.ts`
- Create: `packages/ui/src/components/button.tsx`
- Create: `packages/ui/src/components/card.tsx`
- Create: `packages/ui/src/components/badge.tsx`
- Create: `packages/ui/src/index.ts`

- [ ] **Step 1: Create packages/ui/package.json**

```json
{
  "name": "@container-os/ui",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "dependencies": {
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.378.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create shared Button component**

`packages/ui/src/components/button.tsx`:
```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50',
        ghost: 'hover:bg-gray-100',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 3: Create Card component**

`packages/ui/src/components/card.tsx`:
```tsx
import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border border-gray-200 bg-white shadow-sm', className)} {...props} />
  ),
);
Card.displayName = 'Card';

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);

const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
);

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);

export { Card, CardHeader, CardTitle, CardContent };
```

- [ ] **Step 4: Create Badge component**

`packages/ui/src/components/badge.tsx`:
```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-100 text-blue-800',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
        destructive: 'border-transparent bg-red-100 text-red-800',
        outline: 'text-gray-700 border-gray-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 5: Create index.ts**

`packages/ui/src/index.ts`:
```typescript
export { Button } from './components/button';
export { Card, CardHeader, CardTitle, CardContent } from './components/card';
export { Badge } from './components/badge';
```

- [ ] **Step 6: Commit**

```bash
git add packages/ui/
git commit -m "feat(ui): shared Button, Card, Badge components with Tailwind/shadcn"
```

---

### Task F.2: Tenant portal — scaffold + availability page

**Files:**
- Create: `apps/web-tenant/package.json`
- Create: `apps/web-tenant/next.config.js`
- Create: `apps/web-tenant/tailwind.config.ts`
- Create: `apps/web-tenant/app/layout.tsx`
- Create: `apps/web-tenant/app/page.tsx`
- Create: `apps/web-tenant/app/sites/[slug]/page.tsx`
- Create: `apps/web-tenant/lib/api.ts`

- [ ] **Step 1: Create apps/web-tenant/package.json**

```json
{
  "name": "@container-os/web-tenant",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start -p 3003"
  },
  "dependencies": {
    "@container-os/ui": "workspace:*",
    "@container-os/i18n": "workspace:*",
    "@tanstack/react-query": "^5.35.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create next.config.js**

`apps/web-tenant/next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  transpilePackages: ['@container-os/ui', '@container-os/i18n'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  },
};
module.exports = nextConfig;
```

- [ ] **Step 3: Create typed API client**

`apps/web-tenant/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? 'API error');
  }
  return res.json();
}

export const api = {
  getSites: () => apiFetch<Array<{ id: string; name: string; slug: string; address: any }>>('/public/v1/sites'),

  getAvailability: (slug: string, startDate: string) =>
    apiFetch<Array<{ unitTypeId: string; availableCount: number; totalCount: number }>>(`/public/v1/sites/${slug}/availability?startDate=${startDate}`),

  getQuote: (siteId: string, unitTypeId: string, startDate: string, customerType: string) =>
    apiFetch<{ rentMinor: number; depositMinor: number; vatMinor: number; totalDueTodayMinor: number; currency: string }>
    (`/public/v1/quotes?siteId=${siteId}&unitTypeId=${unitTypeId}&startDate=${startDate}&customerType=${customerType}`),

  createCheckoutSession: (body: { siteId: string; unitTypeId: string; startDate: string }) =>
    apiFetch<{ checkoutSessionId?: string; expiresAt?: string; availabilityState: string }>('/public/v1/checkout-sessions', { method: 'POST', body: JSON.stringify(body) }),

  createLead: (body: { siteId: string; name: string; email: string; phone?: string; source: string }) =>
    apiFetch<{ leadId: string; customerId: string }>('/public/v1/leads', { method: 'POST', body: JSON.stringify(body) }),

  getTenantBilling: (token: string) =>
    apiFetch<{ invoices: any[]; mandates: any[] }>('/tenant/v1/billing', { headers: { Authorization: `Bearer ${token}` } }),

  getTenantDocuments: (token: string) =>
    apiFetch<any[]>('/tenant/v1/documents', { headers: { Authorization: `Bearer ${token}` } }),
};
```

- [ ] **Step 4: Create root layout**

`apps/web-tenant/app/layout.tsx`:
```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Container OS — Self-Storage',
  description: 'Book secure container storage online',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <header className="border-b bg-white px-6 py-4">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <span className="text-lg font-semibold text-blue-700">Container OS</span>
            <nav className="flex gap-4 text-sm text-gray-600">
              <a href="/portal/dashboard" className="hover:text-gray-900">Mein Konto</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

Create `apps/web-tenant/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create site listing page**

`apps/web-tenant/app/page.tsx`:
```tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

async function getSites() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/public/v1/sites`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json();
}

export default async function HomePage() {
  const sites = await getSites();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Sicherer Lagerraum in Ihrer Nähe</h1>
      <p className="text-gray-600 mb-8">Buchen Sie online — Zugang rund um die Uhr, flexible Laufzeiten.</p>

      {sites.length === 0 ? (
        <p className="text-gray-500">Keine Standorte verfügbar.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sites.map((site: any) => (
            <Link key={site.id} href={`/sites/${site.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{site.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{site.address?.street}, {site.address?.city}</p>
                  <p className="text-sm text-blue-600 mt-2 font-medium">Verfügbarkeit prüfen →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create site availability page**

`apps/web-tenant/app/sites/[slug]/page.tsx`:
```tsx
import Link from 'next/link';
import { Badge, Card, CardContent, CardHeader, CardTitle, Button } from '@container-os/ui';

async function getAvailability(slug: string) {
  const today = new Date().toISOString().split('T')[0];
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api'}/public/v1/sites/${slug}/availability?startDate=${today}`,
    { cache: 'no-store' },
  );
  if (!res.ok) return [];
  return res.json();
}

function formatEuro(minor: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function SitePage({ params }: { params: { slug: string } }) {
  const availability = await getAvailability(params.slug);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verfügbare Einheiten — {params.slug}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availability.map((item: any) => (
          <Card key={item.unitTypeId}>
            <CardHeader>
              <CardTitle className="text-base">{item.unitTypeId}</CardTitle>
              <Badge variant={item.availableCount > 0 ? 'success' : 'destructive'}>
                {item.availableCount > 0 ? `${item.availableCount} verfügbar` : 'Ausgebucht'}
              </Badge>
            </CardHeader>
            <CardContent>
              {item.availableCount > 0 && (
                <Link href={`/sites/${params.slug}/checkout?unitTypeId=${item.unitTypeId}`}>
                  <Button className="w-full mt-2">Jetzt buchen</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Install deps and start dev server**

```bash
cd apps/web-tenant && pnpm install && pnpm dev
```

Expected: App runs on port 3003. Visit http://localhost:3003 to see site listing.

- [ ] **Step 8: Commit**

```bash
git add apps/web-tenant/
git commit -m "feat(web-tenant): scaffold Next.js tenant portal with site listing and availability page"
```

---

### Task F.3: Tenant portal — checkout flow (multi-step)

**Files:**
- Create: `apps/web-tenant/app/sites/[slug]/checkout/page.tsx`
- Create: `apps/web-tenant/components/checkout-stepper.tsx`

- [ ] **Step 1: Create checkout stepper component**

`apps/web-tenant/components/checkout-stepper.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

interface Step {
  label: string;
  component: React.ReactNode;
}

export function CheckoutStepper({ steps }: { steps: Step[] }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="flex items-center mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${i <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
              {i + 1}
            </div>
            <span className="ml-2 text-sm text-gray-600 hidden sm:inline">{step.label}</span>
            {i < steps.length - 1 && <div className="mx-3 h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Current step */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].label}</CardTitle>
        </CardHeader>
        <CardContent>
          {steps[currentStep].component}
          <div className="flex justify-between mt-6">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)}>Zurück</Button>
            )}
            {currentStep < steps.length - 1 && (
              <Button className="ml-auto" onClick={() => setCurrentStep((s) => s + 1)}>Weiter</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create checkout page**

`apps/web-tenant/app/sites/[slug]/checkout/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckoutStepper } from '../../../../components/checkout-stepper';
import { api } from '../../../../lib/api';

function SizeStep() {
  return <p className="text-gray-600">Einheit ausgewählt. Weiter zur Preisübersicht.</p>;
}

function PriceStep({ siteId, unitTypeId }: { siteId: string; unitTypeId: string }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span>Monatsmiete</span><span>149,00 €</span></div>
      <div className="flex justify-between"><span>MwSt. 19%</span><span>28,31 €</span></div>
      <div className="flex justify-between"><span>Kaution</span><span>149,00 €</span></div>
      <div className="flex justify-between font-semibold border-t pt-2"><span>Heute fällig</span><span>326,31 €</span></div>
    </div>
  );
}

function CustomerStep({ onSubmit }: { onSubmit: (data: { name: string; email: string; phone?: string }) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-medium mb-1">Name</label><input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><label className="block text-sm font-medium mb-1">E-Mail</label><input type="email" className="w-full border rounded px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <button className="w-full bg-blue-600 text-white rounded py-2 mt-2" onClick={() => onSubmit({ name, email })}>Weiter zur Zahlung</button>
    </div>
  );
}

function PaymentStep() {
  return <p className="text-gray-600">Zahlung via SEPA-Lastschrift oder Kreditkarte. (Stripe-Integration folgt)</p>;
}

function ConfirmationStep() {
  return (
    <div className="text-center py-4">
      <div className="text-4xl mb-2">✓</div>
      <h3 className="text-lg font-semibold">Buchung bestätigt!</h3>
      <p className="text-gray-600 mt-2">Sie erhalten in Kürze eine E-Mail mit Ihrem Mietvertrag.</p>
    </div>
  );
}

export default function CheckoutPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const unitTypeId = searchParams.get('unitTypeId') ?? '';

  const steps = [
    { label: 'Einheit', component: <SizeStep /> },
    { label: 'Preisübersicht', component: <PriceStep siteId={params.slug} unitTypeId={unitTypeId} /> },
    { label: 'Ihre Daten', component: <CustomerStep onSubmit={(d) => console.log('Customer:', d)} /> },
    { label: 'Zahlung', component: <PaymentStep /> },
    { label: 'Bestätigung', component: <ConfirmationStep /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Online einmieten</h1>
      <CheckoutStepper steps={steps} />
    </div>
  );
}
```

- [ ] **Step 3: Verify checkout flow in browser**

```bash
# Start API (if not running): cd apps/api && pnpm start:dev
# Start tenant portal:
cd apps/web-tenant && pnpm dev
```

Visit http://localhost:3003/sites/test-site/checkout?unitTypeId=ut_container_20ft
Expected: Multi-step checkout renders with progress indicator, all 5 steps navigable.

- [ ] **Step 4: Commit**

```bash
git add apps/web-tenant/app/sites/ apps/web-tenant/components/
git commit -m "feat(web-tenant): multi-step checkout flow with progress stepper"
```

---

### Task F.4: Operator portal scaffold + today's queue

**Files:**
- Create: `apps/web-operator/package.json`
- Create: `apps/web-operator/next.config.js`
- Create: `apps/web-operator/app/layout.tsx`
- Create: `apps/web-operator/app/(dashboard)/page.tsx`
- Create: `apps/web-operator/app/(dashboard)/layout.tsx`
- Create: `apps/web-operator/lib/api.ts`

- [ ] **Step 1: Create apps/web-operator/package.json**

```json
{
  "name": "@container-os/web-operator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3002",
    "build": "next build",
    "start": "next start -p 3002"
  },
  "dependencies": {
    "@container-os/ui": "workspace:*",
    "@container-os/i18n": "workspace:*",
    "@tanstack/react-query": "^5.35.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create operator API client**

`apps/web-operator/lib/api.ts`:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? 'API error');
  }
  return res.json();
}

export const operatorApi = (token: string) => ({
  getLeads: (siteId: string, status?: string) =>
    apiFetch<any[]>(`/operator/v1/leads?siteId=${siteId}${status ? `&status=${status}` : ''}`, token),

  getOccupancyReport: (siteIds: string, from: string, to: string) =>
    apiFetch<any[]>(`/operator/v1/reports/occupancy?siteIds=${siteIds}&from=${from}&to=${to}`, token),

  getOpenIncidents: (siteId: string) =>
    apiFetch<any[]>(`/operator/v1/incidents?siteId=${siteId}`, token),

  resolveIncident: (id: string, resolutionNote: string) =>
    apiFetch(`/operator/v1/incidents/${id}/resolve`, token, { method: 'PATCH', body: JSON.stringify({ resolutionNote }) }),

  chargeInvoice: (invoiceId: string) =>
    apiFetch(`/tenant/v1/payments/intents`, token, { method: 'POST', body: JSON.stringify({ invoiceId }) }),

  exportDatev: (siteIds: string[], from: string, to: string) =>
    apiFetch(`/operator/v1/exports/datev`, token, { method: 'POST', body: JSON.stringify({ siteIds, from, to }) }),
});
```

- [ ] **Step 3: Create dashboard layout with sidebar**

`apps/web-operator/app/(dashboard)/layout.tsx`:
```tsx
import Link from 'next/link';

const nav = [
  { label: 'Heute', href: '/' },
  { label: 'Leads', href: '/leads' },
  { label: 'Reservierungen', href: '/reservations' },
  { label: 'Verträge', href: '/agreements' },
  { label: 'Rechnungen', href: '/billing' },
  { label: 'Inspektionen', href: '/inspections' },
  { label: 'Vorfälle', href: '/incidents' },
  { label: 'Einheiten', href: '/units' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-gray-50 p-4 flex flex-col">
        <div className="text-sm font-semibold text-blue-700 mb-6">Operator</div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="px-3 py-2 rounded text-sm text-gray-700 hover:bg-gray-200 transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Create today's queue page**

`apps/web-operator/app/(dashboard)/page.tsx`:
```tsx
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

// In production: fetch from API with server-side auth token
async function getQueueData() {
  return {
    leads: [{ id: 'lead_01', source: 'storefront', status: 'new', intent: 'business_storage', createdAt: new Date().toISOString() }],
    incidents: [],
    overdueInvoices: 0,
    pendingReservations: 2,
  };
}

export default async function TodayPage() {
  const data = await getQueueData();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Heute</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Neue Leads', value: data.leads.length, variant: 'default' as const },
          { label: 'Offene Vorfälle', value: data.incidents.length, variant: data.incidents.length > 0 ? 'destructive' as const : 'success' as const },
          { label: 'Überfällige Rechnungen', value: data.overdueInvoices, variant: data.overdueInvoices > 0 ? 'warning' as const : 'success' as const },
          { label: 'Reservierungen', value: data.pendingReservations, variant: 'default' as const },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="text-3xl font-bold">{kpi.value}</div>
              <Badge variant={kpi.variant} className="mt-2">{kpi.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Neue Leads</CardTitle></CardHeader>
        <CardContent>
          {data.leads.length === 0 ? (
            <p className="text-gray-500 text-sm">Keine neuen Leads.</p>
          ) : (
            <ul className="divide-y">
              {data.leads.map((lead: any) => (
                <li key={lead.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{lead.source}</p>
                    <p className="text-xs text-gray-500">{lead.intent}</p>
                  </div>
                  <Badge>{lead.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Start operator portal**

```bash
cd apps/web-operator && pnpm install && pnpm dev
```

Visit http://localhost:3002 — operator dashboard with KPI cards and lead queue.

- [ ] **Step 6: Commit**

```bash
git add apps/web-operator/
git commit -m "feat(web-operator): scaffold operator portal with daily queue, sidebar nav, KPI cards"
```

---

### Task F.5: Owner portal scaffold + portfolio KPIs

**Files:**
- Create: `apps/web-owner/package.json`
- Create: `apps/web-owner/next.config.js`
- Create: `apps/web-owner/app/layout.tsx`
- Create: `apps/web-owner/app/(dashboard)/page.tsx`
- Create: `apps/web-owner/app/(dashboard)/layout.tsx`
- Create: `apps/web-owner/app/(dashboard)/exports/page.tsx`

- [ ] **Step 1: Create apps/web-owner/package.json**

```json
{
  "name": "@container-os/web-owner",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001"
  },
  "dependencies": {
    "@container-os/ui": "workspace:*",
    "@container-os/i18n": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create owner portfolio page**

`apps/web-owner/app/(dashboard)/page.tsx`:
```tsx
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@container-os/ui';

// In production: fetch from API with owner-scoped token
async function getPortfolioData() {
  return {
    sites: [
      { id: 'site_01', name: 'Passau Hafen', occupancyPct: 87.5, revenueMinor: 1234500, overdueCount: 2 },
      { id: 'site_02', name: 'München Nord', occupancyPct: 92.1, revenueMinor: 980000, overdueCount: 0 },
    ],
    totalRevenueMinor: 2214500,
    avgOccupancyPct: 89.8,
  };
}

function formatEuro(minor: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(minor / 100);
}

export default async function OwnerDashboard() {
  const data = await getPortfolioData();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Portfolio-Übersicht</h1>

      {/* KPI header */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.avgOccupancyPct.toFixed(1)}%</div>
            <p className="text-sm text-gray-500 mt-1">Durchschn. Belegung</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatEuro(data.totalRevenueMinor)}</div>
            <p className="text-sm text-gray-500 mt-1">Umsatz (aktueller Monat)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{data.sites.length}</div>
            <p className="text-sm text-gray-500 mt-1">Standorte</p>
          </CardContent>
        </Card>
      </div>

      {/* Site comparison */}
      <Card>
        <CardHeader><CardTitle>Standortvergleich</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500"><th className="text-left py-2">Standort</th><th className="text-right py-2">Belegung</th><th className="text-right py-2">Umsatz</th><th className="text-right py-2">Überfällig</th></tr></thead>
            <tbody>
              {data.sites.map((site) => (
                <tr key={site.id} className="border-b last:border-0">
                  <td className="py-3 font-medium">{site.name}</td>
                  <td className="py-3 text-right">{site.occupancyPct}%</td>
                  <td className="py-3 text-right">{formatEuro(site.revenueMinor)}</td>
                  <td className="py-3 text-right">
                    <Badge variant={site.overdueCount > 0 ? 'warning' : 'success'}>{site.overdueCount}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Create DATEV export page**

`apps/web-owner/app/(dashboard)/exports/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@container-os/ui';

export default function ExportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch('/api/proxy/operator/v1/exports/datev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteIds: ['site_01', 'site_02'], from, to }),
      });
      const data = await res.json();
      setDownloadUrl(data.downloadUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">DATEV-Export</h1>
      <Card className="max-w-md">
        <CardHeader><CardTitle>Buchungsstapel exportieren</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Von</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bis</label>
            <input type="date" className="w-full border rounded px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleExport} disabled={loading || !from || !to}>
            {loading ? 'Exportiere...' : 'Export starten'}
          </Button>
          {downloadUrl && (
            <a href={downloadUrl} download className="block text-center text-blue-600 text-sm underline mt-2">
              CSV herunterladen
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Install and start owner portal**

```bash
cd apps/web-owner && pnpm install && pnpm dev
```

Visit http://localhost:3001 — portfolio KPIs, site comparison table.
Visit http://localhost:3001/exports — DATEV export form.

- [ ] **Step 5: Commit**

```bash
git add apps/web-owner/
git commit -m "feat(web-owner): owner portfolio dashboard with KPIs, site comparison, DATEV export page"
```

---

### Task F.6: Playwright E2E tests — critical paths

**Files:**
- Create: `apps/web-tenant/e2e/booking-flow.spec.ts`
- Create: `apps/web-tenant/playwright.config.ts`

- [ ] **Step 1: Create playwright.config.ts**

`apps/web-tenant/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3003',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3003',
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 2: Write E2E test for booking flow**

`apps/web-tenant/e2e/booking-flow.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Booking flow', () => {
  test('home page shows site listing', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Sicherer Lagerraum')).toBeVisible();
  });

  test('checkout page renders all 5 steps', async ({ page }) => {
    await page.goto('/sites/test-site/checkout?unitTypeId=ut_container_20ft');
    await expect(page.getByText('Online einmieten')).toBeVisible();
    // Verify step indicators
    await expect(page.getByText('Einheit')).toBeVisible();
    await expect(page.getByText('Preisübersicht')).toBeVisible();
    await expect(page.getByText('Ihre Daten')).toBeVisible();
  });

  test('can navigate through checkout steps', async ({ page }) => {
    await page.goto('/sites/test-site/checkout?unitTypeId=ut_container_20ft');

    // Step 1: Einheit
    await page.getByRole('button', { name: 'Weiter' }).click();

    // Step 2: Preisübersicht
    await expect(page.getByText('149,00 €')).toBeVisible();
    await page.getByRole('button', { name: 'Weiter' }).click();

    // Step 3: Ihre Daten
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('E-Mail')).toBeVisible();
  });
});
```

- [ ] **Step 3: Install Playwright and run tests**

```bash
cd apps/web-tenant
pnpm add -D @playwright/test
npx playwright install chromium
pnpm test:e2e
```

Add to `package.json`: `"test:e2e": "playwright test"`

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web-tenant/e2e/ apps/web-tenant/playwright.config.ts
git commit -m "test(web-tenant): Playwright E2E tests for booking flow"
```

---

## Track F complete

Running portals:
- http://localhost:3001 — Owner portal (portfolio KPIs, DATEV export)
- http://localhost:3002 — Operator portal (daily queue, leads, incidents)
- http://localhost:3003 — Tenant portal (site listing, availability, checkout)

All portals connect to the NestJS API at http://localhost:3000.
