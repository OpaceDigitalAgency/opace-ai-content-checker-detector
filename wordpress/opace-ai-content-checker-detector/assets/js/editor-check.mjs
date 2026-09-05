/**
 * The check the editor panels run.
 *
 * Both panels — the block editor's sidebar and the Classic Editor's box — are
 * views over this one module. It holds no markup and touches no element, so the
 * route choice, the states and the hand-off can be tested without a browser.
 *
 * What changed in 1.1.5, and why this file exists at all: the panels used to
 * call a WordPress REST route that ran a three-rule PHP subset, print a count of
 * findings and then tell the reader that the real check was somewhere else. That
 * is not a check, it is a signpost. The full deterministic engine already ships
 * in this plugin as `core.mjs`, and the same trained model the checker screen
 * uses is reachable by the same two routes, so the panel runs the real thing:
 * the whole rule set in a worker, then the AI reading through whichever route
 * this site has open, with the same consent wording as the checker screen.
 *
 * Nothing here decides on the reader's behalf. A route that transfers the draft
 * or downloads a model runs only when the caller passes `consented: true`, and
 * the caller only does that from a button whose own label names the transfer or
 * the download.
 */
import { analyseOnServer, sameSiteRouteUrl } from './lab-route.mjs';
import { defaultRoute, fallbackOffer } from './lab-route-choice.mjs';
import { limitNoticeParts } from './lab-limits.mjs';
import { requestId } from './random-id.mjs';

/** The checks the panel asks for. The same four the checker screen asks for. */
export const EDITOR_CHECKS = Object.freeze(['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic']);

/** Fewest words the trained model will read. Below it, the integrity checks still run. */
export const EDITOR_MIN_WORDS = 60;

export const countWords = (value) => String(value).trim().match(/\S+/gu)?.length ?? 0;

/** Block-level tags whose close ends a paragraph, matching ReadablePostText. */
const BLOCK_TAGS = 'address|article|aside|blockquote|div|dd|dl|dt|figcaption|figure|footer|h1|h2|h3|h4|h5|h6|header|hr|li|main|nav|ol|p|pre|section|table|td|th|tr|ul';

/** Titles WordPress uses when there is no real one. None belong in a draft. */
const PLACEHOLDER_TITLES = new Set(['auto draft', 'untitled', '(no title)', 'no title']);

/**
 * The prose a person actually wrote, out of what the editor is holding.
 *
 * The checker reads writing, not markup. The block editor's store hands back
 * block delimiters and HTML around every paragraph, and scoring that would be
 * scoring the editor rather than the draft. This is the browser-side twin of
 * `includes/Integration/ReadablePostText.php`, step for step and in the same
 * order, so a post checked from the sidebar and the same post checked from the
 * checker screen are the same characters and produce the same hash.
 *
 * @param {string} raw   The editor's own content.
 * @param {string} title The post title, when the surface has one.
 * @returns {string}
 */
export function readableEditorText(raw, title = '') {
	let text = String(raw ?? '');
	if (!text.trim()) return titleLine(title, '');
	// Block delimiters are HTML comments. Removing every comment takes the
	// delimiters with it and keeps the inner HTML of every block.
	text = text.replace(/<!--[\s\S]*?-->/g, '');
	// A shortcode is an instruction to the theme, not prose.
	text = text.replace(/\[(\[?)([^\s\]/[]+)(?:[^\]]*?)(?:\](?:([\s\S]*?)\[\/\2\])?)(\]?)/g, (match, extra, tag, inner) => (extra ? match : String(inner ?? '')));
	text = text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
	text = text.replace(/<br\s*\/?>/gi, '\n');
	text = text.replace(new RegExp(`</(?:${BLOCK_TAGS})\\s*>`, 'gi'), '\n\n');
	text = text.replace(/<(?:hr|img)\b[^>]*>/gi, '\n\n');
	text = text.replace(/<[^>]*>/g, '');
	text = decodeEntities(text);
	// A non-breaking space in stored content is an editor artefact, and the
	// invisible-character check would otherwise report the editor, not the writing.
	text = text.replace(/ /g, ' ');
	text = text.replace(/\r\n|\r/g, '\n');
	text = text.replace(/[ \t]*\n[ \t]*/g, '\n');
	text = text.replace(/\n{3,}/g, '\n\n');
	const body = text.trim();
	const line = titleLine(title, body);
	if (!line) return body;
	return body ? `${line}\n\n${body}` : line;
}

