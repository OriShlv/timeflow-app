const OPS_URL = process.env.OPS_URL ?? "http://localhost:3000/ops/realtime";
const TOKEN = process.env.OPS_TOKEN;

if (!TOKEN) {
  console.error("OPS_TOKEN is missing");
  process.exit(1);
}

async function run() {
    const res = await fetch(OPS_URL, {
        headers: { Authorization: `Bearer ${TOKEN}` },
    });

    if (!res.ok) {
        console.error("Smoke test failed: HTTP", res.status);
        process.exit(1);
    }

    const body = await res.json();

    if (!body.ok) {
        console.error("Smoke test failed: ok=false");
        process.exit(1);
    }

    if (!body.health.workerHealthy) {
        console.error("Smoke test failed: worker not healthy");
        process.exit(1);
    }

    if (body.health.dlqHasItems) {
        console.error("Smoke test warning: DLQ has items");
        process.exit(1);
    }

    console.log("Realtime smoke test OK");
}

run().catch((e) => {
    console.error("Smoke test crashed:", e);
    process.exit(1);
});
