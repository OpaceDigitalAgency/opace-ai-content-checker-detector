import {
	CYCLE5_BANDS,
	CYCLE5_BROWSER_RUNTIME_VERSION,
	CYCLE5_CACHE_NAME,
	CYCLE5_MODEL_BASE,
	CYCLE5_MODEL_FILE,
	CYCLE5_MODEL_DOWNLOAD_LABEL,
	CYCLE5_PRIMARY_DISPLAY_THRESHOLD,
	CYCLE5_SECONDARY_DISPLAY_THRESHOLD,
	CYCLE5_TEMPERATURE,
	CYCLE5_WASM_SHA256,
	composeCycle5BrowserCheckerResult,
	createCycle5BrowserRuntime
} from '../vendor/cycle5/index.js';
import { resultId as sharedResultId } from './random-id.mjs';
import {
	CYCLE5_MODEL_IDENTITY,
	assertCheckerResultInvariants,
	buildContentFreeSharePayload,
	composeCheckerAxes,
	presentCycle5Result
} from './core.mjs';

export const WORDPRESS_CYCLE5_RUNTIME = CYCLE5_BROWSER_RUNTIME_VERSION;
export const WORDPRESS_MODEL_BASE = CYCLE5_MODEL_BASE;
export const WORDPRESS_MODEL_DOWNLOAD = CYCLE5_MODEL_DOWNLOAD_LABEL;
export const WORDPRESS_MODEL_MAX_CHARACTERS = 100000;
export const WORDPRESS_SERVER_MODEL_SHA256 = '45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057';

const supportDestination = 'https://opace.agency/tools/ai/content-verification-integrity/checker/';
const unique = (items) => [...new Set(items.filter(Boolean))];
const contentHashFor = (result) => result?.source?.content_hash;
const wordCount = (text) => String(text).trim().match(/\S+/gu)?.length ?? 0;
const resultId = () => sharedResultId();

function watermarksFor(result) {
	return result.methods.filter((method) => method.category === 'watermark').map((method) => ({
		method_id: method.id,
		method_status: method.status,
		key_scope: method.id === 'watermark.anthropic' ? 'provider_private' : 'public_test',
		outcome: method.native_outcome || (method.status === 'unsupported' ? 'not_available' : 'not_detected'),
		limitations: method.limitations
	}));
}

function c2paTextFor(result) {
	const present = result.protected_spans.some((span) => String(span.kind || '').includes('c2pa'));
	return {
		status: present ? 'present' : 'absent',
		wrapper_protected: true,
		limitations: [present
			? 'A C2PA text wrapper was protected from default safe fixes; its signature was not treated as proof of authorship.'
			: 'An absent C2PA text wrapper is not evidence of human authorship.']
	};
}

