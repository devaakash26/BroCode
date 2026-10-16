-- CreateEnum
CREATE TYPE "PlaygroundStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateTable
CREATE TABLE "PlaygroundSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "status" "PlaygroundStatus" NOT NULL DEFAULT 'ACTIVE',
    "language" TEXT NOT NULL DEFAULT 'cpp',
    "maxPeers" INTEGER NOT NULL DEFAULT 10,
    "peakPeers" INTEGER NOT NULL DEFAULT 1,
    "docState" BYTEA,
    "board" JSONB,
    "lastRun" JSONB,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "PlaygroundSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstJoinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlaygroundParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundRun" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "inputCount" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "results" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaygroundSession_hostId_createdAt_idx" ON "PlaygroundSession"("hostId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundSession_status_lastActiveAt_idx" ON "PlaygroundSession"("status", "lastActiveAt");

-- CreateIndex
CREATE INDEX "PlaygroundParticipant_userId_lastSeenAt_idx" ON "PlaygroundParticipant"("userId", "lastSeenAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundParticipant_sessionId_userId_key" ON "PlaygroundParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "PlaygroundMessage_sessionId_createdAt_idx" ON "PlaygroundMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundRun_sessionId_createdAt_idx" ON "PlaygroundRun"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlaygroundSession" ADD CONSTRAINT "PlaygroundSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundParticipant" ADD CONSTRAINT "PlaygroundParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaygroundSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundParticipant" ADD CONSTRAINT "PlaygroundParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMessage" ADD CONSTRAINT "PlaygroundMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaygroundSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMessage" ADD CONSTRAINT "PlaygroundMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundRun" ADD CONSTRAINT "PlaygroundRun_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaygroundSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundRun" ADD CONSTRAINT "PlaygroundRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

