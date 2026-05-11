# SiteLager Master Build Specification

**File:** `SITE_LAGER_MASTER_BUILD_SPEC.md`  
**Product:** SiteLager  
**Domain:** `sitelager.com`  
**Version:** `0.5.0`  
**Status:** Build-ready planning baseline  
**Last updated:** 2026-05-11  
**Primary stack:** Next.js + NestJS + PostgreSQL  
**Deployment target:** Hetzner VPS with Docker  
**Primary market:** EU from day one  
**Default launch behavior:** Marketplace commission enabled in architecture but set to 0% at launch  

---

## 0. How This Spec Must Be Used

This file is the **single source of truth** for building SiteLager.

Rules for future updates:

1. Keep exactly one master spec file: `SITE_LAGER_MASTER_BUILD_SPEC.md`.
2. Do not create separate competing specification files.
3. Update this same file when decisions change.
4. Every change must be recorded in the changelog.
5. Use semantic versioning:
   - `0.x.x` = planning/build iterations.
   - `1.0.0` = first production release.
6. When using Claude Code, Cursor, ChatGPT, or another AI coding agent, give this file as the main project context.
7. AI agents must build the system module-by-module and vertical-flow-by-vertical-flow. They must not attempt to generate the entire system in one uncontrolled step.

---

## 1. Changelog

### v0.5.0 — Merged Container OS Multi-Tenant Design

Added from Container OS v0.2.0 design doc:

- Auth implementation detail: bcrypt cost 12, JWT 15-min TTL, opaque refresh token 7-day TTL stored hashed in user_sessions, JWT payload structure.
- OrganisationGuard and SiteGuard chain description.
- Detailed auth flow pseudocode: owner registration, login, send invitation, accept invitation, token refresh.
- NestJS backend module responsibility table.
- Data conventions: integer minor units, UTC storage / Europe/Berlin rendering, soft delete, AuditEvent per mutation, invoice idempotency rule.
- Docker Compose: MailHog added for local email trap.
- Phase 2: ZUGFeRD/XRechnung, DATEV, eIDAS explicitly named.

SiteLager v0.4.0 takes precedence on all conflicts:

- Product name: SiteLager (not Container OS).
- Terminology: Organisation / OrganisationMember (not Workspace / WorkspaceMember).
- Payment provider: Mollie-first (not Stripe).
- Role model: 7 roles (not 3).
- German legal: ZUGFeRD and DATEV remain Phase 2 (not MVP).
- API style: flat /v1/ routes (not /api/public/v1/ namespace pattern).

### v0.4.0 — EU Marketplace + SaaS Operating System Baseline

Added:

- EU-first product direction.
- Public marketplace showing available storage units from all participating organisations.
- Country-based language defaults with header language dropdown.
- Mollie-first payment provider direction, with provider abstraction.
- Hetzner VPS + Docker low-cost deployment target.
- Instant booking in addition to approval-based booking.
- Marketplace commission as 5% of first month rent later, 0% at launch.
- Tenant money should route directly to the organisation account where possible.
- Detailed UI/UX requirements for public marketplace, owner dashboard, operator cockpit, tenant portal, and platform admin.
- Storeganise-inspired feature requirements, excluding branded booking app for MVP.
- Access control, reporting, analytics, inspections, tasks, and communication modules.

Changed:

- Product is now both:
  1. A SaaS operating system for storage/container organisations.
  2. A marketplace where tenants can find, compare, book, and pay for storage units.

Removed from MVP:

- Branded booking app per organisation.
- Mobile native apps.
- Fully automated legal enforcement/collection workflows.

Open questions:

- Final legal templates per EU country require lawyer review.
- Final Mollie Connect/onboarding details must be validated during implementation.
- Exact country rollout order after Germany needs business decision.

### v0.3.0 — Multi-Tenant SaaS Architecture

Added:

- Organisation-level SaaS model.
- Site-level scoping.
- Owner, manager, operator, tenant, platform admin role definitions.
- SaaS subscription billing model.

### v0.2.0 — Module and Flow Expansion

Added:

- Detailed modules.
- Booking, contract, invoice, payment, dunning, access, report flows.

### v0.1.0 — Research Baseline

Added:

- Initial competitor-derived requirements.
- Germany-focused storage/container management concept.

---

# PART A — Product Definition

---

## 2. Product Vision

SiteLager is a European SaaS and marketplace platform for container storage and self-storage operators.

It allows independent storage businesses to register, create one or more physical storage sites, add their containers/storage units, manage tenants, contracts, invoices, payments, occupancy, access, inspections, and reports.

At the same time, SiteLager provides a public marketplace where renters can search by city, postcode, radius, country, unit size, price, availability, and access features, then request or instantly book a storage unit.

The long-term goal is to become the operating system and discovery marketplace for modern storage sites across Europe.

---

## 3. Product Type

SiteLager has two connected products:

### 3.1 SaaS Back Office

Used by storage businesses.

Main users:

- Organisation Owner
- Billing Admin
- Site Manager
- Operator

Core purpose:

- Manage sites.
- Manage containers/storage units.
- Manage marketplace listings.
- Manage tenants.
- Manage contracts.
- Manage invoices and payments.
- Manage occupancy.
- Manage operator tasks.
- Manage inspections.
- Manage access rules.
- Manage reports.

### 3.2 Public Marketplace

Used by tenants/renters.

Main users:

- Public visitor
- Tenant
- Business tenant

Core purpose:

- Search storage units.
- Compare prices and features.
- View site details.
- Book instantly or submit booking request.
- Pay deposit/first month where enabled.
- Sign contract.
- Access tenant portal.

---

## 4. Business Model

SiteLager has two billing layers.

### 4.1 Layer 1 — Tenant Pays Organisation

This is the rental payment for a storage unit.

Examples:

- Monthly rent.
- Deposit.
- Setup/admin fee.
- Late fee.
- Cleaning/damage charge.
- Move-out charge if applicable.

The organisation is the merchant/seller/service provider for the storage rental.

Target approach:

- Tenant payment should go directly to the organisation’s connected payment account where possible.
- SiteLager should record the transaction and, when applicable, apply platform commission.
- The invoice to the tenant should be issued by the organisation, not by SiteLager.

### 4.2 Layer 2 — Organisation Pays SiteLager

This is the SaaS subscription.

Examples:

- Monthly plan fee.
- Extra unit fee.
- Extra site fee.
- Marketplace commission.
- Future add-ons.

The organisation pays SiteLager.

---

## 5. SiteLager Pricing Strategy

### 5.1 SaaS Plans

Initial recommended plans:

#### Starter

For small operators.

- €49/month.
- 1 site included.
- Up to 50 units included.
- Marketplace listing included.
- Manual approval-based booking.
- Basic invoices.
- Basic contracts.
- Basic tenant portal.
- Email notifications.
- Basic dashboard.

Extra units:

- €0.50 per extra unit/month.

#### Growth

For active operators.

- €99/month.
- 2 sites included.
- Up to 150 units included.
- Instant booking.
- Recurring billing.
- Dunning reminders.
- Manager/operator roles.
- Marketplace publishing.
- Reporting.
- Tenant portal.
- Document management.

Extra units:

- €0.40 per extra unit/month.

#### Pro

For multi-site operators.

- €199/month.
- 5 sites included.
- Up to 500 units included.
- Advanced reports.
- Multi-language contract templates.
- API/webhooks later.
- Access-control-ready workflows.
- Custom templates.
- Priority support.

Extra units:

- €0.30 per extra unit/month.

### 5.2 Marketplace Commission

Decision:

- Build marketplace commission into the system from day one.
- Launch with commission set to `0%`.
- Future planned commission: `5%` of first month rent.
- Commission is charged only for marketplace-originated bookings.
- No commission for bookings created manually inside an organisation dashboard.
- No commission for direct private organisation booking links unless later configured.

Example:

- First month rent: €120.
- Marketplace commission rate after launch period: 5%.
- SiteLager commission: €6.
- Organisation receives remainder after payment provider fees and platform fee handling.

### 5.3 Marketplace Launch Positioning

At launch:

> “Publish your storage units on SiteLager Marketplace with 0% marketplace commission during launch.”

This reduces sales resistance while keeping the architecture ready for future monetisation.

---

## 6. Core Terminology

| Term | Meaning |
|---|---|
| Platform Admin | Internal SiteLager team user |
| Organisation | Storage company/business using SiteLager |
| Organisation Owner | Main owner/admin of the organisation account |
| Billing Admin | Organisation user responsible for SaaS billing and payment settings |
| Site | Physical storage location/yard/facility |
| Site Manager | User responsible for one or more sites |
| Operator | Staff member handling daily site tasks |
| Public Visitor | Marketplace visitor not logged in |
| Tenant | Person/company renting storage |
| Unit | Rentable container/storage space |
| Listing | Public marketplace representation of a unit or unit type |
| Booking | Request or instant reservation for a unit |
| Contract | Legal rental agreement |
| Invoice | Bill issued by organisation to tenant |
| Payment | Money movement related to invoice/subscription |
| Organisation Subscription | Organisation’s SaaS subscription to SiteLager |
| Marketplace Commission | SiteLager fee for marketplace-originated booking |
| Access Credential | Key/code/instruction used to access site/unit |
| Dunning | Late payment reminder and recovery workflow |

Avoid using the term “client” in the UI because it confuses organisations, tenants, and platform customers.

---

## 7. Target Users

### 7.1 Organisation Owner

Owns or runs a storage/container business.

Needs:

- Register organisation.
- Create multiple sites.
- Add units.
- Publish listings.
- Invite team.
- View occupancy.
- View revenue.
- Manage contracts/invoices/payments.
- Configure country/language/legal templates.
- Pay SiteLager subscription.

### 7.2 Site Manager

Manages one or more physical sites.

Needs:

- Manage assigned sites.
- Manage units/listings.
- Approve/reject bookings.
- Manage operators.
- View site reports.
- Handle tenants.
- Handle move-ins/move-outs.

### 7.3 Operator

Handles daily operations.

Needs:

- See assigned tasks.
- Manage move-ins/move-outs.
- Upload inspection photos.
- Contact tenants.
- Check overdue alerts.
- Update unit status.

### 7.4 Tenant

Rents a storage unit.

Needs:

- Search marketplace.
- Book unit.
- Upload documents.
- Sign contract.
- Pay invoice.
- Access tenant portal.
- View unit/access instructions.
- Request support.
- Request move-out.

### 7.5 Platform Admin

SiteLager internal user.

Needs:

- Manage organisations.
- Manage plans.
- Monitor payments.
- Moderate listings.
- View audit logs.
- Diagnose issues.
- Support customers.

---

# PART B — Architecture

---

## 8. Technical Stack

### 8.1 Frontend

Use:

- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- React Hook Form.
- Zod.
- next-intl or equivalent i18n library.
- TanStack Query where client-side fetching is needed.

