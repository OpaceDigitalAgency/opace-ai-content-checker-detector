/**
 * One section open at a time.
 *
 * The shared renderer draws every section's evidence and lets each row toggle
 * its own. The owner asked for something stricter: a row expands in place, only
 * one is open, and while one is open a strip names it and moves between them.
 * That is a state machine, and it is here rather than in the panel so it can be
 * driven without a browser.
 */

/** Nothing open. */
export function accordionInitial() {
  return { open: null };
}

const clamp = (index, count) => (Number.isInteger(index) && index >= 0 && index < count ? index : null);

/**
 * `action` is `{ type: 'open' | 'toggle', index }`, or `{ type: 'close' }`,
 * `{ type: 'next' }`, `{ type: 'previous' }`. `next` and `previous` do nothing
 * while nothing is open, and stop at the ends rather than wrapping: a reader
 * stepping through sections should be able to tell when they have reached the
 * last one.
 */
export function accordionReduce(state, action, count) {
  const total = Number.isInteger(count) && count > 0 ? count : 0;
  const open = clamp(state ? state.open : null, total);
  switch (action && action.type) {
    case 'open':
      return { open: clamp(action.index, total) };
    case 'toggle': {
      const wanted = clamp(action.index, total);
      return { open: wanted !== null && wanted === open ? null : wanted };
    }
    case 'close':
      return { open: null };
    case 'next':
      return open === null ? { open } : { open: Math.min(total - 1, open + 1) };
    case 'previous':
      return open === null ? { open } : { open: Math.max(0, open - 1) };
    default:
      return { open };
  }
}

/**
 * What the sticky strip says while a section is open, or `null` when none is.
 * `sections` are the result's own sections and `labels` the level vocabulary
 * the surface already holds, so no second copy of either is kept here.
 */
export function accordionStrip(state, sections, labels = {}) {
  const list = Array.isArray(sections) ? sections : [];
  const open = clamp(state ? state.open : null, list.length);
  if (open === null) return null;
  const section = list[open];
  const levelLabel = labels[section.level] ?? section.level ?? 'Not assessed';
  const score = typeof section.display_score === 'string' ? section.display_score : String(section.display_score ?? '');
  return {
    index: open,
    number: open + 1,
    total: list.length,
    level: section.level ?? null,
    levelLabel,
    score,
    canPrevious: open > 0,
    canNext: open < list.length - 1,
    text: `Section ${open + 1} of ${list.length} · ${levelLabel} · ${score}`,
    announcement: `Section ${open + 1} of ${list.length} open. ${levelLabel}, score ${score}.`,
  };
}
