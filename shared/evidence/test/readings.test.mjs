import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { formatEditorialReading, formatCharacterReading, sanitiseEditorialSignals, CHARACTER_NEGATIVE } from '../readings.mjs';

const fixture = () => JSON.parse(readFileSync(new URL('../../../fixtures/contracts/valid/checker-result.json', import.meta.url), 'utf8')).data;
const resultWithRules = (n = 3) => {
  const result = fixture();
  result.axes.editorial = { method_status: 'pass', reading: 'none', reason: 'Nothing to suggest', findings: [] };
  result.methods.push({ id: 'style.patterns', status: n ? 'attention' : 'pass', evidence: [
    ...Array.from({ length: n }, (_, i) => ({ type: 'pattern_finding', rule_id: `signals.rule_${i}` })),
    { type: 'editorial_signals', findingCount: n, categoriesHit: ['contrast'], classification: 'human_like', probabilities: { human_like: 1 }, confidence: 'high' },
  ] });
  return result;
};

test('three actual selected matches override the stale none style band without changing result', () => {
  const result = resultWithRules();
  const before = JSON.stringify(result);
  const view = formatEditorialReading(result);
  assert.equal(view.value, '3 writing pattern matches');
  assert.equal(view.count, 3);
  assert.equal(view.status, 'attention');
  assert.match(view.detail, /not a probability or finding of AI authorship/);
  assert.equal(JSON.stringify(result), before);
});

test('zero and singular counts are precise', () => {
  assert.equal(formatEditorialReading(resultWithRules(0)).value, 'No selected writing rules matched');
  assert.equal(formatEditorialReading(resultWithRules(1)).value, '1 writing pattern match');
});

test('recorded count fallback supports both canonical and legacy property names', () => {
  for (const summary of [{ finding_count: 3 }, { findingCount: 3 }]) {
    const result = resultWithRules(0);
    result.methods.at(-1).evidence = [{ type: 'editorial_signals', ...summary }];
    assert.equal(formatEditorialReading(result).count, 3);
  }
  assert.equal(formatEditorialReading(fixture()).count, 1);
});

test('missing, error and unrun writing methods never become an all-clear', () => {
  assert.equal(formatEditorialReading(null).value, 'Not assessed');
  for (const status of ['not_run', 'unsupported', 'not_configured', 'inconclusive', 'error']) {
    const result = resultWithRules(3);
    result.methods.at(-1).status = status;
    assert.equal(formatEditorialReading(result).value, status === 'error' ? 'Error' : 'Not assessed');
  }
  const missing = resultWithRules(0);
  delete missing.axes.editorial;
  assert.equal(formatEditorialReading(missing).value, 'Not assessed');
  const unknown = resultWithRules(0);
  unknown.methods.at(-1).evidence = [];
  delete unknown.axes.editorial.findings;
  assert.equal(formatEditorialReading(unknown).value, 'Not assessed');
});

test('character negative only describes the checks that ran, never the stale watermark reason', () => {
  const result = fixture();
  result.axes.text_integrity.reason = 'No hidden characters or watermark marks were found';
  const view = formatCharacterReading(result);
  assert.ok(view.detail.startsWith(CHARACTER_NEGATIVE));
  assert.doesNotMatch(view.detail, /watermark marks were found/);
  assert.match(view.detail, /does not.*clear a provider watermark/);
  result.axes.text_integrity.findings = [{ type: 'hidden_character' }];
  assert.equal(formatCharacterReading(result).value, 'Review character findings');
});

test('missing and failed character checks do not become clean', () => {
  assert.equal(formatCharacterReading({}).value, 'Not assessed');
  for (const status of ['not_run', 'inconclusive', 'error']) {
    const result = fixture();
    result.axes.text_integrity.method_status = status;
    assert.equal(formatCharacterReading(result).value, status === 'error' ? 'Error' : 'Not assessed');
  }
  const result = fixture();
  delete result.axes.text_integrity.findings;
  assert.equal(formatCharacterReading(result).value, 'Not assessed');
});

test('a completed inconclusive character check keeps its outcome and reason, not not-assessed', () => {
  for (const status of ['pass', 'attention', 'inconclusive']) {
    const result = fixture();
    result.axes.text_integrity = { method_status: status, reading: 'inconclusive', findings: [], reason: 'The available character evidence does not establish whether a transformation occurred.' };
    const view = formatCharacterReading(result);
    assert.equal(view.value, 'No clear answer');
    assert.equal(view.status, 'inconclusive');
    assert.equal(view.statusLabel, 'Inconclusive');
    assert.equal(view.detail, result.axes.text_integrity.reason);
    result.axes.text_integrity.reason = '';
    assert.match(formatCharacterReading(result).detail, /ran but could not reach a clear conclusion/);
    result.axes.text_integrity.method_status = 'not_run';
    assert.equal(formatCharacterReading(result).value, 'Not assessed');
    result.axes.text_integrity.method_status = 'error';
    assert.equal(formatCharacterReading(result).value, 'Error');
  }
});

test('human-facing editorial record retains counts and categories without probability or confidence fields', () => {
  const legacy = { type: 'editorial_signals', score: 5, findingCount: 3, categoriesHit: ['contrast', 'contrast', 'punctuation'], rulesRun: 116, version: 'en-signals:2026.08.6', classification: 'human_like', probabilities: { human_like: 0.88 }, confidence: 'high', description: 'Raw classification is human_like', escalation: { reason: 'Argmax' } };
  const before = structuredClone(legacy);
  const safe = sanitiseEditorialSignals(legacy);
  assert.equal(safe.finding_count, 3);
  assert.deepEqual(safe.categories_hit, ['contrast', 'punctuation']);
  assert.equal(safe.rules_run, 116);
  assert.equal(safe.version, legacy.version);
  assert.match(safe.scope, /selected writing rules/);
  assert.doesNotMatch(JSON.stringify(safe), /human_like|probabilities|confidence|Argmax/);
  assert.deepEqual(legacy, before);
  const other = { type: 'pattern_finding', rule_id: 'signals.contrast' };
  assert.equal(sanitiseEditorialSignals(other), other);
  assert.equal(sanitiseEditorialSignals(null), null);
});

test('invalid summary counts remain unknown, not manufactured zero', () => {
  assert.equal(sanitiseEditorialSignals({ type: 'editorial_signals', finding_count: -1 }).finding_count, null);
  assert.equal(sanitiseEditorialSignals({ type: 'editorial_signals', findingCount: '3' }).finding_count, null);
});