Reason:

- Public marketplace needs SEO.
- City pages need indexable content.
- Listing pages need fast loading.
- Tenant portal and dashboard need modern UI.
- Next.js supports public pages, app pages, and server-side rendering.

### 8.2 Backend

Use:

- NestJS.
- Node.js.
- TypeScript.
- PostgreSQL.
- Prisma ORM or TypeORM. Recommended: Prisma for speed and clarity.
- Redis.
- BullMQ for background jobs.
- OpenAPI/Swagger.
- JWT or secure session-based authentication.
- RBAC + scoped permission service.

### 8.3 Authentication Implementation

- Passwords hashed with bcrypt, cost factor 12.
- Access token: JWT, 15-minute TTL, signed with `JWT_SECRET` env var.
- Refresh token: opaque token, 7-day TTL, stored hashed in `user_sessions` table.
- JWT payload: `{ sub: userId, organisationId, role, type, iat, exp }`.
- No OIDC, no third-party identity provider — purely stateless JWT.

### 8.4 Payments

Use:

- Mollie-first provider integration.
- Payment provider abstraction layer.
- Future Stripe support possible.

Payment architecture must not hardcode Mollie business logic into domain modules. Use a `PaymentsProvider` interface.

### 8.5 File Storage

Use S3-compatible storage.

Low-cost options:

- Hetzner Object Storage when available/suitable.
- Cloudflare R2.
- AWS S3 later.
- MinIO locally.

Files:

- Unit photos.
- Site photos.
- Tenant documents.
- Contracts.
- Invoices.
- Inspection photos.
- Damage reports.

### 8.6 Email

Use transactional email provider.

Options:

- Resend.
- Postmark.
- Mailgun.
- SendGrid.

The email system must support templates, languages, logs, retries, and event-driven sending.

### 8.7 Hosting

Initial hosting:

- Hetzner VPS.
- Docker Compose.
- PostgreSQL.
- Redis.
- API container.
- Web container.
- Worker container.
- Reverse proxy with Caddy or Nginx.
- Cloudflare DNS/CDN/WAF.

Local development services:

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL 16 | 5432 | Primary data store |
| Redis 7 | 6379 | BullMQ queues |
| MinIO | 9000 / 9001 | S3-compatible object store |
| MailHog | 1025 / 8025 | SMTP trap — receives invitation + notification emails locally |

Migration path:

- Managed PostgreSQL.
- Separate worker host.
- Separate object storage.
- Horizontal scaling.
- Dedicated search service.

---

## 9. Monorepo Structure

Recommended structure:

```txt
sitelager/
  apps/
    web/                      # Next.js public site, marketplace, dashboards, portals
    api/                      # NestJS API
    worker/                   # Optional separate NestJS/BullMQ worker process
  packages/
    database/                 # Prisma schema, migrations, seed data
    ui/                       # Shared UI components
    config/                   # Shared ESLint, TSConfig, env helpers
    types/                    # Shared TypeScript DTOs/types
    validation/               # Shared Zod schemas
    email-templates/          # Multi-language email templates
    contracts/                # Contract/invoice template utilities
  docker/
    Dockerfile.web
    Dockerfile.api
    Dockerfile.worker
    docker-compose.yml
  docs/
    SITE_LAGER_MASTER_BUILD_SPEC.md
    AI_BUILD_PROMPTS.md
  scripts/
    seed.ts
    backup-db.sh
    restore-db.sh
  .github/
    workflows/
```

Use pnpm workspaces or Turborepo.

### 9.1 NestJS Backend Modules

| Module | Responsibility |
|---|---|
| `SiteInventory` | Sites, zones, units, availability — organisation-scoped |
| `Pricing` | PriceBooks, RateRules, promotions — organisation-scoped |
| `Storefront` | Public organisation-scoped landing pages, checkout sessions |
| `CrmLeads` | Leads, customers, contacts — organisation-scoped |
| `Reservations` | Inventory holds, expiry, race-condition locking |
| `Agreements` | Rental contracts (monthly + fixed-term), e-sign, amendments |
| `Billing` | Invoices, SEPA mandates, delinquency, lockout |
| `Payments` | Mollie adapter, immutable ledger, accounting export |
| `AccessControl` | Credential issuing/revoking, vendor adapter interface + stub |
| `Operations` | Tasks, container inspections, incidents, transfers |
| `Documents` | Document storage, signature envelopes |
| `Reporting` | Dashboards, metric snapshots, financial reports |
| `Notifications` | Email templates de/en, invitation and transactional emails |
| `Auth` | Email/password JWT auth, Organisation CRUD, OrganisationMember, invitation system |
| `Audit` | Immutable event sink, legal hold |
| `Webhooks` | API keys, signed outbound delivery |

---

## 10. Multi-Tenant Architecture

### 10.1 Tenant Isolation Meaning

There are two meanings of “tenant”:

1. SaaS tenant = organisation using SiteLager.
2. Storage tenant = renter using storage.

In code, use:

- `organisation` for SaaS tenant.
- `tenant` for storage renter.

### 10.2 Isolation Strategy

Use a shared database with strict organisation scoping.

Every organisation-owned table must include:

- `organisation_id`.
- `site_id` where applicable.

Every query must be scoped by:

- authenticated user membership.
- organisation ID.
- site permissions.

Never query business data by ID alone.

Bad:

```ts
findInvoiceById(invoiceId)
```

Good:

```ts
findInvoiceById({ invoiceId, organisationId, allowedSiteIds })
```

### 10.3 Recommended Security Layers

Layer 1:

- API authentication.

Layer 2:

- RBAC permission checks.

Layer 3:

- Organisation and site scope checks in service layer.

Layer 4:

- Composite database indexes including organisation/site.

Layer 5 later:

- PostgreSQL Row Level Security for high-security production maturity.

### 10.4 Membership Model

A global user can belong to multiple organisations and can have different roles in each.

Example:

- Ali owns Organisation A.
- Ali is a tenant renting from Organisation B.
- Ali is an operator for Organisation C.

So `users` are global, and access is granted through memberships.

---

## 11. High-Level System Components

```txt
Public Visitor / Tenant / Owner / Operator
                |
                v
          Next.js Web App
                |
                v
          NestJS API Gateway
                |
    --------------------------------
    |       |        |       |      |
 PostgreSQL Redis  Object  Mollie  Email
                  Storage Provider Provider
                |
                v
          Worker Process
```

---

## 12. Deployment Architecture — MVP

Use one Hetzner VPS initially.

Services:

```txt
Caddy/Nginx
  - routes sitelager.com to web
  - routes api.sitelager.com to api

web
  - Next.js app

api
  - NestJS API

worker
  - background jobs

postgres
  - database

redis
  - queue/cache/session support
```

Minimum production requirements:

- HTTPS.
- Daily PostgreSQL backups.
- Object storage backups.
- Environment secrets outside Git.
- Basic monitoring.
- Log rotation.
- Firewall.
- SSH key only.
- Database backup restore test.

---

# PART C — UI/UX and Design Specification

---

## 13. Brand Direction

Brand:

- Name: SiteLager.
- Domain: sitelager.com.
- Style: modern, trustworthy, SaaS, operational, European.
- Tone: clear, professional, stable, not playful.

Suggested tagline options:

1. “The operating system for modern storage sites.”
2. “Find, rent, and manage storage across Europe.”
3. “Run your storage site from one platform.”

Recommended primary tagline for SaaS:

> The operating system for modern storage sites.

Recommended marketplace headline:

> Find storage and container space near you.

---

## 14. Visual Design System

### 14.1 Colors

Recommended palette:

- Primary navy: `#0B1F3A`.
- Primary blue: `#2563EB`.
- Success green: `#16A34A`.
- Warning amber: `#F59E0B`.
- Danger red: `#DC2626`.
- Background: `#F8FAFC`.
- Surface: `#FFFFFF`.
- Border: `#E2E8F0`.
- Text primary: `#0F172A`.
- Text secondary: `#64748B`.

### 14.2 Typography

Use a clean sans-serif font.

Recommended:

- Inter.
- Geist.
- Manrope.

Typography rules:

- Large public headings: bold, clear.
- Dashboard labels: compact but readable.
- Avoid tiny gray text for important operational data.
- Use tabular numbers for prices, invoices, and reports.

### 14.3 Component Style

Use:

- Rounded cards.
- Clear table layouts.
- Strong status badges.
- Responsive side navigation.
- Sticky action bars for workflows.
- Stepper components for booking and onboarding.
- Empty states with clear CTA.
- Skeleton loading states.
- Error states with retry.

### 14.4 Accessibility

Requirements:

- Keyboard navigation.
- Visible focus states.
- Sufficient contrast.
- Labels for all inputs.
- ARIA attributes for dialogs/menus.
- No color-only status communication.
- Forms must show inline validation.

---

## 15. Internationalisation UX

SiteLager is EU-first.

### 15.1 Language Defaults

Default language should be based on:

1. User selected language preference if logged in.
2. Header language dropdown if selected.
3. Browser language.
4. Area/country being visited.
5. Fallback to English.

Examples:

- Visitor searching in Germany sees German by default.
- Visitor searching in Netherlands sees Dutch by default if available.
- Visitor can change language from header dropdown.
- Tenant profile stores language preference.
- Contract and invoice language should use tenant/booking language unless organisation overrides.

### 15.2 Header Language Dropdown

Public website header must include language dropdown.

Dropdown behavior:

- Shows current language.
- Lists supported languages.
- Persists choice in cookie and user profile when logged in.
- Does not break current page route.
- If translated content does not exist, fall back gracefully.

### 15.3 Required Language Domains

The following must support i18n:

- Public website.
- Marketplace filters.
- Listing detail pages.
- Booking forms.
- Tenant portal.
- Owner/operator dashboard.
- Emails.
- Contract templates.
- Invoice labels.
- Notification templates.
- Error messages.
- Legal pages.

### 15.4 Initial Supported Languages

Because EU is day-one target, architecture must support all EU languages, but actual translations can be added incrementally.

Initial implementation must support at least:

- English.
- German.

Recommended early additions:

- Dutch.
- French.
- Spanish.
- Italian.
- Polish.

---

## 16. Public Website UX

### 16.1 Public Website Main Pages

Pages:

- `/` — homepage.
- `/search` — marketplace search.
- `/storage/[country]` — country landing pages.
- `/storage/[country]/[city]` — city SEO pages.
- `/listing/[listingSlug]` — listing detail.
- `/site/[siteSlug]` — public site profile.
- `/for-operators` — SaaS landing page.
- `/pricing` — SiteLager SaaS pricing.
- `/login`.
- `/register`.
- `/booking/[bookingId]` — booking continuation.
- `/legal/privacy`.
- `/legal/terms`.

### 16.2 Homepage Structure

Sections:

