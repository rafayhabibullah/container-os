#!/bin/sh
# Startup script: waits for Postgres, runs Prisma migrations, starts the server.
# Uses /bin/sh (POSIX) not /bin/bash — Alpine ships with busybox.
set -e

echo "[entrypoint] Starting Container OS API..."

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set. Aborting."
  exit 1
fi

# Wait for Postgres TCP to be reachable.
echo "[entrypoint] Waiting for Postgres at postgres:5432..."
MAX=30; COUNT=0
until nc -z postgres 5432 2>/dev/null; do
  COUNT=$((COUNT+1))
  if [ "$COUNT" -ge "$MAX" ]; then
    echo "[entrypoint] ERROR: Postgres unreachable after ${MAX} attempts. Aborting."
    exit 1
  fi
  echo "[entrypoint] Retrying ($COUNT/$MAX)..."
  sleep 2
done
echo "[entrypoint] Postgres is ready."

# Find the Prisma CLI inside the pnpm content-addressable store.
# prisma is a devDependency of apps/api — pnpm does not hoist it to the
# workspace root node_modules/.bin/, so we find it in the .pnpm store directly.
PRISMA_JS=$(find ./node_modules/.pnpm -maxdepth 6 \
  -name "index.js" -path "*/prisma/build/index.js" 2>/dev/null | head -1)

if [ -z "$PRISMA_JS" ]; then
  echo "[entrypoint] ERROR: Prisma CLI not found in node_modules/.pnpm"
  exit 1
fi

echo "[entrypoint] Running Prisma migrations (using $PRISMA_JS)..."
node "$PRISMA_JS" migrate deploy --schema=./prisma/schema.prisma
echo "[entrypoint] Migrations complete."

# Seed demo data (idempotent — all upserts, safe to run on every start).
# Set SKIP_SEED=true to disable (e.g. in production with real tenant data).
if [ "${SKIP_SEED:-false}" != "true" ]; then
  echo "[entrypoint] Seeding database..."
  node "$PRISMA_JS" db seed --schema=./prisma/schema.prisma
  echo "[entrypoint] Seed complete."
fi

# exec replaces the shell so Node.js becomes PID 1 and receives SIGTERM directly.
echo "[entrypoint] Starting server on port ${PORT:-3000}..."
exec node dist/main.js
