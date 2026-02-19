import { Router } from 'express';
import { z } from 'zod';
import { login, register } from './auth.service';

export const authRouter = Router();

// Relevant schemas
const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await register(body.email.toLowerCase(), body.password, body.name);
    res.status(201).json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await login(body.email.toLowerCase(), body.password);

    if (!result) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});
