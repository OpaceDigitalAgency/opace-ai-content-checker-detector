/**
 * Rule data for the en-signals 2026.08.3 harvest merge.
 *
 * Sources merged here (see research/AI-TELLS-MEGA-PACK.md, research/
 * ai-tells-pack-seed.json `tells-seed:2026.08.1`, and research/
 * OWNER-DOCS-TELLS.md):
 * - Tier A tells ship at their stated severity.
 * - Tier B tells ship at low severity with `corroboration: true` metadata —
 *   they are weak alone and only meaningful alongside other findings.
 * - Tier C tells are NOT implemented; they are recorded in EXCLUDED_TELLS so
 *   coverage is auditable.
 *
 * Binding corrections from the research (do not "fix" these without reading
 * the mega-pack):
 * - No naive hedging rule: epistemic hedges DECREASED in post-LLM text
 *   (arXiv:2603.16131, 2505.09662); a hedge-word counter fires backwards.
 * - Question-heading / uniform-FAQ shapes stay corroboration-weight only:
 *   SEO/AEO guides teach humans the identical template.
 * - Stylometric measures never dominate the document score (cap applied in
 *   en-signals-v2.ts) — the Stanford TOEFL study found >50% of genuine
 *   non-native essays falsely flagged by stylometric detectors.
 *
 * Licensing: regex/list data here is either (a) adapted from Apache-2.0/MIT
 * sources (sam-paech/antislop-sampler, slop-forensics, SLOP_Detector,
 * hwajongpark/slop-gate, avectats7/anti-ai-writing, kjmagnan1s/anti-slop,
 * aplaceforallmystuff/claude-slop-detector), (b) uncopyrightable facts from
 * academic papers (Liang et al. 2024, Kobak et al. 2025, Juzek & Ward 2025,
 * Reinhart et al. PNAS 2025, Pew 2026), (c) independently re-expressed from
 * CC BY-SA Wikipedia guidance, or (d) the owner's own documents. AGPL
 * (AlpinDale/gptslop) and unlicensed (jalaalrd) lists were NOT copied; where
 * the same observations appear they were reimplemented from the underlying
 * facts. See THIRD_PARTY_NOTICES.md.
 *
 * Everything remains Tier B evidence in BRIEF.md §21 terms: editorial hints
 * about style — never proof of authorship. The artefact-forensics category is
 * the strongest evidence class (near-zero false positives, model-attributing)
 * but is still reported as evidence, not verdict.
 */

// ─── Era / attribution metadata ──────────────────────────────────────
// Every rule category carries the model era in which the tell peaked and,
// where the research supports it, a model-family attribution hint.
export type RuleEra = "2023" | "2024-25" | "2025-26" | "evergreen";
export interface RuleEraInfo {
  era: RuleEra;
  attribution?: "chatgpt" | "claude" | "gemini" | "grok" | "multi";
}

export const RULE_ERA: Record<string, RuleEraInfo> = {
  // ── existing v2 categories ──
  "tier1": { era: "2023" },
  "tier1-clarity": { era: "evergreen" },
  "tier2": { era: "2023" },
  "tier3": { era: "2023" },
  "transition": { era: "2023" },
  "chatbot": { era: "evergreen", attribution: "multi" },
  "sycophantic": { era: "evergreen", attribution: "multi" },
  "filler": { era: "2023" },
  "generic-conclusion": { era: "2023" },
  "lets-construction": { era: "evergreen" },
  "reasoning-artifact": { era: "2025-26" },
  "acknowledgment-loop": { era: "evergreen" },
  "significance-inflation": { era: "2024-25" },
  "vague-attribution": { era: "evergreen" },
  "hollow-intensifier": { era: "evergreen" },
  "emotional-flatline": { era: "2024-25" },
  "lingering-attention": { era: "2025-26" },
  "novelty-inflation": { era: "2025-26" },
  "cutoff-disclaimer": { era: "2023", attribution: "multi" },
  "template-phrase": { era: "2023" },
  "false-concession": { era: "2024-25" },
  "rhetorical-question": { era: "2024-25" },
  "confidence-calibration": { era: "evergreen" },
  // Post-2025 nuance: OpenAI suppressed em dashes in Nov 2025; by mid-2026
  // only Claude-family output exceeds professional writers, making density a
  // partial model-attribution hint rather than a generic AI tell.
  "em-dash-density": { era: "2025-26", attribution: "claude" },
  "not-just-contrast": { era: "2024-25" },
  "uniform-sections": { era: "evergreen" },
  "uniform-list-items": { era: "evergreen" },
  "sentence-flatline": { era: "2023" },
  "uniformity": { era: "evergreen" },
  "formatting": { era: "evergreen", attribution: "multi" },
  "tier3-phrase": { era: "2023" },
  "tier3-phrase-cluster": { era: "2023" },
  "hashtag-stuff": { era: "evergreen" },
  "bullet-np-list": { era: "evergreen" },
  "hedge-stack": { era: "evergreen" },
  "future-narrative": { era: "2024-25" },
  "real-actual-inflation": { era: "2025-26" },
  "social-cta-closer": { era: "2025-26" },
  "formulaic-opener": { era: "2023" },
  "speculative-opener": { era: "2023" },
  "title-case-header": { era: "evergreen" },
  "parenthetical-hedge": { era: "2025-26" },
  "smart-punct-signature": { era: "evergreen" },
  "punct-distribution": { era: "evergreen" },
  "fnword-trigram-entropy": { era: "evergreen" },
  "cross-para-burstiness": { era: "evergreen" },
  "normalization-flag": { era: "evergreen" },
  "low-ttr": { era: "2023" },
  "ai-placeholder": { era: "evergreen", attribution: "multi" },
  "ai-citation-markup": { era: "2025-26", attribution: "multi" },
  "ai-utm-source": { era: "2024-25", attribution: "multi" },
  // ── v3 artefact forensics ──
  "ai-citation-token": { era: "2025-26", attribution: "multi" },
  "reasoning-leak": { era: "2025-26" },
  "placeholder-token": { era: "2024-25" },
  "pua-character": { era: "2025-26", attribution: "chatgpt" },
  "math-alphanumeric": { era: "2025-26", attribution: "chatgpt" },
  "arrow-decoration": { era: "2025-26", attribution: "chatgpt" },
  "escaped-markup-literal": { era: "evergreen", attribution: "multi" },
  // ── v3 tier A phrase/structural ──
  "neg-parallelism": { era: "2024-25" },
  "tripled-negation": { era: "2025-26", attribution: "chatgpt" },
  "despite-challenges-arc": { era: "2023" },
  "metaphor-cluster": { era: "2023" },
  "participial-tail": { era: "evergreen" },
  "focal-density": { era: "2023" },
  "owner-phrase": { era: "2023" },
  "power-verb-compound": { era: "2023" },
  "outcome-tail": { era: "2023" },
  "conclusion-cta": { era: "2023" },
  // ── v3 tier B (corroboration-weight) ──
  "liang-cluster": { era: "2024-25" },
  "kobak-density": { era: "2023" },
  "promo-travel": { era: "2023" },
  "pivotal-role": { era: "2024-25" },
  "legacy-framing": { era: "2024-25", attribution: "multi" },
  "notability-canned": { era: "2025-26" },
  "buzzword-phrase": { era: "2023" },
  "faux-insight": { era: "2025-26" },
  "rhetorical-qa": { era: "2024-25", attribution: "chatgpt" },
  "didactic-note": { era: "2023" },
  "narrative-cliche": { era: "2024-25" },
  "valuable-insights": { era: "2024-25" },
  "copula-avoidance": { era: "evergreen" },
  "bold-label-bullets": { era: "evergreen", attribution: "multi" },
  "emoji-decoration": { era: "2024-25", attribution: "chatgpt" },
  "heading-inflation": { era: "2024-25", attribution: "gemini" },
  "staccato-fragments": { era: "2025-26" },
  "tricolon-density": { era: "evergreen" },
  "transition-stacking": { era: "2023" },
  "quote-inconsistency": { era: "2025-26", attribution: "chatgpt" },
  "token-cutoff": { era: "2023", attribution: "chatgpt" },
  "setup-expansion-cadence": { era: "2025-26" },
  "passive-ratio": { era: "evergreen" },
  "low-specificity": { era: "evergreen" },
  "adjacent-lemma-repeat": { era: "evergreen" },
  "fiction-claudeism": { era: "2024-25", attribution: "claude" },
  "fiction-promptonym": { era: "2024-25", attribution: "multi" },
  "fiction-slop-phrase": { era: "2024-25", attribution: "multi" },
  "owner-phrase-b": { era: "2023" },
  "owner-vocab-b": { era: "2023" },
  "directive-colon-bullets": { era: "2024-25" },
  "teach-preach-headings": { era: "2023" },
  "by-ving-template": { era: "2023" },
  "invalid-isbn": { era: "evergreen" },
  "proximity-cluster": { era: "evergreen" },
  // ── 2026.08.6 provider-eval furniture rules ──
  // deepseek 99.3% / google-25 95.3% / mistral 94.7% carry bold; heaviest in
  // the 2024+ chat register across vendors → multi attribution.
  "markdown-bold": { era: "2024-25", attribution: "multi" },
  "markdown-heading": { era: "2025-26", attribution: "multi" },
  "markdown-furniture": { era: "2024-25", attribution: "multi" },
};

