import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptLegacyAnalysisResult,
  buildResultPresentation,
  renderResultShell,
  RESULT_SHELL_CSS,
} from '../../../shared/presentation/checker-result-presentation.mjs';

const BRAND = 'data:image/png;base64,AA==';

function deterministicResult() {
  return {
    schema_version: '1.0', contract_version: '1.0.0', request_id: 'req_fixture', analysis_id: 'analysis_fixture',
    source: { content_hash: 'sha256:fixture', normalised_hash: 'sha256:normalised', content_type: 'plain_text', language: 'en-GB', word_count: 412 },
    protected_spans: [{ id: 'protected_1', kind: 'number' }], pattern_findings: [],
    methods: [{
      id: 'unicode.invisible', category: 'unicode', provider_or_method: '<img src=x onerror=alert(1)>', version: 'unicode:2026.08.2', status: 'pass', score: null, threshold: null, segments: [], evidence: [],
      limitations: ['Unicode controls can be legitimate.'], started_at: '2026-09-02T09:00:00.000Z', completed_at: '2026-09-02T09:00:00.000Z', privacy_route: 'browser',
    }],
    summary: { pass: 1, attention: 0, fail: 0, inconclusive: 0, unsupported: 0, not_configured: 0, not_run: 0, error: 0 },
    combined_verdict: {
      ai_probability: { reading: 'not_assessed', value: null, reason: 'No trained model ran on this text.' },
      text_integrity: { status: 'clean', reason: 'No deliberate hidden-character evidence was found.', findings: [] },
      editorial: { suggestion_level: 'some', reason: 'The named rules produced some editorial suggestions.', categories_hit: ['uniformity'] },
    },
    limitations: ['Authorship cannot be proved from these checks.'],
    started_at: '2026-09-02T09:00:00.000Z', completed_at: '2026-09-02T09:00:00.000Z',
  };
}

function scoredCheckerResult() {
  const result = adaptLegacyAnalysisResult(deterministicResult(), { surface: 'Chrome extension', characterCount: 2_400, maxCharacters: 50_000, refuseNotTruncate: true });
  result.profile = 'full_checker';
  result.route = {
    ...result.route,
    kind: 'eu_server', location: 'EU server', content_transfer: 'eu_server', consent: 'explicit',
    model: { identity: 'tier3-cycle5-v1', registry_identity: 'tier3-cycle5-full', precision: 'fp32', segmentation_contract: 'segments-v3', input_contract: 'raw-v1', features_contract: 'features-v1', scoring_contract: 'margin-v1', flag_rule: { expression: 'max(m1, m2 + 0.34) >= 3.570935', primary_margin: 3.570935, secondary_gap: 0.34 } },
  };
  result.axes.ai_pattern = {
    assessment_status: 'assessed', method_status: 'attention', source: 'tier3-cycle5-v1', raw_score: 0.9685, raw_margin: 3.6, display_score: '0.969', score_scale: 'zero_to_one_pattern_similarity',
    level: 'signal-strongly-ai', primary_display_threshold: 0.9726, secondary_display_threshold: 0.967, flagged: true, flag_reason: 'primary', strongest_section_index: 1,
    reason: 'The trained model found a strong AI-pattern signal.', limitations: ['Scores estimate patterns, not authorship.'],
  };
  result.sections = [
    { index: 0, start_utf16: 0, end_utf16: 1_180, word_count: 205, raw_score: 0.9655, raw_margin: 3.49, display_score: '0.966', level: 'signal-likely-ai', band_id: 'uncertain', passage: 'First exact passage.', evidence: [{ id: 'model-1', kind: 'trained_model', summary: 'Repeated model-weighted patterns.', detail: 'The model score is shown beside this exact section.' }] },
    { index: 1, start_utf16: 1_180, end_utf16: 2_400, word_count: 207, raw_score: 0.9685, raw_margin: 3.6, display_score: '0.969', level: 'signal-strongly-ai', band_id: 'very_likely_ai', passage: 'Second exact passage.', evidence: [{ id: 'model-2', kind: 'trained_model', summary: 'Strongest model-scored section.' }] },
  ];
  result.source.section_count = 2;
  result.limitations = ['Scores estimate patterns, not authorship.'];
  result.exports.report = { available: true, format: 'pdf', contains_content: true, explicit_user_action: true, complete_evidence: true, product_identity: 'Opace AI Content Integrity', support_destination: 'https://opace.agency/tools/ai/content-verification-integrity/' };
  return result;
}

