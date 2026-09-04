/**
 * The shared result renderer, checked against the canonical contract fixture
 * and every state a surface has to show honestly.
 *
 * Run with: node --test shared/presentation/test/
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  CHECKER_GAUGE_ORDER,
  CHECKER_LEVEL_LABELS,
  CHECKER_LEVEL_MEANINGS,
  CHECKER_MEANING_PANEL,
  CHECKER_METHOD_STATUS_LABELS,
  PRODUCT_LOGO_DATA_URI,
  PRODUCT_MARK_SVG,
  PRODUCT_NAME,
  PRODUCT_TAGLINE,
  gaugePosition,
  measurePassageOverlap,
  renderCheckerDocument,
  renderCheckerResult,
} from '../checker-result-presentation.mjs';

import {
  canonicalFixture,
  collisionFixture,
  contentFreeFixture,
  errorFixture,
  hostileFixture,
  notAssessedFixture,
  richFixture,
  tooShortFixture,
  withheldFixture,
} from './fixtures.mjs';

const OPTIONS = { surface: 'Chrome side panel' };
const render = (result, options) => renderCheckerResult(result, { ...OPTIONS, ...options });

const BANNED_WORDS = ['delve', 'leverage', 'robust', 'seamless', 'elevate the', 'unlock the', 'harness', 'streamline'];

/* ------------------------------------------------------------ the basics */

test('the canonical contract fixture renders a complete result', () => {
  const html = render(canonicalFixture());
  assert.match(html, /data-oaci-result/u);
  assert.match(html, /data-oaci-status="assessed"/u);
  assert.match(html, /data-oaci-profile="full_checker"/u);
  assert.match(html, /data-oaci-level="signal-strongly-ai"/u);
  assert.ok(html.includes('Opace AI Content Checker &amp; Detector'), 'product name is present (HTML-escaped)');
  assert.ok(html.includes(PRODUCT_TAGLINE), 'honesty line is present');
  assert.match(html, /Section scores/u);
  assert.match(html, /Inside section 1 of 2/u);
  assert.match(html, /Inside section 2 of 2/u);
  assert.match(html, /AI-pattern reading/u);
  assert.match(html, /Text integrity/u);
  assert.match(html, /Editorial signals/u);
  assert.match(html, /Named checks and limitations/u);
  assert.match(html, /What this means/u);
  assert.match(html, /What this does not mean/u);
  assert.match(html, /How certain is this reading\?/u);
  assert.match(html, /Run record/u);
});

test('the real product logo is embedded, and the small mark is still exported', () => {
  assert.ok(PRODUCT_LOGO_DATA_URI.startsWith('data:image/png;base64,'), 'logo is an embedded PNG');
  assert.ok(PRODUCT_LOGO_DATA_URI.length > 2000, 'logo is a real image, not a placeholder');
  assert.ok(PRODUCT_MARK_SVG.startsWith('<svg'), 'the tiny-context mark survives');
  const html = render(canonicalFixture());
  assert.ok(html.includes(PRODUCT_LOGO_DATA_URI), 'the masthead uses the real logo');
  assert.match(html, /<img src="data:image\/png;base64,[^"]+" alt="" width="44" height="44"/u);
});

test('a caller may supply its own logo markup or a packaged URL', () => {
  const withUrl = render(canonicalFixture(), { logoDataUri: 'assets/logo-96.png' });
  assert.match(withUrl, /<img src="assets\/logo-96\.png"/u);
  const withMarkup = render(canonicalFixture(), { logoHtml: PRODUCT_MARK_SVG });
  assert.ok(withMarkup.includes('<svg viewBox="0 0 64 64"'), 'supplied markup is used verbatim');
});

/* ------------------------------------------------- scores, never rounded */

test('display_score strings are printed verbatim and the 0.9655/0.9685 pair stays distinct', () => {
  const html = render(collisionFixture());
  assert.match(html, /data-oaci-display-score="0\.966">0\.966</u);
  assert.match(html, /data-oaci-display-score="0\.969">0\.969</u);
  assert.doesNotMatch(html, /0\.97[^0-9]/u, 'the two-decimal collision never appears');
  // Distinct levels beside distinct numbers.
  assert.match(html, /0\.966<\/b><span class="oaci-strip__band" data-level="signal-likely-ai">Likely AI</u);
  assert.match(html, /0\.969<\/b><span class="oaci-strip__band" data-level="signal-strongly-ai">Strongly AI</u);
});

test('the score is never described as a percentage', () => {
  const html = render(canonicalFixture());
  assert.match(html, /not a percentage of the text written by AI/u);
  assert.doesNotMatch(html, /(\d)%\s*(?:AI|written)/u);
});

test('the level comes from the contract and is never derived from the score', () => {
  const result = canonicalFixture();
  // A deliberately incoherent pairing: a low score carrying a strong level.
  // The renderer must print what the contract says, because deriving the level
  // here would put a second, unasserted copy of the scale in the view layer.
  result.sections[0].level = 'signal-likely-human';
  const html = render(result);
  assert.match(html, /data-oaci-display-score="0\.966">0\.966<\/b><span class="oaci-strip__band" data-level="signal-likely-human">Likely human</u);
});

