import { findDocumentTells, adjacentCohesionRaw, cohesionSentences, COHESION_STOPWORDS, COHESION_WORD_RE, TELL_CORPUS, RHYTHM_MEASURED, WPP_MEASURED, SEC15_MEASURED, SCAFFOLD_MEASURED } from './document-tells.mjs';
import { CADENCE_MEASURED, rolesInWords } from './cadence.mjs';
import { findPhrasesIn } from './phrase-ratios.mjs';
import { qualifyingTellsIn, findRuleTellsIn } from './rule-tells.mjs';
import phraseTable from './phrase-table.mjs';
import liveness from './rule-liveness.mjs';

export const EVIDENCE_VERSION = 'measured-evidence-v1';
export const EVIDENCE_BOUNDARY = 'These are observable writing patterns, not the model explaining its decision. People also write these patterns; none proves who wrote the text.';
const safeText = value => typeof value === 'string' ? value : '';
const words = text => (text.match(COHESION_WORD_RE) ?? []).map(word => word.toLowerCase());
const cv = values => {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return mean ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) / mean : null;
};
const locate = (text, start, end, offset) => Number.isInteger(start) && Number.isInteger(end) && start >= 0 && end > start && end <= text.length
  ? { text: text.slice(start, end), start_utf16: start + offset, end_utf16: end + offset } : null;
const locateText = (text, excerpt, offset) => {
  const start = text.indexOf(excerpt);
  return start < 0 ? null : locate(text, start, start + excerpt.length, offset);
};

/** Validate a supplied draft against every recorded section. No inferred reconstruction. */
export function sourceMatchesSections(source, sections, characterCount) {
  return typeof source === 'string' && Number.isInteger(characterCount) && source.length === characterCount
    && Array.isArray(sections) && sections.length > 0
    && sections.every(section => typeof section?.passage === 'string'
      && locate(source, section.start_utf16, section.end_utf16, 0)
      && source.slice(section.start_utf16, section.end_utf16) === section.passage);
}

/** Research-aligned values; raw measurements are not model attributions or verdicts. */
export function measureEvidenceText(input) {
  const text = safeText(input);
  let cursor = 0;
  const sentences = cohesionSentences(text).map(sentence => {
    const start = text.indexOf(sentence, cursor);
    cursor = start + sentence.length;
    return { text: sentence, start_utf16: start, end_utf16: cursor };
  });
  const pairs = [];
  for (let i = 0; i + 1 < sentences.length; i++) {
    const a = new Set(words(sentences[i].text).filter(word => !COHESION_STOPWORDS.has(word)));
    const b = new Set(words(sentences[i + 1].text).filter(word => !COHESION_STOPWORDS.has(word)));
    if (!a.size || !b.size) continue;
    const sharedWords = [...a].filter(word => b.has(word));
    pairs.push({ first: sentences[i], second: sentences[i + 1], sharedWords, value: sharedWords.length / (a.size + b.size - sharedWords.length) });
  }
  const tokens = words(text);
  let vocabularyVariety = null;
  if (tokens.length >= 100) {
    let sum = 0, count = 0;
    for (let i = 0; i <= tokens.length - 100; i += 10) { sum += new Set(tokens.slice(i, i + 100)).size / 100; count++; }
    vocabularyVariety = sum / count;
  }
  const raw = adjacentCohesionRaw(text);
  return { adjacentOverlap: raw?.value ?? null, overlapPercent: raw ? raw.value * 100 : null, vocabularyVariety,
    sentenceLengthCv: cv(sentences.map(sentence => words(sentence.text).length).filter(Boolean)),
    sentences, pairs, leastConnected: pairs.reduce((best, pair) => !best || pair.value < best.value ? pair : best, null), wordCount: tokens.length };
}