export function buildWordPressPrimitiveResult(deterministic, sourceText, options = {}) {
	if (!deterministic?.combined_verdict || contentHashFor(deterministic) !== options.expectedHash) {
		throw new Error('The local checks and Cycle-5 route must use the same source bytes.');
	}
	const generatedAt = options.generatedAt || deterministic.completed_at || new Date().toISOString();
	const categories = unique(deterministic.protected_spans.map((span) => span.kind));
	return {
		schema_version: '1.0',
		contract_version: '1.0.0',
		result_id: options.resultId || resultId(),
		profile: 'primitive',
		generated_at: generatedAt,
		contains_content: false,
		source: {
			content_hash: deterministic.source.content_hash,
			normalised_hash: deterministic.source.normalised_hash || deterministic.source.content_hash,
			content_type: deterministic.source.content_type,
			language: deterministic.source.language || 'en-GB',
			word_count: deterministic.source.word_count,
			character_count: sourceText.length,
			section_count: 0
		},
		route: {
			kind: 'deterministic_only',
			location: 'WordPress Lab, this browser',
			content_transfer: 'none',
			privacy_route: 'browser',
			retention: { source: 'session', result: 'session', statement: 'The working copy and local findings stay in this browser view unless a hash-only receipt is explicitly saved.' },
			consent: 'not_required',
			model: null,
			transport: { endpoint_class: 'none', region: null, requests: 0, words_sent: 0, processed: 'in browser', retained: 'not retained' }
		},
		axes: composeCheckerAxes(deterministic.combined_verdict),
		sections: [],
		methods: deterministic.methods.map((method) => ({ ...method, evidence: [...method.evidence], limitations: [...method.limitations] })),
		provenance: {
			protected_facts: { count: deterministic.protected_spans.length, categories },
			c2pa_text: c2paTextFor(deterministic),
			c2pa_files: [],
			watermarks: watermarksFor(deterministic),
			safe_fixes: { preview_first: true, explicit_approval_required: true, automatic_homoglyph_replacement: false, c2pa_wrapper_protected: true }
		},
		exports: {
			receipt: { available: true, contains_content: false, canonicalisation: 'RFC8785', payload_hash: null },
			share: { available: false, contains_content: false, payload: null },
			report: { available: false, format: 'none', contains_content: false, explicit_user_action: true, complete_evidence: false, product_identity: 'Opace AI Content Checker & Detector', support_destination: supportDestination }
		},
		abuse_controls: {
			max_words: null, max_characters: WORDPRESS_MODEL_MAX_CHARACTERS, max_request_bytes: null,
			explicit_capture: 'enforced', consent_before_transfer: 'not_applicable', refuse_not_truncate: 'enforced', cancellation: 'enforced',
			channel_authentication: 'not_applicable', proof_of_work: 'not_applicable', origin_validation: 'not_applicable', per_ip_limit: 'not_applicable',
			per_site_limit: 'not_applicable', per_connection_limit: 'not_applicable', global_inference_limit: 'not_applicable', request_body_logging: 'not_applicable',
			unexpected_network_requests: 'blocked', fallback: 'not_configured', kill_switch: 'not_applicable'
		},
		limitations: unique([...(deterministic.limitations || []), ...(deterministic.combined_verdict.limitations || [])])
	};
}

/**
 * The shipped model directory is pinned in code and `modelBaseUrl` must always
 * carry it, so a changed default fails loudly. A site owner who mirrors the
 * model elsewhere sets the separate `overriddenModelBaseUrl` field through the
 * documented `OPACE_CONTENT_INTEGRITY_MODEL_BASE_URL` constant or the
 * `oaci_model_base_url` filter; that is the only way another host is reached,
 * and the override still supplies the single allowed origin for the run.
 */
export function createWordPressCycle5Runtime(options) {
	if (options.modelBaseUrl !== WORDPRESS_MODEL_BASE) throw new Error('The WordPress model base does not match the pinned Opace directory.');
	const override = typeof options.overriddenModelBaseUrl === 'string' ? options.overriddenModelBaseUrl.trim() : '';
	if (override && !/^https:\/\/[^\s]+\/$/u.test(override)) throw new Error('A mirrored model directory must be an HTTPS URL ending in a slash.');
	const base = override || WORDPRESS_MODEL_BASE;
	return createCycle5BrowserRuntime({
		modelBaseUrl: base,
		allowedModelBaseUrls: [base],
		wasmUrl: options.wasmUrl,
		maxCharacters: WORDPRESS_MODEL_MAX_CHARACTERS,
		fetch: options.fetch,
		cacheStorage: options.cacheStorage,
		createSession: options.createSession
	});
}

/**
 * Whether a model download is already sitting in this browser's cache.
 *
 * The button in step two has to say what pressing it will do before it is
 * pressed, and "Download model (34.5 MB) and check" is the wrong label for a
 * reader who downloaded it last week. This answers that question without
 * loading the model, without an inference session, and without a network
 * request: it opens the runtime's own cache and asks whether the model file is
 * in it. A browser that exposes no Cache API, or a page that is not in a secure
 * context, answers no, which is the safe way round — the label then promises a
 * download that may turn out not to be needed, rather than hiding one.
 *
 * @param {{modelBaseUrl?: string, cacheStorage?: CacheStorage}} options
 * @returns {Promise<boolean>}
 */
