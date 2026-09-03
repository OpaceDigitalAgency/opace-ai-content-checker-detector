export class LabRouteError extends Error {
	constructor(code, message, retryAfter = null) {
		super(message);
		this.name = 'LabRouteError';
		this.code = code;
		// Seconds until the caller may try again, when the route said so. The
		// Lab turns this into "try again in about a minute" rather than a code.
		this.retryAfter = Number.isFinite(Number(retryAfter)) && Number(retryAfter) > 0 ? Number(retryAfter) : null;
	}
}

export const MAX_LOCAL_FILE_BYTES = 20 * 1024 * 1024;

export function isProvenanceFile(file = {}) {
	const name = String(file.name || '').toLowerCase();
	const type = String(file.type || '').toLowerCase();
	return /\.(?:jpe?g|png|webp|pdf)$/.test(name) || ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(type);
}

/**
 * The site's own analysis route, on this origin and no other.
 *
 * WordPress publishes its API two ways. A site with pretty permalinks gets a
 * path, `/wp-json/oaci/v1/`; a site without them gets a query,
 * `/index.php?rest_route=/oaci/v1/`. Resolving "analysis/server" as a relative
 * URL is right for the first and quietly wrong for the second, where it
 * replaces the path and produces `/analysis/server` — a 404 on every run. The
 * plugin's other calls concatenate and were never affected; this one resolved,
 * and had never been exercised because the EU route had never been available.
 * Both forms are handled here, and the cross-site guard still comes first.
 */
export function sameSiteServerUrl(restUrl, pageUrl) {
	const page = new URL(pageUrl);
	const rest = new URL(restUrl, page);
	if (rest.origin !== page.origin) throw new LabRouteError('cross_site_rest_url', 'The WordPress analysis route is not on this site.');
	const route = rest.searchParams.get('rest_route');
	if (route) {
		rest.searchParams.set('rest_route', `${route.replace(/\/$/, '')}/analysis/server`);
		return rest.href;
	}
	rest.pathname = `${rest.pathname.replace(/\/$/, '')}/analysis/server`;
	return rest.href;
}

/**
 * How long to wait before trying again, in seconds, or null when nothing said.
 *
 * WordPress puts a REST error's own fields under `data`, and the site passes the
 * service's Retry-After through as a header as well, so both are read and the
 * first plain positive number wins. A header that is an HTTP date rather than a
 * count of seconds is ignored: "in a moment" is better than a wrong number.
 */
function retryAfterFrom(payload, response) {
	const header = response?.headers?.get?.('Retry-After');
	for (const candidate of [payload?.data?.retry_after, payload?.retry_after, header]) {
		if (candidate === null || candidate === undefined || candidate === '' || typeof candidate === 'boolean') continue;
		if (typeof candidate === 'string' && !/^\d+$/.test(candidate.trim())) continue;
		const seconds = Number(candidate);
		if (Number.isFinite(seconds) && seconds > 0) return Math.floor(seconds);
	}
	return null;
}

export async function analyseOnServer(options) {
	const {
		available,
		consent,
		content,
		fetchImpl = fetch,
		nonce,
		pageUrl,
		requestId,
		restUrl,
		signal
	} = options;

	if (!available) throw new LabRouteError('server_channel_unavailable', 'EU server analysis is off in this site’s settings.');
	if (consent !== true) throw new LabRouteError('server_consent_required', 'Confirm the one-off EU server transmission before running it.');
	const url = sameSiteServerUrl(restUrl, pageUrl);
	const response = await fetchImpl(url, {
		method: 'POST',
		credentials: 'same-origin',
		cache: 'no-store',
		headers: {
			'Content-Type': 'application/json',
			'Idempotency-Key': requestId,
			'X-WP-Nonce': nonce
		},
		body: JSON.stringify({ consent: true, route: 'opace_eu_server', text: content }),
		signal
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) {
		throw new LabRouteError(payload?.code || 'server_request_failed', payload?.message || 'EU server analysis could not be completed.', retryAfterFrom(payload, response));
	}
	if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.channel !== 'wordpress-v1' || payload.processed !== 'server' || payload.retained !== 'nothing') {
		throw new LabRouteError('invalid_server_response', 'The server returned a result this plugin cannot safely display.');
	}
	return payload;
}

export async function readTextFile(file, maxChars) {
	if (!file || typeof file.text !== 'function') throw new LabRouteError('file_unreadable', 'Choose a readable TXT or Markdown file.');
	const name = String(file.name || '').toLowerCase();
	if (!/\.(txt|md|markdown|html|htm)$/.test(name)) throw new LabRouteError('file_type_unsupported', 'Choose a TXT, Markdown, HTML, JPEG, PNG, WebP or PDF file.');
	if (Number(file.size || 0) > Math.min(MAX_LOCAL_FILE_BYTES, Number(maxChars) * 4)) throw new LabRouteError('file_too_large', 'The file is too large for this site’s inspection limit.');
	const content = String(await file.text());
	if (content.length > Number(maxChars)) throw new LabRouteError('file_too_large', 'The file is too large for this site’s inspection limit.');
	return content;
}
