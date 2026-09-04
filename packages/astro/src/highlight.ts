/**
 * Tinting the chosen section on the page being previewed.
 *
 * The model reads one string: the visible-text projection of `document.body`.
 * A section names a half-open span of UTF-16 offsets in that string, so showing
 * a developer *where* a section is means mapping those offsets back on to the
 * text nodes the string was built from.
 *
 * `projectDomVisibleText` already records that mapping. Every run it emits
 * carries the child-index path of the node it came from and the exact window it
 * occupies in the projected string, so the mapping here is arithmetic rather
 * than a search: no text is re-matched, nothing is guessed, and a passage that
 * runs across `<em>`, `<a>` and `<strong>` simply produces one slice per text
 * node instead of one.
 *
 * Three rules the tint never breaks:
 *
 * 1. **The page's text is never altered.** A slice is wrapped in a span; the
 *    characters either side of it are put back in text nodes of their own, so
 *    the concatenation of the document is identical before and after.
 * 2. **Form controls and editable regions are left alone.** Wrapping inside a
 *    `<textarea>` or a `contenteditable` would change what the user is typing,
 *    so those slices are skipped and the tint degrades to whatever else is
 *    reachable.
 * 3. **A stale mapping tints nothing rather than the wrong thing.** Every slice
 *    is verified character for character against the node it resolved to. If
 *    the page has changed since the run, the slice is dropped. The caller is
 *    told how many marks were actually drawn, so the panel can say what is true
 *    rather than claim a selection nobody can see.
 */

/** One run of the visible-text projection, as `@opacedev/ai-content-checker-browser` emits it. */
export interface SourceRun {
  text: string;
  node_path: number[];
  start_utf16: number;
  end_utf16: number;
  visible_start_utf16: number;
  visible_end_utf16: number;
}

/** A piece of one text node that falls inside the requested span. */
export interface TextSlice {
  /** Child-index path from the projection root to the text node. */
  path: number[];
  /** Offset of the first character inside that node. */
  offset: number;
  /** How many UTF-16 units to cover. */
  length: number;
  /** The exact characters expected there, used to reject a stale mapping. */
  text: string;
}

/** Levels, in the shared band vocabulary, mapped to the shared band names. */
const BAND: Record<string, string> = {
  'signal-likely-human': 'human',
  'signal-unclear': 'unclear',
  'signal-potentially-ai': 'potential',
  'signal-likely-ai': 'likely',
  'signal-strongly-ai': 'strong',
};

/** The shared band colours, inlined because the tint lives in the page, not the panel. */
const BAND_COLOURS: Record<string, { ink: string; wash: string }> = {
  human: { ink: '#1c6e46', wash: '#d9f2e5' },
  unclear: { ink: '#5c6360', wash: '#e6e0d6' },
  potential: { ink: '#8a5a00', wash: '#f8e5c7' },
  likely: { ink: '#a84a08', wash: '#f9dcc4' },
  strong: { ink: '#96261b', wash: '#f6d7d0' },
};

/** The class every mark carries, and the attribute the cleanup sweep looks for. */
export const PAGE_MARK_CLASS = 'oaci-page-mark';
const STYLE_ID = 'oaci-page-mark-style';

/**
 * The one stylesheet the tint adds to the previewed page.
 *
 * The tint has to read on a page whose own colours are unknown, so it paints
 * both the ground and the ink rather than inheriting either, and marks the run
 * with a solid underline in the band colour so it survives forced colours and
 * a printout. `all: unset` is deliberately not used: the mark must inherit the
 * page's own font so the passage does not reflow around it.
 */
export const PAGE_MARK_CSS = `.${PAGE_MARK_CLASS}{`
  + `background:var(--oaci-mark-wash,#f8e5c7);color:#12161a;`
  + `border-radius:2px;box-shadow:0 0 0 2px var(--oaci-mark-wash,#f8e5c7);`
  + `text-decoration:underline;text-decoration-color:var(--oaci-mark-ink,#8a5a00);`
  + `text-decoration-thickness:2px;text-underline-offset:2px}`
  + `@media(forced-colors:active){.${PAGE_MARK_CLASS}{background:Mark;color:MarkText;box-shadow:none}}`;

