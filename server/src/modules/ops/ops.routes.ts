import { Router } from 'express';
import { redis } from '../../queue/redis';
import { env } from '../../config/env';
import { requireAuth } from '../../app/middleware/require-auth';
import { requireOpsAccess } from './ops.guard';

const STREAM = 'timeflow.events';
const GROUP = 'realtime-features';
const DLQ_STREAM = 'timeflow.events.dlq';
const HB_PATTERN = 'timeflow:worker:*:heartbeat';

// Tunables (keep in sync with python-workers)
const HEARTBEAT_MAX_AGE_SEC = 30;
const PENDING_SAMPLE_COUNT = 10;
const DLQ_SAMPLE_COUNT = 2;

type Warning = { where: string; message: string };

function kvArrayToObject(arr: unknown): Record<string, unknown> {
  if (!Array.isArray(arr)) {
    return {};
  }

  const obj: Record<string, unknown> = {};
  for (let i = 0; i < arr.length; i += 2) {
    const k = arr[i];
    const v = arr[i + 1];
    obj[String(k)] = v;
  }
  return obj;
}

function mapXinfoRows(rows: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(kvArrayToObject);
}

function safeParseIsoMs(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export const opsRouter = Router();

// Auth wiring:
// - OPS_DEV_ONLY=true: dev-only, no JWT required (guard will enforce NODE_ENV=development)
// - OPS_DEV_ONLY=false: require JWT + allowlist (guard checks req.user.email)
if (!env.OPS_DEV_ONLY) {
  opsRouter.use(requireAuth);
}

opsRouter.use(requireOpsAccess());

opsRouter.get('/realtime', async (_req, res) => {
  const warnings: Warning[] = [];

  // 1) Basic lengths (these should almost always work)
  const len = await redis.xlen(STREAM).catch((e) => {
    warnings.push({ where: 'xlen(stream)', message: e?.message ?? String(e) });
    return null;
  });

  const dlqLen = await redis.xlen(DLQ_STREAM).catch((e) => {
    warnings.push({ where: 'xlen(dlq)', message: e?.message ?? String(e) });
    return null;
  });

  // 2) XINFO GROUPS + CONSUMERS (parsed to objects)
  const groupsRows = await redis.xinfo('GROUPS', STREAM).catch((e) => {
    warnings.push({ where: 'xinfo(groups)', message: e?.message ?? String(e) });
    return [];
  });
  const groups = mapXinfoRows(groupsRows);

  const consumersRows = await redis.xinfo('CONSUMERS', STREAM, GROUP).catch((e) => {
    warnings.push({ where: 'xinfo(consumers)', message: e?.message ?? String(e) });
    return [];
  });
  const consumers = mapXinfoRows(consumersRows)
    .map((c) => ({
      name: String(c.name ?? ''),
      pending: typeof c.pending === 'number' ? c.pending : Number(c.pending ?? 0),
      idleMs: typeof c.idle === 'number' ? c.idle : Number(c.idle ?? 0),
    }))
    .filter((c) => c.name);

  const groupObj = groups.find((g) => String(g.name) === GROUP) ?? null;

  const groupInfo = {
    name: GROUP,
    consumers: consumers.length,
    pending: groupObj ? Number(groupObj.pending ?? 0) : null,
    lag: groupObj ? Number(groupObj.lag ?? 0) : null,
    lastDeliveredId: groupObj ? String(groupObj['last-delivered-id'] ?? '') : null,
    entriesRead: groupObj ? Number(groupObj['entries-read'] ?? 0) : null,
  };

  // 3) Pending details (optional, bounded)
  // NOTE: use String(...) for COUNT arg to avoid client overload issues
  const pendingDetails = await redis
    .xpending(STREAM, GROUP, '-', '+', String(PENDING_SAMPLE_COUNT))
    .catch((e) => {
      warnings.push({ where: 'xpending(details)', message: e?.message ?? String(e) });
      return [];
    });

  // Normalize pending details shape if available
  // In Redis, XPENDING ... returns array of entries: [id, consumer, idleMs, deliveries]
  const pendingSample = Array.isArray(pendingDetails)
    ? pendingDetails
        .slice(0, PENDING_SAMPLE_COUNT)
        .map((row: unknown) => {
          if (!Array.isArray(row) || row.length < 4) return null;
          return {
            id: String(row[0]),
            consumer: String(row[1]),
            idleMs: Number(row[2]),
            deliveries: Number(row[3]),
          };
        })
        .filter(Boolean)
    : [];

  // 4) Heartbeats
  // Dev note: KEYS is OK for local/dev. For prod, replace with a Set of consumers.
  const hbKeys = await redis.keys(HB_PATTERN).catch((e) => {
    warnings.push({ where: 'keys(heartbeat)', message: e?.message ?? String(e) });
    return [];
  });

  const hbValues = hbKeys.length
    ? await redis.mget(...hbKeys).catch((e) => {
        warnings.push({ where: 'mget(heartbeat)', message: e?.message ?? String(e) });
        return [];
      })
    : [];

  const nowMs = Date.now();
  const heartbeats = hbKeys
    .map((key, i) => {
      const val = hbValues[i];
      const consumer = key.split(':')[2] ?? key;
      const ts = safeParseIsoMs(val);
      const ageSec = ts ? Math.floor((nowMs - ts) / 1000) : null;
      return {
        consumer,
        lastSeen: typeof val === 'string' ? val : null,
        ageSec,
      };
    })
    .sort((a, b) => (a.ageSec ?? 1e9) - (b.ageSec ?? 1e9));

  // 5) DLQ sample (optional)
  // NOTE: use String(...) for COUNT arg to avoid overload issues
  const dlqSampleRaw =
    dlqLen && dlqLen > 0
      ? await redis
          .xrevrange(DLQ_STREAM, '+', '-', 'COUNT', String(DLQ_SAMPLE_COUNT))
          .catch((e) => {
            warnings.push({ where: 'xrevrange(dlq)', message: e?.message ?? String(e) });
            return [];
          })
      : [];

  // Normalize DLQ entries into key/value object
  // xrevrange returns: [[id, [k, v, k, v...]], ...]
  const dlqSample = Array.isArray(dlqSampleRaw)
    ? dlqSampleRaw
        .map((entry: unknown) => {
          if (!Array.isArray(entry) || entry.length < 2) return null;
          const id = String(entry[0]);
          const fieldsArr = entry[1];
          const fieldsObj = kvArrayToObject(fieldsArr);
          return { id, fields: fieldsObj };
        })
        .filter(Boolean)
    : [];

  // 6) Health summary
  const workerHealthy = heartbeats.some((h) => (h.ageSec ?? 1e9) <= HEARTBEAT_MAX_AGE_SEC);

  res.json({
    ok: true,
    health: {
      workerHealthy,
      streamOk: len !== null,
      dlqOk: dlqLen !== null,
      pendingCount: groupInfo.pending,
      lag: groupInfo.lag,
      dlqHasItems: (dlqLen ?? 0) > 0,
    },
    stream: {
      name: STREAM,
      len,
    },
    group: {
      ...groupInfo,
      consumerNames: consumers.map((c) => c.name),
      pendingSample,
    },
    workers: {
      heartbeats,
    },
    dlq: {
      name: DLQ_STREAM,
      len: dlqLen,
      sample: dlqSample,
    },
    warnings,
  });
});
