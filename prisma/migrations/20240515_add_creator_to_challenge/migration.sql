-- Add creatorId column to Challenge table
ALTER TABLE "Challenge" ADD COLUMN "creatorId" TEXT NOT NULL DEFAULT '';

-- Create a temporary default user ID (replace this with a valid user ID in your system)
UPDATE "Challenge" SET "creatorId" = (SELECT id FROM "User" LIMIT 1);

-- Add foreign key constraint
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove the default value 
ALTER TABLE "Challenge" ALTER COLUMN "creatorId" DROP DEFAULT; 