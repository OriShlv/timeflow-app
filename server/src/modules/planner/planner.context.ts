import { prisma } from '../../db/prisma';

export type PlannerTaskRow = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date | null;
  status: string;
};

export const DRAFT_TASK_ID = '__draft__';

export type PlannerContext = {
  now: Date;
  pendingTasks: PlannerTaskRow[];
  overdueTasks: PlannerTaskRow[];
  targetTask: PlannerTaskRow | null;
  pendingCount: number;
};

function startOfLocalDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfLocalDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(23, 59, 59, 999);
  return day;
}

function formatDueAt(dueAt: Date | null): string {
  if (dueAt === null) {
    return 'no due date';
  }
  return dueAt.toISOString();
}

export function formatTaskListForPrompt(tasks: PlannerTaskRow[]): string {
  if (tasks.length === 0) {
    return '(none)';
  }
  return tasks
    .map((task) => `- id=${task.id} | title="${task.title}" | due=${formatDueAt(task.dueAt)}`)
    .join('\n');
}

export async function buildPlannerContext(
  userId: string,
  taskId: string | undefined,
  draftTaskTitle: string | undefined,
): Promise<PlannerContext> {
  const now = new Date();
  const dayStart = startOfLocalDay(now);
  const dayEnd = endOfLocalDay(now);

  const [pendingTasks, overdueTasks, pendingCount, targetTask] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
      take: 20,
      select: { id: true, title: true, description: true, dueAt: true, status: true },
    }),
    prisma.task.findMany({
      where: { userId, status: 'PENDING', dueAt: { lt: now } },
      orderBy: { dueAt: 'asc' },
      take: 10,
      select: { id: true, title: true, description: true, dueAt: true, status: true },
    }),
    prisma.task.count({ where: { userId, status: 'PENDING' } }),
    taskId === undefined
      ? Promise.resolve(null)
      : prisma.task.findFirst({
          where: { id: taskId, userId, status: 'PENDING' },
          select: { id: true, title: true, description: true, dueAt: true, status: true },
        }),
  ]);

  const dueToday = pendingTasks.filter((task) => {
    if (task.dueAt === null) {
      return false;
    }
    return task.dueAt >= dayStart && task.dueAt <= dayEnd;
  });

  let resolvedTargetTask = targetTask;
  if (
    resolvedTargetTask === null &&
    draftTaskTitle !== undefined &&
    draftTaskTitle.trim().length > 0
  ) {
    resolvedTargetTask = {
      id: DRAFT_TASK_ID,
      title: draftTaskTitle.trim(),
      description: null,
      dueAt: null,
      status: 'PENDING',
    };
  }

  return {
    now,
    pendingTasks: dueToday.length > 0 ? dueToday : pendingTasks,
    overdueTasks,
    targetTask: resolvedTargetTask,
    pendingCount,
  };
}
