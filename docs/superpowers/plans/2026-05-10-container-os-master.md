# Container OS — MVP Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Container OS MVP — a German-first, multi-site container/self-storage SaaS for a two-site operator — from zero to a locally runnable, tested system.

**Architecture:** NestJS modular monolith backend (16 domain modules) + three Next.js portals (Owner, Operator, Tenant) in a pnpm monorepo. Modules communicate exclusively via an EventEmitter2 domain event bus. PostgreSQL 16 + Prisma for persistence, BullMQ (Redis) for job queues, MinIO for object storage, Keycloak for OIDC auth, Stripe for payments.

**Tech Stack:** NestJS 10, Next.js 14, TypeScript 5.4, Prisma 5, PostgreSQL 16, BullMQ 5, Redis 7, MinIO, Keycloak 24, Stripe SDK v14, shadcn/ui, Vitest, Playwright, pnpm workspaces

---

## Execution strategy

**Phase 0 is serial — complete it before starting any track.**
**Tracks A–F are fully parallel — dispatch one agent per track after Phase 0.**

| Phase | Plan file | Blocks |
|---|---|---|
| **0: Foundation** | `2026-05-10-container-os-00-foundation.md` | All tracks |
| **Track A:** SiteInventory + Pricing + Storefront | `2026-05-10-container-os-A-inventory-pricing-storefront.md` | Track F (portals) |
| **Track B:** CrmLeads + Reservations + Agreements + Documents | `2026-05-10-container-os-B-crm-reservations-agreements.md` | Track F |
| **Track C:** Billing + Payments (Stripe, DATEV, ZUGFeRD) | `2026-05-10-container-os-C-billing-payments.md` | Track F |
| **Track D:** AccessControl + Operations | `2026-05-10-container-os-D-access-operations.md` | Track F |
| **Track E:** Notifications + Reporting + Webhooks | `2026-05-10-container-os-E-notifications-reporting-webhooks.md` | Track F |
| **Track F:** Frontend portals (Tenant, Operator, Owner) | `2026-05-10-container-os-F-frontend-portals.md` | — |

Track F should start basic shell setup after Phase 0, then integrate APIs as tracks A–E complete.

---

## Domain event contracts

All modules communicate via these events (never direct service imports between modules):

| Event | Publisher | Subscribers |
|---|---|---|
| `reservation.confirmed` | Reservations | CrmLeads, Notifications |
| `agreement.activated` | Agreements | Billing, AccessControl, Notifications |
| `agreement.terminated` | Agreements | Billing, AccessControl, Notifications |
| `invoice.created` | Billing | Payments, Notifications |
| `invoice.overdue` | Billing | AccessControl, Notifications |
| `invoice.paid` | Billing | AccessControl, Notifications |
| `payment.succeeded` | Payments | Billing |
| `payment.failed` | Payments | Billing, Notifications |
| `access.credential.issued` | AccessControl | Notifications |
| `access.lockout.activated` | AccessControl | Notifications |
| `access.lockout.deactivated` | AccessControl | Notifications |
| `access.denied` | AccessControl | Operations |

All events carry `{ workspaceId, siteId, actorId, occurredAt }` in metadata.

---

## Global conventions (every module must follow)

- Monetary values: **integer minor units** (euro cents) in DB and API
- Timestamps: **stored UTC**, rendered `Europe/Berlin` in UI
- All POST endpoints require `Idempotency-Key` header (validated in `IdempotencyInterceptor`)
- All write operations emit an `AuditEvent` via `AuditService.record()`
- Soft delete: set `deletedAt` timestamp; never hard-delete commercial records
- Error classes: throw `DomainException` subclasses, never raw `Error` with business meaning
- Module boundaries: a module may only import from `packages/domain-types`; no cross-module NestJS service injection
- Tests: Vitest for unit + integration; real Postgres for integration tests (use `TEST_DATABASE_URL`)

---

## Spec reference

Design spec: `docs/superpowers/specs/2026-05-10-container-os-saas-design.md`
Source spec: `Production Master Spec for a German Multi-Site Container Storage SaaS.pdf`