/** Categories whose findings are corroboration-weight only (research Tier B). */
export const CORROBORATION_CATEGORIES: ReadonlySet<string> = new Set([
  "liang-cluster", "kobak-density", "promo-travel", "pivotal-role",
  "legacy-framing", "notability-canned", "buzzword-phrase", "faux-insight",
  "rhetorical-qa", "didactic-note", "narrative-cliche", "valuable-insights",
  "copula-avoidance", "bold-label-bullets", "emoji-decoration",
  "heading-inflation", "staccato-fragments", "tricolon-density",
  "transition-stacking", "quote-inconsistency", "token-cutoff",
  "setup-expansion-cadence", "passive-ratio", "low-specificity",
  "adjacent-lemma-repeat", "fiction-claudeism", "fiction-promptonym",
  "fiction-slop-phrase", "owner-phrase-b", "owner-vocab-b",
  "directive-colon-bullets", "teach-preach-headings", "by-ving-template",
  "invalid-isbn", "proximity-cluster", "escaped-markup-literal",
  // 2026.08.6: markdown-furniture rules are corroboration-weight by design —
  // their absence must never count in favour of a human verdict, because an
  // editor paste that strips formatting removes the signal entirely
  // (PROVIDER-EVAL-2026-08.md §1 honest gaps, §4.1 caveats). Their
  // classification power comes from the zero-FP escalation floors, not from
  // severity or weight.
  "markdown-bold", "markdown-heading", "markdown-furniture",
]);

// ─── 2026.08.4 escalation-policy category sets ───────────────────────
// Derived from the real-world evaluation (research/REAL-WORLD-EVAL-2026-08.md
// §4a): the rule tier produced artefact evidence on 7/7 artefact-bearing AI
// samples yet classified almost all of them human_like. These sets feed the
// post-scoring escalation policy in en-signals-v2.ts. Human controls fired
// none of these categories (0/4), so the policy adds no human FP risk.

/**
 * Tier-A artefact-forensics categories that alone justify flooring the
 * classification at mixed_signals (near-zero FP; none fired on any human
 * control in the evaluation).
 */
export const ARTEFACT_CORE_CATEGORIES: ReadonlySet<string> = new Set([
  "ai-citation-markup", "ai-citation-token", "ai-utm-source",
  "reasoning-leak", "placeholder-token", "ai-placeholder",
  "pua-character", "math-alphanumeric",
]);

/**
 * Artefact-adjacent categories that count toward the floor only when
 * co-occurring with other artefact evidence — the evaluation kept
 * arrow-decoration corroboration-only on its own (arrows are common in
 * genuine technical notes; eval §4b).
 */
export const ARTEFACT_SUPPORT_CATEGORIES: ReadonlySet<string> = new Set([
  "arrow-decoration", "escaped-markup-literal",
]);

/**
 * Chat-export formatting furniture: three or more of these together form the
 * formatting-cluster compound (eval §4a item 4; evidence opace-openai-006).
 */
export const FORMATTING_CLUSTER_CATEGORIES: ReadonlySet<string> = new Set([
  "bold-label-bullets", "heading-inflation", "emoji-decoration", "arrow-decoration",
]);

// ─── 2026.08.6 provider-eval furniture calibration ───────────────────
// Measured thresholds from services/local-engine/research/provider-eval/
// PROVIDER-EVAL-2026-08.md §4.1 (1,727 AI + 169 held-out humans; every
// number below fired on 0/169 humans, 0/10 business-marketing humans).
// The bullets rate is R5's measured gate; bold/heading fire on ANY
// occurrence because both occurred in 0/169 human documents.
export const V6_FURNITURE_THRESHOLDS = {
  /** R5: bullet lines per 1,000 words above which bullets alone open the gate. */
  bulletsPer1000: 10.75,
} as const;

/**
 * Stylometric measurement categories. Their combined contribution to the
 * document score is capped in en-signals-v2.ts so stylometrics can never
 * dominate a verdict (research correction: non-native-writer false-positive
 * landmine; Stanford TOEFL study).
 */
export const STYLOMETRIC_CATEGORIES: ReadonlySet<string> = new Set([
  "punct-distribution", "cross-para-burstiness", "fnword-trigram-entropy",
  "sentence-flatline", "uniformity", "uniform-sections", "uniform-list-items",
  "low-ttr", "smart-punct-signature", "em-dash-density",
  "setup-expansion-cadence", "passive-ratio", "low-specificity",
  "adjacent-lemma-repeat", "copula-avoidance", "tricolon-density",
  "staccato-fragments", "transition-stacking", "heading-inflation",
]);