test('section numbers are one-based in the view and zero-based in the contract', () => {
  const result = canonicalFixture();
  const html = render(result);
  assert.equal(result.sections[0].index, 0, 'the contract keeps its zero-based index');
  assert.match(html, /Section 1</u);
  assert.match(html, /Section 2</u);
  assert.doesNotMatch(html, />Section 0</u);
  assert.match(html, /data-oaci-section="0"/u);
});

test('sections render in contract order', () => {
  const html = render(canonicalFixture());
  const order = [...html.matchAll(/data-oaci-section="(\d+)"/gu)].map((match) => Number(match[1]));
  assert.deepEqual(order, [0, 1]);
  const dives = [...html.matchAll(/<h4 class="oaci-dive__title">Inside section (\d+) of 2<\/h4>/gu)].map((match) => Number(match[1]));
  assert.deepEqual(dives, [1, 2]);
});

/* --------------------------------------------------------------- the dial */

test('the dial is an image with a name, five named bands and a needle in the right band', () => {
  const html = render(canonicalFixture());
  assert.match(html, /<div class="oaci-dial" role="img" aria-label="AI reading: Strongly AI[^"]*"/u);
  for (const level of CHECKER_GAUGE_ORDER) {
    assert.ok(html.includes(`<span data-level="${level}"`), `${level} has a gauge label`);
    assert.ok(html.includes(CHECKER_LEVEL_LABELS[level]), `${level} prints its own name`);
  }
  assert.match(html, /data-position="90\.00"/u);
  assert.match(html, /class="oaci-dial__needle"/u);
  assert.match(html, /class="oaci-dial__seg" data-level="signal-strongly-ai" data-active="true"/u);
  // The label row is decoration; the accessible name carries the reading.
  assert.match(html, /<div class="oaci-dial__labels" aria-hidden="true">/u);
});

test('the needle sits at the centre of its own band, never at an arithmetic point', () => {
  assert.equal(gaugePosition('signal-likely-human'), 10);
  assert.equal(gaugePosition('signal-unclear'), 30);
  assert.equal(gaugePosition('signal-potentially-ai'), 50);
  assert.equal(gaugePosition('signal-likely-ai'), 70);
  assert.equal(gaugePosition('signal-strongly-ai'), 90);
  assert.throws(() => gaugePosition('signal-withheld'), /not_on_gauge/u);
});

/* --------------------------------------------------- the honest non-results */

test('a withheld reading shows no gauge, no score and no level', () => {
  const html = render(withheldFixture());
  assert.match(html, /data-oaci-status="withheld"/u);
  assert.match(html, /AI reading withheld/u);
  assert.doesNotMatch(html, /oaci-dial/u, 'an empty gauge would read as a low one');
  assert.doesNotMatch(html, /data-oaci-display-score/u);
  assert.doesNotMatch(html, /data-oaci-level=/u);
  assert.match(html, /The route refused to score this draft/u);
  assert.doesNotMatch(html, /Likely human/u, 'a withheld reading is never drawn as a pass');
});

test('a too-short run says so in its own words', () => {
  const html = render(tooShortFixture());
  assert.match(html, /Not enough text to read/u);
  assert.match(html, /not enough writing here for the model/u);
  assert.doesNotMatch(html, /oaci-dial/u);
});

test('an errored run is an error, not a pass', () => {
  const html = render(errorFixture());
  assert.match(html, /data-oaci-status="error"/u);
  assert.match(html, /AI reading unavailable/u);
  assert.match(html, /oaci-state--error/u);
  assert.match(html, /returned an error/u);
  assert.doesNotMatch(html, /oaci-dial/u);
});

test('a primitive surface renders not_assessed and says why', () => {
  const html = render(notAssessedFixture(), { surface: 'Astro toolbar' });
  assert.match(html, /data-oaci-status="not_assessed"/u);
  assert.match(html, /data-oaci-profile="primitive"/u);
  assert.match(html, /No trained model ran/u);
  assert.match(html, /Character findings and writing rules cannot supply an AI-pattern reading/u);
  assert.match(html, /No trained model ran in this result\./u, 'the run record says it too');
  assert.doesNotMatch(html, /oaci-dial/u);
});

test('every state keeps the other completed checks and the run record', () => {
  for (const fixture of [withheldFixture(), tooShortFixture(), errorFixture(), notAssessedFixture()]) {
    const html = render(fixture);
    assert.match(html, /Named checks and limitations/u);
    assert.match(html, /Run record/u);
    assert.match(html, /Text integrity/u);
    assert.match(html, /Editorial signals/u);
  }
});

/* ----------------------------------------------------- the section evidence */

test('a deep dive quotes the passage, meters the measured signal and offers advice', () => {
  const html = render(richFixture());
  assert.match(html, /<blockquote class="oaci-quote" data-level="signal-likely-ai" tabindex="0" aria-label="The passage the model read in section 1">Ask someone what COPD/u);
  assert.match(html, /Word re-use between neighbouring sentences/u);
  assert.match(html, /typical AI ~2\.1%/u);
  assert.match(html, /typical human ~6\.3%/u);
  assert.match(html, /this passage \d/u);
  assert.match(html, /How to improve this passage/u);
  assert.match(html, /Try: State what the thing is without the negated set-up\./u);
  assert.match(html, /never counts towards the AI reading/u);
});

