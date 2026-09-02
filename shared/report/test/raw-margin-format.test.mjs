import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMargin, buildReportModel } from '../report-model.mjs';
import { buildCheckerReportHtml } from '../checker-report-html.mjs';
import { checkerResultFixture } from './fixtures.mjs';

test('formatMargin prints two decimals and nothing for non-numbers', () => {
  assert.equal(formatMargin(3.5874204635620117), '3.59');
  assert.equal(formatMargin(3.5), '3.50');
  assert.equal(formatMargin(NaN), '');
  assert.equal(formatMargin(null), '');
});

test('reports never print an unrounded raw margin', () => {
  const result = structuredClone(checkerResultFixture());
  const sections = result.sections;
  sections[0].raw_margin = 3.5874204635620117;
  const html = buildCheckerReportHtml(result, { surfaceName: 'Test', generatedAt: '2026-09-02T10:00:00Z' });
  assert.match(html, /raw margin 3\.59/u);
  assert.doesNotMatch(html, /3\.5874204635620117/u);
  const model = buildReportModel(result, { surfaceName: 'Test', generatedAt: '2026-09-02T10:00:00Z' });
  assert.equal(model.sections[0].rawMarginText, '3.59');
});
