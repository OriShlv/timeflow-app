import { Router } from "express";
import { redis } from "../../queue/redis";

const STREAM = "timeflow.events";
const GROUP = "realtime-features";
const DLQ_STREAM = "timeflow.events.dlq";
const HB_PATTERN = "timeflow:worker:*:heartbeat";
const DLQ_SAMPLE_COUNT = 2;
const PENDING_SAMPLE_COUNT = 10;


export const opsRouter = Router();

opsRouter.get("/realtime", async (_req, res, next) => {
    try {
        const [len, dlqLen] = await Promise.all([
            redis.xlen(STREAM),
            redis.xlen(DLQ_STREAM),
        ]);

        // stream / group info
        const [groups, consumers, pendingSummary] = await Promise.all([
            redis.xinfo("GROUPS", STREAM).catch(() => []),
            redis.xinfo("CONSUMERS", STREAM, GROUP).catch(() => []),
            redis.xpending(STREAM, GROUP).catch(() => null),
        ]);

        // pending details (optional)
        const pending = await redis.xpending(STREAM, GROUP, "-", "+", PENDING_SAMPLE_COUNT).catch(() => []);

        // heartbeats
        const hbKeys = await redis.keys(HB_PATTERN);
        const hbValues = hbKeys.length ? await redis.mget(...hbKeys) : [];
        const nowMs = Date.now();

        const heartbeats = hbKeys.map((key, i) => {
            const v = hbValues[i];
            const consumer = key.split(":")[2]; // timeflow:worker:<consumer>:heartbeat
            const ts = v ? Date.parse(v) : NaN;
            const ageSec = Number.isFinite(ts) ? Math.floor((nowMs - ts) / 1000) : null;
            return { consumer, lastSeen: v ?? null, ageSec };
        }).sort((a, b) => (a.ageSec ?? 1e9) - (b.ageSec ?? 1e9));

        // dlq sample
        const dlqSample = dlqLen > 0
            ? await redis.xrevrange(DLQ_STREAM, "+", "-", "COUNT", DLQ_SAMPLE_COUNT)
            : [];

        res.json({
            ok: true,
            stream: { name: STREAM, len },
            group: { name: GROUP, groups, consumers, pendingSummary, pending },
            workers: { heartbeats },
            dlq: { name: DLQ_STREAM, len: dlqLen, sample: dlqSample },
        });
    } catch (err) {
        next(err);
    }
});
