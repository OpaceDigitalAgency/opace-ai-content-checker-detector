import assert from 'node:assert/strict';
import test from 'node:test';
import { findingsForMethod, renderEvidence, unicodeFindingsForResult } from '../../assets/js/lab-evidence.mjs';

class FakeNode {
	constructor(tag, text = '') {
		this.tag = tag;
		this.textContent = text;
		this.children = [];
		this.attributes = new Map();
		this.className = '';
		this.id = '';
	}
	append(...children) { this.children.push(...children); }
	replaceChildren(...children) { this.children = [...children]; }
	setAttribute(name, value) { this.attributes.set(name, String(value)); }
	getAttribute(name) { return this.attributes.get(name) ?? null; }
}

const document = {
	createElement: (tag) => new FakeNode(tag),
	createTextNode: (text) => new FakeNode('#text', text),
};

const unicode = [
	{ type: 'unicode_finding', id: 'unicode_4_200b', code_point: 'U+200B', name: 'ZERO WIDTH SPACE', severity: 'medium', message: 'An invisible zero-width space is present.', suggestion: 'Preview the deterministic change before approval.', span: { start_utf16: 4, end_utf16: 5 } },
	{ type: 'unicode_finding', id: 'unicode_8_homoglyph_430', code_point: 'U+0430', name: 'CYRILLIC SMALL LETTER A', severity: 'medium', message: 'A mixed-script token contains a lookalike letter.', suggestion: 'Verify the intended spelling.', span: { start_utf16: 8, end_utf16: 9 } },
];
const patterns = [
	{ type: 'pattern_finding', rule_id: 'signals.tier1', severity: 'high', message: 'A generic stock word appears.', suggestion: 'Use a more specific word.', span: { start_utf16: 12, end_utf16: 20 }, evidence: { matched: 'seamless' } },
	{ type: 'pattern_finding', rule_id: 'signals.normalization_flag', severity: 'high', message: 'The text held an invisible character.', suggestion: 'Remove the hidden character and check again.', span: { start_utf16: 21, end_utf16: 22 }, evidence: { matched: '\u200B' } },
];
const result = {
	summary: { pass: 0, attention: 3, unsupported: 1 },
	unicode_findings: unicode,
	pattern_findings: patterns,
	methods: [
		{ id: 'unicode.invisible', category: 'unicode', provider_or_method: 'Opace Unicode inspection', status: 'attention', evidence: unicode, limitations: ['Context matters.'] },
		{ id: 'unicode.homoglyph', category: 'unicode', provider_or_method: 'Opace Unicode inspection', status: 'attention', evidence: unicode, limitations: ['Context matters.'] },
		{ id: 'style.patterns', category: 'pattern', provider_or_method: 'Opace writing-signal rules', status: 'attention', evidence: [], limitations: ['Not authorship evidence.'] },
		{ id: 'watermark.anthropic', category: 'watermark', provider_or_method: 'Anthropic official verifier', status: 'unsupported', evidence: [], limitations: ['No official detector call is available.'] },
	],
};

const allText = (node) => [node.textContent, ...node.children.flatMap(allText)].join(' ');

test('Unicode evidence is de-duplicated and kept under the matching method', () => {
	assert.equal(unicodeFindingsForResult(result).length, 2);
	assert.deepEqual(findingsForMethod(result, result.methods[0]).map((finding) => finding.id), ['unicode_4_200b']);
	assert.deepEqual(findingsForMethod(result, result.methods[1]).map((finding) => finding.id), ['unicode_8_homoglyph_430']);
});

test('the Lab renders each finding with its message and next action under an honest no-model summary', () => {
	const target = new FakeNode('div');
	renderEvidence(target, result, document);
	const text = allText(target);
	assert.match(text, /No AI-written text score was produced/);
	assert.match(text, /U\+200B · ZERO WIDTH SPACE/);
	assert.match(text, /An invisible zero-width space is present/);
	assert.match(text, /Preview the deterministic change before approval/);
	assert.match(text, /“seamless”/);
	assert.match(text, /A generic stock word appears/);
	assert.match(text, /Use a more specific word/);
	assert.match(text, /Hidden or lookalike character/);
	assert.doesNotMatch(text, /“\u200B”/);
	assert.match(text, /This check did not produce evidence\. It has not been counted as a pass/);
	assert.equal((text.match(/U\+200B · ZERO WIDTH SPACE/g) || []).length, 1);
});
