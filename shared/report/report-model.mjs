/**
 * Shared report model.
 *
 * One pure function turns a canonical checker-result (schemas/v1/checker-result.schema.json)
 * into the exact set of strings, numbers and colours that both the printable HTML report and
 * the vector PDF put on the page. Neither renderer recomputes a verdict, a level or a score:
 * every displayed number comes straight out of the contract, so the heading, the section bars,
 * the passages and the run record cannot disagree with each other.
 *
 * No DOM, no Node API, no network. ESM, browser-safe.
 */

/** Level identifiers in gauge order, lowest AI reading first. */
export const LEVEL_ORDER = Object.freeze([
  'signal-likely-human',
  'signal-unclear',
  'signal-potentially-ai',
  'signal-likely-ai',
  'signal-strongly-ai',
]);

/** Matches shared/presentation/checker-result-presentation.mjs (Lane D1). */
export const LEVEL_LABELS = Object.freeze({
  'signal-likely-human': 'Likely human',
  'signal-unclear': 'Unclear',
  'signal-potentially-ai': 'Potentially AI',
  'signal-likely-ai': 'Likely AI',
  'signal-strongly-ai': 'Strongly AI',
});

/** Five-band palette shared with the website result page, as hex and as PDF RGB triples. */
export const LEVEL_COLOURS = Object.freeze({
  'signal-likely-human': Object.freeze({ hex: '#1a7349', rgb: Object.freeze([0.102, 0.451, 0.286]) }),
  'signal-unclear': Object.freeze({ hex: '#6d7877', rgb: Object.freeze([0.427, 0.471, 0.467]) }),
  'signal-potentially-ai': Object.freeze({ hex: '#b06603', rgb: Object.freeze([0.690, 0.400, 0.012]) }),
  'signal-likely-ai': Object.freeze({ hex: '#bf4705', rgb: Object.freeze([0.749, 0.278, 0.020]) }),
  'signal-strongly-ai': Object.freeze({ hex: '#a31f17', rgb: Object.freeze([0.639, 0.122, 0.090]) }),
});

const NEUTRAL = Object.freeze({ hex: '#4f5a59', rgb: Object.freeze([0.310, 0.353, 0.349]) });

/**
 * Tone name for every colour the reports fill a shape with.
 *
 * The palettes above are *fills*: they colour the dial wedges, the score bars, the card spines
 * and the chips, and they are chosen to be distinguishable, not to be legible as small text.
 * Both renderers therefore resolve a fill to a tone and the tone to a readable ink whenever the
 * colour is about to carry text. An unrecognised colour falls back to the neutral tone.
 */
export const TONE_BY_HEX = Object.freeze({
  '#1a7349': 'human',
  '#6d7877': 'unclear',
  '#b06603': 'potential',
  '#bf4705': 'likely',
  '#a31f17': 'strong',
  '#4f5a59': 'neutral',
  '#fb700a': 'orange',
  '#0068b3': 'blue',
  '#12557a': 'blue',
});

/** Tone name for a model colour or a raw hex string. */
export const toneOf = (colour) => {
  const hex = typeof colour === 'string' ? colour : colour?.hex;
  return TONE_BY_HEX[String(hex ?? '').toLowerCase()] ?? 'neutral';
};

/**
 * The readable ink for each tone on light output: the printed page and the light colour scheme.
 *
 * Every one of these clears 4.5:1 against the report's paper, its cards and its means panel, so
 * small text can use them without a per-surface exception. They are the same values Lane D1 uses
 * for its band inks, which is why the HTML stylesheet and the PDF name one set of colours.
 */
export const REPORT_INKS = Object.freeze({
  human: Object.freeze({ hex: '#1c6e46', rgb: Object.freeze([0.110, 0.431, 0.275]) }),
  unclear: Object.freeze({ hex: '#5c6360', rgb: Object.freeze([0.361, 0.388, 0.376]) }),
  potential: Object.freeze({ hex: '#8a5a00', rgb: Object.freeze([0.541, 0.353, 0.000]) }),
  likely: Object.freeze({ hex: '#a84a08', rgb: Object.freeze([0.659, 0.290, 0.031]) }),
  strong: Object.freeze({ hex: '#96261b', rgb: Object.freeze([0.588, 0.149, 0.106]) }),
  neutral: Object.freeze({ hex: '#4f5a59', rgb: Object.freeze([0.310, 0.353, 0.349]) }),
  orange: Object.freeze({ hex: '#8b3f0b', rgb: Object.freeze([0.545, 0.247, 0.043]) }),
  blue: Object.freeze({ hex: '#12557a', rgb: Object.freeze([0.071, 0.333, 0.478]) }),
});

