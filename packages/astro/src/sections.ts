/**
 * Section rows that open in place.
 *
 * The shared renderer draws two blocks: a list of section score rows, and,
 * further down the reading, one deep dive per section. Read on a screen that is
 * 520 px wide and can only show a slice of the panel at a time, that costs the
 * developer the connection between the two — the row is pressed here and the
 * evidence appears somewhere below the axes, the checks and the meaning panel.
 *
 * `shared/**` is frozen, so this module does not change what the renderer draws.
 * It moves each dive into its own row after the mount, which is a rearrangement
 * of nodes the renderer already produced and leaves every id, every
 * `aria-controls` and every one of the renderer's own handlers intact. What it
 * adds on top is the behaviour the owner asked for:
 *
 * - one section open at a time;
 * - the open row pinned to the top of the panel's scroll area while it is open;
 * - a sticky strip reading "Section n of m · level · score" with previous and
 *   next, so a long dive never leaves the reader without a way back.
 *
 * The strip prints the row's own level and score by reading them out of the row
 * rather than recomputing them, so the strip and the row can never disagree.
 */

/** The strip's own line. Pure, so the wording is pinned by a test. */
export function stripLabel(number: number, total: number, level: string, score: string): string {
  return [`Section ${number} of ${total}`, level, score].filter(Boolean).join(' · ');
}

/**
 * Where previous/next lands. Sections are read in document order and the ends
 * are ends: the strip disables its own control rather than wrapping round, so a
 * reader is never sent back to the top by pressing "next".
 */
export function neighbour(index: number, total: number, step: number): number | null {
  const next = index + step;
  return next < 0 || next >= total ? null : next;
}

/** What the strip says about the tint, given how many marks the page actually took. */
export function tintStatus(marks: number): string {
  if (marks > 0) return `Shown on the page: ${marks} passage${marks === 1 ? '' : 's'} tinted in the band colour.`;
  return 'This passage could not be found on the page as it is now, so nothing was tinted. The evidence below is still the passage the model read.';
}

export interface SectionAccordionOptions {
  /** The panel's scroll container, so the open row can be pinned to its top. */
  scroller?: HTMLElement | null;
  /** The element the sticky offsets are written on to. The panel by default. */
  offsetHost?: HTMLElement | null;
  /** Tint the section on the previewed page. Returns how many marks were drawn. */
  onOpen?: (index: number) => number;
  /** Take the tint away again. */
  onClose?: () => void;
}

export interface SectionAccordion {
  /** How many sections the accordion found. Zero means it did nothing. */
  readonly total: number;
  /** Which section is open, or null. */
  readonly open: number | null;
  /** Open one section, closing whichever was open. */
  show(index: number): void;
  /** Close whatever is open and clear the tint. */
  close(): void;
  /** The renderer's own toggle told us what it did; finish the job. */
  toggled(index: number, expanded: boolean): void;
  /** Unwire, and clear the tint. The markup is thrown away by the caller. */
  destroy(): void;
}

const NOOP: SectionAccordion = {
  total: 0,
  open: null,
  show() {},
  close() {},
  toggled() {},
  destroy() {},
};

/**
 * Rearrange a mounted reading into an accordion and wire the sticky strip.
 *
 * Returns a do-nothing handle when the reading carries no sections — a
 * withheld or unassessed run draws no rows at all, and the strip must not
 * appear over an empty list.
 */
