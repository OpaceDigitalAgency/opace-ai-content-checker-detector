/**
 * Tinting a passage on a page that is not ours.
 *
 * The rules this file exists to keep:
 *
 * - The page's text never changes. Only text nodes are touched, only by being
 *   split and wrapped, and clearing puts every character back in one node.
 * - Nothing is added to the page but `<span>` elements carrying an inline
 *   style. No stylesheet, no script, no attribute on anything the page owns.
 * - Form fields, scripts, styles and embedded documents are never entered.
 * - Everything below works against any DOM-shaped object, so the unit tests
 *   drive it without a browser.
 */

export const HIGHLIGHT_ATTRIBUTE = 'data-oaci-highlight';
export const HIGHLIGHT_CLASS = 'oaci-page-highlight';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** Never entered: a form field's value is not page text, and the rest is not text at all. */
const CLOSED = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'OPTGROUP',
  'SVG', 'CANVAS', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'VIDEO', 'AUDIO', 'MAP', 'HEAD',
]);

/** A boundary between these reads as a space even when the markup carries none. */
const BLOCK = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV',
  'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
]);

const children = (node) => (node && node.childNodes ? [...node.childNodes] : []);
const tagOf = (node) => String(node.nodeName ?? '').toUpperCase();

/**
 * The page's visible text, as an ordered list of `{ node, text }`.
 *
 * A synthetic `{ node: null, text: '\n' }` marks a block boundary so two
 * paragraphs never read as one run-on word. Those entries carry no node, so
 * nothing can be wrapped at one.
 */
export function collectTextChunks(root, options = {}) {
  const isVisible = typeof options.isVisible === 'function' ? options.isVisible : () => true;
  const chunks = [];
  const boundary = () => {
    const last = chunks[chunks.length - 1];
    if (chunks.length && !(last.node === null)) chunks.push({ node: null, text: '\n' });
  };
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === TEXT_NODE) {
      if (typeof node.data === 'string' && node.data.length) chunks.push({ node, text: node.data });
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const tag = tagOf(node);
    if (CLOSED.has(tag)) return;
    if (typeof node.getAttribute === 'function' && node.getAttribute('aria-hidden') === 'true') return;
    if (typeof node.hasAttribute === 'function' && node.hasAttribute(HIGHLIGHT_ATTRIBUTE)) {
      /* A tint left over from a previous section is transparent to the reader
         of this index: its own text still belongs to the page. */
      for (const child of children(node)) walk(child);
      return;
    }
    if (!isVisible(node)) return;
    const block = BLOCK.has(tag);
    if (block) boundary();
    for (const child of children(node)) walk(child);
    if (block) boundary();
  };
  walk(root);
  return chunks;
}

/**
 * Wrap each segment's characters in a span.
 *
 * Segments are applied from the end of each node backwards, so an offset is
 * never invalidated by an earlier split in the same node.
 */
export function applyHighlight(document, chunks, segments, attributes = {}) {
  const ordered = [...segments]
    .filter((segment) => chunks[segment.chunk] && chunks[segment.chunk].node)
    .sort((a, b) => (a.chunk === b.chunk ? b.start - a.start : b.chunk - a.chunk));
  const wrappers = [];
  for (const segment of ordered) {
    const node = chunks[segment.chunk].node;
    if (typeof node.splitText !== 'function' || !node.parentNode) continue;
    const length = segment.end - segment.start;
    if (length <= 0) continue;
    const middle = segment.start > 0 ? node.splitText(segment.start) : node;
    if (middle.data.length > length) middle.splitText(length);
    const span = document.createElement('span');
    span.setAttribute(HIGHLIGHT_ATTRIBUTE, '');
    span.setAttribute('class', HIGHLIGHT_CLASS);
    for (const [name, value] of Object.entries(attributes)) span.setAttribute(name, value);
    middle.parentNode.replaceChild(span, middle);
    span.appendChild(middle);
    wrappers.push(span);
  }
  return wrappers.reverse();
}

/** Merge adjacent text children and drop empty ones, so splitting leaves no trace. */
export function mergeAdjacentText(parent) {
  if (!parent) return;
  let previous = null;
  for (const child of children(parent)) {
    if (child.nodeType !== TEXT_NODE) {
      previous = null;
      continue;
    }
    if (child.data === '') {
      parent.removeChild(child);
      continue;
    }
    if (previous) {
      previous.data += child.data;
      parent.removeChild(child);
      continue;
    }
    previous = child;
  }
}

/**
 * Remove every tint under `root` and put the text back as it was found.
 * Returns how many wrappers were removed.
 */
export function clearHighlight(root) {
  if (!root) return 0;
  let removed = 0;
  const parents = new Set();
  const walk = (node) => {
    if (!node || node.nodeType !== ELEMENT_NODE) return;
    if (typeof node.hasAttribute === 'function' && node.hasAttribute(HIGHLIGHT_ATTRIBUTE)) {
      const parent = node.parentNode;
      if (parent) {
        for (const child of children(node)) parent.insertBefore(child, node);
        parent.removeChild(node);
        parents.add(parent);
        removed += 1;
      }
      return;
    }
    for (const child of children(node)) walk(child);
  };
  walk(root);
  for (const parent of parents) mergeAdjacentText(parent);
  return removed;
}
