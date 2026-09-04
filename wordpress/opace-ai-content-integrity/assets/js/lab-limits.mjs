/**
 * A limit the reader has run into, in words rather than a code.
 *
 * Every notice is two halves and no more: what happened, and what to do next.
 * The screen shows them as a heading sentence and a following sentence, so a
 * reader who is stuck reads the way out without hunting for it inside a
 * paragraph. `limitNotice` joins the two for callers that want one string.
 *
 * The reasons come from three places and are worded here in one, so a notice
 * cannot be phrased two ways on two screens: this site's own per-person brake,
 * the EU service's allowances (its own share of the day, the pool every surface
 * draws on, and this site's hourly and daily ceiling), and the plain failures —
 * the route being off, the network not answering, a draft too long or too short.
 *
 * Nothing here states a proportion of an allowance. A reader asked to wait wants
 * to know how long, not what fraction of a bucket they used.
 */
const ON_DEVICE_IS_UNLIMITED = 'The on-device route has no run limit, so you can use that as often as you like.';
const RETRY_IN = (seconds) => {
	const value = Number(seconds);
	if (!Number.isFinite(value) || value <= 0) return 'in a moment';
	if (value < 90) return `in about ${Math.max(1, Math.round(value))} seconds`;
	if (value < 5400) return `in about ${Math.max(1, Math.round(value / 60))} minutes`;
	return `in about ${Math.max(1, Math.round(value / 3600))} hours`;
};

/**
 * What happened and what to do, as two sentences.
 *
 * @param {{code?: string, retryAfter?: number}} error  The refusal.
 * @param {object} limits                               This site's own figures.
 * @returns {{happened: string, next: string}|null}     Null when nothing honest can be said.
 */
export function limitNoticeParts(error, limits = {}) {
	const code = String(error?.code || '');
	const characters = Number(limits.maxChars || 100000).toLocaleString('en-GB');
	const words = Number(limits.minWords || 60).toLocaleString('en-GB');
	const retry = RETRY_IN(error?.retryAfter);
	if (code === 'server_rate_limited') {
		return {
			happened: `You have used this site’s share of private EU analysis for now: ${limits.serverPerMin ?? 3} runs a minute and ${limits.serverPerHour ?? 20} an hour for each person.`,
			next: `Try again ${retry}. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'site_hourly_limit') {
		const ceiling = Number(limits.sitePerHour) > 0 ? `${Number(limits.sitePerHour).toLocaleString('en-GB')} section readings an hour` : 'its hourly allowance';
		return {
			happened: `This whole site has reached ${ceiling} of private EU analysis, so everybody here shares the wait. A section is roughly four hundred words.`,
			next: `Try again ${retry}. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'site_daily_limit') {
		const ceiling = Number(limits.sitePerDay) > 0 ? `${Number(limits.sitePerDay).toLocaleString('en-GB')} section readings a day` : 'its allowance for the day';
		return {
			happened: `This whole site has reached ${ceiling} of private EU analysis, and a section is roughly four hundred words.`,
			next: `Try again ${retry}. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'service_pacing') {
		return {
			happened: 'The shared server is spacing out requests just now, so this one did not run. Your draft was not kept anywhere.',
			next: `Try again ${retry}. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'channel_floor_exhausted') {
		return {
			happened: 'The EU server is busy for today: the share kept for WordPress sites is spent.',
			next: `It refills through the day, so try again ${retry}, or run this on your device now. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'server_daily_limit' || code === 'daily_allowance_exhausted' || code === 'shared_pool_exhausted') {
		return {
			happened: 'The EU server is busy for today: the allowance every surface shares is spent.',
			next: `It refills through the day, so try again ${retry}, or run this on your device now. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'server_route_disabled' || code === 'server_channel_unavailable') {
		return {
			happened: 'Private EU analysis is not accepting runs from this site at the moment, so nothing was sent.',
			next: ON_DEVICE_IS_UNLIMITED
		};
	}
	if (code === 'server_unreachable') {
		return {
			happened: 'We could not reach the EU analysis service, so your draft was not sent anywhere and nothing was read.',
			next: `It may be a passing network problem, so it is worth trying again ${retry}. ${ON_DEVICE_IS_UNLIMITED}`
		};
	}
	if (code === 'server_refused' || code === 'server_request_failed' || code === 'invalid_server_response') {
		return {
			happened: 'The EU analysis service did not give us a reading we can trust, so none is shown. Your draft was not kept anywhere.',
			next: ON_DEVICE_IS_UNLIMITED
		};
	}
	if (code === 'server_consent_required') {
		return {
			happened: 'This run needs the button that names the transfer, and it was not the one pressed.',
			next: 'Press “Send once to the EU server and check”, or choose “On this device” to run the same model here with nothing sent.'
		};
	}
	if (code === 'server_text_too_long') {
		return {
			happened: 'Private EU analysis reads up to 8,000 words in one go and will not cut a draft short.',
			next: 'Check this one in parts, or run it on this device, which reads a draft of any length and has no run limit.'
		};
	}
	if (code === 'text_too_long' || code === 'post_too_long' || code === 'too_long' || code === 'request_too_large') {
		return {
			happened: `That draft is longer than this site’s limit of ${characters} characters. Nothing was shortened and nothing was sent.`,
			next: 'Shorten it, or check it in parts.'
		};
	}
	if (code === 'insecure_context') {
		return {
			happened: 'On-device analysis needs a secure connection. Your browser only lets a page verify a downloaded file and keep it cached over HTTPS, and this site is being served over plain HTTP, so we will not run the model rather than skip the check that proves the file is the right one.',
			next: 'Open this site over HTTPS, or use “Integrity checks only” here in the meantime.'
		};
	}
	if (code === 'not_ready') {
		return {
			happened: 'The model is not ready on this device yet, so nothing was read.',
			next: 'Press the button again to download and verify it, or use “Integrity checks only” in the meantime.'
		};
	}
	if (code === 'text_too_short' || code === 'too_short' || code === 'insufficient_text' || code === 'server_text_too_short') {
		return {
			happened: `There is not enough text here for the model to read: it needs about ${words} words.`,
			next: 'The character and writing checks still ran on what you gave it.'
		};
	}
	if (code === 'file_too_large') {
		return {
			happened: `That file is over the ${limits.maxFileBytes ? Math.round(limits.maxFileBytes / (1024 * 1024)) : 20} MB limit for a Content Credentials check, so it was not read.`,
			next: 'Choose a smaller file, or export it again at a lower size.'
		};
	}
	return null;
}

/**
 * The same notice as one string, for callers that want a single sentence run.
 *
 * @param {{code?: string, retryAfter?: number}} error
 * @param {object} limits
 * @returns {string} Empty when the code has no honest explanation.
 */
export function limitNotice(error, limits = {}) {
	const parts = limitNoticeParts(error, limits);
	return parts ? `${parts.happened} ${parts.next}` : '';
}
