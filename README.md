# TimeFlow

TimeFlow is a personal time + task management system with an event-driven backend (Node.js) and analytics workers (Python).
It includes realtime processing via Redis Streams, daily analytics, user segmentation, and operational tooling (ops endpoint, DLQ, replay).

## Repo Structure
- server/ - Node.js API (Express + Prisma) + Redis Streams + Ops tools
- python-workers/ - analytics + realtime workers
- client/ - UI (to be added)
- docker-compose.yml - Postgres + Redis for local dev

## Local Setup

### 1) Start infrastructure
```bash
docker compose up -d
