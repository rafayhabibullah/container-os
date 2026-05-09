# Container OS — MVP Design Spec

**Date:** 2026-05-10
**Version:** 0.1.0
**Status:** Approved for implementation planning
**Scope:** MVP only — German-first, multi-site container/self-storage SaaS for a two-site operator
**Source spec:** Production Master Spec v0.1.0 (2026-05-09)

---

## Decisions made in brainstorming

| Question | Decision |
|---|---|
| Scope | MVP only |
| Access control vendor | Unknown — build vendor-agnostic adapter interface + stub |
| Payment provider | Stripe (SEPA Core + cards) |
| Rental terms | Both month-to-month and fixed-term |
| Deployment | Local Docker Compose first; cloud provider TBD |
| Invoice/agreement language | German (default) + English both from day one |

---

## System architecture

**Pattern:** Modular monolith — single deployable NestJS backend with explicit module boundaries and domain event bus. No microservices until operational scale justifies a split.

**Tech stack:**
- Backend: NestJS + TypeScript + Prisma ORM
- Frontend: Next.js (three portals: Owner, Operator, Tenant)
- Database: PostgreSQL 16
- Queue: BullMQ (backed by Redis 7)
- Object store: MinIO locally (S3-compatible; EU-region bucket in production)
- Identity: Keycloak 24 (OIDC, staff MFA mandatory)
- Email (local): MailHog SMTP trap
- Shared packages: `domain-types` (Zod schemas, enums), `ui` (shadcn/ui components), `i18n` (de/en translations)

### Monorepo layout (pnpm workspaces)

```
/
├── apps/
│   ├── api/              # NestJS backend (port 3000)
│   ├── web-owner/        # Next.js Owner portal (port 3001)
│   ├── web-operator/     # Next.js Operator portal (port 3002)
│   └── web-tenant/       # Next.js Tenant portal (port 3003)
├── packages/
│   ├── domain-types/     # Shared TS types, enums, Zod schemas
│   ├── ui/               # Shared React component library
│   └── i18n/             # de/en translation files and t() helper
├── docker-compose.yml
└── docs/
    └── master-spec.md
```

### NestJS backend modules

| Module | Responsibility |
|---|---|
| `SiteInventory` | Sites, zones, units, availability, bulk import |
| `Pricing` | PriceBooks, RateRules, promotions, fee schedules, tax profiles |
| `Storefront` | Public landing pages, checkout sessions, quote requests |
| `CrmLeads` | Leads, customers, contacts, deduplication, activity timeline |
| `Reservations` | Inventory holds, expiry, race-condition locking |
| `Agreements` | Rental contracts (monthly + fixed-term), e-sign, amendments, termination |
| `Billing` | Invoices (EN 16931 / ZUGFeRD structured e-invoices for B2B), SEPA mandates, delinquency policy, lockout state |
| `Payments` | Stripe adapter, immutable ledger, DATEV file export |
| `AccessControl` | Credential issuing/revoking, vendor adapter interface + stub |
| `Operations` | Tasks, container inspections (mandatory on move-in/out), incidents, transfers |
| `Documents` | Document storage, signature envelopes, ID verification stub |
| `Reporting` | Dashboards, metric snapshots, financial reports |
| `Notifications` | Email/SMS templates with de/en locale, delivery tracking |
| `Auth` | OIDC (Keycloak), RBAC, site-scoped permissions, MFA enforcement |
| `Audit` | Immutable event sink, legal hold, security events |
| `Webhooks` | API keys, scoped bearer tokens, signed outbound delivery |

Modules communicate exclusively through a shared `EventEmitter2` domain event bus — no direct cross-module service imports. Each module owns its own Prisma models.

### Local Docker Compose services

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL 16 | 5432 | Primary data store |
| Redis 7 | 6379 | BullMQ queues + session cache |
| MinIO | 9000/9001 | S3-compatible object store |
| Keycloak 24 | 8080 | OIDC for Owner/Operator auth |
| MailHog | 1025/8025 | SMTP trap + web UI |

---

## Data model and domain boundaries

Each module owns its tables. Cross-module reads go through service interfaces, never direct table joins.

### Entity ownership

