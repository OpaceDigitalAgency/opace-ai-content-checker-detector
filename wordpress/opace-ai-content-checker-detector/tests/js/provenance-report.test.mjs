import assert from 'node:assert/strict';
import test from 'node:test';

import { buildProvenanceExport, createProvenancePdf, provenanceReportText } from '../../assets/js/provenance-report.mjs';

const HASH = `sha256:${'a'.repeat(64)}`;
const statuses = ['present', 'absent', 'invalid', 'untrusted', 'error', 'unsupported'];

function result(status, overrides = {}) {
	return {
		file_hash: HASH,
		media_type: 'image/jpeg',
		status,
		trust: status === 'untrusted' ? 'untrusted' : 'not_validated',
		reason: `Fixture ${status} result.`,
		manifest_summary: status === 'present' ? { claim_generator: 'Fixture generator', assertions: 2 } : null,
		issues: status === 'invalid' ? [{ code: 'claimSignature.mismatch', explanation: 'Signature mismatch.' }] : [],
		limitations: ['Certificate trust lists were not fetched.', 'Remote manifests were not fetched.'],
		...overrides
	};
}

test('all six provenance states create content-free records without filename or bytes', () => {
	for (const status of statuses) {
		const record = buildProvenanceExport(
			{ name: 'private-client-filename.jpg', size: 19_876, bytes: 'private file bytes' },
			result(status),
			'2026-09-02T12:00:00.000Z'
		);
		assert.equal(record.provenance.status, status);
		assert.equal(record.file.hash, HASH);
		assert.equal(record.file.size_bytes, 19_876);
		assert.equal(record.contains_content, false);
		assert.doesNotMatch(JSON.stringify(record), /private-client-filename|private file bytes|"(?:name|bytes|content)"/i);
	}
});

test('provenance PDF carries the result, privacy boundary and usable non-ASCII fallback', () => {
	const record = buildProvenanceExport(
		{ name: 'never-exported.pdf', size: 42 },
		result('untrusted', { reason: 'Signer José – review 🔒 required.' }),
		'2026-09-02T12:00:00.000Z'
	);
	const report = provenanceReportText(record);
	assert.match(report, /Status: untrusted/);
	assert.match(report, /File hash: sha256:a{64}/);
	assert.match(report, /file itself is not embedded/i);

	const bytes = createProvenancePdf(record);
	const pdf = Buffer.from(bytes).toString('latin1');
	assert.match(pdf, /^%PDF-1\.4/);
	assert.match(pdf, /File Content Credentials report/);
	assert.match(pdf, /Signer Jos\xE9 \x96 review \[U\+01F512\] required/);
	assert.doesNotMatch(pdf, /never-exported/);
});

test('long provenance issue lists paginate without placing report lines below the content boundary', () => {
	const issues = Array.from({ length: 180 }, (_, index) => ({
		code: `fixture.issue.${index + 1}`,
		explanation: `Bounded validation detail ${index + 1}.`
	}));
	const record = buildProvenanceExport(
		{ size: 2048 },
		result('invalid', { issues }),
		'2026-09-02T12:00:00.000Z'
	);
	const pdf = Buffer.from(createProvenancePdf(record)).toString('latin1');
	const count = Number(pdf.match(/\/Type \/Pages \/Kids \[[^\]]+\] \/Count (\d+)/)?.[1] || 0);
	assert.ok(count >= 3, `expected at least three pages, received ${count}`);
	// The shared writer lays text out at fractional baselines, so the assertion
	// is on every text baseline rather than on one writer's exact x-coordinate.
	const baselines = [...pdf.matchAll(/ (-?\d+(?:\.\d+)?) Td \(/g)].map((match) => Number(match[1]));
	assert.ok(baselines.length > 100, `expected many text baselines, found ${baselines.length}`);
	for (const y of baselines) assert.ok(y >= 24, `content line rendered below the page boundary at y=${y}`);
});

test('unsafe provenance records fail closed', () => {
	assert.throws(() => buildProvenanceExport({ size: 1 }, result('present', { file_hash: 'sha256:bad' })), /not safe to export/);
	assert.throws(() => buildProvenanceExport({ size: 20 * 1024 * 1024 + 1 }, result('present')), /not safe to export/);
	assert.throws(() => buildProvenanceExport({ size: 1 }, result('invented')), /not safe to export/);
});
