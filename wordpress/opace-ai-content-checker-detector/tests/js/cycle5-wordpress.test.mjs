import assert from 'node:assert/strict';
import test from 'node:test';

import { inspect } from '../../assets/js/core.mjs';
import {
	WORDPRESS_MODEL_MAX_CHARACTERS,
	WORDPRESS_MODEL_BASE,
	buildContentFreeCheckerRecord,
	buildWordPressPrimitiveResult,
	composeWordPressServerResult,
	createWordPressCycle5Runtime,
	validateWordPressServerScore
} from '../../assets/js/cycle5-wordpress.mjs';

const source = Array.from({ length: 60 }, (_, index) => `word${index}`).join(' ');
const probability = (margin) => Number((1 / (1 + Math.exp(-margin / 1.0479))).toFixed(4));

function scorePayload(text, margin = 4) {
	return {
		model: 'tier3-cycle5-full', model_build: '45e00978b10d1df6', precision: 'fp32', segmentation_contract: 'segments-v3', input_normalisation: 'raw-v1', features_contract: 'features-v1', scoring: 'margin-v1', aggregation: 'max',
		probability_ai: probability(margin), margin, flagged: margin >= 3.570935, flag_reason: margin >= 3.570935 ? 'primary' : null,
		threshold: null, secondary_threshold: null, threshold_margin: 3.570935, secondary_gap: 0.34, word_count: 60, words_sent: 60, segment_count: 1, strongest_segment: 0,
		segments: [{ index: 0, word_start: 0, word_end: 60, words: 60, char_start: 0, char_end: [...text].length, probability_ai: probability(margin), margin, flagged: margin >= 3.570935, tokens_scored: 62, truncated: false }],
		tokens_scored: 62, truncated: false, inference_ms: 4, inferences: 1, processed: 'server', retained: 'nothing', channel: 'wordpress-v1', daily_allowance_remaining: 20
	};
}

async function primitive(text = source) {
	const result = await inspect({
		schema_version: '1.0', contract_version: '1.0.0', request_id: 'req_0000000000000001', created_at: '2026-09-02T10:00:00.000Z',
		source: { content: text, content_type: 'plain_text', language: 'en-GB' },
		checks: ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'],
		privacy: { allowed_routes: ['browser', 'wordpress_local'], save_receipt: false, retain_content: false },
		context: { caller: 'standalone', caller_object_id: 'paste:test' }
	});
	return buildWordPressPrimitiveResult(result, text, { expectedHash: result.source.content_hash, generatedAt: '2026-09-02T10:00:00.000Z', resultId: 'result_0000000000000001' });
}

test('WordPress wrapper pins the shared runtime to 100,000 characters and the exact model directory', () => {
	const runtime = createWordPressCycle5Runtime({ modelBaseUrl: WORDPRESS_MODEL_BASE, wasmUrl: 'https://wordpress.example/ort.wasm', fetch: async () => { throw new Error('no fetch expected'); } });
	assert.equal(runtime.maxCharacters, WORDPRESS_MODEL_MAX_CHARACTERS);
	assert.equal(runtime.state().state, 'not_ready');
	assert.throws(() => createWordPressCycle5Runtime({ modelBaseUrl: 'https://attacker.example/models/' }), /pinned Opace directory/);
});

test('server score derives exact bands from six-decimal margins even when four-decimal probabilities collide', () => {
	const below = validateWordPressServerScore(scorePayload(source, 3.5709), source);
	const at = validateWordPressServerScore(scorePayload(source, 3.570935), source);
	assert.equal(scorePayload(source, 3.5709).probability_ai, scorePayload(source, 3.570935).probability_ai);
	assert.equal(below.sections[0].bandId, 'uncertain');
	assert.equal(at.sections[0].bandId, 'very_likely_ai');
	assert.notEqual(below.rawScore, at.rawScore);
});

test('server score rejects rounded probability, margin and section-bound contradictions', () => {
	const probabilityContradiction = scorePayload(source);
	probabilityContradiction.probability_ai = 0.5;
	probabilityContradiction.segments[0].probability_ai = 0.5;
	assert.throws(() => validateWordPressServerScore(probabilityContradiction, source), /contradicts its model margin/);
	const boundContradiction = scorePayload(source);
	boundContradiction.segments[0].char_end += 1;
	assert.throws(() => validateWordPressServerScore(boundContradiction, source), /bounds/);
});

test('server composition joins the raw model primitive to the same local deterministic result', async () => {
	const result = composeWordPressServerResult(await primitive(), scorePayload(source), source, { generatedAt: '2026-09-02T10:00:00.000Z', resultId: 'result_0000000000000002' });
	assert.equal(result.profile, 'full_checker');
	assert.equal(result.route.kind, 'eu_server');
	assert.equal(result.abuse_controls.max_request_bytes, 700000);
	assert.equal(result.sections[0].passage, source);
	assert.equal(result.sections[0].start_utf16, 0);
	assert.equal(result.sections[0].end_utf16, source.length);
	const record = buildContentFreeCheckerRecord(result);
	assert.equal(record.contains_content, false);
	assert.equal(JSON.stringify(record).includes(source), false);
	assert.equal(JSON.stringify(record).includes('passage'), false);
	assert.deepEqual(record.sections[0].locator, {
		content_hash: record.source.content_hash,
		start_utf16: 0,
		end_utf16: source.length
	});
});

test('UTF-16 slicing stays local when server offsets count Unicode code points', () => {
	const unicodeSource = `${source.slice(0, 10)}🙂${source.slice(10)}`;
	const payload = scorePayload(unicodeSource);
	const validated = validateWordPressServerScore(payload, unicodeSource);
	assert.equal(validated.sections[0].endUtf16, unicodeSource.length);
	assert.equal(validated.sections[0].passage, unicodeSource);
});
