/**
 * The page-side half of "choosing a section shows the passage in the source".
 *
 * Injected on demand into the tab the reader captured, never at install and
 * never on a page they did not choose. It installs one function on the isolated
 * world's global and does nothing else until the panel calls it.
 *
 * What it is allowed to do: split text nodes and wrap the matched characters in
 * a `<span>` carrying an inline style. What it never does: change a character
 * of the page's text, touch a form field, add a stylesheet or a script, read
 * anything back to the panel beyond how many spans it drew, or leave anything
 * behind once the section is closed.
 */
import { applyHighlight, clearHighlight, collectTextChunks } from "../../shared/highlight-dom.mjs";
import { buildTextIndex, locatePassage, segmentsForRange } from "../../shared/passage-locator.mjs";

interface HighlightCommand {
  passage: string;
  level: string;
  hint: number;
}

interface HighlightOutcome {
  matched: boolean;
  spans: number;
  exact: boolean;
  cleared: number;
  reason: "matched" | "not-found" | "no-passage" | "no-text";
}

/* The five band colours, as the panel and the shared stylesheet name them. A
   tint on someone else's page has to stay readable over whatever is under it,
   so it is a light wash with a solid underline rather than a block of colour. */
const BANDS: Record<string, { wash: string; line: string }> = {
  "signal-likely-human": { wash: "rgba(47,125,84,0.20)", line: "#2f7d54" },
  "signal-unclear": { wash: "rgba(141,145,140,0.22)", line: "#8d918c" },
  "signal-potentially-ai": { wash: "rgba(192,138,23,0.26)", line: "#c08a17" },
  "signal-likely-ai": { wash: "rgba(194,87,28,0.24)", line: "#c2571c" },
  "signal-strongly-ai": { wash: "rgba(165,48,31,0.24)", line: "#a5301f" },
};
const FALLBACK = { wash: "rgba(251,112,10,0.22)", line: "#c25209" };

const rootForReading = (): Element => document.querySelector("article, main, [role='main']") ?? document.body;

const visible = (element: Element): boolean => {
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
};

const run = (command: HighlightCommand): HighlightOutcome => {
  const cleared = clearHighlight(document.body);
  const passage = typeof command?.passage === "string" ? command.passage : "";
  if (!passage.trim()) return { matched: false, spans: 0, exact: false, cleared, reason: "no-passage" };

  const root = rootForReading();
  const chunks = collectTextChunks(root, { isVisible: visible });
  const index = buildTextIndex(chunks.map((chunk) => chunk.text));
  if (!index.text.trim()) return { matched: false, spans: 0, exact: false, cleared, reason: "no-text" };

  const found = locatePassage(index, passage, { hint: command.hint });
  if (!found) return { matched: false, spans: 0, exact: false, cleared, reason: "not-found" };

  const band = BANDS[command.level] ?? FALLBACK;
  const spans = applyHighlight(document, chunks, segmentsForRange(index, found.start, found.end), {
    style: `background-color:${band.wash};border-radius:2px;color:inherit;`,
    "data-oaci-level": String(command.level ?? ""),
  });
  if (spans.length) {
    /* A wash across the whole passage, with a band-coloured bracket at each
       end of it. The brackets go on the first and last span only: a passage
       broken across eighteen text nodes would otherwise be drawn as eighteen
       separate marks, and an underline would repeat on every wrapped line. */
    spans[0].style.borderLeft = `3px solid ${band.line}`;
    spans[spans.length - 1].style.borderRight = `3px solid ${band.line}`;
    spans[0].scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
  }
  return { matched: spans.length > 0, spans: spans.length, exact: found.exact, cleared, reason: spans.length ? "matched" : "not-found" };
};

const api = {
  show: run,
  clear: (): number => clearHighlight(document.body),
};

declare global {
  interface Window {
    __oaciHighlight?: typeof api;
  }
}

window.__oaciHighlight = api;
