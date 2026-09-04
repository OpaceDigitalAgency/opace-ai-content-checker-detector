/**
 * The owner's section-to-text requirement, tested where it can be proved
 * without a browser: the accordion state machine, the offset-to-DOM mapping
 * including text broken across inline elements, the promise that clearing a
 * highlight leaves the page exactly as it was found, and the pasted-text
 * viewer's slicing.
 *
 * The rendered behaviour on a real page is proved separately by the evidence
 * harness, which drives the packaged bytes against real sites.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { accordionInitial, accordionReduce, accordionStrip } from "../../shared/section-accordion.mjs";
import { buildTextIndex, collapseWhitespace, locatePassage, segmentsForRange } from "../../shared/passage-locator.mjs";
import { applyHighlight, clearHighlight, collectTextChunks, HIGHLIGHT_ATTRIBUTE } from "../../shared/highlight-dom.mjs";
import { buildTextViewer } from "../../shared/text-viewer.mjs";
import { build, fakeDocument } from "./fake-dom.mjs";

const root = path.resolve(import.meta.dirname, "../../chrome");
const readDist = (file) => readFile(path.join(root, "dist", file), "utf8");

const SECTIONS = [
  { index: 0, level: "signal-likely-human", display_score: "0.12" },
  { index: 1, level: "signal-likely-ai", display_score: "0.81" },
  { index: 2, level: "signal-strongly-ai", display_score: "0.97" },
];
const LABELS = {
  "signal-likely-human": "Likely human",
  "signal-likely-ai": "Likely AI",
  "signal-strongly-ai": "Strongly AI",
};

/* ------------------------------------------------ the accordion, one at a time */

test("only one section is open at a time, and a second click closes it", () => {
  let state = accordionInitial();
  assert.equal(state.open, null);
  state = accordionReduce(state, { type: "open", index: 1 }, 3);
  assert.equal(state.open, 1);
  state = accordionReduce(state, { type: "open", index: 2 }, 3);
  assert.equal(state.open, 2, "opening a second section replaces the first");
  state = accordionReduce(state, { type: "toggle", index: 2 }, 3);
  assert.equal(state.open, null, "toggling the open section closes it");
  state = accordionReduce(state, { type: "toggle", index: 0 }, 3);
  assert.equal(state.open, 0);
  state = accordionReduce(state, { type: "close" }, 3);
  assert.equal(state.open, null);
});

test("previous and next stop at the ends and do nothing while nothing is open", () => {
  let state = accordionInitial();
  assert.equal(accordionReduce(state, { type: "next" }, 3).open, null);
  assert.equal(accordionReduce(state, { type: "previous" }, 3).open, null);
  state = accordionReduce(state, { type: "open", index: 0 }, 3);
  assert.equal(accordionReduce(state, { type: "previous" }, 3).open, 0, "the first section has no previous");
  state = accordionReduce(state, { type: "next" }, 3);
  state = accordionReduce(state, { type: "next" }, 3);
  assert.equal(state.open, 2);
  assert.equal(accordionReduce(state, { type: "next" }, 3).open, 2, "the last section has no next");
});

test("an index outside the sections cannot be opened", () => {
  const state = accordionInitial();
  assert.equal(accordionReduce(state, { type: "open", index: 9 }, 3).open, null);
  assert.equal(accordionReduce(state, { type: "open", index: -1 }, 3).open, null);
  assert.equal(accordionReduce({ open: 5 }, { type: "next" }, 3).open, null);
});

test("the strip names the open section, its band and its score", () => {
  assert.equal(accordionStrip(accordionInitial(), SECTIONS, LABELS), null);
  const bar = accordionStrip({ open: 1 }, SECTIONS, LABELS);
  assert.equal(bar.text, "Section 2 of 3 · Likely AI · 0.81");
  assert.equal(bar.canPrevious, true);
  assert.equal(bar.canNext, true);
  assert.equal(bar.announcement, "Section 2 of 3 open. Likely AI, score 0.81.");
  assert.equal(accordionStrip({ open: 0 }, SECTIONS, LABELS).canPrevious, false);
  assert.equal(accordionStrip({ open: 2 }, SECTIONS, LABELS).canNext, false);
});

/* -------------------------------------------------- offsets to a live page */

test("a passage split across inline elements maps back to every node it covers", () => {
  const chunks = ["The reading is ", "clear ", "enough", " to act on."];
  const index = buildTextIndex(chunks);
  assert.equal(index.text, "The reading is clear enough to act on.");
  const found = locatePassage(index, "clear enough to act");
  assert.equal(found.exact, true);
  const segments = segmentsForRange(index, found.start, found.end);
  assert.deepEqual(segments, [
    { chunk: 1, start: 0, end: 6 },
    { chunk: 2, start: 0, end: 6 },
    { chunk: 3, start: 0, end: 7 },
  ]);
  const rebuilt = segments.map((segment) => chunks[segment.chunk].slice(segment.start, segment.end)).join("");
  assert.equal(rebuilt, "clear enough to act");
});

