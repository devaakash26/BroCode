const crypto = require("crypto");
const Y = require("yjs");
const { createPersistence } = require("./socket-playground-db");

const ROOM_TTL = 6 * 60 * 60; // seconds — refreshed on activity
const EMPTY_ROOM_TTL = 15 * 60; // keep an empty room around for refresh/rejoin
// People per room (unique users — extra tabs of the same person don't count).
const MAX_PEERS = parseInt(process.env.PLAYGROUND_MAX_PEERS || "10", 10);
const MAX_INPUTS = 5;
const MAX_CHAT = 100;
const MAX_STROKES = 3000;
const MAX_STROKE_POINTS = 6000; // flat [x,y,x,y…] length
const MAX_YJS_UPDATE = 256 * 1024;
const YJS_COMPACT_AT = 300; // merge stored updates once the list grows past this
const MAX_SIGNAL = 16 * 1024;
const MAX_OUTPUT = 64 * 1024;
const INVITE_COOLDOWN_MS = 5000; // per room + invitee
const LANGUAGES = ["c", "cpp", "java", "javascript", "python"];

const TEMPLATES = {
  c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, BroCode!\\n");\n    return 0;\n}\n',
  cpp: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    cout << "Hello, BroCode!" << endl;\n    return 0;\n}\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, BroCode!");\n    }\n}\n',
  javascript: 'const input = require("fs").readFileSync(0, "utf8");\n\nconsole.log("Hello, BroCode!");\n',
  python: 'import sys\n\ninput_data = sys.stdin.read()\n\nprint("Hello, BroCode!")\n',
};

const roomKey = (id) => `pg:${id}`;
const isRoomId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{6,24}$/.test(id);
const clip = (s, n) => (typeof s === "string" ? s.slice(0, n) : "");

// Initial Yjs state is built server-side so two clients can never race to
// insert the same template twice.
function buildInitialDoc() {
  const doc = new Y.Doc();
  doc.transact(() => {
    doc.getMap("meta").set("language", "cpp");
    for (const lang of LANGUAGES) doc.getText(`code:${lang}`).insert(0, TEMPLATES[lang]);
    doc.getArray("inputs").push([new Y.Text()]);
  });
  return Buffer.from(Y.encodeStateAsUpdate(doc));
}

