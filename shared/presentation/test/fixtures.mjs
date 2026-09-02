/**
 * Result fixtures for the shared presentation tests.
 *
 * The assessed base is the repository's own canonical fixture,
 * `fixtures/contracts/valid/checker-result.json`, read from disk rather than
 * retyped, so a contract change cannot pass these tests silently. The other
 * fixtures are derived from it and each one is a state the renderer must show
 * honestly: a rounding collision, a withheld run, a too-short run, a failed
 * run and a primitive result whose AI axis was never assessed.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const canonicalPath = fileURLToPath(new URL('../../../fixtures/contracts/valid/checker-result.json', import.meta.url));

const clone = (value) => JSON.parse(JSON.stringify(value));

export const canonicalFixture = () => clone(JSON.parse(readFileSync(canonicalPath, 'utf8')).data);

/**
 * The 0.9655 / 0.9685 regression pair. Two different levels must never print
 * the same rounded number, so the contract carries 0.966 and 0.969 and the
 * renderer must print exactly those, never "0.97".
 */
export const collisionFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_collision_fixture';
  result.sections[0].raw_score = 0.9655;
  result.sections[0].display_score = '0.966';
  result.sections[0].level = 'signal-likely-ai';
  result.sections[1].raw_score = 0.9685;
  result.sections[1].display_score = '0.969';
  result.sections[1].level = 'signal-strongly-ai';
  result.axes.ai_pattern.raw_score = 0.9685;
  result.axes.ai_pattern.display_score = '0.969';
  return result;
};

/** A section carrying a real passage, editorial advice and a contract-supplied measure. */
export const richFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_rich_fixture';
  result.sections[0].passage = 'Ask someone what COPD stands for and you will often get a blank look. '
    + 'It is sitting quietly in the background of more households than most people realise. '
    + 'Chronic obstructive pulmonary disease is now the second most common lung condition in the country. '
    + 'Around one and a quarter million people live with a diagnosis today.';
  result.sections[0].evidence.push({
    id: 'section-0-editorial',
    kind: 'editorial_rule',
    summary: '“isn’t one single disease — it’s”',
    detail: 'State what the thing is without the negated set-up.',
    basis: 'A negated contrast template appears here. This is a stylistic hint, not evidence of authorship.',
  });
  result.sections[1].evidence.push({
    id: 'section-1-measure',
    kind: 'measured_pattern',
    summary: 'Word re-use between neighbouring sentences',
    measure: {
      label: 'Word re-use between neighbouring sentences',
      unit: '%',
      value: 6.6,
      scale_max: 10,
      machine_median: 2.1,
      human_median: 6.3,
      least_connected: { first: 'The scale of the burden.', second: 'The numbers tell an uncomfortable story.', shared_words: ['numbers'] },
    },
  });
  return result;
};

/** A content-free result: locators instead of passages. */
export const contentFreeFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_content_free_fixture';
  result.contains_content = false;
  for (const section of result.sections) {
    delete section.passage;
    section.locator = { content_hash: result.source.content_hash, start_utf16: section.start_utf16, end_utf16: section.end_utf16 };
  }
  return result;
};

const unassessed = (result, status, methodStatus, reason) => {
  result.axes.ai_pattern = {
    assessment_status: status,
    method_status: methodStatus,
    source: null,
    raw_score: null,
    raw_margin: null,
    display_score: null,
    score_scale: 'zero_to_one_pattern_similarity',
    level: null,
    primary_display_threshold: null,
    secondary_display_threshold: null,
    flagged: null,
    flag_reason: null,
    strongest_section_index: null,
    reason,
    limitations: ['Character findings and writing rules cannot supply an AI-pattern reading.'],
  };
  result.sections = [];
  result.source.section_count = 0;
  result.exports.report = { ...result.exports.report, available: false, format: 'none', contains_content: false, complete_evidence: false };
  return result;
};

/** The model was asked and deliberately gave no reading. */
export const withheldFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_withheld_fixture';
  return unassessed(result, 'withheld', 'not_run', 'The route refused to score this draft, so no AI reading was produced. The named character and writing checks still ran.');
};

/** Too short to read: a withheld run whose method status is inconclusive. */
export const tooShortFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_too_short_fixture';
  result.source.word_count = 24;
  result.source.character_count = 138;
  return unassessed(result, 'withheld', 'inconclusive', 'There is not enough writing here for the model to say anything worth printing, so it was not asked to guess.');
};

/** The route failed. It is an error, and it is never drawn as a pass. */
export const errorFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_error_fixture';
  return unassessed(result, 'error', 'error', 'The scoring route returned an error, so no AI reading was produced. The named character and writing checks still ran.');
};

/** A primitive surface: no trained model in the build at all. */
export const notAssessedFixture = () => {
  const result = canonicalFixture();
  result.result_id = 'result_primitive_fixture';
  result.profile = 'primitive';
  result.route = {
    ...result.route,
    kind: 'deterministic_only',
    location: 'This device, in the browser',
    content_transfer: 'none',
    privacy_route: 'browser',
    consent: 'not_required',
    model: null,
    retention: { source: 'none', result: 'none', statement: 'Source and result stayed in memory for the active view only.' },
  };
  return unassessed(result, 'not_assessed', 'not_run', 'No trained model ran on this text, so no AI-pattern reading is available.');
};

/** An input carrying markup, to prove every string is escaped. */
export const hostileFixture = () => {
  const result = richFixture();
  result.result_id = 'result_<script>alert(1)</script>';
  result.route.location = '<img src=x onerror=alert(1)>';
  result.methods[0].provider_or_method = '<img src=x onerror=alert(1)>';
  result.sections[0].passage = 'A passage with <b>markup</b> & an ampersand. '
    + 'It runs to several sentences so the measured signal has something to read. '
    + 'The third sentence keeps the passage above the measurement floor. '
    + 'The fourth adds a little more for the neighbouring-sentence comparison.';
  result.limitations.push('<em>markup in a limitation</em>');
  return result;
};

export const allFixtures = () => ({
  canonical: canonicalFixture(),
  collision: collisionFixture(),
  rich: richFixture(),
  contentFree: contentFreeFixture(),
  withheld: withheldFixture(),
  tooShort: tooShortFixture(),
  error: errorFixture(),
  notAssessed: notAssessedFixture(),
  hostile: hostileFixture(),
});
