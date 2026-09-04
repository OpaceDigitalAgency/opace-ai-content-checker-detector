import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('accepted browser core has no transport or telemetry primitive', async () => {
	const core = await read('assets/js/core.mjs');
	for (const token of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource']) assert.equal(core.includes(token), false, token);
});

test('local inspection runs before any optional server analysis or same-origin receipt request', async () => {
	const app = await read('assets/js/lab-app.mjs');
	assert.ok(app.indexOf('await inspect(request,') < app.indexOf('await analyseOnServer('));
	assert.ok(app.indexOf("status: 'local_complete'") < app.indexOf('await analyseOnServer('));
	assert.ok(app.indexOf('await inspect(request,') < app.indexOf('await fetch('));
	assert.match(app, /Save hash-only|hash-only receipt/i);
});

test('editing during or after inspection invalidates receipt actions', async () => {
	const app = await read('assets/js/lab-app.mjs');
	assert.match(app, /String\(await getContent\(\)\) !== inspectedContent/);
	assert.match(app, /addEventListener\('input', \(\) => \{ clearSourceError\(\); updateCount\(\); markStale\(\); \}/);
	assert.match(app, /fixesButton\.disabled = true; receiptButton\.disabled = true/);
});

test('validation and safe-fix flows move and restore focus accessibly', async () => {
	const app = await read('assets/js/lab-app.mjs');
	assert.match(app, /showSourceError\('There is nothing to check yet\.', 'Paste a draft into the box, open a file, or try one of the examples\.'\)/);
	assert.match(app, /source\.setAttribute\('aria-invalid', 'true'\)/);
	assert.match(app, /source\.setAttribute\('aria-describedby', sourceError\.id\)/);
	assert.match(app, /fixPanel\.focus\(\)/);
	assert.match(app, /fixPanel\.hidden = true; source\?\.focus\(\)/);
});

test('plugin registers no public frontend hooks or logged-out ajax', async () => {
	const files = ['opace-ai-content-checker-detector.php', 'includes/Core/Plugin.php', 'includes/Admin/Admin.php'];
	for (const file of files) {
		const source = await read(file);
		assert.doesNotMatch(source, /wp_enqueue_scripts|wp_head|wp_footer|wp_ajax_nopriv/);
	}
});

test('file provenance is lazy, local-only and excluded from receipt and event state', async () => {
	const app = await read('assets/js/lab-app.mjs');
	const inspector = await read('assets/js/c2pa-provenance.mjs');
	const importPosition = app.indexOf('c2pa-provenance.mjs');
	assert.ok(importPosition > app.indexOf('async function handleFile(file)'));
	assert.ok(app.indexOf('async function handleFile(file)') > 0);
	assert.ok(app.indexOf("const loadFile = () => handleFile(fileInput?.files?.[0]);") > 0);
	assert.match(inspector, /remoteManifestFetch: false/);
	assert.match(inspector, /ocspFetch: false/);
	assert.match(inspector, /verifyTrust: false/);
	assert.match(inspector, /credentials: 'same-origin'/);
	assert.doesNotMatch(inspector, /console\.(?:log|info|warn|error)|sendBeacon|XMLHttpRequest|WebSocket/);
	assert.match(app, /status: 'provenance_complete', result: null, serverResult: null, sourceHash: '', error: null/);
	assert.doesNotMatch(app, /emit\([^\n]+(?:file_hash|manifest_summary|file\.name)/);
});
