/** Shared fixtures for the report tests. */

import { readFileSync } from 'node:fs';

const FIXTURE_URL = new URL('../../../fixtures/contracts/valid/checker-result.json', import.meta.url);

/** The canonical multi-section regression fixture, straight from the contract folder. */
export function checkerResultFixture() {
  return JSON.parse(readFileSync(FIXTURE_URL, 'utf8')).data;
}

/** A deep clone so a test can vary the fixture without leaking into the next test. */
export const clone = (value) => JSON.parse(JSON.stringify(value));

/** The fixture with no trained-model reading: the withheld/not-assessed profile. */
export function notAssessedFixture() {
  const result = clone(checkerResultFixture());
  result.profile = 'primitive';
  result.axes.ai_pattern = {
    ...result.axes.ai_pattern,
    assessment_status: 'not_assessed',
    method_status: 'not_run',
    source: null,
    raw_score: null,
    raw_margin: null,
    display_score: null,
    level: null,
    primary_display_threshold: null,
    secondary_display_threshold: null,
    flagged: null,
    flag_reason: null,
    strongest_section_index: null,
    reason: 'No trained model ran on this text, so no AI-pattern reading is available.',
  };
  result.sections = [];
  result.source.section_count = 0;
  result.route.model = null;
  result.route.kind = 'deterministic_only';
  return result;
}

/** A long fixture that forces the layout to paginate several times. */
export function longFixture(sectionCount = 14) {
  const result = clone(checkerResultFixture());
  const passage = 'This is a long, complete scored passage that exists so the layout engine has to wrap, measure and paginate real prose rather than a single short line of text. It repeats deliberately so that page breaks land in the middle of a card and the continuation behaviour is exercised. ';
  result.sections = Array.from({ length: sectionCount }, (_, index) => ({
    index,
    start_utf16: index * 400,
    end_utf16: (index + 1) * 400 - 1,
    word_count: 90 + index,
    raw_score: 0.5 + (index % 5) * 0.1,
    raw_margin: 1 + index / 10,
    display_score: (0.5 + (index % 5) * 0.1).toFixed(3),
    level: ['signal-likely-human', 'signal-unclear', 'signal-potentially-ai', 'signal-likely-ai', 'signal-strongly-ai'][index % 5],
    band_id: 'uncertain',
    passage: passage.repeat(2).trim(),
    evidence: [
      { id: `section-${index}-model`, kind: 'trained_model', summary: 'This section resembles AI writing.', detail: 'Its level comes from the trained model; the descriptive evidence did not set the score.' },
    ],
  }));
  result.axes.ai_pattern.strongest_section_index = sectionCount - 1;
  result.axes.ai_pattern.level = result.sections[sectionCount - 1].level;
  result.axes.ai_pattern.display_score = result.sections[sectionCount - 1].display_score;
  result.source.section_count = sectionCount;
  return result;
}

const HASH = `sha256:${'a'.repeat(64)}`;

/** A C2PA file-inspection result for one of the six closed statuses. */
export function provenanceResult(status, overrides = {}) {
  return {
    file_hash: HASH,
    media_type: 'image/jpeg',
    status,
    trust: status === 'untrusted' ? 'untrusted' : 'not_validated',
    reason: `Fixture ${status} result.`,
    manifest_summary: status === 'present' ? { claim_generator: 'Fixture generator', assertions: 2 } : null,
    issues: status === 'invalid' ? [{ code: 'claimSignature.mismatch', explanation: 'Signature mismatch.' }] : [],
    limitations: ['Certificate trust lists were not fetched.', 'Remote manifests were not fetched.'],
    ...overrides,
  };
}

export const PROVENANCE_STATUSES = Object.freeze(['present', 'absent', 'invalid', 'untrusted', 'error', 'unsupported']);
export const PROVENANCE_HASH = HASH;

/**
 * Every count that the reports render set to exactly one: one word, one character, one section,
 * one section word, one protected fact, one category, one named check. The singular case that
 * Lane B found in the wild.
 */
export function singularFixture() {
  const result = clone(checkerResultFixture());
  result.source.word_count = 1;
  result.source.character_count = 1;
  result.source.section_count = 1;
  result.sections = [{
    index: 0,
    start_utf16: 0,
    end_utf16: 1,
    word_count: 1,
    raw_score: 0.9685,
    raw_margin: 3.6,
    display_score: '0.969',
    level: 'signal-strongly-ai',
    band_id: 'very_likely_ai',
    passage: 'Word.',
    evidence: [{ id: 'section-0-model', kind: 'trained_model', summary: 'This was the strongest scored section.' }],
  }];
  result.axes.ai_pattern.strongest_section_index = 0;
  result.provenance.protected_facts = { count: 1, categories: ['organisation'] };
  result.methods = [result.methods[0]];
  return result;
}

/** No counts at all: zero protected facts, zero categories. */
export function zeroCountFixture() {
  const result = clone(checkerResultFixture());
  result.provenance.protected_facts = { count: 0, categories: [] };
  return result;
}

/**
 * The named-checks table as a real run produces it: eight checks with the full method names,
 * dotted ids, version strings and complete limitation sentences. This is the shape Lane C
 * measured in the Astro toolbar, where the last column ("Limits") pushed the table's minimum
 * content width past a 375 px viewport and scrolled the whole page sideways.
 */
export function wideChecksFixture() {
  const result = clone(checkerResultFixture());
  const checks = [
    ['detector.cycle5', 'Opace Cycle-5 AI-pattern model', 'tier3-cycle5-v1', 'attention',
      ['The score is a zero-to-one pattern-similarity reading on the zero_to_one_pattern_similarity scale, not a probability and not proof of authorship.',
        'A carefully edited machine draft can read as human, and unusual human writing can read as machine.']],
    ['integrity.invisible-characters', 'Invisible character scan', 'text-integrity-v3', 'pass',
      ['Only the characters in the published block list are searched for.']],
    ['integrity.lookalike-characters', 'Lookalike character scan', 'text-integrity-v3', 'attention',
      ['Confusable letters are reported, never corrected, because a legitimate multilingual draft uses them.']],
    ['editorial.writing-patterns', 'Writing-pattern rules', 'editorial-rules-v2', 'attention',
      ['These are editorial suggestions from deterministic rules and they never change the AI-pattern reading.']],
    ['watermark.opace-public-keys', 'Opace public watermark keys', 'watermark-keys-2026-08', 'inconclusive',
      ['Only publicly published keys are tested. A negative result never clears a private key.']],
    ['watermark.anthropic-verifier', 'Anthropic official watermark verifier', 'not-configured', 'not_configured',
      ['No verifier endpoint is configured for this route, so nothing was tested.']],
    ['provenance.c2pa.text-wrapper', 'Content Credentials, text wrapper', 'c2pa-text-v1', 'unsupported',
      ['Pasted text carries no file wrapper, so no manifest could be read.']],
    ['provenance.c2pa.files', 'Content Credentials, files', 'c2pa-files-v1', 'not_run',
      ['No file was attached to this text run.']],
  ];
  result.methods = checks.map(([id, name, version, status, limitations]) => ({
    ...clone(result.methods[0]),
    id,
    provider_or_method: name,
    version,
    status,
    limitations,
  }));
  return result;
}