1. Header:
   - logo.
   - search link.
   - for operators.
   - pricing.
   - language dropdown.
   - login.
   - get started.

2. Hero:
   - headline: “Find storage and container space near you.”
   - location search input.
   - radius selector.
   - CTA: Search storage.
   - secondary CTA: List your storage site.

3. Popular cities:
   - Berlin.
   - Hamburg.
   - Munich.
   - Cologne.
   - Frankfurt.
   - Amsterdam later.
   - Paris later.

4. How it works:
   - Search.
   - Choose.
   - Book.
   - Move in.

5. For operators:
   - SaaS benefits.
   - occupancy.
   - payments.
   - contracts.
   - reports.

6. Featured listings.

7. Trust/security section.

8. Footer:
   - languages.
   - legal.
   - operator links.
   - support.

### 16.3 Marketplace Search Page

Search UX:

- Search input for city/postcode/address.
- Radius selector.
- Map/list toggle.
- Filters sidebar on desktop.
- Bottom drawer filters on mobile.

Filters:

- Country.
- City/postcode/radius.
- Unit type.
- Unit size.
- Monthly price range.
- Deposit.
- Availability date.
- Indoor/outdoor.
- Drive-up access.
- 24/7 access.
- Business use allowed.
- Instant booking.
- Approval required.
- Climate-controlled later.
- Security features.

Sort options:

- Recommended.
- Nearest.
- Lowest price.
- Largest size.
- Available soonest.

Listing card must show:

- Photo.
- Unit/listing title.
- Site/city.
- Distance.
- Size.
- Monthly price.
- Deposit if public.
- Availability.
- Instant booking badge if enabled.
- Key features.
- CTA: View details.

### 16.4 Listing Detail Page

Must show:

- Photos gallery.
- Title.
- Site location/city.
- Price per month.
- Deposit.
- VAT/tax note.
- Availability date.
- Size/dimensions.
- Access method summary.
- Site opening/access hours.
- Security features.
- Minimum rental duration.
- Cancellation summary.
- Required documents.
- Organisation/site profile.
- Map preview.
- Similar units.
- CTA: Book now / Request booking.

CTA behavior:

- If instant booking enabled: “Book now”.
- If approval required: “Request booking”.
- If price hidden: “Request price”.

### 16.5 Public Site Profile

Shows:

- Site name.
- Organisation name.
- Photos.
- Address area/city. Exact address can be hidden until booking if organisation wants.
- Available unit types.
- Access hours.
- Features.
- Contact/request CTA.
- Reviews later.

---

## 17. Owner Dashboard UX

### 17.1 Navigation

Owner sidebar:

- Dashboard.
- Sites.
- Units.
- Marketplace Listings.
- Bookings.
- Tenants.
- Contracts.
- Invoices.
- Payments.
- Tasks.
- Inspections.
- Reports.
- Team.
- Documents.
- Settings.
- SiteLager Billing.

### 17.2 Owner Dashboard Home

Cards:

- Total sites.
- Total units.
- Occupancy percentage.
- Monthly recurring revenue.
- Open invoices.
- Overdue amount.
- Pending bookings.
- Marketplace leads.
- Move-ins today.
- Move-outs upcoming.

Charts:

- Occupancy over time.
- Revenue over time.
- Booking conversion.
- Unit availability by site.

Tables:

- Pending booking requests.
- Failed payments.
- Overdue tenants.
- Units needing attention.

### 17.3 Site Switcher

Dashboard must support:

- All sites view.
- Single site view.
- Multi-site comparison.

Site switcher should be visible in the top bar.

---

## 18. Site Manager / Operator UX

### 18.1 Manager View

Manager focuses on assigned sites.

Navigation:

- Dashboard.
- Units.
- Bookings.
- Tenants.
- Tasks.
- Inspections.
- Invoices.
- Contracts.
- Reports.

Manager cannot see unassigned sites.

### 18.2 Operator Cockpit

Operator should see action-first UI.

Main screen:

- Today’s tasks.
- Move-ins.
- Move-outs.
- Pending approvals.
- Overdue alerts.
- Units in maintenance.
- Inspection queue.
- Recent tenant messages.

Operator should not start from analytics-heavy view. They need operational work queue.

---

## 19. Tenant Portal UX

Tenant navigation:

- Dashboard.
- My Units.
- Contracts.
- Invoices.
- Payment Methods.
- Documents.
- Messages/Support.
- Move-out Request.
- Profile.

Tenant dashboard must show:

- Active rented units.
- Next payment amount/date.
- Overdue warnings.
- Contract status.
- Access instructions.
- Support CTA.

Tenant portal must be mobile-friendly.

---

## 20. Platform Admin UX

Navigation:

- Overview.
- Organisations.
- Subscriptions.
- Marketplace Listings.
- Bookings.
- Payments/Commissions.
- Support.
- Audit Logs.
- Email Logs.
- Jobs.
- System Health.
- Feature Flags.
- Settings.

Platform admin must never silently change organisation data. Any support action must create audit logs.

---

# PART D — Roles and Permissions

---

## 21. Role Model

Roles:

1. Platform Admin.
2. Organisation Owner.
3. Organisation Billing Admin.
4. Site Manager.
5. Operator.
6. Tenant.
7. Public Visitor.

Permissions must be scoped.

A role without scope is not enough.

Example:

- `SITE_MANAGER` + `site_id=beta`.
- Can manage Beta only.
- Cannot see Gamma.

---

## 22. Permission Matrix

| Capability | Platform Admin | Owner | Billing Admin | Site Manager | Operator | Tenant | Public |
|---|---:|---:|---:|---:|---:|---:|---:|
| View public listings | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Register organisation | No | Yes | No | No | No | No | Yes |
| Manage all organisations | Yes | No | No | No | No | No | No |
| Manage own organisation | Support/audit only | Yes | Limited | No | No | No | No |
| Create site | No | Yes | No | No/optional | No | No | No |
| Edit assigned site | No | Yes | No | Yes | Limited | No | No |
| Invite owner/admin | Support only | Yes | No | No | No | No | No |
| Invite manager/operator | Support only | Yes | No | Optional | No | No | No |
| Create unit | No | Yes | No | Yes | Optional | No | No |
| Edit unit price | No | Yes | No | Yes | No/optional | No | No |
| Publish listing | Moderate | Yes | No | Yes | No | No | No |
| View bookings | Support | Yes | No | Assigned sites | Assigned sites | Own | No |
| Approve booking | No | Yes | No | Yes | Optional | No | No |
| Create tenant | No | Yes | No | Yes | Yes | No | No |
| View tenant documents | Support/audit | Yes | No | Assigned sites | Limited | Own | No |
| Generate contract | No | Yes | No | Yes | Optional | Own only | No |
| Sign contract | No | Organisation side | No | If allowed | No | Tenant side | No |
| Issue invoice | No | Yes | Optional | Yes | No/optional | No | No |
| Mark payment manually | No | Yes | Yes | Optional | No | No | No |
| Configure payment provider | No | Yes | Yes | No | No | No | No |
| View reports | Platform-level | Yes | Financial only | Assigned sites | Limited | No | No |
| Manage SaaS subscription | Support | Yes | Yes | No | No | No | No |
| View own invoices | No | No | No | No | No | Yes | No |
| Pay invoice | No | No | No | No | No | Yes | No |
| Request move-out | No | No | No | No | No | Yes | No |

Every permission must be implemented as code, not just hidden UI.

---

# PART E — Core Modules

---

## 23. Module 1 — Public Marketplace Website

### Purpose

Allow public visitors to find available storage units across participating organisations.

### Features

- SEO homepage.
- City/country landing pages.
- Marketplace search.
- Map/list view.
- Listing detail pages.
- Site profile pages.
- Language dropdown.
- Tenant registration/login.
- Booking request.
- Instant booking.

### Key Requirements

- Only published listings appear publicly.
- Private unit/internal notes never appear publicly.
- Organisation can choose which units/listings are published.
- Organisation can choose price visibility.
- Public listings must be indexable by search engines.
- Search pages should support SEO-friendly metadata.

### Acceptance Criteria

- Public visitor can search by area.
- Visitor sees units from multiple organisations.
- Visitor can filter and sort.
- Visitor can open listing details.
- Visitor can start booking flow.
- Language can be changed from header.

---

## 24. Module 2 — Organisation Registration and Onboarding

### Purpose

Allow storage businesses to register and start using SiteLager.

### Flow

1. Owner clicks “List your storage site”.
2. Owner creates account.
3. Owner verifies email.
4. Owner creates organisation.
5. Owner selects country.
6. System selects default language based on country/browser.
7. Owner can change language from dropdown.
8. Owner enters legal company details.
9. Owner adds first site.
10. Owner creates first units.
11. Owner configures prices and deposits.
12. Owner configures payment provider later or skips for manual booking.
13. Owner invites managers/operators.
14. Owner publishes listings.

### Organisation Fields

- Legal name.
- Trading name.
- Country.
- Address.
- VAT ID.
- Tax number.
- Billing email.
- Support email.
- Phone.
- Website.
- Default currency.
- Default language.
- Supported languages.
- Timezone.
- Marketplace profile visibility.
- Subscription plan.

### Acceptance Criteria

- New organisation can be created.
- Owner is automatically assigned owner role.
- Organisation has default settings based on country.
- First site setup wizard is available.

---

## 25. Module 3 — Authentication and Authorization

### Purpose

Secure all platform access.

### Features

- Email/password signup.
- Email verification.
- Login/logout.
- Password reset.
- Invite-based account creation.
- Optional 2FA for owners/managers/operators.
- Magic link login for tenants later.
- Session management.
- Organisation switching.
- Role and scope checks.

### User Account Model

A user is global. Access comes through memberships.

Memberships:

- Organisation membership.
- Site membership.
- Tenant profile relationship.

### Security Rules

- No business endpoint should work without authentication unless public.
- Every business endpoint must check organisation scope.
- Every site-level endpoint must check site scope.
- Login attempts should be rate limited.
- Password reset tokens must expire.
- Invite tokens must expire.

### Guard Chain

**OrganisationGuard** runs on every `/v1/organisations/:id/*` route:

1. Validates JWT signature and expiry.
2. Reads `organisationId` from JWT.
3. Confirms an active `OrganisationMember` record exists for `(organisationId, userId)`.
4. Attaches `req.organisation` and `req.member` for downstream use.

**SiteGuard** sits on top of `OrganisationGuard` for site-scoped routes:

1. Reads `siteId` from route param.
2. Confirms the authenticated member has access to that site.
3. Attaches `req.site`.

### Auth Flows

#### Owner self-registration

```
POST /v1/auth/register
Body: { organisationName, ownerName, email, password }

→ Validate email uniqueness
→ bcrypt hash password (cost 12)
→ Create User
→ Create Organisation (slug = slugify(organisationName))
→ Create OrganisationMember (role = owner)
→ Return { accessToken, refreshToken, organisationId, userId }
```

