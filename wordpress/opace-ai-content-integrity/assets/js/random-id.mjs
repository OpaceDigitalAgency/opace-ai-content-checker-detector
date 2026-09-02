/**
 * Correlation identifiers for a run and its result.
 *
 * `crypto.randomUUID()` exists only in a secure context, so on a site served
 * over plain HTTP with a real hostname — a staging site, an intranet, a
 * multisite install on http:// — it is simply not there and every run failed
 * with "crypto.randomUUID is not a function". `crypto.getRandomValues()` is
 * available in an insecure context, so it is the fallback, and the last resort
 * keeps the plugin working where neither exists.
 *
 * These identifiers correlate a request with its result and its receipt. They
 * are not secrets, they authorise nothing, and nothing is derived from them, so
 * the fallback weakens no boundary. Content hashes are computed by the packaged
 * SHA-256 in the analysis core, never by Web Crypto, and are unaffected.
 */

const HEX = '0123456789abcdef';

/** 32 lower-case hex characters: 128 bits, the same width as a UUID. */
export function randomId() {
	const source = typeof globalThis.crypto === 'object' && globalThis.crypto ? globalThis.crypto : null;
	if (source && typeof source.randomUUID === 'function') {
		return source.randomUUID().replaceAll('-', '');
	}
	if (source && typeof source.getRandomValues === 'function') {
		const bytes = source.getRandomValues(new Uint8Array(16));
		let out = '';
		for (const byte of bytes) out += HEX[byte >> 4] + HEX[byte & 15];
		return out;
	}
	let out = '';
	while (out.length < 32) out += Math.floor(Math.random() * 16).toString(16);
	return out.slice(0, 32);
}

export const requestId = () => `req_${randomId()}`;
export const resultId = () => `result_${randomId()}`;
