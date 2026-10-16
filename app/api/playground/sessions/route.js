import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";

// GET /api/playground/sessions — sessions the current user hosted or joined.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await prisma.playgroundParticipant.findMany({
      where: { userId: session.user.id },
      orderBy: { lastSeenAt: "desc" },
      take: 12,
      select: {
        lastSeenAt: true,
        session: {
          select: {
            id: true,
            title: true,
            status: true,
            hostId: true,
            createdAt: true,
            endedAt: true,
            peakPeers: true,
            runCount: true,
            host: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json({
      sessions: rows.map(({ lastSeenAt, session: s }) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        isHost: s.hostId === session.user.id,
        hostName: s.host?.name || null,
        createdAt: s.createdAt,
        endedAt: s.endedAt,
        lastSeenAt,
        people: s.peakPeers,
        runs: s.runCount,
      })),
    });
  } catch (error) {
    console.error("[playground/sessions] GET error:", error.message);
    return NextResponse.json({ error: "Failed to load sessions" }, { status: 500 });
  }
}
