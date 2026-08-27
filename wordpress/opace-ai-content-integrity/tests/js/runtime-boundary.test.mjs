import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('accepted browser core has no transport or telemetry primitive', async () => {
	const core = await read('assets/js/core.mjs');
	for (const token of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource']) assert.equal(core.includes(token), false, token);
});

test('inspection runs before the only explicit same-origin receipt request', async () => {
	const app = await read('assets/js/lab-app.mjs');
	assert.ok(app.indexOf('await inspect(request)') < app.indexOf('await fetch('));
	assert.match(app, /Save hash-only|hash-only receipt/i);
});

test('editing during or after inspection invalidates receipt actions', async () => {
	const app = await read('assets/js/lab-app.mjs');
	assert.match(app, /String\(await getContent\(\)\) !== inspectedContent/);
	assert.match(app, /addEventListener\('input', \(\) => \{ clearSourceError\(\); markStale\(\); \}/);
	assert.match(app, /fixesButton\.disabled = true; receiptButton\.disabled = true/);
});

test('validation and safe-fix flows move and restore focus accessibly', async () => {
	const app = await read('assets/js/lab-app.mjs');
	assert.match(app, /showSourceError\('Add text to inspect\.'\)/);
	assert.match(app, /source\.setAttribute\('aria-invalid', 'true'\)/);
	assert.match(app, /source\.setAttribute\('aria-describedby', sourceError\.id\)/);
	assert.match(app, /fixPanel\.focus\(\)/);
	assert.match(app, /fixPanel\.hidden = true; source\?\.focus\(\)/);
});

test('plugin registers no public frontend hooks or logged-out ajax', async () => {
	const files = ['opace-ai-content-integrity.php', 'includes/Core/Plugin.php', 'includes/Admin/Admin.php'];
	for (const file of files) {
		const source = await read(file);
		assert.doesNotMatch(source, /wp_enqueue_scripts|wp_head|wp_footer|wp_ajax_nopriv/);
	}
});