#### Login (all user types)

```
POST /v1/auth/login
Body: { email, password }

→ Find User by email
→ bcrypt.compare(password, user.passwordHash) — constant-time
→ Load OrganisationMember → get organisationId + role
→ Issue JWT (15 min) + opaque refresh token (7 day, stored hashed)
→ Return { accessToken, refreshToken, organisationId, role }
```

#### Send invitation

```
POST /v1/organisations/:id/invitations
Body: { email, role: 'operator' | 'tenant', siteIds? }

Permission rules:
  - role='operator' → caller must be OrganisationMember(role=owner)
  - role='tenant'   → caller must be OrganisationMember(role=owner OR operator)

→ Create Invitation (token = cuid(), expiresAt = now+7d)
→ Queue invitation email via Notifications module
→ Return { invitationId }
```

#### Accept invitation

```
GET  /v1/invitations/:token        → { email, organisationName, role, valid: bool }

POST /v1/invitations/:token/accept
Body: { name, password }

→ Find Invitation by token
→ Validate not expired, not already accepted
→ bcrypt hash password (cost 12)
→ Create User
→ Create OrganisationMember (organisationId, userId, role)
→ Create SiteMember records for invited siteIds if provided
→ Mark invitation.acceptedAt = now()
→ Issue JWT + refresh token
→ Return { accessToken, refreshToken, organisationId, role }
```

#### Token refresh

```
POST /v1/auth/refresh
Body: { refreshToken }

→ Validate opaque token hash against user_sessions
→ Issue new accessToken (+ rotate refreshToken)
```

---

## 26. Module 4 — Email Invitation System

### Purpose

Invite managers, operators, billing admins, and tenants.

### Invite Flow

1. Owner/manager opens Team page.
2. Enters email.
3. Selects role.
4. Selects allowed sites.
5. Optional message.
6. System creates invite token.
7. System sends email.
8. Invitee opens link.
9. If new user, creates account.
10. If existing user, accepts membership.
11. System logs acceptance.

### Invite States

- pending.
- accepted.
- expired.
- revoked.

### Email Types

- Email verification.
- Password reset.
- Manager invitation.
- Operator invitation.
- Billing admin invitation.
- Tenant portal invitation.
- Booking confirmation.
- Booking approval request.
- Booking approved.
- Booking rejected.
- Contract ready.
- Contract signed.
- Invoice issued.
- Payment succeeded.
- Payment failed.
- Invoice overdue.
- Move-out request received.
- Move-out approved.
- Organisation subscription failed.

### Acceptance Criteria

- Owner can invite operator to one site only.
- Operator accepts and sees only assigned site.
- Expired/revoked invites cannot be used.
- Emails are logged with status.

---

## 27. Module 5 — Organisation and Site Management

### Purpose

Manage storage businesses and their physical sites.

### Site Fields

- Organisation ID.
- Site name.
- Slug.
- Address.
- Country.
- City.
- Postal code.
- Latitude/longitude.
- Timezone.
- Default language.
- Contact email.
- Contact phone.
- Opening hours.
- Access hours.
- Public profile enabled.
- Marketplace publishing enabled.
- Site photos.
- Access rules.
- Tax settings.
- Invoice settings.
- Contract settings.

### Site Statuses

- draft.
- active.
- paused.
- archived.

### Acceptance Criteria

- Owner can create multiple sites.
- Managers/operators can be assigned per site.
- Site settings affect listings, booking, invoices, and contract generation.

---

## 28. Module 6 — Unit / Container Management

### Purpose

Manage rentable storage containers/spaces.

### Unit Fields

- Organisation ID.
- Site ID.
- Internal unit code.
- Container serial number optional.
- Unit type.
- Title.
- Description.
- Zone.
- Row.
- Lane.
- Position/order.
- Dimensions.
- Area.
- Volume.
- Monthly price.
- Deposit.
- Setup fee.
- VAT/tax profile.
- Currency.
- Photos.
- Door type.
- Lock type.
- Access method.
- Indoor/outdoor.
- Drive-up access.
- 24/7 access.
- Climate controlled later.
- Condition notes.
- Maintenance notes.
- Marketplace visibility.
- Instant booking enabled.
- Approval required.
- Minimum rental duration.
- Availability date.

### Unit Statuses

- draft.
- available.
- listed.
- reserved.
- pending_approval.
- occupied.
- overdue.
- locked.
- maintenance.
- unavailable.
- archived.

### UI Requirements

Unit list must have:

- filters by site/status/type/price.
- quick status badges.
- bulk edit.
- CSV import later.
- card and table view.
- occupancy indicator.

Unit detail must have:

- overview.
- pricing.
- listing settings.
- current tenant.
- contract.
- invoices.
- inspections.
- access.
- notes.
- activity timeline.

---

## 29. Module 7 — Marketplace Listing Management

### Purpose

Control what appears on the public marketplace.

### Listing Types

MVP can support unit-level listing.

Later support:

- unit-type listing with automatic allocation.
- site-level listing.

### Listing Fields

- Listing title.
- Public description.
- Public photos.
- Site ID.
- Unit ID or unit type ID.
- Public price.
- Show/hide price.
- Deposit display.
- Available from date.
- Booking mode.
- Required documents.
- Cancellation summary.
- Minimum rental duration.
- SEO title.
- SEO description.
- Slug.
- Published language versions.

### Listing States

- hidden.
- draft.
- published.
- paused.
- fully_booked.
- archived.

### Booking Modes

- approval_required.
- instant_booking.
- request_price.

### Acceptance Criteria

- Owner/manager can publish a unit.
- Listing appears in marketplace search.
- Paused listings disappear from public search.
- Internal unit notes never appear publicly.

---

## 30. Module 8 — Marketplace Search and Discovery

### Purpose

Help tenants find units quickly.

### Search Inputs

- Country.
- City.
- Postal code.
- Address.
- Radius.
- Dates.
- Size/type.
- Price.

### Search Result Ranking

Initial ranking:

1. Available units.
2. Distance.
3. Price.
4. Completeness of listing.
5. Instant booking boost.

Later ranking:

- Conversion rate.
- Response speed.
- Reviews.
- Paid promotion.

### SEO Requirements

Generate SEO pages for high-intent locations:

- `/storage/germany/berlin`
- `/storage/germany/hamburg`
- `/storage/netherlands/amsterdam`
- `/storage/france/paris`

Each city page should include:

- localized title.
- localized meta description.
- list of available units.
- FAQ.
- internal links.

---

## 31. Module 9 — Booking System

### Purpose

Manage tenant interest, reservations, approvals, and instant bookings.

### Booking Modes

#### 31.1 Approval-Based Booking

Best for smaller operators.

Flow:

1. Tenant selects listing.
2. Tenant enters personal/company details.
3. Tenant selects desired start date.
4. Tenant uploads required documents if requested.
5. Tenant submits booking request.
6. Owner/manager/operator receives notification.
7. Staff reviews request.
8. Staff approves or rejects.
9. If approved, tenant receives payment/contract link.
10. Tenant signs and pays.
11. Unit becomes occupied.

#### 31.2 Instant Booking

Required from day one per decision.

Flow:

1. Tenant selects listing.
2. Tenant enters details.
3. Tenant selects start date.
4. System validates availability.
5. Tenant accepts terms.
6. Tenant pays deposit/first month or sets payment method.
7. Contract is generated.
8. Tenant signs contract.
9. Booking becomes active.
10. Unit becomes occupied.
11. Access instructions are released according to site policy.

### Booking States

- draft.
- submitted.
- pending_approval.
- approved.
- rejected.
- awaiting_payment.
- awaiting_contract.
- confirmed.
- active.
- cancelled.
- expired.

### Booking Hold Rules

For instant booking:

- Unit can be held for a short time during checkout.
- Default hold: 15 minutes.
- If checkout expires, unit becomes available again.

### Acceptance Criteria

- Tenant can submit booking request.
- Tenant can instantly book when enabled.
- Double-booking must be prevented.
- Booking creates audit log.
- Booking source is tracked: marketplace, manual, direct link.

---

## 32. Module 10 — Tenant CRM

### Purpose

Manage storage renters.

### Tenant Fields

- Organisation ID.
- Type: individual/company.
- Name.
- Email.
- Phone.
- Language preference.
- Country.
- Billing address.
- Company name.
- VAT ID.
- Tax number.
- ID verification status.
- Notes.
- Tags.
- Risk status.
- Active rentals.
- Past rentals.

### Tenant Timeline

Show all related activity:

- Bookings.
- Contracts.
- Invoices.
- Payments.
- Messages.
- Documents.
- Tasks.
- Inspections.
- Access events later.

### Acceptance Criteria

- Tenant can rent multiple units.
- Tenant cannot see other tenants.
- Organisation staff can see tenants only in allowed sites.

---

## 33. Module 11 — Contract Management

### Purpose

Generate, send, sign, store, and manage rental contracts.

### EU Requirements

Contracts must be:

- Country-aware.
- Language-aware.
- Organisation-specific.
- Tenant-type-aware.
- Versioned.

### Template Types

- B2C rental contract.
- B2B rental contract.
- Short-term rental contract.
- Long-term rental contract.
- Addendum.
- Move-out confirmation.
- Deposit deduction notice.

### Template Merge Fields

Examples:

- `{{tenant.name}}`.
- `{{tenant.address}}`.
- `{{organisation.legalName}}`.
- `{{site.name}}`.
- `{{unit.code}}`.
- `{{unit.size}}`.
- `{{contract.startDate}}`.
- `{{contract.monthlyRent}}`.
- `{{contract.deposit}}`.
- `{{invoice.vatRate}}`.

### Contract States

- draft.
- generated.
- sent.
- viewed.
- signed_by_tenant.
- countersigned.
- active.
- amended.
- termination_requested.
- terminated.
- cancelled.
- archived.

### Signature Strategy

MVP:

- Simple e-sign acceptance checkbox/signature capture.
- Manual signed contract upload.

Phase 2:

- E-sign provider integration.
- Stronger signature levels where required.

### Acceptance Criteria

- Contract can be generated from booking.
- Contract language follows tenant preference/site rules.
- Contract PDF is stored.
- Contract state is visible in booking and tenant portal.

---

## 34. Module 12 — Invoicing

### Purpose

Issue and manage invoices from organisations to tenants.

### Invoice Types

- Recurring rent invoice.
- Deposit invoice.
- Setup fee invoice.
- One-time invoice.
- Late fee invoice.
- Credit note.
- Refund note.
- Cancellation invoice.
- Pro-rata invoice.

### EU Design Requirements

Invoices must be structured data first.

PDF is an output, not the source of truth.

Invoice data model should support:

- VAT rates.
- VAT exemptions.
- Reverse charge where applicable.
- Country-specific tax labels.
- B2B/B2C differences.
- Invoice language.
- Invoice numbering per organisation/site.
- Structured e-invoice export later.

### Invoice Fields

- Invoice number.
- Organisation issuer details.
- Tenant billing details.
- Site.
- Contract.
- Currency.
- Line items.
- Net amount.
- VAT amount.
- Gross amount.
- Due date.
- Payment status.
- PDF file.
- Language.
- Country/tax config.

### Invoice States

- draft.
- issued.
- sent.
- viewed.
- partially_paid.
- paid.
- overdue.
- cancelled.
- credited.
- written_off.

### Acceptance Criteria

- System can generate first invoice from booking.
- System can generate recurring monthly invoices.
- Tenant can view/download invoice.
- Owner can export invoices.

---

## 35. Module 13 — Tenant Payments and Unit Subscription

### Purpose

Handle tenant payments for rented units.

### Payment Methods

Initial target:

- Card through Mollie where available.
- SEPA Direct Debit through Mollie where available.
- Bank transfer/manual payment.

Later:

- PayPal.
- iDEAL.
- Bancontact.
- EPS.
- Klarna.
- Other local EU methods.

### Payment Provider Abstraction

Define provider interface:

```ts
interface PaymentProvider {
  createOrganisationOnboardingLink(input): Promise<OnboardingLink>;
  createCheckout(input): Promise<CheckoutSession>;
  createMandate(input): Promise<Mandate>;
  chargeInvoice(input): Promise<PaymentResult>;
  refundPayment(input): Promise<RefundResult>;
  handleWebhook(payload): Promise<WebhookResult>;
}
```

### Payment States

- pending.
- authorized.
- processing.
- succeeded.
- failed.
- returned.
- refunded.
- disputed.
- cancelled.

### Unit Subscription

Each active rental should create a tenant rental subscription.

Fields:

- Tenant ID.
- Unit ID.
- Contract ID.
- Billing interval.
- Monthly rent.
- Next invoice date.
- Payment method.
- Auto-charge enabled.
- Status.

### Acceptance Criteria

- Instant booking can collect first payment.
- Payment webhook updates invoice/payment status.
- SEPA-like asynchronous payment handling is supported.
- Manual payment marking is possible with audit log.

---

## 36. Module 14 — Dunning and Late Payment Automation

### Purpose

Reduce manual late payment work.

### Dunning Flow

1. Invoice due date passes.
2. System marks invoice overdue.
3. Reminder 1 email is sent.
4. Reminder 2 email is sent after configured days.
5. Late fee may be added if enabled.
6. Operator task is created.
7. Tenant portal shows overdue warning.
8. Access can be suspended manually or automatically based on site policy.
9. Final notice can be sent.
10. Legal/manual process remains outside MVP.

### Dunning Settings

- Grace period.
- Reminder schedule.
- Reminder templates by language/country.
- Late fee rules.
- Auto-lockout enabled/disabled.
- Operator task creation.

### Acceptance Criteria

- Overdue invoices trigger reminders.
- Dunning events are logged.
- Operator can see overdue queue.

---

## 37. Module 15 — Occupancy Dashboard

### Purpose

Give owners and managers immediate operational visibility.

### Metrics

- Total units.
- Available units.
- Listed units.
- Reserved units.
- Occupied units.
- Overdue units.
- Locked units.
- Maintenance units.
- Occupancy percentage.
- Revenue per site.
- Monthly recurring revenue.
- Upcoming vacancies.
- Expiring contracts.
- Pending bookings.
- Failed payments.

### Views

- Portfolio view.
- Site view.
- Unit type view.
- Date range view.

### Acceptance Criteria

- Owner sees all sites.
- Manager sees assigned sites only.
- Operator sees operational subset.

---

## 38. Module 16 — Tenant Portal

### Purpose

Allow tenants to self-serve.

### Features

- View active rented units.
- View unit details.
- View access instructions.
- View contracts.
- Sign pending contract.
- View invoices.
- Pay invoices.
- Manage payment methods.
- Set up mandate where supported.
- Download documents.
- Upload required documents.
- Send support message.
- Request move-out.
- Update profile.
- Change language.

### Acceptance Criteria

- Tenant sees only own data.
- Tenant portal is mobile friendly.
- Tenant can complete contract/payment steps from booking continuation link.

---

## 39. Module 17 — Owner / Operator Back Office

### Purpose

Main SaaS application for organisations.

### Sections

- Dashboard.
- Sites.
- Units.
- Marketplace Listings.
- Bookings.
- Tenants.
- Contracts.
- Invoices.
- Payments.
- Tasks.
- Inspections.
- Documents.
- Reports.
- Team.
- Settings.
- Subscription/Billing.

### Key UX Rules

- Always show current organisation.
- Always show current site scope.
- Prevent accidental cross-site changes.
- Use confirmation dialogs for destructive actions.
- Use audit logs for important actions.
- Optimise operator flows for speed.

---

## 40. Module 18 — Platform Admin Panel

### Purpose

Internal SiteLager operations.

### Features

- Organisation list.
- Organisation detail.
- Subscription status.
- Usage metrics.
- Plan management.
- Marketplace moderation.
- Listing quality checks.
- Support tools.
- Audit logs.
- Email logs.
- Payment provider status.
- Failed jobs.
- System health.
- Feature flags.

### Support Access Rules

- Platform admin support access must be logged.
- Platform admin should not impersonate silently.
- Sensitive tenant documents should require elevated permission.

---

## 41. Module 19 — SaaS Subscription Billing

### Purpose

Bill organisations for using SiteLager.

### Subscription Fields

- Organisation ID.
- Plan ID.
- Status.
- Trial start/end.
- Billing interval.
- Base price.
- Included sites.
- Included units.
- Extra unit price.
- Marketplace commission rate.
- Payment provider customer ID.
- Current period start/end.
- Cancel at period end.

### Subscription States

- trial.
- active.
- past_due.
- suspended.
- cancelled.
- archived.

### Usage Metrics

- Number of active sites.
- Number of units.
- Number of published listings.
- Number of active rentals.
- Marketplace-originated bookings.
- First month rent values for commission.

### Acceptance Criteria

- Organisation can subscribe to plan.
- Platform can set commission rate to 0% at launch.
- Commission can later be set to 5% without schema change.

---

## 42. Module 20 — Marketplace Payment Routing

### Purpose

Route tenant payments correctly and support platform commission.

### Decision

Tenant money should go to the organisation account where possible.

SiteLager should collect:

- SaaS subscription fees from organisations.
- Marketplace commission on marketplace-originated bookings later.

### Payment Routing Model

Preferred:

- Organisation connects Mollie account/onboarding.
- Tenant pays during booking.
- Payment belongs to organisation.
- Platform fee/commission is recorded and collected according to provider capabilities.
- SiteLager issues separate SaaS invoice to organisation.

If provider limitation exists:

- Use manual commission invoicing at first.
- Keep transaction records ready.

### Commission Rules

Fields:

- Booking source.
- Commission eligible true/false.
- Commission rate.
- Commission base amount.
- Commission amount.
- Commission status.

Commission status:

- not_applicable.
- waived.
- pending.
- invoiced.
- collected.
- refunded.

Launch defaults:

- marketplace commission rate = 0%.
- commission status = waived or not_applicable depending reporting choice.

Future:

- marketplace commission rate = 5% first month rent.

---

## 43. Module 21 — Multi-Language System

### Purpose

Support EU users and organisations.

### Language Sources

Priority:

1. User profile preference.
2. Header dropdown choice.
3. Tenant booking language.
4. Organisation default language.
5. Site country default.
6. Browser language.
7. English fallback.

### Translation Scope

- UI labels.
- Validation errors.
- System emails.
- Invoice text.
- Contract templates.
- Marketplace listing fields.
- Legal pages.
- Notification messages.

### Database Fields

Use translatable fields where needed:

- listing title/description.
- site description.
- email template subject/body.
- contract template body.
- FAQ content.

Recommended approach:

- Keep UI translations in code files.
- Keep organisation-editable templates in database.

---

## 44. Module 22 — Country and Legal Configuration

### Purpose

Handle EU country differences.

### Country Config Includes

- Country code.
- Default language.
- Currency.
- VAT settings.
- Invoice label rules.
- Supported payment methods.
- Contract template defaults.
- Consumer cancellation notes.
- Data retention defaults.
- Address format.

### MVP Approach

- EU-ready config model from day one.
- Germany can have the first complete legal/invoice template set.
- Other EU countries can be added progressively.

### Acceptance Criteria

- Organisation chooses country.
- Site can inherit organisation country or override.
- Language and invoice defaults are generated from country config.

---

## 45. Module 23 — Documents and File Storage

### Purpose

Store and protect documents.

### Document Types

- Contract PDF.
- Invoice PDF.
- Credit note PDF.
- Tenant ID document.
- Unit photo.
- Site photo.
- Inspection photo.
- Damage report.
- Move-in checklist.
- Move-out checklist.
- Organisation legal document.

### Requirements

- Private files by default.
- Signed URLs.
- Role-based access.
- Document versioning.
- Audit log on access/download for sensitive files.
- Virus scanning later.
- Retention rules.

---

## 46. Module 24 — Notifications

### Purpose

Notify the right people at the right time.

### Channels

MVP:

- Email.
- In-app notifications.

Phase 2:

- SMS.
- WhatsApp.

### Notification Triggers

- Invite sent.
- Invite accepted.
- Booking created.
- Booking approved.
- Booking rejected.
- Contract generated.
- Contract signed.
- Invoice issued.
- Payment succeeded.
- Payment failed.
- Invoice overdue.
- Dunning reminder sent.
- Unit assigned.
- Access instructions available.
- Move-out requested.
- Move-out approved.
- Subscription payment failed.

### Requirements

- Templates by language.
- Templates by organisation override.
- Delivery logs.
- Retry failed emails.
- Unsubscribe where legally required.

---

## 47. Module 25 — Communication Inbox

### Purpose

Centralise communication with tenants and booking leads.

### Features

- Tenant messages.
- Booking messages.
- Internal notes.
- Email history.
- File attachments.
- Message timeline.
- Assignment to operator.
- Status: open/pending/closed.

### Views

- Inbox.
- Tenant timeline.
- Booking timeline.
- Unit timeline.

### Acceptance Criteria

- Operator can see messages for assigned sites.
- Tenant can send support message from portal.
- Internal notes are hidden from tenant.

---

## 48. Module 26 — Tasks and Operations

### Purpose

Manage day-to-day site work.

### Task Types

- Move-in.
- Move-out.
- Inspect unit.
- Clean unit.
- Repair unit.
- Verify tenant document.
- Approve booking.
- Call tenant.
- Collect overdue payment.
- Assign access code.
- Upload contract.

### Task Fields

