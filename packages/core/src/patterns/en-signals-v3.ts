/**
 * en-signals 2026.08.3 harvest-merge rule logic.
 *
 * Implements the Tier A/B tells from the 2026.08 research harvest
 * (research/AI-TELLS-MEGA-PACK.md + ai-tells-pack-seed.json + research/
 * OWNER-DOCS-TELLS.md) on top of the v2 engine. Called from
 * en-signals-v2.ts inside analyse(); all findings flow through the same
 * dedup, weighting, scoring and envelope as v2 rules.
 *
 * Calibration notes are inline per rule. Thresholds are deliberately
 * conservative: the engine keeps its false-negative bias (BRIEF.md §21
 * Tier B — editorial evidence, never authorship proof).
 */
import {
  AI_CITATION_TOKENS, ARROW_CONNECTOR_RE, BOLD_LABEL_BULLET_RE,
  BUZZWORD_PHRASES, BY_VING_TEMPLATE_RE, CONCLUSION_CTA_RE,
  COPULA_ALTERNATIVE_RE, DESPITE_CHALLENGES_RE, DIDACTIC_NOTE_RE,
  DIRECTIVE_COLON_BULLET_RE, EMOJI_DECOR_RE, ESCAPED_MARKUP_LITERALS,
  FAUX_INSIGHT_RE, FICTION_CLAUDEISM_RE, FICTION_PROMPTONYM_RE,
  FICTION_SLOP_RE, FOCAL_WORD_RE, KOBAK_CLUSTER_RE, LEGACY_FRAMING_RE,
  LIANG_CLUSTER_RE, MATH_ALPHANUMERIC_RE, METAPHOR_CLUSTER_RES,
  NARRATIVE_CLICHE_RE, NEG_PARALLELISM_RE, NOTABILITY_CANNED_RE,
  OUTCOME_TAIL_RE, OWNER_PHRASES, OWNER_PHRASES_B, OWNER_VOCAB_B_RE,
  PARTICIPIAL_TAIL_RE, PASSIVE_RE, PIVOTAL_ROLE_RE, PLACEHOLDER_TOKENS,
  POWER_VERB_COMPOUND_RE, PROMO_TRAVEL_RE, PUA_RANGE_RE,
  REASONING_LEAKS, RHETORICAL_QA_RE, RITUAL_HEADING_RE, STACCATO_MAX_WORDS,
  TEACH_PREACH_HEADING_RE, TRANSITION_OPENER_RE, TRIPLED_NEGATION_RE,
  V6_FURNITURE_THRESHOLDS, VALUABLE_INSIGHTS_RE,
} from "./en-signals-v3-data.js";

export interface V3Ctx {
  /** Normalised document text (same coordinate space the v2 push expects). */
  text: string;
  wordCount: number;
  paragraphs: Array<{ text: string; start: number }>;
  sentences: string[];
  push: (category: string, key: string, nStart: number | null, nEnd: number | null, suggestion?: string, count?: number) => void;
  pushEx: (category: string, key: string, nStart: number | null, nEnd: number | null, opts?: {
    suggestion?: string; count?: number; extra?: Record<string, unknown>;
    severityOverride?: "note" | "low" | "medium" | "high";
  }) => void;
  pushPatterns: (patterns: readonly RegExp[], category: string) => void;
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

function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

/** Push every match of each pattern only when the DISTINCT match count meets a floor. */
function pushDistinctCluster(ctx: V3Ctx, pattern: RegExp, category: string, minDistinct: number): void {
  const matches = execAll(pattern, ctx.text);
  const distinct = new Set(matches.map((m) => m[0].toLowerCase()));
  if (distinct.size < minDistinct) return;
  const seen = new Set<string>();
  for (const m of matches) {
    const lower = m[0].toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    ctx.push(category, lower, m.index, m.index + m[0].length);
  }
}

/** Push every match only when the TOTAL match count meets a floor. */
function pushCountThreshold(ctx: V3Ctx, pattern: RegExp, category: string, minCount: number): void {
  const matches = execAll(pattern, ctx.text);
  if (matches.length < minCount) return;
  for (const m of matches) ctx.push(category, m[0], m.index, m.index + m[0].length);
}

// ─── ISBN checksum (offline-computable fabricated-reference signal) ──
function isbn10Valid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i += 1) {
    const ch = digits[i]!;
    const val = ch === "X" || ch === "x" ? 10 : ch.charCodeAt(0) - 48;
    if (val < 0 || val > 10) return false;
    sum += val * (10 - i);
  }
  return sum % 11 === 0;
}

