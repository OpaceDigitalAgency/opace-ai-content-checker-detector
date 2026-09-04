import assert from 'node:assert/strict';
import test from 'node:test';

import { cachedModelPresent, WORDPRESS_MODEL_BASE } from '../../assets/js/cycle5-wordpress.mjs';

const CACHE = 'opace-content-integrity-cycle5-browser-2026-09-1';
const MODEL = `${WORDPRESS_MODEL_BASE}tier3-cycle5-full-e5small-int8-perchannel.onnx`;

/** A Cache Storage that holds exactly the URLs it was given. */
function fakeCaches(names, entries) {
	const opened = [];
	return {
		opened,
		has: async (name) => names.includes(name),
		open: async (name) => {
			opened.push(name);
			return { match: async (url) => (entries.includes(url) ? { ok: true } : undefined) };
		}
	};
}

test('the button is told the model is here only when the model file is actually cached', async () => {
	const present = fakeCaches([CACHE], [MODEL]);
	assert.equal(await cachedModelPresent({ cacheStorage: present }), true);
	assert.deepEqual(present.opened, [CACHE], 'exactly one cache is opened, and no other');
});

test('an empty cache, a different cache and a missing entry all read as absent', async () => {
	assert.equal(await cachedModelPresent({ cacheStorage: fakeCaches([], []) }), false);
	assert.equal(await cachedModelPresent({ cacheStorage: fakeCaches(['something-else'], [MODEL]) }), false);
	assert.equal(await cachedModelPresent({ cacheStorage: fakeCaches([CACHE], []) }), false);
});

test('a declared mirror is looked for at the mirror, not at the shipped host', async () => {
	const mirror = 'https://models.example.invalid/local-signals-v1/';
	const storage = fakeCaches([CACHE], [`${mirror}tier3-cycle5-full-e5small-int8-perchannel.onnx`]);
	assert.equal(await cachedModelPresent({ cacheStorage: storage, modelBaseUrl: mirror }), true);
	assert.equal(await cachedModelPresent({ cacheStorage: storage }), false);
});

test('a browser that exposes no cache, or throws, answers no rather than promising nothing will download', async () => {
	assert.equal(await cachedModelPresent({ cacheStorage: null }), false);
	assert.equal(await cachedModelPresent({ cacheStorage: {} }), false);
	const angry = {
		has: async () => true,
		open: async () => { throw new Error('site data is blocked'); }
	};
	assert.equal(await cachedModelPresent({ cacheStorage: angry }), false);
});

test('the probe makes no network request of its own', async () => {
	const calls = [];
	const original = globalThis.fetch;
	globalThis.fetch = (...args) => { calls.push(args); throw new Error('the cache probe must not fetch'); };
	try {
		await cachedModelPresent({ cacheStorage: fakeCaches([CACHE], [MODEL]) });
		await cachedModelPresent({ cacheStorage: fakeCaches([], []) });
	} finally {
		globalThis.fetch = original;
	}
	assert.deepEqual(calls, []);
});
