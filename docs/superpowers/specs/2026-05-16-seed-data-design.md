# Seed Data Design — Demo-Ready Database

**Date:** 2026-05-16  
**Scope:** `apps/api/prisma/seed.ts` — expand from infrastructure-only to full demo dataset  
**Goal:** Every dashboard page shows realistic, non-empty data for both investor demos and internal QA

---

## 1. Organisations & Users

### Org 1: SiteLager Demo GmbH (existing)
- Slug: `sitelager-demo`
- Login: `owner@sitelager.dev` / `Test1234!`
- Sites: Passau Hafen, München Nord, Frankfurt Westend

### Org 2: NordLager GmbH (new)
- Slug: `nordlager-demo`
- Login: `owner@nordlager.dev` / `Test1234!`
- Sites: Berlin Mitte, Hamburg Hafen, Köln Ehrenfeld

### Operator Team Users (2, shared across both orgs for demo)
- `operator@sitelager.dev` — role: `operator`, member of Org 1
- `operator@nordlager.dev` — role: `operator`, member of Org 2

---

## 2. Sites (6 total)

### Existing (Org 1)
| Site | Slug | Hours |
|---|---|---|
| Passau Hafen | `passau-hafen` | 06:00–22:00 weekdays, shorter weekends |
| München Nord | `muenchen-nord` | 24/7 |

### New (Org 1)
| Site | Slug | Address | Hours |
|---|---|---|---|
| Frankfurt Westend | `frankfurt-westend` | Mainzer Landstraße 200, 60327 Frankfurt | 07:00–22:00 Mon–Sat, closed Sun |

### New (Org 2)
| Site | Slug | Address | Hours |
|---|---|---|---|
| Berlin Mitte | `berlin-mitte` | Alexanderstraße 5, 10179 Berlin | 24/7 |
| Hamburg Hafen | `hamburg-hafen` | Hafenstraße 34, 20459 Hamburg | 06:00–23:00 daily |
| Köln Ehrenfeld | `koeln-ehrenfeld` | Venloer Straße 140, 50672 Köln | 07:00–21:00 daily |

Each new site gets the full config stack:
- Unit types (5: 10ft, 20ft, 40ft container + small/medium indoor)
- Zones (2 outdoor + 1 indoor)
- Units (same 36-unit layout as existing sites)
- Price book (published, rates: 10ft €69, 20ft €119, 40ft €189, small €49, medium €79)
- Fee schedule (€99 deposit, €25 late fee)
- Tax profile (19% MwSt DE_STD)
- Delinquency policy (lockout after 14 days)
- Reminder policy (3 email steps)
- Promotions (SOMMER25 25%, NEUMIETER15 15%)
- Landing page config (hero, FAQ, SEO meta)
- Accounting mapping (revenue account 8400)
- Inspection templates (move-in 5 items, move-out 4 items)

---

## 3. Listings (8 published)

One published listing per available unit across all 6 sites. Mix of:
- 3 × 10ft container listings
- 2 × 20ft container listings
- 2 × indoor small/medium listings
- 1 × 40ft container listing

Each listing has: title, description, `publicPriceMinor`, `depositMinor`, `availableFrom`, `bookingMode` (mix of `instant_booking` and `approval_required`), `status: published`.

---

## 4. Customers (5)

| # | Name | Type | Org | Scenario |
|---|---|---|---|---|
| 1 | Thomas Weber | business | Org 1 | Active long-term tenant |
| 2 | Sarah Mitchell | private | Org 1 | New move-in, pending signature |
| 3 | Klaus Hoffmann | private | Org 1 | Delinquent, lockout active |
| 4 | Emma Schneider | private | Org 2 | Past tenant, terminated |
| 5 | TechStore GmbH | business | Org 2 | Large tenant, credit note |

Each customer has:
- 1 `Contact` (email + phone)
- 1 `Mandate` (SEPA or card, active except Klaus who has none)

---

## 5. Tenant Lifecycle Stories

### Story 1: Thomas Weber (Org 1 — Passau Hafen)
- Unit: 20ft container A11
- **Reservation**: status `converted`, source `manual`, startDate 6 months ago
- **Agreement**: status `active`, effectiveFrom 6 months ago, monthly billing
- **AgreementTemplate**: DE, v1.0
- **Signatory**: status `signed`
- **Mandate**: SEPA, `active`, ibanLast4 `4521`
- **Invoices**: 6 months of paid invoices (€119 + 19% VAT = €141.61/mo), each with InvoiceLines
- **Payments**: 6 successful `sepa_core` payments linked to invoices
- **AccessCredential**: PIN type, status `active`
- **Activity**: 3 entries (agreement activated, invoice paid x2)

### Story 2: Sarah Mitchell (Org 1 — München Nord)
- Unit: indoor small IN-S08 (status: `reserved`)
- **Reservation**: status `confirmed`, startDate 3 days from now
- **Agreement**: status `pending_signature`, effectiveFrom 3 days from now
- **Signatory**: status `pending`
- **Mandate**: card, `active`
- **Task**: type `move_in`, priority `high`, status `open`, dueAt = startDate
- **Task**: type `verify_document`, priority `normal`, status `open`
- **InspectionRun**: kind `move_in`, completedAt null (scheduled)