function isbn13Valid(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i += 1) {
    const val = digits.charCodeAt(i) - 48;
    if (val < 0 || val > 9) return false;
    sum += val * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function collectV3Issues(ctx: V3Ctx): void {
  const { text, wordCount, paragraphs, sentences, push, pushEx, pushPatterns } = ctx;
  const perThousand = (n: number) => n / (wordCount / 1000);

  // ── Artefact forensics (near-zero FP; model-attributing) ──
  for (const { pattern, attribution } of AI_CITATION_TOKENS) {
    for (const m of execAll(pattern, text)) {
      pushEx("ai-citation-token", m[0], m.index, m.index + m[0].length, {
        extra: { attribution },
      });
    }
  }
  pushPatterns(REASONING_LEAKS, "reasoning-leak");
  pushPatterns(PLACEHOLDER_TOKENS, "placeholder-token");
  pushPatterns(ESCAPED_MARKUP_LITERALS, "escaped-markup-literal");

  // Pure codepoint rules kept in the patterns layer (unicode/ is another
  // workstream's module): one collapsed finding each, anchored on the first
  // occurrence, with the total count in evidence.
  {
    const pua = execAll(PUA_RANGE_RE, text);
    if (pua.length > 0) {
      const first = pua[0]!;
      pushEx("pua-character", `${pua.length} private-use character(s)`, first.index, first.index + first[0].length, { count: pua.length });
    }
    const math = execAll(MATH_ALPHANUMERIC_RE, text);
    if (math.length > 0) {
      const first = math[0]!;
      pushEx("math-alphanumeric", `${math.length} mathematical-alphanumeric character(s)`, first.index, first.index + first[0].length, { count: math.length });
    }
    // Arrows only at 3+ as prose connectors — technical docs legitimately use
    // one or two (calibration: seed pun-unicode-decoration, gate to density).
    const arrows = execAll(ARROW_CONNECTOR_RE, text);
    if (arrows.length >= 3) {
      const first = arrows[0]!;
      pushEx("arrow-decoration", `${arrows.length} arrow connectors`, first.index, first.index + first[0].length, { count: arrows.length });
    }
  }

  // ── Tier A phrase/structural rules ──
  // Negative parallelism: 2+ per document (Pew: ~3x human rate; single use is
  // ordinary rhetoric — calibration per seed phr-neg-parallelism).
  pushCountThreshold(ctx, NEG_PARALLELISM_RE, "neg-parallelism", 2);
  pushPatterns([TRIPLED_NEGATION_RE], "tripled-negation");
  pushPatterns([DESPITE_CHALLENGES_RE], "despite-challenges-arc");
  // Metaphor cluster: 2+ DISTINCT stock metaphors (seed lex-metaphor-cluster).
  {
    const found: Array<{ key: string; index: number; len: number }> = [];
    for (const re of METAPHOR_CLUSTER_RES) {
      const m = execAll(re, text)[0];
      if (m) found.push({ key: m[0].toLowerCase(), index: m.index, len: m[0].length });
    }
    if (found.length >= 2) {
      for (const f of found) push("metaphor-cluster", f.key, f.index, f.index + f.len);
    }
  }
  // Participial significance tails: 3+ per document AND ≥3/1,000 words for
  // long texts (PNAS 2025 rate; one tail is normal English).
  {
    const tails = execAll(PARTICIPIAL_TAIL_RE, text);
    if (tails.length >= 3 && (wordCount < 1000 || perThousand(tails.length) >= 3)) {
      for (const m of tails) push("participial-tail", m[0].slice(0, 60), m.index, m.index + m[0].length);
    }
  }
  // Focal-word density: one summary finding at 3+ hits and ≥3/1,000 words.
  // Density, never presence — each word is legitimate English alone.
  {
    const hits = execAll(FOCAL_WORD_RE, text);
    if (hits.length >= 3 && perThousand(hits.length) >= 3) {
      const first = hits[0]!;
      pushEx("focal-density", `${hits.length} focal-lexicon hits in ${wordCount} words`, first.index, first.index + first[0].length, {
        count: hits.length,
        extra: { rate_per_1000_words: Math.round(perThousand(hits.length) * 10) / 10 },
      });
    }
  }
  pushPatterns(OWNER_PHRASES, "owner-phrase");
  pushPatterns([POWER_VERB_COMPOUND_RE], "power-verb-compound");
  pushPatterns([OUTCOME_TAIL_RE], "outcome-tail");
  pushPatterns([CONCLUSION_CTA_RE], "conclusion-cta");

  // ── Tier B rules (low severity, corroboration-weight) ──
  pushDistinctCluster(ctx, LIANG_CLUSTER_RE, "liang-cluster", 3);
  pushDistinctCluster(ctx, KOBAK_CLUSTER_RE, "kobak-density", 4);
  pushDistinctCluster(ctx, PROMO_TRAVEL_RE, "promo-travel", 2);
  pushPatterns([PIVOTAL_ROLE_RE], "pivotal-role");
  pushDistinctCluster(ctx, LEGACY_FRAMING_RE, "legacy-framing", 2);
  pushPatterns([NOTABILITY_CANNED_RE], "notability-canned");
  pushPatterns(BUZZWORD_PHRASES, "buzzword-phrase");
  pushPatterns([FAUX_INSIGHT_RE], "faux-insight");
  pushCountThreshold(ctx, RHETORICAL_QA_RE, "rhetorical-qa", 2);
  pushPatterns([DIDACTIC_NOTE_RE], "didactic-note");
  pushPatterns([NARRATIVE_CLICHE_RE], "narrative-cliche");
  pushPatterns([VALUABLE_INSIGHTS_RE], "valuable-insights");
  pushDistinctCluster(ctx, FICTION_CLAUDEISM_RE, "fiction-claudeism", 2);
  pushPatterns([FICTION_PROMPTONYM_RE], "fiction-promptonym");
  pushDistinctCluster(ctx, FICTION_SLOP_RE, "fiction-slop-phrase", 2);
  pushPatterns(OWNER_PHRASES_B, "owner-phrase-b");
  pushDistinctCluster(ctx, OWNER_VOCAB_B_RE, "owner-vocab-b", 2);
  pushPatterns([TEACH_PREACH_HEADING_RE], "teach-preach-headings");
  // "By V-ing X, you can Y": 2+ per document (owner §3f; humans use singles).
  pushCountThreshold(ctx, BY_VING_TEMPLATE_RE, "by-ving-template", 2);

  // Copula avoidance: ratio rule. 3+ alternatives AND alternatives making up
  // >25% of copula opportunities (Geng & Trotta measured ~10% is/are drop;
  // 25% share is a conservative floor well above ordinary prose).
  {
    const alts = execAll(COPULA_ALTERNATIVE_RE, text);
    if (alts.length >= 3) {
      const copulas = (text.match(/\b(?:is|are)\b/gi) ?? []).length;
      const ratio = alts.length / (alts.length + copulas);
      if (ratio > 0.25) {
        const first = alts[0]!;
        pushEx("copula-avoidance", `${alts.length} copula alternatives vs ${copulas} is/are (${Math.round(ratio * 100)}%)`, first.index, first.index + first[0].length, {
          count: alts.length,
          extra: { copula_count: copulas, alternative_ratio: Math.round(ratio * 100) / 100 },
        });
      }
    }
  }

  // ── Line-based structural rules ──
  const lines = text.split(/\r?\n/);
  {
    let offset = 0;
    let boldRun = 0;
    let boldRunStart = -1;
    let emojiLines = 0;
    let firstEmojiAt = -1;
    let directiveHits = 0;
    let firstDirectiveAt = -1;
    const flushBold = (): void => {
      if (boldRun >= 3) {
        pushEx("bold-label-bullets", `${boldRun} bold-label bullets`, boldRunStart, boldRunStart + 1, { count: boldRun });
      }
      boldRun = 0;
      boldRunStart = -1;
    };
    for (const line of lines) {
      if (BOLD_LABEL_BULLET_RE.test(line)) {
        if (boldRun === 0) boldRunStart = offset;
        boldRun += 1;
      } else if (line.trim() !== "") {
        flushBold();
      }
      const isHeadingOrBullet = /^\s*(?:#{1,6}[ \t]|[-*+•]\s|\d+[.)]\s)/.test(line);
      if (isHeadingOrBullet && EMOJI_DECOR_RE.test(line)) {
        emojiLines += 1;
        if (firstEmojiAt < 0) firstEmojiAt = offset;
      }
      if (DIRECTIVE_COLON_BULLET_RE.test(line)) {
        directiveHits += 1;
        if (firstDirectiveAt < 0) firstDirectiveAt = offset;
      }
      offset += line.length + 1;
    }
    flushBold();
    // Emoji decoration: 3+ decorated headings/bullets (genre-gate proxy —
    // singles are normal on social surfaces).
    if (emojiLines >= 3) {
      pushEx("emoji-decoration", `${emojiLines} emoji-decorated headings/bullets`, firstEmojiAt, firstEmojiAt + 1, { count: emojiLines });
    }
    // Directive-verb+colon bullets: 3+ items (owner §3h; genuine technical
    // checklists exist, hence Tier B).
    if (directiveHits >= 3) {
      pushEx("directive-colon-bullets", `${directiveHits} directive-colon list items`, firstDirectiveAt, firstDirectiveAt + 1, { count: directiveHits });
    }
  }

  // Heading inflation: 4+ headings at >3 per 300 words (seed str-heading-inflation).
  {
    const headings = execAll(RITUAL_HEADING_RE, text);
    if (headings.length >= 4 && wordCount >= 60 && headings.length / (wordCount / 300) > 3) {
      const first = headings[0]!;
      pushEx("heading-inflation", `${headings.length} headings in ${wordCount} words`, first.index, first.index + first[0].length, {
        count: headings.length,
        extra: { headings_per_300_words: Math.round((headings.length / (wordCount / 300)) * 10) / 10 },
      });
    }
  }

  // Staccato fragments: 3+ consecutive ≤4-word sentences inside one paragraph
  // (seed str-staccato-fragments; ad copy does this deliberately → Tier B).
  {
    for (const para of paragraphs) {
      const paraSents = para.text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
      let run = 0;
      let fired = false;
      for (const s of paraSents) {
        const words = countWords(s);
        if (words > 0 && words <= STACCATO_MAX_WORDS && /[.!?]$/.test(s)) {
          run += 1;
          if (run >= 3 && !fired) {
            pushEx("staccato-fragments", `${run}+ consecutive short fragments`, para.start, para.start + 1, { count: run });
            fired = true;
          }
        } else {
          run = 0;
        }
      }
    }
  }

  // Tricolon density: 4+ "a, b, and c" triads at >10/1,000 words. Classical
  // rhetoric FP is high (seed str-rule-of-three) → conservative double gate.
  {
    const triads = execAll(/\b\w+,\s+\w+,\s+and\s+\w+\b/g, text);
    if (triads.length >= 4 && perThousand(triads.length) > 10) {
      const first = triads[0]!;
      pushEx("tricolon-density", `${triads.length} balanced triads in ${wordCount} words`, first.index, first.index + first[0].length, { count: triads.length });
    }
  }

  // Transition stacking: 4+ paragraphs with >50% opening on a formal
  // connective, or 3+ consecutive (seed str-transition-stacking + owner §3c).
  {
    if (paragraphs.length >= 3) {
      let openers = 0;
      let consecutive = 0;
      let maxConsecutive = 0;
      let firstAt = -1;
      for (const p of paragraphs) {
        if (TRANSITION_OPENER_RE.test(p.text)) {
          openers += 1;
          consecutive += 1;
          maxConsecutive = Math.max(maxConsecutive, consecutive);
          if (firstAt < 0) firstAt = p.start;
        } else {
          consecutive = 0;
        }
      }
      const majority = paragraphs.length >= 4 && openers / paragraphs.length > 0.5;
      if (majority || maxConsecutive >= 3) {
        pushEx("transition-stacking", `${openers}/${paragraphs.length} paragraphs open with a formal connective`, firstAt >= 0 ? firstAt : null, firstAt >= 0 ? firstAt + 1 : null, { count: openers });
      }
    }
  }

  // Quote inconsistency: curly AND straight double quotes mixed (2+ each).
  // Word processors cause the same shape → Tier B (seed pun-quote-inconsistency).
  {
    const curly = (text.match(/[“”]/g) ?? []).length;
    const straight = (text.match(/"/g) ?? []).length;
    if (curly >= 2 && straight >= 2) {
      const first = text.search(/[“”]/);
      pushEx("quote-inconsistency", `${curly} curly + ${straight} straight double quotes mixed`, first, first + 1, { count: curly + straight });
    }
  }

  // Token cutoff: document of 100+ words ending mid-sentence (seed
  // art-token-cutoff; paste-mangling looks identical → Tier B).
  {
    const trimmed = text.replace(/\s+$/, "");
    const lastLine = trimmed.slice(trimmed.lastIndexOf("\n") + 1);
    const looksStructural = /^\s*(?:#{1,6}[ \t]|[-*+•]\s|\d+[.)]\s|\|)/.test(lastLine) || /^```|^~~~/.test(lastLine.trim());
    if (wordCount >= 100 && trimmed.length > 0 && /[a-z,;]$/.test(trimmed) && !looksStructural && countWords(lastLine) >= 5) {
      pushEx("token-cutoff", "text ends mid-sentence", trimmed.length - 1, trimmed.length, {});
    }
  }

  // ── Stylometric measures (all capped as a group in scoring) ──
  const sentenceWordCounts = sentences.map(countWords);

  // Setup-and-expansion cadence (owner §3g). Adjacent pairs where one side is
  // ≤6 words and the other ≥3x its length; flag at ≥3 pairs AND ≥20% of
  // adjacent pairs (owner suggested ~15%; 20% + a floor of 3 is the
  // conservative calibration adopted — natural prose sampled during
  // development sits well under 10%).
  {
    if (sentenceWordCounts.length >= 8) {
      let hits = 0;
      for (let i = 0; i < sentenceWordCounts.length - 1; i += 1) {
        const a = sentenceWordCounts[i]!;
        const b = sentenceWordCounts[i + 1]!;
        if ((a > 0 && a <= 6 && b >= 3 * a && b >= 12) || (b > 0 && b <= 6 && a >= 3 * b && a >= 12)) hits += 1;
      }
      const ratio = hits / (sentenceWordCounts.length - 1);
      if (hits >= 3 && ratio >= 0.2) {
        pushEx("setup-expansion-cadence", `${hits} setup/expansion sentence pairs (${Math.round(ratio * 100)}%)`, null, null, {
          count: hits, extra: { pair_ratio: Math.round(ratio * 100) / 100 },
        });
      }
    }
  }

  // Passive-voice ratio (owner §4). Heuristic be+participle per sentence;
  // fires above 40% of sentences with 10+ sentences — the owner's ~25%
  // marketing-register threshold raised to 40% because the engine has no
  // register signal and academic prose is legitimately passive.
  {
    if (sentences.length >= 10) {
      let passiveSentences = 0;
      for (const s of sentences) {
        PASSIVE_RE.lastIndex = 0;
        if (PASSIVE_RE.test(s)) passiveSentences += 1;
      }
      const ratio = passiveSentences / sentences.length;
      if (ratio > 0.4) {
        pushEx("passive-ratio", `${passiveSentences}/${sentences.length} sentences read as passive (${Math.round(ratio * 100)}%)`, null, null, {
          count: passiveSentences, extra: { passive_ratio: Math.round(ratio * 100) / 100 },
        });
      }
    }
  }

  // Specificity score (owner §4 "no concrete numbers or named entities").
  // Counts digit tokens, currency/percent and mid-sentence capitalised words;
  // fires only on 300+ words with under 2 specifics per 1,000 words — a
  // deliberately extreme floor so ordinary prose with any names or figures
  // never trips it.
  {
    if (wordCount >= 300) {
      const digitTokens = (text.match(/(?<![\w.])[£$€]?\d[\d,.]*%?/g) ?? []).length;
      const midCaps = (text.match(/(?<=[a-z,;]\s)[A-Z][a-z]{2,}/g) ?? []).length;
      const specifics = digitTokens + midCaps;
      if (perThousand(specifics) < 2) {
        pushEx("low-specificity", `${specifics} concrete specifics in ${wordCount} words`, null, null, {
          count: specifics, extra: { specifics_per_1000_words: Math.round(perThousand(specifics) * 10) / 10 },
        });
      }
    }
  }

  // Adjacent-sentence lemma repetition (owner §4, sharper than document TTR).
  // Content words (6+ letters, non-function) shared by adjacent sentences;
  // fires when 45%+ of adjacent pairs repeat with 10+ sentences — topical
  // repetition in short human passages stays under the double gate.
  {
    if (sentences.length >= 10) {
      const contentSets = sentences.map((s) => new Set((s.toLowerCase().match(/\b[a-z]{6,}\b/g) ?? [])));
      let repeats = 0;
      for (let i = 0; i < contentSets.length - 1; i += 1) {
        const a = contentSets[i]!;
        const b = contentSets[i + 1]!;
        let shared = false;
        for (const w of a) { if (b.has(w)) { shared = true; break; } }
        if (shared) repeats += 1;
      }
      const ratio = repeats / (contentSets.length - 1);
      if (ratio >= 0.45) {
        pushEx("adjacent-lemma-repeat", `${repeats}/${contentSets.length - 1} adjacent sentence pairs repeat a content word`, null, null, {
          count: repeats, extra: { repeat_ratio: Math.round(ratio * 100) / 100 },
        });
      }
    }
  }

  // Proximity clustering (owner §3k): a focal/buzz word repeating within
  // ~300 characters of itself. Modifier-style corroboration signal.
  {
    const hits = execAll(FOCAL_WORD_RE, text);
    const byWord = new Map<string, number[]>();
    for (const m of hits) {
      const w = m[0].toLowerCase();
      (byWord.get(w) ?? byWord.set(w, []).get(w)!).push(m.index);
    }
    for (const [word, positions] of byWord) {
      for (let i = 0; i < positions.length - 1; i += 1) {
        if (positions[i + 1]! - positions[i]! <= 300) {
          push("proximity-cluster", `"${word}" repeats within 300 chars`, positions[i]!, positions[i]! + word.length, undefined, positions.length);
          break;
        }
      }
    }
  }

  // Invalid ISBN checksum (offline part of seed art-fabricated-refs).
  {
    for (const m of execAll(/\bISBN(?:-1[03])?:?\s*((?:97[89][- ]?)?(?:\d[- ]?){9,12}[\dXx])\b/g, text)) {
      const digits = m[1]!.replace(/[- ]/g, "");
      const valid = digits.length === 10 ? isbn10Valid(digits) : digits.length === 13 ? isbn13Valid(digits) : false;
      if (!valid && (digits.length === 10 || digits.length === 13)) {
        push("invalid-isbn", m[0], m.index, m.index + m[0].length);
      }
    }
  }

  // ── 2026.08.6 provider-eval furniture rules (PROVIDER-EVAL §4.1 R3/R4/R5) ──
  // Bold runs and markdown heading lines each occurred in 0/169 held-out
  // human documents, so ANY occurrence fires; the combined gate adds R5's
  // measured bullet-density threshold. All three are corroboration-weight —
  // format-stripped paste removes the signal, so absence never counts.
  {
    const boldRuns = execAll(/\*\*[^*\n]{1,120}\*\*/g, text);
    if (boldRuns.length >= 1) {
      const first = boldRuns[0]!;
      pushEx("markdown-bold", `${boldRuns.length} literal **bold** run(s)`, first.index, first.index + first[0].length, { count: boldRuns.length });
    }
    const mdHeadings = execAll(/^#{1,6}[ \t]+\S/gm, text);
    if (mdHeadings.length >= 1) {
      const first = mdHeadings[0]!;
      pushEx("markdown-heading", `${mdHeadings.length} markdown heading line(s)`, first.index, first.index + first[0].length, { count: mdHeadings.length });
    }
    const bulletLines = (text.match(/^\s*[-*•]\s+/gm) ?? []).length;
    const bulletsPer1000 = wordCount > 0 ? bulletLines / (wordCount / 1000) : 0;
    const gateOpen = boldRuns.length >= 1 || mdHeadings.length >= 1
      || bulletsPer1000 > V6_FURNITURE_THRESHOLDS.bulletsPer1000;
    if (gateOpen) {
      pushEx("markdown-furniture",
        `${boldRuns.length} bold / ${mdHeadings.length} headings / ${Math.round(bulletsPer1000 * 10) / 10} bullets per 1000 words`,
        null, null, {
          count: boldRuns.length + mdHeadings.length + bulletLines,
          extra: {
            bold_runs: boldRuns.length,
            heading_lines: mdHeadings.length,
            bullets_per_1000_words: Math.round(bulletsPer1000 * 10) / 10,
          },
        });
    }
  }
}
