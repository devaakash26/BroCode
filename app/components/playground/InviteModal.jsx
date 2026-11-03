'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Loader2, Check, Link2, UserPlus, RotateCw, Mail, Users, Send, Eye, EyeOff, AlertCircle, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { colorFor, initials } from './utils';

// Same window the server enforces per invitee (socket-playground.js).
const RESEND_COOLDOWN_MS = 5000;
const MAX_EMAILS = 10;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

/* ───────────── email chips ───────────── */

function EmailField({ emails, setEmails, disabled, selfEmail }) {
  const [draft, setDraft] = useState('');
  const ref = useRef(null);

  const commit = (raw) => {
    const parts = raw.split(/[\s,;]+/).map((s) => s.trim().replace(/^<|>$/g, '')).filter(Boolean);
    if (!parts.length) return;
    setEmails((cur) => {
      const next = [...cur];
      for (const p of parts) {
        const e = p.toLowerCase();
        if (next.some((x) => x.email === e)) continue;
        if (next.length >= MAX_EMAILS) {
          toast(`Up to ${MAX_EMAILS} people at a time`);
          break;
        }
        next.push({ email: e, valid: EMAIL_RE.test(e) && e !== selfEmail, self: e === selfEmail });
      }
      return next;
    });
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (['Enter', ',', ' ', 'Tab'].includes(e.key) && draft.trim()) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && !draft && emails.length) {
      setEmails((cur) => cur.slice(0, -1));
    }
  };

  return (
    <div
      onClick={() => ref.current?.focus()}
      className="min-h-[46px] w-full flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0d14] focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/15 transition-all cursor-text"
    >
      <AnimatePresence initial={false}>
        {emails.map((x) => (
          <motion.span
            key={x.email}
            layout
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            title={x.self ? "That's you — you're cc'd anyway" : x.valid ? x.email : 'Not a valid email'}
            className={`inline-flex items-center gap-1 max-w-full h-7 pl-1 pr-1.5 rounded-lg text-[13px] ${
              x.valid
                ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-200 dark:ring-indigo-400/20'
                : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-400/25'
            }`}
          >
            <span
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: x.valid ? colorFor(x.email) : '#f43f5e' }}
            >
              {x.valid ? x.email[0].toUpperCase() : '!'}
            </span>
            <span className="truncate">{x.email}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEmails((cur) => cur.filter((y) => y.email !== x.email));
                }}
                className="ml-0.5 w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                aria-label={`Remove ${x.email}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.span>
        ))}
      </AnimatePresence>
      <input
        ref={ref}
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          if (/[,;\s]/.test(v)) commit(v);
          else setDraft(v);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && commit(draft)}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (/[,;\s]/.test(text.trim())) {
            e.preventDefault();
            commit(text);
          }
        }}
        type="email"
        inputMode="email"
        autoComplete="off"
        placeholder={emails.length ? '' : 'name@company.com, friend@gmail.com'}
        className="flex-1 min-w-[160px] h-8 px-1.5 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
      />
    </div>
  );
}

/** A small, faithful picture of the email the recipient will get. */
function EmailPreview({ me, title, roomId, message }) {
  return (
    <div className="rounded-xl bg-gray-100 dark:bg-black/30 p-3 sm:p-4">
      <div className="mx-auto max-w-[420px] rounded-xl overflow-hidden bg-white ring-1 ring-gray-200 shadow-sm text-left">
        <div className="h-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-500" />
        <div className="p-5">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-indigo-500 text-white text-sm font-bold flex items-center justify-center">{initials(me.name)}</span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-gray-900 truncate">{me.name}</span>
              <span className="block text-[11px] text-gray-500 truncate">{me.email}</span>
            </span>
          </div>
          <p className="mt-4 text-[10px] font-semibold tracking-[0.08em] uppercase text-indigo-500">You&apos;re invited</p>
          <p className="mt-1 text-[17px] leading-snug font-bold tracking-tight text-gray-900">Join {me.name} in a live coding session</p>
          <div className="mt-4 grid grid-cols-[1fr_auto] rounded-lg bg-gray-50 ring-1 ring-gray-200 text-[12px]">
            <div className="p-3 min-w-0">
              <p className="text-[9px] font-semibold tracking-wider uppercase text-gray-400">Session</p>
              <p className="mt-0.5 font-bold text-gray-900 truncate">{title}</p>
            </div>
            <div className="p-3 border-l border-dashed border-gray-300 text-right">
              <p className="text-[9px] font-semibold tracking-wider uppercase text-gray-400">Room code</p>
              <p className="mt-0.5 font-mono font-bold text-indigo-600">{roomId}</p>
            </div>
          </div>
          {message.trim() && (
            <p className="mt-4 border-l-[3px] border-indigo-500 pl-3 text-[12.5px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words">
              “{message.trim()}”
            </p>
          )}
          <span className="mt-4 inline-flex items-center h-9 px-4 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold">Join the session →</span>
        </div>
      </div>
    </div>
  );
}

