import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  CYCLE5_ASSETS,
  CYCLE5_CACHE_NAME,
  CYCLE5_MODEL_BASE,
  CYCLE5_MODEL_FILE,
  Cycle5BrowserError,
  composeCycle5ServerCheckerResult,
  composeCycle5BrowserCheckerResult,
  createCycle5BrowserRuntime,
  featuresV1,
  parseCycle5ChromeServerResponse,
  rawFeatures,
  renderCompleteCheckerHtml,
} from '../dist/index.js';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('package pins the runtime and has no install-time downloader', () => {
  assert.equal(packageJson.dependencies['onnxruntime-web'], '1.29.0');
  assert.equal(packageJson.scripts?.postinstall, undefined);
  assert.equal(CYCLE5_ASSETS[CYCLE5_MODEL_FILE].sha256, '9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b');
  assert.equal(CYCLE5_CACHE_NAME, 'opace-content-integrity-cycle5-browser-2026-09-1');
});

test('no model network occurs before explicit consent', async () => {
  let calls = 0;
  const runtime = createCycle5BrowserRuntime({
    modelBaseUrl: CYCLE5_MODEL_BASE,
    allowedModelBaseUrls: [CYCLE5_MODEL_BASE],
    fetch: async () => { calls += 1; throw new Error('network forbidden'); },
  });
  assert.equal(runtime.state().state, 'not_ready');
  assert.equal((await runtime.score('Evidence '.repeat(80))).code, 'not_ready');
  await assert.rejects(runtime.prepareWithConsent({ consent: false }), (error) => error instanceof Cycle5BrowserError && error.code === 'consent_required');
  assert.equal(calls, 0);
  await runtime.dispose();
  assert.equal(calls, 0);
});

test('cached asset validation honours cancellation before reading or hashing large assets', async () => {
  const controller = new AbortController();
  let arrayBufferCalls = 0;
  const cache = {
    async match() {
      controller.abort();
      return { async arrayBuffer() { arrayBufferCalls += 1; return new ArrayBuffer(0); } };
    },
  };
  const cacheStorage = {
    async keys() { return []; },
    async open() { return cache; },
    async delete() { return true; },
  };
  const runtime = createCycle5BrowserRuntime({
    modelBaseUrl: CYCLE5_MODEL_BASE,
    allowedModelBaseUrls: [CYCLE5_MODEL_BASE],
    cacheStorage,
    fetch: async () => { throw new Error('network forbidden'); },
  });
  await assert.rejects(runtime.prepareFromCache(controller.signal), (error) => error instanceof Cycle5BrowserError && error.code === 'cancelled');
  assert.equal(arrayBufferCalls, 0);
  assert.equal(runtime.state().state, 'not_ready');
});

test('base URL is exact, HTTPS and host-allowlisted', () => {
  const create = (modelBaseUrl) => createCycle5BrowserRuntime({ modelBaseUrl, allowedModelBaseUrls: [CYCLE5_MODEL_BASE], fetch: async () => new Response() });
  assert.throws(() => create('http://opace.agency/models/local-signals-v1/'), /HTTPS/u);
  assert.throws(() => create('https://example.test/models/'), /allowlist/u);
  assert.throws(() => create('https://user:pass@opace.agency/models/local-signals-v1/'), /credential-free/u);
});

test('shared hard ceiling permits a 100,000-character host while keeping a 50,000 default', async () => {
  const base = { modelBaseUrl: CYCLE5_MODEL_BASE, allowedModelBaseUrls: [CYCLE5_MODEL_BASE], fetch: async () => new Response() };
  const defaultRuntime = createCycle5BrowserRuntime(base);
  const wordpressScaleRuntime = createCycle5BrowserRuntime({ ...base, maxCharacters: 100_000 });
  assert.equal(defaultRuntime.maxCharacters, 50_000);
  assert.equal(wordpressScaleRuntime.maxCharacters, 100_000);
  assert.throws(() => createCycle5BrowserRuntime({ ...base, maxCharacters: 100_001 }), /100000/u);
  await defaultRuntime.dispose();
  await wordpressScaleRuntime.dispose();
});

