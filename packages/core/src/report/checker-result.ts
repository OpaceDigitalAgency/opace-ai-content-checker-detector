import type { CheckerResult } from "@opacedev/ai-content-checker-contracts";
import type { CombinedVerdictResult } from "../verdict/combine.js";

/** Portable result/presentation semantics shared by every checker surface. */
export const CHECKER_RESULT_RUNTIME_VERSION = "checker-result:2026.09.1" as const;

export const CYCLE5_MODEL_IDENTITY = {
  identity: "tier3-cycle5-v1",
  serverRegistryIdentity: "tier3-cycle5-full",
  segmentationContract: "segments-v3",
  inputContract: "raw-v1",
  featuresContract: "features-v1",
  scoringContract: "margin-v1",
  flagRule: {
    expression: "max(m1, m2 + 0.34) >= 3.570935",
    primaryMargin: 3.570935,
    secondaryGap: 0.34
  }
} as const;

export const CHECKER_SCORE_SCALE = "zero_to_one_pattern_similarity" as const;
export const CHECKER_HONESTY_LINE = "No AI checker can prove who wrote a text — this is a pattern reading." as const;

export const CHECKER_LEVELS = {
  "signal-strongly-ai": {
    name: "Strongly AI",
    support: "This draft very strongly matches AI writing — the kind of match we rarely see in human work."
  },
  "signal-likely-ai": {
    name: "Likely AI",
    support: "Much of this draft reads like AI writing."
  },
  "signal-potentially-ai": {
    name: "Potentially AI",
    support: "Parts of this draft resemble AI writing, but the match is not strong enough to be sure."
  },
  "signal-unclear": {
    name: "Unclear",
    support: "We can't call this one either way. Some passages read slightly machine-like, but people write that way too."
  },
  "signal-likely-human": {
    name: "Likely human",
    support: "This reads like human writing. Nothing here matches the AI patterns we test for — though a heavily disguised AI draft can slip past any checker, ours included."
  }
} as const;

export type CheckerLevelId = keyof typeof CHECKER_LEVELS;
export type Cycle5BandId = "very_likely_ai" | "uncertain" | "likely_human" | "very_likely_human";

const BAND_TO_LEVEL: Readonly<Record<Cycle5BandId, CheckerLevelId>> = {
  very_likely_ai: "signal-strongly-ai",
  uncertain: "signal-potentially-ai",
  likely_human: "signal-unclear",
  very_likely_human: "signal-likely-human"
};

const METHOD_STATUSES = new Set(["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"]);
const CONTENT_KEYS = new Set(["content", "text", "passage", "excerpt", "source_uri", "candidate", "route_path", "evidence"]);

