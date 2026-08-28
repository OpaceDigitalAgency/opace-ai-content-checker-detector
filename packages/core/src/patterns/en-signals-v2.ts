/**
 * en-signals v2 — editorial writing-signal engine.
 *
 * TypeScript adaptation of the MIT-licensed `avoid-ai-writing` detection
 * engine (`detector/patterns.js`, Conor Bronsdon and contributors), snapshotted
 * in `source-snapshots/avoid-ai-writing/`. Attribution: THIRD_PARTY_NOTICES.md.
 *
 * Scope and claim boundary (BRIEF.md §5, §21): everything this module reports
 * is Tier B evidence — documented writing-pattern rules and stylometric
 * measurements. It describes style. It never proves, and must never be
 * presented as proving, who or what wrote a text.
 *
 * Adaptation notes (deliberate deviations from upstream):
 * - Findings carry exact spans into the ORIGINAL input text via an offset map
 *   maintained through the normalisation pre-pass, so `matched_text_hash`
 *   always hashes the literal input slice.
 * - The Markdown-blockquote strip pre-pass is omitted: this engine runs on
 *   projected visible text, and dropping lines would break span fidelity.
 * - The zero-weight `unnecessary-hyphenation` copyedit family (and its quote/
 *   path masking helpers) is not ported; it never affects the score and is a
 *   grammar copyedit rather than a writing signal.
 * - Sentence-region smoothing (UI highlighting) is not ported; spans on each
 *   finding replace it.
 * - `certainly!`/`absolutely!`/`great question!`/`excellent point!` use a
 *   trailing `\B` where upstream used `\b`, which could never assert after a
 *   closing `!` followed by a space — the canonical shape of the artefact.
 */
import type { PatternFinding } from "@opace/content-integrity-contracts";
import { rangeFromUtf16 } from "../source/offsets.js";
import { prefixedSha256 } from "../source/utf8.js";
import {
  ACKNOWLEDGMENT_LOOPS, AI_CITATION_MARKUP, AI_PLACEHOLDERS, AI_UTM_SOURCE,
  CATEGORY_META, CHATBOT_ARTIFACTS, CONFIDENCE_CALIBRATION, CUTOFF_DISCLAIMERS,
  CYRILLIC_LOOKALIKES, EMOTIONAL_FLATLINE, FALSE_CONCESSION, FILLERS,
  FORMULAIC_OPENERS, FUNC_WORDS, FUNCTION_WORD_IN_TITLE, FUTURE_NARRATIVE,
  GENERIC_CONCLUSIONS, GREEK_LOOKALIKES, HEDGE_STACK, HOLLOW_INTENSIFIERS,
  ISSUE_WEIGHTS, LETS_PATTERNS, LINGERING_ATTENTION, MD_HEADING_PREFIX,
  NOT_JUST_CONTRAST, NOVELTY_INFLATION, PARENTHETICAL_HEDGE, REAL_ACTUAL_INFLATION,
  REASONING_ARTIFACTS, RHETORICAL_QUESTIONS, ROLEPLAY_VERBS,
  SEPARATOR_DASH_RE, SIGNIFICANCE_INFLATION, SOCIAL_CTA_CLOSER,
  SPECULATIVE_OPENERS, SYCOPHANTIC, TEMPLATE_PHRASES, TIER1, TIER1_PHRASES,
  TIER2, TIER2_CONDITIONAL, TIER3, TIER3_PHRASES, TITLE_CASE_HEADER,
  TRANSITIONS, VAGUE_ATTRIBUTIONS, VERSION_HEADING_DASH_RE,
} from "./en-signals-v2-data.js";
import { collectV3Issues } from "./en-signals-v3.js";
import {
  ARTEFACT_CORE_CATEGORIES, ARTEFACT_SUPPORT_CATEGORIES,
  CORROBORATION_CATEGORIES, FORMATTING_CLUSTER_CATEGORIES, RULE_ERA,
  STYLOMETRIC_CATEGORIES, V3_CATEGORY_META, V3_ISSUE_WEIGHTS,
} from "./en-signals-v3-data.js";
import { collectV4Issues } from "./en-signals-v4.js";
import { V4_CATEGORY_META, V4_ISSUE_WEIGHTS, V4_RHYTHM_CATEGORIES } from "./en-signals-v4-data.js";

// 2026.08.3: the research-harvest merge (AI-TELLS-MEGA-PACK / tells-seed
// 2026.08.1 / OWNER-DOCS-TELLS). New rules live in en-signals-v3*.ts and are
// folded into the same analysis, dedup, scoring and envelope; Tier C tells
// are documented in EXCLUDED_TELLS rather than implemented.
// 2026.08.4: post-scoring escalation policy from the real-world evaluation
// (research/REAL-WORLD-EVAL-2026-08.md §4a) — argmax(probabilities) stays the
// BASE classification; five documented escalations may then raise (never
// lower) it, reported in the additive `escalation` result field.
// 2026.08.5: measured stylometrics + owner-rhythm pack (research/
// CLEAN-PROSE-DETECTION-PLAN.md Tier 1, research/OWNER-RHYTHM-NOTES.md).
// New rules live in en-signals-v4*.ts: all tier-B corroboration weight, low
// severity, density/threshold based, capped with the other stylometrics, and
// counted as ONE combined contribution by the finding-breadth escalation.
export const EN_SIGNALS_PATTERN_VERSION = "en-signals:2026.08.5";

// Category tables merged across the v2 port, the 2026.08.3 harvest pack and
// the 2026.08.5 rhythm pack.
const MERGED_WEIGHTS: Record<string, number> = { ...ISSUE_WEIGHTS, ...V3_ISSUE_WEIGHTS, ...V4_ISSUE_WEIGHTS };
const MERGED_META: Record<string, { severity: "note" | "low" | "medium" | "high"; message: string; suggestion: string }> =
  { ...CATEGORY_META, ...V3_CATEGORY_META, ...V4_CATEGORY_META };

/** Upstream refuses to score above this word count (browser page budget). */
const MAX_SCORED_WORDS = 10000;

// ─── Public result types ─────────────────────────────────────────────

export type SignalsClassification = "human_like" | "mixed_signals" | "ai_like";

export interface EditorialSignalsResult {
  /** 0–100 log-normalised editorial-signals score. Higher = more documented style signals. */
  score: number;
  /** Trinary, false-negative-biased style classification. Stylistic evidence only, never authorship proof. */
  classification: SignalsClassification;
  /** Soft class probabilities summing to 1. Not calibrated against a labelled corpus. */
  probabilities: { human_like: number; mixed_signals: number; ai_like: number };
  /** low / medium / high confidence band for the classification. */
  confidence: "low" | "medium" | "high";
  /** Distinct signal categories that fired, sorted alphabetically. */
  categoriesHit: string[];
  /** Count of distinct deduplicated signal hits. */
  findingCount: number;
  wordCount: number;
  version: string;
  /** "scored" or the reason the text was not meaningfully assessed. */
  status: "scored" | "empty" | "too_short" | "too_long";
  /**
   * 2026.08.4 escalation policy (additive). `applied` names the documented
   * escalation that raised the classification above the argmax base, or null
   * when the classification IS the argmax. `reason` is a plain-English
   * explanation suitable for a UI. Escalations only ever raise, never lower.
   */
  escalation: { applied: string | null; reason: string };
  /** Plain-English claim boundary. Always states this is stylistic evidence, not authorship proof. */
  description: string;
}

