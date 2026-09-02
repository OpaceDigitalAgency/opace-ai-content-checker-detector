/**
 * Document-level tells for the evidence layer: "why this was flagged".
 *
 * Everything in this module is measured, and only the measured survivors ship.
 * Source: `docs/measurements/DOCUMENT-TELLS-2026-08-31.md` in the engine
 * repository, with raw outputs under
 * `services/local-engine/research/document-tells-2026-08-31/`. Three tells
 * passed the study's gates and are ported here:
 *
 *  1. The curated AI-phrase lexicon — the 21 folk phrases (20 patterns once
 *     "game-changer"/"game changer" collapse under tokenisation) that stayed
 *     at or above 2x on BOTH independent AI/human pairings. The raw mined
 *     phrase table is deliberately NOT shipped: it is corpus-artefact-
 *     dominated, and the owner's instruction is explicit.
 *  2. Paragraph-rhythm uniformity — sentences-per-paragraph CV <= 0.3, read
 *     on 24.1% of AI documents against 10.2% of human ones.
 *  3. The formulaic closer — a "Final Thoughts"-style sign-off, 2.5% of AI
 *     documents against 1.3% of human ones.
 *
 * Declined by measurement, and not here: keyphrase echo (a register tell,
 * ~1.5x), paragraphs-per-section uniformity (fires MORE on humans), Title
 * Case share (no separation), bullet rhythm (unmeasurable — the human
 * corpora lost their lists upstream), the raw mined n-gram table.
 *
 * THE THREE-AXES RULE APPLIES. Nothing in this file feeds the verdict: these
 * tells explain the model's reading and never decide it. Every rate carries
 * its denominator, and the two rates of a pair are never separated.
 */
import {documentCadence, type CadenceTell} from "./cadence.js";

/** The 2026 measurement pairing every headline rate below is read from. */
export const TELL_CORPUS = {
  /** generated-2026: 21 current models, this project's own prompts. */
  aiDocuments: 4016,
  /** human-corpus-v2: modern human web text, test-only. */
  humanDocuments: 4144,
  source: "measured on 4,016 AI documents from 21 current models and 4,144 human web documents, August 2026"
} as const;

/** One curated lexicon phrase, with both measured rates carried together. */
export interface PhraseTell {
  /** The phrase as shown to the reader. */
  phrase: string;
  /** Documents per 1,000 containing the phrase, AI side. */
  aiPer1000: number;
  /** Documents per 1,000 containing the phrase, human side. */
  humanPer1000: number;
  /** Raw document counts behind the two rates. */
  aiDocs: number;
  humanDocs: number;
  /** The 2026-pairing ratio, the headline figure. */
  ratio: number;
  /** The independent cycle-2 register-balanced ratio, the confirmation. */
  confirmingRatio: number;
  /** True when either side rests on fewer than 10 documents. */
  smallSample: boolean;
}

const phrase = (
  text: string, aiPer1000: number, humanPer1000: number,
  aiDocs: number, humanDocs: number, ratio: number, confirmingRatio: number
): PhraseTell => ({
  phrase: text, aiPer1000, humanPer1000, aiDocs, humanDocs, ratio, confirmingRatio,
  smallSample: aiDocs < 10 || humanDocs < 10
});

/**
 * The dual-corpus survivors, verbatim from `known-phrases.json` — elevated at
 * least 2x on both pairings. 98 folk phrases were measured; 21 survived and 13
 * ran backwards ("when it comes to", "a variety of", "myriad" are HUMAN
 * tells). Nothing here may be added by hand: a phrase enters this list by
 * passing the measurement, not by folklore.
 *
 * "game-changer" and "game changer" measure identically because the
 * tokenisation treats a hyphen as a word break, so they ship as one entry.
 *
 * Extended 31 August 2026: seven owner-supplied candidates from live reading
 * were measured under the identical gate (`measure_owner_phrases.py`,
 * `owner-phrases.json`). One passed — "at its core", 2.1x on the 2026
 * pairing and 2.8x register-balanced — and ships below. Six failed and are
 * NOT shipped, including the owner's own "in short" (0.9x register-balanced,
 * 1.2x on 2026 models: population-level it is not a tell), and two that run
 * backwards on 2026 output ("simply put" 0.2x, "in essence" 0.3x).
 */
