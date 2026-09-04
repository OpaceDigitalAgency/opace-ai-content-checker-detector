/**
 * The measured passage signals, ported from `shared/presentation/checker-result-presentation.mjs`
 * (Lane D3 §4, "What the model measured").
 *
 * Why a port and not an import: the CLI vendors `shared/report/**` only. The presentation module is
 * the on-screen renderer — 2,000 lines of DOM code the terminal has no use for — and
 * `scripts/sync-shared-report.mjs` deliberately copies nothing that can reach a DOM. The three
 * measures below are pure functions of a passage string, so they are kept here the same way
 * `services/local-engine/src/opace_integrity/report.py` keeps its own copy: as a mirror, with the
 * shared module named as the source of truth.
 *
 * Every median, AUROC and basis sentence is quoted verbatim from `PASSAGE_SIGNAL_REFERENCES` in
 * that module, which in turn quotes `docs/research-drafts/burstiness-does-not-work.md`. Nothing
 * here is estimated. Sentence-length evenness is drawn with no typical-AI and no typical-human
 * marker because this project measured it at chance, and a marker would be an invention.
 *
 * None of this sets or moves a level. The level came from the trained model, which reads the
 * passage whole; these are what stand out when the same passage is measured.
 */

export interface SignalMeter {
  id: "adjacent_overlap" | "vocabulary_variety" | "sentence_length_cv";
  label: string;
  unit: string;
  value: number;
  scaleMin: number;
  scaleMax: number;
  aiMedian: number | null;
  humanMedian: number | null;
  auroc: number;
  basis: string;
  note: string;
  informative?: boolean;
}

export const PASSAGE_SIGNAL_REFERENCES = {
  adjacent_overlap: {
    label: "Word re-use between neighbouring sentences",
    aiMedian: 2.1,
    humanMedian: 6.3,
    auroc: 0.912,
    basis: "medians over 670 matched pairs of long-form documents; this is the signal that separates the two populations best",
  },
  vocabulary_variety: {
    label: "Vocabulary variety across the passage",
    aiMedian: 0.776,
    humanMedian: 0.694,
    auroc: 0.911,
    basis: "moving-average type-token ratio over 100-word windows; medians over the same 670 matched pairs",
  },
  sentence_length_cv: {
    label: "Sentence-length evenness",
    aiMedian: null,
    humanMedian: null,
    auroc: 0.521,
    basis: "measured on 5,935 matched pairs: AUROC 0.521 against 0.500 for chance, catching 2.5% of machine documents at a 1% false-positive budget",
  },
} as const;

const METER_NOTES: Record<SignalMeter["id"], string> = {
  adjacent_overlap:
    "How much of each sentence's vocabulary carries over into the next one. Human writing tends to keep a thread of repeated terms; a model reaches for a fresh word more often.",
  vocabulary_variety:
    "How many different words the passage uses for its length. A model tends to reach for a synonym where a person repeats the term they started with.",
  sentence_length_cv:
    "The best-known way to spot machine writing, and the one we measured at chance: machine prose varies its sentence lengths very slightly more than human prose, not less. It is drawn here because it is worth seeing, and it is drawn with no typical-AI or typical-human marker because there is no separation to mark.",
};

/* ------------------------------------------- word re-use between neighbours */

const MEASURE_STOPWORDS = new Set(["the", "and", "that", "this", "with", "from", "have", "has", "had", "for", "are", "was", "were", "will", "would", "could", "should", "can", "may", "might", "been", "being", "but", "not", "you", "your", "our", "their", "they", "them", "its", "his", "her", "she", "him", "who", "what", "when", "where", "which", "while", "than", "then", "there", "here", "these", "those", "into", "onto", "over", "under", "about", "after", "before", "between", "through", "also", "more", "most", "some", "such", "only", "just", "very", "each", "other", "any", "all", "one", "two", "how", "why", "out", "off", "own", "same", "too", "did", "does", "doing", "because", "against", "during", "without", "within", "upon", "among"]);

const measureSentences = (text: unknown): string[] => String(text)
  .split(/(?<=[.!?…])\s+/u)
  .map(part => part.trim())
  .filter(part => part.split(/\s+/u).length >= 3);

const measureContentWords = (sentence: string): Set<string> => {
  const words = sentence.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  return new Set(words.filter(word => word.length >= 4 && !MEASURE_STOPWORDS.has(word)));
};

/**
 * The share of content words repeated between neighbouring sentences. A passage of fewer than
 * three usable sentences returns null and the meter is not drawn rather than guessed at.
 */
