# Container OS

A German-first, multi-site container/self-storage SaaS for a two-site operator. Online-first for tenants, queue-first for operators, portfolio-first for owners.

**Spec version:** 0.1.0 · **Stack:** NestJS + Next.js + PostgreSQL + Prisma · **Status:** MVP

---

## What's inside

```
apps/
  api/            NestJS backend — 16 domain modules, REST API
  web-owner/      Next.js Owner portal   (port 3001) — portfolio KPIs, DATEV export
  web-operator/   Next.js Operator portal (port 3002) — daily queue, leads, inspections
  web-tenant/     Next.js Tenant portal  (port 3003) — browse, book, sign, pay

packages/
  domain-types/   Shared TypeScript enums, Zod schemas, DomainException
  i18n/           de/en locale files + t() helper
  ui/             Shared React components (Button, Card, Badge) — Tailwind-based
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 20 LTS |
| pnpm | ≥ 9 (via corepack) |
| Docker Desktop | any recent |

```bash
corepack enable       # activates pnpm from package.json engines field
```

---

## Quick start

### 1. Install dependencies

```bash
pnpm install          # installs all workspaces from repo root
```

### 2. Start Docker services

```bash
docker compose up -d
```

Services started:

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL 16 | 5432 | Primary database |
| Redis 7 | 6379 | BullMQ job queues |
| MinIO | 9000 / 9001 | Object storage (documents, photos) |
| Keycloak 24 | 8080 | OIDC identity provider |
| MailHog | 1025 / 8025 | SMTP trap (email preview UI at :8025) |

### 3. Copy environment file

```bash
cp apps/api/.env.example apps/api/.env
# Edit .env if your Docker credentials differ
```

### 4. Run database migration

```bash
cd apps/api
DATABASE_URL="postgresql://container_os:container_os_dev@localhost:5432/container_os" \
  npx prisma migrate deploy
```

### 5. Seed test data

```bash
DATABASE_URL="postgresql://container_os:container_os_dev@localhost:5432/container_os" \
  npx prisma db seed
```

Seeds: 2 sites · 92 units · published price books · promotions · notification templates · inspection checklists.

### 6. Build shared packages

```bash
cd packages/domain-types && pnpm build && cd ../..
cd packages/i18n && pnpm build && cd ../..
```

### 7. Start the API

```bash
cd apps/api
node_modules/.bin/nest build
DATABASE_URL="postgresql://container_os:container_os_dev@localhost:5432/container_os" \
REDIS_URL="redis://localhost:6379" \
MINIO_ENDPOINT="localhost" MINIO_PORT="9000" MINIO_USE_SSL="false" \
MINIO_ACCESS_KEY="container_os_minio" MINIO_SECRET_KEY="container_os_minio_dev" \
MINIO_BUCKET="container-os-dev" \
STRIPE_SECRET_KEY="sk_test_..." \
STRIPE_WEBHOOK_SECRET="whsec_..." \
KEYCLOAK_CLIENT_SECRET="dev-secret" \
SMTP_HOST="localhost" SMTP_PORT="1025" \
PORT=3000 NODE_ENV=development \
node dist/main.js
```

Or for file-watch dev mode (recompiles on save):

```bash
node_modules/.bin/nest start --watch
```

### 8. Start the portals (each in a separate terminal)

```bash
# Tenant portal
cd apps/web-tenant
NEXT_PUBLIC_API_URL="http://localhost:3000/api" pnpm dev   # → http://localhost:3003

# Operator portal
cd apps/web-operator
NEXT_PUBLIC_API_URL="http://localhost:3000/api" pnpm dev   # → http://localhost:3002

