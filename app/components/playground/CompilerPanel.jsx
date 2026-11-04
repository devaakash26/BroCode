'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import { Play, Plus, X, Loader2, Terminal, CheckCircle2, AlertCircle, Code2, ChevronDown, Radio, BookOpen, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import CollabEditor from './CollabEditor';
import SharedTextarea from './SharedTextarea';
import useCodeTabs from './useCodeTabs';
import ProblemPicker from './ProblemPicker';
import { layoutNote, NOTE_KINDS } from './BoardNote';
import { statementBlocks, starterCode } from './problemImport';
import { STATEMENT_KIND, STATEMENT_W, blocksToMarkup, statementHeight } from './StatementCard';
import { LANGUAGES, MAX_INPUTS, MAX_TABS, MAIN_TAB, PANEL, PANEL_HEADER, codeKey, inputsKey } from './utils';

const LANG_DOT = { cpp: '#3b82f6', c: '#64748b', java: '#f97316', javascript: '#eab308', python: '#22c55e' };

function useYArrayLength(yarr) {
  const [len, setLen] = useState(yarr.length);
  useEffect(() => {
    const sync = () => setLen(yarr.length);
    yarr.observe(sync);
    sync();
    return () => yarr.unobserve(sync);
  }, [yarr]);
  return len;
}