export async function cachedModelPresent(options = {}) {
	const storage = options.cacheStorage ?? (typeof caches === 'undefined' ? null : caches);
	if (!storage || typeof storage.open !== 'function') return false;
	const base = typeof options.modelBaseUrl === 'string' && options.modelBaseUrl ? options.modelBaseUrl : WORDPRESS_MODEL_BASE;
	try {
		if (typeof storage.has === 'function' && !(await storage.has(CYCLE5_CACHE_NAME))) return false;
		const cache = await storage.open(CYCLE5_CACHE_NAME);
		return Boolean(await cache.match(new URL(CYCLE5_MODEL_FILE, base).href));
	} catch {
		return false;
	}
}

export function composeWordPressOnDeviceResult(primitive, score, sourceText, options = {}) {
	const result = composeCycle5BrowserCheckerResult(primitive, score, sourceText, {
		surface: 'WordPress Lab',
		resultId: options.resultId || resultId(),
		generatedAt: options.generatedAt,
		reportFormat: 'pdf',
		maxCharacters: WORDPRESS_MODEL_MAX_CHARACTERS,
		supportDestination
	});
	assertCheckerResultInvariants(result);
	return result;
}

const finite = (value, name) => {
	if (!Number.isFinite(value)) throw new Error(`The server returned an invalid ${name}.`);
	return value;
};
const integer = (value, name) => {
	if (!Number.isInteger(value)) throw new Error(`The server returned an invalid ${name}.`);
	return value;
};
const isObject = (value) => typeof value === 'object' && null !== value && !Array.isArray(value);
const pointLength = (text) => [...text].length;
const utf16Offset = (text, codePointOffset) => [...text].slice(0, codePointOffset).join('').length;
const bandFor = (score) => CYCLE5_BANDS.find((band) => score >= band.min)?.id;
const probabilityFromMargin = (margin) => 1 / (1 + Math.exp(-margin / CYCLE5_TEMPERATURE));
const probabilityMatchesRounded = (reported, derived) => Math.abs(reported - Number(derived.toFixed(4))) < 1e-12;

