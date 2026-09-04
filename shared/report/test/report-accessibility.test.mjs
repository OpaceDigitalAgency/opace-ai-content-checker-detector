/**
 * The two accessibility defects Lane C measured in the printable report, held closed.
 *
 * 1. `.oaci-part-number` printed the Opace orange fill (#fb700a) as 9.5 px bold text, which is
 *    about 2.6:1 on the report's paper. Every ink the stylesheet uses for text is checked here
 *    against every surface it can land on, in both colour schemes, against the 4.5:1 threshold.
 * 2. The named-checks table sat in no scrolling wrapper, so a table wider than a phone made the
 *    whole page scroll sideways. The wrapper is asserted here, and the actual reflow is measured
 *    in a real browser by `render-report.mjs`.
 *
 * These are static assertions over the emitted markup and the stylesheet. They fail fast and
 * without a browser; they do not replace the Chromium and axe run, they make it hard to regress
 * between runs.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CHECKER_REPORT_CSS, buildCheckerReportHtml } from '../checker-report-html.mjs';
import {
  checkerResultFixture,
  longFixture,
  notAssessedFixture,
  singularFixture,
  wideChecksFixture,
  zeroCountFixture,
} from './fixtures.mjs';

const OPTIONS = Object.freeze({ surfaceName: 'Astro toolbar', generatedAt: '2026-09-02T10:00:00Z' });
const build = (result = checkerResultFixture(), extra = {}) => buildCheckerReportHtml(result, { ...OPTIONS, ...extra });

const FIXTURES = Object.freeze({
  canonical: checkerResultFixture,
  singular: singularFixture,
  'zero-count': zeroCountFixture,
  'not-assessed': notAssessedFixture,
  'wide-checks': wideChecksFixture,
  long: () => longFixture(9),
});

/* ---------------------------------------------------------------- colour */

/** WCAG 2.x relative luminance of an #rrggbb colour. */
function luminance(hex) {
  const digits = hex.replace('#', '');
  const pairs = digits.length === 3 ? digits.split('').map((digit) => digit + digit) : digits.match(/../gu);
  const channels = pairs.map((pair) => {
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

/** Custom-property values declared inside one brace-delimited block of the stylesheet. */
function tokensIn(block) {
  return Object.fromEntries([...block.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8})/giu)].map((match) => [match[1], match[2].toLowerCase()]));
}

const lightBlock = CHECKER_REPORT_CSS.slice(CHECKER_REPORT_CSS.indexOf(':root{'), CHECKER_REPORT_CSS.indexOf('[data-tone=human]'));
/**
 * The dark block alone, not "everything after it".
 *
 * Slicing to the end of the stylesheet swept in whatever came next, and what
 * comes next is the print block, which deliberately puts the light tokens back
 * on paper — so the dark scheme was measured with the printed inks and passed
 * on the wrong values. The slice stops at the next at-rule.
 */
const darkStart = CHECKER_REPORT_CSS.indexOf('@media (prefers-color-scheme:dark)');
const darkEnd = CHECKER_REPORT_CSS.indexOf('@media ', darkStart + 1);
const darkBlock = CHECKER_REPORT_CSS.slice(darkStart, darkEnd === -1 ? undefined : darkEnd);
const LIGHT = tokensIn(lightBlock);
const DARK = { ...LIGHT, ...tokensIn(darkBlock) };

/** Every background small text can land on, per scheme. */
const SURFACES = Object.freeze({
  light: { paper: '#f7f4ef', card: '#ffffff', means: '#efe9e0' },
  dark: { paper: '#14161a', card: '#1c1f24', means: '#22262b' },
});

/** Every ink token the stylesheet uses for text. */
const TEXT_INKS = Object.freeze([
  '--oaci-orange-ink', '--oaci-blue-ink',
  '--oaci-band-human', '--oaci-band-unclear', '--oaci-band-potential',
  '--oaci-band-likely', '--oaci-band-strong', '--oaci-band-neutral',
]);

