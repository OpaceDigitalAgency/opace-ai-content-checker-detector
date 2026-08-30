// Cross-runtime SUBSET contract — what this file asserts, and why it changed.
//
// THIS TEST'S PURPOSE CHANGED ON 30 AUGUST 2026. It used to assert that the
// PHP in `includes/Analysis/` and the compiled engine in `assets/js/core.mjs`
// produce IDENTICAL results. That assertion was correct when it was written
// and became false when the plugin was re-vendored onto the current engine:
// the engine gained the whole `en-signals` rule set, so the two sides now run
// 116 writing rules against 3, and 38 carrier rules against 16. Four of the
// nine tests failed, and were deliberately left failing rather than edited to
// agree — aligning the version constants would have made the labels match
// while the rule sets stayed 113 apart, which is the worse failure.
//
// Equality is not the property to assert, because it is not the property the
// plugin can have. PHP cannot execute the compiled engine, and the sidebar and
// receipt routes must answer on the server. So the honest property — the one
// asserted here — is a DECLARED SUBSET:
//
//   1. PHP reproduces the engine's `en-gb:2026.08.1` pack EXACTLY. Same rules,
//      same spans, same evidence. Measured on real documents, not just on
//      fixtures, so drift in either direction fails.
//   2. PHP never declares a shared-engine version. Its methods are namespaced
//      `wp-php-subset:`, so no receipt, sidebar or API consumer can mistake a
//      subset result for the engine's.
//   3. The declared coverage numbers are true on both sides. If someone adds a
//      rule to PHP or the engine without updating what the plugin tells users,
//      this fails.
//   4. Everything PHP emits says it is a subset and points at the Lab.
//   5. The engine is a STRICT superset on real text. This is what stops the
//      divergence being "closed" by gutting the engine instead.
//
// What has NOT changed: the contract-level fields that must still agree
// exactly — content hashes, the normalised hash, the visible-text projection,
// word counts and protected spans. Those are shared-contract behaviour, not
// rule coverage, and a mismatch there is still a bug. They are asserted below.
//
// The end state HANDOVER §11 requires — the sidebars running the compiled
// engine in the browser, PHP orchestrating rather than analysing — is a
// product change and is not made here. Until it is, this file is the guard
// that the subset stays a declared subset instead of drifting into a second,
// silently different analysis.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inspect } from '../../assets/js/core.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const exporter = path.resolve(directory, '../php/parity-export.php');
const repoRoot = path.resolve(directory, '../../../..');

/** The pack the PHP mirrors, and the namespace its methods must declare. */
const MIRRORED_PACK = 'en-gb:2026.08.1';
const SUBSET_PREFIX = 'wp-php-subset:';

/**
 * The coverage the plugin TELLS USERS it has on each side. These are the
 * numbers quoted in the PHP limitations and in readme.txt; asserting them here
 * is what keeps that copy true as either side changes.
 */
const DECLARED = {
	php: { pattern_rules: 3, carrier_code_points: 16, homoglyphs: 7 },
	engine: { pattern_rules: 116, carrier_rules: 38, homoglyphs: 60 },
};

const CHECKS = ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'];

const samples = [
	{ name: 'astral and invisible', content: 'A😀B​ C', content_type: 'plain_text' },
	{ name: 'mixed-script homoglyph', content: 'Opаce', content_type: 'plain_text' },
	{ name: 'HTML projection and protected values', content: '<p>Hello 😀 world</p><p>In conclusion, £120 on 26 August 2026.</p>', content_type: 'html' },
	{ name: 'Markdown projection and URL', content: '# Title\n\nIn conclusion, [Opace](https://opace.agency) charged £120.', content_type: 'markdown' },
];

function requestFor(content, content_type) {
	return {
		schema_version: '1.0', contract_version: '1.0.0', request_id: 'request_parity_001', created_at: '2026-08-26T10:00:00Z',
		source: { content, content_type, language: 'en-GB' },
		checks: CHECKS,
		privacy: { allowed_routes: ['browser', 'wordpress_local'], save_receipt: false, retain_content: false },
	};
}