/**
 * The readable ink for a fill-palette colour, for text that has to sit on light output.
 *
 * `null` for a colour that is not in the fill palette. Those are already inks — the near-black
 * body colour, the muted grey — and substituting a band ink for them would lighten text that is
 * currently fine. `toneOf` keeps its neutral fallback because it answers a different question:
 * which tone attribute to stamp on an element.
 */
export const inkFor = (colour) => {
  const hex = typeof colour === 'string' ? colour : colour?.hex;
  return REPORT_INKS[TONE_BY_HEX[String(hex ?? '').toLowerCase()]] ?? null;
};

const LEVEL_MEANING = Object.freeze({
  'signal-likely-human': 'This draft reads the way human writing usually reads. That is not proof of authorship, and a carefully edited AI draft can read this way too.',
  'signal-unclear': 'The reading sits in the middle of the scale. The patterns in this draft do not lean clearly towards either human or AI writing.',
  'signal-potentially-ai': 'Parts of this draft carry patterns that are common in AI writing. Treat it as a reason to read the marked sections closely, not as a verdict.',
  'signal-likely-ai': 'This draft matches AI writing patterns closely. The marked sections are the ones worth a careful read.',
  'signal-strongly-ai': 'This draft very strongly matches AI writing, the kind of match we rarely see in human work.',
});

const METHOD_STATUS_LABELS = Object.freeze({
  pass: 'No issue found',
  attention: 'Review evidence',
  fail: 'Failed',
  inconclusive: 'Inconclusive',
  unsupported: 'Unavailable',
  not_configured: 'Not configured',
  not_run: 'Not run',
  error: 'Error',
});

const INTEGRITY_READINGS = Object.freeze({
  clean: 'Clean',
  attention: 'Worth a look',
  manipulated: 'Manipulation found',
  inconclusive: 'Inconclusive',
  error: 'Error',
});

const EDITORIAL_READINGS = Object.freeze({
  none: 'No suggestions',
  some: 'Some suggestions',
  many: 'Many suggestions',
  not_assessed: 'Not assessed',
  error: 'Error',
});

export const HONESTY_LINE = 'No AI checker can prove who wrote a text. This is a pattern reading, and it is evidence, not a guarantee.';
export const PRODUCT_NAME = 'Opace AI Content Checker & Detector';
export const DEFAULT_PRODUCT_URL = 'https://opace.agency/tools/ai/content-verification-integrity/checker/';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []);
const text = (value, fallback = '') => (typeof value === 'string' && value.trim() ? value.trim() : fallback);
const unique = (values) => [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];

export const humanise = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());

const number = (value) => (Number.isFinite(value) ? Number(value).toLocaleString('en-GB') : 'not recorded');

/**
 * Pick the singular or plural form for a count. Only exactly one is singular, so 0 and 1.5 both
 * take the plural, which is what English does ("0 items", "1.5 items").
 */
/** Raw margins are model-space numbers; two decimals is all a reader needs. */
export function formatMargin(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '';
}

export function pluralise(count, singular, plural = `${singular}s`) {
  return Math.abs(Number(count)) === 1 ? singular : plural;
}

/**
 * "1 word", "120 words", "Not recorded". Every count the reports print goes through this, so a
 * singular count can never end up next to a plural noun or a plural verb.
 */
export function countPhrase(count, singular, plural, fallback = 'Not recorded') {
  if (!Number.isFinite(count)) return fallback;
  return `${Number(count).toLocaleString('en-GB')} ${pluralise(count, singular, plural)}`;
}

export function describeValue(value) {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return value.length ? value.map(describeValue).join('; ') : 'None';
  return Object.entries(value)
    .map(([key, item]) => `${humanise(key)}: ${describeValue(item)}`)
    .join('; ');
}

