/**
 * The editor panel, in a real browser.
 *
 * The states this holds are the ones a string assertion cannot settle: what the
 * button says before it is pressed, what a finished reading looks like in a
 * 280-pixel column, and that the panel says something honest when a run is too
 * short, refused, cancelled or impossible. The panel's own modules are served
 * from disk; the compiled engine and the Cycle-5 wrapper are stood in for so the
 * states can be reached deliberately rather than waited for.
 *
 * Every test carries a control where one is possible.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '../../../../node_modules/playwright/index.mjs';

const pluginDir = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const TYPES = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html; charset=utf-8', '.woff2': 'font/woff2', '.webp': 'image/webp', '.png': 'image/png' };

/** A draft long enough for the model's own minimum, so the short state is deliberate. */
const LONG_DRAFT = 'The report is not one single conclusion but a set of them. '.repeat(12);
const SHORT_DRAFT = 'Three words only.';

const harness = (draft) => `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
<link rel="stylesheet" href="/assets/css/editor.css">
<title>editor panel harness</title>
<style>body{margin:0;background:#f0f0f1;font-family:system-ui}
  .frame{box-sizing:border-box;width:280px;padding:16px;background:#fff;border-left:1px solid #ddd;min-height:100vh}</style>
</head><body class="wp-admin"><div class="frame"><div id="panel"></div></div>
<script type="module">
import { mountEditorPanel } from '/assets/js/editor-panel.mjs?ver=cache-test';
window.__draft = ${JSON.stringify(draft)};
window.__panel = mountEditorPanel(document.querySelector('#panel'), {
  surface: 'block',
  getContent: () => window.__draft,
  config: {
    restUrl: window.location.origin + '/wp-json/oaci/v1/',
    nonce: 'test-nonce',
    postId: 12,
    maxChars: 100000,
    labUrl: '/wp-admin/admin.php?page=oaci-lab',
    checkUrl: '/wp-admin/admin.php?page=oaci-lab&oaci_post=12',
    logoUrl: '/assets/images/opace-ai-content-checker-mark.png',
    limits: { maxChars: 100000, minWords: 60, serverPerMin: 3, serverPerHour: 20, sitePerHour: 30, sitePerDay: 120 },
    onDevice: { modelBaseUrl: 'https://opace.agency/models/local-signals-v1/', download: '34.5 MB' },
    serverAnalysis: window.__server || { available: false, checking: false, state: 'off' },
    modules: {
      panel: '/assets/js/editor-panel.mjs',
      engine: '/assets/js/editor-check.mjs',
      core: '/tests/fixtures/editor/fake-core.mjs',
      cycle5: '/tests/fixtures/editor/fake-cycle5.mjs',
      worker: ''
    }
  }
});
window.__ready = true;
</script></body></html>`;

async function serve(draft) {
	const server = createServer(async (request, response) => {
		const url = new URL(request.url, 'http://127.0.0.1');
		if (url.pathname === '/' || url.pathname === '/harness.html') {
			response.writeHead(200, { 'content-type': TYPES['.html'] });
			response.end(harness(draft));
			return;
		}
		const path = join(pluginDir, normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
		if (!path.startsWith(pluginDir)) { response.writeHead(403).end(); return; }
		try {
			const info = await stat(path);
			if (!info.isFile()) throw new Error('not a file');
		} catch {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
		createReadStream(path).pipe(response);
	});
	await new Promise((done) => server.listen(0, '127.0.0.1', done));
	return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function open(options = {}) {
	const { server, origin } = await serve(options.draft ?? LONG_DRAFT);
	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: options.width ?? 1280, height: options.height ?? 900 } });
	const errors = [];
	page.on('pageerror', (error) => errors.push(String(error)));
	page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
	await page.addInitScript((state) => {
		window.__server = state.server;
		globalThis.__oaciModelCached = state.modelCached === true;
		globalThis.__oaciServerRefuses = state.serverRefuses || false;
		globalThis.__oaciHoldDownload = state.holdDownload === true;
	}, options);
	// The EU route's own transport is real; only the service's answer is stood in
	// for, so `analyseOnServer` still has to accept it.
	await page.route('**/analysis/server', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ channel: 'wordpress-v1', processed: 'server', retained: 'nothing' })
	}));
	await page.route('**/analysis/server/status', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ available: true, checking: false, state: 'ready' })
	}));
	await page.route('**/editor/handoff/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"stored":true}' }));
	await page.goto(`${origin}/harness.html`);
	await page.waitForFunction(() => window.__ready === true);
	return {
		page,
		errors,
		async close() { await browser.close(); await new Promise((done) => server.close(done)); }
	};
}

