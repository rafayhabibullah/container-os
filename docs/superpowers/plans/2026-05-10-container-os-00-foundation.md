# Container OS — Phase 0: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the complete monorepo skeleton, Docker Compose local infra, full Prisma schema, shared packages, NestJS app with common infrastructure, Auth module (Keycloak OIDC), and Audit module. All parallel tracks depend on this being complete.

**Architecture:** pnpm monorepo with `apps/` and `packages/`. Single NestJS app with module-per-domain pattern. Domain event bus via EventEmitter2. All config from environment variables.

**Tech Stack:** pnpm 9, Node.js 20 LTS, TypeScript 5.4, NestJS 10, Prisma 5, PostgreSQL 16, Keycloak 24, Docker Compose v2, Vitest 1, Zod 3

---

## Files created in this phase

```
package.json                          # root workspace
pnpm-workspace.yaml
tsconfig.base.json
.eslintrc.js
.prettierrc
.gitignore
docker-compose.yml
.env.example

packages/
  domain-types/
    package.json
    tsconfig.json
    src/
      enums/
        unit-status.enum.ts
        billing-cycle.enum.ts
        user-type.enum.ts
        mandate-scheme.enum.ts
        invoice-status.enum.ts
      schemas/
        site.schema.ts
        unit.schema.ts
        customer.schema.ts
        invoice.schema.ts
        pagination.schema.ts
      errors/
        domain-exception.ts
        error-codes.ts
      index.ts
  i18n/
    package.json
    tsconfig.json
    src/
      locales/
        de.json
        en.json
      index.ts
  ui/
    package.json
    tsconfig.json
    src/
      index.ts        # re-exports shadcn components

apps/
  api/
    package.json
    tsconfig.json
    nest-cli.json
    vitest.config.ts
    prisma/
      schema.prisma
    src/
      app.module.ts
      main.ts
      common/
        guards/
          auth.guard.ts
          site.guard.ts
        decorators/
          current-user.decorator.ts
          idempotency-key.decorator.ts
        filters/
          domain-exception.filter.ts
          http-exception.filter.ts
        interceptors/
          audit.interceptor.ts
          idempotency.interceptor.ts
        pipes/
          zod-validation.pipe.ts
        middleware/
          request-id.middleware.ts
      events/
        event-bus.module.ts
        event-bus.service.ts
        domain-events.ts
      modules/
        auth/
          auth.module.ts
          auth.controller.ts
          auth.service.ts
          keycloak.strategy.ts
          magic-link.service.ts
          rbac.service.ts
          dto/
            invite-user.dto.ts
            assign-role.dto.ts
          auth.service.spec.ts
        audit/
          audit.module.ts
          audit.service.ts
          audit.controller.ts
          audit.service.spec.ts
```

---

### Task 0.1: Initialize pnpm monorepo root

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.prettierrc`
- Create: `.eslintrc.js`
- Create: `.gitignore`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "container-os",
  "private": true,
  "version": "0.1.0",
  "engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 4: Create .prettierrc**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
```

- [ ] **Step 5: Create .eslintrc.js**

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.next/
prisma/migrations/dev.*
```

- [ ] **Step 7: Install pnpm globally and install root deps**

```bash
corepack enable
pnpm install
```

Expected: `node_modules/` created at root.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .prettierrc .eslintrc.js .gitignore
git commit -m "chore: initialize pnpm monorepo root"
```

---

### Task 0.2: Docker Compose local infrastructure

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: container_os
      POSTGRES_PASSWORD: container_os_dev
      POSTGRES_DB: container_os
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U container_os']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    restart: unless-stopped
    ports:
      - '9000:9000'
      - '9001:9001'
    environment:
      MINIO_ROOT_USER: container_os_minio
      MINIO_ROOT_PASSWORD: container_os_minio_dev
    command: server /data --console-address ':9001'
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 10s
      timeout: 5s
      retries: 5

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    restart: unless-stopped
    ports:
      - '8080:8080'
    environment:
      KC_DB: dev-mem
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_FEATURES: token-exchange
    command: start-dev
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:8080/health/ready || exit 1']
      interval: 15s
      timeout: 10s
      retries: 10

  mailhog:
    image: mailhog/mailhog:latest
    restart: unless-stopped
    ports:
      - '1025:1025'
      - '8025:8025'

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

- [ ] **Step 2: Create .env.example**

```bash
# Database
DATABASE_URL="postgresql://container_os:container_os_dev@localhost:5432/container_os"
TEST_DATABASE_URL="postgresql://container_os:container_os_dev@localhost:5432/container_os_test"

# Redis
REDIS_URL="redis://localhost:6379"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_USE_SSL="false"
MINIO_ACCESS_KEY="container_os_minio"
MINIO_SECRET_KEY="container_os_minio_dev"
MINIO_BUCKET="container-os-dev"

# Keycloak
KEYCLOAK_URL="http://localhost:8080"
KEYCLOAK_REALM="container-os"
KEYCLOAK_CLIENT_ID="api"
KEYCLOAK_CLIENT_SECRET="change-me-in-keycloak"

# App
PORT="3000"
NODE_ENV="development"
API_BASE_URL="http://localhost:3000"
FRONTEND_URL="http://localhost:3001"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Internal
IDEMPOTENCY_CACHE_TTL_SECONDS="86400"
AUDIT_QUEUE_NAME="audit"
```

- [ ] **Step 3: Copy .env.example to .env**

```bash
cp .env.example .env
```

- [ ] **Step 4: Start Docker Compose services**

```bash
docker compose up -d
```

