/**
 * The content-free JSON receipt.
 *
 * A receipt records what ran and what it found: hashes, counts, levels, scores,
 * method identities, versions, routes and limitations. It never carries the
 * page text. Section passages are replaced by their UTF-16 locators, and no
 * page URL or route path is written, so a receipt can be attached to a ticket
 * or an audit trail without moving a draft.
 */
import type { CheckerResult } from '@opace/content-integrity-cycle5-browser';

export const RECEIPT_VERSION = 'astro-toolbar-content-free/2.0.0';

/** Keys that can only ever hold page text or a page location. */
const FORBIDDEN_KEYS = new Set(['passage', 'draft', 'excerpt', 'candidate', 'source_text', 'content_text', 'route_path']);
/** Keys that name a policy as often as they name a payload, so their value decides. */
const CHECKED_KEYS = new Set(['content', 'text', 'url', 'href']);
/** A short bare token is a policy word ('none', 'browser'); anything else is a payload. */
const POLICY_TOKEN = /^[A-Za-z0-9_.:+-]{1,40}$/u;

/** Fails closed if a content-shaped field survives into a receipt. */
export function assertContentFree(value: unknown, path = 'receipt'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertContentFree(item, `${path}[${index}]`));
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, item] of Object.entries(value)) {
    const suspect = FORBIDDEN_KEYS.has(key) || (CHECKED_KEYS.has(key) && !(typeof item === 'string' && POLICY_TOKEN.test(item)) && item !== null && item !== undefined);
    if (suspect) throw new Error(`Receipt field ${path}.${key} could carry page content.`);
    assertContentFree(item, `${path}.${key}`);
  }
}

/** Build the exact-result receipt with every content-bearing field removed. */
export function buildContentFreeReceipt(result: CheckerResult, generatedAt = new Date().toISOString()): Record<string, unknown> {
  const ai = result.axes.ai_pattern;
  const receipt = {
    schema_version: result.schema_version,
    contract_version: result.contract_version,
    receipt_version: RECEIPT_VERSION,
    result_id: result.result_id,
    profile: result.profile,
    surface: 'Astro dev toolbar',
    generated_at: result.generated_at,
    written_at: generatedAt,
    contains_content: false as const,
    source: {
      content_hash: result.source.content_hash,
      normalised_hash: result.source.normalised_hash,
      content_type: result.source.content_type,
      language: result.source.language,
      word_count: result.source.word_count,
      character_count: result.source.character_count,
      section_count: result.source.section_count,
    },
    route: {
      kind: result.route.kind,
      location: result.route.location,
      content_transfer: result.route.content_transfer,
      privacy_route: result.route.privacy_route,
      consent: result.route.consent,
      retention: result.route.retention,
      model: result.route.model,
    },
    axes: {
      ai_pattern: {
        assessment_status: ai.assessment_status,
        method_status: ai.method_status,
        source: ai.source,
        raw_score: ai.raw_score,
        raw_margin: ai.raw_margin,
        display_score: ai.display_score,
        score_scale: ai.score_scale,
        level: ai.level,
        primary_display_threshold: ai.primary_display_threshold,
        secondary_display_threshold: ai.secondary_display_threshold,
        flagged: ai.flagged,
        flag_reason: ai.flag_reason,
        strongest_section_index: ai.strongest_section_index,
        reason: ai.reason,
        limitations: ai.limitations,
      },
      text_integrity: result.axes.text_integrity,
      editorial: result.axes.editorial,
    },
    sections: result.sections.map((section) => ({
      index: section.index,
      start_utf16: section.start_utf16,
      end_utf16: section.end_utf16,
      word_count: section.word_count,
      raw_score: section.raw_score,
      raw_margin: section.raw_margin,
      display_score: section.display_score,
      level: section.level,
      evidence: section.evidence.map((item) => ({ id: item.id, kind: item.kind, basis: item.basis ?? null })),
    })),
    methods: result.methods.map((method) => ({
      id: method.id,
      category: method.category,
      provider_or_method: method.provider_or_method,
      version: method.version,
      status: method.status,
      privacy_route: method.privacy_route,
      limitations: method.limitations,
    })),
    provenance: result.provenance,
    abuse_controls: result.abuse_controls,
    limitations: [...result.limitations, 'No page text, page URL or route path is retained in this receipt.'],
  };
  assertContentFree(receipt);
  return receipt;
}
