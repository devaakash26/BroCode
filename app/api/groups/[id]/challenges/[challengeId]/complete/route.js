import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendEmail } from "@/app/lib/email";

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, challengeId } = params;
    const userId = session.user.id;

    // Fetch participant, challenge, and submissions in parallel
    const [participant, challenge, submissions, allParticipants] =
      await Promise.all([
        prisma.challengeParticipant.findUnique({
          where: { userId_challengeId: { userId, challengeId } },
          include: { user: { select: { email: true, name: true } } },
        }),
        prisma.challenge.findUnique({
          where: { id: challengeId, groupId },
          select: {
            title: true,
            startTime: true,
            endTime: true,
            problems: {
              select: {
                problem: {
                  select: { id: true, title: true, difficulty: true },
                },
              },
            },
          },
        }),
        prisma.submission.findMany({
          where: { userId, challengeId, status: "ACCEPTED" },
          select: { problemId: true, pointsEarned: true, submittedAt: true },
          distinct: ["problemId"],
        }),
        prisma.challengeParticipant.findMany({
          where: { challengeId },
          orderBy: [{ score: "desc" }],
          select: { userId: true, score: true },
        }),
      ]);

    if (!participant) {
      return NextResponse.json(
        { message: "Not a participant" },
        { status: 400 },
      );
    }
    if (!challenge) {
      return NextResponse.json(
        { message: "Challenge not found" },
        { status: 404 },
      );
    }

    // Mark as completed
    await prisma.challengeParticipant.update({
      where: { userId_challengeId: { userId, challengeId } },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Calculate rank
    const rank = allParticipants.findIndex((p) => p.userId === userId) + 1;
    const totalParticipants = allParticipants.length;
    const totalProblems = challenge.problems.length;
    const solvedIds = new Set(submissions.map((s) => s.problemId));
    const totalScore = participant.score || 0;

    // Build problem results table rows
    const problemRows = challenge.problems
      .map((cp) => {
        const p = cp.problem;
        const solved = solvedIds.has(p.id);
        const sub = submissions.find((s) => s.problemId === p.id);
        return `
        <tr style="border-bottom:1px solid #e4e4e7;">
          <td style="padding:10px 12px;font-size:14px;">${p.title}</td>
          <td style="padding:10px 12px;font-size:13px;text-align:center;">
            <span style="padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;background:${
              p.difficulty === "EASY"
                ? "#d1fae5;color:#059669"
                : p.difficulty === "MEDIUM"
                  ? "#fef3c7;color:#d97706"
                  : "#fee2e2;color:#dc2626"
            }">${p.difficulty}</span>
          </td>
          <td style="padding:10px 12px;text-align:center;font-size:14px;font-weight:600;color:${solved ? "#059669" : "#a1a1aa"}">
            ${solved ? "&#10003;" : "&#10007;"}
          </td>
          <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:600;">
            ${sub ? `+${sub.pointsEarned}` : "0"}
          </td>
        </tr>`;
      })
      .join("");

    // Send the email report
    if (participant.user.email) {
      sendEmail({
        to: participant.user.email,
        subject: `Your results for "${challenge.title}"`,
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#18181b;">
            <h1 style="font-size:22px;margin:0 0 4px;">Challenge Report</h1>
            <p style="color:#71717a;margin:0 0 24px;font-size:14px;">${challenge.title}</p>

            <!-- Score card -->
            <div style="background:#f4f4f5;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
              <div style="font-size:36px;font-weight:800;color:#18181b;">${totalScore}</div>
              <div style="font-size:13px;color:#71717a;">Total Score</div>
              <div style="display:flex;justify-content:center;gap:32px;margin-top:16px;">
                <div>
                  <div style="font-size:20px;font-weight:700;color:#18181b;">#${rank}</div>
                  <div style="font-size:12px;color:#71717a;">Rank</div>
                </div>
                <div>
                  <div style="font-size:20px;font-weight:700;color:#18181b;">${solvedIds.size}/${totalProblems}</div>
                  <div style="font-size:12px;color:#71717a;">Solved</div>
                </div>
                <div>
                  <div style="font-size:20px;font-weight:700;color:#18181b;">${totalParticipants}</div>
                  <div style="font-size:12px;color:#71717a;">Participants</div>
                </div>
              </div>
            </div>

            <!-- Problems table -->
            <table style="width:100%;border-collapse:collapse;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f4f4f5;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#71717a;font-weight:600;">Problem</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#71717a;font-weight:600;">Difficulty</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#71717a;font-weight:600;">Solved</th>
                  <th style="padding:10px 12px;text-align:right;font-size:12px;color:#71717a;font-weight:600;">Points</th>
                </tr>
              </thead>
              <tbody>${problemRows}</tbody>
            </table>

            <p style="color:#a1a1aa;font-size:12px;margin-top:24px;text-align:center;">
              Challenge: ${new Date(challenge.startTime).toLocaleString()} — ${new Date(challenge.endTime).toLocaleString()}
            </p>
          </div>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      rank,
      score: totalScore,
      solved: solvedIds.size,
    });
  } catch (error) {
    console.error("Complete challenge error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
