'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GripVertical, Pencil, Trash2, Lock, Check, FileText } from 'lucide-react';
import SharedTextarea from './SharedTextarea';
import { NOTE_KINDS, layoutNote } from './BoardNote';

/*
 * A problem statement on the scratchpad, as ONE object.
 *
 * The text is light markup in a single Y.Text:
 *   # Title        ## Section        > muted line
 *   • item / 1. item                 ``` code fences ```
 *   blank line = new paragraph
 *
 * The card is drawn *under* the canvas, so everyone can sketch on top of it.
 * Only the host gets the controls (move, resize, edit, delete), which sit above
 * the canvas. Members can't change it from the UI.
 */

export const STATEMENT_KIND = 'statement';
export const STATEMENT_W = 1480;
const PAD = 44; // board units
const MIN_W = 600;
const MAX_W = 1560;
const WRITE_MS = 50;

/** Problem blocks (from problemImport.statementBlocks) → markup text. */
export function blocksToMarkup(blocks) {
  return blocks
    .map((b) => {
      if (b.kind === 'heading') return `# ${b.text}`;
      if (b.kind === 'subheading') return `## ${b.text}`;
      if (b.muted) return `> ${b.text}`;
      if (b.kind === 'code') return `\`\`\`\n${b.text}\n\`\`\``;
      return b.text; // text and list lines pass through
    })
    .join('\n\n');
}

const LIST_RE = /^\s*(?:[-*•]\s+|\d+[.)]\s+)/;

/** Markup → blocks { kind: heading|subheading|muted|text|list|code, text }. */
export function parseStatement(src) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  const out = [];
  let para = [];
  let list = [];
  const flush = () => {
    if (para.length) out.push({ kind: 'text', text: para.join('\n') });
    if (list.length) out.push({ kind: 'list', text: list.join('\n') });
    para = [];
    list = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      flush();
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      out.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const h = line.match(/^(#{1,2})\s+(.*)$/);
    if (h) {
      flush();
      out.push({ kind: h[1] === '#' ? 'heading' : 'subheading', text: h[2] });
    } else if (/^>\s?/.test(line)) {
      flush();
      out.push({ kind: 'muted', text: line.replace(/^>\s?/, '') });
    } else if (LIST_RE.test(line)) {
      if (para.length) {
        out.push({ kind: 'text', text: para.join('\n') });
        para = [];
      }
      list.push(/^\s*\d+[.)]\s/.test(line) ? line.trim() : `• ${line.replace(LIST_RE, '')}`);
    } else {
      if (list.length) {
        out.push({ kind: 'list', text: list.join('\n') });
        list = [];
      }
      para.push(line);
    }
  }
  flush();
  return out;
}

const KIND_OF = { heading: 'heading', subheading: 'subheading', muted: 'text', text: 'text', list: 'list', code: 'code' };
const GAP = 22;
const BEFORE_SUB = 22;

/** Height in board units (used for page growth, placement and the PNG export). */
export function statementHeight(text, w = STATEMENT_W) {
  const inner = w - PAD * 2;
  let h = PAD * 2 + 34; // header strip
  parseStatement(text).forEach((b, i) => {
    if (i) h += GAP + (b.kind === 'subheading' ? BEFORE_SUB : 0);
    h += layoutNote(KIND_OF[b.kind], b.text, inner).height;
  });
  return h;
}

/** Draws the statement into a 2D context at board coordinates (PNG export). */
export function drawStatement(ctx, { x, y, w, text }) {
  const inner = w - PAD * 2;
  const blocks = parseStatement(text);
  const h = statementHeight(text, w);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(x, y, w, 6);
  let cy = y + PAD + 34;
  blocks.forEach((b, i) => {
    if (i) cy += GAP + (b.kind === 'subheading' ? BEFORE_SUB : 0);
    const kind = KIND_OF[b.kind];
    const k = NOTE_KINDS[kind];
    const { lines, lineH, pad, height } = layoutNote(kind, b.text, inner, ctx);
    if (kind === 'code') {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(x + PAD, cy, inner, height);
    }
    ctx.fillStyle = b.kind === 'muted' ? '#6b7280' : '#111827';
    ctx.textBaseline = 'top';
    lines.forEach((l, j) => ctx.fillText(l, x + PAD + pad.x, cy + pad.y + j * lineH + (lineH - k.font) / 2));
    cy += height;
  });
}

