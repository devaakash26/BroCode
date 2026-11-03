'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import * as Y from 'yjs';
import { Pencil, Eraser, Undo2, Trash2, Download, PenTool, MousePointer2, Type, Slash, MoveUpRight, Square } from 'lucide-react';
import BoardNote, { NOTE_KINDS, layoutNote } from './BoardNote';
import toast from 'react-hot-toast';
import { colorFor, PANEL, PANEL_HEADER, ICON_BTN } from './utils';

// Everyone draws on the same logical page; each client scales it to its pane
// width and scrolls vertically, like a notebook. The page never ends: it grows
// as you scroll toward the bottom. The canvas only covers the visible part and
// repaints as you scroll, so a long board costs no extra memory.
export const BOARD_W = 1600;
const BOARD_MIN_H = 2400;
const GROW_BY = 1600; // board units added each time you near the bottom
const GROW_MARGIN_PX = 600; // start growing this far (screen px) before the end
const MAX_EXPORT_H = 16000; // browsers refuse much taller canvases
const FLUSH_MS = 40;
const POINTER_MS = 50;
const POINTER_IDLE_MS = 3000;

// "Ink" is stored as near-black but painted light on the dark page.
const INK = '#111827';
const INK_DARK = '#e5e7eb';
const COLORS = [INK, '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
const SIZES = [2, 4, 8];
const ERASER_SIZE = 28;
const NOTE_W = 520;

// Keyboard shortcuts work whenever focus isn't in a text field.
const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select', key: 'v' },
  { id: 'pen', icon: Pencil, label: 'Pen', key: 'p' },
  { id: 'text', icon: Type, label: 'Text box', key: 't' },
  { id: 'line', icon: Slash, label: 'Line', key: 'l' },
  { id: 'arrow', icon: MoveUpRight, label: 'Arrow', key: 'a' },
  { id: 'rect', icon: Square, label: 'Box', key: 'r' },
  { id: 'eraser', icon: Eraser, label: 'Eraser', key: 'e' },
];
const SHAPES = new Set(['line', 'arrow', 'rect']);

/** Straight shapes are stored as ordinary polyline strokes. */
function shapePoints(kind, x0, y0, x1, y1) {
  if (kind === 'line') return [x0, y0, x1, y1];
  if (kind === 'rect') return [x0, y0, x1, y0, x1, y1, x0, y1, x0, y0];
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const len = Math.min(36, Math.hypot(x1 - x0, y1 - y0) * 0.4);
  const h = (a) => [x1 - len * Math.cos(ang - a), y1 - len * Math.sin(ang - a)];
  return [x0, y0, x1, y1, ...h(0.45), x1, y1, ...h(-0.45)].map((n) => Math.round(n * 10) / 10);
}

const isTyping = (el) => el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.isContentEditable);

