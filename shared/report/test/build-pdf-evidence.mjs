/**
 * Regenerate the PDF evidence under shared/report/evidence/.
 *
 * Lane D2 produced these with an ad-hoc script that was never kept, so this file replaces it and
 * makes the evidence reproducible. It writes the four checker PDFs and the content-free
 * provenance PDF, prints `pdfinfo` for each, and renders every page to a PNG with `pdftoppm` when
 * poppler is on PATH. The builders are deterministic — `generatedAt` is fixed here — so a run
 * that changes nothing rewrites byte-identical files.
 *
 *   node shared/report/test/build-pdf-evidence.mjs
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { buildCheckerPdf, buildProvenanceExport, buildProvenancePdf } from '../checker-pdf.mjs';
import { logoJpegBytes } from '../logo.mjs';
import { checkerResultFixture, longFixture, notAssessedFixture, provenanceResult, singularFixture } from './fixtures.mjs';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const evidenceDir = path.join(here, '..', 'evidence');

const GENERATED_AT = '2026-09-02T10:00:00Z';
const OPTIONS = Object.freeze({ generatedAt: GENERATED_AT, surfaceName: 'Astro toolbar', logoJpegBytes: logoJpegBytes() });

/** stem -> [pdf bytes, png prefix]. The PNG prefixes are the ones the D2 report already cites. */
const DOCUMENTS = [
  ['checker-report', () => buildCheckerPdf(checkerResultFixture(), OPTIONS), 'page'],
  ['checker-report-singular', () => buildCheckerPdf(singularFixture(), OPTIONS), 'singular'],
  ['checker-report-not-assessed', () => buildCheckerPdf(notAssessedFixture(), OPTIONS), 'notassessed'],
  // Nine sections plus the full-draft appendix, which is what the eight-page evidence PDF shows.
  ['checker-report-long', () => {
    const result = longFixture(9);
    const draft = result.sections.map((section, index) => `Section ${index + 1}\n\n${section.passage}`).join('\n\n');
    return buildCheckerPdf(result, { ...OPTIONS, fullText: draft });
  }, 'long'],
  ['provenance-report', () => buildProvenancePdf(
    buildProvenanceExport(
      { name: 'never-exported.jpg', size: 19_876 },
      provenanceResult('untrusted', { reason: 'Signer José – review 🔒 required.' }),
      '2026-09-02T12:00:00.000Z',
    ),
    { logoJpegBytes: logoJpegBytes() },
  ), 'provenance'],
];

async function tool(command, args) {
  try {
    const { stdout } = await run(command, args);
    return stdout;
  } catch (error) {
    return `(${command} unavailable: ${error.code ?? error.message})`;
  }
}

async function main() {
  await mkdir(evidenceDir, { recursive: true });

  for (const [stem, build, prefix] of DOCUMENTS) {
    const file = path.join(evidenceDir, `${stem}.pdf`);
    let before = null;
    try {
      before = createHash('sha256').update(await readFile(file)).digest('hex');
    } catch {
      // first run
    }
    const bytes = build();
    await writeFile(file, bytes);
    const after = createHash('sha256').update(bytes).digest('hex');

    const info = await tool('pdfinfo', [file]);
    const pages = info.match(/^Pages:\s+(\d+)$/mu)?.[1] ?? '?';
    await tool('pdftoppm', ['-r', '90', '-png', file, path.join(evidenceDir, prefix)]);

    const state = before === null ? 'new' : before === after ? 'unchanged' : 'CHANGED';
    console.log(`${path.relative(repoRoot, file)}  ${bytes.length} bytes  ${pages} pages  ${state}  sha256:${after.slice(0, 16)}`);
  }

  // The printable HTML is turned into A4 by Chromium in render-report.mjs. Render its pages here
  // so every PDF in the evidence folder has a PNG beside it. Run render-report.mjs first.
  for (const [stem, prefix] of [['html-report-print', 'html-print'], ['html-singular-print', 'html-singular-print']]) {
    const file = path.join(evidenceDir, `${stem}.pdf`);
    const info = await tool('pdfinfo', [file]);
    if (info.startsWith('(')) {
      console.log(`${stem}.pdf  ${info}`);
      continue;
    }
    await tool('pdftoppm', ['-r', '90', '-png', file, path.join(evidenceDir, prefix)]);
    console.log(`${path.relative(repoRoot, file)}  ${info.match(/^Pages:\s+(\d+)$/mu)?.[1] ?? '?'} pages rendered to ${prefix}-*.png`);
  }
}

await main();
