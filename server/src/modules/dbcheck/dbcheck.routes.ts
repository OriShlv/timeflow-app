import { Router } from 'express';
import { prisma } from '../../db/prisma';

export const dbcheckRouter = Router();

dbcheckRouter.get('/', async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      ok: true,
      db: 'connected',
    });
  } catch (err) {
    next(err);
  }
});
