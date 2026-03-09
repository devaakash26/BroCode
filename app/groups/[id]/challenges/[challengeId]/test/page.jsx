'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Trophy, MessageCircle, X,
  Users, Maximize2, Send, AlertTriangle, Clock, Shield,
  Code2, BarChart3,
} from 'lucide-react';
import CodeEditor from '@/app/components/problems/code-editor';
import useSocket from '@/app/hooks/useSocket';

function pad(n) { return String(n).padStart(2, '0'); }

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Secure Test Environment                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */
export default function TestPage({ params }) {
  const { id: groupId, challengeId } = params;
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const containerRef = useRef(null);

  // Core data
  const [challenge, setChallenge] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Navigation
  const [problemIdx, setProblemIdx] = useState(0);
  const [sidePanel, setSidePanel] = useState(null); // null | 'leaderboard' | 'chat'

  // Timer
  const [timeLeft, setTimeLeft] = useState(null);

  // Security
  const [warnings, setWarnings] = useState(0);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [disqualified, setDisqualified] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const warningsRef = useRef(0);
  const isExitingRef = useRef(false);
  const hasEnteredFullscreenRef = useRef(false);
  const [showGate, setShowGate] = useState(false); // gate screen before test starts

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState([]);

  // Live presence
  const [onlineCount, setOnlineCount] = useState(0);

  // Ephemeral chat
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const chatEndRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]); // [{userId, userName}]
  const typingTimeoutRef = useRef(null); // for debouncing own typing emit

  // Socket
  const {
    socket, isConnected, joinChallenge, joinGroup,
    sendMessage: socketSend, subscribe,
  } = useSocket({ disableToasts: true });

  /* ─── Fetch challenge data ─── */
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/groups/${groupId}/challenges/${challengeId}/test`);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}/challenges/${challengeId}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setChallenge(data);
        setProblems(data.problems || []);
        if (data.participant?.status === 'DISQUALIFIED') {
          // Already disqualified — send back to group page
          router.replace(`/groups/${groupId}`);
          return;
        }
        if (data.participant?.warningCount) {
          setWarnings(data.participant.warningCount);
          warningsRef.current = data.participant.warningCount;
        }
      } catch {
        toast.error('Failed to load challenge');
        router.push(`/groups/${groupId}/challenges/${challengeId}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [authStatus, groupId, challengeId, router]);

  /* ─── Timer ─── */
  useEffect(() => {
    if (!challenge?.endTime) return;
    const tick = () => {
      const ms = new Date(challenge.endTime) - Date.now();
      if (ms <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0 });
        handleAutoSubmit();
        return;
      }
      setTimeLeft({
        h: Math.floor(ms / 3600000),
        m: Math.floor((ms % 3600000) / 60000),
        s: Math.floor((ms % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [challenge?.endTime]);

  /* ─── Socket subscriptions ─── */
  useEffect(() => {
    if (!isConnected || !challengeId) return;
    console.log('[test] socket subscriptions: joining group', groupId, 'challenge', challengeId);
    joinGroup(groupId);
    const joined = joinChallenge(challengeId);
    console.log('[test] joinChallenge result:', joined);

    const unsubs = [
      subscribe('leaderboardUpdate', (data) => {
        setLeaderboard(data.leaderboard || []);
        if (data.lastSubmission && data.lastSubmission.userId !== session?.user?.id) {
          toast.success(`${data.lastSubmission.userName || 'Someone'} solved a problem!`, { duration: 2500 });
        }
      }),
      subscribe('challengeMessage', (msg) => {
        // Deduplicate: skip if we already added this as an optimistic local message
        setMessages(prev => {
          const isDupe = prev.some(m => m._localKey && msg.content === m.content && msg.sender?.id === m.sender?.id);
          if (isDupe) {
            // Replace the local message with the server-confirmed one
            return prev.map(m =>
              (m._localKey && msg.content === m.content && msg.sender?.id === m.sender?.id) ? msg : m
            );
          }
          return [...prev.slice(-99), msg];
        });
      }),
      subscribe('challengeEnded', () => handleAutoSubmit()),
      subscribe('participantJoined', ({ userId: joinedId, userName }) => {
        // Announce in chat (don't show for self)
        if (joinedId !== session?.user?.id) {
          setMessages(prev => [...prev.slice(-99), {
            id: `system-join-${joinedId}-${Date.now()}`,
            system: true,
            content: `${userName} joined the challenge`,
            sentAt: new Date().toISOString(),
          }]);
        }
      }),
      subscribe('participantCountUpdate', ({ count }) => {
        setOnlineCount(count);
      }),
      subscribe('challengeUserTyping', ({ userId: typerId, userName, isTyping }) => {
        if (typerId === session?.user?.id) return;
        setTypingUsers(prev => {
          if (isTyping) {
            if (prev.some(u => u.userId === typerId)) return prev;
            return [...prev, { userId: typerId, userName }];
          }
          return prev.filter(u => u.userId !== typerId);
        });
        // Auto-clear after 3s in case stop event is missed
        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u.userId !== typerId));
          }, 3000);
        }
      }),
      subscribe('error', (err) => {
        console.error('[test] socket error from server:', err);
      }),
    ];
    return () => unsubs.forEach(fn => fn());
  }, [isConnected, challengeId, groupId, session?.user?.id]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  /* ─── Fullscreen + Security ─── */
  const enterFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
  }, []);

  // Enter fullscreen on mount for strict mode
  // Browsers require a user gesture for requestFullscreen — show gate screen instead
  useEffect(() => {
    if (!challenge || loading) return;
    if (challenge.strictMode && !hasEnteredFullscreenRef.current) {
      setShowGate(true);
    }
  }, [challenge, loading]);

  // Called from gate screen button (user gesture → fullscreen allowed)
  const handleStartTest = useCallback(() => {
    setShowGate(false);
    if (containerRef.current) {
      const el = containerRef.current;
      const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (fn) {
        fn.call(el).then(() => {
          hasEnteredFullscreenRef.current = true;
          setIsFullscreen(true);
        }).catch(() => {
          // fallback: proceed without fullscreen
          hasEnteredFullscreenRef.current = true;
        });
      } else {
        hasEnteredFullscreenRef.current = true;
      }
    }
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    if (!challenge?.strictMode) return;
    const handler = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      // If user exits fullscreen after we've set it, count as violation
      if (!isFull && hasEnteredFullscreenRef.current && !isExitingRef.current) {
        reportViolation('Exited fullscreen mode');
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [challenge?.strictMode]);

  // Visibility change (tab switch)
  useEffect(() => {
    if (!challenge?.strictMode) return;
    const handler = () => {
      if (document.hidden && hasEnteredFullscreenRef.current && !isExitingRef.current) {
        reportViolation('Switched away from test window');
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [challenge?.strictMode]);

  // Copy/paste/cut prevention
  useEffect(() => {
    if (!challenge?.strictMode) return;
    const block = (e) => { e.preventDefault(); toast.error('Copy/paste is disabled during the test', { id: 'cp' }); };
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    document.addEventListener('contextmenu', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('contextmenu', block);
    };
  }, [challenge?.strictMode]);

  /* ─── Violation handler ─── */
  const reportViolation = useCallback(async (reason) => {
    warningsRef.current += 1;
    const count = warningsRef.current;
    setWarnings(count);
    setShowWarningModal(true);

    try {
      const res = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/disqualify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selfReport: true, reason }),
      });
      const data = await res.json();
      if (data.disqualified) {
        toast.error('You have been disqualified from this challenge.');
        isExitingRef.current = true;
        exitFullscreen();
        setTimeout(() => router.replace(`/groups/${groupId}`), 1500);
      }
    } catch {}
  }, [groupId, challengeId]);

  /* ─── Navigation & Actions ─── */
  const handleComplete = useCallback(async () => {
    try {
      await fetch(`/api/groups/${groupId}/challenges/${challengeId}/complete`, {
        method: 'POST',
      });
    } catch {}
  }, [groupId, challengeId]);

  const handleAutoSubmit = useCallback(() => {
    isExitingRef.current = true;
    exitFullscreen();
    handleComplete();
    toast.success('Challenge ended. Your submissions have been recorded.');
    setTimeout(() => {
      router.push(`/groups/${groupId}/challenges/${challengeId}`);
    }, 1500);
  }, [groupId, challengeId, router, exitFullscreen, handleComplete]);

  const handleExit = () => {
    isExitingRef.current = true;
    exitFullscreen();
    handleComplete();
    router.push(`/groups/${groupId}/challenges/${challengeId}`);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = msgInput.trim();
    if (!text || !isConnected) return;

    // Optimistic local add (deduped when server echo arrives)
    setMessages(prev => [...prev, {
      id: `local-${Date.now()}`,
      _localKey: true,
      content: text,
      sender: { id: session.user.id, name: session.user.name, image: session.user.image },
      sentAt: new Date().toISOString(),
    }]);

    // Stop typing indicator on send
    clearTimeout(typingTimeoutRef.current);
    if (socket?.connected) socket.emit('challengeTyping', { challengeId, isTyping: false });

    // Ephemeral: socket only, NO DB persistence
    const sent = socketSend({
      content: text,
      groupId,
      challengeId,
      ephemeral: true,
    });
    console.log('[test] sendMessage result:', sent, 'groupId:', groupId, 'challengeId:', challengeId);
    setMsgInput('');
  };

  const handleSubmitResult = (result) => {
    if (result?.status === 'ACCEPTED') {
      toast.success('Problem accepted!');
      // Refresh leaderboard
      fetch(`/api/groups/${groupId}/challenges/${challengeId}/leaderboard`)
        .then(r => r.json())
        .then(d => setLeaderboard(d.leaderboard || []))
        .catch(() => {});
    }
  };

  /* ─── Render: Loading ─── */
  if (loading || authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  /* ─── Render: Disqualified ─── */
  if (disqualified) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-white px-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Disqualified</h1>
        <p className="text-zinc-400 text-sm text-center max-w-sm mb-8">
          You have been disqualified for violating test rules. An email has been sent with details.
        </p>
        <button onClick={handleExit}
          className="px-5 py-2.5 rounded-lg bg-zinc-800 text-sm font-medium text-zinc-200 hover:bg-zinc-700 transition-colors">
          Return to Challenge
        </button>
      </div>
    );
  }

  const currentProblem = problems[problemIdx];
  const isUrgent = timeLeft && timeLeft.h === 0 && timeLeft.m < 5;

  /* ─── Render: Gate screen (user must click to enter fullscreen) ─── */
  if (showGate) {
    return (
      <div ref={containerRef} className="flex flex-col items-center justify-center h-screen bg-zinc-950 text-white px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Proctored Test</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              This challenge runs in <strong className="text-zinc-200">fullscreen mode</strong> with strict proctoring.
            </p>
          </div>
          <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 text-left space-y-2.5">
            <div className="flex items-start gap-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-zinc-300">Exiting fullscreen or switching tabs counts as a <strong className="text-zinc-100">warning</strong></span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-zinc-300"><strong className="text-zinc-100">3 warnings</strong> will disqualify you automatically</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm">
              <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="text-zinc-300">Copy, paste, and right-click are <strong className="text-zinc-100">disabled</strong></span>
            </div>
          </div>
          <button onClick={handleStartTest}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-500/20">
            Enter Fullscreen & Start Test
          </button>
          <button onClick={handleExit}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            Go back
          </button>
        </div>
      </div>
    );
  }

  /* ─── Render: Test Environment ─── */
  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-zinc-950 text-zinc-100 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>

      {/* ━━━ Header bar ━━━ */}
      <header className="flex items-center justify-between h-12 px-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleExit}
            className="p-1.5 rounded hover:bg-zinc-800 transition-colors" title="Exit">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm font-semibold text-zinc-200 truncate max-w-[180px] sm:max-w-xs">
            {challenge?.title}
          </span>
          {challenge?.strictMode && (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400">
              <Shield className="w-3 h-3" /> PROCTORED
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Timer */}
          {timeLeft && (
            <div className={`font-mono text-sm tabular-nums px-2.5 py-1 rounded ${
              isUrgent ? 'bg-rose-500/15 text-rose-400 animate-pulse' : 'bg-zinc-800 text-zinc-300'
            }`}>
              {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
            </div>
          )}

          {/* Warning count */}
          {warnings > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {warnings}/3
            </div>
          )}

          {/* Leaderboard toggle */}
          <button onClick={() => setSidePanel(p => p === 'leaderboard' ? null : 'leaderboard')}
            className={`p-1.5 rounded transition-colors ${sidePanel === 'leaderboard' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'}`}
            title="Leaderboard">
            <Trophy className="w-4 h-4" />
          </button>

          {/* Chat toggle */}
          <button onClick={() => setSidePanel(p => p === 'chat' ? null : 'chat')}
            className={`relative p-1.5 rounded transition-colors ${sidePanel === 'chat' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'}`}
            title="Chat">
            <MessageCircle className="w-4 h-4" />
            {onlineCount > 1 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {onlineCount > 9 ? '9+' : onlineCount}
              </span>
            )}
          </button>

          {/* Fullscreen toggle */}
          <button onClick={() => isFullscreen ? exitFullscreen() : enterFullscreen()}
            className="p-1.5 rounded text-zinc-400 hover:bg-zinc-800 transition-colors"
            title="Toggle fullscreen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ━━━ Problem navigation bar ━━━ */}
      <div className="flex items-center gap-1 h-10 px-3 border-b border-zinc-800/60 bg-zinc-900/50 shrink-0 overflow-x-auto">
        {problems.map((p, i) => (
          <button key={p.id} onClick={() => setProblemIdx(i)}
            className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
              i === problemIdx
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}>
            {i + 1}. {p.title}
          </button>
        ))}
      </div>

      {/* ━━━ Main content area ━━━ */}
      <div className="flex flex-1 overflow-hidden">

        {/* Problem + Editor split */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Problem description */}
          <div className="lg:w-[45%] border-r border-zinc-800/60 overflow-y-auto">
            {currentProblem ? (
              <div className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-zinc-100">{currentProblem.title}</h2>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                    currentProblem.difficulty === 'EASY' ? 'bg-emerald-500/10 text-emerald-400' :
                    currentProblem.difficulty === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-rose-500/10 text-rose-400'
                  }`}>
                    {currentProblem.difficulty}
                  </span>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentProblem.description || '' }} />

                {currentProblem.examples?.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className="text-sm font-semibold text-zinc-300">Examples</h3>
                    {currentProblem.examples.map((ex, i) => (
                      <div key={i} className="rounded-lg bg-zinc-800/50 p-3 text-sm space-y-1">
                        <div><span className="text-zinc-500 text-xs">Input:</span> <code className="text-zinc-200">{ex.input}</code></div>
                        <div><span className="text-zinc-500 text-xs">Output:</span> <code className="text-zinc-200">{ex.output}</code></div>
                        {ex.explanation && (
                          <div className="text-zinc-400 text-xs mt-1">{ex.explanation}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                No problem selected
              </div>
            )}

            {/* Prev / Next buttons */}
            <div className="flex items-center justify-between p-3 border-t border-zinc-800/40">
              <button onClick={() => setProblemIdx(i => Math.max(0, i - 1))}
                disabled={problemIdx === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="text-xs text-zinc-500 tabular-nums">{problemIdx + 1} / {problems.length}</span>
              <button onClick={() => setProblemIdx(i => Math.min(problems.length - 1, i + 1))}
                disabled={problemIdx === problems.length - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden bg-zinc-950">
            {currentProblem ? (
              <CodeEditor
                problemId={currentProblem.id}
                initialCode={''}
                testCases={currentProblem.testCases || []}
                onSubmit={handleSubmitResult}
                challengeId={challengeId}
                isDisabled={disqualified || (timeLeft?.h === 0 && timeLeft?.m === 0 && timeLeft?.s === 0)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                <Code2 className="w-6 h-6 mr-2" />
                Select a problem to begin
              </div>
            )}
          </div>
        </div>

        {/* ━━━ Side panel (leaderboard or chat) ━━━ */}
        {sidePanel && (
          <div className="w-72 xl:w-80 border-l border-zinc-800/60 bg-zinc-900/50 flex flex-col shrink-0">
            {/* Panel header */}
            <div className="flex items-center justify-between h-10 px-3 border-b border-zinc-800/40">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  {sidePanel === 'leaderboard' ? 'Leaderboard' : 'Group Chat'}
                </span>
                {sidePanel === 'chat' && onlineCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {onlineCount} online
                  </span>
                )}
              </div>
              <button onClick={() => setSidePanel(null)} className="p-1 rounded hover:bg-zinc-800 text-zinc-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Panel content */}
            {sidePanel === 'leaderboard' ? (
              <div className="flex-1 overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                    <BarChart3 className="w-6 h-6 mb-2" />
                    <p className="text-xs">No submissions yet</p>
                  </div>
                ) : leaderboard.map((entry, i) => (
                  <div key={entry.user?.id || i}
                    className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-zinc-800/30 ${
                      entry.user?.id === session?.user?.id ? 'bg-indigo-500/5' : ''
                    }`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      i === 0 ? 'bg-amber-500/15 text-amber-400' :
                      i === 1 ? 'bg-zinc-700 text-zinc-300' :
                      i === 2 ? 'bg-orange-500/15 text-orange-400' :
                      'bg-zinc-800 text-zinc-500'
                    }`}>{i + 1}</span>
                    {entry.user?.image ? (
                      <img src={entry.user.image} alt="" className="w-6 h-6 rounded-full object-cover"
                        onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex'; }} />
                    ) : null}
                    <div className={`w-6 h-6 rounded-full bg-zinc-800 items-center justify-center text-[10px] font-bold text-zinc-500 ${entry.user?.image ? 'hidden' : 'flex'}`}>
                      {entry.user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="flex-1 text-xs font-medium text-zinc-200 truncate">{entry.user?.name}</span>
                    <span className="text-[11px] font-bold text-zinc-100 tabular-nums">{entry.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                      <MessageCircle className="w-6 h-6 mb-2" />
                      <p className="text-xs">No messages yet</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">Chat is ephemeral — not saved</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    if (msg.system) {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                            {msg.content}
                          </span>
                        </div>
                      );
                    }
                    const isMe = msg.sender?.id === session?.user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          isMe ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-200'
                        }`}>
                          {!isMe && (
                            <p className="text-[10px] font-semibold text-zinc-400 mb-0.5">{msg.sender?.name}</p>
                          )}
                          <p className="text-sm leading-snug break-words">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                {/* Chat input */}
                {/* Typing indicator */}
                {typingUsers.length > 0 && (
                  <div className="px-3 py-1 flex items-center gap-1.5">
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {typingUsers.length === 1
                        ? `${typingUsers[0].userName} is typing`
                        : `${typingUsers.length} people typing`}
                    </span>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2 border-t border-zinc-800/40">
                  <input
                    value={msgInput}
                    onChange={e => {
                      setMsgInput(e.target.value);
                      // Emit typing indicator
                      if (socket?.connected && challengeId) {
                        socket.emit('challengeTyping', { challengeId, isTyping: true });
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          socket?.emit('challengeTyping', { challengeId, isTyping: false });
                        }, 1500);
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-zinc-800 text-sm text-zinc-200 placeholder-zinc-500 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-zinc-600"
                    maxLength={500}
                  />
                  <button type="submit"
                    className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                    disabled={!msgInput.trim()}>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>

      {/* ━━━ Warning Modal ━━━ */}
      {showWarningModal && !disqualified && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-500/10 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-100 text-center mb-2">
              Warning {warnings}/3
            </h3>
            <p className="text-sm text-zinc-400 text-center mb-1">
              Exiting fullscreen or switching tabs during a proctored test is not allowed.
            </p>
            <p className="text-xs text-zinc-500 text-center mb-6">
              {warnings >= 3
                ? 'You have been disqualified.'
                : `${3 - warnings} warning${3 - warnings !== 1 ? 's' : ''} remaining before disqualification.`}
            </p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                if (!disqualified) enterFullscreen();
              }}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-sm font-medium text-white transition-colors">
              {warnings >= 3 ? 'OK' : 'Return to Fullscreen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
