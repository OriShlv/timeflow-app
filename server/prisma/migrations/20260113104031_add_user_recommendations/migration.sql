-- CreateTable
CREATE TABLE "UserRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "UserRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRecommendation_userId_score_idx" ON "UserRecommendation"("userId", "score");

-- CreateIndex
CREATE INDEX "UserRecommendation_expiresAt_idx" ON "UserRecommendation"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserRecommendation_userId_type_key" ON "UserRecommendation"("userId", "type");

-- AddForeignKey
ALTER TABLE "UserRecommendation" ADD CONSTRAINT "UserRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
