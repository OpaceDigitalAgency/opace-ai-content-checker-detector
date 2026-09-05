/** Mechanically ported from the website evidence implementation, 5 September 2026. Canonical portable source; measurement logic unchanged. */
/**
 * Which writing-signal findings may be pointed at in the draft, and which may
 * only be listed.
 *
 * This lived inside the controller's closure, where nothing could test it. It
 * is the rule that stops the interface highlighting the wrong characters, so
 * it now lives where a test can reach it.
 *
 * Two kinds of finding have no passage to show.
 *
 *  1. **Whole-document observations.** The share of passive sentences, the
 *     type-token ratio, the flatness of sentence length. The rule emits
 *     start:null, and the core's toFinding substitutes a [0,1] placeholder so
 *     the span type stays total, publishing evidence.document_level = true
 *     alongside it. Reading that placeholder as a real span highlighted the
 *     first character of the draft and printed it as the matched text, which
 *     is how a whole-document observation came to read as a lone "W".
 *
 *  2. **Single-code-point anchors**, which the first rule does not catch.
 *     Five rules in en-signals v3 — staccato-fragments, bold-label-bullets,
 *     emoji-decoration, directive-colon-bullets and quote-inconsistency —
 *     count something across the document and then anchor the count at one
 *     code unit: the paragraph start, the first emoji, the first mixed quote.
 *     The core sets no document_level flag on those, because the offset is a
 *     real position rather than a placeholder. It is still not a passage. A
 *     one-character highlight labelled "3+ consecutive short fragments" points
 *     a reader at a character that has nothing to do with the finding, and on
 *     a paragraph starting with "Wetlands" it renders as exactly the same lone
 *     "W" the placeholder produced.
 *
 * So the rule is about width, not about which flag the core happened to set: a
 * finding is highlightable when it covers at least one whole word-sized span,
 * which in practice means more than a single code point. Everything narrower
 * is listed with its own evidence.detail sentence and offered no jump.
 */
/** The core's own flag: the rule had no offsets and a placeholder was substituted. */
export const isDocumentLevel = (finding) => finding?.evidence?.document_level === true;
/**
 * How many UTF-16 code units the finding claims. Zero for a missing or
 * inverted span, which is treated as no span at all.
 */
export const spanWidth = (finding) => {
    const span = finding?.span;
    if (!span || typeof span.start_utf16 !== "number" || typeof span.end_utf16 !== "number")
        return 0;
    return Math.max(0, span.end_utf16 - span.start_utf16);
};
/**
 * The narrowest span the draft view will highlight. One UTF-16 code unit is an
 * anchor, not a passage; two is the shortest thing that can be a whole
 * character outside the basic plane and the shortest thing worth a mark.
 */
export const MIN_HIGHLIGHT_WIDTH = 2;
/**
 * True when the finding names a passage a reader can be shown. Everything else
 * is listed rather than marked, and must never be offered a "Show in draft"
 * control: a control that scrolls to the wrong place is worse than no control.
 */
export const hasPassageSpan = (finding) => !isDocumentLevel(finding) && spanWidth(finding) >= MIN_HIGHLIGHT_WIDTH;
/**
 * True when the finding describes the draft as a whole, however the core said
 * so. This is what the interface should key its "listed, not highlighted"
 * treatment off.
 */
export const isWholeDraftObservation = (finding) => !hasPassageSpan(finding);
