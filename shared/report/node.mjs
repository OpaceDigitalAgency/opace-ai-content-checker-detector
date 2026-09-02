/**
 * Node-only conveniences for the shared report package.
 *
 * The report builders themselves are browser-safe and never touch the file system. This file
 * is the only place a Node API appears, so a surface that runs in a browser can ignore it.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { buildCheckerReportHtml } from './checker-report-html.mjs';
import { buildCheckerPdf, checkerPdfFilename } from './checker-pdf.mjs';
import { LOGO_JPEG_128_BASE64, LOGO_PNG_96_BASE64, decodeBase64 } from './logo.mjs';

/** The packaged 128 px JPEG product mark used in the PDF running header. */
export const packagedLogoJpeg = () => decodeBase64(LOGO_JPEG_128_BASE64);

/** The packaged 96 px PNG product mark as a data URI. */
export const packagedLogoDataUri = () => `data:image/png;base64,${LOGO_PNG_96_BASE64}`;

/** Read a JPEG from disk for use as `options.logoJpegBytes`. */
export async function readLogoJpeg(path) {
  return new Uint8Array(await readFile(path));
}

/** Read a canonical checker-result from a contract fixture or an envelope file. */
export async function readCheckerResult(path) {
  const parsed = JSON.parse(await readFile(path, 'utf8'));
  return parsed && typeof parsed === 'object' && parsed.data && parsed.schema ? parsed.data : parsed;
}

/**
 * Write both exports for one result.
 *
 * @returns {Promise<{pdfPath: string, htmlPath: string, bytes: number}>}
 */
export async function writeCheckerReports(result, directory, options = {}) {
  const base = fileURLToPath(new URL(`${directory.endsWith('/') ? directory : `${directory}/`}`, 'file:///'));
  const logo = options.logoJpegBytes ?? packagedLogoJpeg();
  const pdf = buildCheckerPdf(result, { ...options, logoJpegBytes: logo });
  const html = buildCheckerReportHtml(result, options);
  const pdfPath = `${base}${options.pdfName ?? checkerPdfFilename(options.generatedAt ?? result.generated_at)}`;
  const htmlPath = `${base}${options.htmlName ?? 'checker-report.html'}`;
  await writeFile(pdfPath, pdf);
  await writeFile(htmlPath, html, 'utf8');
  return { pdfPath, htmlPath, bytes: pdf.length };
}
