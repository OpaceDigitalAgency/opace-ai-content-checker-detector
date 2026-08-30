// Combined verdict (2026.08.8) — three independent axes, never collapsed.
//
// ─── What changed in 2026.08.8, and why ──────────────────────────────
//
// The 2026.08.7 module had a single published `classification` drawn from the
// same three-value scale as the writing-signals score, and several combination
// paths escalated it to `ai_like`. A carrier payload, a run of zero-width
// characters, an interior homoglyph or a watermark hit could therefore make the
// engine say "ai_like" about a draft.
//
// That is a category error, and the independent audit was right to call it one.
// A hidden zero-width character proves text MANIPULATION, not AI ORIGIN. It
// says a tool wrote into the bytes after somebody typed them; it says nothing
// at all about who or what composed the sentences. Any of these can put a
// zero-width space in a paragraph: a CMS paste handler, a translation memory,
// a DTP export, a plagiarism-evasion service, a mail client — or a person doing
// it deliberately to a wholly human document.
//
// OBJECTIVE.md records the binding decision behind this rewrite: the 113-rule
// writing-signals tier is demoted to editorial suggestions and stops
// contributing to any AI judgement, because measured on 5,558 fresh long-form
// documents it detected 45.1% of AI writing while flagging 24.8% of human
// writing — worse than the trained model on both axes at once. Only the trained
// model gives an authorship reading.
//
// So this module now publishes three readings and never reduces them to one:
//
//   AXIS A — `ai_probability`. How likely it is that a machine composed this
//            text. ONLY a trained model may set this. No character finding, no
//            writing rule and no watermark hit may write to it. With no model
//            reading supplied it is `not_assessed`, and `not_assessed` is an
//            honest answer, not a default of "human".
//
//   AXIS B — `text_integrity`. What was done TO the text: invisible carriers,
//            homoglyph substitution, private-use clusters, watermark marks and
//            provenance. It reports manipulation. It is allowed to say "this
//            text contains hidden characters". It is never allowed to say, or
//            to imply, "this is AI".
//
//   AXIS C — `editorial`. Writing suggestions from the named rules: generic
//            phrasing, unusually uniform structure. Editorial feedback only.
//
// The evidence streams feeding axis B are:
//   (b1) invisible-Unicode carrier findings (unicode/inspect.ts),
//   (b2) homoglyph findings (unicode/inspect.ts),
//   (b3) the watermark scan, and only when a signal is genuinely found.
//
// Protected spans are deliberately NOT an input to any axis. They are facts the
// editor must preserve, not evidence about origin; conflating the two was a
// separate reported defect and must not be reintroduced here.
//
// Four contracts bind this module:
//   1. Axis independence. Evidence from one axis may never set, raise or lower
//      another axis. `assertAxisIndependence` enforces this at runtime and
//      throws rather than publishing a collapsed verdict.
//   2. Evidence quality, not enthusiasm. Only characters with near-zero
//      innocent explanation are allowed to raise the integrity status. Every
//      character with a documented legitimate use (typographic spaces,
//      bidirectional controls, script-specific format marks, emoji joiners and
//      variation selectors that survived no context exemption, edge homoglyphs
//      in multilingual text) is classified as supporting or excluded and can
//      never raise a status on its own.
//   3. Raise-only within an axis. An integrity finding raises the integrity
//      status and names itself in `applied`; nothing ever lowers it silently.
//   4. The honesty contract. No path presents any finding as proof of
//      authorship, no integrity or editorial string uses the vocabulary of AI
//      authorship, and every path contributes its own limitation line.

import type { EditorialSignalsResult, SignalsClassification } from "../patterns/en-signals-v2.js";
import type { UnicodeFinding } from "../unicode/inspect.js";

export const COMBINED_VERDICT_VERSION = "combined:2026.08.8";

/** Evidence tier assigned to a single character finding. */
export type EvidenceTier = "deliberate" | "supporting" | "excluded";

/** Watermark scan outcome. Only "detected" is treated as evidence. */
export type WatermarkOutcome = "detected" | "not_detected" | "not_available" | "not_supported";

