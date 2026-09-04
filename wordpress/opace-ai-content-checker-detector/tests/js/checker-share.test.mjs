import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { buildShareSummary, openCheckerShareSheet, shareLevelNames } from '../../assets/js/checker-share.mjs';
import { renderShareSheet, shareResultUrl, shareSummaryText } from '../../assets/vendor/shared/presentation/checker-result-presentation.mjs';

const fixtureUrl = new URL('../fixtures/contracts/valid/checker-result.json', import.meta.url);
const levels = {
	'signal-strongly-ai': { name: 'Strongly AI' },
	'signal-likely-ai': { name: 'Likely AI' },
	'signal-potentially-ai': { name: 'Potentially AI' },
	'signal-unclear': { name: 'Unclear' },
	'signal-likely-human': { name: 'Likely human' }
};

async function fixture() {
	return JSON.parse(await readFile(fixtureUrl, 'utf8')).data;
}

test('the summary carries the reading and the section scores, and none of the draft', async () => {
	const result = await fixture();
	const summary = buildShareSummary(result);
	assert.equal(summary.levelId, 'signal-strongly-ai');
	assert.equal(summary.display, '0.969');
	assert.equal(summary.sections.length, result.sections.length);
	const serialised = JSON.stringify(summary);
	for (const section of result.sections) {
		assert.ok(!serialised.includes(section.passage), 'no passage is in the summary');
	}
});

test('the result link is the website’s own, and the summary rides in the fragment', async () => {
	const result = await fixture();
	const url = shareResultUrl(buildShareSummary(result));
	assert.match(url, /^https:\/\/opace\.agency\/tools\/ai\/content-verification-integrity\/checker\/#shared=/);
	// A fragment is never sent to a server; a query string would be.
	assert.equal(url.split('#')[0].includes('?'), false);
	for (const section of result.sections) {
		const words = section.passage.slice(0, 24);
		assert.ok(!url.includes(words) && !url.includes(encodeURIComponent(words)));
	}
});

test('the sheet offers the website’s destinations and says what travels', async () => {
	const result = await fixture();
	const html = renderShareSheet(buildShareSummary(result), { nativeShare: false, levels: shareLevelNames(levels) });
	for (const destination of ['copy', 'email', 'linkedin', 'facebook', 'x', 'whatsapp']) {
		assert.match(html, new RegExp(`data-oaci-share-(?:to="${destination}"|${destination})`), `the sheet offers ${destination}`);
	}
	assert.match(html, /role="dialog"/);
	assert.match(html, /aria-modal="true"/);
	assert.match(html, /Your checked text is never included/);
	// A control that would do nothing is not drawn.
	assert.doesNotMatch(html, /data-oaci-share-device/);
	assert.match(renderShareSheet(buildShareSummary(result), { nativeShare: true, levels: shareLevelNames(levels) }), /data-oaci-share-device/);
	for (const section of result.sections) {
		assert.ok(!html.includes(section.passage), 'no passage is printed in the sheet');
	}
});

test('the shared summary text names the level and never calls the score a percentage', async () => {
	const result = await fixture();
	// This runtime holds levels as { name, support }; the share functions want a
	// flat table. Handing the records over unflattened printed "[object Object]"
	// in the mail body, which is what shareLevelNames exists to stop.
	assert.deepEqual(shareLevelNames(levels)['signal-strongly-ai'], 'Strongly AI');
	const text = shareSummaryText(buildShareSummary(result), { levels: shareLevelNames(levels) });
	assert.match(text, /Strongly AI/);
	assert.doesNotMatch(text, /%/);
	assert.doesNotMatch(text, /\[object Object\]/);
});

for (const [name, mutate] of [
	['withheld', (result) => { result.axes.ai_pattern.assessment_status = 'withheld'; }],
	['errored', (result) => { result.axes.ai_pattern.assessment_status = 'error'; }],
	['not assessed', (result) => { result.axes.ai_pattern.assessment_status = 'not_assessed'; }]
]) {
	test(`a ${name} run is never shareable, whatever its export block still carries`, async () => {
		const result = await fixture();
		mutate(result);
		assert.equal(buildShareSummary(result), null);
		// And with no summary there is no sheet: the caller is handed null rather
		// than an empty dialog.
		assert.equal(openCheckerShareSheet(result, { levels, document: null }), null);
	});
}

test('the control: the unchanged fixture does produce a summary', async () => {
	assert.notEqual(buildShareSummary(await fixture()), null);
});
