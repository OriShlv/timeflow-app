## Server (Bun API)

This directory contains the TimeFlow HTTP API implemented with **Bun + TypeScript + Express + Prisma**.

### Prerequisites

- Bun 1.1+ (recommended)
- Docker (for Postgres + Redis via the repo’s `docker-compose.yml`)

### Setup

```bash
cd server
cp .env.example .env  # configure DATABASE_URL and REDIS_URL
bun install
```

Run database migrations:

```bash
bun run db:migrate
```

Optionally seed demo data:

```bash
bun run dev:demo
```

### Running the server

Development mode with auto-reload:

```bash
bun run dev
```

Type-check and run the server directly from TypeScript:

```bash
bun run build
bun start
```

### Integration tests

Requires Postgres and Redis (start via `docker compose up -d postgres redis` from repo root).

```bash
bun run test:prepare   # creates timeflow_test DB and runs migrations (run once)
bun run test          # runs auth + tasks integration tests
```

### Linting and formatting

This project uses **ESLint** + **Prettier** for the `src/` TypeScript code.

- Lint the code:

  ```bash
  bun run lint
  ```

- Auto-fix lint issues:

  ```bash
  bun run lint:fix
  ```

- Format code with Prettier:

  ```bash
  bun run format
  ```

- Check formatting without writing changes:

  ```bash
  bun run format:check
  ```
