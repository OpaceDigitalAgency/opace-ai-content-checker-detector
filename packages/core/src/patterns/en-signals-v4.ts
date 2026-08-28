/**
 * en-signals 2026.08.5 measured-stylometrics + owner-rhythm rule logic.
 *
 * Implements the Tier 1 measured signals from research/
 * CLEAN-PROSE-DETECTION-PLAN.md (§2 empirically surviving cheap signals,
 * §3.1 framing) and the four owner-rhythm candidate tells from research/
 * OWNER-RHYTHM-NOTES.md, on top of the v2 engine. Called from
 * en-signals-v2.ts inside analyse(); findings flow through the same dedup,
 * weighting (stylometric cap), scoring and envelope as every other rule.
 *
 * Every rule here is tier-B corroboration evidence at low severity: a
 * density/threshold measurement, never a single-instance flag and never an
 * authorship verdict (BRIEF.md §5, §21). Thresholds live in
 * en-signals-v4-data.ts and are re-checkable via tests/battery/calibrate.mjs.
 *
 * Deliberate deviation, documented: the plan's conditional-compression signal
 * is specified with zlib. This engine is a synchronous, dependency-free,
 * platform-neutral bundle (no node:zlib; the Web CompressionStream API is
 * async), so the signal ships with a deterministic pure-TypeScript LZ77
 * cost ESTIMATOR (greedy longest-match against a hash-chain dictionary with
 * a deflate-like bit-cost model). It is an approximation of the zlib ratio,
 * not zlib itself; the calibration script measures the estimator that
 * actually ships, so thresholds and estimator always agree.
 */
import type { V3Ctx } from "./en-signals-v3.js";
import {
  ABSTRACT_CLAIM_RE, ABSTRACT_PUNCH_RE, CONCRETE_ACTION_VERB_RE,
  CONTRAST_VARIANT_RES, MIC_DROP_CONTRAST_RE, REGISTER_FUNCTION_WORDS,
  REGISTER_LONG_WORD_LEN, V4_THRESHOLDS,
} from "./en-signals-v4-data.js";
import { REFERENCE_CORPUS } from "./en-signals-v4-corpus.js";
import { NOT_JUST_CONTRAST } from "./en-signals-v2-data.js";
import { NEG_PARALLELISM_RE } from "./en-signals-v3-data.js";

const T = V4_THRESHOLDS;

function countWords(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}

function countMatches(re: RegExp, text: string): number {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let n = 0;
  while (g.exec(text) !== null) {
    n += 1;
    if (g.lastIndex === 0) break;
  }
  return n;
}

/** Terminator-preserving sentence split inside one paragraph (same split the
 * v3 staccato rule uses, so the two layers agree on sentence boundaries). */
function paragraphSentences(paraText: string): string[] {
  return paraText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Digit / currency / percent token — the concrete-specific marker. */
const NUMERIC_RE = /[£$€]?\d|\d%/;
/** Capitalised word after a lowercase word — proper-noun-mid-sentence proxy. */
const MID_CAP_RE = /(?<=[a-z][,;]?\s)[A-Z][a-z]{2,}/;

function isAbstractShort(sentence: string): boolean {
  if (NUMERIC_RE.test(sentence)) return false;
  if (MID_CAP_RE.test(sentence)) return false;
  return ABSTRACT_PUNCH_RE.test(sentence);
}

// ─── Sentence-length spectral flatness (windowed DFT) ────────────────
// The empiricist's slFlat signal with the plan's length-artefact correction:
// flatness is computed on fixed 12-sentence windows only, then averaged, so
// series length never enters the statistic and short texts are exempt.
export function spectralFlatness(sentenceWordCounts: readonly number[]): number | null {
  const W = T.spectralWindowSentences;
  const windows = Math.floor(sentenceWordCounts.length / W);
  if (windows < T.spectralMinWindows) return null;
  const EPS = 1e-9;
  let sum = 0;
  for (let w = 0; w < windows; w += 1) {
    const seg = sentenceWordCounts.slice(w * W, (w + 1) * W);
    const mean = seg.reduce((a, b) => a + b, 0) / W;
    const x = seg.map((v) => v - mean);
    let logSum = 0;
    let linSum = 0;
    const bins = Math.floor(W / 2);
    for (let k = 1; k <= bins; k += 1) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < W; n += 1) {
        const ang = (2 * Math.PI * k * n) / W;
        re += x[n]! * Math.cos(ang);
        im -= x[n]! * Math.sin(ang);
      }
      const p = re * re + im * im + EPS;
      logSum += Math.log(p);
      linSum += p;
    }
    const flat = Math.exp(logSum / bins) / (linSum / bins);
    sum += flat;
  }
  return sum / windows;
}

