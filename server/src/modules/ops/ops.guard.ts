import type { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";

function parseAllowlist(s: string | undefined) {
    return (s ?? "")
        .split(",")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
}

export function requireOpsAccess() {
  const allowlist = parseAllowlist(env.OPS_ADMIN_EMAILS);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!env.OPS_ENABLED) {
        return res.status(404).json({ ok: false, error: "Not Found" });
    }

    // Dev-only mode
    if (env.OPS_DEV_ONLY) {
      if (env.NODE_ENV !== "development") {
        return res.status(403).json({ ok: false, error: "Forbidden" });
      }
      return next();
    }

    // JWT mode: require req.user
    const user = (req as any).user as { email?: string } | undefined;
    if (!user?.email) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    if (allowlist.length === 0) {
      return res.status(500).json({ ok: false, error: "OPS allowlist not configured" });
    }

    const email = user.email.toLowerCase();
    if (!allowlist.includes(email)) {
      return res.status(403).json({ ok: false, error: "Forbidden" });
    }

    return next();
  };
}