- Organisation ID.
- Site ID.
- Unit ID optional.
- Tenant ID optional.
- Booking ID optional.
- Title.
- Description.
- Assigned user.
- Priority.
- Due date.
- Status.
- Comments.

### Task Statuses

- open.
- in_progress.
- blocked.
- done.
- cancelled.

---

## 49. Module 27 — Inspections

### Purpose

Record condition of containers before/after rental.

### Move-In Inspection

Checklist:

- Photos uploaded.
- Unit clean.
- Door working.
- Lock working.
- Floor condition.
- Wall condition.
- Water/damp signs.
- Existing damage.
- Tenant confirmation optional.

### Move-Out Inspection

Checklist:

- Photos uploaded.
- Unit empty.
- Unit clean.
- New damage.
- Cleaning required.
- Repair required.
- Deposit deduction.
- Return unit to available or maintenance.

### Acceptance Criteria

- Inspection can attach photos.
- Inspection is linked to unit and contract.
- Inspection affects unit status.

---

## 50. Module 28 — Access Control

### Purpose

Manage how tenants access sites and units.

This is a high-value feature and must be included in system design.

### MVP Access Methods

- Manual key.
- Padlock.
- Gate code.
- Access instructions.
- Operator-managed access.

### Future Access Methods

- Digital lock.
- Smart gate integration.
- PIN code generation.
- Temporary access code.
- Payment-based automatic lockout.
- Access logs.

### Access Credential Fields

- Organisation ID.
- Site ID.
- Unit ID.
- Tenant ID.
- Credential type.
- Credential value encrypted if sensitive.
- Valid from.
- Valid until.
- Status.
- Released to tenant yes/no.

### Access Credential States

- draft.
- active.
- suspended.
- expired.
- revoked.

### Access Release Rules

Access instructions should be released only when site policy allows.

Examples:

- Release after contract signed.
- Release after first payment succeeded.
- Release after owner approval.
- Release manually by operator.

### Acceptance Criteria

- Tenant can see access instructions only for own active rental.
- Operator can update access credentials for assigned site.
- Overdue tenant access can be marked suspended.

---

## 51. Module 29 — Reports and Analytics

### Purpose

Provide operational and financial insight.

This is a core feature and must be included.

### Reports

- Occupancy report.
- Revenue report.
- Unpaid invoices report.
- Failed payments report.
- Tenant report.
- Unit availability report.
- Marketplace conversion report.
- Booking source report.
- Move-in/move-out report.
- Contract expiry report.
- Site performance report.
- Operator activity report.
- Commission report.
- SaaS usage report for platform admin.

### Dashboard Charts

- Occupancy trend.
- Revenue trend.
- Booking conversion funnel.
- Marketplace leads by area.
- Overdue amount over time.
- Units by status.

### Export Formats

- CSV.
- PDF summary later.
- Accounting export later.

### Acceptance Criteria

- Owner can compare sites.
- Manager can view assigned-site reports.
- Platform admin can view aggregated platform-level metrics.

---

## 52. Module 30 — Pricing and Revenue Management

### Purpose

Help organisations manage storage unit pricing.

### Features

- Price per unit.
- Price per unit type.
- Site-level default pricing.
- Deposit rules.
- Setup fees.
- Discount codes later.
- Seasonal pricing later.
- Intro offer later.
- Occupancy-based suggestions later.

### Future Automation

- If occupancy > 90%, suggest price increase.
- If occupancy < 60%, suggest promotion.
- If unit vacant > 60 days, suggest discount.

---

## 53. Module 31 — Accounting Exports

### Purpose

Help organisations export financial data.

### Exports

- Invoices CSV.
- Payments CSV.
- Debtor list.
- VAT report.
- Revenue report.
- Credit notes.
- DATEV export later.
- Structured e-invoice XML later.

### Acceptance Criteria

- Owner/billing admin can export date range.
- Export respects organisation scope.

---

## 54. Module 32 — Audit Logs

### Purpose

Track sensitive and important actions.

### Audit Events

- User login.
- Failed login.
- Invite sent.
- Invite accepted.
- Role changed.
- Site created/updated.
- Unit created/updated.
- Unit price changed.
- Listing published.
- Booking approved/rejected.
- Contract generated/signed.
- Invoice issued/cancelled.
- Payment marked paid manually.
- Payment failed.
- Tenant data exported.
- Tenant data anonymised.
- Access credential changed.
- Platform admin accessed organisation.
- Subscription changed.

### Audit Fields

- Actor user ID.
- Organisation ID.
- Site ID.
- Target entity type.
- Target entity ID.
- Action.
- Old value JSON.
- New value JSON.
- IP address.
- User agent.
- Created at.

---

## 55. Module 33 — GDPR, Privacy, and Security

### Purpose

Comply with EU privacy expectations.

### Requirements

- Data minimisation.
- Role-based access.
- Organisation isolation.
- Tenant data export.
- Tenant data deletion/anonymisation flow.
- Consent tracking where needed.
- Audit logs.
- Data Processing Agreement support.
- EU hosting preference.
- Secure file access.
- Encrypted secrets.
- Password hashing.
- Backup encryption.

### Deletion Strategy

Do not hard-delete financial/legal records if retention is required.

Use:

- soft delete.
- anonymisation.
- retention policies.

---

## 56. Module 34 — API and Integrations

### Purpose

Support internal and future external integrations.

### Initial Integrations

- Mollie payments.
- Email provider.
- Object storage.
- Map/geocoding provider.

### Future Integrations

- E-signature provider.
- SMS provider.
- WhatsApp provider.
- Accounting software.
- DATEV.
- Smart locks/gates.
- Webhooks.
- Public API.

### Webhook Events Later

- booking.created.
- booking.approved.
- contract.signed.
- invoice.issued.
- payment.succeeded.
- payment.failed.
- unit.status_changed.
- listing.published.

---

## 57. Module 35 — Background Jobs

### Purpose

Automate time-based and async work.

### Jobs

- Send email.
- Expire invitations.
- Expire booking holds.
- Generate recurring invoices.
- Charge recurring payments.
- Process payment webhooks.
- Retry failed payments.
- Send overdue reminders.
- Create dunning tasks.
- Update marketplace search index.
- Generate reports.
- Sync provider statuses.
- Clean expired sessions.
- Backup checks.

### Requirements

- Jobs must be idempotent.
- Jobs must log failures.
- Failed jobs must be retryable.
- Admin panel must show failed jobs.

---

# PART F — Database Schema Outline

---

## 58. Core Tables

### Key Data Conventions

- **Monetary values:** all stored as integer minor units (euro cents). Never floats.
- **Timestamps:** stored UTC; rendered in `Europe/Berlin` timezone in all UI.
- **Soft delete:** all commercial records (contracts, invoices, payments, agreements) use soft delete — no hard deletes.
- **Audit trail:** every mutable entity change must emit an `AuditEvent` to the audit_logs table.
- **Invoice idempotency:** invoices are unique by `(contractId, periodStart)` — duplicate generation attempts must be rejected.

### users

- id.
- email.
- password_hash.
- email_verified_at.
- name.
- phone.
- preferred_language.
- status.
- last_login_at.
- created_at.
- updated_at.

### organisations

- id.
- legal_name.
- trading_name.
- slug.
- country_code.
- default_language.
- currency.
- vat_id.
- tax_number.
- billing_email.
- support_email.
- phone.
- website.
- status.
- created_at.
- updated_at.

### organisation_members

- id.
- organisation_id.
- user_id.
- role.
- status.
- created_at.
- updated_at.

### sites

- id.
- organisation_id.
- name.
- slug.
- country_code.
- city.
- postal_code.
- address_line_1.
- address_line_2.
- latitude.
- longitude.
- timezone.
- default_language.
- contact_email.
- contact_phone.
- status.
- marketplace_enabled.
- created_at.
- updated_at.

### site_members

- id.
- organisation_id.
- site_id.
- user_id.
- role.
- permissions_json.
- status.
- created_at.
- updated_at.

### tenants

- id.
- organisation_id.
- user_id nullable.
- type.
- name.
- email.
- phone.
- language.
- country_code.
- billing_address_json.
- company_name.
- vat_id.
- status.
- risk_status.
- created_at.
- updated_at.

### units

- id.
- organisation_id.
- site_id.
- code.
- title.
- description.
- unit_type.
- zone.
- row.
- lane.
- dimensions_json.
- area_sqm.
- volume_cbm.
- monthly_price.
- deposit_amount.
- setup_fee.
- currency.
- tax_profile_id.
- status.
- marketplace_visibility.
- instant_booking_enabled.
- approval_required.
- availability_date.
- created_at.
- updated_at.

### listings

- id.
- organisation_id.
- site_id.
- unit_id nullable.
- slug.
- title.
- description.
- price_visible.
- public_monthly_price.
- public_deposit_amount.
- booking_mode.
- status.
- seo_title.
- seo_description.
- published_at.
- created_at.
- updated_at.

### listing_translations

- id.
- listing_id.
- language.
- title.
- description.
- seo_title.
- seo_description.

### bookings

- id.
- organisation_id.
- site_id.
- unit_id.
- listing_id.
- tenant_id.
- source.
- booking_mode.
- status.
- desired_start_date.
- hold_expires_at.
- approved_by.
- approved_at.
- rejected_reason.
- created_at.
- updated_at.

### contracts

- id.
- organisation_id.
- site_id.
- unit_id.
- tenant_id.
- booking_id.
- contract_number.
- status.
- language.
- country_code.
- start_date.
- end_date nullable.
- monthly_rent.
- deposit_amount.
- pdf_document_id.
- signed_at.
- created_at.
- updated_at.

### invoices

- id.
- organisation_id.
- site_id.
- tenant_id.
- contract_id nullable.
- invoice_number.
- type.
- status.
- currency.
- net_amount.
- vat_amount.
- gross_amount.
- issued_at.
- due_at.
- paid_at.
- language.
- country_code.
- pdf_document_id.
- created_at.
- updated_at.

### invoice_line_items

- id.
- invoice_id.
- description.
- quantity.
- unit_price.
- tax_rate.
- net_amount.
- vat_amount.
- gross_amount.

### payments

- id.
- organisation_id.
- site_id nullable.
- invoice_id nullable.
- tenant_id nullable.
- provider.
- provider_payment_id.
- amount.
- currency.
- status.
- payment_method.
- paid_at.
- failed_reason.
- created_at.
- updated_at.

### payment_methods

- id.
- organisation_id.
- tenant_id nullable.
- provider.
- provider_method_id.
- type.
- label.
- status.
- created_at.
- updated_at.

### sepa_mandates

- id.
- organisation_id.
- tenant_id.
- provider.
- provider_mandate_id.
- iban_last4.
- status.
- signed_at.
- created_at.
- updated_at.

### organisation_subscriptions

