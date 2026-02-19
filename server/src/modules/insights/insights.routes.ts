import { Router } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth, AuthedRequest } from "../../app/middleware/require-auth";

export const insightsRouter = Router();

insightsRouter.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
        const userId = req.user!.id;

        const [segment, latestDaily, recommendations] = await Promise.all([
            prisma.userSegment.findUnique({
                where: { userId },
                select: { segment: true, label: true, updatedAt: true, centroid: true, featuresRef: true },
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
        ]);

        res.json({
            ok: true,
            segment: segment
            ? {
                segment: segment.segment,
                label: segment.label,
                updatedAt: segment.updatedAt,
                featuresRef: segment.featuresRef,
                }
            : null,
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