test('manifest and downloaded byte mismatch fail as integrity_error and never become ready', async () => {
  const manifest = { version: 'tier3-cycle5-v1', files: Object.fromEntries(Object.entries(CYCLE5_ASSETS).map(([file, value]) => [file, { bytes: value.bytes, sha256: value.sha256 }])) };
  let calls = 0;
  const runtime = createCycle5BrowserRuntime({
    modelBaseUrl: CYCLE5_MODEL_BASE,
    allowedModelBaseUrls: [CYCLE5_MODEL_BASE],
    fetch: async (url) => {
      calls += 1;
      return String(url).endsWith('/manifest.json')
        ? new Response(JSON.stringify(manifest), { status: 200 })
        : new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    },
  });
  await assert.rejects(runtime.prepareWithConsent({ consent: true }), (error) => error instanceof Cycle5BrowserError && error.code === 'integrity_error');
  assert.equal(calls, 2);
  assert.equal(runtime.state().state, 'integrity_error');
  assert.equal((await runtime.score('Evidence '.repeat(80))).status, 'not_scored');
});

test('all ten training-time structural feature vectors remain exact', () => {
  const fixtureRoot = new URL('../../../services/local-engine/research/cycle5-train/deploy-prep/fixtures/', import.meta.url);
  const expected = JSON.parse(readFileSync(new URL('full-vector-golden.json', fixtureRoot), 'utf8'));
  for (const [name, vector] of Object.entries(expected)) {
    const text = readFileSync(new URL(`${name}.txt`, fixtureRoot), 'utf8');
    const actual = rawFeatures(text);
    Object.values(vector).forEach((wanted, index) => wanted === null
      ? assert.equal(actual[index], undefined, `${name}[${index}]`)
      : assert.ok(Math.abs(actual[index] - wanted) <= 1e-9, `${name}[${index}]`));
    assert.equal(featuresV1(text).length, 8);
  }
});

function primitiveFor(text) {
  const result = structuredClone(JSON.parse(readFileSync(new URL('../../../fixtures/contracts/valid/checker-result.json', import.meta.url), 'utf8')).data);
  const hash = `sha256:${createHash('sha256').update(text).digest('hex')}`;
  result.result_id = 'primitive_fixture';
  result.profile = 'primitive';
  result.contains_content = false;
  result.source = { ...result.source, content_hash: hash, normalised_hash: hash, word_count: text.match(/\S+/gu)?.length ?? 0, character_count: text.length, section_count: 0 };
  result.route = { kind: 'deterministic_only', location: 'Browser Worker', content_transfer: 'none', privacy_route: 'browser', retention: { source: 'none', result: 'none', statement: 'Not retained.' }, consent: 'not_required', model: null, transport: { endpoint_class: 'none', region: null, requests: 0, words_sent: 0, processed: 'in browser', retained: 'not retained' } };
  result.axes.ai_pattern = { assessment_status: 'not_assessed', method_status: 'not_run', source: null, raw_score: null, raw_margin: null, display_score: null, score_scale: 'zero_to_one_pattern_similarity', level: null, primary_display_threshold: null, secondary_display_threshold: null, flagged: null, flag_reason: null, strongest_section_index: null, reason: 'No model ran.', limitations: ['No trained model ran.'] };
  result.sections = [];
  result.methods = result.methods.filter((method) => method.id !== 'detector.cycle5');
  result.exports = { receipt: { available: true, contains_content: false, canonicalisation: 'none', payload_hash: null }, share: { available: false, contains_content: false, payload: null }, report: { available: false, format: 'none', contains_content: false, explicit_user_action: true, complete_evidence: false, product_identity: 'Opace AI Content Integrity', support_destination: 'https://opace.agency/tools/ai/content-verification-integrity/' } };
  result.abuse_controls = { max_words: null, max_characters: 50000, max_request_bytes: null, explicit_capture: 'enforced', consent_before_transfer: 'not_applicable', refuse_not_truncate: 'enforced', cancellation: 'enforced', channel_authentication: 'not_applicable', proof_of_work: 'not_applicable', origin_validation: 'not_applicable', per_ip_limit: 'not_applicable', per_site_limit: 'not_applicable', per_connection_limit: 'not_applicable', global_inference_limit: 'not_applicable', request_body_logging: 'not_applicable', unexpected_network_requests: 'blocked', fallback: 'not_configured', kill_switch: 'not_applicable' };
  return result;
}