export const CURATED_PHRASE_TELLS: readonly PhraseTell[] = [
  phrase("robust", 60.26, 16.17, 242, 67, 3.7, 3.7),
  phrase("whether you're", 43.82, 8.69, 176, 36, 5.0, 3.1),
  phrase("seamless", 22.41, 5.79, 90, 24, 3.8, 3.6),
  phrase("seamlessly", 11.21, 5.07, 45, 21, 2.2, 2.2),
  phrase("streamline", 10.21, 4.34, 41, 18, 2.3, 4.4),
  phrase("underscores", 5.48, 2.41, 22, 10, 2.2, 3.5),
  phrase("in an era", 4.48, 1.21, 18, 5, 3.5, 3.3),
  phrase("at its core", 3.24, 1.45, 13, 6, 2.1, 2.8),
  phrase("game-changer", 4.23, 1.69, 17, 7, 2.4, 3.4),
  phrase("streamlining", 4.23, 1.93, 17, 8, 2.1, 4.0),
  phrase("is not just about", 3.49, 1.21, 14, 5, 2.7, 2.5),
  phrase("a testament to", 3.24, 1.21, 13, 5, 2.5, 13.9),
  phrase("elevate your", 2.99, 0.72, 12, 3, 3.7, 2.8),
  phrase("here's the thing", 2.24, 0.24, 9, 1, 6.5, 5.8),
  phrase("key takeaways", 1.99, 0.72, 8, 3, 2.5, 2.2),
  phrase("paving the way", 1.74, 0.24, 7, 1, 5.2, 5.8),
  phrase("plays a crucial role", 1.25, 0.48, 5, 2, 2.3, 2.6),
  phrase("tapestry", 0.75, 0, 3, 0, 7.2, 13.4),
  phrase("in today's digital", 0.75, 0, 3, 0, 7.2, 2.5),
  phrase("final thoughts", 0.75, 0.24, 3, 1, 2.4, 2.3),
  phrase("a beacon of", 0.25, 0, 1, 0, 3.1, 6.2)
];

/**
 * Tokenisation, ported from the measurement's own normaliser so the site
 * matches exactly what was counted: lowercase, curly apostrophes to straight,
 * dashes broken into word breaks, tokens of letters and apostrophes. Word
 * boundaries are structural — "seamless" can never fire inside "seamlessly",
 * and "robust" never inside "robustness".
 */
type Token = {text: string; start: number; end: number};

const tokenise = (draft: string): Token[] => {
  const normalised = draft.toLowerCase().replace(/[‘’]/g, "'").replace(/[–—]/g, "-");
  const tokens: Token[] = [];
  const re = /[a-z][a-z']*/g;
  for (let m = re.exec(normalised); m !== null; m = re.exec(normalised)) {
    tokens.push({text: m[0], start: m.index, end: m.index + m[0].length});
  }
  return tokens;
};

const phraseTokens = (text: string): string[] => tokenise(text).map(token => token.text);

/** One lexicon phrase found in the reader's draft. */
export interface PhraseTellHit {
  tell: PhraseTell;
  /** How many times the phrase occurs in this draft. */
  occurrences: number;
  /** Offsets of the first occurrence, for pointing at the draft. */
  start: number;
  end: number;
}

/** Curated phrases present in the draft, strongest ratio first. */
export const findPhraseTells = (draft: string): PhraseTellHit[] => {
  if (!draft.trim()) return [];
  const tokens = tokenise(draft);
  const hits: PhraseTellHit[] = [];
  for (const tell of CURATED_PHRASE_TELLS) {
    const wanted = phraseTokens(tell.phrase);
    let first: {start: number; end: number} | undefined;
    let occurrences = 0;
    for (let i = 0; i + wanted.length <= tokens.length; i++) {
      let matches = true;
      for (let j = 0; j < wanted.length; j++) {
        if (tokens[i + j].text !== wanted[j]) {matches = false; break;}
      }
      if (!matches) continue;
      occurrences += 1;
      first ??= {start: tokens[i].start, end: tokens[i + wanted.length - 1].end};
    }
    if (first) hits.push({tell, occurrences, start: first.start, end: first.end});
  }
  return hits.sort((left, right) => right.tell.ratio - left.tell.ratio || left.start - right.start);
};

// ── Paragraph rhythm ─────────────────────────────────────────────────────────

const BULLET_RE = /^\s*([-*+•]|\d+[.)])\s+/;
const MD_HEADING_RE = /^#{1,6}\s+/;

/** The measurement's symmetric heading test, on a plain single line. */
const headingLike = (line: string): boolean => {
  const s = line.trim();
  if (!s || s.length > 90) return false;
  if (BULLET_RE.test(s)) return false;
  if (/[.!?,;]$/.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length > 12) return false;
  return /[A-Za-z]/.test(s);
};

/** Blank-line-separated blocks that read as paragraphs rather than headings. */
const paragraphBlocks = (draft: string): string[] => {
  const blocks = draft.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  const paragraphs: string[] = [];
  for (const block of blocks) {
    // Heading lines are removed line by line, so a markdown heading glued to
    // its paragraph in one block does not drag the paragraph out with it.
    const lines = block.split("\n").filter(line => !MD_HEADING_RE.test(line.trim()));
    if (!lines.length) continue;
    if (lines.length === 1 && headingLike(lines[0])) continue;
    paragraphs.push(lines.join("\n"));
  }
  return paragraphs;
};

const sentenceCount = (paragraph: string): number =>
  paragraph.split(/(?<=[.!?])\s+/).filter(part => part.trim().split(/\s+/).length >= 2).length;

/** Population coefficient of variation — the measurement's own cv() (pstdev/mean). */
const populationCv = (values: number[]): number | undefined => {
  if (values.length < 2) return undefined;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return undefined;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};

