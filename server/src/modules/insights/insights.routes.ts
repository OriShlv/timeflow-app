import { Router } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth, AuthedRequest } from "../../app/middleware/require-auth";

export const insightsRouter = Router();

insightsRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
        const userId = req.user!.id;
        const now = new Date();

        const [segment, latestDaily, recommendations, total, done, 
            pending, canceled, overdue] = await Promise.all([
            prisma.userSegment.findUnique({
                where: { userId },
                select: {
                    segment: true,
                    label: true,
                    updatedAt: true,
                    centroid: true,
                    featuresRef: true,
                },
            }),
            prisma.dailyUserFeatures.findFirst({
                where: { userId },
                orderBy: { day: "desc" },
            }),
            prisma.userRecommendation.findMany({
                where: { userId },
                orderBy: { createdAt: "desc" },
                take: 5,
            }),

            prisma.task.count({ where: { userId } }),
            prisma.task.count({ where: { userId, status: "DONE" } }),
            prisma.task.count({ where: { userId, status: "PENDING" } }),
            prisma.task.count({ where: { userId, status: "CANCELED" } }),
            prisma.task.count({
                where: {
                    userId,
                    status: "PENDING",
                    dueAt: { lt: now },
                },
            }),
        ]);

        res.json({
            ok: true,
            taskSummary: {
                total,
                done,
                pending,
                canceled,
                overdue,
                completionRate: total > 0 ? Number((done / total).toFixed(3)) : 0,
            },

            segment: segment ? {
                segment: segment.segment,
                label: segment.label,
                updatedAt: segment.updatedAt,
                featuresRef: segment.featuresRef,
            } : null,
            
            daily: latestDaily ?? null,
            recommendations: recommendations.map((r) => ({
                id: r.id,
                message: r.message,
                evidence: r.evidence,
                expiresAt: r.expiresAt,
                updatedAt: r.updatedAt,
            })),
        });
    } catch (err) {
        next(err);
    }
});