// ─── Artefact forensics (near-zero FP, model-attributing) ────────────
// Exposed internal citation tokens. Each pattern carries the model family the
// token is characteristic of (seed `art-citation-tokens`).
export interface AttributedPattern { pattern: RegExp; attribution: string }
export const AI_CITATION_TOKENS: readonly AttributedPattern[] = [
  { pattern: /【\d+†L\d+(?:-L?\d+)?】/g, attribution: "deepseek" },
  { pattern: /\bgrok_render_citation_card_json\b/gi, attribution: "grok" },
  { pattern: /\bgrok-card\s+data-id\b/gi, attribution: "grok" },
  { pattern: /ppl-ai-file-upload/gi, attribution: "perplexity" },
  { pattern: /\[attached_file:\d+\]/gi, attribution: "perplexity" },
  { pattern: /\[web:\d+\]/g, attribution: "perplexity" },
  { pattern: /\[cite:\s*\d+\]/g, attribution: "gemini" },
  { pattern: /\[span_\d+\]\(start_span\)/g, attribution: "gemini" },
  { pattern: /\battributableIndex\b/g, attribution: "chatgpt" },
  { pattern: /:::writing\{/g, attribution: "chatgpt" },
  { pattern: /\bciteturn\d+(?:search|image|news|navigation)\d+/gi, attribution: "chatgpt" },
];

export const REASONING_LEAKS: readonly RegExp[] = [
  /\bthe\s+user\s+(?:wants|is\s+asking|requested|has\s+asked)\b/gi,
  /\breviewer\s+note\s*[:—-]/gi,
  /\bas\s+per\s+(?:the\s+)?(?:system\s+)?prompt\b/gi,
  /\bso\s+i\s+should\s+(?:structure|frame|word)\s+(?:the|this|my)\b/gi,
];

export const PLACEHOLDER_TOKENS: readonly RegExp[] = [
  /\bINSERT_[A-Z][A-Z_]{2,40}\b/g,
  /\bPASTE_[A-Z][A-Z_]{2,40}\b/g,
  /\baccess-date\s*=\s*\d{4}-XX-XX\b/gi,
];

// Pure codepoint checks implemented HERE as pattern rules because
// packages/core/src/unicode/ is owned by another workstream — the unicode
// module reports carriers/confusables; these rules report the pattern-layer
// editorial reading of the same characters. Overlap is deliberate and noted
// in the workstream report.
export const PUA_RANGE_RE = /[\uE000-\uF8FF]/g;
export const MATH_ALPHANUMERIC_RE = /[\u{1D400}-\u{1D7FF}]/gu;
/** Spaced arrow used as a prose connector ("input → output"). */
export const ARROW_CONNECTOR_RE = /(?<=\S)\s[\u2192\u2794\u27A1]\s(?=\S)/g;

export const ESCAPED_MARKUP_LITERALS: readonly RegExp[] = [
  /&nbsp;/g,
  /(?<!\\)\\n\\n/g,
];

// ─── Tier A phrase / structural rules ────────────────────────────────
// Negative parallelism, non-dash form ("not only X but also Y"). Flagged only
// at 2+ occurrences per document (Pew 2026: ~3x human rate; JFK used it too).
export const NEG_PARALLELISM_RE =
  /\bnot\s+(?:just|only|merely)\s+[^.!?\n]{2,60}?,?\s+but\s+(?:also\s+|rather\s+)?\w+/gi;

/** "Not X. Not Y. Just Z." tripled negation (ChatGPT-family favourite). */
export const TRIPLED_NEGATION_RE =
  /\b(?:Not|No)\s+[^.!?,\n]{2,30}[.,]\s*(?:Not|no)\s+[^.!?,\n]{2,30}[.,]\s*(?:Just|just)\s+\w+/g;

/** The rigid "Despite challenges … continues to thrive" essay arc. */
export const DESPITE_CHALLENGES_RE =
  /\bDespite\s+(?:these|its|numerous|various|several)\s+(?:challenges|setbacks|obstacles)\b[^.!?\n]{0,120}?(?:continues?\s+to\s+(?:thrive|grow|flourish)|faces?\s+(?:several\s+|numerous\s+)?challenges)/gi;

/** Figurative metaphor cluster — flag 2+ DISTINCT items per document. */
export const METAPHOR_CLUSTER_RES: readonly RegExp[] = [
  /\b(?:rich\s+tapestry|tapestry\s+of)\b/gi,
  /\b(?:complex|intricate)\s+interplay\b/gi,
  /\b(?:ever-)?evolving\s+landscape\b/gi,
  /\ba\s+testament\s+to\b/gi,
  /\bbeacon\s+of\b/gi,
];

/**
 * Sentence-final present-participle significance tail (Reinhart et al. PNAS
 * 2025; WP:SUPERFICIAL). Flagged only at 3+ per document — one -ing tail is
 * ordinary English.
 */
export const PARTICIPIAL_TAIL_RE =
  /,\s+(?:highlighting|underscoring|reflecting|symboli[sz]ing|showcasing|emphasi[sz]ing|demonstrating|ensuring|fostering|solidifying|cementing|signaling|signalling|contributing\s+to)\b[^.!?\n]{5,80}[.!?]/g;

/**
 * Focal-word density (Juzek & Ward COLING 2025; Kobak Science Advances 2025;
 * Liang ICML 2024; Pew 2026 — the triple-validated core lexicon). A DENSITY
 * rule: fires once per document when 3+ hits land at 3+ per 1,000 words.
 */
export const FOCAL_WORD_RE =
  /\b(?:delv(?:e|es|ed|ing)|showcas(?:e|es|ing)|boasts?|underscor(?:e|es|ing)|intricac(?:y|ies)|intricate(?:ly)?|surpass(?:es|ing)|garner(?:ed|s)?|emphasi[sz]ing|groundbreaking|meticulous(?:ly)?|commendable|pivotal|elucidat(?:e|es|ing)|advancements)\b/gi;

// Owner Tier A phrases (OWNER-DOCS-TELLS.md §8 merge plan; provenance kept in
// one category so the owner pack stays traceable against the web pack).
export const OWNER_PHRASES: readonly RegExp[] = [
  /\blook\s+no\s+further\b/gi,
  /\bcomprehensive\s+suite\s+of\b/gi,
  /\btailored\s+solutions?\b/gi,
  /\bunlock(?:ing)?\s+(?:its|your|their|the)\s+full\s+potential\b/gi,
  /\bbefore\s+diving\s+in(?:to)?\b/gi,
  /\bcommon\s+pitfalls\s+and\s+how\s+to\s+avoid\s+them\b/gi,
  /\b(?:break(?:ing)?\s+(?:down\s+)?the\s+process\s+(?:down\s+)?into|process\s+can\s+be\s+broken\s+down\s+into)\b/gi,
  /\bunderstanding\s+your\s+starting\s+point\b/gi,
  /\bwhile\s+it\s+might\s+seem\s+counterintuitive\b/gi,
  /\bcommon\s+choices\s+include\b/gi,
  /\bwhere\s+things\s+get\s+interesting\b/gi,
  /\bright\?\s*Well,\s+not\s+any\s*more\b/gi,
  /\bthe\s+future\s+of\s+[\w\s]{1,30}\s+is\s+increasingly\s+(?:shaped|driven|defined)\s+by\b/gi,
  /\btake\s+action\s+now\b/gi,
  /\banother\s+(?:important|key|crucial)\s+(?:aspect|factor|thing|element|point)\s+to\s+consider\b/gi,
  /\bby\s+doing\s+so,?\s+you(?:['’]ll|\s+can|\s+will)\b/gi,
  /\bit['’]?s\s+(?:crucial|important|essential)\s+to\s+remember\b/gi,
  /\bhere\s+are\s+(?:\d+|five|six|seven|eight|nine|ten)\s+(?:simple\s+|key\s+|essential\s+)?(?:steps|things|ways|tips|strategies|best\s+practices|key\s+elements)\b/gi,
  /\bkey\s+(?:elements|aspects|factors|components|considerations)\s+include\b/gi,
  /\b(?:to\s+)?put\s+it\s+simply\b/gi,
  /\bescape\s+the\s+stresses\s+of\s+daily\s+life\b/gi,
  /\bworks?\s+wonders\b/gi,
];

/** Power verb within a few tokens of an intangible buzz-adjective (owner §3e). */
export const POWER_VERB_COMPOUND_RE =
  /\b(?:ensur(?:e|es|ing)|leverag(?:e|es|ing)|prioriti[sz](?:e|es|ing)|harness(?:es|ing)?|enhanc(?:e|es|ing)|capitali[sz](?:e|es|ing)\s+on|deliver(?:s|ing)?)\s+(?:\w+\s+){0,3}(?:holistic|seamless|robust|sustainable|scalable|exceptional|strategic|transformative)\b/gi;

/** ", leading to increased/improved X" outcome tail (owner §3f). */
export const OUTCOME_TAIL_RE =
  /,\s*leading\s+to\s+(?:increased|improved|enhanced|greater|better)\s+\w+/gi;

/** Compound marketing conclusion: "by following these steps … boost/improve". */
export const CONCLUSION_CTA_RE =
  /\bby\s+following\s+these\s+(?:steps|tips|strategies|best\s+practices)\b[^.!?\n]{0,80}?\b(?:boost|improve|enhance|transform|elevate|significantly)\w*/gi;

// ─── Tier B rules (low severity, corroboration) ──────────────────────
// Liang et al. 2024 overused evaluative adjectives/adverbs (facts from the
// paper; words already in TIER1/TIER2 omitted to avoid double counting).
// Cluster rule: 3+ DISTINCT items per document.
export const LIANG_CLUSTER_RE =
  /\b(?:versatile|ingenious|methodical(?:ly)?|insightful|laudable|admirable|profound|intriguing(?:ly)?|cogent|lucid|noteworthy|thoughtfully|judiciously|elegantly|compellingly|synergistically|succinctly|comprehensively|strategically|aptly|hitherto|herein)\b/gi;

// Kobak et al. style-lexicon subset (excess_words.csv derivation; the full
// 407-word CSV is not bundled — see workstream report). Cluster: 4+ distinct.
export const KOBAK_CLUSTER_RE =
  /\b(?:notable|noteworthy|unparalleled|invaluable|culminating|thereby|garnered|surpassing|groundbreaking|commendable|advancements|encompass(?:es|ing)?)\b/gi;

// Promotional/travel register cluster (seed `lex-promo-travel`): 2+ distinct.
export const PROMO_TRAVEL_RE =
  /\b(?:in\s+the\s+heart\s+of|breathtaking|rich\s+cultural\s+heritage|treasure\s+trove|diverse\s+array|must-visit|hidden\s+gem)\b/gi;

export const PIVOTAL_ROLE_RE =
  /\bplays?\s+a\s+(?:crucial|pivotal|vital|key)\s+role\s+in(?:\s+shaping)?\b/gi;

// Legacy/significance framing (WP:AILEGACY): flagged only when STACKED (2+
// distinct phrases) — historians and obituarists use singles legitimately.
export const LEGACY_FRAMING_RE =
  /\b(?:pivotal\s+moment|enduring\s+legacy|indelible\s+mark|key\s+turning\s+point|setting\s+the\s+stage\s+for|deeply\s+rooted)\b/gi;

export const NOTABILITY_CANNED_RE =
  /\b(?:profiled\s+in\s+multiple\s+outlets|independent\s+coverage|active\s+social\s+media\s+presence|widely-read\s+outlets)\b/gi;

export const BUZZWORD_PHRASES: readonly RegExp[] = [
  /\bunlock(?:ing)?\s+the\s+(?:potential|power)\s+of\b/gi,
  /\bharness(?:ing)?\s+the\s+power\s+of\b/gi,
  /\bembark(?:ing)?\s+on\s+a\s+journey\b/gi,
  /\bat\s+the\s+forefront\s+of\b/gi,
  /\bbridg(?:e|ing)\s+the\s+gap\s+between\b/gi,
  /\bpav(?:e|ing)\s+the\s+way\s+for\b/gi,
  /\bpush(?:ing)?\s+the\s+boundaries\s+of\b/gi,
  /\bnavigat(?:e|ing)\s+the\s+complexit(?:y|ies)\b/gi,
  /\btake\s+(?:it|things)\s+to\s+the\s+next\s+level\b/gi,
];

export const FAUX_INSIGHT_RE =
  /\b(?:here['’]?s\s+what\s+nobody\s+tells\s+you|what\s+most\s+people\s+get\s+wrong|here['’]?s\s+the\s+kicker|plot\s+twist:|the\s+part\s+everyone\s+misses)\b/gi;

/** "The result? A platform that scales." — flagged at 2+ per document. */
export const RHETORICAL_QA_RE =
  /\b[Tt]he\s+(?:result|goal|answer|solution|problem|catch|best\s+part)\?\s+[A-Z]/g;

export const DIDACTIC_NOTE_RE =
  /\b(?:it['’]?s\s+(?:important|crucial|essential)\s+to\s+(?:understand|recognise|recognize)|(?:results|experiences|mileage)\s+may\s+vary|it\s+should\s+be\s+noted)\b/gi;

export const NARRATIVE_CLICHE_RE =
  /\b(?:faced\s+numerous\s+challenges|newfound\s+sense\s+of\s+purpose|poignant\s+reminder|serves\s+as\s+a\s+(?:powerful|poignant)\s+reminder)\b/gi;

export const VALUABLE_INSIGHTS_RE =
  /\b(?:provid(?:es?|ing)\s+valuable\s+insights?\s+into|key\s+takeaways?\b)/gi;

/** Copula-avoidance alternatives (Geng & Trotta arXiv:2404.08627). */
export const COPULA_ALTERNATIVE_RE =
  /\b(?:serves?|stands?|functions?|operates?)\s+as\s+(?:a|an|the)\b/gi;

export const BOLD_LABEL_BULLET_RE = /^\s*[-*+•]\s*\*\*[^*\n]{2,40}\*\*[:.]?\s/;

export const EMOJI_DECOR_RE =
  /[\u{1F680}\u{2728}\u{1F9E0}\u{2705}\u{1F449}\u{1F4A1}\u{1F3AF}\u{1F525}\u{1F4CC}\u{1F4C8}\u{26A1}\u{1F511}]/u;

export const RITUAL_HEADING_RE = /^(?:#{1,6}[ \t]+\S.*|<h[1-6][^>]*>.*)$/gim;

/** ≤4-word staccato fragment run threshold is 3 consecutive. */
export const STACCATO_MAX_WORDS = 4;

export const TRANSITION_OPENER_RE =
  /^\s*(?:Additionally|Moreover|Furthermore|Subsequently|In\s+addition|What['’]s\s+more)\b/i;

/** Fiction-lane packs (reimplemented from public observations; the AGPL
 * claudeslop.yaml list was NOT copied — see licensing header). */
export const FICTION_CLAUDEISM_RE =
  /\b(?:ministrations|audible\s+pop|rivulets\s+of|half-lidded\s+eyes|despite\s+(?:herself|himself)|with\s+reckless\s+abandon|knuckles\s+(?:turning|turned)\s+white|chuckl(?:es|ed)\s+darkly)\b/gi;

export const FICTION_PROMPTONYM_RE =
  /\b(?:Elara\s+(?:Voss|Vex)|Aris\s+Thorne|Elias\s+Vance|Whispering\s+(?:Woods|Pines|Hollow)|Eldoria)\b/g;

// Frequency-ranked fiction phrases (sam-paech/antislop-sampler, Apache-2.0).
export const FICTION_SLOP_RE =
  /\b(?:took\s+a\s+deep\s+breath|voice\s+barely\s+above\s+a\s+whisper|couldn['’]?t\s+help\s+but\s+feel|casting\s+long\s+shadows|shivers?\s+(?:ran|run(?:ning)?)\s+down\s+(?:my|her|his|their)\s+spine|heart\s+pounding\s+in\s+(?:her|his|my)\s+chest|the\s+room\s+fell\s+silent|days\s+turned\s+into\s+weeks|maybe,\s+just\s+maybe|little\s+did\s+(?:she|he|they)\s+know|unbeknownst\s+to\s+(?:them|her|him))\b/gi;

// Owner Tier B phrases (behind corroboration weighting).
export const OWNER_PHRASES_B: readonly RegExp[] = [
  /\bshed(?:s|ding)?\s+light\s+on\b/gi,
  /\ba\s+popular\s+choice\s+for\b/gi,
  /\bconsult(?:ing)?\s+with\s+a\s+(?:professional|specialist|qualified)\b/gi,
  /\bas\s+a\s+professional\s*,/gi,
  /\bstay(?:ing)?\s+ahead\s+of\s+the\s+curve\b/gi,
  /\bI\s+am\s+not\s+a\s+(?:lawyer|doctor|financial\s+advisor|professional)\s*,?\s+but\b/gi,
  /\bsafety\s+should\s+never\s+be\s+(?:overlooked|compromised)\b/gi,
  /\bpresent\s+challenges\s+due\s+to\b/gi,
  /\bextending\s+their\s+lifespan\b/gi,
  /\beven\s+the\s+best\s+plans\s+can\b/gi,
];

/** Owner ban-list vocabulary, tier B (2+ distinct per document). */
export const OWNER_VOCAB_B_RE = /\b(?:essence|facets?|exhaustive|pesky|folks)\b/gi;

export const DIRECTIVE_COLON_BULLET_RE =
  /^\s*(?:[-*+•]|\d+[.)])\s*(?:Plan|Ensure|Optimi[sz]e|Enhance|Leverage|Prioriti[sz]e|Implement|Utili[sz]e|Consider|Embrace)\b[^.:\n]{0,50}:/;

export const TEACH_PREACH_HEADING_RE =
  /^#{1,6}\s+(?:why\s+(?:it|this)\s+(?:matters|is\s+important)|how\s+to\s+get\s+started|final\s+thoughts|key\s+takeaways|common\s+pitfalls)\s*\??\s*$/gim;

export const BY_VING_TEMPLATE_RE =
  /\bBy\s+\w+ing\s+[^,.\n]{5,60},\s+you\s+can\s+\w+/g;

/** Passive-voice heuristic: be-form + past participle. */
export const PASSIVE_RE =
  /\b(?:is|are|was|were|been|being|be)\s+(?:\w+ly\s+)?\w{3,}(?:ed|en|wn|lt)\b/gi;

// ─── Weights and metadata ────────────────────────────────────────────
export const V3_ISSUE_WEIGHTS: Record<string, number> = {
  // artefact forensics
  "ai-citation-token": 15,
  "reasoning-leak": 12,
  "placeholder-token": 10,
  "pua-character": 14,
  "math-alphanumeric": 12,
  "arrow-decoration": 4,
  "escaped-markup-literal": 3,
  // tier A phrase/structural
  "neg-parallelism": 5,
  "tripled-negation": 5,
  "despite-challenges-arc": 5,
  "metaphor-cluster": 4,
  "participial-tail": 5,
  "focal-density": 5,
  "owner-phrase": 5,
  "power-verb-compound": 6,
  "outcome-tail": 4,
  "conclusion-cta": 6,
  // tier B (low weights; corroboration)
  "liang-cluster": 2,
  "kobak-density": 2,
  "promo-travel": 2,
  "pivotal-role": 2,
  "legacy-framing": 3,
  "notability-canned": 2,
  "buzzword-phrase": 2,
  "faux-insight": 2,
  "rhetorical-qa": 2,
  "didactic-note": 2,
  "narrative-cliche": 3,
  "valuable-insights": 2,
  "copula-avoidance": 3,
  "bold-label-bullets": 3,
  "emoji-decoration": 2,
  "heading-inflation": 3,
  "staccato-fragments": 3,
  "tricolon-density": 2,
  "transition-stacking": 3,
  "quote-inconsistency": 2,
  "token-cutoff": 2,
  "setup-expansion-cadence": 3,
  "passive-ratio": 3,
  "low-specificity": 2,
  "adjacent-lemma-repeat": 3,
  "fiction-claudeism": 3,
  "fiction-promptonym": 3,
  "fiction-slop-phrase": 2,
  "owner-phrase-b": 2,
  "owner-vocab-b": 2,
  "directive-colon-bullets": 3,
  "teach-preach-headings": 2,
  "by-ving-template": 3,
  "invalid-isbn": 3,
  "proximity-cluster": 2,
  // 2026.08.6 furniture rules (low weights; the escalation floors carry the
  // detection, and the weights stay small so furniture cannot fake breadth).
  "markdown-bold": 3,
  "markdown-heading": 3,
  "markdown-furniture": 4,
};

export interface V3CategoryMeta {
  severity: "note" | "low" | "medium" | "high";
  message: string;
  suggestion: string;
}

const B = "A weak signal on its own, reported only as corroboration alongside other findings. It is a stylistic hint, not evidence of authorship.";
const NN = "Formal or non-native English writing can legitimately read this way; ";

export const V3_CATEGORY_META: Record<string, V3CategoryMeta> = {
  "ai-citation-token": { severity: "high", message: "An internal AI-tool citation token has leaked into the text — a token characteristic of a specific chatbot's export (see evidence.attribution). This is among the strongest stylistic evidence available, but it is still evidence, not proof of authorship.", suggestion: "Delete the leaked token and replace it with a real citation." },
  "reasoning-leak": { severity: "high", message: "Text narrating the writing task itself (assistant deliberation or reviewer notes) appears in the prose — characteristic of unedited reasoning-model output. Strong stylistic evidence, but still not proof of authorship.", suggestion: "Remove the meta-commentary and keep only the finished prose." },
  "placeholder-token": { severity: "high", message: "An unfilled machine placeholder token remains in the text. This is a strong stylistic signal, but still stylistic evidence, not proof of authorship.", suggestion: "Fill in or remove the placeholder before publishing." },
  "pua-character": { severity: "high", message: "Private Use Area characters appear in the text — ChatGPT exports wrap citation tokens in these; icon fonts are the only common benign source. Strong stylistic evidence, but still not proof of authorship.", suggestion: "Remove the private-use characters and check for adjacent leaked citation tokens." },
  "math-alphanumeric": { severity: "high", message: "Mathematical-alphanumeric Unicode letters (fake bold/italic text) appear in prose — characteristic of chatbot copy-paste and social formatters. Strong stylistic evidence, but still not proof of authorship.", suggestion: "Replace the styled characters with ordinary text and real formatting." },
  "arrow-decoration": { severity: "medium", message: "Arrow characters are used repeatedly as prose connectors, a machine-flavoured decoration habit. This is a stylistic hint, not evidence of authorship.", suggestion: "Write the relationship out in words." },
  "escaped-markup-literal": { severity: "low", message: "A literal escaped-markup fragment (e.g. &nbsp; or \\n) appears in the prose, typical of chat-interface copy-paste. " + B, suggestion: "Remove the stray markup literal." },
  "neg-parallelism": { severity: "medium", message: "The \"not only X but Y\" contrast template recurs through the text (flagged only when repeated). This is a stylistic hint, not evidence of authorship.", suggestion: "Keep at most one; state the point directly elsewhere." },
  "tripled-negation": { severity: "medium", message: "A \"Not X. Not Y. Just Z.\" tripled-negation template appears here. This is a stylistic hint, not evidence of authorship.", suggestion: "Say what the thing is without the triple set-up." },
  "despite-challenges-arc": { severity: "medium", message: "The rigid \"despite challenges … continues to thrive\" essay arc appears here. This is a stylistic hint, not evidence of authorship.", suggestion: "Name the specific challenge and the specific response." },
  "metaphor-cluster": { severity: "medium", message: "Multiple stock abstract metaphors (tapestry, interplay, evolving landscape, testament) cluster in one document. This is a stylistic hint, not evidence of authorship.", suggestion: "Replace the metaphors with the concrete facts they stand in for." },
  "participial-tail": { severity: "medium", message: "Sentences repeatedly end with a present-participle significance clause (\", highlighting …\", \", underscoring …\") — a documented pattern at several times the human rate. This is a stylistic hint, not evidence of authorship.", suggestion: "End the sentence at the fact; cut the significance tail or make it a sourced claim." },
  "focal-density": { severity: "medium", message: "Words from the empirically overused AI focal lexicon (delve, showcase, pivotal, meticulous …) appear at high density for the length of the text. Density is the signal — each word alone is legitimate English. This is a stylistic hint, not evidence of authorship.", suggestion: "Swap most of these for plainer verbs and adjectives." },
  "owner-phrase": { severity: "medium", message: "A template phrase from the documented generic-drafting phrasebook appears here. This is a stylistic hint, not evidence of authorship.", suggestion: "Replace the template with a specific statement." },
  "power-verb-compound": { severity: "high", message: "A power verb is paired with an intangible buzz-adjective (\"leverage a robust…\", \"ensure seamless…\"), the value-stacking formula of generic drafting. This is a stylistic hint, not evidence of authorship.", suggestion: "Name the concrete action and the measurable property instead." },
  "outcome-tail": { severity: "medium", message: "A vague \", leading to increased X\" outcome tail closes the sentence. This is a stylistic hint, not evidence of authorship.", suggestion: "State the specific, checkable outcome or cut the tail." },
  "conclusion-cta": { severity: "high", message: "A \"by following these steps you can boost…\" marketing conclusion formula appears here. This is a stylistic hint, not evidence of authorship.", suggestion: "Close with a specific observation, not a generic benefit promise." },
  "liang-cluster": { severity: "low", message: "Several evaluative adjectives/adverbs from the documented AI-overuse lists cluster in this text. " + B, suggestion: "Keep only the evaluations you can support with specifics." },
  "kobak-density": { severity: "low", message: "Several words from the corpus-measured AI excess vocabulary cluster in this text. " + B, suggestion: "Vary the vocabulary or ground the claims in specifics." },
  "promo-travel": { severity: "low", message: "Promotional travel-brochure register phrases cluster here; the signal is strongest when the genre does not call for them. " + B, suggestion: "Describe the place or product with specifics instead." },
  "pivotal-role": { severity: "low", message: "The \"plays a crucial role in shaping\" formula appears here. " + B, suggestion: "Say what it actually does." },
  "legacy-framing": { severity: "low", message: "Multiple legacy/significance framings (\"enduring legacy\", \"pivotal moment\") are stacked in one piece. " + B, suggestion: "Let the events carry their own weight." },
  "notability-canned": { severity: "low", message: "A canned notability phrase (\"profiled in multiple outlets\") appears here. " + B, suggestion: "Name the outlets or drop the claim." },
  "buzzword-phrase": { severity: "low", message: "A stock corporate buzz-phrase (\"harness the power of\", \"at the forefront of\") appears here. " + B, suggestion: "Replace with the concrete capability or fact." },
  "faux-insight": { severity: "low", message: "A faux-insight setup (\"here's what nobody tells you\") appears here. " + B, suggestion: "Show the insight; do not announce it." },
  "rhetorical-qa": { severity: "low", message: "The self-posed \"The result? X.\" device recurs in this text. " + B, suggestion: "Use the device once at most." },
  "didactic-note": { severity: "low", message: "A didactic disclaimer formula (\"it's important to understand\", \"results may vary\") appears here. " + B, suggestion: "Cut the disclaimer or make it specific." },
  "narrative-cliche": { severity: "low", message: "A high-multiplier narrative cliché (\"faced numerous challenges\", \"poignant reminder\") appears here. " + B, suggestion: "Describe what actually happened." },
  "valuable-insights": { severity: "low", message: "A stock academic-boilerplate phrase (\"provides valuable insights into\") appears here. " + B, suggestion: "State the insight itself." },
  "copula-avoidance": { severity: "low", message: "The text repeatedly avoids plain \"is/has\" in favour of \"serves as / stands as / functions as\". " + NN + B, suggestion: "Use \"is\" and \"has\" where they fit." },
  "bold-label-bullets": { severity: "low", message: "A run of \"**Label:** description\" bullets structures this section, a common generated-scaffolding shape (also normal in technical docs). " + B, suggestion: "Convert to prose, or vary the item shapes." },
  "emoji-decoration": { severity: "low", message: "Emoji decorate several headings or bullets, a chat-interface formatting default in professional copy. " + B, suggestion: "Drop the decorative emoji in this register." },
  "heading-inflation": { severity: "low", message: "Headings are unusually dense for the amount of prose beneath them. SEO practice legitimately produces the same shape. " + B, suggestion: "Merge sections whose bodies are only a sentence or two." },
  "staccato-fragments": { severity: "low", message: "A run of consecutive punchy fragments appears here; deliberate ad copy does this too. " + B, suggestion: "Join some fragments into full sentences." },
  "tricolon-density": { severity: "low", message: "Balanced three-item constructions occur unusually often for the length of the text. " + B, suggestion: "Break the rhythm: use two items, or four." },
  "transition-stacking": { severity: "low", message: "Most paragraphs open with a formal connective (Furthermore, Moreover, Additionally). " + NN + B, suggestion: "Let the content carry the transition in most paragraphs." },
  "quote-inconsistency": { severity: "low", message: "Curly and straight double quotes are mixed in one text, a paste-from-chat-interface signature (word processors also cause it). " + B, suggestion: "Normalise the quotation marks either way." },
  "token-cutoff": { severity: "low", message: "The text ends mid-sentence, the shape of a token-limit truncation (or a mangled paste). " + B, suggestion: "Complete or trim the final sentence." },
  "setup-expansion-cadence": { severity: "low", message: "Short setup sentences are repeatedly followed by long expansions (or the mirror), a formulaic cadence. " + NN + B, suggestion: "Keep the device only where the short sentence stands on its own." },
  "passive-ratio": { severity: "low", message: "The passive-voice ratio is unusually high for marketing/blog register. Academic prose and " + NN.toLowerCase() + B, suggestion: "Recast most sentences with the actor as subject." },
  "low-specificity": { severity: "low", message: "The text contains almost no numbers, dates or named entities for its length. Corporate humans write contentless prose too. " + B, suggestion: "Add the concrete facts a reader could check." },
  "adjacent-lemma-repeat": { severity: "low", message: "Adjacent sentences repeatedly reuse the same content word. " + NN + B, suggestion: "Merge repetitive sentences or vary the wording where natural." },
  "fiction-claudeism": { severity: "low", message: "Phrases from the documented Claude-fiction idiolect appear here (fiction lane; romance authors use several legitimately). " + B, suggestion: "Rewrite the stock phrases in your own voice." },
  "fiction-promptonym": { severity: "low", message: "A statistically AI-over-represented fiction name (e.g. Elara Voss) appears here (fiction lane). " + B, suggestion: "Consider a less statistically loaded name." },
  "fiction-slop-phrase": { severity: "low", message: "Multiple frequency-ranked fiction clichés co-occur in this text (fiction lane; all are pre-existing human clichés). " + B, suggestion: "Cut or rework the stock beats." },
  "owner-phrase-b": { severity: "low", message: "A phrase from the secondary generic-drafting phrasebook appears here. " + B, suggestion: "Replace with a specific statement." },
  "owner-vocab-b": { severity: "low", message: "Several secondary filler words (essence, facet, pesky, folks) cluster in this text. " + B, suggestion: "Swap for plainer words where they add nothing." },
  "directive-colon-bullets": { severity: "low", message: "Several list items open with a directive verb and colon (\"Ensure X:\", \"Optimise Y:\"), a generated-checklist shape also used in genuine technical checklists. " + B, suggestion: "Vary the item constructions." },
  "teach-preach-headings": { severity: "low", message: "Stock tutorial scaffold headings (\"Why it matters\", \"Final thoughts\", \"Key takeaways\") structure this text. " + B, suggestion: "Name sections after their actual content." },
  "by-ving-template": { severity: "low", message: "The \"By doing X, you can Y\" template recurs in this text. " + B, suggestion: "State the benefit directly in most cases." },
  "invalid-isbn": { severity: "low", message: "An ISBN in the text fails its checksum — fabricated references cluster in generated citations, but typos cause the same failure. " + B, suggestion: "Verify the reference against the actual publication." },
  "proximity-cluster": { severity: "low", message: "A flagged buzzword repeats within a few sentences of itself. " + B, suggestion: "Keep one occurrence at most in each passage." },
  // 2026.08.6 furniture rules. Every message states the paste-stripping
  // caveat: the signal only exists when chat-export markdown survives, so
  // its ABSENCE says nothing about authorship.
  "markdown-bold": { severity: "low", message: "Literal **bold** markdown appears in the text — chat-export residue measured in 0 of 169 held-out human documents. If formatting was stripped by an editor paste, this signal simply disappears, so its absence never counts toward a human reading. " + B, suggestion: "Remove the raw markdown or apply real formatting." },
  "markdown-heading": { severity: "low", message: "A literal markdown heading line appears in the text — chat-export residue measured in 0 of 169 held-out human documents. If formatting was stripped by an editor paste, this signal simply disappears, so its absence never counts toward a human reading. " + B, suggestion: "Convert the heading to the destination format or remove it." },
  "markdown-furniture": { severity: "low", message: "Chat-export markdown furniture (bold runs, heading lines, or a dense bullet layout) shapes this text — a combined gate measured on 0 of 169 held-out human documents. If formatting was stripped by an editor paste, this signal simply disappears, so its absence never counts toward a human reading. " + B, suggestion: "Rework the exported formatting into the destination format." },
};

// ─── Tier C: documented exclusions (auditable non-coverage) ──────────
export interface ExcludedTell { id: string; reason: string }

/**
 * Harvest tells deliberately NOT implemented as user-facing rules. Each entry
 * names the seed/owner id and the reason (research tier C, correction, gate
 * the engine cannot provide, or licensing). Kept exported so coverage of the
 * research harvest is auditable in code.
 */
export const EXCLUDED_TELLS: readonly ExcludedTell[] = [
  { id: "lex-magic-adverbs", reason: "Tier C: feature-writing staple (quietly/deeply/fundamentally); too common in human prose to flag." },
  { id: "lex-clinical-formality", reason: "Tier C: standard register in government/legal/academic prose; ESL writers are taught this vocabulary." },
  { id: "lex-latinate-shift", reason: "Tier C: formal register and ESL academic training produce the same corpus shift; needs baselines the rule engine lacks." },
  { id: "lex-concrete-overuse", reason: "Tier C: ordinary word; only notable at density in platform-specific defensive replies." },
  { id: "lex-crosslingual-34", reason: "Tier C: non-English module; per-language calibration and time decay required before any flag ships." },
  { id: "lex-multilingual-translationese", reason: "Tier C: overlaps native bureaucratic registers that predate AI; held for a non-English module." },
  { id: "phr-in-connection-with", reason: "Tier C: standard legal/police-report phrasing; only iterative abundance signals." },
  { id: "phr-false-ranges", reason: "Tier C: separating fake from real 'from X to Y' ranges needs semantics, not regex." },
  { id: "phr-colon-reveal", reason: "Tier C: genuinely good device; recurrence-only signal with heavy human-copywriter overlap." },
  { id: "phr-audience-bracketing", reason: "Tier C in the seed for the generic form; the engine keeps only its pre-existing template-phrase variant." },
  { id: "phr-analogy-template", reason: "Tier C: explainer journalism uses 'Think of X as the Y of Z' constantly and well; needs semantic judgement." },
  { id: "phr-paired-adjectives", reason: "Tier C: legal drafting doubles synonyms deliberately; common human filler." },
  { id: "phr-weak-verbs", reason: "Tier C: 'is designed to' is accurate when describing genuine design intent." },
  { id: "phr-flip-script", reason: "Tier C: sports and culture journalists genuinely say it." },
  { id: "phr-refers-to", reason: "Tier C: textbook glossaries legitimately use 'refers to'." },
  { id: "phr-fake-profound-kicker", reason: "Tier C: personal essayists earn the aphoristic closer; detecting the unearned variant needs semantics." },
  { id: "phr-conservation-boilerplate", reason: "Tier C: niche domain; conservationists write about status legitimately." },
  { id: "phr-x-rather-than-y", reason: "Tier C: completely standard English; only meaningful at very high density (Grok attribution hint recorded in docs)." },
  { id: "phr-ultimate-guide", reason: "Tier C: human SEO writers used 'ultimate guide' titles since ~2010." },
  { id: "art-stale-access-dates", reason: "Tier C: copied citations, offline drafting and batch merges confound." },
  { id: "pun-oxford-comma", reason: "Tier C / anti-tell: house style for many publishers; corpus-drift indicator only, never per-document." },
  { id: "pun-colon-titles", reason: "Tier C: academic titles used colons for decades; anecdotal evidence base." },
  { id: "pun-human-marker-deficit", reason: "Tier C: absence-of-punctuation features are weak alone; plain-style human writers avoid semicolons deliberately." },
  { id: "str-nominalisation", reason: "Tier C: needs POS tagging and per-register calibration; bureaucratic/legal prose is naturally nominalisation-heavy." },
  { id: "str-title-case-headings", reason: "Tier C as a style-mismatch rule (needs house-style config); the engine's pre-existing register-gated title-case rule is retained unchanged." },
  { id: "str-compound-headings", reason: "Tier C: humans write 'Awards and recognition' sections; only exact canned wordings at corpus scale signal." },
  { id: "str-fractal-summaries", reason: "Tier C: essay pedagogy teaches 'tell them what you told them'; needs semantic detection." },
  { id: "str-anaphora", reason: "Tier C: classical rhetoric and speechwriting staple." },
  { id: "str-question-headings", reason: "Tier C + binding correction: deliberately taught SEO/AEO practice — human-authored AEO content trips this; needs a genre prior. Not implemented." },
  { id: "str-uniform-faq", reason: "Tier C + binding correction: SEO guides teach humans this exact snippet template; the pre-existing uniform-sections measurement stays corroboration-weight only and is capped with the other stylometrics." },
  { id: "str-unnecessary-tables", reason: "Tier C: 'trivial content tabulated' needs judgement; data journalists use tables well." },
  { id: "str-deletion-test", reason: "Tier C: highest-FP category; could ship as a QUALITY metric someday, never as an authenticity flag." },
  { id: "str-citation-absence", reason: "Tier C: genre-dependent absence signal; short or informal human texts also skip citations." },
  { id: "str-elegant-variation", reason: "Tier C: needs coreference resolution; old-school journalism taught the same habit." },
  { id: "str-genre-glitch", reason: "Tier C: needs register classification; feature journalists write deliberate colour." },
  { id: "str-balanced-noncommitment", reason: "Tier C: diplomatic and academic hedging is human too." },
  { id: "str-manufactured-personality", reason: "Tier C frontier: fake casual dev-blog voice defeats wordlists; needs semantic/behavioural detection." },
  { id: "str-invented-labels", reason: "Tier C: academics coin terms legitimately with definition and citation." },
  { id: "str-false-agency", reason: "Tier C: metonymy is standard English ('the market rallied'); cluster corroborator only." },
  { id: "str-edit-summary-formulas", reason: "Tier C: platform-specific (wiki edit summaries); future surface for commits/CMS revision notes, not the core engine." },
  { id: "str-defensive-comments", reason: "Tier C: platform-specific comment repertoire; polite non-native speakers write formally." },
  { id: "str-hallucinated-conventions", reason: "Tier C: requires a platform knowledge base; new users make similar mistakes by hand." },
  { id: "str-essay-scaffold", reason: "Tier B in the seed but needs genre awareness the engine lacks; its measurable parts ship via heading-inflation, transition-stacking and the pre-existing uniformity rules." },
  { id: "str-markdown-leakage-full", reason: "Tier A only INSIDE a surface gate the core engine does not have (markdown-native vs plain-text venue). Bold/heading density rules pre-exist; only the always-safe escaped-literal subset ships (escaped-markup-literal). Full rule awaits the surface concept in the WordPress layer." },
  { id: "sty-low-perplexity", reason: "Binding exclusion: >50% non-native TOEFL false-positive rate; legal exposure; out of scope for a rule engine." },
  { id: "sty-ttr-paradox", reason: "Tier C: contradictory directions by register; existing low-ttr rule stays low-weight instead." },
  { id: "sty-hedging-reversal", reason: "Binding correction: hedges DECREASED in post-LLM text — a naive hedging rule fires backwards and is deliberately not built. The pre-existing hedge-stack rule targets the specific modal+adverb stack, not hedge frequency." },
  { id: "sty-positivity-skew", reason: "Tier C: PR and brand copy is deliberately positive; lazy human reviewers write the same praise sandwich." },
  { id: "sty-homogenisation", reason: "Tier C: corpus-level (multi-document) feature; not a per-document rule." },
  { id: "sty-style-shift", reason: "Tier C: needs per-author history; future multi-document feature." },
  { id: "sty-machine-cleanliness", reason: "Anti-tell: Grammarly makes human text machine-clean; penalising cleanliness smears good writers. Never scored." },
  { id: "sty-anti-tells", reason: "The false-positive spec: perfect grammar, 'robotic feel', formality, isolated transitions, Oxford commas and em-dash presence are documented INEFFECTIVE indicators — encoded here as exclusions and exercised by QA fixtures." },
  { id: "sty-human-whitelist", reason: "Inverse signals (typos, first-person anecdote, pre-Nov-2022 dates) belong to a future negative-weight/protect-list layer, not to positive flags; flagging their absence would cross BRIEF.md §5's claim boundary." },
  { id: "sty-first-words", reason: "Unverified methodology and unlicensed source repo; not copied, not implemented." },
  { id: "mod-grok-idiolect", reason: "Tier C: social scientists use the vocabulary natively; attribution hint recorded in docs only." },
  { id: "mod-vendor-accents", reason: "Tier C: ML-classifier roadmap item (BRIEF §21 Tier C model), not a rule." },
  { id: "mod-structural-dialects", reason: "Tier C: vendor-blog evidence; used for calibration expectations, not scoring." },
  { id: "mod-rlhf-root-cause", reason: "Engine-design finding, not a surface tell." },
  { id: "art-fabricated-refs-network", reason: "Dead-link/DOI checks need network access the offline engine forbids; only the offline ISBN checksum ships (invalid-isbn)." },
  { id: "owner-journey-bare", reason: "Owner list, high FP: bare 'journey' needs a user-journey/travel guard the rule layer cannot express reliably; only phrase forms ship." },
  { id: "owner-tier-c-vocab", reason: "Owner tier C (thus, ultimately, nonetheless, promptly, remnant, arena, era, cool, essential, substantially, on the other hand, world of, competitive advantages, break down, stepping into): very high FP ordinary English; documented, not flagged." },
  { id: "owner-shed-article-fragments", reason: "Topic-specific residue from one AI article (caulk/weatherstripping etc.); not generic tells." },
  { id: "owner-absence-of-humanity", reason: "Zero-first-person, no-typos, no-emphasis-irregularity: flagging the absence of human traits crosses BRIEF.md §5 from editorial evidence toward authorship inference. Documented only." },
  { id: "owner-code-comment-tells", reason: "Owner tier C: only relevant if the engine ever scans code identifiers/comments." },
  { id: "owner-meta-description-template", reason: "Owner tier B but requires the WordPress meta-field surface; not implementable on plain text." },
  { id: "owner-cross-page-templates", reason: "Owner D2 §3.1 cross-page comparison is site-level; out of scope for the single-document engine." },
  { id: "lex-kobak-style-407-full", reason: "The full 407-word excess_words.csv is not bundled (licence file unverified in-repo); a representative regex subset ships as kobak-density." },
  // ── 2026.08.6: provider-eval risk-tiered candidates (PROVIDER-EVAL-2026-08.md
  // §4.2) — measured NONZERO human false positives on the 169-human corpus.
  // Deliberately NOT implemented; each needs an explicit owner decision.
  { id: "pe-tier3-threshold-lowering", reason: "Provider-eval §4.2/§4.3: lowering the tier3 threshold (0.8555/0.85/0.80) buys 33.7-75.7% TPR at 1-7 measured human FPs, dominated by business-marketing prose. ML workstream's recalibration problem, not a rules change; do not ship without owner decision." },
  { id: "pe-emdash-p99-6.59", reason: "Provider-eval §4.2: em-dash > 6.59/1000 (human p99) flags 2/169 humans (1 business-marketing). Em-dash rules already carry a documented human-FP history; owner decision required." },
  { id: "pe-fragmentshare-p99", reason: "Provider-eval §4.2: fragmentShare > 0.319 flags 2/169 humans. Business-marketing humans are themselves choppy; owner decision required." },
  { id: "pe-shortsentshare-p99", reason: "Provider-eval §4.2: shortSentShare > 0.535 flags 2/169 humans (1 business-marketing); owner decision required." },
  { id: "pe-flatline-escalation", reason: "Provider-eval §4.2: sentence-flatline with >=3 findings => mixed_signals flags 1/169 humans (qa-finance); owner decision required." },
  { id: "pe-emdash-extreme-10.07", reason: "Provider-eval §4.1 footnote: em-dash > 10.07/1000 (the human maximum) measured zero-FP but yields only openai-25 18.0 / grok 12.0 with all other slices <=10.7, is GPT/Grok-attributing rather than AI-detecting, and sits one essayist beyond the measured human max. Held back with the risk tier pending owner decision; the five headline zero-FP changes shipped instead." },
];
