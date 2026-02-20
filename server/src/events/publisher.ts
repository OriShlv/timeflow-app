import { redis } from '../queue/redis';
import { prisma } from '../db/prisma';

const STREAM = 'timeflow.events';

export async function publishEventById(eventId: string) {
  const ev = await prisma.taskEvent.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      type: true,
      userId: true,
      taskId: true,
      createdAt: true,
    },
  });

  if (!ev || !ev.taskId) {
    return;
  }

  const fields: Record<string, string> = {
    version: '1',
    eventId: ev.id,
    type: ev.type,
    userId: ev.userId,
    createdAt: ev.createdAt.toISOString(),
  };
  if (ev.taskId) {
    fields.taskId = ev.taskId;
  }

  try {
    await redis.xadd(STREAM, '*', ...Object.entries(fields).flat());
  } catch (e) {
    console.error('[publisher] redis xadd failed', e);
  }
}