/**
 * AXIS A. The only authorship reading the engine publishes, and the only place
 * the words "AI" and "human" may appear as a verdict. `not_assessed` means no
 * trained model ran; it never means "human".
 */
export type AiReading = "ai_like" | "uncertain" | "human_like" | "not_assessed";

/**
 * AXIS B. What was done to the text.
 *  - `clean`       nothing reportable, or only characters with a documented
 *                  legitimate use.
 *  - `attention`   something is present that has no ordinary authoring
 *                  explanation and is worth an editor's eye.
 *  - `manipulated` the shape of a deliberate payload or a generator's mark:
 *                  something wrote into this text on purpose.
 */
export type IntegrityStatus = "clean" | "attention" | "manipulated";

/** AXIS C. How much editorial feedback the named writing rules produced. */
export type SuggestionLevel = "none" | "some" | "many";

export type ConfidenceBand = "low" | "medium" | "high";

export interface CombinedEvidenceItem {
  /** The finding id it came from, so a UI can link the verdict back to the row. */
  finding_id: string;
  code_point: string;
  name: string;
  tier: EvidenceTier;
  /** Why this character landed in this tier. */
  rationale: string;
}

/** One integrity finding on axis B. Never carries an authorship claim. */
export interface IntegrityFinding {
  /** Stable id of the rule that fired, so a UI can link back to the row. */
  applied: string;
  /** The status this finding argues for on its own. */
  status: IntegrityStatus;
  /** Plain-English description of what was found in the text. */
  reason: string;
}

/** A trained-model reading. The ONLY permitted source of an AI probability. */
export interface ModelReading {
  /** Model identifier, e.g. "local-signals-cycle2". */
  name: string;
  /** Model/artefact version string. */
  version?: string;
  /** Probability in [0,1] that a machine composed this text. */
  probability: number;
  /** The operating point the model was calibrated to, in the shipped runtime. */
  threshold: number;
  /** The band below which the model declines to give a reading, e.g. a word floor. */
  below_reliable_range?: boolean;
}

export interface CombinedVerdictInput {
  /** The writing-signals result. Omitted when style.patterns was not requested. */
  signals?: EditorialSignalsResult;
  /** Every Unicode finding, carriers and homoglyphs alike. */
  unicodeFindings?: readonly UnicodeFinding[];
  /** The inspected text. Required to grade homoglyphs and carrier runs; without
   *  it homoglyphs are graded down to supporting and runs are not detected. */
  text?: string;
  /** The watermark scan outcome, when a watermark method ran. */
  watermark?: { outcome: WatermarkOutcome };
  /** A trained-model reading, when one ran. Nothing else may set axis A. */
  model?: ModelReading;
}

export interface CombinedVerdictResult {
  /**
   * AXIS A — the AI reading. Set only from `input.model`. Character evidence,
   * writing rules and the watermark scan can never reach this object.
   */
  ai_probability: {
    /** The model that produced the reading, or null when none ran. */
    source: string | null;
    /** The model's probability, or null when no model ran. */
    value: number | null;
    /** The operating point the reading was compared against. */
    threshold: number | null;
    reading: AiReading;
    confidence: ConfidenceBand | "not_assessed";
    reason: string;
  };
  /**
   * AXIS B — text integrity and provenance. Reports manipulation of the text.
   * It may say the text contains hidden characters. It never says the text is AI.
   */
  text_integrity: {
    status: IntegrityStatus;
    /** The finding that set the status, or null when the status is `clean`. */
    applied: string | null;
    reason: string;
    /** Every integrity finding that fired, in precedence order. */
    findings: IntegrityFinding[];
    character_evidence: {
      /** Deliberate carriers with near-zero innocent explanation. */
      deliberate: CombinedEvidenceItem[];
      /** Characters that corroborate but never raise a status on their own. */
      supporting: CombinedEvidenceItem[];
      /** Characters with a documented legitimate use, excluded from the status. */
      excluded: CombinedEvidenceItem[];
      /** Homoglyph substitutions inside an otherwise-Latin word. */
      interior_homoglyph_count: number;
      /** Longest run of adjacent invisible carriers with no visible character between them. */
      longest_carrier_run: number;
    };
    watermark: { outcome: WatermarkOutcome; counted_as_evidence: boolean };
    confidence: ConfidenceBand;
  };
  /**
   * AXIS C — editorial suggestions from the named writing rules. Feedback on
   * phrasing and structure. Never an authorship judgement, never counted as one.
   */
  editorial: {
    suggestion_level: SuggestionLevel;
    /** The rules' own score, carried through and never rewritten here. */
    score: number | null;
    /** The distinct writing-rule categories that fired, verbatim from the rules tier. */
    categories_hit: readonly string[] | null;
    finding_count: number | null;
    confidence: ConfidenceBand | "not_assessed";
    reason: string;
    /**
     * The rules' internal three-way distribution, published verbatim for
     * transparency. Its `ai_like` member is a rules-tier artefact and is NOT an
     * AI probability; axis A is the only AI probability the engine publishes.
     */
    rule_probabilities: EditorialSignalsResult["probabilities"] | null;
  };
  /** Which streams were available to this verdict. */
  inputs_considered: Array<"model" | "writing_signals" | "invisible_unicode" | "homoglyphs" | "watermark">;
  version: string;
  /** Plain-English claim boundaries. Always includes the axis and authorship boundaries. */
  limitations: [string, ...string[]];
  description: string;
}

