'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { Pencil, Eraser, Undo2, Trash2, Download, PenTool } from 'lucide-react';
import toast from 'react-hot-toast';
import { colorFor, PANEL, PANEL_HEADER, ICON_BTN } from './utils';

// Everyone draws on the same logical page; each client scales it to its pane
// width and scrolls vertically, like a notebook.
const BOARD_W = 1600;
const BOARD_H = 2400;
const MAX_CANVAS_PIXELS = 12_000_000; // cap backing-store size on huge/retina panes
const FLUSH_MS = 40;
const POINTER_MS = 50;
const POINTER_IDLE_MS = 3000;

// "Ink" is stored as near-black but painted light on the dark page.
const INK = '#111827';
const INK_DARK = '#e5e7eb';
const COLORS = [INK, '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
const SIZES = [2, 4, 8];
const ERASER_SIZE = 28;

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

export default function Whiteboard({ socket, snapshot, me, peers }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== 'light';
  const darkRef = useRef(dark);
  darkRef.current = dark;

  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const viewRef = useRef({ scale: 0.5, dpr: 1 });
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

  const withCtx = useCallback((fn) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { scale: s, dpr } = viewRef.current;
    ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
    fn(ctx);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    withCtx((c) => strokesRef.current.forEach((s) => drawStroke(c, s, darkRef.current)));
  }, [withCtx]);

  // Repaint when the theme flips (ink color changes).
  useEffect(() => redraw(), [dark, redraw]);

  // Fit the page width to the pane.
  useEffect(() => {
    const scroller = scrollRef.current;
    const canvas = canvasRef.current;
    const fit = () => {
      const width = scroller.clientWidth;
      if (!width) return;
      const s = width / BOARD_W;
      const cssH = BOARD_H * s;
      const dpr = Math.min(window.devicePixelRatio || 1, Math.sqrt(MAX_CANVAS_PIXELS / (width * cssH)));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(cssH * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${cssH}px`;
      viewRef.current = { scale: s, dpr };
      setScale(s);
      redraw();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(scroller);
    return () => ro.disconnect();
  }, [redraw]);

  // Load server snapshot on every (re)join.
  useEffect(() => {
    strokesRef.current = new Map(snapshot.strokes.map((s) => [s.id, s]));
    myStrokesRef.current = snapshot.strokes.filter((s) => s.userId === me.id).map((s) => s.id);
    redraw();
  }, [snapshot, me.id, redraw]);

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
  }, [socket, withCtx, redraw, me.name]);

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
    const rect = canvasRef.current.getBoundingClientRect();
    const s = viewRef.current.scale;
    return [Math.round(((e.clientX - rect.left) / s) * 10) / 10, Math.round(((e.clientY - rect.top) / s) * 10) / 10];
  };

  const sendPointer = (x, y, drawing) => {
    const now = Date.now();
    if (now - lastPointerSent.current < POINTER_MS || !socket?.connected) return;
    lastPointerSent.current = now;
    socket.emit('pg:pointer', { x, y, drawing });
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toBoard(e);
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
    if (pendingRef.current.length) socket?.emit('pg:draw', { t: 'pts', id: s.id, pts: pendingRef.current });
    pendingRef.current = [];
    socket?.emit('pg:draw', { t: 'end', stroke: s });
    myStrokesRef.current.push(s.id);
  };

  const undo = () => {
    const id = myStrokesRef.current.pop();
    if (!id) return;
    strokesRef.current.delete(id);
    redraw();
    socket?.emit('pg:draw', { t: 'undo', id });
  };

  const clear = () => {
    if (!strokesRef.current.size) return;
    if (!window.confirm('Clear the whole board for everyone?')) return;
    socket?.emit('pg:draw', { t: 'clear' });
  };

  const download = () => {
    // Strokes go on their own layer so the eraser can't punch through the paper.
    const layer = document.createElement('canvas');
    layer.width = BOARD_W;
    layer.height = BOARD_H;
    strokesRef.current.forEach((s) => drawStroke(layer.getContext('2d'), s, false));
    const out = document.createElement('canvas');
    out.width = BOARD_W;
    out.height = BOARD_H;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    ctx.drawImage(layer, 0, 0);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = 'playground-board.png';
    a.click();
  };

  // Ctrl/Cmd+Z on the board undoes my last stroke.
  const onKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
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
        <button className={toolBtn(tool === 'pen')} onClick={() => setTool('pen')} title="Pen">
          <Pencil className="w-4 h-4" />
        </button>
        <button className={toolBtn(tool === 'eraser')} onClick={() => setTool('eraser')} title="Eraser">
          <Eraser className="w-4 h-4" />
        </button>
        {divider}
        <div className="flex items-center gap-1.5 px-1">
          {COLORS.map((c) => {
            const active = color === c && tool === 'pen';
            return (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  setTool('pen');
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
          <button key={s} className={toolBtn(size === s && tool === 'pen')} onClick={() => { setSize(s); setTool('pen'); }} title={`Size ${s}`}>
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
      <div
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden outline-none [scrollbar-width:thin]"
      >
        <div
          className="relative bg-white dark:bg-[#0b1020]"
          style={{
            height: BOARD_H * scale,
            backgroundImage: dark
              ? 'radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px)'
              : 'radial-gradient(rgba(100,116,139,0.22) 1px, transparent 1px)',
            backgroundSize: `${28 * scale}px ${28 * scale}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
          {/* Live pens with names */}
          {Object.entries(pointers).map(([peerId, p]) => {
            const c = colorFor(p.userId);
            return (
              <div
                key={peerId}
                className="absolute pointer-events-none transition-[left,top] duration-75 ease-linear"
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
    </div>
  );
}
