/**
 * The draft, with the chosen section tinted.
 *
 * Used for pasted text, where there is no page to tint, and as the fallback
 * whenever a captured page has changed too much for the passage to be found on
 * it. The panel must never say a section is selected without showing the
 * reader where it is, so this is the guarantee behind that promise.
 *
 * Pure: it slices a string and says how it found the slice. The panel escapes
 * and draws it.
 */

import { collapseWhitespace } from './passage-locator.mjs';

/**
 * `{ before, marked, after, located }` where `located` is:
 *
 * - `'offsets'` — the section's own UTF-16 offsets addressed this exact text.
 * - `'passage'` — the offsets did not fit, and the passage was found by search.
 * - `'none'`    — neither worked; `marked` is empty and nothing is tinted.
 */
export function buildTextViewer(text, section) {
  const source = typeof text === 'string' ? text : '';
  const empty = { before: source, marked: '', after: '', located: 'none' };
  if (!source || !section) return empty;

  const start = Number(section.start_utf16);
  const end = Number(section.end_utf16);
  if (Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= source.length) {
    const marked = source.slice(start, end);
    if (marked.trim()) return { before: source.slice(0, start), marked, after: source.slice(end), located: 'offsets' };
  }

  const passage = typeof section.passage === 'string' ? section.passage.trim() : '';
  if (passage) {
    const at = source.indexOf(passage);
    if (at !== -1) {
      return { before: source.slice(0, at), marked: passage, after: source.slice(at + passage.length), located: 'passage' };
    }
    /* The passage the contract carried may have had its own whitespace
       collapsed. Fall back to its opening, matched on the same collapsing. */
    const words = collapseWhitespace(passage).split(' ').filter(Boolean).slice(0, 12);
    if (words.join(' ').length >= 24) {
      const probe = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('\\s+');
      const match = new RegExp(probe, 'u').exec(source);
      if (match) {
        return { before: source.slice(0, match.index), marked: match[0], after: source.slice(match.index + match[0].length), located: 'passage' };
      }
    }
  }
  return empty;
}