/** Question tabs across the top of the compiler. */
function TabStrip({ ct, isHost, me, onOpenProblems }) {
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState('');
  const commit = () => {
    if (editing) ct.renameTab(editing, draft);
    setEditing(null);
  };
  return (
    <div className="flex items-center gap-1 h-10 px-1.5 border-b border-gray-200 dark:border-white/[0.07] bg-gray-50/70 dark:bg-black/20 overflow-x-auto [scrollbar-width:none]">
      <AnimatePresence initial={false}>
        {ct.tabs.map((t, i) => {
          const on = t.id === ct.active;
          const canClose = t.id !== MAIN_TAB && (isHost || t.by === me.id);
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              className="relative flex-shrink-0"
            >
              {editing === t.id ? (
                <input
                  autoFocus
                  value={draft}
                  maxLength={40}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  className="h-7 w-36 px-2 rounded-md text-xs font-medium bg-white dark:bg-[#0b1020] border border-indigo-500 text-gray-900 dark:text-white outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => ct.setActive(t.id)}
                  onDoubleClick={() => {
                    setEditing(t.id);
                    setDraft(t.title);
                  }}
                  title="Double-click to rename"
                  className={`group relative h-7 pl-2.5 ${canClose ? 'pr-1' : 'pr-2.5'} rounded-md inline-flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    on ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="code-tab-pill"
                      className="absolute inset-0 rounded-md bg-white dark:bg-white/[0.08] ring-1 ring-gray-200 dark:ring-white/[0.08] shadow-sm"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="relative font-mono text-[10px] text-gray-400">{i + 1}</span>
                  <span className="relative max-w-[140px] truncate">{t.title}</span>
                  {canClose && (
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Close “${t.title}” for everyone? Its code is deleted.`)) ct.removeTab(t.id);
                      }}
                      className="relative w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      <X className="w-3 h-3" />
                    </span>
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {ct.tabs.length < MAX_TABS && (
        <button
          type="button"
          onClick={() => ct.addTab()}
          title="New question tab"
          className="flex-shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tab</span>
        </button>
      )}
      <div className="flex-1" />
      {isHost && (
        <button
          type="button"
          onClick={onOpenProblems}
          title="Load a problem's starter code and statement"
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Problem</span>
        </button>
      )}
      {isHost && ct.tabs.length > 1 && (
        <button
          type="button"
          onClick={ct.bringEveryone}
          title="Move everyone in the room to this tab"
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
        >
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Bring everyone here</span>
        </button>
      )}
    </div>
  );
}

const LANG_ORDER = ['cpp', 'java', 'python', 'javascript', 'c'];
const parseHtml = (html) => new DOMParser().parseFromString(html, 'text/html').body;

// Editor ↔ input/output height, and input ↔ output width. Remembered per browser.
const IO_KEY = 'pg-io-split';
const IO_DEFAULT = { io: 38, input: 50 }; // % of the body height, % of the I/O width
const IO_BOUNDS = { io: [15, 75], input: [20, 80] };
const clampTo = (k, v) => Math.min(IO_BOUNDS[k][1], Math.max(IO_BOUNDS[k][0], v));

function useIoSplit() {
  const [split, setSplit] = useState(IO_DEFAULT);
  const [dragging, setDragging] = useState(null); // 'io' | 'input' | null
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(IO_KEY) || 'null');
      if (v) setSplit({ io: clampTo('io', +v.io || IO_DEFAULT.io), input: clampTo('input', +v.input || IO_DEFAULT.input) });
    } catch {}
  }, []);
  const save = (next) => {
    try {
      localStorage.setItem(IO_KEY, JSON.stringify(next));
    } catch {}
  };
  const set = (k, v) =>
    setSplit((cur) => {
      const next = { ...cur, [k]: clampTo(k, v) };
      save(next);
      return next;
    });
  /** Starts a drag. `rectOf` returns the box the percentage is measured against. */
  const start = (k, rectOf) => (e) => {
    e.preventDefault();
    const rect = rectOf();
    const move = (ev) => {
      const pct =
        k === 'io'
          ? ((rect.bottom - ev.clientY) / rect.height) * 100 // I/O sits at the bottom
          : ((ev.clientX - rect.left) / rect.width) * 100;
      setSplit((cur) => ({ ...cur, [k]: clampTo(k, pct) }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragging(null);
      setSplit((cur) => (save(cur), cur));
    };
    document.body.style.cursor = k === 'io' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';
    setDragging(k);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const keys = (k) => (e) => {
    const step = e.shiftKey ? 10 : 3;
    const dec = k === 'io' ? 'ArrowDown' : 'ArrowLeft';
    const inc = k === 'io' ? 'ArrowUp' : 'ArrowRight';
    if (e.key !== dec && e.key !== inc) return;
    e.preventDefault();
    set(k, split[k] + (e.key === inc ? step : -step));
  };
  return { split, dragging, start, keys, reset: (k) => set(k, IO_DEFAULT[k]) };
}

export default function CompilerPanel({ pg, me, isHost, boardApi }) {
  const { doc, socket, peers, myPeerId, runs, runningBy, setRunningBy } = pg;
  const ct = useCodeTabs(doc, { mainLanguage: pg.language, setMainLanguage: pg.setLanguage, me });
  const { active: tab, language, setLanguage } = ct;
  const run = runs[tab] || null;
  const inputs = useMemo(() => doc.getArray(inputsKey(tab)), [doc, tab]);
  const inputCount = useYArrayLength(inputs);
  const [activeInput, setActiveInput] = useState(0);
  const [running, setRunning] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const io = useIoSplit();
  const bodyRef = useRef(null);
  const ioRef = useRef(null);

  /** Host loads a problem: driver code into a new tab, statement onto the board. */
  const loadProblem = useCallback(
    async (problem, opts) => {
      if (opts.code) {
        const code = starterCode(problem);
        const lang = code[language] ? language : LANG_ORDER.find((l) => code[l]) || language;
        const id = ct.addTab({
          title: problem.title,
          code,
          language: lang,
          inputs: opts.inputs ? (problem.samples || []).map((s) => s.input) : [],
          focus: opts.focus,
          problemId: problem.id,
          hiddenCount: problem.hiddenCount || 0,
          sampleCount: (problem.samples || []).length,
        });
        if (!id) return;
        if (!Object.keys(code).length) toast('This problem has no starter code — using the default template');
      }
      if (opts.statement) {
        const notes = doc.getMap('notes');
        // Place it below whatever is on the board already.
        let bottom = boardApi?.current?.contentBottom?.() ?? 0;
        notes.forEach((m) => {
          const t = m.get('text')?.toString() || '';
          const h =
            m.get('kind') === STATEMENT_KIND
              ? statementHeight(t, m.get('w') || STATEMENT_W)
              : layoutNote(NOTE_KINDS[m.get('kind')] ? m.get('kind') : 'text', t, m.get('w') || 520).height;
          bottom = Math.max(bottom, (m.get('y') || 0) + h);
        });
        const startY = bottom > 0 ? Math.ceil(bottom + 140) : 60;
        const m = new Y.Map();
        m.set('x', 60);
        m.set('y', startY);
        m.set('w', STATEMENT_W);
        m.set('kind', STATEMENT_KIND);
        m.set('locked', true);
        m.set('by', me.id);
        m.set('problemId', problem.id);
        m.set('text', new Y.Text(blocksToMarkup(statementBlocks(problem, parseHtml))));
        notes.set(`stmt-${me.id.slice(-6)}-${Date.now().toString(36)}`, m);
        if (boardApi?.current) boardApi.current.scrollToBoardY(startY);
        else toast.success('Statement added to the scratchpad');
      }
    },
    [ct, language, doc, boardApi, me.id],
  );
  const busy = running || !!runningBy;

  useEffect(() => {
    if (activeInput >= inputCount) setActiveInput(Math.max(0, inputCount - 1));
  }, [inputCount, activeInput]);

  useEffect(() => setActiveInput(0), [tab]);

  const addInput = () => {
    if (inputs.length >= MAX_INPUTS) return;
    inputs.push([new Y.Text()]);
    setActiveInput(inputs.length - 1);
  };

  const removeInput = (i) => {
    if (inputs.length <= 1) return;
    inputs.delete(i, 1);
  };

  const runCode = useCallback(async () => {
    if (running) return;
    const code = doc.getText(`code:${codeKey(tab, language)}`).toString();
    const stdins = inputs.toArray().map((t) => t.toString());
    setRunning(true);
    socket?.emit('pg:running', { running: true });
    try {
      const res = await fetch('/api/playground/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language, inputs: stdins }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Run failed');
      socket?.emit('pg:run', { ...data, tab }); // server broadcasts the result to everyone
    } catch (err) {
      toast.error(err.message);
      socket?.emit('pg:running', { running: false });
    } finally {
      setRunning(false);
      setRunningBy(null);
    }
  }, [running, doc, tab, language, inputs, socket, setRunningBy]);

  const result = run?.results?.[activeInput];

  // Submit: runs every test case (samples + hidden) on the server, pass/fail only,
  // and saves a real submission. Hidden inputs never reach the room.
  const tabMeta = ct.tabs.find((t) => t.id === tab);
  const hiddenCount = tabMeta?.problemId ? tabMeta.hiddenCount || 0 : 0;
  const totalTests = tabMeta?.problemId ? (tabMeta.sampleCount || 0) + hiddenCount : 0;
  const canSubmit = !!tabMeta?.problemId;
  const [hidden, setHidden] = useState({}); // tab → { checking, total, passed, results, language, at }
  const hiddenRes = hidden[tab];
  const checkHidden = useCallback(async () => {
    if (!tabMeta?.problemId || hidden[tab]?.checking) return;
    const code = doc.getText(`code:${codeKey(tab, language)}`).toString();
    setHidden((h) => ({ ...h, [tab]: { ...(h[tab] || {}), checking: true } }));
    try {
      const res = await fetch('/api/playground/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId: tabMeta.problemId, code, language, scope: 'all' }),
      });
      const data = await res.json().catch(() => ({ message: 'The server sent an unexpected reply' }));
      if (!res.ok) throw new Error(data.message || 'Submit failed');
      setHidden((h) => ({ ...h, [tab]: { ...data, language, at: Date.now(), checking: false } }));
      if (data.total) {
        const pts = data.submission?.pointsAwarded;
        toast[data.passed === data.total ? 'success' : 'error'](
          `${data.passed}/${data.total} test cases passed${pts ? ` · +${pts} points` : ''}`,
        );
      }
    } catch (err) {
      toast.error(err.message);
      setHidden((h) => ({ ...h, [tab]: { ...(h[tab] || {}), checking: false } }));
    }
  }, [tabMeta?.problemId, hidden, tab, doc, language]);
  const pill = (active) =>
    `group inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium transition-all ${
      active
        ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
    }`;
  const subHeader = 'flex items-center gap-1 h-10 px-2 border-b border-gray-200 dark:border-white/[0.07]';

  return (
    <div className={`${PANEL} flex flex-col h-full min-h-0`}>
      <TabStrip ct={ct} isHost={isHost} me={me} onOpenProblems={() => setPickerOpen(true)} />
      <ProblemPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onLoad={loadProblem}
        tabsFull={ct.tabs.length >= MAX_TABS}
      />

      {/* Header */}
      <div className={PANEL_HEADER}>
        <Code2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="hidden xl:inline text-sm font-semibold text-gray-800 dark:text-gray-100">Compiler</span>
        <div className="relative ml-1">
          <span
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
            style={{ background: LANG_DOT[language] }}
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="appearance-none h-8 pl-6 pr-7 rounded-md text-sm bg-transparent text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-white/10 outline-none focus:border-indigo-500 cursor-pointer"
            title="Language is shared with everyone in the room"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id} className="bg-white dark:bg-gray-900">
                {l.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
        {runningBy && !running && (
          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" /> {runningBy} is running…
          </span>
        )}
        <div className="flex-1" />
        <kbd className="hidden md:inline-flex items-center h-6 px-1.5 rounded text-[10px] font-medium text-gray-400 border border-gray-200 dark:border-white/10">
          ⌘ / Ctrl + ↵
        </kbd>
        <button
          onClick={runCode}
          disabled={busy}
          className={
            canSubmit
              ? 'inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.05] disabled:opacity-50 transition-colors'
              : 'inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors'
          }
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          Run
        </button>
        {canSubmit && (
          <button
            onClick={checkHidden}
            disabled={busy || hiddenRes?.checking}
            title={`Submit: run against all ${totalTests || ''} test cases and save to your submissions`}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] transition-colors"
          >
            {hiddenRes?.checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {hiddenRes?.checking ? 'Submitting…' : 'Submit'}
            {!hiddenRes?.checking && totalTests > 0 && <span className="text-xs font-medium text-emerald-100 tabular-nums">{totalTests}</span>}
          </button>
        )}
      </div>

      {/* Editor + input/output, both resizable */}
      <div ref={bodyRef} className="relative flex-1 min-h-0 flex flex-col">
      {io.dragging && <div className="absolute inset-0 z-20" style={{ cursor: io.dragging === 'io' ? 'row-resize' : 'col-resize' }} />}
      {/* Editor */}
      <div className="min-h-0" style={{ flex: `0 0 ${100 - io.split.io}%` }}>
        <CollabEditor
          doc={doc}
          language={language}
          codeKey={codeKey(tab, language)}
          socket={socket}
          peers={peers}
          myPeerId={myPeerId}
          onRun={runCode}
        />
      </div>

      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize editor and input/output"
        aria-valuenow={Math.round(io.split.io)}
        tabIndex={0}
        onPointerDown={io.start('io', () => bodyRef.current.getBoundingClientRect())}
        onDoubleClick={() => io.reset('io')}
        onKeyDown={io.keys('io')}
        title="Drag to resize · double-click to reset"
        className="group relative h-2 -my-1 z-10 flex-shrink-0 flex items-center justify-center cursor-row-resize outline-none"
      >
        <span className="absolute inset-x-0 top-1/2 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
        <span className={`relative w-10 h-1 rounded-full transition-colors ${io.dragging === 'io' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-white/15 group-hover:bg-indigo-400 group-focus-visible:bg-indigo-400'}`} />
      </div>

      {/* Input / Output */}
      <div
        ref={ioRef}
        className="min-h-[120px] grid"
        style={{ flex: `0 0 ${io.split.io}%`, gridTemplateColumns: `minmax(0, ${io.split.input}fr) 8px minmax(0, ${100 - io.split.input}fr)` }}
      >
        <div className="flex flex-col min-h-0">
          <div className={`${subHeader} overflow-x-auto`}>
            {Array.from({ length: inputCount }, (_, i) => (
              <button key={i} onClick={() => setActiveInput(i)} className={pill(i === activeInput)}>
                Input {i + 1}
                {inputCount > 1 && (
                  <X
                    className="w-3 h-3 opacity-0 group-hover:opacity-60 hover:!opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeInput(i);
                    }}
                  />
                )}
              </button>
            ))}
            {inputCount < MAX_INPUTS && (
              <button
                onClick={addInput}
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                title={`Add input (max ${MAX_INPUTS})`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="ml-auto pr-1 text-[10px] text-gray-400 tabular-nums">{inputCount}/{MAX_INPUTS}</span>
          </div>
          <div className="flex-1 min-h-0">
            {inputCount > 0 && inputs.get(Math.min(activeInput, inputCount - 1)) && (
              <SharedTextarea
                key={`${tab}-${activeInput}`}
                ytext={inputs.get(Math.min(activeInput, inputCount - 1))}
                placeholder="stdin for this run…"
                className="w-full h-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none"
              />
            )}
          </div>
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize input and output"
          aria-valuenow={Math.round(io.split.input)}
          tabIndex={0}
          onPointerDown={io.start('input', () => ioRef.current.getBoundingClientRect())}
          onDoubleClick={() => io.reset('input')}
          onKeyDown={io.keys('input')}
          title="Drag to resize · double-click to reset"
          className="group relative flex items-center justify-center cursor-col-resize outline-none"
        >
          <span className="absolute inset-y-0 left-1/2 w-px bg-black/[0.06] dark:bg-white/[0.06]" />
          <span className={`relative h-10 w-1 rounded-full transition-colors ${io.dragging === 'input' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-white/15 group-hover:bg-indigo-400 group-focus-visible:bg-indigo-400'}`} />
        </div>

        <div className="flex flex-col min-h-0">
          <div className={`${subHeader} px-3 gap-2 text-xs`}>
            <Terminal className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-600 dark:text-gray-300">Output {activeInput + 1}</span>
            {result && (
              <span
                className={`inline-flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-semibold ${
                  result.ok
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20'
                }`}
              >
                {result.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {result.status}
              </span>
            )}
            <div className="flex-1" />
            {result?.time && (
              <span className="text-gray-400 tabular-nums">
                {result.time}s · {Math.round((result.memory || 0) / 1024)} MB
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-4 py-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-words">
            {!run ? (
              <span className="text-gray-400 dark:text-gray-600">Run the code to see output for every input.</span>
            ) : !result ? (
              <span className="text-gray-400 dark:text-gray-600">No result for this input in the last run.</span>
            ) : (
              <>
                {result.compileOutput && <div className="text-rose-500">{result.compileOutput}</div>}
                {result.stdout && <div className="text-gray-800 dark:text-gray-100">{result.stdout}</div>}
                {result.stderr && <div className="text-amber-600 dark:text-amber-400">{result.stderr}</div>}
                {!result.compileOutput && !result.stdout && !result.stderr && (
                  <span className="text-gray-400">(no output)</span>
                )}
              </>
            )}
          </div>
          {canSubmit && (
            <div className="px-4 h-9 flex items-center gap-2 text-[11px] border-t border-black/[0.04] dark:border-white/[0.05]">
              {hiddenRes?.total ? (
                <>
                  {hiddenRes.passed === hiddenRes.total ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  )}
                  <span className={`font-semibold tabular-nums ${hiddenRes.passed === hiddenRes.total ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {hiddenRes.passed}/{hiddenRes.total} test cases passed
                  </span>
                  <span className="flex items-center gap-1">
                    {hiddenRes.results.map((r, i) => (
                      <span
                        key={i}
                        title={`${r.hidden ? 'Hidden' : 'Sample'} test ${i + 1}: ${r.verdict}${r.time ? ` · ${r.time}s` : ''}`}
                        className={`w-2 h-2 rounded-full ${r.passed ? 'bg-emerald-500' : 'bg-rose-500'} ${r.hidden ? 'ring-1 ring-offset-1 ring-gray-300 dark:ring-white/25 ring-offset-white dark:ring-offset-[#11151f]' : ''}`}
                      />
                    ))}
                  </span>
                  {hiddenRes.submission?.pointsAwarded > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{hiddenRes.submission.pointsAwarded} pts
                    </span>
                  )}
                  <span className="ml-auto text-gray-400 truncate">
                    Saved to your submissions · {formatDistanceToNowStrict(hiddenRes.at, { addSuffix: true })}
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Lock className="w-3 h-3 text-gray-400" />
                  {totalTests ? `${totalTests} test cases` : 'Test cases'}
                  {hiddenCount ? ` · ${hiddenCount} hidden` : ''} · Submit to run them all
                  {hiddenRes?.checking ? ' · running…' : ''}
                </span>
              )}
            </div>
          )}
          {run && (
            <div className="px-4 h-8 flex items-center text-[11px] text-gray-400 border-t border-black/[0.04] dark:border-white/[0.05]">
              Last run by <span className="mx-1 font-medium text-gray-500 dark:text-gray-300">{run.by}</span>·{' '}
              {LANGUAGES.find((l) => l.id === run.language)?.label} · {formatDistanceToNowStrict(run.at, { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
