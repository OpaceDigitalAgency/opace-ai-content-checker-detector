import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCheckerShareSummary, copyCheckerShareSummary } from '../../assets/js/checker-share.mjs';

const sourceMarker = 'PRIVATE-DRAFT-SENTENCE';
const result = {
	exports: {
		share: {
			payload: {
				contains_content: false,
				level: 'signal-likely-ai',
				display_score: '0.958',
				honesty_line: 'No AI checker can prove who wrote a text.',
				result_id: 'result_123',
				date: '2026-09-02'
			}
		}
	},
	sections: [{ passage: sourceMarker }]
};
const levels = { 'signal-likely-ai': { name: 'Likely AI' } };

test('share summary consumes only the canonical content-free share payload and creates no result URL', async () => {
	let copied = '';
	const summary = await copyCheckerShareSummary(result, levels, { clipboard: { writeText: async (value) => { copied = value; } } });
	assert.equal(summary, copied);
	assert.match(summary, /Likely AI \(0\.958\)/);
	assert.doesNotMatch(summary, new RegExp(sourceMarker));
	assert.doesNotMatch(summary, /https?:\/\//);
});

test('share summary fails closed unless the payload declares itself content-free', () => {
	const unsafe = structuredClone(result);
	unsafe.exports.share.payload.contains_content = true;
	assert.throws(() => buildCheckerShareSummary(unsafe, levels), /content-free share result/);
});
