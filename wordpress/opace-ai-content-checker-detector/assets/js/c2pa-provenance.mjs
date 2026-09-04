export const MAX_PROVENANCE_BYTES = 20 * 1024 * 1024;

export const PROVENANCE_MIME_BY_EXTENSION = Object.freeze({
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.pdf': 'application/pdf'
});

export const C2PA_VERIFY_SETTINGS = Object.freeze({
	verify: Object.freeze({
		remoteManifestFetch: false,
		ocspFetch: false,
		verifyTrust: false,
		verifyTimestampTrust: false
	})
});

const SUPPORTED_MIME = new Set(Object.values(PROVENANCE_MIME_BY_EXTENSION));
const LIMITATIONS = Object.freeze([
	'Content Credentials describe a file’s recorded provenance; they do not prove who authored it or whether AI was used.',
	'Certificate trust lists, remote manifests and online certificate status are not fetched or validated by this local check.',
	'The selected file stays in this browser and is not included in analytics, URLs, receipts or share data.'
]);

export class ProvenanceInspectionError extends Error {
	constructor(code, message) {
		super(message);
		this.name = 'ProvenanceInspectionError';
		this.code = code;
	}
}

function abortError() {
	return new DOMException('The local file inspection was cancelled.', 'AbortError');
}

function throwIfAborted(signal) {
	if (signal?.aborted) throw abortError();
}

async function raceWithSignal(work, signal, onAbort) {
	if (!signal) return work;
	throwIfAborted(signal);
	let abort;
	const stopped = new Promise((resolve, reject) => {
		abort = () => {
			try { onAbort?.(); } finally { reject(abortError()); }
		};
		signal.addEventListener('abort', abort, { once: true });
	});
	try { return await Promise.race([work, stopped]); }
	finally { signal.removeEventListener('abort', abort); }
}

function clipped(value, maximum = 300) {
	const text = typeof value === 'string' ? value.trim() : '';
	return text ? text.slice(0, maximum) : null;
}

function issueFor(status, successOverride) {
	if (!status || typeof status !== 'object') return null;
	const code = clipped(String(status.code || ''), 120);
	if (!code) return null;
	const success = typeof status.success === 'boolean' ? status.success : (typeof successOverride === 'boolean' ? successOverride : null);
	return Object.freeze({ code, explanation: clipped(status.explanation, 500), success });
}

export function collectValidationIssues(store = {}) {
	const issues = [];
	const seen = new Set();
	const push = (status, successOverride) => {
		const issue = issueFor(status, successOverride);
		if (!issue) return;
		const key = `${issue.code}|${issue.explanation || ''}`;
		if (seen.has(key) || issues.length >= 25) return;
		seen.add(key);
		issues.push(issue);
	};
	const active = store.validation_results?.activeManifest;
	for (const status of Array.isArray(active?.failure) ? active.failure : []) push(status, false);
	for (const status of Array.isArray(active?.informational) ? active.informational : []) push(status, true);
	for (const status of Array.isArray(store.validation_status) ? store.validation_status : []) push(status);
	return Object.freeze(issues);
}

