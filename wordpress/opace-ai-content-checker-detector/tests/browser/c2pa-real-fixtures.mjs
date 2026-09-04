import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { CHECKER_HONESTY_LINE, CHECKER_LEVELS, assertCheckerResultInvariants } from '../../assets/js/core.mjs';
import { createCheckerPdf } from '../../assets/js/checker-report.mjs';

const baseUrl = process.env.OACI_TEST_BASE_URL;
const playwrightModule = process.env.PLAYWRIGHT_MODULE;
if (!baseUrl || !playwrightModule) {
	throw new Error('Set OACI_TEST_BASE_URL to this plugin’s local HTTP root and PLAYWRIGHT_MODULE to an installed Playwright package.');
}

const require = createRequire(import.meta.url);
const { chromium } = require(playwrightModule);
const checkerFixture = JSON.parse(await readFile(new URL('../fixtures/contracts/valid/checker-result.json', import.meta.url), 'utf8')).data;
const semantics = Object.freeze({ levels: CHECKER_LEVELS, honestyLine: CHECKER_HONESTY_LINE, assertResult: assertCheckerResultInvariants });
const pdfBytes = createCheckerPdf(checkerFixture, `${'A'.repeat(57)} ${'B'.repeat(62)}`, semantics);
const browser = await chromium.launch({ headless: process.env.OACI_HEADLESS === '1' });
try {
	const context = await browser.newContext({ ignoreHTTPSErrors: process.env.OACI_IGNORE_HTTPS === '1', viewport: { width: 1280, height: 900 } });
	const page = await context.newPage();
	const requests = [];
	page.on('request', (request) => requests.push({ method: request.method(), url: request.url(), body: request.postData() }));
	await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
	const results = await page.evaluate(async (localPdfBytes) => {
		const module = await import('/assets/js/c2pa-provenance.mjs?test=real-fixtures');
		const inspectUrl = async (name, url = `/tests/fixtures/c2pa/${name}`, type = 'image/jpeg') => {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Fixture failed to load: ${response.status}`);
			const file = new File([await response.arrayBuffer()], name, { type });
			return module.inspectProvenance(file);
		};
		return {
			credentials: await inspectUrl('C_with_CAWG_data.jpg'),
			absent: await inspectUrl('C_with_CAWG_data_thumbnail.jpg'),
			invalid: await inspectUrl('no_alg.jpg'),
			png: await inspectUrl('product-mark.png', '/.wordpress-org/icon-256x256.png', 'image/png'),
			webp: await inspectUrl('product-mark.webp', '/assets/images/opace-ai-content-checker-detector-logo-256.webp', 'image/webp'),
			pdf: await module.inspectProvenance(new File([new Uint8Array(localPdfBytes)], 'local-report.pdf', { type: 'application/pdf' }))
		};
	}, [...pdfBytes]);

	assert.equal(results.credentials.status, 'untrusted');
	assert.equal(results.credentials.trust, 'untrusted');
	assert.equal(results.credentials.file_hash, 'sha256:fa0b257c863cb5b367135a017813ce0c1fbfc690a03e94acdd047c25c2d1ed46');
	assert.equal(results.absent.status, 'absent');
	assert.equal(results.invalid.status, 'invalid');
	assert.equal(results.png.status, 'absent');
	assert.equal(results.webp.status, 'absent');
	assert.equal(results.pdf.status, 'absent');
	assert.ok(requests.every((request) => request.url.startsWith(baseUrl) || request.url.startsWith(`blob:${baseUrl}`)));
	assert.ok(requests.every((request) => request.method === 'GET' && request.body === null));
	assert.equal(requests.filter((request) => request.url.endsWith('/assets/vendor/c2pa/c2pa_bg.wasm')).length, 1);
	if (baseUrl.startsWith('https:')) {
		assert.equal(requests.filter((request) => request.url.endsWith('/assets/vendor/c2pa/c2pa_worker.js')).length, 1);
	} else {
		assert.equal(requests.filter((request) => request.url.startsWith(`blob:${baseUrl}`)).length, 1);
	}
	process.stdout.write(`C2PA real fixtures: JPEG untrusted/absent/invalid plus PNG, WebP and PDF absent; ${requests.length} local GET requests; 0 outbound or body-bearing requests.\n`);
} finally {
	await browser.close();
}
