import { Router } from 'express';
import type { FocusSessionStatus } from '@prisma/client';
import { requireAuth, type AuthedRequest } from '../../app/middleware/require-auth';
import {
  cancelFocusSessionSchema,
  dailySummaryQuerySchema,
  listFocusSessionsQuerySchema,
  startFocusSessionSchema,
  stopFocusSessionSchema,
  toDateOrUndefined,
} from './focus-sessions.schemas';
import {
  cancelFocusSession,
  getDailyFocusSummary,
  listFocusSessions,
  startFocusSession,
  stopFocusSession,
} from './focus-sessions.service';

export const focusSessionsRouter = Router();
focusSessionsRouter.use(requireAuth);

focusSessionsRouter.get('/', async (req: AuthedRequest, res, next) => {
  try {
    const query = listFocusSessionsQuerySchema.parse(req.query);
    const result = await listFocusSessions({
      userId: req.user!.id,
      from: toDateOrUndefined(query.from),
      to: toDateOrUndefined(query.to),
      taskId: query.taskId,
      status: query.status as FocusSessionStatus | undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

focusSessionsRouter.get('/summary/daily', async (req: AuthedRequest, res, next) => {
  try {
    const query = dailySummaryQuerySchema.parse(req.query);
    const day = query.day ? new Date(query.day) : new Date();
    const summary = await getDailyFocusSummary(req.user!.id, day);
    res.json({ ok: true, summary });
  } catch (error) {
    next(error);
  }
});

focusSessionsRouter.post('/start', async (req: AuthedRequest, res, next) => {
  try {
    const body = startFocusSessionSchema.parse(req.body);
    const session = await startFocusSession({
      userId: req.user!.id,
      taskId: body.taskId,
      plannedMinutes: body.plannedMinutes,
      source: body.source,
      notes: body.notes,
    });
    res.status(201).json({ ok: true, session });
  } catch (error) {
    next(error);
  }
});

focusSessionsRouter.post('/:id/stop', async (req: AuthedRequest, res, next) => {
  try {
    const body = stopFocusSessionSchema.parse(req.body);
    const session = await stopFocusSession({
      userId: req.user!.id,
      focusSessionId: req.params.id,
      endedAt: body.endedAt ? new Date(body.endedAt) : new Date(),
    });
    res.json({ ok: true, session });
  } catch (error) {
    next(error);
  }
});

focusSessionsRouter.post('/:id/cancel', async (req: AuthedRequest, res, next) => {
  try {
    const body = cancelFocusSessionSchema.parse(req.body);
    const session = await cancelFocusSession({
      userId: req.user!.id,
      focusSessionId: req.params.id,
      endedAt: body.endedAt ? new Date(body.endedAt) : new Date(),
      notes: body.notes,
    });
    res.json({ ok: true, session });
  } catch (error) {
    next(error);
  }
});
