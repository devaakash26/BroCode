/**
 * Durable storage for Live Playground sessions (Prisma / Postgres).
 *
 * Redis stays the hot store for the live room; this module copies it to the
 * database in the background so nothing on the real-time path waits on a
 * query:
 *   - chat messages are buffered and written with one createMany every 2s
 *   - code (Yjs state) + board are checkpointed every 30s for rooms that changed,
 *     and immediately when a room empties or ends
 *   - participants get one row per person (joins upsert, leaves stamp lastSeenAt)
 * Every write swallows its own errors — a DB hiccup must never break a room.
 */

const Y = require("yjs");

const CHAT_FLUSH_MS = 2000;
const CHECKPOINT_MS = 30_000;
const RESTORE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // don't revive rooms older than a week
const MAX_BOARD_BYTES = 4 * 1024 * 1024;
const RESTORE_CHAT = 100;

function languageOf(yjsState) {
  try {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, yjsState);
    return doc.getMap("meta").get("language") || null;
  } catch {
    return null;
  }
}

function createPersistence(prisma, { loadSnapshot, log = console } = {}) {
  const noop = async () => null;
  if (!prisma?.playgroundSession) {
    log.warn("[playground-db] Prisma models missing — sessions are kept in Redis only");
    return {
      sessionCreated: noop, participantJoined: noop, participantLeft: noop, message: noop,
      run: noop, markDirty: () => {}, checkpoint: noop, sessionEnded: noop, restore: noop,
    };
  }

  const chatBuffer = [];
  const dirty = new Set();

  const bg = (label, fn) =>
    Promise.resolve()
      .then(fn)
      .catch((err) => log.error(`[playground-db] ${label}:`, err.message?.split("\n").pop()));

  async function flushChat() {
    if (!chatBuffer.length) return;
    const batch = chatBuffer.splice(0, chatBuffer.length);
    await prisma.playgroundMessage.createMany({ data: batch, skipDuplicates: true });
    const perRoom = new Map();
    for (const m of batch) perRoom.set(m.sessionId, (perRoom.get(m.sessionId) || 0) + 1);
    await Promise.all(
      [...perRoom].map(([id, n]) =>
        prisma.playgroundSession.updateMany({
          where: { id },
          data: { messageCount: { increment: n }, lastActiveAt: new Date() },
        }),
      ),
    );
  }

  async function checkpoint(roomId) {
    dirty.delete(roomId);
    const snap = await loadSnapshot(roomId);
    if (!snap) return;
    const data = { lastActiveAt: new Date() };
    if (snap.yjs) {
      data.docState = snap.yjs;
      const lang = languageOf(snap.yjs);
      if (lang) data.language = lang;
    }
    if (snap.strokes) {
      const board = JSON.stringify(snap.strokes);
      if (board.length <= MAX_BOARD_BYTES) data.board = snap.strokes;
      else log.warn(`[playground-db] board for ${roomId} too large to store (${board.length} bytes)`);
    }
    if (snap.run) data.lastRun = snap.run;
    await prisma.playgroundSession.updateMany({ where: { id: roomId }, data });
  }

  setInterval(() => bg("chat flush", flushChat), CHAT_FLUSH_MS).unref();
  setInterval(() => {
    for (const id of [...dirty]) bg(`checkpoint ${id}`, () => checkpoint(id));
  }, CHECKPOINT_MS).unref();

  return {
    sessionCreated: (meta, maxPeers) =>
      bg("create session", () =>
        prisma.playgroundSession.create({
          data: {
            id: meta.id,
            title: meta.title,
            hostId: meta.hostId,
            maxPeers,
            createdAt: new Date(meta.createdAt),
            participants: { create: { userId: meta.hostId, joinCount: 0 } },
          },
        }),
      ),

    participantJoined: (roomId, userId, peopleNow) =>
      bg("participant join", async () => {
        await prisma.playgroundParticipant.upsert({
          where: { sessionId_userId: { sessionId: roomId, userId } },
          create: { sessionId: roomId, userId },
          update: { lastSeenAt: new Date(), joinCount: { increment: 1 } },
        });
        await prisma.playgroundSession.updateMany({
          where: { id: roomId, peakPeers: { lt: peopleNow } },
          data: { peakPeers: peopleNow },
        });
      }),

    participantLeft: (roomId, userId) =>
      bg("participant leave", () =>
        prisma.playgroundParticipant.updateMany({
          where: { sessionId: roomId, userId },
          data: { lastSeenAt: new Date() },
        }),
      ),

    message: (roomId, msg) => {
      chatBuffer.push({ id: msg.id, sessionId: roomId, userId: msg.userId, content: msg.text, createdAt: new Date(msg.at) });
    },

    run: (roomId, userId, run) =>
      bg("save run", async () => {
        await prisma.playgroundRun.create({
          data: {
            sessionId: roomId,
            userId,
            language: run.language,
            inputCount: run.results.length,
            passed: run.results.filter((r) => r.ok).length,
            results: run.results,
          },
        });
        await prisma.playgroundSession.updateMany({
          where: { id: roomId },
          data: { runCount: { increment: 1 }, lastRun: run, lastActiveAt: new Date() },
        });
      }),

    markDirty: (roomId) => dirty.add(roomId),

    checkpoint: (roomId) => bg(`checkpoint ${roomId}`, () => checkpoint(roomId)),

    sessionEnded: (roomId) =>
      bg("end session", async () => {
        await flushChat();
        await checkpoint(roomId);
        await prisma.playgroundSession.updateMany({
          where: { id: roomId },
          data: { status: "ENDED", endedAt: new Date() },
        });
      }),

    /** Rebuild a room whose Redis copy expired, if it's still active. */
    async restore(roomId) {
      try {
        const s = await prisma.playgroundSession.findFirst({
          where: { id: roomId, status: "ACTIVE", lastActiveAt: { gt: new Date(Date.now() - RESTORE_MAX_AGE_MS) } },
          include: {
            host: { select: { name: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: RESTORE_CHAT,
              include: { user: { select: { name: true, image: true } } },
            },
          },
        });
        if (!s) return null;
        return {
          meta: {
            id: s.id,
            title: s.title,
            hostId: s.hostId,
            hostName: s.host?.name || "Anonymous",
            createdAt: s.createdAt.getTime(),
            endedAt: null,
          },
          yjs: s.docState ? Buffer.from(s.docState) : null,
          strokes: Array.isArray(s.board) ? s.board : [],
          run: s.lastRun || null,
          chat: s.messages.reverse().map((m) => ({
            id: m.id,
            userId: m.userId,
            name: m.user?.name || "Anonymous",
            image: m.user?.image || null,
            text: m.content,
            at: m.createdAt.getTime(),
          })),
        };
      } catch (err) {
        log.error("[playground-db] restore:", err.message?.split("\n").pop());
        return null;
      }
    },
  };
}

module.exports = { createPersistence };
