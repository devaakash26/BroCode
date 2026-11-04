/**
 * Turns a problem statement into scratchpad text boxes.
 *
 * Statements in the database are a mix of HTML ("<p><strong>Constraints:</strong>")
 * and markdown ("**Example 1:**", fenced code). Both are flattened into blocks:
 *   { kind: 'heading' | 'subheading' | 'text' | 'list' | 'code', text }
 * which are then stacked top-to-bottom as notes.
 */

const BLOCK_TAGS = new Set(['p', 'div', 'section', 'article', 'blockquote', 'table', 'tr', 'hr']);
const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

// Works with the browser DOM and with htmlparser2's tree (used in tests).
const tagOf = (n) => (n.tagName || n.name || '').toLowerCase();
// Browser NodeLists have no .map/.filter, so always hand back a real array.
const kidsOf = (n) => Array.from(n.childNodes || n.children || []);
const isText = (n) => n.nodeType === 3 || n.type === 'text';
const textOf = (n) => (isText(n) ? n.nodeValue ?? n.data ?? '' : kidsOf(n).map(textOf).join(''));

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Markdown emphasis/code marks → plain text. */
const stripMarks = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1');

const LIST_LINE = /^\s*(?:[-*•]\s+|\d+[.)]\s+)/;
// <br> becomes this marker so a hard line break survives paragraph joining
// (plain newlines inside HTML text are just soft wraps).
const BR = '\uE000';
const isLabel = (line) => line.length <= 48 && /:\s*$/.test(line) && !LIST_LINE.test(line);

/** Plain text paragraphs → text / list / subheading blocks. */
function textBlocks(raw, out) {
  const lines = stripMarks(raw.replace(/ /g, ' ')).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim());
  let para = [];
  let list = [];
  const flushPara = () => {
    if (para.length) out.push({ kind: 'text', text: para.join(' ') });
    para = [];
  };
  const flushList = () => {
    // Numbered items keep their numbers; everything else gets a bullet.
    if (list.length) out.push({ kind: 'list', text: list.map((l) => (/^\d+[.)]\s/.test(l) ? l : `• ${l}`)).join('\n') });
    list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.split(BR).join('').trim()) {
      flushPara();
      flushList();
    } else if (LIST_LINE.test(line)) {
      flushPara();
      const numbered = /^\s*\d+[.)]\s+/.test(line);
      list.push(numbered ? line.trim() : line.replace(LIST_LINE, ''));
    } else if (isLabel(line)) {
      flushPara();
      flushList();
      out.push({ kind: 'subheading', text: line.replace(/:\s*$/, '') });
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  for (const b of out) if (b.kind === 'text') b.text = b.text.replace(new RegExp(`\\s*${BR}+\\s*`, 'g'), '\n').trim();
}

function isBoldOnly(p) {
  const kids = kidsOf(p).filter((k) => !(isText(k) && !textOf(k).trim()));
  return kids.length === 1 && ['strong', 'b'].includes(tagOf(kids[0])) && textOf(kids[0]).trim().length <= 48;
}