const text = (page, selector) => page.locator(selector).innerText();
/**
 * The words in an element whether or not it is on screen. The run record moved
 * inside a closed disclosure, and `innerText` of a closed `<details>` is empty,
 * so a test that used it would pass on a panel that had stopped saying where the
 * reading came from.
 */
const words = (page, selector) => page.evaluate((sel) => document.querySelector(sel)?.textContent?.trim() || '', selector);

test('stored readings use current meanings without rewriting the original result or hiding failures', async () => {
	const session = await open();
	try {
		const checks = await session.page.evaluate(async () => {
			const { renderEditorSummary } = await import('/assets/js/editor-summary.mjs');
			const { CHECKER_LEVEL_MEANINGS, CHECKER_LEVEL_LABELS } = await import('/assets/vendor/shared/presentation/checker-result-presentation.mjs');
			const original = (await (await fetch('/tests/fixtures/contracts/valid/checker-result.json')).json()).data;
			return Object.entries(CHECKER_LEVEL_MEANINGS).map(([level, meaning]) => {
				const result = structuredClone(original);
				result.axes.ai_pattern.level = level;
				result.axes.ai_pattern.assessment_status = 'assessed';
				result.axes.ai_pattern.reason = 'Nothing here matches AI writing patterns.';
				const before = JSON.stringify(result);
				const target = document.createElement('div');
				renderEditorSummary(target, result, { levels: CHECKER_LEVEL_LABELS, honestyLine: 'Patterns, not proof.' });
				const current = [target.querySelector('.oaci-ed-meaning').textContent, target.querySelector('.oaci-ed-meaning-detail')?.textContent].filter(Boolean).join(' ');
				const unchanged = JSON.stringify(result) === before;
				result.axes.ai_pattern.assessment_status = 'error';
				result.axes.ai_pattern.level = null;
				result.axes.ai_pattern.reason = 'The analysis service could not be reached.';
				const failedTarget = document.createElement('div');
				renderEditorSummary(failedTarget, result, { levels: CHECKER_LEVEL_LABELS, honestyLine: 'Patterns, not proof.' });
				return { level, current, meaning, unchanged, error: failedTarget.querySelector('.oaci-ed-meaning').textContent };
			});
		});
		for (const row of checks) {
			assert.equal(row.current, row.meaning, row.level);
			assert.equal(row.unchanged, true);
			assert.equal(row.error, 'The analysis service could not be reached.');
		}
	} finally { await session.close(); }
});

test('the approved mark loads and child modules inherit the entry version', async () => {
	const session = await open({ modelCached: true });
	try {
		const { page } = session;
		await page.locator('.oaci-ed__mark').evaluate(image => image.decode());
		assert.match(await page.locator('.oaci-ed__mark').getAttribute('src'), /opace-ai-content-checker-mark\.png$/);
		const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => new URL(entry.name).pathname + new URL(entry.name).search));
		assert.ok(resources.includes('/assets/js/editor-summary.mjs?ver=cache-test'));
		assert.ok(resources.includes('/assets/js/editor-check.mjs?ver=cache-test'));
	} finally { await session.close(); }
});

test('an on-device editor reading opens locally without a server hand-off', async () => {
	const session = await open({ modelCached: true });
	try {
		const requests = [];
		session.page.on('request', request => requests.push(request.url()));
		await session.page.click('.oaci-ed__go');
		await session.page.locator('.oaci-ed-result').waitFor();
		await session.page.waitForFunction(() => Object.keys(sessionStorage).some(key => key.startsWith('oaci.editor.handoff:')));
		const collected = await session.page.evaluate(async () => {
			const { collectEditorHandoff } = await import('/assets/js/editor-check.mjs');
			const options = { restUrl: location.origin + '/wp-json/oaci/v1/', pageUrl: location.href, nonce: 'test-nonce', postId: 12 };
			const result = await collectEditorHandoff(options);
			return { content: result.content, level: result.result.axes.ai_pattern.level, second: await collectEditorHandoff(options) };
		});
		assert.equal(collected.content, LONG_DRAFT);
		assert.ok(collected.level);
		assert.equal(collected.second, null);
		assert.equal(requests.some(url => url.includes('/editor/handoff/')), false);
	} finally { await session.close(); }
});