| Entity | Owner Module |
|---|---|
| `Site`, `Zone`, `Unit`, `UnitType`, `Amenity`, `InventoryEvent` | SiteInventory |
| `PriceBook`, `RateRule`, `Promotion`, `FeeSchedule`, `RentIncreasePolicy`, `TaxProfile` | Pricing |
| `LandingPageConfig`, `CheckoutSession`, `QuoteRequest`, `StorefrontEvent` | Storefront |
| `Lead`, `Customer`, `Contact`, `Activity`, `ConversationThread` | CrmLeads |
| `Reservation`, `ReservationHold`, `ReservationCharge` | Reservations |
| `AgreementTemplate`, `Agreement`, `AgreementAmendment`, `Signatory`, `TerminationRequest` | Agreements |
| `Invoice`, `InvoiceLine`, `Mandate`, `ReminderPolicy`, `DelinquencyPolicy`, `CreditNote` | Billing |
| `Payment`, `PaymentAttempt`, `LedgerEntry`, `ExportJob`, `AccountingMapping` | Payments |
| `AccessVendor`, `AccessPoint`, `AccessGroup`, `AccessCredential`, `AccessEvent`, `LockoutState` | AccessControl |
| `Task`, `InspectionTemplate`, `InspectionRun`, `Incident`, `MaintenanceOrder`, `Transfer` | Operations |
| `Document`, `DocumentTemplate`, `SignatureEnvelope`, `EvidencePack`, `VerificationSession` | Documents |
| `DashboardPreset`, `MetricSnapshot`, `ReportRun`, `CohortDefinition` | Reporting |
| `NotificationTemplate`, `NotificationPreference`, `OutboundMessage`, `NotificationEvent` | Notifications |
| `User`, `Role`, `PermissionAssignment`, `Session`, `OrganisationMembership` | Auth |
| `AuditEvent`, `BackupSet`, `RestoreJob`, `SecurityEvent`, `LegalHold` | Audit |
| `ApiClient`, `ApiKey`, `WebhookEndpoint`, `WebhookDelivery` | Webhooks |

### Key data conventions

- All monetary values: **integer minor units** (euro cents)
- All timestamps: **stored UTC**, rendered `Europe/Berlin` in UI
- Soft delete on all commercial records; hard delete only where legally safe (no retention requirement)
- Every mutable entity change emits an `AuditEvent` asynchronously via the audit queue
- `unitCode` is unique per site
- `Agreement` snapshots pricing at activation time (immutable invoice line data)
- `unitStatus` state machine: `available → reserved → occupied → maintenance → out_of_service` (no jump from `occupied` to `available` without move-out)

### Billing cycle modelling

- `Agreement.billingCycle`: `monthly` | `fixed_term`
- `Agreement.terminationRules`: `{ noticeDays: number, minimumMonths?: number }`
- Fixed-term agreements enforce minimum period; move-out requests rejected until notice window opens
- `Invoice` is idempotent by `(agreementId, periodStart)` — safe to retry nightly job

### German e-invoicing requirement (non-negotiable)

Since 2025-01-01, domestic B2B invoicing in Germany requires structured electronic invoices (EN 16931). A plain PDF no longer qualifies. The `Billing` module must:

- Generate structured e-invoice payloads in ZUGFeRD / XRechnung format for all B2B tenants (`Customer.type = 'business'`)
- Retain the structured payload in unaltered form for 8 years
- Store the payload alongside the PDF in MinIO with content-addressed hash
- Consumer (tenant/organisation) must be able to receive and download the structured file

Private consumer invoices (`Customer.type = 'private'`) are standard PDF; structured format is optional but beneficial.

### GDPR retention tiers

| Data category | Retention rule |
|---|---|
| Invoices, agreements, ledger entries | 8 years (accounting obligation) |
| Signed agreements + evidence packs | 8 years or legal hold |
| Lead/contact PII (non-converted) | Auto-review after 90 days (configurable); delete or anonymise |
| Access logs | Configurable; security/legal basis only |
| Notification message bodies | Bounded retention; redact PII on expiry |
| User audit history | Permanent (accountability); profile PII minimised on deactivation |

`LegalHold` records block all deletion and anonymisation jobs for the referenced subject.

---

## API design and authentication

### API namespaces

