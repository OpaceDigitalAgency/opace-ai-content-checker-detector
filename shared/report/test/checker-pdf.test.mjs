import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCheckerPdf, checkerPdfFilename } from '../checker-pdf.mjs';
import { logoJpegBytes } from '../logo.mjs';
import { checkerResultFixture, longFixture, notAssessedFixture } from './fixtures.mjs';
import { contentStreams, documentPages, documentText, flatText, mediaBoxes, pageCount, pageFill, pdftotext, verifyXref } from './pdf-tools.mjs';

const OPTIONS = Object.freeze({ logoJpegBytes: logoJpegBytes(), surfaceName: 'WordPress', generatedAt: '2026-09-02T10:00:00Z' });
const build = (result, extra = {}) => buildCheckerPdf(result, { ...OPTIONS, ...extra });

test('the checker PDF is a well-formed A4 PDF with a valid cross-reference table', () => {
  const bytes = build(checkerResultFixture());
  assert.equal(Buffer.from(bytes.subarray(0, 8)).toString('latin1'), '%PDF-1.4');

  const xref = verifyXref(bytes);
  assert.ok(xref.valid, `xref table invalid: ${xref.reason}`);

  const boxes = mediaBoxes(bytes);
  assert.equal(boxes.length, pageCount(bytes));
  for (const box of boxes) {
    assert.deepEqual(box.slice(0, 2), [0, 0]);
    assert.ok(Math.abs(box[2] - 595.28) < 0.01, `page width ${box[2]} is not A4`);
    assert.ok(Math.abs(box[3] - 841.89) < 0.01, `page height ${box[3]} is not A4`);
  }
});

test('the fixture produces a complete report of a sane length with no near-empty page', () => {
  const bytes = build(checkerResultFixture());
  const pages = documentPages(bytes);
  assert.ok(pages.length > 1, 'a complete evidence report must be longer than one page');
  assert.ok(pages.length < 10, `the two-section fixture must not sprawl; produced ${pages.length} pages`);
  assert.equal(pages.length, pageCount(bytes));

  const fills = contentStreams(bytes).map(pageFill);
  fills.slice(0, -1).forEach((fill, index) => {
    assert.ok(fill > 0.25, `page ${index + 1} uses only ${(fill * 100).toFixed(1)}% of the content area`);
  });
});

test('every item required by acceptance section 6.1 is present in the extracted text', () => {
  const bytes = build(checkerResultFixture());
  const text = flatText(bytes);
  const external = pdftotext(bytes)?.replace(/\s+/gu, ' ') ?? null;
  const required = [
    'Opace AI Content Checker & Detector',
    'AI content checker report',
    'https://opace.agency/tools/ai/content-verification-integrity/checker/',
    '02 September 2026',
    'Strongly AI',
    'Score 0.969',
    'Zero-to-one pattern similarity',
    'The strongest evidence is in section 2 of 2',
    'AI-PATTERN READING',
    'TEXT INTEGRITY AND PROVENANCE',
    'EDITORIAL SUGGESTIONS',
    '120 words',
    'The text was processed for this request and was not retained.',
    'Section scores',
    'Section evidence',
    'THE SCORED PASSAGE',
    'WHY IT READS THIS WAY',
    'Characters, writing and protected facts',
    'Facts kept safe',
    'Content Credentials and watermarks',
    'C2PA text credential',
    'Anthropic official watermark verifier',
    'Checks included in this run',
    'Opace Cycle-5 AI-pattern model',
    'tier3-cycle5-v1',
    'Reliability, limits and correct use',
    'WHAT THIS MEANS',
    'WHAT THIS DOES NOT MEAN',
    'Recorded limitations',
    'Run record and support',
    'result_cycle5_fixture_001',
    'max(m1, m2 + 0.34) >= 3.570935',
    'Page 1 of',
  ];
  for (const phrase of required) {
    assert.ok(text.includes(phrase), `missing from the PDF text: ${phrase}`);
    if (external) assert.ok(external.includes(phrase), `missing from pdftotext output: ${phrase}`);
  }
});

test('collision-prone scores keep their distinct display strings', () => {
  const text = documentText(build(checkerResultFixture()));
  assert.ok(text.includes('0.966'), 'section 1 must print its own display score');
  assert.ok(text.includes('0.969'), 'section 2 must print its own display score');
  assert.equal(text.includes('0.97 '), false, 'a two-decimal collision must never be printed');
  const likely = text.indexOf('0.966');
  const strongly = text.indexOf('0.969');
  assert.notEqual(likely, strongly);
});

test('no placeholder leaks into the rendered text', () => {
  for (const result of [checkerResultFixture(), notAssessedFixture(), longFixture()]) {
    const text = documentText(build(result));
    assert.doesNotMatch(text, /undefined/u);
    assert.doesNotMatch(text, /\bNaN\b/u);
    assert.doesNotMatch(text, /\[object Object\]/u);
  }
});

test('the not-assessed profile states the gap instead of inventing a reading', () => {
  const bytes = build(notAssessedFixture());
  const text = documentText(bytes);
  assert.ok(text.includes('Not assessed'));
  assert.ok(text.includes('No score recorded'));
  assert.ok(text.includes('No scored passages'));
  assert.ok(text.includes('No section scores'));
  assert.ok(text.includes('No trained model ran'));
  assert.ok(verifyXref(bytes).valid);
});