// ── Storage: Redis with in-memory fallback ──────────────────────────────────────
function createStore(getRedis) {
  const mem = new Map(); // id → { meta, yjs: Buffer[], strokes: Map, chat: [], run, expiresAt }
  let strokeSeq = 0;

  setInterval(() => {
    const now = Date.now();
    for (const [id, r] of mem) if (r.expiresAt < now) mem.delete(id);
  }, 60_000).unref();

  const memRoom = (id) => mem.get(id);
  const k = (id, part) => `${roomKey(id)}:${part}`;
  const PARTS = ["meta", "yjs", "strokes", "strokes:seq", "chat", "run"];

  async function expire(id, ttl) {
    const redis = getRedis();
    if (redis) {
      const multi = redis.multi();
      PARTS.forEach((p) => multi.expire(k(id, p), ttl));
      await multi.exec();
    }
    const r = memRoom(id);
    if (r) r.expiresAt = Date.now() + ttl * 1000;
  }

  return {
    async createRoom(meta) {
      const yjs = buildInitialDoc();
      const redis = getRedis();
      if (redis) {
        await redis
          .multi()
          .set(k(meta.id, "meta"), JSON.stringify(meta), "EX", ROOM_TTL)
          .rpush(k(meta.id, "yjs"), yjs)
          .expire(k(meta.id, "yjs"), ROOM_TTL)
          .exec();
        return;
      }
      mem.set(meta.id, {
        meta,
        yjs: [yjs],
        strokes: new Map(),
        chat: [],
        run: null,
        expiresAt: Date.now() + ROOM_TTL * 1000,
      });
    },

    /** Put a room back into the hot store from its database copy. */
    async restoreRoom({ meta, yjs, strokes, chat, run }) {
      const doc = yjs || buildInitialDoc();
      const ordered = strokes.map((st, i) => ({ ...st, seq: i + 1 }));
      const redis = getRedis();
      if (redis) {
        const multi = redis
          .multi()
          .set(k(meta.id, "meta"), JSON.stringify(meta), "EX", ROOM_TTL)
          .del(k(meta.id, "yjs"), k(meta.id, "strokes"), k(meta.id, "chat"))
          .rpush(k(meta.id, "yjs"), doc)
          .set(k(meta.id, "strokes:seq"), ordered.length);
        if (ordered.length) multi.hset(k(meta.id, "strokes"), ...ordered.flatMap((st) => [st.id, JSON.stringify(st)]));
        if (chat.length) multi.rpush(k(meta.id, "chat"), ...chat.map((m) => JSON.stringify(m)));
        if (run) multi.set(k(meta.id, "run"), JSON.stringify(run));
        await multi.exec();
        await expire(meta.id, ROOM_TTL);
        return;
      }
      mem.set(meta.id, {
        meta,
        yjs: [doc],
        strokes: new Map(ordered.map((st) => [st.id, st])),
        chat: [...chat],
        run: run || null,
        expiresAt: Date.now() + ROOM_TTL * 1000,
      });
    },

    async getMeta(id) {
      const redis = getRedis();
      if (redis) {
        const raw = await redis.get(k(id, "meta"));
        if (raw) return JSON.parse(raw);
      }
      return memRoom(id)?.meta || null;
    },

    async setMeta(meta) {
      const redis = getRedis();
      if (redis) await redis.set(k(meta.id, "meta"), JSON.stringify(meta), "KEEPTTL");
      const r = memRoom(meta.id);
      if (r) r.meta = meta;
    },

    touch: (id) => expire(id, ROOM_TTL),
    expireSoon: (id) => expire(id, EMPTY_ROOM_TTL),

    async pushYjs(id, update) {
      const redis = getRedis();
      if (redis) {
        const len = await redis.rpush(k(id, "yjs"), update);
        if (len > YJS_COMPACT_AT) await this.compactYjs(id, len);
        return;
      }
      const r = memRoom(id);
      if (!r) return;
      r.yjs.push(update);
      if (r.yjs.length > YJS_COMPACT_AT) r.yjs = [Buffer.from(Y.mergeUpdates(r.yjs))];
    },

    // Merge the first `n` stored updates into one. The lock stops two instances
    // from trimming the same prefix twice; updates appended meanwhile survive
    // because LTRIM keeps everything after index n.
    async compactYjs(id, n) {
      const redis = getRedis();
      const lock = await redis.set(k(id, "yjs:lock"), "1", "EX", 10, "NX");
      if (!lock) return;
      try {
        const parts = await redis.lrangeBuffer(k(id, "yjs"), 0, n - 1);
        const merged = Buffer.from(Y.mergeUpdates(parts));
        await redis
          .multi()
          .ltrim(k(id, "yjs"), parts.length, -1)
          .lpush(k(id, "yjs"), merged)
          .exec();
      } finally {
        await redis.del(k(id, "yjs:lock"));
      }
    },

    async getYjs(id) {
      const redis = getRedis();
      const parts = redis
        ? await redis.lrangeBuffer(k(id, "yjs"), 0, -1)
        : memRoom(id)?.yjs || [];
      return parts.length ? Buffer.from(Y.mergeUpdates(parts)) : null;
    },

    async addStroke(id, stroke) {
      const redis = getRedis();
      if (redis) {
        stroke.seq = await redis.incr(k(id, "strokes:seq"));
        await redis
          .multi()
          .hset(k(id, "strokes"), stroke.id, JSON.stringify(stroke))
          .expire(k(id, "strokes"), ROOM_TTL)
          .expire(k(id, "strokes:seq"), ROOM_TTL)
          .exec();
        return;
      }
      const r = memRoom(id);
      if (!r || r.strokes.size >= MAX_STROKES) return;
      stroke.seq = ++strokeSeq;
      r.strokes.set(stroke.id, stroke);
    },

    async countStrokes(id) {
      const redis = getRedis();
      return redis ? redis.hlen(k(id, "strokes")) : memRoom(id)?.strokes.size || 0;
    },

    async getStroke(id, strokeId) {
      const redis = getRedis();
      if (redis) {
        const raw = await redis.hget(k(id, "strokes"), strokeId);
        return raw ? JSON.parse(raw) : null;
      }
      return memRoom(id)?.strokes.get(strokeId) || null;
    },

    async removeStroke(id, strokeId) {
      const redis = getRedis();
      if (redis) await redis.hdel(k(id, "strokes"), strokeId);
      memRoom(id)?.strokes.delete(strokeId);
    },

    async clearStrokes(id) {
      const redis = getRedis();
      if (redis) await redis.del(k(id, "strokes"));
      memRoom(id)?.strokes.clear();
    },

    async getStrokes(id) {
      const redis = getRedis();
      const list = redis
        ? Object.values(await redis.hgetall(k(id, "strokes"))).map((s) => JSON.parse(s))
        : [...(memRoom(id)?.strokes.values() || [])];
      return list.sort((a, b) => a.seq - b.seq);
    },

    async pushChat(id, msg) {
      const redis = getRedis();
      if (redis) {
        await redis
          .multi()
          .rpush(k(id, "chat"), JSON.stringify(msg))
          .ltrim(k(id, "chat"), -MAX_CHAT, -1)
          .expire(k(id, "chat"), ROOM_TTL)
          .exec();
        return;
      }
      const r = memRoom(id);
      if (!r) return;
      r.chat.push(msg);
      if (r.chat.length > MAX_CHAT) r.chat.shift();
    },

    async getChat(id) {
      const redis = getRedis();
      if (redis) return (await redis.lrange(k(id, "chat"), 0, -1)).map((m) => JSON.parse(m));
      return memRoom(id)?.chat || [];
    },

    async setRun(id, run) {
      const redis = getRedis();
      if (redis) await redis.set(k(id, "run"), JSON.stringify(run), "EX", ROOM_TTL);
      const r = memRoom(id);
      if (r) r.run = run;
    },

    async getRun(id) {
      const redis = getRedis();
      if (redis) {
        const raw = await redis.get(k(id, "run"));
        return raw ? JSON.parse(raw) : null;
      }
      return memRoom(id)?.run || null;
    },
  };
}

