'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Textarea bound to a Y.Text; keeps the caret steady on remote edits.
 * `autoGrow` sizes the box to its content (used by scratchpad notes).
 */
export default function SharedTextarea({ ytext, autoGrow = false, className = '', ...rest }) {
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

  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoGrow || !el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  });

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
      spellCheck={false}
      rows={1}
      className={className}
      {...rest}
    />
  );
}
