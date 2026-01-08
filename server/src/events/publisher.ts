import { redis } from "../queue/redis";

const QUEUE_KEY = "timeflow:events";

export type PublishedEvent = {
    eventId: string;
    type: string;
};

export async function publishEvent(evt: PublishedEvent) {
    // List-based queue: producer pushes JSON
    await redis.lpush(QUEUE_KEY, JSON.stringify(evt));
}

