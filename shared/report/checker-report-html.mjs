/**
 * The complete printable HTML report.
 *
 * One self-contained A4 document: inline CSS, an inline SVG dial gauge and the product logo as
 * an embedded data URI. Nothing is fetched at render or at print time, no web font is loaded,
 * and there are no buttons, links to controls or `data-oaci-noprint` elements, because this
 * document is the export rather than the interactive result view.
 *
 * The content matches CROSS-SURFACE-WEBSITE-PARITY-ACCEPTANCE.md section 6.1 item for item, so
 * Astro, the CLI and the Python engine can publish the same evidence as the WordPress and
 * Chrome PDFs.
 */

import { LOGO_PNG_96_DATA_URI } from './logo.mjs';
import { LEVEL_COLOURS, LEVEL_ORDER, REPORT_INKS, buildReportModel, toneOf } from './report-model.mjs';

/** Escape a value for HTML text and double-quoted attribute contexts. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

/*
 * The band palette is drawn as a fill: it colours the dial wedges, the bar fills, the card rules
 * and the chips. Small bold text needs a darker (light scheme) or lighter (dark scheme) shade of
 * the same family to reach 4.5:1, so each fill maps to a tone name (`toneOf`, shared with the
 * PDF) and the stylesheet resolves that tone to the readable ink for the current colour scheme.
 * The fills themselves never change, which is why the PDF, the dial and Lane D1 stay in step.
 * The light inks below come straight from `REPORT_INKS`, so the two renderers cannot drift.
 */

const polar = (cx, cy, radius, degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy - radius * Math.sin(radians)];
};