// ─── Conditional-compression estimator ───────────────────────────────
// Deterministic LZ77 bit-cost estimate: greedy longest match (min 4, max 258
// chars) against a hash-chain index over [dictionary + already-scanned
// target]; literals cost 9 bits, a match costs 13 + log2(distance) bits —
// a deflate-shaped model, not deflate itself (see module header).

const HASH_SPAN = 4;

function hashAt(s: string, i: number): number {
  return (
    ((s.charCodeAt(i) * 131 + s.charCodeAt(i + 1)) * 131 + s.charCodeAt(i + 2)) * 131 +
    s.charCodeAt(i + 3)
  ) >>> 0;
}

type ChainIndex = Map<number, number[]>;

const MAX_CHAIN = 32;
const MAX_MATCH = 258;

function indexInto(index: ChainIndex, s: string, from: number, to: number): void {
  for (let i = from; i <= to - HASH_SPAN; i += 1) {
    const h = hashAt(s, i);
    let chain = index.get(h);
    if (!chain) {
      chain = [];
      index.set(h, chain);
    }
    chain.push(i);
    if (chain.length > MAX_CHAIN * 2) chain.splice(0, chain.length - MAX_CHAIN);
  }
}

/** Cached hash-chain index of the shipped reference corpus (built once). */
let corpusIndex: ChainIndex | null = null;
function getCorpusIndex(): ChainIndex {
  if (corpusIndex === null) {
    corpusIndex = new Map();
    indexInto(corpusIndex, REFERENCE_CORPUS, 0, REFERENCE_CORPUS.length);
  }
  return corpusIndex;
}

/**
 * Estimated LZ77 cost in bits of `target`, optionally conditioned on the
 * shipped reference corpus as a pre-loaded dictionary.
 */
export function lzCostBits(target: string, withCorpusPrior: boolean): number {
  const dict = withCorpusPrior ? REFERENCE_CORPUS : "";
  const combined = withCorpusPrior ? dict + target : target;
  const base = dict.length;
  // Self-referential chains for the target region, built as we scan.
  const selfIndex: ChainIndex = new Map();
  const dictIndex = withCorpusPrior ? getCorpusIndex() : null;
  let bits = 0;
  let i = base;
  while (i < combined.length) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + HASH_SPAN <= combined.length) {
      const h = hashAt(combined, i);
      const tryChain = (chain: number[] | undefined, offset: number): void => {
        if (!chain) return;
        const start = Math.max(0, chain.length - MAX_CHAIN);
        for (let c = chain.length - 1; c >= start; c -= 1) {
          const j = chain[c]! + offset;
          if (j >= i) continue;
          let len = 0;
          const maxLen = Math.min(MAX_MATCH, combined.length - i);
          while (len < maxLen && combined.charCodeAt(j + len) === combined.charCodeAt(i + len)) len += 1;
          if (len > bestLen) {
            bestLen = len;
            bestDist = i - j;
          }
        }
      };
      tryChain(selfIndex.get(h), base);
      if (dictIndex) tryChain(dictIndex.get(h), 0);
    }
    if (bestLen >= HASH_SPAN) {
      bits += 13 + Math.log2(bestDist);
      // Index the covered positions (sampled every 2 to bound cost).
      for (let k = i; k < i + bestLen && k + HASH_SPAN <= combined.length; k += 2) {
        const h2 = hashAt(combined, k);
        let chain = selfIndex.get(h2);
        if (!chain) {
          chain = [];
          selfIndex.set(h2, chain);
        }
        chain.push(k - base);
        if (chain.length > MAX_CHAIN * 2) chain.splice(0, chain.length - MAX_CHAIN);
      }
      i += bestLen;
    } else {
      bits += 9;
      if (i + HASH_SPAN <= combined.length) {
        const h2 = hashAt(combined, i);
        let chain = selfIndex.get(h2);
        if (!chain) {
          chain = [];
          selfIndex.set(h2, chain);
        }
        chain.push(i - base);
        if (chain.length > MAX_CHAIN * 2) chain.splice(0, chain.length - MAX_CHAIN);
      }
      i += 1;
    }
  }
  return bits;
}

