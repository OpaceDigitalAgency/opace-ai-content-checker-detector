import type { CheckerResult } from "@opace/content-integrity-contracts";
import {
  assertCheckerResultInvariants,
  buildContentFreeSharePayload,
  CYCLE5_MODEL_IDENTITY,
  prefixedSha256,
  presentCycle5Result,
} from "@opace/content-integrity-core";
import {
  CYCLE5_MODEL_SHA256,
  CYCLE5_PRIMARY_DISPLAY_THRESHOLD,
  CYCLE5_SECONDARY_DISPLAY_THRESHOLD,
} from "./constants.js";
import type { ComposeBrowserCheckerOptions, ComposeServerCheckerOptions, Cycle5BrowserScore, Cycle5ServerScore } from "./types.js";

const DEFAULT_SUPPORT = "https://opace.agency/tools/ai/content-verification-integrity/";
const LEGACY_NO_MODEL_LIMITATIONS = new Set([
  "No trained model ran on this text, so the AI-pattern reading is not assessed.",
  "This reduced deterministic result is not full-checker parity.",
]);
const withoutLegacyNoModelLimitations = (values: readonly string[]): string[] => values.filter((value) => !LEGACY_NO_MODEL_LIMITATIONS.has(value));

export function composeCycle5BrowserCheckerResult(
  primitive: CheckerResult,
  score: Cycle5BrowserScore,
  sourceText: string,
  options: ComposeBrowserCheckerOptions,
): Readonly<CheckerResult> {
  if (primitive.axes.ai_pattern.assessment_status !== "not_assessed" || primitive.route.model !== null) {
    throw new Error("The on-device composer requires a deterministic primitive result with an unassessed AI axis.");
  }
  if (prefixedSha256(sourceText) !== primitive.source.content_hash) {
    throw new Error("The deterministic and on-device model results do not describe the same source bytes.");
  }
  const presented = presentCycle5Result({
    source: CYCLE5_MODEL_IDENTITY.identity,
    rawScore: score.rawScore,
    rawMargin: score.rawMargin,
    bandId: score.sections.find((section) => section.rawScore === score.rawScore)!.bandId,
    primaryDisplayThreshold: CYCLE5_PRIMARY_DISPLAY_THRESHOLD,
    secondaryDisplayThreshold: CYCLE5_SECONDARY_DISPLAY_THRESHOLD,
    flagged: score.flagged,
    flagReason: score.flagReason,
    sections: score.sections.map((section) => ({
      index: section.index,
      startUtf16: section.startUtf16,
      endUtf16: section.endUtf16,
      wordCount: section.wordCount,
      rawScore: section.rawScore,
      rawMargin: section.rawMargin,
      bandId: section.bandId,
      passage: section.passage,
      evidence: [{
        id: `cycle5-section-${section.index}`,
        kind: "trained_model",
        summary: section.rawScore === score.rawScore ? "The strongest passage shaped the result." : "This passage was scored by the same trained model.",
        detail: "The score and level beside this exact section come from the Cycle-5 model; deterministic checks did not set them.",
        basis: "tier3-cycle5-v1, int8, onnxruntime-web WASM",
      }],
    })),
  });
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const supportDestination = options.supportDestination ?? DEFAULT_SUPPORT;
  const share = buildContentFreeSharePayload({
    resultId: options.resultId,
    generatedAt,
    wordCount: primitive.source.word_count,
    modelVersion: CYCLE5_MODEL_IDENTITY.identity,
    presented,
  });
  const detector = {
    id: "detector.cycle5",
    category: "detector" as const,
    provider_or_method: "Opace Cycle-5 AI-pattern model",
    version: CYCLE5_MODEL_IDENTITY.identity,
    status: presented.ai_pattern.method_status,
    availability: "available" as const,
    native_outcome: presented.ai_pattern.level,
    score: score.rawScore,
    score_scale: { id: "zero_to_one_pattern_similarity" },
    threshold: {
      scoring_contract: CYCLE5_MODEL_IDENTITY.scoringContract,
      primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin,
      secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap,
    },
    segments: presented.sections.map((section) => ({ index: section.index, raw_margin: section.raw_margin })),
    evidence: [{ type: "strongest_section", index: presented.ai_pattern.strongest_section_index }],
    limitations: [...presented.ai_pattern.limitations] as [string, ...string[]],
    started_at: generatedAt,
    completed_at: generatedAt,
    privacy_route: "browser" as const,
  };
  const result = {
    ...primitive,
    result_id: options.resultId,
    profile: "full_checker" as const,
    generated_at: generatedAt,
    contains_content: true,
    source: {
      ...primitive.source,
      normalised_hash: primitive.source.normalised_hash ?? primitive.source.content_hash,
      character_count: sourceText.length,
      section_count: presented.sections.length,
    },
    route: {
      kind: "browser_model" as const,
      location: `${options.surface}, this browser`,
      content_transfer: "none" as const,
      privacy_route: "browser" as const,
      retention: { source: "session" as const, result: "session" as const, statement: "The draft and result stay in this browser view and are not sent for scoring." },
      consent: "explicit" as const,
      model: {
        identity: CYCLE5_MODEL_IDENTITY.identity,
        registry_identity: null,
        precision: "int8" as const,
        artefact_hash: `sha256:${CYCLE5_MODEL_SHA256}`,
        segmentation_contract: CYCLE5_MODEL_IDENTITY.segmentationContract,
        input_contract: CYCLE5_MODEL_IDENTITY.inputContract,
        features_contract: CYCLE5_MODEL_IDENTITY.featuresContract,
        scoring_contract: CYCLE5_MODEL_IDENTITY.scoringContract,
        flag_rule: {
          expression: CYCLE5_MODEL_IDENTITY.flagRule.expression,
          primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin,
          secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap,
        },
      },
      transport: { endpoint_class: "verified_static_asset_download", region: null, requests: 0, words_sent: 0, processed: "in browser", retained: "not retained" },
    },
    axes: {
      ...primitive.axes,
      ai_pattern: presented.ai_pattern,
      text_integrity: { ...primitive.axes.text_integrity, limitations: withoutLegacyNoModelLimitations(primitive.axes.text_integrity.limitations) },
      editorial: { ...primitive.axes.editorial, limitations: withoutLegacyNoModelLimitations(primitive.axes.editorial.limitations) },
    },
    sections: presented.sections,
    methods: [detector, ...primitive.methods.filter((method) => method.id !== "detector.cycle5" && method.id !== "detector.local")],
    exports: {
      ...primitive.exports,
      receipt: { ...primitive.exports.receipt, available: true, contains_content: false as const },
      share: { available: true, contains_content: false as const, payload: share },
      report: {
        available: true,
        format: options.reportFormat,
        contains_content: true,
        explicit_user_action: true,
        complete_evidence: true,
        product_identity: "Opace AI Content Integrity",
        support_destination: supportDestination,
      },
    },
    abuse_controls: {
      max_words: null,
      max_characters: options.maxCharacters,
      max_request_bytes: null,
      explicit_capture: "enforced" as const,
      consent_before_transfer: "enforced" as const,
      refuse_not_truncate: "enforced" as const,
      cancellation: "enforced" as const,
      channel_authentication: "not_applicable" as const,
      proof_of_work: "not_applicable" as const,
      origin_validation: "enforced" as const,
      per_ip_limit: "not_applicable" as const,
      per_site_limit: "not_applicable" as const,
      per_connection_limit: "not_applicable" as const,
      global_inference_limit: "not_applicable" as const,
      request_body_logging: "not_applicable" as const,
      unexpected_network_requests: "blocked" as const,
      fallback: "not_configured" as const,
      kill_switch: "not_applicable" as const,
    },
    limitations: [...new Set([
      ...withoutLegacyNoModelLimitations(primitive.limitations),
      ...presented.ai_pattern.limitations,
      "The on-device model and vocabulary are fetched only after explicit consent; draft text is never transferred for this route.",
    ])] as [string, ...string[]],
  } as CheckerResult;
  assertCheckerResultInvariants(result);
  return Object.freeze(result);
}