export function validateWordPressServerScore(payload, sourceText) {
	if (!isObject(payload) || payload.model !== 'tier3-cycle5-full' || payload.model_build !== '45e00978b10d1df6' || payload.precision !== 'fp32'
		|| payload.segmentation_contract !== 'segments-v3' || payload.input_normalisation !== 'raw-v1' || payload.features_contract !== 'features-v1'
		|| payload.scoring !== 'margin-v1' || payload.aggregation !== 'max' || payload.channel !== 'wordpress-v1'
		|| payload.processed !== 'server' || payload.retained !== 'nothing' || payload.truncated !== false || !Array.isArray(payload.segments)) {
		throw new Error('The EU server response does not match the pinned WordPress Cycle-5 contract.');
	}
	if (finite(payload.threshold_margin, 'margin threshold') !== CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin
		|| finite(payload.secondary_gap, 'secondary gap') !== CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap
		|| payload.word_count !== wordCount(sourceText) || payload.words_sent !== payload.word_count
		|| integer(payload.segment_count, 'section count') !== payload.segments.length || payload.segments.length < 1 || payload.segments.length > 256) {
		throw new Error('The EU server response does not describe the submitted working copy.');
	}
	const points = pointLength(sourceText);
	let previousEnd = 0;
	const sections = payload.segments.map((segment, index) => {
		if (!isObject(segment) || integer(segment.index, 'section index') !== index || integer(segment.char_start, 'section start') < previousEnd
			|| integer(segment.char_end, 'section end') <= segment.char_start || segment.char_end > points || segment.truncated !== false) {
			throw new Error('The EU server returned invalid or overlapping section bounds.');
		}
		const rawMargin = finite(segment.margin, 'section margin');
		const reportedScore = finite(segment.probability_ai, 'section score');
		const rawScore = probabilityFromMargin(rawMargin);
		if (reportedScore < 0 || reportedScore > 1 || !probabilityMatchesRounded(reportedScore, rawScore)) {
			throw new Error('The EU server returned a score that contradicts its model margin.');
		}
		const startUtf16 = utf16Offset(sourceText, segment.char_start);
		const endUtf16 = utf16Offset(sourceText, segment.char_end);
		previousEnd = segment.char_end;
		return {
			index,
			startUtf16,
			endUtf16,
			wordCount: integer(segment.words, 'section word count'),
			rawScore,
			rawMargin,
			bandId: bandFor(rawScore),
			passage: sourceText.slice(startUtf16, endUtf16),
			evidence: [{
				id: `cycle5-server-section-${index}`,
				kind: 'trained_model',
				summary: index === payload.strongest_segment ? 'The strongest passage shaped the overall reading.' : 'This passage was scored by the same trained model.',
				detail: 'The score and level beside this passage come from the Cycle-5 model. Character and writing checks did not set them.',
				basis: 'tier3-cycle5-v1, fp32, segments-v3, raw-v1, features-v1, margin-v1'
			}]
		};
	});
	if (sections.some((section) => !section.bandId)) throw new Error('The EU server returned an unknown score band.');
	const strongest = sections.reduce((best, section) => section.rawMargin > best.rawMargin ? section : best, sections[0]);
	const reportedOverall = finite(payload.probability_ai, 'overall score');
	if (payload.strongest_segment !== strongest.index || !probabilityMatchesRounded(reportedOverall, strongest.rawScore)
		|| finite(payload.margin, 'overall margin') !== strongest.rawMargin) throw new Error('The EU server result does not match its strongest section.');
	const margins = sections.map((section) => section.rawMargin).sort((a, b) => b - a);
	const primary = margins[0] >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
	const secondary = margins.length > 1 && margins[1] + CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap >= CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin;
	const flagReason = primary ? 'primary' : secondary ? 'secondary' : null;
	if (payload.flagged !== (primary || secondary) || payload.flag_reason !== flagReason) throw new Error('The EU server flag contradicts the returned section margins.');
	return { rawScore: strongest.rawScore, rawMargin: strongest.rawMargin, flagged: payload.flagged, flagReason, sections };
}