/** The title, when it belongs at the top of the draft. */
function titleLine(title, body) {
	let value = decodeEntities(String(title ?? '')).trim().replace(/ /g, ' ').replace(/\s+/gu, ' ').trim();
	if (!value || [...value].length > 200) return '';
	if (PLACEHOLDER_TITLES.has(value.toLowerCase())) return '';
	// A title with no letter in it (an id, a date, a filename) is a label.
	if (!/\p{L}/u.test(value)) return '';
	const first = String(body ?? '').split('\n')[0].trim();
	if (first && first.toLowerCase() === value.toLowerCase()) return '';
	return value;
}

/**
 * Named and numeric HTML entities back to the characters they stand for, using
 * the browser's own parser so the table cannot go stale.
 */
function decodeEntities(value) {
	if (!/[&]/.test(value)) return value;
	if (typeof document === 'undefined') return value;
	const holder = document.createElement('textarea');
	holder.innerHTML = value;
	return holder.value;
}

/**
 * Which route this panel will use, given what the site allows and what the
 * browser can do. The same two rules as the checker screen, from the same
 * function, so the two surfaces cannot recommend different things.
 *
 * @param {{serverAvailable?: boolean, secureContext?: boolean}} conditions
 * @returns {'server'|'on_device'|'local'}
 */
export function editorRouteFor(conditions = {}) {
	return defaultRoute(conditions);
}

/**
 * What is true of the draft before anything runs.
 *
 * @param {{content?: string, maxChars?: number, minWords?: number}} input
 * @returns {{state: 'empty'|'too_long'|'too_short'|'ready', words: number, characters: number, missing: number}}
 */
export function draftState(input = {}) {
	const content = String(input.content ?? '');
	const characters = content.length;
	const words = countWords(content);
	const maxChars = Number(input.maxChars) > 0 ? Number(input.maxChars) : 100000;
	const minWords = Number(input.minWords) > 0 ? Number(input.minWords) : EDITOR_MIN_WORDS;
	const missing = Math.max(0, minWords - words);
	if (!content.trim()) return { state: 'empty', words, characters, missing: minWords };
	if (characters > maxChars) return { state: 'too_long', words, characters, missing };
	if (words < minWords) return { state: 'too_short', words, characters, missing };
	return { state: 'ready', words, characters, missing: 0 };
}

/**
 * What the button will do, written on the button.
 *
 * There is no tick box in the panel either. Agreement to send the draft once,
 * or to download the model, is the press itself, so the label names the thing
 * before it happens. These are the checker screen's own labels; a reader who
 * learns the button on one screen must not meet a different promise on the
 * other.
 *
 * @param {'server'|'on_device'|'local'} route
 * @param {{modelCached?: boolean, secureContext?: boolean, download?: string}} conditions
 * @returns {string}
 */
export function primaryLabel(route, conditions = {}) {
	const secure = conditions.secureContext !== false;
	// Once a reading is on screen the same button means "do that again", and a
	// label that reads like a first instruction makes a reader wonder whether the
	// run happened at all. The repeat wording says both things: that it is a
	// second run, and what that second run costs.
	const again = conditions.hasResult === true;
	// A draft below the model's minimum will not reach a model, so the button
	// must not promise a transfer or a download that this press cannot make. It
	// offered a 34.5 MB download for a draft the model was never going to read.
	if (conditions.modelWillRun === false) return again ? 'Check the characters and writing again' : 'Check the characters and writing';
	if (route === 'server') return again ? 'Check again, sending once to the EU server' : 'Send once to the EU server and check';
	if (route === 'on_device' && secure && conditions.modelCached !== true) {
		const size = conditions.download || '34.5 MB';
		return again ? `Check again, downloading the model (${size})` : `Download model (${size}) and check`;
	}
	return again ? 'Check this draft again' : 'Check this draft';
}

