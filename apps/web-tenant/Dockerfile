# ─── Stage 1: dependency installer ───────────────────────────────────────────
FROM node:20-alpine AS deps

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web-tenant/package.json             ./apps/web-tenant/package.json
COPY packages/domain-types/package.json ./packages/domain-types/package.json
COPY packages/i18n/package.json         ./packages/i18n/package.json
COPY packages/ui/package.json           ./packages/ui/package.json

RUN pnpm install --frozen-lockfile


# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /monorepo

# NEXT_PUBLIC_* vars are baked into the JS bundle at build time — they cannot
# be changed at runtime. Pass the browser-visible API URL as a build argument.
# Default is localhost:3000 (host-forwarded port) for local Docker use.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /monorepo/node_modules ./node_modules

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./

# Next.js transpiles these packages directly (transpilePackages in next.config.js),
# so we copy their TypeScript source — no pre-compilation needed.
COPY packages/ui            ./packages/ui
COPY packages/i18n          ./packages/i18n
COPY packages/domain-types  ./packages/domain-types
COPY apps/web-tenant              ./apps/web-tenant

# next build reads NEXT_PUBLIC_* from env and outputs .next/standalone/ because
# next.config.js has output: 'standalone'.
RUN pnpm --filter=@container-os/web-tenant build


# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -s /bin/sh -D nextjs

WORKDIR /app

# standalone/ contains the minimal Next.js server + all required server-side deps.
# Its internal directory structure mirrors the monorepo: the server entry is at
# apps/web-tenant/server.js relative to the standalone root.
COPY --from=build --chown=nextjs:nodejs \
  /monorepo/apps/web-tenant/.next/standalone ./

# Static assets must live at apps/web-tenant/.next/static relative to the standalone
# server root — Next.js serves them from /_next/static/*.
COPY --from=build --chown=nextjs:nodejs \
  /monorepo/apps/web-tenant/.next/static \
  ./apps/web-tenant/.next/static

USER nextjs

ENV PORT=3003 \
    NODE_ENV=production \
    HOSTNAME=0.0.0.0

EXPOSE 3003

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3003/ || exit 1

CMD ["node", "apps/web-tenant/server.js"]
