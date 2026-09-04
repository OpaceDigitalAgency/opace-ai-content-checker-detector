/**
 * Branded A4 PDF reports for the Opace AI Content Checker & Detector.
 *
 * `buildCheckerPdf` renders the complete evidence report required by
 * CROSS-SURFACE-WEBSITE-PARITY-ACCEPTANCE.md section 6.1: a vector dial gauge with five
 * coloured bands and a needle, section score bars, level chips, word-wrapped passages, a
 * running header and a "Page n of N" footer.
 *
 * `buildProvenancePdf` renders the content-free C2PA file-inspection report: hash, media type,
 * size, status, trust, issues and limits. It never carries the filename or any file bytes.
 *
 * Both are pure functions of their input plus the supplied options. Given the same result and
 * the same `generatedAt`, the bytes are identical. No fonts are downloaded and no Node or DOM
 * API is used: the built-in Helvetica core fonts are addressed through WinAnsi with the
 * documented Unicode fallback in pdf-writer.mjs.
 */

import { A4, PdfDocument, encodeWinAnsi, measureText, rgbToHex, textBackgroundPairs, wrapLines } from './pdf-writer.mjs';
import { PRODUCT_NAME, buildReportModel, countPhrase, humanise, inkFor, pluralise } from './report-model.mjs';

const MARGIN = 44;
const CONTENT_WIDTH = A4.width - MARGIN * 2;
const CONTENT_TOP = 760;
const CONTENT_BOTTOM = 62;
const HEADER_HEIGHT = 52;

const INK = [0.059, 0.067, 0.082];
const PAPER = [0.976, 0.965, 0.945];
const WHITE = [1, 1, 1];
const MUTED = [0.353, 0.376, 0.376];
const LINE = [0.827, 0.800, 0.757];
const SOFT = [0.925, 0.910, 0.886];
const ORANGE = [0.984, 0.439, 0.039];
const BLUE = [0.000, 0.408, 0.702];
const GREEN = [0.102, 0.451, 0.286];
const LIGHT_INK = [0.878, 0.871, 0.847];
const DIM_INK = [0.686, 0.706, 0.702];
const HIGHLIGHT = [1, 0.671, 0.451];

const STATUS_COLOURS = Object.freeze({
  pass: GREEN,
  attention: [0.749, 0.278, 0.020],
  fail: [0.639, 0.122, 0.090],
  error: [0.639, 0.122, 0.090],
  inconclusive: MUTED,
  unsupported: MUTED,
  not_configured: MUTED,
  not_run: MUTED,
});

const statusColour = (status) => STATUS_COLOURS[status] ?? MUTED;

/**
 * The colour to draw a string in when the design calls for an accent.
 *
 * The five band colours, the Opace orange and the link blue are a *fill* palette: they fill the
 * dial wedges, the score bars, the card spines and the chips, where area carries the meaning. At
 * caption sizes the same values fall under 4.5:1 on paper, so text resolves them to the matching
 * ink from `REPORT_INKS` — the values the printable HTML already uses for its light scheme. A
 * colour that is not in the fill palette is returned untouched, so the near-black body ink and
 * the muted grey are never lightened.
 */
const textInk = (fill) => inkFor(rgbToHex(fill))?.rgb ?? fill;

const ORANGE_INK = textInk(ORANGE);
const BLUE_INK = textInk(BLUE);

/** Flowing A4 layout: pages, running header, footer, and blocks that never overlap. */
class ReportLayout {
  constructor(document, { productName, subtitle, logoName }) {
    this.document = document;
    this.productName = productName;
    this.subtitle = subtitle;
    this.logoName = logoName;
    this.runningSection = 'Report';
    this.page = null;
    this.y = 0;
  }

  newPage(section = this.runningSection) {
    this.runningSection = section;
    this.page = this.document.addPage();
    this.page.rect(0, 0, A4.width, A4.height, PAPER);
    this.page.rect(0, A4.height - HEADER_HEIGHT, A4.width, HEADER_HEIGHT, INK);
    this.page.rect(0, A4.height - HEADER_HEIGHT - 3.5, A4.width, 3.5, ORANGE);
    let textLeft = MARGIN;
    if (this.logoName) {
      this.page.image(this.logoName, MARGIN, A4.height - 42, 30, 30);
      textLeft = MARGIN + 39;
    }
    this.page.text('OPACE', textLeft, A4.height - 24, { weight: 'bold', size: 13, fill: WHITE });
    this.page.text('AI CONTENT CHECKER & DETECTOR', textLeft, A4.height - 36, { weight: 'bold', size: 7.4, fill: HIGHLIGHT, characterSpacing: 1.1 });
    const label = encodeWinAnsi(this.runningSection).toUpperCase();
    this.page.text(label, A4.width - MARGIN - measureText(label, 'bold', 6.8, 0.5), A4.height - 31, { weight: 'bold', size: 6.8, fill: DIM_INK, characterSpacing: 0.5 });
    this.y = CONTENT_TOP;
    return this.page;
  }

  ensure(height, section = this.runningSection) {
    if (!this.page) { this.newPage(section); return; }
    if (this.y - height < CONTENT_BOTTOM) this.newPage(section);
  }

  gap(height) {
    this.y -= height;
  }

  /** Free height left on the current page. */
  get available() {
    return this.y - CONTENT_BOTTOM;
  }

