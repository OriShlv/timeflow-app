#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"
export DATABASE_URL="${DATABASE_URL:-postgresql://timeflow:timeflow@localhost:5432/timeflow_test}"

docker compose exec -T postgres psql -U timeflow -d timeflow -c "CREATE DATABASE timeflow_test" 2>/dev/null || true

cd server && npx prisma migrate deploy