# Owner portal
cd apps/web-owner
NEXT_PUBLIC_API_URL="http://localhost:3000/api" pnpm dev   # → http://localhost:3001
```

---

## Running tests

```bash
cd apps/api && pnpm test          # 59 unit tests (Vitest)
cd apps/api && pnpm test:watch    # watch mode
```

All tests use mocks — no running database required.

---

## Key URLs (local)

| URL | Description |
|-----|-------------|
| http://localhost:3000/api/healthz | API liveness |
| http://localhost:3000/api/readyz | API readiness (checks DB) |
| **http://localhost:3000/docs** | **Swagger UI — 51 routes** |
| http://localhost:3000/docs-json | OpenAPI JSON |
| http://localhost:3001 | Owner portal |
| http://localhost:3002 | Operator portal |
| http://localhost:3003 | **Tenant portal (public)** |
| http://localhost:8025 | MailHog — email preview |
| http://localhost:9001 | MinIO console |
| http://localhost:8080 | Keycloak admin |

---

## API structure

All routes are prefixed `/api`.

| Prefix | Auth | Used by |
|--------|------|---------|
| `/public/v1/*` | None | Public site, checkout, lead capture |
| `/operator/v1/*` | OIDC Bearer + MFA | Owner and Operator staff |
| `/tenant/v1/*` | Magic-link or password | Tenant portal |
| `/system/v1/*` | HMAC-SHA256 signature | Stripe webhooks, access vendor callbacks |

**Conventions:**
- Monetary values: integer euro cents (`14900` = €149.00)
- Timestamps: stored UTC, rendered `Europe/Berlin`
- All `POST` endpoints require `Idempotency-Key` header
- Error envelope: `{ "error": { "code": "...", "message": "...", "details": [...] } }`

### Key public endpoints

```
GET  /api/public/v1/sites                           List all active sites
GET  /api/public/v1/sites/:slug/availability        Live unit availability by type
GET  /api/public/v1/quotes                          Price quote (supports promo codes)
POST /api/public/v1/checkout-sessions               Create checkout session + inventory hold
POST /api/public/v1/reservations                    Convert session to reservation
POST /api/public/v1/leads                           Capture lead (deduplicates by email/phone)
```

### Demo promo codes (seeded)

| Code | Discount | Valid until |
|------|----------|-------------|
| `SOMMER25` | 25% off | 31 Aug 2026 |
| `NEUMIETER15` | 15% off | open-ended |

---

## Domain modules (backend)

| Module | Responsibility |
|--------|---------------|
| `SiteInventory` | Sites, zones, unit types, units — state machine + availability |
| `Pricing` | Price books, rate rules, promotions, quote calculator |
| `Storefront` | Public landing pages, checkout sessions, quote requests |
| `CrmLeads` | Leads, customers, contacts, deduplication |
| `Reservations` | Inventory holds, reservation lifecycle, idempotent confirmation |
| `Agreements` | Contract templates (de/en), e-signing, activation, amendments |
| `Billing` | Invoices (ZUGFeRD/XRechnung for B2B), SEPA mandates, delinquency, lockout |
| `Payments` | Stripe adapter, immutable ledger, DATEV accounting export |
| `AccessControl` | Vendor adapter interface + stub, credential lifecycle, lockout state |
| `Operations` | Tasks, container inspections (mandatory), incidents, unit transfers |
| `Documents` | MinIO document storage, e-signature envelopes, SHA-256 evidence packs |
| `Notifications` | Email/SMS templates (de/en), transactional dispatch, opt-out |
| `Reporting` | Occupancy %, revenue by site and date range |
| `Webhooks` | API keys, HMAC-SHA256 signed outbound event delivery |
| `Auth` | Keycloak OIDC, RBAC (role-template + site-scoped), MFA enforcement |
| `Audit` | Immutable event sink, legal hold (blocks deletion/anonymisation) |

---

## German legal requirements (built in from day one)

- **E-invoicing (B2B):** Invoices for business customers include a ZUGFeRD/XRechnung XML payload (EN 16931) — mandatory since 1 Jan 2025
- **SEPA:** Mandate model supports both SEPA Core and SEPA B2B; mandate reference, creditor ID and evidence stored
- **DATEV:** File-based export (`POST /api/operator/v1/exports/datev`) generates Buchungsstapel CSV
- **GDPR:** Soft-delete on all commercial records; legal hold blocks anonymisation; configurable lead retention (default 90 days); audit trail immutable
- **eIDAS:** Simple electronic signature with SHA-256 evidence pack; qualified signature mode planned for v1

---

## Architecture decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Backend pattern | Modular monolith (NestJS modules) | Simple to operate, explicit boundaries, refactorable later |
| Frontend | Three separate Next.js apps | Clean role separation; no accidental privilege leakage |
| Database | PostgreSQL 16 + Prisma | Relational integrity for billing/audit; Prisma for type-safe queries |
| Job queue | BullMQ (Redis) | Durable jobs, dead-letter support, repeatable billing runs |
| Object store | MinIO (local) → S3-compatible (prod) | Documents, photos, exports; EU-region in production |
| Auth | Keycloak (OIDC) | Staff MFA mandatory; OIDC standard; self-hosted for data control |
| Payments | Stripe | SEPA Core mandate support; webhook-based reconciliation |
| Access control | Vendor-agnostic adapter + stub | Actual vendor (Noke/PTI/etc.) unknown — pluggable without touching billing/credential logic |
| Invoice language | de (default) + en | Both from day one; template-driven with locale fallback |

---

## Project files

```
docs/
  superpowers/
    specs/2026-05-10-container-os-saas-design.md   Full design document
    plans/2026-05-10-container-os-master.md         Implementation plan index
    plans/2026-05-10-container-os-00-foundation.md  Phase 0 plan
    plans/2026-05-10-container-os-[A-F]-*.md        Parallel track plans
```

---

## GitHub

https://github.com/rafayhabibullah/container-os
