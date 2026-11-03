'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare } from 'lucide-react';
import { colorFor, initials } from './utils';

const timeOf = (at) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Message = memo(function Message({ msg, own, grouped, fresh }) {
  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: 12, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      style={{ transformOrigin: own ? 'bottom right' : 'bottom left' }}
      className={`flex gap-2 ${own ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'}`}
    >
      <div className="w-6 flex-shrink-0">
        {!grouped && !own && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: colorFor(msg.userId) }}
          >
            {initials(msg.name)}
          </div>
        )}
      </div>
      <div className={`flex flex-col max-w-[80%] ${own ? 'items-end' : 'items-start'}`}>
        {!grouped && (
          <span className="text-[10px] text-gray-400 mb-0.5 px-1">
            {own ? 'You' : msg.name} · {timeOf(msg.at)}
          </span>
        )}
        <div
          className={`px-3 py-1.5 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
            own
              ? 'bg-indigo-600 text-white rounded-tr-md'
              : 'bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-gray-100 rounded-tl-md'
          }`}
        >
          {msg.text}
        </div>
      </div>
    </motion.div>
  );
});

function TypingDots({ color }) {
  return (
    <span className="inline-flex items-end gap-[3px] h-2.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ background: color }}
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

function typingLabel(list) {
  if (list.length === 1) return `${list[0].name} is typing`;
  if (list.length === 2) return `${list[0].name} and ${list[1].name} are typing`;
  return `${list[0].name} and ${list.length - 1} others are typing`;
}

export default function PlaygroundChat({ messages, myUserId, onSend, typers = [], onTyping }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const stickRef = useRef(true); // auto-scroll only if the user is at the bottom
  // Messages already here when the panel opened don't animate in.
  const seenRef = useRef(null);
  if (seenRef.current === null) seenRef.current = new Set(messages.map((m) => m.id));

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, typers.length]);

  const onScroll = () => {
    const el = listRef.current;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const submit = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    setText('');
    stickRef.current = true;
    const ok = await onSend(value);
    if (!ok) setText(value); // give it back so nothing is lost
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div ref={listRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <MessageSquare className="w-8 h-8 opacity-30" />
            <p className="text-xs">No messages yet</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const grouped = prev && prev.userId === m.userId && m.at - prev.at < 120_000;
            return <Message key={m.id} msg={m} own={m.userId === myUserId} grouped={grouped} fresh={!seenRef.current.has(m.id)} />;
          })
        )}
      </div>
      <div className="h-6 px-3 flex items-center">
        <AnimatePresence>
          {typers.length > 0 && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 min-w-0"
            >
              <span className="flex -space-x-1">
                {typers.slice(0, 3).map((t) => (
                  <span
                    key={t.userId}
                    className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-[#11151f] text-[8px] font-bold text-white flex items-center justify-center"
                    style={{ background: colorFor(t.userId) }}
                  >
                    {initials(t.name)}
                  </span>
                ))}
              </span>
              <span className="truncate">{typingLabel(typers)}</span>
              <TypingDots color={colorFor(typers[0].userId)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 p-2.5 border-t border-gray-200 dark:border-white/[0.07]">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim()) onTyping?.();
          }}
          placeholder="Message the room…"
          maxLength={1000}
          className="flex-1 min-w-0 h-9 bg-transparent border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-md px-3 outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-9 h-9 flex-shrink-0 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}
