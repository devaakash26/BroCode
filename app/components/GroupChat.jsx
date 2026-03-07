'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSelector, useDispatch } from 'react-redux';
import { addMessage, confirmMessage, setMessages, setTypingUser, clearTypingUser } from '@/lib/store/groupSlice';
import { Send, RefreshCw, MessageSquare, Circle, Smile } from 'lucide-react';
import Image from 'next/image';
import useSocket from '@/app/hooks/useSocket';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const safeFormat = (timestamp, fmt) => {
  try {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? '' : format(d, fmt);
  } catch {
    return '';
  }
};

const dateSeparatorLabel = (date) => {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
};

function Avatar({ src, name, size = 32 }) {
  if (src) {
    return (
      <Image src={src} alt={name || ''} width={size} height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
      }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="block w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </span>
  );
}

// Module-level cache — loaded once from local JSON, never refetched
let _emojiCache = null;

async function loadEmojis() {
  if (_emojiCache) return _emojiCache;
  try {
    const res = await fetch('/emojis.json');
    _emojiCache = await res.json();
    return _emojiCache;
  } catch {
    return null;
  }
}

const CATEGORY_LABELS = {
  'smileys-emotion': '😀 Smileys',
  'people-body': '🧑 People',
  'animals-nature': '🐶 Animals',
  'food-drink': '🍕 Food',
  'travel-places': '✈️ Travel',
  'activities': '⚽ Activities',
  'objects': '💡 Objects',
  'symbols': '❤️ Symbols',
  'flags': '🏳️ Flags',
};