/** Relative compression gain from the human-corpus prior (0 = no gain). */
export function compressionGain(text: string): number {
  const solo = lzCostBits(text, false);
  if (solo <= 0) return 0;
  const cond = lzCostBits(text, true);
  return 1 - cond / solo;
}

// ─── Lexical register profile ────────────────────────────────────────

export interface RegisterProfile {
  /** Frequency (per token) of each REGISTER_FUNCTION_WORDS entry. */
  func: number[];
  /** Share of tokens with length >= REGISTER_LONG_WORD_LEN. */
  longWordShare: number;
  tokenCount: number;
}

export function registerProfile(text: string): RegisterProfile {
  const tokens = text.toLowerCase().match(/[a-z][a-z'’-]*/g) ?? [];
  const counts = new Map<string, number>();
  let long = 0;
  for (const t of tokens) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
    if (t.length >= REGISTER_LONG_WORD_LEN) long += 1;
  }
  const n = Math.max(1, tokens.length);
  return {
    func: REGISTER_FUNCTION_WORDS.map((w) => (counts.get(w) ?? 0) / n),
    longWordShare: long / n,
    tokenCount: tokens.length,
  };
}

let refProfile: RegisterProfile | null = null;
export function referenceRegisterProfile(): RegisterProfile {
  if (refProfile === null) refProfile = registerProfile(REFERENCE_CORPUS);
  return refProfile;
}

export function registerDistance(text: string): { funcL1: number; longWordDelta: number } {
  const p = registerProfile(text);
  const r = referenceRegisterProfile();
  let l1 = 0;
  for (let i = 0; i < p.func.length; i += 1) l1 += Math.abs(p.func[i]! - r.func[i]!);
  return { funcL1: l1, longWordDelta: p.longWordShare - r.longWordShare };
}

// ─── Raw per-document metrics (exported for calibrate.mjs) ───────────

export interface V4Metrics {
  wordCount: number;
  sentenceCount: number;
  spectralFlatness: number | null;
  compressionGain: number | null;
  registerFuncL1: number;
  registerLongWordDelta: number;
  punchlineCount: number;
  punchlineRate: number;
  punchlineParagraphFinal: number;
  micDropParagraphs: number;
  contrastCount: number;
  contrastPer1000: number;
  ratioSentences: number;
  ratioAbstract: number;
  ratioConcrete: number;
  ratioAbstractShare: number;
}

interface DocShape {
  wordCount: number;
  sentences: string[];
  paragraphs: Array<{ text: string; start: number }>;
  text: string;
}

function collectMetrics(doc: DocShape): V4Metrics {
  const { text, wordCount, paragraphs } = doc;

  // Sentence series for the spectral estimator: terminator-split across the
  // whole document (paragraph splits preserved via per-paragraph splitting).
  const allSentences: string[] = [];
  for (const p of paragraphs) allSentences.push(...paragraphSentences(p.text));
  const counts = allSentences.map(countWords).filter((c) => c > 0);
  const flat = spectralFlatness(counts);

  const gain =
    wordCount >= T.compressionMinWords && wordCount <= T.compressionMaxWords
      ? compressionGain(text)
      : null;
  const reg = registerDistance(text);

  // Punchline fragments.
  let punchCount = 0;
  let punchFinal = 0;
  for (const p of paragraphs) {
    const sents = paragraphSentences(p.text);
    for (let i = 0; i < sents.length; i += 1) {
      const s = sents[i]!;
      const wc = countWords(s);
      if (wc > 0 && wc <= 8 && /[.!?]$/.test(s) && isAbstractShort(s)) {
        punchCount += 1;
        if (i === sents.length - 1) punchFinal += 1;
      }
    }
  }
  const punchRate = allSentences.length > 0 ? punchCount / allSentences.length : 0;

  // Mic-drop paragraphs.
  let micDrops = 0;
  for (const p of paragraphs) {
    const sents = paragraphSentences(p.text);
    if (sents.length < 4) continue;
    const closer = sents[sents.length - 1]!;
    const closerWc = countWords(closer);
    const setupWcs = sents.slice(0, -1).map(countWords).filter((c) => c >= 12);
    if (setupWcs.length < 3) continue;
    const setupMean = setupWcs.reduce((a, b) => a + b, 0) / setupWcs.length;
    if (
      closerWc > 0 && closerWc <= 8 && closerWc <= 0.45 * setupMean &&
      !NUMERIC_RE.test(closer) && !MID_CAP_RE.test(closer) &&
      MIC_DROP_CONTRAST_RE.test(closer)
    ) {
      micDrops += 1;
    }
  }

  // Contrast constructions (rate layer over the existing detections).
  let contrastCount = 0;
  for (const re of NOT_JUST_CONTRAST) contrastCount += countMatches(re, text);
  contrastCount += countMatches(NEG_PARALLELISM_RE, text);
  for (const re of CONTRAST_VARIANT_RES) contrastCount += countMatches(re, text);
  const contrastPer1000 = wordCount > 0 ? contrastCount / (wordCount / 1000) : 0;

  // Rhetorical vs procedural. Heuristic (documented): CONCRETE = the sentence
  // contains a number/currency/percent token, a mid-sentence capitalised word
  // (proper-noun proxy) or a specific action verb; ABSTRACT = not concrete
  // AND (linking-verb + intangible pay-off word, or a ≤8-word declarative).
  let abstract = 0;
  let concrete = 0;
  for (const s of allSentences) {
    const isConcrete = NUMERIC_RE.test(s) || MID_CAP_RE.test(s) || CONCRETE_ACTION_VERB_RE.test(s);
    if (isConcrete) {
      concrete += 1;
    } else if (ABSTRACT_CLAIM_RE.test(s) || countWords(s) <= 8) {
      abstract += 1;
    }
  }
  const share = allSentences.length > 0 ? abstract / allSentences.length : 0;

  return {
    wordCount,
    sentenceCount: allSentences.length,
    spectralFlatness: flat,
    compressionGain: gain,
    registerFuncL1: reg.funcL1,
    registerLongWordDelta: reg.longWordDelta,
    punchlineCount: punchCount,
    punchlineRate: punchRate,
    punchlineParagraphFinal: punchFinal,
    micDropParagraphs: micDrops,
    contrastCount,
    contrastPer1000,
    ratioSentences: allSentences.length,
    ratioAbstract: abstract,
    ratioConcrete: concrete,
    ratioAbstractShare: share,
  };
}

/**
 * Standalone metric computation for the calibration script
 * (tests/battery/calibrate.mjs). Mirrors exactly what collectV4Issues
 * measures; not part of the public package API.
 */
export function computeV4Metrics(text: string): V4Metrics {
  const paragraphs: Array<{ text: string; start: number }> = [];
  const re = /\n\s*\n/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    paragraphs.push({ text: text.slice(last, m.index), start: last });
    last = m.index + m[0].length;
  }
  paragraphs.push({ text: text.slice(last), start: last });
  return collectMetrics({
    text,
    wordCount: countWords(text),
    sentences: [],
    paragraphs: paragraphs.filter((p) => p.text.trim().length > 0),
  });
}

