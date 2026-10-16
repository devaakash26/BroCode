'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { Play, Plus, X, Loader2, Terminal, CheckCircle2, AlertCircle, Code2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import CollabEditor from './CollabEditor';
import { LANGUAGES, MAX_INPUTS, PANEL, PANEL_HEADER } from './utils';

const LANG_DOT = { cpp: '#3b82f6', c: '#64748b', java: '#f97316', javascript: '#eab308', python: '#22c55e' };

/** Textarea bound to a Y.Text; keeps the caret steady on remote edits. */
function SharedTextarea({ ytext, placeholder }) {
  const ref = useRef(null);
  const [value, setValue] = useState(() => ytext.toString());

  useEffect(() => {
    setValue(ytext.toString());
    const onChange = (event, tx) => {
      if (tx.local) return setValue(ytext.toString());
      const el = ref.current;
      let { selectionStart: s, selectionEnd: e } = el || { selectionStart: 0, selectionEnd: 0 };
      let i = 0;
      for (const op of event.delta) {
        if (op.retain) i += op.retain;
        else if (op.insert) {
          if (i <= s) s += op.insert.length;
          if (i <= e) e += op.insert.length;
          i += op.insert.length;
        } else if (op.delete) {
          if (i < s) s -= Math.min(op.delete, s - i);
          if (i < e) e -= Math.min(op.delete, e - i);
        }
      }
      setValue(ytext.toString());
      if (el && document.activeElement === el) requestAnimationFrame(() => el.setSelectionRange(s, e));
    };
    ytext.observe(onChange);
    return () => ytext.unobserve(onChange);
  }, [ytext]);

  const handleChange = (e) => {
    const next = e.target.value;
    const prev = ytext.toString();
    let start = 0;
    while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
    let endPrev = prev.length;
    let endNext = next.length;
    while (endPrev > start && endNext > start && prev[endPrev - 1] === next[endNext - 1]) {
      endPrev--;
      endNext--;
    }
    ytext.doc.transact(() => {
      if (endPrev > start) ytext.delete(start, endPrev - start);
      if (endNext > start) ytext.insert(start, next.slice(start, endNext));
    });
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      spellCheck={false}
      className="w-full h-full resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-relaxed text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none"
    />
  );
}

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

export default function CompilerPanel({ pg }) {
  const { doc, socket, language, setLanguage, peers, myPeerId, run, runningBy, setRunningBy } = pg;
  const inputs = doc.getArray('inputs');
  const inputCount = useYArrayLength(inputs);
  const [activeInput, setActiveInput] = useState(0);
  const [running, setRunning] = useState(false);
  const busy = running || !!runningBy;

  useEffect(() => {
    if (activeInput >= inputCount) setActiveInput(Math.max(0, inputCount - 1));
  }, [inputCount, activeInput]);

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
    const code = doc.getText(`code:${language}`).toString();
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
      socket?.emit('pg:run', data); // server broadcasts the result to everyone
    } catch (err) {
      toast.error(err.message);
      socket?.emit('pg:running', { running: false });
    } finally {
      setRunning(false);
      setRunningBy(null);
    }
  }, [running, doc, language, inputs, socket, setRunningBy]);

  const result = run?.results?.[activeInput];
  const pill = (active) =>
    `group inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium transition-all ${
      active
        ? 'bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white'
        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
    }`;
  const subHeader = 'flex items-center gap-1 h-10 px-2 border-b border-gray-200 dark:border-white/[0.07]';

  return (
    <div className={`${PANEL} flex flex-col h-full min-h-0`}>
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
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          Run
        </button>
      </div>

      {/* Editor */}
      <div className="flex-[3] min-h-0">
        <CollabEditor
          doc={doc}
          language={language}
          socket={socket}
          peers={peers}
          myPeerId={myPeerId}
          onRun={runCode}
        />
      </div>

      {/* Input / Output */}
      <div className="flex-[2] min-h-[190px] grid grid-cols-2 border-t border-black/[0.06] dark:border-white/[0.06]">
        <div className="flex flex-col min-h-0 border-r border-black/[0.06] dark:border-white/[0.06]">
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
                key={activeInput}
                ytext={inputs.get(Math.min(activeInput, inputCount - 1))}
                placeholder="stdin for this run…"
              />
            )}
          </div>
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
          {run && (
            <div className="px-4 h-8 flex items-center text-[11px] text-gray-400 border-t border-black/[0.04] dark:border-white/[0.05]">
              Last run by <span className="mx-1 font-medium text-gray-500 dark:text-gray-300">{run.by}</span>·{' '}
              {LANGUAGES.find((l) => l.id === run.language)?.label} · {formatDistanceToNowStrict(run.at, { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
