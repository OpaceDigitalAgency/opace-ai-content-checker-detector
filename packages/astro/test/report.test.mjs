import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm, symlink, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { analyseHtml, shouldInclude, visibleHtml } from '../dist/report.js';
import { normaliseOptions } from '../dist/options.js';
import { writeBuildReport } from '../dist/report.js';

test('visible HTML excludes executable and hidden semantic containers', () => {
  const html = '<main><h1>A &amp; B</h1><script>SECRET</script><style>.secret{}</style><template>HIDDEN</template><noscript>NO</noscript><span hidden>HIDDEN ATTRIBUTE</span><i aria-hidden="true">ARIA HIDDEN</i><p>Next 🧪</p></main>';
  assert.equal(visibleHtml(html), 'A & B\nNext 🧪');
});

test('server projection follows frozen body, block and BR browser semantics', () => {
  const html = '<!doctype html><html><head><title>Never projected</title></head><body><h1>Evidence</h1><p>First<br>Second &pound;1</p></body></html>';
  assert.equal(visibleHtml(html), 'Evidence\nFirst\nSecond £1');
});

test('nested hidden and aria-hidden ancestors cannot leak trailing text', () => {
  const html = '<body><div hidden><div>x</div>SECRET</div><section aria-hidden="true"><span>NO</span>TRAIL</section><p>Visible</p></body>';
  assert.equal(visibleHtml(html), 'Visible');
});

test('malformed markup and long attributes keep only projected visible text', () => {
  const html = `<main data-long="${'x'.repeat(60_000)}"><p>Visible &pound; value`;
  assert.equal(visibleHtml(html), 'Visible £ value');
});

test('50,000-character truncation does not split an astral character', () => {
  const html = `<p>${'a'.repeat(49_999)}🧪tail</p>`;
  const text = visibleHtml(html, 50_000);
  assert.equal(text.length, 49_999);
  assert.ok(!text.includes('\uFFFD'));
});

test('build include and generated-output exclusions are explicit', () => {
  const options = normaliseOptions();
  assert.equal(shouldInclude('index.html', options), true);
  assert.equal(shouldInclude('news/article.html', options), true);
  assert.equal(shouldInclude('404.html', options), false);
  assert.equal(shouldInclude('generated/feed-en.html', options), false);
  assert.equal(shouldInclude('search-index.html', options), false);
  assert.equal(shouldInclude('sitemap-view.html', options), false);
  assert.equal(shouldInclude('asset.js', options), false);
});

test('analysis is deterministic, hash-only and keeps Anthropic unsupported', async () => {
  const html = '<article><h1>Evidence</h1><p>In today\'s rapidly evolving landscape, Opace quoted £1,250.</p></article>';
  const a = await analyseHtml(html, 'index.html');
  const b = await analyseHtml(html, 'index.html');
  assert.deepEqual(a, b);
  assert.equal(a.methods.find((method) => method.id === 'watermark.anthropic')?.status, 'unsupported');
  assert.ok(!JSON.stringify(a).includes("today's rapidly"));
});

test('repeat report writes are byte-identical and contain no source route or text', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oaci-astro-report-'));
  try {
    await mkdir(join(root, 'nested'));
    await writeFile(join(root, 'nested', 'index.html'), '<main><h1>Private route marker</h1><p>Useful evidence.</p></main>');
    const options = normaliseOptions();
    const first = await writeBuildReport(pathToFileURL(`${root}/`), options);
    const bytesA = await readFile(new URL(first.json), 'utf8');
    const second = await writeBuildReport(pathToFileURL(`${root}/`), options);
    const bytesB = await readFile(new URL(second.json), 'utf8');
    assert.equal(bytesA, bytesB);
    assert.ok(!bytesA.includes('Private route marker'));
    assert.ok(!bytesA.includes('nested/index.html'));
    assert.equal(JSON.parse(bytesA).contains_content, false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('report output refuses a symlink escape without writing outside dist', async () => {
  const root = await mkdtemp(join(tmpdir(), 'oaci-astro-dist-'));
  const outside = await mkdtemp(join(tmpdir(), 'oaci-astro-outside-'));
  try {
    await symlink(outside, join(root, 'escape'));
    const options = normaliseOptions({ reportDirectory: 'escape/reports' });
    await assert.rejects(writeBuildReport(pathToFileURL(`${root}/`), options), /symbolic link/u);
    await assert.rejects(access(join(outside, 'reports', 'report.json')));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('the build scan labels itself and never claims a model reading', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'oaci-build-scan-'));
  try {
    await writeFile(join(directory, 'index.html'), '<html><body><main><p>A short generated route with enough visible words to be counted by the deterministic build scan.</p></main></body></html>', 'utf8');
    const evidence = await writeBuildReport(pathToFileURL(`${directory}/`), normaliseOptions({}));
    const report = JSON.parse(await readFile(new URL(evidence.json), 'utf8'));
    const html = await readFile(new URL(evidence.html), 'utf8');

    assert.equal(report.profile, 'build_scan');
    assert.equal(report.package_version, '0.2.1');
    assert.equal(report.contains_content, false);
    assert.equal(report.axes.ai_pattern.assessment_status, 'not_assessed');
    assert.equal(report.axes.text_integrity.method_status, 'per_route');
    assert.equal(report.axes.editorial.method_status, 'per_route');
    assert.match(report.axes.ai_pattern.reason, /A build runs no trained model/u);

    assert.match(html, /Deterministic build scan/u);
    assert.match(html, /It is not the checker\./u);
    assert.match(html, /not assessed/u);
    assert.match(html, /Opace AI Content Integrity/u);
    assert.match(html, /Evidence, not guarantees/u);
    assert.match(html, /oaci-result/u, 'the build scan must use the shared product stylesheet');
    assert.doesNotMatch(html, /<script/iu);
    assert.doesNotMatch(html, /A short generated route with enough visible words/u);
    assert.doesNotMatch(html, /index\.html/u);
    assert.doesNotMatch(html, /https?:\/\/(?!opace\.agency|www\.w3\.org)/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
