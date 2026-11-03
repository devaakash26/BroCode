import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const LIVE_WINDOW_MS = 15 * 60 * 1000; // "active" = not ended and touched in the last 15 min
const RANGES = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const SORTS = {
  recent: [{ createdAt: "desc" }],
  active: [{ lastActiveAt: "desc" }],
  people: [{ peakPeers: "desc" }, { createdAt: "desc" }],
  messages: [{ messageCount: "desc" }, { createdAt: "desc" }],
  runs: [{ runCount: "desc" }, { createdAt: "desc" }],
};

const isAdmin = (s) => ["PLATFORM_ADMIN", "TEMP_ADMIN"].includes(s?.user?.role);
const userSel = { id: true, name: true, email: true, image: true };

function sinceFor(range) {
  const days = RANGES[range];
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
}

/**
 * GET /api/admin/playground?range=7d&status=all&q=&sort=recent&page=1
 * GET /api/admin/playground?id=<roomId>   → one session with people, runs, chat
 */
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  try {
    const id = searchParams.get("id");
    if (id) return NextResponse.json({ success: true, session: await detail(id) });

    const asked = searchParams.get("range");
    const range = asked === "all" || RANGES[asked] ? asked : "7d";
    const status = ["ACTIVE", "ENDED", "LIVE"].includes(searchParams.get("status")) ? searchParams.get("status") : "all";
    const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "recent";
    const q = (searchParams.get("q") || "").trim().slice(0, 100);
    const page = Math.max(1, parseInt(searchParams.get("page"), 10) || 1);

    const since = sinceFor(range);
    const liveSince = new Date(Date.now() - LIVE_WINDOW_MS);
    const inRange = since ? { createdAt: { gte: since } } : {};

    const where = {
      ...inRange,
      ...(status === "LIVE" ? { status: "ACTIVE", lastActiveAt: { gte: liveSince } } : status !== "all" ? { status } : {}),
      ...(q
        ? {
            OR: [
              { id: q },
              { title: { contains: q, mode: "insensitive" } },
              { host: { name: { contains: q, mode: "insensitive" } } },
              { host: { email: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    // Chart: always a bounded window so "all time" doesn't scan everything.
    const chartDays = range === "24h" ? 7 : Math.min(RANGES[range] || 30, 30);
    const chartSince = new Date(Date.now() - chartDays * 24 * 60 * 60 * 1000);

    const [total, rows, totals, liveNow, hostGroups, participantRows, chartRows, totalParticipants] = await Promise.all([
      prisma.playgroundSession.count({ where }),
      prisma.playgroundSession.findMany({
        where,
        orderBy: SORTS[sort],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          title: true,
          status: true,
          language: true,
          maxPeers: true,
          peakPeers: true,
          messageCount: true,
          runCount: true,
          createdAt: true,
          lastActiveAt: true,
          endedAt: true,
          host: { select: userSel },
          _count: { select: { participants: true } },
        },
      }),
      prisma.playgroundSession.aggregate({
        where: inRange,
        _count: { _all: true },
        _sum: { messageCount: true, runCount: true },
        _avg: { peakPeers: true },
        _max: { peakPeers: true },
      }),
      prisma.playgroundSession.count({ where: { status: "ACTIVE", lastActiveAt: { gte: liveSince } } }),
      prisma.playgroundSession.groupBy({
        by: ["hostId"],
        where: inRange,
        _count: { _all: true },
        _sum: { messageCount: true, runCount: true },
        orderBy: { _count: { hostId: "desc" } },
        take: 5,
      }),
      prisma.playgroundParticipant.findMany({
        where: since ? { firstJoinedAt: { gte: since } } : {},
        distinct: ["userId"],
        select: { userId: true },
      }),
      prisma.playgroundSession.findMany({
        where: { createdAt: { gte: chartSince } },
        select: { createdAt: true },
      }),
      prisma.playgroundParticipant.count({ where: since ? { session: { createdAt: { gte: since } } } : {} }),
    ]);

    const uniqueHosts = await prisma.playgroundSession
      .findMany({ where: inRange, distinct: ["hostId"], select: { hostId: true } })
      .then((r) => r.length);

    const hostUsers = await prisma.user.findMany({
      where: { id: { in: hostGroups.map((h) => h.hostId) } },
      select: userSel,
    });
    const byId = new Map(hostUsers.map((u) => [u.id, u]));

    // Sessions per day, oldest → newest, including empty days.
    // Buckets are UTC days so the server's time zone never shifts them.
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const days = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      days.push({ date: new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10), count: 0 });
    }
    const index = new Map(days.map((d, i) => [d.date, i]));
    for (const r of chartRows) {
      const k = new Date(r.createdAt).toISOString().slice(0, 10);
      if (index.has(k)) days[index.get(k)].count++;
    }

    const sessionCount = totals._count._all;
    return NextResponse.json({
      success: true,
      range,
      stats: {
        sessions: sessionCount,
        liveNow,
        uniqueHosts,
        uniqueParticipants: participantRows.length,
        avgPeople: sessionCount ? Math.round((totalParticipants / sessionCount) * 10) / 10 : 0,
        peakPeople: totals._max.peakPeers || 0,
        messages: totals._sum.messageCount || 0,
        runs: totals._sum.runCount || 0,
      },
      chart: days,
      topHosts: hostGroups.map((h) => ({
        user: byId.get(h.hostId) || { id: h.hostId, name: "Deleted user", email: null },
        sessions: h._count._all,
        messages: h._sum.messageCount || 0,
        runs: h._sum.runCount || 0,
      })),
      page,
      pageSize: PAGE_SIZE,
      total,
      sessions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        live: r.status === "ACTIVE" && new Date(r.lastActiveAt) >= liveSince,
        language: r.language,
        maxPeers: r.maxPeers,
        peakPeers: r.peakPeers,
        participants: r._count.participants,
        messages: r.messageCount,
        runs: r.runCount,
        createdAt: r.createdAt,
        lastActiveAt: r.lastActiveAt,
        endedAt: r.endedAt,
        host: r.host,
      })),
    });
  } catch (err) {
    console.error("[admin] playground activity:", err);
    return NextResponse.json({ success: false, error: "Failed to load playground activity" }, { status: 500 });
  }
}

async function detail(id) {
  const s = await prisma.playgroundSession.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      language: true,
      maxPeers: true,
      peakPeers: true,
      messageCount: true,
      runCount: true,
      createdAt: true,
      lastActiveAt: true,
      endedAt: true,
      hostId: true,
      host: { select: userSel },
      participants: {
        orderBy: { firstJoinedAt: "asc" },
        select: { firstJoinedAt: true, lastSeenAt: true, joinCount: true, user: { select: userSel } },
      },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, language: true, inputCount: true, passed: true, createdAt: true, user: { select: { id: true, name: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, content: true, createdAt: true, user: { select: { id: true, name: true } } },
      },
    },
  });
  if (!s) return null;
  const liveSince = new Date(Date.now() - LIVE_WINDOW_MS);
  return {
    ...s,
    live: s.status === "ACTIVE" && new Date(s.lastActiveAt) >= liveSince,
    participants: s.participants.map((p) => ({ ...p, isHost: p.user.id === s.hostId })),
    messages: s.messages.reverse(),
  };
}
