import type { Prisma } from '../../db/client';
import { prisma } from '../../db/prisma';

const RECOMMENDATION_TTL_HOURS = 24;
const WINDOW_DAYS = 7;

type RecommendationDraft = {
  type: string;
  score: number;
  message: string;
  evidence: Prisma.InputJsonValue;
};

type UserWindowStats = {
  created7d: number;
  completed7d: number;
  avgRate7d: number;
};

function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function windowStart(now: Date): Date {
  const start = utcDayStart(now);
  start.setUTCDate(start.getUTCDate() - WINDOW_DAYS);
  return start;
}

function recommendationExpiresAt(now: Date): Date {
  return new Date(now.getTime() + RECOMMENDATION_TTL_HOURS * 60 * 60 * 1000);
}

async function loadUserWindowStats(userId: string, now: Date): Promise<UserWindowStats> {
  const rows = await prisma.dailyUserStats.findMany({
    where: {
      userId,
      day: { gte: windowStart(now) },
    },
    select: {
      createdCount: true,
      completedCount: true,
      completionRate: true,
    },
  });

  if (rows.length === 0) {
    return { created7d: 0, completed7d: 0, avgRate7d: 0 };
  }

  const created7d = rows.reduce((sum, row) => sum + row.createdCount, 0);
  const completed7d = rows.reduce((sum, row) => sum + row.completedCount, 0);
  const avgRate7d = rows.reduce((sum, row) => sum + row.completionRate, 0) / rows.length;

  return { created7d, completed7d, avgRate7d };
}

function buildRecommendations(stats: UserWindowStats, overdueCount: number): RecommendationDraft[] {
  const recommendations: RecommendationDraft[] = [];
  const { created7d, completed7d, avgRate7d } = stats;

  if (overdueCount >= 1) {
    recommendations.push({
      type: 'OVERDUE_TASKS',
      score: Math.min(1, 0.5 + overdueCount * 0.1),
      message:
        overdueCount === 1
          ? 'You have 1 overdue task. Review its due date and either complete it today or reschedule.'
          : `You have ${overdueCount} overdue tasks. Review due dates and either complete or reschedule them today.`,
      evidence: { overdueCount },
    });
  }

  if (created7d >= 5 && avgRate7d < 0.4) {
    recommendations.push({
      type: 'LOW_COMPLETION_RATE',
      score: Math.min(1, (0.4 - avgRate7d) / 0.4 + 0.3),
      message:
        'You seem to be adding more tasks than you finish. Try limiting today to 3 key tasks and pick one clear priority each morning.',
      evidence: {
        windowDays: WINDOW_DAYS,
        createdCount7d: created7d,
        completedCount7d: completed7d,
        completionRate7d: avgRate7d,
      },
    });
  }

  if (created7d >= 15 && completed7d < created7d * 0.5) {
    recommendations.push({
      type: 'HIGH_WIP',
      score: Math.min(1, (created7d - completed7d) / Math.max(1, created7d)),
      message:
        'Your workload looks heavy this week. Consider pausing new tasks for a day and focus on closing open ones.',
      evidence: {
        windowDays: WINDOW_DAYS,
        createdCount7d: created7d,
        completedCount7d: completed7d,
        openDelta: created7d - completed7d,
      },
    });
  }

  return recommendations;
}

async function upsertRecommendation(
  userId: string,
  draft: RecommendationDraft,
  expiresAt: Date,
): Promise<void> {
  await prisma.userRecommendation.upsert({
    where: {
      userId_type: {
        userId,
        type: draft.type,
      },
    },
    create: {
      userId,
      type: draft.type,
      score: draft.score,
      message: draft.message,
      evidence: draft.evidence,
      expiresAt,
    },
    update: {
      score: draft.score,
      message: draft.message,
      evidence: draft.evidence,
      expiresAt,
    },
  });
}

async function loadOverdueCount(userId: string, now: Date): Promise<number> {
  return prisma.task.count({
    where: {
      userId,
      status: 'PENDING',
      dueAt: { lt: now },
    },
  });
}

export async function seedExampleDailyStatsForUser(userId: string, now: Date): Promise<void> {
  for (let daysAgo = 0; daysAgo < WINDOW_DAYS; daysAgo += 1) {
    const day = utcDayStart(now);
    day.setUTCDate(day.getUTCDate() - daysAgo);

    await prisma.dailyUserStats.upsert({
      where: { userId_day: { userId, day } },
      create: {
        userId,
        day,
        createdCount: 3,
        completedCount: 1,
        completionRate: 1 / 3,
      },
      update: {
        createdCount: 3,
        completedCount: 1,
        completionRate: 1 / 3,
      },
    });
  }
}

export async function seedExampleRecommendationsForUser(userId: string, now: Date): Promise<number> {
  await seedExampleDailyStatsForUser(userId, now);
  return refreshRecommendationsForUser(userId, now);
}

export async function refreshRecommendationsForUser(userId: string, now: Date): Promise<number> {
  const [stats, overdueCount] = await Promise.all([
    loadUserWindowStats(userId, now),
    loadOverdueCount(userId, now),
  ]);
  const drafts = buildRecommendations(stats, overdueCount);
  const expiresAt = recommendationExpiresAt(now);

  for (const draft of drafts) {
    await upsertRecommendation(userId, draft, expiresAt);
  }

  return drafts.length;
}