Expected output: All 5 services start. Run `docker compose ps` to verify all show `healthy` or `running`.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "chore: add Docker Compose local infrastructure"
```

---

### Task 0.3: Create shared package — domain-types

**Files:**
- Create: `packages/domain-types/package.json`
- Create: `packages/domain-types/tsconfig.json`
- Create: `packages/domain-types/src/enums/unit-status.enum.ts`
- Create: `packages/domain-types/src/enums/billing-cycle.enum.ts`
- Create: `packages/domain-types/src/enums/user-type.enum.ts`
- Create: `packages/domain-types/src/enums/mandate-scheme.enum.ts`
- Create: `packages/domain-types/src/enums/invoice-status.enum.ts`
- Create: `packages/domain-types/src/errors/domain-exception.ts`
- Create: `packages/domain-types/src/errors/error-codes.ts`
- Create: `packages/domain-types/src/schemas/pagination.schema.ts`
- Create: `packages/domain-types/src/index.ts`

- [ ] **Step 1: Create packages/domain-types/package.json**

```json
{
  "name": "@container-os/domain-types",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create packages/domain-types/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create enums**

`packages/domain-types/src/enums/unit-status.enum.ts`:
```typescript
export enum UnitStatus {
  Available = 'available',
  Reserved = 'reserved',
  Occupied = 'occupied',
  Maintenance = 'maintenance',
  OutOfService = 'out_of_service',
}

export enum UnitKind {
  Container = 'container',
  SelfStorage = 'self_storage',
}
```

`packages/domain-types/src/enums/billing-cycle.enum.ts`:
```typescript
export enum BillingCycle {
  Monthly = 'monthly',
  FixedTerm = 'fixed_term',
}
```

`packages/domain-types/src/enums/user-type.enum.ts`:
```typescript
export enum UserType {
  Owner = 'owner',
  Operator = 'operator',
  Tenant = 'tenant',
}
```

`packages/domain-types/src/enums/mandate-scheme.enum.ts`:
```typescript
export enum MandateScheme {
  SepaCore = 'sepa_core',
  SepaB2b = 'sepa_b2b',
  Card = 'card',
  ManualInvoice = 'manual_invoice',
  Cash = 'cash',
  BankTransfer = 'bank_transfer',
}
```

`packages/domain-types/src/enums/invoice-status.enum.ts`:
```typescript
export enum InvoiceStatus {
  Pending = 'pending',
  Sent = 'sent',
  Paid = 'paid',
  Overdue = 'overdue',
  Void = 'void',
}
```

- [ ] **Step 4: Create error classes**

`packages/domain-types/src/errors/error-codes.ts`:
```typescript
export const ErrorCodes = {
  UNIT_OCCUPIED: 'UNIT_OCCUPIED',
  UNIT_NOT_AVAILABLE: 'UNIT_NOT_AVAILABLE',
  UNIT_CODE_DUPLICATE: 'UNIT_CODE_DUPLICATE',
  RESERVATION_EXPIRED: 'RESERVATION_EXPIRED',
  RESERVATION_HOLD_CONFLICT: 'RESERVATION_HOLD_CONFLICT',
  AGREEMENT_PREREQUISITE_MISSING: 'AGREEMENT_PREREQUISITE_MISSING',
  AGREEMENT_NOT_ACTIVE: 'AGREEMENT_NOT_ACTIVE',
  MANDATE_INCOMPLETE: 'MANDATE_INCOMPLETE',
  INVOICE_DUPLICATE_PERIOD: 'INVOICE_DUPLICATE_PERIOD',
  INVOICE_ALREADY_SETTLED: 'INVOICE_ALREADY_SETTLED',
  CREDIT_NOTE_EXCEEDS_BALANCE: 'CREDIT_NOTE_EXCEEDS_BALANCE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SITE_SCOPE_VIOLATION: 'SITE_SCOPE_VIOLATION',
  RATE_RULE_OVERLAP: 'RATE_RULE_OVERLAP',
  TRANSFER_TARGET_UNAVAILABLE: 'TRANSFER_TARGET_UNAVAILABLE',
  INSPECTION_REQUIRED: 'INSPECTION_REQUIRED',
  LEGAL_HOLD_ACTIVE: 'LEGAL_HOLD_ACTIVE',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
```

`packages/domain-types/src/errors/domain-exception.ts`:
```typescript
import { ErrorCode } from './error-codes';

export class DomainException extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
```

- [ ] **Step 5: Create pagination schema**

`packages/domain-types/src/schemas/pagination.schema.ts`:
```typescript
import { z } from 'zod';

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export interface PagedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

- [ ] **Step 6: Create index.ts**

`packages/domain-types/src/index.ts`:
```typescript
export * from './enums/unit-status.enum';
export * from './enums/billing-cycle.enum';
export * from './enums/user-type.enum';
export * from './enums/mandate-scheme.enum';
export * from './enums/invoice-status.enum';
export * from './errors/domain-exception';
export * from './errors/error-codes';
export * from './schemas/pagination.schema';
```

- [ ] **Step 7: Build domain-types**

```bash
cd packages/domain-types && pnpm build
```

Expected: `dist/` folder created with JS and `.d.ts` files.

- [ ] **Step 8: Commit**

```bash
git add packages/domain-types/
git commit -m "feat(domain-types): add shared enums, error classes, pagination schema"
```

---

### Task 0.4: Create shared package — i18n

**Files:**
- Create: `packages/i18n/package.json`
- Create: `packages/i18n/tsconfig.json`
- Create: `packages/i18n/src/locales/de.json`
- Create: `packages/i18n/src/locales/en.json`
- Create: `packages/i18n/src/index.ts`

- [ ] **Step 1: Create packages/i18n/package.json**

```json
{
  "name": "@container-os/i18n",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create packages/i18n/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create de.json (German locale)**

`packages/i18n/src/locales/de.json`:
```json
{
  "common": {
    "yes": "Ja",
    "no": "Nein",
    "save": "Speichern",
    "cancel": "Abbrechen",
    "confirm": "Bestätigen"
  },
  "invoice": {
    "subject": "Rechnung {{number}} — {{siteName}}",
    "overdue_notice": "Ihre Zahlung ist überfällig. Bitte begleichen Sie den ausstehenden Betrag, um den Zugang zu Ihrem Lager zu erhalten.",
    "lockout_warning": "Ihr Zugang wird bei weiterhin ausstehender Zahlung gesperrt.",
    "access_restored": "Ihr Zugang wurde wiederhergestellt."
  },
  "agreement": {
    "sign_prompt": "Bitte unterzeichnen Sie Ihren Mietvertrag digital.",
    "activated": "Ihr Mietvertrag ist aktiv. Willkommen bei {{siteName}}."
  },
  "access": {
    "credential_issued": "Ihre Zugangsdaten: {{credential}}",
    "lockout_active": "Ihr Zugang wurde aufgrund ausstehender Zahlungen gesperrt."
  }
}
```

- [ ] **Step 4: Create en.json (English locale)**

`packages/i18n/src/locales/en.json`:
```json
{
  "common": {
    "yes": "Yes",
    "no": "No",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm"
  },
  "invoice": {
    "subject": "Invoice {{number}} — {{siteName}}",
    "overdue_notice": "Your payment is overdue. Please settle the outstanding amount to maintain access to your storage unit.",
    "lockout_warning": "Your access will be suspended if payment remains outstanding.",
    "access_restored": "Your access has been restored."
  },
  "agreement": {
    "sign_prompt": "Please sign your rental agreement digitally.",
    "activated": "Your rental agreement is active. Welcome to {{siteName}}."
  },
  "access": {
    "credential_issued": "Your access credentials: {{credential}}",
    "lockout_active": "Your access has been suspended due to outstanding payments."
  }
}
```

- [ ] **Step 5: Create index.ts**

`packages/i18n/src/index.ts`:
```typescript
import de from './locales/de.json';
import en from './locales/en.json';

export type Locale = 'de' | 'en';
export type TranslationKey = string;

const locales: Record<Locale, Record<string, unknown>> = { de, en };

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj) as string | undefined;
}

export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string>): string {
  const template = getNestedValue(locales[locale] ?? locales['de'], key) ?? key;
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`{{${k}}}`, 'g'), v),
    template,
  );
}

export { de, en };
```

- [ ] **Step 6: Build i18n**

```bash
cd packages/i18n && pnpm build
```

Expected: `dist/` created.

- [ ] **Step 7: Commit**

```bash
git add packages/i18n/
git commit -m "feat(i18n): add de/en locale package with t() helper"
```

---

### Task 0.5: Scaffold NestJS API app

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/common/middleware/request-id.middleware.ts`
- Create: `apps/api/src/common/filters/domain-exception.filter.ts`
- Create: `apps/api/src/common/filters/http-exception.filter.ts`
- Create: `apps/api/src/common/pipes/zod-validation.pipe.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/events/event-bus.module.ts`
- Create: `apps/api/src/events/event-bus.service.ts`
- Create: `apps/api/src/events/domain-events.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@container-os/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@container-os/domain-types": "workspace:*",
    "@container-os/i18n": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/throttler": "^5.1.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@bull-board/nestjs": "^5.17.0",
    "@bull-board/express": "^5.17.0",
    "bullmq": "^5.7.0",
    "eventemitter2": "^6.4.9",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "prisma": "^5.12.0",
    "@prisma/client": "^5.12.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "zod": "^3.22.0",
    "pino": "^9.1.0",
    "pino-http": "^10.1.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.0",
    "@nestjs/testing": "^10.3.0",
    "@types/node": "^20.12.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/uuid": "^9.0.8",
    "typescript": "^5.4.0",
    "vitest": "^1.5.0"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@container-os/domain-types": ["../../packages/domain-types/src"],
      "@container-os/i18n": ["../../packages/i18n/src"]
    }
  },
  "include": ["src", "prisma"]
}
```

- [ ] **Step 3: Create apps/api/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 4: Create apps/api/vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: { reporter: ['text', 'lcov'] },
  },
  resolve: {
    alias: {
      '@container-os/domain-types': resolve(__dirname, '../../packages/domain-types/src'),
      '@container-os/i18n': resolve(__dirname, '../../packages/i18n/src'),
    },
  },
});
```