- id.
- organisation_id.
- plan_id.
- status.
- billing_interval.
- current_period_start.
- current_period_end.
- marketplace_commission_rate.
- created_at.
- updated_at.

### marketplace_commissions

- id.
- organisation_id.
- booking_id.
- invoice_id nullable.
- base_amount.
- commission_rate.
- commission_amount.
- status.
- created_at.
- updated_at.

### documents

- id.
- organisation_id.
- site_id nullable.
- owner_type.
- owner_id.
- document_type.
- file_key.
- file_name.
- mime_type.
- size_bytes.
- status.
- created_at.
- updated_at.

### invitations

- id.
- organisation_id.
- site_id nullable.
- email.
- role.
- token_hash.
- status.
- expires_at.
- accepted_at.
- invited_by_user_id.
- created_at.
- updated_at.

### email_logs

- id.
- organisation_id nullable.
- recipient_email.
- template_key.
- language.
- status.
- provider_message_id.
- error_message.
- sent_at.
- created_at.

### notifications

- id.
- organisation_id.
- user_id.
- type.
- title.
- body.
- read_at.
- created_at.

### tasks

- id.
- organisation_id.
- site_id.
- unit_id nullable.
- tenant_id nullable.
- booking_id nullable.
- title.
- description.
- assigned_user_id.
- priority.
- status.
- due_at.
- created_at.
- updated_at.

### inspections

- id.
- organisation_id.
- site_id.
- unit_id.
- contract_id nullable.
- type.
- status.
- checklist_json.
- notes.
- performed_by_user_id.
- performed_at.
- created_at.
- updated_at.

### access_credentials

- id.
- organisation_id.
- site_id.
- unit_id nullable.
- tenant_id nullable.
- type.
- encrypted_value.
- instructions.
- status.
- valid_from.
- valid_until.
- released_to_tenant_at.
- created_at.
- updated_at.

### audit_logs

- id.
- organisation_id nullable.
- site_id nullable.
- actor_user_id nullable.
- action.
- entity_type.
- entity_id.
- old_values_json.
- new_values_json.
- ip_address.
- user_agent.
- created_at.

---

## 59. Indexing Strategy

Required indexes:

- `organisation_id` on all organisation-owned tables.
- `(organisation_id, site_id)` on site-level tables.
- `(organisation_id, status)` for units/bookings/invoices.
- `(site_id, status)` for units.
- `(tenant_id, status)` for contracts/invoices.
- `(listing.status, listing.published_at)`.
- Search indexes for city/postcode/country.
- Geospatial index for listings/sites later.
- Unique invoice number per organisation.
- Unique unit code per site.

---

# PART G — API Specification

---

## 60. API Style

Use REST for MVP.

Base URL:

```txt
https://api.sitelager.com/v1
```

Use JSON.

Authentication:

```http
Authorization: Bearer <token>
```

Every organisation-scoped endpoint must require active organisation context.

Header option:

```http
X-Organisation-Id: org_123
```

For site-scoped actions:

```http
X-Site-Id: site_123
```

---

## 61. Representative Endpoints

### Auth

```http
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/verify-email
POST /auth/password-reset/request
POST /auth/password-reset/confirm
GET  /auth/me
```

Register request:

```json
{
  "email": "owner@example.com",
  "password": "StrongPassword123!",
  "name": "Muhammad Aftab",
  "preferredLanguage": "en"
}
```

### Organisations

```http
POST /organisations
GET  /organisations
GET  /organisations/:organisationId
PATCH /organisations/:organisationId
```

Create organisation:

```json
{
  "legalName": "Alpha Storage GmbH",
  "tradingName": "Alpha Storage",
  "countryCode": "DE",
  "defaultLanguage": "de",
  "currency": "EUR",
  "billingEmail": "billing@alpha-storage.de"
}
```

### Team / Invitations

```http
POST /organisations/:organisationId/invitations
GET  /organisations/:organisationId/invitations
POST /invitations/:token/accept
POST /invitations/:invitationId/revoke
```

Invite operator:

```json
{
  "email": "operator@example.com",
  "role": "OPERATOR",
  "siteIds": ["site_beta"],
  "message": "Please join our SiteLager workspace."
}
```

### Sites

```http
POST /organisations/:organisationId/sites
GET  /organisations/:organisationId/sites
GET  /organisations/:organisationId/sites/:siteId
PATCH /organisations/:organisationId/sites/:siteId
DELETE /organisations/:organisationId/sites/:siteId
```

### Units

```http
POST /organisations/:organisationId/sites/:siteId/units
GET  /organisations/:organisationId/sites/:siteId/units
GET  /organisations/:organisationId/units/:unitId
PATCH /organisations/:organisationId/units/:unitId
POST /organisations/:organisationId/units/:unitId/status
```

Create unit:

```json
{
  "code": "A-001",
  "title": "20 ft outdoor container",
  "unitType": "CONTAINER_20FT",
  "monthlyPrice": 120,
  "depositAmount": 200,
  "currency": "EUR",
  "instantBookingEnabled": true,
  "approvalRequired": false,
  "availabilityDate": "2026-06-01"
}
```

### Listings

```http
POST /organisations/:organisationId/units/:unitId/listing
GET  /organisations/:organisationId/listings
PATCH /organisations/:organisationId/listings/:listingId
POST /organisations/:organisationId/listings/:listingId/publish
POST /organisations/:organisationId/listings/:listingId/pause
```

### Public Marketplace

```http
GET /public/search
GET /public/listings/:slug
GET /public/sites/:slug
GET /public/countries/:countryCode/cities/:citySlug
```

Search example:

```http
GET /public/search?country=DE&city=Berlin&radiusKm=25&minPrice=50&maxPrice=200&instantBooking=true
```

### Bookings

```http
POST /public/bookings
GET  /organisations/:organisationId/bookings
GET  /organisations/:organisationId/bookings/:bookingId
POST /organisations/:organisationId/bookings/:bookingId/approve
POST /organisations/:organisationId/bookings/:bookingId/reject
POST /bookings/:bookingId/continue
```

Create booking:

```json
{
  "listingId": "lst_123",
  "desiredStartDate": "2026-06-01",
  "tenant": {
    "type": "INDIVIDUAL",
    "name": "Max Müller",
    "email": "max@example.com",
    "phone": "+49123456789",
    "language": "de"
  }
}
```

### Contracts

```http
POST /organisations/:organisationId/bookings/:bookingId/contracts/generate
GET  /organisations/:organisationId/contracts
GET  /organisations/:organisationId/contracts/:contractId
POST /contracts/:contractId/sign
POST /organisations/:organisationId/contracts/:contractId/countersign
```

### Invoices

```http
POST /organisations/:organisationId/invoices
GET  /organisations/:organisationId/invoices
GET  /organisations/:organisationId/invoices/:invoiceId
POST /organisations/:organisationId/invoices/:invoiceId/send
POST /organisations/:organisationId/invoices/:invoiceId/cancel
GET  /tenant/invoices
```

### Payments

```http
POST /payments/checkout
POST /payments/webhooks/mollie
GET  /organisations/:organisationId/payments
POST /organisations/:organisationId/invoices/:invoiceId/manual-payment
```

### Tenant Portal

```http
GET /tenant/dashboard
GET /tenant/units
GET /tenant/contracts
GET /tenant/invoices
POST /tenant/invoices/:invoiceId/pay
POST /tenant/move-out-requests
POST /tenant/messages
```

### Reports

```http
GET /organisations/:organisationId/reports/occupancy
GET /organisations/:organisationId/reports/revenue
GET /organisations/:organisationId/reports/marketplace
GET /organisations/:organisationId/reports/overdue
```

### Platform Admin

```http
GET /admin/organisations
GET /admin/organisations/:organisationId
GET /admin/subscriptions
GET /admin/marketplace/listings
GET /admin/audit-logs
GET /admin/jobs
```

---

# PART H — State Machines

---

## 62. Unit State Machine

```txt
draft -> available -> listed -> reserved -> occupied
occupied -> overdue -> locked
occupied -> move_out_pending -> available
available -> maintenance -> available
any -> archived
```

Rules:

- Only available/listed units can be booked.
- Occupied units cannot be booked.
- Maintenance units cannot be listed.
- Archived units are read-only.

---

## 63. Listing State Machine

```txt
hidden -> draft -> published -> paused -> published
published -> fully_booked
fully_booked -> published
any -> archived
```

---

## 64. Booking State Machine

```txt
draft -> submitted
submitted -> pending_approval
pending_approval -> approved -> awaiting_payment -> awaiting_contract -> confirmed -> active
pending_approval -> rejected
submitted -> awaiting_payment -> awaiting_contract -> confirmed -> active  # instant booking
any pre-active -> cancelled
submitted/pending -> expired
```

---

## 65. Contract State Machine

```txt
draft -> generated -> sent -> viewed -> signed_by_tenant -> countersigned -> active
active -> amended
active -> termination_requested -> terminated -> archived
any pre-active -> cancelled
```

---

## 66. Invoice State Machine

```txt
draft -> issued -> sent -> viewed
sent/viewed -> partially_paid -> paid
sent/viewed -> overdue -> paid
issued/sent -> cancelled
paid -> credited
unpaid overdue -> written_off
```

---

## 67. Payment State Machine

```txt
pending -> processing -> succeeded
pending -> failed
processing -> failed
succeeded -> refunded
succeeded -> disputed
processing/succeeded -> returned
```

---

## 68. Subscription State Machine

```txt
trial -> active -> past_due -> suspended
active -> cancelled
past_due -> active
suspended -> active
cancelled -> archived
```

---

## 69. Invitation State Machine

```txt
pending -> accepted
pending -> expired
pending -> revoked
```

---

# PART I — Key End-to-End Flows

---

## 70. Organisation Signup Flow

1. Owner opens `/for-operators`.
2. Clicks “Start free”.
3. Creates user account.
4. Verifies email.
5. Creates organisation.
6. Selects country.
7. Language defaults from country/browser.
8. Owner can change language in header.
9. Creates first site.
10. Adds units.
11. Publishes listings.
12. Invites team.
13. Connects Mollie account when ready.

---

## 71. Invite Operator Flow

1. Owner opens Team.
2. Clicks Invite.
3. Enters email.
4. Selects role Operator.
5. Selects site Alpha.
6. Sends invite.
7. Operator receives email.
8. Operator accepts.
9. Operator sees only Alpha.
10. Audit log records invitation and acceptance.

---

## 72. Publish Unit to Marketplace Flow

1. Owner creates unit A-001.
2. Adds photos, dimensions, price, deposit.
3. Enables marketplace visibility.
4. Selects instant booking or approval required.
5. Adds public description/translations.
6. Publishes listing.
7. Listing appears in public search.

---

## 73. Instant Booking Flow