/**
 * The flag point the study swept to: below it 24.1% of AI documents sit,
 * against 10.2% of human ones (7.2% of the hard negatives).
 */
export const RHYTHM_CV_FLAG = 0.3;

/**
 * The rhythm rates, re-measured 31 August 2026 against the structure-preserved
 * human corpus (DOCUMENT-TELLS-2026-08-31.md addendum): the earlier
 * 24.1%/10.2% pairing against human-v2 is superseded by this stronger one.
 */
export const RHYTHM_MEASURED = {
  aiRate: "31.0%", humanRate: "8.6%",
  basis: "measured on 3,838 AI and 3,186 structured human documents with at least five paragraphs"
} as const;

export interface RhythmTell {
  /** Coefficient of variation of sentences per paragraph. Lower is flatter. */
  cv: number;
  paragraphs: number;
  fires: boolean;
}

/**
 * Sentences-per-paragraph uniformity, computed exactly as the measurement
 * computed it: needs at least five paragraphs each holding a sentence, and
 * returns undefined below that floor rather than a rate with no meaning.
 */
export const paragraphRhythm = (draft: string): RhythmTell | undefined => {
  const counts = paragraphBlocks(draft).map(sentenceCount).filter(count => count > 0);
  if (counts.length < 5) return undefined;
  const cv = populationCv(counts);
  if (cv === undefined) return undefined;
  return {cv, paragraphs: counts.length, fires: cv <= RHYTHM_CV_FLAG};
};

// ── The formulaic closer ─────────────────────────────────────────────────────

/** The measurement's own closer pattern, anchored to the start of a line. */
const CLOSER_RE = /^(final (thoughts|words|takeaways?)|conclusion|in conclusion|in summary|to sum(marise| up)?|wrapping (it )?up|wrap[- ]?up|key takeaways?|the bottom line|closing thoughts|summing up|takeaways?)\b/i;

/**
 * The measured rates behind the closer copy, re-measured 31 August 2026
 * against the structure-preserved human corpus. The lift weakened to ~1.8×,
 * so the closer is COLOUR only: it never counts as a fired tell and renders
 * only as a footnote line beside real evidence.
 */
export const CLOSER_MEASURED = {
  aiRate: "2.4%", aiCounts: "98 of 4,016",
  humanRate: "1.3%", humanCounts: "47 of 3,529"
} as const;

export interface CloserTell {
  /** The sign-off line from the reader's own draft, for quoting. */
  line: string;
}

/**
 * A formulaic sign-off: a heading anywhere, or the opening of one of the last
 * two blocks, matching the closer pattern — the same three places the
 * measurement looked and no others.
 */
export const formulaicCloser = (draft: string): CloserTell | undefined => {
  const blocks = draft.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  if (!blocks.length) return undefined;
  const clean = (line: string) => line.replace(MD_HEADING_RE, "").replace(/\*\*(.+?)\*\*/g, "$1").trim();
  for (const block of blocks) {
    const lines = block.split("\n").map(clean).filter(Boolean);
    for (const line of lines) {
      if ((headingLike(line) || MD_HEADING_RE.test(block)) && CLOSER_RE.test(line)) return {line};
    }
  }
  for (const block of blocks.slice(-2)) {
    const line = clean(block.split("\n")[0] ?? "");
    if (CLOSER_RE.test(line)) return {line: line.length > 90 ? `${line.slice(0, 90).trimEnd()}…` : line};
  }
  return undefined;
};

// ── Word-count regularity: the strongest shape tells measured ───────────────
/**
 * Two tells from the 31 August 2026 re-measurement against the
 * structure-preserved human corpus (DOCUMENT-TELLS-2026-08-31.md addendum,
 * "word-count regularity"; raw outputs in
 * `research/human-structured-corpus-2026-08-31/new-human-summary.json`):
 *
 *  - words-per-paragraph CV <= 0.2 — 13.2% of AI documents (506/3,839)
 *    against 0.8% of structured human ones (26/3,190), 0.6% on the hard
 *    negatives — a 16x lift;
 *  - >= 90% of body sections within 15% of the document's median section
 *    length — 10.5% of AI (229/2,190) against 0.76% of human (16/2,112),
 *    0.75% on the hard negatives — ~14x.
 *
 * Both computed exactly as `measure_new_human.py` computes them: whitespace
 * word counts, population CV, sections from the same block classifier the
 *  scaffold uses, body = interior sections when there are five or more.
 * Deliberately NOT shipped from the same study: sections-per-article (partly
 * a corpus-length artefact), bullet-happiness (an anti-tell — humans use
 * MORE lists) and keyphrase echo (anti-tell confirmed).
 */

/** Floors: below ~500 words these regularity readings are noise. */
export const REGULARITY_MIN_WORDS = 500;

export const WPP_CV_FLAG = 0.2;
export const WPP_MEASURED = {
  aiRate: "13.2%", aiCounts: "506 of 3,839",
  humanRate: "0.8%", humanCounts: "26 of 3,190",
  hardNegatives: "0.6% (15 of 2,384) on FAQ and listicle-like human pages"
} as const;

