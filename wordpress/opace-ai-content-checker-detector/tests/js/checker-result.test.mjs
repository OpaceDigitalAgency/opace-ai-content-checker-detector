import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CHECKER_HONESTY_LINE, CHECKER_LEVELS, assertCheckerResultInvariants } from '../../assets/js/core.mjs';
import { SURFACE_NAME, createCheckerPdf, encodeCheckerPdfText } from '../../assets/js/checker-report.mjs';
import { SURFACE_NAME as RESULT_SURFACE, buildSectionAdvice } from '../../assets/js/checker-result.mjs';
import { renderCheckerResult as renderShared } from '../../assets/vendor/shared/presentation/checker-result-presentation.mjs';

const fixtureUrl = new URL('../fixtures/contracts/valid/checker-result.json', import.meta.url);
const contradictionsUrl = new URL('../fixtures/checker-result/contradictions.json', import.meta.url);
const semantics = Object.freeze({ levels: CHECKER_LEVELS, honestyLine: CHECKER_HONESTY_LINE, assertResult: assertCheckerResultInvariants });

async function fixture() {
	return JSON.parse(await readFile(fixtureUrl, 'utf8')).data;
}

function sourceWithLocalPassages(suffix = '') {
	return `${'A'.repeat(57)} ${'B'.repeat(62)}${suffix}`;
}

test('the result is drawn by the shared renderer, with this runtime\u2019s level names', async () => {
	const result = await fixture();
	const html = renderShared(result, { surface: RESULT_SURFACE, levels: CHECKER_LEVELS, headingLevel: 2, idPrefix: 'oaci-lab' });
	assert.match(html, /data-oaci-result/);
	assert.match(html, /WordPress Lab/);
	// Level names come from the canonical runtime, not a second copy.
	assert.match(html, new RegExp(CHECKER_LEVELS['signal-strongly-ai'].name));
	assert.match(html, /data-oaci-display-score="0\.969"/);
	assert.match(html, /data-oaci-section-toggle="0"/);
	assert.match(html, /data-oaci-section-toggle="1"/);
	assert.match(html, /What this means/);
	assert.match(html, /How certain is this reading/);
	assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/);
});

test('a level table the runtime does not know is refused rather than half-applied', async () => {
	const result = await fixture();
	assert.throws(() => renderShared(result, { surface: RESULT_SURFACE, levels: { 'signal-strongly-ai': 'Strongly AI' } }), /checker_ui_levels/);
});

test('writing-rule findings are placed in the passage that quotes them', async () => {
	const result = await fixture();
	const source = sourceWithLocalPassages();
	// Quotes are matched against the passage the reader actually sees.
	const findings = [
		{ rule_id: 'style.a', message: 'A stock phrase.', suggestion: 'Say the plain thing.', evidence: { matched: 'first complete' }, span: { start_utf16: 2, end_utf16: 7 } },
		{ rule_id: 'style.b', message: 'Another one.', suggestion: 'Cut it.', evidence: { matched: 'strongest section' }, span: { start_utf16: 60, end_utf16: 65 } },
		{ rule_id: 'style.c', message: 'Nowhere in this draft.', suggestion: 'Ignore.', evidence: { matched: 'ZZZZZ' }, span: { start_utf16: 0, end_utf16: 5 } }
	];
	const advice = buildSectionAdvice(result, findings, source, 'plain_text');
	assert.equal(advice.length, result.sections.length);
	assert.deepEqual(advice[0].map((entry) => entry.rule_id), ['style.a']);
	assert.deepEqual(advice[1].map((entry) => entry.rule_id), ['style.b']);
	assert.equal(advice[0][0].quote, 'first complete');
	assert.equal(advice[0][0].suggestion, 'Say the plain thing.');
});

test('offsets place a finding only for plain text, where the checked characters are the draft', async () => {
	const result = await fixture();
	const source = sourceWithLocalPassages();
	const findings = [{ rule_id: 'style.d', message: 'Structural, no quote.', suggestion: 'Vary it.', evidence: {}, span: { start_utf16: 3, end_utf16: 9 } }];
	assert.equal(buildSectionAdvice(result, findings, source, 'plain_text')[0].length, 1);
	// Markdown and HTML are checked on a projection, so an offset cannot be trusted.
	assert.equal(buildSectionAdvice(result, findings, source, 'markdown')[0].length, 0);
	assert.equal(buildSectionAdvice(result, findings, source, 'html')[0].length, 0);
});