const runPhp = (request) =>
	JSON.parse(execFileSync(process.env.PHP_BINARY || 'php', [exporter], { input: JSON.stringify(request), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));

const runEngine = (request) =>
	inspect(request, { now: () => '2026-08-26T10:00:00Z', analysisId: () => 'analysis_parity_001' });

/** The engine findings that belong to the pack the PHP mirrors. */
const mirroredSubset = (result) => result.pattern_findings.filter((f) => f.rule_version === MIRRORED_PACK);

/** Identity of a finding for comparison: which rule, and exactly where. */
const findingKey = (f) => `${f.rule_id}@${f.span.start_utf16}-${f.span.end_utf16}`;

const unicodeEvidence = (result) =>
	result.methods.filter((m) => m.category === 'unicode').flatMap((m) => m.evidence ?? []);

// ─── 1. the contract-level fields that must still agree exactly ──────

for (const sample of samples) {
	test(`shared contract fields agree exactly: ${sample.name}`, async () => {
		const request = requestFor(sample.content, sample.content_type);
		const engine = await runEngine(request);
		const php = runPhp(request);
		// Hashes, the visible-text projection, word counts and protected spans
		// are shared-contract behaviour, not rule coverage. A mismatch here
		// would mean the two routes disagree about what the TEXT is, which
		// would misplace every highlight (HANDOVER §14, "refuse rather than
		// round over").
		assert.deepEqual(php.source, engine.source, 'the two routes disagree about the source projection');
		assert.deepEqual(php.protected_spans, engine.protected_spans, 'the two routes disagree about protected spans');
	});
}

// ─── 2. PHP reproduces the mirrored pack exactly, on real documents ──

test('PHP reproduces the engine\'s en-gb:2026.08.1 pack exactly, on real documents', async () => {
	const rows = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'battery', 'human-corpus-v2.json'), 'utf8'));
	const texts = (Array.isArray(rows) ? rows : rows.samples)
		.map((r) => (typeof r === 'string' ? r : r.text ?? r.content ?? ''))
		.filter((t) => t && t.length > 200);
	assert.ok(texts.length > 1000, 'the measurement corpus is present');

	// A sample, not the whole corpus: each document costs a PHP subprocess.
	// Strided so it is spread across the corpus rather than its first pages.
	const wanted = Number(process.env.SUBSET_SAMPLE || 120);
	const stride = Math.max(1, Math.floor(texts.length / wanted));
	let compared = 0, phpFindings = 0, engineFindings = 0;
	for (let i = 0; i < texts.length && compared < wanted; i += stride) {
		const request = requestFor(texts[i].slice(0, 20000), 'plain_text');
		const engine = await runEngine(request);
		const php = runPhp(request);
		compared += 1;
		phpFindings += php.pattern_findings.length;
		engineFindings += engine.pattern_findings.length;
		assert.deepEqual(
			php.pattern_findings.map(findingKey).sort(),
			mirroredSubset(engine).map(findingKey).sort(),
			`document ${i}: PHP is no longer exactly the ${MIRRORED_PACK} pack`,
		);
	}
	assert.ok(compared >= 100, `the property must actually be exercised (compared ${compared} documents)`);
	// Anti-vacuity: a corpus on which neither side ever fires would pass the
	// equality above while proving nothing.
	assert.ok(phpFindings > 0, 'the PHP subset fired somewhere in the sample');
	// 5. The engine is a STRICT superset on real text. Without this, deleting
	// the en-signals rules would make this file pass.
	assert.ok(
		engineFindings > phpFindings * 2,
		`the engine must report substantially more than the subset (engine ${engineFindings}, PHP ${phpFindings})`,
	);
});

// ─── 3. PHP never declares a shared-engine version ───────────────────

