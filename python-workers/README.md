# Python Workers

Analytics, segmentation, and recommendations for TimeFlow. Consumes Redis Streams and reads/writes PostgreSQL alongside the Bun API.

← [Back to root README](../README.md)

## Table of contents

- [Pipeline overview](#pipeline-overview)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Configuration](#configuration)
- [Workers](#workers)
- [Running workers](#running-workers)
- [Scheduling](#scheduling)

## Pipeline overview

```
Server (task events)
    │
    ▼
Redis Stream: timeflow.events
    │
    ├── realtime_worker.py  → DailyUserFeatures, UserSegment (live)
    │
    └── (batch jobs, cron)
            ├── daily_stats.py        → DailyUserStats
            ├── daily_features.py     → DailyUserFeatures
            ├── recommendations_v1.py → UserRecommendation
            └── cluster_users.py      → UserSegment
```

Event schema: [docs/EVENTS_CONTRACT.md](../docs/EVENTS_CONTRACT.md)  
API consumption: [docs/ANALYTICS.md](../docs/ANALYTICS.md)

## Prerequisites

- Python 3.11+
- Postgres + Redis (repo-root `docker compose up -d`)

## Setup

```bash
cd python-workers
cp .env.example .env
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.lock.txt
```

The root `bun run dev` script auto-starts `realtime_worker.py` when `.venv` exists.

## Configuration

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres URL (psycopg) |
| `SQLALCHEMY_DATABASE_URL` | SQLAlchemy URL (`postgresql+psycopg://…`) |
| `REDIS_URL` | Redis URL for stream consumer |

Stream name: `timeflow.events` (DLQ: `timeflow.events.dlq`).

## Workers

| Script | Type | Writes to | Purpose |
|--------|------|-----------|---------|
| `src/realtime_worker.py` | Long-running | `DailyUserFeatures`, `UserSegment` | Consumer group on `timeflow.events`; heartbeats + DLQ |
| `src/daily_stats.py` | Batch | `DailyUserStats` | Per-user daily created/completed counts |
| `src/daily_features.py` | Batch | `DailyUserFeatures` | Time buckets, overdue, completion lag |
| `src/recommendations_v1.py` | Batch | `UserRecommendation` | Rule-based tips (`LOW_COMPLETION_RATE`, `HIGH_WIP`) |
| `src/cluster_users.py` | Batch | `UserSegment` | Cluster personas from daily features |

## Running workers

```bash
source .venv/bin/activate

# Always-on (started by bun run dev)
python src/realtime_worker.py

# Batch — run manually or via cron
python src/daily_stats.py
python src/daily_features.py
python src/recommendations_v1.py
python src/cluster_users.py
```

## Scheduling

Suggested daily order:

1. `daily_stats.py`
2. `daily_features.py`
3. `recommendations_v1.py` (after stats)
4. `cluster_users.py` (after features)

Without batch jobs, `/analytics` and `/insights` return stale or empty derived data. The realtime worker keeps live features updated from stream events.

## Dependency management

- **Install:** `requirements.lock.txt` (pinned)
- **Upgrade:** edit `requirements.txt`, reinstall, then `pip freeze > requirements.lock.txt`

## Related docs

- [Server API](../server/README.md)
- [Events contract](../docs/EVENTS_CONTRACT.md)
- [Analytics API](../docs/ANALYTICS.md)