function useYMap(ymap) {
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    ymap.observe(on);
    return () => ymap.unobserve(on);
  }, [ymap]);
}

function useYText(ytext) {
  const [text, setText] = useState(() => ytext.toString());
  useEffect(() => {
    const on = () => setText(ytext.toString());
    ytext.observe(on);
    on();
    return () => ytext.unobserve(on);
  }, [ytext]);
  return text;
}

function Block({ b, scale }) {
  const k = NOTE_KINDS[KIND_OF[b.kind]];
  const px = Math.max(8, k.font * scale);
  const base = { fontSize: px, lineHeight: k.line };
  if (b.kind === 'heading')
    return <div style={{ ...base, fontWeight: 700, letterSpacing: '-0.02em' }} className="text-gray-900 dark:text-white">{b.text}</div>;
  if (b.kind === 'subheading')
    return <div style={{ ...base, fontWeight: 650, marginTop: BEFORE_SUB * scale }} className="text-gray-900 dark:text-white">{b.text}</div>;
  if (b.kind === 'muted') return <div style={base} className="text-gray-500 dark:text-gray-400">{b.text}</div>;
  if (b.kind === 'code')
    return (
      <pre
        style={{ ...base, padding: `${px * 0.5}px ${px * 0.6}px`, borderRadius: 8 * scale + 2 }}
        className="font-mono whitespace-pre-wrap break-words bg-gray-50 dark:bg-white/[0.04] ring-1 ring-gray-200 dark:ring-white/10 text-gray-800 dark:text-gray-200"
      >
        {b.text}
      </pre>
    );
  return (
    <div style={base} className="whitespace-pre-wrap break-words text-gray-700 dark:text-gray-300">
      {b.text}
    </div>
  );
}

