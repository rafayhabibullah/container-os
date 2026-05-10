# Container OS — Multi-Tenant SaaS Design Spec

**Date:** 2026-05-11
**Version:** 0.2.0
**Status:** Approved for implementation planning
**Supersedes:** `2026-05-10-container-os-saas-design.md` (v0.1.0 — single-operator model)
**Scope:** Multi-tenant SaaS — any number of independent storage businesses, each with full data isolation

---

## What changed from v0.1.0

The original spec was designed for a single two-site operator. Container OS is now a true multi-tenant SaaS platform where any storage business can self-register, manage their own sites, and invite their own staff and tenants.

**Key decisions in this revision:**

| Question | Decision |
|---|---|
| Owner registration | Email + password self-signup — built in the app, no Keycloak |
| Tenant registration | Invitation-only — operators invite tenants by email |
| Data isolation | Full isolation per Workspace — Business A cannot see any of Business B's data |
| Keycloak | Removed entirely — email/password + JWT for all user types |
| Portals | Single unified Next.js app (replaces three separate apps) |

---

## System architecture

**Pattern:** Modular monolith — single deployable NestJS backend with explicit module boundaries and domain event bus. Unchanged from v0.1.0.

**Tech stack:**
- Backend: NestJS + TypeScript + Prisma ORM
- Frontend: **Single Next.js portal** (port 3000 for API, port 3001 for web) — replaces three separate apps
- Database: PostgreSQL 16
- Queue: BullMQ (backed by Redis 7)
- Object store: MinIO locally (S3-compatible; EU-region bucket in production)
- Auth: **Email/password + JWT** (bcrypt, no Keycloak) — MailHog for email locally
- Shared packages: `domain-types` (Zod schemas, enums), `ui` (shadcn/ui components), `i18n` (de/en translations)

### Monorepo layout (updated)

```
/
├── apps/
│   ├── api/          # NestJS backend (port 3000)
│   └── web/          # Single Next.js portal (port 3001) — replaces web-owner/operator/tenant
├── packages/
│   ├── domain-types/
│   ├── ui/
│   └── i18n/
├── docker-compose.yml
└── docs/
```

### NestJS backend modules

All 16 modules from v0.1.0 are unchanged. The `Auth` module gains three new responsibilities:

| Module | Responsibility |
|---|---|
| `SiteInventory` | Sites, zones, units, availability — now workspace-scoped |
| `Pricing` | PriceBooks, RateRules, promotions — now workspace-scoped |
| `Storefront` | Public workspace-scoped landing pages, checkout sessions |
| `CrmLeads` | Leads, customers, contacts — now workspace-scoped |
| `Reservations` | Inventory holds, expiry, race-condition locking |
| `Agreements` | Rental contracts (monthly + fixed-term), e-sign, amendments |
| `Billing` | Invoices (ZUGFeRD for B2B), SEPA mandates, delinquency, lockout |
| `Payments` | Stripe adapter, immutable ledger, DATEV file export |
| `AccessControl` | Credential issuing/revoking, vendor adapter interface + stub |
| `Operations` | Tasks, container inspections, incidents, transfers |
| `Documents` | Document storage, signature envelopes |
| `Reporting` | Dashboards, metric snapshots, financial reports |
| `Notifications` | Email templates de/en, invitation emails |
| `Auth` | **Email/password JWT auth, Workspace CRUD, WorkspaceMember, invitation system** |
| `Audit` | Immutable event sink, legal hold |
| `Webhooks` | API keys, signed outbound delivery |

### Local Docker Compose services

Keycloak removed. MailHog stays for email testing.

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL 16 | 5432 | Primary data store |
| Redis 7 | 6379 | BullMQ queues |
| MinIO | 9000/9001 | S3-compatible object store |
| MailHog | 1025/8025 | SMTP trap — receives invitation + notification emails |

---

## Multi-tenancy model

### The Workspace

`Workspace` is the root isolation boundary. Every storage business that registers on Container OS gets one Workspace. All their sites, customers, invoices, and staff live inside it. No data crosses workspace boundaries.

```
Workspace
  id          cuid
  name        string          — "Passau Storage GmbH"
  slug        string unique   — "passau-storage" (URL-safe, used in public routes)
  plan        starter | professional | enterprise
  status      active | suspended
  createdAt   DateTime
```

