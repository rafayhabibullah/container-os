# Operator Dashboard Redesign — `apps/web`

**Date:** 2026-05-15
**Scope:** `apps/web/` only (not `apps/web-tenant/`)
**Stack:** Tailwind CSS, `@sitelager/ui` (Button/Card/Badge), `lucide-react` — no new dependencies

---

## Goal

Redesign the operator dashboard from a bare-bones raw-Tailwind UI to a clean, modern B2B SaaS aesthetic. Approach: white cards on a slate-50 canvas, a collapsible icon sidebar that expands on hover, and a consistent table pattern across all list pages.

---

## Layout Shell

All authenticated pages share one persistent shell layout.

**Sidebar**
- White background (`bg-white`), full-height, `border-r border-slate-200`
- **Collapsed:** 52px wide, icons only, centred
- **Expanded:** 200px wide, icons + labels, triggered by CSS `group/sidebar hover:w-[200px]` — no JavaScript required, `transition-all duration-200 ease-in-out`
- Logo: 30px blue square (`bg-blue-600 rounded-[8px]`) with "S" monogram; expands to show "SiteLager" wordmark beside it
- **Active item:** `bg-blue-50 border border-blue-100 text-blue-700 font-semibold`
- **Inactive item:** `text-slate-500 hover:bg-slate-50 hover:text-slate-700`
- Item padding: `py-2 px-2.5`, icon size `16px`, `rounded-lg`
- Nav items (top to bottom): Dashboard, Sites, Invoices, Customers, Reports, Reservations
- Settings pinned at bottom with a `border-t border-slate-100 pt-2 mt-auto`

**Content area**
- `bg-slate-50 flex-1 overflow-y-auto p-8`
- Max content width: `max-w-6xl mx-auto`

**User avatar**
- Top-right of every page header: 30px filled circle (`bg-slate-900`), user initials, `rounded-full`
- No top navigation bar — sidebar handles all navigation

**Shell file:** `src/app/(dashboard)/layout.tsx` — wraps all authenticated routes.
A new `(dashboard)` route group must be created and the following directories moved into it:
`dashboard`, `sites`, `invoices`, `customers`, `team`, `agreements`, `reports`, `audit`, `incidents`, `reservations`, `tasks`, `settings`, `my-storage`, `storage`.
Public routes (`login`, `register`, `accept-invite`) stay at the `app/` root and render without the sidebar.

---

## Login Page (`/login`)

- No sidebar. Full-page `bg-slate-50`, vertically and horizontally centred
- Card: `bg-white border border-slate-200 rounded-xl p-8 w-full max-w-sm shadow-sm`
- Logo monogram centred above the card title
- Title: `text-xl font-bold text-slate-900` — "Welcome back"
- Subtitle: `text-sm text-slate-400` — "Sign in to your operator account"
- Fields: Email, Password — `border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Primary button: `bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg py-2 w-full`
- Footer link: "Don't have an account? Register" — `text-blue-600`
- Error state: red border on field + `text-red-600 text-sm` message below

Register and accept-invite pages follow the same centred-card pattern.

---

## Dashboard Page (`/dashboard`)

**Page header**
- Left: greeting `"Good morning, {name}"` (`text-xl font-bold text-slate-900`) + date subtitle (`text-sm text-slate-400`)
- Right: user avatar

**Stat cards — 4-column grid**

| Card | Background | Value style |
|------|-----------|-------------|
| Total Sites | white + border | `text-3xl font-bold text-slate-900` |
| Monthly Revenue | `bg-blue-600` | `text-3xl font-bold text-white` |
| Occupancy | white + border | `text-3xl font-bold text-slate-900` |
| Open Invoices | white + border | `text-3xl font-bold text-slate-900` |

- Each card: `rounded-xl p-5`
- Trend line below value: `text-xs` in green (positive), amber (warning), or slate (neutral)
- Revenue card label/trend use `text-blue-200` / `text-blue-300` for contrast

**Recent sites preview**
- Standard table card (see Table Pattern below) showing the first 5 sites
- "View all →" link in `text-blue-600 text-sm font-medium` top-right of card header

---

## Table Pattern (Sites, Invoices, and all future list pages)

All list pages share this identical structure.

**Page header**
- Left: page title `text-xl font-bold text-slate-900` + record count subtitle `text-sm text-slate-400`
- Right: primary action button (`Button` from `@sitelager/ui`, default variant)

**Toolbar**
- Search input: `bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm` with a `lucide-react` `Search` icon (`text-slate-400`) on the left
- Optional filter button beside search

**Table card**
- Container: `bg-white border border-slate-200 rounded-xl overflow-hidden`
- Header row: `bg-slate-50 border-b border-slate-100`, column labels `text-xs text-slate-400 font-semibold uppercase tracking-wide px-4 py-3`
- Data rows: alternate `bg-white` / `bg-slate-50` (even rows), `hover:bg-blue-50/30 transition-colors`
- Cell text: `text-sm text-slate-700`, sub-text (e.g. URL): `text-xs text-slate-400`
- Status badges: `Badge` from `@sitelager/ui` — `success` for Active, `default` for New, `warning` for Pending, `destructive` for Overdue
- Action link per row: `text-sm text-blue-600 font-medium hover:text-blue-700`

**Pagination**
- Below table: `"Showing X of Y"` in `text-xs text-slate-400` left-aligned
- Prev / Next buttons: `border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50`

**Sites-specific columns:** Name (+ URL sub-text), Units, Occupancy, Status, Action

**Invoices-specific columns:** Tenant, Invoice #, Issue Date, Due Date, Amount, Status, Action

---

## Colours & Typography

All within the existing Tailwind config — no new tokens.

| Role | Token |
|------|-------|
| Page background | `slate-50` |
| Card background | `white` |
| Card border | `slate-200` |
| Primary text | `slate-900` |
| Secondary text | `slate-600` |
| Meta / placeholder | `slate-400` |
| Primary accent | `blue-600` |
| Active bg | `blue-50` |
| Hover highlight | `blue-50/30` |

Typography: `text-xl font-bold` for page titles, `text-sm` for body, `text-xs` for labels/meta.

---

## Rollout Plan

1. **Phase 1 (core):** Shell layout, Login, Dashboard, Sites, Invoices
2. **Phase 2 (rest):** Apply the same shell + table pattern to Customers, Team, Reservations, Reports, Audit, Incidents, Tasks, Settings, API Keys, Webhooks, Agreements, My Storage

No changes to `apps/web-tenant/` or `packages/ui/`.

---

## Out of Scope

- No new npm dependencies
- No changes to API routes or data fetching logic
- No dark mode
- No mobile/responsive optimisation (desktop-first operator tool)