export function composeWordPressServerResult(primitive, payload, sourceText, options = {}) {
	const score = validateWordPressServerScore(payload, sourceText);
	const presented = presentCycle5Result({
		source: CYCLE5_MODEL_IDENTITY.identity,
		rawScore: score.rawScore,
		rawMargin: score.rawMargin,
		bandId: score.sections.find((section) => section.index === payload.strongest_segment).bandId,
		primaryDisplayThreshold: CYCLE5_PRIMARY_DISPLAY_THRESHOLD,
		secondaryDisplayThreshold: CYCLE5_SECONDARY_DISPLAY_THRESHOLD,
		flagged: score.flagged,
		flagReason: score.flagReason,
		sections: score.sections
	});
	const generatedAt = options.generatedAt || new Date().toISOString();
	const id = options.resultId || resultId();
	const share = buildContentFreeSharePayload({ resultId: id, generatedAt, wordCount: primitive.source.word_count, modelVersion: CYCLE5_MODEL_IDENTITY.identity, presented });
	const detector = {
		id: 'detector.cycle5', category: 'detector', provider_or_method: 'Opace Cycle-5 AI-pattern model', version: CYCLE5_MODEL_IDENTITY.identity,
		status: presented.ai_pattern.method_status, availability: 'available', native_outcome: presented.ai_pattern.level, score: score.rawScore,
		score_scale: { id: 'zero_to_one_pattern_similarity' }, threshold: { scoring_contract: 'margin-v1', primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin, secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap },
		segments: presented.sections.map((section) => ({ index: section.index, raw_margin: section.raw_margin })), evidence: [{ type: 'strongest_section', index: presented.ai_pattern.strongest_section_index }],
		limitations: [...presented.ai_pattern.limitations], started_at: generatedAt, completed_at: generatedAt, privacy_route: 'hub_provider'
	};
	const result = {
		...primitive,
		result_id: id,
		profile: 'full_checker',
		generated_at: generatedAt,
		contains_content: true,
		source: { ...primitive.source, character_count: sourceText.length, section_count: presented.sections.length },
		route: {
			kind: 'eu_server', location: 'Opace EU server, europe-west1', content_transfer: 'eu_server', privacy_route: 'hub_provider',
			retention: { source: 'request_only', result: 'session', statement: 'The text was processed for this request and the service reported that it retained nothing.' },
			consent: 'explicit',
			model: { identity: 'tier3-cycle5-v1', registry_identity: 'tier3-cycle5-full', precision: 'fp32', artefact_hash: `sha256:${WORDPRESS_SERVER_MODEL_SHA256}`, segmentation_contract: 'segments-v3', input_contract: 'raw-v1', features_contract: 'features-v1', scoring_contract: 'margin-v1', flag_rule: { expression: CYCLE5_MODEL_IDENTITY.flagRule.expression, primary_margin: CYCLE5_MODEL_IDENTITY.flagRule.primaryMargin, secondary_gap: CYCLE5_MODEL_IDENTITY.flagRule.secondaryGap } },
			transport: { endpoint_class: 'wordpress_challenge_token', region: 'europe-west1', requests: 3, words_sent: payload.words_sent, processed: 'once', retained: 'not retained' }
		},
		axes: { ...primitive.axes, ai_pattern: presented.ai_pattern },
		sections: presented.sections,
		methods: [detector, ...primitive.methods.filter((method) => method.id !== 'detector.cycle5' && method.id !== 'detector.local')],
		exports: { ...primitive.exports, receipt: { ...primitive.exports.receipt, available: true, contains_content: false }, share: { available: true, contains_content: false, payload: share }, report: { available: true, format: 'pdf', contains_content: true, explicit_user_action: true, complete_evidence: true, product_identity: 'Opace AI Content Checker & Detector', support_destination: supportDestination } },
		abuse_controls: { max_words: 8000, max_characters: 100000, max_request_bytes: 700000, explicit_capture: 'enforced', consent_before_transfer: 'enforced', refuse_not_truncate: 'enforced', cancellation: 'not_configured', channel_authentication: 'wordpress_challenge_token', proof_of_work: 'enforced', origin_validation: 'not_applicable', per_ip_limit: 'enforced', per_site_limit: 'enforced', per_connection_limit: 'enforced', global_inference_limit: 'enforced', request_body_logging: 'excluded', unexpected_network_requests: 'blocked', fallback: 'enforced', kill_switch: 'enforced' },
		limitations: unique([...primitive.limitations, ...presented.ai_pattern.limitations, 'Cancel stops this WordPress page waiting, but a server request already accepted may still finish.', 'The server reported that it retained no submitted content. Ordinary receipts and shares remain content-free.'])
	};
	assertCheckerResultInvariants(result);
	return Object.freeze(result);
}

export function buildContentFreeCheckerRecord(result) {
	assertCheckerResultInvariants(result);
	const record = structuredClone(result);
	record.contains_content = false;
	record.sections = record.sections.map(({ passage: _passage, ...section }) => ({
		...section,
		locator: section.locator || { content_hash: record.source.content_hash, start_utf16: section.start_utf16, end_utf16: section.end_utf16 },
		evidence: []
	}));
	record.methods = record.methods.map((method) => ({ ...method, evidence: [] }));
	record.exports.report = { ...record.exports.report, contains_content: false };
	assertCheckerResultInvariants(record);
	return Object.freeze(record);
}

export function cycle5RuntimeIdentity() {
	return Object.freeze({ runtime: WORDPRESS_CYCLE5_RUNTIME, modelBase: WORDPRESS_MODEL_BASE, wasmSha256: CYCLE5_WASM_SHA256 });
}
