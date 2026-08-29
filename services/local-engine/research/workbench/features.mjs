// Calibration workbench — raw measurement layer.
//
// Cheap, engine-independent numeric features computed per sample so the owner
// can look for signals the rules stack never coded. Nothing here reads the
// engine; these are plain measurements over the text.
//
// Every feature is documented with the unit it is expressed in. Rates are per
// 1,000 words unless the label says otherwise. Several are acknowledged
// heuristics (passive voice, syllables) — the labels say so.

export const FUNCTION_WORDS = ["the","of","and","to","a","in","that","is","was","it","for","on","with","as","be","at","by","this","have","from","or","one","had","but","not","what","all","were","we","when","your","can","said","there","use","an","each","which","she","do","how","their","if","will","up","other","about","out","many","then"];

const HEDGES = ["may","might","could","perhaps","possibly","arguably","somewhat","relatively","generally","typically","often","usually","seems","appears","suggests","likely","potentially","broadly","largely","tends"];
const INTENSIFIERS = ["very","truly","really","incredibly","extremely","highly","deeply","remarkably","profoundly","significantly","vastly","utterly","absolutely","entirely","completely","particularly","especially","crucially","vitally"];
const FIRST_PERSON = ["i","me","my","mine","myself","we","us","our","ours","ourselves"];
const SECOND_PERSON = ["you","your","yours","yourself","yourselves"];
const THIRD_PERSON = ["he","him","his","she","her","hers","they","them","their","theirs","it","its"];

const SENT_SPLIT = /(?<=[.!?])\s+|\n+/;
const setOf = (a) => new Set(a);
const FW = setOf(FUNCTION_WORDS), HW = setOf(HEDGES), IW = setOf(INTENSIFIERS);
const P1 = setOf(FIRST_PERSON), P2 = setOf(SECOND_PERSON), P3 = setOf(THIRD_PERSON);

