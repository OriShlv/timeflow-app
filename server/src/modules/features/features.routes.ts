import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthedRequest } from '../../app/middleware/require-auth';

export const featuresRouter = Router();
featuresRouter.use(requireAuth);

const querySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

featuresRouter.get('/daily', async (req: AuthedRequest, res, next) => {
  try {
    const q = querySchema.parse(req.query);

    const now = new Date();
    const from = q.from
      ? utcDayStart(new Date(q.from))
      : utcDayStart(new Date(now.getTime() - 6 * 86400000));
    const to = q.to ? utcDayStart(new Date(q.to)) : utcDayStart(now);

    const rows = await prisma.dailyUserFeatures.findMany({
      where: { userId: req.user!.id, day: { gte: from, lte: to } },
      orderBy: { day: 'asc' },
      select: {
        day: true,
        createdCount: true,
        completedCount: true,
        completionRate: true,
        tasksWithDueAt: true,
        overdueCount: true,
        avgCompletionLagH: true,
        createdMorning: true,
        createdAfternoon: true,
        createdEvening: true,
        createdNight: true,
      },
    });

    res.json({ ok: true, from: from.toISOString(), to: to.toISOString(), rows });
  } catch (err) {
    next(err);
  }
});

featuresRouter.get('/export.csv', async (req: AuthedRequest, res, next) => {
  try {
    const q = querySchema.parse(req.query);

    const now = new Date();
    const from = q.from
      ? utcDayStart(new Date(q.from))
      : utcDayStart(new Date(now.getTime() - 29 * 86400000));
    const to = q.to ? utcDayStart(new Date(q.to)) : utcDayStart(now);

    const rows = await prisma.dailyUserFeatures.findMany({
      where: { userId: req.user!.id, day: { gte: from, lte: to } },
      orderBy: { day: 'asc' },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=timeflow-features.csv');

    const header = [
      'day',
      'createdCount',
      'completedCount',
      'completionRate',
      'tasksWithDueAt',
      'overdueCount',
      'avgCompletionLagH',
      'createdMorning',
      'createdAfternoon',
      'createdEvening',
      'createdNight',
    ].join(',');

    const lines = rows.map((r) =>
      [
        r.day.toISOString(),
        r.createdCount,
        r.completedCount,
        r.completionRate,
        r.tasksWithDueAt,
        r.overdueCount,
        r.avgCompletionLagH,
        r.createdMorning,
        r.createdAfternoon,
        r.createdEvening,
        r.createdNight,
      ].join(','),
    );

    res.send([header, ...lines].join('\n'));
  } catch (err) {
    next(err);
  }
});
