import os
from datetime import datetime, timezone, timedelta

import psycopg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.environ["DATABASE_URL"]

def utc_now():
    return datetime.now(timezone.utc)

def upsert_rec(cur, user_id: str, rec_type: str, score: float, message: str, evidence: dict, ttl_hours: int = 24):
    expires_at = utc_now() + timedelta(hours=ttl_hours)

    cur.execute(
        """
        INSERT INTO "UserRecommendation" ("userId", type, score, message, evidence, "expiresAt")
        VALUES (%s, %s, %s, %s, %s::jsonb, %s)
        ON CONFLICT ("userId", type)
        DO UPDATE SET
          score = EXCLUDED.score,
          message = EXCLUDED.message,
          evidence = EXCLUDED.evidence,
          "expiresAt" = EXCLUDED."expiresAt",
          "updatedAt" = now()
        """,
        (user_id, rec_type, score, message, psycopg.types.json.Jsonb(evidence), expires_at),
    )

def main():
    now = utc_now()
    start = now - timedelta(days=7)

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # 7-day aggregates per user
            cur.execute(
                """
                SELECT "userId",
                       SUM("createdCount")::int AS created_7d,
                       SUM("completedCount")::int AS completed_7d,
                       AVG("completionRate")::float AS avg_rate_7d
                FROM "DailyUserStats"
                WHERE day >= %s
                GROUP BY "userId"
                """,
                (datetime(start.year, start.month, start.day, tzinfo=timezone.utc),),
            )

            rows = cur.fetchall()

            for user_id, created_7d, completed_7d, avg_rate_7d in rows:
                created_7d = int(created_7d or 0)
                completed_7d = int(completed_7d or 0)
                avg_rate_7d = float(avg_rate_7d or 0.0)

                # Rec 1: low completion rate
                if created_7d >= 5 and avg_rate_7d < 0.4:
                    score = min(1.0, (0.4 - avg_rate_7d) / 0.4 + 0.3)
                    upsert_rec(
                        cur,
                        user_id,
                        "LOW_COMPLETION_RATE",
                        score,
                        "נראה שאתה מוסיף יותר משימות ממה שאתה מסיים. נסה לצמצם את רשימת היום ל-3 משימות מרכזיות ולתת עדיפות אחת ברורה בבוקר.",
                        {
                            "windowDays": 7,
                            "created": created_7d,
                            "completed": completed_7d,
                            "avgCompletionRate": avg_rate_7d
                        },
                        ttl_hours=24,
                    )

                # Rec 2: high WIP pressure
                if created_7d >= 15 and completed_7d < created_7d * 0.5:
                    score = min(1.0, (created_7d - completed_7d) / max(1, created_7d))
                    upsert_rec(
                        cur,
                        user_id,
                        "HIGH_WIP",
                        score,
                        "העומס נראה גבוה השבוע. מומלץ להקפיא יצירת משימות חדשות ליום אחד ולהתמקד בסגירה של משימות פתוחות.",
                        {
                            "windowDays": 7,
                            "created": created_7d,
                            "completed": completed_7d,
                            "openDelta": created_7d - completed_7d
                        },
                        ttl_hours=24,
                    )

            conn.commit()

    print(f"[recs] generated for users={len(rows)}")

if __name__ == "__main__":
    main()
