# ─── Stage 1: install workspace dependencies ──────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web-owner/package.json              ./apps/web-owner/package.json
COPY packages/domain-types/package.json  ./packages/domain-types/package.json
COPY packages/i18n/package.json          ./packages/i18n/package.json
COPY packages/ui/package.json            ./packages/ui/package.json

RUN echo "shamefully-hoist=true" > .npmrc
RUN pnpm install --frozen-lockfile


# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy the full installed workspace (preserves per-package node_modules symlinks).
COPY --from=deps /monorepo .

# Overlay actual source files.
COPY packages/ui            ./packages/ui
COPY packages/i18n          ./packages/i18n
COPY packages/domain-types  ./packages/domain-types
COPY apps/web-owner              ./apps/web-owner

# Run next build directly from the app directory.
RUN cd apps/web-owner && ./node_modules/.bin/next build


# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nextjs

WORKDIR /app

COPY --from=build --chown=nextjs:nodejs \
  /monorepo/apps/web-owner/.next/standalone ./

COPY --from=build --chown=nextjs:nodejs \
  /monorepo/apps/web-owner/.next/static \
  ./apps/web-owner/.next/static

USER nextjs

ENV PORT=3001 \
    NODE_ENV=production \
    HOSTNAME=0.0.0.0

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/ || exit 1

CMD ["node", "apps/web-owner/server.js"]