- [ ] **Step 5: Create src/main.ts**

`apps/api/src/main.ts`:
```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as pino from 'pino';
import * as pinoHttp from 'pino-http';

async function bootstrap() {
  const logger = pino.default({ level: process.env.LOG_LEVEL ?? 'info' });
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(pinoHttp.default({ logger }));
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3001' });
  app.setGlobalPrefix('api');

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  logger.info(`Container OS API running on port ${port}`);
}

bootstrap();
```

- [ ] **Step 6: Create src/app.module.ts**

`apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventBusModule } from './events/event-bus.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventBusModule,
    // Domain modules added here as each track completes
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Create request ID middleware**

`apps/api/src/common/middleware/request-id.middleware.ts`:
```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.headers['x-request-id'] = req.headers['x-request-id'] ?? uuidv4();
    res.setHeader('x-request-id', req.headers['x-request-id'] as string);
    next();
  }
}
```

- [ ] **Step 8: Create exception filters**

`apps/api/src/common/filters/domain-exception.filter.ts`:
```typescript
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '@container-os/domain-types';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception.code === 'PERMISSION_DENIED' || exception.code === 'SITE_SCOPE_VIOLATION'
        ? 403
        : 422;

    response.status(status).json({
      error: {
        code: exception.code,
        message: exception.message,
        details: exception.details,
      },
    });
  }
}
```

`apps/api/src/common/filters/http-exception.filter.ts`:
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    response.status(status).json({
      error: typeof body === 'string' ? { code: 'HTTP_ERROR', message: body } : body,
    });
  }
}
```

- [ ] **Step 9: Create Zod validation pipe**

`apps/api/src/common/pipes/zod-validation.pipe.ts`:
```typescript
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const errors = (result.error as ZodError).errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      throw new BadRequestException({ code: 'VALIDATION_ERROR', details: errors });
    }
    return result.data;
  }
}
```

- [ ] **Step 10: Create CurrentUser decorator**

`apps/api/src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  type: 'owner' | 'operator' | 'tenant';
  email: string;
  siteIds: string[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

- [ ] **Step 11: Create EventBus**

`apps/api/src/events/domain-events.ts`:
```typescript
export interface DomainEventMeta {
  workspaceId: string;
  siteId?: string;
  actorId?: string;
  occurredAt: Date;
}

