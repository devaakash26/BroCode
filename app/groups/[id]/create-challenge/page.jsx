'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  ArrowLeft, Search, X, Check, Plus, Clock, Eye, EyeOff, Loader2,
  Users, Shield, Mail, ChevronDown, ChevronUp, UserPlus, Link2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useIsMobile } from '@/app/hooks/useIsMobile';
import MobileRestriction from '@/app/components/MobileRestriction';

const DIFF = {
  EASY:   { label: 'Easy',   text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  MEDIUM: { label: 'Medium', text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-500/10',   dot: 'bg-amber-500'   },
  HARD:   { label: 'Hard',   text: 'text-rose-600 dark:text-rose-400',       bg: 'bg-rose-500/10',    dot: 'bg-rose-500'     },
};

function DiffBadge({ d }) {
  const c = DIFF[d] || DIFF.EASY;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

/* ── Toggle switch ── */
function Toggle({ on, onToggle, label, sublabel, icon: Icon }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />}
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
          {sublabel && <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">{sublabel}</p>}
        </div>
      </div>
      <button type="button" onClick={onToggle}
        className={`relative w-10 h-[22px] rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
      </button>
    </div>
  );
}

/* ── Step indicator ── */
function Steps({ current }) {
  const steps = ['Details', 'Problems', 'Participants', 'Review'];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
            i < current ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
            i === current ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
            'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
          }`}>
            {i < current ? <Check className="w-3 h-3" /> : <span className="w-3 text-center">{i + 1}</span>}
            <span className="hidden sm:inline">{s}</span>
          </div>
          {i < steps.length - 1 && <div className="w-4 h-px bg-zinc-200 dark:bg-zinc-700" />}
        </div>
      ))}
    </div>
  );
}