  /** Wrapped paragraph flow; splits across pages one line at a time. */
  paragraph(value, { weight = 'regular', size = 8.8, leading = 11.8, fill = MUTED, x = MARGIN, width = CONTENT_WIDTH, gapAfter = 0, maxLines = 0 } = {}) {
    let lines = wrapLines(value, weight, size, width);
    if (maxLines > 0) lines = lines.slice(0, maxLines);
    for (const line of lines) {
      this.ensure(leading);
      this.page.text(line, x, this.y - size, { weight, size, fill });
      this.y -= leading;
    }
    if (lines.length) this.y -= gapAfter;
    return lines.length;
  }

  /**
   * Numbered part heading with an orange kicker rule.
   * `keepWith` reserves room for the first block underneath so a heading is never orphaned.
   */
  heading(number, title, intro, keepWith = 64) {
    const titleLines = wrapLines(title, 'bold', 18, CONTENT_WIDTH);
    const introLines = intro ? wrapLines(intro, 'regular', 8.8, CONTENT_WIDTH) : [];
    this.ensure(24 + titleLines.length * 21 + introLines.length * 11.6 + 14 + keepWith, title);
    this.runningSection = title;
    this.page.rect(MARGIN, this.y - 2, 22, 3, ORANGE);
    this.page.text(number, MARGIN + 30, this.y - 3, { weight: 'bold', size: 7.4, fill: ORANGE_INK, characterSpacing: 0.9 });
    this.y -= 20;
    for (const line of titleLines) {
      this.ensure(21);
      this.page.text(line, MARGIN, this.y - 18, { weight: 'bold', size: 18, fill: INK });
      this.y -= 21;
    }
    if (introLines.length) {
      this.y -= 3;
      this.paragraph(intro, { size: 8.8, leading: 11.6, fill: MUTED });
    }
    this.y -= 10;
  }

  /**
   * Panel with an accent spine, a title, an optional meta line and a body that can span pages.
   *
   * The body is plain text; three conventions give it structure without a markup language:
   * a short ALL-CAPS line becomes a bold accent sub-heading, a line starting "- " becomes a
   * hanging-indent bullet, and with `labelledRows` a "Label: value" line prints the label in
   * bold ink and hangs the value in its own column.
   */
  card(title, body, { accent = ORANGE, meta = '', fill = WHITE, section = this.runningSection, labelledRows = false } = {}) {
    const innerWidth = CONTENT_WIDTH - 34;
    // The spine keeps the accent fill; the meta line and the sub-headings take its ink.
    const accentInk = textInk(accent);
    const bodyLines = layoutCardBody(body ?? '', innerWidth, accentInk, labelledRows);
    const heightOf = (lines) => lines.reduce((total, line) => total + line.leading + line.spaceBefore, 0);
    let cursor = 0;
    let part = 0;
    do {
      const heading = part ? `${title} (continued)` : title;
      const titleLines = wrapLines(heading, 'bold', 11, innerWidth);
      const metaLines = meta && !part ? wrapLines(meta, 'bold', 7.2, innerWidth) : [];
      const fixed = 17 + titleLines.length * 13.6 + (metaLines.length ? metaLines.length * 9.2 + 5 : 0);
      const remaining = bodyLines.slice(cursor);
      // A short remainder is moved whole rather than split across a page break.
      if (this.available < fixed + 26 || (remaining.length <= 16 && this.available < fixed + heightOf(remaining) + 12)) {
        if (this.y < CONTENT_TOP) this.newPage(section);
      }
      const room = this.available - fixed - 12;
      const chunk = [];
      let used = 0;
      for (const line of remaining) {
        const next = used + line.leading + line.spaceBefore;
        if (chunk.length && next > room) break;
        chunk.push(line);
        used = next;
      }
      const height = fixed + used + 11;
      this.page.roundedRect(MARGIN, this.y - height, CONTENT_WIDTH, height, 3, fill, LINE, 0.55);
      this.page.rect(MARGIN, this.y - height, 3.6, height, accent);
      let cardY = this.y - 17;
      for (const line of titleLines) {
        this.page.text(line, MARGIN + 17, cardY, { weight: 'bold', size: 11, fill: INK });
        cardY -= 13.6;
      }
      for (const line of metaLines) {
        this.page.text(line, MARGIN + 17, cardY, { weight: 'bold', size: 7.2, fill: accentInk });
        cardY -= 9.2;
      }
      if (metaLines.length) cardY -= 5;
      for (const line of chunk) {
        cardY -= line.spaceBefore;
        if (line.label) this.page.text(line.label, MARGIN + 17, cardY, { weight: 'bold', size: line.size, fill: INK });
        this.page.text(line.text, MARGIN + 17 + line.indent, cardY, { weight: line.weight, size: line.size, fill: line.fill });
        cardY -= line.leading;
      }
      this.y -= height + 9;
      cursor += chunk.length;
      part += 1;
      if (cursor < bodyLines.length) this.newPage(section);
    } while (cursor < bodyLines.length);
  }
}