/** Nothing inside one of these may be wrapped: it is a value a person is editing. */
const UNTOUCHABLE = new Set(['TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT']);

/** The projection emits a synthetic newline between blocks. It belongs to no text node. */
const isSeparator = (run: SourceRun): boolean => run.start_utf16 === 0 && run.end_utf16 === 0;

/**
 * The slices of the projection's own text nodes covered by `[start, end)`.
 *
 * Pure: it reads the run table and nothing else, so it is the piece the tests
 * drive across inline elements, across block boundaries and off both ends.
 */
export function slicesForRange(runs: readonly SourceRun[], start: number, end: number): TextSlice[] {
  // A span that does not run forwards is not a span. Swapping the two ends
  // would be a guess about what the caller meant, and a guess here tints the
  // wrong words on somebody's page.
  const from = Math.max(0, start);
  const to = end;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  const slices: TextSlice[] = [];
  for (const run of runs) {
    if (isSeparator(run)) continue;
    if (run.visible_end_utf16 <= from || run.visible_start_utf16 >= to) continue;
    const offset = Math.max(0, from - run.visible_start_utf16);
    const finish = Math.min(run.text.length, to - run.visible_start_utf16);
    const length = finish - offset;
    if (length <= 0) continue;
    slices.push({ path: [...run.node_path], offset, length, text: run.text.slice(offset, finish) });
  }
  return slices;
}

/** Walk a child-index path back to the node it came from, or nothing if the shape has changed. */
export function resolvePath(root: Node | null | undefined, path: readonly number[]): Node | null {
  let node: Node | null | undefined = root;
  for (const index of path) {
    const children = node?.childNodes;
    if (!children || index < 0 || index >= children.length) return null;
    node = children[index];
  }
  return node ?? null;
}

/** Is this node inside something whose text must not be rewrapped? */
function isWrappable(node: Node, guard: Node | null): boolean {
  let current: Node | null = node.parentNode;
  while (current) {
    if (current === guard) return false;
    const element = current as Element & { isContentEditable?: boolean };
    const tag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : '';
    if (UNTOUCHABLE.has(tag)) return false;
    if (tag.startsWith('ASTRO-DEV-TOOLBAR')) return false;
    if (element.isContentEditable === true) return false;
    if (typeof element.getAttribute === 'function') {
      const editable = element.getAttribute('contenteditable');
      if (editable !== null && editable !== 'false') return false;
    }
    current = current.parentNode;
  }
  return true;
}

export interface PageHighlighterOptions {
  /** The node the projection was taken from. `document.body` in the toolbar. */
  root: Node;
  /** The projection's run table, kept from the run that produced the sections. */
  runs: readonly SourceRun[];
  /** Owning document; taken from `root` when it is not given. */
  document?: Document;
  /** A subtree that must never be touched — the toolbar's own host element. */
  guard?: Node | null;
  /** Scroll the first mark into view. On by default. */
  scroll?: boolean;
  /**
   * The panel's own rectangle, so the tint is scrolled into the part of the
   * window the developer can still see. On a narrow window the panel covers
   * nearly everything, and a passage centred behind it is not shown at all.
   */
  avoid?: () => { top: number; bottom: number; width: number } | null;
}

export interface PageHighlighter {
  /** Tint `[start, end)` in the band colour. Returns how many marks were drawn. */
  show(start: number, end: number, level: string): number;
  /** Take every mark back out, leaving the page exactly as it was found. */
  clear(): void;
  /** How many marks are on the page right now. */
  readonly count: number;
}

/**
 * Build the highlighter for one run's projection.
 *
 * It owns every node it inserts and nothing else. `clear()` is idempotent, and
 * `show()` clears before it draws, so a section can never leave the previous
 * section's tint behind.
 */
