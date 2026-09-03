/**
 * Which route the checker opens on, and where it sends you when one refuses.
 *
 * Two rules, and they are the whole of it.
 *
 * The route the page opens on is private EU analysis whenever an administrator
 * has turned it on and the service says it is accepting runs. It needs no
 * download, answers in about a second, and keeps nothing. When it is off, not
 * reachable, or refusing, the page opens on the device instead, which is the
 * private route with no allowance to run out. Integrity checks only never leads;
 * it produces no AI reading, so it is a deliberate third choice rather than a
 * fallback.
 *
 * The second rule is what happens when a run is refused. Every EU refusal has an
 * answer, and it is the same answer: the same model, on this device, with no
 * limit. So the notice offers it in one click. The two exceptions are refusals
 * the device cannot help with — a draft too long for this site, or a browser
 * that will not let us verify the download — and offering the device there would
 * be a second dead end rather than a way out.
 */

/** Refusals of the EU route that running on the device would actually solve. */
export const EU_REFUSALS = Object.freeze([
	'server_rate_limited',
	'service_pacing',
	'site_hourly_limit',
	'site_daily_limit',
	'channel_floor_exhausted',
	'shared_pool_exhausted',
	'server_route_disabled',
	'server_channel_unavailable',
	'server_unreachable',
	'server_refused',
	'server_request_failed',
	'server_text_too_long',
	'request_too_large',
	'invalid_server_response'
]);

/**
 * The route to select when the checker screen loads.
 *
 * @param {{serverAvailable?: boolean, secureContext?: boolean}} conditions
 * @returns {'server'|'on_device'|'local'}
 */
export function defaultRoute(conditions = {}) {
	const secure = conditions.secureContext !== false;
	if (conditions.serverAvailable === true) return 'server';
	// Without a secure context the browser exposes neither the hash check nor
	// the cache the on-device route needs, so that route refuses itself and the
	// only remaining choice is the one that scores nothing.
	return secure ? 'on_device' : 'local';
}

/**
 * The route to offer after a refusal, or null when there is nothing honest to
 * offer.
 *
 * @param {{code?: string}} error The refusal.
 * @param {{route?: string, secureContext?: boolean}} conditions
 * @returns {{route: 'on_device'|'local', label: string}|null}
 */
export function fallbackOffer(error, conditions = {}) {
	const code = String(error?.code || '');
	const route = String(conditions.route || 'server');
	const secure = conditions.secureContext !== false;
	if (route !== 'server' || !EU_REFUSALS.includes(code)) return null;
	// A draft this site will not accept is refused by both routes, so sending
	// the reader to the device would only refuse it a second time.
	if (code === 'request_too_large') return null;
	if (!secure) return { route: 'local', label: 'Run the integrity checks instead' };
	return { route: 'on_device', label: 'Run on this device instead' };
}

/**
 * Whether a code is one of the EU route's own refusals, as opposed to a failure
 * of the draft itself. Used to decide whether the notice is about an allowance
 * or about the text.
 *
 * @param {string} code
 * @returns {boolean}
 */
export function isEuRefusal(code) {
	return EU_REFUSALS.includes(String(code || ''));
}
