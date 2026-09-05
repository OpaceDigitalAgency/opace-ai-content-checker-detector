import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftEvidence } from '../../evidence/index.mjs';
import { buildReportModel } from '../report-model.mjs';
import { buildCheckerPdf } from '../checker-pdf.mjs';
import { buildCheckerReportHtml } from '../checker-report-html.mjs';
import { checkerResultFixture } from './fixtures.mjs';
import { flatText } from './pdf-tools.mjs';

const draft = 'The price difference is not simply explained by file size. The cheaper product can still require more review. I tested both with the same files. My notes record the errors I found and the corrections I made.';
function fixture() {
  const result = checkerResultFixture();
  result.source.character_count = draft.length;
  result.source.section_count = 1;
  result.sections = [{ ...result.sections[0], index: 0, start_utf16: 0, end_utf16: draft.length, passage: draft }];
  result.axes.ai_pattern.strongest_section_index = 0;
  return result;
}

test('HTML and PDF use the canonical measurements and exact quotes, without moving the model score', () => {
  const result = fixture();
  const before = structuredClone(result);
  const expected = buildDraftEvidence(draft, { selectedRuleFindings: [] });
  const options = { sourceText: draft, selectedRuleFindings: [] };
  const model = buildReportModel(result, options);
  assert.deepEqual(model.draftEvidence, expected);
  assert.equal(model.sections[0].measuredEvidence.measurements.overlapPercent, expected.measurements.overlapPercent);
  const html = buildCheckerReportHtml(result, options);
  const pdf = flatText(buildCheckerPdf(result, options));
  for (const output of [html, pdf]) {
    assert.match(output, /is not simply/);
    assert.match(output, /Writing evidence from your draft/);
    assert.match(output, /21.*455/);
    assert.match(output, /not.*proof/);
  }
  assert.deepEqual(result, before);
});

test('same-length changed source cannot supply quotes for an earlier result', () => {
  assert.throws(() => buildReportModel(fixture(), { sourceText: draft.replace('price', 'value') }), /report_source_text_mismatch/);
});

test('without the full draft, reports keep section evidence separate from whole-draft claims', () => {
  const model = buildReportModel(fixture());
  assert.equal(model.draftEvidence, null);
  assert.ok(model.sections[0].measuredEvidence.observations.length);
});

test('content-free and unavailable results cannot become full reports through supplied or embedded text', () => {
  for (const render of [buildReportModel, buildCheckerReportHtml, buildCheckerPdf]) {
    for (const permission of ['unavailable', 'content-free-result', 'content-free-report']) {
      const result = fixture();
      if (permission === 'unavailable') result.exports.report.available = false;
      if (permission === 'content-free-result') result.contains_content = false;
      if (permission === 'content-free-report') result.exports.report.contains_content = false;
      for (const options of [{}, { sourceText: draft }, { fullText: draft }, { sourceText: draft, fullText: draft }]) {
        assert.throws(() => render(result, options), /report_(export_unavailable|content_not_permitted)/);
      }
    }
  }
});