export const SEC15_FLAG = 0.9;
export const SEC15_MEASURED = {
  aiRate: "10.5%", aiCounts: "229 of 2,190",
  humanRate: "0.76%", humanCounts: "16 of 2,112",
  hardNegatives: "0.75% (15 of 1,994) on FAQ and listicle-like human pages"
} as const;

const whitespaceWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;

export interface WppTell {
  cv: number;
  paragraphs: number;
  fires: boolean;
}

/** Words-per-paragraph regularity: population CV over paragraph blocks. */
export const paragraphSizeRegularity = (draft: string): WppTell | undefined => {
  if (whitespaceWords(draft) < REGULARITY_MIN_WORDS) return undefined;
  const counts = classifyBlocks(draft)
    .filter(block => block.kind === "para")
    .map(block => whitespaceWords(block.content))
    .filter(count => count > 0);
  if (counts.length < 5) return undefined;
  const cv = populationCv(counts);
  if (cv === undefined) return undefined;
  return {cv, paragraphs: counts.length, fires: cv <= WPP_CV_FLAG};
};

export interface Sec15Tell {
  /** Share of body sections within 15% of the median body-section length. */
  share: number;
  bodySections: number;
  sections: number;
  fires: boolean;
}

/** Section-length uniformity, ported from measure_new_human.py word_metrics. */
export const sectionLengthUniformity = (draft: string): Sec15Tell | undefined => {
  if (whitespaceWords(draft) < REGULARITY_MIN_WORDS) return undefined;
  const blocks = classifyBlocks(draft);
  const sections: string[][] = [];
  let current: string[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") {sections.push(current); current = [];}
    else current.push(block.content);
  }
  sections.push(current);
  const nonEmpty = sections.length > 1 ? sections.slice(1).filter(section => section.length) : [];
  const wps = nonEmpty.map(section => section.reduce((sum, content) => sum + whitespaceWords(content), 0));
  if (wps.length < 4) return undefined;
  const body = wps.length >= 5 ? wps.slice(1, -1) : wps;
  if (!(body.length >= 4 || body.length >= 2)) return undefined;
  const sorted = [...body].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  if (median <= 0) return undefined;
  const share = body.filter(w => Math.abs(w - median) <= 0.15 * median).length / body.length;
  return {share, bodySections: body.length, sections: nonEmpty.length, fires: share >= SEC15_FLAG};
};

// ── Under-repetition: adjacent-sentence content-word overlap ────────────────
/**
 * The programme's strongest interpretable signal, ported verbatim from the
 * signal-science study (`services/local-engine/research/signal-science/`,
 * `features.py` — `dis_adjacent_sent_cohesion`): for every pair of
 * neighbouring sentences, the Jaccard overlap of their content-word sets,
 * averaged over pairs where both sides have content words.
 *
 * Direction: LOW overlap reads machine. Machine prose under-repeats — the
 * median machine document shares 2.1% of content words between neighbouring
 * sentences against 6.3% for human, AUROC 0.912 on 670 register-and-length-
 * matched fresh long-form pairs (SIGNAL-SCIENCE.md §2). This is the OPPOSITE
 * tail from the editorial adjacent-lemma-repeat note, which flags heavy
 * repetition; the two must never render together.
 */

/** The study's own stopword list, verbatim, so the site computes what was measured. */
const COHESION_STOPWORDS = new Set(`a about above after again against all am an and any are aren't as at be because been
before being below between both but by can cannot could couldn't did didn't do does doesn't doing don't
down during each few for from further had hadn't has hasn't have haven't having he her here hers herself
him himself his how i if in into is isn't it its itself let's me more most mustn't my myself no nor not
of off on once only or other ought our ours ourselves out over own same shan't she should shouldn't so
some such than that the their theirs them themselves then there these they this those through to too
under until up very was wasn't we were weren't what when where which while who whom why with won't would
wouldn't you your yours yourself yourselves`.split(/\s+/));

