/**
 * A limit the reader has run into, in words rather than a code: what happened,
 * what to do about it, and when they can try again. Every message says that the
 * on-device route has no run limit, because that is the answer to most of them.
 */
const ON_DEVICE_IS_UNLIMITED = 'The on-device route has no run limit, so you can use that as often as you like.';
const RETRY_IN = (seconds) => {
	const value = Number(seconds);
	if (!Number.isFinite(value) || value <= 0) return 'in a moment';
	if (value < 90) return `in about ${Math.max(1, Math.round(value))} seconds`;
	return `in about ${Math.max(1, Math.round(value / 60))} minutes`;
};

export function limitNotice(error, limits = {}) {
	const code = String(error?.code || '');
	const characters = Number(limits.maxChars || 100000).toLocaleString('en-GB');
	const words = Number(limits.minWords || 60).toLocaleString('en-GB');
	if (code === 'server_rate_limited') {
		return `You have used this site’s share of private EU analysis for now: ${limits.serverPerMin ?? 3} runs a minute and ${limits.serverPerHour ?? 20} an hour for each person. Try again ${RETRY_IN(error?.retryAfter)}. ${ON_DEVICE_IS_UNLIMITED}`;
	}
	if (code === 'server_daily_limit' || code === 'daily_allowance_exhausted') {
		return `The shared daily allowance for private EU analysis has run out for today. It resets at midnight UTC. ${ON_DEVICE_IS_UNLIMITED}`;
	}
	if (code === 'text_too_long' || code === 'post_too_long' || code === 'too_long') {
		return `That draft is longer than this site’s limit of ${characters} characters. Nothing was shortened and nothing was sent. Shorten it, or check it in parts.`;
	}
	if (code === 'insecure_context') {
		return 'On-device analysis needs a secure connection. Your browser only lets a page verify a downloaded file and keep it cached over HTTPS, and this site is being served over plain HTTP, so we will not run the model rather than skip the check that proves the file is the right one. Open this site over HTTPS, or use “Integrity checks only” here in the meantime.';
	}
	if (code === 'not_ready') {
		return `The model is not ready on this device yet. Tick the download box and press the button again, or use “Integrity checks only” in the meantime.`;
	}
	if (code === 'text_too_short' || code === 'too_short' || code === 'insufficient_text') {
		return `There is not enough text here for the model to read: it needs about ${words} words. The character and writing checks still ran on what you gave it.`;
	}
	if (code === 'file_too_large') {
		return `That file is over the ${limits.maxFileBytes ? Math.round(limits.maxFileBytes / (1024 * 1024)) : 20} MB limit for a Content Credentials check, so it was not read.`;
	}
	return '';
}