/**
 * The one line under the button: what the press costs, and what is standing in
 * its way. The checker screen's wording, shortened only where the sidebar
 * cannot carry a second clause.
 *
 * @param {'server'|'on_device'|'local'} route
 * @param {{modelCached?: boolean, secureContext?: boolean, words?: number, minWords?: number, checking?: boolean}} conditions
 * @returns {string}
 */
export function consentLine(route, conditions = {}) {
	const secure = conditions.secureContext !== false;
	const minWords = Number(conditions.minWords) > 0 ? Number(conditions.minWords) : EDITOR_MIN_WORDS;
	const words = Number(conditions.words) || 0;
	if (conditions.checking === true) return 'Waiting to hear whether private EU analysis is open on this site.';
	if ((route === 'server' || route === 'on_device') && words > 0 && words < minWords) {
		const missing = minWords - words;
		return `${missing} more ${missing === 1 ? 'word' : 'words'} for an AI reading. The character and writing checks still run on what you have.`;
	}
	if (route === 'server') return 'Your draft is sent once to our EU server for this run and is not kept there. Nothing downloads.';
	if (route === 'on_device' && !secure) return 'This route needs an HTTPS connection, so it cannot run here. The integrity checks still run.';
	if (route === 'on_device') {
		return conditions.modelCached === true
			? 'The model is already on this device, so nothing downloads and the draft is not sent anywhere.'
			: 'The model file downloads once to this browser, is checked against a hash published in this plugin, then stays cached.';
	}
	return 'No AI reading is possible here, so this runs the character and writing checks only.';
}

/**
 * The sentence that says where the AI reading came from, or why there is none.
 *
 * @param {'server'|'on_device'|'local'} route
 * @param {{aiAssessed?: boolean, secureContext?: boolean}} conditions
 * @returns {string}
 */
export function routeSentence(route, conditions = {}) {
	if (conditions.aiAssessed === false && route === 'local') {
		return conditions.secureContext === false
			? 'Integrity checks only: this site is served over plain HTTP, so the model cannot be verified here.'
			: 'Integrity checks only: no trained model ran, so there is no AI reading.';
	}
	if (route === 'server') return 'Read once on our EU server. Nothing was kept there.';
	if (route === 'on_device') return 'Read on this device, in this browser. Nothing was sent.';
	return 'Character and writing checks ran in this browser.';
}

/**
 * A refusal in words, and a way out of it.
 *
 * @param {{code?: string, message?: string, retryAfter?: number}} error
 * @param {{route?: string, secureContext?: boolean, limits?: object}} conditions
 * @returns {{happened: string, next: string, offer: {route: string, label: string}|null, kind: string}}
 */
export function refusalNotice(error, conditions = {}) {
	const friendly = limitNoticeParts(error, conditions.limits || {});
	const offer = fallbackOffer(error, { route: conditions.route, secureContext: conditions.secureContext });
	return {
		happened: friendly ? friendly.happened : String(error?.message || 'The check could not be completed.'),
		next: friendly ? friendly.next : 'Nothing was kept, so it is safe to try again.',
		offer,
		kind: friendly ? 'warning' : 'error'
	};
}

/**
 * The deterministic engine, in a worker when the browser has one.
 *
 * A worker keeps 116 writing rules and 38 carrier rules off the thread the
 * editor types on. Where a worker cannot be constructed — an old browser, a
 * blocked blob, a locked-down content policy — the same module is imported on
 * this thread instead and the run is simply less smooth. It is never skipped and
 * never quietly downgraded to a smaller rule set.
 *
 * @param {{workerUrl?: string, moduleUrl?: string, createWorker?: Function}} options
 */
