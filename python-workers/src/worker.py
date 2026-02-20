"""
Event processor worker: consumes from Redis Streams and marks TaskEvent as processed.

Consumes from timeflow.events (consumer group: event-processor).
See docs/EVENTS_CONTRACT.md for the event format and conventions.
"""

import os
import time
from datetime import datetime, timezone

import redis
import psycopg
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
DATABASE_URL = os.environ["DATABASE_URL"]

STREAM = "timeflow.events"
GROUP = "event-processor"
CONSUMER = os.environ.get("WORKER_NAME", "event-processor-1")
DLQ_STREAM = "timeflow.events.dlq"

BLOCK_MS = 5000
BATCH_COUNT = 10

MAX_RETRIES = 5
ATTEMPTS_TTL_SEC = 3600


def utc_now():
    return datetime.now(timezone.utc)


def ensure_group(r: redis.Redis):
    try:
        r.xgroup_create(STREAM, GROUP, id="0-0", mkstream=True)
    except redis.exceptions.ResponseError as e:
        if "BUSYGROUP" in str(e):
            return
        raise


def process_event(conn, event_id: str, event_type: str):
    with conn.cursor() as cur:
        cur.execute(
            'SELECT id, type, "processedAt", attempts FROM "TaskEvent" WHERE id = %s',
            (event_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError(f"event not found: {event_id}")

        _id, _type, processed_at, attempts = row

        if processed_at is not None:
            return  # already processed, idempotent

        cur.execute(
            'UPDATE "TaskEvent" SET "processedAt" = %s, attempts = attempts + 1, "lastError" = NULL WHERE id = %s',
            (utc_now(), event_id),
        )
        conn.commit()
        print(f"[worker] processed {event_type} event_id={event_id} (attempts was {attempts})")


def main():
    print(f"[worker] listening on stream={STREAM} group={GROUP} consumer={CONSUMER}")

    r = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    ensure_group(r)

    with psycopg.connect(DATABASE_URL) as conn:
        while True:
            resp = r.xreadgroup(GROUP, CONSUMER, {STREAM: ">"}, count=BATCH_COUNT, block=BLOCK_MS)
            if not resp:
                continue

            for stream_name, messages in resp:
                for msg_id, kv in messages:
                    event_id = kv.get("eventId")
                    event_type = kv.get("type", "UNKNOWN")

                    if not event_id:
                        print("[worker] skipping message without eventId:", msg_id)
                        r.xack(STREAM, GROUP, msg_id)
                        continue

                    try:
                        process_event(conn, event_id, event_type)
                        r.xack(STREAM, GROUP, msg_id)
                    except Exception as e:
                        conn.rollback()
                        attempts_key = f"timeflow:attempts:{msg_id}"
                        attempts = r.incr(attempts_key)
                        r.expire(attempts_key, ATTEMPTS_TTL_SEC)

                        if attempts >= MAX_RETRIES:
                            r.xadd(DLQ_STREAM, {"msgId": msg_id, **kv, "error": str(e)})
                            r.xack(STREAM, GROUP, msg_id)
                            print("[worker] moved to DLQ", msg_id, str(e))
                        else:
                            print("[worker] retry later", msg_id, "attempt", attempts, str(e))


if __name__ == "__main__":
    main()
