# Redis Streams Event Contract

This document defines the canonical event format and conventions for the TimeFlow event pipeline. All publishers and consumers must adhere to this contract.

## Why Redis Streams

TimeFlow uses **Redis Streams** (not Redis Lists) for event processing because:

- **Consumer groups**: Multiple worker types can consume the same stream independently, each with its own read position and acknowledgment.
- **At-least-once delivery**: Messages are acknowledged only after successful processing; unacked messages can be claimed by other consumers.
- **Replay capability**: Messages remain in the stream until trimmed; DLQ and replay tooling support operational recovery.
- **Ordering**: Events are ordered by insertion time within a stream, preserving causality for analytics.

## Stream Names

| Stream | Purpose |
|--------|---------|
| `timeflow.events` | Primary event stream; all task events are published here |
| `timeflow.events.dlq` | Dead-letter queue for messages that exceed retry limits |

## Event Format (v1)

All field values are strings (Redis Streams requirement). Each message in `timeflow.events` is a Redis Stream entry with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Contract version, e.g. `"1"`. Enables future schema evolution. |
| `eventId` | string | Yes | UUID/cuid of the `TaskEvent` record in Postgres. Used for idempotency and DB lookups. |
| `type` | string | Yes | Event type. Known values: `TASK_CREATED`, `TASK_COMPLETED`, `TASK_CANCELED`. |
| `userId` | string | Yes | ID of the user who owns the task. |
| `taskId` | string | Yes* | ID of the task. May be null for some event types. |
| `createdAt` | string | Yes | ISO 8601 timestamp (UTC), e.g. `"2026-01-14T14:20:57.153Z"`. |

\* The publisher currently omits `taskId` when the event has no task; consumers should handle missing `taskId` gracefully.

## Versioning

- **v1** (current): Fields as defined above. No breaking changes within v1.
- Future versions: New fields may be added; consumers must ignore unknown fields. Breaking changes require a new version and migration path.

## Publisher (Node.js)

The server publishes events via `server/src/events/publisher.ts` when creating `TaskEvent` records (e.g. on task create or completion). It uses `XADD` to append to `timeflow.events` with `*` for auto-generated stream IDs.

## Consumers (Python Workers)

All Python workers consume from `timeflow.events` using **consumer groups** and `XREADGROUP`. Each worker type uses a distinct consumer group so that processing is independent.

| Worker | Consumer Group | Purpose |
|--------|----------------|---------|
| `realtime_worker.py` | `realtime-features` | Updates `DailyUserFeatures` and `UserSegment` |
| `worker.py` (event-processor) | `event-processor` | Marks `TaskEvent` as processed (`processedAt`, `attempts`) |

### Consumer Requirements

- Create the consumer group with `XGROUP CREATE` (id `0-0`, `mkstream=true`) before consuming.
- Use `XREADGROUP` with `>` to read new messages.
- Acknowledge with `XACK` only after successful processing.
- On failure: retry up to `MAX_RETRIES`; after exhaustion, move to `timeflow.events.dlq` and `XACK` the original message.
- DLQ entries include original fields plus `msgId` (stream ID) and `error` (last error message).

### Field Parsing

- `createdAt`: Parse as ISO 8601; handle `Z` suffix by converting to `+00:00` for `datetime.fromisoformat()`.
- `taskId`: May be absent; treat as optional for analytics that don't require it.
- `version`: Ignore unknown versions or log and skip; do not crash.

## DLQ and Replay

- Failed messages are written to `timeflow.events.dlq` with the same field structure plus `msgId` and `error`.
- Use `server/scripts/replay-dlq.js` or equivalent tooling to replay DLQ messages back to the main stream after fixing issues.
