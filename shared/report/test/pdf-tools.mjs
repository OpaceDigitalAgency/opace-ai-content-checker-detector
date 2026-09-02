/**
 * Test-only PDF inspection helpers.
 *
 * Everything here works on the raw bytes with no third-party dependency, so the suite runs
 * anywhere `node --test` runs. `pdftotext` is used as a cross-check when it happens to be on
 * PATH, but no assertion depends on it being installed.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const latin1 = (bytes) => Buffer.from(bytes).toString('latin1');

/** Every uncompressed content stream in document order. */
export function contentStreams(bytes) {
  const raw = latin1(bytes);
  const streams = [];
  const marker = /<< \/Length (\d+) >>\nstream\n/gu;
  let match = marker.exec(raw);
  while (match) {
    const start = match.index + match[0].length;
    streams.push(raw.slice(start, start + Number(match[1])));
    match = marker.exec(raw);
  }
  return streams;
}

const unescapePdfString = (value) =>
  value.replace(/\\([\\()nrt])/gu, (_, character) => ({ n: '\n', r: '\r', t: '\t' })[character] ?? character);

/** Text drawn on one page, in drawing order. */
export function pageText(stream) {
  return [...stream.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj/gu)]
    .map((match) => unescapePdfString(match[0].slice(1, match[0].lastIndexOf(')'))))
    .join('\n');
}

/** All text in the document, page by page. */
export const documentPages = (bytes) => contentStreams(bytes).map(pageText);

/** All text in the document as one string. */
export const documentText = (bytes) => documentPages(bytes).join('\n');

/** Cross-check with pdftotext when it is available; returns null when it is not. */
export function pdftotext(bytes) {
  try {
    const directory = mkdtempSync(join(tmpdir(), 'oaci-report-'));
    const path = join(directory, 'report.pdf');
    writeFileSync(path, bytes);
    return execFileSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** Declared page count from the /Pages node. */
export function pageCount(bytes) {
  const match = /\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/u.exec(latin1(bytes));
  return match ? Number(match[1]) : 0;
}

/** Every /MediaBox declared in the file. */
export function mediaBoxes(bytes) {
  return [...latin1(bytes).matchAll(/\/MediaBox \[([^\]]+)\]/gu)].map((match) => match[1].trim().split(/\s+/u).map(Number));
}

/**
 * Verify the cross-reference table: the header, the object count and every recorded byte
 * offset must land exactly on its "N 0 obj" header, and startxref must point at "xref".
 */
export function verifyXref(bytes) {
  const raw = latin1(bytes);
  if (!raw.startsWith('%PDF-')) return { valid: false, reason: 'missing %PDF- header' };
  const startxref = /startxref\s+(\d+)\s+%%EOF/u.exec(raw);
  if (!startxref) return { valid: false, reason: 'missing startxref/%%EOF' };
  const offset = Number(startxref[1]);
  if (raw.slice(offset, offset + 4) !== 'xref') return { valid: false, reason: `startxref ${offset} does not point at an xref table` };
  const table = /^xref\n0 (\d+)\n([\s\S]*?)trailer/u.exec(raw.slice(offset));
  if (!table) return { valid: false, reason: 'xref table is malformed' };
  const size = Number(table[1]);
  const rows = table[2].split('\n').filter(Boolean);
  if (rows.length !== size) return { valid: false, reason: `xref declares ${size} entries but lists ${rows.length}` };
  if (!/^0000000000 65535 f\s*$/u.test(rows[0])) return { valid: false, reason: 'free-list head entry is wrong' };
  for (let index = 1; index < rows.length; index += 1) {
    const entry = /^(\d{10}) (\d{5}) n\s*$/u.exec(rows[index]);
    if (!entry) return { valid: false, reason: `xref entry ${index} is malformed: ${JSON.stringify(rows[index])}` };
    const objectOffset = Number(entry[1]);
    if (!raw.startsWith(`${index} 0 obj`, objectOffset)) {
      return { valid: false, reason: `xref entry ${index} points at ${objectOffset}, which is not "${index} 0 obj"` };
    }
  }
  const trailer = /trailer\n<< \/Size (\d+) /u.exec(raw.slice(offset));
  if (!trailer || Number(trailer[1]) !== size) return { valid: false, reason: 'trailer /Size disagrees with the xref table' };
  return { valid: true, size, reason: '' };
}

const CONTENT_TOP = 760;
const CONTENT_BOTTOM = 62;

/**
 * How much of a page's flowing content area is used, as a fraction.
 * Anything drawn between the running header and the footer counts: text baselines, rectangle
 * origins and path points.
 */
export function pageFill(stream) {
  const ys = [];
  for (const match of stream.matchAll(/([-\d.]+) ([-\d.]+) Td/gu)) ys.push(Number(match[2]));
  for (const match of stream.matchAll(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) re/gu)) ys.push(Number(match[2]));
  for (const match of stream.matchAll(/([-\d.]+) ([-\d.]+) (?:m|l)\b/gu)) ys.push(Number(match[2]));
  const inside = ys.filter((y) => y >= CONTENT_BOTTOM && y <= CONTENT_TOP);
  if (!inside.length) return 0;
  return (CONTENT_TOP - Math.min(...inside)) / (CONTENT_TOP - CONTENT_BOTTOM);
}

/**
 * All document text with runs of whitespace collapsed, so a phrase assertion still passes when
 * the layout engine wraps that phrase across two lines.
 */
export const flatText = (bytes) => documentText(bytes).replace(/\s+/gu, ' ');
