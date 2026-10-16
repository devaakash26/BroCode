'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { X, Search, Loader2, Check, Link2, UserPlus, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { colorFor, initials } from './utils';

// Same window the server enforces per invitee (socket-playground.js).
const RESEND_COOLDOWN_MS = 5000;

export default function InviteModal({ socket, roomId, open, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [sentAt, setSentAt] = useState({}); // userId → when we last invited them
  const [now, setNow] = useState(() => Date.now());
  const remainingFor = (id) => (sentAt[id] ? Math.max(0, RESEND_COOLDOWN_MS - (now - sentAt[id])) : 0);
  const coolingDown = Object.keys(sentAt).some((id) => remainingFor(id) > 0);

  // Tick only while some invite is cooling down.
  useEffect(() => {
    if (!open || !coolingDown) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [open, coolingDown]);

  useEffect(() => {
    if (!open || !socket) return;
    setLoading(true);
    setSelected(new Set());
    socket.emit('pg:online', {}, (res) => {
      setUsers(res?.users || []);
      setLoading(false);
    });
  }, [open, socket]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.name?.toLowerCase().includes(q)) : users;
  }, [users, query]);

  if (!open) return null;

  const link = typeof window !== 'undefined' ? `${window.location.origin}/playground/${roomId}` : '';

  const toggle = (id) => {
    if (remainingFor(id) > 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const sendTo = (userIds, { resend = false } = {}) => {
    const ids = userIds.filter((id) => remainingFor(id) === 0);
    if (!ids.length) return;
    socket.emit('pg:invite', { userIds: ids }, (res) => {
      if (!res?.ok) return toast.error('Could not send invites');
      // Older socket servers reply with a count instead of the list of ids.
      const sent = Array.isArray(res.sent) ? res.sent : ids;
      const throttled = Array.isArray(res.throttled) ? res.throttled : [];
      const t = Date.now();
      setNow(t);
      setSentAt((prev) => ({ ...prev, ...Object.fromEntries(sent.map((id) => [id, t])) }));
      setSelected((prev) => new Set([...prev].filter((id) => !sent.includes(id))));
      if (sent.length) {
        const who = sent.length === 1 ? users.find((u) => u.id === sent[0])?.name || '1 person' : `${sent.length} people`;
        toast.success(`${resend ? 'Invite resent to' : 'Invited'} ${who}`);
      }
      if (throttled.length) toast(`Wait a few seconds before re-inviting ${throttled.length === 1 ? 'them' : 'those people'}`);
    });
  };

  const send = () => sendTo([...selected]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Invite to playground</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">People online right now</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <button
            onClick={copyLink}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Link2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1 text-left font-mono text-xs">{link}</span>
            <span className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold">Copy</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search online users…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        <div className="flex-1 min-h-[160px] overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              {query ? 'No one matches that name' : 'Nobody else is online right now — share the link instead'}
            </p>
          ) : (
            filtered.map((u) => {
              const isSel = selected.has(u.id);
              const remaining = remainingFor(u.id);
              const cooling = remaining > 0;
              const wasInvited = !!sentAt[u.id];
              return (
                <div
                  key={u.id}
                  role="button"
                  tabIndex={cooling ? -1 : 0}
                  aria-disabled={cooling}
                  onClick={() => toggle(u.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(u.id))}
                  className={`relative w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                    cooling
                      ? 'cursor-default'
                      : isSel
                        ? 'cursor-pointer bg-indigo-50 dark:bg-indigo-900/30'
                        : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {u.image ? (
                      <Image src={u.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: colorFor(u.id) }}
                      >
                        {initials(u.name)}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                    {u.name || 'Unknown'}
                  </span>

                  {cooling ? (
                    <span className="relative inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg overflow-hidden bg-emerald-500/10 ring-1 ring-emerald-500/25 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      <Check className="w-3 h-3" />
                      Sent · resend in {Math.ceil(remaining / 1000)}s
                      {/* drains left → right over the cooldown */}
                      <span
                        className="absolute left-0 bottom-0 h-0.5 bg-emerald-500/60 transition-[width] duration-200 ease-linear"
                        style={{ width: `${(remaining / RESEND_COOLDOWN_MS) * 100}%` }}
                      />
                    </span>
                  ) : wasInvited ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendTo([u.id], { resend: true });
                      }}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 ring-1 ring-indigo-500/25 hover:bg-indigo-500/20 transition-colors"
                    >
                      <RotateCw className="w-3 h-3" /> Resend
                    </button>
                  ) : null}

                  {!cooling && (
                    <span
                      className={`w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center ${
                        isSel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500">{selected.size} selected</span>
          <button
            onClick={send}
            disabled={!selected.size}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white"
          >
            <UserPlus className="w-4 h-4" /> Send invite
          </button>
        </div>
      </div>
    </div>
  );
}