test('a contract-supplied measure is used instead of measuring here', () => {
  const html = render(richFixture());
  assert.match(html, /data-oaci-measure="from-contract"/u);
  assert.match(html, /this passage 6\.6%/u);
  assert.match(html, /data-oaci-measure="measured-here"/u, 'the other section is measured from its passage');
});

test('a section with nothing to suggest says so kindly', () => {
  const html = render(canonicalFixture());
  assert.match(html, /Nothing to tweak here — this passage reads naturally\./u);
});

test('a content-free result shows a locator instead of inventing a passage', () => {
  const html = render(contentFreeFixture());
  assert.match(html, /Content-free result: this section is identified by its position/u);
  assert.match(html, /characters 0–57/u);
  assert.doesNotMatch(html, /<blockquote/u);
});

test('the measured signal refuses to speak below its floor', () => {
  assert.equal(measurePassageOverlap('One short line.'), null);
  assert.equal(measurePassageOverlap(''), null);
  const measured = measurePassageOverlap(
    'The council published the report on Monday morning. '
    + 'The report set out the council spending for the year. '
    + 'Spending on transport rose faster than any other heading. '
    + 'Transport now takes almost a third of the budget.',
  );
  assert.ok(measured, 'four connected sentences are measurable');
  assert.equal(measured.label, 'Word re-use between neighbouring sentences');
  assert.ok(measured.value > 0 && measured.value <= 100);
  assert.equal(measured.machineMedian, 2.1);
  assert.equal(measured.humanMedian, 6.3);
});

/* ----------------------------------------------------------- named checks */

test('the closed status vocabulary renders as friendly labels', () => {
  const result = canonicalFixture();
  const statuses = ['pass', 'attention', 'fail', 'inconclusive', 'unsupported', 'not_configured', 'not_run', 'error'];
  result.methods = statuses.map((status, index) => ({
    ...result.methods[0],
    id: `check.${status}`,
    provider_or_method: `Check ${index}`,
    status,
  }));
  const html = render(result);
  for (const status of statuses) {
    assert.ok(html.includes(`data-status="${status}"`), `${status} keeps its machine value`);
    assert.ok(html.includes(CHECKER_METHOD_STATUS_LABELS[status]), `${status} prints "${CHECKER_METHOD_STATUS_LABELS[status]}"`);
  }
  assert.match(html, /A check that did not run is never counted as a pass\./u);
});

/* ------------------------------------------------------------- certainty */

test('the certainty disclosure explains the reading in plain language', () => {
  const html = render(canonicalFixture());
  assert.match(html, /<summary>How certain is this reading\?<\/summary>/u);
  assert.match(html, /Raw model reading: 0\.9685 on a zero-to-one pattern scale/u);
  assert.match(html, /Certainty bar: 0\.9679444972866822/u);
  assert.match(html, /tier3-cycle5-v1/u);
  assert.match(html, /input contract raw-v1/u);
  assert.match(html, /Opace EU server, europe-west1/u);
});

test('a run with no recorded display thresholds says so rather than inventing one', () => {
  const result = canonicalFixture();
  result.axes.ai_pattern.primary_display_threshold = null;
  result.axes.ai_pattern.secondary_display_threshold = null;
  const html = render(result);
  assert.match(html, /did not record a display equivalent for the certainty bar/u);
  assert.doesNotMatch(html, /Certainty bar: null/u);
});

/* ------------------------------------------------------------ run record */

test('the run record states route, retention, model identity, counts and reference', () => {
  const html = render(canonicalFixture());
  // The route kind label and the location share a name here, so the line is
  // printed once rather than stuttering.
  assert.match(html, /<dt>Route<\/dt><dd>Opace EU server, europe-west1<\/dd>/u);
  assert.doesNotMatch(html, /Opace EU server[^<]*Opace EU server/u);
  assert.match(html, /The text was sent once to the Opace EU server for this request\./u);
  assert.match(html, /The text was processed for this request and was not retained\./u);
  assert.match(html, /tier3-cycle5-v1 · tier3-cycle5-full · fp32 · segments-v3, raw-v1, features-v1, margin-v1/u);
  assert.match(html, /120 words · 120 characters · 2 scored sections · 1 named check · 3 protected facts/u);
  assert.match(html, /result_cycle5_fixture_001/u);
  assert.match(html, /pdf, complete evidence, created only when you ask for it/u);
});

/* ------------------------------------------------------------ the actions */

test('the action bar is a slot the surface fills, and it never prints', () => {
  const html = render(canonicalFixture(), {
    actions: [
      { id: 'print', label: 'Print' },
      { id: 'pdf', label: 'Download PDF' },
      { id: 'json', label: 'JSON receipt' },
      { id: 'share', label: 'Share' },
      { id: 'receipt-save', label: 'Save receipt', disabled: true },
    ],
  });
  assert.match(html, /<div class="oaci-actions" data-oaci-action-bar data-oaci-noprint>/u);
  for (const id of ['print', 'pdf', 'json', 'share', 'receipt-save']) {
    assert.ok(html.includes(`data-oaci-action="${id}"`), `${id} is in the bar`);
  }
  assert.match(html, /data-oaci-action="receipt-save" disabled/u);
  assert.match(html, /data-oaci-action-status/u);
  const withoutActions = render(canonicalFixture(), { actionStatusSlot: false });
  assert.doesNotMatch(withoutActions, /oaci-action-bar/u);
});