export default function GroupChat({ groupId }) {
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const messages = useSelector(s => s.group.messages);
  const typingUsers = useSelector(s => s.group.typingUsers);
  const activeMembers = useSelector(s => s.group.activeMembers);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiData, setEmojiData] = useState(_emojiCache);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [emojiLoading, setEmojiLoading] = useState(false);
  const [activeEmojiCat, setActiveEmojiCat] = useState(null);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const loadingTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const inputRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const emojiPanelRef = useRef(null);
  const emojiSearchRef = useRef(null);

  const {
    socket,
    isConnected,
    joinGroup,
    sendMessage,
    sendTyping,
    subscribe,
    reconnect,
    sendHeartbeat,
  } = useSocket({ disableToasts: true });

  const fetchMessages = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/groups/${groupId}/messages`);
      if (!res.ok) throw new Error('Failed to load messages');
      const data = await res.json();
      dispatch(setMessages(data.messages || []));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    }
  }, [groupId, dispatch]);

  useEffect(() => {
    fetchMessages();
    loadingTimeoutRef.current = setTimeout(() => setIsLoading(false), 5000);
    return () => { if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    if (isConnected && groupId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinGroup(groupId);
      sendHeartbeat({ groupId });
    }
    if (!isConnected) hasJoinedRef.current = false;
  }, [isConnected, groupId, joinGroup, sendHeartbeat]);

  useEffect(() => {
    if (!isConnected || !groupId) return;
    const id = setInterval(() => { if (isConnected) sendHeartbeat({ groupId }); }, 30000);
    return () => clearInterval(id);
  }, [isConnected, groupId, sendHeartbeat]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!isConnected && groupId && session?.user) reconnect();
    }, 10000);
    return () => clearInterval(id);
  }, [isConnected, reconnect, groupId, session]);

  useEffect(() => {
    if (!socket) return;
    const currentUserId = session?.user?.id;
    const unsub = subscribe('newMessage', (msg) => {
      if (msg.groupId !== groupId) return;
      // Own message: replace the optimistic temp bubble; others: add normally
      if (msg.senderId === currentUserId) {
        dispatch(confirmMessage(msg));
      } else {
        dispatch(addMessage(msg));
      }
    });
    return unsub;
  }, [socket, groupId, subscribe, dispatch, session?.user?.id]);

  useEffect(() => {
    if (!socket) return;
    const unsub = subscribe('userTyping', (data) => {
      if (!session?.user?.id || data.userId === session.user.id) return;
      dispatch(setTypingUser({
        userId: data.userId,
        name: data.userName,
        image: data.userImage,
        isTyping: data.isTyping,
      }));
      if (data.isTyping) {
        if (typingTimeoutRef.current[data.userId])
          clearTimeout(typingTimeoutRef.current[data.userId]);
        typingTimeoutRef.current[data.userId] = setTimeout(() => {
          dispatch(clearTypingUser(data.userId));
        }, 3500);
      }
    });
    return () => {
      unsub();
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
    };
  }, [socket, subscribe, session?.user?.id, dispatch]);

  // Scroll only the chat container, not the whole page
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Close emoji panel on outside click
  useEffect(() => {
    if (!showEmoji) return;
    const handler = (e) => {
      if (emojiPanelRef.current && !emojiPanelRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmoji]);

  // Load emojis from API when panel first opens (cached after that)
  useEffect(() => {
    if (!showEmoji) return;
    if (_emojiCache) { setEmojiData(_emojiCache); return; }
    setEmojiLoading(true);
    loadEmojis().then(data => {
      if (data) {
        setEmojiData(data);
        setActiveEmojiCat(Object.keys(data)[0] || null);
      }
      setEmojiLoading(false);
    });
  }, [showEmoji]);

  // Set default category once data is available
  useEffect(() => {
    if (emojiData && !activeEmojiCat) {
      setActiveEmojiCat(Object.keys(emojiData)[0] || null);
    }
  }, [emojiData, activeEmojiCat]);

  // When emoji panel opens, focus search
  useEffect(() => {
    if (showEmoji) setTimeout(() => emojiSearchRef.current?.focus(), 80);
  }, [showEmoji]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    if (!isConnected || !session?.user?.id) return;
    sendTyping({ groupId, isTyping: value.length > 0 });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;
    setIsSending(true);

    const content = inputValue.trim();
    const tempMsg = {
      id: `temp-${Date.now()}`,
      content,
      groupId,
      senderId: session?.user?.id,
      senderName: session?.user?.name || 'You',
      senderImage: session?.user?.image || null,
      sentAt: new Date().toISOString(),
      isTemp: true,
    };

    dispatch(addMessage(tempMsg));
    setInputValue('');
    if (isConnected) sendTyping({ groupId, isTyping: false });

    let socketSent = false;
    if (isConnected) socketSent = sendMessage({ groupId, content });

    if (!socketSent) {
      try {
        await fetch(`/api/groups/${groupId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, content }),
        });
      } catch {
        // message stays as optimistic — no crash
      }
    }

    setIsSending(false);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Group messages by date for separators
  const groupedMessages = [];
  messages.forEach((msg, i) => {
    const prev = messages[i - 1];
    if (!prev || !isSameDay(new Date(msg.sentAt), new Date(prev.sentAt))) {
      groupedMessages.push({ type: 'separator', date: msg.sentAt, key: `sep-${i}` });
    }
    groupedMessages.push({ type: 'message', msg, key: msg.id });
  });

  const typingList = Object.values(typingUsers);
  const onlineCount = activeMembers.length;
  const myId = session?.user?.id;

  return (
    <div className="flex flex-col h-[480px] relative">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/30 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">Group Chat</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              {isConnected ? (
                <>
                  <Circle className="w-1.5 h-1.5 fill-green-500 text-green-500" />
                  {onlineCount > 0 ? `${onlineCount} online` : 'Connected'}
                </>
              ) : (
                <>
                  <Circle className="w-1.5 h-1.5 fill-gray-400 text-gray-400" />
                  Connecting&hellip;
                </>
              )}
            </p>
          </div>
        </div>
        {!isConnected && (
          <button onClick={reconnect}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Reconnect
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load messages</p>
            <button onClick={fetchMessages}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Try again
            </button>
          </div>
        ) : groupedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400 dark:text-gray-500">
            <MessageSquare className="w-10 h-10 opacity-25" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groupedMessages.map(item => {
              if (item.type === 'separator') {
                return (
                  <div key={item.key} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/50" />
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium px-1">
                      {dateSeparatorLabel(item.date)}
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700/50" />
                  </div>
                );
              }

              const { msg } = item;
              const isOwn = msg.senderId === myId || msg.userId === myId;
              const senderName = msg.senderName || msg.username || 'Unknown';
              const senderImage = msg.senderImage || msg.userImage || null;
              const timestamp = msg.sentAt || msg.timestamp;

              return (
                <motion.div
                  key={item.key}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className={`flex items-end gap-2 py-0.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}
                >
                  {!isOwn && (
                    <div className="mb-0.5 flex-shrink-0">
                      <Avatar src={senderImage} name={senderName} size={26} />
                    </div>
                  )}

                  <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {!isOwn && (
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-1">
                        {senderName}
                      </span>
                    )}
                    <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap ${
                      isOwn
                        ? 'bg-indigo-600 text-white rounded-br-[4px] shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-[4px] shadow-sm'
                    } ${msg.isTemp ? 'opacity-60' : ''}`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {safeFormat(timestamp, 'h:mm a')}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Typing indicators */}
        <AnimatePresence>
          {typingList.length > 0 && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-end gap-2 py-1"
            >
              <div className="flex -space-x-1">
                {typingList.slice(0, 3).map(u => (
                  <Avatar key={u.userId} src={u.image} name={u.name} size={22} />
                ))}
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-[4px] px-3 py-2 flex items-center gap-2">
                <TypingDots />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {typingList.length === 1
                    ? `${typingList[0].name} is typing`
                    : `${typingList.length} people typing`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emoji Panel — floats above input bar inside the chat container */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div
            ref={emojiPanelRef}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute bottom-14 left-3 right-3 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 flex flex-col"
            style={{ maxHeight: 280 }}
          >
            {/* Search bar */}
            <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700/60">
              <input
                ref={emojiSearchRef}
                type="text"
                value={emojiSearch}
                onChange={e => setEmojiSearch(e.target.value)}
                placeholder="Search emoji…"
                className="w-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl px-3 py-1.5 outline-none placeholder-gray-400"
              />
            </div>

            {emojiLoading ? (
              <div className="flex items-center justify-center h-24">
                <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-xs text-gray-400 ml-2">Loading emojis…</span>
              </div>
            ) : emojiData ? (
              <>
                {/* Category tabs */}
                {!emojiSearch && (
                  <div className="flex gap-1 px-2 pt-2 pb-1 overflow-x-auto scrollbar-hide">
                    {Object.keys(emojiData).filter(k => emojiData[k]?.length).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveEmojiCat(cat)}
                        className={`flex-shrink-0 text-[10px] font-medium px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                          activeEmojiCat === cat
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]?.split(' ')[0] || cat.split('-')[0]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Emoji grid */}
                <div className="overflow-y-auto flex-1 px-2 pb-2">
                  {(() => {
                    let emojisToShow;
                    if (emojiSearch) {
                      const q = emojiSearch.toLowerCase();
                      emojisToShow = Object.values(emojiData).flat().filter(e =>
                        e.unicodeName?.toLowerCase().includes(q) ||
                        e.slug?.toLowerCase().includes(q)
                      ).slice(0, 50);
                    } else {
                      emojisToShow = emojiData[activeEmojiCat] || [];
                    }
                    return (
                      <div className="grid grid-cols-10 gap-0.5 pt-1">
                        {emojisToShow.map(e => (
                          <button
                            key={e.slug}
                            type="button"
                            title={e.unicodeName}
                            onClick={() => {
                              setInputValue(v => v + e.character);
                              setShowEmoji(false);
                              setEmojiSearch('');
                              inputRef.current?.focus();
                            }}
                            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                          >
                            {e.character}
                          </button>
                        ))}
                        {emojisToShow.length === 0 && (
                          <p className="col-span-10 text-center text-xs text-gray-400 py-4">No emojis found</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-20">
                <p className="text-xs text-gray-400">Could not load emojis</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Bar */}
      <form onSubmit={handleSendMessage}
        className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/40">
        <div className="flex-shrink-0">
          <Avatar src={session?.user?.image} name={session?.user?.name} size={30} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? 'Type a message\u2026' : 'Connecting\u2026'}
          disabled={!isConnected}
          autoComplete="off"
          className="flex-1 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 rounded-xl px-3.5 py-2 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => setShowEmoji(v => !v)}
          disabled={!isConnected}
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${showEmoji ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          type="submit"
          disabled={!inputValue.trim() || isSending || !isConnected}
          className="w-9 h-9 flex-shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
        >
          {isSending
            ? <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
            : <Send className="w-3.5 h-3.5 text-white" />}
        </button>
      </form>
    </div>
  );
}
