import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CHECKER_LEVEL_MEANINGS, renderCheckerResult } from '../../presentation/checker-result-presentation.mjs';
import { buildReportModel } from '../report-model.mjs';
import { checkerResultFixture } from './fixtures.mjs';
import { exactDraft } from '../../evidence/test/fixtures.mjs';

test('all five levels carry identical non-absolute meanings in the core, UI and report', () => {
  const core = readFileSync(new URL('../../../packages/core/src/report/checker-result.ts', import.meta.url), 'utf8');
  for (const [level, meaning] of Object.entries(CHECKER_LEVEL_MEANINGS)) {
    assert.ok(core.includes(JSON.stringify(meaning)), `${level} core meaning drifted`);
    const result = checkerResultFixture();
    result.axes.ai_pattern.level = level;
    result.axes.ai_pattern.reason = 'Nothing here matches AI writing patterns.';
    assert.equal(buildReportModel(result).meaning, meaning);
    assert.equal(buildReportModel(result).axes[0].detail, meaning);
    const html = renderCheckerResult(result, { surface: 'Stored result parity test' });
    assert.doesNotMatch(html, /Nothing here matches AI writing patterns/);
    assert.doesNotMatch(meaning, /Nothing here matches|Some passages read slightly|rarely see in human|Much of this draft|to be sure/);
  }
});

test('human and unclear readings retain quoted observations without an all-clear or invented AI passages', () => {
  for (const level of ['signal-likely-human', 'signal-unclear']) {
    const result = checkerResultFixture();
    result.source.character_count = exactDraft.length;
    result.source.section_count = 1;
    result.sections = [{ ...result.sections[0], index: 0, start_utf16: 0, end_utf16: exactDraft.length, passage: exactDraft, level }];
    result.axes.ai_pattern.level = level;
    result.axes.ai_pattern.strongest_section_index = 0;
    const before = structuredClone(result);
    const html = renderCheckerResult(result, { surface: 'Release parity test', sourceText: exactDraft });
    assert.match(html, /data-oaci-observation="phrase:is not simply"/);
    assert.match(html, /separate observations|without settling who wrote it/);
    assert.doesNotMatch(html, /Nothing here matches|Some passages read slightly/);
    assert.deepEqual(result, before);
  }
});
