'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search, ChevronUp, ChevronDown, X, CheckCircle2,
  Circle, Tag, SlidersHorizontal, RotateCcw,
} from 'lucide-react';

const DIFF_COLOR = { EASY: 'text-emerald-500', MEDIUM: 'text-amber-500', HARD: 'text-rose-500' };
const DIFF_BG   = { EASY: 'bg-emerald-500/10', MEDIUM: 'bg-amber-500/10', HARD: 'bg-rose-500/10' };
const DIFF_RING = { EASY: 'ring-emerald-500/30', MEDIUM: 'ring-amber-500/30', HARD: 'ring-rose-500/30' };
const DIFF_TRACK = { EASY: 'bg-emerald-500', MEDIUM: 'bg-amber-500', HARD: 'bg-rose-500' };

function DifficultyPill({ d }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase rounded ${DIFF_BG[d]} ${DIFF_COLOR[d]}`}>
      {d.charAt(0) + d.slice(1).toLowerCase()}
    </span>
  );
}

function StatRing({ label, solved, total, color }) {
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const r = 28, stroke = 5;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
          <circle cx="35" cy="35" r={r} fill="none" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" strokeWidth={stroke} />
          <circle cx="35" cy="35" r={r} fill="none" stroke="currentColor" className={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={circ - (circ * pct) / 100} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-100">
          {solved}<span className="text-zinc-400 dark:text-zinc-500 font-normal">/{total}</span>
        </span>
      </div>
      <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

export default function ClientProblemsPage({ initialProblems, stats }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { total, solved, easy, medium, hard, tags: allTags } = stats;

  const uniqueProblems = useMemo(
    () => Array.from(new Map(initialProblems.map((p) => [p.id, p])).values()),
    [initialProblems],
  );

  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [difficulty, setDifficulty] = useState(searchParams.get('d') || '');
  const [status, setStatus] = useState(searchParams.get('s') || '');
  const [activeTags, setActiveTags] = useState(() => {
    const t = searchParams.get('tags');
    return t ? t.split(',') : [];
  });
  const [sortCol, setSortCol] = useState('recent');
  const [sortDir, setSortDir] = useState('desc');
  const [showAllTags, setShowAllTags] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let list = [...uniqueProblems];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.tags.some((t) => t.toLowerCase().includes(q)));
    }
    if (difficulty) list = list.filter((p) => p.difficulty === difficulty);
    if (status === 'solved') list = list.filter((p) => p.solved);
    if (status === 'todo') list = list.filter((p) => !p.solved);
    if (activeTags.length) list = list.filter((p) => activeTags.every((t) => p.tags.includes(t)));

    const diffOrder = { EASY: 1, MEDIUM: 2, HARD: 3 };
    list.sort((a, b) => {
      let c = 0;
      if (sortCol === 'title') c = a.title.localeCompare(b.title);
      else if (sortCol === 'difficulty') c = diffOrder[a.difficulty] - diffOrder[b.difficulty];
      else if (sortCol === 'acceptance') c = a.acceptance - b.acceptance;
      else c = b.id.localeCompare(a.id);
      return sortDir === 'asc' ? -c : c;
    });
    return list;
  }, [uniqueProblems, search, difficulty, status, activeTags, sortCol, sortDir]);

  const hasFilters = search || difficulty || status || activeTags.length;

  const toggleTag = useCallback((tag) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }, []);

  const clearAll = useCallback(() => {
    setSearch(''); setDifficulty(''); setStatus(''); setActiveTags([]);
    setSortCol('recent'); setSortDir('desc');
    router.push('/problems', { scroll: false });
  }, [router]);

  const handleSort = useCallback((col) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  }, [sortCol]);

  const SortIcon = ({ col }) =>
    sortCol === col
      ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
      : <ChevronDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40" />;

  const visibleTags = showAllTags ? allTags : allTags.slice(0, 12);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">

      {/* ── Stats bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">Problems</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{total} problems &middot; {solved} solved</p>
        </div>
        <div className="flex items-center gap-6">
          <StatRing label="Easy" solved={easy.solved} total={easy.total} color="text-emerald-500" />
          <StatRing label="Medium" solved={medium.solved} total={medium.total} color="text-amber-500" />
          <StatRing label="Hard" solved={hard.solved} total={hard.total} color="text-rose-500" />
        </div>
      </div>

      {/* ── Search + quick filters ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or tag…"
              className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-zinc-600" />
              </button>
            )}
          </div>

          {/* Difficulty pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['EASY', 'MEDIUM', 'HARD'].map((d) => (
              <button key={d} onClick={() => setDifficulty((prev) => (prev === d ? '' : d))}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ring-1
                  ${difficulty === d
                    ? `${DIFF_BG[d]} ${DIFF_COLOR[d]} ${DIFF_RING[d]}`
                    : 'ring-zinc-200 dark:ring-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                {d.charAt(0) + d.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5">
            {[{ key: 'solved', label: 'Solved', icon: CheckCircle2 }, { key: 'todo', label: 'Todo', icon: Circle }].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setStatus((prev) => (prev === key ? '' : key))}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ring-1
                  ${status === key
                    ? 'ring-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                    : 'ring-zinc-200 dark:ring-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Tags toggle */}
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg ring-1 transition-all
              ${showFilters ? 'ring-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                : 'ring-zinc-200 dark:ring-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />Tags
          </button>

          {hasFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
              <RotateCcw className="w-3 h-3" />Clear
            </button>
          )}
        </div>

        {/* Tag chips */}
        {showFilters && allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {visibleTags.map((tag) => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all
                  ${activeTags.includes(tag)
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                <Tag className="w-3 h-3" />{tag}
                {activeTags.includes(tag) && <X className="w-3 h-3 ml-0.5" />}
              </button>
            ))}
            {allTags.length > 12 && (
              <button onClick={() => setShowAllTags((v) => !v)}
                className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                {showAllTags ? 'Show less' : `+${allTags.length - 12} more`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Problem list ── */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {filtered.length} problem{filtered.length !== 1 ? 's' : ''}{hasFilters ? ' matched' : ''}
          </span>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <th className="w-10 py-2.5 pl-4 pr-2 text-center font-medium">Status</th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button onClick={() => handleSort('title')} className="group flex items-center gap-1">Title <SortIcon col="title" /></button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button onClick={() => handleSort('difficulty')} className="group flex items-center gap-1">Difficulty <SortIcon col="difficulty" /></button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">
                  <button onClick={() => handleSort('acceptance')} className="group flex items-center gap-1">Acceptance <SortIcon col="acceptance" /></button>
                </th>
                <th className="py-2.5 px-3 text-left font-medium hidden lg:table-cell">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/60">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-zinc-400 dark:text-zinc-500">No problems match your filters.</td></tr>
              ) : filtered.map((p, i) => (
                <tr key={p.id} className={`group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${i % 2 === 0 ? '' : 'bg-zinc-50/40 dark:bg-zinc-800/20'}`}>
                  <td className="py-3 pl-4 pr-2 text-center">
                    {p.solved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mx-auto" />}
                  </td>
                  <td className="py-3 px-3">
                    <Link href={`/problems/${p.id}`} className="font-medium text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {p.title}
                    </Link>
                  </td>
                  <td className="py-3 px-3"><DifficultyPill d={p.difficulty} /></td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div className={`h-full rounded-full ${DIFF_TRACK[p.difficulty]}`} style={{ width: `${p.acceptance}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-9">{p.acceptance}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="px-2 py-0.5 text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded">{t}</span>
                      ))}
                      {p.tags.length > 3 && <span className="px-1.5 py-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">+{p.tags.length - 3}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-400 dark:text-zinc-500 text-sm">No problems match your filters.</div>
          ) : filtered.map((p) => (
            <Link key={p.id} href={`/problems/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
              {p.solved ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Circle className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{p.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <DifficultyPill d={p.difficulty} />
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">{p.acceptance}%</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
} 