export interface DomainEvent<T = unknown> {
  type: string;
  payload: T;
  meta: DomainEventMeta;
}

// Event type constants
export const Events = {
  RESERVATION_CONFIRMED: 'reservation.confirmed',
  AGREEMENT_ACTIVATED: 'agreement.activated',
  AGREEMENT_TERMINATED: 'agreement.terminated',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_OVERDUE: 'invoice.overdue',
  INVOICE_PAID: 'invoice.paid',
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  ACCESS_CREDENTIAL_ISSUED: 'access.credential.issued',
  ACCESS_LOCKOUT_ACTIVATED: 'access.lockout.activated',
  ACCESS_LOCKOUT_DEACTIVATED: 'access.lockout.deactivated',
  ACCESS_DENIED: 'access.denied',
} as const;
```

`apps/api/src/events/event-bus.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import EventEmitter2 from 'eventemitter2';
import { DomainEvent } from './domain-events';

@Injectable()
export class EventBusService {
  private emitter = new EventEmitter2({ wildcard: true, maxListeners: 50 });

  emit<T>(event: DomainEvent<T>): void {
    this.emitter.emit(event.type, event);
  }

  on<T>(eventType: string, handler: (event: DomainEvent<T>) => void | Promise<void>): void {
    this.emitter.on(eventType, handler);
  }
}
```

`apps/api/src/events/event-bus.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
```

- [ ] **Step 12: Install deps and verify app starts**

```bash
cd apps/api && pnpm install
pnpm start:dev
```

Expected: App starts on port 3000 with no errors.

- [ ] **Step 13: Commit**

```bash
git add apps/api/
git commit -m "feat(api): scaffold NestJS app with EventBus, filters, pipes, decorators"
```

---

### Task 0.6: Full Prisma schema

**Files:**
- Create: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Create full schema.prisma**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Site & Inventory ────────────────────────────────────────────────────────

model Site {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  timezone    String     @default("Europe/Berlin")
  currency    String     @default("EUR")
  address     Json
  accessHours Json?
  status      SiteStatus @default(active)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  deletedAt   DateTime?

  zones     Zone[]
  unitTypes UnitType[]
  units     Unit[]
}

enum SiteStatus { active inactive }

model Zone {
  id            String  @id @default(cuid())
  siteId        String
  name          String
  mapPolygon    Json?
  vehicleAccess Boolean @default(false)
  site          Site    @relation(fields: [siteId], references: [id])
  units         Unit[]
}

model UnitType {
  id       String   @id @default(cuid())
  siteId   String
  name     String
  sizeSqm  Float
  sizeCbm  Float?
  doorType String?
  features String[]
  site     Site     @relation(fields: [siteId], references: [id])
}

model Unit {
  id               String     @id @default(cuid())
  siteId           String
  zoneId           String?
  unitCode         String
  unitTypeId       String
  kind             UnitKind   @default(self_storage)
  status           UnitStatus @default(available)
  driveUp          Boolean    @default(false)
  position         Json?
  photoUrl         String?
  conditionState   String?
  lastInspectionId String?
  auditVersion     Int        @default(1)
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  deletedAt        DateTime?

  site Site  @relation(fields: [siteId], references: [id])
  zone Zone? @relation(fields: [zoneId], references: [id])

  @@unique([siteId, unitCode])
}

enum UnitKind   { container self_storage }
enum UnitStatus { available reserved occupied maintenance out_of_service }

model InventoryEvent {
  id        String   @id @default(cuid())
  unitId    String
  oldStatus String
  newStatus String
  reason    String?
  actorId   String?
  createdAt DateTime @default(now())
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

model PriceBook {
  id            String          @id @default(cuid())
  siteId        String
  name          String
  status        PriceBookStatus @default(draft)
  effectiveFrom DateTime
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  rules RateRule[]
}

enum PriceBookStatus { draft published archived }

model RateRule {
  id           String   @id @default(cuid())
  priceBookId  String
  unitTypeId   String
  amountMinor  Int
  billingCycle String
  conditions   Json?
  createdAt    DateTime @default(now())

  priceBook PriceBook @relation(fields: [priceBookId], references: [id])
}

model Promotion {
  id             String   @id @default(cuid())
  siteId         String
  code           String
  discountType   String
  value          Int
  stackingPolicy String   @default("none")
  validFrom      DateTime
  validTo        DateTime?
  createdAt      DateTime @default(now())
}

model FeeSchedule {
  id            String @id @default(cuid())
  siteId        String @unique
  depositMinor  Int    @default(0)
  lateFeePolicy Json?
  adminFeeMinor Int    @default(0)
}

model TaxProfile {
  id      String @id @default(cuid())
  siteId  String
  taxCode String
  vatRate Float
}

// ─── Storefront ───────────────────────────────────────────────────────────────

model LandingPageConfig {
  id          String   @id @default(cuid())
  siteId      String   @unique
  heroContent Json?
  faqBlocks   Json?
  seoMeta     Json?
  updatedAt   DateTime @updatedAt
}

model CheckoutSession {
  id         String   @id @default(cuid())
  siteId     String
  unitTypeId String
  state      String   @default("started")
  metadata   Json?
  expiresAt  DateTime
  createdAt  DateTime @default(now())
}

model QuoteRequest {
  id           String   @id @default(cuid())
  siteId       String
  contact      Json
  requirements Json?
  status       String   @default("new")
  createdAt    DateTime @default(now())
}

// ─── CRM & Leads ─────────────────────────────────────────────────────────────

model Lead {
  id         String     @id @default(cuid())
  siteId     String
  source     String
  status     LeadStatus @default(new)
  intent     String?
  moveInDate DateTime?
  notes      String?
  customerId String?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  deletedAt  DateTime?
}

enum LeadStatus { new contacted qualified converted lost }

model Customer {
  id               String       @id @default(cuid())
  type             CustomerType @default(private)
  personOrOrgData  Json
  marketingConsent Boolean      @default(false)
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  deletedAt        DateTime?

  contacts  Contact[]
  agreements Agreement[]
  mandates  Mandate[]
}

enum CustomerType { private business }

model Contact {
  id         String   @id @default(cuid())
  customerId String
  role       String   @default("primary")
  email      String
  phone      String?
  createdAt  DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id])
}

model Activity {
  id          String   @id @default(cuid())
  subjectType String
  subjectId   String
  channel     String
  body        String
  actorId     String?
  createdAt   DateTime @default(now())
}

// ─── Reservations ────────────────────────────────────────────────────────────

model Reservation {
  id         String            @id @default(cuid())
  siteId     String
  unitId     String
  unitTypeId String
  customerId String
  status     ReservationStatus @default(pending)
  startDate  DateTime
  expiresAt  DateTime
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt
}

enum ReservationStatus { pending pending_signature confirmed expired cancelled converted }

model ReservationHold {
  id            String   @id @default(cuid())
  unitId        String
  reservationId String?
  lockToken     String   @unique @default(cuid())
  expiresAt     DateTime
  createdAt     DateTime @default(now())
}

// ─── Agreements ──────────────────────────────────────────────────────────────

model AgreementTemplate {
  id        String   @id @default(cuid())
  siteId    String
  version   String
  language  String
  body      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now())

  @@unique([siteId, language, version])
}

model Agreement {
  id               String          @id @default(cuid())
  reservationId    String          @unique
  tenantId         String
  unitId           String
  siteId           String
  status           AgreementStatus @default(draft)
  billingCycle     BillingCycle    @default(monthly)
  effectiveFrom    DateTime?
  terminationRules Json
  pricingSnapshot  Json
  language         String          @default("de")
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  customer    Customer             @relation(fields: [tenantId], references: [id])
  amendments  AgreementAmendment[]
  signatories Signatory[]
  invoices    Invoice[]
}

enum AgreementStatus { draft pending_signature signed active terminated }
enum BillingCycle    { monthly fixed_term }

model AgreementAmendment {
  id            String   @id @default(cuid())
  agreementId   String
  type          String
  effectiveFrom DateTime
  data          Json?
  createdAt     DateTime @default(now())

  agreement Agreement @relation(fields: [agreementId], references: [id])
}

model Signatory {
  id          String         @id @default(cuid())
  agreementId String
  personId    String
  status      SignatoryStatus @default(pending)
  signedAt    DateTime?
  createdAt   DateTime       @default(now())

  agreement Agreement @relation(fields: [agreementId], references: [id])
}

enum SignatoryStatus { pending signed declined }

model TerminationRequest {
  id            String   @id @default(cuid())
  agreementId   String
  requestedDate DateTime
  status        String   @default("pending")
  operatorNote  String?
  createdAt     DateTime @default(now())
}

// ─── Billing & Mandates ───────────────────────────────────────────────────────

model Invoice {
  id                  String        @id @default(cuid())
  agreementId         String
  siteId              String
  status              InvoiceStatus @default(pending)
  invoiceDate         DateTime
  dueDate             DateTime
  currency            String        @default("EUR")
  totalMinor          Int
  periodStart         DateTime
  periodEnd           DateTime
  einvoicePayload     Json?
  einvoiceStorageKey  String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  agreement Agreement    @relation(fields: [agreementId], references: [id])
  lines     InvoiceLine[]
  payments  Payment[]
  credits   CreditNote[]

  @@unique([agreementId, periodStart])
}

enum InvoiceStatus { pending sent paid overdue void }

model InvoiceLine {
  id          String  @id @default(cuid())
  invoiceId   String
  kind        String
  description String
  amountMinor Int
  taxCode     String?
  vatRate     Float?

  invoice Invoice @relation(fields: [invoiceId], references: [id])
}

model Mandate {
  id            String        @id @default(cuid())
  customerId    String
  scheme        MandateScheme @default(sepa_core)
  reference     String        @unique
  creditorId    String?
  status        MandateStatus @default(pending)
  ibanLast4     String?
  consentSource String?
  stripeSetupId String?
  signedAt      DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])
}

enum MandateScheme { sepa_core sepa_b2b card manual_invoice cash bank_transfer }
enum MandateStatus { pending active cancelled failed }

model ReminderPolicy {
  id     String @id @default(cuid())
  siteId String @unique
  steps  Json
}

model DelinquencyPolicy {
  id             String  @id @default(cuid())
  siteId         String  @unique
  overdueDays    Int     @default(14)
  lockoutEnabled Boolean @default(true)
  lateFeeRules   Json?
}

model CreditNote {
  id          String   @id @default(cuid())
  invoiceId   String
  amountMinor Int
  reason      String
  createdAt   DateTime @default(now())

  invoice Invoice @relation(fields: [invoiceId], references: [id])
}

// ─── Payments & Accounting ────────────────────────────────────────────────────

model Payment {
  id          String        @id @default(cuid())
  invoiceId   String
  method      MandateScheme
  status      PaymentStatus @default(pending)
  amountMinor Int
  reference   String        @unique
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  invoice  Invoice          @relation(fields: [invoiceId], references: [id])
  attempts PaymentAttempt[]
}

enum PaymentStatus { pending pending_settlement succeeded failed refunded }

model PaymentAttempt {
  id          String   @id @default(cuid())
  paymentId   String
  provider    String
  status      String
  providerRef String   @unique
  errorCode   String?
  createdAt   DateTime @default(now())

  payment Payment @relation(fields: [paymentId], references: [id])
}

model LedgerEntry {
  id            String   @id @default(cuid())
  type          String
  refType       String
  refId         String
  debitAccount  String
  creditAccount String
  amountMinor   Int
  siteId        String?
  createdAt     DateTime @default(now())

  @@index([refType, refId])
  @@index([siteId, createdAt])
}

model ExportJob {
  id          String   @id @default(cuid())
  kind        String
  scope       Json
  status      String   @default("queued")
  downloadUrl String?
  checksum    String?
  createdAt   DateTime @default(now())
  completedAt DateTime?
}

model AccountingMapping {
  id             String   @id @default(cuid())
  siteId         String
  revenueAccount String
  taxCode        String
  costCenter     String?
  effectiveFrom  DateTime
}

// ─── Access Control ───────────────────────────────────────────────────────────

model AccessVendor {
  id          String   @id @default(cuid())
  name        String
  adapterType String
  siteIds     String[]
  config      Json?
}

model AccessPoint {
  id       String @id @default(cuid())
  siteId   String
  vendorId String
  kind     String
  name     String
  state    String @default("unknown")
}

model AccessGroup {
  id     String @id @default(cuid())
  siteId String
  rules  Json
}

model AccessCredential {
  id             String   @id @default(cuid())
  agreementId    String   @unique
  credentialType String
  externalRef    String?
  maskedValue    String?
  status         String   @default("active")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

model AccessEvent {
  id            String   @id @default(cuid())
  accessPointId String
  credentialId  String?
  eventType     String
  result        String
  occurredAt    DateTime
  createdAt     DateTime @default(now())

  @@index([accessPointId, occurredAt])
}

model LockoutState {
  id          String   @id @default(cuid())
  agreementId String   @unique
  reason      String
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ─── Operations ───────────────────────────────────────────────────────────────

model Task {
  id         String     @id @default(cuid())
  siteId     String
  assigneeId String?
  status     TaskStatus @default(open)
  dueAt      DateTime?
  subjectRef String?
  title      String
  notes      String?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
}

enum TaskStatus { open in_progress completed cancelled }

model InspectionTemplate {
  id        String @id @default(cuid())
  siteId    String
  kind      String
  checklist Json
}

model InspectionRun {
  id           String   @id @default(cuid())
  unitId       String
  templateId   String?
  kind         String
  result       String?
  photoIds     String[]
  completedAt  DateTime?
  createdAt    DateTime @default(now())
}

model Incident {
  id                  String         @id @default(cuid())
  siteId              String
  severity            String
  type                String
  status              IncidentStatus @default(open)
  linkedAccessEventId String?
  resolutionNote      String?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
}

enum IncidentStatus { open investigating resolved }

model MaintenanceOrder {
  id            String   @id @default(cuid())
  unitId        String
  status        String   @default("open")
  vendorContact String?
  createdAt     DateTime @default(now())
}

model Transfer {
  id            String   @id @default(cuid())
  fromUnitId    String
  toUnitId      String
  agreementId   String
  effectiveDate DateTime
  status        String   @default("pending")
  createdAt     DateTime @default(now())
}

// ─── Documents & Signatures ───────────────────────────────────────────────────

model Document {
  id          String   @id @default(cuid())
  subjectType String
  subjectId   String
  kind        String
  storageKey  String
  hash        String
  locale      String?
  createdAt   DateTime @default(now())
}

model DocumentTemplate {
  id      String  @id @default(cuid())
  name    String
  locale  String
  version String
  body    String
  active  Boolean @default(true)
}

model SignatureEnvelope {
  id         String   @id @default(cuid())
  documentId String
  provider   String   @default("internal")
  status     String   @default("pending")
  events     Json?
  hash       String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model EvidencePack {
  id         String   @id @default(cuid())
  documentId String
  events     Json
  hash       String
  createdAt  DateTime @default(now())
}

// ─── Reporting ────────────────────────────────────────────────────────────────

model MetricSnapshot {
  id        String   @id @default(cuid())
  siteId    String
  metric    String
  value     Float
  bucketAt  DateTime
  createdAt DateTime @default(now())

  @@index([siteId, metric, bucketAt])
}

model ReportRun {
  id        String   @id @default(cuid())
  kind      String
  params    Json
  status    String   @default("queued")
  result    Json?
  createdAt DateTime @default(now())
}

// ─── Notifications ────────────────────────────────────────────────────────────

model NotificationTemplate {
  id        String  @id @default(cuid())
  channel   String
  locale    String
  eventType String
  subject   String?
  body      String
  active    Boolean @default(true)

  @@unique([channel, locale, eventType])
}

model NotificationPreference {
  id      String  @id @default(cuid())
  userId  String
  channel String
  enabled Boolean @default(true)
}

model OutboundMessage {
  id          String   @id @default(cuid())
  eventType   String
  channel     String
  status      String   @default("queued")
  providerRef String?
  recipientId String
  subjectRef  String?
  createdAt   DateTime @default(now())
  sentAt      DateTime?
}

// ─── Auth & RBAC ──────────────────────────────────────────────────────────────

model User {
  id         String   @id @default(cuid())
  type       UserType
  email      String   @unique
  mfaState   String   @default("disabled")
  status     String   @default("active")
  keycloakId String?  @unique
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  assignments PermissionAssignment[]
  sessions    UserSession[]
}

enum UserType { owner operator tenant }

model Role {
  id          String   @id @default(cuid())
  name        String   @unique
  permissions String[]
  createdAt   DateTime @default(now())

  assignments PermissionAssignment[]
}

model PermissionAssignment {
  id      String   @id @default(cuid())
  userId  String
  roleId  String
  siteIds String[]

  user User @relation(fields: [userId], references: [id])
  role Role @relation(fields: [roleId], references: [id])
}

model UserSession {
  id        String   @id @default(cuid())
  userId    String
  device    String?
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model OrganisationMembership {
  id             String @id @default(cuid())
  organisationId String
  contactId      String
  portalRole     String @default("member")
}

// ─── Audit & Security ────────────────────────────────────────────────────────

model AuditEvent {
  id          String   @id @default(cuid())
  actorId     String?
  actorType   String?
  action      String
  subjectType String
  subjectId   String
  changes     Json?
  siteId      String?
  requestId   String?
  createdAt   DateTime @default(now())

  @@index([subjectType, subjectId])
  @@index([actorId, createdAt])
  @@index([siteId, createdAt])
}

model LegalHold {
  id         String   @id @default(cuid())
  subjectRef String
  reason     String
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
}

model SecurityEvent {
  id        String   @id @default(cuid())
  type      String
  severity  String
  details   Json
  createdAt DateTime @default(now())
}

// ─── Webhooks & API ───────────────────────────────────────────────────────────

model ApiClient {
  id      String @id @default(cuid())
  name    String
  scopes  String[]
  siteIds String[]

  keys      ApiKey[]
  endpoints WebhookEndpoint[]
}

model ApiKey {
  id         String    @id @default(cuid())
  clientId   String
  keyHash    String    @unique
  status     String    @default("active")
  lastUsedAt DateTime?
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())

  client ApiClient @relation(fields: [clientId], references: [id])
}

model WebhookEndpoint {
  id            String   @id @default(cuid())
  clientId      String
  url           String
  secret        String
  subscriptions String[]
  status        String   @default("active")
  createdAt     DateTime @default(now())

  client    ApiClient         @relation(fields: [clientId], references: [id])
  deliveries WebhookDelivery[]
}

model WebhookDelivery {
  id          String   @id @default(cuid())
  endpointId  String
  eventType   String
  payload     Json
  status      String   @default("pending")
  attempts    Int      @default(0)
  lastError   String?
  createdAt   DateTime @default(now())
  deliveredAt DateTime?

  endpoint WebhookEndpoint @relation(fields: [endpointId], references: [id])
}
```

