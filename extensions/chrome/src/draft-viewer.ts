/**
 * "Your text": the draft, with the chosen section tinted.
 *
 * Pasted text has no page to tint. A captured page sometimes has one that has
 * changed since it was read, and then the passage cannot honestly be found on
 * it. Both end here, because the panel is never allowed to say a section is
 * selected without showing the reader where it is.
 *
 * The text is the reader's own and never leaves the panel: this draws it into
 * the panel's own document and nothing else.
 */
import { escapeResultHtml } from "../../../shared/presentation/checker-result-presentation.mjs";
import { buildTextViewer, type TextViewerSection } from "../../shared/text-viewer.mjs";

export interface DraftViewer {
  /** Draw the section's passage. `true` when something is actually tinted. */
  show(section: TextViewerSection, level: string, number: number, total: number): boolean;
  hide(): void;
  destroy(): void;
}

const CAPTIONS = {
  paste: { title: "Your text", note: "The draft you pasted. Nothing here has left this panel." },
  page: { title: "The text we read", note: "The text captured from the page. The page itself has changed too much to mark, so the passage is shown here instead." },
} as const;

export function installDraftViewer(before: HTMLElement, text: string, kind: keyof typeof CAPTIONS): DraftViewer {
  const document = before.ownerDocument;
  const caption = CAPTIONS[kind];
  const root = document.createElement("details");
  root.className = "draft";
  root.id = "draft-viewer";
  root.hidden = true;
  root.innerHTML = `<summary><span class="draft__title">${escapeResultHtml(caption.title)}</span><small data-part="where"></small></summary>
    <div class="draft__panel">
      <p class="fine" data-part="note">${escapeResultHtml(caption.note)}</p>
      <div class="draft__scroll" data-part="scroll" tabindex="0" role="group" aria-label="${escapeResultHtml(`${caption.title}, with the chosen passage marked`)}"><pre class="draft__text" data-part="text"></pre></div>
    </div>`;
  before.parentElement?.insertBefore(root, before);

  const part = <T extends HTMLElement>(name: string): T => root.querySelector<T>(`[data-part="${name}"]`)!;
  const where = part("where");
  const body = part("text");
  const scroll = part<HTMLElement>("scroll");

  return {
    show(section, level, number, total) {
      const slices = buildTextViewer(text, section);
      if (slices.located === "none") {
        this.hide();
        return false;
      }
      where.textContent = `Section ${number} of ${total} marked`;
      body.innerHTML = `${escapeResultHtml(slices.before)}<mark class="draft__mark" data-level="${escapeResultHtml(level)}" id="draft-mark">${escapeResultHtml(slices.marked)}</mark>${escapeResultHtml(slices.after)}`;
      root.hidden = false;
      root.open = true;
      const mark = root.querySelector<HTMLElement>("#draft-mark");
      if (mark) {
        /* Scroll inside the viewer's own box, so the panel does not jump away
           from the section row the reader just opened. */
        scroll.scrollTop = Math.max(0, mark.offsetTop - scroll.clientHeight / 2 + mark.offsetHeight / 2);
      }
      return true;
    },
    hide() {
      root.hidden = true;
      root.open = false;
      body.textContent = "";
      where.textContent = "";
    },
    destroy() {
      root.remove();
    },
  };
}
