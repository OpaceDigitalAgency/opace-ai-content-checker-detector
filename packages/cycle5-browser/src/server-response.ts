import {
  CYCLE5_BANDS,
  CYCLE5_PRIMARY_MARGIN,
  CYCLE5_SECONDARY_GAP,
  CYCLE5_TEMPERATURE,
} from "./constants.js";
import type { Cycle5ServerScore, ScoredSection } from "./types.js";

const MODEL_BUILD = "45e00978b10d1df6" as const;
const ROUNDING_TOLERANCE = 0.000_050_001;
const countWords = (value: string): number => value.match(/\S+/gu)?.length ?? 0;
const probabilityFromMargin = (margin: number): number => 1 / (1 + Math.exp(-margin / CYCLE5_TEMPERATURE));
const bandFor = (score: number) => CYCLE5_BANDS.find((band) => score >= band.min)!.id;
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("cycle5_server_response_invalid");
  return value as Record<string, unknown>;
};
const number = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`cycle5_server_${field}_invalid`);
  return value;
};
const integer = (value: unknown, field: string): number => {
  const parsed = number(value, field);
  if (!Number.isInteger(parsed)) throw new Error(`cycle5_server_${field}_invalid`);
  return parsed;
};
const exact = (actual: unknown, expected: unknown, field: string): void => {
  if (actual !== expected) throw new Error(`cycle5_server_${field}_mismatch`);
};
const sameRoundedProbability = (reported: number, margin: number, field: string): number => {
  const reconstructed = probabilityFromMargin(margin);
  if (Math.abs(reported - reconstructed) > ROUNDING_TOLERANCE) throw new Error(`cycle5_server_${field}_probability_mismatch`);
  return reconstructed;
};

/**
 * Validate the response from the body-bound Chrome channel and restore the
 * unrounded display probability from its six-decimal raw margin. Classification
 * never uses the four-decimal probability returned by the transport.
 */
export function parseCycle5ChromeServerResponse(value: unknown, sourceText: string): Cycle5ServerScore {
  const body = record(value);
  exact(body.channel, "chrome-extension-v1", "channel");
  exact(body.model, "tier3-cycle5-v1", "model");
  exact(body.model_build, MODEL_BUILD, "model_build");
  exact(body.precision, "fp32", "precision");
  exact(body.segmentation_contract, "segments-v3", "segmentation_contract");
  exact(body.input_normalisation, "raw-v1", "input_contract");
  exact(body.features_contract, "features-v1", "features_contract");
  exact(body.scoring, "margin-v1", "scoring_contract");
  exact(body.aggregation, "max", "aggregation");
  exact(body.threshold, null, "probability_threshold");
  exact(number(body.threshold_margin, "threshold_margin"), CYCLE5_PRIMARY_MARGIN, "threshold_margin");
  exact(number(body.secondary_gap, "secondary_gap"), CYCLE5_SECONDARY_GAP, "secondary_gap");
  exact(body.processed, "server", "processed");
  exact(body.retained, "nothing", "retained");
  exact(body.truncated, false, "truncated");

  const wordCount = countWords(sourceText);
  exact(integer(body.word_count, "word_count"), wordCount, "word_count");
  exact(integer(body.words_sent, "words_sent"), wordCount, "words_sent");
  if (!Array.isArray(body.segments) || body.segments.length === 0) throw new Error("cycle5_server_segments_invalid");
  exact(integer(body.segment_count, "segment_count"), body.segments.length, "segment_count");

  const sections: ScoredSection[] = body.segments.map((candidate, position) => {
    const segment = record(candidate);
    exact(integer(segment.index, `segment_${position}_index`), position, `segment_${position}_index`);
    const startUtf16 = integer(segment.char_start, `segment_${position}_start`);
    const endUtf16 = integer(segment.char_end, `segment_${position}_end`);
    if (startUtf16 < 0 || endUtf16 <= startUtf16 || endUtf16 > sourceText.length) throw new Error(`cycle5_server_segment_${position}_offset_invalid`);
    const passage = sourceText.slice(startUtf16, endUtf16);
    const segmentWordCount = integer(segment.words, `segment_${position}_words`);
    exact(segmentWordCount, countWords(passage), `segment_${position}_words`);
    const rawMargin = number(segment.margin, `segment_${position}_margin`);
    const reportedProbability = number(segment.probability_ai, `segment_${position}_probability`);
    const rawScore = sameRoundedProbability(reportedProbability, rawMargin, `segment_${position}`);
    exact(segment.flagged, rawMargin >= CYCLE5_PRIMARY_MARGIN, `segment_${position}_flagged`);
    exact(segment.truncated, false, `segment_${position}_truncated`);
    return {
      index: position,
      startUtf16,
      endUtf16,
      wordCount: segmentWordCount,
      tokenCount: integer(segment.tokens_scored, `segment_${position}_tokens`),
      rawScore,
      rawMargin,
      bandId: bandFor(rawScore),
      passage,
    };
  });

  const ranked = [...sections].sort((left, right) => right.rawMargin - left.rawMargin);
  const strongest = ranked[0]!;
  const runnerUp = ranked[1];
  const primary = strongest.rawMargin >= CYCLE5_PRIMARY_MARGIN;
  const secondary = Boolean(runnerUp && runnerUp.rawMargin + CYCLE5_SECONDARY_GAP >= CYCLE5_PRIMARY_MARGIN);
  const flagged = primary || secondary;
  const flagReason = primary ? "primary" : secondary ? "secondary" : null;
  exact(body.flagged, flagged, "flagged");
  exact(body.flag_reason, flagReason, "flag_reason");
  exact(integer(body.strongest_segment, "strongest_segment"), strongest.index, "strongest_segment");
  exact(number(body.margin, "margin"), strongest.rawMargin, "margin");
  sameRoundedProbability(number(body.probability_ai, "probability"), strongest.rawMargin, "document");
  if (runnerUp) {
    exact(integer(body.second_segment, "second_segment"), runnerUp.index, "second_segment");
    exact(number(body.second_margin, "second_margin"), runnerUp.rawMargin, "second_margin");
    sameRoundedProbability(number(body.second_probability_ai, "second_probability"), runnerUp.rawMargin, "second");
  } else {
    exact(body.second_segment, null, "second_segment");
    exact(body.second_margin, null, "second_margin");
    exact(body.second_probability_ai, null, "second_probability");
  }

  return {
    status: "scored",
    provider: "opace-eu-server-fp32",
    modelVersion: "tier3-cycle5-v1",
    modelBuild: MODEL_BUILD,
    rawScore: strongest.rawScore,
    rawMargin: strongest.rawMargin,
    flagged,
    flagReason,
    wordCount,
    sections,
  };
}
