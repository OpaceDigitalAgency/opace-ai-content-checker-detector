/** Mechanically ported from the website evidence implementation, 5 September 2026. Canonical portable source; measurement logic unchanged. */
/**
 * Writing-signal rules that have earned a place beside the phrase rows: a
 * passage from the reader's own draft, the measured rates on both sides, and
 * their denominators.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not the verdict, and it is not evidence for the verdict. The whole
 * named-rule tier stopped contributing to the authorship reading on 28 August
 * 2026, because measured on the fresh long-form corpus it reaches 45.1% of
 * machine writing while flagging 24.8% of human writing. Nothing here changes
 * that. These rows say how much more often a pattern appears in machine
 * writing across two named corpora, and nothing else. People write every one
 * of them.
 *
 * WHY SO FEW RULES SURVIVE
 * ------------------------
 * The pack has 116 named rules, 95 of which fire on at least one AI document.
 * Three filters run over them, in this order, and each is a documented finding
 * rather than a preference:
 *
 *  1. **Discrimination.** A rule qualifies on the lower bound of a 95%
 *     confidence interval on its likelihood ratio, not on the point estimate,
 *     so a rule that looks strong on a handful of documents does not qualify.
 *     Thirteen live rules run measurably backwards -- they fire MORE on human
 *     writing -- and those belong on the research pages, never here.
 *
 *  2. **Format-dependence.** Excluded however high the ratio. `markdown-bold`
 *     measures a likelihood ratio near 900 and is not an authorship signal at
 *     all: the AI corpora are raw model output and the human corpora are
 *     plain prose, so the ratio measures which corpus a document came from.
 *     The repository has established this three times over -- most directly in
 *     `stripped-eval`, where normalising markdown away takes the rule tier
 *     from AUROC 0.9302 to 0.7108, and in `signal-science`, where WITHHOLDING
 *     formatting features raised a transparent scorecard from 62.5% to 72.1%
 *     detection. A reader who pastes through an editor loses the signal
 *     entirely, which is the same fact from the user's side.
 *
 *  3. **Quotability.** A panel whose purpose is quoting the reader's own words
 *     may only hold rules that can quote them. Whole-document observations
 *     (passive share, type-token ratio, sentence flatness) and single-code-
 *     point anchors carry no passage, so `hasPassageSpan` is false for them
 *     and they are listed by the interface elsewhere rather than shown here.
 *
 * WHAT THAT LEAVES, AND WHAT IT IS WORTH
 * --------------------------------------
 * Six rules. On a document they are sparse: measured across 5,743 AI and 4,353
 * human documents, 73.1% of the MACHINE-written documents show none of them at
 * all, and the mean count is 0.29. That is why this is not a panel of its own.
 * It is extra rows for the phrase panel, which is the same kind of object and
 * carries the same caveats.
 *
 * The merge is what justifies the work. The two sources are close to
 * independent -- 7.2% of AI documents carry both against 5.7% expected if they
 * were independent -- so together they leave a row on 40.8% of AI documents
 * where phrases alone manage 21.2%. The cost is on the human side and is
 * printed rather than buried: 11.4% of human documents carry at least one row,
 * against 4.3% for phrases alone.
 *
 * Relaxing the bar was measured and rejected. At a lower bound of 1.5 three
 * more rules qualify and the per-document mean moves from 0.29 to 0.31, so the
 * strictness costs almost nothing and the looser bar buys almost nothing.
 *
 * Sources: `tests/battery/rule-liveness.json` in the engine repository, copied
 * verbatim to `src/data/content-integrity-rule-liveness.json`; the reasoning
 * and the backwards rules in `docs/research-drafts/rules-that-run-backwards.md`;
 * the union figures reproduced by `docs/measurements/rule-tell-aggregates.mjs`
 * and recorded in `docs/measurements/RULE-TELL-AGGREGATES-2026-08-31.md`, both
 * in the engine repository.
 */
import { hasPassageSpan } from "./finding-spans.mjs";
/**
 * The lower bound of the 95% interval a rule must clear. See the header: 1.5
 * was measured and adds three rules worth 0.02 findings per document.
 */
export const DISCRIMINATION_BAR = 2;
/**
 * Rules whose ratio measures markup rather than writing. Excluded however high
 * the ratio, because an editor paste that strips the markers removes the
 * signal and the corpora differ in format as well as in authorship.
 */
