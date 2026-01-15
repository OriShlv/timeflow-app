import express from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { healthRouter } from "../modules/health/health.routes";
import { errorHandler } from "./errors/error-handler";
import { dbcheckRouter } from "../modules/dbcheck/dbcheck.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";
import { tasksRouter } from "../modules/tasks/tasks.routes";
import { analyticsRouter } from "../modules/analytics/analytics.routes";
import { recommendationsRouter } from "../modules/recommendations/recommendations.routes";
import { featuresRouter } from "../modules/features/features.routes";
import { segmentRouter } from "../modules/segment/segment.routes";
import { opsRouter } from "../modules/ops/ops.routes";

export function createServer() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(pinoHttp());

  app.get("/", (_req, res) => res.json({ ok: true, service: "server" }));
  app.use("/health", healthRouter);
  app.use("/dbcheck", dbcheckRouter);
  app.use("/auth", authRouter);
  app.use("/", usersRouter);
  app.use("/tasks", tasksRouter);
  app.use("/analytics", analyticsRouter);
  app.use("/recommendations", recommendationsRouter);
  app.use("/features", featuresRouter);
  app.use("/segment", segmentRouter);
  app.use("/ops", opsRouter);
  app.use(errorHandler);

  return app;
}
