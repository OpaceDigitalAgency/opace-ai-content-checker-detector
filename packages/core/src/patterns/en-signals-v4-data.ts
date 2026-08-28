/**
 * Rule data for the en-signals 2026.08.5 measured-stylometrics + owner-rhythm
 * pack.
 *
 * Sources:
 * - research/CLEAN-PROSE-DETECTION-PLAN.md §2 (the empiricist run's three
 *   surviving cheap signals: window-corrected sentence-length spectral
 *   flatness, conditional compression against a shipped human reference
 *   corpus, lexical register distance) and §3.1 (Tier 1 framing: continuous
 *   "machine-pattern evidence", never a standalone AI verdict).
 * - research/OWNER-RHYTHM-NOTES.md (punchline-fragment density, mic-drop
 *   paragraph shape, contrast-construction density, rhetorical-vs-procedural
 *   ratio) including its guardrail: skilled human copywriters legitimately
 *   use punchlines, so every rule here is corroboration-weight (tier B), low
 *   severity, density/threshold-based, and never fires on a single instance.
 *
 * Binding constraints honoured (do not relax without re-reading the plan):
 * - The plan's §2.3 combo trap: hand thresholds calibrated on a handful of
 *   human controls overfit. Every threshold below is chosen FP-first with
 *   margin against all repository human fixtures via
 *   tests/battery/calibrate.mjs, and is PROVISIONAL until the 30-50-sample
 *   genre-matched human corpus (tests/battery/human-corpus-v1.json) confirms
 *   it. Thresholds may be loosened freely; tightening requires a calibration
 *   re-run over that corpus.
 * - The stylometric cap in en-signals-v2.ts applies to every category here:
 *   rhythm measurements can never dominate a verdict (Stanford TOEFL
 *   correction, AI-TELLS-MEGA-PACK §6).
 * - For the finding-breadth escalation, all 2026.08.5 categories count as ONE
 *   combined stylometric contribution (wired in en-signals-v2.ts): four
 *   rhythm rules alone must never escalate a classification.
 *
 * All categories are era "evergreen" (they measure structure, not vocabulary
 * fashions) and carry `corroboration: true`.
 */

/** The 2026.08.5 categories. One set drives corroboration metadata, the
 * stylometric score cap, and the combined-breadth treatment. */
export const V4_RHYTHM_CATEGORIES: ReadonlySet<string> = new Set([
  "sentence-length-spectral-flatness",
  "conditional-compression",
  "lexical-register-distance",
  "punchline-fragment-density",
  "mic-drop-paragraph",
  "contrast-density",
  "rhetorical-procedural-ratio",
]);

/**
 * Calibrated thresholds, exported by name so tests/battery/calibrate.mjs can
 * print every fixture's measured value against the shipped gate. Values are
 * chosen FP-first: below/above the worst human fixture with margin (see the
 * calibration table in the workstream report). PROVISIONAL pending the
 * 40-sample human corpus.
 */
export const V4_THRESHOLDS = {
  /** Fixed window length in sentences for the spectral estimator — the
   * plan's length-artefact correction: flatness is only compared between
   * equal-length series. */
  spectralWindowSentences: 12,
  /** Minimum number of full windows before the signal is computed. */
  spectralMinWindows: 2,
  /** Fire when the window-averaged spectral flatness falls below this. */
  spectralFlatnessMax: 0.28,
  /** Conditional compression is computed only inside this word band: the
   * gain statistic falls with document length for EVERY author (the plan's
   * length-confound warning), so out-of-band documents are exempt rather
   * than mis-thresholded. */
  compressionMinWords: 250,
  compressionMaxWords: 900,
  /** Fire when the relative gain from the human-corpus prior falls below
   * this. Calibrated in-band: the lowest human sample measured 0.177; the
   * chat-export-furniture positive measures ~0.10. */
  compressionGainMin: 0.14,
  /** Minimum words before the register profile is computed (the L1 distance
   * is noisy on short texts — a 50-word human note measures >0.5). */
  registerMinWords: 300,
  /** Fire when function-word L1 distance from the human reference profile
   * exceeds this AND the long-word share exceeds the reference by the
   * delta below (both must hold — the genre-confound guard). Calibrated:
   * the highest human fixture measured funcL1 0.266 / longΔ 0.058. */
  registerFuncL1Min: 0.3,
  registerLongWordDeltaMin: 0.1,
  /** Punchline fragments: at least this many, at at least this share of
   * sentences, with at least this many paragraph-final. */
  punchlineMinCount: 4,
  punchlineMinRate: 0.18,
  punchlineMinParagraphFinal: 2,
  /** Mic-drop paragraphs required before the rule fires (never one). */
  micDropMinParagraphs: 2,
  /** Contrast constructions: minimum count AND minimum per-1000-words rate. */
  contrastMinCount: 4,
  contrastMinPer1000: 4,
  /** Rhetorical/procedural: minimum sentences, minimum abstract-claim
   * sentences, minimum abstract share, maximum concrete sentences. */
  ratioMinSentences: 12,
  ratioMinAbstract: 9,
  ratioMinShare: 0.7,
  ratioMaxConcrete: 2,
} as const;

