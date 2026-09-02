/**
 * A small, dependency-free PDF 1.4 writer.
 *
 * It gives the report builders the drawing primitives they need (text with real Helvetica
 * metrics, filled and stroked paths, rounded rectangles, arcs, JPEG images) and assembles a
 * valid cross-reference table. Output is byte-for-byte deterministic for identical input:
 * every timestamp comes from the caller, nothing is read from the clock or the environment.
 *
 * No Node API and no DOM, so the same file runs in WordPress admin, the Chrome extension,
 * an Astro island and the Node CLI.
 */

import { measureWinAnsi } from './helvetica-metrics.mjs';

export const A4 = Object.freeze({ width: 595.28, height: 841.89 });

const WINDOWS_1252 = new Map(Object.entries({
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
  '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
  '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
}));

/** The 27 WinAnsi slots in 0x80-0x9F that already carry a glyph once encoded. */
const WINDOWS_1252_BYTES = new Set([...WINDOWS_1252.values()]);

const codePointLabel = (character) => {
  const codePoint = character.codePointAt(0);
  return `[U+${codePoint.toString(16).toUpperCase().padStart(codePoint > 0xffff ? 6 : 4, '0')}]`;
};

const inWinAnsi = (character) => {
  const point = character.codePointAt(0);
  return (point >= 0x20 && point <= 0x7e) || (point >= 0xa0 && point <= 0xff) || WINDOWS_1252.has(character);
};

const winAnsiCharacter = (character) => {
  const codePoint = character.codePointAt(0);
  if (character === '\n') return '\n';
  if (character === '\r') return '';
  if (character === '\t') return ' ';
  if ((codePoint >= 0x20 && codePoint <= 0x7e) || (codePoint >= 0xa0 && codePoint <= 0xff)) return character;
  if (WINDOWS_1252.has(character)) return String.fromCharCode(WINDOWS_1252.get(character));
  // Already-encoded WinAnsi punctuation passes straight through, which keeps encodeWinAnsi
  // idempotent so wrapped lines can be measured, stored and drawn without re-mangling.
  if (WINDOWS_1252_BYTES.has(codePoint)) return character;
  const decomposed = character.normalize('NFKD').replace(/\p{Mark}/gu, '');
  if (decomposed && decomposed !== character && [...decomposed].every(inWinAnsi)) {
    return [...decomposed].map((item) => (WINDOWS_1252.has(item) ? String.fromCharCode(WINDOWS_1252.get(item)) : item)).join('');
  }
  return codePointLabel(character);
};

/**
 * Encode arbitrary text for the built-in WinAnsi core fonts.
 *
 * Documented Unicode fallback, in order: exact WinAnsi code point, then the Windows-1252
 * punctuation block, then an NFKD decomposition with combining marks removed (so "é" prints
 * as "e" rather than vanishing), then an explicit `[U+XXXX]` label. Nothing is ever replaced
 * with an ambiguous question mark or silently dropped.
 */
export const encodeWinAnsi = (value) => [...String(value ?? '').normalize('NFC')].map(winAnsiCharacter).join('');

const escapePdfString = (value) => String(value).replace(/([\\()])/gu, '\\$1').replace(/\r/gu, '');

const round = (value) => {
  const fixed = Number(value).toFixed(3);
  return fixed.replace(/\.?0+$/u, '') || '0';
};

const colour = (rgb) => `${round(rgb[0])} ${round(rgb[1])} ${round(rgb[2])}`;

const latin1 = (value) => {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
  return bytes;
};

/** Width of a string once encoded, in points, including any extra character spacing. */
export const measureText = (value, weight, size, characterSpacing = 0) => {
  const encoded = encodeWinAnsi(value);
  return measureWinAnsi(encoded, weight, size) + (characterSpacing ? encoded.length * characterSpacing : 0);
};

/**
 * Read width, height and colour-component count from a baseline or progressive JPEG.
 * Returns null when the bytes are not a usable JPEG, so the report simply omits the logo.
 */
