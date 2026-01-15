import { redis } from "../queue/redis";
import { prisma } from "../db/prisma";

const QUEUE_KEY = "timeflow:events";
const STREAM = "timeflow.events";

export async function publishEventById(eventId: string) {
    const ev = await prisma.taskEvent.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        type: true,
        userId: true,
        taskId: true,
        createdAt: true
      }
    });
  
    if (!ev || !ev.taskId) {
        return;
    }

    await redis.xadd(
        STREAM,
        "*",
        "eventId", ev.id,
        "type", ev.type,
        "userId", ev.userId,
        "taskId", ev.taskId,
        "createdAt", ev.createdAt.toISOString()
      );
      
  }
