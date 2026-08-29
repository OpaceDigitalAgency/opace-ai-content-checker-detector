// FIX-SPAN — a finding's span must cover the text the rule actually found.
//
// The defect this guards against: six writing-signal rules anchored their
// finding at a single code unit (`first`, `first + 1`) instead of giving it an
// extent. The owner saw a finding render as the single character "W" — the
// first letter of his document — under an explanation about repeated content
// words. A one-character highlight pointing at an unrelated letter is not a
// cosmetic problem; it points the reader at the wrong text, which is the same
// class of trust bug as a segmentation offset mismatch (HANDOVER §14).
//
// The guard is deliberately a PROPERTY over a corpus, not six assertions about
// six rules. Each rule that anchors a finding declares a predicate its own span
// slice must satisfy — for most rules that is the rule's own detector regex, so
// "the span covers what was found" is checked mechanically. Any rule that
// shrinks its span back to an anchor fails its own detector.
//
// Rules that report a genuinely document-wide property (no single location)
// pass null for both ends and are checked separately: they must be marked
// document_level rather than pointing at an arbitrary character.
import test from "node:test";
import assert from "node:assert/strict";
import { inspectSignalsV2 } from "../../../packages/core/dist/patterns/en-signals-v2.js";
import { inspectPatterns } from "../../../packages/core/dist/patterns/en-gb-v1.js";
import {
  BOLD_LABEL_BULLET_RE, DIRECTIVE_COLON_BULLET_RE, EMOJI_DECOR_RE,
  FOCAL_WORD_RE, STACCATO_MAX_WORDS, TRANSITION_OPENER_RE,
} from "../../../packages/core/dist/patterns/en-signals-v3-data.js";

const countWords = (s) => (s.match(/\S+/g) ?? []).length;

// ─── the corpus ──────────────────────────────────────────────────────
// One document per anchored rule under test, plus documents that mix several
// rules so the property is exercised on findings that co-occur. The six
// repaired rules are the ones the coverage assertion below insists on.
const CORPUS = {
  bold_label_bullets:
    "The review covered three areas in the sprint notes today.\n\n" +
    "- **Speed:** loads fast on rural connections\n" +
    "- **Cost:** cheap to run month to month\n" +
    "- **Support:** answered quickly by real people\n",
  bold_label_bullets_indented:
    "Notes from the call, tidied up afterwards by the project lead.\n\n" +
    "  * **Scope:** unchanged since the kickoff meeting last month\n" +
    "  * **Budget:** approved by finance on Tuesday afternoon\n" +
    "  * **Timeline:** two weeks later than the original plan\n" +
    "  * **Owner:** the delivery team keeps the schedule\n\n" +
    "That was the whole of it.",
  emoji_decoration_astral:
    "The launch notes cover the following areas for the week.\n\n" +
    "## \u{1F680} Launch\n\nShipping begins Monday morning.\n\n" +
    "## \u{1F4A1} Ideas\n\nSend suggestions to the board.\n\n" +
    "## \u{1F3AF} Targets\n\nThe numbers are on the shared sheet.\n",
  emoji_decoration_bmp:
    "The launch notes cover the following areas for the week.\n\n" +
    "## ✅ Checklist\n\nFinal reviews are due Friday.\n\n" +
    "## ✨ Polish\n\nCopy edits land on Wednesday.\n\n" +
    "## ⚡ Speed\n\nThe build is two minutes faster.\n",
  directive_colon_bullets:
    "The checklist for the migration weekend covers the following items.\n\n" +
    "- Ensure backups run nightly: check the log each morning\n" +
    "- Optimise images before upload: use the batch tool\n" +
    "- Plan for scalability: pick the larger tier now\n",
  staccato_fragments:
    "It works. It scales. It lasts. The team spent two years proving that claim " +
    "with production deployments across three continents and hundreds of clients.",
  staccato_fragments_late:
    "The team spent two years proving that claim with production deployments " +
    "across three continents and hundreds of clients before anyone wrote it down. " +
    "It works. It scales. It lasts. It ships.",
  transition_stacking:
    "Moreover, the quarterly results improved beyond the forecast.\n\n" +
    "Furthermore, operating costs fell for the third consecutive period.\n\n" +
    "Additionally, the support team grew by four new hires.",
  quote_inconsistency:
    "The chairman said “the deal is done” and later added “nothing changes” " +
    "while the press release quoted him saying \"we move on\" and \"the plan holds\".",
  // Controls: rules that already carried a real extent and must keep it.
  tricolon_density:
    "We plan, build, and ship. We test, learn, and adapt. We hire, train, and retain. " +
    "We measure, report, and improve every single quarter.",
  focal_density:
    "The report delves into pivotal findings, showcasing meticulous analysis and " +
    "groundbreaking advancements across every intricate section of the appendix.",
  markdown_bold:
    "The release notes are short this week.\n\n**Highlights** are listed below for the team.\n",
  human_control:
    "We moved the printer to the back office on Tuesday because the hallway socket kept tripping. " +
    "Dave from accounts complained, obviously. The replacement toner arrives Thursday; until then " +
    "use the one upstairs. If the tray jams again, ring Sharon on extension 42 rather than forcing it.",
};