/** One filled band of the dial, as an SVG path. */
function bandPath(cx, cy, inner, outer, startDegrees, endDegrees) {
  const [ox1, oy1] = polar(cx, cy, outer, startDegrees);
  const [ox2, oy2] = polar(cx, cy, outer, endDegrees);
  const [ix2, iy2] = polar(cx, cy, inner, endDegrees);
  const [ix1, iy1] = polar(cx, cy, inner, startDegrees);
  const sweep = Math.abs(endDegrees - startDegrees) > 180 ? 1 : 0;
  return [
    `M ${ox1.toFixed(2)} ${oy1.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${sweep} 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)}`,
    `L ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${sweep} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
    'Z',
  ].join(' ');
}

/**
 * Inline SVG dial: five coloured bands and a needle. Decorative, with a text alternative.
 *
 * The legend is NOT drawn inside the dial's own box. Beside a 300 px dial the five band
 * names sat on the same lines as the hero's own sentences — "Strongly AI" ended a legend
 * cell four pixels from "The strongest evidence is in section 2 of 2, which scored 0.969
 * and sits in the Strongly AI band", and the two read as one collided row at every width
 * between about 560 and 800 CSS px. The legend is now its own full-width row underneath
 * both the dial and the hero text (`renderGaugeLegend`), so no band name can ever share a
 * line with the verdict copy, and each name gets a fifth of the hero rather than a fifth
 * of the dial.
 */
function renderGauge(model) {
  const cx = 150;
  const cy = 132;
  const inner = 72;
  const outer = 116;
  const span = 180 / LEVEL_ORDER.length;
  const bands = model.gauge.bands.map((band, index) => {
    const start = 180 - index * span - 1.4;
    const end = 180 - (index + 1) * span + 1.4;
    const grow = band.current ? 7 : 0;
    return `<path d="${bandPath(cx, cy, inner, outer + grow, start, end)}" fill="${band.colour.hex}"${band.current ? ' class="oaci-band-current"' : ' opacity="0.82"'}></path>`;
  }).join('');
  const angle = 180 - model.gauge.position * 180;
  const [tipX, tipY] = polar(cx, cy, outer - 12, angle);
  const [leftX, leftY] = polar(cx, cy, 6, angle + 90);
  const [rightX, rightY] = polar(cx, cy, 6, angle - 90);
  const needle = model.assessed
    ? `<polygon points="${tipX.toFixed(2)},${tipY.toFixed(2)} ${leftX.toFixed(2)},${leftY.toFixed(2)} ${rightX.toFixed(2)},${rightY.toFixed(2)}" fill="#fff"></polygon><circle cx="${cx}" cy="${cy}" r="9" fill="#fff"></circle><circle cx="${cx}" cy="${cy}" r="3.6" fill="#0f1115"></circle>`
    : '';
  const alternative = model.assessed
    ? `AI-pattern dial: ${model.level.label}, display score ${model.displayScore} on a zero-to-one pattern-similarity scale.`
    : 'AI-pattern dial: no trained model reading is available for this run.';
  return `<div class="oaci-gauge">
      <svg viewBox="0 0 300 150" role="img" aria-label="${escapeHtml(alternative)}" focusable="false"><g>${bands}${needle}</g></svg>
    </div>`;
}

/**
 * The five band names, as their own row across the whole hero. A list rather than a caption:
 * it is a key to the scale, it is read in order, and it no longer belongs to the dial's box.
 */
function renderGaugeLegend(model) {
  const items = model.gauge.bands
    .map((band) => `<li${band.current ? ' data-current="true"' : ''}><i style="background:${band.colour.hex}"></i>${escapeHtml(band.label)}</li>`)
    .join('');
  return `<ul class="oaci-gauge-legend" aria-label="The five bands of the scale, from likely human to strongly AI">${items}</ul>`;
}

/**
 * Markup for the logo slot.
 *
 * `img` is the default and prints reliably everywhere. `background` produces the same 96 px mark
 * as a CSS background, for a surface whose own tests forbid `<img>` and `src=` outright.
 */
export function logoMarkHtml(dataUri = LOGO_PNG_96_DATA_URI, style = 'img') {
  if (style === 'background') return `<span class="oaci-mark" role="presentation" style="background-image:url(${escapeHtml(dataUri)})"></span>`;
  return `<img class="oaci-mark" src="${escapeHtml(dataUri)}" alt="" width="96" height="96">`;
}

const listOf = (items, className = '') =>
  items.length ? `<ul${className ? ` class="${className}"` : ''}>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '';

const paragraphs = (values) => values.filter(Boolean).map((value) => `<p>${escapeHtml(value)}</p>`).join('');

function renderSections(model) {
  if (!model.sections.length) {
    return `<div class="oaci-note"><h3>No scored passages</h3><p>${escapeHtml(model.modelReason || 'No trained model reading is available for this run.')}</p><p>Nothing is inferred from the other checks to fill that gap.</p></div>`;
  }
  const bars = model.sections.map((section) => `<li data-tone="${toneOf(section.level.colour)}">
        <span class="oaci-bar-label">Section ${section.number}</span>
        <span class="oaci-bar-track"><i style="width:${(section.barFill * 100).toFixed(1)}%;background:${section.level.colour.hex}"></i></span>
        <b>${escapeHtml(section.displayScore)}</b>
        <em>${escapeHtml(section.level.label)}</em>
        <small>${escapeHtml(section.wordsPhrase ?? '')}${section.strongest ? ' &middot; strongest section' : ''}</small>
      </li>`).join('');

  const cards = model.sections.map((section) => `<article class="oaci-section" data-tone="${toneOf(section.level.colour)}" style="--oaci-accent:${section.level.colour.hex}">
        <header>
          <h3>Inside section ${section.number} of ${model.sections.length}</h3>
          <p class="oaci-chips"><span class="oaci-chip">${escapeHtml(section.level.label)}</span><span class="oaci-score">Score ${escapeHtml(section.displayScore)}</span></p>
        </header>
        <p class="oaci-meta">${escapeHtml([
          section.wordsPhrase ?? '',
          `engine index ${section.index}`,
          section.rawMargin === null ? '' : `raw margin ${section.rawMarginText}`,
          section.locator,
        ].filter(Boolean).join(' · '))}</p>
        <blockquote>${escapeHtml(section.passage || `Content-free locator only: ${section.locator}.`)}</blockquote>
        <h4>Why it reads this way</h4>
        ${section.evidence.length ? listOf([...section.evidence]) : '<p>No explanatory evidence was recorded for this section.</p>'}
        ${section.strongest ? '<p class="oaci-strongest">This is the strongest scored section. It set the overall reading.</p>' : ''}
      </article>`).join('');

  return `<ol class="oaci-bars">${bars}</ol>${cards}`;
}

/**
 * The checks table has five columns of real sentences, so below roughly 480 CSS px its minimum
 * content width is wider than the column it sits in. Without a wrapper the page itself scrolls
 * sideways; with one the table scrolls inside its own box. A box that scrolls has to be reachable
 * from the keyboard and has to carry a name, or a keyboard-only reader cannot read what is in it,
 * so the wrapper is a named, focusable group. Printing restores `overflow: visible` so no row is
 * clipped at a page break.
 */
function renderChecks(model) {
  return `<div class="oaci-scroll" tabindex="0" role="group" aria-label="Checks included in this run. Scroll sideways to read every column.">
    <table class="oaci-table">
      <caption>${escapeHtml(model.methodsPhrase)} in this run, with the outcome, where it ran, the version and the limits</caption>
      <thead><tr><th scope="col">Check</th><th scope="col">Outcome</th><th scope="col">Ran</th><th scope="col">Version</th><th scope="col">Limits</th></tr></thead>
      <tbody>${model.methods.map((method) => `<tr>
        <th scope="row">${escapeHtml(method.name)}<span>${escapeHtml(method.id)}</span></th>
        <td>${escapeHtml(method.statusLabel)}</td>
        <td>${escapeHtml(method.location)}</td>
        <td>${escapeHtml(method.version)}</td>
        <td>${method.limitations.length ? listOf([...method.limitations]) : 'None recorded'}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

/**
 * Build the complete printable HTML report.
 *
 * @param {object} result canonical checker-result payload
 * @param {object} [options]
 * @param {string} [options.logoDataUri] product mark; defaults to the embedded 96 px PNG
 * @param {'img'|'background'} [options.logoStyle] how the mark is drawn; "background" avoids <img> and src=
 * @param {string} [options.logoHtml] complete markup for the logo slot, used instead of both
 * @param {string} [options.sourceText] the local draft; section passages are sliced from it
 * @param {string} [options.generatedAt] ISO timestamp for the printed date
 * @param {string} [options.productUrl] canonical product and support destination
 * @param {string} [options.surfaceName] surface that produced the report
 * @param {string} [options.privacyStatement] surface-specific route and privacy sentence
 * @param {string} [options.fullText] complete submitted draft for the optional appendix
 * @param {boolean} [options.fragment] return only the <article>, without the document shell
 * @returns {string}
 */
export function buildCheckerReportHtml(result, options = {}) {
  const model = buildReportModel(result, options);
  const logo = typeof options.logoDataUri === 'string' && options.logoDataUri ? options.logoDataUri : LOGO_PNG_96_DATA_URI;
  const mark = typeof options.logoHtml === 'string' ? options.logoHtml : logoMarkHtml(logo, options.logoStyle === 'background' ? 'background' : 'img');

  const body = `<article class="oaci-report">
    <header class="oaci-masthead">
      ${mark}
      <div>
        <p class="oaci-kicker">${escapeHtml(model.productName)}</p>
        <h1>${escapeHtml(model.title)}</h1>
        <p class="oaci-masthead-meta">${escapeHtml(model.surfaceName)} &middot; ${escapeHtml(model.dateLabel)}</p>
        <p class="oaci-masthead-link">${escapeHtml(model.productUrl)}</p>
      </div>
      <p class="oaci-strapline">${escapeHtml(model.strapline)}</p>
    </header>

    <section class="oaci-verdict" aria-labelledby="oaci-verdict-heading" style="--oaci-accent:${model.level.colour.hex}">
      ${renderGauge(model)}
      <div class="oaci-verdict-body">
        <p class="oaci-kicker">AI-pattern reading</p>
        <h2 id="oaci-verdict-heading">${escapeHtml(model.level.label)}</h2>
        <p class="oaci-verdict-score">${escapeHtml(model.assessed ? `Score ${model.displayScore}` : 'No score recorded')}</p>
        <p class="oaci-verdict-scale">${escapeHtml(model.scoreScale)}</p>
        <p class="oaci-verdict-meaning">${escapeHtml(model.meaning)}</p>
        ${model.strongestSentence ? `<p class="oaci-verdict-strongest">${escapeHtml(model.strongestSentence)}</p>` : ''}
      </div>
      ${renderGaugeLegend(model)}
    </section>

    <section class="oaci-axes" aria-label="Three independent readings">
      ${model.axes.map((axis) => `<article data-tone="${toneOf(axis.colour)}" style="--oaci-accent:${axis.colour.hex}">
        <p class="oaci-kicker">${escapeHtml(axis.label)}</p>
        <h3>${escapeHtml(axis.value)}</h3>
        <p class="oaci-axis-status">${escapeHtml(axis.statusLabel)}</p>
        <p>${escapeHtml(axis.detail)}</p>
        ${axis.limitations.length ? `<p class="oaci-axis-limits">${escapeHtml(axis.limitations.join(' '))}</p>` : ''}
      </article>`).join('')}
    </section>

    <section class="oaci-stats" aria-label="Draft, route and privacy">
      <dl>
        <div><dt>Draft</dt><dd>${escapeHtml(model.draft.wordsPhrase)}</dd></div>
        <div><dt>Characters</dt><dd>${escapeHtml(model.draft.characters)}</dd></div>
        <div><dt>Sections</dt><dd>${escapeHtml(model.draft.sectionCount ? model.draft.sectionsPhrase : 'Not scored')}</dd></div>
        <div><dt>Route</dt><dd>${escapeHtml(model.route.name)}</dd></div>
      </dl>
      <p class="oaci-privacy">${escapeHtml(model.route.privacy)}</p>
      <p class="oaci-honesty">${escapeHtml(model.honestyLine)}</p>
    </section>

    <section class="oaci-part" aria-labelledby="oaci-part-01">
      <p class="oaci-part-number">01</p>
      <h2 id="oaci-part-01">Section scores</h2>
      <p class="oaci-part-intro">Every scored section appears in document order. The bar shows how far the section leans away from the middle of the scale; the printed number is the display score taken straight from the result, never recalculated here.</p>
      ${renderSections(model)}
    </section>

    <section class="oaci-part" aria-labelledby="oaci-part-02">
      <p class="oaci-part-number">02</p>
      <h2 id="oaci-part-02">Characters, writing and protected facts</h2>
      <p class="oaci-part-intro">These findings come from separate deterministic checks. They are evidence in their own right and they never change the AI-pattern reading.</p>
      <div class="oaci-note"><h3>Invisible and lookalike characters</h3><p>${escapeHtml(`${model.axes[1].value}. ${model.axes[1].detail}`)}</p>${model.characterFindings.length ? listOf([...model.characterFindings]) : '<p>No text-integrity finding was recorded.</p>'}${listOf([...model.axes[1].limitations], 'oaci-limits')}</div>
      <div class="oaci-note"><h3>Writing suggestions</h3><p>${escapeHtml(`${model.axes[2].value}. ${model.axes[2].detail}`)}</p>${model.writingFindings.length ? listOf([...model.writingFindings]) : '<p>No editorial finding was recorded.</p>'}${listOf([...model.axes[2].limitations], 'oaci-limits')}</div>
      <div class="oaci-note"><h3>Facts kept safe</h3>${paragraphs([
        model.protectedFacts.sentence,
        model.protectedFacts.categoriesSentence,
        'Names, organisations, figures, dates, links, quotations, citations and code are independent evidence. They never imply authorship.',
      ])}</div>
    </section>

    <section class="oaci-part" aria-labelledby="oaci-part-03">
      <p class="oaci-part-number">03</p>
      <h2 id="oaci-part-03">Content Credentials and watermarks</h2>
      <p class="oaci-part-intro">File and text credentials, and public watermark-key results, are recorded separately from the AI-pattern reading. An absent credential proves nothing about how a text was written.</p>
      ${model.c2paText ? `<div class="oaci-note"><h3>C2PA text credential</h3><p>Status: ${escapeHtml(model.c2paText.status)}. Wrapper protected: ${model.c2paText.wrapperProtected ? 'yes' : 'no'}.</p>${listOf([...model.c2paText.limitations], 'oaci-limits')}</div>` : ''}
      ${model.c2paFiles.length
        ? model.c2paFiles.map((file) => `<div class="oaci-note"><h3>${escapeHtml(file.label)}</h3><p>Status: ${escapeHtml(file.status)}. Trust: ${escapeHtml(file.trust)}.</p><p class="oaci-meta">${escapeHtml(file.mediaType)} &middot; ${escapeHtml(file.fileHash)}</p>${listOf([...file.limitations], 'oaci-limits')}</div>`).join('')
        : '<div class="oaci-note"><h3>File Content Credentials</h3><p>No file-origin result was attached to this text run. Pasted text is never given a file provenance verdict.</p></div>'}
      ${model.watermarks.map((watermark) => `<div class="oaci-note"><h3>${escapeHtml(watermark.name)}</h3><p class="oaci-meta">${escapeHtml(watermark.id)} &middot; ${escapeHtml(watermark.statusLabel)}</p><p>Outcome: ${escapeHtml(watermark.outcome)}. Key scope: ${escapeHtml(watermark.keyScope)}.</p>${listOf([...watermark.limitations], 'oaci-limits')}</div>`).join('')}
    </section>

    <section class="oaci-part" aria-labelledby="oaci-part-04">
      <p class="oaci-part-number">04</p>
      <h2 id="oaci-part-04">Checks included in this run</h2>
      <p class="oaci-part-intro">Every named check is recorded with its outcome, where it ran, its version and its limitations. A check that did not run is never counted as a pass.</p>
      ${renderChecks(model)}
    </section>

    <section class="oaci-part" aria-labelledby="oaci-part-05">
      <p class="oaci-part-number">05</p>
      <h2 id="oaci-part-05">Reliability, limits and correct use</h2>
      <p class="oaci-part-intro">This report records what the named checks found in one run. It does not prove authorship, guarantee that writing is human, or clear a private watermark key.</p>
      <div class="oaci-means">
        <div><h3>${escapeHtml(model.meansPanel.meansTitle)}</h3>${listOf([...model.meansPanel.means])}</div>
        <div><h3>${escapeHtml(model.meansPanel.notTitle)}</h3>${listOf([...model.meansPanel.not])}</div>
      </div>
      <div class="oaci-note"><h3>How to use this report</h3>${listOf([...model.correctUse])}</div>
      <div class="oaci-note"><h3>Recorded limitations</h3>${listOf([...model.limitations])}</div>
    </section>

    ${typeof options.fullText === 'string' && options.fullText.trim() ? `<section class="oaci-part" aria-labelledby="oaci-part-06">
      <p class="oaci-part-number">06</p>
      <h2 id="oaci-part-06">The complete checked draft</h2>
      <p class="oaci-part-intro">This content-bearing appendix is written only after an explicit export action. Nothing is clipped or replaced with an ellipsis. ${escapeHtml(`${model.draft.wordsPhrase}, ${model.draft.charactersPhrase}.`)}</p>
      <pre class="oaci-draft">${escapeHtml(options.fullText)}</pre>
    </section>` : ''}

    <section class="oaci-part" aria-labelledby="oaci-part-run">
      <p class="oaci-part-number">${typeof options.fullText === 'string' && options.fullText.trim() ? '07' : '06'}</p>
      <h2 id="oaci-part-run">Run record and support</h2>
      <p class="oaci-part-intro">The identities below are what another person needs to reproduce and interpret this result.</p>
      <dl class="oaci-run">${model.runRecord.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
    </section>

    <footer class="oaci-report-footer">
      <p>${escapeHtml(model.productName)} &middot; ${escapeHtml(model.strapline)}</p>
      <p>${escapeHtml(model.productUrl)}</p>
    </footer>
  </article>`;

  if (options.fragment) return body;

  return `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(`${model.title} — ${model.productName}`)}</title>
<meta name="description" content="${escapeHtml(`Complete ${model.productName} result, evidence and run record for ${model.resultId}.`)}">
<meta name="robots" content="noindex">
<style>${CHECKER_REPORT_CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`;
}

/** The complete stylesheet. Exported so a surface can inline it into its own shell. */
export const CHECKER_REPORT_CSS = `
:root{
  --oaci-ink:#0f1115; --oaci-paper:#f7f4ef; --oaci-card:#fff; --oaci-line:#dcd5ca;
  --oaci-muted:#5a625f; --oaci-orange:#fb700a; --oaci-blue:#0068b3; --oaci-accent:var(--oaci-orange);
  --oaci-human:${LEVEL_COLOURS['signal-likely-human'].hex}; --oaci-strong:${LEVEL_COLOURS['signal-strongly-ai'].hex};
  /* Ink shades. The palette above fills shapes; these colour text, and every one of them clears
     4.5:1 against the paper, the card and the means panel. They are Lane D1's band inks, so the
     two shared layers name the same colours. */
  --oaci-orange-ink:${REPORT_INKS.orange.hex}; --oaci-blue-ink:${REPORT_INKS.blue.hex}; --oaci-chip-text:#fff;
  --oaci-band-human:${REPORT_INKS.human.hex}; --oaci-band-unclear:${REPORT_INKS.unclear.hex}; --oaci-band-potential:${REPORT_INKS.potential.hex};
  --oaci-band-likely:${REPORT_INKS.likely.hex}; --oaci-band-strong:${REPORT_INKS.strong.hex}; --oaci-band-neutral:${REPORT_INKS.neutral.hex};
  --oaci-tone-ink:var(--oaci-band-neutral);
}
[data-tone=human]{--oaci-tone-ink:var(--oaci-band-human)}
[data-tone=unclear]{--oaci-tone-ink:var(--oaci-band-unclear)}
[data-tone=potential]{--oaci-tone-ink:var(--oaci-band-potential)}
[data-tone=likely]{--oaci-tone-ink:var(--oaci-band-likely)}
[data-tone=strong]{--oaci-tone-ink:var(--oaci-band-strong)}
[data-tone=neutral]{--oaci-tone-ink:var(--oaci-band-neutral)}
[data-tone=blue]{--oaci-tone-ink:var(--oaci-blue-ink)}
@page{size:A4;margin:14mm 13mm 16mm;
  @bottom-left{content:"Opace AI Content Checker & Detector — evidence, not guarantees";font:8pt/1 Helvetica,Arial,sans-serif;color:#5a625f}
  @bottom-right{content:"Page " counter(page) " of " counter(pages);font:8pt/1 Helvetica,Arial,sans-serif;color:#5a625f}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--oaci-paper);color:var(--oaci-ink);
  font:12px/1.55 "Helvetica Neue",Helvetica,Arial,"Segoe UI",system-ui,sans-serif}
.oaci-report{max-width:210mm;margin:0 auto;padding:16px 18px 30px}
h1,h2,h3,h4{margin:0;line-height:1.15;font-weight:800}
h1{font-size:26px;letter-spacing:-0.012em}
h2{font-size:20px}
h3{font-size:14px}
h4{font-size:11.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--oaci-muted)}
p{margin:.45em 0}
ul{margin:.4em 0;padding-left:1.15em}
li{margin:.18em 0}
.oaci-kicker{margin:0 0 3px;color:var(--oaci-muted);font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.oaci-meta{color:var(--oaci-muted);font-size:10px;overflow-wrap:anywhere}
.oaci-masthead{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:start;
  padding:16px 18px;border-radius:6px;background:var(--oaci-ink);color:#fff;border-bottom:4px solid var(--oaci-orange)}
.oaci-masthead .oaci-kicker{color:#ffad7b}
.oaci-masthead h1{color:#fff}
.oaci-mark{display:block;width:52px;height:52px;border-radius:6px;background-size:cover;background-repeat:no-repeat;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.oaci-masthead-meta{margin:6px 0 0;color:#c8ccca;font-size:11px}
.oaci-masthead-link{margin:2px 0 0;color:#ffad7b;font-size:10px;overflow-wrap:anywhere}
.oaci-strapline{margin:0;align-self:end;color:#c8ccca;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap}
/* Two columns on the first row, and the band legend on its own row across both. The legend
   used to sit under the dial inside the left column, where its names ran along the same lines
   as the verdict copy on the right. */
.oaci-verdict{display:grid;grid-template-columns:300px minmax(0,1fr);grid-template-rows:auto auto;gap:18px 22px;
  align-items:center;margin-top:14px;padding:18px;border-radius:6px;background:var(--oaci-ink);color:#fff;
  border-left:6px solid var(--oaci-accent)}
.oaci-verdict .oaci-kicker{color:#9aa2a0}
.oaci-gauge{grid-row:1;grid-column:1;margin:0;min-width:0}
.oaci-gauge svg{display:block;width:100%;height:auto}
.oaci-band-current{filter:none}
/* The text column is bounded so a long meaning sentence keeps a readable measure instead of
   running the full width of an A4 sheet. */
.oaci-verdict-body{grid-row:1;grid-column:2;min-width:0;max-width:46em}
.oaci-gauge-legend{grid-row:2;grid-column:1/-1;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));
  gap:4px 10px;margin:0;padding:10px 0 0;border-top:1px solid #2b3034;list-style:none;
  color:#c8ccca;font-size:9px;font-weight:700;line-height:1.3}
.oaci-gauge-legend li{display:block;min-width:0;margin:0}
.oaci-gauge-legend li[data-current=true]{color:#fff}
.oaci-gauge-legend i{display:block;width:18px;height:3px;margin-bottom:4px;border-radius:2px}
.oaci-verdict h2{color:#fff;font-size:30px;letter-spacing:-0.015em}
.oaci-verdict-score{margin:6px 0 0;color:#ffad7b;font-size:14px;font-weight:800}
.oaci-verdict-scale{margin:2px 0 0;color:#9aa2a0;font-size:9.5px}
.oaci-verdict-meaning{margin:10px 0 0;color:#e2e0da;font-size:12px}
.oaci-verdict-strongest{margin:8px 0 0;color:#ffad7b;font-size:11px;font-weight:700}
.oaci-axes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.oaci-axes article{min-width:0;padding:12px 13px;border:1px solid var(--oaci-line);border-left:4px solid var(--oaci-accent);
  border-radius:5px;background:var(--oaci-card)}
.oaci-axes h3{margin:3px 0 5px;font-size:16px}
.oaci-axis-status{margin:0 0 5px;color:var(--oaci-tone-ink);font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.oaci-axes p{font-size:10.5px;color:var(--oaci-muted)}
.oaci-axis-limits{font-size:9.5px;font-style:italic}
.oaci-stats{margin-top:12px;padding:12px 14px;border:1px solid var(--oaci-line);border-radius:5px;background:var(--oaci-card)}
.oaci-stats dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0}
.oaci-stats dt{color:var(--oaci-muted);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.oaci-stats dd{margin:3px 0 0;font-size:13px;font-weight:800}
.oaci-privacy{margin:10px 0 0;padding-top:9px;border-top:1px solid var(--oaci-line);font-size:10.5px;color:var(--oaci-muted)}
.oaci-honesty{margin:3px 0 0;font-size:10.5px;font-weight:700}
.oaci-part{margin-top:24px;break-inside:auto}
.oaci-part-number{margin:0 0 4px;color:var(--oaci-orange-ink);font-size:10.5px;font-weight:800;letter-spacing:.18em}
.oaci-part-intro{margin:6px 0 12px;color:var(--oaci-muted);font-size:10.5px;max-width:62em}
.oaci-part h2{break-after:avoid}
.oaci-bars{margin:0 0 16px;padding:0;list-style:none}
.oaci-bars li{display:grid;grid-template-columns:74px minmax(0,1fr) 44px 84px;gap:10px;align-items:center;
  padding:5px 0;border-bottom:1px solid var(--oaci-line)}
.oaci-bar-label{font-size:11px;font-weight:800}
.oaci-bar-track{display:block;height:9px;border-radius:5px;background:#e6e0d6;overflow:hidden}
.oaci-bar-track i{display:block;height:100%;border-radius:5px}
.oaci-bars b{font-size:12px;font-weight:800;text-align:right}
.oaci-bars em{color:var(--oaci-tone-ink);font-size:10.5px;font-weight:800;font-style:normal}
.oaci-bars small{grid-column:2/-1;color:var(--oaci-muted);font-size:9px}
.oaci-section{margin:0 0 12px;padding:14px 15px;border:1px solid var(--oaci-line);border-left:4px solid var(--oaci-accent);
  border-radius:5px;background:var(--oaci-card);break-inside:avoid}
.oaci-section header{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;justify-content:space-between}
.oaci-chips{display:flex;gap:8px;align-items:center;margin:0}
.oaci-chip{display:inline-block;padding:2px 9px;border-radius:9px;background:var(--oaci-tone-ink);color:var(--oaci-chip-text);
  font-size:9.5px;font-weight:800;letter-spacing:.03em}
.oaci-score{font-size:11px;font-weight:700;color:var(--oaci-muted)}
.oaci-section blockquote{margin:9px 0;padding:9px 12px;border-left:3px solid var(--oaci-line);border-radius:0 4px 4px 0;
  background:var(--oaci-paper);font:italic 11.5px/1.55 Georgia,"Times New Roman",serif}
.oaci-section ul{font-size:10.5px;color:var(--oaci-muted)}
.oaci-strongest{margin:8px 0 0;color:var(--oaci-tone-ink);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.oaci-note{margin:0 0 10px;padding:13px 15px;border:1px solid var(--oaci-line);border-left:4px solid var(--oaci-blue);
  border-radius:5px;background:var(--oaci-card);break-inside:avoid}
.oaci-note p,.oaci-note li{font-size:10.5px;color:var(--oaci-muted)}
.oaci-limits{font-style:italic}
.oaci-means{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0 0 12px;padding:14px 16px;
  border-radius:5px;background:#efe9e0;break-inside:avoid}
.oaci-means h3{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:var(--oaci-muted)}
.oaci-means ul{margin-top:6px;font-size:11px}
.oaci-scroll{max-width:100%;overflow-x:auto}
.oaci-scroll:focus-visible{outline:2px solid var(--oaci-blue-ink);outline-offset:2px}
.oaci-table{width:100%;border-collapse:collapse;font-size:10px;background:var(--oaci-card)}
.oaci-table caption{margin-bottom:6px;color:var(--oaci-muted);font-size:10px;text-align:left}
.oaci-table th,.oaci-table td{padding:7px 9px;border:1px solid var(--oaci-line);text-align:left;vertical-align:top}
.oaci-table thead th{background:#efe9e0;font-size:9px;text-transform:uppercase;letter-spacing:.06em}
.oaci-table tbody th{font-weight:800;overflow-wrap:anywhere}
.oaci-table tbody th span{display:block;margin-top:2px;color:var(--oaci-muted);font-weight:400;font-size:9px}
.oaci-table ul{margin:0;padding-left:1em}
.oaci-table tr{break-inside:avoid}
.oaci-run{display:grid;grid-template-columns:150px minmax(0,1fr);margin:0;padding:14px 16px;
  border:1px solid var(--oaci-line);border-left:4px solid var(--oaci-ink);border-radius:5px;background:var(--oaci-card)}
.oaci-run>div{display:contents}
.oaci-run dt{padding:4px 0;font-size:10px;font-weight:800}
.oaci-run dd{margin:0;padding:4px 0;color:var(--oaci-muted);font-size:10px;overflow-wrap:anywhere}
.oaci-draft{margin:0;padding:14px 16px;border:1px solid var(--oaci-line);border-radius:5px;background:var(--oaci-card);
  font:10.5px/1.6 "SFMono-Regular",Consolas,"Liberation Mono",monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.oaci-report-footer{margin-top:24px;padding-top:10px;border-top:2px solid var(--oaci-ink);
  display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;color:var(--oaci-muted);font-size:9.5px}
.oaci-report-footer p{margin:0}
@media (max-width:560px){
  .oaci-masthead{grid-template-columns:auto minmax(0,1fr)}
  .oaci-strapline{grid-column:1/-1}
  .oaci-verdict{grid-template-columns:1fr}
  .oaci-gauge{grid-column:1}
  .oaci-verdict-body{grid-row:2;grid-column:1;max-width:none}
  .oaci-gauge-legend{grid-row:3;grid-column:1;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px 10px}
  .oaci-axes,.oaci-stats dl,.oaci-means{grid-template-columns:1fr}
  .oaci-bars li{grid-template-columns:64px minmax(0,1fr) 40px}
  .oaci-bars em{grid-column:2/-1}
  .oaci-run{grid-template-columns:1fr}
  .oaci-run dt{padding-bottom:0}
}
@media print{
  body{background:#fff}
  .oaci-report{max-width:none;margin:0;padding:0}
  .oaci-masthead{grid-template-columns:auto minmax(0,1fr) auto}
  .oaci-strapline{grid-column:auto}
  .oaci-verdict{grid-template-columns:250px minmax(0,1fr)}
  .oaci-gauge{grid-row:1;grid-column:1}
  .oaci-verdict-body{grid-row:1;grid-column:2;max-width:46em}
  .oaci-gauge-legend{grid-row:2;grid-column:1/-1;grid-template-columns:repeat(5,minmax(0,1fr))}
  .oaci-axes,.oaci-means{grid-template-columns:repeat(3,minmax(0,1fr))}
  .oaci-means{grid-template-columns:repeat(2,minmax(0,1fr))}
  .oaci-stats dl{grid-template-columns:repeat(4,minmax(0,1fr))}
  .oaci-bars li{grid-template-columns:74px minmax(0,1fr) 44px 84px}
  .oaci-bars em{grid-column:auto}
  .oaci-run{grid-template-columns:150px minmax(0,1fr)}
  .oaci-masthead,.oaci-verdict{border-radius:0}
  .oaci-part{break-before:auto}
  .oaci-section,.oaci-note,.oaci-means,.oaci-table tr{break-inside:avoid}
  .oaci-scroll{overflow-x:visible}
  a{color:inherit;text-decoration:none}
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme=light]){--oaci-paper:#14161a;--oaci-card:#1c1f24;--oaci-line:#333940;--oaci-ink:#f2efe9;--oaci-muted:#a8b0ad;
    --oaci-orange-ink:#ffa76b;--oaci-blue-ink:#6fb6ec;--oaci-chip-text:#0f1115;
    --oaci-band-human:#6fd6a2;--oaci-band-unclear:#b8bfbc;--oaci-band-potential:#f0bb5c;
    --oaci-band-likely:#ff9f68;--oaci-band-strong:#ff9083;--oaci-band-neutral:#b8bfbc}
  :root:not([data-theme=light]) .oaci-masthead,:root:not([data-theme=light]) .oaci-verdict{background:#090b0e;color:#fff}
  :root:not([data-theme=light]) .oaci-means{background:#22262b}
  :root:not([data-theme=light]) .oaci-table thead th{background:#22262b}
  :root:not([data-theme=light]) .oaci-bar-track{background:#333940}
}
@media (forced-colors:active){
  .oaci-masthead,.oaci-verdict,.oaci-axes article,.oaci-note,.oaci-section,.oaci-run,.oaci-table th,.oaci-table td{border:1px solid CanvasText}
  .oaci-chip{border:1px solid CanvasText}
}
`;