test('a narrow completed panel stays compact with accessible expandable privacy details', async () => {
	const session = await open({ modelCached: true, width: 375 });
	try {
		const { page } = session;
		await page.click('.oaci-ed__go');
		await page.locator('.oaci-ed-result').waitFor();
		const height = await page.locator('.oaci-ed').evaluate(panel => panel.getBoundingClientRect().height);
		assert.ok(height < 600, `compact panel is ${height}px tall`);
		assert.equal(await page.locator('.oaci-ed__head').innerText(), 'On-device analysis');
		assert.equal(await page.locator('.oaci-ed-chip').count(), 2);
		assert.equal(await page.locator('.oaci-ed-privacy').getAttribute('open'), null);
		await page.locator('.oaci-ed-privacy > summary').focus();
		await page.keyboard.press('Enter');
		assert.equal(await page.locator('.oaci-ed-privacy').getAttribute('open'), '');
		assert.match(await text(page, '.oaci-ed-route'), /Read on this device/);
		assert.match(await text(page, '.oaci-ed-privacy'), /not a percentage probability/);
		await page.keyboard.press('Space');
		assert.equal(await page.locator('.oaci-ed-privacy').getAttribute('open'), null);
		for (const selector of ['.oaci-ed__go', '.oaci-ed__open']) {
			const box = await page.locator(selector).boundingBox();
			assert.ok(box.height >= 44, `${selector} has a small touch target`);
		}
	} finally { await session.close(); }
});

test('the button names the download before the first on-device run, and stops promising one after', async () => {
	const uncached = await open({ modelCached: false });
	try {
		await uncached.page.waitForFunction(() => /Download model/.test(document.querySelector('.oaci-ed__go').textContent));
		assert.match(await text(uncached.page, '.oaci-ed__go'), /Download model \(34\.5 MB\) and check/);
		assert.match(await text(uncached.page, '.oaci-ed__note'), /downloads once to this browser/);
	} finally { await uncached.close(); }

	const cached = await open({ modelCached: true });
	try {
		await cached.page.waitForFunction(() => /Check this draft/.test(document.querySelector('.oaci-ed__go').textContent));
		assert.match(await text(cached.page, '.oaci-ed__note'), /already on this device, so nothing downloads/);
	} finally { await cached.close(); }
});

test('an open EU route names the transfer on the button and runs to a reading', async () => {
	const open_ = await open({ server: { available: true, checking: false, state: 'ready' } });
	try {
		const { page, errors } = open_;
		assert.match(await text(page, '.oaci-ed__go'), /Send once to the EU server and check/);
		assert.match(await text(page, '.oaci-ed__route'), /Private EU analysis/);
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed-result', { state: 'visible' });
		assert.equal(await page.locator('.oaci-ed-result').getAttribute('data-level'), 'signal-strongly-ai');
		assert.match(await text(page, '.oaci-ed-level'), /Strongly AI/);
		assert.match(await text(page, '.oaci-ed-score'), /0\.969/);
		// The AI level is the headline, so the chips below it carry the two
		// supporting readings rather than repeating it.
		assert.equal(await page.locator('.oaci-ed-chip').count(), 2);
		assert.match(await words(page, '.oaci-ed-route'), /Read once on our EU server/);
		// The dial is drawn, and its needle sits in the band that was read.
		assert.equal(await page.locator('.oaci-ed-dial__seg[data-active="true"]').getAttribute('data-level'), 'signal-strongly-ai');
		assert.deepEqual(errors, []);
	} finally { await open_.close(); }
});

test('a route that comes up after the page does is the route the run uses', async () => {
	// The service scales to zero, so its answer usually lands after the page. A
	// run built from the render-time configuration refused itself with "off in
	// this site's settings" while the line above the button said the opposite.
	const open_ = await open({ server: { available: false, checking: true, state: 'checking' } });
	try {
		const { page } = open_;
		await page.waitForFunction(() => /Send once to the EU server/.test(document.querySelector('.oaci-ed__go').textContent), null, { timeout: 15000 });
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed-result', { state: 'visible' });
		assert.match(await words(page, '.oaci-ed-route'), /Read once on our EU server/);
		assert.equal(await page.locator('.oaci-ed__notice').isVisible(), false, `the run was refused: ${await text(page, '.oaci-ed__notice')}`);
	} finally { await open_.close(); }
});