export function readJpegHeader(bytes) {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      return {
        bits: bytes[offset + 4],
        height: (bytes[offset + 5] << 8) | bytes[offset + 6],
        width: (bytes[offset + 7] << 8) | bytes[offset + 8],
        components: bytes[offset + 9],
      };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}

/** One page's content stream, built from drawing calls. */
class PdfPage {
  constructor({ trace = false } = {}) {
    this.operations = [];
    this.minimumY = A4.height;
    /**
     * Draw log in paint order, used by `textBackgroundPairs` to work out which colour every
     * string actually lands on. `null` unless the caller asked for it, so nothing is retained
     * on the normal path and the emitted bytes are identical either way.
     */
    this.trace = trace ? [] : null;
  }

  #touch(y) {
    if (Number.isFinite(y) && y < this.minimumY) this.minimumY = y;
  }

  /** Record a painted area for the contrast probe. Bounds are [left, bottom, right, top]. */
  #paint(type, fill, x0, y0, x1, y1) {
    if (!this.trace) return;
    this.trace.push({
      type,
      fill: fill ? [...fill] : null,
      box: [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)],
    });
  }

  raw(operation) {
    this.operations.push(operation);
    return this;
  }

  /** Fill a rectangle. */
  rect(x, y, width, height, fill) {
    this.#touch(y);
    this.#paint('fill', fill, x, y, x + width, y + height);
    return this.raw(`q ${colour(fill)} rg ${round(x)} ${round(y)} ${round(width)} ${round(height)} re f Q`);
  }

  /** Stroke a rectangle outline. */
  strokeRect(x, y, width, height, stroke, lineWidth = 0.6) {
    this.#touch(y);
    return this.raw(`q ${colour(stroke)} RG ${round(lineWidth)} w ${round(x)} ${round(y)} ${round(width)} ${round(height)} re S Q`);
  }

  /** Rounded rectangle, filled and optionally outlined. */
  roundedRect(x, y, width, height, radius, fill, stroke = null, lineWidth = 0.6) {
    this.#touch(y);
    this.#paint('fill', fill, x, y, x + width, y + height);
    const r = Math.max(0, Math.min(radius, width / 2, height / 2));
    const k = r * 0.5523;
    const path = [
      `${round(x + r)} ${round(y)} m`,
      `${round(x + width - r)} ${round(y)} l`,
      `${round(x + width - r + k)} ${round(y)} ${round(x + width)} ${round(y + r - k)} ${round(x + width)} ${round(y + r)} c`,
      `${round(x + width)} ${round(y + height - r)} l`,
      `${round(x + width)} ${round(y + height - r + k)} ${round(x + width - r + k)} ${round(y + height)} ${round(x + width - r)} ${round(y + height)} c`,
      `${round(x + r)} ${round(y + height)} l`,
      `${round(x + r - k)} ${round(y + height)} ${round(x)} ${round(y + height - r + k)} ${round(x)} ${round(y + height - r)} c`,
      `${round(x)} ${round(y + r)} l`,
      `${round(x)} ${round(y + r - k)} ${round(x + r - k)} ${round(y)} ${round(x + r)} ${round(y)} c`,
      'h',
    ].join(' ');
    const paint = stroke ? `${colour(fill)} rg ${colour(stroke)} RG ${round(lineWidth)} w B` : `${colour(fill)} rg f`;
    return this.raw(`q ${path} ${paint} Q`);
  }

  /** Straight line. */
  line(x1, y1, x2, y2, stroke, lineWidth = 0.6) {
    this.#touch(Math.min(y1, y2));
    return this.raw(`q ${colour(stroke)} RG ${round(lineWidth)} w 1 J ${round(x1)} ${round(y1)} m ${round(x2)} ${round(y2)} l S Q`);
  }

  /** Filled polygon from [x, y] pairs. */
  polygon(points, fill) {
    if (points.length < 3) return this;
    for (const point of points) this.#touch(point[1]);
    this.#paint(
      'fill',
      fill,
      Math.min(...points.map((point) => point[0])),
      Math.min(...points.map((point) => point[1])),
      Math.max(...points.map((point) => point[0])),
      Math.max(...points.map((point) => point[1])),
    );
    const path = points.map(([x, y], index) => `${round(x)} ${round(y)} ${index ? 'l' : 'm'}`).join(' ');
    return this.raw(`q ${colour(fill)} rg ${path} h f Q`);
  }

  /** Filled circle, drawn with four Bezier quadrants. */
  circle(cx, cy, radius, fill) {
    this.#touch(cy - radius);
    this.#paint('fill', fill, cx - radius, cy - radius, cx + radius, cy + radius);
    const k = radius * 0.5523;
    const path = [
      `${round(cx + radius)} ${round(cy)} m`,
      `${round(cx + radius)} ${round(cy + k)} ${round(cx + k)} ${round(cy + radius)} ${round(cx)} ${round(cy + radius)} c`,
      `${round(cx - k)} ${round(cy + radius)} ${round(cx - radius)} ${round(cy + k)} ${round(cx - radius)} ${round(cy)} c`,
      `${round(cx - radius)} ${round(cy - k)} ${round(cx - k)} ${round(cy - radius)} ${round(cx)} ${round(cy - radius)} c`,
      `${round(cx + k)} ${round(cy - radius)} ${round(cx + radius)} ${round(cy - k)} ${round(cx + radius)} ${round(cy)} c`,
      'h',
    ].join(' ');
    return this.raw(`q ${colour(fill)} rg ${path} f Q`);
  }

  /**
   * Filled annular wedge: the building block of the dial gauge. Angles are degrees, measured
   * anticlockwise from the positive x axis, so 180 to 0 sweeps the top half.
   */
  arcBand(cx, cy, innerRadius, outerRadius, startDegrees, endDegrees, fill, steps = 18) {
    const points = [];
    for (let step = 0; step <= steps; step += 1) {
      const angle = ((startDegrees + ((endDegrees - startDegrees) * step) / steps) * Math.PI) / 180;
      points.push([cx + outerRadius * Math.cos(angle), cy + outerRadius * Math.sin(angle)]);
    }
    for (let step = steps; step >= 0; step -= 1) {
      const angle = ((startDegrees + ((endDegrees - startDegrees) * step) / steps) * Math.PI) / 180;
      points.push([cx + innerRadius * Math.cos(angle), cy + innerRadius * Math.sin(angle)]);
    }
    return this.polygon(points, fill);
  }

  /** One line of text at a baseline. */
  text(value, x, y, { weight = 'regular', size = 9, fill = [0, 0, 0], characterSpacing = 0 } = {}) {
    this.#touch(y);
    const encoded = escapePdfString(encodeWinAnsi(value).replaceAll('\n', ' '));
    if (!encoded) return this;
    const font = weight === 'bold' ? '/F2' : '/F1';
    const spacing = characterSpacing ? `${round(characterSpacing)} Tc ` : '';
    if (this.trace) {
      this.trace.push({
        type: 'text',
        text: String(value ?? ''),
        x,
        y,
        size,
        weight,
        fill: [...fill],
        width: measureText(value, weight, size, characterSpacing),
      });
    }
    return this.raw(`q BT ${spacing}${font} ${round(size)} Tf ${colour(fill)} rg ${round(x)} ${round(y)} Td (${encoded}) Tj ET Q`);
  }

  /** Draw the logo XObject into a width x height box with its lower-left corner at (x, y). */
  image(name, x, y, width, height) {
    this.#touch(y);
    this.#paint('image', null, x, y, x + width, y + height);
    return this.raw(`q ${round(width)} 0 0 ${round(height)} ${round(x)} ${round(y)} cm /${name} Do Q`);
  }

  stream() {
    return this.operations.join('\n');
  }
}

