'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Heading, Heading2, Type, List, Code2, StickyNote, Trash2 } from 'lucide-react';
import SharedTextarea from './SharedTextarea';
import { colorFor } from './utils';

// Sizes are in board units (the board is 1600 wide) and scale with the pane.
export const NOTE_KINDS = {
  heading: { icon: Heading, label: 'Heading', font: 56, weight: 650, line: 1.15 },
  subheading: { icon: Heading2, label: 'Subheading', font: 40, weight: 650, line: 1.25 },
  text: { icon: Type, label: 'Text', font: 34, weight: 400, line: 1.45 },
  list: { icon: List, label: 'List', font: 34, weight: 400, line: 1.5 },
  code: { icon: Code2, label: 'Code', font: 30, weight: 400, line: 1.5, mono: true },
  sticky: { icon: StickyNote, label: 'Sticky', font: 32, weight: 500, line: 1.4 },
};
export const noteFont = (k) => `${k.weight} ${k.font}px ${k.mono ? 'ui-monospace, Menlo, monospace' : 'system-ui, -apple-system, sans-serif'}`;
const boxed = (kind) => kind === 'sticky' || kind === 'code';
export const notePad = (kind) => {
  const k = NOTE_KINDS[kind];
  return boxed(kind) ? { x: k.font * 0.6, y: k.font * 0.5 } : { x: k.font * 0.2, y: k.font * 0.15 };
};

let measureCtx = null;
/**
 * Wraps a note's text the way the textarea will, in board units. Used to stack
 * imported notes without overlap and to draw notes into the PNG export.
 */