test('the advice the shared renderer draws comes from those findings', async () => {
	const result = await fixture();
	const source = sourceWithLocalPassages();
	const advice = buildSectionAdvice(result, [
		{ rule_id: 'style.a', message: 'A stock phrase.', suggestion: 'Say the plain thing.', evidence: { matched: 'first complete' }, span: { start_utf16: 2, end_utf16: 7 } }
	], source, 'plain_text');
	const html = renderShared(result, { surface: RESULT_SURFACE, levels: CHECKER_LEVELS, advice });
	assert.match(html, /How to improve this passage/);
	assert.match(html, /Say the plain thing\./);
	assert.match(html, /never counts towards the AI reading/);
	assert.match(html, /data-oaci-rule="style\.a"/);
});

test('score, level and flag contradictions fail through the synced core runtime', async () => {
	const original = await fixture();
	const contradictions = JSON.parse(await readFile(contradictionsUrl, 'utf8'));
	for (const contradiction of contradictions.filter((item) => !['section offsets overlap', 'share score contradicts the run result'].includes(item.name))) {
		const result = structuredClone(original);
		let target = result;
		for (const part of contradiction.path.slice(0, -1)) target = target[part];
		target[contradiction.path.at(-1)] = contradiction.value;
		assert.throws(() => assertCheckerResultInvariants(result), undefined, contradiction.name);
	}
});

test('a result the canonical runtime rejects is never drawn', async () => {
	const result = await fixture();
	// The plugin validates through its own runtime before it draws anything, and
	// the shared renderer validates the contract again on the way in.
	result.axes.ai_pattern.level = 'signal-invented';
	assert.throws(() => assertCheckerResultInvariants(result));
	assert.throws(() => renderShared(result, { surface: RESULT_SURFACE, levels: CHECKER_LEVELS }));
});

test('the report adapter hands the shared writer this surface, this runtime\u2019s level names and the local draft', async () => {
	const result = await fixture();
	const source = sourceWithLocalPassages();
	const pdf = Buffer.from(createCheckerPdf(result, source, semantics)).toString('latin1');
	assert.match(pdf, /^%PDF-1\.4/);
	assert.match(pdf, new RegExp(SURFACE_NAME));
	// Display strings come from the contract and are never recalculated.
	assert.match(pdf, /0\.966/);
	assert.match(pdf, /0\.969/);
	assert.match(pdf, /Likely AI/);
	assert.match(pdf, /Strongly AI/);
	assert.match(pdf, /tier3-cycle5-v1/);
	assert.match(pdf, /content-verification-integrity/);
	assert.doesNotMatch(pdf, /undefined|NaN|\[object Object\]/);
	// The exact scored characters, sliced from the local draft.
	assert.match(pdf, new RegExp('A'.repeat(40)));
	assert.match(pdf, new RegExp('B'.repeat(40)));
	// Screen-only controls never reach the document.
	assert.doesNotMatch(pdf, /Choose text file|Show in draft|Check my draft/);
});

test('the same result and draft always produce the same bytes', async () => {
	const result = await fixture();
	const source = sourceWithLocalPassages();
	const first = Buffer.from(createCheckerPdf(result, source, semantics));
	const second = Buffer.from(createCheckerPdf(result, source, semantics));
	assert.deepEqual(first, second);
});

test('the report adapter refuses a result the canonical runtime rejects', async () => {
	const result = await fixture();
	result.axes.ai_pattern.display_score = '0.9';
	assert.throws(() => createCheckerPdf(result, sourceWithLocalPassages(), semantics));
});

test('complete PDF paginates a long Unicode draft and records unsupported glyphs as explicit code points', async () => {
	const result = await fixture();
	const source = sourceWithLocalPassages(` ${'Café naïve — résumé 🙂 你好 long report content. '.repeat(500)}END-OF-DRAFT`);
	const bytes = createCheckerPdf(result, source, semantics);
	const binary = Buffer.from(bytes).toString('latin1');
	assert.match(binary, /^%PDF-1\.4/);
	assert.ok((binary.match(/\/Type \/Page\b/g) || []).length > 6);
	assert.match(binary, /END-OF-DRAFT/);
	assert.match(binary, /\[U\+01F642\]/);
	assert.match(binary, /\[U\+4F60\]\[U\+597D\]/);
	assert.match(binary, /MediaBox \[0 0 595\.28 841\.89\]/);
	assert.equal(encodeCheckerPdfText('Café naïve — résumé'), `Caf${String.fromCharCode(0xe9)} na${String.fromCharCode(0xef)}ve ${String.fromCharCode(0x97)} r${String.fromCharCode(0xe9)}sum${String.fromCharCode(0xe9)}`);
	assert.equal(encodeCheckerPdfText('🙂你好'), '[U+01F642][U+4F60][U+597D]');
});