const DESCRIPTION =
  "Editorial writing-signals score from documented writing-pattern rules and stylometric measurements. " +
  "It is stylistic evidence about how the text reads, not proof of who or what wrote it.";

// ─── Internal issue model ────────────────────────────────────────────

interface RawIssue {
  category: string;
  /** Dedup key mirroring upstream issue.text semantics. */
  key: string;
  /** Span in the ORIGINAL input text (utf16), when a concrete match exists. */
  start: number | null;
  end: number | null;
  suggestion?: string;
  count?: number;
  /** Extra structured evidence merged into the finding's evidence object. */
  extra?: Record<string, unknown>;
  /** Overrides the category's default severity (e.g. scaling with magnitude). */
  severityOverride?: "note" | "low" | "medium" | "high";
}

interface NormalisedText {
  text: string;
  /** map[i] = utf16 index in the original text of normalised code unit i. */
  map: number[];
  flags: { zeroWidth: number; homoglyph: number; roleplay: number };
  firstStrippedAt: number;
}

interface Analysis {
  issues: RawIssue[];
  wordCount: number;
  tier2Clusters: number;
  tier1Distinct: number;
  normFlags: NormalisedText["flags"];
}

// ─── Normalisation pre-pass with offset map ──────────────────────────

const ZERO_WIDTH = /[\u200B\u200C\u200D\uFEFF\u2060]/;
const CYRILLIC_GREEK = /[Ѐ-ӿͰ-Ͽ]/;

function normalise(original: string): NormalisedText {
  const flags = { zeroWidth: 0, homoglyph: 0, roleplay: 0 };
  let firstStrippedAt = -1;
  let chars: string[] = [];
  let map: number[] = [];
  for (let i = 0; i < original.length; i += 1) {
    const ch = original[i]!;
    if (ZERO_WIDTH.test(ch)) {
      flags.zeroWidth += 1;
      if (firstStrippedAt < 0) firstStrippedAt = i;
      continue;
    }
    if (CYRILLIC_GREEK.test(ch)) {
      const swap = CYRILLIC_LOOKALIKES[ch] ?? GREEK_LOOKALIKES[ch];
      if (swap !== undefined) {
        flags.homoglyph += 1;
        if (firstStrippedAt < 0) firstStrippedAt = i;
        chars.push(swap);
        map.push(i);
        continue;
      }
    }
    chars.push(ch);
    map.push(i);
  }
  // Roleplay-action *marker* strip (paired *...* whose inner phrase opens with
  // an action verb). Markdown **bold** is rejected by the guards.
  const joined = chars.join("");
  const roleplayRe = /(?<!\*)\*([^*\n]{1,80}?)\*(?!\*)/gu;
  const removals: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = roleplayRe.exec(joined)) !== null) {
    if (ROLEPLAY_VERBS.test(m[1]!)) {
      flags.roleplay += 1;
      removals.push([m.index, m.index + m[0].length]);
    }
  }
  if (removals.length > 0) {
    const keptChars: string[] = [];
    const keptMap: number[] = [];
    let r = 0;
    for (let i = 0; i < joined.length; i += 1) {
      while (r < removals.length && i >= removals[r]![1]) r += 1;
      if (r < removals.length && i >= removals[r]![0] && i < removals[r]![1]) continue;
      keptChars.push(joined[i]!);
      keptMap.push(map[i]!);
    }
    chars = keptChars;
    map = keptMap;
  }
  return { text: chars.join(""), map, flags, firstStrippedAt };
}

// ─── Small helpers ───────────────────────────────────────────────────

function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

function tokenizeWithIndex(text: string): Array<{ token: string; index: number }> {
  const out: Array<{ token: string; index: number }> = [];
  const re = /[\w'-]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ token: m[0].toLowerCase(), index: m.index });
  return out;
}

function paragraphsWithOffsets(text: string): Array<{ text: string; start: number }> {
  const parts: Array<{ text: string; start: number }> = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    parts.push({ text: text.slice(last, m.index), start: last });
    last = m.index + m[0].length;
  }
  parts.push({ text: text.slice(last), start: last });
  return parts.filter((p) => p.text.trim().length > 0);
}

function getSentences(text: string): string[] {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 5);
}

function execAll(pattern: RegExp, text: string): RegExpExecArray[] {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m);
    if (m[0].length === 0) re.lastIndex += 1;
  }
  return out;
}

/** Fenced-code byte ranges (CommonMark closing rules), ported from upstream. */
function fenceRanges(text: string): Array<[number, number]> {
  const re = /^[ \t]{0,3}(`{3,}|~{3,})([^\n]*)$/gm;
  const ranges: Array<[number, number]> = [];
  let open: { char: string; len: number; start: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const marker = m[1]!;
    if (!open) {
      open = { char: marker[0]!, len: marker.length, start: m.index };
    } else if (marker[0] === open.char && marker.length >= open.len && /^[ \t]*\r?$/.test(m[2]!)) {
      ranges.push([open.start, m.index + m[0].length]);
      open = null;
    }
  }
  if (open) ranges.push([open.start, text.length]);
  return ranges;
}

function inFenceRange(ranges: Array<[number, number]>, index: number): boolean {
  return ranges.some(([a, b]) => index >= a && index < b);
}

/** Index-preserving copy with fenced blocks and inline code spans blanked. */
function maskCode(text: string): string {
  const chars = text.split("");
  const blank = (a: number, b: number) => {
    for (let i = a; i < b && i < chars.length; i += 1) if (chars[i] !== "\n") chars[i] = " ";
  };
  for (const [a, b] of fenceRanges(text)) blank(a, b);
  const withoutFences = chars.join("");
  const inlineRe = /(`+)(?:(?!\1)[^\n])+\1/g;
  let m: RegExpExecArray | null;
  while ((m = inlineRe.exec(withoutFences)) !== null) blank(m.index, m.index + m[0].length);
  return chars.join("");
}

const HEX_COLOUR = /^(?=[0-9a-f]*\d)(?:[0-9a-f]{6}|[0-9a-f]{8})$/i;
const CPP_DIRECTIVE = /^(?:include|define|undef|if|ifdef|ifndef|elif|else|endif|pragma|error|warning|line)$/;
function isSocialTag(tag: string): boolean {
  return !/^\d+$/.test(tag) && !HEX_COLOUR.test(tag) && !CPP_DIRECTIVE.test(tag);
}

