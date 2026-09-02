import assert from 'node:assert/strict';
import test from 'node:test';

import { randomId, requestId, resultId } from '../../assets/js/random-id.mjs';

const withCrypto = (value, run) => {
	const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
	Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
	try { return run(); } finally {
		if (original) Object.defineProperty(globalThis, 'crypto', original);
		else delete globalThis.crypto;
	}
};

test('a run identifier is 32 hex characters however the browser supplies randomness', () => {
	const shapes = [
		{ randomUUID: () => '01234567-89ab-cdef-0123-456789abcdef' },
		// A site on plain HTTP with a hostname has no randomUUID, only this.
		{ getRandomValues: (array) => { array.forEach((_, index) => { array[index] = (index * 7) % 256; }); return array; } },
		undefined
	];
	for (const value of shapes) {
		const id = withCrypto(value, randomId);
		assert.match(id, /^[0-9a-f]{32}$/, `unexpected id for ${JSON.stringify(value)}`);
	}
});

test('an insecure context never falls over on the missing randomUUID', () => {
	const id = withCrypto({ getRandomValues: (array) => { array.forEach((_, index) => { array[index] = index; }); return array; } }, () => requestId());
	assert.match(id, /^req_[0-9a-f]{32}$/);
	assert.match(withCrypto({}, () => resultId()), /^result_[0-9a-f]{32}$/);
});

test('two identifiers from the same browser differ', () => {
	assert.notEqual(randomId(), randomId());
});
