import * as Y from 'yjs';

/**
 * Two-way binding between a Y.Text and a Monaco model (a trimmed-down y-monaco
 * that reuses the Monaco instance @monaco-editor/react already loaded, instead
 * of bundling a second copy from npm).
 */
export function bindMonaco(ytext, model, editor) {
  const doc = ytext.doc;
  const binding = {}; // unique transaction origin for our own edits
  let muted = false; // true while we apply changes coming from the other side
  let savedSelections = null;

  model.setEOL(0); // LF — keeps offsets identical on every OS
  if (model.getValue() !== ytext.toString()) {
    muted = true;
    model.setValue(ytext.toString());
    muted = false;
  }

  // Remember the local selection as Yjs relative positions before a remote
  // transaction, so the caret stays put when someone types above it.
  const beforeTx = () => {
    if (muted) return;
    savedSelections = editor.getSelections()?.map((sel) => ({
      start: Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(sel.getStartPosition())),
      end: Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(sel.getEndPosition())),
    }));
  };
  doc.on('beforeAllTransactions', beforeTx);

  const onYText = (event, tx) => {
    if (tx.origin === binding) return;
    muted = true;
    try {
      let index = 0;
      for (const op of event.delta) {
        if (op.retain !== undefined) {
          index += op.retain;
        } else if (op.insert !== undefined) {
          const pos = model.getPositionAt(index);
          model.applyEdits([{ range: rangeAt(pos, pos), text: op.insert }]);
          index += op.insert.length;
        } else if (op.delete !== undefined) {
          const from = model.getPositionAt(index);
          const to = model.getPositionAt(index + op.delete);
          model.applyEdits([{ range: rangeAt(from, to), text: '' }]);
        }
      }
      if (savedSelections?.length) {
        const sels = savedSelections
          .map(({ start, end }) => {
            const a = Y.createAbsolutePositionFromRelativePosition(start, doc);
            const b = Y.createAbsolutePositionFromRelativePosition(end, doc);
            if (!a || !b) return null;
            const s = model.getPositionAt(a.index);
            const e = model.getPositionAt(b.index);
            return { selectionStartLineNumber: s.lineNumber, selectionStartColumn: s.column, positionLineNumber: e.lineNumber, positionColumn: e.column };
          })
          .filter(Boolean);
        if (sels.length) editor.setSelections(sels);
      }
    } finally {
      muted = false;
    }
  };
  ytext.observe(onYText);

  const sub = model.onDidChangeContent((e) => {
    if (muted) return;
    doc.transact(() => {
      // Apply from the end so earlier offsets stay valid.
      [...e.changes]
        .sort((a, b) => b.rangeOffset - a.rangeOffset)
        .forEach((c) => {
          if (c.rangeLength) ytext.delete(c.rangeOffset, c.rangeLength);
          if (c.text) ytext.insert(c.rangeOffset, c.text);
        });
    }, binding);
  });

  return () => {
    sub.dispose();
    ytext.unobserve(onYText);
    doc.off('beforeAllTransactions', beforeTx);
  };
}

function rangeAt(from, to) {
  return {
    startLineNumber: from.lineNumber,
    startColumn: from.column,
    endLineNumber: to.lineNumber,
    endColumn: to.column,
  };
}

/** Selection → JSON-able relative positions for broadcasting. */
export function encodeSelection(ytext, model, selection) {
  const anchor = model.getOffsetAt(selection.getStartPosition());
  const head = model.getOffsetAt(selection.getEndPosition());
  return {
    anchor: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(ytext, anchor)),
    head: Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(ytext, head)),
  };
}

/** Relative position JSON → absolute offset in the current doc (or null). */
export function decodePosition(doc, json) {
  if (!json) return null;
  try {
    const abs = Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(json), doc);
    return abs ? abs.index : null;
  } catch {
    return null;
  }
}
