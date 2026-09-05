/**
 * Synthetic-cadence scoring: the paragraph rhythm the owner reads by ear,
 * ported VERBATIM from `services/local-engine/research/signal-science/cadence/cadence.py`
 * in the engine repository (measurement: `docs/measurements/SYNTHETIC-CADENCE.md`).
 *
 * Sentence roles are APPROXIMATED from closed-class word lists, sentence-
 * initial shape, mood and punctuation — deliberately crude, so a reader can
 * check any role against the sentence by eye. Eight roles: C claim,
 * X contrast/qualification, E example, I instruction, R recommendation,
 * S consequence, Q question, A aside, assigned in fixed precedence.
 *
 * WHAT THIS IS FOR, AND WHAT IT MUST NEVER BE. The paragraph gate of 4 fires
 * on 14.00% of human paragraph-bearing documents (483 of 3,451), so this is
 * evidence copy in the illustrate-not-decide register only — "this reads as
 * over-structured", never "this reads as AI" — and nothing here touches the
 * verdict. The measurement's own conclusion is "do not ship as detection"
 * (SYNTHETIC-CADENCE.md §10); the three-axes rule and assertAxisIndependence
 * stay exactly as they are.
 *
 * The port's correctness is defined by the probe: the owner's three quoted
 * passages must produce the role sequences CIS, XXI, CC and clear their score
 * floors, no paragraph of his six human articles may reach the gate, and the
 * mutation tests must be able to make all of that fail. Those assertions are
 * ported in `tests/unit/cadence.spec.ts`.
 */

// ── Lexicons, verbatim ──────────────────────────────────────────────────────

export const IMPERATIVE_VERBS = new Set([
  "write", "separate", "check", "decide", "ask", "compare", "choose", "use",
  "avoid", "consider", "start", "keep", "make", "ensure", "focus", "set",
  "review", "plan", "list", "add", "remove", "treat", "look", "note", "take",
  "put", "get", "define", "identify", "measure", "test", "build", "map",
  "record", "confirm", "agree", "include", "prioritise", "prioritize", "read",
  "think", "remember", "imagine", "consult", "contact", "call", "visit", "try",
  "begin", "stop", "watch", "find", "give", "send", "bring", "leave", "let",
  "pick", "select", "apply", "assess", "evaluate", "explain", "describe",
  "state", "name", "show", "tell", "expect", "allow", "aim", "work", "run",
  "draft", "publish", "share", "track", "monitor", "verify", "document",
  "budget", "quote", "price", "specify", "request", "require", "reduce",
  "improve", "increase", "protect", "secure", "update", "replace", "revisit",
  "weigh", "balance", "match", "align", "clarify", "capture"
]);

export const UTILITY_VERBS = new Set([
  "affects", "affect", "changes", "change", "reduces", "reduce", "improves",
  "improve", "helps", "help", "ensures", "ensure", "determines", "determine",
  "drives", "drive", "covers", "cover", "includes", "include", "requires",
  "require", "depends", "depend", "means", "mean", "matters", "matter",
  "supports", "support", "enables", "enable", "prevents", "prevent",
  "increases", "increase", "lowers", "lower", "shapes", "shape", "delivers",
  "deliver", "provides", "provide", "creates", "create", "allows", "allow",
  "offers", "offer", "adds", "add", "brings", "bring", "makes", "make",
  "gives", "give", "saves", "save", "costs", "cost", "takes", "take",
  "needs", "need", "sets", "set", "builds", "build", "leads", "lead",
  "informs", "inform", "guides", "guide", "reflects", "reflect", "signals",
  "signal", "indicates", "indicate", "boosts", "boost", "strengthens",
  "strengthen", "limits", "limit", "avoids", "avoid", "protects", "protect",
  "streamlines", "streamline", "influences", "influence", "reveals", "reveal",
  "explains", "explain", "shows", "show", "raises", "raise", "cuts", "cut",
  "speeds", "speed", "clarifies", "clarify", "removes", "remove"
]);

const AUX_VERBS = new Set([
  "is", "are", "was", "were", "be", "been", "being", "am",
  "has", "have", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must"
]);

export let CONSEQUENCE_OPENERS = [
  "otherwise", "so ", "as a result", "that means", "this means",
  "the result is", "therefore", "then ", "consequently", "in short",
  "the effect is", "which is why", "that is why"
];

