import assert from 'node:assert/strict';
import test from 'node:test';

import { MAX_LOCAL_FILE_BYTES, analyseOnServer, isProvenanceFile, readTextFile, sameSiteServerUrl } from '../../assets/js/lab-route.mjs';

test('server analysis always targets the authenticated same-site REST route', () => {
	assert.equal(
		sameSiteServerUrl('https://wordpress.example/wp-json/oaci/v1/', 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab'),
		'https://wordpress.example/wp-json/oaci/v1/analysis/server'
	);
	assert.throws(
		() => sameSiteServerUrl('https://remote.example/wp-json/oaci/v1/', 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab'),
		(error) => error.code === 'cross_site_rest_url'
	);
});

test('unavailable route and missing one-off consent fail before fetch', async () => {
	let calls = 0;
	const fetchImpl = async () => { calls += 1; };
	const common = {
		content: 'Private draft',
		fetchImpl,
		nonce: 'nonce',
		pageUrl: 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab',
		requestId: 'req_0000000000000001',
		restUrl: 'https://wordpress.example/wp-json/oaci/v1/'
	};
	await assert.rejects(analyseOnServer({ ...common, available: false, consent: true }), (error) => error.code === 'server_channel_unavailable');
	await assert.rejects(analyseOnServer({ ...common, available: true, consent: false }), (error) => error.code === 'server_consent_required');
	assert.equal(calls, 0);
});

test('ready channel returns the bounded server primitive through WordPress with nonce and idempotency identity', async () => {
	let call;
	const payload = { channel: 'wordpress-v1', processed: 'server', retained: 'nothing' };
	const result = await analyseOnServer({
		available: true,
		consent: true,
		content: 'Private draft',
		fetchImpl: async (url, options) => {
			call = { url, options };
			return { ok: true, json: async () => payload };
		},
		nonce: 'nonce',
		pageUrl: 'https://wordpress.example/wp-admin/admin.php?page=oaci-lab',
		requestId: 'req_0000000000000001',
		restUrl: 'https://wordpress.example/wp-json/oaci/v1/'
	});
	assert.equal(result, payload);
	assert.equal(call.url, 'https://wordpress.example/wp-json/oaci/v1/analysis/server');
	assert.equal(call.options.credentials, 'same-origin');
	assert.equal(call.options.headers['X-WP-Nonce'], 'nonce');
	assert.equal(call.options.headers['Idempotency-Key'], 'req_0000000000000001');
	assert.deepEqual(JSON.parse(call.options.body), { consent: true, route: 'opace_eu_server', text: 'Private draft' });
});

test('file routing separates bounded text from locally implemented provenance formats', async () => {
	assert.equal(await readTextFile({ name: 'draft.md', size: 12, text: async () => 'Draft text.' }, 100), 'Draft text.');
	assert.equal(await readTextFile({ name: 'draft.html', size: 12, text: async () => '<p>Draft.</p>' }, 100), '<p>Draft.</p>');
	assert.equal(MAX_LOCAL_FILE_BYTES, 20 * 1024 * 1024);
	assert.equal(isProvenanceFile({ name: 'draft.pdf' }), true);
	assert.equal(isProvenanceFile({ name: 'photo.JPG' }), true);
	assert.equal(isProvenanceFile({ name: 'asset', type: 'image/webp' }), true);
	assert.equal(isProvenanceFile({ name: 'draft.txt', type: 'text/plain' }), false);
	await assert.rejects(readTextFile({ name: 'draft.pdf', size: 12, text: async () => 'PDF' }, 100), (error) => error.code === 'file_type_unsupported');
	await assert.rejects(readTextFile({ name: 'draft.txt', size: 401, text: async () => 'text' }, 100), (error) => error.code === 'file_too_large');
});