export default function StatementCard({ id, ymap, scale, isHost, onDelete }) {
  useYMap(ymap);
  const ytext = ymap.get('text');
  const text = useYText(ytext);
  const [drag, setDrag] = useState(null); // { x, y, w } while moving/resizing
  const [editing, setEditing] = useState(false);
  const [cardH, setCardH] = useState(0);
  const cardRef = useRef(null);
  const lastWrite = useRef(0);

  const x = drag?.x ?? ymap.get('x');
  const y = drag?.y ?? ymap.get('y');
  const w = drag?.w ?? (ymap.get('w') || STATEMENT_W);
  const blocks = parseStatement(text);

  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight));
    ro.observe(el);
    setCardH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!editing) return undefined;
    const esc = (e) => e.key === 'Escape' && setEditing(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [editing]);

  // Host-only move / resize, throttled writes to the shared doc.
  const startDrag = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const start = { px: e.clientX, py: e.clientY, x: ymap.get('x'), y: ymap.get('y'), w: ymap.get('w') || STATEMENT_W };
    let cur = start;
    const commit = (force) => {
      const now = Date.now();
      if (!force && now - lastWrite.current < WRITE_MS) return;
      lastWrite.current = now;
      ymap.doc.transact(() => {
        if (mode === 'move') {
          ymap.set('x', cur.x);
          ymap.set('y', cur.y);
        } else ymap.set('w', cur.w);
      });
    };
    const move = (ev) => {
      const dx = (ev.clientX - start.px) / scale;
      const dy = (ev.clientY - start.py) / scale;
      cur =
        mode === 'move'
          ? { ...start, x: Math.max(0, Math.round(start.x + dx)), y: Math.max(0, Math.round(start.y + dy)) }
          : { ...start, w: Math.min(MAX_W, Math.max(MIN_W, Math.round(start.w + dx))) };
      setDrag(cur);
      commit(false);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.userSelect = '';
      commit(true);
      setDrag(null);
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const box = { left: x * scale, top: y * scale, width: w * scale };
  const pad = PAD * scale;
  const btn =
    'inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10';

  return (
    <>
      {/* The card itself: under the canvas (z-0), never catches the pointer. */}
      <div
        ref={cardRef}
        className="absolute z-0 pointer-events-none select-none rounded-xl overflow-hidden bg-white dark:bg-[#0f1522] ring-1 ring-gray-200 dark:ring-white/10 shadow-[0_10px_40px_-18px_rgba(15,23,42,0.35)]"
        style={box}
        aria-label="Problem statement"
      >
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-indigo-400 to-pink-500" />
        <div style={{ padding: `${pad * 0.55}px ${pad}px ${pad}px` }}>
          <div className="flex items-center gap-1.5 text-gray-400" style={{ fontSize: Math.max(8, 22 * scale), marginBottom: 14 * scale }}>
            <FileText style={{ width: 24 * scale, height: 24 * scale }} />
            <span className="font-semibold uppercase tracking-[0.08em]">Problem statement</span>
            <span className="ml-auto inline-flex items-center gap-1">
              <Lock style={{ width: 20 * scale, height: 20 * scale }} /> Host only
            </span>
          </div>
          <div className="flex flex-col" style={{ gap: GAP * scale }}>
            {blocks.map((b, i) => (
              <Block key={i} b={b} scale={scale} />
            ))}
          </div>
        </div>
      </div>

      {/* Host controls sit above the canvas so they stay clickable. */}
      {isHost && !editing && (
        <>
          <div
            className="absolute z-[6] flex items-center gap-0.5 h-8 px-1 rounded-lg bg-white/95 dark:bg-[#1a2030]/95 backdrop-blur shadow-lg ring-1 ring-gray-200 dark:ring-white/10 opacity-60 hover:opacity-100 transition-opacity"
            style={{ left: box.left, top: Math.max(0, box.top - 38) }}
          >
            <button type="button" onPointerDown={startDrag('move')} className={`${btn} cursor-grab active:cursor-grabbing touch-none`} title="Drag to move">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-gray-200 dark:bg-white/10" />
            <button type="button" onClick={() => setEditing(true)} className={btn} title="Edit the statement">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              type="button"
              onClick={() => window.confirm('Remove the problem statement from the board?') && onDelete(id)}
              className={`${btn} hover:!text-rose-500`}
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            onPointerDown={startDrag('resize')}
            title="Drag to resize"
            className="absolute z-[6] w-2.5 h-10 -ml-1 rounded-full bg-indigo-500/70 hover:bg-indigo-500 cursor-ew-resize touch-none"
            style={{ left: box.left + box.width, top: box.top + Math.max(20, cardH / 2 - 20) }}
          />
        </>
      )}

      {/* Edit mode: raw markup, above everything, host only. */}
      {isHost && editing && (
        <div
          className="absolute z-[7] rounded-xl overflow-hidden bg-white dark:bg-[#0f1522] ring-2 ring-indigo-500 shadow-2xl flex flex-col"
          style={{ left: box.left, top: box.top, width: box.width, minHeight: cardH }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 h-9 px-3 border-b border-gray-200 dark:border-white/10 text-[11px] text-gray-500 dark:text-gray-400">
            <Pencil className="w-3.5 h-3.5" />
            <span className="font-semibold text-gray-700 dark:text-gray-200">Editing statement</span>
            <span className="hidden md:inline"># title · ## section · • list · ``` code</span>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="ml-auto inline-flex items-center gap-1 h-6 px-2 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-500"
            >
              <Check className="w-3 h-3" /> Done
            </button>
          </div>
          <SharedTextarea
            ytext={ytext}
            autoGrow
            autoFocus
            className="block w-full resize-none overflow-hidden bg-transparent outline-none px-4 py-3 font-mono text-[12.5px] leading-relaxed text-gray-800 dark:text-gray-200"
          />
        </div>
      )}
    </>
  );
}