test('the stylesheet declares a readable ink for every tone in both colour schemes', () => {
  for (const [scheme, tokens] of [['light', LIGHT], ['dark', DARK]]) {
    for (const ink of TEXT_INKS) {
      assert.ok(tokens[ink], `${ink} is not declared for the ${scheme} scheme`);
      for (const [surface, background] of Object.entries(SURFACES[scheme])) {
        const ratio = contrast(tokens[ink], background);
        assert.ok(
          ratio >= 4.5,
          `${ink} (${tokens[ink]}) on the ${scheme} ${surface} (${background}) is ${ratio.toFixed(2)}:1, below the 4.5:1 minimum`,
        );
      }
    }
  }
});

test('the part number no longer prints the orange fill as small bold text', () => {
  const rule = CHECKER_REPORT_CSS.match(/\.oaci-part-number\{[^}]*\}/u)?.[0];
  assert.ok(rule, '.oaci-part-number must still be styled');
  assert.ok(rule.includes('color:var(--oaci-orange-ink)'), `the part number must use the ink token, not the fill: ${rule}`);
  assert.doesNotMatch(rule, /color:var\(--oaci-orange\)|#fb700a/u);

  // The fill itself is unchanged; it is simply no longer used as text.
  assert.ok(LIGHT['--oaci-orange'] === '#fb700a', 'the Opace orange fill must not be redefined');
  assert.ok(contrast('#fb700a', SURFACES.light.paper) < 4.5, 'this test is meaningless if the old colour already passed');

  // Lane C counted six of these. Every one must be the same element, with no inline colour.
  const html = build();
  const numbers = [...html.matchAll(/<p class="oaci-part-number"[^>]*>/gu)];
  assert.equal(numbers.length, 6, 'the canonical report has six numbered parts');
  assert.equal([...build(checkerResultFixture(), { fullText: 'Draft.' }).matchAll(/<p class="oaci-part-number"[^>]*>/gu)].length, 7, 'the appendix adds a seventh');
  for (const number of numbers) assert.doesNotMatch(number[0], /style=/u, 'no part number carries an inline colour');
});

test('the chip prints readable text on its own band ink in both schemes', () => {
  for (const [scheme, tokens] of [['light', LIGHT], ['dark', DARK]]) {
    const text = tokens['--oaci-chip-text'];
    assert.ok(text, `--oaci-chip-text is not declared for the ${scheme} scheme`);
    for (const ink of TEXT_INKS.filter((token) => token.startsWith('--oaci-band'))) {
      const ratio = contrast(text, tokens[ink]);
      assert.ok(ratio >= 4.5, `chip text ${text} on ${ink} (${tokens[ink]}) is ${ratio.toFixed(2)}:1 in the ${scheme} scheme`);
    }
  }
  assert.match(CHECKER_REPORT_CSS, /\.oaci-chip\{[^}]*background:var\(--oaci-tone-ink\)[^}]*color:var\(--oaci-chip-text\)/u);
});

test('level colours reach text through a tone, never as an inline colour', () => {
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const html = build(fixture());
    assert.doesNotMatch(html, /<em style="color:/u, `${name}: a section level name still carries an inline colour`);
    assert.doesNotMatch(html, /<span class="oaci-chip" style=/u, `${name}: a level chip still carries an inline background`);
    for (const tone of [...html.matchAll(/data-tone="([a-z]+)"/gu)].map((match) => match[1])) {
      assert.ok(CHECKER_REPORT_CSS.includes(`[data-tone=${tone}]{`), `${name}: the stylesheet has no ink for the "${tone}" tone`);
    }
  }
  // The fills are untouched, so the dial, the bars and the PDF still agree.
  const html = build(longFixture(9));
  for (const hex of ['#1a7349', '#6d7877', '#b06603', '#bf4705', '#a31f17']) {
    assert.ok(html.includes(hex), `band fill ${hex} is missing from the dial and the bars`);
  }
});

/* ---------------------------------------------------------------- reflow */