const LABEL_LINE = /^[A-Z][A-Z0-9 ,.'()/-]{2,46}$/u;
const LABELLED_ROW = /^([^:]{1,34}): (.+)$/su;

/** Turn a card body into styled, wrapped lines ready to place on a page. */
function layoutCardBody(body, innerWidth, accentInk, labelledRows) {
  const lines = [];
  const paragraphs = String(body ?? '').split('\n');
  paragraphs.forEach((paragraph, index) => {
    const value = paragraph.trim();
    if (!value) return;
    const first = lines.length === 0;
    if (LABEL_LINE.test(value)) {
      lines.push({ text: value, weight: 'bold', size: 7.2, fill: accentInk, leading: 10.4, indent: 0, spaceBefore: first ? 0 : 4, label: '' });
      return;
    }
    if (labelledRows) {
      const match = LABELLED_ROW.exec(value);
      if (match) {
        const label = `${match[1]}`;
        const column = Math.max(96, measureText(`${label}  `, 'bold', 8.6));
        const wrapped = wrapLines(match[2], 'regular', 8.6, innerWidth - column);
        wrapped.forEach((line, lineIndex) => {
          lines.push({
            text: line,
            weight: 'regular',
            size: 8.6,
            fill: MUTED,
            leading: 11.4,
            indent: column,
            spaceBefore: lineIndex === 0 && !first ? 1.6 : 0,
            label: lineIndex === 0 ? label : '',
          });
        });
        return;
      }
    }
    const isBullet = value.startsWith('- ');
    const indent = isBullet ? 9 : 0;
    const wrapped = wrapLines(isBullet ? value.slice(2) : value, 'regular', 8.6, innerWidth - indent);
    wrapped.forEach((line, lineIndex) => {
      lines.push({
        text: line,
        weight: 'regular',
        size: 8.6,
        fill: MUTED,
        leading: 11.4,
        indent,
        spaceBefore: lineIndex === 0 && !first && index > 0 ? 1.4 : 0,
        label: lineIndex === 0 && isBullet ? '-' : '',
      });
    });
  });
  return lines;
}

/** A rounded level chip: white bold text on the band colour. */
function drawChip(page, x, y, label, fillColour, size = 7.6) {
  const width = measureText(label, 'bold', size) + 15;
  const height = size + 8;
  page.roundedRect(x, y, width, height, height / 2, fillColour);
  page.text(label, x + 7.5, y + 5.6, { weight: 'bold', size, fill: WHITE });
  return width;
}

/**
 * Semicircular five-band dial, drawn as filled vector wedges.
 * The needle appears only when a trained model actually produced a reading; an unassessed run
 * shows the empty scale rather than a needle parked in the middle.
 */
function drawGauge(page, cx, cy, outerRadius, innerRadius, gauge, assessed) {
  const bands = gauge.bands;
  const span = 180 / bands.length;
  bands.forEach((band, index) => {
    const start = 180 - index * span - 1.2;
    const end = 180 - (index + 1) * span + 1.2;
    const grow = band.current ? 5 : 0;
    page.arcBand(cx, cy, innerRadius, outerRadius + grow, start, end, band.colour.rgb, 16);
  });
  if (!assessed) return;
  const angle = ((180 - gauge.position * 180) * Math.PI) / 180;
  const tip = outerRadius - 6;
  const base = 5.2;
  const normal = angle + Math.PI / 2;
  page.polygon(
    [
      [cx + tip * Math.cos(angle), cy + tip * Math.sin(angle)],
      [cx + base * Math.cos(normal), cy + base * Math.sin(normal)],
      [cx - base * Math.cos(normal), cy - base * Math.sin(normal)],
    ],
    WHITE
  );
  page.circle(cx, cy, 7, WHITE);
  page.circle(cx, cy, 3.2, INK);
}

/** Horizontal five-band legend under the dial. */
function drawGaugeLegend(page, x, y, width, gauge) {
  const cell = width / gauge.bands.length;
  gauge.bands.forEach((band, index) => {
    const left = x + index * cell;
    page.rect(left, y + 7, 13, 3.2, band.colour.rgb);
    const lines = wrapLines(band.label, 'bold', 5.6, cell - 20);
    lines.slice(0, 2).forEach((line, lineIndex) => {
      page.text(line, left + 17, y + 6 - lineIndex * 7, { weight: 'bold', size: 5.6, fill: band.current ? WHITE : DIM_INK, characterSpacing: 0.25 });
    });
  });
}

function drawHero(layout, model) {
  const height = 174;
  layout.ensure(height, 'Result summary');
  const page = layout.page;
  const top = layout.y;
  page.roundedRect(MARGIN, top - height, CONTENT_WIDTH, height, 4, INK);
  page.rect(MARGIN, top - height, 6, height, model.level.colour.rgb);

  drawGauge(page, MARGIN + 128, top - 140, 104, 68, model.gauge, model.assessed);
  drawGaugeLegend(page, MARGIN + 20, top - 164, CONTENT_WIDTH - 40, model.gauge);

  const left = MARGIN + 262;
  const width = CONTENT_WIDTH - 262 - 22;
  page.text('AI-PATTERN READING', left, top - 26, { weight: 'bold', size: 6.9, fill: DIM_INK, characterSpacing: 0.9 });
  let y = top - 50;
  for (const line of wrapLines(model.level.label, 'bold', 21, width).slice(0, 2)) {
    page.text(line, left, y, { weight: 'bold', size: 21, fill: WHITE });
    y -= 23;
  }
  const score = model.assessed ? `Score ${model.displayScore}` : 'No score recorded';
  page.text(score, left, y, { weight: 'bold', size: 10.5, fill: HIGHLIGHT });
  y -= 13;
  page.text('Zero-to-one pattern similarity, not a percentage', left, y, { weight: 'regular', size: 6.9, fill: DIM_INK });
  y -= 17;
  for (const line of wrapLines(model.meaning, 'regular', 8.6, width).slice(0, 5)) {
    page.text(line, left, y, { weight: 'regular', size: 8.6, fill: LIGHT_INK });
    y -= 11.4;
  }
  if (model.strongestSentence) {
    y -= 6;
    for (const line of wrapLines(model.strongestSentence, 'bold', 7.8, width).slice(0, 3)) {
      page.text(line, left, y, { weight: 'bold', size: 7.8, fill: HIGHLIGHT });
      y -= 10.2;
    }
  }
  layout.y -= height + 13;
}

/**
 * The three summary cards.
 *
 * The card used to be a fixed 96 pt tall and the detail was cut to three lines
 * to fit it, which printed the third card's sentence as "That is a comment on
 * the" and shaved the descenders off the other two. The card is measured from
 * its own longest content now: every card is the same height, that height is
 * whatever the tallest one needs, and no sentence is cut.
 */
function drawAxisCards(layout, model) {
  const gap = 9;
  const width = (CONTENT_WIDTH - gap * 2) / 3;
  const inner = width - 26;
  const drawn = model.axes.map((axis) => ({
    axis,
    valueLines: wrapLines(axis.value, 'bold', 11.5, inner).slice(0, 2),
    detailLines: wrapLines(axis.detail, 'regular', 7.4, inner),
  }));
  // Read straight off the drawing below: the last detail baseline sits at
  // 62 + 13.5·values + 9.4·(details − 1) under the card's top, and 12 pt of air
  // beneath it keeps a descender clear of the rule.
  const height = Math.max(96, ...drawn.map((card) => 64.6 + card.valueLines.length * 13.5 + card.detailLines.length * 9.4));
  layout.ensure(height + 12, 'Result summary');
  const page = layout.page;
  drawn.forEach((card, index) => {
    const x = MARGIN + index * (width + gap);
    page.roundedRect(x, layout.y - height, width, height, 3, WHITE, LINE, 0.55);
    page.rect(x, layout.y - height, 3.6, height, card.axis.colour.rgb);
    page.text(card.axis.label.toUpperCase(), x + 13, layout.y - 20, { weight: 'bold', size: 6.2, fill: MUTED, characterSpacing: 0.5 });
    let y = layout.y - 36;
    for (const line of card.valueLines) {
      page.text(line, x + 13, y, { weight: 'bold', size: 11.5, fill: INK });
      y -= 13.5;
    }
    drawChip(page, x + 13, y - 12, card.axis.statusLabel, statusColour(card.axis.status), 6.2);
    y -= 26;
    for (const line of card.detailLines) {
      page.text(line, x + 13, y, { weight: 'regular', size: 7.4, fill: MUTED });
      y -= 9.4;
    }
  });
  layout.y -= height + 12;
}

function drawStatTiles(layout, model) {
  const height = 44;
  layout.ensure(height + 10, 'Result summary');
  const page = layout.page;
  const gap = 8;
  const width = (CONTENT_WIDTH - gap * 3) / 4;
  const tiles = [
    ['DRAFT', model.draft.wordsPhrase],
    ['CHARACTERS', model.draft.characters],
    ['SECTIONS', String(model.draft.sectionCount || 'Not scored')],
    ['ROUTE', model.route.name],
  ];
  tiles.forEach(([label, value], index) => {
    const x = MARGIN + index * (width + gap);
    page.roundedRect(x, layout.y - height, width, height, 3, SOFT);
    page.text(label, x + 11, layout.y - 15, { weight: 'bold', size: 6, fill: MUTED, characterSpacing: 0.5 });
    wrapLines(value, 'bold', 8.6, width - 22).slice(0, 2).forEach((line, lineIndex) => {
      page.text(line, x + 11, layout.y - 27 - lineIndex * 10, { weight: 'bold', size: 8.6, fill: INK });
    });
  });
  layout.y -= height + 12;
}

function drawSectionBars(layout, model) {
  const page = layout.page;
  const labelWidth = 74;
  const trackLeft = MARGIN + labelWidth;
  const trackWidth = 250;
  for (const section of model.sections) {
    layout.ensure(30, 'Section scores');
    const y = layout.y - 12;
    layout.page.text(`Section ${section.number}`, MARGIN, y, { weight: 'bold', size: 8.4, fill: INK });
    layout.page.roundedRect(trackLeft, y - 2, trackWidth, 8, 4, SOFT);
    layout.page.roundedRect(trackLeft, y - 2, Math.max(8, trackWidth * section.barFill), 8, 4, section.level.colour.rgb);
    layout.page.text(section.displayScore, trackLeft + trackWidth + 12, y, { weight: 'bold', size: 8.4, fill: INK });
    layout.page.text(section.level.label, trackLeft + trackWidth + 48, y, { weight: 'bold', size: 7.8, fill: textInk(section.level.colour.rgb) });
    const words = section.wordsPhrase ?? '';
    const suffix = section.strongest ? `${words}${words ? '  |  ' : ''}strongest section` : words;
    if (suffix) layout.page.text(suffix, trackLeft, y - 11, { weight: 'regular', size: 6.8, fill: MUTED });
    layout.y -= 30;
  }
  void page;
}

function drawSectionEvidence(layout, model) {
  for (const section of model.sections) {
    const passage = section.passage || `Content-free locator only: ${section.locator}.`;
    const evidence = section.evidence.length
      ? section.evidence.map((item) => `- ${item}`).join('\n')
      : 'No explanatory evidence was recorded for this section.';
    const body = [
      'THE SCORED PASSAGE',
      passage,
      'WHY IT READS THIS WAY',
      evidence,
      section.strongest ? 'This is the strongest scored section; it set the overall reading.' : '',
    ].filter(Boolean).join('\n');
    const meta = [
      `${section.level.label}  |  score ${section.displayScore}`,
      section.wordsPhrase ?? '',
      `engine index ${section.index}`,
      section.rawMargin === null ? '' : `raw margin ${section.rawMarginText}`,
      `location ${section.locator}`,
    ].filter(Boolean).join('  |  ');
    layout.card(`Section ${section.number} of ${model.sections.length}`, body, {
      accent: section.level.colour.rgb,
      meta,
      section: 'Section evidence',
    });
  }
}

const bullet = (values) => values.map((value) => `- ${value}`).join('\n');

/** Two-column "What this means / What this does not mean" panel. */
function drawMeaningPanel(layout, model) {
  const panel = model.meansPanel;
  const gap = 12;
  const columnWidth = (CONTENT_WIDTH - gap) / 2 - 26;
  const wrapColumn = (title, items) => [
    { text: title.toUpperCase(), weight: 'bold', size: 6.8, fill: MUTED, leading: 13 },
    ...items.flatMap((item) => wrapLines(item, 'regular', 8.4, columnWidth).map((line, index) => ({
      text: line, weight: 'regular', size: 8.4, fill: INK, leading: 11.2, spaceBefore: index === 0 ? 3 : 0,
    }))),
  ];
  const left = wrapColumn(panel.meansTitle, panel.means);
  const right = wrapColumn(panel.notTitle, panel.not);
  const columnHeight = (lines) => lines.reduce((total, line) => total + line.leading + (line.spaceBefore ?? 0), 0);
  const height = Math.max(columnHeight(left), columnHeight(right)) + 26;
  layout.ensure(height + 10, 'Reliability and limits');
  const page = layout.page;
  const top = layout.y;
  page.roundedRect(MARGIN, top - height, CONTENT_WIDTH, height, 3, SOFT);
  [left, right].forEach((lines, column) => {
    const x = MARGIN + 18 + column * ((CONTENT_WIDTH - gap) / 2 + gap);
    let y = top - 17;
    for (const line of lines) {
      y -= line.spaceBefore ?? 0;
      page.text(line.text, x, y, { weight: line.weight, size: line.size, fill: line.fill });
      y -= line.leading;
    }
  });
  layout.y -= height + 10;
}

/**
 * Build the complete checker PDF.
 *
 * @param {object} result canonical checker-result payload
 * @param {object} [options]
 * @param {Uint8Array} [options.logoJpegBytes] product logo as JPEG bytes for the running header
 * @param {string} [options.generatedAt] ISO timestamp; fixes the printed date and the PDF creation date
 * @param {string} [options.productUrl] canonical product and support destination
 * @param {string} [options.surfaceName] surface that produced the report
 * @param {string} [options.privacyStatement] surface-specific route and privacy sentence
 * @param {string} [options.fullText] complete submitted draft for the optional appendix
 * @returns {Uint8Array}
 */
export function buildCheckerPdf(result, options = {}) {
  return composeCheckerPdf(result, options).build();
}

/**
 * Every text-on-background pair the checker PDF paints, read out of the writer's own paint log.
 * The contrast test walks this rather than a hand-kept table, so a new string or a moved block
 * is checked automatically.
 */
export function checkerPdfTextPairs(result, options = {}) {
  return textBackgroundPairs(composeCheckerPdf(result, { ...options, trace: true }));
}

/** Lay out the checker report and return the document, unserialised. */
function composeCheckerPdf(result, options = {}) {
  const model = buildReportModel(result, options);
  const document = new PdfDocument({
    title: `${PRODUCT_NAME} report`,
    author: 'Opace Digital Agency',
    subject: 'Complete AI content checker result, evidence and run record',
    creator: PRODUCT_NAME,
    creationDate: model.generatedAt,
    trace: options.trace === true,
  });
  const hasLogo = options.logoJpegBytes ? document.addJpeg('Logo', options.logoJpegBytes) : false;
  const layout = new ReportLayout(document, { productName: PRODUCT_NAME, subtitle: model.title, logoName: hasLogo ? 'Logo' : null });

  layout.newPage('Result summary');
  layout.page.text(model.title, MARGIN, layout.y - 22, { weight: 'bold', size: 23, fill: INK });
  layout.y -= 30;
  layout.page.text(`${model.surfaceName}  |  ${model.dateLabel}`, MARGIN, layout.y - 8, { weight: 'regular', size: 8.4, fill: MUTED });
  layout.y -= 15;
  layout.page.text(model.productUrl, MARGIN, layout.y - 8, { weight: 'bold', size: 7.6, fill: BLUE_INK });
  layout.y -= 18;

  drawHero(layout, model);
  drawAxisCards(layout, model);
  drawStatTiles(layout, model);
  layout.card('How to read this result', [
    model.honestyLine,
    model.scoreScale,
    'Character checks and writing suggestions are separate readings. Neither can raise or lower the AI-pattern reading.',
    model.route.privacy,
  ].join('\n'), { accent: model.level.colour.rgb, section: 'Result summary' });

  layout.heading('01', 'Section scores', 'Every scored section appears in document order. The bar shows how far the section leans away from the middle of the scale; the printed number is the display score taken straight from the result, never recalculated here.');
  if (model.sections.length) drawSectionBars(layout, model);
  else layout.card('No section scores', 'The trained model did not produce section scores for this run. The remaining checks and the run record are still complete.', { accent: MUTED, section: 'Section scores' });

  layout.heading('02', 'Section evidence', 'The complete scored passage is printed for every section, with the evidence that explains the reading. Evidence describes the reading; it did not set the score.');
  if (model.sections.length) drawSectionEvidence(layout, model);
  else layout.card('No scored passages', `${model.modelReason || 'No trained model reading is available.'} Nothing is inferred from the other checks to fill the gap.`, { accent: MUTED, section: 'Section evidence' });

  layout.heading('03', 'Characters, writing and protected facts', 'These findings come from separate deterministic checks. They are evidence in their own right and they never change the AI-pattern reading.');
  layout.card('Invisible and lookalike characters', [
    `${model.axes[1].value}. ${model.axes[1].detail}`,
    model.characterFindings.length ? bullet(model.characterFindings) : 'No text-integrity finding was recorded.',
    model.axes[1].limitations.length ? `LIMITS\n${bullet(model.axes[1].limitations)}` : '',
  ].filter(Boolean).join('\n'), { accent: BLUE, meta: model.axes[1].statusLabel, section: 'Separate findings' });
  layout.card('Writing suggestions', [
    `${model.axes[2].value}. ${model.axes[2].detail}`,
    model.writingFindings.length ? bullet(model.writingFindings) : 'No editorial finding was recorded.',
    model.axes[2].limitations.length ? `LIMITS\n${bullet(model.axes[2].limitations)}` : '',
  ].filter(Boolean).join('\n'), { accent: MUTED, meta: model.axes[2].statusLabel, section: 'Separate findings' });
  layout.card('Facts kept safe', [
    model.protectedFacts.sentence,
    model.protectedFacts.categoriesSentence,
    'Names, organisations, figures, dates, links, quotations, citations and code are independent evidence. They never imply authorship.',
  ].join('\n'), { accent: BLUE, section: 'Separate findings' });

  layout.heading('04', 'Content Credentials and watermarks', 'File and text credentials, and public watermark-key results, are recorded separately from the AI-pattern reading. An absent credential proves nothing about how a text was written.');
  if (model.c2paText) {
    layout.card('C2PA text credential', [
      `Status: ${model.c2paText.status}.`,
      `Wrapper protected: ${model.c2paText.wrapperProtected ? 'yes' : 'no'}.`,
      model.c2paText.limitations.length ? `LIMITS\n${bullet(model.c2paText.limitations)}` : '',
    ].filter(Boolean).join('\n'), { accent: BLUE, section: 'Credentials and watermarks' });
  }
  if (model.c2paFiles.length) {
    for (const file of model.c2paFiles) {
      layout.card(file.label, [
        `Status: ${file.status}. Trust: ${file.trust}.`,
        `Media type: ${file.mediaType}`,
        `File hash: ${file.fileHash}`,
        file.limitations.length ? `LIMITS\n${bullet(file.limitations)}` : '',
      ].filter(Boolean).join('\n'), { accent: BLUE, section: 'Credentials and watermarks' });
    }
  } else {
    layout.card('File Content Credentials', 'No file-origin result was attached to this text run. Pasted text is never given a file provenance verdict.', { accent: MUTED, section: 'Credentials and watermarks' });
  }
  for (const watermark of model.watermarks) {
    layout.card(watermark.name, [
      `Outcome: ${watermark.outcome}.`,
      `Key scope: ${watermark.keyScope}.`,
      watermark.limitations.length ? `LIMITS\n${bullet(watermark.limitations)}` : '',
    ].filter(Boolean).join('\n'), { accent: statusColour(watermark.status), meta: `${watermark.id}  |  ${watermark.statusLabel}`, section: 'Credentials and watermarks' });
  }

  layout.heading('05', 'Checks included in this run', `${model.methodsPhrase} ran. ${pluralise(model.methods.length, 'It is', 'Each is')} recorded with its outcome, where it ran, its version and its limitations. A check that did not run is never counted as a pass.`);
  for (const method of model.methods) {
    layout.card(method.name, [
      `Identifier: ${method.id}`,
      `Version: ${method.version}`,
      `Ran: ${method.location}`,
      `Started: ${method.startedAt}`,
      `Completed: ${method.completedAt}`,
      `Evidence: ${method.evidence}`,
      method.limitations.length ? `LIMITS\n${bullet(method.limitations)}` : '',
    ].filter(Boolean).join('\n'), { accent: statusColour(method.status), meta: `${method.statusLabel}  |  ${method.location}`, section: 'Checks in this run' });
  }

  layout.heading('06', 'Reliability, limits and correct use', 'This report records what the named checks found in one run. It does not prove authorship, guarantee that writing is human, or clear a private watermark key.');
  drawMeaningPanel(layout, model);
  layout.card('How to use this report', bullet([...model.correctUse, model.pdfCharacterNote]), { accent: ORANGE, section: 'Reliability and limits' });
  layout.card('Recorded limitations', bullet([...model.limitations]), { accent: statusColour('attention'), section: 'Reliability and limits' });

  if (typeof options.fullText === 'string' && options.fullText.trim()) {
    layout.heading('07', 'The complete checked draft', 'This content-bearing appendix is written only after an explicit download action. Nothing is clipped or replaced with an ellipsis.');
    layout.card('Full submitted text', options.fullText, { accent: INK, meta: `${model.draft.wordsPhrase}  |  ${model.draft.charactersPhrase}`, section: 'Complete checked draft' });
  }

  layout.heading(options.fullText ? '08' : '07', 'Run record and support', 'The identities below are what another person needs to reproduce and interpret this result.');
  layout.card('Run record', model.runRecord.map(([label, value]) => `${label}: ${value}`).join('\n'), { accent: INK, section: 'Run record', labelledRows: true });
  layout.card('Product and support', [
    `${PRODUCT_NAME} - ${model.strapline}`,
    model.productUrl,
    `Reported from: ${model.surfaceName}`,
  ].join('\n'), { accent: ORANGE, section: 'Run record' });

  drawFooters(document, model.dateLabel);
  return document;
}

function drawFooters(document, dateText) {
  const total = document.pages.length;
  document.pages.forEach((page, index) => {
    page.line(MARGIN, 44, A4.width - MARGIN, 44, LINE, 0.55);
    page.text(`opace.agency  |  ${PRODUCT_NAME}  |  ${dateText}`, MARGIN, 31, { weight: 'regular', size: 6.6, fill: MUTED });
    const label = `Page ${index + 1} of ${total}`;
    page.text(label, A4.width - MARGIN - measureText(label, 'bold', 6.6), 31, { weight: 'bold', size: 6.6, fill: MUTED });
  });
}

/** Filename for the complete checker PDF. */
export function checkerPdfFilename(generatedAt) {
  const parsed = new Date(generatedAt);
  const stamp = Number.isNaN(parsed.getTime()) ? 'undated' : parsed.toISOString().slice(0, 10);
  return `opace-ai-content-checker-detector-${stamp}.pdf`;
}

const PROVENANCE_STATUSES = new Set(['present', 'absent', 'invalid', 'untrusted', 'error', 'unsupported']);

/**
 * Build the content-free C2PA file-inspection record.
 * The filename and the file bytes never enter the record.
 */
export function buildProvenanceExport(file, result, generatedAt = '1970-01-01T00:00:00Z') {
  if (
    !result ||
    !PROVENANCE_STATUSES.has(result.status) ||
    !/^sha256:[0-9a-f]{64}$/u.test(result.file_hash || '') ||
    !Number.isInteger(file?.size) ||
    file.size < 0 ||
    file.size > 20 * 1024 * 1024
  ) {
    throw new Error('The provenance result is not safe to export.');
  }
  return Object.freeze({
    schema_version: 'oaci-provenance-report:1',
    generated_at: generatedAt,
    contains_content: false,
    product: PRODUCT_NAME,
    file: { hash: result.file_hash, media_type: result.media_type, size_bytes: file.size },
    provenance: {
      status: result.status,
      trust: result.trust,
      reason: result.reason,
      manifest_summary: result.manifest_summary || null,
      issues: Array.isArray(result.issues) ? result.issues : [],
      limitations: Array.isArray(result.limitations) ? result.limitations : [],
    },
  });
}

/** Plain-text rendering of the provenance record, kept for share and receipt surfaces. */
export function provenanceReportText(record) {
  return [
    PRODUCT_NAME,
    'File Content Credentials report',
    `Status: ${record.provenance.status}`,
    `Trust: ${record.provenance.trust}`,
    `File type: ${record.file.media_type}`,
    `File size: ${record.file.size_bytes} ${pluralise(record.file.size_bytes, 'byte')}`,
    `File hash: ${record.file.hash}`,
    `Created: ${record.generated_at}`,
    '',
    'Result',
    record.provenance.reason,
    '',
    'Manifest summary',
    JSON.stringify(record.provenance.manifest_summary || { recorded: false }),
    '',
    'Validation issues',
    ...(record.provenance.issues.length
      ? record.provenance.issues.map((item) => `${item.code}: ${item.explanation || 'No explanation recorded'}`)
      : ['None recorded']),
    '',
    'Limits of this check',
    ...record.provenance.limitations,
    '',
    'The file itself is not embedded in this report. Certificate trust lists, remote manifests and online certificate status were not fetched.',
  ].join('\n');
}

const PROVENANCE_ACCENTS = Object.freeze({
  present: GREEN,
  absent: MUTED,
  invalid: [0.639, 0.122, 0.090],
  untrusted: [0.749, 0.278, 0.020],
  error: [0.639, 0.122, 0.090],
  unsupported: MUTED,
});

/**
 * Every fill a chip can be handed: the eight named check statuses and the six provenance states.
 * Chip text is white, so the contrast test measures white against each of these directly rather
 * than waiting for a fixture to happen to reach that state.
 */
export const PDF_CHIP_FILLS = Object.freeze([
  ...new Map(
    [...Object.values(STATUS_COLOURS), ...Object.values(PROVENANCE_ACCENTS)].map((fill) => [rgbToHex(fill), fill]),
  ).values(),
]);

/**
 * Build the branded, content-free C2PA file-inspection PDF.
 *
 * @param {object} record output of buildProvenanceExport
 * @param {object} [options]
 * @param {Uint8Array} [options.logoJpegBytes]
 * @returns {Uint8Array}
 */
export function buildProvenancePdf(record, options = {}) {
  return composeProvenancePdf(record, options).build();
}

/** Every text-on-background pair the provenance PDF paints. See `checkerPdfTextPairs`. */
export function provenancePdfTextPairs(record, options = {}) {
  return textBackgroundPairs(composeProvenancePdf(record, { ...options, trace: true }));
}

/** Lay out the provenance report and return the document, unserialised. */
function composeProvenancePdf(record, options = {}) {
  if (!record?.provenance || !record?.file) throw new Error('The provenance record is not printable.');
  const accent = PROVENANCE_ACCENTS[record.provenance.status] ?? MUTED;
  const document = new PdfDocument({
    title: `${PRODUCT_NAME} - File Content Credentials report`,
    author: 'Opace Digital Agency',
    subject: 'Content-free C2PA file inspection record',
    creator: PRODUCT_NAME,
    creationDate: record.generated_at,
    trace: options.trace === true,
  });
  const hasLogo = options.logoJpegBytes ? document.addJpeg('Logo', options.logoJpegBytes) : false;
  const layout = new ReportLayout(document, { productName: PRODUCT_NAME, subtitle: 'File Content Credentials report', logoName: hasLogo ? 'Logo' : null });

  layout.newPage('File Content Credentials');
  layout.page.text('File Content Credentials report', MARGIN, layout.y - 21, { weight: 'bold', size: 22, fill: INK });
  layout.y -= 29;
  layout.page.text(`${PRODUCT_NAME}  |  Created ${record.generated_at}`, MARGIN, layout.y - 8, { weight: 'regular', size: 8.2, fill: MUTED });
  layout.y -= 20;

  const heroHeight = 92;
  layout.ensure(heroHeight + 12);
  layout.page.roundedRect(MARGIN, layout.y - heroHeight, CONTENT_WIDTH, heroHeight, 4, INK);
  layout.page.rect(MARGIN, layout.y - heroHeight, 6, heroHeight, accent);
  layout.page.text('CREDENTIAL STATUS', MARGIN + 22, layout.y - 22, { weight: 'bold', size: 6.8, fill: DIM_INK, characterSpacing: 0.9 });
  layout.page.text(humanise(record.provenance.status), MARGIN + 22, layout.y - 48, { weight: 'bold', size: 20, fill: WHITE });
  drawChip(layout.page, MARGIN + 22, layout.y - 74, `Trust: ${humanise(record.provenance.trust)}`, accent, 7);
  wrapLines(record.provenance.reason ?? '', 'regular', 8.4, CONTENT_WIDTH - 250).slice(0, 5).forEach((line, index) => {
    layout.page.text(line, MARGIN + 250, layout.y - 30 - index * 11.2, { weight: 'regular', size: 8.4, fill: LIGHT_INK });
  });
  layout.y -= heroHeight + 14;

  layout.card('The file that was inspected', [
    `File type: ${record.file.media_type}`,
    `File size: ${record.file.size_bytes} ${pluralise(record.file.size_bytes, 'byte')}`,
    `File hash: ${record.file.hash}`,
    'The filename and the file bytes are deliberately absent from this report.',
  ].join('\n'), { accent: BLUE, meta: 'CONTENT-FREE RECORD', section: 'File Content Credentials' });

  layout.card('Manifest summary', JSON.stringify(record.provenance.manifest_summary || { recorded: false }), { accent: MUTED, section: 'File Content Credentials' });

  layout.card('Validation issues', record.provenance.issues.length
    ? [`${countPhrase(record.provenance.issues.length, 'validation issue')} ${pluralise(record.provenance.issues.length, 'was', 'were')} recorded.`,
       ...record.provenance.issues.map((item) => `- ${item.code}: ${item.explanation || 'No explanation recorded'}`)].join('\n')
    : 'None recorded.', { accent, section: 'File Content Credentials' });

  layout.card('Limits of this check', [
    ...(record.provenance.limitations.length ? record.provenance.limitations.map((item) => `- ${item}`) : ['- No additional limitation was recorded.']),
    '',
    'The file itself is not embedded in this report. Certificate trust lists, remote manifests and online certificate status were not fetched.',
    'Content Credentials describe how a file was made and edited. Their absence proves nothing about how a file was made.',
  ].join('\n'), { accent: ORANGE, section: 'File Content Credentials' });

  drawFooters(document, record.generated_at.slice(0, 10));
  return document;
}

/** Filename for the provenance PDF. */
export function provenancePdfFilename(generatedAt) {
  return `opace-content-credentials-${String(generatedAt).slice(0, 10)}.pdf`;
}
