/**
 * WCAG contrast over every text/background pair the PDF writer actually paints.
 *
 * Lane D2b fixed the printable HTML but left the PDF drawing the five band *fill* colours as
 * small captions and chip text, where `#6d7877` measured 4.15:1 and `#b06603` 4.03:1 on paper.
 * This holds that closed for the whole document rather than for the two strings that were
 * reported.
 *
 * The pairs are not a hand-kept table. `checkerPdfTextPairs` and `provenancePdfTextPairs` build
 * the report with the writer's paint log switched on and, for each drawn string, walk the log
 * backwards to the filled shape underneath the glyphs. A new caption, a moved card or a changed
 * accent is therefore measured on its own, and cannot be added without being checked.
 *
 * The probe is proved against a document that fails, in "the probe detects a pair that fails"
 * below: a check that cannot see the fault it was written for is not a check.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CHECKER_REPORT_CSS } from '../checker-report-html.mjs';
import {
  PDF_CHIP_FILLS,
  buildProvenanceExport,
  checkerPdfTextPairs,
  provenancePdfTextPairs,
} from '../checker-pdf.mjs';
import { LEVEL_COLOURS, REPORT_INKS } from '../report-model.mjs';
import { PdfDocument, rgbToHex, textBackgroundPairs } from '../pdf-writer.mjs';
import { logoJpegBytes } from '../logo.mjs';
import {
  PROVENANCE_STATUSES,
  checkerResultFixture,
  longFixture,
  notAssessedFixture,
  provenanceResult,
  singularFixture,
  wideChecksFixture,
  zeroCountFixture,
} from './fixtures.mjs';

const OPTIONS = Object.freeze({
  generatedAt: '2026-09-02T10:00:00Z',
  surfaceName: 'Astro toolbar',
  logoJpegBytes: logoJpegBytes(),
});

/**
 * WCAG 2.x large text is 18 pt, or 14 pt bold. The PDF is measured against the stricter reading:
 * anything under 18 pt has to clear 4.5:1 whatever its weight.
 */
const LARGE_POINTS = 18;
const thresholdFor = (size) => (size >= LARGE_POINTS ? 3 : 4.5);

