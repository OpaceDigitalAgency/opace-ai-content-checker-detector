import assert from 'node:assert/strict';
import test from 'node:test';

import { CHECKER_REPORT_CSS, buildCheckerReportHtml, escapeHtml } from '../checker-report-html.mjs';
import { checkerResultFixture, longFixture, notAssessedFixture } from './fixtures.mjs';

const OPTIONS = Object.freeze({ surfaceName: 'Astro toolbar', generatedAt: '2026-09-02T10:00:00Z' });
const build = (result = checkerResultFixture(), extra = {}) => buildCheckerReportHtml(result, { ...OPTIONS, ...extra });

/** Strip the embedded logo so the assertions never accidentally match base64 noise. */
const withoutLogo = (html) => html.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/gu, 'data:image/png;base64,LOGO');

test('the report is a self-contained A4 print document', () => {
  const html = build();
  assert.match(html, /^<!doctype html>/u);
  assert.match(html, /<html lang="en-GB">/u);
  assert.match(html, /<title>AI content integrity report — Opace AI Content Integrity<\/title>/u);
  assert.ok(html.includes('@page{size:A4'), 'the print sheet must declare A4');
  assert.ok(html.includes('counter(page)'), 'page numbers must come from the @page counter');
  assert.ok(html.includes('<style>'), 'the stylesheet must be inline');
});

test('nothing is fetched at render or print time', () => {
  const html = withoutLogo(build());
  assert.doesNotMatch(html, /<script/iu);
  assert.doesNotMatch(html, /<link\b/iu);
  assert.doesNotMatch(html, /@import/u);
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|cdn\./u);
  assert.doesNotMatch(html, /src="(?!data:)/u, 'every image must be an inline data URI');
  assert.ok(html.includes('src="data:image/png;base64,LOGO"'), 'the real product logo must be embedded');
});

