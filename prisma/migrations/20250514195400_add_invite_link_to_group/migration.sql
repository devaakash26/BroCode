/*
  Warnings:

  - You are about to drop the column `senderName` on the `ChatMessage` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "GroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "allowLateSubmissions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "realTimeLeaderboard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visibleToParticipants" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ChallengeProblems" ADD COLUMN     "memoryLimit" INTEGER,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "timeLimit" INTEGER;

-- AlterTable
ALTER TABLE "ChatMessage" DROP COLUMN "senderName",
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyToId" TEXT,
ALTER COLUMN "challengeId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "currentMembers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "inviteLink" TEXT,
ADD COLUMN     "memberLimit" INTEGER,
ADD COLUMN     "visibility" "GroupVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserGroup" ADD COLUMN     "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "solvedCount" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
