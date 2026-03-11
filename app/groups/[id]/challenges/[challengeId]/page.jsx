'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Clock, Trophy, Users, Shield, Play, Lock,
  ChevronRight, BarChart3, AlertTriangle, Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const DIFF = {
  EASY:   { label: 'Easy',   cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  MEDIUM: { label: 'Medium', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  HARD:   { label: 'Hard',   cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
};

function pad(n) { return String(n).padStart(2, '0'); }

function Countdown({ target, label, onReach }) {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => {
      const ms = new Date(target) - Date.now();
      if (ms <= 0) { setLeft(null); onReach?.(); return; }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setLeft({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, onReach]);

  if (!left) return null;
  return (
    <div className="text-center">
      <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2 uppercase tracking-wider font-medium">{label}</p>
      <div className="flex items-center justify-center gap-1.5">
        {[
          { v: left.h, l: 'h' },
          { v: left.m, l: 'm' },
          { v: left.s, l: 's' },
        ].map(({ v, l }) => (
          <div key={l} className="flex items-baseline gap-0.5">
            <span className="text-3xl sm:text-4xl font-mono font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {pad(v)}
            </span>
            <span className="text-xs text-zinc-400">{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChallengeDetailsPage({ params }) {
  const { id: groupId, challengeId } = params;
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [challenge, setChallenge] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState('problems');
  const [ending, setEnding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(false);

  // Compute challenge timing — plain variable so it re-evaluates each render (driven by setTick)
  const timing = (() => {
    if (!challenge) return null;
    const now = Date.now();
    const start = new Date(challenge.startTime).getTime();
    const end = new Date(challenge.endTime).getTime();
    const lateMs = (challenge.lateEntryMinutes || 5) * 60000;
    const entryDeadline = start + lateMs;
    if (now < start) return { phase: 'upcoming', start, end, entryDeadline };
    if (now <= entryDeadline) return { phase: 'entry-open', start, end, entryDeadline };
    if (now <= end) return { phase: 'active', start, end, entryDeadline };
    return { phase: 'ended', start, end, entryDeadline };
  })();

  // Refresh timing phase every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/groups/${groupId}/challenges/${challengeId}`);
      return;
    }
    (async () => {
      try {
        const [gRes, cRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch(`/api/groups/${groupId}/challenges/${challengeId}`),
        ]);
        if (gRes.ok) { 
          const d = await gRes.json(); 
          setGroup(d.group);
          setIsAdmin(d.isAdmin || false);
        }
        if (cRes.ok) { setChallenge(await cRes.json()); }
        else throw new Error('Not found');
      } catch { toast.error('Failed to load challenge'); }
      finally { setLoading(false); }
    })();
  }, [groupId, challengeId, authStatus, router]);

  // Fetch leaderboard
  const fetchLb = useCallback(async () => {
    setLbLoading(true);
    try {
      const r = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/leaderboard`);
      if (r.ok) { const d = await r.json(); setLeaderboard(d.leaderboard || []); }
    } catch {}
    finally { setLbLoading(false); }
  }, [groupId, challengeId]);

  useEffect(() => { if (tab === 'leaderboard') fetchLb(); }, [tab, fetchLb]);

  // Join / enter challenge
  const handleEnter = async () => {
    if (!timing) return;
    if (timing.phase === 'ended') { toast.error('Challenge has ended'); return; }
    if (timing.phase === 'active' && Date.now() > timing.entryDeadline) {
      toast.error('Entry window has closed'); return;
    }
    setJoining(true);
    try {
      // Register as participant if not already
      const res = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/join`, {
        method: 'POST',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Cannot join');
      }
      // Navigate to the test environment
      router.push(`/groups/${groupId}/challenges/${challengeId}/test`);
    } catch (err) { toast.error(err.message); }
    finally { setJoining(false); }
  };

  // End challenge (admin only)
  const handleEndChallenge = async () => {
    if (!window.confirm('Are you sure you want to end this challenge? Report cards will be sent to all participants.')) {
      return;
    }
    
    setEnding(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/challenges/${challengeId}/end`, {
        method: 'POST',
      });
      
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to end challenge');
      }
      
      const data = await res.json();
      toast.success(`Challenge ended! ${data.participantsNotified} report cards sent.`);
      
      // Refresh challenge data
      const cRes = await fetch(`/api/groups/${groupId}/challenges/${challengeId}`);
      if (cRes.ok) { 
        setChallenge(await cRes.json()); 
      }
    } catch (err) { 
      toast.error(err.message); 
    } finally { 
      setEnding(false); 
    }
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Challenge not found</h2>
        <Link href={`/groups/${groupId}/challenges`}
          className="text-sm text-indigo-600 hover:underline">Back to challenges</Link>
      </div>
    );
  }

  const problems = challenge.problems || [];
  const isDisqualified = challenge.participant?.status === 'DISQUALIFIED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back */}
      <Link href={`/groups/${groupId}/challenges`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Challenges
      </Link>

      {/* ─── Header card ─── */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Status + Title */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="flex gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                timing?.phase === 'active' || timing?.phase === 'entry-open'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : timing?.phase === 'upcoming'
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {timing?.phase === 'entry-open' ? 'Live — Entry Open' :
                 timing?.phase === 'active' ? 'Live' :
                 timing?.phase === 'upcoming' ? 'Upcoming' : 'Ended'}
              </span>
              {challenge.strictMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Shield className="w-3 h-3" /> Proctored
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {challenge.creator?.name && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">by {challenge.creator.name}</span>
              )}
              {isAdmin && timing?.phase === 'active' && (
                <button
                  onClick={handleEndChallenge}
                  disabled={ending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
                >
                  {ending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  {ending ? 'Ending...' : 'End Challenge'}
                </button>
              )}
            </div>
          </div>

          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight mb-1">{challenge.title}</h1>
          {challenge.description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{challenge.description}</p>
          )}

          {/* Schedule row */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-sm">
            <div>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-0.5">Start</p>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {new Date(challenge.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-0.5">End</p>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {new Date(challenge.endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> {problems.length} problem{problems.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {challenge.participants ?? 0} participant{(challenge.participants ?? 0) !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {challenge.lateEntryMinutes || 5}m entry window</span>
          </div>
        </div>

        {/* Countdown / Entry */}
        <div className="border-t border-zinc-100 dark:border-zinc-800 p-5 sm:p-6 bg-zinc-50/50 dark:bg-zinc-800/30">
          {isDisqualified ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">You have been disqualified</p>
              <p className="text-xs text-zinc-400 mt-1">{challenge.participant?.disqualifyReason || 'Violated challenge rules'}</p>
            </div>
          ) : timing?.phase === 'upcoming' ? (
            <Countdown target={timing.start} label="Challenge starts in" />
          ) : timing?.phase === 'entry-open' ? (
            <div className="space-y-4">
              <Countdown target={timing.entryDeadline} label="Entry closes in" />
              <div className="flex justify-center">
                <button onClick={handleEnter} disabled={joining}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors shadow-sm">
                  {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Enter Challenge
                </button>
              </div>
            </div>
          ) : timing?.phase === 'active' ? (
            <div className="text-center space-y-3">
              {Date.now() <= timing.entryDeadline ? (
                <>
                  <Countdown target={timing.entryDeadline} label="Entry closes in" />
                  <button onClick={handleEnter} disabled={joining}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50 transition-colors shadow-sm">
                    {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Enter Challenge
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400">
                  <Lock className="w-4 h-4" />
                  <p className="text-sm">Entry window closed. Challenge is in progress.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              <p className="font-medium">Challenge has ended</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Tabs ─── */}
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {['problems', 'leaderboard'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}>
            {t === 'problems' ? 'Problems' : 'Leaderboard'}
          </button>
        ))}
      </div>

      {/* ─── Tab content ─── */}
      {tab === 'problems' && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-50 dark:divide-zinc-800/60">
          {problems.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">No problems in this challenge.</div>
          ) : problems.map((cp, i) => {
            const p = cp.problem || cp;
            const d = DIFF[p.difficulty] || DIFF.EASY;
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i % 2 ? 'bg-zinc-50/40 dark:bg-zinc-800/20' : ''}`}>
                <span className="text-xs text-zinc-400 tabular-nums w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{p.title}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${d.cls}`}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {tab === 'leaderboard' && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          {lbLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /></div>
          ) : leaderboard.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {leaderboard.map((entry, i) => (
                <div key={entry.user?.id || i}
                  className={`flex items-center gap-3 px-4 sm:px-5 py-3 ${
                    entry.user?.id === session?.user?.id ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''
                  }`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                    i === 1 ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300' :
                    i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400' :
                    'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>{i + 1}</span>
                  {entry.user?.image ? (
                    <img src={entry.user.image} alt="" className="w-7 h-7 rounded-full object-cover"
                      onError={e => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex'; }} />
                  ) : null}
                  <div className={`w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 items-center justify-center text-[11px] font-bold text-zinc-500 dark:text-zinc-400 ${entry.user?.image ? 'hidden' : 'flex'}`}>
                    {entry.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{entry.user?.name}</span>
                  <span className="text-xs text-zinc-400 tabular-nums">{entry.problemsSolved} solved</span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tabular-nums w-12 text-right">{entry.score}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
