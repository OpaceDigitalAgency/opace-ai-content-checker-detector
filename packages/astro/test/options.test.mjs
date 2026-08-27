import assert from 'node:assert/strict';
import test from 'node:test';
import { normaliseOptions } from '../dist/options.js';

test('defaults are offline, report-only and bounded', () => {
  assert.deepEqual(normaliseOptions(), { toolbar: true, buildCheck: 'report', failOn: ['protected_fact_changed'], localService: false, reportDirectory: 'content-integrity-report', include: ['**/*.html'], exclude: ['**/404.html', '**/500.html', '**/feed*.html', '**/search*.html', '**/sitemap*.html'], maxCharacters: 50_000 });
});

test('accepts the documented report-only configuration', () => {
  assert.deepEqual(normaliseOptions({ toolbar: true, buildCheck: 'report', failOn: ['protected_fact_changed'], localService: false }), normaliseOptions());
});

for (const [name, value] of [
  ['unknown key', { mystery: true }],
  ['wrong type', { toolbar: 'yes' }],
  ['fail-build mode', { buildCheck: 'fail' }],
  ['invalid fail rule', { failOn: ['writing_pattern'] }],
  ['enabled local service', { localService: true }],
  ['remote report path', { reportDirectory: 'https://example.test/report' }],
  ['absolute report path', { reportDirectory: '/tmp/report' }],
  ['parent report path', { reportDirectory: '../report' }],
  ['backslash report path', { reportDirectory: 'reports\\outside' }],
  ['traversing include pattern', { include: ['../source/*.html'] }],
  ['backslash exclude pattern', { exclude: ['private\\*.html'] }],
  ['secret-shaped key', { apiKey: 'nope' }],
  ['secret-shaped path', { reportDirectory: 'tokens/report' }],
  ['oversize character limit', { maxCharacters: 50_001 }],
]) test(`rejects ${name}`, () => assert.throws(() => normaliseOptions(value)));