function assertReportInput(result) {
  if (!isRecord(result)) throw new Error('report_result_required');
  if (result.schema_version !== '1.0') throw new Error('report_result_schema_unsupported');
  if (!isRecord(result.source) || !isRecord(result.route) || !isRecord(result.axes)) throw new Error('report_result_structure_invalid');
  if (!isRecord(result.axes.ai_pattern) || !isRecord(result.axes.text_integrity) || !isRecord(result.axes.editorial)) throw new Error('report_result_axes_invalid');
  if (!Array.isArray(result.sections) || !Array.isArray(result.methods)) throw new Error('report_result_collections_invalid');
  if (!isRecord(result.provenance) || !isRecord(result.exports)) throw new Error('report_result_supporting_invalid');
}

const dateLabel = (iso) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return 'Date not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(parsed).replace(', ', ' at ') + ' UTC';
};

const levelView = (levelId, labels) => {
  if (!levelId || !LEVEL_ORDER.includes(levelId)) {
    return Object.freeze({ id: null, label: 'Not assessed', index: -1, colour: NEUTRAL, meaning: '' });
  }
  return Object.freeze({
    id: levelId,
    label: labels[levelId] ?? LEVEL_LABELS[levelId],
    index: LEVEL_ORDER.indexOf(levelId),
    colour: LEVEL_COLOURS[levelId],
    meaning: LEVEL_MEANING[levelId],
  });
};

/** Bar fill for a section: how far the raw score leans away from the middle of the scale. */
const barFill = (rawScore) => {
  if (!Number.isFinite(rawScore)) return 0.04;
  return Math.min(1, Math.max(0.04, Math.abs(rawScore - 0.5) * 2));
};

const evidenceLines = (section) =>
  (Array.isArray(section.evidence) ? section.evidence : []).map((item) =>
    [text(item?.summary), text(item?.detail), text(item?.basis) ? `Basis: ${item.basis}` : ''].filter(Boolean).join(' ')
  ).filter(Boolean);

function routeCopy(result, overrides) {
  const route = result.route;
  const retention = isRecord(route.retention) ? route.retention : {};
  const model = isRecord(route.model) ? route.model : null;
  return Object.freeze({
    name: text(route.location, humanise(route.kind)),
    kind: humanise(route.kind),
    privacy: text(
      overrides.privacyStatement,
      text(retention.statement, `Content transfer: ${humanise(route.content_transfer)}. Result retention: ${humanise(retention.result ?? 'not recorded')}.`)
    ),
    consent: humanise(route.consent),
    modelIdentity: model ? `${model.identity} (${model.registry_identity ?? 'no registry identity'}, ${model.precision ?? 'precision not recorded'})` : 'No trained model ran',
    contracts: model
      ? [model.segmentation_contract, model.input_contract, model.features_contract, model.scoring_contract].filter(Boolean).join(', ')
      : 'Not applicable',
    flagRule: model && isRecord(model.flag_rule) ? text(model.flag_rule.expression, 'Not recorded') : 'Not applicable',
    artefactHash: model ? text(model.artefact_hash, 'Not recorded') : 'Not applicable',
  });
}

function axesView(result) {
  const ai = result.axes.ai_pattern;
  const integrity = result.axes.text_integrity;
  const editorial = result.axes.editorial;
  const aiLevel = levelView(ai.level, LEVEL_LABELS);
  return Object.freeze([
    Object.freeze({
      id: 'ai',
      label: 'AI-pattern reading',
      value: ai.assessment_status === 'assessed' ? aiLevel.label : 'Not assessed',
      status: text(ai.method_status, 'not_run'),
      statusLabel: METHOD_STATUS_LABELS[ai.method_status] ?? humanise(ai.method_status),
      detail: text(ai.reason, 'No AI-pattern reason was recorded.'),
      limitations: list(ai.limitations),
      colour: aiLevel.colour,
    }),
    Object.freeze({
      id: 'integrity',
      label: 'Text integrity and provenance',
      value: INTEGRITY_READINGS[integrity.reading] ?? humanise(integrity.reading),
      status: text(integrity.method_status, 'not_run'),
      statusLabel: METHOD_STATUS_LABELS[integrity.method_status] ?? humanise(integrity.method_status),
      detail: text(integrity.reason, 'No text-integrity reason was recorded.'),
      limitations: list(integrity.limitations),
      colour: Object.freeze({ hex: '#12557a', rgb: Object.freeze([0.071, 0.333, 0.478]) }),
    }),
    Object.freeze({
      id: 'editorial',
      label: 'Editorial suggestions',
      value: EDITORIAL_READINGS[editorial.reading] ?? humanise(editorial.reading),
      status: text(editorial.method_status, 'not_run'),
      statusLabel: METHOD_STATUS_LABELS[editorial.method_status] ?? humanise(editorial.method_status),
      detail: text(editorial.reason, 'No editorial reason was recorded.'),
      limitations: list(editorial.limitations),
      colour: NEUTRAL,
    }),
  ]);
}

