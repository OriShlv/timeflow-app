# Server

Bun + TypeScript + Express HTTP API for TimeFlow. PostgreSQL via Prisma; Redis Streams for the event pipeline.

← [Back to root README](../README.md)

## Table of contents

- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [API modules](#api-modules)
- [Project structure](#project-structure)
- [Testing](#testing)
- [Lint and format](#lint-and-format)

## Prerequisites

- [Bun](https://bun.sh) 1.1+
- Docker — Postgres + Redis via repo-root `docker-compose.yml`

## Quick start

```bash
# From repo root
docker compose up -d

cd server
cp .env.example .env
bun install
bun run db:migrate
bun run dev
```

API: http://localhost:3000 (default `PORT`).

Seed demo data: `bun run dev:demo` or `bun run db:reset:demo`.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default `3000`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_SECRET` | Yes | Min 32 chars |
| `JWT_EXPIRES_IN` | No | Token TTL (default `15m`) |
| `OLLAMA_HOST` | No | Planner LLM host (default `http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` | No | Ollama model name |
| `OPS_ENABLED` | No | Enable ops routes (default `false`) |
| `OPS_DEV_ONLY` | No | Restrict ops to dev (default `true`) |
| `OPS_ADMIN_EMAILS` | No | Comma-separated admin emails |

Validated at startup in `src/config/env.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev server with `bun --watch` |
| `bun run build` | Type-check (`tsc --noEmit`) |
| `bun start` | Run `src/main.ts` |
| `bun run db:migrate` | Apply Prisma migrations |
| `bun run db:reset` | Reset database |
| `bun run dev:demo` | Seed demo data |
| `bun run db:reset:demo` | Reset + seed demo |
| `bun run seed:recommendations` | Seed recommendation fixtures |
| `bun run test:prepare` | Create `timeflow_test` DB (once) |
| `bun run test` | Integration tests (auth, tasks) |

## API modules

| Mount | Module | Purpose |
|-------|--------|---------|
| `/health` | health | Service liveness |
| `/dbcheck` | dbcheck | Database connectivity |
| `/auth` | auth | Register, login |
| `/me` | users | Current user |
| `/tasks` | tasks | Task CRUD, events to Redis |
| `/focus-sessions` | focus-sessions | Focus timer lifecycle |
| `/analytics` | analytics | Summary and daily stats |
| `/insights` | insights | Dashboard (segment + recommendations) |
| `/recommendations` | recommendations | User recommendations |
| `/features` | features | Daily user features |
| `/segment` | segment | User segment |
| `/planner` | planner | LLM planning agent |
| `/ops` | ops | DLQ inspect/replay (gated) |

## Project structure

```
src/
├── main.ts                 # Entry point
├── app/
│   ├── server.ts           # Express app + route mounting
│   ├── middleware/         # require-auth
│   └── errors/             # HttpError, error handler
├── config/env.ts           # Zod env validation
├── db/                     # Prisma client
├── events/publisher.ts     # Redis Streams publisher
├── queue/redis.ts          # Redis connection
├── llm/                    # Ollama client
└── modules/                # Feature routers, services, schemas
prisma/
└── schema.prisma           # Data model
```

## Testing

Requires Postgres and Redis:

```bash
docker compose up -d postgres redis
bun run test:prepare   # once
bun run test
```

Uses Vitest + Supertest against a dedicated `timeflow_test` database.

## Lint and format

| Command | Description |
|---------|-------------|
| `bun run lint` | ESLint on `src/` |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run format` | Prettier write |
| `bun run format:check` | Prettier check |

## Related docs

- [Events contract](../docs/EVENTS_CONTRACT.md)
- [Analytics pipeline](../docs/ANALYTICS.md)
- [Python workers](../python-workers/README.md)
