# Analytics API and Data Pipeline

## Endpoints

| Endpoint | Purpose |
|----------|--------|
| `GET /analytics/summary` | Task counts (total, done, pending, canceled, overdue, completion rate) plus latest daily stats and daily features. Use for dashboards that need a single aggregate view. |
| `GET /analytics/daily?day=<ISO>` | Per-day stats for one day: createdCount, completedCount, completionRate from `DailyUserStats`. |
| `GET /insights` | Full dashboard: task summary, user segment, latest daily features, and up to 5 recommendations. Use when segment and recommendations are needed. |

`/analytics/summary` is the canonical analytics summary; `/insights` extends it with segment and recommendations.

## Tables populated by Python jobs

| Table | Populated by | Description |
|-------|--------------|-------------|
| `DailyUserStats` | `python-workers/src/daily_stats.py` | Per-user, per-day created/completed counts and completion rate (from TaskEvent). |
| `DailyUserFeatures` | `python-workers/src/daily_features.py` | Richer per-day features: time buckets, overdue count, avg completion lag (reads TaskEvent + Task). |
| `UserRecommendation` | `python-workers/src/recommendations_v1.py` | Rule-based recommendations; reads `DailyUserStats` (e.g. 7-day window). |
| `UserSegment` | `python-workers/src/cluster_users.py` | Segmentation/labels; reads `DailyUserFeatures`. |

Run `daily_stats` and `daily_features` (e.g. daily cron) so `/analytics/summary` and `/insights` have up-to-date data. Run `recommendations_v1` after daily stats; run `cluster_users` after daily features if segmentation is used.