function sectionsView(result, labels, sourceText) {
  const strongestIndex = result.axes.ai_pattern.strongest_section_index;
  const local = typeof sourceText === 'string' && sourceText ? sourceText : null;
  return Object.freeze(
    result.sections.map((section, position) => {
      const level = levelView(section.level, labels);
      let passage = text(section.passage, '');
      if (local) {
        // A surface that still holds the draft prints the exact scored characters. A slice that
        // does not fit the recorded offsets means the draft and the result have drifted apart,
        // so nothing is printed rather than the wrong passage.
        const start = section.start_utf16;
        const end = section.end_utf16;
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > local.length) {
          throw new Error('report_source_text_bounds_invalid');
        }
        passage = local.slice(start, end);
      }
      return Object.freeze({
        index: Number.isInteger(section.index) ? section.index : position,
        number: position + 1,
        level,
        displayScore: text(section.display_score, 'not recorded'),
        rawMargin: Number.isFinite(section.raw_margin) ? section.raw_margin : null,
        rawMarginText: Number.isFinite(section.raw_margin) ? formatMargin(section.raw_margin) : '',
        words: Number.isFinite(section.word_count) ? section.word_count : null,
        wordsPhrase: Number.isFinite(section.word_count) ? countPhrase(section.word_count, 'word') : null,
        locator: `UTF-16 ${section.start_utf16 ?? '?'} to ${section.end_utf16 ?? '?'}`,
        passage,
        evidence: Object.freeze(evidenceLines(section)),
        strongest: section.index === strongestIndex,
        barFill: barFill(section.raw_score),
      });
    })
  );
}

function watermarkView(result) {
  const watermarks = Array.isArray(result.provenance.watermarks) ? result.provenance.watermarks : [];
  return Object.freeze(
    watermarks.map((item) =>
      Object.freeze({
        id: text(item.method_id, 'watermark'),
        name: item.method_id === 'watermark.anthropic'
          ? 'Anthropic official watermark verifier'
          : `${humanise(String(item.method_id ?? '').replace(/^watermark\./u, '').replaceAll('.', ' '))} watermark check`,
        outcome: humanise(item.outcome),
        status: text(item.method_status, 'not_run'),
        statusLabel: METHOD_STATUS_LABELS[item.method_status] ?? humanise(item.method_status),
        keyScope: humanise(item.key_scope),
        limitations: Object.freeze(list(item.limitations)),
      })
    )
  );
}

function methodsView(result) {
  return Object.freeze(
    result.methods.map((method) =>
      Object.freeze({
        id: text(method.id, 'method'),
        name: method.id === 'watermark.anthropic' ? 'Anthropic official watermark verifier' : text(method.provider_or_method, humanise(method.id)),
        version: text(method.version, 'no version recorded'),
        status: text(method.status, 'not_run'),
        statusLabel: METHOD_STATUS_LABELS[method.status] ?? humanise(method.status),
        location: text(method.privacy_route ? humanise(method.privacy_route) : '', 'Location not recorded'),
        startedAt: text(method.started_at, 'not recorded'),
        completedAt: text(method.completed_at, 'not recorded'),
        evidence: describeValue(method.evidence),
        limitations: Object.freeze(list(method.limitations)),
      })
    )
  );
}

/**
 * Build the shared report model.
 *
 * @param {object} result canonical checker-result payload (the `data` object, not the envelope)
 * @param {object} [options]
 * @param {string} [options.generatedAt] ISO timestamp used for the printed date; defaults to result.generated_at
 * @param {string} [options.productUrl] canonical product and support destination
 * @param {string} [options.surfaceName] the surface that produced the report, for example "WordPress"
 * @param {string} [options.title] report title
 * @param {string} [options.privacyStatement] surface-specific route/privacy sentence
 * @param {Record<string,string>} [options.levelLabels] level label overrides (Lane D1 vocabulary)
 * @param {string} [options.sourceText] the local draft; section passages are sliced from it
 */
