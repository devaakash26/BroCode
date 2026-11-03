import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/app/lib/db";
import { sendPlaygroundInvite } from "@/app/lib/playgroundInviteEmail";

export const dynamic = "force-dynamic";

const MAX_PER_REQUEST = 10;
const MAX_PER_HOUR = 40; // per host, per server instance
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const sentLog = new Map(); // userId → timestamps of recent sends

function allowance(userId) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  const recent = (sentLog.get(userId) || []).filter((t) => t > hourAgo);
  sentLog.set(userId, recent);
  return MAX_PER_HOUR - recent.length;
}

/**
 * POST /api/playground/invite  { roomId, emails: string[], message?, peopleInRoom? }
 * Host only. Sends one email per address and cc's the host on each.
 */
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    return NextResponse.json({ error: "Email is not configured on this server" }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  if (!/^[A-Za-z0-9_-]{6,24}$/.test(roomId)) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }

  const room = await prisma.playgroundSession.findUnique({
    where: { id: roomId },
    select: { id: true, title: true, hostId: true, status: true },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Only the host can send email invites" }, { status: 403 });
  }
  if (room.status !== "ACTIVE") {
    return NextResponse.json({ error: "This session has ended" }, { status: 409 });
  }

  const host = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });
  const hostEmail = host?.email?.toLowerCase() || null;

  const emails = [
    ...new Set(
      (Array.isArray(body.emails) ? body.emails : [])
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => e && e.length <= 254),
    ),
  ];
  const invalid = emails.filter((e) => !EMAIL_RE.test(e));
  const valid = emails.filter((e) => EMAIL_RE.test(e) && e !== hostEmail);
  if (!valid.length) {
    return NextResponse.json({ error: invalid.length ? "Those email addresses don't look right" : "Add at least one email" }, { status: 400 });
  }
  if (valid.length > MAX_PER_REQUEST) {
    return NextResponse.json({ error: `Up to ${MAX_PER_REQUEST} people at a time` }, { status: 400 });
  }
  const left = allowance(session.user.id);
  if (valid.length > left) {
    return NextResponse.json(
      { error: left > 0 ? `You can send ${left} more invite${left === 1 ? "" : "s"} this hour` : "Invite limit reached — try again in an hour" },
      { status: 429 },
    );
  }

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  const peopleInRoom = Math.max(0, Math.min(50, parseInt(body.peopleInRoom, 10) || 0));
  // Build the link from configuration, not the Host header.
  const origin = (process.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/$/, "");
  const data = {
    inviterName: host?.name || session.user.name || "A BroCode user",
    inviterEmail: hostEmail,
    title: room.title,
    roomId: room.id,
    joinLink: `${origin}/playground/${room.id}`,
    message,
    peopleInRoom,
  };

  const results = [];
  for (const to of valid) {
    try {
      await sendPlaygroundInvite({ ...data, to, cc: hostEmail, replyTo: hostEmail });
      results.push({ email: to, ok: true });
      sentLog.get(session.user.id).push(Date.now());
    } catch (err) {
      console.error(`[playground] invite to ${to} failed:`, err.message);
      results.push({ email: to, ok: false });
    }
  }

  return NextResponse.json({
    ok: results.some((r) => r.ok),
    results,
    invalid,
    cc: hostEmail,
  });
}
