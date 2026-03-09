import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, challengeId } = params;
    const body = await request.json();
    const { userIdToDisqualify, reason, selfReport } = body;

    // Self-disqualification from the 3-strike system
    if (selfReport) {
      const participant = await prisma.challengeParticipant.findUnique({
        where: { userId_challengeId: { userId: session.user.id, challengeId } },
        include: {
          user: { select: { email: true, name: true } },
          challenge: { select: { title: true } },
        },
      });
      if (!participant || participant.status === "DISQUALIFIED") {
        return NextResponse.json(
          { message: "Not a participant or already disqualified" },
          { status: 400 },
        );
      }

      const newWarnings = participant.warningCount + 1;

      if (newWarnings >= 3) {
        await prisma.challengeParticipant.update({
          where: {
            userId_challengeId: { userId: session.user.id, challengeId },
          },
          data: {
            status: "DISQUALIFIED",
            warningCount: newWarnings,
            disqualifyReason:
              reason || "Exceeded maximum fullscreen violations (3 strikes)",
            disqualifiedAt: new Date(),
          },
        });

        // Fire-and-forget email notification
        if (participant.user.email) {
          sendEmail({
            to: participant.user.email,
            subject: `Disqualified from "${participant.challenge.title}"`,
            html: `
              <div style="font-family:-apple-system,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
                <h2 style="color:#e11d48;margin:0 0 16px">Disqualified</h2>
                <p>Hi ${participant.user.name || "there"},</p>
                <p>You have been disqualified from <strong>${participant.challenge.title}</strong>.</p>
                <p><strong>Reason:</strong> ${reason || "Exceeded maximum fullscreen violations (3 strikes)"}</p>
                <p style="color:#71717a;font-size:13px;margin-top:24px;">If you believe this was in error, please contact your group admin.</p>
              </div>
            `,
          }).catch(() => {});
        }

        return NextResponse.json({
          disqualified: true,
          warningCount: newWarnings,
        });
      }

      // Just increment warning
      await prisma.challengeParticipant.update({
        where: { userId_challengeId: { userId: session.user.id, challengeId } },
        data: { warningCount: newWarnings },
      });
      return NextResponse.json({
        disqualified: false,
        warningCount: newWarnings,
      });
    }

    // Admin disqualification
    if (!userIdToDisqualify) {
      return NextResponse.json(
        { message: "User ID to disqualify is required." },
        { status: 400 },
      );
    }

    await prisma.challengeParticipant.update({
      where: {
        userId_challengeId: {
          userId: userIdToDisqualify,
          challengeId: challengeId,
        },
      },
      data: {
        status: "DISQUALIFIED",
        disqualifyReason: reason || "Disqualified by admin",
        disqualifiedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "User has been disqualified.",
    });
  } catch (error) {
    console.error("Disqualification Error:", error);
    return NextResponse.json(
      {
        message: "An unexpected error occurred during disqualification.",
        error: error.message,
      },
      { status: 500 },
    );
  }
}