function walk(node, ctx) {
  for (const n of kidsOf(node)) {
    if (isText(n)) {
      ctx.buf += textOf(n);
      continue;
    }
    const tag = tagOf(n);
    if (!tag || tag === 'script' || tag === 'style') continue;
    if (tag === 'br') {
      ctx.buf += BR;
    } else if (tag === 'pre') {
      ctx.flush();
      const code = textOf(n).replace(/^\n+|\s+$/g, '');
      if (code) ctx.out.push({ kind: 'code', text: code });
    } else if (HEADING_TAGS.has(tag)) {
      ctx.flush();
      const t = stripMarks(textOf(n)).trim().replace(/:\s*$/, '');
      if (t) ctx.out.push({ kind: 'subheading', text: t });
    } else if (tag === 'ul' || tag === 'ol') {
      ctx.flush();
      let i = 1;
      const items = kidsOf(n)
        .filter((c) => tagOf(c) === 'li')
        .map((li) => stripMarks(textOf(li)).replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .map((t) => (tag === 'ol' ? `${i++}. ${t}` : `• ${t}`));
      if (items.length) ctx.out.push({ kind: 'list', text: items.join('\n') });
    } else if (tag === 'p' && isBoldOnly(n)) {
      // "<p><strong>Constraints</strong></p>" reads as a section heading.
      ctx.flush();
      const t = stripMarks(textOf(n)).trim().replace(/:\s*$/, '');
      if (t) ctx.out.push({ kind: 'subheading', text: t });
    } else if (BLOCK_TAGS.has(tag) || tag === 'li') {
      ctx.buf += '\n\n';
      walk(n, ctx);
      ctx.buf += '\n\n';
    } else {
      walk(n, ctx); // inline: strong, em, code, span, a…
    }
  }
}

/** HTML or markdown statement → blocks. `parse(html)` returns a root node. */
export function descriptionBlocks(description, parse) {
  if (!description) return [];
  // Fenced markdown code → <pre>, so both formats share one walker.
  const html = String(description).replace(/```[\w+-]*\n?([\s\S]*?)```/g, (_, code) => `\n<pre>${escapeHtml(code)}</pre>\n`);
  const root = parse(html);
  const out = [];
  const ctx = {
    buf: '',
    out,
    flush() {
      if (this.buf.trim()) textBlocks(this.buf, out);
      this.buf = '';
    },
  };
  walk(root, ctx);
  ctx.flush();

  // Merge neighbouring paragraphs so the board isn't a stack of tiny boxes.
  const merged = [];
  for (const b of out) {
    const prev = merged[merged.length - 1];
    if (prev && prev.kind === b.kind && (b.kind === 'text' || b.kind === 'list')) {
      prev.text += b.kind === 'text' ? `\n\n${b.text}` : `\n${b.text}`;
    } else merged.push({ ...b });
  }
  return merged;
}

const DIFFICULTY = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

/** Full statement: title, meta line, body, constraints and samples. */
export function statementBlocks(problem, parse) {
  const blocks = [{ kind: 'heading', text: problem.title }];
  const meta = [DIFFICULTY[problem.difficulty] || problem.difficulty, ...(problem.tags || []).slice(0, 5)].filter(Boolean);
  if (meta.length) blocks.push({ kind: 'text', text: meta.join(' · '), muted: true });

  const body = descriptionBlocks(problem.description, parse);
  blocks.push(...body);
  const bodyText = body.map((b) => b.text).join('\n').toLowerCase();

  const constraints = (problem.constraints || '')
    .split('\n')
    .map((l) => stripMarks(l).replace(LIST_LINE, '').trim())
    .filter(Boolean);
  if (constraints.length && !bodyText.includes('constraint')) {
    blocks.push({ kind: 'subheading', text: 'Constraints' });
    blocks.push({ kind: 'list', text: constraints.map((c) => `• ${c}`).join('\n') });
  }

  const samples = problem.samples || [];
  if (samples.length && !/example\s*\d|example:/.test(bodyText)) {
    samples.slice(0, 3).forEach((s, i) => {
      blocks.push({ kind: 'subheading', text: `Example ${i + 1}` });
      let text = `Input:\n${s.input.trimEnd()}\n\nOutput:\n${String(s.expectedOutput || '').trimEnd()}`;
      if (s.explanation) text += `\n\nExplanation: ${s.explanation.trim()}`;
      blocks.push({ kind: 'code', text });
    });
  }
  return blocks;
}

const GAP = { heading: 10, subheading: 8, text: 26, list: 26, code: 30, sticky: 26 };
const BEFORE = { subheading: 34 };

/**
 * Stacks blocks as notes starting at (x, y). `measure(kind, text, w)` returns
 * the rendered height in board units. Returns the notes and the bottom edge.
 */
export function layoutStatement(blocks, { x = 60, y = 60, w = 1480, measure }) {
  let cy = y;
  const notes = blocks.map((b, i) => {
    if (i > 0) cy += BEFORE[b.kind] || 0;
    const note = { ...b, x, y: Math.round(cy), w };
    cy += measure(b.kind, b.text, w) + (GAP[b.kind] ?? 24);
    return note;
  });
  return { notes, bottom: cy };
}

/** Starter code per language, falling back to the room's default where missing. */
export function starterCode(problem) {
  const out = {};
  const t = problem.templateCode || {};
  for (const [lang, code] of Object.entries(t)) if (typeof code === 'string' && code.trim()) out[lang] = code;
  return out;
}
