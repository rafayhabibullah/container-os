# SiteLager

A German-first, multi-site self-storage SaaS. Tenants book and manage storage online; operators run day-to-day from a queue-driven dashboard; owners get a portfolio view across sites.

**Stack:** NestJS · Next.js · PostgreSQL · Prisma · **Status:** MVP

---

## Features

- **Tenant portal** — online booking, magic-link login, agreement signing, payment setup
- **Operator dashboard** — reservations queue, agreements, inspections, access control
- **Owner view** — cross-site occupancy and revenue reporting
- **Billing** — SEPA mandate support (Core + B2B), Stripe payments, ZUGFeRD/XRechnung e-invoices for B2B (EN 16931, mandatory since Jan 2025)
- **German-first** — all UI and documents available in de/en; GDPR soft-delete and audit trail built in

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 22 LTS (`.nvmrc` provided — run `nvm use`) |
| pnpm | ≥ 9 (via corepack: `corepack enable`) |
| Docker Desktop | Compose v2.20+ |

---

## Quick start

### Docker (recommended)

Requires Docker Desktop with Compose v2.20+.

```bash
cp .env.example .env          # add Stripe keys and Keycloak client secret
docker compose -f docker-compose.full.yml up --build
```

First boot takes ~3–5 minutes to build images. Subsequent starts (without `--build`) are under 30 seconds.

Once healthy, the app is available at the [local URLs](#local-urls) below.

### Manual dev

```bash
# 1. Install
corepack enable
pnpm install

# 2. Start infra
docker compose up -d          # postgres, redis, minio, keycloak, mailhog

# 3. API (migrate + seed + watch)
cd apps/api && pnpm dev       # → http://localhost:3000

# 4. Web portal
cd apps/web
NEXT_PUBLIC_API_URL="http://localhost:3000/api" pnpm dev   # → http://localhost:3001
```

> `pnpm dev` in `apps/api` runs migrations and seeds automatically on first boot.

---

## Environment variables

Copy `apps/api/.env.example` to `apps/api/.env`. The variables you must set for a working local stack:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `KEYCLOAK_CLIENT_SECRET` | Keycloak client secret |

Minio, SMTP (MailHog), and other infra vars are pre-filled in `.env.example` for the default Docker setup.

---

## Running tests

```bash
cd apps/api && pnpm test          # 59 unit tests — no database required
cd apps/api && pnpm test:watch    # watch mode
```

---

## Local URLs

| URL | Description |
|-----|-------------|
| http://localhost:3001 | Web portal (tenant / operator / owner) |
| http://localhost:3000/docs | Swagger UI |
| http://localhost:8025 | MailHog — email preview |
| http://localhost:9001 | MinIO console |
| http://localhost:8080 | Keycloak admin |
| http://localhost:3000/api/healthz | API liveness |

---

## Workspace layout

```
apps/
  api/        NestJS backend — REST API, port 3000
  web/        Next.js unified portal — tenant, operator, owner dashboards, port 3001

packages/
  domain-types/   Shared TypeScript enums, Zod schemas, DomainException
  i18n/           de/en locale files + t() helper
  ui/             Shared React components (Button, Card, Badge) — Tailwind-based
```

---

## Learn more

- [Master build spec](docs/superpowers/specs/SITE_LAGER_MASTER_BUILD_SPEC.md) — full domain model, legal requirements, architecture decisions
- [Swagger UI](http://localhost:3000/docs) — interactive API reference (run locally)

---

## Demo promo codes (seeded)

| Code | Discount |
|------|----------|
| `SOMMER25` | 25% off (until 31 Aug 2026) |
| `NEUMIETER15` | 15% off (open-ended) |

---

## GitHub

https://github.com/rafayhabibullah/sitelager
