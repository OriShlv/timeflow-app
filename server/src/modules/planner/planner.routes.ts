import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../../app/middleware/require-auth';
import { getPlannerIdempotentResult, setPlannerIdempotentResult } from './planner.idempotency';
import { plannerChatSchema } from './planner.schemas';
import { runPlannerChat } from './planner.service';

export const plannerRouter = Router();

plannerRouter.post('/chat', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = plannerChatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: 'InvalidPlannerRequest' });
    }

    const userId = req.user!.id;
    const idempotencyKey = parsed.data.idempotencyKey;
    if (idempotencyKey !== undefined) {
      const cached = await getPlannerIdempotentResult(userId, idempotencyKey);
      if (cached !== null) {
        return res.json({
          ok: true,
          message: cached.message,
          actions: cached.actions,
          needsClarification: cached.needsClarification,
        });
      }
    }

    const result = await runPlannerChat(
      userId,
      parsed.data.intent,
      parsed.data.message,
      parsed.data.taskId,
      parsed.data.draftTaskTitle,
    );

    if (idempotencyKey !== undefined) {
      await setPlannerIdempotentResult(userId, idempotencyKey, result);
    }

    res.json({
      ok: true,
      message: result.message,
      actions: result.actions,
      needsClarification: result.needsClarification,
    });
  } catch (err) {
    next(err);
  }
});
