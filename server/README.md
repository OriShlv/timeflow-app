## Server (Node.js API)

This directory contains the TimeFlow HTTP API implemented with **Node.js + TypeScript + Express + Prisma**.

### Prerequisites

- Node.js 20+ (recommended)
- Docker (for Postgres + Redis via the repo’s `docker-compose.yml`)

### Setup

```bash
cd server
cp .env.example .env  # configure DATABASE_URL and REDIS_URL
npm install
```

Run database migrations:

```bash
npm run db:migrate
```

Optionally seed demo data:

```bash
npm run dev:demo
```

### Running the server

Development mode with auto-reload:

```bash
npm run dev
```

Build and run the compiled server:

```bash
npm run build
npm start
```

### Linting and formatting

This project uses **ESLint** + **Prettier** for the `src/` TypeScript code.

- Lint the code:

  ```bash
  npm run lint
  ```

- Auto-fix lint issues:

  ```bash
  npm run lint:fix
  ```

- Format code with Prettier:

  ```bash
  npm run format
  ```

- Check formatting without writing changes:

  ```bash
  npm run format:check
  ```