### Workspace membership

```
WorkspaceMember
  id          cuid
  workspaceId → Workspace
  userId      → User
  role        owner | operator | tenant
  createdAt   DateTime
  UNIQUE (workspaceId, userId)
```

- **owner** — registered the business; full control of sites, pricing, billing, team
- **operator** — invited staff; can manage daily ops (leads, agreements, inspections, incidents)
- **tenant** — invited renter; can view their own agreements, invoices, access credentials

### Workspace invitations

```
WorkspaceInvitation
  id          cuid
  workspaceId → Workspace
  email       string
  role        operator | tenant
  token       string unique   — sent in the invitation email link
  expiresAt   DateTime        — 7 days from creation
  acceptedAt  DateTime?       — set when invitation is accepted
  createdAt   DateTime
```

---

## Data model changes from v0.1.0

### New models (owned by Auth module)

`Workspace`, `WorkspaceMember`, `WorkspaceInvitation` — defined above.

### User model changes

```diff
model User {
  ...
+ passwordHash  String?         — bcrypt hash; null for legacy/external users
- keycloakId    String? @unique — removed
+ members       WorkspaceMember[]
}
```

### Removed models

- `Role` — replaced by `WorkspaceMember.role`
- `PermissionAssignment` — replaced by `WorkspaceMember` + workspace-scoped resource checks

### Models that gain `workspaceId`

Each gains `workspaceId String` + `workspace Workspace @relation(...)` + `@@index([workspaceId])`:

| Entity | Module |
|---|---|
| `Site` | SiteInventory |
| `Customer`, `Lead` | CrmLeads |
| `PriceBook`, `Promotion`, `FeeSchedule`, `TaxProfile` | Pricing |
| `AccessVendor` | AccessControl |
| `DelinquencyPolicy`, `ReminderPolicy` | Billing |
| `AccountingMapping`, `LandingPageConfig` | Payments / Storefront |

### Models unchanged (scoped through parent)

`Zone`, `Unit`, `UnitType` are scoped via `Site.workspaceId`.
`Agreement`, `Invoice`, `Mandate`, `Payment` are scoped via `Customer.workspaceId`.
All child/line-item records follow their parent.

### Key data conventions (unchanged from v0.1.0)

- All monetary values: **integer minor units** (euro cents)
- All timestamps: **stored UTC**, rendered `Europe/Berlin` in UI
- Soft delete on all commercial records
- Every mutable entity change emits an `AuditEvent`
- `unitCode` unique per site; `Invoice` idempotent by `(agreementId, periodStart)`

---

## Authentication

### Email/password JWT (all user types)

- Passwords hashed with **bcrypt** (cost factor 12)
- Access token: **JWT, 15-minute TTL**, signed with `JWT_SECRET` env var
- Refresh token: **opaque token, 7-day TTL**, stored hashed in `UserSession` table
- JWT payload: `{ sub: userId, workspaceId, role, type, iat, exp }`
- No Keycloak, no OIDC — purely stateless JWT

### WorkspaceGuard (new, replaces SiteGuard as primary gate)

Every `/api/operator/v1/*` route runs `WorkspaceGuard`:
1. Validates JWT signature and expiry
2. Reads `workspaceId` from JWT
3. Confirms an active `WorkspaceMember` record exists for `(workspaceId, userId)`
4. Attaches `req.workspace` and `req.member` for downstream use

`SiteGuard` remains for site-level checks on top of workspace membership.

---

## Auth flows

### Owner self-registration

```
POST /api/public/v1/auth/register
Body: { businessName, ownerName, email, password }

→ Validate email uniqueness
→ bcrypt hash password
→ Create User (type=owner)
→ Create Workspace (name=businessName, slug=slugify(businessName))
→ Create WorkspaceMember (role=owner)
→ Return { accessToken, refreshToken, workspaceId, userId }
```

### Login (all user types)

```
POST /api/public/v1/auth/login
Body: { email, password }

→ Find User by email
→ bcrypt.compare(password, user.passwordHash) — constant-time
→ Load WorkspaceMember → get workspaceId + role
→ Issue JWT + refresh token
→ Return { accessToken, refreshToken, workspaceId, role }
```

### Send invitation