// ─── Rule evaluation ─────────────────────────────────────────────────

const round = (v: number, dp = 3): number => Math.round(v * 10 ** dp) / 10 ** dp;

export function collectV4Issues(ctx: V3Ctx): void {
  const m = collectMetrics(ctx);
  const { pushEx } = ctx;

  if (m.spectralFlatness !== null && m.spectralFlatness < T.spectralFlatnessMax) {
    pushEx("sentence-length-spectral-flatness",
      `window-averaged spectral flatness ${round(m.spectralFlatness)} (threshold ${T.spectralFlatnessMax})`,
      null, null, {
        extra: {
          spectral_flatness: round(m.spectralFlatness),
          window_sentences: T.spectralWindowSentences,
          sentence_count: m.sentenceCount,
        },
      });
  }

  if (m.compressionGain !== null && m.compressionGain < T.compressionGainMin) {
    pushEx("conditional-compression",
      `human-prior compression gain ${round(m.compressionGain)} (threshold ${T.compressionGainMin})`,
      null, null, {
        extra: { compression_gain: round(m.compressionGain), reference_corpus: "en-signals-v4-corpus 2026.08.5 (public-domain, pre-1929)" },
      });
  }

  if (
    m.wordCount >= T.registerMinWords &&
    m.registerFuncL1 > T.registerFuncL1Min &&
    m.registerLongWordDelta > T.registerLongWordDeltaMin
  ) {
    pushEx("lexical-register-distance",
      `function-word L1 ${round(m.registerFuncL1)} + long-word share +${round(m.registerLongWordDelta)} vs human reference`,
      null, null, {
        extra: {
          function_word_l1: round(m.registerFuncL1),
          long_word_share_delta: round(m.registerLongWordDelta),
          genre_caveat: "specialised genres legitimately measure as distant; corroboration only",
        },
      });
  }

  if (
    m.punchlineCount >= T.punchlineMinCount &&
    m.punchlineRate >= T.punchlineMinRate &&
    m.punchlineParagraphFinal >= T.punchlineMinParagraphFinal
  ) {
    pushEx("punchline-fragment-density",
      `${m.punchlineCount} abstract punchline fragments in ${m.sentenceCount} sentences (${m.punchlineParagraphFinal} paragraph-final)`,
      null, null, {
        count: m.punchlineCount,
        extra: { punchline_rate: round(m.punchlineRate), paragraph_final: m.punchlineParagraphFinal },
      });
  }

  if (m.micDropParagraphs >= T.micDropMinParagraphs) {
    pushEx("mic-drop-paragraph",
      `${m.micDropParagraphs} paragraphs end in a short abstract contrast closer`,
      null, null, { count: m.micDropParagraphs });
  }

  if (m.contrastCount >= T.contrastMinCount && m.contrastPer1000 >= T.contrastMinPer1000) {
    pushEx("contrast-density",
      `${m.contrastCount} contrast constructions (${round(m.contrastPer1000, 1)}/1000 words)`,
      null, null, {
        count: m.contrastCount,
        extra: { rate_per_1000_words: round(m.contrastPer1000, 1) },
      });
  }

  if (
    m.ratioSentences >= T.ratioMinSentences &&
    m.ratioAbstract >= T.ratioMinAbstract &&
    m.ratioAbstractShare >= T.ratioMinShare &&
    m.ratioConcrete <= T.ratioMaxConcrete
  ) {
    pushEx("rhetorical-procedural-ratio",
      `${m.ratioAbstract} abstract-claim vs ${m.ratioConcrete} concrete-action sentences of ${m.ratioSentences}`,
      null, null, {
        count: m.ratioAbstract,
        extra: {
          abstract_sentences: m.ratioAbstract,
          concrete_sentences: m.ratioConcrete,
          abstract_share: round(m.ratioAbstractShare),
        },
      });
  }
}
