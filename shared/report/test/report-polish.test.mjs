import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReportModel } from '../report-model.mjs';
import { buildCheckerPdf } from '../checker-pdf.mjs';
import { buildCheckerChecks } from '../../presentation/checker-result-presentation.mjs';
import { checkerResultFixture, notAssessedFixture } from './fixtures.mjs';
import { flatText } from './pdf-tools.mjs';

test('an assessed model is labelled complete, not cleared of AI patterns', () => {
  const result = checkerResultFixture();
  result.axes.ai_pattern.method_status = 'pass';
  const method = result.methods.find(m => m.id.startsWith('detector.'));
  method.status = 'pass';
  assert.equal(buildReportModel(result).axes[0].statusLabel, 'Reading complete');
  const check = buildCheckerChecks(result).flatMap(g => g.checks).find(c => c.id === method.id);
  assert.equal(check.statusLabel, 'Reading complete');
  assert.match(check.means, /score/);
  assert.doesNotMatch(check.means, /found nothing/);
});

test('PDF removes stale no-model caveats but retains every other unique limit', () => {
  const result = checkerResultFixture();
  const stale = 'No trained model ran on this text, so no AI probability is available.';
  const real = 'A unique runtime caveat must remain in the complete report.';
  for (const axis of Object.values(result.axes)) axis.limitations.push(stale, real);
  result.limitations.push(stale, real);
  const text = flatText(buildCheckerPdf(result));
  assert.doesNotMatch(text, /No trained model ran/);
  assert.ok(text.includes(real));
  assert.equal(buildReportModel(result).limitations.filter(v => v === real).length, 1);
  const unassessed = notAssessedFixture();
  unassessed.limitations.push(stale);
  assert.ok(flatText(buildCheckerPdf(unassessed)).includes(stale));
});

test('report interpretation follows the actual AI level and never guarantees a human-edit outcome', () => {
  const result = checkerResultFixture();
  result.axes.ai_pattern.level = 'signal-likely-human';
  result.axes.text_integrity.reading = 'clean';
  result.axes.editorial.reading = 'none';
  result.axes.editorial.findings = [];
  const model = buildReportModel(result);
  assert.match(model.meansPanel.means.join(' '), /closer match to human writing/);
  assert.doesNotMatch(model.meansPanel.means.join(' '), /Parts of the writing match patterns that are common in AI text/);
  assert.doesNotMatch(JSON.stringify(model), /deliberately not flagged/);
  assert.match(model.correctUse.join(' '), /not.*probability.*authorship/i);
  assert.equal(model.axes[1].value, 'No hidden or lookalike characters found');
  assert.equal(model.axes[2].value, 'No selected writing rules matched');
});
