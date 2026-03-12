'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Users, PlusCircle, Calendar, Trophy, Clock,
  MessageCircle, Settings, ArrowUpRight, Zap,
  Crown, Medal, Star, Shield, Activity, TrendingUp,
  Hash, Globe, Lock, Eye, UserPlus,
} from 'lucide-react';
import GroupChat from '@/app/components/GroupChat';
import useSocket from '@/app/hooks/useSocket';
import InviteMembersDialog from '@/components/InviteMembersDialog';
import InviteUsersModal from '@/app/components/InviteUsersModal';
import {
  fetchGroup,
  upsertActiveMember,
  setActiveMembers,
  pruneStaleMembers,
  setLeaderboard,
} from '@/lib/store/groupSlice';

// ─── Medal config ─────────────────────────────────────────────────────────────
const RANK_STYLES = [
  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', icon: <Crown className="h-4 w-4 text-amber-500" />, text: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-300 dark:border-slate-600', icon: <Medal className="h-4 w-4 text-slate-400" />, text: 'text-slate-500 dark:text-slate-300' },
  { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: <Star className="h-4 w-4 text-orange-500" />, text: 'text-orange-600 dark:text-orange-400' },
];

const VISIBILITY_ICONS = {
  PUBLIC: <Globe className="h-3.5 w-3.5" />,
  PRIVATE: <Lock className="h-3.5 w-3.5" />,
  UNLISTED: <Eye className="h-3.5 w-3.5" />,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function GroupSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 md:p-8">
      <div className="h-48 bg-gradient-to-r from-indigo-900/40 to-violet-900/40 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value, highlight }) {
  return (
    <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm ${highlight ? 'bg-white/25 text-white' : 'bg-white/10 text-white/80'}`}>
      {icon}<span className="font-semibold">{value}</span><span className="opacity-70">{label}</span>
    </div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
function ChallengeCard({ challenge, groupId }) {
  const now = new Date();
  const isLive = new Date(challenge.startTime) <= now && new Date(challenge.endTime) > now;
  const startsSoon = new Date(challenge.startTime) > now;
  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
      <Link href={`/groups/${groupId}/challenges/${challenge.id}`}
        className="block p-4 border border-gray-200 dark:border-gray-700/60 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all bg-white dark:bg-gray-800/40">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">{challenge.title}</h3>
              {isLive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 font-medium animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />LIVE
                </span>
              )}
              {startsSoon && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 font-medium">
                  <Clock className="h-3 w-3" />Upcoming
                </span>
              )}
            </div>
            {challenge.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{challenge.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(challenge.startTime).toLocaleDateString()}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                {new Date(challenge.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(challenge.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          <span className="self-start sm:self-center flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <ArrowUpRight className="h-3.5 w-3.5" />Enter
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────
function LeaderboardRow({ member, index, isOnline }) {
  const style = RANK_STYLES[index] || {};
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }}
      className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${style.bg || 'hover:bg-gray-50 dark:hover:bg-gray-800/60'} ${style.border || 'border-transparent'}`}>
      <div className="w-6 flex-shrink-0 flex items-center justify-center">
        {index < 3 ? style.icon : <span className="text-xs font-bold text-gray-400">#{index + 1}</span>}
      </div>
      <div className="relative flex-shrink-0">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          {member.userImage
            ? <Image src={member.userImage} alt={member.userName} width={32} height={32} className="object-cover" />
            : <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{member.userName?.charAt(0).toUpperCase()}</span>
          }
        </div>
        {isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm truncate ${style.text || 'text-gray-900 dark:text-white'}`}>{member.userName}</p>
        <p className="text-xs text-gray-400">{member.solvedCount} solved</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{member.score}</p>
        <p className="text-xs text-gray-400">pts</p>
      </div>
    </motion.div>
  );
}

// ─── Member Row ───────────────────────────────────────────────────────────────
function MemberRow({ member, isOnline }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="relative flex-shrink-0">
        <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          {member.user.image
            ? <Image src={member.user.image} alt={member.user.name} width={36} height={36} className="object-cover" />
            : <span className="text-sm font-semibold text-gray-500">{member.user.name?.charAt(0).toUpperCase()}</span>
          }
        </div>
        {isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {member.user.name}
          {member.role === 'ADMIN' && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
              <Shield className="h-2.5 w-2.5" />Admin
            </span>
          )}
        </p>
        <p className="text-xs text-gray-400">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
      </div>
      {isOnline && <span className="text-xs text-green-500 font-medium flex-shrink-0">Online</span>}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Section({ icon, title, action, children, noPad = false }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">{icon}{title}</h2>
        {action && <div>{action}</div>}
      </div>
      <div className={noPad ? '' : 'p-5'}>{children}</div>
    </div>
  );
}

function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center text-center py-10 gap-2">
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-1">{icon}</div>
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ─── Join Preview Screen ───────────────────────────────────────────────────────
function JoinPreviewScreen({ group, groupId }) {
  const [joining, setJoining] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const memberCount = group._count?.members ?? 0;
  const isFull = group.memberLimit && memberCount >= group.memberLimit;
  const fillPct = group.memberLimit ? Math.min(100, Math.round((memberCount / group.memberLimit) * 100)) : 0;

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not join');
      toast.success('Joined successfully!');
      // Hard-navigate so Redux state resets and fresh membership is loaded
      window.location.href = `/groups/${groupId}`;
    } catch (err) {
      toast.error(err.message);
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {/* Header banner */}
          <div className="relative h-32 overflow-hidden">
            {group.image ? (
              <>
                <Image src={group.image} alt={group.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 25% 40%, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />
              </div>
            )}
            {/* Visibility badge */}
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-white/20 backdrop-blur text-white border border-white/25">
                <Globe className="h-3 w-3" /> Public
              </span>
            </div>
          </div>

          {/* Avatar overlay */}
          <div className="relative flex justify-center -mt-8 mb-4">
            <div className="h-16 w-16 rounded-2xl bg-white dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-lg flex items-center justify-center">
              {group.image ? (
                <Image src={group.image} alt={group.name} width={56} height={56} className="rounded-xl object-cover" />
              ) : (
                <Users className="h-7 w-7 text-indigo-500" />
              )}
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Group name + description */}
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
              {group.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed line-clamp-3">{group.description}</p>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  icon: <Users className="h-4 w-4 text-indigo-500" />,
                  value: group.memberLimit ? `${memberCount} / ${group.memberLimit}` : memberCount,
                  label: 'Members',
                },
                {
                  icon: <Trophy className="h-4 w-4 text-amber-500" />,
                  value: group.challenges?.length ?? 0,
                  label: 'Challenges',
                },
                {
                  icon: <Calendar className="h-4 w-4 text-emerald-500" />,
                  value: new Date(group.createdAt).toLocaleDateString([], { month: 'short', year: '2-digit' }),
                  label: 'Created',
                },
              ].map(({ icon, value, label }) => (
                <div key={label} className="flex flex-col items-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60">
                  {icon}
                  <span className="mt-1 text-sm font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
                  <span className="text-[11px] text-gray-400 mt-0.5">{label}</span>
                </div>
              ))}
            </div>

            {/* Member limit progress bar */}
            {group.memberLimit && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Capacity</span>
                  <span className={isFull ? 'text-rose-500 font-semibold' : ''}>{fillPct}% full</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fillPct >= 100 ? 'bg-rose-500' : fillPct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
                {isFull && (
                  <p className="text-xs text-rose-500 font-medium text-center">This group is full — no new members can join</p>
                )}
              </div>
            )}

            {/* Creator */}
            {group.creator && (
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {group.creator.image
                    ? <Image src={group.creator.image} alt={group.creator.name} width={32} height={32} className="object-cover" />
                    : <span className="text-xs font-bold text-gray-500">{group.creator.name?.charAt(0)?.toUpperCase()}</span>
                  }
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400">Created by</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{group.creator.name}</p>
                </div>
                <Crown className="h-4 w-4 text-amber-500 ml-auto flex-shrink-0" />
              </div>
            )}

            {/* Join button */}
            <button
              onClick={handleJoin}
              disabled={isFull || joining}
              className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-all shadow-sm ${
                isFull
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20 shadow-lg active:scale-[0.98]'
              }`}
            >
              {joining ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Joining…
                </span>
              ) : isFull ? (
                'Group is Full'
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <UserPlus className="h-4 w-4" /> Join Group
                </span>
              )}
            </button>

            <Link href="/groups" className="block text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              ← Browse other groups
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


export default function GroupDetailPage({ params }) {
  const { id: groupId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useDispatch();

  const { data: group, isAdmin, isMember, status: groupStatus, leaderboard, activeMembers, lastFetched, status: groupSliceStatus } = useSelector(s => s.group);
  const { isConnected, joinGroup, subscribe, sendHeartbeat } = useSocket({ disableToasts: true });
  const heartbeatRef = useRef(null);
  const hasJoinedRef = useRef( false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const fiveMinAgo = () => new Date(Date.now() - 5 * 60 * 1000);

  // Fetch group — skip if already cached for this groupId.
  // NOTE: groupSliceStatus is intentionally NOT in the deps array — adding it
  // would re-trigger this effect on every status change (idle→loading→failed)
  // causing a retry storm on DB connection errors.
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/groups/${groupId}`);
      return;
    }
    // Already have fresh data for this group — no need to re-fetch
    if (lastFetched === groupId && groupSliceStatus === 'succeeded') return;
    dispatch(fetchGroup(groupId));
    // Don't clearGroup on unmount — settings page reuses the same cached Redux state
  }, [groupId, status, dispatch, router, lastFetched]);
  // Socket: join room once per connection
  useEffect(() => {
    if (!isConnected || !group) return;
    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinGroup(groupId);
      sendHeartbeat({ groupId });
    }
    heartbeatRef.current = setInterval(() => sendHeartbeat({ groupId }), 30_000);
    return () => clearInterval(heartbeatRef.current);
  }, [isConnected, group, groupId, joinGroup, sendHeartbeat]);

  // Reset join flag when disconnected so we re-join on reconnect
  useEffect(() => {
    if (!isConnected) hasJoinedRef.current = false;
  }, [isConnected]);

  // Socket: event subscriptions (stable — only socket/groupId dependent)
  useEffect(() => {
    if (!isConnected) return;

    const u1 = subscribe('memberActive', (data) => {
      if (data.groupId === groupId) dispatch(upsertActiveMember(data));
    });
    const u2 = subscribe('leaderboardUpdate', (data) => {
      if (data.groupId === groupId) dispatch(setLeaderboard(data.leaderboard));
    });
    const u3 = subscribe('memberCountUpdate', (data) => {
      if (data.groupId === groupId) dispatch(pruneStaleMembers());
    });

    // Bulk online members sent when joining a room
    const u4 = subscribe('onlineMembersList', (data) => {
      if (data.groupId !== groupId) return;
      data.members.forEach(m => dispatch(upsertActiveMember(m)));
    });

    // New user joined — only show toast for OTHER users, not self
    const u5 = subscribe('memberJoined', (data) => {
      if (data.groupId !== groupId) return;
      // Skip if this is our own join event
      const myId = session?.user?.id;
      if (myId && data.userId === myId) return;

      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`flex items-center gap-3 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-xl shadow-lg px-4 py-3 max-w-xs ${t.visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {data.userName} joined
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Just joined the group</p>
          </div>
          {data.userImage ? (
            <Image src={data.userImage} alt={data.userName} width={28} height={28}
              className="rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {data.userName?.[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </motion.div>
      ), { duration: 4000, position: 'top-right' });

      dispatch(upsertActiveMember(data));
    });

    return () => { u1?.(); u2?.(); u3?.(); u4?.(); u5?.(); };
  }, [isConnected, groupId, subscribe, dispatch, session?.user?.id]);

  // Polling: refresh group members every 60s to catch joins/leaves outside socket.
  // The Redux condition will block the poll when already loading or recently failed.
  useEffect(() => {
    const pollId = setInterval(() => {
      dispatch(fetchGroup(groupId));
    }, 60_000);
    return () => clearInterval(pollId);
  }, [groupId, dispatch]);

  const isMemberOnline = useCallback((userId) =>
    activeMembers.some(m => m.userId === userId && new Date(m.timestamp) > fiveMinAgo()),
    [activeMembers]
  );

  const totalMembers = group?._count?.members ?? group?.members?.length ?? 0;
  const onlineCount = activeMembers.filter(m => new Date(m.timestamp) > fiveMinAgo()).length;
  const activeChallenges = group?.challenges?.filter(c => new Date(c.endTime) > new Date()) ?? [];

  if (groupStatus === 'loading' || groupStatus === 'idle' || status === 'loading') return <GroupSkeleton />;

  if (groupStatus === 'failed' || !group) {    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
          <Hash className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Group not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">This group doesn't exist or you don't have permission.</p>
        <Link href="/groups" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors">Browse Groups</Link>
      </div>
    );
  }

  // Non-member viewing a public group → show join preview
  if (!isMember && group.visibility === 'PUBLIC') {
    return <JoinPreviewScreen group={group} groupId={groupId} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero Banner */}
      <div className="relative h-56 md:h-64 overflow-hidden">
        {/* Background */}
        {group.image ? (
          <>
            <Image src={group.image} alt={group.name} fill className="object-cover" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-800">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 30%, rgba(255,255,255,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,0.3) 0%, transparent 60%)' }} />
          </div>
        )}

        {/* Top-right action buttons */}
        <div className="absolute top-4 right-4 md:top-5 md:right-6 flex items-center gap-2 z-10">
          <InviteMembersDialog group={group}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white text-gray-800 hover:bg-gray-50 transition-colors shadow-lg border-0" />
          {(isAdmin || isMember) && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite Online
            </button>
          )}
          {isMember && (
            <Link href={`/groups/${groupId}/settings`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-lg">
              <Settings className="h-3.5 w-3.5" />Settings
            </Link>
          )}
        </div>

        {/* Bottom info overlay */}
        <div className="absolute bottom-0 inset-x-0 px-4 sm:px-6 lg:px-8 pb-5 md:pb-6">
          <div className="max-w-7xl mx-auto flex items-end gap-3 md:gap-4">
            {/* Group icon */}
            <div className="flex-shrink-0">
              <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white/20 border-2 border-white/40 backdrop-blur-md shadow-xl flex items-center justify-center">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
            </div>
            {/* Group info */}
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow tracking-tight leading-tight">{group.name}</h1>
                {group.visibility && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/25">
                    {VISIBILITY_ICONS[group.visibility]} {group.visibility}
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-white/70 text-xs md:text-sm mt-0.5 line-clamp-1 max-w-lg drop-shadow-sm">{group.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <StatPill icon={<Users className="h-3 w-3" />} value={totalMembers} label="members" />
                <StatPill icon={<span className="h-1.5 w-1.5 rounded-full bg-green-400" />} value={onlineCount} label="online" highlight={onlineCount > 0} />
                <StatPill icon={<Zap className="h-3 w-3" />} value={activeChallenges.length} label="challenges" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <Section icon={<Zap className="h-5 w-5 text-indigo-500" />} title="Active Challenges"
              action={isAdmin && (
                <Link href={`/groups/${groupId}/create-challenge`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm">
                  <PlusCircle className="h-4 w-4" />New Challenge
                </Link>
              )}>
              {activeChallenges.length > 0 ? (
                <div className="space-y-3">
                  {activeChallenges.map(c => <ChallengeCard key={c.id} challenge={c} groupId={groupId} />)}
                  <div className="text-center pt-1">
                    <Link href={`/groups/${groupId}/challenges`} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View all challenges →</Link>
                  </div>
                </div>
              ) : (
                <EmptyState icon={<Zap className="h-8 w-8 text-gray-400" />} title="No active challenges"
                  subtitle={isAdmin ? "Create the first challenge to get started." : "Check back soon!"}
                  action={isAdmin && (
                    <Link href={`/groups/${groupId}/create-challenge`} className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
                      <PlusCircle className="h-4 w-4" />Create the first challenge
                    </Link>
                  )} />
              )}
            </Section>

            {/* Group Chat — overflow-visible so emoji picker can float above */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-visible">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                  <MessageCircle className="h-5 w-5 text-indigo-500" />Group Chat
                </h2>
              </div>
              <GroupChat groupId={groupId} />
            </div>
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6">
            <Section icon={<Trophy className="h-5 w-5 text-amber-500" />} title="Leaderboard">
              {leaderboard.length > 0 ? (
                <div className="space-y-1.5">
                  {leaderboard.slice(0, 8).map((m, i) => (
                    <LeaderboardRow key={m.userId} member={m} index={i} isOnline={isMemberOnline(m.userId)} />
                  ))}
                </div>
              ) : (
                <EmptyState icon={<TrendingUp className="h-7 w-7 text-gray-400" />} title="No scores yet" subtitle="Complete challenges to appear here!" />
              )}
            </Section>

            <Section icon={<Users className="h-5 w-5 text-indigo-500" />} title="Members"
              action={totalMembers > 6 && isAdmin && (
                <Link href={`/groups/${groupId}/settings`} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Manage →</Link>
              )}>
              <div>
                {group.members?.slice(0, 6).map(m => (
                  <MemberRow key={m.userId} member={m} isOnline={isMemberOnline(m.userId)} />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{onlineCount} online now</span>
              </div>
            </Section>
          </div>
        </div>
      </div>

      {/* Invite Users Modal */}
      <InviteUsersModal
        groupId={groupId}
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}
  
