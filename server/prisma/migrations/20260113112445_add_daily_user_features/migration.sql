-- CreateTable
CREATE TABLE "DailyUserFeatures" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasksWithDueAt" INTEGER NOT NULL DEFAULT 0,
    "overdueCount" INTEGER NOT NULL DEFAULT 0,
    "avgCompletionLagH" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdMorning" INTEGER NOT NULL DEFAULT 0,
    "createdAfternoon" INTEGER NOT NULL DEFAULT 0,
    "createdEvening" INTEGER NOT NULL DEFAULT 0,
    "createdNight" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUserFeatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUserFeatures_day_idx" ON "DailyUserFeatures"("day");

-- CreateIndex
CREATE INDEX "DailyUserFeatures_userId_day_idx" ON "DailyUserFeatures"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserFeatures_userId_day_key" ON "DailyUserFeatures"("userId", "day");

-- AddForeignKey
ALTER TABLE "DailyUserFeatures" ADD CONSTRAINT "DailyUserFeatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
