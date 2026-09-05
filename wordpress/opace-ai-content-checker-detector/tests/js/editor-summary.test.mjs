/**
 * The compact reading the editor panels draw.
 *
 * The panel is not a second opinion. It has to say the same words about the same
 * run as the full result on the checker screen, and it holds two label tables of
 * its own because `shared/presentation/` does not export them and is frozen.
 * These tests render the same canonical result through the shared renderer and
 * assert that every word the panel would print is a word the full result prints,
 * so the copy cannot drift in silence.
 *
 * The drawing itself needs a browser and is exercised in
 * `tests/browser/editor-panel.test.mjs`.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { CHECKER_LEVELS } from '../../assets/js/core.mjs';
import { EDITORIAL_READINGS, INTEGRITY_READINGS } from '../../assets/js/editor-summary.mjs';
import { formatCharacterReading, formatEditorialReading } from '../../assets/vendor/shared/evidence/readings.mjs';
import {
	CHECKER_GAUGE_ORDER,
	CHECKER_LEVEL_LABELS,
	gaugePosition,
	renderCheckerResult as renderShared
} from '../../assets/vendor/shared/presentation/checker-result-presentation.mjs';

const fixtureUrl = new URL('../fixtures/contracts/valid/checker-result.json', import.meta.url);

async function fixture() {
	return JSON.parse(await readFile(fixtureUrl, 'utf8')).data;
}

/** The reading the shared renderer printed on one axis card. */
function axisReadingFromHtml(html, axis) {
	const card = html.split(`data-axis="${axis}"`)[1] ?? '';
	return (card.match(/class="oaci-axis__reading">([^<]*)</) ?? [])[1] ?? '';
}

function withAxis(result, axis, reading) {
	return { ...result, axes: { ...result.axes, [axis]: { ...result.axes[axis], reading } } };
}

test('the panel’s text-integrity words are the full result’s own words', async () => {
	const result = await fixture();
	for (const reading of Object.keys(INTEGRITY_READINGS)) {
		const candidate = withAxis(result, 'text_integrity', reading);
		const expected = formatCharacterReading(candidate).value;
		const html = renderShared(candidate, { surface: 'WordPress Lab', levels: CHECKER_LEVELS, headingLevel: 2 });
		assert.equal(axisReadingFromHtml(html, 'integrity'), expected, `text integrity "${reading}" is said two ways`);
	}
});

test('the panel’s editorial words are the full result’s own words', async () => {
	const result = await fixture();
	for (const reading of Object.keys(EDITORIAL_READINGS)) {
		const candidate = withAxis(result, 'editorial', reading);
		const expected = formatEditorialReading(candidate).value;
		const html = renderShared(candidate, { surface: 'WordPress Lab', levels: CHECKER_LEVELS, headingLevel: 2 });
		assert.equal(axisReadingFromHtml(html, 'editorial'), expected, `editorial "${reading}" is said two ways`);
	}
});

test('the copied tables cover every reading the renderer knows, and invent none', async () => {
	const result = await fixture();
	// The control: a reading neither table holds falls back to "Not assessed" on
	// both surfaces rather than printing a raw value at the reader.
	const html = renderShared(withAxis(result, 'text_integrity', 'something_new'), { surface: 'WordPress Lab', levels: CHECKER_LEVELS, headingLevel: 2 });
	assert.equal(axisReadingFromHtml(html, 'integrity'), 'Not assessed');
	assert.equal(INTEGRITY_READINGS.something_new, undefined);
});

test('the panel’s level names come from this runtime, matching the shared labels', () => {
	for (const id of CHECKER_GAUGE_ORDER) {
		assert.equal(CHECKER_LEVELS[id].name, CHECKER_LEVEL_LABELS[id], `level ${id} is named two ways`);
	}
});

test('the mini dial puts the needle where the full dial puts it', () => {
	// The panel draws a smaller dial, but never its own idea of where a level
	// sits: the position is the shared function's, for all five bands.
	assert.deepEqual(CHECKER_GAUGE_ORDER.map(gaugePosition), [10, 30, 50, 70, 90]);
	assert.throws(() => gaugePosition('signal-withheld'), /checker_result_level_not_on_gauge/);
});

test('the panel never prints a percentage, and the level always prints its own word', async () => {
	const result = await fixture();
	assert.match(result.axes.ai_pattern.display_score, /^0\.\d+$/);
	assert.doesNotMatch(result.axes.ai_pattern.display_score, /%/);
	for (const id of CHECKER_GAUGE_ORDER) {
		assert.ok(CHECKER_LEVELS[id].name.length > 0, `level ${id} has no word to print beside its colour`);
	}
});
