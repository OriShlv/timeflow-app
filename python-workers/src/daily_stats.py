import os
from datetime import datetime, timezone, timedelta, date

import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

def utc_day_start(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)

def compute_for_day(conn, day: date):
    start = utc_day_start(day)
    end = start + timedelta(days=1)

    with conn.cursor() as cur:
        # Counts per user for the day
        cur.execute(
            """
            SELECT "userId",
                   COUNT(*) FILTER (WHERE type = 'TASK_CREATED') AS created_count,
                   COUNT(*) FILTER (WHERE type = 'TASK_COMPLETED') AS completed_count
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

            # Upsert into DailyUserStats
            cur.execute(
                """
                INSERT INTO "DailyUserStats" ("userId", day, "createdCount", "completedCount", "completionRate")
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT ("userId", day)
                DO UPDATE SET
                  "createdCount" = EXCLUDED."createdCount",
                  "completedCount" = EXCLUDED."completedCount",
                  "completionRate" = EXCLUDED."completionRate",
                  "updatedAt" = now()
                """,
                (user_id, start, created_count, completed_count, completion_rate),
            )

        conn.commit()

    print(f"[daily-stats] done for {day.isoformat()} users={len(rows)}")

def main():
    # default: day in UTC
    today = datetime.now(timezone.utc).date()

    with psycopg.connect(DATABASE_URL) as conn:
        compute_for_day(conn, today)

if __name__ == "__main__":
    main()
