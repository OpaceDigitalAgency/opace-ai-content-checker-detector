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

export function sameSiteServerUrl(restUrl, pageUrl) {
	const page = new URL(pageUrl);
	const rest = new URL(restUrl, page);
	if (rest.origin !== page.origin) throw new LabRouteError('cross_site_rest_url', 'The WordPress analysis route is not on this site.');
	return new URL('analysis/server', `${rest.href.replace(/\/$/, '')}/`).href;
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
		const retryAfter = payload?.data?.retry_after ?? payload?.retry_after ?? Number(response.headers?.get?.('Retry-After')) ?? null;
		throw new LabRouteError(payload?.code || 'server_request_failed', payload?.message || 'EU server analysis could not be completed.', retryAfter);
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
