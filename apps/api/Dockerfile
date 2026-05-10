# ─── Stage 1: install all workspace dependencies ──────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

# Copy manifests only — Docker caches this layer so install is skipped when
# only source files change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json                  ./apps/api/package.json
COPY packages/domain-types/package.json     ./packages/domain-types/package.json
COPY packages/i18n/package.json             ./packages/i18n/package.json
COPY packages/ui/package.json               ./packages/ui/package.json

# shamefully-hoist=true tells pnpm to place symlinks for ALL workspace deps at
# the root node_modules/ (not just in per-package node_modules/).
# This ensures that the runtime stage's `COPY /monorepo/node_modules` captures
# every production module the compiled server needs (reflect-metadata, rxjs, etc.)
# without having to copy per-package node_modules directories.
RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --frozen-lockfile


# ─── Stage 2: compile ─────────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

# Copy the ENTIRE installed workspace from deps.
# This preserves per-package node_modules symlinks that pnpm creates for each
# workspace package's own dependencies (e.g. packages/domain-types/node_modules/zod).
# Copying only /monorepo/node_modules would miss those and tsc would fail to
# resolve direct package deps like 'zod'.
COPY --from=deps /monorepo .

# Overlay actual source files from the build context on top of the installed tree.
COPY packages/domain-types ./packages/domain-types
COPY packages/i18n         ./packages/i18n
COPY packages/ui           ./packages/ui
COPY apps/api              ./apps/api

# Build shared packages with tsc directly (avoids pnpm workspace store requirement).
RUN /monorepo/node_modules/.bin/tsc --project packages/domain-types/tsconfig.json
RUN /monorepo/node_modules/.bin/tsc --project packages/i18n/tsconfig.json

# Generate Prisma Client for the Alpine (musl) target.
# prisma and @nestjs/cli are devDependencies of apps/api — pnpm places their
# binaries in apps/api/node_modules/.bin/, not the workspace root node_modules.
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
RUN cd apps/api && ./node_modules/.bin/prisma generate \
      --schema=./prisma/schema.prisma

# Compile the NestJS application. nest-cli.json must be read from apps/api/.
RUN cd apps/api && ./node_modules/.bin/nest build


# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# OpenSSL is required by the Prisma schema engine binary at runtime.
# Alpine does not include it by default.
RUN apk add --no-cache openssl

RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nestjs

WORKDIR /app

# Copy the root workspace node_modules (includes .pnpm store + Prisma musl engine).
COPY --from=build --chown=nestjs:nodejs /monorepo/node_modules ./node_modules


COPY --from=build --chown=nestjs:nodejs /monorepo/apps/api/dist ./dist
COPY --from=build --chown=nestjs:nodejs /monorepo/apps/api/prisma ./prisma

COPY --chown=nestjs:nodejs apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER nestjs

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/healthz || exit 1

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