/** WCAG 2.x relative luminance of an #rrggbb colour. */
function luminance(hex) {
  const channels = hex.replace('#', '').match(/../gu).map((pair) => {
    const value = Number.parseInt(pair, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** WCAG 2.x contrast ratio between two #rrggbb colours. */
function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const describe = (pair) =>
  `page ${pair.page}, ${pair.size}pt ${pair.weight}, ${pair.foregroundHex} on ${pair.backgroundHex ?? pair.backgroundKind}: ${JSON.stringify(pair.text.slice(0, 60))}`;

const CHECKER_FIXTURES = Object.freeze({
  canonical: () => checkerPdfTextPairs(checkerResultFixture(), OPTIONS),
  singular: () => checkerPdfTextPairs(singularFixture(), OPTIONS),
  'zero-count': () => checkerPdfTextPairs(zeroCountFixture(), OPTIONS),
  'not-assessed': () => checkerPdfTextPairs(notAssessedFixture(), OPTIONS),
  'wide-checks': () => checkerPdfTextPairs(wideChecksFixture(), OPTIONS),
  // Nine sections plus the content-bearing appendix: the eight-page evidence PDF.
  long: () => checkerPdfTextPairs(longFixture(9), { ...OPTIONS, fullText: 'Appendix line one.\n\nAppendix line two.' }),
});

const provenancePairs = (status) =>
  provenancePdfTextPairs(
    buildProvenanceExport(
      { name: 'never-exported.jpg', size: 19_876 },
      provenanceResult(status, { reason: 'Signer José – review 🔒 required.' }),
      '2026-09-02T12:00:00.000Z',
    ),
    { logoJpegBytes: logoJpegBytes() },
  );

/* ------------------------------------------------------------------ the report */

test('every string the checker PDF paints clears its contrast threshold', () => {
  let measured = 0;
  for (const [name, pairs] of Object.entries(CHECKER_FIXTURES)) {
    const drawn = pairs();
    assert.ok(drawn.length > 120, `the ${name} fixture drew only ${drawn.length} strings`);
    for (const pair of drawn) {
      measured += 1;
      assert.ok(pair.backgroundHex, `${name}: nothing is painted behind ${describe(pair)}`);
      const ratio = contrast(pair.foregroundHex, pair.backgroundHex);
      assert.ok(
        ratio >= thresholdFor(pair.size),
        `${name}: ${ratio.toFixed(2)}:1 is below ${thresholdFor(pair.size)}:1 — ${describe(pair)}`,
      );
    }
  }
  assert.ok(measured > 1200, `only ${measured} pairs were measured`);
});

test('every string the provenance PDF paints clears its contrast threshold, in all six states', () => {
  for (const status of PROVENANCE_STATUSES) {
    const drawn = provenancePairs(status);
    assert.ok(drawn.length > 20, `the ${status} record drew only ${drawn.length} strings`);
    for (const pair of drawn) {
      assert.ok(pair.backgroundHex, `${status}: nothing is painted behind ${describe(pair)}`);
      const ratio = contrast(pair.foregroundHex, pair.backgroundHex);
      assert.ok(
        ratio >= thresholdFor(pair.size),
        `${status}: ${ratio.toFixed(2)}:1 is below ${thresholdFor(pair.size)}:1 — ${describe(pair)}`,
      );
    }
  }
});

test('no string is drawn over the logo or on unpainted ground', () => {
  for (const [name, pairs] of Object.entries(CHECKER_FIXTURES)) {
    for (const pair of pairs()) {
      assert.equal(pair.backgroundKind, 'fill', `${name}: ${describe(pair)} sits on ${pair.backgroundKind}`);
    }
  }
});

/* -------------------------------------------------------------------- palettes */

test('the band fill palette is never used for text below 18 pt', () => {
  const fills = new Set([...Object.values(LEVEL_COLOURS).map((colour) => colour.hex), '#fb700a', '#0068b3']);
  for (const [name, pairs] of Object.entries(CHECKER_FIXTURES)) {
    for (const pair of pairs()) {
      if (pair.size >= LARGE_POINTS) continue;
      assert.ok(
        !fills.has(pair.foregroundHex),
        `${name}: the fill palette is being drawn as small text — ${describe(pair)}`,
      );
    }
  }
});

test('white chip text clears 4.5:1 on every fill a chip can be given', () => {
  assert.ok(PDF_CHIP_FILLS.length >= 4, 'the chip palette is empty');
  for (const fill of PDF_CHIP_FILLS) {
    const hex = rgbToHex(fill);
    const ratio = contrast('#ffffff', hex);
    assert.ok(ratio >= 4.5, `white chip text on ${hex} measures ${ratio.toFixed(2)}:1`);
  }
});

test('the PDF inks are the same values the printable HTML uses for its light scheme', () => {
  for (const [tone, ink] of Object.entries(REPORT_INKS)) {
    const token = tone === 'orange' || tone === 'blue' ? `--oaci-${tone}-ink` : `--oaci-band-${tone}`;
    assert.ok(
      CHECKER_REPORT_CSS.includes(`${token}:${ink.hex}`),
      `${token} in the stylesheet does not carry ${ink.hex}`,
    );
    assert.equal(rgbToHex(ink.rgb), ink.hex, `${tone}: the PDF triple does not round-trip to ${ink.hex}`);
  }
});

/* --------------------------------------------------------------------- control */

test('the probe detects a pair that fails, and one that passes on the same page', () => {
  const document = new PdfDocument({ creationDate: '2026-09-02T10:00:00Z', trace: true });
  const page = document.addPage();
  page.rect(0, 0, 400, 400, [1, 1, 1]);
  // The exact fault this file was written for: a band fill drawn as a small caption on paper.
  page.text('Potentially AI', 40, 300, { weight: 'bold', size: 7.8, fill: [0.690, 0.400, 0.012] });
  page.text('Potentially AI', 40, 260, { weight: 'bold', size: 7.8, fill: REPORT_INKS.potential.rgb });

  const pairs = textBackgroundPairs(document);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].backgroundHex, '#ffffff');
  assert.ok(contrast(pairs[0].foregroundHex, pairs[0].backgroundHex) < 4.5, 'the failing pair was not detected');
  assert.ok(contrast(pairs[1].foregroundHex, pairs[1].backgroundHex) >= 4.5, 'the passing pair was reported as a failure');
});

test('the probe reads the topmost fill, not the page ground', () => {
  const document = new PdfDocument({ creationDate: '2026-09-02T10:00:00Z', trace: true });
  const page = document.addPage();
  page.rect(0, 0, 400, 400, [1, 1, 1]);
  page.roundedRect(30, 280, 120, 30, 4, [0.059, 0.067, 0.082]);
  page.text('On the dark card', 40, 292, { weight: 'bold', size: 8, fill: [1, 1, 1] });

  const [pair] = textBackgroundPairs(document);
  assert.equal(pair.backgroundHex, '#0f1115');
  assert.equal(pair.foregroundHex, '#ffffff');
});

test('tracing changes nothing about the bytes', async () => {
  const { buildCheckerPdf } = await import('../checker-pdf.mjs');
  const a = buildCheckerPdf(checkerResultFixture(), OPTIONS);
  checkerPdfTextPairs(checkerResultFixture(), OPTIONS);
  const b = buildCheckerPdf(checkerResultFixture(), OPTIONS);
  assert.deepEqual([...a], [...b]);
});
