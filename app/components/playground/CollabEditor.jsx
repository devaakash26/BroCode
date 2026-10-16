'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';
import { bindMonaco, encodeSelection, decodePosition } from './monacoBinding';
import { LANGUAGES, colorFor } from './utils';

const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
    </div>
  ),
});

const TYPING_WINDOW = 2500;

// Editor themes that blend into the glass panels.
function defineThemes(monaco) {
  monaco.editor.defineTheme('brocode-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0b1020',
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#a5b4fc',
      'editorGutter.background': '#0b1020',
      'editor.selectionBackground': '#6366f155',
      'editorCursor.foreground': '#a5b4fc',
      'scrollbarSlider.background': '#ffffff14',
      'scrollbarSlider.hoverBackground': '#ffffff24',
    },
  });
  monaco.editor.defineTheme('brocode-light', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#6366f10a',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#cbd5e1',
      'editorLineNumber.activeForeground': '#6366f1',
      'editor.selectionBackground': '#6366f133',
      'editorCursor.foreground': '#4f46e5',
    },
  });
}

/** CSS for a remote caret + floating name tag. Built per peer at runtime. */
function caretCss(key, color, name) {
  const label = JSON.stringify((name || 'Anonymous').replace(/[\u0000-\u001f]/g, '').slice(0, 24));
  return `
.pg-sel-${key}{background:${color}33;}
.pg-caret-${key}{position:relative;border-left:2px solid ${color};margin-left:-1px;}
.pg-caret-${key}::after{content:${label};position:absolute;left:-2px;top:-1.35em;font:600 10px/1.4 ui-sans-serif,system-ui;color:#fff;background:${color};padding:0 4px;border-radius:3px 3px 3px 0;white-space:nowrap;pointer-events:none;z-index:10;}`;
}

export default function CollabEditor({ doc, language, socket, peers, myPeerId, onRun }) {
  const { resolvedTheme } = useTheme();
  const [editor, setEditor] = useState(null);
  const monacoRef = useRef(null);
  const cursorsRef = useRef(new Map()); // peerId → { name, userId, lang, anchor, head, at }
  const decorationsRef = useRef(null);
  const styleRef = useRef(null);
  const onRunRef = useRef(onRun);
  const [typing, setTyping] = useState([]);
  onRunRef.current = onRun;

  const monacoLang = LANGUAGES.find((l) => l.id === language)?.monaco || 'plaintext';
  const ytext = useMemo(() => doc.getText(`code:${language}`), [doc, language]);

  // Re-paint remote carets from the latest known relative positions.
  const renderCursors = useRef(() => {});
  renderCursors.current = () => {
    const model = editor?.getModel();
    if (!model || !decorationsRef.current) return;
    const decos = [];
    for (const [peerId, c] of cursorsRef.current) {
      if (c.lang !== language) continue;
      const a = decodePosition(doc, c.anchor);
      const h = decodePosition(doc, c.head);
      if (a == null || h == null) continue;
      const key = peerId.replace(/[^a-zA-Z0-9]/g, '');
      const start = model.getPositionAt(Math.min(a, h));
      const end = model.getPositionAt(Math.max(a, h));
      if (a !== h) {
        decos.push({
          range: { startLineNumber: start.lineNumber, startColumn: start.column, endLineNumber: end.lineNumber, endColumn: end.column },
          options: { className: `pg-sel-${key}` },
        });
      }
      const head = model.getPositionAt(h);
      decos.push({
        range: { startLineNumber: head.lineNumber, startColumn: head.column, endLineNumber: head.lineNumber, endColumn: head.column },
        options: { beforeContentClassName: `pg-caret-${key}`, stickiness: 1 },
      });
    }
    decorationsRef.current.set(decos);
  };

  // Bind the current language's Y.Text to the editor model.
  useEffect(() => {
    if (!editor) return;
    const model = editor.getModel();
    monacoRef.current?.editor.setModelLanguage(model, monacoLang);
    const unbind = bindMonaco(ytext, model, editor);
    const repaint = () => renderCursors.current();
    ytext.observe(repaint);
    repaint();
    return () => {
      unbind();
      ytext.unobserve(repaint);
    };
  }, [editor, ytext, monacoLang]);

  // Broadcast my selection (throttled).
  useEffect(() => {
    if (!editor || !socket) return;
    let timer = null;
    const send = () => {
      timer = null;
      const model = editor.getModel();
      const sel = editor.getSelection();
      if (!model || !sel || !socket.connected) return;
      socket.emit('pg:cursor', { lang: language, ...encodeSelection(ytext, model, sel) });
    };
    const schedule = () => {
      if (!timer) timer = setTimeout(send, 80);
    };
    const sub = editor.onDidChangeCursorSelection(schedule);
    // New peers need to see where we are.
    socket.on('pg:peerJoined', schedule);
    schedule();
    return () => {
      sub.dispose();
      socket.off('pg:peerJoined', schedule);
      clearTimeout(timer);
    };
  }, [editor, socket, ytext, language]);

  // Receive remote selections.
  useEffect(() => {
    if (!socket) return;
    const onCursor = (c) => {
      cursorsRef.current.set(c.peerId, { ...c, at: Date.now() });
      renderCursors.current();
    };
    socket.on('pg:cursor', onCursor);
    return () => socket.off('pg:cursor', onCursor);
  }, [socket]);

  // Drop carets of peers who left; regenerate per-peer caret CSS.
  useEffect(() => {
    const live = new Set(peers.map((p) => p.peerId));
    for (const id of cursorsRef.current.keys()) if (!live.has(id)) cursorsRef.current.delete(id);
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      document.head.appendChild(styleRef.current);
    }
    styleRef.current.textContent = peers
      .filter((p) => p.peerId !== myPeerId)
      .map((p) => caretCss(p.peerId.replace(/[^a-zA-Z0-9]/g, ''), colorFor(p.userId), p.name))
      .join('\n');
    renderCursors.current();
  }, [peers, myPeerId]);

  useEffect(() => () => styleRef.current?.remove(), []);

  // "Who's typing" strip — derived from recent cursor activity.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      const names = [...cursorsRef.current.values()]
        .filter((c) => c.lang === language && now - c.at < TYPING_WINDOW)
        .map((c) => ({ name: c.name, userId: c.userId }));
      setTyping((prev) =>
        prev.length === names.length && prev.every((p, i) => p.userId === names[i].userId) ? prev : names,
      );
    }, 500);
    return () => clearInterval(id);
  }, [language]);

  const handleMount = (ed, monaco) => {
    monacoRef.current = monaco;
    decorationsRef.current = ed.createDecorationsCollection();
    ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.());
    setEditor(ed);
  };

  return (
    <div className="relative h-full">
      <Editor
        height="100%"
        defaultLanguage={monacoLang}
        theme={resolvedTheme === 'light' ? 'brocode-light' : 'brocode-dark'}
        beforeMount={defineThemes}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: true,
          lineHeight: 22,
          tabSize: 4,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 18, bottom: 12 },
          renderLineHighlight: 'line',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
      {typing.length > 0 && (
        <div className="absolute bottom-2 right-3 flex items-center gap-1.5 pointer-events-none">
          {typing.slice(0, 3).map((t) => (
            <span
              key={t.userId}
              className="text-[11px] font-medium text-white px-2 py-0.5 rounded-full shadow-lg"
              style={{ background: colorFor(t.userId) }}
            >
              ✎ {t.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
