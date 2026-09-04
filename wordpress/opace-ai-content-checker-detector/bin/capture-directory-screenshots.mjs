// The eight WordPress.org screenshots, captured from the installed plugin.
//
//   node bin/capture-directory-screenshots.mjs
//
// Run it against the current cell (127.0.0.1:8931) with the built ZIP already
// installed there, so what the directory shows is what the package does. Every
// shot is 1280 x 800, the size WordPress.org has always been given. The set
// covers route choice, on-device consent, result evidence, the real PDF,
// settings, methods/privacy and the block-editor quick check.
//
// The on-device route is captured before consent. The populated result uses
// the live EU route so the directory set proves both routes without turning a
// store capture into a long model-download job.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${PLUGIN}/.wordpress-org`;
const BASE = 'http://127.0.0.1:8931';
const WIDTH = 1280;
const HEIGHT = 800;

const DRAFT = readFileSync(`${PLUGIN}/assets/js/lab-examples.mjs`, 'utf8').match(/^const RAW_AI = `([\s\S]*?)`;$/m)[1].trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));

const settle = (ms = 700) => page.waitForTimeout(ms);

/**
 * Put the page and both workbench columns back to the top.
 *
 * From 1100 px the checker is two independently scrolling columns, so the
 * window scroll no longer decides what is in shot: a column left mid-scroll
 * shows the middle of a panel however carefully the page is framed.
 */
async function resetScroll({ workbenchToTop = false } = {}) {
	await page.evaluate((toTop) => {
		for (const column of document.querySelectorAll('[data-oaci-column]')) column.scrollTop = 0;
		if (!toTop) { window.scrollTo({ top: 0, behavior: 'instant' }); return; }
		// Put the workbench itself just under the fixed admin bar, so a 1280 x 800
		// frame is the two columns rather than the masthead above them.
		const lab = document.querySelector('.oaci-lab');
		if (lab) window.scrollTo({ top: window.scrollY + lab.getBoundingClientRect().top - 46, behavior: 'instant' });
	}, workbenchToTop);
	await settle(400);
}

/**
 * Bring something inside one of the workbench columns to the top of it.
 *
 * Scrolling the window no longer does this: each column is its own scroll area
 * from 1100 px, so a window scroll leaves the panel exactly where it was.
 */
async function frameInColumn(selector, offset = -12, which = 'result') {
	await page.evaluate(([sel, off, col]) => {
		const column = document.querySelector(`[data-oaci-column="${col}"]`);
		const el = document.querySelector(sel);
		if (!column || !el) return;
		column.scrollTop += el.getBoundingClientRect().top - column.getBoundingClientRect().top + off;
	}, [selector, offset, which]);
	await settle(400);
}

async function frame(selector, offset = -24) {
	await page.evaluate(([sel, off]) => {
		const el = document.querySelector(sel);
		if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + off, behavior: 'instant' });
	}, [selector, offset]);
	await settle(400);
}

const shot = async (n) => {
	await page.screenshot({ path: `${OUT}/screenshot-${n}.png` });
	console.log(`screenshot-${n}.png`);
};

async function login(target = page) {
	await target.goto(`${BASE}/wp-login.php`);
	if (await target.locator('#user_login').count()) {
		await target.fill('#user_login', 'oaci_admin');
		await target.fill('#user_pass', 'Oaci-G4-Local-Only-2026!');
		await target.click('#wp-submit');
		await target.waitForLoadState('networkidle');
	}
}

const openChecker = async (target = page) => {
	await target.goto(`${BASE}/wp-admin/admin.php?page=oaci-lab`, { waitUntil: 'domcontentloaded' });
	await target.waitForSelector('[data-oaci-route-card="server"]');
};

const pickRoute = async (value, target = page) => {
	await target.click(`input[name="oaci-analysis-route"][value="${value}"]`);
	await target.waitForTimeout(150);
};

await login();
// The EU route is left as the site has it. The screenshots are of the plugin,
// not of one site's settings, so nothing here changes an option.
await openChecker();
await settle(1200);

// 1. Before a run, framed on the recommended private EU route. The chooser is
// in step two, inside the draft column's own scroll area.
await resetScroll({ workbenchToTop: true });
await frameInColumn('#oaci-step-route', -10, 'draft');
await shot(1);

