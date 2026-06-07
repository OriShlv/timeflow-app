import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../../app/middleware/require-auth';
import { getUserProfile, updateUserSettings } from './users.service';
import { updateUserSettingsSchema } from './users.schemas';

export const usersRouter = Router();

usersRouter.get('/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await getUserProfile(req.user!.id);
    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

usersRouter.get('/users/me', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await getUserProfile(req.user!.id);
    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/users/me/settings', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const input = updateUserSettingsSchema.parse(req.body);
    const user = await updateUserSettings(req.user!.id, input);
    res.json({ ok: true, user });
  } catch (err) {
    next(err);
  }
});