export function detectProvenanceFormat(file = {}) {
	const extension = String(file.name || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
	if (PROVENANCE_MIME_BY_EXTENSION[extension]) return PROVENANCE_MIME_BY_EXTENSION[extension];
	const mediaType = String(file.type || '').toLowerCase();
	return SUPPORTED_MIME.has(mediaType) ? mediaType : null;
}

function baseResult(fileHash, mediaType, status, trust, extra = {}) {
	return Object.freeze({
		file_hash: `sha256:${fileHash}`,
		media_type: mediaType || 'application/octet-stream',
		status,
		trust,
		limitations: [...LIMITATIONS],
		...extra
	});
}

export function canonicalC2paResult(fileHash, mediaType, store) {
	const activeLabel = clipped(store?.active_manifest, 300);
	const manifest = activeLabel && store?.manifests && typeof store.manifests === 'object' ? store.manifests[activeLabel] : null;
	if (!manifest) {
		return baseResult(fileHash, mediaType, 'absent', 'not_applicable', {
			reason: 'No Content Credentials were found. Their absence is normal and proves nothing about how the file was made.'
		});
	}

	const issues = collectValidationIssues(store);
	const failures = issues.filter((issue) => issue.success === false);
	const isTrustIssue = (issue) => /(?:untrusted|trust)/i.test(issue.code);
	const hasUntrusted = issues.some((issue) => /untrusted/i.test(issue.code));
	const hasNonTrustFailure = failures.some((issue) => !isTrustIssue(issue));
	const invalidState = String(store.validation_state || '').toLowerCase() === 'invalid';
	const status = hasNonTrustFailure || (invalidState && !hasUntrusted) ? 'invalid' : hasUntrusted ? 'untrusted' : 'present';
	const trust = hasUntrusted ? 'untrusted' : 'not_validated';
	const generator = manifest.claim_generator_info?.[0];
	const claimGenerator = clipped(generator ? [generator.name, generator.version].filter(Boolean).join(' ') : manifest.claim_generator, 200);
	const signature = manifest.signature_info || {};
	const summary = Object.freeze({
		claim_generator: claimGenerator,
		signer: clipped(signature.issuer || signature.common_name, 200),
		signed_on: clipped(signature.time, 100),
		assertions_count: Math.min(10000, Math.max(0, Number(manifest.assertions?.length || 0))),
		ingredients_count: Math.min(10000, Math.max(0, Number(manifest.ingredients?.length || 0))),
		validation_state: clipped(store.validation_state, 100)
	});
	const reason = status === 'invalid'
		? 'Content Credentials are present, but local signature or manifest validation reported a problem.'
		: status === 'untrusted'
			? 'Content Credentials are present, but the signer was not established as trusted. No trust list was fetched.'
			: 'Content Credentials are present and the signature validated locally. Certificate trust was not checked.';
	return baseResult(fileHash, mediaType, status, trust, { reason, manifest_summary: summary, issues: [...issues] });
}

function resultForThrownError(fileHash, mediaType, error) {
	const message = String(error?.message || error || '');
	const invalid = /(?:UnknownAlgorithm|Invalid.*(?:claim|manifest|signature)|C2pa\((?:BadParam|ClaimVerification|Jumbf|Signature))/i.test(message);
	return baseResult(fileHash, mediaType, invalid ? 'invalid' : 'error', 'not_applicable', {
		reason: invalid
			? 'The file contains Content Credentials that the local validator could not validate.'
			: 'The local Content Credentials check could not complete. No judgement was made.'
	});
}

async function sha256(file, cryptoImpl) {
	const content = await file.arrayBuffer();
	const digest = await cryptoImpl.subtle.digest('SHA-256', content);
	return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function defaultWasmLoader(signal, fetchImpl = fetch) {
	const url = new URL('../vendor/c2pa/c2pa_bg.wasm', import.meta.url);
	if (!['http:', 'https:'].includes(url.protocol) || (typeof location !== 'undefined' && url.origin !== location.origin)) {
		throw new ProvenanceInspectionError('runtime_origin_invalid', 'The packaged Content Credentials runtime is not on this site.');
	}
	const response = await fetchImpl(url, { credentials: 'same-origin', cache: 'force-cache', signal });
	if (!response.ok) throw new ProvenanceInspectionError('runtime_load_failed', 'The packaged Content Credentials runtime could not be loaded.');
	return WebAssembly.compile(await response.arrayBuffer());
}

export function createProvenanceInspector(dependencies = {}) {
	const runtimeLoader = dependencies.runtimeLoader || (() => import('../vendor/c2pa/index.js'));
	const wasmLoader = dependencies.wasmLoader || defaultWasmLoader;
	const cryptoImpl = dependencies.cryptoImpl || globalThis.crypto;
	let sdkPromise = null;
	let sdk = null;

	const dispose = () => {
		try { sdk?.dispose?.(); } finally { sdk = null; sdkPromise = null; }
	};

	const getSdk = (signal) => {
		if (!sdkPromise) {
			sdkPromise = (async () => {
				const [runtime, wasm] = await Promise.all([runtimeLoader(), wasmLoader(signal)]);
				throwIfAborted(signal);
				const options = { wasmSrc: wasm, settings: C2PA_VERIFY_SETTINGS };
				const workerUrl = new URL('../vendor/c2pa/c2pa_worker.js', import.meta.url);
				if (workerUrl.protocol === 'https:') options.workerSrc = workerUrl;
				const created = await runtime.createC2pa(options);
				if (signal?.aborted) { created.dispose?.(); throw abortError(); }
				sdk = created;
				return created;
			})().catch((error) => { sdkPromise = null; throw error; });
		}
		return raceWithSignal(sdkPromise, signal, dispose);
	};

	const inspect = async (file, options = {}) => {
		const signal = options.signal;
		throwIfAborted(signal);
		if (!file || typeof file.arrayBuffer !== 'function') {
			throw new ProvenanceInspectionError('file_unreadable', 'Choose a readable image or PDF file.');
		}
		if (Number(file.size || 0) > MAX_PROVENANCE_BYTES) {
			throw new ProvenanceInspectionError('file_too_large', 'Choose a file no larger than 20 MB.');
		}
		const mediaType = detectProvenanceFormat(file);
		const fileHash = await raceWithSignal(sha256(file, cryptoImpl), signal);
		if (!mediaType) {
			return baseResult(fileHash, String(file.type || 'application/octet-stream'), 'unsupported', 'not_applicable', {
				reason: 'This release inspects JPEG, PNG, WebP and PDF files only.'
			});
		}
		let reader;
		try {
			const activeSdk = await getSdk(signal);
			reader = await raceWithSignal(activeSdk.reader.fromBlob(mediaType, file), signal, dispose);
			if (!reader) return canonicalC2paResult(fileHash, mediaType, null);
			const store = await raceWithSignal(reader.manifestStore(), signal, dispose);
			return canonicalC2paResult(fileHash, mediaType, store);
		} catch (error) {
			if (error?.name === 'AbortError') throw error;
			return resultForThrownError(fileHash, mediaType, error);
		} finally {
			if (reader) {
				try { await reader.free(); } catch { /* The worker may already be disposed after cancellation. */ }
			}
		}
	};

	return Object.freeze({ inspect, dispose });
}

const defaultInspector = createProvenanceInspector();
export const inspectProvenance = (file, options) => defaultInspector.inspect(file, options);