export function measurePassageOverlap(passage: unknown): number | null {
  const sentences = measureSentences(passage ?? "");
  if (sentences.length < 3) return null;
  const sets = sentences.map(measureContentWords);
  let shared = 0;
  let pairs = 0;
  for (let index = 0; index < sets.length - 1; index += 1) {
    const a = sets[index]!;
    const b = sets[index + 1]!;
    if (!a.size || !b.size) continue;
    let common = 0;
    for (const word of a) if (b.has(word)) common += 1;
    shared += common / ((a.size + b.size) / 2);
    pairs += 1;
  }
  if (!pairs) return null;
  return Math.round((shared / pairs) * 1000) / 10;
}

/* ------------------------------ vocabulary variety and sentence-length evenness */

/** The study's own word and sentence rules, so the CLI computes what was measured. */
const SIGNAL_WORD_RE = /[A-Za-zÀ-ɏ']+/gu;
const SIGNAL_SENTENCE_SPLIT = /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)(?<=[.!?])["'”’)\]]*\s+(?=["'“‘(\[]*[A-Z0-9])/u;

const signalSentences = (text: unknown): string[] => {
  const out: string[] = [];
  for (const line of String(text ?? "").split("\n")) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    for (const sentence of trimmedLine.split(SIGNAL_SENTENCE_SPLIT)) {
      const trimmed = sentence.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
};

const signalWords = (text: unknown): string[] => (String(text ?? "").match(SIGNAL_WORD_RE) ?? []).map(word => word.toLowerCase());

/** Population coefficient of variation, the measurement's own cv() (pstdev/mean). */
const populationCv = (values: number[]): number | null => {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};

const MATTR_WINDOW = 100;

/** Moving-average type-token ratio: the mean unique-word share over 100-word windows. */
function mattr(words: string[]): number | null {
  if (words.length < MATTR_WINDOW) return null;
  const counts = new Map<string, number>();
  let distinct = 0;
  let total = 0;
  let windows = 0;
  for (let index = 0; index < words.length; index += 1) {
    const entering = words[index]!;
    const seen = counts.get(entering) ?? 0;
    counts.set(entering, seen + 1);
    if (seen === 0) distinct += 1;
    if (index >= MATTR_WINDOW) {
      const leaving = words[index - MATTR_WINDOW]!;
      const left = counts.get(leaving)! - 1;
      counts.set(leaving, left);
      if (left === 0) distinct -= 1;
    }
    if (index >= MATTR_WINDOW - 1) { total += distinct / MATTR_WINDOW; windows += 1; }
  }
  return windows ? total / windows : null;
}

const round = (value: number, places: number): number => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/**
 * Every signal this surface can measure on one passage, in the order the shared renderer draws
 * them. A signal whose passage is too short for an honest reading is left out rather than
 * estimated: word re-use needs three usable sentences, vocabulary variety needs 100 words and
 * sentence-length evenness needs four sentences.
 */
export function measureSectionSignals(passage: unknown): SignalMeter[] {
  const text = typeof passage === "string" ? passage : "";
  const meters: SignalMeter[] = [];

  const overlap = measurePassageOverlap(text);
  if (overlap !== null) {
    const reference = PASSAGE_SIGNAL_REFERENCES.adjacent_overlap;
    meters.push({
      id: "adjacent_overlap",
      label: reference.label,
      unit: "%",
      value: overlap,
      scaleMin: 0,
      scaleMax: 10,
      aiMedian: reference.aiMedian,
      humanMedian: reference.humanMedian,
      auroc: reference.auroc,
      basis: reference.basis,
      note: METER_NOTES.adjacent_overlap,
    });
  }

  const variety = mattr(signalWords(text));
  if (variety !== null) {
    const reference = PASSAGE_SIGNAL_REFERENCES.vocabulary_variety;
    meters.push({
      id: "vocabulary_variety",
      label: reference.label,
      unit: "",
      value: round(variety, 3),
      scaleMin: 0.6,
      scaleMax: 0.95,
      aiMedian: reference.aiMedian,
      humanMedian: reference.humanMedian,
      auroc: reference.auroc,
      basis: reference.basis,
      note: METER_NOTES.vocabulary_variety,
    });
  }

  const lengths = signalSentences(text)
    .map(sentence => (sentence.match(SIGNAL_WORD_RE) ?? []).length)
    .filter(count => count > 0);
  const cv = lengths.length >= 4 ? populationCv(lengths) : null;
  if (cv !== null) {
    const reference = PASSAGE_SIGNAL_REFERENCES.sentence_length_cv;
    meters.push({
      id: "sentence_length_cv",
      label: reference.label,
      unit: "",
      value: round(cv, 2),
      scaleMin: 0,
      scaleMax: 1,
      aiMedian: null,
      humanMedian: null,
      auroc: reference.auroc,
      basis: reference.basis,
      note: METER_NOTES.sentence_length_cv,
      informative: false,
    });
  }

  return meters;
}

/**
 * Which way a measured signal leans, and by how much. 1 is exactly at the typical-AI median, 0 at
 * the typical-human one. A signal with no measured separation has no lean and is never named.
 */
export function signalLean(meter: SignalMeter): {side: "ai" | "human"; strength: number} | null {
  if (meter.informative === false || meter.aiMedian === null || meter.humanMedian === null) return null;
  const span = meter.aiMedian - meter.humanMedian;
  if (!span) return null;
  const position = (meter.value - meter.humanMedian) / span;
  return {side: position >= 0.5 ? "ai" : "human", strength: Math.abs(position - 0.5)};
}

const LEAN_PHRASES: Record<string, {ai: string; human: string}> = {
  adjacent_overlap: {
    ai: "it re-uses fewer words between neighbouring sentences than people typically do",
    human: "it re-uses words between neighbouring sentences the way people typically do",
  },
  vocabulary_variety: {
    ai: "its vocabulary is more varied for its length than people typically write",
    human: "its vocabulary is about as varied for its length as people typically write",
  },
};

const joinPhrases = (parts: string[]): string => (parts.length === 1
  ? parts[0]!
  : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);

/**
 * "Why it reads this way": the two or three measured signals that lean towards the level this
 * section was given, named and ranked, with the boundary that has to travel with them. It never
 * claims a signal set the reading.
 */
export function explainSectionSignals(meters: SignalMeter[], level: unknown, levelLabel: string): string {
  const aiSide = level === "signal-strongly-ai" || level === "signal-likely-ai" || level === "signal-potentially-ai";
  const humanSide = level === "signal-likely-human";
  const leaning = meters
    .map(meter => ({meter, lean: signalLean(meter)}))
    .filter((entry): entry is {meter: SignalMeter; lean: {side: "ai" | "human"; strength: number}} => entry.lean !== null)
    .sort((a, b) => b.lean.strength - a.lean.strength);
  if (!leaning.length) {
    return "None of the signals we can measure on a passage this length has a reference to compare against, so there is nothing here to name. The reading above is the model's, taken from the passage as a whole.";
  }
  if (!aiSide && !humanSide) {
    const towardsAi = leaning.filter(entry => entry.lean.side === "ai").length;
    const split = towardsAi && towardsAi < leaning.length
      ? ` ${towardsAi} of the ${leaning.length} lean towards AI writing and the rest towards human writing.`
      : "";
    return `The measured signals here do not agree with each other, which is one reason the model could not commit either way.${split} They did not set the reading; the model did.`;
  }
  const wanted = aiSide ? "ai" : "human";
  const agreeing = leaning.filter(entry => entry.lean.side === wanted).slice(0, 3);
  if (!agreeing.length) {
    return `None of the signals we can measure on this passage leans towards ${levelLabel}. The reading above rests on patterns across the whole passage: the mix of sentence shapes and word choices the model was trained to recognise, which are too diffuse to point at one line. Nothing on this list set the reading; the model did.`;
  }
  const phrases = agreeing.map(entry => LEAN_PHRASES[entry.meter.id]?.[wanted] ?? `its ${entry.meter.label.toLowerCase()} leans that way`);
  if (agreeing.length === 1) {
    return `One measured signal leans the way this reading went: ${phrases[0]}. It did not set the reading. The model reads the passage whole, and this is what stands out when the same passage is measured.`;
  }
  const count = ["", "One", "Two", "Three"][agreeing.length] ?? String(agreeing.length);
  return `${count} measured signals lean the way this reading went: ${joinPhrases(phrases)}. The clearest is ${agreeing[0]!.meter.label.toLowerCase()}. They did not set the reading. The model reads the passage whole, and these are what stand out when the same passage is measured.`;
}

/** The one plain sentence beside a meter: what this passage measured, against the two references. */
export function meterSentence(meter: SignalMeter): string {
  const value = `${meter.value}${meter.unit}`;
  if (meter.aiMedian === null || meter.humanMedian === null) {
    return `this passage ${value}, with no typical-AI or typical-human marker, because none was measured (AUROC ${meter.auroc} against 0.500 for chance)`;
  }
  return `this passage ${value}, typical AI about ${meter.aiMedian}${meter.unit}, typical human about ${meter.humanMedian}${meter.unit} (AUROC ${meter.auroc})`;
}