export function buildReportModel(result, options = {}) {
  assertReportInput(result);
  const labels = { ...LEVEL_LABELS, ...(isRecord(options.levelLabels) ? options.levelLabels : {}) };
  const ai = result.axes.ai_pattern;
  const assessed = ai.assessment_status === 'assessed';
  const level = levelView(assessed ? ai.level : null, labels);
  const sections = sectionsView(result, labels, options.sourceText);
  const strongest = sections.find((section) => section.strongest) ?? null;
  const route = routeCopy(result, options);
  const generatedAt = text(options.generatedAt, text(result.generated_at, '1970-01-01T00:00:00Z'));
  const protectedFacts = isRecord(result.provenance.protected_facts) ? result.provenance.protected_facts : { count: 0, categories: [] };
  const c2paText = isRecord(result.provenance.c2pa_text) ? result.provenance.c2pa_text : null;
  const c2paFiles = Array.isArray(result.provenance.c2pa_files) ? result.provenance.c2pa_files : [];
  const report = isRecord(result.exports.report) ? result.exports.report : {};

  const meaning = assessed
    ? level.meaning
    : `No trained model reading is available for this run. ${text(ai.reason, 'The model did not assess this text.')}`;

  const strongestSentence = assessed && strongest
    ? `The strongest evidence is in section ${strongest.number} of ${sections.length}, which scored ${strongest.displayScore} and sits in the ${strongest.level.label} band.`
    : null;

  return Object.freeze({
    productName: PRODUCT_NAME,
    productUrl: text(options.productUrl, text(report.support_destination, DEFAULT_PRODUCT_URL)),
    surfaceName: text(options.surfaceName, 'Opace AI Content Checker & Detector'),
    title: text(options.title, 'AI content integrity report'),
    strapline: 'Evidence, not guarantees',
    honestyLine: HONESTY_LINE,
    generatedAt,
    dateLabel: dateLabel(generatedAt),
    resultId: text(result.result_id, 'not recorded'),
    profile: text(result.profile, 'not recorded'),
    assessed,
    level,
    displayScore: assessed ? text(ai.display_score, 'not recorded') : null,
    scoreScale: 'Zero-to-one pattern similarity. This is not a percentage of AI-written text.',
    meaning,
    strongestSentence,
    modelReason: text(ai.reason, ''),
    gauge: Object.freeze({
      position: level.index < 0 ? 0.5 : (level.index + 0.5) / LEVEL_ORDER.length,
      bands: Object.freeze(LEVEL_ORDER.map((id) => Object.freeze({ id, label: labels[id] ?? LEVEL_LABELS[id], colour: LEVEL_COLOURS[id], current: id === level.id }))),
    }),
    axes: axesView(result),
    draft: Object.freeze({
      words: number(result.source.word_count),
      characters: number(result.source.character_count),
      wordsPhrase: countPhrase(result.source.word_count, 'word'),
      charactersPhrase: countPhrase(result.source.character_count, 'character'),
      sectionCount: Number.isFinite(result.source.section_count) ? result.source.section_count : sections.length,
      sectionsPhrase: countPhrase(
        Number.isFinite(result.source.section_count) ? result.source.section_count : sections.length,
        'section'
      ),
      language: text(result.source.language, 'not recorded'),
      contentType: humanise(result.source.content_type),
      contentHash: text(result.source.content_hash, 'not recorded'),
      normalisedHash: text(result.source.normalised_hash, 'not recorded'),
    }),
    route,
    sections,
    strongest,
    characterFindings: Object.freeze(
      (Array.isArray(result.axes.text_integrity.findings) ? result.axes.text_integrity.findings : []).map(describeValue)
    ),
    writingFindings: Object.freeze(
      (Array.isArray(result.axes.editorial.findings) ? result.axes.editorial.findings : []).map(describeValue)
    ),
    protectedFacts: (() => {
      const count = Number.isFinite(protectedFacts.count) ? protectedFacts.count : 0;
      const categories = list(protectedFacts.categories);
      return Object.freeze({
        count,
        categories: Object.freeze(categories),
        phrase: countPhrase(count, 'protected item'),
        sentence: count === 0
          ? 'No protected items were identified in this draft.'
          : `${countPhrase(count, 'protected item')} ${pluralise(count, 'was', 'were')} identified and left untouched.`,
        categoriesSentence: categories.length
          ? `${pluralise(categories.length, 'Category', 'Categories')}: ${categories.map(humanise).join(', ')}.`
          : 'No categories were recorded.',
      });
    })(),
    c2paText: c2paText
      ? Object.freeze({
          status: humanise(c2paText.status),
          wrapperProtected: c2paText.wrapper_protected === true,
          limitations: Object.freeze(list(c2paText.limitations)),
        })
      : null,
    c2paFiles: Object.freeze(
      c2paFiles.map((file, index) =>
        Object.freeze({
          label: `File Content Credentials ${index + 1}`,
          status: humanise(file.status),
          trust: humanise(file.trust),
          mediaType: text(file.media_type, 'not recorded'),
          fileHash: text(file.file_hash, 'not recorded'),
          limitations: Object.freeze(list(file.limitations)),
        })
      )
    ),
    watermarks: watermarkView(result),
    methods: methodsView(result),
    methodsPhrase: countPhrase(result.methods.length, 'named check'),
    meansPanel: Object.freeze({
      meansTitle: 'What this means',
      means: Object.freeze(
        assessed
          ? [
              'Parts of the writing match patterns that are common in AI text.',
              'The marked sections carry the strongest match and are worth a careful read.',
              'Every other check on this page reports separately and did not change that reading.',
            ]
          : [
              'No trained model reading is available for this run.',
              'The deterministic checks below still report exactly what they found.',
            ]
      ),
      notTitle: 'What this does not mean',
      not: Object.freeze([
        'It does not prove who wrote the draft.',
        'It says nothing about whether the content is accurate or good.',
        'Human writing polished with an AI tool is deliberately not flagged.',
      ]),
    }),
    correctUse: Object.freeze([
      'The AI-pattern reading is statistical and can be wrong. Read the marked sections before you act on it.',
      'The score is a position on a zero-to-one pattern-similarity scale. It is not the percentage of the draft written by AI.',
      'Character checks and writing suggestions are separate readings. Neither can raise or lower the AI-pattern reading.',
      'Content Credentials describe how a file was made and edited. Their absence proves nothing about authorship.',
      'A public watermark-key check cannot clear or accuse a private provider key.',
    ]),
    /** PDF-only note about the built-in core fonts. The HTML report has no such constraint. */
    pdfCharacterNote:
      'This PDF uses the built-in WinAnsi character set. Anything outside it is printed as an explicit U+ code-point label rather than an ambiguous question mark.',
    limitations: Object.freeze(
      unique([
        ...list(result.limitations),
        ...list(result.axes.ai_pattern.limitations),
        ...list(result.axes.text_integrity.limitations),
        ...list(result.axes.editorial.limitations),
        ...watermarkView(result).flatMap((item) => item.limitations),
        'No result proves authorship.',
      ])
    ),
    runRecord: Object.freeze([
      Object.freeze(['Result ID', text(result.result_id, 'not recorded')]),
      Object.freeze(['Created', dateLabel(generatedAt)]),
      Object.freeze(['Contract', `Schema ${text(result.schema_version, '?')}, contract ${text(result.contract_version, '?')}`]),
      Object.freeze(['Profile', humanise(result.profile)]),
      Object.freeze(['Route', `${route.kind}: ${route.name}`]),
      Object.freeze(['Consent', route.consent]),
      Object.freeze(['Model', route.modelIdentity]),
      Object.freeze(['Contracts', route.contracts]),
      Object.freeze(['Flag rule', route.flagRule]),
      Object.freeze(['Model artefact hash', route.artefactHash]),
      Object.freeze(['Source hash', text(result.source.content_hash, 'not recorded')]),
      Object.freeze(['Normalised hash', text(result.source.normalised_hash, 'not recorded')]),
      Object.freeze(['Privacy', route.privacy]),
      Object.freeze(['Support', text(options.productUrl, text(report.support_destination, DEFAULT_PRODUCT_URL))]),
    ]),
  });
}