export function createDeterministicEngine(options = {}) {
	let worker = null;
	let direct = null;
	let started = false;
	let sequence = 0;
	const pending = new Map();

	const startWorker = () => {
		if (started) return worker;
		started = true;
		if (!options.workerUrl) return null;
		try {
			const make = options.createWorker || ((url) => new Worker(url, { type: 'module' }));
			worker = make(options.workerUrl);
			worker.addEventListener('message', (event) => {
				const { id, ok, result, code, message } = event.data || {};
				const entry = pending.get(id);
				if (!entry) return;
				pending.delete(id);
				if (ok) entry.resolve(result);
				else {
					const error = new Error(message || 'The checks could not be completed.');
					error.code = code;
					entry.reject(error);
				}
			});
			worker.addEventListener('error', () => {
				// A worker that failed to start is not a reason to give the reader
				// a smaller check. It is dropped and the next run imports the same
				// module on this thread.
				for (const entry of pending.values()) entry.reject(Object.assign(new Error('The checks could not be completed.'), { code: 'worker_failed' }));
				pending.clear();
				worker = null;
			});
		} catch {
			worker = null;
		}
		return worker;
	};

	return {
		/** True when the rules are running off the editor's own thread. */
		get threaded() { return Boolean(worker); },
		async inspect(request, signal) {
			const host = startWorker();
			if (host) {
				const id = `run-${++sequence}`;
				return new Promise((resolve, reject) => {
					pending.set(id, { resolve, reject });
					const abort = () => {
						pending.delete(id);
						// The worker is torn down rather than left holding a run whose
						// answer nobody will read. It is rebuilt on the next press.
						worker?.terminate();
						worker = null;
						started = false;
						reject(Object.assign(new DOMException('Cancelled', 'AbortError')));
					};
					if (signal?.aborted) return abort();
					signal?.addEventListener('abort', abort, { once: true });
					host.postMessage({ id, request });
				});
			}
			if (!direct) direct = await import(options.moduleUrl || './core.mjs');
			return direct.inspect(request, { signal });
		},
		destroy() {
			worker?.terminate();
			worker = null;
			pending.clear();
		}
	};
}

/**
 * The request the deterministic engine is given. The same shape the checker
 * screen sends, with this panel named as the caller so a receipt can say where
 * a run came from.
 *
 * @param {string} content
 * @param {{caller?: string, postId?: number, language?: string}} context
 */
export function editorRequest(content, context = {}) {
	return {
		schema_version: '1.0',
		contract_version: '1.0.0',
		request_id: requestId(),
		created_at: new Date().toISOString(),
		source: { content, content_type: 'plain_text', language: context.language || 'en-GB' },
		checks: [...EDITOR_CHECKS],
		privacy: { allowed_routes: ['browser', 'wordpress_local'], save_receipt: false, retain_content: false },
		context: { caller: context.caller || 'wordpress-editor', caller_object_id: `post:${Number(context.postId) || 0}` }
	};
}

/**
 * One run, from the deterministic checks through to the AI reading.
 *
 * Returns the canonical checker-result when a model read the draft, and the
 * integrity-only result when none did. It never returns half a run: a route that
 * refuses throws, and the caller says so in words.
 *
 * @param {object} options
 * @param {'server'|'on_device'|'local'} options.route
 * @param {string} options.content
 * @param {boolean} options.consented   True only when a button that named the cost was pressed.
 * @param {object} options.engine       From createDeterministicEngine.
 * @param {AbortSignal} options.signal
 * @param {object} options.config       The panel's localised configuration.
 * @param {Function} [options.onPhase]  Called with a sentence about what is happening now.
 * @param {Function} [options.onProgress] Called with 0-1, or null when unknown.
 * @param {Function} [options.importCycle5] Test seam for the on-device runtime.
 * @returns {Promise<{result: object, deterministic: object, route: string, aiAssessed: boolean}>}
 */