for (const sample of samples) {
	test(`PHP declares itself a subset and never the engine's version: ${sample.name}`, async () => {
		const request = requestFor(sample.content, sample.content_type);
		const engine = await runEngine(request);
		const php = runPhp(request);
		const engineVersions = new Set(engine.methods.map((m) => m.version));

		for (const method of php.methods) {
			if (method.id === 'watermark.anthropic') continue; // fixed by contract on both sides
			assert.ok(
				method.version.startsWith(SUBSET_PREFIX),
				`${method.id}: a subset method must declare a ${SUBSET_PREFIX} version, got "${method.version}"`,
			);
			assert.ok(
				!engineVersions.has(method.version),
				`${method.id}: the subset declares "${method.version}", which the engine also declares — that is a parity claim`,
			);
			assert.match(
				method.provider_or_method, /subset/i,
				`${method.id}: the method name must say it is a subset`,
			);
			// 4. Every subset method states the gap and points at the Lab.
			const limitations = method.limitations.join(' ');
			assert.match(limitations, /SUBSET of the shared engine/, `${method.id}: must state it is a subset`);
			assert.match(limitations, /Content Integrity Lab/, `${method.id}: must point at the full engine`);
		}

		// The findings themselves keep their true pack version: a finding's
		// rule_version must stay honest even though the METHOD is namespaced.
		for (const finding of php.pattern_findings) {
			assert.equal(finding.rule_version, MIRRORED_PACK, 'a PHP finding must name the pack it came from');
		}
	});
}

// ─── 4. the declared coverage numbers are true on both sides ─────────

test('the coverage the plugin tells users about is true on both sides', async () => {
	const engineData = await import('../../../../packages/core/dist/unicode/data.js');
	assert.equal(engineData.CARRIER_RULES.length, DECLARED.engine.carrier_rules, 'engine carrier-rule count moved; update the PHP limitations and readme.txt');
	assert.equal(engineData.CONFUSABLES.length ?? engineData.CONFUSABLES.size, DECLARED.engine.homoglyphs, 'engine homoglyph count moved; update the PHP limitations and readme.txt');

	const liveness = JSON.parse(readFileSync(path.join(repoRoot, 'tests', 'battery', 'rule-liveness.json'), 'utf8'));
	assert.equal(liveness.named_rules, DECLARED.engine.pattern_rules, 'engine rule count moved; update the PHP limitations and readme.txt');

	const php = readFileSync(path.resolve(directory, '../../includes/Analysis/UnicodeAnalyser.php'), 'utf8');
	assert.equal(
		(php.match(/^\t\t'[0-9A-F]+' *=> *array\(/gm) ?? []).length, DECLARED.php.carrier_code_points,
		'PHP carrier coverage moved; update the PHP limitations and readme.txt',
	);
	const homoglyphs = readFileSync(path.resolve(directory, '../../includes/Analysis/HomoglyphAnalyser.php'), 'utf8');
	assert.equal(
		(homoglyphs.match(/=> array\( '[0-9A-F]{4}'/g) ?? []).length, DECLARED.php.homoglyphs,
		'PHP homoglyph coverage moved; update the PHP limitations and readme.txt',
	);
});

// ─── 5. the gap is real, and the sidebar must not imply otherwise ────

test('the engine catches invisible characters the server-side subset does not', async () => {
	// Not a hypothetical: these are carriers the engine reports and the subset
	// misses, including the tag block used to hide text inside a draft. A user
	// who sees "no findings" in the sidebar has NOT been told their draft is
	// clean, which is why every subset method carries that limitation.
	const missed = ['‌', '‍', '⁢', '︀', '\u{E0020}', '͏', '‎'];
	const base = 'The quarterly report was circulated to the board on Tuesday morning and every '
		+ 'member confirmed receipt of the document before the meeting began in the main room. ';
	let engineOnly = 0;
	for (const carrier of missed) {
		const request = requestFor(base.slice(0, 80) + carrier + base.slice(80), 'plain_text');
		const engine = await runEngine(request);
		const php = runPhp(request);
		if (unicodeEvidence(engine).length > unicodeEvidence(php).length) engineOnly += 1;
	}
	assert.equal(engineOnly, missed.length, 'the coverage gap this test documents has changed — re-check the declared numbers');
});