const EXAMPLE_MARKERS = [
  "for example", "for instance", "such as", "e.g.", "including ",
  "say, ", "like a ", "take the ", "consider the "
];

const CONTRAST_MARKERS = [
  " but ", " however", " though", " although", " yet ", " whereas ",
  " while ", " rather than ", " not always", " does not always",
  " is not a ", " is not the ", " instead of ", " unlike ", " despite ",
  " even so", " on the other hand"
];

const HEDGES = [
  "perhaps", "maybe", "sort of", "kind of", "arguably", "obviously",
  "of course", "i think", "we think", "in my experience", "honestly",
  "frankly", "actually", "pretty much", "more or less", "admittedly",
  "oddly", "curiously", "strangely", "funnily", "i suspect", "i'd say",
  "to be fair", "if anything", "not entirely", "i suppose", "somewhat",
  "roughly", "broadly", "loosely", "in a sense"
];

const FIRST_SECOND_PERSON = new Set([
  "i", "me", "my", "mine", "we", "us", "our", "ours", "you", "your", "yours",
  "i'm", "i've", "i'd", "i'll", "we're", "we've", "you're", "you've"
]);

const ABSTRACT_SUFFIXES = [
  "tion", "sion", "ment", "ity", "ance", "ence", "ness", "ship", "ology",
  "ism", "age", "ure", "cy", "ing"
];

const ABSTRACT_NOUNS = new Set([
  "cost", "costs", "count", "effort", "work", "price", "prices", "quality",
  "scope", "budget", "process", "model", "platform", "approach", "strategy",
  "structure", "content", "design", "page", "pages", "site", "sites", "data",
  "research", "evidence", "team", "business", "value", "risk", "time",
  "result", "results", "outcome", "outcomes", "choice", "decision", "factor",
  "feature", "features", "detail", "details", "brief", "spec",
  "policy", "practice", "method", "system", "tool", "tools", "rate", "rates",
  "level", "levels", "scale", "range", "share", "growth", "demand", "supply",
  "market", "sector", "product", "service", "services", "support", "success",
  "failure", "impact", "effect", "change", "role", "aim", "goal", "target"
]);

const CLAUSE_MARKERS = [
  " because ", " which ", " that ", " when ", " if ", " where ", " after ",
  " before ", " since ", " unless ", " until ", " so that ", " whether ",
  " while ", " although ", " though ", " whereas ", " as "
];