/* -------------------------------------------------------------- escaping */

test('every interpolated string is escaped and no markup survives', () => {
  const html = render(hostileFixture());
  assert.doesNotMatch(html, /<script>/u);
  assert.doesNotMatch(html, /<img src=x/u);
  assert.doesNotMatch(html, /<em>markup in a limitation<\/em>/u);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/u);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/u);
  assert.match(html, /&lt;b&gt;markup&lt;\/b&gt; &amp; an ampersand/u);
});

test('no state leaks undefined, NaN or an object into the output', () => {
  const fixtures = [
    canonicalFixture(), collisionFixture(), richFixture(), contentFreeFixture(),
    withheldFixture(), tooShortFixture(), errorFixture(), notAssessedFixture(), hostileFixture(),
  ];
  for (const fixture of fixtures) {
    const html = render(fixture);
    assert.doesNotMatch(html, /undefined/u, `${fixture.result_id} prints no undefined`);
    assert.doesNotMatch(html, /NaN/u, `${fixture.result_id} prints no NaN`);
    assert.doesNotMatch(html, /\[object /u, `${fixture.result_id} prints no [object`);
    assert.doesNotMatch(html, /\bnull\b/u, `${fixture.result_id} prints no bare null`);
  }
});

/* ---------------------------------------------------------- accessibility */

test('headings run in order without a skipped level', () => {
  const html = render(richFixture());
  const levels = [...html.matchAll(/<h([1-6])[\s>]/gu)].map((match) => Number(match[1]));
  assert.ok(levels.length >= 8, 'the result is a real document outline');
  assert.equal(levels[0], 2, 'the masthead opens at h2 by default');
  let previous = levels[0];
  for (const level of levels) {
    assert.ok(level - previous <= 1, `heading h${level} does not skip a level after h${previous}`);
    previous = level;
  }
});

test('the base heading level is configurable for a host that already owns h1 and h2', () => {
  const html = render(canonicalFixture(), { headingLevel: 3 });
  assert.match(html, /<h3 class="oaci-mast__product">/u);
  assert.match(html, /<h4 class="oaci-verdict__level"/u);
  assert.doesNotMatch(html, /<h2[\s>]/u);
});

test('every section row is a keyboard-operable disclosure with a named target', () => {
  const html = render(canonicalFixture());
  const toggles = [...html.matchAll(/<button type="button" class="oaci-strip__bar" data-oaci-section-toggle="(\d+)" aria-expanded="(true|false)" aria-controls="([^"]+)"/gu)];
  assert.equal(toggles.length, 2, 'both sections have a toggle');
  for (const [, index, expanded, controls] of toggles) {
    assert.equal(expanded, 'true', 'evidence is visible by default');
    assert.ok(html.includes(`id="${controls}"`), `${controls} exists`);
    assert.ok(html.includes(`data-oaci-section="${index}"`), 'the panel is the section it names');
  }
  assert.match(html, /aria-label="Section 1 of 2: Likely AI, AI-writing similarity score 0\.966\. Show the evidence for this section\."/u);
  assert.match(html, /, the strongest section\. Show the evidence for this section\./u);
});

test('every landmark section is named', () => {
  const html = render(canonicalFixture());
  for (const match of html.matchAll(/<section class="([^"]*)"([^>]*)>/gu)) {
    const attributes = match[2];
    if (match[1].split(/\s+/u).includes('oaci-dive')) {
      assert.match(attributes, /aria-label="Inside section/u);
    }
  }
  const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/gu)].map((match) => match[1]);
  assert.ok(labelled.length >= 5, 'the major regions are labelled');
  for (const id of labelled) assert.ok(html.includes(`id="${id}"`), `${id} resolves to a heading`);
});

/* ----------------------------------------------------------------- copy */

