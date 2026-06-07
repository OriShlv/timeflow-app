-- AlterTable
ALTER TABLE "Task" ADD COLUMN "parentTaskId" TEXT;

-- CreateIndex
CREATE INDEX "Task_userId_parentTaskId_idx" ON "Task"("userId", "parentTaskId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
