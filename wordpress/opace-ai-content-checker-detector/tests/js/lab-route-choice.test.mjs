import assert from 'node:assert/strict';
import test from 'node:test';

import { EU_REFUSALS, defaultRoute, fallbackOffer, isEuRefusal } from '../../assets/js/lab-route-choice.mjs';
import { limitNotice } from '../../assets/js/lab-limits.mjs';

const LIMITS = { maxChars: 100000, minWords: 60, maxFileBytes: 20 * 1024 * 1024, serverPerMin: 3, serverPerHour: 20, sitePerHour: 30, sitePerDay: 120 };

test('an available EU route is the one the page opens on', () => {
	assert.equal(defaultRoute({ serverAvailable: true, secureContext: true }), 'server');
	// The EU route runs on the server, so an insecure page is no obstacle to it.
	assert.equal(defaultRoute({ serverAvailable: true, secureContext: false }), 'server');
});

test('without the EU route the page opens on this device, which has no limit', () => {
	assert.equal(defaultRoute({ serverAvailable: false, secureContext: true }), 'on_device');
	assert.equal(defaultRoute({}), 'on_device');
	assert.equal(defaultRoute({ serverAvailable: 'yes' }), 'on_device', 'only a real yes counts as available');
});

test('a page the browser will not let us verify a download on falls to the checks-only route', () => {
	assert.equal(defaultRoute({ serverAvailable: false, secureContext: false }), 'local');
});

test('every EU refusal offers a way out, and the offer is running it here', () => {
	for (const code of EU_REFUSALS.filter((reason) => reason !== 'request_too_large')) {
		const offer = fallbackOffer({ code }, { route: 'server', secureContext: true });
		assert.ok(offer, `${code} left the reader with nowhere to go`);
		assert.equal(offer.route, 'on_device');
		assert.equal(offer.label, 'Run on this device instead');
	}
});

test('a refusal both routes would give offers nothing, rather than a second dead end', () => {
	assert.equal(fallbackOffer({ code: 'request_too_large' }, { route: 'server', secureContext: true }), null);
	assert.equal(fallbackOffer({ code: 'text_too_short' }, { route: 'server', secureContext: true }), null);
	assert.equal(fallbackOffer({ code: 'file_too_large' }, { route: 'server', secureContext: true }), null);
});

test('a failure on a route that is already local offers nothing to switch to', () => {
	assert.equal(fallbackOffer({ code: 'shared_pool_exhausted' }, { route: 'on_device', secureContext: true }), null);
	assert.equal(fallbackOffer({ code: 'not_ready' }, { route: 'on_device', secureContext: true }), null);
	assert.equal(fallbackOffer(undefined, { route: 'server' }), null);
});

test('on an insecure page the offer is the checks-only route, because the model cannot be verified there', () => {
	const offer = fallbackOffer({ code: 'shared_pool_exhausted' }, { route: 'server', secureContext: false });
	assert.deepEqual(offer, { route: 'local', label: 'Run the integrity checks instead' });
});

test('each refusal reason carries its own notice, its wait, and the unlimited alternative', () => {
	const cases = [
		['server_rate_limited', 120, [/3 runs a minute/, /20 an hour/, /in about 2 minutes/]],
		['site_hourly_limit', 900, [/30 section readings an hour/, /whole site/, /in about 15 minutes/]],
		['site_daily_limit', 7200, [/120 section readings a day/, /whole site/, /in about 2 hours/]],
		['service_pacing', 45, [/spacing out requests/, /in about 45 seconds/, /not kept anywhere/]],
		['channel_floor_exhausted', 1800, [/busy for today/, /kept for WordPress sites/, /in about 30 minutes/]],
		['shared_pool_exhausted', 600, [/busy for today/, /every surface shares/, /in about 10 minutes/]],
		['server_route_disabled', null, [/not accepting runs/, /nothing was sent/]],
		['server_unreachable', 30, [/could not reach/, /not sent anywhere/, /in about 30 seconds/]],
		['server_refused', null, [/did not give us a reading we can trust/]]
	];
	for (const [code, retryAfter, patterns] of cases) {
		const message = limitNotice({ code, retryAfter }, LIMITS);
		assert.ok(message, `${code} has no notice`);
		for (const pattern of patterns) assert.match(message, pattern, `${code}: ${message}`);
		assert.match(message, /no run limit/, `${code} must say the on-device route has no limit`);
		assert.doesNotMatch(message, /%/u, `${code} must never state a proportion of an allowance`);
		assert.doesNotMatch(message, /_|\b[45]\d\d\b/u, `${code} leaked a raw code or status: ${message}`);
	}
});

test('a site ceiling the service has not published is described without inventing a number', () => {
	const quiet = { ...LIMITS, sitePerHour: null, sitePerDay: null };
	assert.match(limitNotice({ code: 'site_hourly_limit', retryAfter: 60 }, quiet), /its hourly allowance/);
	assert.match(limitNotice({ code: 'site_daily_limit', retryAfter: 60 }, quiet), /its allowance for the day/);
	assert.doesNotMatch(limitNotice({ code: 'site_hourly_limit' }, quiet), /\bnull\b|NaN|\b0 section readings\b/);
});

test('the EU refusal list and the notices agree, so no reason can be added without its words', () => {
	for (const code of EU_REFUSALS) {
		assert.ok(isEuRefusal(code));
		assert.ok(limitNotice({ code }, LIMITS), `${code} is treated as an EU refusal but has no notice`);
	}
	assert.equal(isEuRefusal('not_ready'), false);
	assert.equal(isEuRefusal(''), false);
});