| Prefix | Auth | Consumers |
|---|---|---|
| `/api/public/v1/*` | None | Public site pages, checkout, lead capture |
| `/api/operator/v1/*` | OIDC bearer (MFA enforced) | Owner and Operator portals |
| `/api/tenant/v1/*` | Magic-link or password session | Tenant portal |
| `/api/system/v1/*` | HMAC-SHA256 signed webhook | Stripe, access vendor callbacks |

### Global API conventions

- JSON over HTTPS
- All `POST` endpoints require `Idempotency-Key` header
- Monetary values in requests/responses as integer minor units
- UTC timestamps in all API responses
- Rate limiting via `nestjs-throttler` (per-IP and per-user tiers)
- Request validation via Zod schemas from `packages/domain-types`
- Error envelope: `{ error: { code, message, details? } }`
- All write operations emit an `AuditEvent`
- Webhooks signed with HMAC-SHA256; signature in `X-Signature-256` header

### Authentication

**Owner and Operator:**
- OIDC login via Keycloak; MFA mandatory (TOTP)
- Short-lived JWT access token (15 min) + rotating refresh token (7 days)
- Site-scoped permission enforced by `SiteGuard` decorator on every operator route

**Tenant:**
- Email + password registration, or passwordless magic link
- httpOnly cookie session for web portal
- Organisation accounts: one `Customer`, multiple `Contact` records with independent logins

**API clients:**
- Scoped bearer tokens (`ApiKey`) per `ApiClient` with `scopes[]` and `siteIds[]`
- Rotatable; 48-hour grace window on old keys after rotation

### RBAC model

- Three visible user types: `owner`, `operator`, `tenant`
- Internal: granular permission set (e.g. `invoices:write`, `access:manage`, `finance:export`)
- `Role` = named permission template; `PermissionAssignment` links user → role → site(s)
- `SiteGuard` cross-checks `req.user.siteIds` against resource `siteId` on every operator route
- Privilege escalation attempts emit a `SecurityEvent` to the Audit module

---

## Key workflows

### Booking → Move-in

1. Tenant fetches availability (`GET /api/public/v1/storefront/{slug}/availability`) — cached with 5s TTL, p95 <300ms
2. `POST /api/public/v1/checkout-sessions` — creates `CheckoutSession` + `ReservationHold` with 15-min expiry; distributed lock on `unitId`
3. Tenant submits details + Stripe setup intent (card or SEPA Core mandate)
4. `POST /api/public/v1/reservations/{id}/confirm` — idempotent; creates `Reservation`, `Customer`, `Mandate`
5. Operator (or auto) drafts `Agreement` from locale-appropriate template (de/en per tenant preference)
6. Tenant e-signs via `SignatureEnvelope` (simple electronic signature mode for MVP, evidence-rich)
7. `POST /api/operator/v1/agreements/{id}/activate` — validates all prerequisites (signature ✓, mandate ✓); activates, sets unit `occupied`, emits `agreement.activated`
8. `AccessControl` listens → issues `AccessCredential` via stub adapter within 30s
9. `Notifications` listens → sends move-in confirmation email in tenant's locale

### Billing failure → Lockout → Recovery

1. Nightly BullMQ job (before 02:00 Europe/Berlin) generates `Invoice` per active agreement due — idempotent by `(agreementId, periodStart)`
2. `Payments` immediately attempts Stripe charge; result delivered via webhook to `/api/system/v1/payments/webhooks/stripe`
3. SEPA debit lands in `pending_settlement` state; `Payment` record updated on settlement webhook
4. On charge failure: `ReminderPolicy` schedules retries (configurable, e.g. day 3, day 7); reminder emails sent
5. On `overdueDays` threshold: `Billing` emits `invoice.overdue` → `AccessControl` activates `LockoutState` within 60s
6. Tenant resolves payment in portal → `Payments` posts `LedgerEntry`, emits `invoice.paid`
7. `AccessControl` deactivates `LockoutState`, reissues credential automatically
8. `Notifications` sends access-restored confirmation

### DATEV export

1. Owner triggers `POST /api/operator/v1/exports/datev` with date range + site scope
2. `ExportJob` queued in `billing` queue
3. Worker pulls `LedgerEntry` records, applies `AccountingMapping`, generates DATEV-format CSV/ZIP with checksum
4. Signed MinIO download URL returned via `GET /api/operator/v1/exports/{exportJobId}`