test('the copy stays plain and avoids the banned register', () => {
  const html = render(richFixture()).toLowerCase();
  for (const word of BANNED_WORDS) assert.ok(!html.includes(word), `"${word}" does not appear`);
  assert.ok(!html.includes('same engine everywhere'), 'no cross-surface engine claim');
  assert.ok(!/it(?:'|&#39;)s not just .{0,40}, it(?:'|&#39;)s/u.test(html), 'no "not just X, it is Y" construction');
});

test('the level meanings are one plain sentence each and carry no digits', () => {
  for (const level of CHECKER_GAUGE_ORDER) {
    const meaning = CHECKER_LEVEL_MEANINGS[level];
    assert.ok(meaning && meaning.length > 20, `${level} has a meaning`);
    assert.doesNotMatch(meaning, /\d/u, `${level}'s meaning carries no number that could go stale`);
  }
  for (const line of [...CHECKER_MEANING_PANEL.means, ...CHECKER_MEANING_PANEL.not]) {
    assert.doesNotMatch(line, /\d/u);
  }
});

/* ------------------------------------------------------------ fail closed */

test('the renderer refuses a non-canonical result or a surface it was not given', () => {
  assert.throws(() => renderCheckerResult(canonicalFixture(), {}), /surface_required/u);
  assert.throws(() => renderCheckerResult(canonicalFixture(), { surface: '  ' }), /surface_required/u);
  assert.throws(() => renderCheckerResult({}, OPTIONS), /contract_invalid/u);
  const badLevel = canonicalFixture();
  badLevel.sections[0].level = 'likely-ai';
  assert.throws(() => render(badLevel), /section_contract_invalid/u);
  const badIndex = canonicalFixture();
  badIndex.sections[0].index = 1;
  assert.throws(() => render(badIndex), /section_contract_invalid/u);
  const scoredWithoutModel = canonicalFixture();
  scoredWithoutModel.route.model = null;
  assert.throws(() => render(scoredWithoutModel), /assessed_identity_invalid/u);
  const unassessedWithScore = notAssessedFixture();
  unassessedWithScore.axes.ai_pattern.raw_score = 0.9;
  assert.throws(() => render(unassessedWithScore), /unassessed_score_forbidden/u);
});

/* --------------------------------------------------------- the stylesheet */

test('the stylesheet is self-contained, prefixed, themed and printable', () => {
  const css = readFileSync(fileURLToPath(new URL('../checker-ui.css', import.meta.url)), 'utf8');
  assert.doesNotMatch(css, /https?:\/\//u, 'no network request');
  assert.doesNotMatch(css, /@import/u);
  assert.doesNotMatch(css, /url\(/u, 'no external asset');
  assert.match(css, /--oaci-font-display: "Outfit"/u);
  assert.match(css, /--oaci-font-body: "Plus Jakarta Sans"/u);
  assert.match(css, /--oaci-paper: #f2ede6/u);
  assert.match(css, /--oaci-ink: #0f1115/u);
  assert.match(css, /--oaci-orange: #fb700a/u);
  assert.match(css, /--oaci-blue: #0068b3/u);
  for (const band of ['human', 'unclear', 'potential', 'likely', 'strong']) {
    assert.ok(css.includes(`--oaci-band-${band}:`), `the ${band} band has a colour`);
  }
  assert.match(css, /@media \(prefers-color-scheme: dark\)/u);
  assert.match(css, /\[data-theme="dark"\]/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
  assert.match(css, /@media \(forced-colors: active\)/u);
  assert.match(css, /@media print/u);
  assert.match(css, /\[data-oaci-noprint\] \{ display: none !important; \}/u);
  assert.match(css, /container-type: inline-size/u);
  assert.match(css, /@container oaci \(max-width: 560px\)/u);
  // Every class in the file is namespaced. Comments are stripped first: they
  // name other files, and a filename is not a selector.
  const rules = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const classes = new Set([...rules.matchAll(/\.([a-zA-Z][\w-]*)/gu)].map((match) => match[1]));
  for (const name of classes) {
    assert.ok(name.startsWith('oaci-'), `class .${name} is namespaced`);
  }
});

test('the CSS string mirror matches the stylesheet byte for byte', async () => {
  const css = readFileSync(fileURLToPath(new URL('../checker-ui.css', import.meta.url)), 'utf8');
  const { CHECKER_UI_CSS } = await import('../checker-ui-css.mjs');
  assert.equal(CHECKER_UI_CSS, css);
});

test('a standalone document carries the result and the stylesheet and nothing else', async () => {
  const { CHECKER_UI_CSS } = await import('../checker-ui-css.mjs');
  const doc = renderCheckerDocument(canonicalFixture(), OPTIONS, CHECKER_UI_CSS);
  assert.match(doc, /^<!doctype html>/u);
  assert.match(doc, /<meta name="viewport" content="width=device-width, initial-scale=1">/u);
  assert.match(doc, /<title>Opace AI Content Checker &amp; Detector: result result_cycle5_fixture_001<\/title>/u);
  assert.ok(doc.includes('.oaci-result {'), 'the stylesheet is inlined');
  assert.doesNotMatch(doc, /<script/u, 'the document runs nothing');
});

test('heading styling follows the class, not the tag, at every base level', () => {
  // A host that already owns h1 and h2 changes every tag in the component.
  // Styling keyed to a tag would silently fall off, so it is keyed to a class.
  for (const headingLevel of [1, 2, 3]) {
    const html = render(richFixture(), { headingLevel });
    for (const className of ['oaci-strip__title', 'oaci-dive__title', 'oaci-advice__title', 'oaci-axis__label', 'oaci-checks__title', 'oaci-meaning__title', 'oaci-run__title', 'oaci-mast__product', 'oaci-verdict__level']) {
      assert.ok(html.includes(`class="${className}"`) || html.includes(`class="${className}" `) || new RegExp(`class="${className}"`, 'u').test(html), `${className} is present at headingLevel ${headingLevel}`);
    }
    // No heading in the component is left without a class to style it by.
    for (const match of html.matchAll(/<h([1-6])([^>]*)>/gu)) {
      assert.match(match[2], /class="/u, `h${match[1]} carries a class at headingLevel ${headingLevel}`);
    }
  }
});

/* ------------------------------------------- Lane A requests, 2 Sep 2026 */

test('any named surface is accepted, in the new renderer and the legacy shell', async () => {
  const { adaptLegacyAnalysisResult, buildResultPresentation } = await import('../checker-result-presentation.mjs');
  for (const surface of ['WordPress Lab', 'Chrome side panel', 'Astro toolbar', 'Node CLI', 'Python local engine']) {
    const html = render(canonicalFixture(), { surface });
    assert.ok(html.includes(`data-oaci-surface="${surface}"`), `${surface} is accepted`);
  }
  // The legacy adapter and shell lost the two-item allow-list too.
  const legacy = {
    schema_version: '1.0', contract_version: '1.0.0', analysis_id: 'analysis_wp', request_id: 'req_wp',
    source: { content_hash: 'sha256:a', normalised_hash: 'sha256:b', content_type: 'plain_text', language: 'en-GB', word_count: 400 },
    protected_spans: [], methods: [], limitations: ['Authorship cannot be proved from these checks.'],
    combined_verdict: {
      text_integrity: { status: 'clean', reason: 'No hidden-character evidence was found.', findings: [] },
      editorial: { suggestion_level: 'none', reason: 'No editorial suggestions were found.', categories_hit: [] },
    },
    completed_at: '2026-09-02T09:00:00.000Z',
  };
  const adapted = adaptLegacyAnalysisResult(legacy, { surface: 'WordPress Lab', characterCount: 2400, maxCharacters: 50_000, refuseNotTruncate: true });
  assert.equal(adapted.route.location, 'WordPress Lab browser Worker');
  assert.ok(buildResultPresentation(adapted, { surface: 'WordPress Lab', brandAssetUrl: 'x.png' }));
  // A surface still has to be named.
  assert.throws(() => adaptLegacyAnalysisResult(legacy, { surface: '', characterCount: 1, maxCharacters: 10, refuseNotTruncate: true }), /legacy_surface_invalid/u);
});

test('a surface can inject its own level vocabulary, and a partial one is refused', async () => {
  const { resolveCheckerLevels } = await import('../checker-result-presentation.mjs');
  const runtimeLevels = {
    'signal-strongly-ai': { name: 'Very strongly AI', support: 'This draft matches AI writing about as closely as we ever see.' },
    'signal-likely-ai': 'Probably AI',
    'signal-potentially-ai': 'Possibly AI',
    'signal-unclear': 'Cannot say',
    'signal-likely-human': 'Probably human',
    'signal-withheld': 'Not enough text to read',
  };
  const resolved = resolveCheckerLevels(runtimeLevels);
  assert.equal(resolved.labels['signal-strongly-ai'], 'Very strongly AI');
  assert.equal(resolved.labels['signal-likely-ai'], 'Probably AI');
  assert.equal(resolved.meanings['signal-strongly-ai'], 'This draft matches AI writing about as closely as we ever see.');
  // A plain-string entry keeps the built-in meaning rather than inventing one.
  assert.equal(resolved.meanings['signal-likely-ai'], CHECKER_LEVEL_MEANINGS['signal-likely-ai']);

  const html = render(canonicalFixture(), { levels: runtimeLevels });
  assert.match(html, />Very strongly AI</u);
  assert.match(html, /aria-label="AI reading: Very strongly AI/u);
  assert.match(html, /matches AI writing about as closely as we ever see/u);
  assert.doesNotMatch(html, />Strongly AI</u, 'the built-in vocabulary does not leak through');

  // It fails closed rather than half-applying.
  assert.throws(() => resolveCheckerLevels({ 'signal-likely-ai': 'Probably AI' }), /levels_incomplete/u);
  assert.throws(() => resolveCheckerLevels({ ...runtimeLevels, 'signal-made-up': 'Nope' }), /levels_unknown_id/u);
  assert.throws(() => resolveCheckerLevels('nonsense'), /levels_invalid/u);
  // Omitting the option keeps the built-in vocabulary.
  assert.equal(resolveCheckerLevels(undefined).labels, CHECKER_LEVEL_LABELS);
});

/* ---------------------------------- coordinator polish, 2 Sep 2026 ------- */

test('the route line never says the same name twice, and keeps both when they differ', () => {
  const shared = canonicalFixture();
  assert.match(render(shared), /<dt>Route<\/dt><dd>Opace EU server, europe-west1<\/dd>/u);

  const distinct = canonicalFixture();
  distinct.route.kind = 'loopback_engine';
  distinct.route.location = 'Python engine on 127.0.0.1:8765';
  assert.match(render(distinct), /<dt>Route<\/dt><dd>Local engine on this machine · Python engine on 127\.0\.0\.1:8765<\/dd>/u);

  const primitive = notAssessedFixture();
  assert.match(render(primitive), /<dt>Route<\/dt><dd>Named rule checks only · This device, in the browser<\/dd>/u);
});

test('the check cards fill the row whether there is one check or eight', async () => {
  const css = readFileSync(fileURLToPath(new URL('../checker-ui.css', import.meta.url)), 'utf8');
  // auto-fit collapses empty tracks; auto-fill would leave one card in a narrow
  // box beside four empty columns.
  assert.match(css, /\.oaci-checks__list \{[^}]*repeat\(auto-fit, minmax\(260px, 1fr\)\)/u);
  assert.doesNotMatch(css, /oaci-checks__list[^}]*auto-fill/u);

  const one = render(canonicalFixture());
  assert.equal([...one.matchAll(/class="oaci-check"/gu)].length, 1);

  const many = canonicalFixture();
  many.methods = Array.from({ length: 8 }, (unused, index) => ({
    ...many.methods[0],
    id: `check.number${index}`,
    provider_or_method: `Named check ${index + 1}`,
    status: ['pass', 'attention', 'fail', 'inconclusive', 'unsupported', 'not_configured', 'not_run', 'error'][index],
  }));
  const eight = render(many);
  assert.equal([...eight.matchAll(/class="oaci-check"/gu)].length, 8);
  // Name and status share the first line, so the chips align down the column.
  assert.equal([...eight.matchAll(/<div class="oaci-check__top"><span class="oaci-check__name">[^<]*<\/span><span class="oaci-status"/gu)].length, 8);
});

test('the em-dash appears only in the sentences the website already ships', () => {
  const source = readFileSync(fileURLToPath(new URL('../checker-result-presentation.mjs', import.meta.url)), 'utf8');
  // Everything below the marker is this lane's renderer.
  const renderer = source.slice(source.indexOf('Website-grade result presentation'));
  // The accepted website sentences, verbatim. Anything else that reaches a
  // reader uses a comma, a colon or a full stop.
  const WEBSITE_SENTENCES = [
    'matches AI writing — the kind of match',
    'the AI patterns we test for — though a heavily disguised',
    'came from other patterns — for example',
    'the whole passage flows — the mix of sentence shapes',
    'than people typically do — common in list-like or link-heavy writing — and the model',
    'between the typical ranges — one reason the model',
    'share no key words at all —',
    'from one to the next — the thread human writing usually keeps',
    'Nothing to tweak here — this passage reads naturally',
    'from our writing rules — it never counts towards the AI reading',
    'zero-to-one pattern scale — not a percentage of AI text',
  ];
  let remaining = renderer;
  for (const sentence of WEBSITE_SENTENCES) {
    assert.ok(remaining.includes(sentence), `the website sentence "${sentence.slice(0, 40)}…" is still shipped verbatim`);
    remaining = remaining.replaceAll(sentence, '');
  }
  const stray = [...remaining.matchAll(/.{45}—.{45}/gu)].map((match) => match[0].replace(/\s+/gu, ' '));
  assert.deepEqual(stray, [], `unexpected em-dash in generated copy:\n${stray.join('\n')}`);

  // And the rendered output agrees. The fixture is checked first for em-dashes
  // of its own: a reader's quoted passage or a producer's reason is their text,
  // not our copy, and the renderer has no business rewriting either.
  const fixture = canonicalFixture();
  // The share payload's honesty line carries one, but the renderer never prints
  // the share payload, so it cannot reach the page.
  const rendered = { ...fixture, exports: { ...fixture.exports, share: { ...fixture.exports.share, payload: null } } };
  assert.ok(!JSON.stringify(rendered).includes('—'), 'the rendered fields of the fixture carry no em-dash of their own');
  const html = render(fixture);
  for (const [context] of html.matchAll(/.{0,60}—.{0,60}/gu)) {
    assert.ok(
      WEBSITE_SENTENCES.some((sentence) => {
        const core = sentence.replace(/^[^a-zA-Z]+/u, '').slice(0, 20);
        return context.includes(core);
      }),
      `rendered em-dash outside the website's own sentences: ${context}`,
    );
  }
});

/* ------------------------------- Lane A and Lane C requests, 2 Sep 2026 -- */

test('every rule in the stylesheet is scoped to the root, so a host page is untouched', () => {
  const css = readFileSync(fileURLToPath(new URL('../checker-ui.css', import.meta.url)), 'utf8');

  // Walk the file, collecting the selector list in front of every `{` that is
  // not an at-rule prelude. Comments are stripped first so a class named in
  // prose is not mistaken for a selector.
  const source = css.replace(/\/\*[\s\S]*?\*\//gu, '');
  const selectors = [];
  const atStack = [];
  let prelude = '';
  for (const character of source) {
    if (character === '{') {
      const text = prelude.trim();
      const isAtRule = text.startsWith('@');
      atStack.push(isAtRule);
      // Only a prelude sitting outside a declaration block is a selector list.
      if (!isAtRule && atStack.slice(0, -1).every(Boolean)) selectors.push(text);
      prelude = '';
    } else if (character === '}') {
      atStack.pop();
      prelude = '';
    } else if (character === ';' && atStack.length) {
      prelude = '';
    } else {
      prelude += character;
    }
  }

  assert.ok(selectors.length > 100, `the file was parsed (${selectors.length} rules found)`);
  const unscoped = [];
  for (const list of selectors) {
    for (const selector of list.split(',')) {
      const trimmed = selector.trim();
      if (!trimmed) continue;
      // Allowed: anything mentioning the root class anywhere (including an
      // ancestor theme hook such as [data-theme="dark"] .oaci-result), and
      // :root, which sets nothing visual on a host's own elements.
      if (trimmed.includes('.oaci-result') || trimmed.startsWith(':root')) continue;
      unscoped.push(trimmed);
    }
  }
  assert.deepEqual(unscoped, [], `these selectors would style a host page:\n${unscoped.join('\n')}`);

  // The names Lane A reported: the WordPress admin screen owns all four.
  for (const leaky of ['.oaci-panel', '.oaci-actions', '.oaci-status', '.oaci-certainty']) {
    assert.doesNotMatch(css, new RegExp(`^\\s*\\${leaky}[^{]*\\{`, 'mu'), `${leaky} is never declared at the top level`);
    assert.ok(css.includes(`.oaci-result ${leaky}`), `${leaky} is declared under the root instead`);
  }
});

test('the narrow layout tokens are set on the children, not on the container itself', () => {
  // A container query never matches its own container, so `.oaci-result` inside
  // `@container oaci` is a rule that silently does nothing.
  const css = readFileSync(fileURLToPath(new URL('../checker-ui.css', import.meta.url)), 'utf8');
  const narrow = css.slice(css.indexOf('@container oaci (max-width: 560px)'));
  assert.match(narrow, /\.oaci-result > \* \{ --oaci-text-2xl/u);
  assert.doesNotMatch(narrow.slice(0, narrow.indexOf('}')), /^\s*\.oaci-result \{/mu);
});

test('a surface can supply per-section editing advice without touching the result', () => {
  const base = canonicalFixture();
  const frozen = JSON.stringify(base);
  const advice = {
    0: [
      { rule_id: 'style.negated_contrast', quote: 'isn’t one single disease', suggestion: 'State what the thing is without the negated set-up.', message: 'A negated contrast template appears here.' },
      { rule_id: 'style.hollow_intensifier', quote: 'genuinely', suggestion: 'Cut the intensifier.', message: 'A hollow intensifier adds emphasis without information.' },
    ],
  };
  const html = render(base, { advice });
  assert.equal(JSON.stringify(base), frozen, 'the result object is not mutated');
  assert.match(html, /How to improve this passage/u);
  assert.match(html, /data-oaci-rule="style\.negated_contrast"/u);
  assert.match(html, /<b>“isn’t one single disease”<\/b>/u);
  assert.match(html, /Try: State what the thing is without the negated set-up\./u);
  assert.match(html, /A negated contrast template appears here\./u);
  // Section 1 got advice; section 2 did not, and says so kindly.
  assert.match(html, /data-oaci-advice="2"/u);
  assert.match(html, /Nothing to tweak here — this passage reads naturally\./u);
});

test('advice may be a callback, an array or a map, and an entry without a quote still reads', () => {
  const byCallback = render(canonicalFixture(), {
    advice: (section, index) => {
      assert.equal(section.index, index, 'the callback is given the section and its index');
      return index === 1 ? [{ suggestion: 'Vary the sentence openings.', message: 'Three sentences in a row open the same way.' }] : [];
    },
  });
  assert.match(byCallback, /In this passage/u, 'an entry with no quote falls back to a neutral title');
  assert.match(byCallback, /Try: Vary the sentence openings\./u);

  const byArray = render(canonicalFixture(), { advice: [[], [{ quote: 'moreover', suggestion: 'Cut it.' }]] });
  assert.match(byArray, /<b>“moreover”<\/b>/u);
  assert.match(byArray, /Try: Cut it\./u);

  // Junk is ignored rather than rendered.
  const junk = render(canonicalFixture(), { advice: { 0: ['not an object', null, 42] } });
  assert.match(junk, /Nothing to tweak here/u);
  assert.doesNotMatch(junk, /undefined|NaN|\[object /u);
});

test('contract evidence and supplied advice are shown together, and a dropped card is said out loud', () => {
  const result = richFixture(); // section 0 carries one editorial_rule evidence item
  const html = render(result, {
    advice: {
      0: [
        { quote: 'genuinely', suggestion: 'Cut the intensifier.' },
        { quote: 'in order to', suggestion: 'Use "to".' },
        { quote: 'utilise', suggestion: 'Use "use".' },
      ],
    },
  });
  // One from the contract plus three supplied is four; three are drawn.
  assert.match(html, /data-oaci-advice="4"/u);
  assert.equal([...html.matchAll(/class="oaci-advice__card"/gu)].length, 3);
  assert.match(html, /1 more suggestion in this passage, under the writing patterns to review\./u);
  assert.match(html, /“isn’t one single disease — it’s”/u, 'the contract entry leads');
});

test('the word re-use meter keeps a label at both ends at every width', () => {
  const html = render(richFixture());
  // Both forms are in the markup; CSS chooses which one the width shows.
  assert.match(html, /<small class="oaci-measure__full">typical AI ~2\.1%<\/small><small class="oaci-measure__brief">AI ~2\.1%<\/small>/u);
  assert.match(html, /<small class="oaci-measure__full">typical human ~6\.3%<\/small><small class="oaci-measure__brief">human ~6\.3%<\/small>/u);
  assert.match(html, /<small class="oaci-measure__full">this passage [\d.]+%<\/small>/u);

  const css = readFileSync(fileURLToPath(new URL('../checker-ui.css', import.meta.url)), 'utf8');
  // The narrow layout swaps the labels. It never hides both.
  assert.doesNotMatch(css, /\.oaci-measure__mark small \{ display: none; \}/u);
  const narrowBlocks = [...css.matchAll(/\.oaci-measure__mark \.oaci-measure__brief \{ display: block; \}/gu)];
  assert.equal(narrowBlocks.length, 2, 'both the container query and the viewport fallback swap the labels');
  assert.equal([...css.matchAll(/\.oaci-measure__mark \.oaci-measure__full \{ display: none; \}/gu)].length, 2);
});