test('there are no interactive or non-printing controls', () => {
  const html = build();
  assert.doesNotMatch(html, /data-oaci-noprint/u);
  assert.doesNotMatch(html, /<button|<input|<select|<textarea|<details|<summary|<form/iu);
  assert.doesNotMatch(html, /onclick=|role="button"|Show in draft|Copy link|Share result/iu);
  assert.doesNotMatch(html, /<a\s/iu, 'the printable report carries no clickable controls');
  // The one tab stop is the checks table's scrolling wrapper. A box that scrolls sideways has to
  // be reachable from the keyboard, or its far columns are unreadable without a mouse; it is a
  // named group, not a control. `report-accessibility.test.mjs` holds it to exactly that.
  assert.equal((html.match(/tabindex="0"/gu) ?? []).length, 1);
  assert.match(html, /<div class="oaci-scroll" tabindex="0" role="group" aria-label="/u);
});

test('every item required by acceptance section 6.1 appears in the report', () => {
  const html = withoutLogo(build());
  const required = [
    'Opace AI Content Integrity',
    'Evidence, not guarantees',
    'AI content integrity report',
    'Astro toolbar',
    '02 September 2026 at 10:00 UTC',
    'https://opace.agency/tools/ai/content-verification-integrity/checker/',
    'Strongly AI',
    'Score 0.969',
    'Zero-to-one pattern similarity. This is not a percentage of AI-written text.',
    'The strongest evidence is in section 2 of 2',
    'AI-pattern reading',
    'Text integrity and provenance',
    'Editorial suggestions',
    '120 words',
    'The text was processed for this request and was not retained.',
    'Section scores',
    'Inside section 1 of 2',
    'Inside section 2 of 2',
    'Why it reads this way',
    'The first complete scored passage remains available to the report.',
    'The second complete passage is the strongest section in source order.',
    'Characters, writing and protected facts',
    'Facts kept safe',
    'Content Credentials and watermarks',
    'C2PA text credential',
    'Anthropic official watermark verifier',
    'Checks included in this run',
    'Opace Cycle-5 AI-pattern model',
    'tier3-cycle5-v1',
    'Reliability, limits and correct use',
    'What this means',
    'What this does not mean',
    'Recorded limitations',
    'Run record and support',
    'result_cycle5_fixture_001',
    'max(m1, m2 + 0.34) &gt;= 3.570935',
  ];
  for (const phrase of required) assert.ok(html.includes(phrase), `missing from the HTML report: ${phrase}`);
});

test('every scored section is rendered in document order, bar and card', () => {
  const result = longFixture(9);
  const html = build(result);
  for (const section of result.sections) {
    assert.ok(html.includes(`Inside section ${section.index + 1} of 9`), `section ${section.index + 1} card is missing`);
    assert.ok(html.includes(`>Section ${section.index + 1}</span>`), `section ${section.index + 1} bar is missing`);
  }
  const first = html.indexOf('Inside section 1 of 9');
  const last = html.indexOf('Inside section 9 of 9');
  assert.ok(first > 0 && last > first, 'sections must appear in document order');
});

test('the dial gauge is inline SVG with a text alternative', () => {
  const html = build();
  assert.match(html, /<svg viewBox="0 0 300 150" role="img" aria-label="AI-pattern dial: Strongly AI, display score 0\.969/u);
  assert.equal((html.match(/<path d="M /gu) ?? []).length, 5, 'the dial must draw five bands');
  assert.match(html, /<polygon points="/u, 'the dial must draw a needle');
  for (const hex of ['#1a7349', '#6d7877', '#b06603', '#bf4705', '#a31f17']) {
    assert.ok(html.includes(hex), `band colour ${hex} is missing`);
  }
});

test('collision-prone scores keep their distinct display strings', () => {
  const html = build();
  assert.ok(html.includes('>0.966</b>'));
  assert.ok(html.includes('>0.969</b>'));
  assert.ok(html.includes('Score 0.966'));
  assert.ok(html.includes('Score 0.969'));
  assert.doesNotMatch(html, />0\.97</u);
});

test('no placeholder leaks into the markup', () => {
  for (const result of [checkerResultFixture(), notAssessedFixture(), longFixture()]) {
    const html = withoutLogo(build(result));
    assert.doesNotMatch(html, /undefined/u);
    assert.doesNotMatch(html, /\bNaN\b/u);
    assert.doesNotMatch(html, /\[object Object\]/u);
  }
});

test('the not-assessed profile states the gap instead of inventing a reading', () => {
  const html = build(notAssessedFixture());
  assert.ok(html.includes('Not assessed'));
  assert.ok(html.includes('No score recorded'));
  assert.ok(html.includes('No scored passages'));
  assert.ok(html.includes('No trained model reading is available'));
  assert.doesNotMatch(html, /<polygon points="/u, 'no needle is drawn without a model reading');
});

test('the optional draft appendix is only present when the surface supplies it', () => {
  assert.doesNotMatch(build(), /The complete checked draft/u);
  const html = build(checkerResultFixture(), { fullText: 'The whole submitted draft.' });
  assert.ok(html.includes('The complete checked draft'));
  assert.ok(html.includes('The whole submitted draft.'));
});

test('untrusted values are escaped', () => {
  const result = checkerResultFixture();
  result.sections[0].passage = '<script>alert("x")</script> & "quoted" \'text\'';
  const html = build(result);
  assert.doesNotMatch(html, /<script>alert/u);
  assert.ok(html.includes('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &quot;quoted&quot; &#39;text&#39;'));
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
});

test('the fragment form omits the document shell and the stylesheet is exported', () => {
  const fragment = buildCheckerReportHtml(checkerResultFixture(), { ...OPTIONS, fragment: true });
  assert.match(fragment, /^<article class="oaci-report">/u);
  assert.doesNotMatch(fragment, /<!doctype|<style>/iu);
  assert.ok(CHECKER_REPORT_CSS.includes('.oaci-report'));
  assert.ok(CHECKER_REPORT_CSS.includes('@media print'));
  assert.ok(CHECKER_REPORT_CSS.includes('prefers-color-scheme:dark'));
});

test('an unusable result is refused rather than half-rendered', () => {
  assert.throws(() => buildCheckerReportHtml(null, OPTIONS), /report_result_required/u);
  assert.throws(() => buildCheckerReportHtml({ schema_version: '1.0' }, OPTIONS), /report_result_structure_invalid/u);
});

test('the logo slot answers Lane E: no <img> and no src= when asked', () => {
  const html = build(checkerResultFixture(), { logoStyle: 'background', surfaceName: 'Command line 0.2.0' });
  assert.doesNotMatch(html, /<img|<iframe|<link|<script|@import|src=/iu);
  assert.ok(html.includes('background-image:url(data:image/png;base64,'), 'the real mark is still embedded');
  const urls = [...html.matchAll(/https?:\/\/[^\s"')<]+/gu)].map((match) => match[0]);
  assert.ok(urls.length > 0);
  for (const url of urls) assert.ok(url.startsWith('https://opace.agency/'), `unexpected absolute URL ${url}`);
  assert.ok(html.includes('Command line 0.2.0'));

  const custom = build(checkerResultFixture(), { logoHtml: '<span class="oaci-mark" data-mine="1"></span>' });
  assert.ok(custom.includes('<span class="oaci-mark" data-mine="1"></span>'));
  assert.doesNotMatch(custom, /<img/iu);
});

test('a surface that still holds the draft prints the exact scored characters', () => {
  const draft = `${'A'.repeat(57)} ${'B'.repeat(62)}`;
  const html = build(checkerResultFixture(), { sourceText: draft });
  assert.ok(html.includes('A'.repeat(57)));
  assert.ok(html.includes('B'.repeat(62)));
  assert.doesNotMatch(html, /The first complete scored passage/u, 'the local draft wins over the contract copy');
  assert.throws(() => build(checkerResultFixture(), { sourceText: 'a drifted draft' }), /report_source_text_bounds_invalid/u);
});