1. Tenant searches Berlin storage.
2. Tenant selects listing.
3. Clicks Book now.
4. System creates booking draft and temporary hold.
5. Tenant enters details.
6. Tenant chooses language.
7. Tenant accepts terms.
8. Tenant pays first invoice/deposit through Mollie checkout.
9. Payment webhook confirms payment.
10. System generates contract.
11. Tenant signs contract.
12. Booking becomes active.
13. Unit becomes occupied.
14. Access instructions are released according to site policy.
15. Owner/operator receives notification.

---

## 74. Approval-Based Booking Flow

1. Tenant selects listing.
2. Clicks Request booking.
3. Enters details.
4. Submits request.
5. Owner/operator gets email/in-app notification.
6. Staff reviews request.
7. Staff approves.
8. Tenant receives payment/contract link.
9. Tenant pays and signs.
10. Unit becomes occupied.

---

## 75. Monthly Recurring Billing Flow

1. Active contract has next billing date.
2. Background job creates invoice.
3. Invoice is sent to tenant.
4. If auto-payment enabled, payment attempt is created.
5. Payment provider webhook updates status.
6. If paid, invoice status becomes paid.
7. If failed, payment status becomes failed and dunning begins.

---

## 76. Move-Out Flow

1. Tenant requests move-out from portal.
2. Operator/manager receives task.
3. Manager approves move-out date.
4. Final invoice/deposit calculation is prepared.
5. Move-out inspection is created.
6. Operator uploads photos/checklist.
7. Unit status becomes available or maintenance.
8. Contract becomes terminated.
9. Tenant receives confirmation.

---

# PART J — Competitor-Derived Requirements to Keep

---

## 77. Storeganise-Inspired Features to Keep

Must keep:

- Customer/tenant portal.
- Online booking.
- E-signature-ready booking flow.
- Unit access codes/instructions in tenant portal.
- Billing and invoice management.
- Customisable site map later.
- Color-coded occupancy view.
- Automated recurring billing.
- Invoice reminders.
- Multiple payment methods.
- Auto-lockout-ready overdue tenant workflows.
- EU/GDPR-aware hosting and privacy positioning.
- Accounting export support later.

Do not include in MVP:

- Branded booking app per organisation.

## 78. Stora/Modern Platform Features to Keep

Must keep:

- Public website/storefront.
- Online move-in.
- Payments.
- Automated reminders.
- Roles/permissions.
- API/webhooks later.
- Revenue automation later.

## 79. 6Storage/System Features to Keep

Must keep:

- Per-unit pricing model inspiration.
- Access control add-on readiness.
- Website/marketplace publishing.
- Late fee/dunning workflows.
- Simple monthly pricing model.

## 80. Operator Feedback Features to Keep

Must keep:

- Better custom reporting.
- Two-way email/SMS later.
- Revenue/pricing automation later.
- Fast UX with fewer clicks.
- Automated lead/booking flow.
- Failed payment recovery.
- Marketplace/lead generation.

---

# PART K — MVP and Phases

---

## 81. MVP Scope

Build these first:

- Monorepo setup.
- Auth.
- Organisation registration.
- Country/language foundation.
- Owner dashboard.
- Site management.
- Team invitation system.
- Site-scoped manager/operator roles.
- Unit management.
- Marketplace listing management.
- Public marketplace search.
- Listing detail pages.
- Instant booking.
- Approval-based booking.
- Tenant CRM.
- Contract PDF generation.
- Simple e-sign/acceptance.
- Invoices.
- Mollie checkout integration.
- Manual payment tracking.
- Tenant portal basic.
- Occupancy dashboard.
- Email notifications.
- Organisation SaaS subscription model.
- Marketplace commission data model with 0% launch rate.
- Basic reports.
- Tasks.
- Basic inspections.
- Manual access instructions.
- Docker deployment on Hetzner.

## 82. Phase 2

- SEPA mandates automation.
- Advanced recurring payments.
- Dunning automation.
- E-sign provider integration.
- Accounting exports.
- DATEV Buchungsstapel CSV export.
- ZUGFeRD / XRechnung structured B2B e-invoice payload.
- eIDAS Simple Electronic Signature with SHA-256 evidence pack.
- City SEO automation.
- Map search.
- Access control provider integration.
- Custom report builder.
- SMS/WhatsApp.
- Multi-country legal template library.
- Pricing suggestions.

## 83. Phase 3

- Native mobile app.
- Advanced smart lock integrations.
- Public API.
- Webhooks.
- Reviews.
- Paid promoted listings.
- Advanced marketplace ranking.
- AI pricing recommendations.
- AI support assistant.

---

# PART L — AI Build Instructions

---

## 84. How AI Must Build This Project

Do not ask AI to “build the whole system” in one prompt.

Build in milestones.

Each milestone must include:

- Database changes.
- Backend module.
- Frontend UI.
- Tests.
- Seed data.
- Acceptance criteria.
- Documentation update.

## 85. Non-Negotiable Engineering Rules

1. Use TypeScript everywhere.
2. No `any` unless justified.
3. Every organisation-owned query must include organisation scope.
4. Every site-level query must include site permission scope.
5. Never trust frontend role checks only.
6. Backend must enforce all permissions.
7. Payment webhook handlers must be idempotent.
8. Background jobs must be retryable.
9. Do not store raw sensitive access codes without encryption.
10. Do not store payment card data directly.
11. Every important mutation must create audit log.
12. Every email send must create email log.
13. Every module must have basic tests.
14. UI must include loading, empty, error, and success states.
15. Do not hardcode Germany-only assumptions; use country config.

## 86. Recommended Build Milestones

### Milestone 1 — Foundation

- Monorepo.
- Next.js app.
- NestJS API.
- PostgreSQL.
- Prisma.
- Docker Compose.
- Environment config.
- CI basics.

### Milestone 2 — Auth and RBAC

- User registration/login.
- Email verification.
- Password reset.
- Organisation membership.
- Site membership.
- Permission guards.

### Milestone 3 — Organisation/Site/Team

- Organisation onboarding.
- Site CRUD.
- Team invitations.
- Role assignment.
- Site scoping.

### Milestone 4 — Units and Listings

- Unit CRUD.
- Unit statuses.
- Listing CRUD.
- Publish/pause listing.
- Public listing detail.

### Milestone 5 — Marketplace Search

- Search page.
- Filters.
- SEO pages.
- Location/city logic.
- Language dropdown.

### Milestone 6 — Booking

- Approval-based booking.
- Instant booking skeleton.
- Booking states.
- Booking notifications.

### Milestone 7 — Tenant Portal

- Tenant login/portal.
- My units.
- Booking continuation.
- Contracts/invoices view.

### Milestone 8 — Contracts and Invoices

- Template system.
- Contract PDF generation.
- Invoice generation.
- PDF generation.
- Contract/invoice states.

### Milestone 9 — Payments

- Mollie abstraction.
- Checkout.
- Webhooks.
- Payment states.
- Manual payment.
- Organisation connected account design.

### Milestone 10 — Operations

- Tasks.
- Inspections.
- Access instructions.
- Occupancy dashboard.

### Milestone 11 — Reports and Admin

- Reports.
- Platform admin.
- Subscription billing.
- Commission records.

### Milestone 12 — Production Hardening

- Backups.
- Monitoring.
- Error logging.
- Security review.
- Load testing.
- GDPR workflows.

---

## 87. First Claude Code Prompt

Use this after creating the repository:

```txt
You are building SiteLager, a multi-tenant EU-first SaaS and marketplace for storage/container operators.
Use the attached SITE_LAGER_MASTER_BUILD_SPEC.md as the single source of truth.

Start only with Milestone 1: Foundation.

Create a pnpm monorepo with:
- apps/web: Next.js + TypeScript + Tailwind + shadcn/ui ready
- apps/api: NestJS + TypeScript
- packages/database: Prisma + PostgreSQL schema placeholder
- packages/types
- packages/validation
- Docker Compose for web, api, postgres, redis

Do not build business modules yet.
Add README with setup instructions.
Add .env.example.
Make sure everything runs locally.
After implementation, summarize created files and next steps.
```

## 88. Second Claude Code Prompt

```txt
Continue SiteLager using SITE_LAGER_MASTER_BUILD_SPEC.md.
Build Milestone 2: Auth and RBAC.

Implement:
- users table
- organisations table
- organisation_members table
- sites table placeholder
- site_members table placeholder
- register/login/logout/me
- password hashing
- JWT/session strategy
- organisation context
- RBAC guard
- site scope guard placeholder
- tests for auth and permission checks

Do not build marketplace yet.
Every endpoint must be typed and documented with Swagger/OpenAPI.
```

---

# PART M — Acceptance Checklist for Production Readiness

---

## 89. Product Checklist

- Organisation can register.
- Organisation can create sites.
- Owner can invite operators/managers.
- Operator can access assigned site only.
- Owner can create units.
- Owner can publish listings.
- Public user can search listings.
- Tenant can book instantly.
- Tenant can request booking.
- Owner can approve booking.
- Contract can be generated.
- Invoice can be generated.
- Payment can be initiated.
- Payment webhook updates invoice.
- Tenant can access portal.
- Owner can see occupancy dashboard.
- Reports work.
- Access instructions work.
- Audit logs work.
- Email notifications work.
- Platform admin can manage organisations.

## 90. Security Checklist

- No cross-organisation data leaks.
- No cross-site data leaks.
- All mutations permission-checked.
- All sensitive actions audit-logged.
- Payment webhooks verified.
- File access signed and scoped.
- Rate limiting enabled.
- Backups configured.
- Secrets not committed.

## 91. Deployment Checklist

- Domain configured.
- Cloudflare configured.
- HTTPS configured.
- Docker Compose production file ready.
- Database backup ready.
- Redis secured.
- Logs rotated.
- Monitoring enabled.
- Error tracking enabled.
- Email provider configured.
- Mollie keys configured.
- Object storage configured.

---

# PART N — Final Product Decisions Locked in v0.5.0

---

## 92. Locked Decisions

1. Product name: SiteLager.
2. Main domain: `sitelager.com`.
3. Product type: SaaS + public marketplace.
4. Market: EU from day one.
5. Language: default by area/country/browser, user can change from header dropdown.
6. Frontend: Next.js.
7. Backend: NestJS.
8. Database: PostgreSQL.
9. Repo: single monorepo.
10. Deployment: Hetzner VPS with Docker first.
11. Payment provider: Mollie-first with abstraction.
12. Booking: support instant booking and approval-based booking.
13. Tenant payments: should go directly to organisation account where possible.
14. Marketplace commission: 0% at launch, later 5% of first month rent.
15. Storeganise-inspired features are required, except branded booking app is not MVP.
16. Access control module is required.
17. Reports/analytics module is required.
18. Audit logging is required.
19. Email invitation system is required.
20. Multi-language and country config are required from the start.

---

End of `SITE_LAGER_MASTER_BUILD_SPEC.md` v0.5.0.