export default function CreateChallengePage({ params }) {
  const router = useRouter();
  const groupId = params.id;
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [group, setGroup] = useState(null);
  const [step, setStep] = useState(0);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [strictMode, setStrictMode] = useState(true);
  const [inviteOnly, setInviteOnly] = useState(false);
  const [lateEntryMinutes, setLateEntryMinutes] = useState(5);

  // Problems
  const [problems, setProblems] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [problemSearch, setProblemSearch] = useState('');

  // Members
  const [members, setMembers] = useState([]);
  const [invitedMembers, setInvitedMembers] = useState(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [gRes, pRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch('/api/problems'),
        ]);
        if (!gRes.ok) throw new Error('Failed to load group');
        const gData = await gRes.json();
        setGroup(gData);
        if (gData.userRole !== 'ADMIN') {
          toast.error('No permission'); router.push(`/groups/${groupId}`); return;
        }
        // Extract members from group data
        if (gData.group?.members) {
          setMembers(gData.group.members.map(m => ({
            id: m.user?.id || m.userId,
            name: m.user?.name || 'Unknown',
            email: m.user?.email || '',
            image: m.user?.image,
          })).filter(m => m.id !== session.user.id));
        }
        if (pRes.ok) {
          const pData = await pRes.json();
          setProblems(pData.problems || []);
        }
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    })();
  }, [groupId, session, router]);

  // Filtered problems
  const filteredProblems = useMemo(() => {
    if (!problemSearch.trim()) return problems;
    const q = problemSearch.toLowerCase();
    return problems.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [problems, problemSearch]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q)
    );
  }, [members, memberSearch]);

  const toggleProblem = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleMember = useCallback((id) => {
    setInvitedMembers(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const selectAllMembers = useCallback(() => {
    setInvitedMembers(new Set(members.map(m => m.id)));
  }, [members]);

  const deselectAllMembers = useCallback(() => {
    setInvitedMembers(new Set());
  }, []);

  const selectedProblems = useMemo(
    () => problems.filter(p => selected.has(p.id)),
    [problems, selected],
  );

  const invitedMembersList = useMemo(
    () => members.filter(m => invitedMembers.has(m.id)),
    [members, invitedMembers],
  );

  // Validation
  const step0Valid = title.trim().length >= 5 && startTime && endTime && new Date(startTime) < new Date(endTime);
  const step1Valid = selected.size > 0;
  const step2Valid = !inviteOnly || invitedMembers.size > 0;

  const canSubmit = step0Valid && step1Valid && step2Valid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          startTime,
          endTime,
          isPublic,
          strictMode,
          inviteOnly,
          lateEntryMinutes,
          problemIds: [...selected],
          invitedMemberIds: inviteOnly ? [...invitedMembers] : [],
          sendInviteEmails: inviteOnly && invitedMembers.size > 0,
          isCustom: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      toast.success('Challenge created!');
      router.push(`/groups/${groupId}/challenges/${data.id}`);
    } catch (err) { toast.error(err.message || 'Failed to create challenge'); }
    finally { setSubmitting(false); }
  };

  if (status === 'unauthenticated') {
    router.push(`/auth/signin?callbackUrl=/groups/${groupId}/create-challenge`);
    return null;
  }

  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  // Show mobile restriction
  if (isMobile) {
    return (
      <MobileRestriction
        title="Create Challenges on Desktop"
        message="Creating and managing challenges requires a desktop experience for the best functionality. Please switch to a laptop or desktop computer to create challenges."
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      {/* Back */}
      <Link href={`/groups/${groupId}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to group
      </Link>

      {/* Header + steps */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">New Challenge</h1>
          {group?.group?.name && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{group.group.name}</p>
          )}
        </div>
        <Steps current={step} />
      </div>

      {/* ═══════════════════════ STEP 0: Details ═══════════════════════ */}
      {step === 0 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Title */}
          <div className="p-4 sm:p-5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Weekly DSA Sprint" maxLength={100}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition" />
          </div>

          {/* Description */}
          <div className="p-4 sm:p-5">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Rules, goals, or notes for participants…" rows={3} maxLength={2000}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition resize-y" />
          </div>

          {/* Time */}
          <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1 opacity-50" />Start
              </label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                <Clock className="w-3.5 h-3.5 inline mr-1 opacity-50" />End
              </label>
              <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
            </div>
          </div>

          {/* Toggles */}
          <div className="p-4 sm:p-5 space-y-0 divide-y divide-zinc-50 dark:divide-zinc-800/50">
            <Toggle on={isPublic} onToggle={() => setIsPublic(v => !v)}
              icon={isPublic ? Eye : EyeOff}
              label={isPublic ? 'Visible to all members' : 'Hidden challenge'}
              sublabel="Controls whether non-invited members can see this challenge" />
            <Toggle on={strictMode} onToggle={() => setStrictMode(v => !v)}
              icon={Shield}
              label="Proctored mode"
              sublabel="Full-screen lock, no copy/paste, exit warnings with auto-disqualification" />
            <Toggle on={inviteOnly} onToggle={() => setInviteOnly(v => !v)}
              icon={UserPlus}
              label="Invite only"
              sublabel="Only selected members can enter the challenge" />
          </div>

          {/* Advanced */}
          <div className="p-4 sm:p-5">
            <button type="button" onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Advanced settings
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Late entry window (minutes)
                  </label>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1.5">
                    Participants can join up to this many minutes after start time. After that, entry is blocked.
                  </p>
                  <input type="number" min={0} max={30} value={lateEntryMinutes}
                    onChange={e => setLateEntryMinutes(Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                    className="w-24 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════ STEP 1: Problems ═══════════════════════ */}
      {step === 1 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select Problems</span>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
              {selected.size} selected
            </span>
          </div>

          {/* Selected chips */}
          {selected.size > 0 && (
            <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-2">
              {selectedProblems.map(p => (
                <span key={p.id}
                  className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                  {p.title}
                  <button type="button" onClick={() => toggleProblem(p.id)}
                    className="p-0.5 rounded hover:bg-indigo-200/60 dark:hover:bg-indigo-500/20 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input type="text" value={problemSearch} onChange={e => setProblemSearch(e.target.value)}
                placeholder="Search by title or tag…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
            </div>
          </div>

          {/* Problem list */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/60">
            {filteredProblems.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-400 dark:text-zinc-500">No problems found.</div>
            ) : filteredProblems.map((p, i) => {
              const isSelected = selected.has(p.id);
              const c = DIFF[p.difficulty] || DIFF.EASY;
              return (
                <button key={p.id} type="button" onClick={() => toggleProblem(p.id)}
                  className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${i % 2 ? 'bg-zinc-50/40 dark:bg-zinc-800/20' : ''}`}>
                  <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{p.title}</p>
                    {p.tags?.length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {p.tags.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded">{t}</span>
                        ))}
                        {p.tags.length > 3 && <span className="text-[10px] text-zinc-400">+{p.tags.length - 3}</span>}
                      </div>
                    )}
                  </div>
                  <DiffBadge d={p.difficulty} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════ STEP 2: Participants ═══════════════════════ */}
      {step === 2 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {inviteOnly ? 'Select Members to Invite' : 'Challenge Participants'}
              </span>
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                {inviteOnly ? `${invitedMembers.size} invited` : `${members.length} members`}
              </span>
            </div>
            {!inviteOnly && (
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                All group members can join this challenge. Turn on &quot;Invite only&quot; in step 1 to restrict.
              </p>
            )}
          </div>

          {inviteOnly && (
            <>
              {/* Select all / none */}
              <div className="px-4 sm:px-5 py-2 border-b border-zinc-100 dark:border-zinc-800 flex gap-3">
                <button type="button" onClick={selectAllMembers}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">Select all</button>
                <button type="button" onClick={deselectAllMembers}
                  className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:underline">Clear</button>
              </div>

              {/* Search */}
              <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search members…"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition" />
                </div>
              </div>

              {/* Invited chips */}
              {invitedMembers.size > 0 && (
                <div className="px-4 sm:px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-2">
                  {invitedMembersList.map(m => (
                    <span key={m.id}
                      className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                      {m.name}
                      <button type="button" onClick={() => toggleMember(m.id)}
                        className="p-0.5 rounded hover:bg-emerald-200/60 dark:hover:bg-emerald-500/20 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Member list */}
              <div className="max-h-[340px] overflow-y-auto divide-y divide-zinc-50 dark:divide-zinc-800/60">
                {filteredMembers.length === 0 ? (
                  <div className="py-10 text-center text-sm text-zinc-400">No members found.</div>
                ) : filteredMembers.map((m, i) => {
                  const inv = invitedMembers.has(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggleMember(m.id)}
                      className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${i % 2 ? 'bg-zinc-50/40 dark:bg-zinc-800/20' : ''}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        inv ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                        {inv && <Check className="w-3 h-3" />}
                      </span>
                      {m.image ? (
                        <img src={m.image} alt=""
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                          onError={e => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6366f1&color=fff&size=56`; }} />
                      ) : (
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=6366f1&color=fff&size=56`}
                          alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{m.name}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{m.email}</p>
                      </div>
                      {inv && <Mail className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Info about emails */}
          {inviteOnly && invitedMembers.size > 0 && (
            <div className="px-4 sm:px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-indigo-50/50 dark:bg-indigo-500/5">
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  An email with the challenge link and schedule will be sent to all {invitedMembers.size} invited member{invitedMembers.size > 1 ? 's' : ''} when the challenge is created.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════ STEP 3: Review ═══════════════════════ */}
      {step === 3 && (
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          {/* Summary header */}
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
            {description && <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>}
          </div>

          {/* Schedule */}
          <div className="p-4 sm:p-5 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-0.5">Starts</p>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {startTime ? new Date(startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 dark:text-zinc-500 text-xs mb-0.5">Ends</p>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">
                {endTime ? new Date(endTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
              </p>
            </div>
          </div>

          {/* Settings summary */}
          <div className="p-4 sm:p-5 space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                isPublic ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                {isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {isPublic ? 'Public' : 'Hidden'}
              </span>
              {strictMode && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Shield className="w-3 h-3" /> Proctored
                </span>
              )}
              {inviteOnly && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <UserPlus className="w-3 h-3" /> Invite only
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                <Clock className="w-3 h-3" /> {lateEntryMinutes}m late entry
              </span>
            </div>
          </div>

          {/* Problems summary */}
          <div className="p-4 sm:p-5">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">{selected.size} Problem{selected.size !== 1 ? 's' : ''}</p>
            <div className="space-y-1.5">
              {selectedProblems.map((p, i) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-400 dark:text-zinc-500 tabular-nums text-xs w-4 text-right">{i + 1}.</span>
                  <span className="text-zinc-800 dark:text-zinc-200 flex-1 truncate">{p.title}</span>
                  <DiffBadge d={p.difficulty} />
                </div>
              ))}
            </div>
          </div>

          {/* Participants summary */}
          {inviteOnly && invitedMembers.size > 0 && (
            <div className="p-4 sm:p-5">
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">{invitedMembers.size} Invited Member{invitedMembers.size !== 1 ? 's' : ''}</p>
              <div className="flex flex-wrap gap-1.5">
                {invitedMembersList.map(m => (
                  <span key={m.id} className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium">
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {step > 0 && (
            <button type="button" onClick={() => setStep(s => s - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Step validation hint */}
          {step === 0 && !step0Valid && (
            <p className="text-xs text-zinc-400 hidden sm:block">Fill in title and valid times</p>
          )}
          {step === 1 && !step1Valid && (
            <p className="text-xs text-zinc-400 hidden sm:block">Select at least 1 problem</p>
          )}
          {step === 2 && inviteOnly && !step2Valid && (
            <p className="text-xs text-zinc-400 hidden sm:block">Select at least 1 member</p>
          )}

          {step < 3 ? (
            <button type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={
                (step === 0 && !step0Valid) ||
                (step === 1 && !step1Valid) ||
                (step === 2 && !step2Valid)
              }
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
              Continue
            </button>
          ) : (
            <button type="button" onClick={handleSubmit}
              disabled={submitting || !canSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              ) : (
                <><Plus className="w-4 h-4" /> Create Challenge</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}