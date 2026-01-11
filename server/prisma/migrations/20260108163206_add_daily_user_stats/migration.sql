-- CreateTable
CREATE TABLE "DailyUserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyUserStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUserStats_day_idx" ON "DailyUserStats"("day");

-- CreateIndex
CREATE INDEX "DailyUserStats_userId_day_idx" ON "DailyUserStats"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserStats_userId_day_key" ON "DailyUserStats"("userId", "day");

-- AddForeignKey
ALTER TABLE "DailyUserStats" ADD CONSTRAINT "DailyUserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