```
POST /api/operator/v1/workspace/invite
Body: { email, role: 'operator' | 'tenant' }

Permission rules:
  - role='operator' → caller must be WorkspaceMember(role=owner)
  - role='tenant'   → caller must be WorkspaceMember(role=owner OR operator)

→ Create WorkspaceInvitation (token=cuid(), expiresAt=now+7d)
→ Queue notification email via Notifications module
   Subject: "You've been invited to [Workspace Name]"
   Body: Link to /accept-invite?token={token}
→ Return { invitationId }
```

### Accept invitation

```
GET  /api/public/v1/auth/invite/:token
→ Return { email, workspaceName, role, valid: bool }

POST /api/public/v1/auth/accept-invite
Body: { token, name, password }

→ Find WorkspaceInvitation by token
→ Validate not expired, not already accepted
→ bcrypt hash password
→ Create User (type derived from role: operator→operator, tenant→tenant)
→ Create WorkspaceMember (workspaceId, userId, role)
→ Mark invitation.acceptedAt = now()
→ Issue JWT + refresh token
→ Return { accessToken, refreshToken, workspaceId, role }
```

### Token refresh

```
POST /api/public/v1/auth/refresh
Body: { refreshToken }
→ Validate opaque token against UserSession
→ Issue new accessToken (+ optionally rotate refreshToken)
```

---

## API design

### Namespaces

| Prefix | Auth | Consumers |
|---|---|---|
| `/api/public/v1/*` | None | Public storefront, auth endpoints |
| `/api/operator/v1/*` | JWT (WorkspaceGuard) | Owner and Operator — management |
| `/api/tenant/v1/*` | JWT (tenant role) | Tenant — own agreements, invoices, access |
| `/api/system/v1/*` | HMAC-SHA256 | Stripe webhooks, access vendor callbacks |

### New auth endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/public/v1/auth/register` | Business owner self-registration |
| `POST` | `/api/public/v1/auth/login` | Email/password login |
| `POST` | `/api/public/v1/auth/refresh` | Refresh access token |
| `GET` | `/api/public/v1/auth/invite/:token` | Validate invitation token |
| `POST` | `/api/public/v1/auth/accept-invite` | Accept invite + set password |

### New workspace management endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/operator/v1/workspace/me` | Current workspace profile |
| `PATCH` | `/api/operator/v1/workspace/me` | Update name, slug, settings |
| `POST` | `/api/operator/v1/workspace/invite` | Invite operator or tenant |
| `GET` | `/api/operator/v1/workspace/invitations` | List pending invitations |
| `DELETE` | `/api/operator/v1/workspace/invitations/:id` | Revoke invitation |
| `GET` | `/api/operator/v1/workspace/members` | List workspace members |
| `DELETE` | `/api/operator/v1/workspace/members/:id` | Remove a member |

### Workspace-scoped public storefront (updated routes)

All public storefront routes now include `:workspaceSlug` so each business has its own public URL namespace:

| Old | New |
|---|---|
| `GET /api/public/v1/sites` | `GET /api/public/v1/w/:slug/sites` |
| `GET /api/public/v1/sites/:slug/availability` | `GET /api/public/v1/w/:wsSlug/sites/:siteSlug/availability` |
| `GET /api/public/v1/quotes` | `GET /api/public/v1/w/:wsSlug/quotes` |
| `POST /api/public/v1/checkout-sessions` | `POST /api/public/v1/w/:wsSlug/checkout-sessions` |
| `POST /api/public/v1/leads` | `POST /api/public/v1/w/:wsSlug/leads` |

### Global API conventions (unchanged)

- JSON over HTTPS
- All `POST` endpoints require `Idempotency-Key` header
- Monetary values as integer minor units
- UTC timestamps in responses
- Error envelope: `{ error: { code, message, details? } }`
- Webhooks signed with HMAC-SHA256 in `X-Signature-256` header

---

## Single portal design

One Next.js app (`apps/web/`) serves all three user types. Role-based routing determines which navigation and views are shown after login.

### Route map