/** The study's word and sentence rules, ported without change. */
const COHESION_WORD_RE = /[A-Za-zÀ-ɏ']+/g;
const COHESION_SENT_SPLIT = /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)(?<=[.!?])["'”’)\]]*\s+(?=["'“‘(\[]*[A-Z0-9])/;

/**
 * The firing bound, derived from the study's own stored per-document
 * features rather than picked by eye: the 1st percentile of
 * dis_adjacent_sent_cohesion over the 4,636 fresh long-form human documents
 * is 0.01177 (np.quantile(human, 0.01), the same 1%-false-positive
 * discipline the study's TPR@1% column uses). Below it sit 13.6% of the 922
 * fresh long-form AI documents and 1.0% of the human ones.
 */
export const COHESION_FLAG = 0.0118;

/** Below this many scored pairs the average is noise, so nothing is read. A UI stability floor, not a study parameter. */
export const COHESION_MIN_PAIRS = 15;

/** The measured context every rendering of this tell must carry. */
export const COHESION_MEASURED = {
  aiMedianPercent: "2.1%",
  humanMedianPercent: "6.3%",
  basis: "medians over 670 register-and-length-matched pairs of fresh long-form documents; the signal separates at AUROC 0.912",
  boundBasis: "fires only below the point 99% of 4,636 fresh long-form human documents sit above"
} as const;

export interface CohesionTell {
  /** Mean adjacent-sentence content-word overlap, 0–1. */
  value: number;
  /** Scored sentence pairs behind the mean. */
  pairs: number;
  fires: boolean;
}

/**
 * Sentence segmentation, ported verbatim from `features.py::_sentences`
 * (PHASE1-PARITY-NOTE-2026-09-01.md, cycle5-train/deploy-prep/): the Python
 * original splits on bare `\n` FIRST, strips each line, and only then
 * applies `COHESION_SENT_SPLIT` within that line — so a hard line-wrap with
 * no terminal punctuation before it is always a sentence boundary. A single
 * whole-text regex split (the prior form of this function) disagreed with
 * that on such input, which `md-strip-v1` does not normalise away. Fixed
 * here because `COHESION_FLAG` (0.0118) was fitted on the Python-computed
 * distribution, so extraction must reproduce the training-time computation
 * including this quirk, not the version an unaided reading of the regex
 * would suggest.
 */
const cohesionSentences = (draft: string): string[] => {
  const out: string[] = [];
  for (const line of draft.split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    for (const sentence of trimmedLine.split(COHESION_SENT_SPLIT)) {
      const trimmed = sentence.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
};

/**
 * The raw value with no UI floor, exactly `struct_features.py::_adjacent_overlap`
 * (and `features.py`'s own `dis_adjacent_sent_cohesion`): `undefined` only
 * when there are zero scored pairs (Python's NaN), matching the model
 * feature contract, which has no 15-pair floor — that floor is
 * `adjacentCohesion`'s own UI stability choice, not a training-time gate,
 * and must not leak into the feature value the model reads.
 */
export const adjacentCohesionRaw = (draft: string): {value: number; pairs: number} | undefined => {
  const sentenceSets = cohesionSentences(draft).map(sentence => {
    const words = sentence.match(COHESION_WORD_RE) ?? [];
    return new Set(words.map(word => word.toLowerCase()).filter(word => !COHESION_STOPWORDS.has(word)));
  });
  let total = 0, pairs = 0;
  for (let i = 0; i < sentenceSets.length - 1; i++) {
    const a = sentenceSets[i], b = sentenceSets[i + 1];
    if (!a.size || !b.size) continue;
    let shared = 0;
    for (const word of a) if (b.has(word)) shared += 1;
    total += shared / (a.size + b.size - shared);
    pairs += 1;
  }
  if (!pairs) return undefined;
  return {value: total / pairs, pairs};
};

export const adjacentCohesion = (draft: string): CohesionTell | undefined => {
  const raw = adjacentCohesionRaw(draft);
  if (!raw || raw.pairs < COHESION_MIN_PAIRS) return undefined;
  return {value: raw.value, pairs: raw.pairs, fires: raw.value <= COHESION_FLAG};
};

// ── The composite scaffold ──────────────────────────────────────────────────
/**
 * Section-shape uniformity, ported from `measure_scaffold_v2.py` in the
 * document-tells study: blocks are classified heading / bullets / paragraph
 * with the same symmetric heuristics, sections are runs of blocks under each
 * heading, and each section gets a shape signature (paragraph blocks, bullet
 * blocks). The composite fires on >= 4 sections AND >= 80% of body sections
 * sharing one signature AND sentences-per-paragraph CV <= 0.35.
 *
 * Measured: 4.8% of structured AI documents (111/2,332) against 1.7% of
 * structured human ones (5/292) — 3.6% on the listicle-like hard negatives
 * (5/140). Shape uniformity ALONE was refuted as a tell and must never fire
 * simply because a document has headings; the composite is the measured
 * survivor (DOCUMENT-TELLS-2026-08-31.md, Tell 2 v2).
 */
type BlockKind = "heading" | "bullets" | "para";

const BOLD_ONLY_RE = /^\*\*(.+)\*\*:?\s*$/;
const stripMdInline = (s: string) => s
  .replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
  .replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\([^)]*\)/g, "$1").trim();

const classifyBlocks = (text: string): {kind: BlockKind; content: string}[] => {
  const out: {kind: BlockKind; content: string}[] = [];
  for (const raw of text.split(/\n\s*\n/)) {
    let lines = raw.split("\n").filter(line => line.trim());
    if (!lines.length) continue;
    // A block may open with heading lines and then continue: peel them off.
    for (;;) {
      const first = lines[0]?.trim() ?? "";
      const md = first.match(/^#{1,6}\s+(.*)$/);
      const bold = first.match(BOLD_ONLY_RE);
      if (md) {out.push({kind: "heading", content: stripMdInline(md[1])}); lines = lines.slice(1); continue;}
      if (bold && headingLike(stripMdInline(bold[1]))) {out.push({kind: "heading", content: stripMdInline(bold[1])}); lines = lines.slice(1); continue;}
      break;
    }
    if (!lines.length) continue;
    const bulletLines = lines.filter(line => BULLET_RE.test(line)).length;
    const body = lines.join("\n");
    if (bulletLines >= 2 && bulletLines >= 0.5 * lines.length) {
      out.push({kind: "bullets", content: body});
    } else if (lines.length === 1 && headingLike(stripMdInline(lines[0])) && !BULLET_RE.test(lines[0])) {
      out.push({kind: "heading", content: stripMdInline(lines[0])});
    } else {
      out.push({kind: "para", content: lines.length === 1 ? stripMdInline(body) : body});
    }
  }
  return out;
};

/**
 * The measured rates the scaffold copy must carry, denominators included.
 * Re-measured 31 August 2026 against the structure-preserved human corpus
 * (2,513 structured human documents): the old n=292 human baseline and its
 * small-sample caveat are superseded, and the composite now reads ~6.6× and
 * survives the hard negatives.
 */
export const SCAFFOLD_MEASURED = {
  aiRate: "4.8%", aiCounts: "111 of 2,332",
  humanRate: "0.72%", humanCounts: "18 of 2,513",
  hardNegatives: "0.78% (17 of 2,175) on FAQ and listicle-like human pages"
} as const;

export interface ScaffoldTell {
  /** Sections with content under a heading. */
  sections: number;
  bodySections: number;
  /** How many body sections carry the modal signature. */
  modeCount: number;
  modeShare: number;
  /** The repeating shape: paragraph blocks and bullet blocks per section. */
  shape: {paragraphs: number; bullets: number};
  sppCv: number;
  fires: boolean;
}

export const sectionScaffold = (draft: string): ScaffoldTell | undefined => {
  const blocks = classifyBlocks(draft);
  const sections: {kind: BlockKind; content: string}[][] = [];
  let current: {kind: BlockKind; content: string}[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") {sections.push(current); current = [];}
    else current.push(block);
  }
  sections.push(current);
  const nonEmpty = sections.length > 1 ? sections.slice(1).filter(section => section.length) : [];
  if (nonEmpty.length < 4) return undefined;
  // Intro and outro may differ when the document is long enough — the
  // measurement's own rule, so an intro-1 / body-2-2-2 / outro-1 document
  // counts as uniform.
  const body = nonEmpty.length >= 5 ? nonEmpty.slice(1, -1) : nonEmpty;
  const signatures = body.map(section => ({
    paragraphs: section.filter(block => block.kind === "para").length,
    bullets: section.filter(block => block.kind === "bullets").length
  }));
  const counts = new Map<string, number>();
  for (const signature of signatures) {
    const key = `${signature.paragraphs}|${signature.bullets}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [modeKey, modeCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const [paragraphs, bullets] = modeKey.split("|").map(Number);
  const spp = blocks.filter(block => block.kind === "para").map(block => sentenceCount(block.content)).filter(count => count > 0);
  if (spp.length < 5) return undefined;
  const sppCv = populationCv(spp) ?? Number.POSITIVE_INFINITY;
  const modeShare = modeCount / signatures.length;
  return {
    sections: nonEmpty.length,
    bodySections: signatures.length,
    modeCount,
    modeShare,
    shape: {paragraphs, bullets},
    sppCv,
    fires: nonEmpty.length >= 4 && modeShare >= 0.8 && sppCv <= 0.35
  };
};

// ── Model features #3, #4: body_mode_share, spp_cv, RAW (not the tell) ─────
/**
 * `measure_scaffold_v2.py::doc_metrics`'s `body_mode_share` and `spp_cv`,
 * with the gates `doc_metrics` itself uses. NOT the same as `sectionScaffold`
 * above: that function is the editorial composite tell, which additionally
 * requires >= 4 non-empty sections because that is the TELL's own firing
 * rule (`fires: nonEmpty.length >= 4 && ...`). The raw model feature
 * `body_mode_share` only needs >= 3 non-empty sections (`doc_metrics` line
 * `if len(nonempty) >= 3`), and `spp_cv` is gated independently on
 * >= 5 scored paragraphs with no relation to section count at all.
 * Reusing `sectionScaffold` directly for the contract would silently return
 * undefined for exactly-3-section documents and for any document whose
 * `spp_cv` is measurable but whose section count sits below 4 — a second
 * instance of the class of bug the adjacent-cohesion line-wrap fix caught.
 */
export interface ScaffoldFeaturesRaw {
  bodyModeShare?: number;
  sppCv?: number;
}

export const scaffoldFeaturesRaw = (text: string): ScaffoldFeaturesRaw => {
  const blocks = classifyBlocks(text);
  const sections: {kind: BlockKind; content: string}[][] = [];
  let current: {kind: BlockKind; content: string}[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") {sections.push(current); current = [];}
    else current.push(block);
  }
  sections.push(current);
  const nonEmpty = sections.length > 1 ? sections.slice(1).filter(section => section.length) : [];
  const out: ScaffoldFeaturesRaw = {};
  if (nonEmpty.length >= 3) {
    const body = nonEmpty.length >= 5 ? nonEmpty.slice(1, -1) : nonEmpty;
    const signatures = body.map(section => ({
      paragraphs: section.filter(block => block.kind === "para").length,
      bullets: section.filter(block => block.kind === "bullets").length
    }));
    const counts = new Map<string, number>();
    for (const signature of signatures) {
      const key = `${signature.paragraphs}|${signature.bullets}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const modeCount = [...counts.values()].sort((a, b) => b - a)[0];
    out.bodyModeShare = modeCount / signatures.length;
  }
  const paras = blocks.filter(block => block.kind === "para");
  const spp = paras.map(block => sentenceCount(block.content)).filter(count => count > 0);
  if (spp.length >= 5) out.sppCv = populationCv(spp);
  return out;
};

// ── Model features #0, #1: wpp_cv, sec_within15, ported verbatim ───────────
/**
 * `measure_new_human.py::word_metrics`, ported verbatim (cycle5-train
 * feature #0 wpp_cv, #1 sec_within15; PHASE1-PARITY-NOTE-2026-09-01.md).
 * Reuses `classifyBlocks` (already verified byte-for-byte against
 * `measure_scaffold_v2.classify_blocks` via the scaffold-tell fixtures) and
 * `populationCv` (verified against Python's `cv()`).
 *
 * Word counts here are Python's bare `str.split()` — whitespace tokens, NOT
 * the `WORD_RE` letters-only regex the cohesion/cadence features use. That
 * distinction is the study's own and is preserved exactly, not normalised
 * away for consistency with the other features.
 */
const wordCountWhitespace = (s: string): number => {
  const trimmed = s.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export interface WordMetrics {
  wpsCv?: number;
  secWithin15?: number;
  wppCv?: number;
  /** Model feature #2, `measure_fingerprint.fingerprint`'s `pps_var`: population variance of blocks-per-section, sections >= 4 only. */
  ppsVar?: number;
}

/** Population variance — Python `statistics.pvariance`. */
const populationVariance = (values: number[]): number => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
};

export const wordMetrics = (text: string): WordMetrics => {
  const blocks = classifyBlocks(text);
  const sections: {kind: BlockKind; content: string}[][] = [];
  let current: {kind: BlockKind; content: string}[] = [];
  for (const block of blocks) {
    if (block.kind === "heading") {sections.push(current); current = [];}
    else current.push(block);
  }
  sections.push(current);
  const nonempty = sections.length > 1 ? sections.slice(1).filter(section => section.length) : [];
  const out: WordMetrics = {};
  if (nonempty.length >= 4) out.ppsVar = populationVariance(nonempty.map(section => section.length));
  const wps = nonempty.map(section => section.reduce((sum, block) => sum + wordCountWhitespace(block.content), 0));
  if (wps.length >= 3) {
    out.wpsCv = populationCv(wps);
    const body = wps.length >= 5 ? wps.slice(1, -1) : wps;
    if (body.length >= 4 || (wps.length >= 4 && body.length >= 2)) {
      const med = median(body);
      if (med > 0 && wps.length >= 4) {
        out.secWithin15 = body.filter(w => Math.abs(w - med) <= 0.15 * med).length / body.length;
      }
    }
  }
  const paras = blocks.filter(block => block.kind === "para");
  const wpp = paras.map(block => wordCountWhitespace(block.content)).filter(n => n > 0);
  if (wpp.length >= 5) out.wppCv = populationCv(wpp);
  return out;
};

// ── Model feature #7: has_structure, ported verbatim ────────────────────────
/**
 * `struct_features.py::extract` feature 7 — the missingness indicator for
 * the structure-dependent features 0-4: 1 if the document parses to at
 * least one heading or at least three paragraph blocks, 0 otherwise.
 */
export const hasStructure = (text: string): 0 | 1 => {
  const blocks = classifyBlocks(text);
  const nHead = blocks.filter(block => block.kind === "heading").length;
  const nPara = blocks.filter(block => block.kind === "para").length;
  return nHead >= 1 || nPara >= 3 ? 1 : 0;
};

// ── Real structure from a pasted HTML flavour ───────────────────────────────
/**
 * When a paste carried a text/html flavour, the draft's structure — headings,
 * paragraphs, lists — can be read from the real tags instead of inferred from
 * bare lines. The HTML is input data only: parsed DETACHED with DOMParser,
 * scripts and styles removed before anything is read, and never rendered or
 * transmitted anywhere the plain text would not go.
 *
 * The sanity gate is the whole safety story for honesty: the HTML is used
 * only when its extracted text matches the plain draft (whitespace
 * normalised). A partial paste, an edited draft or a mismatched clipboard
 * fails the gate and the line-based inference runs exactly as before.
 *
 * The derivation re-expresses the structure as the marked-up text the
 * existing detectors already read — "## " headings, "- " list lines,
 * blank-line paragraphs — so one set of measured detectors serves both
 * routes rather than a second implementation drifting from the first.
 */
const HTML_BLOCK_TAGS = new Set(["P", "BLOCKQUOTE", "PRE", "TABLE", "FIGURE", "DL"]);
const HTML_SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "IFRAME", "OBJECT", "EMBED", "NOSCRIPT", "HEAD", "TITLE", "META", "LINK"]);

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