export async function runEditorCheck(options) {
	const { config = {}, consented = false, content, engine, onPhase = () => {}, onProgress = () => {}, route, signal } = options;
	const minWords = Number(config.limits?.minWords) > 0 ? Number(config.limits.minWords) : EDITOR_MIN_WORDS;
	const draft = draftState({ content, maxChars: config.maxChars, minWords });
	if (draft.state === 'empty') throw Object.assign(new Error('There is nothing to check yet.'), { code: 'empty_source' });
	if (draft.state === 'too_long') throw Object.assign(new Error('That draft is longer than this site’s limit.'), { code: 'text_too_long' });

	onPhase('Running the character and writing checks…');
	const request = editorRequest(content, { caller: config.caller, postId: config.postId });
	const deterministic = await engine.inspect(request, signal);

	// Below the model's minimum there is no honest AI reading to seek, so the
	// run stops at the integrity result rather than asking a route for one and
	// being refused by it.
	const wantsModel = (route === 'server' || route === 'on_device') && draft.state === 'ready';
	// The Cycle-5 wrapper arrives as an already-started import from the panel,
	// which knows the versioned URL, and as a function or a promise from a test.
	const load = options.importCycle5 ?? import('./cycle5-wordpress.mjs');
	const cycle5 = await (typeof load === 'function' ? load() : load);
	const primitive = cycle5.buildWordPressPrimitiveResult(deterministic, content, { expectedHash: deterministic.source.content_hash });
	if (!wantsModel) return { result: primitive, deterministic, route: 'local', aiAssessed: false };

	if (route === 'server') {
		onPhase('Sending the draft once through this site to our EU service…');
		const payload = await analyseOnServer({
			available: config.serverAnalysis?.available === true,
			consent: consented,
			content,
			nonce: config.nonce,
			pageUrl: options.pageUrl || window.location.href,
			requestId: request.request_id,
			restUrl: config.restUrl,
			signal
		});
		return { result: cycle5.composeWordPressServerResult(primitive, payload, content), deterministic, route: 'server', aiAssessed: true };
	}

	if (options.secureContext === false) throw Object.assign(new Error('On-device analysis needs a secure connection.'), { code: 'insecure_context' });
	const runtime = cycle5.createWordPressCycle5Runtime({
		modelBaseUrl: config.onDevice?.modelBaseUrl,
		overriddenModelBaseUrl: config.onDevice?.overriddenModelBaseUrl || '',
		wasmUrl: config.onDevice?.wasmUrl
	});
	try {
		onPhase('Looking for a verified model already on this device…');
		let ready = await runtime.prepareFromCache(signal);
		if (!ready) {
			if (consented !== true) throw Object.assign(new Error('The model has not been downloaded to this device yet.'), { code: 'model_consent_required' });
			try {
				await runtime.prepareWithConsent({
					consent: true,
					signal,
					onProgress: ({ fileIndex, fileCount, receivedBytes, totalBytes }) => {
						const received = (receivedBytes / (1024 * 1024)).toFixed(1);
						const total = totalBytes ? ` of ${(totalBytes / (1024 * 1024)).toFixed(1)} MB` : ' MB';
						onPhase(`Downloading the verified model, file ${fileIndex} of ${fileCount}: ${received}${total}`);
						onProgress(totalBytes ? receivedBytes / totalBytes : null);
					}
				});
			} catch (cause) {
				// The packaged runtime turns an aborted download into its own generic
				// preparation error. A reader who pressed Cancel is told they
				// cancelled, not that the model "could not be prepared".
				if (signal?.aborted) throw Object.assign(new Error('The model download was cancelled.'), { name: 'AbortError' });
				throw cause;
			}
			ready = true;
		}
		onProgress(null);
		onPhase('Reading every section on this device…');
		const score = await runtime.score(content, {
			signal,
			onSection: (done, total) => onPhase(`Reading section ${done} of ${total} on this device…`)
		});
		if (score.status !== 'scored') {
			const error = new Error(score.reason);
			error.code = score.code;
			if (score.code === 'cancelled') error.name = 'AbortError';
			throw error;
		}
		return { result: cycle5.composeWordPressOnDeviceResult(primitive, score, content), deterministic, route: 'on_device', aiAssessed: true };
	} finally {
		runtime.dispose?.();
	}
}

