# Site Setup Redesign

**Date:** 2026-05-31
**Status:** Approved

## Problem

Setting up a new site requires navigating across four separate pages with no guided ordering, creating each entity one at a time, and dealing with a "price book" abstraction that exposes implementation details operators don't care about. The two most common scenarios — initial setup and cloning a second site — are both painful.

## Goals

- Reduce the number of page navigations required to fully configure a new site from scratch
- Make bulk unit creation natural (operators think in types with sequential codes, e.g. A-101…A-120)
- Hide the price book abstraction for simple repricing while preserving it for scheduled future rate changes
- Support copying unit types + pricing structure from an existing site

## Non-Goals

- No changes to the API layer (no new endpoints)
- No changes to the tenant portal or storefront
- No changes to how price books, rate rules, or unit types are stored

---

## Design

### 1. Page Structure

`/sites/[siteId]` becomes a single tabbed page with three tabs: **Unit Types**, **Units**, **Pricing**.

The site edit form (name, address, timezone, currency) moves to a collapsible "Site Settings" section at the top of the page, collapsed by default once the site has been configured. When expanded it shows the existing `SiteEditForm`.

Tabs are reflected in the URL hash (`#unit-types`, `#units`, `#pricing`) so browser navigation works correctly. Default tab is `#unit-types`.

**Post-creation redirect:** `apps/web/src/app/(dashboard)/sites/new/page.tsx` redirects to `/sites/${newSiteId}#unit-types` instead of `/sites` on success.

**Getting started hint:** When a site has no unit types, units, and no published price book, a slim hint strip renders below the tabs:
```
① Add unit types   ② Add units   ③ Set pricing
```
Each step is greyed out until complete. The strip disappears once all three have at least one entry.

---

### 2. Unit Types Tab

Displays a table of unit types. Columns: Name, Size (m²), Volume (m³), Door, Features.

**Inline creation** — "Add type" button expands an inline form below the table header (same expand-in-place pattern as `PricingActions`). Fields:
- Name (text, required)
- Size m² (number, required)
- Volume m³ (number, optional)
- Door type (`<select>`: roller / swing / none / other)
- Features (checkboxes): climate controlled, ground floor, top floor, drive-up, outdoor, alarmed

Saves via `POST /organisations/:orgId/sites/:siteId/unit-types`. On success the row appears and the form collapses. No separate page.

**Inline edit** — each row has a pencil icon. Clicking it turns the row into an edit-in-place form (same fields). Saves via `PATCH /organisations/:orgId/sites/:siteId/unit-types/:unitTypeId`.

**Delete** — each row has a trash icon. Disabled (with tooltip "Units reference this type") if any units use the type. Otherwise calls `DELETE /organisations/:orgId/sites/:siteId/unit-types/:unitTypeId`.

**Copy from site** — secondary button "Copy from…" next to "Add type". Opens a dropdown listing other sites in the organisation. Selecting one fetches that site's unit types and POSTs each to the current site (frontend-only orchestration). Deduplicates by name — types with a matching name are skipped. If the current site already has types, shows inline warning: "This will add X new types — existing types are unchanged."

---

### 3. Units Tab

Displays a table of units grouped by unit type (a muted section header row per type showing type name and count). Columns: Code, Kind, Drive-up, Status.

**Single unit creation** — "Add unit" button expands an inline form: unit code, unit type dropdown, kind (self_storage / container), drive-up checkbox. Saves via `POST /organisations/:orgId/sites/:siteId/units`.

**Bulk generator** — "Generate units" button expands an inline panel with:
- Unit type (dropdown, required)
- Prefix (text, e.g. `A-`)
- Start number (number, default `101`)
- Count (number, required)
- Kind + drive-up (applies to all)
- Live preview line: `Will create: A-101, A-102 … A-120`

On submit, fires N parallel `POST /organisations/:orgId/sites/:siteId/units` calls. Shows inline progress `Creating 14 / 20…`. On completion calls `router.refresh()`.

**Copy from site** — same "Copy from…" pattern. Imports all units from the selected site (unit codes are site-scoped so no conflict). Runs as parallel POSTs with the same progress indicator.

---

### 4. Pricing Tab

The "price book" model is hidden. Operators see a simple rate table.

**Primary view** — a table with one row per unit type. Columns: Unit type name, Monthly rate (€), Billing cycle. An "Edit prices" button puts all rows into edit mode simultaneously (prices become `<input type="number">`, billing cycle becomes a `<select>`).

**Saving edited prices** — sequenced transparently by the frontend:
1. `POST .../price-books` (name = "Rate update {date}", effectiveFrom = today)
2. For each unit type: `POST .../rate-rules`
3. `POST .../price-books/:id/publish`

The operator never sees draft/publish states for immediate repricing.

**Scheduled rate change** — a secondary "Schedule a rate change" link (smaller, below the table). Opens an inline panel:
- Effective date picker (must be in the future)
- Same rate table in edit mode

Creates a draft price book with the chosen `effectiveFrom`. Does not publish — the system activates it on the effective date. The main table shows a subtle notice "Scheduled change on [date]" with a "Cancel" link (calls `POST .../archive`).

**Copy from site** — same "Copy from…" button. Fetches the published price book from the source site. Matches rate rules to the current site's unit types by unit type name. Unmatched types are flagged inline: `No match for 'XL 20m²' — set a price manually`. Matched types are pre-filled. User still presses "Save" to confirm.

**What is unchanged in the API:** price books, rate rules, draft/publish/archive lifecycle are all untouched. The frontend orchestrates them.

---

## Design Language

Follow the existing in-page style throughout:
- `Plus Jakarta Sans` font, same font weights and sizes as existing pages
- Background `#f1f5f9`, cards `#ffffff` with `border: 1px solid #e2e8f0` and `boxShadow: 0 1px 3px rgba(15,23,42,0.06)`
- Primary button: `background #0f172a`, white text
- Secondary / ghost button: `background #f8fafc`, `border 1px solid #e2e8f0`, `color #64748b`
- Inline form expand pattern from `PricingActions.tsx` (show/hide with `showForm` state, no modal)
- Error state: `color #dc2626`, `background #fef2f2`, `border 1px solid #fecaca`

---

## Files Affected

| File | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/sites/new/page.tsx` | Redirect to `#unit-types` on success |
| `apps/web/src/app/(dashboard)/sites/[siteId]/page.tsx` | Replace with tabbed layout + collapsible site settings |
| `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/page.tsx` | Absorbed into tab |
| `apps/web/src/app/(dashboard)/sites/[siteId]/unit-types/new/page.tsx` | Deleted |
| `apps/web/src/app/(dashboard)/sites/[siteId]/units/page.tsx` | Absorbed into tab |
| `apps/web/src/app/(dashboard)/sites/[siteId]/units/new/` | Deleted |
| `apps/web/src/app/(dashboard)/sites/[siteId]/units/[unitId]/` | Keep for edit (or inline edit) |
| `apps/web/src/app/(dashboard)/sites/[siteId]/pricing/page.tsx` | Absorbed into tab |
| `apps/web/src/app/(dashboard)/sites/[siteId]/pricing/PricingActions.tsx` | Absorbed into tab |

New client components to create (co-located in `sites/[siteId]/`):
- `SiteDetailTabs.tsx` — tab switcher, hash sync
- `UnitTypesTab.tsx` — unit types table + inline form + copy-from
- `UnitsTab.tsx` — units table + single create + bulk generator + copy-from
- `PricingTab.tsx` — rate table + inline edit + scheduled change panel + copy-from

---

## Open Questions

None — all decisions made during design session.