- [ ] **Step 2: Run Prisma migration**

```bash
cd apps/api
npx prisma migrate dev --name init
```

Expected: Migration file created under `prisma/migrations/`. Prisma client generated.

- [ ] **Step 3: Verify Prisma client generates without errors**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client` message. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat(db): add full Prisma schema for all 16 domain modules"
```

---

### Task 0.7: Auth module (Keycloak OIDC + RBAC)

**Files:**
- Create: `apps/api/src/modules/auth/auth.module.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/keycloak.strategy.ts`
- Create: `apps/api/src/modules/auth/rbac.service.ts`
- Create: `apps/api/src/common/guards/auth.guard.ts`
- Create: `apps/api/src/common/guards/site.guard.ts`
- Create: `apps/api/src/modules/auth/auth.service.spec.ts`

- [ ] **Step 1: Write failing test for RBAC permission check**

`apps/api/src/modules/auth/auth.service.spec.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { RbacService } from './rbac.service';

describe('RbacService', () => {
  const rbac = new RbacService();

  it('returns true when user has required permission', () => {
    const result = rbac.hasPermission(
      { permissions: ['invoices:read', 'units:write'] },
      'invoices:read',
    );
    expect(result).toBe(true);
  });

  it('returns false when user lacks required permission', () => {
    const result = rbac.hasPermission(
      { permissions: ['units:write'] },
      'finance:export',
    );
    expect(result).toBe(false);
  });

  it('returns true when user has wildcard permission for namespace', () => {
    const result = rbac.hasPermission(
      { permissions: ['invoices:*'] },
      'invoices:write',
    );
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd apps/api && pnpm test src/modules/auth/auth.service.spec.ts
```

