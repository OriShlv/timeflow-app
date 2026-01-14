import { Router } from "express";
import { prisma } from "../../db/prisma";
import { requireAuth, AuthedRequest } from "../../app/middleware/require-auth";

export const segmentRouter = Router();
segmentRouter.use(requireAuth);

segmentRouter.get("/", async (req: AuthedRequest, res, next) => {
    try {
        const row = await prisma.userSegment.findUnique({
            where: { userId: req.user!.id },
            select: { segment: true, label: true, centroid: true, featuresRef: true, updatedAt: true }
        });

        res.json({ ok: true, segment: row });
    } catch (err) {
        next(err);
    }
});

segmentRouter.get("/insights", async (req: AuthedRequest, res, next) => {
    try {
        const row = await prisma.userSegment.findUnique({
            where: { userId: req.user!.id },
            select: { label: true, centroid: true }
        });

        if (!row) {
            return res.json({ ok: true, insights: [] });
        }

        const c: any = row.centroid || {};
        const insights: string[] = [];

        if (row.label === "Overplanner") {
            insights.push("אתה יוצר הרבה משימות ביחס לסגירה. נסה להגביל WIP ולסגור לפני יצירה.");
        }
        if (row.label === "Finisher") {
            insights.push("אתה מסיים יחסית הרבה. אפשר להעלות את רמת האתגר בעדינות.");
        }
        if (row.label === "Night Owl") {
            insights.push("רוב היצירה/פעילות בלילה. אולי שווה ניסוי של בלוק קצר בבוקר.");
        }
        if (row.label === "Deadline Struggler") {
            insights.push("יש סימנים לעומס מול דד-ליינים. כדאי להוסיף buffer ולתעדף מוקדם.");
        }

        // fallback evidence-based insight
        if (typeof c.completionRate === "number" && c.completionRate < 0.4) {
            insights.push("שיעור הסגירה הממוצע נמוך. נסה לקבוע 3 משימות ליום ולסמן אחת כבלתי-מתפשרת.");
        }

        res.json({ ok: true, label: row.label, insights });
    } catch (err) {
        next(err);
    }
});
