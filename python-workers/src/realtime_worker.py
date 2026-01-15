import os
import json
from datetime import datetime, timezone, timedelta, date

import redis
import psycopg
import time
from dotenv import load_dotenv
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

STREAM = "timeflow.events"
GROUP = "realtime-features"
CONSUMER = os.environ.get("WORKER_NAME", "worker-1")
DLQ_STREAM = "timeflow.events.dlq"

BLOCK_MS = 5000
BATCH_COUNT = 10
HEARTBEAT_EVERY_SEC = 10
HEARTBEAT_TTL_SEC = 30

MAX_RETRIES = 5
ATTEMPTS_TTL_SEC = 3600

def utc_day_start(dt: datetime) -> datetime:
    d = dt.date()
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)

def ensure_group(r: redis.Redis):
    try:
        r.xgroup_create(STREAM, GROUP, id="0-0", mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" in str(e):
            return
        raise

def parse_iso(s: str) -> datetime:
    # "2026-01-14T14:20:57.153Z"
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)

def upsert_daily_features_for_user_day(conn, user_id: str, day_start: datetime):
    day_end = day_start + timedelta(days=1)
    now = datetime.now(timezone.utc)

    with conn.cursor() as cur:
        # counts from TaskEvent in that day
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE type='TASK_CREATED')::int AS created_count,
              COUNT(*) FILTER (WHERE type='TASK_COMPLETED')::int AS completed_count
            FROM "TaskEvent"
            WHERE "userId" = %s AND "createdAt" >= %s AND "createdAt" < %s
            """,
            (user_id, day_start, day_end),
        )
        created_count, completed_count = cur.fetchone()
        created_count = int(created_count or 0)
        completed_count = int(completed_count or 0)
        completion_rate = (completed_count / created_count) if created_count > 0 else 0.0

        # due/overdue snapshot
        cur.execute(
            """
            SELECT
              COUNT(*) FILTER (WHERE "dueAt" IS NOT NULL)::int AS tasks_with_due,
              COUNT(*) FILTER (WHERE "dueAt" IS NOT NULL AND status != 'DONE' AND "dueAt" < %s)::int AS overdue_count
            FROM "Task"
            WHERE "userId" = %s
            """,
            (now, user_id),
        )
        tasks_with_due, overdue_count = cur.fetchone()
        tasks_with_due = int(tasks_with_due or 0)
        overdue_count = int(overdue_count or 0)

        # avg completion lag (hours)
        cur.execute(
            """
            WITH created AS (
              SELECT "taskId", MIN("createdAt") AS c_at
              FROM "TaskEvent"
              WHERE type='TASK_CREATED' AND "userId"=%s AND "createdAt">=%s AND "createdAt"<%s
              GROUP BY "taskId"
            ),
            completed AS (
              SELECT "taskId", MIN("createdAt") AS d_at
              FROM "TaskEvent"
              WHERE type='TASK_COMPLETED' AND "userId"=%s AND "createdAt">=%s AND "createdAt"<%s
              GROUP BY "taskId"
            )
            SELECT AVG(EXTRACT(EPOCH FROM (completed.d_at - created.c_at))/3600.0)::float
            FROM created JOIN completed USING ("taskId")
            """,
            (user_id, day_start, day_end, user_id, day_start, day_end),
        )
        avg_lag = float(cur.fetchone()[0] or 0.0)

        # hour buckets for created
        cur.execute(
            """
            SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::int
            FROM "TaskEvent"
            WHERE type='TASK_CREATED' AND "userId"=%s AND "createdAt">=%s AND "createdAt"<%s
            GROUP BY hour
            """,
            (user_id, day_start, day_end),
        )
        buckets = {"morning": 0, "afternoon": 0, "evening": 0, "night": 0}
        for hour, cnt in cur.fetchall():
            h = int(hour)
            if 5 <= h <= 11: buckets["morning"] += int(cnt)
            elif 12 <= h <= 17: buckets["afternoon"] += int(cnt)
            elif 18 <= h <= 23: buckets["evening"] += int(cnt)
            else: buckets["night"] += int(cnt)

        cur.execute(
            """
            INSERT INTO "DailyUserFeatures" (
              "userId", day,
              "createdCount","completedCount","completionRate",
              "tasksWithDueAt","overdueCount",
              "avgCompletionLagH",
              "createdMorning","createdAfternoon","createdEvening","createdNight",
              "updatedAt"
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s, now())
            ON CONFLICT ("userId", day)
            DO UPDATE SET
              "createdCount"=EXCLUDED."createdCount",
              "completedCount"=EXCLUDED."completedCount",
              "completionRate"=EXCLUDED."completionRate",
              "tasksWithDueAt"=EXCLUDED."tasksWithDueAt",
              "overdueCount"=EXCLUDED."overdueCount",
              "avgCompletionLagH"=EXCLUDED."avgCompletionLagH",
              "createdMorning"=EXCLUDED."createdMorning",
              "createdAfternoon"=EXCLUDED."createdAfternoon",
              "createdEvening"=EXCLUDED."createdEvening",
              "createdNight"=EXCLUDED."createdNight",
              "updatedAt"=now()
            """,
            (
                user_id, day_start,
                created_count, completed_count, completion_rate,
                tasks_with_due, overdue_count,
                avg_lag,
                buckets["morning"], buckets["afternoon"], buckets["evening"], buckets["night"],
            ),
        )

def recompute_segment_for_user(conn, user_id: str, days: int = 30, k: int = 3):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    start_day = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT day,
                   "createdCount","completedCount","completionRate",
                   "overdueCount","avgCompletionLagH",
                   "createdMorning","createdAfternoon","createdEvening","createdNight"
            FROM "DailyUserFeatures"
            WHERE "userId"=%s AND day >= %s
            ORDER BY day ASC
            """,
            (user_id, start_day),
        )
        rows = cur.fetchall()

        if not rows:
            return

        # aggregate across window
        arr = np.array([r[1:] for r in rows], dtype=float)
        agg = np.array([
            arr[:,0].sum(),  # createdCount
            arr[:,1].sum(),  # completedCount
            arr[:,2].mean(), # completionRate
            arr[:,3].mean(), # overdueCount
            arr[:,4].mean(), # avgCompletionLagH
            arr[:,5].sum(),  # createdMorning
            arr[:,6].sum(),  # createdAfternoon
            arr[:,7].sum(),  # createdEvening
            arr[:,8].sum(),  # createdNight
        ], dtype=float)

        # For single-user realtime, KMeans is overkill; we'll label by rules using agg.
        created, completed, rate, overdue, lag, m, a, e, n = agg
        if rate >= 0.7 and overdue < 1:
            label = "Finisher"
            segment = 0
        elif created > 20 and rate < 0.5:
            label = "Overplanner"
            segment = 1
        elif n > max(m, a, e):
            label = "Night Owl"
            segment = 2
        elif overdue >= 2:
            label = "Deadline Struggler"
            segment = 3
        else:
            label = "Balanced"
            segment = 4

        centroid = {
            "createdCount": float(created),
            "completedCount": float(completed),
            "completionRate": float(rate),
            "overdueCount": float(overdue),
            "avgCompletionLagH": float(lag),
            "createdMorning": float(m),
            "createdAfternoon": float(a),
            "createdEvening": float(e),
            "createdNight": float(n),
        }

        cur.execute(
            """
            INSERT INTO "UserSegment" ("userId", segment, label, centroid, "featuresRef", "updatedAt")
            VALUES (%s,%s,%s,%s::jsonb,%s::jsonb, now())
            ON CONFLICT ("userId")
            DO UPDATE SET
              segment=EXCLUDED.segment,
              label=EXCLUDED.label,
              centroid=EXCLUDED.centroid,
              "featuresRef"=EXCLUDED."featuresRef",
              "updatedAt"=now()
            """,
            (
                user_id,
                segment,
                label,
                json.dumps(centroid),
                json.dumps({"windowDays": days, "from": start_day.isoformat(), "realtime": True}),
            ),
        )

