/**
 * Section rows that expand in place, and the strip that rides with them.
 *
 * The shared renderer draws every section's evidence one after another and lets
 * each row toggle its own. In a 360 px panel that is a long scroll with no
 * sense of place. The owner asked for the row itself to open, one at a time,
 * with the row pinned and a strip naming which section is open and moving
 * between them.
 *
 * `shared/presentation/**` is frozen, so nothing here edits it: this is a thin
 * controller over the markup it already produced. It moves each deep dive into
 * the row that controls it, closes the rest, and draws one extra element. The
 * state machine itself is in `extensions/shared/section-accordion.mjs` and is
 * tested without a browser.
 */
import { accordionInitial, accordionReduce, accordionStrip, type AccordionState } from "../../shared/section-accordion.mjs";

export interface SectionRow {
  index: number;
  item: HTMLElement;
  button: HTMLElement;
  dive: HTMLElement | null;
}

export interface SectionViewSection {
  level?: string | null;
  display_score?: string | number | null;
}

export interface SectionViewHost {
  /** Say what happened, in the panel's own live region. */
  announce(message: string): void;
  /** Put the passage in front of the reader. Resolves with where it ended up. */
  reveal(index: number): void | Promise<void>;
  /** Take every tint away. */
  conceal(): void;
}

export interface SectionView {
  readonly rows: SectionRow[];
  readonly state: AccordionState;
  toggle(index: number, expanded: boolean): void;
  open(index: number): void;
  close(): void;
  destroy(): void;
}

const STRIP_ID = "section-strip";

/**
 * Rearrange the rendered result and wire the strip.
 *
 * `root` is the element `mount()` drew into. `before` is where the strip is
 * inserted, which is the top of the result rather than inside it: the result
 * element declares `container-type: inline-size`, so a sticky child of it would
 * stick to the result rather than to the panel.
 */
export function installSectionView(
  root: HTMLElement,
  before: HTMLElement,
  sections: readonly SectionViewSection[],
  labels: Record<string, string>,
  host: SectionViewHost,
): SectionView {
  const rows: SectionRow[] = [];
  for (const button of root.querySelectorAll<HTMLElement>("[data-oaci-section-toggle]")) {
    const index = Number(button.dataset.oaciSectionToggle);
    const item = button.closest("li");
    if (!item || !Number.isInteger(index)) continue;
    const controls = button.getAttribute("aria-controls");
    const dive = controls ? root.querySelector<HTMLElement>(`#${CSS.escape(controls)}`) : null;
    if (dive) {
      /* The evidence moves inside the row it belongs to. Nothing about it
         changes: the same element, the same id, the same contents. */
      item.append(dive);
      dive.hidden = true;
      dive.classList.add("in-row");
    }
    button.setAttribute("aria-expanded", "false");
    item.dataset.oaciOpen = "false";
    rows.push({ index, item, button, dive });
  }

  /* The dives panel is now empty apart from its introduction, which belongs
     with the rows it describes. */
  const dives = root.querySelector<HTMLElement>(".oaci-dives");
  const intro = root.querySelector<HTMLElement>(".oaci-dives__intro");
  const head = root.querySelector<HTMLElement>(".oaci-strip__head");
  if (intro && head) head.append(intro);
  if (dives && !dives.querySelector(".oaci-dive")) dives.hidden = true;

  const strip = before.ownerDocument.createElement("div");
  strip.className = "sectionbar";
  strip.id = STRIP_ID;
  strip.hidden = true;
  strip.innerHTML = `<div class="sectionbar__body">
    <p class="sectionbar__label"><b data-part="where">Section</b><span data-part="band"></span><b data-part="score"></b></p>
    <div class="sectionbar__nav">
      <button type="button" data-part="previous" aria-label="Open the previous section">‹<span>Previous</span></button>
      <button type="button" data-part="next" aria-label="Open the next section"><span>Next</span>›</button>
      <button type="button" data-part="close" class="sectionbar__close">Close</button>
    </div>
  </div>`;
  before.parentElement?.insertBefore(strip, before);

  const part = <T extends HTMLElement>(name: string): T => strip.querySelector<T>(`[data-part="${name}"]`)!;
  const where = part("where");
  const band = part("band");
  const score = part("score");
  const previous = part<HTMLButtonElement>("previous");
  const next = part<HTMLButtonElement>("next");
  const closeButton = part<HTMLButtonElement>("close");

  let state = accordionInitial();
  let destroyed = false;

  const paint = (announceIt: boolean): void => {
    for (const row of rows) {
      const open = row.index === state.open;
      row.button.setAttribute("aria-expanded", String(open));
      row.item.dataset.oaciOpen = String(open);
      if (row.dive) row.dive.hidden = !open;
    }
    const bar = accordionStrip(state, sections as never, labels);
    strip.hidden = bar === null;
    if (!bar) {
      host.conceal();
      return;
    }
    where.textContent = `Section ${bar.number} of ${bar.total}`;
    band.textContent = bar.levelLabel;
    band.dataset.level = bar.level ?? "";
    score.textContent = bar.score;
    previous.disabled = !bar.canPrevious;
    next.disabled = !bar.canNext;
    /* The strip is what the reader now scrolls against, so the pinned row sits
       directly under it rather than behind it. */
    root.style.setProperty("--pin-top", `${Math.ceil(strip.getBoundingClientRect().height)}px`);
    const row = rows.find((entry) => entry.index === bar.index);
    if (row) row.item.scrollIntoView({ block: "start", behavior: "auto" });
    if (announceIt) host.announce(bar.announcement);
    void host.reveal(bar.index);
  };

  const dispatch = (action: Parameters<typeof accordionReduce>[1], announceIt = true): void => {
    if (destroyed) return;
    const nextState = accordionReduce(state, action, rows.length);
    const changed = nextState.open !== state.open;
    state = nextState;
    paint(announceIt && changed);
  };

  const listeners: Array<() => void> = [];
  const on = (node: HTMLElement, handler: () => void): void => {
    const wrapped = (): void => handler();
    node.addEventListener("click", wrapped);
    listeners.push(() => node.removeEventListener("click", wrapped));
  };
  on(previous, () => dispatch({ type: "previous" }));
  on(next, () => dispatch({ type: "next" }));
  on(closeButton, () => {
    const open = state.open;
    dispatch({ type: "close" });
    const row = rows.find((entry) => entry.index === open);
    if (row) row.button.focus();
    host.announce("Section closed.");
  });

  paint(false);

  return {
    rows,
    get state() {
      return state;
    },
    /* The shared `mount()` owns the row click and has already flipped its own
       attributes by the time this runs. The reconcile below is what makes only
       one stay open. */
    toggle(index: number, expanded: boolean) {
      dispatch(expanded ? { type: "open", index } : { type: "close" });
    },
    open(index: number) {
      dispatch({ type: "open", index });
    },
    close() {
      dispatch({ type: "close" });
    },
    destroy() {
      destroyed = true;
      for (const remove of listeners.splice(0)) remove();
      strip.remove();
      host.conceal();
    },
  };
}
