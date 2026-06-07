## TimeFlow

TimeFlow is a full-stack daily planning app with a React client, an event-driven API, and Python analytics workers.
The product currently ships a mobile-first UX loop: **capture tasks -> execute with focus sessions -> review insights -> adjust plan**.

### Key capabilities
- **Today command center**: Urgent tasks, quick actions (`Mark done`, `Snooze`, `Start focus`), and focus-session controls.
- **Task execution workspace**: Search/filter/sort, CRUD, optimistic status updates, pagination, and empty-state guidance.
- **Insights workspace**: Segment badge, recommendations with deep-link actions, 7/30-day trends, and freshness status.
- **Focus session tracking**: Start/stop/cancel sessions per task, active timers in shell UI, and daily focus summary.
- **Event-driven analytics**: Task and focus outcomes feed Redis Streams and Python workers for derived insights.

---

## Architecture

- **`client/`** – React + Vite + TypeScript
  - Auth flows (`/login`, `/register`) with guarded app routes.
  - Main app shell with tabs: `Today`, `Tasks`, `Insights`, `Profile`.
  - Shared UI primitives (`Button`, `Modal`, `Toast`, etc.) and focus-session context.
- **`server/`** – Bun runtime API (TypeScript, Express, Prisma)
  - Route groups: auth, users, tasks, focus sessions, analytics, features, segment, recommendations, insights, ops.
  - Centralized error handling and HTTP logging with `pino-http`.
  - PostgreSQL via Prisma and Redis Streams for event pipelines.
- **`python-workers/`** – Python analytics workers
  - Realtime consumer updates derived features/segments.
  - Batch jobs compute daily stats, features, recommendations, and clustering outputs.
- **`docker-compose.yml`** – Local infra
  - PostgreSQL + Redis for development and integration tests.

This layout is meant to mirror a realistic service: a typed HTTP API, background workers, and explicit operational surfaces.

---

## Tech stack
- **Language / runtime**: Bun, TypeScript
- **Web framework**: Express
- **ORM / DB access**: Prisma (PostgreSQL)
- **Messaging / streaming**: Redis Streams (`ioredis`)
- **Auth & security**: JWT, bcrypt, helmet, CORS
- **Validation**: Zod
- **Logging**: pino / pino‑http
- **Infra / tooling**: Docker Compose (Postgres + Redis)
- **Workers**: Python (for analytics + real‑time workers)

---

## Getting started

### 1) Start infrastructure

```bash
docker compose up -d
```

This starts Postgres and Redis for local development.

### 2) Run the server (Bun API)

```bash
cd server
cp .env.example .env   # or create .env with DATABASE_URL and REDIS_URL
bun install
bunx prisma migrate dev
bun run dev
```

The API will be available on `http://localhost:<PORT>` (see `server/src/config/env.ts` for the exact port).

### 3) Run the client (React app)

```bash
cd client
bun install
bun run dev
```

Client app default: `http://localhost:5173`.

### 4) Run the Python workers (optional but recommended)

```bash
cd python-workers
cp .env.example .env   # configure DATABASE_URL / REDIS_URL as needed
python -m venv .venv
source .venv/bin/activate      # On Windows: .venv\Scripts\activate
pip install -r requirements.lock.txt
```

Now you can run the workers, for example:

```bash
# Realtime Redis Streams consumer
python src/realtime_worker.py

# Batch jobs (can be scheduled)
python src/daily_stats.py
python src/daily_features.py
python src/recommendations_v1.py
python src/cluster_users.py
```

Workers listen to Redis Streams and Postgres, compute analytics/insights, and write back to the database.

---

## API surface (high-level)

Some of the key route groups exposed by the server:

- **Health / diagnostics**
  - `GET /health` – service health
  - `GET /dbcheck` – database connectivity check
- **Auth / users**
  - `POST /auth/login`, `POST /auth/register`
  - `GET /me` and related user routes
- **Tasks**
  - `GET/POST/PATCH/DELETE /tasks`
  - Supports filtering, sorting, and pagination
- **Focus sessions**
  - `POST /focus-sessions/start`
  - `POST /focus-sessions/:id/stop`
  - `POST /focus-sessions/:id/cancel`
  - `GET /focus-sessions` and `GET /focus-sessions/summary/daily`
- **Analytics & insights**
  - `/analytics/*` – aggregate views over time usage
  - `/insights/*` – user‑level insights and recommendations
- **Ops**
  - `/ops/*` – operational utilities such as DLQ inspection and replay

Endpoints are implemented with TypeScript, Prisma, and Zod to enforce input/output types and reduce runtime errors.

---

## UX flow (current)

1. **Auth** -> user registers/logs in and lands on `/today`.
2. **Today** -> urgent task shortlist + fast actions + focus panel.
3. **Tasks** -> full task management with filters, sorting, and edit/delete.
4. **Insights** -> recommendations, stats, trends, and focus outcomes.
5. **Profile** -> basic identity and timezone information.

## Development workflow

- **Local development**
  - `bun run dev` in `server/` runs the API with `bun --watch` and automatic reload.
  - Python workers can be started independently and pointed at the same Redis / Postgres.
- **Database**
  - `bun run db:migrate` – run Prisma migrations locally.
  - `bun run db:reset` – reset the database.
  - `bun run dev:demo` – reset and seed demo data (see `scripts/seed-demo.js`).
- **Build & production**
  - `bun run build` – type-check the TypeScript sources (`tsc --noEmit`).
  - `bun start` – run the server directly from TypeScript.

Configuration is environment‑driven (`.env` files) and can be adapted to different environments.

---

## Design goals

- **Fast execution loop** - reduce friction between task capture, focused execution, and reflection.
- **Clear system boundaries** - transactional API paths stay responsive while analytics run asynchronously.
- **Operational visibility** - health/db checks, structured logs, and ops routes for diagnostics and recovery.
- **Incremental extensibility** - new UX surfaces and analytics modules can be added without breaking API compatibility.