def handle_message(conn, fields: dict):
    user_id = fields["userId"]
    created_at = parse_iso(fields["createdAt"])
    day_start = utc_day_start(created_at)

    upsert_daily_features_for_user_day(conn, user_id, day_start)
    recompute_segment_for_user(conn, user_id)

def main():
    print(f"[realtime] up consumer={CONSUMER} group={GROUP} stream={STREAM}", flush=True)
    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    ensure_group(r)
    print(f"[realtime] group={GROUP} created successfully", flush=True)

    with psycopg.connect(DATABASE_URL) as conn:
        last_hb = 0
        while True:
            now = time.time()
            if now - last_hb > HEARTBEAT_EVERY_SEC:
                r.set(f"timeflow:worker:{CONSUMER}:heartbeat", datetime.now(timezone.utc).isoformat(), ex=HEARTBEAT_TTL_SEC)
                last_hb = now

            resp = r.xreadgroup(GROUP, CONSUMER, {STREAM: ">"}, count=BATCH_COUNT, block=BLOCK_MS)
            if not resp:
                continue

            for stream_name, messages in resp:
                for msg_id, kv in messages:
                    try:
                        handle_message(conn, kv)
                        conn.commit()
                        r.xack(STREAM, GROUP, msg_id)
                    except Exception as e:
                        conn.rollback()
                        attempts_key = f"timeflow:attempts:{msg_id}"
                        attempts = r.incr(attempts_key)
                        r.expire(attempts_key, ATTEMPTS_TTL_SEC)

                        if attempts >= MAX_RETRIES:
                            r.xadd(DLQ_STREAM, "*", {"msgId": msg_id, **kv, "error": str(e)})
                            r.xack(STREAM, GROUP, msg_id)
                            print("[realtime] moved to DLQ", msg_id, str(e))
                        else:
                            print("[realtime] retry later", msg_id, "attempt", attempts, str(e))


if __name__ == "__main__":
    main()
