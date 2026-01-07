import { Router } from "express";
import { prisma } from "../../db/prisma";

export const dbcheckRouter = Router();

dbcheckRouter.get("/", async (_req, res, next) => {
    try {
    const now = new Date();

    const user = await prisma.user.upsert({
        where: { email: "demo@timeflow.local" },
        update: { updatedAt: now },
        create: { email: "demo@timeflow.local", name: "Timeflow Demo" }
    });

    const taskCount = await prisma.task.count({ where: { userId: user.id } });

    res.json({
        ok: true,
        db: "connected",
        userId: user.id,
        taskCount
    });
    } catch (err) {
    next(err);
    }
});