export const structureTextFromHtml = (html: string, plainText: string): string | undefined => {
  if (typeof DOMParser === "undefined") return undefined;
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(html, "text/html");
  } catch {
    return undefined;
  }
  for (const node of Array.from(doc.querySelectorAll("script,style,template,iframe,object,embed,noscript"))) node.remove();
  const body = doc.body;
  if (!body) return undefined;
  // The gate: the HTML must describe exactly the text that was pasted. The
  // comparison strips ALL whitespace rather than normalising it, because
  // textContent butts block elements together ("A headingBody text…") where
  // the plain flavour carries a newline; every non-space character must still
  // match, in order.
  const fingerprint = (text: string) => text.replace(/\s+/g, "");
  if (fingerprint(body.textContent ?? "") !== fingerprint(plainText)) return undefined;

  const blocks: string[] = [];
  const emit = (line: string) => {const text = collapse(line); if (text) blocks.push(text);};
  const walk = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tag = child.tagName;
      if (HTML_SKIP_TAGS.has(tag)) continue;
      const headingLevel = /^H([1-6])$/.exec(tag)?.[1];
      if (headingLevel) {emit(`${"#".repeat(Number(headingLevel))} ${child.textContent ?? ""}`); continue;}
      if (tag === "UL" || tag === "OL") {
        const items = Array.from(child.querySelectorAll("li"))
          .map(item => `- ${collapse(item.textContent ?? "")}`)
          .filter(item => item !== "- ");
        if (items.length) blocks.push(items.join("\n"));
        continue;
      }
      if (HTML_BLOCK_TAGS.has(tag)) {emit(child.textContent ?? ""); continue;}
      // Anything else with element children is a container — Google Docs
      // wraps a whole document in one <b>, Word in nested <div>s — so
      // recurse rather than flattening a document into one block.
      if (child.children.length) {walk(child); continue;}
      // A childless element standing alone: keep its text as a block.
      emit(child.textContent ?? "");
    }
  };
  if (body.children.length) walk(body);
  else emit(body.textContent ?? "");
  if (!blocks.length) return undefined;
  return blocks.join("\n\n");
};