export function installSectionAccordion(root: HTMLElement, options: SectionAccordionOptions = {}): SectionAccordion {
  const strip = root.querySelector<HTMLElement>('.oaci-strip');
  const list = strip?.querySelector<HTMLOListElement>('.oaci-strip__list');
  const rows = list ? [...list.childNodes].filter((node): node is HTMLLIElement =>
    (node as HTMLElement).nodeType === 1 && (node as HTMLElement).tagName === 'LI') : [];
  const dives = root.querySelector<HTMLElement>('.oaci-dives');
  if (!strip || !list || !rows.length || !dives) return NOOP;

  const doc = root.ownerDocument;
  const total = rows.length;
  const listeners: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(node: HTMLElement, type: K, handler: (event: HTMLElementEventMap[K]) => void): void => {
    node.addEventListener(type, handler);
    listeners.push(() => node.removeEventListener(type, handler));
  };

  /* -- the dives move into their rows ------------------------------------- */

  // The dives block's own introduction explains what every dive shows, so it
  // moves to the head of the list rather than being thrown away with the
  // wrapper. The wrapper itself goes: an empty landmark whose heading labels
  // nothing is worse than no landmark.
  const intro = dives.querySelector<HTMLElement>('.oaci-dives__intro');
  const head = strip.querySelector<HTMLElement>('.oaci-strip__head');
  if (intro && head) head.appendChild(intro);

  for (const dive of dives.querySelectorAll<HTMLElement>('.oaci-dive')) {
    const index = Number(dive.getAttribute('data-oaci-section'));
    const row = Number.isInteger(index) ? rows[index] : undefined;
    if (!row) continue;
    dive.setAttribute('class', `${dive.getAttribute('class') ?? ''} oacit-dive-inline`.trim());
    row.appendChild(dive);
  }
  dives.remove();

  const bars = rows.map((row) => row.querySelector<HTMLButtonElement>('.oaci-strip__bar'));
  const panels = rows.map((row) => row.querySelector<HTMLElement>('.oaci-dive'));

  // The renderer opens every dive; the accordion starts closed, which is the
  // only honest starting state when only one may be open.
  bars.forEach((bar, index) => {
    bar?.setAttribute('aria-expanded', 'false');
    const panel = panels[index];
    if (panel) panel.hidden = true;
  });

  /* -- the sticky strip ---------------------------------------------------- */

  const make = <T extends HTMLElement>(tag: string, className: string, attributes: Record<string, string> = {}, text = ''): T => {
    const node = doc.createElement(tag) as T;
    node.setAttribute('class', className);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text) node.appendChild(doc.createTextNode(text));
    return node;
  };

  const nav = make<HTMLElement>('div', 'oacit-secnav', { 'data-oacit-secnav': '' });
  nav.hidden = true;
  const step = (direction: '-1' | '1', label: string, glyph: string): HTMLButtonElement => {
    const button = make<HTMLButtonElement>('button', 'oacit-secnav__step', {
      type: 'button',
      'data-oacit-secnav-step': direction,
      'aria-label': label,
    });
    button.appendChild(make('span', 'oacit-secnav__glyph', { 'aria-hidden': 'true' }, glyph));
    return button;
  };
  const previous = step('-1', 'Previous section', '‹');
  const following = step('1', 'Next section', '›');
  const now = make<HTMLElement>('p', 'oacit-secnav__now', { 'data-oacit-secnav-now': '' });
  const closeButton = make<HTMLButtonElement>('button', 'oacit-secnav__close', { type: 'button', 'data-oacit-secnav-close': '' }, 'Close');
  const tint = make<HTMLElement>('p', 'oacit-secnav__tint', { 'data-oacit-secnav-tint': '', role: 'status' });
  for (const child of [previous, now, following, closeButton, tint]) nav.appendChild(child);
  strip.insertBefore(nav, list);

  const steps = [previous, following];

  const offsetHost = options.offsetHost ?? options.scroller ?? null;
  /** How tall a sticky neighbour is, or nought where the host cannot measure. */
  const heightOf = (node: HTMLElement | null | undefined): number =>
    (node && Number.isFinite(node.offsetHeight) ? node.offsetHeight : 0);
  const measure = (): void => {
    if (!offsetHost || typeof offsetHost.style?.setProperty !== 'function') return;
    offsetHost.style.setProperty('--oacit-head-h', `${heightOf(offsetHost.querySelector<HTMLElement>('.oacit-head'))}px`);
    offsetHost.style.setProperty('--oacit-secnav-h', `${nav.hidden ? 0 : heightOf(nav)}px`);
  };

  let open: number | null = null;

  /**
   * Pin the open row to the top of the panel's scroll area, just under the
   * masthead and the strip. The row's own header then stays put while the dive
   * scrolls, which is what "pinned" has to mean on a panel this narrow.
   */
  const pin = (index: number): void => {
    const scroller = options.scroller;
    const row = rows[index];
    if (!scroller || !row) return;
    if (typeof scroller.getBoundingClientRect !== 'function' || typeof row.getBoundingClientRect !== 'function') return;
    const above = heightOf(scroller.querySelector<HTMLElement>('.oacit-head')) + (nav.hidden ? 0 : heightOf(nav));
    const delta = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top - above;
    scroller.scrollTop += delta;
  };

  const paint = (): void => {
    if (open === null) {
      nav.hidden = true;
      measure();
      return;
    }
    const bar = bars[open];
    const level = bar?.querySelector<HTMLElement>('.oaci-strip__band')?.textContent?.trim() ?? '';
    const score = bar?.querySelector<HTMLElement>('.oaci-strip__score')?.textContent?.trim() ?? '';
    now.textContent = stripLabel(open + 1, total, level, score);
    for (const step of steps) {
      const target = neighbour(open, total, Number(step.getAttribute('data-oacit-secnav-step')));
      step.disabled = target === null;
    }
    nav.hidden = false;
    measure();
  };

  const apply = (index: number | null): void => {
    open = index;
    rows.forEach((row, position) => {
      const expanded = position === index;
      row.toggleAttribute('data-oacit-open', expanded);
      bars[position]?.setAttribute('aria-expanded', String(expanded));
      const panel = panels[position];
      if (panel) panel.hidden = !expanded;
    });
    paint();
  };

  const show = (index: number): void => {
    if (index < 0 || index >= total) return;
    apply(index);
    // The tint is asked for first and the strip says what it got, so the panel
    // can never claim a section is showing on the page when nothing is.
    tint.textContent = tintStatus(options.onOpen ? options.onOpen(index) : 0);
    pin(index);
  };

  const close = (): void => {
    apply(null);
    tint.textContent = '';
    options.onClose?.();
  };

  /** The renderer's own handler already flipped this row. Finish the job around it. */
  const toggled = (index: number, expanded: boolean): void => {
    if (!expanded) {
      close();
      return;
    }
    // No focus move: the reader pressed this row, so focus is already on it.
    show(index);
  };

  for (const step of steps) {
    on(step, 'click', () => {
      if (open === null) return;
      const target = neighbour(open, total, Number(step.getAttribute('data-oacit-secnav-step')));
      if (target === null) return;
      // Focus stays on the step: walking the sections means pressing the same
      // button repeatedly, and moving focus into the row each time would take
      // it away from under the reader's hand. The strip's status line is live,
      // so what changed is still announced.
      show(target);
    });
  }
  on(closeButton, 'click', () => {
    const returning = open;
    close();
    if (returning !== null) bars[returning]?.focus();
  });

  apply(null);
  measure();

  return {
    get total() { return total; },
    get open() { return open; },
    show,
    close,
    toggled,
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      options.onClose?.();
    },
  };
}
