# TimeFlow

Daily planning app with a mobile-first UX loop: **capture tasks → execute with focus sessions → review insights → adjust plan**.

Monorepo layout: React client, Bun/Express API, and Python analytics workers over PostgreSQL + Redis Streams.

| Layer | Stack |
|-------|-------|
| Client | React 19, Vite, TypeScript, Tailwind CSS |
| Server | Bun, Express, Prisma, Zod, JWT |
| Workers | Python 3.11+, SQLAlchemy, Redis Streams |
| Infra | Docker Compose (Postgres 17, Redis 7) |

## Table of contents

- [Features](#features)
- [Repository layout](#repository-layout)
- [Quick start](#quick-start)
- [Manual setup](#manual-setup)
- [Local URLs](#local-urls)
- [Documentation](#documentation)
- [Design goals](#design-goals)

## Features

- **Today** — urgent task shortlist, one-tap actions (`Mark done`, `Snooze`, `Start focus`), focus-session controls
- **Tasks** — search, filter, sort, CRUD, optimistic updates, pagination
- **Insights** — segment badge, recommendations with deep links, 7/30-day trends, freshness status
- **Focus sessions** — start/stop/cancel per task, active timer in shell, daily focus summary
- **Planner agent** — LLM-assisted planning via Ollama (optional; see [server env](#environment-variables))
- **Profile settings** — editable display name and timezone (server-persisted; dates render in saved timezone)
- **Event pipeline** — task and focus outcomes published to Redis Streams; Python workers derive analytics

## Repository layout

```
timeflow-app/
├── client/           # React SPA → see client/README.md
├── server/           # Bun HTTP API → see server/README.md
├── python-workers/   # Analytics workers → see python-workers/README.md
├── docs/             # Contracts and specs
├── scripts/dev.ts    # One-command local dev orchestrator
└── docker-compose.yml
```

## Quick start

**Prerequisites:** [Bun](https://bun.sh) 1.1+, [Docker](https://www.docker.com/), Python 3.11+ (for workers).

```bash
# 1. Infrastructure
docker compose up -d

# 2. Server
cd server && cp .env.example .env && bun install && bun run db:migrate
cd ..

# 3. Client
cd client && cp .env.example .env && bun install
cd ..

# 4. Workers (optional but needed for live insights)
cd python-workers && cp .env.example .env
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.lock.txt
cd ..

# 5. Run everything (API + Vite + realtime worker)
bun run dev
```

Flags: `bun run dev -- --no-docker` (skip compose), `bun run dev -- --no-workers` (API + client only).

Root scripts:

| Script | Description |
|--------|-------------|
| `bun run dev` | Start docker, server, client, realtime worker |
| `bun run dev:demo` | Seed demo data (server) |
| `bun run db:reset:demo` | Reset DB and re-seed demo data |
| `bun run seed:recommendations` | Seed recommendation fixtures |

## Manual setup

Run services individually when you need finer control.

### Server

```bash
cd server
bun install
bun run db:migrate    # or: bun run dev:demo
bun run dev           # http://localhost:3000
```

### Client

```bash
cd client
bun install
bun run dev           # http://localhost:5173
```

### Python workers

```bash
cd python-workers
source .venv/bin/activate
python src/realtime_worker.py          # stream consumer (always-on)
python src/daily_stats.py              # batch — schedule daily
python src/daily_features.py
python src/recommendations_v1.py
python src/cluster_users.py
```

## Local URLs

| Service | URL | Notes |
|---------|-----|-------|
| Client | http://localhost:5173 | Vite dev server |
| API | http://localhost:3000 | Default `PORT` in `server/.env` |
| Postgres | `localhost:5432` | `timeflow` / `timeflow` |
| Redis | `localhost:6379` | Stream: `timeflow.events` |

## Environment variables

Copy each package's `.env.example` to `.env`.

| Package | Key variables |
|---------|---------------|
| `server/` | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `OLLAMA_HOST`, `OLLAMA_MODEL` |
| `client/` | `VITE_API_URL` (default `http://localhost:3000`) |
| `python-workers/` | `DATABASE_URL`, `SQLALCHEMY_DATABASE_URL`, `REDIS_URL` |

## Documentation

| Doc | Contents |
|-----|----------|
| [client/README.md](client/README.md) | Frontend routes, scripts, structure |
| [server/README.md](server/README.md) | API setup, tests, lint |
| [python-workers/README.md](python-workers/README.md) | Worker scripts and scheduling |
| [docs/EVENTS_CONTRACT.md](docs/EVENTS_CONTRACT.md) | Redis Streams event schema |
| [docs/ANALYTICS.md](docs/ANALYTICS.md) | Analytics endpoints and data pipeline |
| [docs/UX_MAP_PHASE1_SPEC.md](docs/UX_MAP_PHASE1_SPEC.md) | Phase 1 UX specification |

## API overview

| Group | Prefix | Purpose |
|-------|--------|---------|
| Health | `/health`, `/dbcheck` | Liveness and DB connectivity |
| Auth | `/auth` | Register, login |
| Users | `/me`, `/users/me`, `/users/me/settings` | Profile read + settings update |
| Tasks | `/tasks` | CRUD, filter, sort, pagination |
| Focus | `/focus-sessions` | Start/stop/cancel, daily summary |
| Analytics | `/analytics`, `/insights` | Aggregates, trends, dashboard |
| Planner | `/planner` | LLM planning sessions |
| Ops | `/ops` | DLQ inspection, replay (dev-gated) |

## UX flow

1. **Auth** — register or log in → land on `/today`
2. **Dashboard** (`/dashboard`) — calendar, recommendations, shortcuts
3. **Today** — urgent tasks and fast actions
4. **Tasks** — full task workspace
5. **Insights** — stats, segment, recommendations
6. **Profile** — display name, timezone, logout (`GET /users/me`, `PATCH /users/me/settings`)

## Design goals

- **Fast execution loop** — low friction between capture, focus, and reflection
- **Clear boundaries** — transactional API stays responsive; analytics run async
- **Operational visibility** — health checks, structured logs, ops routes for recovery
- **Incremental extensibility** — new surfaces and analytics without breaking the API
