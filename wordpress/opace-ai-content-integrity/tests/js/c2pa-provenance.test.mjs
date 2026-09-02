import assert from 'node:assert/strict';
import test from 'node:test';

import {
	C2PA_VERIFY_SETTINGS,
	MAX_PROVENANCE_BYTES,
	canonicalC2paResult,
	createProvenanceInspector,
	detectProvenanceFormat
} from '../../assets/js/c2pa-provenance.mjs';
import { renderProvenanceResult } from '../../assets/js/c2pa-panel.mjs';

const bytes = new TextEncoder().encode('local fixture bytes');
const file = (name = 'fixture.jpg', type = 'image/jpeg', content = bytes) => ({
	name,
	type,
	size: content.byteLength,
	arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength)
});

const validStore = {
	active_manifest: 'urn:manifest',
	validation_state: 'Valid',
	manifests: {
		'urn:manifest': {
			claim_generator_info: [{ name: 'Fixture generator', version: '1.2.3' }],
			signature_info: { common_name: 'Fixture signer', time: '2026-09-02T10:00:00Z' },
			assertions: [{}, {}],
			ingredients: [{}]
		}
	},
	validation_results: { activeManifest: { failure: [], informational: [] } },
	validation_status: []
};

test('only the implemented 20 MB JPEG, PNG, WebP and PDF boundary is accepted', () => {
	assert.equal(MAX_PROVENANCE_BYTES, 20 * 1024 * 1024);
	assert.equal(detectProvenanceFormat({ name: 'PHOTO.JPEG' }), 'image/jpeg');
	assert.equal(detectProvenanceFormat({ name: 'asset.webp' }), 'image/webp');
	assert.equal(detectProvenanceFormat({ name: 'claim.pdf' }), 'application/pdf');
	assert.equal(detectProvenanceFormat({ name: 'unknown.bin', type: 'image/png' }), 'image/png');
	assert.equal(detectProvenanceFormat({ name: 'draft.txt', type: 'text/plain' }), null);
});

test('canonical C2PA mapping keeps present, absent, invalid and untrusted distinct without claiming trust', () => {
	const present = canonicalC2paResult('a'.repeat(64), 'image/jpeg', validStore);
	assert.equal(present.status, 'present');
	assert.equal(present.trust, 'not_validated');
	assert.equal(present.manifest_summary.claim_generator, 'Fixture generator 1.2.3');
	assert.equal(canonicalC2paResult('b'.repeat(64), 'image/png', null).status, 'absent');

	const untrusted = canonicalC2paResult('c'.repeat(64), 'image/webp', {
		...validStore,
		validation_results: { activeManifest: { failure: [{ code: 'signingCredential.untrusted', explanation: 'No configured trust anchor' }] } }
	});
	assert.equal(untrusted.status, 'untrusted');
	assert.equal(untrusted.trust, 'untrusted');

	const invalid = canonicalC2paResult('d'.repeat(64), 'application/pdf', {
		...validStore,
		validation_state: 'Invalid',
		validation_results: { activeManifest: { failure: [{ code: 'claimSignature.mismatch', explanation: 'Signature mismatch' }] } }
	});
	assert.equal(invalid.status, 'invalid');
	assert.equal(invalid.trust, 'not_validated');
	assert.match(invalid.reason, /validation reported a problem/);
});

test('inspector passes bytes only to the local reader, frees it and returns no filename or content', async () => {
	let options;
	let freeCalls = 0;
	let receivedFile;
	const inspector = createProvenanceInspector({
		wasmLoader: async () => ({ compiled: true }),
		runtimeLoader: async () => ({
			createC2pa: async (value) => {
				options = value;
				return {
					reader: { fromBlob: async (type, input) => {
						assert.equal(type, 'image/jpeg');
						receivedFile = input;
						return { manifestStore: async () => validStore, free: async () => { freeCalls += 1; } };
					} },
					dispose() {}
				};
			}
		})
	});
	const input = file('private-client-name.jpg');
	const result = await inspector.inspect(input);
	assert.equal(receivedFile, input);
	assert.deepEqual(options.settings, C2PA_VERIFY_SETTINGS);
	assert.equal('workerSrc' in options, false);
	assert.equal(result.status, 'present');
	assert.equal(freeCalls, 1);
	assert.equal(result.file_hash.length, 71);
	const serialised = JSON.stringify(result);
	assert.doesNotMatch(serialised, /private-client-name|local fixture bytes|"(?:content|filename)"/i);
});