// ─── per-rule span predicates ────────────────────────────────────────
// "The span is not narrower than the text it matched", made mechanical: the
// slice on its own must still satisfy the rule that produced it.
const SPAN_MUST_SATISFY = {
  // A bold-label run is a block of consecutive bullets. Every line of the span
  // is one of those bullets, and there are at least the three that fired it.
  "signals.bold_label_bullets": (slice) => {
    const lines = slice.split(/\r?\n/).filter((l) => l.trim() !== "");
    return lines.length >= 3 && lines.every((l) => BOLD_LABEL_BULLET_RE.test(l + " "));
  },
  // The emoji itself, whole: one code point, and one this rule recognises.
  "signals.emoji_decoration": (slice) =>
    EMOJI_DECOR_RE.test(slice) && Array.from(slice).length === 1,
  // The matched directive, bullet marker through the colon.
  "signals.directive_colon_bullets": (slice) => DIRECTIVE_COLON_BULLET_RE.test(slice),
  // The run of short fragments: three or more, each within the word ceiling.
  "signals.staccato_fragments": (slice) => {
    const frags = slice.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
    return frags.length >= 3 && frags.every((f) => countWords(f) > 0 && countWords(f) <= STACCATO_MAX_WORDS);
  },
  // The connective the paragraph opened on.
  "signals.transition_stacking": (slice) =>
    TRANSITION_OPENER_RE.test(slice) && slice.trim() === slice,
  // Controls — rules that were already right.
  "signals.tricolon_density": (slice) => /^\w+,\s+\w+,\s+and\s+\w+$/.test(slice),
  "signals.focal_density": (slice) => new RegExp(`^(?:${FOCAL_WORD_RE.source})$`, "iu").test(slice),
  "signals.markdown_bold": (slice) => /^\*\*[^*\n]{1,120}\*\*$/.test(slice),
  "signals.proximity_cluster": (slice) => /^[\p{L}\p{N}'’-]+$/u.test(slice),
  "signals.by_ving_template": (slice) => /^By\s+\w+ing\b/.test(slice),
  "signals.invalid_isbn": (slice) => /^\bISBN/.test(slice),
};

// Rules whose finding is a document-wide property: no single location exists,
// so both ends are null and toFinding marks them document_level. Listing them
// here is the assertion that they are deliberate, not accidental anchors.
const DOCUMENT_WIDE = new Set([
  "signals.quote_inconsistency",
  "signals.passive_ratio",
  "signals.low_specificity",
  "signals.adjacent_lemma_repeat",
  "signals.setup_expansion_cadence",
  "signals.markdown_furniture",
  "signals.punct_distribution",
  "signals.cross_para_burstiness",
  "signals.uniformity",
]);

// The six rules this fix repaired. Each must actually fire somewhere in the
// corpus: a property test over findings that never occur proves nothing.
const REPAIRED = [
  "signals.bold_label_bullets",
  "signals.emoji_decoration",
  "signals.directive_colon_bullets",
  "signals.staccato_fragments",
  "signals.transition_stacking",
  "signals.quote_inconsistency",
];

const allFindings = () => {
  const out = [];
  for (const [id, text] of Object.entries(CORPUS)) {
    for (const f of inspectSignalsV2(text)) out.push({ doc: id, text, finding: f });
  }
  return out;
};

// ─── the property ────────────────────────────────────────────────────

test("no rule emits a span narrower than the text it matched", () => {
  let checked = 0;
  for (const { doc, text, finding } of allFindings()) {
    const predicate = SPAN_MUST_SATISFY[finding.rule_id];
    if (!predicate) continue;
    const slice = text.slice(finding.span.start_utf16, finding.span.end_utf16);
    assert.equal(slice, finding.evidence.matched, `${doc}/${finding.rule_id}: evidence disagrees with the span`);
    assert.ok(
      !finding.evidence.document_level,
      `${doc}/${finding.rule_id}: an anchored rule fell back to the document anchor`,
    );
    assert.ok(
      predicate(slice),
      `${doc}/${finding.rule_id}: span ${JSON.stringify(slice)} does not cover what the rule matched`,
    );
    checked += 1;
  }
  assert.ok(checked >= 12, `the property must actually be exercised (checked ${checked} spans)`);
});

// inspectPatterns drops a v2/v3 finding whose span is byte-identical to a v1
// one, so widening a span can silently delete the finding from the combined
// pack. Widening signals.transition_stacking onto the same word as
// style.transition_density did exactly that. The span fix must not cost a
// finding anywhere it used to appear.
test("a repaired span never collides with a v1 finding and loses the finding", () => {
  for (const [doc, text] of Object.entries(CORPUS)) {
    const signals = new Set(inspectSignalsV2(text).map((f) => f.rule_id));
    const combined = new Set(inspectPatterns(text).map((f) => f.rule_id));
    for (const rule of REPAIRED) {
      if (!signals.has(rule)) continue;
      assert.ok(combined.has(rule), `${doc}: ${rule} was deduped away by a v1 finding at the same span`);
    }
  }
  // The shape that caught it: a connective-stacked document also trips
  // style.transition_density on the same word.
  const probe = "Moreover, the supplier missed the delivery window agreed in January.\n\n" +
    "Furthermore, the replacement parts arrived without the certification paperwork.\n\n" +
    "Additionally, the invoice referenced a purchase order that had already been closed.\n\n" +
    "Consequently, the finance team withheld payment pending a full reconciliation of the account.";
  const ids = inspectPatterns(probe).map((f) => f.rule_id);
  assert.ok(ids.includes("style.transition_density"), "the v1 rule still fires on the probe");
  assert.ok(ids.includes("signals.transition_stacking"), "and the v3 rule survives beside it");
});

test("every repaired rule fires in the corpus, so the property is not vacuous", () => {
  const fired = new Set(allFindings().map(({ finding }) => finding.rule_id));
  for (const rule of REPAIRED) assert.ok(fired.has(rule), `${rule} never fired — the guard would pass on nothing`);
});

test("document-wide rules report no location rather than an arbitrary character", () => {
  let seen = 0;
  for (const { doc, text, finding } of allFindings()) {
    if (!DOCUMENT_WIDE.has(finding.rule_id)) continue;
    seen += 1;
    assert.equal(finding.evidence.document_level, true, `${doc}/${finding.rule_id}: must be marked document-level`);
    // The document anchor is the first whole code point of the text.
    assert.equal(finding.span.start_utf16, 0, `${doc}/${finding.rule_id}: not on the document anchor`);
    assert.equal(finding.span.end_utf16, Array.from(text)[0].length, `${doc}/${finding.rule_id}: anchor is not one code point`);
  }
  assert.ok(seen > 0, "no document-wide finding was produced by the corpus");
});

test("quote inconsistency is document-wide, not a highlight on one arbitrary quote", () => {
  const text = CORPUS.quote_inconsistency;
  const hit = inspectSignalsV2(text).find((f) => f.rule_id === "signals.quote_inconsistency");
  assert.ok(hit, "the rule still fires on mixed quote styles");
  assert.equal(hit.evidence.document_level, true);
  assert.equal(hit.evidence.curly_double_quotes, 4);
  assert.equal(hit.evidence.straight_double_quotes, 4);
});

// ─── emoji spans and surrogate pairs ─────────────────────────────────

test("an emoji span covers the whole emoji and never half a surrogate pair", () => {
  for (const doc of ["emoji_decoration_astral", "emoji_decoration_bmp"]) {
    const text = CORPUS[doc];
    const hit = inspectSignalsV2(text).find((f) => f.rule_id === "signals.emoji_decoration");
    assert.ok(hit, `${doc}: the rule fires`);
    const slice = text.slice(hit.span.start_utf16, hit.span.end_utf16);
    // Whole code points: the slice survives a code-point round trip and holds
    // no lone surrogate half.
    assert.equal(Array.from(slice).join(""), slice, `${doc}: slice is not whole code points`);
    assert.equal(Array.from(slice).length, 1, `${doc}: span is exactly one emoji`);
    assert.ok(EMOJI_DECOR_RE.test(slice), `${doc}: the slice is one of the decorating emoji`);
    for (let i = 0; i < slice.length; i += 1) {
      const code = slice.charCodeAt(i);
      assert.ok(!(code >= 0xDC00 && code <= 0xDFFF), `${doc}: lone low surrogate at ${i}`);
      if (code >= 0xD800 && code <= 0xDBFF) {
        assert.ok(i + 1 < slice.length, `${doc}: high surrogate is the last unit of the slice`);
        i += 1;
      }
    }
  }
  // The astral case is the one a `+ 1` span used to break: two code units.
  const astral = CORPUS.emoji_decoration_astral;
  const hit = inspectSignalsV2(astral).find((f) => f.rule_id === "signals.emoji_decoration");
  assert.equal(hit.span.end_utf16 - hit.span.start_utf16, 2, "the flagged emoji is a surrogate pair");
  assert.equal(hit.span.end_codepoint - hit.span.start_codepoint, 1, "and one code point wide");
});

// ─── the repaired spans, spelled out ─────────────────────────────────

test("each repaired rule reports the extent of the thing it found", () => {
  const sliceOf = (docKey, ruleId) => {
    const text = CORPUS[docKey];
    const hit = inspectSignalsV2(text).find((f) => f.rule_id === ruleId);
    assert.ok(hit, `${docKey}: ${ruleId} fires`);
    return text.slice(hit.span.start_utf16, hit.span.end_utf16);
  };
  assert.equal(
    sliceOf("bold_label_bullets", "signals.bold_label_bullets"),
    "- **Speed:** loads fast on rural connections\n" +
    "- **Cost:** cheap to run month to month\n" +
    "- **Support:** answered quickly by real people",
  );
  assert.equal(sliceOf("emoji_decoration_astral", "signals.emoji_decoration"), "\u{1F680}");
  assert.equal(
    sliceOf("directive_colon_bullets", "signals.directive_colon_bullets"),
    "- Ensure backups run nightly:",
  );
  assert.equal(sliceOf("staccato_fragments", "signals.staccato_fragments"), "It works. It scales. It lasts.");
  assert.equal(sliceOf("transition_stacking", "signals.transition_stacking"), "Moreover,");
});