test('a refused EU run says why in words and offers the device in one press', async () => {
	const open_ = await open({ server: { available: true, checking: false, state: 'ready' }, serverRefuses: 'site_hourly_limit', modelCached: true });
	try {
		const { page } = open_;
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed__notice[data-kind="warning"]');
		const notice = await text(page, '.oaci-ed__notice');
		assert.match(notice, /30 section readings an hour/);
		assert.doesNotMatch(notice, /site_hourly_limit/, 'a code reached the reader');
		assert.match(await text(page, '.oaci-ed__offer'), /Run on this device instead/);
		// The control: the offer is a way out, not decoration. Pressing it runs.
		await page.click('.oaci-ed__offer');
		await page.waitForSelector('.oaci-ed-result', { state: 'visible' });
		assert.match(await words(page, '.oaci-ed-route'), /Read on this device/);
		assert.equal(await text(page, '.oaci-ed__head'), 'On-device analysis', 'completed route is not overwritten by the route offered for the next run');
		assert.match(await text(page, '.oaci-ed__go'), /EU server/, 'next-run consent still names its next route');
	} finally { await open_.close(); }
});

test('a draft under the minimum still runs the integrity checks and says what is missing', async () => {
	const open_ = await open({ draft: SHORT_DRAFT, modelCached: true });
	try {
		const { page } = open_;
		assert.match(await text(page, '.oaci-ed__note'), /57 more words for an AI reading/);
		// The button cannot reach a model from here, so it does not offer one.
		assert.equal(await text(page, '.oaci-ed__go'), 'Check the characters and writing');
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed__notice');
		assert.match(await text(page, '.oaci-ed__notice'), /not enough text for the model to read/);
		assert.match(await text(page, '.oaci-ed__notice'), /checks above ran on what you have/);
	} finally { await open_.close(); }
});

test('an empty draft disables the button and says so rather than failing on a press', async () => {
	const open_ = await open({ draft: '   ' });
	try {
		const { page } = open_;
		assert.equal(await page.locator('.oaci-ed__go').isDisabled(), true);
		assert.match(await text(page, '.oaci-ed__note'), /nothing to check yet/);
	} finally { await open_.close(); }
});

test('cancelling a download leaves the reader told they cancelled, not that it broke', async () => {
	const open_ = await open({ modelCached: false, holdDownload: true });
	try {
		const { page } = open_;
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed__progress', { state: 'visible' });
		await page.waitForFunction(() => /Downloading the verified model/.test(document.querySelector('.oaci-ed__phase')?.textContent ?? ''));
		assert.match(await text(page, '.oaci-ed__phase'), /Downloading the verified model/);
		await page.click('.oaci-ed__cancel');
		await page.waitForSelector('.oaci-ed__notice');
		assert.match(await text(page, '.oaci-ed__notice'), /Run cancelled/);
		assert.match(await text(page, '.oaci-ed__notice'), /Nothing was put in place of the reading you stopped/);
		assert.equal(await page.locator('.oaci-ed-result').count(), 0);
	} finally { await open_.close(); }
});

test('the panel fits a 280-pixel column with nothing spilling out of it', async () => {
	const open_ = await open({ server: { available: true, checking: false, state: 'ready' }, width: 375, height: 900 });
	try {
		const { page } = open_;
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed-result', { state: 'visible' });
		const overflow = await page.evaluate(() => {
			const frame = document.querySelector('.frame').getBoundingClientRect();
			return [...document.querySelectorAll('.oaci-ed *')]
				.map((node) => ({ tag: node.className, right: node.getBoundingClientRect().right }))
				.filter((item) => item.right > frame.right + 0.5);
		});
		assert.deepEqual(overflow, [], 'something is wider than the sidebar it lives in');
		assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
	} finally { await open_.close(); }
});

test('the reading has no accessibility violations the plugin owns', async () => {
	const open_ = await open({ server: { available: true, checking: false, state: 'ready' } });
	try {
		const { page } = open_;
		await page.click('.oaci-ed__go');
		await page.waitForSelector('.oaci-ed-result', { state: 'visible' });
		await page.addScriptTag({ path: resolve(pluginDir, '../../extensions/chrome/node_modules/axe-core/axe.min.js') }).catch(() => null);
		const violations = await page.evaluate(async () => {
			if (!window.axe) return null;
			const report = await window.axe.run('.oaci-ed', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
			return report.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.length }));
		});
		if (violations === null) {
			// axe-core is not installed here. The evidence pass runs it against the
			// installed plugin, so this is skipped rather than claimed as a pass.
			assert.ok(true, 'axe-core is not available in this checkout');
			return;
		}
		assert.deepEqual(violations, []);
	} finally { await open_.close(); }
});

