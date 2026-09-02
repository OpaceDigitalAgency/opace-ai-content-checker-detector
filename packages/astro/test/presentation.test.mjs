import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, statSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const theme = read('../src/toolbar-theme.ts');
const toolbar = read('../src/toolbar.ts');
const share = read('../src/share.ts');
const receipt = read('../src/receipt.ts');
const bundle = read('../dist/toolbar.js');

/* --------------------------------------------------------------- theme --- */

test('the panel carries the website visual language and nothing it fetches', () => {
  for (const token of ['--paper:#f2ede6', '--white:#fff', '--orange:#fb700a', '--ink:#0f1115']) {
    assert.ok(theme.includes(token), `missing token ${token}`);
  }
  for (const band of ['--band-human', '--band-unclear', '--band-potential', '--band-likely', '--band-strong']) {
    assert.ok(theme.includes(band), `missing band ${band}`);
  }
  assert.match(theme, /Opace Outfit/u);
  assert.match(theme, /Opace Jakarta/u);
  assert.match(theme, /@media\(max-width:430px\)/u);
  assert.match(theme, /@media\(prefers-reduced-motion:reduce\)/u);
  assert.match(theme, /@media\(forced-colors:active\)/u);
  // No stylesheet, font or image may be pulled over the network.
  assert.doesNotMatch(theme.replace(/^import .*$/gmu, ''), /https?:\/\//u);
});

test('both font subsets are bundled as data URLs and stay inside the size budget', () => {
  const outfit = statSync(new URL('../assets/fonts/outfit-variable.woff2', import.meta.url)).size;
  const jakarta = statSync(new URL('../assets/fonts/plus-jakarta-sans-latin.woff2', import.meta.url)).size;
  assert.ok(outfit + jakarta < 250_000, `bundled fonts are ${outfit + jakarta} bytes`);
  assert.equal(bundle.match(/data:font\/woff2;base64,/gu)?.length, 2);
  assert.match(bundle, /new FontFace\(/u);
});

test('the inspection worker is inlined, so no host dev server has to serve it', () => {
  assert.match(toolbar, /import workerSource from 'opace:worker'/u);
  assert.match(toolbar, /new Worker\(inspectionWorkerUrl\(\)/u);
  assert.doesNotMatch(toolbar, /new Worker\(new URL\('\.\/worker\.js'/u);
  assert.match(bundle, /createObjectURL\(new Blob\(\[\w+\], \{ type: "text\/javascript" \}\)\)/u);
});

/* ------------------------------------------------------------- checker --- */

test('the check page keeps the explicit run, the refusal limit and the ten-second stop', () => {
  assert.match(toolbar, /const LIMIT = 50_000;/u);
  assert.match(toolbar, /refuses anything over \$\{count\(LIMIT\)\} rather than reading a trimmed extract/u);
  assert.match(toolbar, /setTimeout\(\(\) => reject\(new Error\('The checks took longer than ten seconds and were stopped\.'\)\), 10_000\)/u);
  assert.match(toolbar, /Ready\. Nothing has run yet\./u);
});

test('both routes are on this machine and the EU route is not implied', () => {
  assert.match(toolbar, /value="device"/u);
  assert.match(toolbar, /value="quick"/u);
  assert.match(toolbar, /On this device<span class="oacit-tag">Recommended<\/span>/u);
  assert.match(toolbar, /The private EU server route is offered in the WordPress plugin and the Chrome extension, not here\./u);
  assert.doesNotMatch(toolbar, /Private EU analysis<\/b>/u);
});

test('no percentage is ever offered as the reading', () => {
  const copy = toolbar.match(/`[^`]*`/gu)?.join('\n') ?? '';
  assert.doesNotMatch(copy, /% (?:AI|human|likely)/iu);
  assert.doesNotMatch(copy, /percent(?:age)? of AI/iu);
  assert.match(share, /never a percentage/u);
});

test('the model base override is refused unless it is loopback HTTPS', () => {
  assert.match(toolbar, /url\.protocol !== 'https:' \|\| !loopback/u);
  assert.match(toolbar, /'127\.0\.0\.1' \|\| url\.hostname === 'localhost'/u);
  assert.match(toolbar, /return CYCLE5_MODEL_BASE;/u);
  assert.match(toolbar, /allowedModelBaseUrls: \[base\]/u);
});

/* --------------------------------------------------------------- share --- */

test('the share summary is content-free and matches the website fragment', async () => {
  const { buildShareSummary, encodeShared, shareText, shareUrl, HONESTY_LINE } = await import('../dist/share.js');
  const result = {
    axes: { ai_pattern: { assessment_status: 'assessed', level: 'signal-strongly-ai' } },
    sections: [],
    source: { word_count: 530 },
    route: { model: { identity: 'tier3-cycle5-v1' } },
    exports: {
      share: {
        available: true,
        contains_content: false,
        payload: {
          level: 'signal-strongly-ai',
          display_score: '0.969',
          sections: [{ index: 0, raw_score: 0.9655, display_score: '0.966', level: 'signal-likely-ai' }, { index: 1, raw_score: 0.9685, display_score: '0.969', level: 'signal-strongly-ai' }],
          word_count: 530,
          date: '2026-09-02',
          model_version: 'tier3-cycle5-v1',
        },
      },
    },
  };
  const summary = buildShareSummary(result);
  assert.equal(summary.levelId, 'signal-strongly-ai');
  assert.equal(summary.sections.length, 2);
  assert.equal(summary.words, 530);

  const wire = JSON.parse(Buffer.from(encodeShared(summary).replaceAll('-', '+').replaceAll('_', '/'), 'base64').toString('utf8'));
  assert.equal(wire.v, 1);
  assert.equal(wire.l, 4);
  assert.deepEqual(wire.s, [[0, 0.9655, 3], [1, 0.9685, 4]]);
  assert.equal(wire.w, 530);
  assert.equal(wire.d, '2026-09-02');

  const url = shareUrl(summary);
  assert.ok(url.startsWith('https://opace.agency/tools/ai/content-verification-integrity/checker/#shared='));
  assert.ok(!url.includes('?'), 'a share must not put anything in a query string');

  const text = shareText(summary);
  assert.ok(text.includes(HONESTY_LINE));
  assert.match(text, /Section 1: 0\.966 · Likely AI/u);
  assert.match(text, /never a percentage/u);
  assert.ok(!/%/u.test(text.replace(/https?:\S+/gu, '')), 'a share summary must not print a percentage');
});

test('a withheld or unassessed reading is never shared', async () => {
  const { buildShareSummary } = await import('../dist/share.js');
  assert.equal(buildShareSummary({ exports: { share: { available: false } } }), undefined);
  assert.equal(buildShareSummary({ exports: { share: { available: true, contains_content: true, payload: {} } } }), undefined);
  assert.equal(buildShareSummary({ exports: { share: { available: true, contains_content: false, payload: { level: 'withheld' } } } }), undefined);
});

/* ------------------------------------------------------------- receipt --- */

test('the receipt keeps the exact reading and refuses content-shaped fields', async () => {
  const { buildContentFreeReceipt, assertContentFree, RECEIPT_VERSION } = await import('../dist/receipt.js');
  const result = {
    schema_version: '1.0', contract_version: '1.0.0', result_id: 'astro_cycle5_fixture', profile: 'full_checker',
    generated_at: '2026-09-02T09:00:00.000Z',
    source: { content_hash: 'sha256:a', normalised_hash: 'sha256:b', content_type: 'plain_text', language: 'en-GB', word_count: 530, character_count: 3_120, section_count: 2 },
    route: { kind: 'on_device', location: 'This browser', content_transfer: 'none', privacy_route: 'browser', consent: 'explicit', retention: { content: 'none' }, model: { identity: 'tier3-cycle5-v1', precision: 'int8' } },
    axes: {
      ai_pattern: { assessment_status: 'assessed', method_status: 'attention', source: 'tier3-cycle5-v1', raw_score: 0.9685, raw_margin: 3.6, display_score: '0.969', score_scale: 'zero_to_one_pattern_similarity', level: 'signal-strongly-ai', primary_display_threshold: 0.9679, secondary_display_threshold: 0.9562, flagged: true, flag_reason: 'primary', strongest_section_index: 1, reason: 'Strong match.', limitations: ['Patterns, not authorship.'] },
      text_integrity: { method_status: 'pass', reading: 'clean', reason: 'Nothing hidden.', findings: [], limitations: [] },
      editorial: { method_status: 'pass', reading: 'none', reason: 'Nothing to suggest.', findings: [], limitations: [] },
    },
    sections: [{ index: 0, start_utf16: 0, end_utf16: 1_180, word_count: 274, raw_score: 0.9655, raw_margin: 3.49, display_score: '0.966', level: 'signal-likely-ai', passage: 'Exact page text that must never reach a receipt.', evidence: [{ id: 'cycle5-section-0', kind: 'trained_model', summary: 'x', detail: 'y', basis: 'tier3-cycle5-v1' }] }],
    methods: [{ id: 'unicode.invisible', category: 'unicode', provider_or_method: 'Unicode inspection', version: 'unicode:2026.08.2', status: 'pass', privacy_route: 'browser', limitations: [] }],
    provenance: { protected_facts: { count: 0, categories: [] } },
    abuse_controls: { refuse_not_truncate: 'enforced' },
    limitations: ['Patterns, not authorship.'],
  };
  const built = buildContentFreeReceipt(result, '2026-09-02T09:00:01.000Z');
  const json = JSON.stringify(built);
  assert.equal(built.contains_content, false);
  assert.equal(built.receipt_version, RECEIPT_VERSION);
  assert.equal(built.axes.ai_pattern.display_score, '0.969');
  assert.equal(built.sections[0].display_score, '0.966');
  assert.equal(built.sections[0].evidence[0].id, 'cycle5-section-0');
  assert.ok(!json.includes('Exact page text'), 'a passage reached the receipt');
  assert.ok(!json.includes('"passage"'), 'a passage field reached the receipt');
  assert.match(json, /No page text, page URL or route path is retained in this receipt\./u);
  assert.throws(() => assertContentFree({ sections: [{ passage: 'leak' }] }), /could carry page content/u);
  assert.throws(() => assertContentFree({ route: { url: 'https://example.test/page' } }), /could carry page content/u);
  assert.throws(() => assertContentFree({ axes: { text: 'A whole sentence of the draft leaked here.' } }), /could carry page content/u);
  assert.doesNotThrow(() => assertContentFree({ route: { retention: { content: 'none' }, location: 'This browser' } }));
});

test('the receipt module states its own boundary', () => {
  assert.match(receipt, /It never carries the\s+\*?\s*page text\./u);
  assert.match(receipt, /FORBIDDEN_KEYS/u);
  assert.match(receipt, /CHECKED_KEYS/u);
});

/* ------------------------------------------------- shared presentation --- */

test('the toolbar draws the shared website-grade reading, not a local one', () => {
  assert.match(toolbar, /import \{ adaptLegacyAnalysisResult, mount \}/u);
  assert.match(toolbar, /import \{ CHECKER_UI_CSS \}/u);
  assert.match(toolbar, /\$\{TOOLBAR_CSS\}\\n\$\{CHECKER_UI_CSS\}/u);
  assert.match(toolbar, /mount\(host, checkerResult, \{/u);
  // The shell must not collide with the shared component's own class names.
  assert.doesNotMatch(theme, /\.oaci-(?:mast|panel|chip|status|actions|run|result)\b/u);
});

test('the printable report is the shared branded report, opened in its own tab', () => {
  assert.match(toolbar, /import \{ buildCheckerReportHtml, CHECKER_REPORT_CSS \} from '\.\.\/\.\.\/\.\.\/shared\/report\/checker-report-html\.mjs'/u);
  assert.match(toolbar, /buildCheckerReportHtml\(checkerResult, \{/u);
  assert.match(toolbar, /surfaceName: 'Astro dev toolbar'/u);
  // The shared article is wrapped in this surface's own <main>, so the page has a landmark.
  assert.match(toolbar, /fragment: true/u);
  assert.ok(toolbar.includes('<body><main>${article}</main></body>'), 'the shared article must sit inside a main landmark');
  assert.match(toolbar, /window\.open\(url, '_blank', 'noopener'\)/u);
  assert.match(toolbar, /save it as a PDF/u);
});

test('a complete printable report carries the evidence baseline and no script', async () => {
  const { buildCheckerReportHtml } = await import('../../../shared/report/checker-report-html.mjs');
  const { richFixture } = await import('../../../shared/presentation/test/fixtures.mjs');
  const article = buildCheckerReportHtml(richFixture(), { surfaceName: 'Astro dev toolbar', fragment: true });
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>t</title></head><body><main>${article}</main></body></html>`;
  assert.match(html, /^<!doctype html>/iu);
  assert.match(html, /<main>/u, 'the report page must carry a main landmark');
  assert.match(html, /<h1[ >]/u, 'a standalone report must open at h1');
  assert.match(html, /Opace AI Content Integrity/u);
  assert.doesNotMatch(html, /<script/iu);
  assert.doesNotMatch(html, /https?:\/\/(?!opace\.agency)/u);
  for (const expected of ['AI-pattern reading', 'What this means', 'What this does not mean', 'Run record']) {
    assert.ok(html.includes(expected), `printable report is missing "${expected}"`);
  }
});


/* ------------------------------------------------------- owner follow-ups --- */

test('the rail icon is one monochrome glyph, not the colour logo tile', () => {
  const index = read('../src/index.ts');
  const icon = /icon: '(<svg[\s\S]*?<\/svg>)'/u.exec(index)?.[1] ?? '';
  assert.ok(icon, 'no rail icon found');
  assert.match(icon, /stroke="currentColor"/u);
  assert.match(icon, /fill="none"/u);
  // A single-colour glyph carries no literal colour of its own.
  assert.doesNotMatch(icon, /#[0-9a-f]{3,8}/iu, 'the rail icon must not hard-code a colour');
  assert.doesNotMatch(icon, /<rect width="64" height="64"/u, 'the colour logo tile must not be the rail icon');
  // The colour mark still belongs in the panel masthead.
  assert.match(toolbar, /<img src="\$\{canonicalProductLogo\}"/u);
});

test('the model download is described as a data file, not a program', () => {
  for (const source of [toolbar, read('../README.md')]) {
    assert.match(source, /data file of model weights|model weights — numbers|model weights - numbers/u);
    assert.match(source, /cannot execute|not a program/u);
    assert.match(source, /SHA-256/u);
    assert.match(source, /browser cache/u);
  }
  // The size and the first eight characters of the published hash are both shown.
  assert.match(toolbar, /hashShort: CYCLE5_MODEL_SHA256\.slice\(0, 8\)/u);
  assert.match(toolbar, /\$\{MODEL_FACTS\.hashShort\}…/u);
  assert.match(toolbar, /\$\{MODEL_FACTS\.size\}/u);
});

test('every tab that ships has a body, and the empty one was removed', () => {
  const views = /const VIEWS: Array<\[View, string\]> = \[([\s\S]*?)\];/u.exec(toolbar)?.[1] ?? '';
  const ids = [...views.matchAll(/\['([a-z]+)', '([^']+)'\]/gu)].map((match) => [match[1], match[2]]);
  assert.deepEqual(ids.map(([id]) => id), ['checker', 'fix', 'claude', 'receipts', 'settings']);
  assert.deepEqual(ids.map(([, label]) => label), ['Check page', 'Protect & fix', 'Claude readiness', 'Receipts', 'Settings']);
  assert.doesNotMatch(toolbar, /indexView/u);
  assert.doesNotMatch(toolbar, /Planned, not built/u);
  // Each view opens with a heading and one plain-English line saying what it does.
  for (const view of ['checkerView', 'fixView', 'claudeView', 'receiptsView', 'settingsView']) {
    const body = new RegExp(`const ${view} = \\(\\): string => \`([\\s\\S]*?)\`;`, 'u').exec(toolbar)?.[1] ?? '';
    assert.ok(body, `${view} not found`);
    assert.match(body, /<h2>[^<]+<\/h2>\s*<p>[^<]{30,}<\/p>/u, `${view} needs a one-line description under its heading`);
  }
});

test('the fix tab says in its first line that only Unicode fixes ship', () => {
  const body = /const fixView = \(\): string => `([\s\S]*?)`;/u.exec(toolbar)?.[1] ?? '';
  const lede = /<h2>[^<]+<\/h2>\s*<p>([^<]+)<\/p>/u.exec(body)?.[1] ?? '';
  assert.match(lede, /only one kind of fix/iu);
  assert.match(lede, /invisible Unicode/u);
  assert.match(body, /Rewriting the writing is not in this release/u);
});
