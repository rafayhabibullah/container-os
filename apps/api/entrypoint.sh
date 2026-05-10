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
# depends_on: service_healthy guarantees the Postgres healthcheck passed, but
# the TCP path from this container can still be briefly unavailable.
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

# Run pending migrations. Idempotent — safe to run on every boot.
echo "[entrypoint] Running Prisma migrations..."
node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma
echo "[entrypoint] Migrations complete."

# exec replaces the shell so Node.js becomes PID 1 and receives SIGTERM directly.
echo "[entrypoint] Starting server on port ${PORT:-3000}..."
exec node dist/main.js