test('expanded privacy and report actions retain contrast on a dark editor canvas', async () => {
	const session = await open({ modelCached: true });
	try {
		const { page } = session;
		await page.evaluate(() => document.body.classList.add('is-dark-theme'));
		await page.click('.oaci-ed__go');
		await page.locator('.oaci-ed-result').waitFor();
		await page.locator('.oaci-ed-privacy > summary').click();
		await page.addScriptTag({ path: resolve(pluginDir, '../../extensions/chrome/node_modules/axe-core/axe.min.js') });
		const violations = await page.evaluate(async () => (await axe.run('.oaci-ed')).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
		assert.deepEqual(violations, []);
		await page.locator('.oaci-ed__open').focus();
		assert.deepEqual(await page.evaluate(async () => (await axe.run('.oaci-ed')).violations.map(v => v.id)), []);
	} finally { await session.close(); }
});

test('editing the draft keeps the old reading explicitly marked as stale', async () => {
	const session = await open({ modelCached: true });
	try {
		const { page } = session;
		await page.click('.oaci-ed__go');
		await page.locator('.oaci-ed-result').waitFor();
		await page.evaluate(() => { window.__draft += ' This was added after checking.'; window.__panel.markStale(); });
		assert.equal(await page.locator('.oaci-ed.is-stale').count(), 1);
		assert.match(await text(page, '.oaci-ed__notice'), /draft changed since this reading/);
		assert.match(await text(page, '.oaci-ed__notice'), /Run it again before relying on it/);
		assert.equal(await page.locator('.oaci-ed-result').isVisible(), true);
		assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('oaci.editor.handoff:')).length), 0);
		assert.equal(await text(page, '.oaci-ed__open'), 'Open in full checker');
	} finally { await session.close(); }
});

test('a non-edit editor event preserves the current full report handover', async () => {
	const session = await open({ modelCached: true });
	try {
		const { page } = session;
		await page.click('.oaci-ed__go');
		await page.waitForFunction(() => Object.keys(sessionStorage).some(key => key.startsWith('oaci.editor.handoff:')));
		const before = await page.evaluate(() => JSON.stringify(sessionStorage));
		await page.evaluate(() => window.__panel.markStale());
		assert.equal(await page.evaluate(() => JSON.stringify(sessionStorage)), before);
		assert.equal(await text(page, '.oaci-ed__open'), 'View full report');
		assert.equal(await page.locator('.oaci-ed.is-stale').count(), 0);
	} finally { await session.close(); }
});

test('editing during a run never hands over the superseded draft', async () => {
	const session = await open({ server: { available: true, checking: false, state: 'ready' } });
	try {
		let release;
		const hold = new Promise(resolve => { release = resolve; });
		await session.page.route('**/analysis/server', async route => {
			await hold;
			await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ channel: 'wordpress-v1', processed: 'server', retained: 'nothing' }) });
		});
		const request = session.page.waitForRequest('**/analysis/server');
		await session.page.click('.oaci-ed__go');
		await request;
		await session.page.evaluate(() => { window.__draft += ' Changed during analysis.'; window.__panel.markStale(); });
		release();
		await session.page.locator('.oaci-ed-result').waitFor();
		assert.equal(await session.page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('oaci.editor.handoff:')).length), 0);
		assert.equal(await text(session.page, '.oaci-ed__open'), 'Open in full checker');
		assert.equal(await session.page.locator('.oaci-ed.is-stale').count(), 1);
	} finally { await session.close(); }
});

test('starting and cancelling a replacement run cannot reopen its predecessor', async () => {
	const session = await open({ modelCached: true });
	try {
		const { page } = session;
		await page.click('.oaci-ed__go');
		await page.waitForFunction(() => Object.keys(sessionStorage).some(key => key.startsWith('oaci.editor.handoff:')));
		await page.evaluate(() => { window.__oaciModelCached = false; window.__oaciHoldDownload = true; });
		await page.click('.oaci-ed__go');
		await page.locator('.oaci-ed__progress').waitFor();
		assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('oaci.editor.handoff:')).length), 0);
		await page.click('.oaci-ed__cancel');
		assert.equal(await page.locator('.oaci-ed__open').textContent(), 'Open in full checker');
		assert.equal(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('oaci.editor.handoff:')).length), 0);
	} finally { await session.close(); }
});
