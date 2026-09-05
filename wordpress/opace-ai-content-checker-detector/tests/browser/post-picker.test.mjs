import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, firefox, webkit } from '../../../../node_modules/playwright/index.mjs';

const plugin = new URL('../../', import.meta.url);
const markup = `<!doctype html><html lang="en"><head><title>Saved content picker test</title></head><body>
<label for="draft">Checker draft</label><textarea id="draft">Existing draft</textarea>
<div id="root"><div id="oaci-post-picker">
<label for="oaci-post-search">Find a post or page</label>
<input id="oaci-post-search" role="combobox" aria-expanded="false" aria-controls="oaci-post-results" aria-autocomplete="list">
<div id="oaci-post-popup" hidden>
<label for="oaci-post-type">Content type</label><select id="oaci-post-type"><option value="all">All</option><option value="page">Pages</option></select>
<p id="oaci-post-status" role="status"></p><ul id="oaci-post-results" role="listbox" aria-label="Saved content"></ul>
<button id="oaci-post-previous" hidden>Previous</button><button id="oaci-post-next" hidden>Next</button>
</div></div><button id="oaci-post-load" disabled>Load</button>
<p id="oaci-post-replace-note"></p><p id="oaci-post-message" role="status"></p></div>
</body></html>`;

async function setup() {
	const browser = await ({ chromium, firefox, webkit }[process.env.OACI_BROWSER || 'chromium']).launch();
	const page = await browser.newPage();
	const errors = []; page.on('pageerror', error => errors.push(error.message));
	let loadStatus = 200, release;
	await page.route('http://picker.test/**', async route => {
		const url = new URL(route.request().url());
		if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: markup });
		if (url.pathname.startsWith('/assets/js/')) return route.fulfill({ contentType: 'text/javascript', body: await readFile(new URL(url.pathname.slice(1), plugin), 'utf8') });
		if (url.pathname === '/wp-json/oaci/v1/posts') {
			return route.fulfill({ json: { items: url.searchParams.get('search') === 'none' ? [] : [{ id: 42, title: 'Saved page', type: 'Page', status: 'Draft' }], has_more: false } });
		}
		if (url.pathname === '/wp-json/oaci/v1/posts/42') {
			if (release) await release;
			return route.fulfill({ status: loadStatus, json: loadStatus === 200 ? { title: 'Saved page', content: 'Saved page content' } : { message: 'You can no longer edit this page.' } });
		}
		return route.abort();
	});
	await page.goto('http://picker.test/');
	await page.evaluate(async () => {
		const { mountPostPicker } = await import('/assets/js/post-picker.mjs');
		window.loaded = null;
		window.picker = mountPostPicker(document.querySelector('#root'), {
			config: { restUrl: 'http://picker.test/wp-json/oaci/v1/', nonce: 'test' },
			signal: new AbortController().signal, getDraft: () => document.querySelector('#draft').value, canLoad: () => true,
			onLoad(body) { window.loaded = body; document.querySelector('#draft').value = body.content; }
		});
	});
	return { browser, page, errors, deny() { loadStatus = 403; }, delay(promise) { release = promise; } };
}

test('dropdown supports search, arrows, Enter, Escape and explicit replacement', async () => {
	const session = await setup(), { page } = session;
	try {
		const combo = page.getByRole('combobox', { name: 'Find a post or page' });
		await combo.fill('Saved');
		await page.locator('#oaci-post-results [role="option"]').waitFor();
		await combo.press('ArrowDown');
		assert.equal(await combo.getAttribute('aria-activedescendant'), 'oaci-post-option-42');
		await combo.press('Enter');
		assert.equal(await combo.getAttribute('aria-expanded'), 'false');
		assert.equal(await page.locator('#draft').inputValue(), 'Existing draft');
		await combo.click(); await combo.press('Escape');
		assert.equal(await combo.getAttribute('aria-expanded'), 'false');
		assert.equal(await combo.evaluate(node => node === document.activeElement), true);
		await page.getByRole('button', { name: 'Replace draft', exact: true }).click();
		await page.waitForFunction(() => window.loaded?.content === 'Saved page content');
		await combo.fill('none'); await page.getByText('No matches. Try another search or filter.').waitFor();
		assert.equal(await page.locator('#oaci-post-load').isDisabled(), true);
		assert.deepEqual(session.errors, []);
	} finally { await session.browser.close(); }
});

test('permission errors and edits during loading never overwrite the checker draft', async () => {
	for (const mode of ['denied', 'changed']) {
		const session = await setup(), { page } = session;
		try {
			const combo = page.getByRole('combobox', { name: 'Find a post or page' });
			await combo.fill('Saved'); await page.locator('#oaci-post-results [role="option"]').click();
			let resolve;
			if (mode === 'denied') session.deny();
			else session.delay(new Promise(done => { resolve = done; }));
			await page.getByRole('button', { name: 'Replace draft', exact: true }).click();
			if (mode === 'changed') { await page.locator('#draft').fill('A newer draft'); resolve(); }
			await page.waitForFunction(() => document.querySelector('#oaci-post-message').textContent.length > 0);
			assert.equal(await page.evaluate(() => window.loaded), null);
			assert.equal(await page.locator('#draft').inputValue(), mode === 'denied' ? 'Existing draft' : 'A newer draft');
			assert.deepEqual(session.errors, []);
		} finally { await session.browser.close(); }
	}
});