// Alternation regexes built once from the word tables (longest-first so
// e.g. "meticulously" wins over "meticulous").
const byLengthDesc = (a: string, b: string) => b.length - a.length || a.localeCompare(b);
const TIER1_WORD_RE = new RegExp("\\b(?:" + Object.keys(TIER1).sort(byLengthDesc).join("|") + ")\\b", "gi");
const TIER2_WORD_RE = new RegExp("\\b(?:" + Object.keys(TIER2).sort(byLengthDesc).join("|") + ")\\b", "gi");
const TIER3_LOOKUP = new Map<string, string>();
for (const word of TIER3) {
  TIER3_LOOKUP.set(word, word);
  const dashless = word.replace(/-/g, "");
  if (dashless !== word) TIER3_LOOKUP.set(dashless, word);
}

// ─── Core analysis (ported from upstream analyzeText) ────────────────

function analyse(original: string): Analysis {
  const norm = normalise(original);
  const text = norm.text;
  const map = norm.map;
  // Map a normalised-text span back to the original input.
  const span = (nStart: number, nEnd: number): [number, number] | [null, null] => {
    if (nEnd <= nStart || nStart >= map.length) return [null, null];
    const last = Math.min(nEnd, map.length) - 1;
    return [map[nStart]!, map[last]! + 1];
  };
  const issues: RawIssue[] = [];
  const push = (
    category: string, key: string, nStart: number | null, nEnd: number | null,
    suggestion?: string, count?: number,
  ): void => {
    let s: number | null = null;
    let e: number | null = null;
    if (nStart !== null && nEnd !== null) [s, e] = span(nStart, nEnd);
    issues.push({ category, key, start: s, end: e, ...(suggestion !== undefined ? { suggestion } : {}), ...(count !== undefined ? { count } : {}) });
  };
  const pushEx = (
    category: string, key: string, nStart: number | null, nEnd: number | null,
    opts: { suggestion?: string; count?: number; extra?: Record<string, unknown>; severityOverride?: "note" | "low" | "medium" | "high" } = {},
  ): void => {
    let s: number | null = null;
    let e: number | null = null;
    if (nStart !== null && nEnd !== null) [s, e] = span(nStart, nEnd);
    issues.push({
      category, key, start: s, end: e,
      ...(opts.suggestion !== undefined ? { suggestion: opts.suggestion } : {}),
      ...(opts.count !== undefined ? { count: opts.count } : {}),
      ...(opts.extra !== undefined ? { extra: opts.extra } : {}),
      ...(opts.severityOverride !== undefined ? { severityOverride: opts.severityOverride } : {}),
    });
  };
  const pushPatterns = (patterns: readonly RegExp[], category: string): RawIssue[] => {
    const added: RawIssue[] = [];
    for (const pattern of patterns) {
      for (const m of execAll(pattern, text)) {
        push(category, m[0], m.index, m.index + m[0].length);
        added.push(issues[issues.length - 1]!);
      }
    }
    return added;
  };

  const wordCount = countWords(text);
  const tokens = tokenizeWithIndex(text);
  const paragraphs = paragraphsWithOffsets(text);
  const sentences = getSentences(text);

  if (wordCount < 10) {
    return { issues: [], wordCount, tier2Clusters: 0, tier1Distinct: 0, normFlags: norm.flags };
  }

  // 1. Tier 1 single words (first occurrence per distinct token).
  const tier1Found = new Set<string>();
  for (const m of execAll(TIER1_WORD_RE, text)) {
    const lower = m[0].toLowerCase();
    if (tier1Found.has(lower)) continue;
    tier1Found.add(lower);
    push("tier1", lower, m.index, m.index + m[0].length, TIER1[lower]);
  }
  // Tier 1 multi-word phrases.
  for (const phrase of TIER1_PHRASES) {
    for (const m of execAll(phrase.pattern, text)) {
      const lower = m[0].toLowerCase();
      if (tier1Found.has(lower)) continue;
      tier1Found.add(lower);
      push(phrase.clarity ? "tier1-clarity" : "tier1", lower, m.index, m.index + m[0].length, phrase.replace);
    }
  }

  // 2. Tier 2 clusters — ≥2 distinct table words within one paragraph.
  let tier2Clusters = 0;
  for (const para of paragraphs) {
    const found = new Map<string, { index: number; suggestion: string }>();
    for (const m of execAll(TIER2_WORD_RE, para.text)) {
      const lower = m[0].toLowerCase();
      if (!found.has(lower)) found.set(lower, { index: para.start + m.index, suggestion: TIER2[lower] ?? "" });
    }
    for (const cond of TIER2_CONDITIONAL) {
      if (found.has(cond.word)) continue;
      const m = new RegExp(cond.pattern.source, cond.pattern.flags).exec(para.text);
      if (m) found.set(cond.word, { index: para.start + m.index, suggestion: cond.suggestion });
    }
    if (found.size >= 2) {
      tier2Clusters += 1;
      for (const [word, at] of found) push("tier2", word, at.index, at.index + word.length, at.suggestion);
    }
  }

  // 3. Tier 3 density — ≥ max(3, 3% of words) occurrences of one word.
  const tier3Counts = new Map<string, { count: number; first: number; firstLen: number }>();
  for (const t of tokens) {
    const canonical = TIER3_LOOKUP.get(t.token);
    if (!canonical) continue;
    const entry = tier3Counts.get(canonical);
    if (entry) entry.count += 1;
    else tier3Counts.set(canonical, { count: 1, first: t.index, firstLen: t.token.length });
  }
  const densityThreshold = Math.max(3, Math.floor(wordCount * 0.03));
  for (const [word, entry] of tier3Counts) {
    if (entry.count >= densityThreshold) {
      push("tier3", `"${word}" x${entry.count}`, entry.first, entry.first + entry.firstLen,
        `Used ${entry.count} times in ${wordCount} words; vary the wording.`, entry.count);
    }
  }

  // 4–21. Weighted phrase categories.
  pushPatterns(TRANSITIONS, "transition");
  pushPatterns(CHATBOT_ARTIFACTS, "chatbot");
  pushPatterns(SYCOPHANTIC, "sycophantic");
  pushPatterns(FILLERS, "filler");
  pushPatterns(GENERIC_CONCLUSIONS, "generic-conclusion");
  pushPatterns(LETS_PATTERNS, "lets-construction");
  pushPatterns(REASONING_ARTIFACTS, "reasoning-artifact");
  pushPatterns(ACKNOWLEDGMENT_LOOPS, "acknowledgment-loop");
  pushPatterns(SIGNIFICANCE_INFLATION, "significance-inflation");
  pushPatterns(VAGUE_ATTRIBUTIONS, "vague-attribution");
  pushPatterns(HOLLOW_INTENSIFIERS, "hollow-intensifier");
  pushPatterns(EMOTIONAL_FLATLINE, "emotional-flatline");
  pushPatterns(LINGERING_ATTENTION, "lingering-attention");
  pushPatterns(NOVELTY_INFLATION, "novelty-inflation");
  pushPatterns(CUTOFF_DISCLAIMERS, "cutoff-disclaimer");
  pushPatterns(AI_PLACEHOLDERS, "ai-placeholder");
  pushPatterns(AI_CITATION_MARKUP, "ai-citation-markup");
  pushPatterns(AI_UTM_SOURCE, "ai-utm-source");
  pushPatterns(TEMPLATE_PHRASES, "template-phrase");
  pushPatterns(FALSE_CONCESSION, "false-concession");
  pushPatterns(RHETORICAL_QUESTIONS, "rhetorical-question");
  pushPatterns(HEDGE_STACK, "hedge-stack");
  pushPatterns(FUTURE_NARRATIVE, "future-narrative");
  pushPatterns(REAL_ACTUAL_INFLATION, "real-actual-inflation");
  pushPatterns(SOCIAL_CTA_CLOSER, "social-cta-closer");
  pushPatterns(NOT_JUST_CONTRAST, "not-just-contrast");
  pushPatterns(FORMULAIC_OPENERS, "formulaic-opener");
  pushPatterns(SPECULATIVE_OPENERS, "speculative-opener");
  pushPatterns(PARENTHETICAL_HEDGE, "parenthetical-hedge");

  // Title-case headers (general register). Requires ≥4 tokens, a mid-title
  // function word, and a position outside fenced code.
  {
    const hits = execAll(TITLE_CASE_HEADER, text).filter((m) => {
      const title = m[0].replace(MD_HEADING_PREFIX, "");
      const parts = title.trim().split(/\s+/);
      if (parts.length < 4) return false;
      return FUNCTION_WORD_IN_TITLE.test(parts.slice(1).join(" "));
    });
    const fences = hits.length ? fenceRanges(text) : [];
    for (const m of hits) {
      if (!inFenceRange(fences, m.index)) push("title-case-header", m[0], m.index, m.index + m[0].length);
    }
  }

  // Normalisation-trigger flags. Bypass-trick characters in prose are a
  // strong style signal; anchored to the first stripped character.
  if (norm.flags.zeroWidth > 0 || norm.flags.homoglyph >= 2) {
    const at = norm.firstStrippedAt;
    issues.push({
      category: "normalization-flag",
      key: `${norm.flags.zeroWidth} zero-width + ${norm.flags.homoglyph} homoglyph swaps`,
      start: at >= 0 ? at : null,
      end: at >= 0 ? at + 1 : null,
      count: norm.flags.zeroWidth + norm.flags.homoglyph,
    });
  }
  if (norm.flags.roleplay >= 2) {
    issues.push({
      category: "normalization-flag",
      key: `${norm.flags.roleplay} roleplay-action markers stripped`,
      start: null, end: null, count: norm.flags.roleplay,
    });
  }

  // Smart-punctuation co-occurrence signature.
  {
    const hasCurly = /[“”‘’]/.test(text);
    const totalEmDashes = (text.match(/—/g) ?? []).length;
    const separatorEmDashes = (text.match(SEPARATOR_DASH_RE) ?? []).length
      + (text.match(VERSION_HEADING_DASH_RE) ?? []).length;
    const hasEmDash = totalEmDashes > separatorEmDashes;
    const hasOxford = (text.match(/\b\w+,\s+\w+,\s+and\s+\w+/g)?.length ?? 0) >= 1;
    const doubleSpaces = (text.match(/[^.!?]  +/g) ?? []).length;
    const missingApos = /\b(?:dont|wont|cant|isnt|wasnt|shouldnt|wouldnt|couldnt|youre|theyre|its\s+a\s+\w+ing)\b/i.test(text);
    const clean = doubleSpaces === 0 && !missingApos;
    const signals = [hasCurly, hasEmDash, hasOxford, clean].filter(Boolean).length;
    if (signals >= 4 && wordCount >= 80) {
      const first = text.search(/[“”‘’—]/);
      push("smart-punct-signature", "curly quotes + em dash + Oxford comma + zero typos",
        first >= 0 ? first : null, first >= 0 ? first + 1 : null);
    }
  }

  // Punctuation-distribution uniformity across paragraphs.
  if (paragraphs.length >= 4) {
    const densities = paragraphs
      .map((p) => {
        const words = (p.text.match(/\S+/g) ?? []).length;
        if (words < 5) return null;
        return ((p.text.match(/[,;:—()]/g) ?? []).length) / words;
      })
      .filter((d): d is number => d !== null);
    if (densities.length >= 4) {
      const mean = densities.reduce((a, b) => a + b, 0) / densities.length;
      const variance = densities.reduce((s, d) => s + (d - mean) ** 2, 0) / densities.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      if (cv < 0.25 && mean >= 0.04) {
        push("punct-distribution", `Punctuation density uniform across paragraphs (CV=${cv.toFixed(2)})`, null, null);
      }
    }
  }

  // Function-word trigram entropy.
  if (wordCount >= 150) {
    const mapped = tokens.map((t) => (FUNC_WORDS.has(t.token) ? t.token : "_"));
    const seq = mapped.filter((v, i, arr) => v !== "_" || (i > 0 && arr[i - 1] !== "_"));
    if (seq.length >= 50) {
      const trigrams = new Map<string, number>();
      for (let i = 0; i < seq.length - 2; i += 1) {
        const tg = `${seq[i]}|${seq[i + 1]}|${seq[i + 2]}`;
        trigrams.set(tg, (trigrams.get(tg) ?? 0) + 1);
      }
      const total = seq.length - 2;
      let entropy = 0;
      for (const c of trigrams.values()) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
      const distinct = trigrams.size;
      const normalized = distinct > 1 ? entropy / Math.log2(distinct) : 1;
      if (normalized < 0.82 && total >= 50) {
        push("fnword-trigram-entropy", `Function-word trigram entropy ${normalized.toFixed(2)} (low)`, null, null);
      }
      if (distinct === 1 && total >= 50) {
        push("fnword-trigram-entropy", "Single function-word trigram repeated across document", null, null);
      }
    }
  }

  // Cross-paragraph burstiness.
  if (paragraphs.length >= 4) {
    const cvs = paragraphs
      .map((p) => {
        const sents = getSentences(p.text);
        if (sents.length < 3) return null;
        const lens = sents.map(countWords);
        const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
        if (mean === 0) return null;
        const v = lens.reduce((s, l) => s + (l - mean) ** 2, 0) / lens.length;
        return Math.sqrt(v) / mean;
      })
      .filter((c): c is number => c !== null);
    if (cvs.length >= 4) {
      const cvMean = cvs.reduce((a, b) => a + b, 0) / cvs.length;
      const cvStd = Math.sqrt(cvs.reduce((s, c) => s + (c - cvMean) ** 2, 0) / cvs.length);
      if (cvStd < 0.08 && cvMean < 0.45) {
        push("cross-para-burstiness", `Sentence rhythm uniform across paragraphs (sigmaCV=${cvStd.toFixed(2)})`, null, null);
      }
    }
  }

  // Tier 3 multi-word phrase density + cross-phrase clustering.
  {
    const claimed: Array<[number, number]> = [];
    const overlaps = (a: number, b: number) => claimed.some(([s, e]) => a < e && b > s);
    let distinctPhrasesHit = 0;
    for (const phrase of TIER3_PHRASES) {
      const phraseSpans: Array<[number, number, string]> = [];
      for (const m of execAll(phrase, text)) {
        const a = m.index;
        const b = a + m[0].length;
        if (!overlaps(a, b)) phraseSpans.push([a, b, m[0]]);
      }
      if (phraseSpans.length === 0) continue;
      for (const [a, b] of phraseSpans) claimed.push([a, b]);
      distinctPhrasesHit += 1;
      if (phraseSpans.length >= 2) {
        const [a, b, matched] = phraseSpans[0]!;
        push("tier3-phrase", `"${matched.toLowerCase()}" x${phraseSpans.length}`, a, b,
          `Boilerplate phrase repeated ${phraseSpans.length} times; replace at least one with specifics.`, phraseSpans.length);
      }
    }
    if (distinctPhrasesHit >= 3) {
      const firstClaim = claimed.slice().sort((x, y) => x[0] - y[0])[0];
      push("tier3-phrase-cluster", `${distinctPhrasesHit} distinct boilerplate phrases`,
        firstClaim ? firstClaim[0] : null, firstClaim ? firstClaim[1] : null, undefined, distinctPhrasesHit);
    }
  }

  // Hashtag stuffing (code-masked, non-tag # forms subtracted).
  {
    const tagMatches = [...maskCode(text).matchAll(/(?:^|\W)#(\w[\w-]*)/g)].filter((m) => isSocialTag(m[1]!));
    if (tagMatches.length >= 6) {
      const first = tagMatches[0]!;
      const hashAt = first.index + first[0].indexOf("#");
      push("hashtag-stuff", `${tagMatches.length} hashtags`, hashAt, hashAt + 1 + first[1]!.length, undefined, tagMatches.length);
    }
  }

  // Bullet list of bare noun phrases.
  {
    const lines = text.split(/\r?\n/);
    const bulletRe = /^\s*(?:\*|-|•|\+)\s+(.+)$/;
    const verbRe = /\b(?:is|are|was|were|has|have|had|will|would|should|must|do|does|did|can|could|may|might|am|been|being)\b/i;
    const fenceRe = /^\s*(?:```|~~~)/;
    let run: string[] = [];
    let runStart = -1;
    let blankStreak = 0;
    let inFence = false;
    let offset = 0;
    const flushRun = (): void => {
      if (run.length >= 5) {
        const bareNP = run.filter((it) => {
          const wc = (it.match(/\S+/g) ?? []).length;
          return wc > 0 && wc <= 6 && !verbRe.test(it);
        });
        if (bareNP.length >= 5 && bareNP.length / run.length >= 0.75) {
          push("bullet-np-list", `${run.length}-item bullet list of bare noun phrases`,
            runStart, Math.min(text.length, runStart + 1), undefined, run.length);
        }
      }
      run = [];
      runStart = -1;
      blankStreak = 0;
    };
    for (const line of lines) {
      if (fenceRe.test(line)) {
        flushRun();
        inFence = !inFence;
      } else if (!inFence) {
        const m = line.match(bulletRe);
        if (m) {
          if (run.length === 0) runStart = offset;
          run.push(m[1]!.trim());
          blankStreak = 0;
        } else if (line.trim() === "") {
          blankStreak += 1;
          if (blankStreak >= 2) flushRun();
        } else {
          flushRun();
        }
      }
      offset += line.length + 1;
    }
    flushRun();
  }

  // Confidence calibration — only when it stacks (≥3 raw matches).
  {
    const confMatches: Array<{ text: string; index: number }> = [];
    for (const pattern of CONFIDENCE_CALIBRATION) {
      for (const m of execAll(pattern, text)) confMatches.push({ text: m[0], index: m.index });
    }
    if (confMatches.length >= 3) {
      for (const m of confMatches) push("confidence-calibration", m.text, m.index, m.index + m.text.length);
    }
  }

  // Em-dash density (separator-position dashes excluded). Counts true em/en
  // dashes, spaced "--", and a spaced single hyphen used as a dash. Calibrated
  // so ordinary business copy (a dash or two per piece) passes and prose with
  // a dash every sentence or two fires.
  {
    const rawEmDashCount = (text.match(/—|(?<=\s)--(?=\s|$)|(?<=^|\s)--(?=\s)/gm) ?? []).length;
    const spacedHyphenCount = (text.match(/(?<=\S) (?:-|–) (?=\S)/g) ?? []).length;
    const separatorDashCount = (text.match(SEPARATOR_DASH_RE) ?? []).length
      + (text.match(VERSION_HEADING_DASH_RE) ?? []).length;
    const dashCount = rawEmDashCount + spacedHyphenCount - separatorDashCount;
    const rate = dashCount / (wordCount / 1000);
    if (dashCount >= 3 && rate > 6) {
      const first = text.search(/—|(?<=\S) (?:-|–|--) (?=\S)/);
      issues.push({
        category: "em-dash-density",
        key: `${dashCount} dash separators in ${wordCount} words`,
        ...(first >= 0 ? (([s, e]: [number, number] | [null, null]) => ({ start: s, end: e }))(span(first, first + 1)) : { start: null, end: null }),
        count: dashCount,
        extra: { rate_per_1000_words: Math.round(rate * 10) / 10, em_dash_count: rawEmDashCount, spaced_hyphen_count: spacedHyphenCount },
      });
    }
  }

  // Sentence-length flatline — low variance of sentence length document-wide.
  if (sentences.length >= 5) {
    const lengths = sentences.map(countWords);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - avg) ** 2, 0) / lengths.length);
    const cv = avg > 0 ? stdDev / avg : 0;
    if (cv < 0.25 && avg > 10) {
      issues.push({
        category: "sentence-flatline",
        key: `Sentence lengths cluster around ${Math.round(avg)} words (CV=${cv.toFixed(2)})`,
        start: null, end: null, count: sentences.length,
        extra: { sentence_count: sentences.length, mean_words: Math.round(avg * 10) / 10, std_dev: Math.round(stdDev * 100) / 100, cv: Math.round(cv * 100) / 100 },
      });
    }
  }

  // Uniform section / answer length. Split on Markdown or HTML heading lines
  // when at least two are present, otherwise on blank-line paragraphs. With
  // ≥4 sections of ≥20 words each, near-identical word counts (low CV) are an
  // editorial rhythm signal typical of generated multi-section content.
  {
    const headingRe = /^(?:#{1,6}[ \t]+\S.*|<h[1-6][^>]*>.*)$/gim;
    const headings = execAll(headingRe, text);
    let sectionLengths: number[] = [];
    let firstSectionAt: number | null = null;
    if (headings.length >= 2) {
      for (let i = 0; i < headings.length; i += 1) {
        const bodyStart = headings[i]!.index + headings[i]![0].length;
        const bodyEnd = i + 1 < headings.length ? headings[i + 1]!.index : text.length;
        const words = countWords(text.slice(bodyStart, bodyEnd));
        if (words >= 20) {
          sectionLengths.push(words);
          if (firstSectionAt === null) firstSectionAt = headings[i]!.index;
        }
      }
    } else {
      for (const p of paragraphs) {
        const words = countWords(p.text);
        if (words >= 20) {
          sectionLengths.push(words);
          if (firstSectionAt === null) firstSectionAt = p.start;
        }
      }
    }
    if (sectionLengths.length >= 4) {
      const mean = sectionLengths.reduce((a, b) => a + b, 0) / sectionLengths.length;
      const std = Math.sqrt(sectionLengths.reduce((s, l) => s + (l - mean) ** 2, 0) / sectionLengths.length);
      const cv = mean > 0 ? std / mean : 0;
      if (cv < 0.15) {
        issues.push({
          category: "uniform-sections",
          key: `${sectionLengths.length} sections of near-identical length (CV=${cv.toFixed(2)})`,
          ...(firstSectionAt !== null ? (([s, e]: [number, number] | [null, null]) => ({ start: s, end: e }))(span(firstSectionAt, firstSectionAt + 1)) : { start: null, end: null }),
          count: sectionLengths.length,
          ...(sectionLengths.length >= 8 && cv < 0.1 ? { severityOverride: "high" as const } : {}),
          extra: { section_count: sectionLengths.length, mean_words: Math.round(mean * 10) / 10, cv: Math.round(cv * 100) / 100 },
        });
      }
    }
  }

  // Uniform list items — a run of ≥4 bullet or numbered items whose word
  // counts barely vary.
  {
    const lines = text.split(/\r?\n/);
    const itemRe = /^\s*(?:[-*+•]|\d+[.)])\s+(\S.*)$/;
    let offset = 0;
    let run: number[] = [];
    let runStart: number | null = null;
    const flush = (): void => {
      if (run.length >= 4) {
        const mean = run.reduce((a, b) => a + b, 0) / run.length;
        const std = Math.sqrt(run.reduce((s, l) => s + (l - mean) ** 2, 0) / run.length);
        const cv = mean > 0 ? std / mean : 0;
        if (mean >= 3 && cv < 0.15) {
          issues.push({
            category: "uniform-list-items",
            key: `${run.length} list items of near-identical length (CV=${cv.toFixed(2)})`,
            ...(runStart !== null ? (([s, e]: [number, number] | [null, null]) => ({ start: s, end: e }))(span(runStart, runStart + 1)) : { start: null, end: null }),
            count: run.length,
            extra: { item_count: run.length, mean_words: Math.round(mean * 10) / 10, cv: Math.round(cv * 100) / 100 },
          });
        }
      }
      run = [];
      runStart = null;
    };
    for (const line of lines) {
      const m = line.match(itemRe);
      if (m) {
        if (run.length === 0) runStart = offset;
        run.push(countWords(m[1]!));
      } else if (line.trim() !== "") {
        flush();
      }
      offset += line.length + 1;
    }
    flush();
  }

  // Type-token ratio.
  if (tokens.length >= 200) {
    const unique = new Set(tokens.map((t) => t.token)).size;
    const ttr = unique / tokens.length;
    if (ttr < 0.4) {
      push("low-ttr", `Vocabulary diversity ${(ttr * 100).toFixed(1)}% (${unique} unique / ${tokens.length} tokens)`, null, null);
    }
  }

  // Paragraph-length uniformity.
  if (paragraphs.length >= 4) {
    const paraLengths = paragraphs.map((p) => getSentences(p.text).length);
    const avg = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
    if (paraLengths.every((l) => Math.abs(l - avg) <= 1) && avg >= 3) {
      push("uniformity", `All paragraphs are ~${Math.round(avg)} sentences`, null, null);
    }
  }

  // Bold overuse.
  {
    const boldRe = /\*\*[^*]+\*\*/g;
    const bolds = execAll(boldRe, text);
    if (bolds.length > 3) {
      const first = bolds[0]!;
      push("formatting", `${bolds.length} bold phrases`, first.index, first.index + first[0].length, undefined, bolds.length);
    }
  }

  // 2026.08.3 harvest-merge rules (artefact forensics, tier A phrase and
  // structural tells, corroboration-weight tier B rules, calibrated
  // stylometric measures). Same coordinate space, same dedup below.
  collectV3Issues({
    text, wordCount, paragraphs, sentences,
    push,
    pushEx,
    pushPatterns: (patterns, category) => { pushPatterns(patterns, category); },
  });

  // 2026.08.5 measured-stylometrics + owner-rhythm rules (all tier-B
  // corroboration, low severity, density-gated; en-signals-v4.ts). Same
  // coordinate space, same dedup below; each rule pushes at most one
  // document-level finding.
  collectV4Issues({
    text, wordCount, paragraphs, sentences,
    push,
    pushEx,
    pushPatterns: (patterns, category) => { pushPatterns(patterns, category); },
  });

  // Dedup by (category, key) — mirrors upstream deduplicateIssues so the
  // score reflects exactly the distinct signals a caller sees.
  const seen = new Set<string>();
  const deduped = issues.filter((issue) => {
    const k = `${issue.category}:${issue.key.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const tier1Distinct = new Set(deduped.filter((i) => i.category === "tier1").map((i) => i.key.toLowerCase())).size;
  return { issues: deduped, wordCount, tier2Clusters, tier1Distinct, normFlags: norm.flags };
}

// ─── PatternFinding output ───────────────────────────────────────────

/** First whole code point of the text — the anchor for document-level findings. */
function docAnchor(text: string): [number, number] {
  const cp = text.codePointAt(0);
  return [0, cp !== undefined && cp > 0xffff ? 2 : 1];
}

function toFinding(original: string, issue: RawIssue): PatternFinding {
  const meta = MERGED_META[issue.category] ?? { severity: "low" as const, message: "A documented writing signal appears here. This is a stylistic hint, not evidence of authorship.", suggestion: "Review the flagged text." };
  let start = issue.start;
  let end = issue.end;
  let documentLevel = false;
  if (start === null || end === null || end <= start) {
    [start, end] = docAnchor(original);
    documentLevel = true;
  }
  const matched = original.slice(start, end);
  const weight = MERGED_WEIGHTS[issue.category] ?? 2;
  // Era metadata (tells-seed:2026.08.1): every rule carries the model era in
  // which the tell peaked, plus a model-family attribution hint where the
  // research supports one. Per-finding attribution (e.g. a specific leaked
  // citation token) arrives via issue.extra and overrides the category hint.
  const eraInfo = RULE_ERA[issue.category] ?? { era: "evergreen" as const };
  return {
    rule_id: "signals." + issue.category.replace(/-/g, "_"),
    rule_version: EN_SIGNALS_PATTERN_VERSION,
    severity: issue.severityOverride ?? meta.severity,
    message: meta.message,
    suggestion: issue.suggestion !== undefined && issue.suggestion !== "" ? `Consider: ${issue.suggestion}.` : meta.suggestion,
    span: rangeFromUtf16(original, start, end),
    matched_text_hash: prefixedSha256(matched),
    evidence: {
      matched,
      count: issue.count ?? 1,
      weight,
      category: issue.category,
      detail: issue.key,
      era: eraInfo.era,
      ...(eraInfo.attribution !== undefined ? { attribution: eraInfo.attribution } : {}),
      ...(CORROBORATION_CATEGORIES.has(issue.category) || V4_RHYTHM_CATEGORIES.has(issue.category) ? { corroboration: true } : {}),
      ...(issue.extra ?? {}),
      ...(documentLevel ? { document_level: true } : {}),
    },
  };
}

/**
 * Run the full en-signals v2 rule set and return per-signal findings.
 * Findings are editorial hints (Tier B evidence): stylistic, never authorship proof.
 */
export function inspectSignalsV2(text: string): PatternFinding[] {
  if (!text || text.trim().length === 0) return [];
  const analysis = analyse(text);
  return analysis.issues
    .map((issue) => toFinding(text, issue))
    .sort((a, b) => a.span.start_utf16 - b.span.start_utf16 || a.rule_id.localeCompare(b.rule_id));
}

// ─── Document-level score (ported scoring + trinary classifier) ──────

function classify(score: number, issues: RawIssue[], normFlags: NormalisedText["flags"], wordCount: number, denseAIVocab: boolean): {
  classification: SignalsClassification;
  probabilities: EditorialSignalsResult["probabilities"];
  confidence: EditorialSignalsResult["confidence"];
} {
  const has = (category: string) => issues.some((i) => i.category === category);
  const hasCutoff = has("cutoff-disclaimer");
  const hasNormFlag = normFlags.zeroWidth >= 2 || normFlags.homoglyph >= 2;
  const strongCorrob =
    (hasCutoff ? 1 : 0) +
    (hasNormFlag ? 1 : 0) +
    (has("reasoning-artifact") && has("chatbot") ? 1 : 0) +
    (denseAIVocab ? 1 : 0);
  const stylometricHits = ["punct-distribution", "cross-para-burstiness", "fnword-trigram-entropy"].filter(has).length;
  const weakCorrob = (stylometricHits >= 2 ? 1 : 0) + (has("smart-punct-signature") ? 1 : 0);
  const totalCorrob = strongCorrob + weakCorrob;

  // Preliminary band from the ported thresholds. This only selects which soft
  // probability shape applies — it is never the final label, so a strong
  // corroborator (e.g. the normalization flag) can raise the AI probability
  // but can no longer hard-override the classification. Invisible characters
  // are reported independently by the unicode carriers check; letting them
  // force an AI verdict here would double-count that evidence.
  let band: SignalsClassification;
  if (score < 15 && strongCorrob === 0) band = "human_like";
  else if (strongCorrob >= 1 || score >= 70) band = "ai_like";
  else if (score >= 40 && totalCorrob >= 1) band = "ai_like";
  else band = "mixed_signals";

  const aiSoft = Math.min(0.97, score / 100 + totalCorrob * 0.06 + strongCorrob * 0.08);
  let p: { human: number; mixed: number; ai: number };
  if (band === "human_like") p = { human: Math.max(0.6, 1 - aiSoft), mixed: Math.min(0.35, aiSoft * 0.8), ai: Math.min(0.1, aiSoft * 0.3) };
  else if (band === "ai_like") p = { human: Math.max(0.02, 1 - aiSoft - 0.05), mixed: 0.1, ai: aiSoft };
  else p = { human: Math.max(0.15, 0.6 - aiSoft * 0.5), mixed: 0.5, ai: aiSoft * 0.7 };
  const rawSum = p.human + p.mixed + p.ai;
  const human = +(p.human / rawSum).toFixed(3);
  const mixed = +(p.mixed / rawSum).toFixed(3);
  const ai = Math.max(0, +(1 - human - mixed).toFixed(3));

  // The published classification is always the argmax of the published
  // probabilities, with ties broken toward the more cautious class
  // (human_like > mixed_signals > ai_like) to preserve the false-negative
  // bias. The two can therefore never contradict each other in a UI.
  let classification: SignalsClassification;
  if (human >= mixed && human >= ai) classification = "human_like";
  else if (mixed >= ai) classification = "mixed_signals";
  else classification = "ai_like";

  let confidence: EditorialSignalsResult["confidence"];
  if (strongCorrob >= 2 || hasCutoff || (score < 8 && wordCount >= 100)) confidence = "high";
  else if (strongCorrob >= 1 || (score >= 45 && weakCorrob >= 1) || score < 20) confidence = "medium";
  else confidence = "low";

  return { classification, probabilities: { human_like: human, mixed_signals: mixed, ai_like: ai }, confidence };
}

// ─── 2026.08.4 escalation policy ─────────────────────────────────────
// Evidence base: research/REAL-WORLD-EVAL-2026-08.md. On 30 real-world AI
// samples the engine recorded artefact evidence on 7/7 artefact-bearing
// samples but escalated only 1/30 beyond human_like — the false-negative bias
// was wasting near-zero-FP evidence. The five refinements below are the
// evaluation's §4a "safe" list, verified against the four human controls
// (which fired zero artefact/formatting-cluster categories and at most 2
// findings). The do-not-do list (§4c) is respected: no weight changes to
// adjacent-lemma-repeat / normalization-flag / tier1 / token-cutoff, and no
// generic threshold drop — escalations key ONLY on artefact and compound
// evidence. Escalations raise, never lower, and the argmax verdict remains
// the reported base (probabilities are not rewritten).

const CLASS_RANK: Record<SignalsClassification, number> = { human_like: 0, mixed_signals: 1, ai_like: 2 };

function applyEscalationPolicy(
  base: SignalsClassification,
  confidence: EditorialSignalsResult["confidence"],
  score: number,
  findingCount: number,
  categories: readonly string[],
): { classification: SignalsClassification; confidence: EditorialSignalsResult["confidence"]; escalation: EditorialSignalsResult["escalation"] } {
  const cats = new Set(categories);
  const coreArtefacts = categories.filter((c) => ARTEFACT_CORE_CATEGORIES.has(c));
  const supportArtefacts = categories.filter((c) => ARTEFACT_SUPPORT_CATEGORIES.has(c));
  // Support categories (arrows, escaped-markup literals) count only alongside
  // other artefact evidence — the evaluation kept them corroboration-only.
  const artefactHit = coreArtefacts.length >= 1 || supportArtefacts.length >= 2;
  const artefactCats = artefactHit ? [...coreArtefacts, ...supportArtefacts] : [];
  const formattingCats = categories.filter((c) => FORMATTING_CLUSTER_CATEGORIES.has(c));

  // Candidate escalations in precedence order. Each names the eval rule,
  // the classification it argues for, and a UI-ready reason.
  const candidates: Array<{ applied: string; classification: SignalsClassification; reason: string }> = [];
  if (cats.has("ai-citation-markup") && cats.has("ai-citation-token")) {
    candidates.push({
      applied: "citation_co_occurrence",
      classification: "ai_like",
      reason: "Internal citation markup and a leaked citation token both appear — the residue of an unstripped chatbot export, with no plausible human origin. This remains stylistic-artefact evidence, not proof of authorship.",
    });
  }
  if (findingCount >= 8 && cats.size >= 5) {
    const bumped: SignalsClassification = base === "human_like" ? "mixed_signals" : "ai_like";
    candidates.push({
      applied: "finding_breadth",
      classification: bumped,
      reason: `Documented writing signals are unusually broad (${findingCount} findings across ${cats.size} categories; human evaluation controls peaked at 2), raising the classification one band.`,
    });
  }
  const artefactScore = artefactHit && score >= 10;
  if (artefactScore) {
    candidates.push({
      applied: "artefact_score",
      classification: "mixed_signals",
      reason: `Machine-artefact evidence (${artefactCats.join(", ")}) combines with a score of ${score}, above every human evaluation control (maximum 4).`,
    });
  }
  if (artefactHit) {
    candidates.push({
      applied: "artefact_floor",
      classification: "mixed_signals",
      reason: `Machine-artefact evidence (${artefactCats.join(", ")}) was found; artefact-class findings fired on no human control, so the classification is floored at mixed_signals.`,
    });
  }
  if (new Set(formattingCats).size >= 3) {
    candidates.push({
      applied: "formatting_cluster",
      classification: "mixed_signals",
      reason: `Chat-export formatting furniture clusters (${[...new Set(formattingCats)].join(", ")}) — a compound signal that fired on no human control.`,
    });
  }

  let finalClass = base;
  let applied: string | null = null;
  let reason = "No escalation applied; the classification is the argmax of the published probabilities.";
  for (const c of candidates) {
    if (CLASS_RANK[c.classification] > CLASS_RANK[finalClass]) {
      finalClass = c.classification;
      applied = c.applied;
      reason = c.reason;
    }
  }
  // Eval rule 3: artefact evidence with an above-human score also lifts a
  // "low" confidence to "medium", whichever escalation set the final class.
  const finalConfidence = artefactScore && confidence === "low" ? "medium" : confidence;
  return { classification: finalClass, confidence: finalConfidence, escalation: { applied, reason } };
}

function unscored(status: EditorialSignalsResult["status"], wordCount: number): EditorialSignalsResult {
  return {
    score: 0,
    classification: "human_like",
    probabilities: { human_like: 0.334, mixed_signals: 0.333, ai_like: 0.333 },
    confidence: "low",
    categoriesHit: [],
    findingCount: 0,
    wordCount,
    version: EN_SIGNALS_PATTERN_VERSION,
    status,
    escalation: { applied: null, reason: "Text was outside the scoring window; the escalation policy was not evaluated." },
    description: DESCRIPTION + " This text was outside the scoring window (" + status.replace("_", " ") + "), so no stylistic assessment was made.",
  };
}

/**
 * Document-level editorial-signals score, ported from the upstream weighting
 * and log-normalisation model. The score, classification and probabilities are
 * stylistic evidence about how the text reads; they are never proof of
 * authorship (BRIEF.md §5, §21 Tier B).
 */
export function computeEditorialSignals(text: string): EditorialSignalsResult {
  if (!text || text.trim().length === 0) return unscored("empty", 0);
  const analysis = analyse(text);
  const { wordCount } = analysis;
  if (wordCount < 10) return unscored("too_short", wordCount);
  if (wordCount > MAX_SCORED_WORDS) return unscored("too_long", wordCount);

  // Stylometric cap (binding research correction, AI-TELLS-MEGA-PACK §6):
  // stylometric measurements must never dominate the score — the Stanford
  // TOEFL study found >50% of genuine non-native essays falsely flagged by
  // stylometric detectors. Their combined contribution is capped at the
  // larger of the non-stylometric evidence and 12 raw points, so a document
  // can never approach an ai_like band on rhythm/uniformity measures alone.
  let styloRaw = 0;
  let otherRaw = 0;
  for (const issue of analysis.issues) {
    const w = MERGED_WEIGHTS[issue.category] ?? 2;
    if (STYLOMETRIC_CATEGORIES.has(issue.category) || V4_RHYTHM_CATEGORIES.has(issue.category)) styloRaw += w;
    else otherRaw += w;
  }
  const rawScore = otherRaw + Math.min(styloRaw, Math.max(otherRaw, 12));
  const lengthFactor = Math.max(1, Math.log2(wordCount / 50));
  const score = Math.min(100, Math.round(rawScore / lengthFactor));

  const denseAIVocab = wordCount >= 150
    && analysis.tier1Distinct >= 5
    && analysis.tier2Clusters >= 2
    && analysis.issues.some((i) => i.category === "transition");

  const verdict = classify(score, analysis.issues, analysis.normFlags, wordCount, denseAIVocab);
  const categoriesHit = [...new Set(analysis.issues.map((i) => i.category))].sort();
  // Post-scoring escalation policy (2026.08.4): argmax stays the base; the
  // documented eval refinements may raise the published classification.
  // 2026.08.5 amendment: for the finding-breadth escalation, every rhythm/
  // measured-stylometric category from the 2026.08.5 pack counts as ONE
  // combined stylometric contribution — one finding and one category — so
  // four rhythm rules alone can never assemble the breadth gate. The
  // published findingCount/categoriesHit are NOT rewritten; only the values
  // the escalation policy sees are collapsed.
  const v4IssueCount = analysis.issues.filter((i) => V4_RHYTHM_CATEGORIES.has(i.category)).length;
  const breadthFindingCount = analysis.issues.length - Math.max(0, v4IssueCount - 1);
  const breadthCategories = categoriesHit.filter((c) => !V4_RHYTHM_CATEGORIES.has(c));
  if (v4IssueCount > 0) breadthCategories.push("stylometric-rhythm-combined");
  const escalated = applyEscalationPolicy(
    verdict.classification, verdict.confidence, score, breadthFindingCount, breadthCategories,
  );
  return {
    score,
    classification: escalated.classification,
    probabilities: verdict.probabilities,
    confidence: escalated.confidence,
    categoriesHit,
    findingCount: analysis.issues.length,
    wordCount,
    version: EN_SIGNALS_PATTERN_VERSION,
    status: "scored",
    escalation: escalated.escalation,
    description: DESCRIPTION,
  };
}