// ── Validation helpers ──────────────────────────────────────────────────────────
const isColor = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);

function sanitizePoints(pts) {
  if (!Array.isArray(pts)) return null;
  const out = [];
  for (let i = 0; i < pts.length && i < MAX_STROKE_POINTS; i++) {
    const n = Number(pts[i]);
    if (!Number.isFinite(n)) return null;
    out.push(Math.round(n * 10) / 10);
  }
  return out;
}

function sanitizeStroke(s) {
  if (!s || typeof s.id !== "string" || s.id.length > 40) return null;
  const pts = sanitizePoints(s.pts);
  if (!pts || pts.length < 2) return null;
  return {
    id: s.id,
    tool: s.tool === "eraser" ? "eraser" : "pen",
    color: isColor(s.color) ? s.color : "#111827",
    size: Math.min(80, Math.max(1, Number(s.size) || 3)),
    pts,
  };
}

function toBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return null;
}

function sanitizeRun(run) {
  if (!run || !Array.isArray(run.results)) return null;
  return {
    language: LANGUAGES.includes(run.language) ? run.language : "cpp",
    results: run.results.slice(0, MAX_INPUTS).map((r) => ({
      status: clip(r?.status, 60),
      stdout: clip(r?.stdout, MAX_OUTPUT),
      stderr: clip(r?.stderr, MAX_OUTPUT),
      compileOutput: clip(r?.compileOutput, MAX_OUTPUT),
      time: r?.time ?? null,
      memory: r?.memory ?? null,
      ok: !!r?.ok,
    })),
    error: clip(run.error, 500) || null,
  };
}

