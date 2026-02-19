## Python workers

This directory contains the Python workers that power **analytics**, **segmentation**, **recommendations**, and **realtime features** for TimeFlow.

Workers connect to the same Postgres + Redis instances used by the Node.js API.

### Prerequisites

- Python 3.11+ (recommended)
- Access to the same Postgres and Redis as the `server/` (e.g. via `docker compose up -d` from the repo root)

### Environment variables

Copy the example environment file and adjust values as needed:

```bash
cd python-workers
cp .env.example .env
```

At minimum you should set:

- `DATABASE_URL` – Postgres connection string
- `REDIS_URL` – Redis connection string (for realtime worker)

### Virtual environment + dependencies

Create and activate a virtual environment:

```bash
cd python-workers
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

Install dependencies from the **locked** requirements:

```bash
pip install -r requirements.lock.txt
```

If you need to upgrade dependencies, edit `requirements.txt`, reinstall, and then refresh the lock file:

```bash
pip install -r requirements.txt
pip freeze > requirements.lock.txt
```

### Available workers / scripts

All scripts live under `src/`:

- `src/realtime_worker.py` – Redis Streams consumer
  - Consumes events from the `timeflow.events` stream
  - Maintains worker heartbeats and a DLQ stream `timeflow.events.dlq`
  - Upserts `DailyUserFeatures` and `UserSegment` records in Postgres

- `src/daily_stats.py` – daily stats rollup
  - Computes per-user daily stats into `DailyUserStats`
  - Intended to be run on a schedule (e.g. once per day via cron)

- `src/daily_features.py` – daily feature computation
  - Computes richer per-user daily features into `DailyUserFeatures`
  - Intended to be run on a schedule (e.g. once per day via cron)

- `src/recommendations_v1.py` – rule-based recommendations
  - Generates time-management recommendations into `UserRecommendation`
  - `LOW_COMPLETION_RATE` and `HIGH_WIP` examples are implemented

- `src/cluster_users.py` – clustering / segmentation
  - Clusters users based on `DailyUserFeatures` into persona-like segments
  - Updates `UserSegment` with segment id, label, and centroid

### Running workers

Ensure Docker infra is up from the repo root:

```bash
docker compose up -d
```

Then, from `python-workers/` with your virtualenv activated:

#### Realtime stream consumer

```bash
python src/realtime_worker.py
```

#### Daily stats and features (batch)

```bash
python src/daily_stats.py
python src/daily_features.py
```

#### Recommendations

```bash
python src/recommendations_v1.py
```

#### Clustering / segmentation

```bash
python src/cluster_users.py
```

You can wire these commands into cron, a scheduler, or a workflow engine as needed.