// 2. The on-device route selected before consent to the model download.
await page.click('[data-oaci-tab="example"]');
await settle(500);
await page.click('#oaci-examples button');
await page.waitForTimeout(600);
await page.click('[data-oaci-tab="paste"]');
await settle(500);
await pickRoute('on_device');
await page.evaluate(async () => {
	if (typeof caches !== 'undefined') for (const name of await caches.keys()) await caches.delete(name);
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('#oaci-inspect');
await pickRoute('on_device');
await page.fill('#oaci-source', DRAFT);
await settle(900);
await resetScroll({ workbenchToTop: true });
await frameInColumn('#oaci-step-route', -10, 'draft');
await shot(2);

// 3. The finished reading in the two-column workbench: the draft on the left,
// the result beside it. Both columns are put back to the top so the shot shows
// the top of each panel rather than wherever the run left them.
await pickRoute('server');
await page.click('#oaci-inspect');
await page.waitForFunction(() => document.querySelector('[data-oaci-result]'), null, { timeout: 900000 });
await settle(1200);
await resetScroll({ workbenchToTop: true });
// The dial and the level are what caption 3 promises, and they sit below the
// export row, so the result column is scrolled to its own AI reading panel.
await frameInColumn('.oaci-verdict', -10);
const twoColumn = await page.evaluate(() => {
	const draft = document.querySelector('[data-oaci-column="draft"]')?.getBoundingClientRect();
	const result = document.querySelector('[data-oaci-column="result"]')?.getBoundingClientRect();
	return Boolean(draft && result && result.x > draft.x + draft.width - 4);
});
if (!twoColumn) problems.push('screenshot 3: the workbench is not two columns at 1280');
await shot(3);

// 4. One section chosen: the row opens in place and the same passage is tinted
// in the draft beside it. Every deep dive starts closed now, so this opens one
// rather than scrolling to one that was already open.
await page.click('[data-oaci-section-toggle="0"]');
await settle(700);
const inside = await page.evaluate(() => ({
	heading: document.querySelector('.oaci-dive__row[data-oaci-open="true"] .oaci-dive__title')?.textContent.trim() ?? null,
	tinted: Boolean(document.querySelector('.oaci-draft-mirror__mark'))
}));
if (!inside.heading) problems.push('screenshot 4: the per-section deep dive did not open');
if (!inside.tinted) problems.push('screenshot 4: the chosen passage was not tinted in the draft');
await resetScroll({ workbenchToTop: true });
await frameInColumn('.oaci-dive__row[data-oaci-open="true"] .oaci-dive__rowbar', -8);
await settle(500);
await shot(4);

// 5. The first page of the real branded PDF produced by this build.
await resetScroll();
const pdfPath = '/tmp/oaci-wordpress-directory-report.pdf';
const pdfPng = '/tmp/oaci-wordpress-directory-report.png';
const [download] = await Promise.all([
	page.waitForEvent('download'),
	page.click('#oaci-download-pdf'),
]);
await download.saveAs(pdfPath);
execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-png', '-r', '128', pdfPath, pdfPng.replace(/\.png$/u, '')]);
const pdfImage = readFileSync(pdfPng).toString('base64');
const pdfPage = await ctx.newPage();
await pdfPage.setViewportSize({ width: WIDTH, height: HEIGHT });
await pdfPage.setContent(`<body style="margin:0;width:${WIDTH}px;height:${HEIGHT}px;background:#061a3c;display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="data:image/png;base64,${pdfImage}" style="height:740px;box-shadow:0 24px 70px rgba(0,0,0,.45)"></body>`);
await pdfPage.waitForTimeout(300);
await pdfPage.screenshot({ path: `${OUT}/screenshot-5.png` });
await pdfPage.close();
console.log('screenshot-5.png (real PDF page)');

// 6. Settings with the live allowance figures published by the service.
await page.goto(`${BASE}/wp-admin/admin.php?page=oaci-settings`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#oaci-server-settings');
await settle(1000);
await frame('#oaci-server-settings', -130);
await shot(6);

// 7. Methods & privacy.
await page.goto(`${BASE}/wp-admin/admin.php?page=oaci-methods`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.oaci-wrap');
await settle(700);
await shot(7);

// 8. The real block-editor quick check panel.
await page.goto(`${BASE}/wp-admin/post.php?post=1&action=edit`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.edit-post-layout, .editor-interface-skeleton', { timeout: 60000 });
await settle(2200);
if (!(await page.getByText('AI Content Checker quick check', { exact: true }).count())) {
	const settingsToggle = page.locator('button[aria-label*="Settings"], button[aria-label*="settings"]').first();
	if (await settingsToggle.count()) await settingsToggle.click();
	await settle(700);
}
const quickCheck = page.getByText('AI Content Checker quick check', { exact: true }).first();
if (await quickCheck.count()) {
	await quickCheck.scrollIntoViewIfNeeded();
	const panelToggle = page.getByRole('button', { name: /AI Content Checker quick check/u }).first();
	if (await panelToggle.count() && await panelToggle.getAttribute('aria-expanded') === 'false') await panelToggle.click();
	await settle(400);
	const runQuickCheck = page.getByRole('button', { name: 'Quick check', exact: true }).first();
	if (await runQuickCheck.count() && await runQuickCheck.isVisible()) {
		await runQuickCheck.click();
		await page.waitForFunction(() => !document.body.innerText.includes('Checking your draft…'), null, { timeout: 30000 });
		await settle(400);
	}
	// The sidebar keeps its own scroll position. Put the panel near the top of
	// it, so the shot is of the quick check rather than of the post settings
	// that happen to sit above it.
	await page.evaluate(() => {
		const panel = [...document.querySelectorAll('.components-panel__body')]
			.find((body) => /AI Content Checker quick check/u.test(body.textContent || ''));
		const scroller = panel?.closest('.interface-complementary-area, .edit-post-sidebar, .interface-complementary-area__content');
		if (panel && scroller) scroller.scrollTop += panel.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8;
	});
	await settle(500);
} else {
	problems.push('screenshot 8: the block-editor quick check was not visible');
}
await shot(8);

await browser.close();
if (problems.length) {
	console.error(`\n${problems.length} problem(s) during capture:`);
	for (const problem of problems) console.error(`  ${problem}`);
	process.exit(1);
}
console.log('\nEight screenshots captured from the installed package with no console error.');