function probability(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be a finite zero-to-one score.`);
  return value;
}

/**
 * Map the model's measured band to the five product bands. The secondary
 * threshold only refines the model's uncertain band; it never decides the
 * underlying model flag, which remains the margin-v1 rule.
 */
export function levelForCycle5Score(rawScore: number, bandId: Cycle5BandId, secondaryThreshold?: number): CheckerLevelId {
  probability(rawScore, "rawScore");
  const level = BAND_TO_LEVEL[bandId];
  if (!level) throw new Error(`Unknown Cycle-5 band: ${String(bandId)}`);
  if (bandId === "uncertain" && secondaryThreshold !== undefined) {
    probability(secondaryThreshold, "secondaryThreshold");
    if (rawScore >= secondaryThreshold) return "signal-likely-ai";
  }
  return level;
}

/**
 * Format every score in one run together. Precision rises only for values
 * which would otherwise print the same number beside different level names.
 */
export function formatCheckerScoreTexts(
  entries: readonly { rawScore: number; level: CheckerLevelId }[],
  startDecimals = 2,
  maxDecimals = 6
): string[] {
  if (!Number.isInteger(startDecimals) || !Number.isInteger(maxDecimals) || startDecimals < 0 || maxDecimals < startDecimals) {
    throw new RangeError("Score precision bounds are invalid.");
  }
  entries.forEach((entry, index) => probability(entry.rawScore, `entries[${index}].rawScore`));
  const decimals = entries.map(() => startDecimals);
  for (let pass = startDecimals; pass < maxDecimals; pass += 1) {
    const groups = new Map<string, number[]>();
    entries.forEach((entry, index) => {
      const text = entry.rawScore.toFixed(decimals[index]);
      const group = groups.get(text);
      if (group) group.push(index);
      else groups.set(text, [index]);
    });
    let changed = false;
    for (const group of groups.values()) {
      if (new Set(group.map((index) => entries[index]!.level)).size > 1) {
        for (const index of group) decimals[index] = decimals[index]! + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return entries.map((entry, index) => entry.rawScore.toFixed(decimals[index]));
}

export interface CheckerEvidenceInput {
  id: string;
  kind: "trained_model" | "measured_pattern" | "editorial_rule" | "character" | "provenance" | "watermark" | "limitation";
  summary: string;
  detail?: string;
  basis?: string;
}

export interface Cycle5SectionInput {
  index: number;
  startUtf16: number;
  endUtf16: number;
  wordCount: number;
  rawScore: number;
  rawMargin: number;
  bandId: Cycle5BandId;
  passage?: string;
  locator?: { content_hash: string; start_utf16: number; end_utf16: number };
  evidence: readonly CheckerEvidenceInput[];
}

export interface Cycle5PresentationInput {
  source: string;
  rawScore: number;
  rawMargin: number;
  bandId: Cycle5BandId;
  /** Probability-space display equivalent of the primary margin boundary. It never decides the flag. */
  primaryDisplayThreshold: number;
  /** Probability-space display equivalent of m2 + gap. It refines the visible band but never decides the flag. */
  secondaryDisplayThreshold: number;
  flagged: boolean;
  flagReason: "primary" | "secondary" | null;
  sections: readonly Cycle5SectionInput[];
  reason?: string;
  limitations?: readonly string[];
}

export interface PresentedCycle5Section {
  index: number;
  start_utf16: number;
  end_utf16: number;
  word_count: number;
  raw_score: number;
  raw_margin: number;
  display_score: string;
  level: CheckerLevelId;
  band_id: Cycle5BandId;
  passage?: string;
  locator?: { content_hash: string; start_utf16: number; end_utf16: number };
  evidence: CheckerEvidenceInput[];
}

export interface PresentedCycle5Result {
  ai_pattern: {
    assessment_status: "assessed";
    method_status: "pass" | "attention";
    source: string;
    raw_score: number;
    raw_margin: number;
    display_score: string;
    score_scale: typeof CHECKER_SCORE_SCALE;
    level: CheckerLevelId;
    primary_display_threshold: number;
    secondary_display_threshold: number;
    flagged: boolean;
    flag_reason: "primary" | "secondary" | null;
    strongest_section_index: number;
    reason: string;
    limitations: [string, ...string[]];
  };
  sections: PresentedCycle5Section[];
}

const DEFAULT_AI_LIMITATIONS = [
  "The score is a zero-to-one pattern-similarity reading, not a percentage of the text written by AI.",
  "This result does not prove authorship, and edited or out-of-register writing may be missed."
] as const;

/** Build the only canonical five-band AI presentation used by pages, reports and shares. */
export function presentCycle5Result(input: Cycle5PresentationInput): Readonly<PresentedCycle5Result> {
  probability(input.rawScore, "rawScore");
  probability(input.primaryDisplayThreshold, "primaryDisplayThreshold");
  probability(input.secondaryDisplayThreshold, "secondaryDisplayThreshold");
  if (!input.sections.length) throw new Error("An assessed Cycle-5 result requires at least one scored section.");

  const sections = input.sections.map((section, position) => {
    if (!Number.isInteger(section.index) || section.index !== position) throw new Error("Scored sections must be zero-based and in source order.");
    if (!Number.isInteger(section.startUtf16) || !Number.isInteger(section.endUtf16) || section.startUtf16 < 0 || section.endUtf16 <= section.startUtf16) {
      throw new Error(`Section ${section.index} has an invalid UTF-16 range.`);
    }
    if (position > 0 && section.startUtf16 < input.sections[position - 1]!.endUtf16) throw new Error("Scored section ranges must not overlap or move backwards.");
    if (!Number.isInteger(section.wordCount) || section.wordCount < 0) throw new Error(`Section ${section.index} has an invalid word count.`);
    if (section.passage === undefined && section.locator === undefined) throw new Error(`Section ${section.index} needs a passage or a content-free locator.`);
    return {
      index: section.index,
      start_utf16: section.startUtf16,
      end_utf16: section.endUtf16,
      word_count: section.wordCount,
      raw_score: probability(section.rawScore, `sections[${section.index}].rawScore`),
      raw_margin: finiteNumber(section.rawMargin, `sections[${section.index}].rawMargin`),
      display_score: "",
      level: levelForCycle5Score(section.rawScore, section.bandId, input.secondaryDisplayThreshold),
      band_id: section.bandId,
      ...(section.passage === undefined ? {} : { passage: section.passage }),
      ...(section.locator === undefined ? {} : { locator: { ...section.locator } }),
      evidence: section.evidence.map((item) => ({ ...item }))
    } satisfies PresentedCycle5Section;
  });
  const strongest = sections.reduce((best, section) => section.raw_score > best.raw_score ? section : best, sections[0]!);
  if (Math.abs(strongest.raw_score - input.rawScore) > Number.EPSILON) throw new Error("The run-wide score must equal the strongest section's raw score.");
  if (Math.abs(strongest.raw_margin - input.rawMargin) > Number.EPSILON) throw new Error("The run-wide margin must equal the strongest section's raw margin.");
  const margins = sections.map((section) => section.raw_margin).sort((a, b) => b - a);
  const primaryFired = margins[0]! >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
  const secondaryFired = margins.length > 1 && margins[1]! + CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
  const expectedFlagged = primaryFired || secondaryFired;
  const expectedReason = primaryFired ? "primary" : secondaryFired ? "secondary" : null;
  if (input.flagged !== expectedFlagged || input.flagReason !== expectedReason) throw new Error("The supplied flag state contradicts the Cycle-5 margin rule.");

  const level = levelForCycle5Score(input.rawScore, input.bandId, input.secondaryDisplayThreshold);
  const display = formatCheckerScoreTexts([
    { rawScore: input.rawScore, level },
    ...sections.map((section) => ({ rawScore: section.raw_score, level: section.level }))
  ]);
  sections.forEach((section, index) => { section.display_score = display[index + 1]!; });
  const limits = [...new Set([...(input.limitations ?? []), ...DEFAULT_AI_LIMITATIONS])];
  const result: PresentedCycle5Result = {
    ai_pattern: {
      assessment_status: "assessed",
      method_status: input.flagged ? "attention" : "pass",
      source: input.source,
      raw_score: input.rawScore,
      raw_margin: input.rawMargin,
      display_score: display[0]!,
      score_scale: CHECKER_SCORE_SCALE,
      level,
      primary_display_threshold: input.primaryDisplayThreshold,
      secondary_display_threshold: input.secondaryDisplayThreshold,
      flagged: input.flagged,
      flag_reason: input.flagReason,
      strongest_section_index: strongest.index,
      reason: input.reason ?? CHECKER_LEVELS[level].support,
      limitations: limits as [string, ...string[]]
    },
    sections
  };
  return deepFreeze(result);
}

export function notAssessedAiPattern(reason = "No trained model ran on this text, so the AI-pattern reading is not assessed.") {
  return deepFreeze({
    assessment_status: "not_assessed" as const,
    method_status: "not_run" as const,
    source: null,
    raw_score: null,
    raw_margin: null,
    display_score: null,
    score_scale: CHECKER_SCORE_SCALE,
    level: null,
    primary_display_threshold: null,
    secondary_display_threshold: null,
    flagged: null,
    flag_reason: null,
    strongest_section_index: null,
    reason,
    limitations: [...DEFAULT_AI_LIMITATIONS] as [string, ...string[]]
  });
}

/**
 * Reuse the compiled core's independent integrity/editorial axes without
 * letting either one manufacture an AI result.
 */
export function composeCheckerAxes(
  combined: CombinedVerdictResult,
  presented?: Readonly<PresentedCycle5Result>
) {
  if (presented) {
    if (combined.ai_probability.source !== presented.ai_pattern.source || combined.ai_probability.value !== presented.ai_pattern.raw_score) {
      throw new Error("The trained-model reading and the five-band presentation describe different runs.");
    }
  } else if (combined.ai_probability.reading !== "not_assessed" || combined.ai_probability.value !== null) {
    throw new Error("A model result cannot be discarded and replaced with not_assessed.");
  }
  const textStatus = combined.text_integrity.status;
  const editorialLevel = combined.editorial.suggestion_level;
  return deepFreeze({
    ai_pattern: presented?.ai_pattern ?? notAssessedAiPattern(),
    text_integrity: {
      method_status: textStatus === "clean" ? "pass" as const : "attention" as const,
      reading: textStatus,
      reason: combined.text_integrity.reason,
      findings: combined.text_integrity.findings.map((finding) => ({ ...finding })),
      limitations: [...combined.limitations] as [string, ...string[]]
    },
    editorial: {
      method_status: editorialLevel === "none" ? "pass" as const : "attention" as const,
      reading: editorialLevel,
      reason: combined.editorial.reason,
      findings: (combined.editorial.categories_hit ?? []).map((category) => ({ category })),
      limitations: [...combined.limitations] as [string, ...string[]]
    }
  });
}

export interface SharePayloadInput {
  resultId: string;
  generatedAt: string;
  wordCount: number;
  modelVersion: string;
  presented: Readonly<PresentedCycle5Result>;
}

/** Build a share/export object whose type cannot accept draft text or evidence. */
export function buildContentFreeSharePayload(input: SharePayloadInput) {
  if (!Number.isInteger(input.wordCount) || input.wordCount < 0) throw new Error("Share word count must be a non-negative integer.");
  const date = new Date(input.generatedAt);
  if (!Number.isFinite(date.valueOf())) throw new Error("Share generation time must be a valid date-time.");
  const payload = {
    version: 1 as const,
    result_id: input.resultId,
    level: input.presented.ai_pattern.level,
    display_score: input.presented.ai_pattern.display_score,
    sections: input.presented.sections.map((section) => ({
      index: section.index,
      raw_score: section.raw_score,
      display_score: section.display_score,
      level: section.level
    })),
    word_count: input.wordCount,
    date: date.toISOString().slice(0, 10),
    model_version: input.modelVersion,
    honesty_line: CHECKER_HONESTY_LINE,
    contains_content: false as const
  };
  assertContentFree(payload);
  return deepFreeze(payload);
}

function assertContentFree(value: unknown, path = "share"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertContentFree(item, `${path}[${index}]`));
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    if (CONTENT_KEYS.has(key.toLowerCase())) throw new Error(`${path}.${key} is content-bearing and cannot appear in a share payload.`);
    assertContentFree(item, `${path}.${key}`);
  }
}

/**
 * Producer-side semantic checks complement the additive-field-tolerant JSON
 * Schema. Run this immediately before serialising, sharing or rendering.
 */
export function assertCheckerResultInvariants(result: CheckerResult): void {
  if (result.schema_version !== "1.0" || !/^1\./u.test(result.contract_version)) throw new Error("Unsupported checker result contract.");
  for (const method of result.methods) if (!METHOD_STATUSES.has(method.status)) throw new Error(`Unknown method status: ${String(method.status)}`);
  if (result.exports.receipt.contains_content !== false) throw new Error("The default receipt must be content-free.");
  if (result.exports.share.contains_content !== false) throw new Error("The share export must be content-free.");
  if (result.exports.share.payload) assertContentFree(result.exports.share.payload);
  if (result.provenance.safe_fixes.preview_first !== true || result.provenance.safe_fixes.explicit_approval_required !== true || result.provenance.safe_fixes.automatic_homoglyph_replacement !== false || result.provenance.safe_fixes.c2pa_wrapper_protected !== true) {
    throw new Error("Safe-fix and C2PA wrapper invariants were weakened.");
  }
  for (const watermark of result.provenance.watermarks) {
    if (watermark.method_id === "watermark.anthropic" && (watermark.method_status !== "unsupported" || !["not_available", "not_supported"].includes(watermark.outcome))) {
      throw new Error("watermark.anthropic must remain unsupported until an official interface exists.");
    }
  }

  const ai = result.axes.ai_pattern;
  if (ai.assessment_status === "assessed") {
    if (!result.route.model) throw new Error("Only a trained model may set the AI-pattern reading.");
    assertCycle5Identity(result.route.model);
    if (!result.sections.length) throw new Error("An assessed result needs scored sections.");
    const ordered = [...result.sections].sort((a, b) => a.index - b.index);
    ordered.forEach((section, index) => {
      if (section.index !== index || section !== result.sections[index]) throw new Error("Scored sections must remain in source order.");
      if (!section.band_id) throw new Error(`Section ${section.index} has no measured band identity.`);
      const bandId = section.band_id as Cycle5BandId;
      const expectedLevel = ai.secondary_display_threshold === null && bandId === "uncertain"
        ? section.level
        : levelForCycle5Score(section.raw_score, bandId, ai.secondary_display_threshold ?? undefined);
      if (section.level !== expectedLevel || (bandId === "uncertain" && ai.secondary_display_threshold === null && !["signal-potentially-ai", "signal-likely-ai"].includes(section.level))) {
        throw new Error(`Section ${section.index} level does not match its raw score and measured band.`);
      }
    });
    const strongest = result.sections.reduce((best, section) => section.raw_score > best.raw_score ? section : best, result.sections[0]!);
    if (ai.strongest_section_index !== strongest.index || ai.raw_score !== strongest.raw_score || ai.raw_margin !== strongest.raw_margin) throw new Error("The run-wide result does not identify the strongest section.");
    if (ai.level !== strongest.level) throw new Error("The run-wide level does not match the strongest section.");
    if (ai.source !== result.route.model.identity) throw new Error("The AI-pattern source does not match the executed model.");
    if (result.source.section_count !== result.sections.length) throw new Error("The source section count does not match the scored section set.");
    if (ai.method_status !== (ai.flagged ? "attention" : "pass")) throw new Error("The AI method status contradicts its flag state.");
    result.sections.forEach((section, index) => {
      if (index > 0 && section.start_utf16 < result.sections[index - 1]!.end_utf16) throw new Error("Scored section ranges overlap or move backwards.");
      if (section.locator && (section.locator.content_hash !== result.source.content_hash || section.locator.start_utf16 !== section.start_utf16 || section.locator.end_utf16 !== section.end_utf16)) {
        throw new Error(`Section ${section.index} locator does not match its source or range.`);
      }
    });
    const margins = result.sections.map((section) => section.raw_margin).sort((a, b) => b - a);
    const primaryFired = margins[0]! >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
    const secondaryFired = margins.length > 1 && margins[1]! + CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
    const expectedFlagged = primaryFired || secondaryFired;
    const expectedReason = primaryFired ? "primary" : secondaryFired ? "secondary" : null;
    if (ai.flagged !== expectedFlagged || ai.flag_reason !== expectedReason) throw new Error("The AI flag state contradicts the recorded Cycle-5 margins.");
    const expected = formatCheckerScoreTexts([
      { rawScore: ai.raw_score!, level: ai.level! },
      ...result.sections.map((section) => ({ rawScore: section.raw_score, level: section.level }))
    ]);
    if (ai.display_score !== expected[0] || result.sections.some((section, index) => section.display_score !== expected[index + 1])) {
      throw new Error("Visible/exported scores were not produced by the run-wide formatter.");
    }
    if (result.profile === "full_checker" && (!result.exports.report.available || !result.exports.report.complete_evidence)) {
      throw new Error("An assessed full-checker result requires a complete report export.");
    }
  } else {
    if (ai.raw_score !== null || ai.raw_margin !== null || ai.display_score !== null || ai.level !== null || ai.flagged !== null || ai.strongest_section_index !== null) {
      throw new Error("An unassessed, withheld or errored AI axis cannot publish a score or level.");
    }
    if (result.sections.length) throw new Error("An unassessed result cannot publish model-scored sections.");
  }
  if (result.route.model === null && ai.assessment_status === "assessed") throw new Error("Deterministic evidence cannot set the AI-pattern reading.");
  assertRouteConsistency(result);
  if (result.abuse_controls.request_body_logging !== "excluded" && result.abuse_controls.request_body_logging !== "not_applicable") {
    throw new Error("A checker route may not claim readiness while request-body logging is unconfigured.");
  }
}

function assertRouteConsistency(result: CheckerResult): void {
  const { route, abuse_controls: controls } = result;
  if (route.kind === "browser_model") {
    if (route.content_transfer !== "none" || route.privacy_route !== "browser" || route.model?.precision !== "int8") throw new Error("Browser-model route metadata is inconsistent.");
  } else if (route.kind === "eu_server") {
    if (route.content_transfer !== "eu_server" || route.consent !== "explicit" || route.model?.precision !== "fp32") throw new Error("EU-server route metadata is inconsistent.");
    if (!["browser_pow_token", "chrome_extension_challenge_token", "wordpress_challenge_token"].includes(controls.channel_authentication)) throw new Error("EU-server results require their real channel authentication class.");
  } else if (route.kind === "wordpress_same_site") {
    if (route.content_transfer !== "same_site" || route.privacy_route !== "wordpress_local" || controls.channel_authentication !== "same_site_nonce") throw new Error("WordPress same-site route metadata is inconsistent.");
  } else if (route.kind === "loopback_engine") {
    if (route.content_transfer !== "loopback" || route.privacy_route !== "local_service" || controls.channel_authentication !== "loopback_bearer") throw new Error("Loopback route metadata is inconsistent.");
  } else if (route.kind === "deterministic_only") {
    if (route.content_transfer !== "none" || route.model !== null || result.axes.ai_pattern.assessment_status === "assessed") throw new Error("A deterministic-only route cannot publish a model result.");
  }
}

function assertCycle5Identity(model: NonNullable<CheckerResult["route"]["model"]>): void {
  if (
    model.identity !== CYCLE5_MODEL_IDENTITY.identity ||
    model.segmentation_contract !== CYCLE5_MODEL_IDENTITY.segmentationContract ||
    model.input_contract !== CYCLE5_MODEL_IDENTITY.inputContract ||
    model.features_contract !== CYCLE5_MODEL_IDENTITY.featuresContract ||
    model.scoring_contract !== CYCLE5_MODEL_IDENTITY.scoringContract ||
    model.flag_rule.expression !== CYCLE5_MODEL_IDENTITY.flagRule.expression ||
    model.flag_rule.primary_margin !== CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin ||
    model.flag_rule.secondary_gap !== CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap
  ) throw new Error("The assessed result does not identify the current Cycle-5 contracts and margin rule.");
  if (model.precision === "fp32" && model.registry_identity !== CYCLE5_MODEL_IDENTITY.serverRegistryIdentity) {
    throw new Error("The fp32 server route must identify the Cycle-5 server registry entry.");
  }
}

function finiteNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
  return value;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