export function composeCycle5ServerCheckerResult(
  primitive: CheckerResult,
  score: Cycle5ServerScore,
  sourceText: string,
  options: ComposeServerCheckerOptions,
): Readonly<CheckerResult> {
  const browserShape: Cycle5BrowserScore = { ...score, provider: "onnxruntime-web-wasm" };
  const composed = structuredClone(composeCycle5BrowserCheckerResult(primitive, browserShape, sourceText, {
    surface: options.surface,
    resultId: options.resultId,
    reportFormat: options.reportFormat,
    maxCharacters: options.maxCharacters,
    generatedAt: options.generatedAt,
    supportDestination: options.supportDestination,
  })) as CheckerResult;
  composed.route = {
    kind: "eu_server",
    location: "Opace EU server, europe-west1",
    content_transfer: "eu_server",
    privacy_route: "hub_provider",
    retention: { source: "request_only", result: "none", statement: "The text was processed once in EU server memory and was not retained." },
    consent: "explicit",
    model: {
      identity: CYCLE5_MODEL_IDENTITY.identity,
      registry_identity: "tier3-cycle5-full",
      precision: "fp32",
      artefact_hash: "sha256:45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057",
      segmentation_contract: CYCLE5_MODEL_IDENTITY.segmentationContract,
      input_contract: CYCLE5_MODEL_IDENTITY.inputContract,
      features_contract: CYCLE5_MODEL_IDENTITY.featuresContract,
      scoring_contract: CYCLE5_MODEL_IDENTITY.scoringContract,
      flag_rule: {
        expression: CYCLE5_MODEL_IDENTITY.flagRule.expression,
        primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin,
        secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap,
      },
    },
    transport: { endpoint_class: "first_party_browser", region: "europe-west1", requests: options.requestCount ?? 3, words_sent: score.wordCount, processed: "once", retained: "not retained" },
  };
  const detector = composed.methods.find((method) => method.id === "detector.cycle5");
  if (detector) {
    detector.privacy_route = "hub_provider";
    detector.evidence = [{ type: "strongest_section", index: composed.axes.ai_pattern.strongest_section_index, route: "Opace EU server", precision: "fp32" }];
  }
  composed.abuse_controls = {
    max_words: options.maxWords,
    max_characters: options.maxCharacters,
    max_request_bytes: null,
    explicit_capture: "enforced",
    consent_before_transfer: "enforced",
    refuse_not_truncate: "enforced",
    cancellation: "enforced",
    channel_authentication: "chrome_extension_challenge_token",
    proof_of_work: "enforced",
    origin_validation: "enforced",
    per_ip_limit: "enforced",
    per_site_limit: "not_applicable",
    per_connection_limit: "enforced",
    global_inference_limit: "enforced",
    request_body_logging: "excluded",
    unexpected_network_requests: "blocked",
    fallback: "enforced",
    kill_switch: "enforced",
  };
  composed.limitations = [...new Set([
    ...withoutLegacyNoModelLimitations(composed.limitations),
    "This route transfers the draft only after explicit choice and optional host permission; the service processes it once in EU memory and does not retain it.",
    "If this service route is unavailable or refused, the same screen offers the on-device Cycle-5 route.",
  ])] as [string, ...string[]];
  assertCheckerResultInvariants(composed);
  return Object.freeze(composed);
}