// ── Assembly ────────────────────────────────────────────────────────────────

export interface DocumentTells {
  phrases: PhraseTellHit[];
  rhythm?: RhythmTell;
  /** Colour only since 31 August 2026 (~1.8x): never counted in `fired`. */
  closer?: CloserTell;
  underRepetition?: CohesionTell;
  scaffold?: ScaffoldTell;
  cadence?: CadenceTell;
  paragraphSize?: WppTell;
  sectionLengths?: Sec15Tell;
  /** How many measured tells actually fired. */
  fired: number;
}

/**
 * Every measured tell, read from the draft alone. Never a verdict input.
 *
 * `structureHtml` is the clipboard's text/html flavour when the draft arrived
 * by paste and has not been edited since. When it survives the sanity gate,
 * the STRUCTURE tells (sections, paragraph rhythm, the closer) read the real
 * tags; the LEXICAL tells (phrases, under-repetition) always read the plain
 * draft, whose offsets the interface points at. Browser-side only: nothing
 * about the HTML flavour travels on any route the plain text does not.
 */
export const findDocumentTells = (draft: string, structureHtml?: string): DocumentTells => {
  const structureText = structureHtml ? structureTextFromHtml(structureHtml, draft) : undefined;
  const structural = structureText ?? draft;
  const phrases = findPhraseTells(draft);
  const rhythm = paragraphRhythm(structural);
  const closer = formulaicCloser(structural);
  const underRepetition = adjacentCohesion(draft);
  const scaffold = sectionScaffold(structural);
  // The cadence scorer reads paragraphs, so it prefers the real tags too; its
  // own heading rule handles the plain-text route.
  const cadence = documentCadence(structural);
  const paragraphSize = paragraphSizeRegularity(structural);
  const sectionLengths = sectionLengthUniformity(structural);
  return {
    phrases,
    rhythm,
    closer,
    underRepetition,
    scaffold,
    cadence,
    paragraphSize,
    sectionLengths,
    // The closer is colour, not evidence, and does not count.
    fired: phrases.length + (rhythm?.fires ? 1 : 0) +
      (underRepetition?.fires ? 1 : 0) + (scaffold?.fires ? 1 : 0) + (cadence?.fires ? 1 : 0) +
      (paragraphSize?.fires ? 1 : 0) + (sectionLengths?.fires ? 1 : 0)
  };
};