Expected: FAIL — `RbacService` not found.

- [ ] **Step 3: Implement RbacService**

`apps/api/src/modules/auth/rbac.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';

interface PermissionHolder {
  permissions: string[];
}

@Injectable()
export class RbacService {
  hasPermission(user: PermissionHolder, required: string): boolean {
    return user.permissions.some((p) => {
      if (p === required) return true;
      const [ns] = required.split(':');
      if (p === `${ns}:*`) return true;
      return false;
    });
  }

  hasSiteAccess(userSiteIds: string[], resourceSiteId: string): boolean {
    return userSiteIds.includes(resourceSiteId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/modules/auth/auth.service.spec.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Create Keycloak JWT strategy**

`apps/api/src/modules/auth/keycloak.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

interface KeycloakJwtPayload {
  sub: string;
  email: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
}

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaClient,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: async (_req: unknown, rawJwt: string, done: Function) => {
        // In production: fetch JWKS from Keycloak and verify
        // For local dev: use shared secret configured in Keycloak
        const secret = config.get('KEYCLOAK_CLIENT_SECRET', 'dev-secret');
        done(null, secret);
      },
    });
  }

  async validate(payload: KeycloakJwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakId: payload.sub },
      include: { assignments: { include: { role: true } } },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const permissions = user.assignments.flatMap((a) => a.role.permissions);
    const siteIds = user.assignments.flatMap((a) => a.siteIds);

    return { id: user.id, type: user.type, email: user.email, siteIds, permissions };
  }
}
```

- [ ] **Step 6: Create Auth guards**

`apps/api/src/common/guards/auth.guard.ts`:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('keycloak') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

`apps/api/src/common/guards/site.guard.ts`:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../../modules/auth/rbac.service';
import { DomainException, ErrorCodes } from '@container-os/domain-types';

@Injectable()
export class SiteGuard implements CanActivate {
  constructor(private rbac: RbacService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const siteId = request.params.siteId ?? request.body?.siteId;

    if (!siteId) return true; // No site context required for this route

    if (user.type === 'owner') return true; // Owners have workspace scope

    if (!this.rbac.hasSiteAccess(user.siteIds, siteId)) {
      throw new DomainException(
        ErrorCodes.SITE_SCOPE_VIOLATION,
        `User does not have access to site ${siteId}`,
      );
    }
    return true;
  }
}
```