// ─── Owner-rhythm word/pattern data ──────────────────────────────────

/**
 * Abstract-punchline cue: a ≤8-word declarative counts as a punchline
 * fragment only when it opens on an abstract deictic ("That's…", "It was…")
 * or carries an abstract pay-off noun. Concrete short sentences ("Two were
 * wrong.", "Dave complained.") deliberately do not match.
 */
export const ABSTRACT_PUNCH_RE =
  /^(?:(?:and\s+)?(?:that|this|it)['’]?s?\b)|\b(?:matters?|everything|nothing|difference|point|result|future|answer|story|truth|shift|mindset|game|lesson|magic|secret|power|possible|real\s+\w+)\b/i;

/**
 * Contrast cue for the mic-drop closer — the closer must carry the two-sided
 * turn ("not", "but", "It was…", "difference", "instead", "who/what/why").
 */
export const MIC_DROP_CONTRAST_RE =
  /\bnot\b|n[’']t\b|\bbut\b|\b(?:it|that|this)\s+(?:is|was)\b|\bdifference\b|\bmatters?\b|\binstead\b|\bwho\b|\bwhat\b|\bwhy\b|\bjust\b/i;

/**
 * Additional not-X-but-Y variants beyond the v2 NOT_JUST_CONTRAST dash forms
 * and the v3 NEG_PARALLELISM_RE: the sentence-pair contrast ("The difference
 * was not X. It was Y.") and the "isn't about X. It's about Y." shape.
 */
export const CONTRAST_VARIANT_RES: readonly RegExp[] = [
  /\b\w+\s+(?:is|was|are|were)\s+not\s+(?:about\s+|just\s+|only\s+)?[^.!?\n]{1,50}[.!?]\s+(?:It|They|That|This)\s+(?:is|was|are|were)\b/g,
  /\b(?:this|it)\s+(?:is|was)\s*n[’']t\s+about\s+[^.!?\n]{1,50}[.;—]\s*[Ii]t['’]s\s+about\b/g,
  /\b(?:this|it)\s+isn[’']t\s+[^.!?\n]{1,50}[.!?]\s+It['’]s\b/g,
];

/**
 * Concrete-action verbs for the rhetorical/procedural classifier: verbs that
 * name a specific, checkable act on a specific object. The heuristic
 * (documented in en-signals-v4.ts) treats a sentence as CONCRETE when it
 * contains a digit/currency/percent token, a mid-sentence capitalised word
 * (proper-noun proxy), or one of these verbs.
 */
export const CONCRETE_ACTION_VERB_RE =
  /\b(?:moved|installed|checked|rang|phoned|emailed|sent|built|wrote|ordered|fixed|booked|painted|measured|delivered|signed|printed|uploaded|configured|tested|deployed|migrated|invoiced|quoted|packed|shipped|cleaned|repaired|replaced|bought|paid|hired|visited|opened|closed|launched|updated|added|removed|reviewed|approved|submitted|filed|called|drove|attended|arranged|cancelled|refunded|scheduled|recorded|photographed|wired|plumbed|stocked|priced|posted|drafted|edited|published)\b/i;

/**
 * Abstract-claim cue for the rhetorical side of the ratio: a linking verb in
 * the sentence together with an intangible pay-off word.
 */
export const ABSTRACT_CLAIM_RE =
  /\b(?:is|are|was|were|isn[’']t|aren[’']t|means|matters|becomes?|feels?|represents?)\b[^.!?\n]{0,80}\b(?:important|essential|critical|everything|nothing|different|possible|powerful|real|value|success|growth|potential|future|journey|transformation|opportunity|mindset|game|advantage|key|vital|crucial|remarkable|extraordinary|leadership|innovation|vision|impact|change)\b/i;

// ─── Register-profile data ───────────────────────────────────────────

/**
 * Function-word inventory for the lexical-register profile: high-frequency
 * closed-class English words whose relative frequencies are stable across
 * topics (the classic stylometric basis). The text's frequency vector over
 * this list is compared (L1) with the same vector computed from the shipped
 * human reference corpus.
 */
export const REGISTER_FUNCTION_WORDS: readonly string[] = [
  "the", "of", "and", "a", "to", "in", "is", "it", "that", "was",
  "he", "for", "on", "are", "as", "with", "his", "they", "i", "at",
  "be", "this", "have", "from", "or", "one", "had", "by", "not", "but",
  "what", "all", "were", "we", "when", "your", "can", "there", "an", "which",
  "their", "if", "will", "so", "no", "would", "who", "them", "these", "than",
];

/** Tokens at or above this length count as "long words" for the register
 * component (formal/latinate register proxy from the empiricist's wlMean). */
export const REGISTER_LONG_WORD_LEN = 7;

// ─── Weights / metadata ──────────────────────────────────────────────
// Conservative: every category is tier-B corroboration at weight 2 and low
// severity; the stylometric cap in en-signals-v2.ts bounds the group.

export const V4_ISSUE_WEIGHTS: Record<string, number> = {
  "sentence-length-spectral-flatness": 2,
  "conditional-compression": 2,
  "lexical-register-distance": 2,
  "punchline-fragment-density": 2,
  "mic-drop-paragraph": 2,
  "contrast-density": 2,
  "rhetorical-procedural-ratio": 2,
};

export interface V4CategoryMeta {
  severity: "note" | "low";
  message: string;
  suggestion: string;
}

const B =
  "A weak signal on its own, reported only as corroboration alongside other findings. It is a stylistic hint, not evidence of authorship.";

export const V4_CATEGORY_META: Record<string, V4CategoryMeta> = {
  "sentence-length-spectral-flatness": {
    severity: "low",
    message:
      "The sentence-length rhythm is unusually structured for this much text (measured on fixed-length windows, so short texts are exempt). Polished human editing produces the same shape. " + B,
    suggestion: "No action needed unless other signals agree; varying sentence lengths naturally is a style choice, not a requirement.",
  },
  "conditional-compression": {
    severity: "low",
    message:
      "The text gains unusually little from a varied human-prose compression prior — a degenerate form of what trained classifiers measure. Highly templated human copy can score the same way. " + B,
    suggestion: "No action needed on its own; consider varying repeated phrasing if other signals agree.",
  },
  "lexical-register-distance": {
    severity: "low",
    message:
      "The function-word profile and word-length register sit far from the human reference profile. GENRE CAVEAT: the reference corpus is general prose, so specialised genres (academic, legal, technical) legitimately measure as distant — treat this strictly as corroboration. " + B,
    suggestion: "No action needed on its own; plainer wording reduces the distance if other signals agree.",
  },
  "punchline-fragment-density": {
    severity: "low",
    message:
      "Very short abstract declarative punchlines ('That's the point.') recur at high density, especially paragraph-final — the quotable-fragment cadence. Skilled human copywriters use punchlines deliberately, which is why only the density is reported. " + B,
    suggestion: "Keep the punchlines that earn their place; join the rest into full sentences.",
  },
  "mic-drop-paragraph": {
    severity: "low",
    message:
      "Multiple paragraphs are built as several mid-length setup sentences ending in a much shorter abstract contrast closer — the whole-paragraph-serves-the-last-line shape. One such paragraph is ordinary rhetoric; the repetition is the signal. " + B,
    suggestion: "Let some paragraphs end on their facts rather than a quotable closer.",
  },
  "contrast-density": {
    severity: "low",
    message:
      "Two-sided contrast constructions ('not X, but Y'; 'It wasn't A. It was B.') recur at high density. Single uses are ordinary human rhetoric; the repetition rate is the signal. " + B,
    suggestion: "Keep the strongest contrast and state the rest directly.",
  },
  "rhetorical-procedural-ratio": {
    severity: "low",
    message:
      "Sentences making abstract claims heavily outnumber sentences naming concrete actions, objects or numbers (heuristic: a sentence counts as concrete when it contains a number, a proper noun or a specific action verb). Vision and opinion pieces are legitimately abstract — treat strictly as corroboration. " + B,
    suggestion: "Ground more claims in specific actions, names or figures if other signals agree.",
  },
};
