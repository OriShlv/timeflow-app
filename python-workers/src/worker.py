import json
import os
import time
from datetime import datetime, timezone

import redis
import psycopg
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ["REDIS_URL"]
DATABASE_URL = os.environ["DATABASE_URL"]
QUEUE_KEY = os.environ.get("QUEUE_KEY", "timeflow:events")

r = redis.Redis.from_url(REDIS_URL, decode_responses=True)

def utc_now():
    return datetime.now(timezone.utc)

def process_event(conn, event_id: str, event_type: str):
    with conn.cursor() as cur:
        cur.execute(
            'SELECT id, type, "processedAt", attempts FROM "TaskEvent" WHERE id = %s',
            (event_id,)
        )
        row = cur.fetchone()
        if not row:
            print(f"[worker] event not found: {event_id}")
            return

        _id, _type, processed_at, attempts = row

        if processed_at is not None:
            print(f"[worker] already processed: {event_id}")
            return

        # here in the future we will do analytics / recommendations. currently we just mark as processed.
        cur.execute(
            'UPDATE "TaskEvent" SET "processedAt" = %s, attempts = attempts + 1, "lastError" = NULL WHERE id = %s',
            (utc_now(), event_id)
        )
        conn.commit()
        print(f"[worker] processed {event_type} event_id={event_id} (attempts was {attempts})")

def main():
    print(f"[worker] listening on redis list: {QUEUE_KEY}")

    # connect to database once
    with psycopg.connect(DATABASE_URL) as conn:
        while True:
            # BRPOP wait until there is a message
            item = r.brpop(QUEUE_KEY, timeout=10)
            if item is None:
                continue

            _, raw = item
            try:
                msg = json.loads(raw)
                event_id = msg["eventId"]
                event_type = msg.get("type", "UNKNOWN")
                process_event(conn, event_id, event_type)
            except Exception as e:
                print(f"[worker] error: {e}")
                time.sleep(1)

if __name__ == "__main__":
    main()