test("the page's own whitespace is collapsed the way the capture collapsed it", () => {
  const index = buildTextIndex(["One\n   two", "\t\tthree  ", "four"]);
  assert.equal(index.text, "One two three four");
  assert.equal(collapseWhitespace("  a \n b  "), "a b");
  const found = locatePassage(index, "two   three\nfour");
  assert.equal(found.exact, true);
  const rebuilt = segmentsForRange(index, found.start, found.end)
    .map((segment) => index.chunks[segment.chunk].slice(segment.start, segment.end))
    .join("");
  assert.equal(rebuilt.replace(/\s+/gu, " "), "two three four");
});

test("a passage that appears twice is disambiguated by where it sat in the capture", () => {
  const index = buildTextIndex(["alpha beta gamma. ", "filler ".repeat(30), "alpha beta gamma. end"]);
  const early = locatePassage(index, "alpha beta gamma", { hint: 0 });
  const late = locatePassage(index, "alpha beta gamma", { hint: 1 });
  assert.equal(early.occurrences, 2);
  assert.ok(late.start > early.start, "the hint chose the later of two identical passages");
});

test("a page whose text has changed still finds the passage by its opening, and says it is not exact", () => {
  const passage = "The council agreed the plan on Tuesday, after two hours of debate about the cost.";
  const index = buildTextIndex(["The council agreed the plan on Tuesday, after two hours of debate about the budget instead."]);
  const found = locatePassage(index, passage);
  assert.equal(found.exact, false, "an anchored match is never reported as exact");
  assert.ok(found.anchor.length >= 48);
  assert.equal(index.text.slice(found.start, found.end), found.anchor);
});

test("a passage that is not on the page at all is refused rather than guessed", () => {
  const index = buildTextIndex(["Nothing in this paragraph resembles the passage that was scored elsewhere."]);
  assert.equal(locatePassage(index, "Quarterly revenue rose by eleven per cent across every region we serve."), null);
  assert.equal(locatePassage(index, "  "), null);
});

/* --------------------------------------------- wrapping, and putting it back */

test("form fields, scripts and hidden branches are never entered", () => {
  const page = build(["main",
    ["p", "Visible text."],
    ["script", "const hidden = 'code';"],
    ["style", ".a{color:red}"],
    ["textarea", "a draft the reader is typing"],
    ["div", "Also visible."],
  ]);
  page.childNodes[4].setAttribute("aria-hidden", "true");
  const chunks = collectTextChunks(page);
  const text = chunks.map((chunk) => chunk.text).join("");
  assert.match(text, /Visible text\./u);
  assert.doesNotMatch(text, /const hidden/u);
  assert.doesNotMatch(text, /color:red/u);
  assert.doesNotMatch(text, /a draft the reader is typing/u);
  assert.doesNotMatch(text, /Also visible\./u);
});

test("an element the walker is told is invisible is skipped", () => {
  const page = build(["main", ["p", "Shown."], ["p", "Not shown."]]);
  const hidden = page.childNodes[1];
  const chunks = collectTextChunks(page, { isVisible: (element) => element !== hidden });
  assert.equal(chunks.map((chunk) => chunk.text).join("").includes("Not shown."), false);
});

test("wrapping a passage that spans inline elements tints every part and changes no character", () => {
  const page = build(["article", ["p", "The reading is ", ["em", "clear enough"], " to act on. And more after it."]]);
  const before = page.textContent;
  const chunks = collectTextChunks(page);
  const index = buildTextIndex(chunks.map((chunk) => chunk.text));
  const found = locatePassage(index, "is clear enough to act");
  const spans = applyHighlight(fakeDocument, chunks, segmentsForRange(index, found.start, found.end), { style: "background:pink" });

  assert.equal(spans.length, 3, "one span per text node the passage crosses");
  assert.equal(spans.map((span) => span.textContent).join(""), "is clear enough to act");
  assert.equal(page.textContent, before, "the page's text is byte-identical after wrapping");
  for (const span of spans) {
    assert.equal(span.nodeName, "SPAN");
    assert.equal(span.hasAttribute(HIGHLIGHT_ATTRIBUTE), true);
    assert.equal(span.getAttribute("style"), "background:pink");
  }
  assert.equal(spans[0].scrolled, 0, "the highlighter, not this module, decides what scrolls");
});

