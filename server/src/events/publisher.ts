import { redis } from '../queue/redis';
import { prisma } from '../db/prisma';
import { HttpError } from '../app/errors/http-error';

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

  if (!ev) {
    throw new HttpError(500, 'TaskEventNotFound', `Task event not found for publish. eventId=${eventId}`);
  }

  if (!ev.taskId) {
    throw new HttpError(500, 'TaskEventMissingTaskId', `Task event is missing taskId. eventId=${eventId}`);
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
    await prisma.taskEvent.update({
      where: { id: eventId },
      data: {
        processedAt: new Date(),
        attempts: { increment: 1 },
        lastError: null,
      },
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    await prisma.taskEvent.update({
      where: { id: eventId },
      data: {
        attempts: { increment: 1 },
        lastError: errorMessage,
      },
    });

    throw new HttpError(
      503,
      'TaskEventPublishFailed',
      `Task event publish failed. eventId=${eventId} stream=${STREAM} reason=${errorMessage}`,
    );
  }
}
