import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, challengeId } = params;
    const userId = session.user.id;

    // Verify membership + fetch challenge in parallel
    const [userGroup, challenge] = await Promise.all([
      prisma.userGroup.findFirst({
        where: { userId, groupId },
        select: { role: true },
      }),
      prisma.challenge.findUnique({
        where: { id: challengeId, groupId },
        select: {
          startTime: true,
          endTime: true,
          lateEntryMinutes: true,
          inviteOnly: true,
        },
      }),
    ]);

    if (!userGroup) {
      return NextResponse.json(
        { message: "Not a group member" },
        { status: 403 },
      );
    }
    if (!challenge) {
      return NextResponse.json(
        { message: "Challenge not found" },
        { status: 404 },
      );
    }

    const now = Date.now();
    const start = new Date(challenge.startTime).getTime();
    const end = new Date(challenge.endTime).getTime();
    const lateMs = (challenge.lateEntryMinutes || 5) * 60000;
    const entryDeadline = start + lateMs;

    // Time gate: can enter from startTime - 1min through entryDeadline
    if (now > end) {
      return NextResponse.json(
        { message: "Challenge has ended" },
        { status: 400 },
      );
    }
    if (now > entryDeadline) {
      return NextResponse.json(
        { message: "Entry window has closed" },
        { status: 400 },
      );
    }

    // Check invite-only restriction
    if (challenge.inviteOnly) {
      const existing = await prisma.challengeParticipant.findUnique({
        where: { userId_challengeId: { userId, challengeId } },
      });
      if (!existing) {
        return NextResponse.json(
          { message: "You were not invited to this challenge" },
          { status: 403 },
        );
      }
      if (existing.status === "DISQUALIFIED") {
        return NextResponse.json(
          { message: "You have been disqualified" },
          { status: 403 },
        );
      }
      // Update status to ACTIVE
      await prisma.challengeParticipant.update({
        where: { userId_challengeId: { userId, challengeId } },
        data: { status: "ACTIVE", startedAt: new Date() },
      });
    } else {
      // Open challenge — upsert participant
      const existing = await prisma.challengeParticipant.findUnique({
        where: { userId_challengeId: { userId, challengeId } },
      });
      if (existing?.status === "DISQUALIFIED") {
        return NextResponse.json(
          { message: "You have been disqualified" },
          { status: 403 },
        );
      }
      await prisma.challengeParticipant.upsert({
        where: { userId_challengeId: { userId, challengeId } },
        create: {
          userId,
          challengeId,
          status: "ACTIVE",
          startedAt: new Date(),
        },
        update: {
          status: "ACTIVE",
          startedAt: existing?.startedAt || new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Join challenge error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