- [ ] **Step 7: Create AuthModule**

`apps/api/src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaClient } from '@prisma/client';
import { KeycloakStrategy } from './keycloak.strategy';
import { RbacService } from './rbac.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SiteGuard } from '../../common/guards/site.guard';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    KeycloakStrategy,
    RbacService,
    SiteGuard,
    AuthService,
    { provide: PrismaClient, useValue: new PrismaClient() },
  ],
  exports: [RbacService, SiteGuard, PrismaClient],
})
export class AuthModule {}
```

`apps/api/src/modules/auth/auth.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async inviteUser(email: string, type: string, roleId: string, siteIds: string[]) {
    // Creates User record; Keycloak invitation handled via admin API
    const user = await this.prisma.user.create({
      data: { email, type: type as 'owner' | 'operator' | 'tenant', status: 'invited' },
    });
    await this.prisma.permissionAssignment.create({
      data: { userId: user.id, roleId, siteIds },
    });
    return user;
  }

  async getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { assignments: { include: { role: true } } },
    });
  }
}
```

`apps/api/src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';

@Controller('operator/v1')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('auth/me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @Post('users/invite')
  @UseGuards(JwtAuthGuard)
  invite(@Body() body: { email: string; type: string; roleId: string; siteIds: string[] }) {
    return this.authService.inviteUser(body.email, body.type, body.roleId, body.siteIds);
  }
}
```

