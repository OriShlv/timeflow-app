import os
from datetime import datetime, timezone, timedelta, date

import psycopg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]

def utc_day_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)

def bucket_hour(h: int):
    if 5 <= h <= 11:
        return "morning"
    if 12 <= h <= 17:
        return "afternoon"
    if 18 <= h <= 23:
        return "evening"
    return "night"

def compute_for_day(conn, day: date):
    start = utc_day_start(day)
    end = start + timedelta(days=1)
    now = datetime.now(timezone.utc)

    with conn.cursor() as cur:
        # Created/Completed counts via TaskEvent
        cur.execute(
            """
            SELECT "userId",
                   COUNT(*) FILTER (WHERE type='TASK_CREATED')::int AS created_count,
                   COUNT(*) FILTER (WHERE type='TASK_COMPLETED')::int AS completed_count
            FROM "TaskEvent"
            WHERE "createdAt" >= %s AND "createdAt" < %s
            GROUP BY "userId"
            """,
            (start, end),
        )
        rows = cur.fetchall()

        for user_id, created_count, completed_count in rows:
            created_count = int(created_count or 0)
            completed_count = int(completed_count or 0)
            completion_rate = (completed_count / created_count) if created_count > 0 else 0.0

            # Tasks with dueAt & overdue (as of now) for that user
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

            # Completion lag average (hours): join TASK_CREATED and TASK_COMPLETED by taskId within window
            cur.execute(
                """
                WITH created AS (
                  SELECT "taskId", MIN("createdAt") AS c_at
                  FROM "TaskEvent"
                  WHERE type='TASK_CREATED' AND "createdAt" >= %s AND "createdAt" < %s AND "userId" = %s
                  GROUP BY "taskId"
                ),
                completed AS (
                  SELECT "taskId", MIN("createdAt") AS d_at
                  FROM "TaskEvent"
                  WHERE type='TASK_COMPLETED' AND "createdAt" >= %s AND "createdAt" < %s AND "userId" = %s
                  GROUP BY "taskId"
                )
                SELECT AVG(EXTRACT(EPOCH FROM (completed.d_at - created.c_at))/3600.0)::float
                FROM created
                JOIN completed USING ("taskId")
                """,
                (start, end, user_id, start, end, user_id),
            )
            avg_lag = cur.fetchone()[0]
            avg_lag = float(avg_lag or 0.0)

            # Created time buckets
            cur.execute(
                """
                SELECT EXTRACT(HOUR FROM "createdAt")::int AS hour, COUNT(*)::int
                FROM "TaskEvent"
                WHERE type='TASK_CREATED' AND "createdAt" >= %s AND "createdAt" < %s AND "userId" = %s
                GROUP BY hour
                """,
                (start, end, user_id),
            )
            buckets = {"morning": 0, "afternoon": 0, "evening": 0, "night": 0}
            for hour, cnt in cur.fetchall():
                buckets[bucket_hour(int(hour))] += int(cnt)

            cur.execute(
                """
                INSERT INTO "DailyUserFeatures" (
                  "userId", day,
                  "createdCount", "completedCount", "completionRate",
                  "tasksWithDueAt", "overdueCount",
                  "avgCompletionLagH",
                  "createdMorning", "createdAfternoon", "createdEvening", "createdNight"
                )
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT ("userId", day)
                DO UPDATE SET
                  "createdCount" = EXCLUDED."createdCount",
                  "completedCount" = EXCLUDED."completedCount",
                  "completionRate" = EXCLUDED."completionRate",
                  "tasksWithDueAt" = EXCLUDED."tasksWithDueAt",
                  "overdueCount" = EXCLUDED."overdueCount",
                  "avgCompletionLagH" = EXCLUDED."avgCompletionLagH",
                  "createdMorning" = EXCLUDED."createdMorning",
                  "createdAfternoon" = EXCLUDED."createdAfternoon",
                  "createdEvening" = EXCLUDED."createdEvening",
                  "createdNight" = EXCLUDED."createdNight",
                  "updatedAt" = now()
                """,
                (
                    user_id, start,
                    created_count, completed_count, completion_rate,
                    tasks_with_due, overdue_count,
                    avg_lag,
                    buckets["morning"], buckets["afternoon"], buckets["evening"], buckets["night"],
                ),
            )

        conn.commit()

    print(f"[features] done for {day.isoformat()} users={len(rows)}")

def main():
    today = datetime.now(timezone.utc).date()
    with psycopg.connect(DATABASE_URL) as conn:
        compute_for_day(conn, today)

if __name__ == "__main__":
    main()