/** Pure, portable evidence. Offsets always identify verbatim UTF-16 source slices. */
export function buildDraftEvidence(input, options = {}) {
  const text = safeText(input);
  const offset = Number.isInteger(options.offsetUtf16) && options.offsetUtf16 >= 0 ? options.offsetUtf16 : 0;
  const measurements = measureEvidenceText(text);
  const tells = findDocumentTells(text, typeof options.structureHtml === 'string' ? options.structureHtml : undefined);
  const observations = [];
  const add = (id, kind, title, explanation, quotes, measurement, basis, caveat = EVIDENCE_BOUNDARY) => observations.push({ id, kind, title, explanation, quotes: quotes.filter(Boolean), measurement, basis, caveat });
  for (const hit of findPhrasesIn(phraseTable, text)) {
    add(`phrase:${hit.row.phrase}`, 'phrase', 'A phrase more common in the AI comparison texts',
      `“${hit.matched}” appears ${hit.occurrences === 1 ? 'once' : `${hit.occurrences} times`} here. It appeared more often in AI-written than human-written documents in the held-out comparison.`,
      [locate(text, hit.start, hit.end, offset)], { occurrences: hit.occurrences, aiDocuments: hit.row.ai_documents, humanDocuments: hit.row.human_documents, aiTotal: phraseTable.corpus.held_out_half.ai, humanTotal: phraseTable.corpus.held_out_half.human, ratioLow: hit.row.held_out_ratio_low, ratioHigh: hit.row.held_out_ratio_high },
      `${hit.row.ai_documents} of ${phraseTable.corpus.held_out_half.ai} AI documents and ${hit.row.human_documents} of ${phraseTable.corpus.held_out_half.human} human documents in the held-out half of ${phraseTable.corpus.source}.`,
      `The estimated frequency ratio spans ${hit.row.held_out_ratio_low}–${hit.row.held_out_ratio_high}; that wide range limits precision. A phrase match is not an authorship finding or proof that this phrase caused the model score.`);
  }
  for (const hit of tells.phrases) {
    if (observations.some(item => item.quotes.some(quote => quote.start_utf16 === hit.start + offset && quote.end_utf16 === hit.end + offset))) continue;
    add(`curated:${hit.tell.phrase}`, 'phrase', 'A measured phrase pattern', `“${text.slice(hit.start, hit.end)}” appeared more often in AI writing in both of the independent comparisons used to select this phrase.`,
      [locate(text, hit.start, hit.end, offset)], { occurrences: hit.occurrences, aiDocuments: hit.tell.aiDocs, humanDocuments: hit.tell.humanDocs },
      `${hit.tell.aiDocs} of ${TELL_CORPUS.aiDocuments} AI documents and ${hit.tell.humanDocs} of ${TELL_CORPUS.humanDocuments} human documents; ${TELL_CORPUS.source}.`,
      `${hit.tell.smallSample ? 'Rare phrase: small counts make the estimate uncertain. ' : ''}${EVIDENCE_BOUNDARY}`);
  }
  const supplied = Array.isArray(options.selectedRuleFindings) ? options.selectedRuleFindings : [];
  const validFindings = supplied.filter(f => locate(text, f?.span?.start_utf16, f?.span?.end_utf16, 0));
  for (const hit of findRuleTellsIn(qualifyingTellsIn(liveness), validFindings, text)) {
    add(`rule:${hit.tell.id}`, 'rule', 'A measured writing-rule match', hit.description || 'This selected writing pattern occurs in the quoted passage.',
      [locate(text, hit.start, hit.end, offset)], { occurrences: hit.occurrences, aiDocuments: hit.tell.aiFired, humanDocuments: hit.tell.humanFired },
      `${hit.tell.aiFired} of ${liveness.denominators.ai_documents} AI documents and ${hit.tell.humanFired} of ${liveness.denominators.human_documents} human documents in the rule-liveness comparison.`);
  }
  if (tells.underRepetition?.fires) {
    const pair = measurements.leastConnected;
    add('structure:word-reuse', 'structure', 'Neighbouring sentences rarely re-use words', 'Across this draft, neighbouring sentences share unusually few content words. The quoted neighbours illustrate that pattern; they are not individually classified as AI.',
      pair ? [locate(text, pair.first.start_utf16, pair.first.end_utf16, offset), locate(text, pair.second.start_utf16, pair.second.end_utf16, offset)] : [], tells.underRepetition,
      'Reference medians: 2.1% in AI writing and 6.3% in human writing over 670 register-and-length-matched pairs of long-form documents. The low-overlap gate captures 13.6% of 922 AI and 1.0% of 4,636 human documents.');
  }
  const structural = [
    ['rhythm', 'Similar sentence counts across paragraphs', `The ${tells.rhythm?.paragraphs} paragraphs have unusually similar sentence counts.`, RHYTHM_MEASURED],
    ['paragraphSize', 'Paragraphs are almost the same length', `The ${tells.paragraphSize?.paragraphs} paragraphs carry nearly the same number of words.`, WPP_MEASURED],
    ['sectionLengths', 'Body sections have similar lengths', 'Nearly all body sections fall close to the middle section length.', SEC15_MEASURED],
    ['scaffold', 'Repeated section structure', 'Several body sections repeat the same arrangement of paragraphs and lists, alongside unusually even paragraph rhythm.', SCAFFOLD_MEASURED],
  ];
  for (const [key, title, explanation, reference] of structural) {
    if (!tells[key]?.fires) continue;
    const basis = reference.basis ? `${reference.aiRate} of AI documents and ${reference.humanRate} of structured human documents; ${reference.basis}.` : `${reference.aiRate} of AI documents (${reference.aiCounts}) and ${reference.humanRate} of structured human documents (${reference.humanCounts}).`;
    add(`structure:${key}`, 'structure', title, explanation, [], tells[key], basis);
  }
  if (tells.cadence?.fires) {
    const quote = locateText(text, tells.cadence.paragraph, offset);
    add('structure:cadence', 'structure', 'A compressed, ordered paragraph rhythm', `This paragraph moves through ${rolesInWords(tells.cadence.roles)}. That compact structure appeared more often in the measured AI writing, but also occurs in human writing.`, quote ? [quote] : [], tells.cadence,
      `${CADENCE_MEASURED.aiRate} of AI documents (${CADENCE_MEASURED.aiCounts}) and ${CADENCE_MEASURED.humanRate} of human documents (${CADENCE_MEASURED.humanCounts}); ${CADENCE_MEASURED.basis}.`);
  }
  return { version: EVIDENCE_VERSION, boundary: EVIDENCE_BOUNDARY, observations, measurements,
    coverage: { textAvailable: Boolean(text.trim()), selectedRulesProvided: Array.isArray(options.selectedRuleFindings), noMatchedObservations: observations.length === 0,
      explanation: observations.length ? 'The examples below are measured observations about this text. They are separate from the trained model’s reading.' : text.trim() ? 'These checks found no specific wording or structure to quote. That does not confirm human or AI authorship, and it does not override the model’s reading.' : 'The source text is not available, so no quoted examples or measurements can be verified.' } };
}
