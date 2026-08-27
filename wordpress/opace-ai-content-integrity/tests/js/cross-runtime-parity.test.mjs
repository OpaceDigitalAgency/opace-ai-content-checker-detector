import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { inspect } from '../../assets/js/core.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const exporter = path.resolve(directory, '../php/parity-export.php');
const samples = [
	{ name: 'astral and invisible', content: 'A😀B\u200B C', content_type: 'plain_text' },
	{ name: 'mixed-script homoglyph', content: 'Opаce', content_type: 'plain_text' },
	{ name: 'HTML projection and protected values', content: '<p>Hello 😀 world</p><p>In conclusion, £120 on 26 August 2026.</p>', content_type: 'html' },
	{ name: 'Markdown projection and URL', content: '# Title\n\nIn conclusion, [Opace](https://opace.agency) charged £120.', content_type: 'markdown' },
];

function comparable(result) {
	return {
		source: result.source,
		protected_spans: result.protected_spans,
		pattern_findings: result.pattern_findings,
		methods: result.methods.map(({ started_at, completed_at, privacy_route, ...method }) => method),
	};
}

for (const sample of samples) {
	test(`browser and PHP semantic parity: ${sample.name}`, async () => {
		const request = {
			schema_version: '1.0', contract_version: '1.0.0', request_id: 'request_parity_001', created_at: '2026-08-26T10:00:00Z',
			source: { content: sample.content, content_type: sample.content_type, language: 'en-GB' },
			checks: ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'],
			privacy: { allowed_routes: ['browser'], save_receipt: false, retain_content: false },
		};
		const browser = await inspect(request, { now: () => '2026-08-26T10:00:00Z', analysisId: () => 'analysis_parity_001' });
		const php = JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [exporter], { input: JSON.stringify(request), encoding: 'utf8' }));
		assert.deepEqual(comparable(php), comparable(browser));
	});
}
