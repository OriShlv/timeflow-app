/*
  Warnings:

  - A unique constraint covering the columns `[dedupeKey]` on the table `TaskEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "TaskEvent" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "TaskEvent_dedupeKey_key" ON "TaskEvent"("dedupeKey");
