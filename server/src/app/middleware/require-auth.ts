import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../../core/jwt';

export type AuthedRequest = Request & { user?: { id: string; email: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'MissingAuth' });
  }

  try {
    const token = header.slice('Bearer '.length);
    const payload = verifyAccessToken(token);

    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ ok: false, error: 'ExpiredToken' });
    }

    return res.status(401).json({ ok: false, error: 'InvalidToken' });
  }
}
