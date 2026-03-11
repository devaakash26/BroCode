import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendChallengeReportCard } from "@/app/lib/email";

/**
 * POST /api/groups/[id]/challenges/[challengeId]/end
 * Ends a challenge early and sends report cards to all participants
 */
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, challengeId } = params;

    // Check if user is admin or creator of the group
    const [userGroup, group] = await Promise.all([
      prisma.userGroup.findFirst({
        where: {
          userId: session.user.id,
          groupId,
        },
        select: {
          role: true,
        },
      }),
      prisma.group.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          name: true,
          creatorId: true,
        },
      }),
    ]);

    if (!group) {
      return NextResponse.json({ message: "Group not found" }, { status: 404 });
    }

    const isCreator = group.creatorId === session.user.id;
    const isAdmin =
      userGroup?.role === "ADMIN" || userGroup?.role === "CREATOR";

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { message: "Only admins can end challenges" },
        { status: 403 },
      );
    }

    // Get the challenge details
    const challenge = await prisma.challenge.findUnique({
      where: {
        id: challengeId,
        groupId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        isActive: true,
      },
    });

    if (!challenge) {
      return NextResponse.json(
        { message: "Challenge not found" },
        { status: 404 },
      );
    }

    // Check if challenge has already ended
    if (new Date(challenge.endTime) < new Date()) {
      return NextResponse.json(
        { message: "Challenge has already ended" },
        { status: 400 },
      );
    }

    // Update challenge to end now
    const now = new Date();
    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        endTime: now,
        isActive: false,
      },
    });

    // Get all participants with their final scores and submissions
    const participants = await prisma.challengeParticipant.findMany({
      where: {
        challengeId,
        status: { not: "DISQUALIFIED" },
      },
      select: {
        userId: true,
        score: true,
        problemsSolved: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        score: "desc",
      },
    });

    // Get total problems count
    const totalProblems = await prisma.challengeProblem.count({
      where: { challengeId },
    });

    // Send report card emails to all participants
    const emailPromises = participants.map(async (participant, index) => {
      try {
        await sendChallengeReportCard({
          userName: participant.user.name,
          userEmail: participant.user.email,
          challengeTitle: challenge.title,
          groupName: group.name,
          rank: index + 1,
          totalParticipants: participants.length,
          problemsSolved: participant.problemsSolved || 0,
          totalProblems,
          finalScore: participant.score || 0,
          startTime: challenge.startTime,
          endTime: now,
        });
        console.log(`Report card sent to ${participant.user.email}`);
      } catch (error) {
        console.error(
          `Failed to send report card to ${participant.user.email}:`,
          error,
        );
        // Continue even if email fails for one participant
      }
    });

    // Wait for all emails to be sent (or attempted)
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      success: true,
      message: "Challenge ended successfully and report cards sent",
      participantsNotified: participants.length,
    });
  } catch (error) {
    console.error("Error ending challenge:", error);
    return NextResponse.json(
      {
        message: "Failed to end challenge",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
