import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCheckerPdf, buildProvenanceExport, buildProvenancePdf, provenanceReportText } from '../checker-pdf.mjs';
import { buildCheckerReportHtml } from '../checker-report-html.mjs';
import { buildReportModel, countPhrase, pluralise } from '../report-model.mjs';
import { logoJpegBytes } from '../logo.mjs';
import { checkerResultFixture, provenanceResult, singularFixture, zeroCountFixture } from './fixtures.mjs';
import { flatText } from './pdf-tools.mjs';

const PDF = Object.freeze({ logoJpegBytes: logoJpegBytes(), surfaceName: 'Chrome extension', generatedAt: '2026-09-02T10:00:00Z' });
const pdfText = (result, extra = {}) => flatText(buildCheckerPdf(result, { ...PDF, ...extra }));
const html = (result, extra = {}) => buildCheckerReportHtml(result, { ...PDF, ...extra })
  .replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/gu, 'LOGO');

/**
 * A count of exactly one followed by a plural noun, or a count next to the wrong verb. This is
 * the shape of the defect Lane B reported: "1 protected item were identified".
 */
const AGREEMENT_FAULTS = [
  [/\b1 [a-z]+s\b/u, 'a count of one followed by a plural noun'],
  [/\b1 [a-z]+ were\b/u, 'a count of one followed by "were"'],
  [/\b(?:0|[2-9]|\d\d+) [a-z]+ was\b/u, 'a count other than one followed by "was"'],
  [/\bitem\(s\)|\(s\)\b/u, 'an "(s)" escape hatch instead of a real plural'],
];

function assertAgrees(text, label) {
  for (const [pattern, description] of AGREEMENT_FAULTS) {
    const match = pattern.exec(text);
    assert.equal(match, null, `${label}: ${description} — "${match?.[0]}"`);
  }
}

test('pluralise and countPhrase take the singular only for exactly one', () => {
  assert.equal(pluralise(1, 'word'), 'word');
  assert.equal(pluralise(0, 'word'), 'words');
  assert.equal(pluralise(2, 'word'), 'words');
  assert.equal(pluralise(1.5, 'word'), 'words');
  assert.equal(pluralise(1, 'was', 'were'), 'was');
  assert.equal(pluralise(3, 'was', 'were'), 'were');
  assert.equal(pluralise(1, 'Category', 'Categories'), 'Category');

  assert.equal(countPhrase(1, 'word'), '1 word');
  assert.equal(countPhrase(0, 'word'), '0 words');
  assert.equal(countPhrase(1200, 'word'), '1,200 words');
  assert.equal(countPhrase(1, 'protected item'), '1 protected item');
  assert.equal(countPhrase(null, 'word'), 'Not recorded');
  assert.equal(countPhrase(Number.NaN, 'word', 'words', 'None'), 'None');
});

test('the model builds one agreeing sentence per count, whatever the count is', () => {
  const one = buildReportModel(singularFixture());
  assert.equal(one.protectedFacts.sentence, '1 protected item was identified and left untouched.');
  assert.equal(one.protectedFacts.categoriesSentence, 'Category: Organisation.');
  assert.equal(one.draft.wordsPhrase, '1 word');
  assert.equal(one.draft.charactersPhrase, '1 character');
  assert.equal(one.draft.sectionsPhrase, '1 section');
  assert.equal(one.sections[0].wordsPhrase, '1 word');
  assert.equal(one.methodsPhrase, '1 named check');

  const many = buildReportModel(checkerResultFixture());
  assert.equal(many.protectedFacts.sentence, '3 protected items were identified and left untouched.');
  assert.equal(many.protectedFacts.categoriesSentence, 'Categories: Organisation, Date, Link.');
  assert.equal(many.draft.wordsPhrase, '120 words');
  assert.equal(many.draft.charactersPhrase, '120 characters');
  assert.equal(many.draft.sectionsPhrase, '2 sections');
  assert.equal(many.sections[0].wordsPhrase, '58 words');

  const none = buildReportModel(zeroCountFixture());
  assert.equal(none.protectedFacts.sentence, 'No protected items were identified in this draft.');
  assert.equal(none.protectedFacts.categoriesSentence, 'No categories were recorded.');
});