function EmailTab({ roomId, title, me, peopleInRoom, isHost, link }) {
  const [emails, setEmails] = useState([]);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null); // [{ email, ok }]
  const selfEmail = me.email?.toLowerCase();

  const valid = emails.filter((e) => e.valid);
  const invalidCount = emails.length - valid.length;

  if (!isHost) {
    return (
      <div className="px-5 py-10 text-center">
        <div className="mx-auto w-11 h-11 rounded-full bg-gray-100 dark:bg-white/[0.05] flex items-center justify-center">
          <Mail className="w-5 h-5 text-gray-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-100">Only the host can send email invites</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">You can still copy the link above and share it.</p>
      </div>
    );
  }

  const send = async () => {
    if (!valid.length || sending) return;
    setSending(true);
    setResults(null);
    try {
      const res = await fetch('/api/playground/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, emails: valid.map((e) => e.email), message, peopleInRoom }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not send invites');
      setResults(data.results);
      const ok = data.results.filter((r) => r.ok).length;
      const failed = data.results.length - ok;
      if (ok) toast.success(`Invitation sent to ${ok === 1 ? data.results.find((r) => r.ok).email : `${ok} people`}`);
      if (failed) toast.error(`${failed} could not be delivered`);
      // Keep only the ones that failed so they can be retried.
      setEmails((cur) => cur.filter((e) => !e.valid || data.results.some((r) => r.email === e.email && !r.ok)));
      if (!failed) setMessage('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <label className="flex items-baseline justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span>To</span>
            <span className="font-normal text-gray-400 tabular-nums">{emails.length}/{MAX_EMAILS}</span>
          </label>
          <EmailField emails={emails} setEmails={setEmails} disabled={sending} selfEmail={selfEmail} />
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span>Separate with commas, or paste a list.</span>
            {invalidCount > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <AlertCircle className="w-3 h-3" /> {invalidCount} won&apos;t be sent
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] ring-1 ring-gray-200 dark:ring-white/[0.06] px-3 h-9 text-xs">
          <span className="font-medium text-gray-500">Cc</span>
          <span className="inline-flex items-center gap-1.5 min-w-0 text-gray-700 dark:text-gray-200">
            <span className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center flex-shrink-0" style={{ background: colorFor(me.id) }}>
              {initials(me.name)}
            </span>
            <span className="truncate">{selfEmail || 'your account email'}</span>
          </span>
          <span className="ml-auto text-gray-400 hidden sm:inline">so you can see what was sent</span>
        </div>

        <div>
          <label htmlFor="pg-invite-msg" className="flex items-baseline justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <span>
              Personal note <span className="font-normal text-gray-400">· optional</span>
            </span>
            <span className="font-normal text-gray-400 tabular-nums">{message.length}/500</span>
          </label>
          <textarea
            id="pg-invite-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            rows={3}
            disabled={sending}
            placeholder="Hey, let's do a mock round on DP at 7. Bring questions!"
            className="w-full resize-none px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0d14] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 transition-all"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {preview ? 'Hide preview' : 'Preview the email'}
          </button>
          <AnimatePresence initial={false}>
            {preview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-3">
                  <EmailPreview me={{ ...me, email: selfEmail }} title={title} roomId={roomId} message={message} link={link} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {results && (
            <motion.ul
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl ring-1 ring-gray-200 dark:ring-white/[0.07] divide-y divide-gray-100 dark:divide-white/[0.05] overflow-hidden"
            >
              {results.map((r, i) => (
                <motion.li
                  key={r.email}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-2 px-3 h-9 text-xs"
                >
                  {r.ok ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-emerald-500" strokeWidth={4} />
                    </span>
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span className="truncate text-gray-700 dark:text-gray-200">{r.email}</span>
                  <span className={`ml-auto font-medium ${r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {r.ok ? 'Sent' : 'Failed — try again'}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-200 dark:border-white/[0.07] bg-gray-50/60 dark:bg-white/[0.015]">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {valid.length ? `${valid.length} recipient${valid.length > 1 ? 's' : ''}` : 'Add someone to invite'}
        </span>
        <button
          type="button"
          onClick={send}
          disabled={!valid.length || sending}
          className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending…' : 'Send invitation'}
        </button>
      </div>
    </div>
  );
}

/* ───────────── people online ───────────── */

function OnlineTab({ socket, open }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [sentAt, setSentAt] = useState({}); // userId → when we last invited them
  const [now, setNow] = useState(() => Date.now());
  const remainingFor = (id) => (sentAt[id] ? Math.max(0, RESEND_COOLDOWN_MS - (now - sentAt[id])) : 0);
  const coolingDown = Object.keys(sentAt).some((id) => remainingFor(id) > 0);

  useEffect(() => {
    if (!open || !coolingDown) return undefined;
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? users.filter((u) => u.name?.toLowerCase().includes(q)) : users;
  }, [users, query]);

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

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-5 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people online…"
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0a0d14] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
          />
        </div>
      </div>
      <div className="flex-1 min-h-[180px] overflow-y-auto px-3 py-3">
        {loading ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="h-12 mx-2 my-1 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Users className="mx-auto w-6 h-6 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {query ? 'No one matches that name' : 'Nobody else is online right now'}
            </p>
            {!query && <p className="text-xs text-gray-400">Send an email invite or share the link instead.</p>}
          </div>
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
                className={`relative w-full flex items-center gap-3 px-2.5 h-12 rounded-xl text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                  cooling ? 'cursor-default' : isSel ? 'cursor-pointer bg-indigo-50 dark:bg-indigo-500/10' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {u.image ? (
                    <Image src={u.image} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: colorFor(u.id) }}>
                      {initials(u.name)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#11151f]" />
                </div>
                <span className="flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{u.name || 'Unknown'}</span>
                {cooling ? (
                  <span className="relative inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg overflow-hidden bg-emerald-500/10 ring-1 ring-emerald-500/25 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    <Check className="w-3 h-3" />
                    Sent · {Math.ceil(remaining / 1000)}s
                    <span className="absolute left-0 bottom-0 h-0.5 bg-emerald-500/60 transition-[width] duration-200 ease-linear" style={{ width: `${(remaining / RESEND_COOLDOWN_MS) * 100}%` }} />
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
                  <span className={`w-5 h-5 flex-shrink-0 rounded-md border-2 flex items-center justify-center ${isSel ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-gray-600'}`}>
                    {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center gap-3 px-5 py-3 border-t border-gray-200 dark:border-white/[0.07] bg-gray-50/60 dark:bg-white/[0.015]">
        <span className="text-xs text-gray-500">{selected.size} selected</span>
        <button
          onClick={() => sendTo([...selected])}
          disabled={!selected.size}
          className="ml-auto inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Send in-app invite
        </button>
      </div>
    </div>
  );
}

/* ───────────── modal ───────────── */

export default function InviteModal({ socket, roomId, open, onClose, isHost = false, me = {}, title = 'Playground', peopleInRoom = 0 }) {
  const [tab, setTab] = useState(isHost ? 'email' : 'online');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setTab(isHost ? 'email' : 'online');
  }, [open, isHost]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const link = typeof window !== 'undefined' ? `${window.location.origin}/playground/${roomId}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Copy failed');
    }
  };

  const TABS = [
    ['email', 'Email', Mail],
    ['online', 'Online now', Users],
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="invite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/55 backdrop-blur-[2px]"
          onMouseDown={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
            className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[86vh] flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#11151f] border border-gray-200 dark:border-white/[0.08] shadow-2xl"
          >
            {/* grabber on phones */}
            <div className="sm:hidden pt-2 flex justify-center">
              <span className="w-10 h-1 rounded-full bg-gray-300 dark:bg-white/15" />
            </div>

            <div className="flex items-start gap-3 px-5 pt-4 pb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="invite-title" className="text-base font-semibold text-gray-900 dark:text-white">Invite people</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  to <span className="font-medium text-gray-700 dark:text-gray-300">{title}</span>
                </p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* link */}
            <div className="px-5">
              <div className="flex items-center gap-2 h-11 pl-3 pr-1.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] ring-1 ring-gray-200 dark:ring-white/[0.07]">
                <Link2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate font-mono text-xs text-gray-600 dark:text-gray-300">{link}</span>
                <button
                  type="button"
                  onClick={copyLink}
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    copied ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-white dark:bg-white/[0.06] text-gray-800 dark:text-gray-100 ring-1 ring-gray-200 dark:ring-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            {/* tabs */}
            <div className="px-5 pt-4">
              <div className="relative grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.04]">
                {TABS.map(([k, label, Icon]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={`relative h-8 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                      tab === k ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab === k && (
                      <motion.span
                        layoutId="invite-tab"
                        className="absolute inset-0 rounded-lg bg-white dark:bg-[#1a2030] shadow-sm ring-1 ring-gray-200 dark:ring-white/[0.06]"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon className="relative w-3.5 h-3.5" />
                    <span className="relative">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col mt-1">
              {tab === 'email' ? (
                <EmailTab roomId={roomId} title={title} me={me} peopleInRoom={peopleInRoom} isHost={isHost} link={link} />
              ) : (
                <OnlineTab socket={socket} open={open} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
