"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNowStrict } from "date-fns";
import {
  PenTool, Radio, Users, UserCheck, MessageSquare, Play, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, Crown, ExternalLink, Loader2, Clock, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

const RANGES = [
  ["24h", "24 hours"],
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["all", "All time"],
];
const STATUSES = [
  ["all", "All statuses"],
  ["LIVE", "Active now"],
  ["ACTIVE", "Not ended"],
  ["ENDED", "Ended"],
];
const SORTS = [
  ["recent", "Newest first"],
  ["active", "Recently active"],
  ["people", "Most people"],
  ["messages", "Most messages"],
  ["runs", "Most code runs"],
];
const LANG = { cpp: "C++", c: "C", java: "Java", javascript: "JavaScript", python: "Python" };
const BAR = "#ea580c"; // validated against both card surfaces
const CARD = "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700";
const INPUT =
  "block w-full py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500";

const PALETTE = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"];
function colorFor(id = "") {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function Avatar({ user, size = 28 }) {
  if (user?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.image} alt="" width={size} height={size} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: colorFor(user?.id) }}
    >
      {(user?.name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function duration(from, to) {
  const ms = Math.max(0, new Date(to) - new Date(from));
  const m = Math.round(ms / 60000);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
}

function StatusBadge({ s }) {
  if (s.live)
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-green-500" />
        </span>
        Active now
      </span>
    );
  if (s.status === "ACTIVE")
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-3 h-3" /> Idle
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Ended
    </span>
  );
}

function Stat({ icon: Icon, label, value, sub, live }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        <Icon className={`w-4 h-4 ${live ? "text-green-500" : "text-gray-400"}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</div>}
    </div>
  );
}

/** Sessions per day. Single series, so no legend; per-bar hover tooltip. */
function DailyChart({ data }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  const ticks = max <= 4 ? [...new Set([0, Math.ceil(max / 2), max])] : [0, Math.round(max / 2), max];
  const labelEvery = data.length > 14 ? Math.ceil(data.length / 7) : data.length > 7 ? 2 : 1;

  return (
    <div className={`${CARD} p-5`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Sessions per day</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {total} in the last {data.length} days
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        {/* y axis */}
        <div className="relative w-6 h-40 text-[10px] text-gray-400 tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / max) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* grid */}
          <div className="absolute inset-x-0 top-0 h-40 pointer-events-none">
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-700/70" style={{ top: `${100 - (t / max) * 100}%` }} />
            ))}
          </div>
          <div className="relative h-40 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
            {data.map((d, i) => (
              <div
                key={d.date}
                className="relative flex-1 h-full flex items-end cursor-default"
                onMouseEnter={() => setHover(i)}
                aria-label={`${format(new Date(`${d.date}T00:00:00Z`), "MMM d")}: ${d.count} sessions`}
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: d.count ? `${Math.max(3, (d.count / max) * 100)}%` : 0,
                    background: BAR,
                    opacity: hover === null || hover === i ? 1 : 0.45,
                  }}
                />
                {hover === i && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-950 px-2.5 py-1.5 text-xs text-white shadow-lg pointer-events-none">
                    <div className="text-gray-400">{format(new Date(`${d.date}T00:00:00Z`), "EEE, MMM d")}</div>
                    <div className="font-semibold tabular-nums">
                      {d.count} session{d.count === 1 ? "" : "s"}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[2px] text-[10px] text-gray-400">
            {data.map((d, i) => (
              <span key={d.date} className="flex-1 text-center truncate">
                {i % labelEvery === 0 || i === data.length - 1 ? format(new Date(`${d.date}T00:00:00Z`), data.length > 7 ? "MMM d" : "EEE") : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopHosts({ hosts, onPick }) {
  return (
    <div className={`${CARD} p-5`}>
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Top hosts</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400">By rooms created in this period</p>
      {hosts.length === 0 ? (
        <p className="mt-6 text-sm text-gray-400">No rooms yet.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {hosts.map((h, i) => (
            <li key={h.user.id}>
              <button
                type="button"
                onClick={() => onPick(h.user.email || h.user.name || "")}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                title="Show this host's rooms"
              >
                <span className="w-4 text-xs text-gray-400 tabular-nums">{i + 1}</span>
                <Avatar user={h.user} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">{h.user.name || "Unnamed"}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{h.user.email}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{h.sessions}</span>
                  <span className="block text-[10px] text-gray-400">rooms</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────── detail drawer ───────────── */

function Drawer({ id, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return undefined;
    setData(null);
    setError(null);
    const ctrl = new AbortController();
    fetch(`/api/admin/playground?id=${encodeURIComponent(id)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => (d.success && d.session ? setData(d.session) : setError(d.error || "Session not found")))
      .catch((e) => e.name !== "AbortError" && setError("Failed to load session"));
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      ctrl.abort();
      window.removeEventListener("keydown", esc);
    };
  }, [id, onClose]);

  if (!id) return null;
  const s = data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative w-full sm:w-[520px] h-full overflow-y-auto bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 z-10 flex items-start gap-3 px-5 py-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{s?.title || "Loading…"}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-mono">{id}</span>
              {s && <StatusBadge s={s} />}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-gray-500">
            <AlertCircle className="mx-auto mb-2 w-6 h-6 text-red-500" />
            {error}
          </div>
        ) : !s ? (
          <div className="p-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="p-5 space-y-6">
            <div className="flex items-center gap-3">
              <Avatar user={s.host} size={40} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                  {s.host?.name || "Unknown host"} <Crown className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{s.host?.email}</div>
              </div>
              {s.status === "ACTIVE" && (
                <Link
                  href={`/playground/${s.id}`}
                  target="_blank"
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                  title="Opening the room adds you as a participant"
                >
                  Open room <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ["People", s.participants.length, `peak ${s.peakPeers}/${s.maxPeers}`],
                ["Messages", s.messageCount],
                ["Code runs", s.runCount],
                ["Duration", duration(s.createdAt, s.endedAt || s.lastActiveAt)],
              ].map(([k, v, sub]) => (
                <div key={k} className="rounded-md bg-gray-50 dark:bg-gray-800 px-3 py-2.5">
                  <dt className="text-[11px] text-gray-500 dark:text-gray-400">{k}</dt>
                  <dd className="text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{v}</dd>
                  {sub && <dd className="text-[11px] text-gray-400">{sub}</dd>}
                </div>
              ))}
            </dl>

            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              <div>Created {format(new Date(s.createdAt), "PPp")}</div>
              <div>Last active {formatDistanceToNowStrict(new Date(s.lastActiveAt), { addSuffix: true })}</div>
              {s.endedAt && <div>Ended {format(new Date(s.endedAt), "PPp")}</div>}
              <div>Language at last save: {LANG[s.language] || s.language}</div>
            </div>

            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Participants ({s.participants.length})</h3>
              <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                {s.participants.map((p) => (
                  <li key={p.user.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar user={p.user} size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white truncate">
                        {p.user.name || "Unnamed"}
                        {p.isHost && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Host</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.user.email}</div>
                    </div>
                    <div className="text-right text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                      <div>joined {format(new Date(p.firstJoinedAt), "p")}</div>
                      <div>
                        {p.joinCount > 1 ? `${p.joinCount} visits · ` : ""}seen {formatDistanceToNowStrict(new Date(p.lastSeenAt), { addSuffix: true })}
                      </div>
                    </div>
                  </li>
                ))}
                {s.participants.length === 0 && <li className="px-3 py-4 text-sm text-gray-400">Nobody has joined yet.</li>}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent code runs</h3>
              {s.runs.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">No code was run.</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-800 rounded-md border border-gray-200 dark:border-gray-700 text-sm">
                  {s.runs.map((r) => {
                    const all = r.passed === r.inputCount;
                    return (
                      <li key={r.id} className="flex items-center gap-3 px-3 py-2">
                        <Play className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-900 dark:text-white truncate">{r.user?.name || "Someone"}</span>
                        <span className="text-xs text-gray-500">{LANG[r.language] || r.language}</span>
                        <span className={`ml-auto text-xs font-medium tabular-nums ${all ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {r.passed}/{r.inputCount} ran OK
                        </span>
                        <span className="w-16 text-right text-[11px] text-gray-400">{format(new Date(r.createdAt), "p")}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Chat</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last {s.messages.length} of {s.messageCount} messages</p>
              {s.messages.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">No messages.</p>
              ) : (
                <ul className="mt-2 space-y-2.5 rounded-md border border-gray-200 dark:border-gray-700 p-3 max-h-80 overflow-y-auto">
                  {s.messages.map((m) => (
                    <li key={m.id} className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">{m.user?.name || "Someone"}</span>
                      <span className="ml-2 text-[11px] text-gray-400">{format(new Date(m.createdAt), "p")}</span>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{m.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

/* ───────────── page ───────────── */

export default function AdminPlaygroundPage() {
  const [range, setRange] = useState("7d");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // debounced
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [openId, setOpenId] = useState(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => setPage(1), [range, status, sort, query]);

  const load = useCallback(async () => {
    const n = ++reqRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({ range, status, sort, page: String(page) });
      if (query) params.set("q", query);
      const r = await fetch(`/api/admin/playground?${params}`);
      const d = await r.json();
      if (n !== reqRef.current) return; // a newer request is in flight
      if (!d.success) throw new Error(d.error);
      setData(d);
      setUpdatedAt(Date.now());
    } catch (e) {
      if (n === reqRef.current) toast.error(e.message || "Failed to load playground activity");
    } finally {
      if (n === reqRef.current) setLoading(false);
    }
  }, [range, status, sort, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep "active now" honest while the page is open.
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const closeDrawer = useCallback(() => setOpenId(null), []);
  const stats = data?.stats;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const rangeLabel = useMemo(() => RANGES.find(([k]) => k === range)?.[1].toLowerCase(), [range]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenTool className="w-6 h-6 text-orange-500" /> Playground activity
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Who is creating rooms, how many people join, and what happens inside.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            {RANGES.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  range === k ? "bg-orange-600 text-white" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            title={updatedAt ? `Updated ${formatDistanceToNowStrict(updatedAt, { addSuffix: true })}` : undefined}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats ? (
          <>
            <Stat icon={PenTool} label="Rooms created" value={stats.sessions} sub={`in the last ${rangeLabel}`} />
            <Stat icon={Radio} label="Active now" value={stats.liveNow} sub="used in the last 15 min" live={stats.liveNow > 0} />
            <Stat icon={Crown} label="Hosts" value={stats.uniqueHosts} sub="people who opened a room" />
            <Stat icon={UserCheck} label="Participants" value={stats.uniqueParticipants} sub={`${stats.avgPeople} per room on average`} />
            <Stat icon={MessageSquare} label="Chat messages" value={stats.messages.toLocaleString()} />
            <Stat icon={Play} label="Code runs" value={stats.runs.toLocaleString()} sub={`largest room: ${stats.peakPeople} people`} />
          </>
        ) : (
          [0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={`${CARD} h-[104px] animate-pulse`} />)
        )}
      </div>

      {/* chart + hosts */}
      <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        {data ? <DailyChart data={data.chart} /> : <div className={`${CARD} h-[248px] animate-pulse`} />}
        {data ? <TopHosts hosts={data.topHosts} onPick={setQ} /> : <div className={`${CARD} h-[248px] animate-pulse`} />}
      </div>

      {/* filters */}
      <div className={`${CARD} p-4`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by room name, room code, host name or email…"
              className={`${INPUT} pl-9 pr-8`}
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700" aria-label="Clear search">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${INPUT} md:w-44 px-3`}>
            {STATUSES.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${INPUT} md:w-48 px-3`}>
            {SORTS.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* table */}
      <div className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {["Room", "Host", "People", "Activity", "Status", "Created", "Duration"].map((h) => (
                  <th key={h} scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${loading && data ? "opacity-60" : ""} transition-opacity`}>
              {!data ? (
                [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-4">
                      <div className="h-4 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : data.sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <Users className="mx-auto mb-2 w-6 h-6 text-gray-300 dark:text-gray-600" />
                    No rooms match these filters.
                  </td>
                </tr>
              ) : (
                data.sessions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setOpenId(s.id)}
                    onKeyDown={(e) => e.key === "Enter" && setOpenId(s.id)}
                    tabIndex={0}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40 focus:outline-none focus-visible:bg-orange-50 dark:focus-visible:bg-orange-900/10"
                  >
                    <td className="px-5 py-3.5 max-w-[240px]">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.title}</div>
                      <div className="text-xs font-mono text-gray-400">{s.id}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <Avatar user={s.host} size={28} />
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 dark:text-white truncate">{s.host?.name || "Unknown"}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">{s.host?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="text-sm font-medium tabular-nums text-gray-900 dark:text-white">
                        {s.participants} <span className="font-normal text-gray-400">joined</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="w-16 h-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <span className="block h-full rounded-full" style={{ width: `${(s.peakPeers / s.maxPeers) * 100}%`, background: BAR }} />
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">peak {s.peakPeers}/{s.maxPeers}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 tabular-nums">
                      <div className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-gray-400" /> {s.messages} messages</div>
                      <div className="flex items-center gap-1 mt-0.5"><Play className="w-3 h-3 text-gray-400" /> {s.runs} runs</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap"><StatusBadge s={s} /></td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300" title={format(new Date(s.createdAt), "PPpp")}>
                      {formatDistanceToNowStrict(new Date(s.createdAt), { addSuffix: true })}
                      <div className="text-[11px] text-gray-400">{format(new Date(s.createdAt), "MMM d, p")}</div>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 tabular-nums">
                      {duration(s.createdAt, s.endedAt || s.lastActiveAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && data.total > data.pageSize && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-sm">
            <span className="text-gray-500 dark:text-gray-400 tabular-nums">
              {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 tabular-nums text-gray-600 dark:text-gray-300">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <Drawer id={openId} onClose={closeDrawer} />
    </div>
  );
}
