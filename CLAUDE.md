# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SiteLager is a German-first, multi-site container/self-storage SaaS. The monorepo contains a NestJS REST API, a Next.js unified portal, and shared packages.

## Commands

### Install
```bash
pnpm install                  # from repo root — installs all workspaces
```

### Dev (manual)
```bash
docker compose up -d          # start infra: postgres, redis, minio, mailhog

# In apps/api:
pnpm dev                      # migrate + seed + nest start --watch (port 3000)

# In apps/web:
NEXT_PUBLIC_API_URL="http://localhost:3000/api" pnpm dev   # port 3001
```

### Full stack via Docker
```bash
docker compose -f docker-compose.full.yml up --build
```

### Build
```bash
pnpm build                    # from root — builds all workspaces
# Or per package: cd apps/api && pnpm build
```

### Tests (API only — Vitest, no DB required)
```bash
cd apps/api && pnpm test          # run once
cd apps/api && pnpm test:watch    # watch mode
# Run a single test file:
cd apps/api && pnpm exec vitest run src/modules/billing/billing.service.spec.ts
```

### Lint
```bash
pnpm lint                     # from root — lints all workspaces
cd apps/web && pnpm lint      # Next.js ESLint only
```

### Database
```bash
# From apps/api — use DATABASE_URL env or .env file
npx prisma migrate dev        # create + apply a new migration
npx prisma migrate deploy     # apply pending migrations (prod / CI)
npx prisma db seed            # re-seed (2 sites, 92 units, price books, promos)
npx prisma studio             # GUI at localhost:5555
```

## Workspace layout

```
apps/
  api/        NestJS backend — port 3000, prefix /api
  web/        Next.js unified portal — port 3001
packages/
  domain-types/   Shared TS enums, Zod schemas, DomainException
  i18n/           de/en locale files + t() helper
  ui/             Shared React components (Tailwind-based)
```

## API architecture

**Route namespaces** (all prefixed `/api`):

| Prefix | Auth | Consumers |
|--------|------|-----------|
| `/public/v1/*` | None | Storefront, checkout, leads |
| `/operator/v1/*` | OIDC Bearer + MFA | Owner / Operator staff |
| `/tenant/v1/*` | JWT session (magic-link or password) | Tenant portal |
| `/system/v1/*` | HMAC-SHA256 | Stripe webhooks, access vendor |

**Conventions:**
- Money: integer euro cents (`14900` = €149.00)
- Timestamps: stored UTC, rendered `Europe/Berlin`
- All POST endpoints require `Idempotency-Key` header
- Error envelope: `{ "error": { "code": "...", "message": "...", "details": [...] } }`
- Swagger UI at `http://localhost:3000/docs` (non-production only)

**Domain modules** (`apps/api/src/modules/`): `site-inventory`, `pricing`, `storefront`, `crm-leads`, `reservations`, `agreements`, `billing`, `payments`, `access-control`, `operations`, `documents`, `notifications`, `reporting`, `webhooks`, `auth`, `audit`, plus `listings`, `checkout`, `tenant-portal`, `operator-reservations`, `operator-agreements`, `organisations`.

Each module follows NestJS conventions: `*.module.ts`, `*.service.ts`, `*.controller.ts`, DTOs in `dto/`, and a `*.service.spec.ts` for Vitest tests using mocked dependencies.

## Web architecture

**Auth:** Cookie-based JWT (`sl_access`, `sl_refresh`). `requireAuth()` in `apps/web/src/lib/auth.ts` decodes the token client-side (no Keycloak round-trip) and redirects to `/login` if missing or expired. Dashboard layout gates on `user.type !== 'tenant'`.

**User types / roles:** `owner`, `operator`, `tenant` — embedded in the JWT payload as `type` and `role`.

**Routing:** Next.js App Router. Key route groups:
- `(dashboard)/` — owner/operator views (sidebar layout, rejects tenants)
- `my-storage/` — tenant portal
- `storage/` — public listing/detail pages
- `for-operators/` — public marketing page

**API calls from the web:** All go through `NEXT_PUBLIC_API_URL` (baked into the Next.js bundle at build time). Server components call the API directly; client components use fetch with the cookie-forwarded Bearer token.

## Shared packages

- **`@sitelager/domain-types`**: Import enums and Zod schemas from here rather than defining them in apps. Must be built (`pnpm build`) before apps consume it.
- **`@sitelager/i18n`**: Use `t('key', locale)` for all user-facing strings. Locales: `de` (default) and `en`.
- **`@sitelager/ui`**: `Button`, `Card`, `Badge` and other primitives. Tailwind-based — no CSS modules.

## Key local URLs

| URL | Purpose |
|-----|---------|
| http://localhost:3000/docs | Swagger UI |
| http://localhost:3001 | Web portal |
| http://localhost:8025 | MailHog (email preview) |
| http://localhost:9001 | MinIO console |

## German legal context

- Invoices for B2B customers embed ZUGFeRD/XRechnung XML (EN 16931) — mandatory since Jan 2025
- SEPA mandate model supports Core and B2B; mandate reference and creditor ID must be stored
- DATEV export: `POST /api/operator/v1/exports/datev`
- GDPR: soft-delete on all commercial records; `audit` module has legal hold that blocks anonymisation

## Docker notes

- `pnpm deploy --prod` in the API Dockerfile flattens workspace symlinks for the runtime image
- `output: 'standalone'` in `next.config.js` — Next.js bundles a minimal server into `.next/standalone/`
- Prisma `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` needed for Alpine containers
- `NEXT_PUBLIC_API_URL` is a Docker build ARG (baked at build time, not injected at runtime)

## Seeded demo data

| Promo code | Discount |
|------------|----------|
| `SOMMER25` | 25% off (until 31 Aug 2026) |
| `NEUMIETER15` | 15% off (open-ended) |

DB: `postgresql://container_os:container_os_dev@localhost:5432/container_os`
