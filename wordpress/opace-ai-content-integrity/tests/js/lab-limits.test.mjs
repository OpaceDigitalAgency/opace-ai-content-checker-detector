import assert from 'node:assert/strict';
import test from 'node:test';

import { limitNotice } from '../../assets/js/lab-limits.mjs';

const LIMITS = { maxChars: 100000, minWords: 60, maxFileBytes: 20 * 1024 * 1024, serverPerMin: 3, serverPerHour: 20 };

test('every usage limit is explained in words, never as a code', () => {
	for (const code of ['server_rate_limited', 'server_daily_limit', 'text_too_long', 'post_too_long', 'text_too_short', 'too_short', 'too_long', 'file_too_large', 'not_ready', 'insecure_context']) {
		const message = limitNotice({ code }, LIMITS);
		assert.ok(message, `${code} has no plain-English notice`);
		assert.doesNotMatch(message, /_|\b[45]\d\d\b/u, `${code} leaked a raw code or status number: ${message}`);
		assert.ok(message.length > 40, `${code} notice is too terse: ${message}`);
	}
});

test('the per-user EU limit names both numbers, when to retry and the unlimited alternative', () => {
	const message = limitNotice({ code: 'server_rate_limited', retryAfter: 60 }, LIMITS);
	assert.match(message, /3 runs a minute/);
	assert.match(message, /20 an hour/);
	assert.match(message, /in about 60 seconds/);
	assert.match(message, /on-device route has no run limit/);
});

test('a long retry window is given in minutes, and a missing one stays vague rather than wrong', () => {
	assert.match(limitNotice({ code: 'server_rate_limited', retryAfter: 3600 }, LIMITS), /in about 60 minutes/);
	assert.match(limitNotice({ code: 'server_rate_limited' }, LIMITS), /in a moment/);
});

test('the character limit notice states this site’s own number and promises nothing was cut', () => {
	const message = limitNotice({ code: 'text_too_long' }, { ...LIMITS, maxChars: 40000 });
	assert.match(message, /40,000 characters/);
	assert.match(message, /Nothing was shortened and nothing was sent/);
});

test('the too-short notice names the word minimum and says the other checks still ran', () => {
	const message = limitNotice({ code: 'too_short' }, LIMITS);
	assert.match(message, /about 60 words/);
	assert.match(message, /character and writing checks still ran/);
});

test('the file limit notice names the megabyte ceiling', () => {
	assert.match(limitNotice({ code: 'file_too_large' }, LIMITS), /20 MB/);
});

test('an insecure connection is explained, and the plugin says why it will not skip the check', () => {
	const message = limitNotice({ code: 'insecure_context' }, LIMITS);
	assert.match(message, /secure connection/);
	assert.match(message, /HTTPS/);
	assert.match(message, /rather than skip the check/);
	assert.match(message, /Integrity checks only/);
});

test('an unrecognised failure gets no invented explanation', () => {
	assert.equal(limitNotice({ code: 'something_else' }, LIMITS), '');
	assert.equal(limitNotice(undefined, LIMITS), '');
});