test('a long result paginates without clipping text below the footer', () => {
  const draft = 'The complete checked draft is preserved verbatim in the appendix. '.repeat(220);
  const bytes = build(longFixture(16), { fullText: draft });
  const pages = documentPages(bytes);
  assert.ok(pages.length > 5, `expected several pages, produced ${pages.length}`);
  contentStreams(bytes).map(pageFill).slice(0, -1).forEach((fill, index) => {
    assert.ok(fill > 0.25, `page ${index + 1} uses only ${(fill * 100).toFixed(1)}% of the content area`);
  });
  contentStreams(bytes).forEach((stream, index) => {
    for (const match of stream.matchAll(/([-\d.]+) ([-\d.]+) Td/gu)) {
      const y = Number(match[2]);
      assert.ok(y >= 20, `page ${index + 1} draws text at y=${y}, below the page`);
      assert.ok(y <= 841.89, `page ${index + 1} draws text at y=${y}, above the page`);
    }
  });
  const text = pages.join('\n');
  assert.ok(text.includes('(continued)'), 'a card longer than one page must be marked as continued');
  assert.ok(text.includes(`Page ${pages.length} of ${pages.length}`));
});

test('running header and footer appear on every page', () => {
  const pages = documentPages(build(longFixture(10)));
  pages.forEach((page, index) => {
    assert.ok(page.includes('OPACE'), `page ${index + 1} is missing the running header`);
    assert.ok(page.includes('AI CONTENT CHECKER & DETECTOR'), `page ${index + 1} is missing the product name`);
    assert.ok(page.includes(`Page ${index + 1} of ${pages.length}`), `page ${index + 1} is missing its page number`);
  });
});

test('the logo is embedded as a DCTDecode XObject with its real dimensions', () => {
  const raw = Buffer.from(build(checkerResultFixture())).toString('latin1');
  assert.match(raw, /\/Subtype \/Image \/Width 128 \/Height 128 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/DCTDecode/u);
  assert.match(raw, /\/XObject << \/Logo \d+ 0 R >>/u);
  const withoutLogo = Buffer.from(buildCheckerPdf(checkerResultFixture(), { ...OPTIONS, logoJpegBytes: undefined })).toString('latin1');
  assert.doesNotMatch(withoutLogo, /DCTDecode/u);
  assert.ok(withoutLogo.includes('OPACE'), 'the header still names the product without a logo');
});

test('output is byte-for-byte deterministic for identical input', () => {
  const first = build(checkerResultFixture());
  const second = build(checkerResultFixture());
  assert.deepEqual(Buffer.from(first), Buffer.from(second));
  const later = build(checkerResultFixture(), { generatedAt: '2027-01-05T09:30:00Z' });
  assert.notDeepEqual(Buffer.from(first), Buffer.from(later), 'a different timestamp must change the bytes');
  assert.match(Buffer.from(first).toString('latin1'), /\/CreationDate \(D:20260902100000Z00'00'\)/u);
});

test('text outside WinAnsi is labelled rather than dropped', () => {
  const result = checkerResultFixture();
  result.sections[0].passage = 'Signer José – review 🔒 required.';
  const raw = Buffer.from(build(result)).toString('latin1');
  assert.match(raw, /Signer Jos\xE9 \x96 review \[U\+01F512\] required/u);
});

test('the filename carries the run date', () => {
  assert.equal(checkerPdfFilename('2026-09-02T10:00:00Z'), 'opace-ai-content-integrity-2026-09-02.pdf');
  assert.equal(checkerPdfFilename('not a date'), 'opace-ai-content-integrity-undated.pdf');
});

test('an unusable result is refused rather than half-rendered', () => {
  assert.throws(() => buildCheckerPdf(null, OPTIONS), /report_result_required/u);
  assert.throws(() => buildCheckerPdf({ schema_version: '2.0' }, OPTIONS), /report_result_schema_unsupported/u);
  assert.throws(() => buildCheckerPdf({ schema_version: '1.0' }, OPTIONS), /report_result_structure_invalid/u);
});

test('the dial shows no needle when no trained model produced a reading', () => {
  const assessed = Buffer.from(build(checkerResultFixture())).toString('latin1');
  const unassessed = Buffer.from(build(notAssessedFixture())).toString('latin1');
  const needles = (raw) => (raw.match(/ h f Q/gu) ?? []).length;
  assert.ok(needles(assessed) > needles(unassessed), 'the assessed report draws extra needle geometry');
  assert.equal((unassessed.match(/1 1 1 rg [\d.]+ [\d.]+ m/gu) ?? []).length, 0, 'no white needle polygon without a reading');
});

test('a surface that still holds the draft prints the exact scored characters', () => {
  const draft = `${'A'.repeat(57)} ${'B'.repeat(62)}`;
  const text = flatText(build(checkerResultFixture(), { sourceText: draft }));
  assert.ok(text.includes('A'.repeat(40)), 'the local passage is printed');
  assert.ok(text.includes('B'.repeat(40)));
  assert.doesNotMatch(text, /The first complete scored passage/u);
  assert.throws(() => build(checkerResultFixture(), { sourceText: 'a drifted draft' }), /report_source_text_bounds_invalid/u);
});
