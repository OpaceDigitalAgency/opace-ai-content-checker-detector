import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProvenanceExport, buildProvenancePdf, provenancePdfFilename, provenanceReportText } from '../checker-pdf.mjs';
import { logoJpegBytes } from '../logo.mjs';
import { PROVENANCE_HASH, PROVENANCE_STATUSES, provenanceResult } from './fixtures.mjs';
import { documentPages, documentText, flatText, mediaBoxes, pageCount, pdftotext, verifyXref } from './pdf-tools.mjs';

const OPTIONS = Object.freeze({ logoJpegBytes: logoJpegBytes() });

test('all six provenance states create content-free records without filename or bytes', () => {
  for (const status of PROVENANCE_STATUSES) {
    const record = buildProvenanceExport(
      { name: 'private-client-filename.jpg', size: 19_876, bytes: 'private file bytes' },
      provenanceResult(status),
      '2026-09-02T12:00:00.000Z'
    );
    assert.equal(record.provenance.status, status);
    assert.equal(record.file.hash, PROVENANCE_HASH);
    assert.equal(record.file.size_bytes, 19_876);
    assert.equal(record.contains_content, false);
    assert.doesNotMatch(JSON.stringify(record), /private-client-filename|private file bytes|"(?:name|bytes|content)"/iu);
  }
});

test('the provenance PDF carries the result, the privacy boundary and the non-ASCII fallback', () => {
  const record = buildProvenanceExport(
    { name: 'never-exported.pdf', size: 42 },
    provenanceResult('untrusted', { reason: 'Signer José – review 🔒 required.' }),
    '2026-09-02T12:00:00.000Z'
  );

  const report = provenanceReportText(record);
  assert.match(report, /Status: untrusted/u);
  assert.match(report, /File hash: sha256:a{64}/u);
  assert.match(report, /file itself is not embedded/iu);

  const bytes = buildProvenancePdf(record, OPTIONS);
  const raw = Buffer.from(bytes).toString('latin1');
  assert.match(raw, /^%PDF-1\.4/u);
  assert.match(raw, /Signer Jos\xE9 \x96 review \[U\+01F512\] required/u);
  assert.doesNotMatch(raw, /never-exported/u);

  const text = flatText(bytes);
  assert.ok(text.includes('File Content Credentials report'));
  assert.ok(text.includes('Untrusted'));
  assert.ok(text.includes(`File hash: ${PROVENANCE_HASH}`));
  assert.ok(text.includes('File size: 42 bytes'));
  assert.ok(text.includes('The filename and the file bytes are deliberately absent from this report.'));
  assert.ok(text.includes('Certificate trust lists, remote manifests and online certificate status were not fetched.'));

  const external = pdftotext(bytes);
  if (external) assert.ok(external.replace(/\s+/gu, ' ').includes('File Content Credentials report'));
});

test('the provenance PDF is A4 with a valid cross-reference table and page numbers', () => {
  const record = buildProvenanceExport({ size: 2048 }, provenanceResult('present'), '2026-09-02T12:00:00.000Z');
  const bytes = buildProvenancePdf(record, OPTIONS);
  const xref = verifyXref(bytes);
  assert.ok(xref.valid, `xref table invalid: ${xref.reason}`);
  for (const box of mediaBoxes(bytes)) {
    assert.ok(Math.abs(box[2] - 595.28) < 0.01);
    assert.ok(Math.abs(box[3] - 841.89) < 0.01);
  }
  const pages = documentPages(bytes);
  assert.equal(pages.length, pageCount(bytes));
  pages.forEach((page, index) => assert.ok(page.includes(`Page ${index + 1} of ${pages.length}`)));
  assert.ok(pages[0].includes('Fixture generator'), 'the manifest summary must be printed');
});

test('a long issue list paginates and never draws below the footer rule', () => {
  const issues = Array.from({ length: 180 }, (_, index) => ({
    code: `fixture.issue.${index + 1}`,
    explanation: `Bounded validation detail ${index + 1}.`,
  }));
  const record = buildProvenanceExport({ size: 2048 }, provenanceResult('invalid', { issues }), '2026-09-02T12:00:00.000Z');
  const bytes = buildProvenancePdf(record, OPTIONS);
  assert.ok(pageCount(bytes) >= 3, `expected at least three pages, produced ${pageCount(bytes)}`);
  const raw = Buffer.from(bytes).toString('latin1');
  for (const match of raw.matchAll(/([-\d.]+) ([-\d.]+) Td/gu)) {
    assert.ok(Number(match[2]) >= 20, `content line drawn below the page at y=${match[2]}`);
  }
  const text = flatText(bytes);
  assert.ok(text.includes('fixture.issue.1: Bounded validation detail 1.'));
  assert.ok(text.includes('fixture.issue.180: Bounded validation detail 180.'));
});

test('the provenance PDF is deterministic and carries no placeholder', () => {
  const record = buildProvenanceExport({ size: 512 }, provenanceResult('absent'), '2026-09-02T12:00:00.000Z');
  const first = buildProvenancePdf(record, OPTIONS);
  const second = buildProvenancePdf(record, OPTIONS);
  assert.deepEqual(Buffer.from(first), Buffer.from(second));
  const text = documentText(first);
  assert.doesNotMatch(text, /undefined/u);
  assert.doesNotMatch(text, /\bNaN\b/u);
});

test('unsafe provenance records fail closed', () => {
  assert.throws(() => buildProvenanceExport({ size: 1 }, provenanceResult('present', { file_hash: 'sha256:bad' })), /not safe to export/u);
  assert.throws(() => buildProvenanceExport({ size: 20 * 1024 * 1024 + 1 }, provenanceResult('present')), /not safe to export/u);
  assert.throws(() => buildProvenanceExport({ size: 1 }, provenanceResult('invented')), /not safe to export/u);
  assert.throws(() => buildProvenancePdf(null), /not printable/u);
});

test('the provenance filename carries the run date', () => {
  assert.equal(provenancePdfFilename('2026-09-02T12:00:00.000Z'), 'opace-content-credentials-2026-09-02.pdf');
});
