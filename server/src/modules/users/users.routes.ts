import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../../app/middleware/require-auth';
import { prisma } from '../../db/prisma';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});
