#!/usr/bin/env bash
# Billing dashboard E2E, fully local. Usage (Git Bash, from the CRM repo root):
#   PROXY_REPO=../ai-agent-proxy bash tests/e2e/admin-billing/run.sh          # setup + run + teardown
#   KEEP=1 bash tests/e2e/admin-billing/run.sh                                # leave servers/container up
# Requires: docker, node_modules installed. Touches ONLY 127.0.0.1:55440 / :3901 / :8210.
set -euo pipefail
cd "$(dirname "$0")/../../.."
HERE=tests/e2e/admin-billing
PROXY_REPO="${PROXY_REPO:-../ai-agent-proxy}"
source "$HERE/env.sh"
mkdir -p "$BILLING_E2E_OUT"

# 1. Postgres
if ! docker ps --format '{{.Names}}' | grep -qx billing-e2e-pg; then
  docker run -d --name billing-e2e-pg -e POSTGRES_PASSWORD=e2epass -p 127.0.0.1:55440:5432 postgres:16-alpine >/dev/null
fi
for i in $(seq 1 60); do docker exec billing-e2e-pg psql -U postgres -tAc 'select 1' >/dev/null 2>&1 && break; done
docker exec billing-e2e-pg psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='crm_e2e'" | grep -q 1 \
  || docker exec billing-e2e-pg psql -U postgres -c 'CREATE DATABASE crm_e2e' >/dev/null

# 2. CRM schema (prisma db push from an isolated cwd so no .env can be picked up) + seed
TMPP="$BILLING_E2E_OUT/prisma-push"; mkdir -p "$TMPP"; cp prisma/schema.prisma "$TMPP/schema.prisma"
(cd "$TMPP" && "$OLDPWD/node_modules/.bin/prisma" db push --schema ./schema.prisma --skip-generate --accept-data-loss)
docker exec billing-e2e-pg psql -U postgres -d crm_e2e -tAc 'SHOW timezone'
docker exec -i billing-e2e-pg psql -U postgres -d crm_e2e -v ON_ERROR_STOP=1 -q < "$HERE/seed.sql"

# 3. Stub proxy + Next dev server
node "$HERE/stub-proxy.mjs" > "$BILLING_E2E_OUT/stub.log" 2>&1 & STUB_PID=$!
node_modules/.bin/next dev -p 3901 -H 127.0.0.1 > "$BILLING_E2E_OUT/dev.log" 2>&1 & DEV_PID=$!
cleanup() {
  [ "${KEEP:-0}" = 1 ] && return
  kill $STUB_PID $DEV_PID 2>/dev/null || true
  # next dev spawns worker processes: kill whatever still listens on our ports (Windows PIDs via netstat)
  for port in 3901 8210; do
    for pid in $(netstat -ano 2>/dev/null | awk -v p=":$port" '$2 ~ p"$" && $4 == "LISTENING" {print $5}' | sort -u); do
      taskkill //F //T //PID "$pid" >/dev/null 2>&1 || kill "$pid" 2>/dev/null || true
    done
  done
  docker rm -f billing-e2e-pg >/dev/null 2>&1 || true
}
trap cleanup EXIT
for i in $(seq 1 120); do curl -s -o /dev/null --max-time 5 http://127.0.0.1:3901/api/admin/overview && break; done
for i in $(seq 1 20); do curl -s -o /dev/null --max-time 2 "$STUB_URL/__log" && break; done

# 4. Playwright
node_modules/.bin/playwright test -c playwright.admin-billing.config.ts "$@"