### Access event → Incident

1. Vendor webhook hits `/api/system/v1/access/vendors/{vendor}/webhooks`; signature verified; `AccessEvent` persisted
2. If event is anomalous (unexpected denial, after-hours access): `Incident` created, operator `Task` assigned
3. Operator reviews logs/photos, takes action (remote open, suspend, escalate), closes with resolution note
4. Full audit trail on `Incident` throughout

---

## Queue architecture

| Queue | Workers | Jobs |
|---|---|---|
| `billing` | 2 | Nightly invoice run, Stripe retry charges, DATEV export generation |
| `access` | 2 | Credential issue/revoke, vendor sync reconciler (drift healing) |
| `notifications` | 3 | Email (MailHog locally), SMS stub |
| `webhooks` | 2 | Signed outbound delivery with exponential retry |
| `audit` | 1 | Async audit event persistence (never blocks request path) |

All queues use BullMQ dead-letter pattern. Failed jobs alert after 5-minute backlog. All jobs are idempotent and safe to retry.

---

## Error handling

| Error type | HTTP code | Handling |
|---|---|---|
| Validation failure | 400 | Zod parse errors returned as `details[]`; never leak stack traces |
| Business rule violation | 409/422 | Explicit domain exception classes (e.g. `UnitOccupiedError`, `MandateIncompleteError`) |
| Duplicate idempotency key | 200 | Return original response; never double-charge |
| PSP webhook replay | 200 | Deduplicated by `providerRef` in `PaymentAttempt` before any ledger write |
| Queue failure | — | Exponential backoff (3 retries), then dead-letter; structured log alert |
| Access vendor outage | — | Credential operations queue; reconciler heals state when vendor returns |
| Unauthorised site access | 403 | `SiteGuard` rejection; emits `SecurityEvent` |

---

## Testing approach

**Unit tests (Vitest):**
- Pure domain logic: price engine, billing cycle calculations, DATEV mapping, SEPA mandate state machine
- Every business rule from spec has a corresponding unit test

**Integration tests (Vitest + real Postgres in Docker):**
- Each NestJS module tested against a real test database — no mocks for DB layer
- Key scenarios: simultaneous last-unit reservations, nightly billing run, retry → lockout → restore flow

**E2E tests (Playwright):**
- Full booking → move-in journey on Tenant portal
- Operator move-in confirmation and mandatory inspection flow
- Owner DATEV export download

---

## Observability (local)

- Structured JSON logs via Pino (request ID, actor ID, module, event type on every line)
- `/healthz` — liveness check
- `/readyz` — readiness (checks Postgres + Redis connectivity)
- `/metrics` — Prometheus-compatible endpoint (queue depth, billing job success rate, webhook delivery rate)
- BullMQ dashboard (Bull Board) at `/admin/queues`

---

## MVP scope boundary

**In MVP:**
- Multi-site inventory + public storefront + live availability
- Online reservations + checkout + Stripe card/SEPA Core mandate
- Agreement generation (de/en), e-signing, activation
- Tenant portal (browse, sign, pay, view invoices, view access details)
- Monthly and fixed-term recurring billing
- Delinquency → lockout → recovery workflow
- One access control adapter (stub with defined vendor interface)
- Container move-in/move-out mandatory inspections + task workflows
- Audit trail + legal hold
- DATEV-format file export
- Owner and Operator dashboards (core reporting)
- RBAC (Owner, Operator, Tenant) with site scoping

**Deferred to v1 post-MVP:**
- Dynamic pricing + scheduled rent increases
- Organisation account multi-contact workflows
- Full public API + signed outbound webhooks
- Multiple access vendor adapters
- Advanced incident workflows
- Anniversary billing mode

**Deferred to v2:**
- DATEV service integration (direct API)
- SEPA B2B direct debit
- Deeper portfolio analytics
- Adjacent logistics (vehicle spaces, pickup-and-return)

---

## Open questions (to resolve before v1)

- Which gate/door vendor is installed at each site? (determines first real access adapter)
- Does the accountant want DATEV file export only, or direct DATEV service API integration?
- Is SEPA B2B direct debit required for any tenant before v1?
- Are deposits mandatory on all units or only selected unit types?
- Is ID verification required for any move-in flow in MVP?