test('the PDF prints the singular forms and never disagrees with a count', () => {
  const text = pdfText(singularFixture());
  assert.ok(text.includes('1 protected item was identified and left untouched.'), 'the defect Lane B reported');
  assert.ok(text.includes('Category: Organisation.'));
  assert.ok(text.includes('1 word'));
  assert.ok(text.includes('1 named check ran. It is recorded with its outcome'));
  assert.ok(text.includes('Section 1 of 1'));
  assert.doesNotMatch(text, /1 protected items?\s+were/u);
  assertAgrees(text, 'singular PDF');
});

test('the HTML report prints the singular forms and never disagrees with a count', () => {
  const markup = html(singularFixture());
  assert.ok(markup.includes('1 protected item was identified and left untouched.'));
  assert.ok(markup.includes('Category: Organisation.'));
  assert.ok(markup.includes('<dd>1 word</dd>'));
  assert.ok(markup.includes('<dd>1 section</dd>'));
  assert.ok(markup.includes('1 named check in this run'));
  assert.ok(markup.includes('Inside section 1 of 1'));
  assertAgrees(markup, 'singular HTML');
});

test('the named-check intro agrees with how many checks ran', () => {
  const many = checkerResultFixture();
  many.methods = [many.methods[0], { ...many.methods[0], id: 'unicode.invisible' }];
  assert.ok(pdfText(many).includes('2 named checks ran. Each is recorded with its outcome'));
  assert.ok(html(many).includes('2 named checks in this run'));
  assertAgrees(pdfText(many), 'two-check PDF');
});

test('plural and zero counts still agree in both renderers', () => {
  for (const [label, result] of [['plural', checkerResultFixture()], ['zero', zeroCountFixture()]]) {
    const text = pdfText(result);
    assertAgrees(text, `${label} PDF`);
    const markup = html(result);
    assertAgrees(markup, `${label} HTML`);
  }
  assert.ok(pdfText(checkerResultFixture()).includes('3 protected items were identified'));
  assert.ok(pdfText(zeroCountFixture()).includes('No protected items were identified in this draft.'));
  assert.ok(html(zeroCountFixture()).includes('No categories were recorded.'));
});

test('the full-draft appendix counts agree', () => {
  const text = pdfText(singularFixture(), { fullText: 'Word.' });
  assert.ok(text.includes('1 word | 1 character'), 'the appendix meta line');
  assertAgrees(text, 'appendix PDF');
  const markup = html(singularFixture(), { fullText: 'Word.' });
  assert.ok(markup.includes('1 word, 1 character.'));
  assertAgrees(markup, 'appendix HTML');
});

test('the provenance report agrees with its byte and issue counts', () => {
  const oneByte = buildProvenanceExport({ size: 1 }, provenanceResult('invalid'), '2026-09-02T12:00:00.000Z');
  assert.ok(provenanceReportText(oneByte).includes('File size: 1 byte'));
  const text = flatText(buildProvenancePdf(oneByte, { logoJpegBytes: logoJpegBytes() }));
  assert.ok(text.includes('File size: 1 byte'));
  assert.ok(text.includes('1 validation issue was recorded.'));
  assertAgrees(text, 'one-byte provenance PDF');

  const many = buildProvenanceExport(
    { size: 2048 },
    provenanceResult('invalid', { issues: [{ code: 'a.b', explanation: 'One.' }, { code: 'c.d', explanation: 'Two.' }] }),
    '2026-09-02T12:00:00.000Z'
  );
  assert.ok(provenanceReportText(many).includes('File size: 2048 bytes'));
  const manyText = flatText(buildProvenancePdf(many, { logoJpegBytes: logoJpegBytes() }));
  assert.ok(manyText.includes('2 validation issues were recorded.'));
  assertAgrees(manyText, 'multi-issue provenance PDF');
});