const DESCRIPTION =
  "Three independent readings, published side by side and never merged: the AI probability, which only a trained " +
  "model may set; text-integrity and provenance findings, which describe what was done to the text; and editorial " +
  "suggestions about phrasing and structure. Integrity findings describe manipulation, not authorship.";

const AXES_LIMIT =
  "These three readings are independent and are never combined into a single verdict. Hidden characters, " +
  "homoglyph substitutions and watermark marks show that something was done to the text; they are not evidence " +
  "of AI authorship. Only the trained model gives an AI reading.";
const AUTHORSHIP_LIMIT =
  "Authorship cannot be proved from these checks; character evidence shows how text was produced or pasted, not by whom.";
const ABSENCE_LIMIT =
  "Absence of carrier characters is not evidence of human authorship. Most published prose carries none, and any copy-paste, CMS save or format strip removes them.";
const PROTECTED_LIMIT =
  "Protected spans are excluded from this verdict by design: they are facts to preserve, not evidence about origin.";
const EDITORIAL_LIMIT =
  "Writing suggestions are editorial feedback on phrasing and structure. Measured on 5,558 fresh long-form " +
  "documents the named rules flagged 24.8% of human writing, so they say nothing about who or what wrote a draft " +
  "and are never counted toward the AI reading.";
const NO_MODEL_LIMIT =
  "No trained model ran on this text, so no AI probability is available. That is reported as not assessed, and " +
  "not assessed does not mean human.";

const INTEGRITY_RANK: Record<IntegrityStatus, number> = { clean: 0, attention: 1, manipulated: 2 };

// ─── Evidence tiers ──────────────────────────────────────────────────
//
// Tiering is by code point, applied AFTER unicode/inspect.ts has already run
// its context exemptions. A zero-width joiner inside an emoji sequence or
// between cursive letters never reaches this module at all; one that does has
// already failed every documented innocent explanation the engine knows.

/** Deliberate carriers: no ordinary authoring tool emits these into prose. */
function isDeliberateCarrier(cp: number): boolean {
  return (
    cp === 0x200b || // ZERO WIDTH SPACE
    cp === 0x200c || // ZWNJ that survived the cursive/Indic joining exemption
    cp === 0x200d || // ZWJ that survived the emoji and joining-script exemptions
    cp === 0x2060 || // WORD JOINER
    (cp >= 0x206a && cp <= 0x206f) || // deprecated format characters
    (cp >= 0xfe00 && cp <= 0xfe0f) || // variation selectors past the emoji/CJK exemption
    (cp >= 0xe0100 && cp <= 0xe01ef) || // supplementary variation selectors past the CJK exemption
    cp === 0xe0001 || // LANGUAGE TAG
    (cp >= 0xe0020 && cp <= 0xe007f) // tag characters (flag sequences exempted separately)
  );
}