const FORMAT_DEPENDENT = new Set([
    "signals.markdown_bold", "signals.markdown_heading", "signals.markdown_furniture",
    "signals.formatting", "signals.bold_label_bullets", "signals.heading_inflation",
    "signals.bullet_np_list", "signals.emoji_decoration", "signals.arrow_decoration",
    "signals.directive_colon_bullets", "signals.escaped_markup_literal",
    "signals.title_case_header", "signals.hashtag_stuff", "signals.uniform_list_items",
    "signals.smart_punct_signature", "signals.em_dash_density"
]);
/**
 * Rules that never produce a passage a reader can be shown, measured by running
 * `hasPassageSpan` over every finding in the four corpora rather than assumed
 * from the rule's name. Kept as data so the runtime gate below is a
 * belt-and-braces check rather than the only thing standing between a reader
 * and a one-character highlight.
 */
const CANNOT_QUOTE = new Set([
    "signals.setup_expansion_cadence", "signals.uniform_sections", "signals.low_ttr",
    "signals.cross_para_burstiness", "signals.adjacent_lemma_repeat", "signals.low_specificity",
    "signals.passive_ratio", "signals.lexical_register_distance", "signals.contrast_density",
    "signals.quote_inconsistency", "signals.conditional_compression", "signals.mic_drop_paragraph",
    "signals.sentence_length_spectral_flatness", "signals.punct_distribution",
    "signals.sentence_flatline", "signals.normalization_flag", "signals.uniformity",
    "signals.fnword_trigram_entropy", "signals.focal_density", "signals.proximity_cluster",
    "signals.emotional_flatline"
]);
/**
 * Katz 95% interval on a ratio of two proportions, with the Haldane-Anscombe
 * 0.5 correction so a zero cell does not produce an infinity. Always computed,
 * so every rule is gated and ordered on the same footing; `printable` says
 * whether the interval is fit to show a reader.
 */
export const interval = (aiFired, humanFired, { ai, human }) => {
    const ratio = ((aiFired + 0.5) / (ai + 1)) / ((humanFired + 0.5) / (human + 1));
    const se = Math.sqrt(1 / (aiFired + 0.5) - 1 / (ai + 1) + 1 / (humanFired + 0.5) - 1 / (human + 1));
    const low = Math.exp(Math.log(ratio) - 1.96 * se);
    const high = Math.exp(Math.log(ratio) + 1.96 * se);
    // The correction makes a bound computable when a cell is zero, and it is
    // sound enough to GATE and ORDER on. It is not sound enough to PRINT: an
    // interval of 2.1x to 562x tells a reader nothing except that the corpus
    // held no counter-example. Those rules report their two counts instead.
    return { low, high, printable: aiFired > 0 && humanFired > 0 };
};
const shorten = (id) => id.replace(/^(signals|style)\./, "").replace(/_/g, "-");
/**
 * The qualifying rules, derived from a liveness register. Nothing here is a
 * retyped count and nothing is a hand-picked list: change the register and this
 * set changes with it.
 *
 * The register arrives as an argument rather than as a JSON import so that this
 * module stays a set of pure functions a unit test can exercise. The binding
 * lives in `rule-tell-table.ts`, which is the same split `phrase-ratios.ts` and
 * `phrase-table.ts` already use and for the same reason.
 */
export const qualifyingTellsIn = (liveness, bar = DISCRIMINATION_BAR) => {
    const denominators = {
        ai: liveness.denominators.ai_documents,
        human: liveness.denominators.human_documents
    };
    if (!denominators.ai || !denominators.human) {
        throw new Error("The liveness register carries no denominators. A rate with no denominator is the failure this whole layer exists to stop, so nothing is derived from it.");
    }
    const nonFiring = new Set(Object.keys(liveness.inactive).filter(key => key !== "_note"));
    return Object.entries(liveness.rules)
        .filter(([id]) => !nonFiring.has(id) && !FORMAT_DEPENDENT.has(id) && !CANNOT_QUOTE.has(id))
        .map(([id, rule]) => {
        const bounds = interval(rule.ai_documents_fired, rule.human_documents_fired, denominators);
        return {
            id,
            shortId: shorten(id),
            aiFired: rule.ai_documents_fired,
            humanFired: rule.human_documents_fired,
            ratioLow: bounds.printable ? bounds.low : undefined,
            ratioHigh: bounds.printable ? bounds.high : undefined,
            rank: bounds.low
        };
    })
        // Every rule qualifies the same way, on the corrected lower bound, whether
        // or not that bound is fit to print. A rule with no human fires gets no
        // easier ride than one with them.
        .filter(tell => tell.rank >= bar)
        .sort((left, right) => right.rank - left.rank);
};
/**
 * Rows for the reader's draft, from the engine's own findings.
 *
 * `hasPassageSpan` is re-checked here rather than trusted from the caller. The
 * controller already filters on it before building the draft highlights, but a
 * row that quotes the wrong characters is the failure this panel exists to
 * avoid, and one gate in two places is cheaper than one defect.
 */
