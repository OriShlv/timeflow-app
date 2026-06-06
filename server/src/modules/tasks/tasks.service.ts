import { prisma } from '../../db/prisma';
import { TaskStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { publishEventById } from '../../events/publisher';
import { HttpError } from '../../app/errors/http-error';

type ListParams = {
  userId: string;
  status?: TaskStatus;
  q?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
  sort: 'createdAt' | 'dueAt';
  order: 'asc' | 'desc';
};

export async function createTask(
  userId: string,
  data: { title: string; description?: string; dueAt?: Date },
) {
  const { task, eventId } = await prisma.$transaction(async (tx) => {
    const createdTask = await tx.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        dueAt: data.dueAt,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const event = await createTaskEvent(tx, {
      userId,
      taskId: createdTask.id,
      type: 'TASK_CREATED',
      payload: {
        title: createdTask.title,
      },
      dedupeKey: `TASK_CREATED:${createdTask.id}`,
    });

    return { task: createdTask, eventId: event?.id };
  });

  if (eventId) {
    await publishTaskEventAfterCommit(eventId);
  }

  return task;
}

export async function listTasks(params: ListParams) {
  const where: Prisma.TaskWhereInput = { userId: params.userId };

  if (params.status) {
    where.status = params.status;
  }

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
    ];
  }

  if (params.from || params.to) {
    where.createdAt = {};
    if (params.from) {
      where.createdAt.gte = params.from;
    }

    if (params.to) {
      where.createdAt.lte = params.to;
    }
  }

  const skip = (params.page - 1) * params.pageSize;
  const take = params.pageSize;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: { [params.sort]: params.order },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.task.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
  };
}

export async function updateTask(userId: string, taskId: string, data: Prisma.TaskUpdateInput) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.task.findFirst({ where: { id: taskId, userId } });
    if (!existing) {
      return null;
    }

    const nextStatus = data.status as TaskStatus | undefined;
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const event = existing.status !== 'DONE' && nextStatus === 'DONE'
      ? await createTaskEvent(tx, {
          userId,
          taskId: taskId,
          type: 'TASK_COMPLETED',
          payload: { from: existing.status, to: 'DONE' },
          dedupeKey: `TASK_COMPLETED:${taskId}`,
        })
      : null;

    return { updatedTask, eventId: event?.id };
  });

  if (!result) {
    return null;
  }

  if (result.eventId) {
    await publishTaskEventAfterCommit(result.eventId);
  }

  return result.updatedTask;
}

export async function deleteTask(userId: string, taskId: string) {
  const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
  if (!existing) {
    return false;
  }

  await prisma.task.delete({ where: { id: taskId } });
  return true;
}

async function publishTaskEventAfterCommit(eventId: string) {
  try {
    await publishEventById(eventId);
  } catch (e) {
    if (e instanceof HttpError && e.code === 'TaskEventPublishFailed') {
      // The task write has committed; the TaskEvent row keeps lastError for recovery.
      // eslint-disable-next-line no-console
      console.warn('[tasks] task event publish failed after commit', {
        eventId,
        errorMessage: e.message,
      });
      return;
    }

    throw e;
  }
}

async function createTaskEvent(
  tx: Prisma.TransactionClient,
  params: {
  userId: string;
  taskId?: string;
  type: string;
  payload?: Prisma.InputJsonValue;
  dedupeKey?: string;
}) {
  // If dedupeKey is exists, try ro create an event. If exists one, we will not repost the event.
  try {
    const ev = await tx.taskEvent.create({
      data: {
        userId: params.userId,
        taskId: params.taskId,
        type: params.type,
        payload: params.payload,
        dedupeKey: params.dedupeKey,
      },
      select: { id: true, type: true },
    });
    return ev;
  } catch (e: unknown) {
    const prismaErrorCode = typeof e === 'object' && e !== null && 'code' in e
      ? String((e as { code: unknown }).code)
      : null;
    // unique violation means an event already exists for this dedupe key
    if (prismaErrorCode === 'P2002') {
      return null;
    }
    throw e;
  }
}