export function layoutNote(kind, text, w, ctx) {
  const k = NOTE_KINDS[kind] || NOTE_KINDS.text;
  const c = ctx || (measureCtx ||= document.createElement('canvas').getContext('2d'));
  c.font = noteFont(k);
  const pad = notePad(kind);
  const max = w - pad.x * 2;
  const lines = [];
  for (const para of String(text).split('\n')) {
    if (k.mono) {
      // Code doesn't wrap on words; break long lines by width.
      let line = '';
      for (const ch of para) {
        if (c.measureText(line + ch).width > max && line) {
          lines.push(line);
          line = ch;
        } else line += ch;
      }
      lines.push(line);
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (c.measureText(next).width > max && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  const lineH = k.font * k.line;
  return { lines, lineH, pad, height: lines.length * lineH + pad.y * 2 };
}

export const NOTE_MIN_W = 180;
export const NOTE_MAX_W = 1500;
const WRITE_MS = 50;
const BULLET = '• ';

function useYMap(ymap) {
  const [, bump] = useState(0);
  useEffect(() => {
    const on = () => bump((n) => n + 1);
    ymap.observe(on);
    return () => ymap.unobserve(on);
  }, [ymap]);
  return ymap;
}

/**
 * One text box on the scratchpad. Position, width and style live in a Y.Map,
 * the words in a Y.Text, so several people can type into the same box.
 */
export default function BoardNote({ id, ymap, scale, dark, ink, inkDark, selected, autoFocus, onSelect, onDelete, onDone }) {
  useYMap(ymap);
  const ytext = ymap.get('text');
  const kind = NOTE_KINDS[ymap.get('kind')] ? ymap.get('kind') : 'text';
  const k = NOTE_KINDS[kind];
  const [drag, setDrag] = useState(null); // local { x, y, w } while moving/resizing
  const lastWrite = useRef(0);
  const wrapRef = useRef(null);

  const x = drag?.x ?? ymap.get('x');
  const y = drag?.y ?? ymap.get('y');
  const w = drag?.w ?? ymap.get('w');
  const by = ymap.get('by') || '';
  const stored = ymap.get('color');
  const color = kind === 'sticky' ? '#1f2937' : stored === ink && dark ? inkDark : stored || (dark ? inkDark : ink);

  useEffect(() => {
    if (!autoFocus) return undefined;
    // Focus after the click that created the box has fully finished.
    const raf = requestAnimationFrame(() => {
      const ta = wrapRef.current?.querySelector('textarea');
      if (!ta) return;
      ta.focus({ preventScroll: true });
      if (kind === 'list' && !ta.value) {
        ytext.insert(0, BULLET);
        requestAnimationFrame(() => ta.setSelectionRange(BULLET.length, BULLET.length));
      }
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  // Shared pointer-drag for both moving and resizing.
  const startDrag = (mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(id);
    const start = { px: e.clientX, py: e.clientY, x: ymap.get('x'), y: ymap.get('y'), w: ymap.get('w') };
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
          ? { x: Math.max(0, Math.round(start.x + dx)), y: Math.max(0, Math.round(start.y + dy)), w: start.w }
          : { x: start.x, y: start.y, w: Math.min(NOTE_MAX_W, Math.max(NOTE_MIN_W, Math.round(start.w + dx))) };
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

  const setKind = (next) => {
    ymap.doc.transact(() => {
      ymap.set('kind', next);
      if (next === 'list' && !ytext.toString().startsWith(BULLET)) {
        // Turn every existing line into a bullet.
        const lines = ytext.toString().split('\n');
        ytext.delete(0, ytext.length);
        ytext.insert(0, lines.map((l) => BULLET + l).join('\n'));
      }
    });
  };

  // Lists: Enter starts a new bullet; Enter on an empty bullet ends the list.
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.currentTarget.blur();
      return;
    }
    if (kind !== 'list' || e.key !== 'Enter' || e.shiftKey) return;
    const ta = e.currentTarget;
    const pos = ta.selectionStart;
    const text = ytext.toString();
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    if (text.slice(lineStart, pos) === BULLET) {
      e.preventDefault();
      ytext.delete(lineStart, BULLET.length);
      return;
    }
    e.preventDefault();
    ytext.insert(pos, `\n${BULLET}`);
    requestAnimationFrame(() => ta.setSelectionRange(pos + 1 + BULLET.length, pos + 1 + BULLET.length));
  };

  const fontPx = Math.max(9, k.font * scale);
  const author = colorFor(by);
  const moving = !!drag;

  const surface =
    kind === 'sticky'
      ? 'bg-amber-200 dark:bg-amber-300 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]'
      : kind === 'code'
        ? 'bg-gray-50 dark:bg-white/[0.04] ring-1 ring-gray-200 dark:ring-white/10'
        : '';

  return (
    <motion.div
      ref={wrapRef}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: moving ? 1.01 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
      className="absolute group/note"
      style={{ left: x * scale, top: y * scale, width: w * scale, zIndex: selected ? 6 : 5 }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
    >
      {/* toolbar */}
      <div
        className={`absolute -top-9 left-0 flex items-center gap-0.5 h-8 px-1 rounded-lg bg-white dark:bg-[#1a2030] shadow-lg ring-1 ring-gray-200 dark:ring-white/10 transition-opacity ${
          selected ? 'opacity-100' : 'opacity-0 pointer-events-none group-hover/note:opacity-100 group-hover/note:pointer-events-auto'
        }`}
      >
        <button
          type="button"
          onPointerDown={startDrag('move')}
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing touch-none"
          title="Drag to move"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
        {Object.entries(NOTE_KINDS).map(([key, { icon: Icon, label }]) => (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setKind(key)}
            title={label}
            className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
              kind === key ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <span className="w-px h-4 bg-gray-200 dark:bg-white/10 mx-0.5" />
        <button
          type="button"
          onClick={() => onDelete(id)}
          title="Delete"
          className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-rose-500"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className={`relative rounded-md transition-shadow ${surface} ${selected ? 'ring-2' : 'ring-0 group-hover/note:ring-1'}`}
        style={{ '--tw-ring-color': selected ? author : `${author}66` }}
      >
        {/* Drag anywhere on the frame edge too, not only the grip. */}
        <div onPointerDown={startDrag('move')} className="absolute -inset-1.5 cursor-move rounded-lg touch-none" style={{ zIndex: -1 }} />
        <SharedTextarea
          ytext={ytext}
          autoGrow
          onKeyDown={onKeyDown}
          onFocus={() => onSelect(id)}
          onBlur={() =>
            setTimeout(() => {
              if (wrapRef.current?.contains(document.activeElement)) return;
              if (!ytext.toString().replace(/•/g, '').trim()) onDone(id);
            }, 200)
          }
          placeholder={kind === 'heading' || kind === 'subheading' ? 'Heading' : kind === 'code' ? '// code' : 'Type here…'}
          className={`block w-full resize-none overflow-hidden bg-transparent outline-none placeholder-gray-400/70 ${k.mono ? 'font-mono' : ''}`}
          style={{
            fontSize: fontPx,
            lineHeight: k.line,
            fontWeight: k.weight,
            letterSpacing: kind === 'heading' || kind === 'subheading' ? '-0.015em' : undefined,
            color,
            padding: kind === 'sticky' || kind === 'code' ? `${fontPx * 0.5}px ${fontPx * 0.6}px` : `${fontPx * 0.15}px ${fontPx * 0.2}px`,
          }}
        />
        {/* resize */}
        <div
          onPointerDown={startDrag('resize')}
          title="Drag to resize"
          className={`absolute top-1/2 -right-2 -translate-y-1/2 w-2 h-6 rounded-full cursor-ew-resize touch-none transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover/note:opacity-100'
          }`}
          style={{ background: author }}
        />
      </div>
    </motion.div>
  );
}