// ── Registration ────────────────────────────────────────────────────────────────
function registerPlayground(io, { getRedis, getOnlineUsers, prisma }) {
  const store = createStore(getRedis);
  const db = createPersistence(prisma, {
    loadSnapshot: async (id) => {
      const [yjs, strokes, run] = await Promise.all([store.getYjs(id), store.getStrokes(id), store.getRun(id)]);
      return { yjs, strokes, run };
    },
  });
  const lastInvite = new Map(); // `${roomId}:${userId}` → ts (per instance is enough)

  async function peersOf(roomId) {
    const sockets = await io.in(roomKey(roomId)).fetchSockets();
    return sockets
      .filter((s) => s.data?.user)
      .map((s) => ({
        peerId: s.id,
        userId: s.data.user.id,
        name: s.data.user.name || "Anonymous",
        image: s.data.user.image || null,
        voice: !!s.data.pgVoice,
        muted: !!s.data.pgMuted,
        camera: !!s.data.pgCamera,
      }));
  }

  async function broadcastPeers(roomId) {
    const peers = await peersOf(roomId);
    io.to(roomKey(roomId)).emit("pg:peers", peers);
    return peers;
  }

  async function leaveRoom(socket, roomId) {
    if (!roomId) return;
    if (socket.data.user) db.participantLeft(roomId, socket.data.user.id);
    socket.leave(roomKey(roomId));
    if (socket.data.pgRoom === roomId) {
      socket.data.pgRoom = null;
      socket.data.pgVoice = false;
      socket.data.pgMuted = false;
      socket.data.pgCamera = false;
    }
    io.to(roomKey(roomId)).emit("pg:peerLeft", { peerId: socket.id });
    const peers = await broadcastPeers(roomId);
    if (peers.length === 0) {
      await store.expireSoon(roomId);
      db.checkpoint(roomId);
    }
  }

  // Wrap a handler: require identification + room membership, swallow errors.
  const inRoom = (socket, fn) => async (payload, ack) => {
    const roomId = socket.data.pgRoom;
    if (!roomId || !socket.data.user || !socket.rooms.has(roomKey(roomId))) {
      if (typeof ack === "function") ack({ error: "not_in_room" });
      return;
    }
    try {
      await fn(roomId, payload, ack);
    } catch (err) {
      console.error("[playground] handler error:", err);
      if (typeof ack === "function") ack({ error: "server_error" });
    }
  };

  io.on("connection", (socket) => {
    socket.on("pg:create", async (payload, ack) => {
      if (typeof ack !== "function") return;
      const user = socket.data.user;
      if (!user) return ack({ error: "not_identified" });
      try {
        const meta = {
          id: crypto.randomBytes(6).toString("base64url"),
          title: clip(payload?.title?.trim(), 60) || `${user.name || "Someone"}'s playground`,
          hostId: user.id,
          hostName: user.name || "Anonymous",
          createdAt: Date.now(),
          endedAt: null,
        };
        await store.createRoom(meta);
        db.sessionCreated(meta, MAX_PEERS);
        ack({ ok: true, roomId: meta.id });
      } catch (err) {
        console.error("[playground] create error:", err);
        ack({ error: "server_error" });
      }
    });

    socket.on("pg:join", async (payload, ack) => {
      if (typeof ack !== "function") return;
      const user = socket.data.user;
      const roomId = payload?.roomId;
      if (!user) return ack({ error: "not_identified" });
      if (!isRoomId(roomId)) return ack({ error: "not_found" });
      try {
        let meta = await store.getMeta(roomId);
        if (!meta) {
          // Redis copy expired (or a cold instance) — revive it from the database.
          const saved = await db.restore(roomId);
          if (saved) {
            await store.restoreRoom(saved);
            meta = saved.meta;
          }
        }
        if (!meta) return ack({ error: "not_found" });
        if (meta.endedAt) return ack({ error: "ended" });

        const people = new Set((await peersOf(roomId)).map((p) => p.userId));
        if (people.size >= MAX_PEERS && !people.has(user.id)) {
          return ack({ error: "full" });
        }

        if (socket.data.pgRoom && socket.data.pgRoom !== roomId) {
          await leaveRoom(socket, socket.data.pgRoom);
        }
        socket.join(roomKey(roomId));
        socket.data.pgRoom = roomId;

        const [yjs, strokes, chat, run] = await Promise.all([
          store.getYjs(roomId),
          store.getStrokes(roomId),
          store.getChat(roomId),
          store.getRun(roomId),
          store.touch(roomId),
        ]);
        const peers = await broadcastPeers(roomId);
        socket.to(roomKey(roomId)).emit("pg:peerJoined", { peerId: socket.id, name: user.name });
        db.participantJoined(roomId, user.id, new Set(peers.map((p) => p.userId)).size);

        ack({ ok: true, room: { ...meta, maxPeers: MAX_PEERS }, peers, yjs, strokes, chat, run, peerId: socket.id });
      } catch (err) {
        console.error("[playground] join error:", err);
        ack({ error: "server_error" });
      }
    });

    socket.on("pg:leave", () => leaveRoom(socket, socket.data.pgRoom));

    socket.on(
      "pg:end",
      inRoom(socket, async (roomId, _p, ack) => {
        const meta = await store.getMeta(roomId);
        if (!meta || meta.hostId !== socket.data.user.id) {
          return typeof ack === "function" && ack({ error: "forbidden" });
        }
        meta.endedAt = Date.now();
        await store.setMeta(meta);
        await store.expireSoon(roomId);
        db.sessionEnded(roomId);
        io.to(roomKey(roomId)).emit("pg:ended", { by: socket.data.user.name });
        io.in(roomKey(roomId)).socketsLeave(roomKey(roomId));
        if (typeof ack === "function") ack({ ok: true });
      }),
    );

    // ── Collaborative document (Yjs) ──────────────────────────────────────────
    socket.on(
      "pg:yjs",
      inRoom(socket, async (roomId, data) => {
        const update = toBuffer(data);
        if (!update || update.length === 0 || update.length > MAX_YJS_UPDATE) return;
        socket.to(roomKey(roomId)).emit("pg:yjs", update);
        await store.pushYjs(roomId, update);
        db.markDirty(roomId);
      }),
    );

    // Editor cursor/selection — high frequency, fine to drop.
    socket.on(
      "pg:cursor",
      inRoom(socket, (roomId, c) => {
        if (!c || JSON.stringify(c).length > 2048) return;
        socket.volatile.to(roomKey(roomId)).emit("pg:cursor", {
          peerId: socket.id,
          userId: socket.data.user.id,
          name: socket.data.user.name,
          lang: c.lang,
          anchor: c.anchor ?? null,
          head: c.head ?? null,
        });
      }),
    );

    // ── Whiteboard ────────────────────────────────────────────────────────────
    socket.on(
      "pg:pointer",
      inRoom(socket, (roomId, p) => {
        const x = Number(p?.x);
        const y = Number(p?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        socket.volatile.to(roomKey(roomId)).emit("pg:pointer", {
          peerId: socket.id,
          userId: socket.data.user.id,
          name: socket.data.user.name,
          x,
          y,
          drawing: !!p.drawing,
        });
      }),
    );

    socket.on(
      "pg:draw",
      inRoom(socket, async (roomId, op) => {
        const room = roomKey(roomId);
        const userId = socket.data.user.id;
        switch (op?.t) {
          case "begin":
          case "pts": {
            const pts = sanitizePoints(op.pts);
            if (!pts || typeof op.id !== "string") return;
            const msg = { t: op.t, id: op.id, pts, userId };
            if (op.t === "begin") {
              msg.tool = op.tool === "eraser" ? "eraser" : "pen";
              msg.color = isColor(op.color) ? op.color : "#111827";
              msg.size = Math.min(80, Math.max(1, Number(op.size) || 3));
            }
            socket.to(room).emit("pg:draw", msg);
            return;
          }
          case "end": {
            const stroke = sanitizeStroke(op.stroke);
            if (!stroke) return;
            if ((await store.countStrokes(roomId)) >= MAX_STROKES) {
              socket.emit("pg:notice", { message: "Board is full — clear it to keep drawing" });
              return;
            }
            stroke.userId = userId;
            await store.addStroke(roomId, stroke);
            db.markDirty(roomId);
            socket.to(room).emit("pg:draw", { t: "end", stroke });
            return;
          }
          case "undo": {
            const stroke = await store.getStroke(roomId, op.id);
            if (!stroke || stroke.userId !== userId) return;
            await store.removeStroke(roomId, op.id);
            db.markDirty(roomId);
            io.to(room).emit("pg:draw", { t: "undo", id: op.id });
            return;
          }
          case "clear": {
            await store.clearStrokes(roomId);
            db.markDirty(roomId);
            io.to(room).emit("pg:draw", { t: "clear", by: socket.data.user.name });
            return;
          }
        }
      }),
    );

    // ── Chat ──────────────────────────────────────────────────────────────────
    socket.on(
      "pg:chat",
      inRoom(socket, async (roomId, payload, ack) => {
        const text = clip(payload?.text?.trim(), 1000);
        if (!text) return;
        const user = socket.data.user;
        const msg = {
          id: crypto.randomBytes(8).toString("hex"),
          userId: user.id,
          name: user.name || "Anonymous",
          image: user.image || null,
          text,
          at: Date.now(),
        };
        io.to(roomKey(roomId)).emit("pg:chat", msg);
        if (typeof ack === "function") ack({ ok: true });
        await store.pushChat(roomId, msg);
        db.message(roomId, msg);
      }),
    );

    // ── Compiler: the runner calls Judge0 via Next.js, then shares the result ─
    socket.on(
      "pg:running",
      inRoom(socket, (roomId, p) => {
        socket.to(roomKey(roomId)).emit("pg:running", {
          running: !!p?.running,
          name: socket.data.user.name,
        });
      }),
    );

    socket.on(
      "pg:run",
      inRoom(socket, async (roomId, payload) => {
        const run = sanitizeRun(payload);
        if (!run) return;
        run.by = socket.data.user.name;
        run.at = Date.now();
        io.to(roomKey(roomId)).emit("pg:run", run);
        await store.setRun(roomId, run);
        db.run(roomId, socket.data.user.id, run);
      }),
    );

    // ── Invites ───────────────────────────────────────────────────────────────
    socket.on(
      "pg:online",
      inRoom(socket, async (roomId, _p, ack) => {
        if (typeof ack !== "function") return;
        const inRoomIds = new Set((await peersOf(roomId)).map((p) => p.userId));
        const users = (await getOnlineUsers()).filter((u) => !inRoomIds.has(u.id));
        ack({ ok: true, users: users.slice(0, 100) });
      }),
    );

    socket.on(
      "pg:invite",
      inRoom(socket, async (roomId, payload, ack) => {
        const ids = Array.isArray(payload?.userIds) ? payload.userIds.slice(0, 20) : [];
        const meta = await store.getMeta(roomId);
        const user = socket.data.user;
        const now = Date.now();
        if (lastInvite.size > 5000) {
          for (const [key, t] of lastInvite) if (now - t > INVITE_COOLDOWN_MS) lastInvite.delete(key);
        }
        const sent = [];
        const throttled = [];
        for (const id of ids) {
          if (typeof id !== "string" || id === user.id) continue;
          const key = `${roomId}:${id}`;
          if (now - (lastInvite.get(key) || 0) < INVITE_COOLDOWN_MS) {
            throttled.push(id);
            continue;
          }
          lastInvite.set(key, now);
          sent.push(id);
          io.to(`user:${id}`).emit("pg:invited", {
            roomId,
            title: meta?.title || "Playground",
            from: { id: user.id, name: user.name, image: user.image || null },
          });
        }
        if (typeof ack === "function") ack({ ok: true, sent, throttled });
      }),
    );

    // ── Voice + camera (WebRTC mesh; server only relays signalling) ────────────────────
    socket.on(
      "pg:voice",
      inRoom(socket, async (roomId, p) => {
        socket.data.pgVoice = !!p?.on;
        socket.data.pgMuted = !!p?.muted;
        socket.data.pgCamera = !!p?.on && !!p?.camera;
        await broadcastPeers(roomId);
      }),
    );

    socket.on(
      "pg:signal",
      inRoom(socket, (roomId, p) => {
        if (typeof p?.to !== "string" || !p.data) return;
        if (JSON.stringify(p.data).length > MAX_SIGNAL) return;
        io.to(p.to).emit("pg:signal", { from: socket.id, roomId, data: p.data });
      }),
    );

    socket.on("disconnect", () => {
      const roomId = socket.data.pgRoom;
      if (roomId) leaveRoom(socket, roomId).catch(() => {});
    });
  });
}

module.exports = { registerPlayground };
