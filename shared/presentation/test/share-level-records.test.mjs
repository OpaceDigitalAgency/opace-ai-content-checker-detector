import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareSummary, shareSubject, shareSummaryText, shareDestinationLinks, buildCheckerChecks } from '../checker-result-presentation.mjs';
import { canonicalFixture } from './fixtures.mjs';

const records = {
  'signal-likely-human': { name: 'Likely human', support: 'x' }, 'signal-unclear': { name: 'Unclear', support: 'x' },
  'signal-potentially-ai': { name: 'Potentially AI', support: 'x' }, 'signal-likely-ai': { name: 'Likely AI', support: 'x' },
  'signal-strongly-ai': { name: 'Strongly AI', support: 'x' },
};

test('share helpers accept level records as well as plain names', () => {
  const summary = buildShareSummary(canonicalFixture());
  for (const text of [shareSubject(summary, records), shareSummaryText(summary, { levels: records }), decodeURIComponent(JSON.stringify(shareDestinationLinks(summary, { levels: records })).replace(/\+/g, ' '))]) {
    assert.doesNotMatch(text, /\[object Object\]/u);
    assert.match(text, /Strongly AI|Likely AI/u);
  }
});

test('the two Unicode checks carry distinct friendly names', () => {
  const result = canonicalFixture();
  const base = result.methods[0];
  result.methods = [base, { ...base, id: 'unicode.invisible', category: 'text_integrity', provider_or_method: 'Opace deterministic Unicode inspection', status: 'pass' }, { ...base, id: 'unicode.homoglyph', category: 'text_integrity', provider_or_method: 'Opace deterministic Unicode inspection', status: 'pass' }];
  const names = JSON.stringify(buildCheckerChecks(result));
  assert.match(names, /Invisible and hidden characters/u);
  assert.match(names, /Lookalike \(homoglyph\) characters/u);
  assert.doesNotMatch(names, /Opace deterministic Unicode inspection"/u);
});
