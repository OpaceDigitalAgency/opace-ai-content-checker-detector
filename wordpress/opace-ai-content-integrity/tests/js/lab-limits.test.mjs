import assert from 'node:assert/strict';
import test from 'node:test';

import { limitNotice, limitNoticeParts } from '../../assets/js/lab-limits.mjs';

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

test('every notice is two halves: what happened, then what to do about it', () => {
	for (const code of ['server_rate_limited', 'server_unreachable', 'channel_floor_exhausted', 'text_too_long', 'too_short', 'insecure_context', 'not_ready', 'file_too_large', 'server_consent_required']) {
		const parts = limitNoticeParts({ code, retryAfter: 45 }, LIMITS);
		assert.ok(parts, `${code} has no notice`);
		assert.ok(parts.happened.length > 20, `${code} says too little about what happened`);
		assert.ok(parts.next.length > 20, `${code} does not say what to do`);
		// The heading sentence is one sentence's worth of reading, not a wall.
		assert.ok(parts.happened.length < 320, `${code} heading is a paragraph: ${parts.happened}`);
		assert.equal(limitNotice({ code, retryAfter: 45 }, LIMITS), `${parts.happened} ${parts.next}`);
	}
	assert.equal(limitNoticeParts({ code: 'something_else' }, LIMITS), null);
});

test('the agreement notice names the button rather than a box that no longer exists', () => {
	const parts = limitNoticeParts({ code: 'server_consent_required' }, LIMITS);
	assert.doesNotMatch(`${parts.happened} ${parts.next}`, /tick|checkbox|box confirming/i);
	assert.match(parts.next, /Send once to the EU server and check/);
});