export const findRuleTellsIn = (tells, findings, draft) => {
    const byId = new Map(tells.map(tell => [tell.id, tell]));
    const first = new Map();
    for (const finding of findings) {
        const tell = finding.rule_id ? byId.get(finding.rule_id) : undefined;
        if (!tell || !hasPassageSpan(finding))
            continue;
        const existing = first.get(tell.id);
        if (existing) {
            existing.occurrences += 1;
            continue;
        }
        const start = finding.span?.start_utf16 ?? 0;
        const end = finding.span?.end_utf16 ?? 0;
        first.set(tell.id, {
            tell,
            // The reader's own text, sliced from the draft rather than read from the
            // finding, so what is shown is always what they wrote.
            matched: draft.slice(start, end),
            start,
            end,
            occurrences: 1,
            description: finding.message ?? ""
        });
    }
    // Strongest evidence first, then by position, matching the phrase rows so a
    // merged table has one ordering rather than two.
    return [...first.values()].sort((left, right) => right.tell.rank - left.tell.rank || left.start - right.start);
};
export const MERGED_ROW_COUNTS = {
    ai: { documents: 5743, withPhraseRow: 1218, withRuleRow: 1543, withAnyRow: 2345, withBoth: 416 },
    human: { documents: 4353, withPhraseRow: 188, withRuleRow: 326, withAnyRow: 497, withBoth: 17 }
};
const percent = (part, whole) => `${(part / whole * 100).toFixed(1)}%`;
const count = (value) => value.toLocaleString("en-GB");
/**
 * Derive the merged-panel rates, refusing to produce them if the counts no
 * longer describe the register the rest of the panel is built from.
 *
 * This throws rather than warns on purpose. The counts come from a corpus run
 * that cannot be re-derived from the register alone, so a regenerated register
 * with different denominators means these figures are stale and there is no way
 * for this module to notice except by comparing them. A build failure naming
 * the mismatch is the only outcome that cannot ship a wrong number quietly.
 */
export const mergedRowRates = (counts, denominators) => {
    if (counts.ai.documents !== denominators.ai || counts.human.documents !== denominators.human) {
        throw new Error(`The merged-panel figures were measured on ${counts.ai.documents} AI and ${counts.human.documents} human documents, ` +
            `but the liveness register now reports ${denominators.ai} and ${denominators.human}. ` +
            `Re-run the corpus measurement before publishing these rates: they cannot be derived from the register.`);
    }
    for (const side of [counts.ai, counts.human]) {
        if (side.withAnyRow < Math.max(side.withPhraseRow, side.withRuleRow) || side.withAnyRow > side.documents ||
            side.withAnyRow !== side.withPhraseRow + side.withRuleRow - side.withBoth) {
            throw new Error("The merged-panel counts are not a consistent union. A figure that does not add up is not published.");
        }
    }
    const ai = counts.ai, human = counts.human;
    return {
        aiDocumentsWithAnyRow: ai.withAnyRow / ai.documents,
        humanDocumentsWithAnyRow: human.withAnyRow / human.documents,
        phrasesAloneAi: ai.withPhraseRow / ai.documents,
        phrasesAloneHuman: human.withPhraseRow / human.documents,
        basis: `measured across ${count(ai.documents)} machine-written and ${count(human.documents)} human documents, phrase rows and rule tells combined`,
        sentence: `${percent(ai.withAnyRow, ai.documents)} of the ${count(ai.documents)} machine-written documents we measured carry at least one of these rows, ` +
            `and so do ${percent(human.withAnyRow, human.documents)} of the ${count(human.documents)} human ones. ` +
            `People write every pattern listed here.`
    };
};
