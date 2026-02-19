## TimeFlow

TimeFlow is a personal time and task management platform with an **event‑driven backend** and **analytics workers**.
It is designed as a production‑style backend system that demonstrates modern patterns: Redis Streams, background workers, operational tooling (health checks, DB checks, ops endpoints, DLQ and replay), and typed APIs with validation.

### Key capabilities
- **Event‑driven processing**: Tasks and usage events are written to Redis Streams and processed asynchronously.
- **Analytics workers (Python)**: Daily analytics, user segmentation, and insights are computed out of band.
- **Operational tooling**: Health and DB check endpoints, ops routes, and support for dead‑letter queues and replay.
- **Security & auth**: JWT‑based authentication, password hashing, and request validation with Zod.
- **Extensible domain model**: Users, tasks, features, segments, analytics, recommendations, and insights modules.

---

## Architecture

- **`server/`** – Node.js API (TypeScript, Express, Prisma)  
  - Routes for auth, users, tasks, analytics, recommendations, features, segments, insights, and ops.
  - Centralized error handling and HTTP logging with `pino-http`.
  - PostgreSQL via Prisma, Redis for streams and real‑time pipelines.
- **`python-workers/`** – Python workers  
  - Consume Redis Streams for real‑time and batch analytics.
  - Produce aggregated metrics, user segments, and insights back to the system.
- **`client/`** – Frontend UI (planned)  
  - Intentionally decoupled; the API is usable by any client (web, mobile, CLI).
- **`docker-compose.yml`** – Local infrastructure  
  - Postgres and Redis for local development.

This layout is meant to mirror a realistic service: a typed HTTP API, background workers, and explicit operational surfaces.

---

## Tech stack
- **Language / runtime**: Node.js, TypeScript
- **Web framework**: Express
- **ORM / DB access**: Prisma (PostgreSQL)
- **Messaging / streaming**: Redis Streams (`ioredis`)
- **Auth & security**: JWT, bcrypt, helmet, CORS
- **Validation**: Zod
- **Logging**: pino / pino‑http
- **Infra / tooling**: Docker Compose (Postgres + Redis), dotenv
- **Workers**: Python (for analytics + real‑time workers)

---

## Getting started

### 1) Start infrastructure

```bash
docker compose up -d
```

This starts Postgres and Redis for local development.

### 2) Run the server (Node.js API)

```bash
cd server
cp .env.example .env   # or create .env with DATABASE_URL and REDIS_URL
npm install
npx prisma migrate dev
npm run dev
```

The API will be available on `http://localhost:<PORT>` (see `server/src/config/env.ts` for the exact port).

### 3) Run the Python workers (optional but recommended)

```bash
cd python-workers
cp .env.example .env   # configure Redis / DB connection as needed
pip install -r requirements.txt
python -m workers.analytics   # example entrypoint
```

Workers listen to Redis Streams and compute analytics and insights.

---

## API surface (high‑level)

Some of the key route groups exposed by the server:

- **Health / diagnostics**
  - `GET /health` – service health
  - `GET /dbcheck` – database connectivity check
- **Auth / users**
  - `POST /auth/login`, `POST /auth/register`
  - `GET /me` and related user routes
- **Tasks & time tracking**
  - `CRUD` operations for tasks and related entities
  - Events published to Redis Streams for downstream processing
- **Analytics & insights**
  - `/analytics/*` – aggregate views over time usage
  - `/insights/*` – user‑level insights and recommendations
- **Ops**
  - `/ops/*` – operational utilities such as DLQ inspection and replay

Endpoints are implemented with TypeScript, Prisma, and Zod to enforce input/output types and reduce runtime errors.

---

## Development workflow

- **Local development**
  - `npm run dev` in `server/` runs the API with `ts-node-dev` and automatic reload.
  - Python workers can be started independently and pointed at the same Redis / Postgres.
- **Database**
  - `npm run db:migrate` – run Prisma migrations locally.
  - `npm run db:reset` – reset the database.
  - `npm run dev:demo` – reset and seed demo data (see `scripts/seed-demo.js`).
- **Build & production**
  - `npm run build` – compile TypeScript to `dist/`.
  - `npm start` – start the compiled server.

Configuration is environment‑driven (`.env` files) and can be adapted to different environments.

---

## Design goals

- **Realistic backend patterns** – Event‑driven processing, dedicated ops endpoints, typed contracts, and clear separation between online traffic and offline analytics.
- **Observability & diagnosability** – Structured logging, health checks, DB checks, and ops utilities to inspect and replay messages.
- **Extensibility** – New domains (e.g., additional analytics or recommendation strategies) can be added as separate modules without changing the core server setup.
- **Safety & correctness** – Runtime validation, explicit types, and cautious handling of credentials and secrets via environment variables.