test("clearing puts the page back exactly as it was found", () => {
  const page = build(["article",
    ["p", "The reading is ", ["em", "clear enough"], " to act on."],
    ["p", "A second paragraph the passage never touched."],
  ]);
  const before = page.textContent;
  const shapeBefore = JSON.stringify(shape(page));

  const chunks = collectTextChunks(page);
  const index = buildTextIndex(chunks.map((chunk) => chunk.text));
  const found = locatePassage(index, "is clear enough to act");
  applyHighlight(fakeDocument, chunks, segmentsForRange(index, found.start, found.end), {});
  assert.notEqual(JSON.stringify(shape(page)), shapeBefore, "the wrapping really did change the tree");

  const removed = clearHighlight(page);
  assert.equal(removed, 3);
  assert.equal(page.textContent, before, "the text is unchanged");
  assert.equal(JSON.stringify(shape(page)), shapeBefore, "and so is the tree, node for node");
  assert.equal(clearHighlight(page), 0, "clearing twice is harmless");
});

test("a second section replaces the first tint rather than adding to it", () => {
  const page = build(["article", ["p", "First passage here. Second passage there."]]);
  const before = page.textContent;
  const tint = (passage) => {
    clearHighlight(page);
    const chunks = collectTextChunks(page);
    const index = buildTextIndex(chunks.map((chunk) => chunk.text));
    const found = locatePassage(index, passage);
    return applyHighlight(fakeDocument, chunks, segmentsForRange(index, found.start, found.end), {});
  };
  assert.equal(tint("First passage here").length, 1);
  const second = tint("Second passage there");
  assert.equal(second.length, 1);
  assert.equal(second[0].textContent, "Second passage there");
  assert.equal(countHighlights(page), 1, "only the current section is tinted");
  clearHighlight(page);
  assert.equal(page.textContent, before);
});

function shape(node) {
  if (node.nodeType === 3) return node.data;
  return [node.nodeName, ...node.childNodes.map(shape)];
}

function countHighlights(node) {
  if (node.nodeType !== 1) return 0;
  const self = node.hasAttribute(HIGHLIGHT_ATTRIBUTE) ? 1 : 0;
  return self + node.childNodes.reduce((total, child) => total + countHighlights(child), 0);
}

/* ------------------------------------------------------- the pasted draft */

test("the pasted-text viewer slices the draft on the section's own offsets", () => {
  const text = "Opening sentence. The scored passage sits here. Closing sentence.";
  const slices = buildTextViewer(text, { start_utf16: 18, end_utf16: 46, passage: "The scored passage sits here." });
  assert.equal(slices.located, "offsets");
  assert.equal(slices.marked, "The scored passage sits here");
  assert.equal(slices.before + slices.marked + slices.after, text, "nothing is lost or invented");
});

test("offsets that do not fit the text fall back to finding the passage", () => {
  const text = "Opening sentence. The scored passage sits here. Closing sentence.";
  const slices = buildTextViewer(text, { start_utf16: 9_000, end_utf16: 9_100, passage: "The scored passage sits here." });
  assert.equal(slices.located, "passage");
  assert.equal(slices.marked, "The scored passage sits here.");
  assert.equal(slices.before + slices.marked + slices.after, text);
});

test("a passage whose whitespace was collapsed is still found in the draft", () => {
  const text = "Opening.\nThe scored passage\n  sits here.\nClosing.";
  const slices = buildTextViewer(text, { start_utf16: null, end_utf16: null, passage: "The scored passage sits here." });
  assert.equal(slices.located, "passage");
  assert.match(slices.marked, /The scored passage\s+sits here/u);
  assert.equal(slices.before + slices.marked + slices.after, text);
});

test("a content-free run tints nothing and says so, rather than marking the wrong place", () => {
  const slices = buildTextViewer("Some draft text.", { start_utf16: 0, end_utf16: 0, passage: "" });
  assert.equal(slices.located, "none");
  assert.equal(slices.marked, "");
  assert.equal(slices.before, "Some draft text.");
});

/* --------------------------------------------------------- the shipped build */

test("the packaged highlighter is a classic script with no import, export or remote call", async () => {
  const source = await readDist("content/highlight.js");
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/mu, "a content script injected by file cannot be a module");
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|WebSocket|sendBeacon/u);
  assert.match(source, /window\.__oaciHighlight/u);
  assert.match(source, /data-oaci-highlight/u);
  /* It writes nothing but spans, and reads nothing out of a form field. */
  assert.match(source, /"TEXTAREA"/u);
  assert.match(source, /"INPUT"/u);
});

test("the panel carries the section strip, the draft viewer and the shared share sheet", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /sectionbar/u);
  assert.match(panel, /draft-viewer/u);
  assert.match(panel, /oaci-share-sheet/u, "the website's share sheet is bundled, not a local copy");
  assert.match(panel, /content\/highlight\.js/u);
  const css = await readDist("panel.css");
  assert.match(css, /\.sectionbar\{position:sticky/u);
  assert.match(css, /\[data-oaci-open=true\]>\.oaci-strip__bar\{position:sticky/u, "the open row is pinned");
  assert.match(css, /\.draft__mark\[data-level=signal-strongly-ai\]/u);
});
