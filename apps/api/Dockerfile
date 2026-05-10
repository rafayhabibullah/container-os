# ─── Stage 1: dependency installer ────────────────────────────────────────────
# Copies only package.json files first so Docker layer-caches the install step.
# pnpm deploy flattens workspace:* symlinks into a real node_modules for the
# runtime stage — without this, Docker cannot follow pnpm's symlinks.
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json                  ./apps/api/package.json
COPY packages/domain-types/package.json     ./packages/domain-types/package.json
COPY packages/i18n/package.json             ./packages/i18n/package.json
COPY packages/ui/package.json               ./packages/ui/package.json

RUN pnpm install --frozen-lockfile

# Produce a self-contained node_modules for the api (no workspace symlinks).
RUN pnpm deploy --filter=@container-os/api --prod /deploy/api


# ─── Stage 2: compile ─────────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

COPY --from=deps /monorepo/node_modules ./node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Shared packages must be compiled before the API because domain-types and i18n
# use "main": "dist/index.js" — the API's tsc resolves them via node_modules.
COPY packages/domain-types ./packages/domain-types
COPY packages/i18n         ./packages/i18n
COPY packages/ui           ./packages/ui
COPY apps/api              ./apps/api

RUN pnpm --filter=@container-os/domain-types build
RUN pnpm --filter=@container-os/i18n build

# Generate Prisma Client for the Alpine (musl) target. Without this env var,
# Prisma generates the macOS binary which fails inside Alpine at runtime.
# The binaryTargets in schema.prisma already declares linux-musl-openssl-3.0.x;
# this env var ensures it is also used during the generate step.
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN pnpm --filter=@container-os/api exec prisma generate \
      --schema=./apps/api/prisma/schema.prisma

RUN pnpm --filter=@container-os/api build


# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Run as non-root — never run Node services as root inside a container.
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nestjs

WORKDIR /app

# Flattened node_modules from pnpm deploy (no symlinks, fully self-contained).
COPY --from=deps  --chown=nestjs:nodejs /deploy/api/node_modules ./node_modules

# Compiled NestJS application.
COPY --from=build --chown=nestjs:nodejs /monorepo/apps/api/dist   ./dist

# Prisma schema + migrations — needed by entrypoint.sh for `migrate deploy`,
# and by the Prisma Client at runtime for query engine resolution.
COPY --from=build --chown=nestjs:nodejs /monorepo/apps/api/prisma ./prisma

# Startup script: waits for Postgres, runs migrations, starts the server.
COPY --chown=nestjs:nodejs apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nestjs

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/healthz || exit 1

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