test('legacy results become a canonical primitive result without inventing a model verdict', () => {
  const adapted = adaptLegacyAnalysisResult(deterministicResult(), { surface: 'Astro toolbar', characterCount: 2_400, maxCharacters: 50_000, refuseNotTruncate: false });
  const presentation = buildResultPresentation(adapted, { surface: 'Astro toolbar', brandAssetUrl: BRAND });
  const html = renderResultShell(presentation);
  assert.equal(adapted.profile, 'primitive');
  assert.equal(adapted.route.model, null);
  assert.equal(adapted.axes.ai_pattern.assessment_status, 'not_assessed');
  assert.equal(adapted.axes.ai_pattern.raw_score, null);
  assert.equal(adapted.axes.ai_pattern.raw_margin, null);
  assert.equal(adapted.exports.report.support_destination, 'https://opace.agency/tools/ai/content-verification-integrity/');
  assert.equal(adapted.abuse_controls.refuse_not_truncate, 'not_configured');
  assert.equal(presentation.axes.length, 3);
  assert.match(html, /data-result-status="not_assessed"/u);
  assert.match(html, /data-result-profile="primitive"/u);
  assert.match(html, /class="oaci-result-mark"/u);
  assert.match(html, /<img src="data:image\/png;base64,AA=="/u);
  assert.match(html, /No trained model ran/u);
  assert.match(html, /Character and writing-pattern findings cannot fill this gap/u);
  assert.match(html, /This reduced deterministic result is not full-checker parity/u);
  assert.doesNotMatch(html, /<img src=x/u);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/u);
});

test('scored canonical results preserve central display strings and render zero-based indexes as human positions', () => {
  const presentation = buildResultPresentation(scoredCheckerResult(), { surface: 'Chrome extension', brandAssetUrl: BRAND });
  const html = renderResultShell(presentation);
  assert.match(html, /data-result-status="assessed"/u);
  assert.match(html, /data-section-score="0\.966">0\.966</u);
  assert.match(html, /data-section-score="0\.969">0\.969</u);
  assert.match(html, /Section 1 · 205 words/u);
  assert.match(html, /Section 2 · 207 words/u);
  assert.match(html, /Likely AI/u);
  assert.match(html, /Strongly AI/u);
  assert.match(html, /Why it reads this way/u);
  assert.match(html, /The strongest passage shaped the result/u);
  assert.match(html, /AI-pattern five-band reading/u);
  assert.match(html, /Likely human[\s\S]*Unclear[\s\S]*Potentially AI[\s\S]*Likely AI[\s\S]*Strongly AI/u);
  assert.match(html, /aria-label="Model-scored section map"/u);
  assert.match(html, /--oaci-score:90\.000%/u);
  assert.match(html, /href="#oaci-section-1"/u);
  assert.match(html, /href="#oaci-section-2"/u);
  assert.match(html, /Report export: pdf, complete evidence/u);
  assert.doesNotMatch(html, /Section 0/u);
  assert.doesNotMatch(html, /data-section-score="0\.97"/u);
});

test('canonical result presentation fails closed for non-canonical levels, indexes and unassessed scores', () => {
  assert.throws(() => buildResultPresentation(scoredCheckerResult(), { surface: 'Astro toolbar', brandAssetUrl: '' }), /brand_asset_required/u);
  const badLevel = scoredCheckerResult();
  badLevel.sections[0].level = 'likely-ai';
  assert.throws(() => buildResultPresentation(badLevel, { surface: 'Astro toolbar', brandAssetUrl: BRAND }), /section_contract_invalid/u);
  const badIndex = scoredCheckerResult();
  badIndex.sections[0].index = 1;
  assert.throws(() => buildResultPresentation(badIndex, { surface: 'Astro toolbar', brandAssetUrl: BRAND }), /section_contract_invalid/u);
  const missingMargin = scoredCheckerResult();
  delete missingMargin.sections[0].raw_margin;
  assert.throws(() => buildResultPresentation(missingMargin, { surface: 'Astro toolbar', brandAssetUrl: BRAND }), /section_contract_invalid/u);
  const missingReport = scoredCheckerResult();
  missingReport.exports.report.complete_evidence = false;
  assert.throws(() => buildResultPresentation(missingReport, { surface: 'Astro toolbar', brandAssetUrl: BRAND }), /full_report_required/u);
  const badLegacy = adaptLegacyAnalysisResult(deterministicResult(), { surface: 'Astro toolbar', characterCount: 100, maxCharacters: 50_000, refuseNotTruncate: false });
  badLegacy.axes.ai_pattern.raw_score = 0.9;
  assert.throws(() => buildResultPresentation(badLegacy, { surface: 'Astro toolbar', brandAssetUrl: BRAND }), /unassessed_score_forbidden/u);
});

test('shared shell styling is self-contained, responsive and forced-colour aware', () => {
  assert.match(RESULT_SHELL_CSS, /\.oaci-result-shell/u);
  assert.match(RESULT_SHELL_CSS, /@media\(max-width:420px\)/u);
  assert.match(RESULT_SHELL_CSS, /@media\(forced-colors:active\)/u);
  assert.doesNotMatch(RESULT_SHELL_CSS, /https?:\/\//u);
});