function isVariationSelector(cp: number): boolean {
  return (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);
}

/** Corroborating characters: unusual in prose, but with a documented innocent path. */
function isSupportingCarrier(cp: number): boolean {
  return (
    cp === 0x00ad || // SOFT HYPHEN - justified typography and word-processor exports
    cp === 0x034f || // COMBINING GRAPHEME JOINER - rare collation and diacritic ordering
    cp === 0xfeff || // BYTE ORDER MARK - routine file-encoding artefact
    (cp >= 0x2061 && cp <= 0x2064) || // invisible operators - typeset mathematics
    (cp >= 0xfff9 && cp <= 0xfffb) || // interlinear annotation - Japanese ruby pipelines
    (cp >= 0x180b && cp <= 0x180f) || // Mongolian free variation selectors and vowel separator
    isPrivateUse(cp)
  );
}

export function isPrivateUse(cp: number): boolean {
  return (cp >= 0xe000 && cp <= 0xf8ff) || (cp >= 0xf0000 && cp <= 0xffffd) || (cp >= 0x100000 && cp <= 0x10fffd);
}

/** Invisible carriers for run detection: deliberate plus supporting, excluding
 *  private-use characters, which occupy visible width in the fonts that map them. */
function isInvisibleCarrier(cp: number): boolean {
  return isDeliberateCarrier(cp) || (isSupportingCarrier(cp) && !isPrivateUse(cp));
}

const DELIBERATE_RATIONALE = "No ordinary authoring or publishing tool emits this character into prose, and every documented legitimate context for it was checked and did not apply.";
const SUPPORTING_RATIONALE = "Unusual in prose but with a documented innocent origin, so it corroborates other evidence and never raises a status on its own.";
const EXCLUDED_RATIONALE = "This character has a documented legitimate use in typography, multilingual text or encoding, so it is reported but excluded from the integrity status.";
const PUA_RATIONALE = "A private-use character carries meaning only under a private agreement. A single one is common in icon fonts and vendor logos, so one alone only corroborates.";

// ─── Homoglyph grading ───────────────────────────────────────────────

const LATIN_LETTER = /\p{Script=Latin}/u;

/**
 * An INTERIOR homoglyph has a Latin letter immediately either side: a
 * substitution inside an otherwise-Latin word. Genuinely multilingual text
 * produces EDGE homoglyphs instead - a Greek or Cyrillic letter at a token
 * boundary, next to a hyphen, digit or space, as in scientific notation such
 * as alpha-hydroxylation. Edge homoglyphs never raise a status.
 */
function isInteriorHomoglyph(text: string, finding: UnicodeFinding): boolean {
  const start = finding.span.start_utf16;
  const end = finding.span.end_utf16;
  if (start <= 0 || end >= text.length) return false;
  return LATIN_LETTER.test(text[start - 1]!) && LATIN_LETTER.test(text[end]!);
}

// ─── Tag-character flag exemption ────────────────────────────────────

const BLACK_FLAG = 0x1f3f4;

/**
 * Subdivision flag emoji are a legitimate tag run: BLACK FLAG, then tag
 * characters, then CANCEL TAG. A tag character inside such a sequence is
 * excluded; a tag run anywhere else is the classic covert payload carrier.
 */
function tagIsInFlagSequence(text: string, index: number): boolean {
  // Every tag character and the black flag itself is a surrogate pair, so the
  // run is walked two UTF-16 units at a time.
  let i = index;
  while (i >= 2) {
    const previous = text.codePointAt(i - 2);
    if (previous !== undefined && previous >= 0xe0020 && previous <= 0xe007f) { i -= 2; continue; }
    break;
  }
  if (i < 2) return false;
  return text.codePointAt(i - 2) === BLACK_FLAG;
}

// ─── Axis C: editorial banding ───────────────────────────────────────
//
// The rules tier still emits its historic three-way label. That label is a
// rules-tier artefact and its `ai_like` value is NOT an authorship reading, so
// it is translated here into neutral editorial vocabulary and never leaves this
// module wearing its old name.