function strokeStyle(ctx, s, dark) {
  const color = dark && s.color === INK ? INK_DARK : s.color;
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

/** Draws points [from, end) of a stroke; from = 0 draws the whole stroke. */
function drawStroke(ctx, s, dark, from = 0) {
  const p = s.pts;
  if (p.length < 2) return;
  strokeStyle(ctx, s, dark);
  if (p.length === 2) {
    ctx.beginPath();
    ctx.arc(p[0], p[1], s.size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const start = Math.max(0, from - 2);
  ctx.beginPath();
  ctx.moveTo(p[start], p[start + 1]);
  for (let i = start + 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
  ctx.stroke();
}

// Cached vertical extent of a stroke (recomputed when it gains points).
const bands = new WeakMap();
function bandOf(st) {
  const cached = bands.get(st);
  if (cached && cached.n === st.pts.length) return cached;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 1; i < st.pts.length; i += 2) {
    if (st.pts[i] < min) min = st.pts[i];
    if (st.pts[i] > max) max = st.pts[i];
  }
  const pad = (st.size || 4) / 2;
  const b = { n: st.pts.length, min: min - pad, max: max + pad };
  bands.set(st, b);
  return b;
}

export default function Whiteboard({ socket, snapshot, me, peers, doc, apiRef }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== 'light';
  const darkRef = useRef(dark);
  darkRef.current = dark;

  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const pageRef = useRef(null);
  const viewRef = useRef({ scale: 0.5, dpr: 1, top: 0, height: 0 }); // top/height in screen px
  const bottomRef = useRef(0); // lowest drawn point, board units
  const [pageH, setPageH] = useState(BOARD_MIN_H);
  const [scrolledFar, setScrolledFar] = useState(false);
  const strokesRef = useRef(new Map()); // id → stroke (insertion order = paint order)
  const myStrokesRef = useRef([]); // my committed stroke ids, for undo
  const activeRef = useRef(null); // stroke being drawn locally
  const pendingRef = useRef([]); // points not yet sent
  const lastPointerSent = useRef(0);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(INK);
  const [size, setSize] = useState(SIZES[1]);
  const [pointers, setPointers] = useState({}); // peerId → { x, y, name, userId, at }
  const [scale, setScale] = useState(viewRef.current.scale); // mirrors viewRef for the DOM overlays
  const shapeRef = useRef(null); // { kind, x0, y0 } while dragging a shape

  // Text boxes live in the shared Yjs doc (id → Y.Map).
  const notes = useMemo(() => doc.getMap('notes'), [doc]);
  const [noteIds, setNoteIds] = useState(() => [...notes.keys()]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [focusNote, setFocusNote] = useState(null);
  useEffect(() => {
    const sync = () => setNoteIds([...notes.keys()]);
    notes.observe(sync);
    sync();
    return () => notes.unobserve(sync);
  }, [notes]);

  const withCtx = useCallback((fn) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { scale: s, dpr, top } = viewRef.current;
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, -top * dpr);
    fn(ctx);
  }, []);

  // Keep the page at least one screen taller than the lowest content.
  const noteContent = useCallback((y) => {
    if (y <= bottomRef.current) return;
    bottomRef.current = y;
    setPageH((h) => Math.max(h, Math.ceil((y + GROW_BY) / 400) * 400));
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { scale: sc, top, height } = viewRef.current;
    const from = top / sc - 60;
    const to = (top + height) / sc + 60;
    // Only paint strokes that cross the visible band.
    withCtx((c) =>
      strokesRef.current.forEach((st) => {
        const b = bandOf(st);
        if (b.max >= from && b.min <= to) drawStroke(c, st, darkRef.current);
      }),
    );
  }, [withCtx]);

  // Repaint when the theme flips (ink color changes).
  useEffect(() => redraw(), [dark, redraw]);

  // Fit the page width to the pane; the canvas is exactly one screen tall.
  useEffect(() => {
    const scroller = scrollRef.current;
    const canvas = canvasRef.current;
    const fit = () => {
      const width = scroller.clientWidth;
      const height = scroller.clientHeight;
      if (!width || !height) return;
      const s = width / BOARD_W;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.style.marginBottom = `${-height}px`;
      viewRef.current = { scale: s, dpr, top: scroller.scrollTop, height };
      setScale(s);
      redraw();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [redraw]);

  // Repaint while scrolling and grow the page as you approach its end.
  useEffect(() => {
    const scroller = scrollRef.current;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const { scrollTop, scrollHeight, clientHeight } = scroller;
        viewRef.current.top = scrollTop;
        redraw();
        setScrolledFar(scrollTop > clientHeight * 1.5);
        if (scrollTop + clientHeight > scrollHeight - GROW_MARGIN_PX) setPageH((h) => h + GROW_BY);
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [redraw]);

  // Load server snapshot on every (re)join.
  useEffect(() => {
    strokesRef.current = new Map(snapshot.strokes.map((s) => [s.id, s]));
    myStrokesRef.current = snapshot.strokes.filter((s) => s.userId === me.id).map((s) => s.id);
    snapshot.strokes.forEach((st) => noteContent(bandOf(st).max));
    redraw();
  }, [snapshot, me.id, redraw, noteContent]);

  // Text boxes push the page down too.
  const noteBottom = useCallback((m) => {
    const kind = NOTE_KINDS[m.get('kind')] ? m.get('kind') : 'text';
    return (m.get('y') || 0) + layoutNote(kind, m.get('text')?.toString() || '', m.get('w') || NOTE_W).height;
  }, []);
  useEffect(() => {
    noteIds.forEach((id) => {
      const m = notes.get(id);
      if (m) noteContent(noteBottom(m));
    });
  }, [noteIds, notes, noteContent, noteBottom]);

  // Lets the room place content (e.g. an imported problem) below what's here.
  useEffect(() => {
    if (!apiRef) return undefined;
    apiRef.current = {
      contentBottom: () => {
        let b = 0;
        strokesRef.current.forEach((st) => (b = Math.max(b, bandOf(st).max)));
        notes.forEach((m) => (b = Math.max(b, noteBottom(m))));
        return b;
      },
      scrollToBoardY: (y) => {
        const sc = viewRef.current.scale;
        noteContent(y + 200);
        // Give React a moment to commit the taller page before scrolling.
        setTimeout(() => scrollRef.current?.scrollTo({ top: Math.max(0, y * sc - 24), behavior: 'smooth' }), 80);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, notes, noteBottom, noteContent]);

  // Remote drawing ops.
  useEffect(() => {
    if (!socket) return;
    const onDraw = (op) => {
      const strokes = strokesRef.current;
      switch (op.t) {
        case 'begin': {
          const s = { id: op.id, tool: op.tool, color: op.color, size: op.size, pts: op.pts, userId: op.userId };
          strokes.set(s.id, s);
          withCtx((c) => drawStroke(c, s, darkRef.current));
          break;
        }
        case 'pts': {
          const s = strokes.get(op.id);
          if (!s) break;
          const from = s.pts.length;
          s.pts = s.pts.concat(op.pts);
          withCtx((c) => drawStroke(c, s, darkRef.current, from));
          break;
        }
        case 'end': {
          const prev = strokes.get(op.stroke.id);
          strokes.set(op.stroke.id, op.stroke);
          noteContent(bandOf(op.stroke).max);
          if (!prev || prev.pts.length !== op.stroke.pts.length) redraw();
          break;
        }
        case 'undo':
          if (strokes.delete(op.id)) redraw();
          myStrokesRef.current = myStrokesRef.current.filter((id) => id !== op.id);
          break;
        case 'clear':
          strokes.clear();
          myStrokesRef.current = [];
          redraw();
          if (op.by && op.by !== me.name) toast(`${op.by} cleared the board`, { icon: '🧽' });
          break;
      }
    };
    const onPointer = (p) =>
      setPointers((prev) => ({ ...prev, [p.peerId]: { ...p, at: Date.now() } }));
    socket.on('pg:draw', onDraw);
    socket.on('pg:pointer', onPointer);
    return () => {
      socket.off('pg:draw', onDraw);
      socket.off('pg:pointer', onPointer);
    };
  }, [socket, withCtx, redraw, me.name, noteContent]);

  // Fade out idle / departed pointers.
  useEffect(() => {
    const id = setInterval(() => {
      const live = new Set(peers.map((p) => p.peerId));
      setPointers((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(prev).filter(([k, p]) => live.has(k) && now - p.at < POINTER_IDLE_MS),
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [peers]);

  // Flush buffered points at a steady rate while drawing.
  useEffect(() => {
    const id = setInterval(() => {
      const s = activeRef.current;
      if (!s || !pendingRef.current.length || !socket?.connected) return;
      socket.emit('pg:draw', { t: 'pts', id: s.id, pts: pendingRef.current });
      pendingRef.current = [];
    }, FLUSH_MS);
    return () => clearInterval(id);
  }, [socket]);

  const toBoard = (e) => {
    // The page div scrolls with the content; the canvas stays pinned.
    const rect = pageRef.current.getBoundingClientRect();
    const s = viewRef.current.scale;
    return [Math.round(((e.clientX - rect.left) / s) * 10) / 10, Math.round(((e.clientY - rect.top) / s) * 10) / 10];
  };

  const sendPointer = (x, y, drawing) => {
    const now = Date.now();
    if (now - lastPointerSent.current < POINTER_MS || !socket?.connected) return;
    lastPointerSent.current = now;
    socket.emit('pg:pointer', { x, y, drawing });
  };

  const addNote = (x, y) => {
    const id = `${me.id.slice(-6)}-${Date.now().toString(36)}`;
    const m = new Y.Map();
    m.set('x', Math.round(x));
    m.set('y', Math.round(y));
    m.set('w', NOTE_W);
    m.set('kind', 'text');
    m.set('color', color);
    m.set('by', me.id);
    m.set('text', new Y.Text());
    notes.set(id, m);
    setSelectedNote(id);
    setFocusNote(id);
    setTool('select');
  };

  const deleteNote = useCallback(
    (id) => {
      notes.delete(id);
      setSelectedNote((cur) => (cur === id ? null : cur));
    },
    [notes],
  );

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setSelectedNote(null);
    setFocusNote(null);
    if (isTyping(document.activeElement)) document.activeElement.blur();
    scrollRef.current?.focus({ preventScroll: true });
    const [x, y] = toBoard(e);
    if (tool === 'select') return;
    if (tool === 'text') {
      // Stop the browser's mousedown from moving focus back to the board,
      // which would blur (and auto-remove) the empty box we just made.
      e.preventDefault();
      return addNote(x, y);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (SHAPES.has(tool)) {
      shapeRef.current = { kind: tool, x0: x, y0: y };
      const s = {
        id: `${me.id.slice(-6)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        tool: 'pen',
        color,
        size,
        pts: shapePoints(tool, x, y, x, y),
        userId: me.id,
      };
      activeRef.current = s;
      strokesRef.current.set(s.id, s);
      return;
    }
    const s = {
      id: `${me.id.slice(-6)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      tool,
      color,
      size: tool === 'eraser' ? ERASER_SIZE : size,
      pts: [x, y],
      userId: me.id,
    };
    activeRef.current = s;
    pendingRef.current = [];
    strokesRef.current.set(s.id, s);
    withCtx((c) => drawStroke(c, s, darkRef.current));
    socket?.emit('pg:draw', { t: 'begin', id: s.id, tool: s.tool, color: s.color, size: s.size, pts: s.pts });
  };

  const onPointerMove = (e) => {
    const [x, y] = toBoard(e);
    const s = activeRef.current;
    sendPointer(x, y, !!s);
    if (!s) return;
    if (shapeRef.current) {
      const { kind, x0, y0 } = shapeRef.current;
      s.pts = shapePoints(kind, x0, y0, x, y);
      redraw();
      return;
    }
    const n = s.pts.length;
    if (Math.hypot(x - s.pts[n - 2], y - s.pts[n - 1]) < 1.5) return;
    s.pts.push(x, y);
    pendingRef.current.push(x, y);
    withCtx((c) => drawStroke(c, s, darkRef.current, n));
  };

  const onPointerUp = () => {
    const s = activeRef.current;
    if (!s) return;
    activeRef.current = null;
    if (shapeRef.current) {
      const { x0, y0 } = shapeRef.current;
      shapeRef.current = null;
      const [x1, y1] = [s.pts[2], s.pts[3]];
      const far = Math.max(...s.pts.map((v, i) => (i % 2 ? Math.abs(v - y0) : Math.abs(v - x0))));
      if (far < 6 && Math.hypot(x1 - x0, y1 - y0) < 6) {
        strokesRef.current.delete(s.id); // just a click
        redraw();
        return;
      }
      socket?.emit('pg:draw', { t: 'end', stroke: s });
      myStrokesRef.current.push(s.id);
      noteContent(bandOf(s).max);
      return;
    }
    if (pendingRef.current.length) socket?.emit('pg:draw', { t: 'pts', id: s.id, pts: pendingRef.current });
    pendingRef.current = [];
    socket?.emit('pg:draw', { t: 'end', stroke: s });
    myStrokesRef.current.push(s.id);
    noteContent(bandOf(s).max);
  };

  const undo = () => {
    const id = myStrokesRef.current.pop();
    if (!id) return;
    strokesRef.current.delete(id);
    redraw();
    socket?.emit('pg:draw', { t: 'undo', id });
  };

  const clear = () => {
    if (!strokesRef.current.size && !notes.size) return;
    if (!window.confirm('Clear the whole board (drawings and text) for everyone?')) return;
    socket?.emit('pg:draw', { t: 'clear' });
    doc.transact(() => [...notes.keys()].forEach((k) => notes.delete(k)));
    setSelectedNote(null);
  };

  const download = () => {
    // Export everything down to the lowest drawing or text box.
    let bottom = 0;
    strokesRef.current.forEach((st) => (bottom = Math.max(bottom, bandOf(st).max)));
    notes.forEach((m) => (bottom = Math.max(bottom, noteBottom(m))));
    const H = Math.min(MAX_EXPORT_H, Math.max(800, Math.ceil(bottom + 80)));
    // Strokes go on their own layer so the eraser can't punch through the paper.
    const layer = document.createElement('canvas');
    layer.width = BOARD_W;
    layer.height = H;
    strokesRef.current.forEach((st) => drawStroke(layer.getContext('2d'), st, false));
    const out = document.createElement('canvas');
    out.width = BOARD_W;
    out.height = H;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, BOARD_W, H);
    ctx.drawImage(layer, 0, 0);
    // Text boxes, wrapped exactly like on screen.
    notes.forEach((m) => {
      const kind = NOTE_KINDS[m.get('kind')] ? m.get('kind') : 'text';
      const k = NOTE_KINDS[kind];
      const x = m.get('x');
      const y = m.get('y');
      const w = m.get('w');
      const { lines, lineH, pad, height } = layoutNote(kind, m.get('text').toString(), w, ctx);
      if (kind === 'sticky' || kind === 'code') {
        ctx.fillStyle = kind === 'sticky' ? '#fde68a' : '#f3f4f6';
        ctx.fillRect(x, y, w, height);
      }
      ctx.fillStyle = kind === 'sticky' ? '#1f2937' : m.get('color') || INK;
      ctx.textBaseline = 'top';
      lines.forEach((l, i) => ctx.fillText(l, x + pad.x, y + pad.y + i * lineH + (lineH - k.font) / 2));
    });
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = 'playground-board.png';
    a.click();
  };

  // Ctrl/Cmd+Z on the board undoes my last stroke.
  const onKeyDown = (e) => {
    if (isTyping(e.target)) return; // typing in a text box
    const key = e.key.toLowerCase();
    if ((key === 'delete' || key === 'backspace') && selectedNote) {
      e.preventDefault();
      deleteNote(selectedNote);
      return;
    }
    if (!e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = TOOLS.find((x) => x.key === key);
      if (t) {
        e.preventDefault();
        setTool(t.id);
        return;
      }
    }
    if ((e.metaKey || e.ctrlKey) && key === 'z') {
      e.preventDefault();
      undo();
    }
  };

  const toolBtn = (active) =>
    `${ICON_BTN} ${active ? '!bg-gray-100 dark:!bg-white/10 !text-gray-900 dark:!text-white' : ''}`;
  const divider = <span className="w-px h-5 mx-1 bg-gray-200 dark:bg-white/10 flex-shrink-0" />;

  return (
    <div className={`${PANEL} flex flex-col h-full min-h-0`}>
      <div className={`${PANEL_HEADER} overflow-x-auto`}>
        <PenTool className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="hidden xl:inline text-sm font-semibold text-gray-800 dark:text-gray-100 mr-1">Scratchpad</span>
        {divider}
        {TOOLS.map(({ id, icon: Icon, label, key }) => (
          <button key={id} className={toolBtn(tool === id)} onClick={() => setTool(id)} title={`${label} (${key.toUpperCase()})`}>
            <Icon className="w-4 h-4" />
          </button>
        ))}
        {divider}
        <div className="flex items-center gap-1.5 px-1">
          {COLORS.map((c) => {
            const active = color === c && tool !== 'eraser';
            return (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser' || tool === 'select') setTool('pen');
                  if (selectedNote) notes.get(selectedNote)?.set('color', c);
                }}
                title={c === INK ? 'Ink' : c}
                className={`w-5 h-5 rounded-full flex-shrink-0 ring-offset-2 ring-offset-white dark:ring-offset-[#11151f] ${
                  active ? 'ring-2 ring-gray-400 dark:ring-gray-500' : 'ring-1 ring-black/10 dark:ring-white/15'
                }`}
                style={{ background: c === INK && dark ? INK_DARK : c }}
              />
            );
          })}
        </div>
        {divider}
        {SIZES.map((s) => (
          <button key={s} className={toolBtn(size === s && tool !== 'eraser')} onClick={() => { setSize(s); if (!SHAPES.has(tool)) setTool('pen'); }} title={`Size ${s}`}>
            <span className="rounded-full bg-current" style={{ width: s + 2, height: s + 2 }} />
          </button>
        ))}
        <div className="flex-1" />
        <button className={ICON_BTN} onClick={undo} title="Undo my last stroke (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </button>
        <button className={`${ICON_BTN} hover:!text-rose-500`} onClick={clear} title="Clear board">
          <Trash2 className="w-4 h-4" />
        </button>
        <button className={ICON_BTN} onClick={download} title="Download as PNG">
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Page */}
      <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="absolute inset-0 overflow-y-auto overflow-x-hidden outline-none [scrollbar-width:thin]"
      >
        <div
          ref={pageRef}
          className="relative bg-white dark:bg-[#0b1020]"
          style={{
            height: pageH * scale,
            backgroundImage: dark
              ? 'radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px)'
              : 'radial-gradient(rgba(100,116,139,0.22) 1px, transparent 1px)',
            backgroundSize: `${28 * scale}px ${28 * scale}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            className="sticky top-0 block touch-none"
            style={{ cursor: tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {noteIds.map((id) => {
            const m = notes.get(id);
            if (!m || !(m.get('text') instanceof Y.Text)) return null;
            return (
              <BoardNote
                key={id}
                id={id}
                ymap={m}
                scale={scale}
                dark={dark}
                ink={INK}
                inkDark={INK_DARK}
                selected={selectedNote === id}
                autoFocus={focusNote === id}
                onSelect={setSelectedNote}
                onDelete={deleteNote}
                onDone={deleteNote}
              />
            );
          })}
          {tool === 'text' && noteIds.length === 0 && (
            <div className="absolute left-1/2 top-6 -translate-x-1/2 pointer-events-none px-3 py-1.5 rounded-full bg-gray-900/80 dark:bg-white/10 text-[11px] text-white">
              Click anywhere to add a text box
            </div>
          )}
          {/* Live pens with names */}
          {Object.entries(pointers).map(([peerId, p]) => {
            const c = colorFor(p.userId);
            return (
              <div
                key={peerId}
                className="absolute z-10 pointer-events-none transition-[left,top] duration-75 ease-linear"
                style={{ left: p.x * scale, top: p.y * scale }}
              >
                <Pencil className="w-4 h-4 -translate-y-full" style={{ color: c }} fill={p.drawing ? c : 'none'} />
                <span
                  className="absolute left-3 top-0 whitespace-nowrap text-[10px] font-medium text-white px-1.5 py-0.5 rounded"
                  style={{ background: c }}
                >
                  {p.name}
                  {p.drawing ? ' is drawing…' : ''}
                </span>
              </div>
            );
          })}
        </div>
      </div>
        {scrolledFar && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute bottom-3 right-4 z-20 h-8 px-3 rounded-full text-xs font-medium bg-gray-900/85 text-white dark:bg-white/15 backdrop-blur hover:bg-gray-900 dark:hover:bg-white/25 shadow-lg transition-colors"
          >
            Back to top
          </button>
        )}
      </div>
    </div>
  );
}
