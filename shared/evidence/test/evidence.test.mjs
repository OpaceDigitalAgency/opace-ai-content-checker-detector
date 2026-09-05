import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildDraftEvidence, measureEvidenceText } from '../index.mjs';
import { exactDraft, builtinAi } from './fixtures.mjs';

test('exact user draft matches audited bytes and Python reference calculations', () => {
  assert.equal(createHash('sha256').update(exactDraft).digest('hex'), '677a2ed7469f60268007fdc3cb8e7d81c2d0521bb0b58877fe77f5cb179e0179');
  const evidence = buildDraftEvidence(exactDraft);
  assert.ok(Math.abs(evidence.measurements.overlapPercent - 3.306100217864924) < 1e-12);
  assert.ok(Math.abs(evidence.measurements.vocabularyVariety - 0.7989473684210525) < 1e-12);
  assert.ok(Math.abs(evidence.measurements.sentenceLengthCv - 0.5739497212722352) < 1e-12);
  const phrase = evidence.observations.find(item => item.id === 'phrase:is not simply');
  assert.equal(phrase.quotes[0].text, 'is not simply');
  assert.equal(phrase.measurement.aiDocuments, 21);
  assert.equal(phrase.measurement.humanDocuments, 2);
  assert.equal(phrase.measurement.aiTotal, 455);
  assert.equal(phrase.measurement.humanTotal, 2321);
  assert.match(phrase.caveat, /not.*proof.*caused/);
  assert.equal(evidence.observations.some(item => item.id === 'structure:word-reuse'), false, 'do not lower the measured gate to explain this one sample');
});

test('built-in website example retains its measured document tells', () => {
  const evidence = buildDraftEvidence(builtinAi);
  assert.ok(evidence.observations.some(item => item.id === 'structure:word-reuse'));
  assert.ok(evidence.observations.some(item => item.id === 'structure:rhythm'));
  assert.match(evidence.observations.find(item => item.id === 'structure:rhythm').basis, /3,838 AI and 3,186 structured human/);
});

test('every quote is an exact UTF-16 source slice, including emoji prefixes and repeats', () => {
  for (const draft of [exactDraft, builtinAi, '🧪 is not simply a claim. It is not simply repeated.', 'İ 🧪 robust wording.']) {
    const evidence = buildDraftEvidence(draft, { offsetUtf16: 37 });
    for (const observation of evidence.observations) for (const quote of observation.quotes) {
      assert.equal(draft.slice(quote.start_utf16 - 37, quote.end_utf16 - 37), quote.text);
    }
  }
  const curated = buildDraftEvidence('İ 🧪 robust wording.').observations.find(item => item.id === 'curated:robust');
  assert.equal(curated.quotes[0].text, 'robust');
});

test('empty, missing and short inputs never fabricate measurements or authorship', () => {
  for (const input of [undefined, null, '', {}, 12]) {
    const evidence = buildDraftEvidence(input);
    assert.equal(evidence.coverage.textAvailable, false);
    assert.deepEqual(evidence.observations, []);
    assert.equal(evidence.measurements.adjacentOverlap, null);
  }
  const short = buildDraftEvidence('I found my keys behind the chair.');
  assert.equal(short.measurements.vocabularyVariety, null);
  assert.deepEqual(short.observations, []);
  assert.match(short.coverage.explanation, /does not confirm human or AI authorship/);
});

test('human-writing observations are not selected by the requested model label', () => {
  const text = 'My mother left her bicycle beside the gate. The bicycle was blue. I still remember that blue bicycle, because I fell off it on Tuesday. We laughed afterwards.';
  const a = buildDraftEvidence(text, { level: 'signal-likely-human' });
  const b = buildDraftEvidence(text, { level: 'signal-likely-ai' });
  assert.deepEqual(a, b);
  assert.equal(a.coverage.noMatchedObservations, true);
});

test('only independently qualified selected-rule matches with valid spans are quoted', () => {
  const text = 'The problem is not just price, it is the quality of the result.';
  const findings = [{ rule_id: 'signals.not_just_contrast', message: 'Contrast framing', span: { start_utf16: 0, end_utf16: text.length }, evidence: { matched: text } }];
  const frozen = structuredClone(findings);
  const data = buildDraftEvidence(text, { selectedRuleFindings: findings });
  assert.deepEqual(findings, frozen);
  assert.equal(data.coverage.selectedRulesProvided, true);
  assert.equal(data.observations.find(item => item.kind === 'rule').quotes[0].text, text);
  const invalid = buildDraftEvidence(text, { selectedRuleFindings: [{ ...findings[0], span: {start_utf16: -4, end_utf16: 999} }] });
  assert.equal(invalid.observations.some(item => item.kind === 'rule'), false);
});

test('reference tokenisation preserves hard line boundaries and Jaccard denominator', () => {
  const measurement = measureEvidenceText('Red cats sleep\nRed dogs sleep');
  assert.equal(measurement.sentences.length, 2);
  assert.equal(measurement.adjacentOverlap, 0.5);
  assert.deepEqual(measurement.leastConnected.sharedWords, ['red', 'sleep']);
});
