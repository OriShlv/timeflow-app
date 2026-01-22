/* Replay messages from DLQ stream back to main stream.
 *
 * Usage:
 *  OPS_REDIS_URL=redis://localhost:6379 node server/scripts/replay-dlq.js --count 10 --delete
 *  node server/scripts/replay-dlq.js --count 5 --dry-run
 *
 * Notes:
 * - This re-enqueues DLQ entries into the main stream.
 * - If your worker logic is not idempotent, replay can double-apply effects.
 */

const Redis = require("ioredis");

const STREAM = process.env.REPLAY_STREAM ?? "timeflow.events";
const DLQ_STREAM = process.env.REPLAY_DLQ_STREAM ?? "timeflow.events.dlq";
const REDIS_URL = process.env.OPS_REDIS_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";

function parseArgs(argv) {
    const out = { count: 10, dryRun: false, del: false, from: null };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--count") {
            out.count = Number(argv[++i] ?? "10");
        } else if (a === "--dry-run") {
            out.dryRun = true;
        } else if (a === "--delete") {
            out.del = true;
        } else if (a === "--from") {
            out.from = argv[++i] ?? null; // DLQ entry id to start from (inclusive)
        }
    }

    if (!Number.isFinite(out.count) || out.count <= 0) {
        out.count = 10;
    }
    
    return out;
}

function fieldsArrayToObject(fields) {
    const obj = {};
    for (let i = 0; i < fields.length; i += 2) {
        obj[String(fields[i])] = fields[i + 1];
    }

    return obj;
}

function objectToKvPairs(obj) {
    const kv = [];
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) {
            continue;
        }

        kv.push(k, String(v));
    }

    return kv;
}

async function main() {
    const args = parseArgs(process.argv);
    const redis = new Redis(REDIS_URL);

    try {
        const startId = args.from ?? "-";
        const entries = await redis.xrange(DLQ_STREAM, startId, "+", "COUNT", String(args.count));

        if (!entries.length) {
            console.log(`[replay] DLQ empty: ${DLQ_STREAM}`);
            return;
        }

        console.log(`[replay] found=${entries.length} dryRun=${args.dryRun} delete=${args.del}`);
        let replayed = 0;
        let deleted = 0;

        for (const entry of entries) {
            const dlqId = entry[0];
            const fields = entry[1];
            const payload = fieldsArrayToObject(fields);

            // Attach metadata so we can trace a replay in logs/metrics
            const replayPayload = {
                ...payload,
                replay: "true",
                replayedAt: new Date().toISOString(),
                dlqId,
            };

            const kv = objectToKvPairs(replayPayload);

            if (args.dryRun) {
                console.log(`[dry-run] would XADD ${STREAM} from dlqId=${dlqId} eventId=${payload.eventId ?? "?"} type=${payload.type ?? "?"}`);
                continue;
            }

            await redis.xadd(STREAM, "*", ...kv);
            replayed++;

            if (args.del) {
                await redis.xdel(DLQ_STREAM, dlqId);
                deleted++;
            }
        }

        console.log(`[replay] done replayed=${replayed} deleted=${deleted}`);
    } finally {
        redis.disconnect();
    }
}

main().catch((e) => {
    console.error("[replay] failed:", e);
    process.exit(1);
});