const SUGGESTION_LEVEL: Record<SignalsClassification, SuggestionLevel> = {
  human_like: "none",
  mixed_signals: "some",
  ai_like: "many",
};

const SUGGESTION_REASON: Record<SuggestionLevel, string> = {
  none: "The named writing rules found nothing worth suggesting a change to.",
  some: "The named writing rules produced some editorial suggestions about phrasing or structure. Genuine human copy triggers them routinely.",
  many: "The named writing rules produced a lot of editorial suggestions about phrasing and structure. That is a comment on the writing, not on who wrote it: measured on fresh long-form documents these rules flag roughly one human document in four.",
};

// ─── Combination ─────────────────────────────────────────────────────

/**
 * Compute the three independent readings. Nothing here merges them: each axis
 * is derived only from its own evidence, and `assertAxisIndependence` throws
 * rather than let a collapsed verdict be published.
 */
export function computeCombinedVerdict(input: CombinedVerdictInput): CombinedVerdictResult {
  const findings = input.unicodeFindings ?? [];
  const text = input.text;
  const signals = input.signals;
  const watermarkOutcome: WatermarkOutcome = input.watermark?.outcome ?? "not_available";

  const deliberate: CombinedEvidenceItem[] = [];
  const supporting: CombinedEvidenceItem[] = [];
  const excluded: CombinedEvidenceItem[] = [];
  let interiorHomoglyphs = 0;
  const carrierPositions: number[] = [];

  for (const finding of findings) {
    const cp = codePointOf(finding);
    const isHomoglyph = finding.id.includes("_homoglyph_");
    if (isHomoglyph) {
      // Without the text we cannot tell a substitution from multilingual text,
      // so we grade down rather than guess.
      const interior = text !== undefined && isInteriorHomoglyph(text, finding);
      if (interior) {
        interiorHomoglyphs++;
        deliberate.push(item(finding, "deliberate", "A Latin-lookalike character sits between two Latin letters, which is a substitution inside a Latin word rather than multilingual text."));
      } else {
        supporting.push(item(finding, "supporting", "A Latin-lookalike character at a token boundary, which is the shape genuinely multilingual and scientific text produces."));
      }
      continue;
    }
    if (cp === null) { excluded.push(item(finding, "excluded", EXCLUDED_RATIONALE)); continue; }
    if (cp >= 0xe0020 && cp <= 0xe007f && text !== undefined && tagIsInFlagSequence(text, finding.span.start_utf16)) {
      excluded.push(item(finding, "excluded", "This tag character belongs to a subdivision flag emoji sequence, which is a legitimate tag run."));
      continue;
    }
    // unicode/inspect.ts downgrades a variation selector to severity "note" when
    // it follows a base character that commonly takes registered glyph variants
    // (Han, Mongolian). That is an ideographic variation sequence, not a carrier.
    if (isVariationSelector(cp) && finding.severity === "note") {
      excluded.push(item(finding, "excluded", "This variation selector follows a base character that commonly takes registered glyph variants, which is its documented legitimate use."));
      continue;
    }
    if (isInvisibleCarrier(cp)) carrierPositions.push(finding.span.start_utf16);
    if (isDeliberateCarrier(cp)) { deliberate.push(item(finding, "deliberate", DELIBERATE_RATIONALE)); continue; }
    if (isSupportingCarrier(cp)) { supporting.push(item(finding, "supporting", isPrivateUse(cp) ? PUA_RATIONALE : SUPPORTING_RATIONALE)); continue; }
    excluded.push(item(finding, "excluded", EXCLUDED_RATIONALE));
  }

  // Two or more private-use characters is no longer a stray vendor logo.
  const privateUseCount = supporting.filter((x) => { const cp = codePointFromLabel(x.code_point); return cp !== null && isPrivateUse(cp); }).length;

  const longestRun = longestAdjacentRun(carrierPositions, text);
  const deliberateCount = deliberate.length;
  const tagCharacters = deliberate.filter((x) => { const cp = codePointFromLabel(x.code_point); return cp !== null && cp >= 0xe0001 && cp <= 0xe007f; }).length;

  const inputs: CombinedVerdictResult["inputs_considered"] = [];
  if (input.model) inputs.push("model");
  if (signals) inputs.push("writing_signals");
  if (findings.some((f) => !f.id.includes("_homoglyph_"))) inputs.push("invisible_unicode");
  if (findings.some((f) => f.id.includes("_homoglyph_"))) inputs.push("homoglyphs");
  if (watermarkOutcome === "detected") inputs.push("watermark");

  const limitations: string[] = [AXES_LIMIT, AUTHORSHIP_LIMIT, ABSENCE_LIMIT, PROTECTED_LIMIT];

  // ── AXIS B: text integrity and provenance ───────────────────────────
  //
  // Every finding here describes what was DONE to the text. None of them may
  // use the vocabulary of authorship, and none of them reaches axis A.

  const integrityFindings: IntegrityFinding[] = [];

  // (b3) Watermark, and only when a signal was genuinely found. A watermark is
  // provenance: it says a marked generator produced these tokens at some point.
  // It is not an AI probability and it does not survive an unknown amount of
  // human rewriting, so it stays on the provenance axis.
  if (watermarkOutcome === "detected") {
    integrityFindings.push({
      applied: "watermark_signal",
      status: "manipulated",
      reason: "A watermark detector reported a positive signal, so this text carries a generator's mark. That is provenance evidence about the text, and it is reported here rather than as an AI probability.",
    });
    limitations.push("A watermark signal identifies the generator that marked the text, not the person who published it, and says nothing about later human editing. It is not, on its own, an AI reading.");
  }

  // A payload, not an artefact: a run of adjacent carriers, a tag run outside a
  // flag sequence, or a heavy accumulation of deliberate carriers.
  if (longestRun >= 3 || tagCharacters >= 2 || deliberateCount >= 8) {
    integrityFindings.push({
      applied: "carrier_payload",
      status: "manipulated",
      reason: describePayload(longestRun, tagCharacters, deliberateCount),
    });
    limitations.push("A carrier payload shows that something deliberately encoded data into this text. It does not identify what encoded it, it can be inserted by any tool in the chain including one the author never saw, and it is not evidence that a machine wrote the words.");
  }

  // (b1) Deliberate invisible carriers on their own.
  if (deliberateCount - interiorHomoglyphs >= 1) {
    integrityFindings.push({
      applied: "carrier_deliberate",
      status: "attention",
      reason: `This text contains an invisible character with no ordinary authoring explanation (${describeEvidence(deliberate.filter((x) => !x.rationale.startsWith("A Latin-lookalike")))}). Every documented legitimate context for it was checked and did not apply.`,
    });
    limitations.push("Invisible carriers can be introduced by any tool that touched the text after it was written, including editors, CMS filters and paste handlers, so they place the text in a pipeline rather than with an author, and they say nothing about whether a person or a machine composed it.");
  }

  // (b2) Homoglyph substitution inside a Latin word.
  if (interiorHomoglyphs >= 1) {
    integrityFindings.push({
      applied: "homoglyph_substitution",
      status: "attention",
      reason: `${interiorHomoglyphs} Latin-lookalike character${interiorHomoglyphs === 1 ? " sits" : "s sit"} between Latin letters inside a word. Genuinely multilingual and scientific text places such characters at token boundaries instead.`,
    });
    limitations.push("Homoglyph substitution indicates the text passed through a tool that rewrites characters. It is never corrected automatically, it does not establish intent or authorship, and it is not an AI signal.");
  }

  // Two or more private-use characters stops being a stray vendor glyph.
  if (privateUseCount >= 2) {
    integrityFindings.push({
      applied: "private_use_cluster",
      status: "attention",
      reason: `${privateUseCount} private-use characters are present. One is a routine icon-font or vendor logo; a cluster is a private encoding.`,
    });
    limitations.push("Private-use characters carry meaning only under a private agreement, which this engine cannot read, so their presence is described and not interpreted.");
  }

  let integrityStatus: IntegrityStatus = "clean";
  let integrityApplied: string | null = null;
  let integrityReason = "No hidden characters, homoglyph substitutions or watermark marks were found that lack an ordinary explanation.";
  for (const finding of integrityFindings) {
    if (INTEGRITY_RANK[finding.status] > INTEGRITY_RANK[integrityStatus]) {
      integrityStatus = finding.status;
      integrityApplied = finding.applied;
      integrityReason = finding.reason;
    }
  }

  // Character evidence is measured rather than inferred, so a finding carries
  // real confidence about the TEXT. It never carries confidence about authorship.
  const integrityConfidence: ConfidenceBand =
    watermarkOutcome === "detected" || integrityStatus === "manipulated" ? "high"
    : integrityStatus === "attention" ? "medium"
    : "low";

  // ── AXIS A: the AI reading. Only `input.model` may set it ───────────

  const model = input.model;
  const aiProbability: CombinedVerdictResult["ai_probability"] = model
    ? {
        source: model.version ? `${model.name}@${model.version}` : model.name,
        value: model.probability,
        threshold: model.threshold,
        reading: model.below_reliable_range
          ? "not_assessed"
          : model.probability >= model.threshold
            ? "ai_like"
            : model.probability >= model.threshold * 0.5
              ? "uncertain"
              : "human_like",
        confidence: model.below_reliable_range ? "not_assessed" : modelConfidence(model),
        reason: model.below_reliable_range
          ? "The trained model ran but this text is outside the length range where its reading is reliable, so no AI probability is published."
          : `The trained model scored this text at ${(model.probability * 100).toFixed(1)}% against an operating point of ${(model.threshold * 100).toFixed(1)}%. This is the only AI reading the engine publishes.`,
      }
    : {
        source: null,
        value: null,
        threshold: null,
        reading: "not_assessed",
        confidence: "not_assessed",
        reason: "No trained model ran on this text, so no AI probability is available. Character findings and writing rules cannot supply one.",
      };
  if (!model) limitations.push(NO_MODEL_LIMIT);
  if (model?.below_reliable_range) {
    limitations.push("Detection falls away on short text: measured at 67% at 200 words, 50% at 150 and 19% at 100. Below the reliable range no reading is published rather than a weak one.");
  }

  // ── AXIS C: editorial suggestions ───────────────────────────────────

  const suggestionLevel: SuggestionLevel = signals ? SUGGESTION_LEVEL[signals.classification] : "none";
  const editorial: CombinedVerdictResult["editorial"] = {
    suggestion_level: suggestionLevel,
    score: signals?.score ?? null,
    categories_hit: signals?.categoriesHit ?? null,
    finding_count: signals?.findingCount ?? null,
    confidence: signals?.confidence ?? "not_assessed",
    reason: signals
      ? SUGGESTION_REASON[suggestionLevel]
      : "The named writing rules were not requested for this text.",
    rule_probabilities: signals?.probabilities ?? null,
  };
  if (signals) limitations.push(EDITORIAL_LIMIT);

  const result: CombinedVerdictResult = {
    ai_probability: aiProbability,
    text_integrity: {
      status: integrityStatus,
      applied: integrityApplied,
      reason: integrityReason,
      findings: integrityFindings,
      character_evidence: {
        deliberate,
        supporting,
        excluded,
        interior_homoglyph_count: interiorHomoglyphs,
        longest_carrier_run: longestRun,
      },
      watermark: { outcome: watermarkOutcome, counted_as_evidence: watermarkOutcome === "detected" },
      confidence: integrityConfidence,
    },
    editorial,
    inputs_considered: inputs,
    version: COMBINED_VERDICT_VERSION,
    limitations: dedupe(limitations) as [string, ...string[]],
    description: DESCRIPTION,
  };
  assertAxisIndependence(result, input);
  return result;
}

