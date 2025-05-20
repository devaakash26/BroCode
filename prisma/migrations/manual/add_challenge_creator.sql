-- AddChallengeCreator
ALTER TABLE IF NOT EXISTS "Challenge" ADD COLUMN IF NOT EXISTS "creatorId" TEXT;
UPDATE "Challenge" SET "creatorId" = (SELECT id FROM "User" LIMIT 1) WHERE "creatorId" IS NULL;
ALTER TABLE "Challenge" ALTER COLUMN "creatorId" SET NOT NULL;
ALTER TABLE "Challenge" ADD CONSTRAINT IF NOT EXISTS "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
