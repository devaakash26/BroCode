'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'problem-split';
const MIN = 28;
const MAX = 72;
const DEFAULT = 46;

/**
 * Statement on the left, editor on the right, with a draggable divider.
 * The width is remembered; double-click the divider to reset it.
 * Below lg the panes simply stack.
 */
export default function ProblemSplit({ left, right }) {
  const [pct, setPct] = useState(DEFAULT);
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    try {
      const v = parseFloat(localStorage.getItem(KEY));
      if (v >= MIN && v <= MAX) setPct(v);
    } catch {}
  }, []);

  const save = (v) => {
    try {
      localStorage.setItem(KEY, String(Math.round(v * 10) / 10));
    } catch {}
  };

  const startDrag = useCallback((e) => {
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    let last = null;
    const move = (ev) => {
      last = Math.min(MAX, Math.max(MIN, ((ev.clientX - rect.left) / rect.width) * 100));
      setPct(last);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragging(false);
      if (last != null) save(last);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    setDragging(true);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, []);

  const nudge = (e) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setPct((p) => {
        const v = Math.min(MAX, Math.max(MIN, p + (e.key === 'ArrowLeft' ? -step : step)));
        save(v);
        return v;
      });
    }
  };

  return (
    <div
      ref={ref}
      className="flex flex-col lg:flex-row gap-4 lg:gap-0 lg:h-[calc(100vh-8.5rem)]"
      style={{ '--split': `${pct}%` }}
    >
      <div className="min-w-0 lg:h-full lg:w-[var(--split)] lg:flex-shrink-0">{left}</div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={Math.round(pct)}
        aria-label="Resize panels"
        tabIndex={0}
        onPointerDown={startDrag}
        onDoubleClick={() => {
          setPct(DEFAULT);
          save(DEFAULT);
        }}
        onKeyDown={nudge}
        title="Drag to resize · double-click to reset"
        className="group hidden lg:flex w-3 flex-shrink-0 items-center justify-center cursor-col-resize outline-none"
      >
        <span
          className={`h-14 w-1 rounded-full transition-colors ${
            dragging ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-white/10 group-hover:bg-indigo-400 group-focus-visible:bg-indigo-400'
          }`}
        />
      </div>

      {/* While dragging, a cover stops Monaco from swallowing pointer events. */}
      <div className="relative min-w-0 flex-1 lg:h-full">
        {dragging && <div className="absolute inset-0 z-20" />}
        {right}
      </div>
    </div>
  );
}