export function createPageHighlighter(options: PageHighlighterOptions): PageHighlighter {
  const root = options.root;
  const doc = options.document ?? (root as Node & { ownerDocument?: Document }).ownerDocument ?? (root as unknown as Document);
  const guard = options.guard ?? null;
  const runs = options.runs;
  let marks: Element[] = [];

  const ensureStyle = (): void => {
    const head = (doc as Document & { head?: Element | null }).head ?? null;
    if (!head || typeof head.querySelector !== 'function') return;
    if (head.querySelector(`#${STYLE_ID}`)) return;
    const style = doc.createElement('style');
    style.setAttribute('id', STYLE_ID);
    style.textContent = PAGE_MARK_CSS;
    head.appendChild(style);
  };

  const clear = (): void => {
    for (const mark of marks.splice(0)) {
      const parent = mark.parentNode;
      if (!parent) continue;
      parent.replaceChild(doc.createTextNode(mark.textContent ?? ''), mark);
      // Putting the three pieces back as one text node matters: the next
      // projection must see the page exactly as the first one did.
      if (typeof (parent as Node & { normalize?: () => void }).normalize === 'function') (parent as Node).normalize();
    }
  };

  /**
   * Bring the first mark into the band of window the panel is not sitting on.
   *
   * `scrollIntoView({block:'center'})` is right on a wide window, where the
   * panel takes a column at the side; on a narrow one it centres the passage
   * behind the panel, which is the same as not showing it. The panel is treated
   * as an obstruction only when it is wide enough to be one.
   */
  const scrollTo = (mark: Element | undefined): void => {
    if (!mark) return;
    const view = (doc as Document & { defaultView?: (Window & typeof globalThis) | null }).defaultView ?? null;
    const fallback = mark as Element & { scrollIntoView?: (arg?: unknown) => void };
    if (!view || typeof view.scrollBy !== 'function' || typeof mark.getBoundingClientRect !== 'function') {
      if (typeof fallback.scrollIntoView === 'function') fallback.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      return;
    }
    const height = view.innerHeight || 0;
    const panel = options.avoid?.() ?? null;
    const covering = panel && panel.width >= (view.innerWidth || 0) * 0.75 && panel.top <= 8;
    const top = covering ? panel.bottom + 24 : 24;
    const bottom = height - 24;
    const rect = mark.getBoundingClientRect();
    if (rect.top >= top && rect.bottom <= bottom) return;
    const room = bottom - top;
    const target = room > rect.height + 40 ? top + (room - rect.height) / 2 : top;
    view.scrollBy({ top: rect.top - target, behavior: 'auto' });
  };

  const show = (start: number, end: number, level: string): number => {
    clear();
    const band = BAND[level] ?? 'unclear';
    const colours = BAND_COLOURS[band] ?? BAND_COLOURS.unclear!;
    // Every node is resolved before anything is wrapped. Wrapping shifts the
    // child indices after it, so a path resolved afterwards would point at the
    // wrong node — or at a mark this same call had just inserted.
    const targets: Array<{ node: Text; slice: TextSlice }> = [];
    for (const slice of slicesForRange(runs, start, end)) {
      const node = resolvePath(root, slice.path);
      if (!node || node.nodeType !== 3) continue;
      const text = node as Text;
      const value = text.nodeValue ?? '';
      if (value.slice(slice.offset, slice.offset + slice.length) !== slice.text) continue;
      if (!isWrappable(text, guard)) continue;
      targets.push({ node: text, slice });
    }
    if (!targets.length) return 0;
    ensureStyle();
    for (const { node, slice } of targets) {
      const parent = node.parentNode;
      if (!parent) continue;
      const value = node.nodeValue ?? '';
      const before = value.slice(0, slice.offset);
      const after = value.slice(slice.offset + slice.length);
      const mark = doc.createElement('span');
      mark.setAttribute('class', PAGE_MARK_CLASS);
      mark.setAttribute('data-oaci-page-mark', String(band));
      mark.setAttribute('style', `--oaci-mark-ink:${colours.ink};--oaci-mark-wash:${colours.wash}`);
      mark.appendChild(doc.createTextNode(slice.text));
      if (after) parent.insertBefore(doc.createTextNode(after), node.nextSibling);
      parent.insertBefore(mark, node.nextSibling);
      if (before) node.nodeValue = before;
      else parent.removeChild(node);
      marks.push(mark);
    }
    if (options.scroll !== false) scrollTo(marks[0]);
    return marks.length;
  };

  return {
    show,
    clear,
    get count() { return marks.length; },
  };
}