/**
 * Asks this site whether private EU analysis is accepting runs.
 *
 * The service scales to zero, so the answer can take longer than any editor
 * screen should wait for. The panel draws itself from what the site already
 * knew, then corrects itself with this.
 *
 * @param {{restUrl: string, pageUrl: string, nonce: string, signal?: AbortSignal, fetchImpl?: Function}} options
 * @returns {Promise<{available: boolean, checking: boolean, state: string}>}
 */
export async function fetchEditorServiceStatus(options) {
	const fetchImpl = options.fetchImpl || fetch;
	const response = await fetchImpl(sameSiteRouteUrl(options.restUrl, options.pageUrl, 'analysis/server/status'), {
		method: 'POST',
		credentials: 'same-origin',
		cache: 'no-store',
		headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': options.nonce },
		signal: options.signal
	});
	const payload = await response.json().catch(() => ({}));
	if (!response.ok) throw Object.assign(new Error('The service status could not be read.'), { code: 'status_unavailable' });
	return {
		available: payload?.available === true,
		checking: payload?.checking === true,
		state: String(payload?.state || 'off')
	};
}

/**
 * Hands a finished reading to the checker screen without putting it in a link.
 *
 * A result carries the passages the model read, so it must never travel through
 * a URL, a history entry or a server log. It stays in this tab's session storage,
 * keyed by the site, current user nonce and post, and expires after five minutes.
 * The checker screen collects it once. If the hand-off cannot be stored, the
 * link still works — the checker screen loads the post and the reader presses
 * the button, which is a slower path to the same place, not a dead end.
 *
 * @param {{restUrl: string, pageUrl: string, nonce: string, postId: number, result: object, sourceText: string, findings?: Array, storage?: Storage, now?: number}} options
 * @returns {Promise<boolean>} Whether the checker screen will find a result waiting.
 */
export async function storeEditorHandoff(options) {
	const postId = Number(options.postId) || 0;
	if (postId < 1 || !clearEditorHandoff(options) || !options.result) return false;
	try {
		const key = editorHandoffKey(options);
		const storage = options.storage || globalThis.sessionStorage;
		const payload = JSON.stringify({ expires: (options.now ?? Date.now()) + 300000, result: options.result, content: String(options.sourceText ?? ''), findings: Array.isArray(options.findings) ? options.findings : [] });
		if (payload.length > 1000000) return false;
		storage.setItem(key, payload);
		return true;
	} catch {
		return false;
	}
}

/** Removes only this site's current user/post handover, without a network call. */
export function clearEditorHandoff(options) {
	try {
		const key = editorHandoffKey(options);
		(options.storage || globalThis.sessionStorage).removeItem(key);
		return true;
	} catch {
		return false;
	}
}

/**
 * Collects a reading the editor panel left for this screen, or null.
 *
 * Browser storage deletes what it hands back, so a reading is shown once and a
 * refreshed page re-runs rather than resurrecting an old result.
 *
 * @param {{restUrl: string, pageUrl: string, nonce: string, postId: number, storage?: Storage, now?: number}} options
 * @returns {Promise<{result: object, content: string, findings: Array}|null>}
 */
export async function collectEditorHandoff(options) {
	const postId = Number(options.postId) || 0;
	if (postId < 1) return null;
	try {
		const key = editorHandoffKey(options);
		const storage = options.storage || globalThis.sessionStorage;
		const raw = storage.getItem(key);
		storage.removeItem(key);
		if (!raw) return null;
		const payload = JSON.parse(raw);
		if (!payload || typeof payload !== 'object' || !payload.result || typeof payload.content !== 'string' || !Number.isFinite(payload.expires) || payload.expires <= (options.now ?? Date.now())) return null;
		return { result: payload.result, content: payload.content, findings: Array.isArray(payload.findings) ? payload.findings : [] };
	} catch {
		return null;
	}
}

function editorHandoffKey(options) {
	const route = sameSiteRouteUrl(options.restUrl, options.pageUrl, 'editor');
	if (typeof options.nonce !== 'string' || !options.nonce) throw new Error('editor_handoff_user_required');
	return `oaci.editor.handoff:${new URL(route).origin}:${options.nonce}:${Number(options.postId)}`;
}
