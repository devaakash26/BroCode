/*
  Warnings:

  - You are about to drop the column `completedProblems` on the `ChallengeParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `disqualified` on the `ChallengeParticipant` table. All the data in the column will be lost.
  - You are about to drop the column `joinedAt` on the `ChallengeParticipant` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ChallengeParticipant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'COMPLETED', 'DISQUALIFIED');

-- DropForeignKey
ALTER TABLE "ChallengeParticipant" DROP CONSTRAINT "ChallengeParticipant_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "ChallengeParticipant" DROP CONSTRAINT "ChallengeParticipant_userId_fkey";

-- AlterTable
ALTER TABLE "ChallengeParticipant" DROP COLUMN "completedProblems",
DROP COLUMN "disqualified",
DROP COLUMN "joinedAt",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disqualifiedAt" TIMESTAMP(3),
ADD COLUMN     "problemsSolved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "status" "ParticipantStatus" NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