test('unsupported and oversized files fail before the C2PA runtime loads', async () => {
	let loads = 0;
	const inspector = createProvenanceInspector({ runtimeLoader: async () => { loads += 1; } });
	const unsupported = await inspector.inspect(file('draft.txt', 'text/plain'));
	assert.equal(unsupported.status, 'unsupported');
	await assert.rejects(
		inspector.inspect({ ...file(), size: MAX_PROVENANCE_BYTES + 1 }),
		(error) => error.code === 'file_too_large'
	);
	assert.equal(loads, 0);
});

test('known malformed credential errors are invalid while a runtime failure remains an error', async () => {
	const makeInspector = (message) => createProvenanceInspector({
		wasmLoader: async () => ({}),
		runtimeLoader: async () => ({ createC2pa: async () => ({
			reader: { fromBlob: async () => { throw new Error(message); } },
			dispose() {}
		}) })
	});
	assert.equal((await makeInspector('C2pa(UnknownAlgorithm)').inspect(file())).status, 'invalid');
	assert.equal((await makeInspector('Worker unavailable').inspect(file())).status, 'error');
});

test('cancellation rejects immediately and terminates the in-flight local worker', async () => {
	let disposeCalls = 0;
	let markStarted;
	const started = new Promise((resolve) => { markStarted = resolve; });
	const inspector = createProvenanceInspector({
		wasmLoader: async () => ({}),
		runtimeLoader: async () => ({ createC2pa: async () => ({
			reader: { fromBlob: () => { markStarted(); return new Promise(() => {}); } },
			dispose: () => { disposeCalls += 1; }
		}) })
	});
	const controller = new AbortController();
	const run = inspector.inspect(file(), { signal: controller.signal });
	await started;
	controller.abort();
	await assert.rejects(run, (error) => error.name === 'AbortError');
	assert.equal(disposeCalls, 1);
});

class FakeNode {
	constructor(tag, text = '') {
		this.tag = tag;
		this.textContent = text;
		this.children = [];
		this.className = '';
		this.id = '';
		this.tabIndex = 0;
		this.focused = false;
	}
	append(...children) { this.children.push(...children); }
	replaceChildren(...children) { this.children = [...children]; }
	focus() { this.focused = true; }
}

const fakeDocument = { createElement: (tag) => new FakeNode(tag) };
const textOf = (node) => [node.textContent, ...node.children.flatMap(textOf)].join(' ');

test('renderer names every canonical state and never exposes the local file hash', () => {
	for (const [status, expected] of Object.entries({
		present: 'Present · trust not checked',
		absent: 'Not found · inconclusive',
		invalid: 'Invalid · review',
		untrusted: 'Signer untrusted · review',
		unsupported: 'Unsupported',
		error: 'Check error'
	})) {
		const container = new FakeNode('div');
		renderProvenanceResult(container, { name: 'local-only.jpg', size: 2048 }, {
			file_hash: `sha256:${'f'.repeat(64)}`,
			media_type: 'image/jpeg',
			status,
			trust: status === 'untrusted' ? 'untrusted' : 'not_validated',
			reason: 'Fixture reason.',
			limitations: ['Certificate trust is not checked.']
		}, fakeDocument);
		const text = textOf(container);
		assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
		assert.doesNotMatch(text, /sha256|f{32}/);
		assert.match(text, /receipt, share link, URL or event log/);
	}
});
