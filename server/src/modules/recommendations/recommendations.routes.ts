import { Router } from 'express';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthedRequest } from '../../app/middleware/require-auth';

export const recommendationsRouter = Router();
recommendationsRouter.use(requireAuth);

recommendationsRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const now = new Date();

    const items = await prisma.userRecommendation.findMany({
      where: {
        userId: req.user!.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
      select: {
        type: true,
        score: true,
        message: true,
        evidence: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
});
