import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCheckerResult, buildCheckerChecks, measurePassageOverlap, measurePassageSignals, explainSectionSignals } from '../checker-result-presentation.mjs';
import { sourceMatchesSections } from '../../evidence/index.mjs';
import { exactDraft } from '../../evidence/test/fixtures.mjs';
import { canonicalFixture } from './fixtures.mjs';

function sampleResult(text = exactDraft) {
  const result = canonicalFixture();
  result.source.character_count = text.length;
  result.source.word_count = text.trim().split(/\s+/).length;
  result.source.section_count = 1;
  result.sections = [{ ...result.sections[0], index: 0, start_utf16: 0, end_utf16: text.length, passage: text }];
  result.axes.ai_pattern.strongest_section_index = 0;
  return result;
}

test('full-draft source is validated against every exact recorded section', () => {
  const result = sampleResult();
  assert.equal(sourceMatchesSections(exactDraft, result.sections, exactDraft.length), true);
  assert.equal(sourceMatchesSections('X' + exactDraft.slice(1), result.sections, exactDraft.length), false);
  assert.equal(sourceMatchesSections(exactDraft, [], exactDraft.length), false);
  const html = renderCheckerResult(result, { surface: 'WordPress Lab', sourceText: exactDraft });
  assert.match(html, /Across your draft/);
  assert.match(html, /data-oaci-observation="phrase:is not simply"/);
  assert.ok(html.indexOf('data-oaci-draft-evidence=') < html.indexOf('class="oaci-panel oaci-strip"'));
  assert.match(renderCheckerResult(result, { surface: 'WordPress Lab', sourceText: 'X' + exactDraft.slice(1) }), /In section 1/);
});

test('all model fields survive rendering unchanged and report only precise secondary outcomes', () => {
  const result = sampleResult();
  result.axes.editorial.reading = 'none';
  result.axes.editorial.findings = [];
  const before = structuredClone(result);
  const html = renderCheckerResult(result, { surface: 'Chrome extension', sourceText: exactDraft });
  assert.deepEqual(result, before);
  assert.match(html, /No hidden or lookalike characters found/);
  assert.match(html, /No selected writing rules matched/);
  assert.doesNotMatch(html, /Human writing polished with an AI tool is deliberately not flagged|a full bar means a confident reading|formatting symbols carry no false weight/);
});

test('content-free or measurement-disabled results never expose fresh source evidence', () => {
  const result = sampleResult();
  result.contains_content = false;
  assert.doesNotMatch(renderCheckerResult(result, { surface: 'Astro toolbar', sourceText: exactDraft }), /data-oaci-draft-evidence/);
  result.contains_content = true;
  assert.doesNotMatch(renderCheckerResult(result, { surface: 'Astro toolbar', sourceText: exactDraft, measurePassages: false }), /data-oaci-draft-evidence/);
});

test('phrase snippets and rule descriptions escape HTML and preserve source locators', () => {
  const text = '<img src=x onerror=alert(1)> The result is not just price; it is the quality.';
  const result = sampleResult(text);
  const html = renderCheckerResult(result, { surface: 'Chrome extension', sourceText: text,
    selectedRuleFindings: [{ rule_id: 'signals.not_just_contrast', message: '<script>alert(1)</script>', span: {start_utf16: 0, end_utf16: text.length} }] });
  assert.doesNotMatch(html, /<script>alert|<img src=x/);
  assert.match(html, /&lt;script&gt;alert/);
  assert.match(html, /data-oaci-quote-start="0"/);
});

test('passage meters and evidence wrapper share reference calculations', () => {
  assert.ok(Math.abs(measurePassageOverlap(exactDraft).value - 3.306100217864924) < 1e-12);
  assert.equal(measurePassageSignals(exactDraft).find(m => m.id === 'vocabulary_variety').value, 0.799);
  const split = explainSectionSignals([
    { id: 'a', label: 'First measurement', value: 1, aiMedian: 1, humanMedian: 0 },
    { id: 'b', label: 'Second measurement', value: 0, aiMedian: 1, humanMedian: 0 },
  ], 'signal-likely-ai', 'Likely AI');
  assert.match(split, /AI reference median/);
  assert.match(split, /human reference median/);
});

test('actual writing matches replace the stale none reading in axes and named checks', () => {
  const result = sampleResult();
  result.axes.editorial = { method_status: 'pass', reading: 'none', reason: 'No suggestions', findings: [] };
  result.methods.push({ id: 'style.patterns', category: 'pattern', status: 'pass', version: 'test', privacy_route: 'browser',
    evidence: [{ type: 'editorial_signals', findingCount: 3, classification: 'human_like', confidence: 'high' }] });
  const before = structuredClone(result);
  const html = renderCheckerResult(result, { surface: 'Chrome extension', sourceText: exactDraft });
  assert.match(html, /3 writing pattern matches/);
  assert.doesNotMatch(html, /No selected writing rules matched|human_like/);
  const check = buildCheckerChecks(result).flatMap(group => group.checks).find(item => item.id === 'style.patterns');
  assert.equal(check.statusLabel, 'Review writing patterns');
  assert.match(check.means, /3 writing pattern matches/);
  assert.deepEqual(result, before);
});
