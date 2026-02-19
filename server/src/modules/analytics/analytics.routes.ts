import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthedRequest } from '../../app/middleware/require-auth';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);

const querySchema = z.object({
  day: z.string().datetime().optional(),
});

function utcDayStart(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

analyticsRouter.get('/daily', async (req: AuthedRequest, res, next) => {
  try {
    const q = querySchema.parse(req.query);
    const day = q.day ? new Date(q.day) : new Date();
    const dayStart = utcDayStart(day);

    const row = await prisma.dailyUserStats.findUnique({
      where: { userId_day: { userId: req.user!.id, day: dayStart } },
      select: {
        day: true,
        createdCount: true,
        completedCount: true,
        completionRate: true,
        updatedAt: true,
      },
    });

    res.json({ ok: true, day: dayStart.toISOString(), stats: row });
  } catch (err) {
    next(err);
  }
});
