/**
 * Finding a scored passage inside the text of a live page.
 *
 * The checker scores sections of the text the extension captured. The page the
 * reader is looking at is the same page, but its text lives in many nodes, is
 * broken by inline elements, and carries whitespace the capture collapsed. This
 * module does the arithmetic and nothing else: it knows about an ordered list
 * of strings, never about the DOM. `highlight-dom.mjs` turns the answer into
 * wrapped ranges, and both are exercised without a browser.
 *
 * Nothing here rewrites, normalises or reflows the page's own text. The index
 * is a read-only projection.
 */

/** Whitespace, including the zero-width characters a page may carry. */
const SPACE = /[\s\u200b\u200c\u200d\ufeff]/u;

/** A shorter anchor than this cannot identify a passage on its own. */
export const MIN_ANCHOR_LENGTH = 48;

const isSpace = (character) => SPACE.test(character);

/** The same whitespace collapsing the index applies, for the text being sought. */
export function collapseWhitespace(value) {
  if (typeof value !== 'string') return '';
  let out = '';
  let pending = false;
  for (const character of value) {
    if (isSpace(character)) {
      pending = out.length > 0;
      continue;
    }
    if (pending) {
      out += ' ';
      pending = false;
    }
    out += character;
  }
  return out;
}

/**
 * A whitespace-collapsed projection of `chunks`, with a map from every
 * character of the projection back to the chunk and offset it came from.
 *
 * A run of whitespace becomes one space, and that space keeps the position of
 * the *first* whitespace character it stands for, so a matched range stays
 * contiguous inside each chunk and can be wrapped without reordering anything.
 */
export function buildTextIndex(chunks) {
  const source = Array.isArray(chunks) ? chunks : [];
  let text = '';
  const chunkIndex = [];
  const offsets = [];
  let pending = null;
  for (let index = 0; index < source.length; index += 1) {
    const value = typeof source[index] === 'string' ? source[index] : '';
    for (let position = 0; position < value.length; position += 1) {
      const character = value[position];
      if (isSpace(character)) {
        if (text.length > 0 && !pending) pending = { chunk: index, offset: position };
        continue;
      }
      if (pending) {
        text += ' ';
        chunkIndex.push(pending.chunk);
        offsets.push(pending.offset);
        pending = null;
      }
      text += character;
      chunkIndex.push(index);
      offsets.push(position);
    }
  }
  return { text, chunkIndex, offsets, chunks: source };
}

function allOccurrences(haystack, needle) {
  const found = [];
  if (!needle) return found;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return found;
    found.push(at);
    from = at + 1;
    /* A passage repeated more than a handful of times is not identifying, and
       the hint picks one of the first few just as well as one of a thousand. */
    if (found.length >= 64) return found;
  }
}

/**
 * Progressively shorter anchors, longest first. A page whose text has been
 * edited since the capture usually still carries the opening of the passage.
 */
function anchorsFor(needle) {
  const anchors = [];
  const push = (value) => {
    const trimmed = value.trim();
    if (trimmed.length >= MIN_ANCHOR_LENGTH && !anchors.includes(trimmed)) anchors.push(trimmed);
  };
  const sentence = needle.slice(0, 400).match(/^[\s\S]*?[.!?](?=\s|$)/u);
  if (sentence) push(sentence[0]);
  for (const length of [200, 120, MIN_ANCHOR_LENGTH]) push(needle.slice(0, length));
  const tail = needle.slice(-120);
  push(tail);
  return anchors;
}

function pick(starts, length, total, hint) {
  if (starts.length === 1 || hint === null) return { start: starts[0], end: starts[0] + length };
  const wanted = Math.max(0, Math.min(1, hint)) * total;
  let best = starts[0];
  let distance = Math.abs(best - wanted);
  for (const start of starts.slice(1)) {
    const gap = Math.abs(start - wanted);
    if (gap < distance) {
      best = start;
      distance = gap;
    }
  }
  return { start: best, end: best + length };
}

/**
 * Locate `passage` inside a built index.
 *
 * `hint` is where the passage sat in the captured text, as a fraction from 0 to
 * 1. It only chooses between equally good matches; it never creates one.
 *
 * Returns `{ start, end, exact, anchor, occurrences }` in projection
 * coordinates, or `null` when the text has changed too much to be honest about.
 */
export function locatePassage(index, passage, options = {}) {
  if (!index || typeof index.text !== 'string') return null;
  const needle = collapseWhitespace(passage).trim();
  if (needle.length < 3) return null;
  const hint = Number.isFinite(options.hint) ? options.hint : null;

  const exact = allOccurrences(index.text, needle);
  if (exact.length) {
    return { ...pick(exact, needle.length, index.text.length, hint), exact: true, anchor: null, occurrences: exact.length };
  }
  for (const anchor of anchorsFor(needle)) {
    const found = allOccurrences(index.text, anchor);
    if (found.length) {
      return { ...pick(found, anchor.length, index.text.length, hint), exact: false, anchor, occurrences: found.length };
    }
  }
  return null;
}

/**
 * The projection range as per-chunk spans, in document order. A chunk that
 * carries no node (a synthetic block boundary) still appears; the caller drops
 * those, because there is nothing on the page to wrap.
 */
export function segmentsForRange(index, start, end) {
  const segments = [];
  if (!index || !Array.isArray(index.chunkIndex)) return segments;
  const from = Math.max(0, Math.min(index.chunkIndex.length, Math.trunc(start)));
  const to = Math.max(from, Math.min(index.chunkIndex.length, Math.trunc(end)));
  for (let position = from; position < to; position += 1) {
    const chunk = index.chunkIndex[position];
    const offset = index.offsets[position];
    if (chunk === undefined) continue;
    const last = segments[segments.length - 1];
    if (last && last.chunk === chunk && last.end === offset) {
      last.end = offset + 1;
      continue;
    }
    if (last && last.chunk === chunk && last.end === offset + 1) continue;
    segments.push({ chunk, start: offset, end: offset + 1 });
  }
  return segments;
}