const SENT_SPLIT = /(?<=[.!?])["')\]]*\s+/;
const ABBREV = /\b(?:e\.g|i\.e|etc|vs|Dr|Mr|Mrs|Ms|Prof|Fig|No|St|Jr|Sr|approx|cf|al)\.$/i;
const WORD_RE = /[A-Za-z][A-Za-z'’-]*/g;

// ── Segmentation, verbatim ──────────────────────────────────────────────────

export const cadenceWords = (s: string): string[] => s.match(WORD_RE) ?? [];

export const splitCadenceSentences = (text: string): string[] => {
  const out: string[] = [];
  for (const raw of text.trim().split(SENT_SPLIT)) {
    const piece = raw.trim();
    if (!piece) continue;
    if (out.length && ABBREV.test(out[out.length - 1])) out[out.length - 1] += ` ${piece}`;
    else out.push(piece);
  }
  return out.filter(s => cadenceWords(s).length > 0);
};

/**
 * The measurement's own heading rule: a short line with no terminal
 * punctuation is a heading, not a paragraph sentence. Left in, it merges into
 * the first sentence below it and corrupts that sentence's role.
 */
const isHeading = (block: string): boolean => {
  const ws = cadenceWords(block);
  const last = block.replace(/\s+$/, "").slice(-1);
  return ws.length > 0 && ws.length <= 12 && !".!?:;\"')]".includes(last);
};

export const splitCadenceParagraphs = (text: string): string[] => {
  let blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  if (blocks.length <= 1) blocks = text.split("\n").map(b => b.trim()).filter(Boolean);
  const kept: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map(line => line.trim()).filter(Boolean)
      .filter(line => !isHeading(line));
    if (lines.length) kept.push(lines.join(" "));
  }
  return kept.length ? kept : blocks;
};

// ── Sentence analysis, verbatim ─────────────────────────────────────────────

export interface CadenceSentence {
  text: string;
  role: string;
  nWords: number;
  imperative: boolean;
  utility: boolean;
  messy: boolean;
  enumeration: boolean;
  balanced: boolean;
}

const startsImperative = (ws: string[]): boolean => {
  if (!ws.length) return false;
  const first = ws[0].toLowerCase();
  if (["do", "don't", "never", "always"].includes(first) && ws.length > 1) {
    // Python's strip("'t") removes apostrophes and t from both ends.
    const second = ws[1].toLowerCase().replace(/^['t]+|['t]+$/g, "");
    return IMPERATIVE_VERBS.has(second) || first === "never" || first === "always";
  }
  if (IMPERATIVE_VERBS.has(first)) {
    if (ws.length > 1 && AUX_VERBS.has(ws[1].toLowerCase())) return false;
    return true;
  }
  return false;
};

const firstFiniteIndex = (ws: string[]): number => {
  for (let i = 0; i < ws.length; i++) {
    const lw = ws[i].toLowerCase();
    if (AUX_VERBS.has(lw) || UTILITY_VERBS.has(lw)) return i;
  }
  return -1;
};

const isAbstractSubject = (sub: string[]): boolean => {
  if (!sub.length || sub.length > 5) return false;
  if (sub.some(w => FIRST_SECOND_PERSON.has(w.toLowerCase()))) return false;
  if (sub.slice(1).some(w => /[A-Z]/.test(w[0]))) return false;
  const head = sub[sub.length - 1].toLowerCase();
  return ABSTRACT_NOUNS.has(head) || ABSTRACT_SUFFIXES.some(suffix => head.endsWith(suffix));
};

const countEnumeration = (s: string): boolean =>
  /\w+\s*,\s*[^,;.]{2,40},\s*[^,;.]{2,40}\s+(?:and|or)\s+/.test(s);

/** Exported mutable ONLY so the probe test can break it and prove the probe fails. */
export let isBalancedImpl = (s: string): boolean => {
  const parts = s.split(/;|\s+while\s+|\s+whereas\s+/);
  if (parts.length < 2) return false;
  const heads: (string | null)[] = [];
  for (const part of parts) {
    const ws = cadenceWords(part);
    if (ws.length < 4) return false;
    const idx = firstFiniteIndex(ws);
    heads.push(idx >= 0 ? ws[idx].toLowerCase() : null);
  }
  const real = heads.filter((h): h is string => h !== null);
  return real.length >= 2 && new Set(real).size === 1;
};

const countOccurrences = (haystack: string, needle: string): number => {
  let count = 0, index = haystack.indexOf(needle);
  while (index !== -1) {count += 1; index = haystack.indexOf(needle, index + 1);}
  return count;
};

export const analyseCadenceSentence = (s: string): CadenceSentence => {
  const ws = cadenceWords(s);
  const low = ` ${s.toLowerCase()} `;
  const sent: CadenceSentence = {
    text: s, role: "C", nWords: ws.length,
    imperative: false, utility: false, messy: false,
    enumeration: countEnumeration(s), balanced: isBalancedImpl(s)
  };

  sent.messy = s.includes("(") || s.includes("—") || s.includes("–") || s.includes(" - ")
    || s.includes("...") || s.includes("…") || s.includes("!")
    || ws.some(w => FIRST_SECOND_PERSON.has(w.toLowerCase()))
    || HEDGES.some(h => low.includes(h))
    || (ws.length > 0 && ["and", "but", "so", "or", "still", "anyway"].includes(ws[0].toLowerCase()));

  const idx = firstFiniteIndex(ws);
  if (idx > 0) {
    sent.utility = UTILITY_VERBS.has(ws[idx].toLowerCase()) && isAbstractSubject(ws.slice(0, idx));
  }
  sent.imperative = startsImperative(ws);

  // Role, in fixed precedence order — the same order as the measurement.
  if (s.replace(/\s+$/, "").endsWith("?")) sent.role = "Q";
  else if (sent.imperative) sent.role = "I";
  else if (CONSEQUENCE_OPENERS.some(o => low.startsWith(` ${o}`))) sent.role = "S";
  else if ([" should ", " must ", " need to ", " ought to "].some(m => low.includes(m))) sent.role = "R";
  else if (EXAMPLE_MARKERS.some(m => low.includes(m))) sent.role = "E";
  else if (CONTRAST_MARKERS.some(m => low.includes(m))) sent.role = "X";
  else if (sent.messy) sent.role = "A";
  else sent.role = "C";
  void countOccurrences; // clause counting is not needed by the paragraph score
  void CLAUSE_MARKERS;
  return sent;
};

// ── The paragraph score, verbatim ───────────────────────────────────────────

/** A paragraph at or above this is called over-structured. Never "AI". */
export const CADENCE_GATE = 4;

const cadenceFrom = (ss: CadenceSentence[]): number => {
  if (!ss.length) return 0;
  const total = ss.reduce((sum, s) => sum + s.nWords, 0);
  const roles = ss.map(s => s.role);
  let score = 0;
  if (ss.length >= 3 && total <= 55) score += 3;
  if (["I", "R", "S"].includes(roles[roles.length - 1])) score += 2;
  if (ss.length >= 3 && ["C", "X"].includes(roles[0]) && ["I", "R", "S"].includes(roles[roles.length - 1])) score += 2;
  if (ss.some(s => s.balanced)) score += 2;
  score += Math.min(2, ss.filter(s => s.utility).length);
  if (ss.some(s => s.enumeration)) score += 1;
  score -= 2 * ss.filter(s => s.messy).length;
  return Math.max(0, score);
};

/** Exported mutable ONLY so the probe test can break it and prove the probe fails. */
export let paragraphCadence = (paragraph: string): number =>
  cadenceFrom(splitCadenceSentences(paragraph).map(analyseCadenceSentence));

export const roleAnnotate = (text: string): {role: string; sentence: string}[] =>
  splitCadenceParagraphs(text).flatMap(p =>
    splitCadenceSentences(p).map(s => {
      const analysed = analyseCadenceSentence(s);
      return {role: analysed.role, sentence: analysed.text};
    }));

// ── Test hooks: the probe must be able to fail ──────────────────────────────
/**
 * The measurement's own discipline (`test_cadence.py`): four mutation tests
 * break a detector and assert the probe then fails, because this project has
 * shipped a dead control that passed its tests. These setters exist only for
 * that spec; nothing in the product calls them.
 */
export const __cadenceTestHooks = {
  breakImperatives() {const saved = new Set(IMPERATIVE_VERBS); IMPERATIVE_VERBS.clear(); return () => {for (const v of saved) IMPERATIVE_VERBS.add(v);};},
  breakUtility() {const saved = new Set(UTILITY_VERBS); UTILITY_VERBS.clear(); return () => {for (const v of saved) UTILITY_VERBS.add(v);};},
  breakConsequenceOpeners() {const saved = CONSEQUENCE_OPENERS; CONSEQUENCE_OPENERS = []; return () => {CONSEQUENCE_OPENERS = saved;};},
  breakBalanced() {const saved = isBalancedImpl; isBalancedImpl = () => false; return () => {isBalancedImpl = saved;};},
  constantScore(value: number) {const saved = paragraphCadence; paragraphCadence = () => value; return () => {paragraphCadence = saved;};}
};

// ── The document-level tell ─────────────────────────────────────────────────

/**
 * The measured rates the copy must carry, from SYNTHETIC-CADENCE.md §3.2
 * (paragraph-bearing documents, in-sample gates):
 * `paragraph_cadence_max` >= 4 — 266/921 AI (28.88%) against 483/3,451 human
 * (14.00%); `tri_compression_flat` above its paragraph-bearing gate —
 * 158/921 AI (17.16%) against 174/3,462 human (5.03%).
 */
export const CADENCE_MEASURED = {
  aiRate: "28.9%", aiCounts: "266 of 921",
  humanRate: "14.0%", humanCounts: "483 of 3,451",
  basis: "paragraph-bearing long-form documents, 921 AI and 3,451 human"
} as const;

export const TRI_MEASURED = {
  aiRate: "17.2%", aiCounts: "158 of 921",
  humanRate: "5.0%", humanCounts: "174 of 3,462"
} as const;

/** The 95th-percentile-of-human gate for tri-compression on paragraph-bearing documents (cadence-model.json `gates_pb`). */
export const TRI_COMPRESSION_GATE = 29.322548028311427;

/** The floor below which nothing is read: the measurement's signals are undefined on very short drafts. */
export const CADENCE_MIN_WORDS = 300;
export const CADENCE_MIN_MULTI_PARAGRAPHS = 3;

export interface CadenceTell {
  /** The highest-scoring paragraph's score. */
  maxScore: number;
  /** That paragraph, exactly as written, for quoting. */
  paragraph: string;
  /** Its role sequence, e.g. "CIS". */
  roles: string;
  /** Its word count. */
  wordCount: number;
  /** Three-sentence windows of <= 45 words, per 1,000 words, whole draft. */
  triCompressionPer1k: number;
  triFires: boolean;
  fires: boolean;
}

/**
 * The compressed-rhythm tell for one draft. Undefined below the word and
 * paragraph floors — a rate on a five-line note is noise, not caution.
 */
export const documentCadence = (text: string): CadenceTell | undefined => {
  const paragraphs = splitCadenceParagraphs(text)
    .map(p => splitCadenceSentences(p).map(analyseCadenceSentence))
    .filter(ss => ss.length > 0);
  const sentences = paragraphs.flat();
  const nWords = sentences.reduce((sum, s) => sum + s.nWords, 0);
  const multi = paragraphs.filter(ss => ss.length >= 2);
  if (nWords < CADENCE_MIN_WORDS || multi.length < CADENCE_MIN_MULTI_PARAGRAPHS) return undefined;

  let best: {score: number; ss: CadenceSentence[]} | undefined;
  for (const ss of multi) {
    const score = cadenceFrom(ss);
    if (!best || score > best.score) best = {score, ss};
  }
  if (!best) return undefined;

  let tri = 0;
  for (let i = 0; i + 2 < sentences.length; i++) {
    if (sentences[i].nWords + sentences[i + 1].nWords + sentences[i + 2].nWords <= 45) tri += 1;
  }
  const triCompressionPer1k = tri * 1000 / nWords;

  return {
    maxScore: best.score,
    paragraph: best.ss.map(s => s.text).join(" "),
    roles: best.ss.map(s => s.role).join(""),
    wordCount: best.ss.reduce((sum, s) => sum + s.nWords, 0),
    triCompressionPer1k,
    triFires: triCompressionPer1k >= TRI_COMPRESSION_GATE,
    fires: best.score >= CADENCE_GATE
  };
};

// ── Model feature #6: paragraph_cadence_rate, ported verbatim ──────────────
/**
 * `has_paragraph_markup` and `paragraph_cadence_rate`, ported verbatim from
 * `cadence.py::has_paragraph_markup` and the rate block inside
 * `cadence.py::compute` (PHASE1-PARITY-NOTE-2026-09-01.md, cycle5-train's
 * `struct_features.py` feature #6). These are the cycle-5 model's own input,
 * distinct from `documentCadence`'s `maxScore`/`fires` (the editorial tell,
 * `paragraph_cadence_max`) — the two read different quantities from the same
 * primitives and must not be confused.
 */
export const hasParagraphMarkup = (text: string): boolean => splitCadenceParagraphs(text).length >= 3;

/**
 * Rate of paragraphs scoring >= CADENCE_GATE, per 1,000 words, over the
 * WHOLE document (not just the best-scoring paragraph). NaN — returned here
 * as `undefined`, matching the training pipeline's NaN-then-zero-after-
 * z-normalisation convention — when `has_paragraph_markup` is false, or the
 * document has fewer than 50 words or fewer than 4 sentences (the exact
 * gates in `compute`, independent of `documentCadence`'s own 300-word /
 * 3-multi-paragraph floor, which is a UI stability choice, not a training
 * gate).
 */
export const paragraphCadenceRate = (text: string): number | undefined => {
  const paragraphs = splitCadenceParagraphs(text)
    .map(p => splitCadenceSentences(p).map(analyseCadenceSentence))
    .filter(ss => ss.length > 0);
  const sentences = paragraphs.flat();
  const nWords = sentences.reduce((sum, s) => sum + s.nWords, 0);
  const nSents = sentences.length;
  if (nWords < 50 || nSents < 4) return undefined;
  if (!hasParagraphMarkup(text)) return undefined;
  const perK = 1000 / nWords;
  const multi = paragraphs.filter(ss => ss.length >= 2);
  const scores = multi.map(ss => cadenceFrom(ss));
  if (!scores.length) return undefined;
  return scores.filter(v => v >= CADENCE_GATE).length * perK;
};

/** The roles of a quoted paragraph, in plain words, e.g. "a claim, an instruction, then a consequence". */
export const rolesInWords = (roles: string): string => {
  const WORDS: Record<string, string> = {
    C: "a claim", X: "a contrast", E: "an example", I: "an instruction",
    R: "a recommendation", S: "a consequence", Q: "a question", A: "an aside"
  };
  const parts = [...roles].map(role => WORDS[role] ?? "a statement");
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")}, then ${parts[parts.length - 1]}`;
};
