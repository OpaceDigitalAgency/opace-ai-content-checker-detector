import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../../assets/js/classic-editor.js', import.meta.url), 'utf8');

async function runClassicResult(result) {
	let inspect;
	const button = {
		disabled: false,
		addEventListener(name, callback) { if (name === 'click') inspect = callback; },
	};
	const status = { textContent: '' };
	const content = { value: 'A draft with one invisible character.\u200B' };
	const postId = { value: '42' };
	const document = {
		documentElement: { lang: 'en-GB' },
		getElementById(id) { return { 'oaci-classic-inspect': button, 'oaci-classic-status': status, content, post_ID: postId }[id] || null; },
	};
	const apiFetch = () => Promise.resolve(result);
	apiFetch.use = () => {};
	apiFetch.createNonceMiddleware = () => () => {};
	const context = { document, setTimeout, Promise, Date, wp: { apiFetch }, OpaceContentIntegrityEditor: { nonce: 'test', restPath: '/oaci/v1/inspect' } };
	context.window = context;
	vm.runInNewContext(source, context);
	inspect();
	await new Promise((resolve) => setImmediate(resolve));
	await new Promise((resolve) => setImmediate(resolve));
	return status.textContent;
}

test('Classic Editor reports a Unicode-only quick-check finding instead of a false zero', async () => {
	const message = await runClassicResult({
		pattern_findings: [],
		unicode_findings: [{ id: 'unicode_37_200b', type: 'unicode_finding' }],
	});
	assert.match(message, /^1 thing to review\./);
	assert.match(message, /runs 3 of the 116 writing rules/);
	assert.doesNotMatch(message, /found nothing/);
});

test('Classic Editor retains the honest subset message when no finding exists', async () => {
	const message = await runClassicResult({ pattern_findings: [], unicode_findings: [] });
	assert.match(message, /^The quick check found nothing\./);
	assert.match(message, /not the same as clean/);
	assert.match(message, /full checker/);
});