### Story 3: Klaus Hoffmann (Org 1 — Frankfurt Westend)
- Unit: 10ft container A03 (status: `occupied`)
- **Reservation**: status `converted`
- **Agreement**: status `active`, effectiveFrom 3 months ago
- **Mandate**: none (no payment method)
- **Invoices**: 3 months — first 2 paid, latest one `overdue`
- **LockoutState**: active=true, reason `overdue_invoice`
- **Task**: type `collect_payment`, priority `urgent`, status `in_progress`
- **Incident**: type `payment_default`, severity `medium`, status `open`

### Story 4: Emma Schneider (Org 2 — Berlin Mitte)
- Unit: indoor medium IN-M04 (status: `available`, was `occupied`)
- **Reservation**: status `converted`
- **Agreement**: status `terminated`, effectiveFrom 6 months ago, terminatedAt 1 month ago
- **Signatory**: status `signed`
- **Mandate**: SEPA, `active`
- **Invoices**: 5 paid invoices
- **InspectionRun**: kind `move_out`, completed 1 month ago, result `pass`, checklist all checked
- **Task**: type `clean_unit`, status `completed`

### Story 5: TechStore GmbH (Org 2 — Hamburg Hafen)
- Unit: 40ft container B07 (status: `occupied`)
- **Reservation**: status `converted`
- **Agreement**: status `active`, effectiveFrom 4 months ago
- **Mandate**: SEPA B2B, `active`
- **Invoices**: 4 paid + 1 with a CreditNote (partial credit €50 for a maintenance day)
- **Payments**: 4 successful + 1 pending
- **AccessCredential**: PIN type, status `active`
- **Incident**: type `access_fault`, severity `low`, status `resolved`, resolutionNote set

---

## 6. Tasks (10 total across sites)

| Type | Site | Priority | Status |
|---|---|---|---|
| move_in | München Nord | high | open (Sarah's) |
| verify_document | München Nord | normal | open (Sarah's) |
| collect_payment | Frankfurt Westend | urgent | in_progress (Klaus's) |
| inspect_unit | Passau Hafen | normal | open |
| repair_unit | Passau Hafen | normal | open (unit B10 in maintenance) |
| clean_unit | Berlin Mitte | low | completed (Emma's) |
| call_tenant | Köln Ehrenfeld | normal | open |
| assign_access | Hamburg Hafen | normal | open |
| approve_booking | Frankfurt Westend | normal | open |
| other | München Nord | low | open |

---

## 7. Inspection Runs (3)

| Kind | Unit | Status | Site |
|---|---|---|---|
| move_in | Thomas Weber's unit | completed, result=pass | Passau Hafen |
| move_in | scheduled (Sarah) | not yet completed | München Nord |
| move_out | Emma Schneider's unit | completed, result=pass | Berlin Mitte |

---

## 8. Incidents (2)

| Type | Severity | Status | Site |
|---|---|---|---|
| payment_default | medium | open | Frankfurt Westend (Klaus) |
| access_fault | low | resolved | Hamburg Hafen (TechStore) |

---

## 9. Dashboard Metrics (MetricSnapshot)

6 months of monthly snapshots for each of the 6 sites, covering:
- `occupancy_pct` — starts ~60%, trends to ~78%
- `revenue_eur_minor` — correlated with occupancy
- `active_agreements` — integer count
- `overdue_invoices` — 0 except last month (Klaus)

Buckets: first day of each month for the last 6 months.

---

## 10. Team Users (Settings → Team page)

| Email | Role | Org |
|---|---|---|
| `operator@sitelager.dev` | operator | Org 1 |
| `operator@nordlager.dev` | operator | Org 2 |

Both have `OrganisationMember` records and `PermissionAssignment` with a site-scoped Role.

---

## 11. API Settings (Settings → API Keys / Webhooks)

One `ApiClient` per org:
- Name: "ERP Integration" / "WMS Integration"
- 1 `ApiKey` (active, masked)
- 1 `WebhookEndpoint` (subscriptions: `invoice.paid`, `agreement.activated`)

---

## 12. AgreementTemplates (2 per site, DE)

One `AgreementTemplate` per site (language `de`, version `1.0`, active) with a realistic German storage rental agreement body.

---

## Implementation Notes

- All new sites reuse the `seedUnitTypes`, `seedUnits`, `seedPricing` helper pattern already in the file
- A new `seedSiteConfig` helper should wrap fee schedule, tax profile, delinquency policy, reminder policy, promotions, landing page, accounting mapping, inspection templates — called once per site
- Tenant stories are seeded sequentially after all sites/units are created
- MetricSnapshots use a loop over the last 6 months
- All `upsert` calls use stable deterministic IDs (prefixed slugs) so re-running is safe
- Dates: use `new Date(Date.now() - N * 30 * 24 * 60 * 60 * 1000)` relative offsets for portability
