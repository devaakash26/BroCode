'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { colorFor, initials } from './utils';

const timeOf = (at) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const Message = memo(function Message({ msg, own, grouped }) {
  return (
    <div className={`flex gap-2 ${own ? 'flex-row-reverse' : ''} ${grouped ? 'mt-0.5' : 'mt-3'}`}>
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
    </div>
  );
});

export default function PlaygroundChat({ messages, myUserId, onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const stickRef = useRef(true); // auto-scroll only if the user is at the bottom

  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

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
            return <Message key={m.id} msg={m} own={m.userId === myUserId} grouped={grouped} />;
          })
        )}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 p-2.5 border-t border-gray-200 dark:border-white/[0.07]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
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