test('canonical composition preserves three axes, raw margins, sections and complete explicit HTML report', () => {
  const text = 'First complete section. Second sentence with enough evidence.';
  const primitive = primitiveFor(text);
  const score = { status: 'scored', provider: 'onnxruntime-web-wasm', modelVersion: 'tier3-cycle5-v1', rawScore: 0.9685, rawMargin: 3.6, flagged: true, flagReason: 'primary', sections: [{ index: 0, startUtf16: 0, endUtf16: text.length, wordCount: 8, tokenCount: 58, rawScore: 0.9685, rawMargin: 3.6, bandId: 'very_likely_ai', passage: text }] };
  const result = composeCycle5BrowserCheckerResult(primitive, score, text, { surface: 'Chrome extension', resultId: 'browser_fixture', generatedAt: '2026-09-02T12:00:00.000Z', reportFormat: 'html', maxCharacters: 50000 });
  assert.equal(result.profile, 'full_checker');
  assert.equal(result.route.kind, 'browser_model');
  assert.equal(result.route.model.artefact_hash, 'sha256:9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b');
  assert.equal(result.axes.ai_pattern.raw_margin, 3.6);
  assert.equal(result.axes.text_integrity.reading, primitive.axes.text_integrity.reading);
  assert.equal(result.axes.editorial.reading, primitive.axes.editorial.reading);
  assert.equal(result.sections[0].index, 0);
  assert.equal(result.sections[0].passage, text);
  assert.equal(result.exports.share.contains_content, false);
  assert.equal(result.limitations.some((item) => item.includes('No trained model ran')), false);
  assert.equal(result.limitations.some((item) => item.includes('reduced deterministic result')), false);
  const html = renderCompleteCheckerHtml(result);
  assert.match(html, /Three independent readings/u);
  assert.match(html, /Why it reads this way/u);
  assert.match(html, /Five-band model reading/u);
  assert.match(html, /Strongly AI/u);
  assert.match(html, /The strongest passage shaped the result/u);
  assert.match(html, /Model-scored section map/u);
  assert.match(html, /@page\{size:A4/u);
  assert.match(html, /Page <span class="page"/u);
  assert.match(html, /Use flags as review evidence/u);
  assert.match(html, /Protected facts/u);
  assert.match(html, /C2PA files/u);
  assert.match(html, /Complete machine record/u);
  assert.match(html, /First complete section/u);
  assert.doesNotMatch(html, /<script|<link|<img/u);
});

test('Chrome server response reconstructs margin precision and separates a 0.97 display collision', () => {
  const first = 'word '.repeat(59) + 'word';
  const second = 'term '.repeat(59) + 'term';
  const text = `${first}\n\n${second}`;
  const response = {
    channel: 'chrome-extension-v1', model: 'tier3-cycle5-v1', model_build: '45e00978b10d1df6', precision: 'fp32',
    segmentation_contract: 'segments-v3', input_normalisation: 'raw-v1', features_contract: 'features-v1', scoring: 'margin-v1', aggregation: 'max',
    threshold: null, threshold_margin: 3.570935, secondary_gap: 0.34, processed: 'server', retained: 'nothing', truncated: false,
    word_count: 120, words_sent: 120, segment_count: 2, strongest_segment: 1, probability_ai: 0.9685, margin: 3.589855,
    second_segment: 0, second_probability_ai: 0.9655, second_margin: 3.491275, flagged: true, flag_reason: 'primary',
    segments: [
      { index: 0, word_start: 0, word_end: 60, words: 60, char_start: 0, char_end: first.length, probability_ai: 0.9655, margin: 3.491275, flagged: false, tokens_scored: 62, truncated: false },
      { index: 1, word_start: 60, word_end: 120, words: 60, char_start: first.length + 2, char_end: text.length, probability_ai: 0.9685, margin: 3.589855, flagged: true, tokens_scored: 62, truncated: false },
    ],
  };
  const score = parseCycle5ChromeServerResponse(response, text);
  assert.equal(score.sections[0].bandId, 'uncertain');
  assert.equal(score.sections[1].bandId, 'very_likely_ai');
  assert.equal(score.sections[0].rawScore.toFixed(2), '0.97');
  assert.equal(score.sections[1].rawScore.toFixed(2), '0.97');
  assert.notEqual(score.sections[0].rawScore, response.segments[0].probability_ai);
  assert.equal(score.rawMargin, 3.589855);
  assert.equal(score.flagged, true);
  const composed = composeCycle5ServerCheckerResult(primitiveFor(text), score, text, { surface: 'Chrome extension', resultId: 'chrome_server_fixture', generatedAt: '2026-09-02T12:00:00.000Z', reportFormat: 'html', maxCharacters: 50_000, maxWords: 8_000 });
  assert.equal(composed.route.kind, 'eu_server');
  assert.equal(composed.route.model.precision, 'fp32');
  assert.equal(composed.route.model.artefact_hash, 'sha256:45e00978b10d1df6b24db3770a228701f6c5d63e99d96aa1c0458e5932566057');
  assert.equal(composed.axes.ai_pattern.raw_margin, 3.589855);
  assert.equal(composed.sections[0].display_score, '0.966');
  assert.equal(composed.sections[1].display_score, '0.969');
  assert.equal(composed.abuse_controls.channel_authentication, 'chrome_extension_challenge_token');
  assert.equal(composed.abuse_controls.proof_of_work, 'enforced');
  const drifted = structuredClone(response);
  drifted.segments[1].probability_ai = 0.97;
  assert.throws(() => parseCycle5ChromeServerResponse(drifted, text), /probability_mismatch/u);
});

test('Chrome server verdict is re-derived at the exact raw-margin boundary', () => {
  const text = 'word '.repeat(59) + 'word';
  const boundaryProbability = 0.9679;
  const response = {
    channel: 'chrome-extension-v1', model: 'tier3-cycle5-v1', model_build: '45e00978b10d1df6', precision: 'fp32',
    segmentation_contract: 'segments-v3', input_normalisation: 'raw-v1', features_contract: 'features-v1', scoring: 'margin-v1', aggregation: 'max',
    threshold: null, threshold_margin: 3.570935, secondary_gap: 0.34, processed: 'server', retained: 'nothing', truncated: false,
    word_count: 60, words_sent: 60, segment_count: 1, strongest_segment: 0, probability_ai: boundaryProbability, margin: 3.570935,
    second_segment: null, second_probability_ai: null, second_margin: null, flagged: true, flag_reason: 'primary',
    segments: [{ index: 0, word_start: 0, word_end: 60, words: 60, char_start: 0, char_end: text.length, probability_ai: boundaryProbability, margin: 3.570935, flagged: true, tokens_scored: 62, truncated: false }],
  };
  const score = parseCycle5ChromeServerResponse(response, text);
  assert.equal(score.flagged, true);
  const contradiction = structuredClone(response);
  contradiction.flagged = false;
  contradiction.flag_reason = null;
  assert.throws(() => parseCycle5ChromeServerResponse(contradiction, text), /flagged_mismatch/u);
});