/**
 * Contract 1, enforced rather than documented. Publishing a collapsed verdict is
 * a correctness failure, so it throws instead of degrading quietly.
 *
 * The three things that must never happen again:
 *   1. an AI reading that no model produced;
 *   2. an integrity or editorial string that talks about AI or human authorship;
 *   3. an integrity status that character evidence and the watermark scan do not
 *      independently justify.
 */
export function assertAxisIndependence(result: CombinedVerdictResult, input: CombinedVerdictInput): void {
  if (!input.model && result.ai_probability.reading !== "not_assessed") {
    throw new Error("combined_verdict_axis_violation: an AI reading was published without a trained model");
  }
  if (!input.model && result.ai_probability.value !== null) {
    throw new Error("combined_verdict_axis_violation: an AI probability was published without a trained model");
  }
  const evidence = result.text_integrity.character_evidence;
  const hasCharacterEvidence =
    evidence.deliberate.length > 0 || result.text_integrity.watermark.counted_as_evidence ||
    evidence.supporting.filter((x) => { const cp = codePointFromLabel(x.code_point); return cp !== null && isPrivateUse(cp); }).length >= 2;
  if (result.text_integrity.status !== "clean" && !hasCharacterEvidence) {
    throw new Error("combined_verdict_axis_violation: the integrity status was raised without character or watermark evidence");
  }
  // No integrity or editorial string may make an authorship claim. `AI` is
  // matched as a standalone token so ordinary words are not caught.
  const AUTHORSHIP_VOCABULARY = /\b(?:ai[-\s]?(?:like|generated|written|authored)|likely\s+ai|machine[-\s]written|human[-\s]?(?:like|written|authored))\b/i;
  const strings = [
    result.text_integrity.reason,
    ...result.text_integrity.findings.map((f) => f.reason),
    result.editorial.reason,
  ];
  for (const line of strings) {
    if (AUTHORSHIP_VOCABULARY.test(line)) {
      throw new Error(`combined_verdict_axis_violation: an integrity or editorial string made an authorship claim: ${line.slice(0, 80)}`);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function modelConfidence(model: ModelReading): ConfidenceBand {
  // Distance from the operating point, not the raw probability: a score sitting
  // on the threshold is the least confident reading the model can give.
  const distance = Math.abs(model.probability - model.threshold);
  if (distance >= 0.3) return "high";
  if (distance >= 0.1) return "medium";
  return "low";
}

function item(finding: UnicodeFinding, tier: EvidenceTier, rationale: string): CombinedEvidenceItem {
  return { finding_id: finding.id, code_point: finding.code_point, name: finding.name, tier, rationale };
}

function codePointFromLabel(label: string): number | null {
  const parsed = Number.parseInt(label.replace(/^U\+/, ""), 16);
  return Number.isFinite(parsed) ? parsed : null;
}

function codePointOf(finding: UnicodeFinding): number | null {
  if (finding.name === "UNPAIRED SURROGATE") return null;
  return codePointFromLabel(finding.code_point);
}

/**
 * Longest run of invisible carriers with no visible character between them.
 * Positions are utf16 indices of carrier findings; adjacency is measured in the
 * source text so a surrogate-pair carrier counts as one link, not two.
 */
function longestAdjacentRun(positions: readonly number[], text: string | undefined): number {
  if (text === undefined || positions.length === 0) return 0;
  const sorted = [...new Set(positions)].sort((a, b) => a - b);
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!;
    const previousCp = text.codePointAt(previous);
    const width = previousCp !== undefined && previousCp > 0xffff ? 2 : 1;
    if (previous + width === sorted[i]) { run++; best = Math.max(best, run); } else run = 1;
  }
  return best;
}

function describeEvidence(items: readonly CombinedEvidenceItem[]): string {
  const names = [...new Set(items.map((x) => `${x.name} ${x.code_point}`))];
  return names.slice(0, 4).join(", ") + (names.length > 4 ? `, and ${names.length - 4} more` : "");
}

function describePayload(run: number, tags: number, deliberateCount: number): string {
  const parts: string[] = [];
  if (run >= 3) parts.push(`${run} invisible carriers sit adjacent to one another with no visible character between them`);
  if (tags >= 2) parts.push(`${tags} tag characters form a run outside any flag sequence`);
  if (deliberateCount >= 8) parts.push(`${deliberateCount} deliberate carriers are present`);
  return `This text carries the shape of an encoded payload rather than a stray character: ${parts.join("; ")}. It shows the text was written into, not who composed it.`;
}

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}
