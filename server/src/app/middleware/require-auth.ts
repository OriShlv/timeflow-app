import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../../core/jwt";

export type AuthedRequest = Request & { user?: { id: string; email: string } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "MissingAuth" });
  }

  try {
    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);

    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
        return res.status(401).json({ ok: false, error: "InvalidToken" });
  }
}
