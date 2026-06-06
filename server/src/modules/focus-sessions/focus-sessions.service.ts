import type { FocusSessionStatus, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { HttpError } from '../../app/errors/http-error';
import { publishEventById } from '../../events/publisher';

type StartFocusSessionInput = {
  userId: string;
  taskId: string | undefined;
  plannedMinutes: number | undefined;
  source: string | undefined;
  notes: string | undefined;
};

type StopFocusSessionInput = {
  userId: string;
  focusSessionId: string;
  endedAt: Date;
};

type CancelFocusSessionInput = {
  userId: string;
  focusSessionId: string;
  endedAt: Date;
  notes: string | undefined;
};

type ListFocusSessionsParams = {
  userId: string;
  from: Date | undefined;
  to: Date | undefined;
  taskId: string | undefined;
  status: FocusSessionStatus | undefined;
  page: number;
  pageSize: number;
};

export async function startFocusSession(input: StartFocusSessionInput) {
  const { session, eventId } = await prisma.$transaction(async (tx) => {
    const running = await tx.focusSession.findFirst({
      where: { userId: input.userId, status: 'RUNNING' },
      select: { id: true },
    });
    if (running !== null) {
      throw new HttpError(409, 'FocusSessionAlreadyRunning');
    }

    if (input.taskId !== undefined) {
      const task = await tx.task.findFirst({
        where: { id: input.taskId, userId: input.userId },
        select: { id: true },
      });
      if (task === null) {
        throw new HttpError(404, 'TaskNotFound');
      }
    }

    const created = await tx.focusSession.create({
      data: {
        userId: input.userId,
        taskId: input.taskId,
        status: 'RUNNING',
        startedAt: new Date(),
        plannedMinutes: input.plannedMinutes,
        source: input.source ?? 'manual',
        notes: input.notes,
      },
    });

    const event = await createTaskEvent(tx, {
      userId: input.userId,
      taskId: input.taskId,
      type: 'FOCUS_SESSION_STARTED',
      payload: { focusSessionId: created.id, startedAt: created.startedAt.toISOString() },
      dedupeKey: `FOCUS_SESSION_STARTED:${created.id}`,
    });

    return { session: created, eventId: event?.id };
  });

  if (eventId !== undefined) {
    await publishEventById(eventId);
  }

  return session;
}

export async function stopFocusSession(input: StopFocusSessionInput) {
  const { session, eventId } = await prisma.$transaction(async (tx) => {
    const existing = await tx.focusSession.findFirst({
      where: { id: input.focusSessionId, userId: input.userId },
    });
    if (existing === null) {
      throw new HttpError(404, 'FocusSessionNotFound');
    }
    if (existing.status !== 'RUNNING') {
      throw new HttpError(409, 'FocusSessionNotRunning');
    }
    if (input.endedAt.getTime() < existing.startedAt.getTime()) {
      throw new HttpError(400, 'InvalidFocusSessionEndTime');
    }

    const actualMinutes = Math.floor(
      (input.endedAt.getTime() - existing.startedAt.getTime()) / 60000,
    );
    const updated = await tx.focusSession.update({
      where: { id: existing.id },
      data: {
        status: 'COMPLETED',
        endedAt: input.endedAt,
        actualMinutes,
      },
    });

    const event = await createTaskEvent(tx, {
      userId: input.userId,
      taskId: updated.taskId ?? undefined,
      type: 'FOCUS_SESSION_STOPPED',
      payload: {
        focusSessionId: updated.id,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString(),
        actualMinutes: updated.actualMinutes,
      },
      dedupeKey: `FOCUS_SESSION_STOPPED:${updated.id}`,
    });

    return { session: updated, eventId: event?.id };
  });

  if (eventId !== undefined) {
    await publishEventById(eventId);
  }

  return session;
}

export async function cancelFocusSession(input: CancelFocusSessionInput) {
  const { session, eventId } = await prisma.$transaction(async (tx) => {
    const existing = await tx.focusSession.findFirst({
      where: { id: input.focusSessionId, userId: input.userId },
    });
    if (existing === null) {
      throw new HttpError(404, 'FocusSessionNotFound');
    }
    if (existing.status !== 'RUNNING') {
      throw new HttpError(409, 'FocusSessionNotRunning');
    }
    if (input.endedAt.getTime() < existing.startedAt.getTime()) {
      throw new HttpError(400, 'InvalidFocusSessionEndTime');
    }

    const updated = await tx.focusSession.update({
      where: { id: existing.id },
      data: {
        status: 'CANCELED',
        endedAt: input.endedAt,
        notes: input.notes ?? existing.notes,
      },
    });

    const event = await createTaskEvent(tx, {
      userId: input.userId,
      taskId: updated.taskId ?? undefined,
      type: 'FOCUS_SESSION_CANCELED',
      payload: {
        focusSessionId: updated.id,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString(),
      },
      dedupeKey: `FOCUS_SESSION_CANCELED:${updated.id}`,
    });

    return { session: updated, eventId: event?.id };
  });

  if (eventId !== undefined) {
    await publishEventById(eventId);
  }

  return session;
}

export async function listFocusSessions(params: ListFocusSessionsParams) {
  const where: Prisma.FocusSessionWhereInput = { userId: params.userId };
  if (params.status !== undefined) {
    where.status = params.status;
  }
  if (params.taskId !== undefined) {
    where.taskId = params.taskId;
  }
  if (params.from !== undefined || params.to !== undefined) {
    where.startedAt = {};
    if (params.from !== undefined) {
      where.startedAt.gte = params.from;
    }
    if (params.to !== undefined) {
      where.startedAt.lte = params.to;
    }
  }

  const skip = (params.page - 1) * params.pageSize;
  const [items, total] = await Promise.all([
    prisma.focusSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip,
      take: params.pageSize,
    }),
    prisma.focusSession.count({ where }),
  ]);

  return {
    items,
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getDailyFocusSummary(userId: string, day: Date) {
  const from = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
  const to = new Date(from.getTime() + 86400000);

  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      startedAt: { gte: from, lt: to },
    },
    select: {
      taskId: true,
      status: true,
      actualMinutes: true,
    },
  });

  const completed = sessions.filter((session) => session.status === 'COMPLETED');
  const byTaskMap = new Map<string, { taskId: string | null; minutes: number; sessionsCount: number }>();

  for (const session of completed) {
    const key = session.taskId ?? 'null';
    const current = byTaskMap.get(key);
    if (current === undefined) {
      byTaskMap.set(key, {
        taskId: session.taskId,
        minutes: session.actualMinutes,
        sessionsCount: 1,
      });
      continue;
    }
    byTaskMap.set(key, {
      taskId: current.taskId,
      minutes: current.minutes + session.actualMinutes,
      sessionsCount: current.sessionsCount + 1,
    });
  }

  return {
    day: from.toISOString(),
    totalMinutes: completed.reduce((sum, row) => sum + row.actualMinutes, 0),
    sessionsCount: sessions.length,
    completedSessionsCount: completed.length,
    byTask: Array.from(byTaskMap.values()),
  };
}

async function createTaskEvent(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    taskId: string | undefined;
    type: string;
    payload: Prisma.InputJsonValue;
    dedupeKey: string;
  },
) {
  try {
    return await tx.taskEvent.create({
      data: {
        userId: params.userId,
        taskId: params.taskId,
        type: params.type,
        payload: params.payload,
        dedupeKey: params.dedupeKey,
      },
      select: { id: true },
    });
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code === 'P2002') {
      return null;
    }
    throw error;
  }
}