test('every checks table sits in a named, focusable scrolling wrapper', () => {
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const html = build(fixture());
    const tables = [...html.matchAll(/<table class="oaci-table">/gu)];
    assert.equal(tables.length, 1, `${name}: the report renders exactly one checks table`);

    const wrapper = html.match(/<div class="oaci-scroll"([^>]*)>\s*<table class="oaci-table">/u);
    assert.ok(wrapper, `${name}: the checks table is not wrapped in .oaci-scroll`);
    assert.match(wrapper[1], /tabindex="0"/u, `${name}: the scrolling wrapper is not reachable from the keyboard`);
    assert.match(wrapper[1], /aria-label="[^"]{10,}"/u, `${name}: the scrolling wrapper has no accessible name`);
    assert.match(wrapper[1], /role="group"/u, `${name}: the scrolling wrapper is not exposed as a group`);
    assert.match(html, /<\/table>\s*<\/div>/u, `${name}: the wrapper does not close around the table`);
  }
});

test('the wrapper scrolls on screen and releases the content for print', () => {
  const rule = CHECKER_REPORT_CSS.match(/\.oaci-scroll\{[^}]*\}/u)?.[0];
  assert.ok(rule, '.oaci-scroll must be styled');
  assert.match(rule, /overflow-x:auto/u, 'the wrapper must scroll rather than clip');
  assert.match(rule, /max-width:100%/u, 'the wrapper must not grow past its column');
  assert.match(CHECKER_REPORT_CSS, /\.oaci-scroll:focus-visible\{[^}]*outline:/u, 'a focusable box needs a visible focus ring');

  const print = CHECKER_REPORT_CSS.slice(CHECKER_REPORT_CSS.indexOf('@media print{'), CHECKER_REPORT_CSS.indexOf('@media (prefers-color-scheme:dark)'));
  assert.match(print, /\.oaci-scroll\{overflow-x:visible\}/u, 'printing must not clip the table at the wrapper edge');
});

test('the only focusable element in the report is that wrapper', () => {
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const html = build(fixture());
    const focusable = [...html.matchAll(/tabindex="[^"]*"/gu)];
    assert.equal(focusable.length, 1, `${name}: the report should have exactly one tab stop, found ${focusable.length}`);
    assert.doesNotMatch(html, /<button|<input|<select|<textarea|<a\s/iu, `${name}: the printable report carries no controls`);
  }
});

test('the document shell puts the whole report inside one main landmark', () => {
  const html = build();
  assert.match(html, /<body>\s*<main>/u, 'the shell must open a main landmark');
  assert.match(html, /<\/main>\s*<\/body>/u, 'the shell must close it around everything');
  assert.equal((html.match(/<main>/gu) ?? []).length, 1, 'exactly one main landmark');

  // A surface that supplies its own shell still gets the bare article, as Lane C does.
  const fragment = buildCheckerReportHtml(checkerResultFixture(), { ...OPTIONS, fragment: true });
  assert.doesNotMatch(fragment, /<main>/u, 'the fragment must not bring a landmark into someone else’s shell');
});

test('print puts the light palette back, whatever the screen prefers', () => {
  // A dark system preference set near-white ink, and the print block set a white
  // page, so the report printed #f2efe9 on #fff at about 1.05:1 — a blank sheet.
  const printBlocks = [...CHECKER_REPORT_CSS.matchAll(/@media print\{/gu)].map((match) => match.index);
  assert.ok(printBlocks.length >= 1, 'the stylesheet must carry a print block');
  const darkStart = CHECKER_REPORT_CSS.indexOf('@media (prefers-color-scheme:dark)');
  const afterDark = printBlocks.filter((index) => index > darkStart);
  assert.equal(afterDark.length, 1, 'exactly one print block must come after the dark block, so it wins by order');

  const printBlock = CHECKER_REPORT_CSS.slice(afterDark[0]);
  const printed = Object.fromEntries([...printBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{3,8})/giu)].map((m) => [m[1], m[2].toLowerCase()]));
  for (const ink of TEXT_INKS) {
    assert.ok(printed[ink], `${ink} must be put back for print`);
    assert.ok(
      contrast(printed[ink], '#ffffff') >= 4.5,
      `${ink} (${printed[ink]}) on the printed page (#ffffff) is ${contrast(printed[ink], '#ffffff').toFixed(2)}:1`,
    );
  }
  assert.equal(printed['--oaci-ink'], '#0f1115', 'the body ink must be the light one on paper');
  assert.ok(contrast(printed['--oaci-ink'], '#ffffff') >= 4.5);
});