| Route | Access | Purpose |
|---|---|---|
| `/register` | Public | Business owner self-registration |
| `/login` | Public | Email/password login |
| `/accept-invite` | Public (token) | Invitation acceptance + password setup |
| `/w/:workspaceSlug` | Public | Workspace storefront — site listing |
| `/w/:workspaceSlug/sites/:slug` | Public | Site availability |
| `/w/:workspaceSlug/book` | Authenticated tenant | Checkout flow |
| `/dashboard` | owner / operator | KPI overview (owner) or daily queue (operator) |
| `/sites` | owner / operator | Site + unit management |
| `/leads` | owner / operator | Lead inbox |
| `/agreements` | owner / operator | Rental agreements |
| `/billing` | owner / operator | Invoices, overdue, DATEV export |
| `/inspections` | owner / operator | Inspection runs |
| `/incidents` | owner / operator | Incident queue |
| `/team` | owner only | Invite + manage operators and tenants |
| `/settings` | owner only | Workspace profile, pricing, policies |
| `/my-storage` | tenant | Active rentals, access credentials |
| `/my-invoices` | tenant | Invoice history, payment methods |

### Role-based navigation

After login the portal reads `role` from the JWT and renders the appropriate sidebar:
- **owner** — full management sidebar + `/team` + `/settings`
- **operator** — management sidebar without team/settings (unless explicitly granted)
- **tenant** — personal sidebar: My Storage, My Invoices

Unauthenticated access to protected routes redirects to `/login`.

---

## Key workflows (updated)

### Business registration → first site

1. Owner hits `/register` → `POST /api/public/v1/auth/register`
2. Workspace + WorkspaceMember(owner) created; JWT returned
3. Owner redirected to `/dashboard` (empty state)
4. Owner creates first site: `POST /api/operator/v1/sites`
5. Owner invites an operator: `POST /api/operator/v1/workspace/invite { email, role: 'operator' }`
6. Operator receives email → `/accept-invite?token=...` → sets password → lands on `/dashboard` (operator view)

### Booking → Move-in (updated for invitation-only tenants)

1. Operator invites tenant: `POST /api/operator/v1/workspace/invite { email, role: 'tenant' }`
2. Tenant accepts invite → account created → logs in
3. Tenant browses `/w/:workspaceSlug/sites` → picks unit → checkout
4. Tenant submits payment details (Stripe SEPA/card mandate)
5. Operator drafts + tenant e-signs Agreement
6. Agreement activated → access credential issued → move-in confirmation email sent

All subsequent steps (billing, delinquency, lockout, recovery) are identical to v0.1.0.

### DATEV export, access events, incidents

Unchanged from v0.1.0 — all scoped to the workspace automatically via `workspaceId` in the JWT.

---

## German legal requirements (unchanged)

- **E-invoicing (B2B):** ZUGFeRD / XRechnung structured payload for all business tenants — mandatory since 1 Jan 2025
- **SEPA:** SEPA Core mandates; mandate reference, creditor ID and evidence retained
- **DATEV:** File-based Buchungsstapel CSV export
- **GDPR:** Soft-delete, legal hold, configurable retention, data minimisation on deactivation
- **eIDAS:** Simple electronic signature with SHA-256 evidence pack

---

## MVP scope boundary

**In MVP:**
- Business owner self-registration (email/password)
- Workspace creation on registration
- Operator invitation by email
- Tenant invitation by email (no self-registration on storefront)
- Full workspace data isolation
- Single unified portal (owner/operator management + tenant account)
- Workspace-scoped public storefront
- All v0.1.0 MVP features: inventory, pricing, checkout, agreements, billing, access, inspections, DATEV, reporting

**Deferred to v1:**
- SSO / OIDC (Keycloak or social login) as optional enterprise auth layer
- Per-site operator permission scoping (beyond workspace-level role)
- Multi-contact organisation accounts for business tenants
- Subdomain-per-workspace branding
- Tenant self-registration on storefront (configurable per workspace)

**Deferred to v2:**
- DATEV service integration (direct API)
- SEPA B2B direct debit
- White-labelling / custom domains

---

## Open questions (resolved from v0.1.0)

All previous open questions remain; the following are new:

| Question | Decision |
|---|---|
| Tenant self-registration | Invitation-only in MVP |
| Owner auth method | Email/password + JWT, no Keycloak |
| Portal count | Single unified portal |
| Data isolation granularity | Full workspace isolation |

| Still open | Notes |
|---|---|
| Which access vendor at each site? | Determines first real adapter |
| SEPA B2B required before v2? | SEPA Core sufficient for MVP |
| Deposits mandatory on all units? | Configurable per site via FeeSchedule |