/** A PDF document under construction. */
export class PdfDocument {
  constructor({ title, author, subject, creator, creationDate, pageSize = A4, trace = false } = {}) {
    this.pageSize = pageSize;
    /** When true every page keeps a paint-order draw log for `textBackgroundPairs`. */
    this.trace = Boolean(trace);
    this.pages = [];
    this.images = new Map();
    this.info = {
      title: title ?? 'Report',
      author: author ?? 'Opace Digital Agency',
      subject: subject ?? '',
      creator: creator ?? 'Opace AI Content Integrity',
      creationDate: creationDate ?? '1970-01-01T00:00:00Z',
    };
  }

  addPage() {
    const page = new PdfPage({ trace: this.trace });
    this.pages.push(page);
    return page;
  }

  /** Register a JPEG for use as an XObject. Ignored silently when the bytes are unusable. */
  addJpeg(name, bytes) {
    const header = readJpegHeader(bytes);
    if (!header || !header.width || !header.height) return false;
    this.images.set(name, { bytes, header });
    return true;
  }

  #pdfDate() {
    const parsed = new Date(this.info.creationDate);
    const iso = Number.isNaN(parsed.getTime()) ? '1970-01-01T00:00:00.000Z' : parsed.toISOString();
    return `D:${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}${iso.slice(11, 13)}${iso.slice(14, 16)}${iso.slice(17, 19)}Z00'00'`;
  }

  /** Serialise to PDF bytes. */
  build() {
    if (!this.pages.length) throw new Error('pdf_document_has_no_pages');
    const objects = [];
    const add = (value) => { objects.push(value); return objects.length; };

    const catalogId = add(null);
    const pagesId = add(null);
    const regularFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const boldFontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const imageIds = new Map();
    for (const [name, { bytes, header }] of this.images) {
      const space = header.components === 1 ? '/DeviceGray' : header.components === 4 ? '/DeviceCMYK' : '/DeviceRGB';
      const dictionary = `<< /Type /XObject /Subtype /Image /Width ${header.width} /Height ${header.height} /ColorSpace ${space} /BitsPerComponent ${header.bits || 8} /Filter /DCTDecode /Length ${bytes.length} >>`;
      imageIds.set(name, add({ dictionary, bytes }));
    }

    const xObjectEntry = imageIds.size
      ? ` /XObject << ${[...imageIds].map(([name, id]) => `/${name} ${id} 0 R`).join(' ')} >>`
      : '';

    const pageIds = [];
    for (const page of this.pages) {
      const stream = page.stream();
      const streamId = add({ dictionary: `<< /Length ${stream.length} >>`, bytes: latin1(stream) });
      pageIds.push(add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${round(this.pageSize.width)} ${round(this.pageSize.height)}] ` +
        `/Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >>${xObjectEntry} >> /Contents ${streamId} 0 R >>`
      ));
    }

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
    const date = this.#pdfDate();
    const infoId = add(
      `<< /Title (${escapePdfString(encodeWinAnsi(this.info.title))}) /Author (${escapePdfString(encodeWinAnsi(this.info.author))}) ` +
      `/Subject (${escapePdfString(encodeWinAnsi(this.info.subject))}) /Creator (${escapePdfString(encodeWinAnsi(this.info.creator))}) ` +
      `/Producer (${escapePdfString(encodeWinAnsi(this.info.creator))}) /CreationDate (${date}) /ModDate (${date}) >>`
    );

    const parts = [];
    let length = 0;
    const push = (value) => {
      const bytes = typeof value === 'string' ? latin1(value) : value;
      parts.push(bytes);
      length += bytes.length;
    };

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const offsets = new Array(objects.length + 1).fill(0);
    objects.forEach((value, index) => {
      offsets[index + 1] = length;
      push(`${index + 1} 0 obj\n`);
      if (typeof value === 'string') {
        push(`${value}\n`);
      } else {
        push(`${value.dictionary}\nstream\n`);
        push(value.bytes);
        push('\nendstream\n');
      }
      push('endobj\n');
    });

    const xrefOffset = length;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index <= objects.length; index += 1) xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    push(xref);
    push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const output = new Uint8Array(length);
    let cursor = 0;
    for (const part of parts) { output.set(part, cursor); cursor += part.length; }
    return output;
  }
}

/** Split a paragraph into lines that fit `width` points, using real Helvetica metrics. */
export function wrapLines(value, weight, size, width) {
  const lines = [];
  const source = encodeWinAnsi(value).replace(/\r/gu, '');
  for (const paragraph of source.split('\n')) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    if (!words.length) continue;
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureWinAnsi(candidate, weight, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      if (measureWinAnsi(word, weight, size) <= width) { line = word; continue; }
      // A single unbreakable token (a hash, a long URL) is split on character boundaries.
      let piece = '';
      for (const character of word) {
        const next = piece + character;
        if (piece && measureWinAnsi(next, weight, size) > width) { lines.push(piece); piece = character; }
        else piece = next;
      }
      line = piece;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/* ------------------------------------------------------------ contrast probe */

/** An rgb triple in 0..1 as an #rrggbb string. */
export const rgbToHex = (rgb) =>
  `#${rgb.map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255).toString(16).padStart(2, '0')).join('')}`;

const contains = (box, x, y) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];

/**
 * Sample points inside one drawn string: near the left edge, the middle and the right edge, at
 * two heights inside the cap box. Three columns catch a string that straddles two fills, which
 * is a layout fault in its own right and one this probe should not average away.
 */
function samplePoints({ x, y, size, width }) {
  const right = x + Math.max(1, width);
  const columns = [x + 0.5, (x + right) / 2, right - 0.5];
  const rows = [y + size * 0.18, y + size * 0.55];
  return columns.flatMap((column) => rows.map((row) => [column, row]));
}

/**
 * Every text-on-background pair a traced document actually paints.
 *
 * The pairs are read out of the paint log rather than declared by hand, so a new string picks up
 * its real background and a moved block cannot quietly leave the table behind. For each drawn
 * string the log is walked backwards from that draw to the first filled shape covering the
 * sample point, which is the colour a reader sees behind the glyphs.
 *
 * @param {PdfDocument} document built with `{ trace: true }`
 * @returns {Array<{page:number,text:string,size:number,weight:string,foreground:number[],background:number[]|null,foregroundHex:string,backgroundHex:string|null,backgroundKind:string}>}
 */
export function textBackgroundPairs(document) {
  const pairs = [];
  document.pages.forEach((page, pageIndex) => {
    const trace = page.trace;
    if (!trace) throw new Error('pdf_document_was_not_traced');
    trace.forEach((entry, position) => {
      if (entry.type !== 'text' || !entry.text.trim()) return;
      const seen = new Map();
      for (const [sampleX, sampleY] of samplePoints(entry)) {
        let found = null;
        for (let index = position - 1; index >= 0; index -= 1) {
          const candidate = trace[index];
          if (candidate.type === 'text') continue;
          if (contains(candidate.box, sampleX, sampleY)) { found = candidate; break; }
        }
        const kind = found ? found.type : 'unpainted';
        const key = found?.fill ? rgbToHex(found.fill) : kind;
        if (!seen.has(key)) seen.set(key, found);
      }
      for (const found of seen.values()) {
        pairs.push({
          page: pageIndex + 1,
          text: entry.text,
          size: entry.size,
          weight: entry.weight,
          foreground: entry.fill,
          background: found?.fill ?? null,
          foregroundHex: rgbToHex(entry.fill),
          backgroundHex: found?.fill ? rgbToHex(found.fill) : null,
          backgroundKind: found ? found.type : 'unpainted',
        });
      }
    });
  });
  return pairs;
}
