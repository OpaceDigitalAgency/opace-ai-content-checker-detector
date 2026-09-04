/**
 * The two content-free exports the extension owns.
 *
 * The branded PDF, the printable HTML report and the Content Credentials
 * report all come from `shared/report/**`, which every Opace surface uses, so
 * this file holds only what is specific to the extension: an exact-result
 * receipt with every passage stripped, and the one-line share summary.
 *
 * Score strings are printed exactly as the run-wide formatter produced them.
 * Nothing here recomputes a score or chooses a band.
 */
import type { CheckerResult } from "@opace/content-integrity-cycle5-browser";
import { CHECKER_LEVEL_LABELS } from "../../../shared/presentation/checker-result-presentation.mjs";

type AiLevel = keyof typeof CHECKER_LEVEL_LABELS;
const level = (value: string | null): string => (value ? CHECKER_LEVEL_LABELS[value as AiLevel] ?? "Not assessed" : "Not assessed");

/** An exact-result receipt with every passage and evidence string removed. */
export function buildContentFreeCheckerReceipt(result: CheckerResult) {
  return Object.freeze({
    schema: "opace-checker-receipt-1.0",
    result_id: result.result_id,
    generated_at: result.generated_at,
    contains_content: false,
    source: {
      content_hash: result.source.content_hash,
      normalised_hash: result.source.normalised_hash,
      content_type: result.source.content_type,
      language: result.source.language,
      word_count: result.source.word_count,
      character_count: result.source.character_count,
      section_count: result.source.section_count,
    },
    route: result.route,
    axes: {
      ai_pattern: result.axes.ai_pattern,
      text_integrity: { ...result.axes.text_integrity, findings: result.axes.text_integrity.findings.length },
      editorial: { ...result.axes.editorial, findings: result.axes.editorial.findings.length },
    },
    sections: result.sections.map((item) => ({
      index: item.index,
      start_utf16: item.start_utf16,
      end_utf16: item.end_utf16,
      word_count: item.word_count,
      raw_score: item.raw_score,
      raw_margin: item.raw_margin,
      display_score: item.display_score,
      level: item.level,
      band_id: item.band_id,
    })),
    methods: result.methods.map((method) => ({
      id: method.id,
      provider_or_method: method.provider_or_method,
      version: method.version,
      status: method.status,
      privacy_route: method.privacy_route,
      started_at: method.started_at,
      completed_at: method.completed_at,
      limitations: method.limitations,
    })),
    provenance: {
      protected_facts: result.provenance.protected_facts,
      c2pa_text: result.provenance.c2pa_text,
      c2pa_files: result.provenance.c2pa_files,
      watermarks: result.provenance.watermarks,
      safe_fixes: result.provenance.safe_fixes,
    },
    abuse_controls: result.abuse_controls,
    limitations: result.limitations,
  });
}

/** One line a reader can paste anywhere. It carries no part of the draft. */
export function buildShareSummary(result: CheckerResult): string {
  const payload = result.exports.share.payload as Record<string, unknown> | null;
  if (!result.exports.share.available || !payload || payload.contains_content !== false) throw new Error("This run has no content-free summary to share.");
  return `Opace AI Content Checker & Detector: ${level(String(payload.level ?? ""))} (score ${String(payload.display_score ?? "not assessed")} on a zero-to-one pattern scale). ${String(payload.honesty_line ?? "No result proves authorship.")} Result ${String(payload.result_id ?? result.result_id)}, ${String(payload.date ?? result.generated_at.slice(0, 10))}.`;
}