const words = (t) => t.toLowerCase().match(/[a-z']+/g) ?? [];
const sentences = (t) => t.split(SENT_SPLIT).map((s) => s.replace(/^[#>*\-\d.\s]+/, "").trim()).filter((s) => /\S/.test(s));
const count = (t, re) => (t.match(re) ?? []).length;
const sd = (a) => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length;
  return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function syllables(w) {
  const g = w.replace(/e$/, "").match(/[aeiouy]+/g);
  return g ? g.length : 1;
}

// id, label, group, description. Order defines the vector layout.
export const FEATURE_DEFS = [
  ["words", "Word count", "size", "Words in the document."],
  ["sentences", "Sentence count", "size", "Sentences after splitting on terminal punctuation and line breaks."],
  ["paragraphs", "Paragraph count", "size", "Blank-line separated blocks."],
  ["sentMean", "Mean sentence length", "rhythm", "Average words per sentence."],
  ["sentSd", "Sentence length SD", "rhythm", "Standard deviation of sentence length. Low values mean flat rhythm."],
  ["sentCv", "Sentence length CV", "rhythm", "SD divided by mean. The scale-free version of rhythm flatness."],
  ["paraMean", "Mean paragraph length", "rhythm", "Average words per paragraph."],
  ["paraCv", "Paragraph length CV", "rhythm", "Variation in paragraph length."],
  ["listItemCv", "List item length CV", "rhythm", "Variation in the length of bullet/numbered items. Zero when there are none."],
  ["linesPerPara", "Lines per paragraph", "structure", "Non-empty lines divided by paragraphs."],
  ["meanWordLen", "Mean word length", "lexical", "Average characters per word."],
  ["longWordShare", "Long word share", "lexical", "Share of words of 7 characters or more."],
  ["avgSyllables", "Mean syllables per word", "lexical", "Vowel-group heuristic, not a dictionary lookup."],
  ["ttr", "Type-token ratio", "lexical", "Distinct words divided by total words. Falls as documents get longer."],
  ["hapaxRatio", "Hapax ratio", "lexical", "Share of distinct words that occur exactly once."],
  ["fnwordShare", "Function word share", "lexical", "Share of tokens that are common function words."],
  ["commaPer1000", "Commas", "punct", "Commas per 1,000 words."],
  ["semicolonPer1000", "Semicolons", "punct", "Semicolons per 1,000 words."],
  ["colonPer1000", "Colons", "punct", "Colons per 1,000 words."],
  ["emDashPer1000", "Em dashes", "punct", "Em dashes (—) per 1,000 words."],
  ["enDashPer1000", "En dashes", "punct", "En dashes (–) per 1,000 words."],
  ["spacedHyphenPer1000", "Spaced hyphens", "punct", "\" - \" used as a dash, per 1,000 words."],
  ["questionPer1000", "Question marks", "punct", "Question marks per 1,000 words."],
  ["exclamationPer1000", "Exclamation marks", "punct", "Exclamation marks per 1,000 words."],
  ["curlyQuotePer1000", "Curly quotes", "punct", "Typographic quote characters per 1,000 words."],
  ["straightQuotePer1000", "Straight quotes", "punct", "ASCII double quotes per 1,000 words."],
  ["mixedQuotes", "Mixed quote styles", "punct", "1 when both curly and straight double quotes appear, else 0."],
  ["commasPerSentence", "Commas per sentence", "punct", "Mean commas in a sentence."],
  ["headingPer1000", "Markdown headings", "structure", "Lines beginning with # per 1,000 words."],
  ["bulletPer1000", "Bullet lines", "structure", "Lines beginning with a bullet marker per 1,000 words."],
  ["boldPer1000", "Bold runs", "structure", "**bold** spans per 1,000 words."],
  ["numeralPer1000", "Numerals", "structure", "Numbers per 1,000 words. Low counts indicate contentless prose."],
  ["capitalisedMidPer1000", "Mid-sentence capitals", "structure", "Capitalised words not at a sentence start, per 1,000 words — a proxy for named entities."],
  ["passivePer1000", "Passive constructions", "syntax", "\"be + past participle\" matches per 1,000 words. A regex heuristic, not a parser."],
  ["openerRepeatShare", "Repeated sentence openers", "syntax", "Share of sentences whose first word is used to open another sentence."],
  ["distinctOpenerRatio", "Distinct sentence openers", "syntax", "Distinct opening words divided by sentence count."],
  ["conjOpenShare", "Conjunction openers", "syntax", "Share of sentences opening And / But / So / Yet."],
  ["firstPersonPer1000", "First person pronouns", "voice", "I, we, my, our … per 1,000 words."],
  ["secondPersonPer1000", "Second person pronouns", "voice", "you, your … per 1,000 words."],
  ["thirdPersonPer1000", "Third person pronouns", "voice", "he, she, they, it … per 1,000 words."],
  ["hedgePer1000", "Hedging words", "voice", "may, might, typically, arguably … per 1,000 words."],
  ["intensifierPer1000", "Intensifiers", "voice", "very, truly, incredibly … per 1,000 words."],
  ["tricolonPer1000", "Three-item lists", "syntax", "\"x, y, and z\" constructions per 1,000 words."],
];

export const FEATURE_IDS = FEATURE_DEFS.map((f) => f[0]);

export function computeFeatures(text) {
  const w = words(text);
  const n = w.length || 1;
  const per1000 = (x) => (x / n) * 1000;
  const sents = sentences(text);
  const lens = sents.map((s) => (s.match(/\S+/g) ?? []).length);
  const paras = text.split(/\n\s*\n/).map((p) => (p.match(/\S+/g) ?? []).length).filter((x) => x > 0);
  const items = (text.match(/^[ \t]*(?:[-*•]|\d+[.)])\s+.*$/gm) ?? []).map((s) => (s.match(/\S+/g) ?? []).length);
  const lines = text.split("\n").filter((l) => l.trim()).length;

  const freq = new Map();
  for (const x of w) freq.set(x, (freq.get(x) ?? 0) + 1);
  const hapax = [...freq.values()].filter((c) => c === 1).length;

  const openers = sents.map((s) => (s.match(/[A-Za-z']+/) ?? [""])[0].toLowerCase()).filter(Boolean);
  const openerFreq = new Map();
  for (const o of openers) openerFreq.set(o, (openerFreq.get(o) ?? 0) + 1);
  const repeatedOpeners = openers.filter((o) => openerFreq.get(o) > 1).length;

  const curly = count(text, /[“”]/g);
  const straight = count(text, /"/g);

  let fn = 0, hedge = 0, intens = 0, p1 = 0, p2 = 0, p3 = 0, longW = 0, syl = 0, chars = 0;
  for (const x of w) {
    if (FW.has(x)) fn++;
    if (HW.has(x)) hedge++;
    if (IW.has(x)) intens++;
    if (P1.has(x)) p1++;
    if (P2.has(x)) p2++;
    if (P3.has(x)) p3++;
    if (x.length >= 7) longW++;
    syl += syllables(x);
    chars += x.length;
  }

  const sMean = mean(lens), pMean = mean(paras), iMean = mean(items);
  const v = {
    words: n, sentences: sents.length, paragraphs: paras.length,
    sentMean: sMean, sentSd: sd(lens), sentCv: sMean ? sd(lens) / sMean : 0,
    paraMean: pMean, paraCv: pMean ? sd(paras) / pMean : 0,
    listItemCv: iMean ? sd(items) / iMean : 0,
    linesPerPara: paras.length ? lines / paras.length : 0,
    meanWordLen: chars / n, longWordShare: longW / n, avgSyllables: syl / n,
    ttr: freq.size / n, hapaxRatio: freq.size ? hapax / freq.size : 0, fnwordShare: fn / n,
    commaPer1000: per1000(count(text, /,/g)),
    semicolonPer1000: per1000(count(text, /;/g)),
    colonPer1000: per1000(count(text, /:/g)),
    emDashPer1000: per1000(count(text, /—/g)),
    enDashPer1000: per1000(count(text, /–/g)),
    spacedHyphenPer1000: per1000(count(text, / - /g)),
    questionPer1000: per1000(count(text, /\?/g)),
    exclamationPer1000: per1000(count(text, /!/g)),
    curlyQuotePer1000: per1000(curly), straightQuotePer1000: per1000(straight),
    mixedQuotes: curly > 0 && straight > 0 ? 1 : 0,
    commasPerSentence: sents.length ? count(text, /,/g) / sents.length : 0,
    headingPer1000: per1000(count(text, /^#+\s/gm)),
    bulletPer1000: per1000(count(text, /^\s*[-*•]\s+/gm)),
    boldPer1000: per1000(count(text, /\*\*[^*\n]+\*\*/g)),
    numeralPer1000: per1000(count(text, /\b\d[\d,.]*\b/g)),
    capitalisedMidPer1000: per1000(count(text, /(?<![.!?]\s|^)\b[A-Z][a-z]{2,}/gm)),
    passivePer1000: per1000(count(text, /\b(?:is|are|was|were|be|been|being|am)\s+(?:\w+ly\s+)?\w+(?:ed|en)\b/gi)),
    openerRepeatShare: openers.length ? repeatedOpeners / openers.length : 0,
    distinctOpenerRatio: openers.length ? openerFreq.size / openers.length : 0,
    conjOpenShare: openers.length ? openers.filter((o) => ["and","but","so","yet"].includes(o)).length / openers.length : 0,
    firstPersonPer1000: per1000(p1), secondPersonPer1000: per1000(p2), thirdPersonPer1000: per1000(p3),
    hedgePer1000: per1000(hedge), intensifierPer1000: per1000(intens),
    tricolonPer1000: per1000(count(text, /\b[\w']+,\s+[\w']+,?\s+and\s+[\w']+\b/gi)),
  };
  return { vector: FEATURE_IDS.map((id) => v[id]), freq };
}