- [ ] **Step 8: Register AuthModule in AppModule**

Edit `apps/api/src/app.module.ts` — add to imports:
```typescript
import { AuthModule } from './modules/auth/auth.module';
// add AuthModule to @Module({ imports: [..., AuthModule] })
```

- [ ] **Step 9: Run tests**

```bash
pnpm test src/modules/auth/
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/src/common/guards/ apps/api/src/app.module.ts
git commit -m "feat(auth): add Keycloak OIDC strategy, RBAC service, SiteGuard"
```

---

### Task 0.8: Audit module

**Files:**
- Create: `apps/api/src/modules/audit/audit.module.ts`
- Create: `apps/api/src/modules/audit/audit.service.ts`
- Create: `apps/api/src/modules/audit/audit.controller.ts`
- Create: `apps/api/src/modules/audit/audit.service.spec.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/modules/audit/audit.service.spec.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const mockPrisma = {
    auditEvent: { create: vi.fn().mockResolvedValue({ id: 'evt_01' }) },
    legalHold: { findFirst: vi.fn().mockResolvedValue(null) },
  };

  const service = new AuditService(mockPrisma as any);

  it('creates an audit event with correct shape', async () => {
    await service.record({
      actorId: 'usr_01',
      actorType: 'operator',
      action: 'unit.status_changed',
      subjectType: 'Unit',
      subjectId: 'unit_01',
      changes: { from: 'available', to: 'occupied' },
      siteId: 'site_01',
    });

    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'usr_01',
        action: 'unit.status_changed',
        subjectType: 'Unit',
        subjectId: 'unit_01',
      }),
    });
  });

  it('detects active legal hold for subject', async () => {
    mockPrisma.legalHold.findFirst.mockResolvedValueOnce({ id: 'hold_01', active: true });
    const held = await service.hasLegalHold('Unit', 'unit_01');
    expect(held).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/modules/audit/audit.service.spec.ts
```

Expected: FAIL — `AuditService` not found.

- [ ] **Step 3: Implement AuditService**

`apps/api/src/modules/audit/audit.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface RecordAuditEventInput {
  actorId?: string;
  actorType?: string;
  action: string;
  subjectType: string;
  subjectId: string;
  changes?: Record<string, unknown>;
  siteId?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    await this.prisma.auditEvent.create({ data: input });
  }

  async hasLegalHold(subjectType: string, subjectId: string): Promise<boolean> {
    const hold = await this.prisma.legalHold.findFirst({
      where: { subjectRef: `${subjectType}:${subjectId}`, active: true },
    });
    return !!hold;
  }

  async getAuditTrail(subjectType: string, subjectId: string, siteId?: string) {
    return this.prisma.auditEvent.findMany({
      where: { subjectType, subjectId, ...(siteId ? { siteId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/modules/audit/audit.service.spec.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Create AuditController and AuditModule**

`apps/api/src/modules/audit/audit.controller.ts`:
```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { AuditService } from './audit.service';

@Controller('operator/v1/audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  getAuditTrail(
    @Query('subjectType') subjectType: string,
    @Query('subjectId') subjectId: string,
    @Query('siteId') siteId?: string,
  ) {
    return this.auditService.getAuditTrail(subjectType, subjectId, siteId);
  }
}
```

`apps/api/src/modules/audit/audit.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [AuditController],
  providers: [AuditService, { provide: PrismaClient, useValue: new PrismaClient() }],
  exports: [AuditService],
})
export class AuditModule {}
```

- [ ] **Step 6: Register AuditModule in AppModule**

```typescript
// In apps/api/src/app.module.ts, add:
import { AuditModule } from './modules/audit/audit.module';
// Add AuditModule to imports array
```

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/audit/
git commit -m "feat(audit): add immutable audit event service with legal hold detection"
```

---

### Task 0.9: Health endpoints and test setup

**Files:**
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/test/setup.ts`

- [ ] **Step 1: Create health controller**

`apps/api/src/health/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaClient) {}

  @Get('healthz')
  liveness() {
    return { status: 'ok', version: process.env.npm_package_version ?? '0.1.0' };
  }

  @Get('readyz')
  async readiness() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok' };
  }

  @Get('metrics')
  metrics() {
    // Placeholder — Track A (Reporting) fills this out
    return '# HELP container_os_up Application is up\n# TYPE container_os_up gauge\ncontainer_os_up 1\n';
  }
}
```

- [ ] **Step 2: Create test setup**

`apps/api/src/test/setup.ts`:
```typescript
import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

beforeAll(async () => {
  prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

- [ ] **Step 3: Verify health endpoint**

```bash
pnpm start:dev &
curl http://localhost:3000/api/healthz
```

Expected: `{"status":"ok","version":"0.1.0"}`

- [ ] **Step 4: Run all tests**

```bash
pnpm test
```

Expected: All tests pass.

- [ ] **Step 5: Final Phase 0 commit**

```bash
git add apps/api/src/health/ apps/api/src/test/
git commit -m "feat(api): add health endpoints and test infrastructure"
```

---

## Phase 0 complete

All parallel tracks (A–F) can now begin. Each track agent should:
1. Read the master plan: `docs/superpowers/plans/2026-05-10-container-os-master.md`
2. Read this foundation plan to understand shared infrastructure
3. Read its own track plan
4. Import `AuthModule` and `AuditModule` from the existing NestJS app
5. Use `PrismaClient` from `AuthModule` exports (or create own instance)
6. Use `EventBusService` from `EventBusModule` (globally provided)
7. Register its module in `AppModule`
