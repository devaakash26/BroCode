'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, X, Loader2, Check, Code2, PenTool, FlaskConical, Radio } from 'lucide-react';
import { GLASS, LANGUAGES } from './utils';
import { statementBlocks, starterCode } from './problemImport';

const DIFF = {
  EASY: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
  MEDIUM: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  HARD: 'text-rose-600 dark:text-rose-400 bg-rose-500/10',
};
const DIFF_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

const parseHtml = (html) => new DOMParser().parseFromString(html, 'text/html').body;

function Option({ checked, onChange, icon: Icon, title, hint, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-2.5 w-full text-left rounded-lg px-3 py-2 border transition-colors disabled:opacity-50 ${
        checked ? 'border-indigo-500/50 bg-indigo-500/[0.06]' : 'border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.03]'
      }`}
    >
      <span className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 dark:border-white/20'}`}>
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-100">
          <Icon className="w-3.5 h-3.5 text-gray-400" /> {title}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
      </span>
    </button>
  );
}

/** Host-only: pick a problem from the problem set and load it into the room. */
export default function ProblemPicker({ open, onClose, onLoad, tabsFull }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null); // full problem
  const [loadingId, setLoadingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState({ code: true, statement: true, inputs: true, focus: true });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setTimeout(() => inputRef.current?.focus(), 50);
    const esc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  // Search as you type.
  useEffect(() => {
    if (!open) return undefined;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/playground/problems?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { problems: [] }))
        .then((d) => setList(d.problems || []))
        .catch((e) => e.name !== 'AbortError' && setList([]));
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, open]);

  const pick = async (id) => {
    if (selected?.id === id) return;
    setLoadingId(id);
    try {
      const r = await fetch(`/api/playground/problems?id=${id}`);
      const d = await r.json();
      if (r.ok) setSelected(d.problem);
    } finally {
      setLoadingId(null);
    }
  };

  const preview = useMemo(() => (selected ? statementBlocks(selected, parseHtml) : []), [selected]);
  const langs = useMemo(() => (selected ? Object.keys(starterCode(selected)) : []), [selected]);

  const submit = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await onLoad(selected, { ...opts, code: opts.code && !tabsFull });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const nothing = !(opts.code && !tabsFull) && !opts.statement;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="problem-picker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`w-full max-w-4xl h-[min(640px,90vh)] rounded-2xl shadow-2xl flex flex-col overflow-hidden ${GLASS}`}
            role="dialog"
            aria-modal="true"
            aria-label="Load a problem"
          >
            <div className="flex items-center gap-2 h-12 px-4 border-b border-gray-200 dark:border-white/[0.07]">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Load a problem</span>
              <span className="text-xs text-gray-400">from BroCode problems</span>
              <button onClick={onClose} className="ml-auto w-8 h-8 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.06]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              {/* list */}
              <div className="flex flex-col min-h-0 border-r border-gray-200 dark:border-white/[0.07]">
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={inputRef}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search problems…"
                      className="w-full h-10 pl-9 pr-3 rounded-lg bg-white dark:bg-[#0a0d14] border border-gray-300 dark:border-white/10 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15"
                    />
                  </div>
                </div>
                <ul className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
                  {list === null ? (
                    [0, 1, 2, 3, 4].map((i) => <li key={i} className="h-12 mx-1 my-1 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />)
                  ) : list.length === 0 ? (
                    <li className="px-3 py-10 text-center text-sm text-gray-400">No problems match “{q}”.</li>
                  ) : (
                    list.map((p) => {
                      const on = selected?.id === p.id;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pick(p.id)}
                            className={`w-full flex items-center gap-2 px-3 h-12 rounded-lg text-left transition-colors ${
                              on ? 'bg-indigo-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate text-sm ${on ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}>{p.title}</span>
                              <span className="block truncate text-[11px] text-gray-400">{(p.tags || []).slice(0, 3).join(' · ')}</span>
                            </span>
                            {loadingId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                            ) : (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${DIFF[p.difficulty] || ''}`}>{DIFF_LABEL[p.difficulty] || p.difficulty}</span>
                            )}
                          </button>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              {/* preview + options */}
              <div className="flex flex-col min-h-0">
                {!selected ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8 text-gray-400">
                    <BookOpen className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Pick a problem to see its statement and starter code.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                      {preview.map((b, i) => (
                        <div
                          key={i}
                          className={
                            b.kind === 'heading'
                              ? 'text-lg font-semibold text-gray-900 dark:text-white'
                              : b.kind === 'subheading'
                                ? 'mt-4 text-sm font-semibold text-gray-800 dark:text-gray-100'
                                : b.kind === 'code'
                                  ? 'mt-2 rounded-md bg-gray-50 dark:bg-white/[0.04] ring-1 ring-gray-200 dark:ring-white/10 px-3 py-2 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap'
                                  : b.muted
                                    ? 'mt-0.5 text-xs text-gray-400'
                                    : 'mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap'
                          }
                        >
                          {b.text}
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-200 dark:border-white/[0.07] p-4 space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 pb-1 text-[11px] text-gray-500">
                        Starter code:
                        {LANGUAGES.map((l) => (
                          <span
                            key={l.id}
                            className={`px-1.5 py-0.5 rounded ${langs.includes(l.id) ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium' : 'bg-gray-100 dark:bg-white/[0.04] text-gray-400 line-through'}`}
                          >
                            {l.label}
                          </span>
                        ))}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <Option
                          checked={opts.code && !tabsFull}
                          disabled={tabsFull}
                          onChange={(v) => setOpts((o) => ({ ...o, code: v }))}
                          icon={Code2}
                          title="Starter code in a new tab"
                          hint={tabsFull ? 'All tabs are in use — close one first' : 'Each language gets the problem’s driver code'}
                        />
                        <Option
                          checked={opts.statement}
                          onChange={(v) => setOpts((o) => ({ ...o, statement: v }))}
                          icon={PenTool}
                          title="Statement on the scratchpad"
                          hint="Title, description, constraints and examples"
                        />
                        <Option
                          checked={opts.inputs && opts.code && !tabsFull}
                          disabled={!opts.code || tabsFull || !selected.samples?.length}
                          onChange={(v) => setOpts((o) => ({ ...o, inputs: v }))}
                          icon={FlaskConical}
                          title="Sample inputs"
                          hint={selected.samples?.length ? `${selected.samples.length} visible test case${selected.samples.length > 1 ? 's' : ''}` : 'This problem has no visible samples'}
                        />
                        <Option
                          checked={opts.focus && opts.code && !tabsFull}
                          disabled={!opts.code || tabsFull}
                          onChange={(v) => setOpts((o) => ({ ...o, focus: v }))}
                          icon={Radio}
                          title="Bring everyone to it"
                          hint="Switch the whole room to the new tab"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={submit}
                        disabled={busy || nothing}
                        className="mt-1 w-full h-10 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Load “{selected.title}”
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
