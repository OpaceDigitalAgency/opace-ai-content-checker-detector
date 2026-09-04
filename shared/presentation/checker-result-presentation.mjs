export const CHECKER_LEVEL_LABELS = Object.freeze({
  'signal-strongly-ai': 'Strongly AI',
  'signal-likely-ai': 'Likely AI',
  'signal-potentially-ai': 'Potentially AI',
  'signal-unclear': 'Unclear',
  'signal-likely-human': 'Likely human',
});

export const PRODUCT_MARK_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g fill="none" stroke="#1ed3ee" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"><rect x="7" y="5" width="35" height="45" rx="5"/><rect x="12" y="12" width="8" height="8" rx="1"/><path d="M25 15h11M25 19h9"/><rect x="12" y="26" width="8" height="8" rx="1"/><path d="M25 29h11M25 33h9"/><rect x="12" y="40" width="8" height="8" rx="1"/><path d="M25 43h8M42 16h6M42 30h6M42 44h6M51 9v39"/><circle cx="51" cy="16" r="4"/><circle cx="51" cy="30" r="4"/><circle cx="51" cy="44" r="4"/></g><g fill="none" stroke="#ff9f2f" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"><rect x="31" y="38" width="27" height="20" rx="4"/><path d="m39 48 4 4 8-9"/></g></svg>';

const LEVEL_IDS = new Set(Object.keys(CHECKER_LEVEL_LABELS));
const METHOD_STATE_LABEL = Object.freeze({
  pass: 'No issue found',
  attention: 'Review evidence',
  fail: 'Failed',
  inconclusive: 'Inconclusive',
  unsupported: 'Unavailable',
  not_configured: 'Not configured',
  not_run: 'Not run',
  error: 'Error',
});

const asRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
const cleanText = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const unique = (values) => [...new Set(values.filter((value) => typeof value === 'string' && value.trim()))];

function assertCanonicalResult(result) {
  if (!asRecord(result) || result.schema_version !== '1.0' || !String(result.contract_version).startsWith('1.')) throw new Error('checker_result_contract_invalid');
  if (!['full_checker', 'primitive'].includes(result.profile)) throw new Error('checker_result_profile_invalid');
  if (!asRecord(result.source) || !asRecord(result.route) || !asRecord(result.axes)) throw new Error('checker_result_structure_invalid');
  if (!asRecord(result.provenance) || !asRecord(result.provenance.protected_facts) || !asRecord(result.exports) || !asRecord(result.exports.report) || !asRecord(result.abuse_controls)) {
    throw new Error('checker_result_supporting_contract_invalid');
  }
  const ai = asRecord(result.axes.ai_pattern);
  const integrity = asRecord(result.axes.text_integrity);
  const editorial = asRecord(result.axes.editorial);
  if (!ai || !integrity || !editorial || !Array.isArray(result.sections) || !Array.isArray(result.methods)) throw new Error('checker_result_axes_invalid');
  if (ai.assessment_status === 'assessed') {
    if (!asRecord(result.route.model) || typeof ai.raw_margin !== 'number' || !Number.isFinite(ai.raw_margin) || typeof ai.display_score !== 'string' || !/^(?:0(?:\.[0-9]+)?|1(?:\.0+)?)$/u.test(ai.display_score) || !LEVEL_IDS.has(ai.level) || !Number.isInteger(ai.strongest_section_index)) {
      throw new Error('checker_result_assessed_identity_invalid');
    }
    if (!result.sections.length) throw new Error('checker_result_assessed_sections_required');
    result.sections.forEach((section, position) => {
      if (!asRecord(section) || section.index !== position || typeof section.raw_margin !== 'number' || !Number.isFinite(section.raw_margin) || typeof section.display_score !== 'string' || !/^(?:0(?:\.[0-9]+)?|1(?:\.0+)?)$/u.test(section.display_score) || !LEVEL_IDS.has(section.level)) {
        throw new Error('checker_result_section_contract_invalid');
      }
    });
    if (!result.sections.some((section) => section.index === ai.strongest_section_index)) throw new Error('checker_result_strongest_section_invalid');
    if (result.profile === 'full_checker' && (!result.exports.report.available || !result.exports.report.complete_evidence)) throw new Error('checker_result_full_report_required');
  } else if (ai.assessment_status === 'not_assessed' || ai.assessment_status === 'withheld' || ai.assessment_status === 'error') {
    if (ai.raw_score !== null || ai.raw_margin !== null || ai.display_score !== null || ai.level !== null || ai.strongest_section_index !== null) {
      throw new Error('checker_result_unassessed_score_forbidden');
    }
    if (result.sections.length) throw new Error('checker_result_unassessed_sections_forbidden');
  } else {
    throw new Error('checker_result_assessment_status_invalid');
  }
}

function legacyCombined(result) {
  const combined = asRecord(result.combined_verdict);
  const integrity = asRecord(combined?.text_integrity);
  const editorial = asRecord(combined?.editorial);
  return {
    integrity: {
      reading: ['clean', 'attention', 'manipulated'].includes(integrity?.status) ? integrity.status : 'inconclusive',
      reason: cleanText(integrity?.reason, 'No combined text-integrity reading was supplied.'),
      findings: Array.isArray(integrity?.findings) ? integrity.findings : [],
    },
    editorial: {
      reading: ['none', 'some', 'many'].includes(editorial?.suggestion_level) ? editorial.suggestion_level : 'not_assessed',
      reason: cleanText(editorial?.reason, 'No combined editorial reading was supplied.'),
      findings: Array.isArray(editorial?.categories_hit) ? editorial.categories_hit.map((category) => ({ category })) : [],
    },
  };
}

export function adaptLegacyAnalysisResult(result, options) {
  if (!asRecord(result) || result.schema_version !== '1.0' || !asRecord(result.source) || !Array.isArray(result.methods)) throw new Error('legacy_analysis_result_invalid');
  // Any named surface. The old two-item allow-list locked WordPress and the CLI
  // out of a component that has nothing surface-specific in it (Lane A request,
  // 2 September 2026); what still has to be true is that the surface is named.
  if (!asRecord(options) || !cleanText(options.surface, '')) throw new Error('legacy_surface_invalid');
  const combined = legacyCombined(result);
  const limitations = unique([
    ...(Array.isArray(result.limitations) ? result.limitations : []),
    'No trained model ran on this text, so the AI-pattern reading is not assessed.',
    'This reduced deterministic result is not full-checker parity.',
    'No result proves authorship.',
  ]);
  const watermarkMethods = result.methods.filter((method) => method.id?.startsWith('watermark.'));
  const checkerResult = {
    schema_version: '1.0',
    contract_version: String(result.contract_version ?? '1.0.0'),
    result_id: cleanText(result.analysis_id, cleanText(result.request_id, 'legacy-result')),
    profile: 'primitive',
    generated_at: cleanText(result.completed_at, new Date(0).toISOString()),
    contains_content: false,
    source: {
      content_hash: cleanText(result.source.content_hash, 'sha256:unknown'),
      normalised_hash: cleanText(result.source.normalised_hash, cleanText(result.source.content_hash, 'sha256:unknown')),
      content_type: result.source.content_type ?? 'plain_text',
      language: cleanText(result.source.language, 'en-GB'),
      word_count: Number.isInteger(result.source.word_count) ? result.source.word_count : 0,
      character_count: Number.isInteger(options.characterCount) ? options.characterCount : 0,
      section_count: 0,
    },
    route: {
      kind: 'deterministic_only',
      location: `${options.surface} browser Worker`,
      content_transfer: 'none',
      privacy_route: 'browser',
      retention: { source: 'none', result: 'none', statement: 'Source and result stay in memory for the active view only.' },
      consent: 'not_required',
      model: null,
      transport: { endpoint_class: 'none', region: null, requests: 0, words_sent: 0, processed: 'in browser', retained: 'not retained' },
    },
    axes: {
      ai_pattern: {
        assessment_status: 'not_assessed', method_status: 'not_run', source: null, raw_score: null, raw_margin: null, display_score: null,
        score_scale: 'zero_to_one_pattern_similarity', level: null, primary_display_threshold: null, secondary_display_threshold: null,
        flagged: null, flag_reason: null, strongest_section_index: null,
        reason: 'No trained model ran on this text, so no AI-pattern reading is available.',
        limitations: ['Character findings and writing rules cannot supply an AI-pattern reading.'],
      },
      text_integrity: {
        method_status: combined.integrity.reading === 'clean' ? 'pass' : combined.integrity.reading === 'inconclusive' ? 'inconclusive' : 'attention',
        reading: combined.integrity.reading,
        reason: combined.integrity.reason,
        findings: combined.integrity.findings,
        limitations,
      },
      editorial: {
        method_status: combined.editorial.reading === 'none' ? 'pass' : combined.editorial.reading === 'not_assessed' ? 'not_run' : 'attention',
        reading: combined.editorial.reading,
        reason: combined.editorial.reason,
        findings: combined.editorial.findings,
        limitations,
      },
    },
    sections: [],
    methods: result.methods,
    provenance: {
      protected_facts: {
        count: Array.isArray(result.protected_spans) ? result.protected_spans.length : 0,
        categories: unique(Array.isArray(result.protected_spans) ? result.protected_spans.map((span) => span.kind) : []),
      },
      c2pa_text: { status: 'not_run', wrapper_protected: true, limitations: ['C2PA text verification did not run in this deterministic browser route.'] },
      c2pa_files: [],
      watermarks: watermarkMethods.map((method) => ({
        method_id: method.id,
        method_status: method.status,
        key_scope: 'none',
        outcome: method.native_outcome ?? (method.status === 'unsupported' ? 'not_available' : 'not_run'),
        limitations: method.limitations,
      })),
      safe_fixes: { preview_first: true, explicit_approval_required: true, automatic_homoglyph_replacement: false, c2pa_wrapper_protected: true },
    },
    exports: {
      receipt: { available: true, contains_content: false, canonicalisation: 'none', payload_hash: null },
      share: { available: false, contains_content: false, payload: null },
      report: { available: false, format: 'none', contains_content: false, explicit_user_action: true, complete_evidence: false, product_identity: 'Opace AI Content Checker & Detector', support_destination: 'https://opace.agency/tools/ai/content-verification-integrity/' },
    },
    abuse_controls: {
      max_words: null,
      max_characters: options.maxCharacters,
      max_request_bytes: null,
      explicit_capture: 'enforced',
      consent_before_transfer: 'not_applicable',
      refuse_not_truncate: options.refuseNotTruncate ? 'enforced' : 'not_configured',
      cancellation: 'enforced',
      channel_authentication: 'not_applicable',
      proof_of_work: 'not_applicable',
      origin_validation: 'not_applicable',
      per_ip_limit: 'not_applicable',
      per_site_limit: 'not_applicable',
      per_connection_limit: 'not_applicable',
      global_inference_limit: 'not_applicable',
      request_body_logging: 'not_applicable',
      unexpected_network_requests: 'blocked',
      fallback: 'not_configured',
      kill_switch: 'not_applicable',
    },
    limitations,
  };
  assertCanonicalResult(checkerResult);
  return checkerResult;
}

function axisPresentation(result) {
  const ai = result.axes.ai_pattern;
  const integrity = result.axes.text_integrity;
  const editorial = result.axes.editorial;
  const editorialNames = { none: 'No suggestions', some: 'Some suggestions', many: 'Many suggestions', not_assessed: 'Not assessed', error: 'Error' };
  const integrityNames = { clean: 'Clean', attention: 'Review', manipulated: 'Manipulation found', inconclusive: 'Inconclusive', error: 'Error' };
  return [
    { id: 'ai', label: 'AI-pattern reading', value: ai.level ? CHECKER_LEVEL_LABELS[ai.level] : 'Not assessed', state: ai.assessment_status, detail: ai.reason },
    { id: 'integrity', label: 'Text integrity', value: integrityNames[integrity.reading] ?? 'Not assessed', state: integrity.reading, detail: integrity.reason },
    { id: 'editorial', label: 'Editorial signals', value: editorialNames[editorial.reading] ?? 'Not assessed', state: editorial.reading, detail: editorial.reason },
  ];
}

export function buildResultPresentation(result, options) {
  assertCanonicalResult(result);
  if (!asRecord(options) || !cleanText(options.surface, '')) throw new Error('result_surface_invalid');
  if (typeof options.brandAssetUrl !== 'string' || !options.brandAssetUrl.trim()) throw new Error('result_brand_asset_required');
  return {
    result,
    surface: options.surface,
    brandAssetUrl: options.brandAssetUrl,
    axes: axisPresentation(result),
    methods: result.methods.map((method) => ({
      id: method.id,
      name: method.id === 'watermark.anthropic' ? 'Anthropic official watermark verifier' : method.provider_or_method,
      version: method.version,
      status: METHOD_STATE_LABEL[method.status] ?? String(method.status).replaceAll('_', ' '),
      route: String(method.privacy_route).replaceAll('_', ' '),
      limitation: method.limitations[0],
    })),
    limitations: unique([...result.limitations, 'No result proves authorship.']),
  };
}

export function escapeResultHtml(value) {
  return String(value).replace(/[&<>"']/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function levelClass(level) {
  if (level === 'signal-likely-human') return 'human';
  if (level === 'signal-unclear') return 'uncertain';
  return 'ai';
}

function renderEvidence(section) {
  const items = section.evidence.map((item) => `<li><strong>${escapeResultHtml(item.summary)}</strong>${item.detail ? `<span>${escapeResultHtml(item.detail)}</span>` : ''}${item.basis ? `<small>${escapeResultHtml(item.basis)}</small>` : ''}</li>`).join('');
  return items ? `<ul class="oaci-result-evidence">${items}</ul>` : '<p>No section evidence was supplied.</p>';
}

function renderModelEvidence(presentation) {
  const { result } = presentation;
  const ai = result.axes.ai_pattern;
  if (ai.assessment_status !== 'assessed') {
    return `<section class="oaci-result-empty" data-model-status="${escapeResultHtml(ai.assessment_status)}"><p class="oaci-result-kicker">Section evidence</p><h3>No trained model ran</h3><p>${escapeResultHtml(ai.reason)}</p><p class="oaci-result-boundary">Character and writing-pattern findings cannot fill this gap.</p></section>`;
  }
  return `<section class="oaci-result-sections" aria-labelledby="oaci-section-evidence"><div class="oaci-result-section-head"><div><p class="oaci-result-kicker">Model evidence</p><h3 id="oaci-section-evidence">Why it reads this way</h3></div><p>${escapeResultHtml(result.route.location)} · ${escapeResultHtml(result.route.model.identity)} · ${escapeResultHtml(result.route.model.precision)}</p></div>${renderSectionStrip(result)}<ol>${result.sections.map((section) => `<li id="oaci-section-${section.index + 1}" tabindex="-1" class="oaci-result-section oaci-result-section--${levelClass(section.level)}"${section.index === ai.strongest_section_index ? ' data-strongest="true"' : ''}><div class="oaci-result-section-score"><span>Section ${section.index + 1} · ${section.word_count} words</span><strong data-section-score="${escapeResultHtml(section.display_score)}">${escapeResultHtml(section.display_score)}</strong><b>${escapeResultHtml(CHECKER_LEVEL_LABELS[section.level])}</b></div>${section.passage ? `<blockquote>${escapeResultHtml(section.passage)}</blockquote>` : `<p>Content-free locator: UTF-16 ${section.start_utf16}–${section.end_utf16}</p>`}${renderEvidence(section)}${section.index === ai.strongest_section_index ? '<em>The strongest passage shaped the result.</em>' : ''}</li>`).join('')}</ol></section>`;
}

function renderGauge(result) {
  const ai = result.axes.ai_pattern;
  const assessed = ai.assessment_status === 'assessed';
  const semanticPosition = { 'signal-likely-human': 10, 'signal-unclear': 30, 'signal-potentially-ai': 50, 'signal-likely-ai': 70, 'signal-strongly-ai': 90 };
  const position = assessed ? semanticPosition[ai.level] : 50;
  const reading = assessed ? `${ai.display_score} · ${CHECKER_LEVEL_LABELS[ai.level]}` : 'Not assessed';
  return `<section class="oaci-result-gauge" aria-label="AI-pattern five-band reading"><div class="oaci-result-gauge-head"><div><p class="oaci-result-kicker">AI-pattern scale</p><h3>Five-band model reading</h3></div><output>${escapeResultHtml(reading)}</output></div><div class="oaci-result-dial" role="img" aria-label="${escapeResultHtml(assessed ? `Model score ${ai.display_score}, ${CHECKER_LEVEL_LABELS[ai.level]}` : 'Model score not assessed')}" data-assessed="${assessed}"><span data-band="human">Likely human</span><span data-band="unclear">Unclear</span><span data-band="potential">Potentially AI</span><span data-band="likely">Likely AI</span><span data-band="strong">Strongly AI</span>${assessed ? `<i aria-hidden="true" style="--oaci-score:${position.toFixed(3)}%"></i>` : ''}</div></section>`;
}

function renderSectionStrip(result) {
  return `<nav class="oaci-result-strip" aria-label="Model-scored section map">${result.sections.map((section) => `<a href="#oaci-section-${section.index + 1}" data-level="${escapeResultHtml(section.level)}"${section.index === result.axes.ai_pattern.strongest_section_index ? ' aria-current="true"' : ''}><span>Section ${section.index + 1}</span><strong>${escapeResultHtml(section.display_score)}</strong><small>${escapeResultHtml(CHECKER_LEVEL_LABELS[section.level])}</small></a>`).join('')}</nav>`;
}

export function renderResultShell(presentation) {
  const { result } = presentation;
  const ai = result.axes.ai_pattern;
  const assessed = ai.assessment_status === 'assessed';
  const overall = assessed ? ai.display_score : '—';
  const modelIdentity = result.route.model ? `${result.route.location} · ${result.route.model.identity} · ${result.route.model.precision}` : `${result.route.location} · no trained model`;
  const report = result.exports.report;
  const mark = `<img src="${escapeResultHtml(presentation.brandAssetUrl)}" alt="" width="48" height="48">`;
  return `<article class="oaci-result-shell" data-oaci-result-shell data-result-status="${escapeResultHtml(ai.assessment_status)}" data-result-profile="${escapeResultHtml(result.profile)}">
    <header class="oaci-result-mast"><div class="oaci-result-brand"><span class="oaci-result-mark">${mark}</span><div><p class="oaci-result-kicker">Opace AI Content Checker &amp; Detector</p><h2>Evidence report</h2><p>${escapeResultHtml(result.source.word_count.toLocaleString('en-GB'))} words · ${escapeResultHtml(presentation.surface)}</p></div></div><div class="oaci-result-overall"><span>${assessed ? 'Model score' : 'Model status'}</span><strong>${escapeResultHtml(overall)}</strong><b>${escapeResultHtml(assessed ? CHECKER_LEVEL_LABELS[ai.level] : 'Not assessed')}</b></div></header>
    ${renderGauge(result)}
    <div class="oaci-result-spine" aria-label="Three independent readings">${presentation.axes.map((axis) => `<section data-axis="${axis.id}" data-state="${escapeResultHtml(axis.state)}"><p>${escapeResultHtml(axis.label)}</p><h3>${escapeResultHtml(axis.value)}</h3><span>${escapeResultHtml(axis.detail)}</span></section>`).join('')}</div>
    ${renderModelEvidence(presentation)}
    <details class="oaci-result-ledger" open><summary>Named checks and limitations</summary><ul>${presentation.methods.map((method) => `<li data-method="${escapeResultHtml(method.id)}"><div><strong>${escapeResultHtml(method.name)}</strong><span>${escapeResultHtml(method.id)} · ${escapeResultHtml(method.version)}</span></div><b>${escapeResultHtml(method.status)}</b><p>${escapeResultHtml(method.limitation)}</p><small>${escapeResultHtml(method.route)} route</small></li>`).join('')}</ul></details>
    <section class="oaci-result-run"><div><p class="oaci-result-kicker">Run record</p><h3>${escapeResultHtml(modelIdentity)}</h3><span>Result ${escapeResultHtml(result.result_id)} · ${result.provenance.protected_facts.count} protected fact${result.provenance.protected_facts.count === 1 ? '' : 's'}</span><span>Report export: ${report.available && report.complete_evidence ? `${report.format}, complete evidence` : 'not available in this result'}</span></div><ul>${presentation.limitations.map((limitation) => `<li>${escapeResultHtml(limitation)}</li>`).join('')}</ul></section>
  </article>`;
}

export const RESULT_SHELL_CSS = `
.oaci-result-mark img{display:block;width:100%;height:100%;object-fit:cover}
.oaci-result-gauge{padding:14px;border:1px solid var(--oaci-line);background:var(--oaci-card)}.oaci-result-gauge-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:12px}.oaci-result-gauge-head h3{margin:0!important;color:var(--oaci-ink)!important;font:700 18px/1.18 Georgia,serif!important}.oaci-result-gauge-head output{color:var(--oaci-ink);font-weight:850}.oaci-result-dial{position:relative;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));padding-top:17px}.oaci-result-dial>span{min-width:0;padding:7px 3px;border-top:8px solid;text-align:center;color:#333;font-size:8px;font-weight:800;line-height:1.25}.oaci-result-dial>[data-band=human]{border-color:#24714a}.oaci-result-dial>[data-band=unclear]{border-color:#1b65a6}.oaci-result-dial>[data-band=potential]{border-color:#c49b22}.oaci-result-dial>[data-band=likely]{border-color:#d66a20}.oaci-result-dial>[data-band=strong]{border-color:#a63c23}.oaci-result-dial>i{position:absolute;top:0;left:var(--oaci-score);width:2px;height:28px;background:var(--oaci-ink);transform:translateX(-1px)}.oaci-result-dial>i:before{position:absolute;top:0;left:50%;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:var(--oaci-ink);content:"";transform:translate(-50%,-1px)}.oaci-result-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:6px;margin:0 0 12px}.oaci-result-strip a{display:grid;gap:2px;min-width:0;padding:8px;border:1px solid var(--oaci-line);border-top:4px solid var(--oaci-blue);background:var(--oaci-paper);color:var(--oaci-ink);text-decoration:none}.oaci-result-strip a[data-level="signal-strongly-ai"],.oaci-result-strip a[data-level="signal-likely-ai"]{border-top-color:var(--oaci-orange)}.oaci-result-strip a[data-level="signal-likely-human"]{border-top-color:var(--oaci-green)}.oaci-result-strip a[aria-current=true]{box-shadow:inset 0 0 0 2px var(--oaci-ink)}.oaci-result-strip a:focus-visible{outline:3px solid var(--oaci-blue);outline-offset:2px}.oaci-result-strip span,.oaci-result-strip small{font-size:9px}.oaci-result-strip strong{font:700 17px/1 Georgia,serif}.oaci-result-section:focus{outline:3px solid var(--oaci-blue);outline-offset:2px}
.oaci-result-shell{--oaci-ink:#111415;--oaci-paper:#f4efe8;--oaci-card:#fffdf9;--oaci-line:#d4cdc3;--oaci-orange:#fb700a;--oaci-blue:#1b65a6;--oaci-green:#24714a;display:grid;gap:12px;margin:16px 0;color:var(--oaci-ink);font:13px/1.48 Inter,ui-sans-serif,system-ui,sans-serif}.oaci-result-shell *{box-sizing:border-box}.oaci-result-mast{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:start;padding:16px;border-bottom:4px solid var(--oaci-orange);background:var(--oaci-ink);color:#fff}.oaci-result-brand{display:flex;align-items:flex-start;gap:11px;min-width:0}.oaci-result-mark{flex:0 0 48px;width:48px;height:48px}.oaci-result-mark svg{display:block;width:100%;height:100%}.oaci-result-kicker{margin:0 0 4px!important;color:#aa3f08!important;font-size:10px!important;font-weight:850!important;letter-spacing:.13em;text-transform:uppercase}.oaci-result-mast .oaci-result-kicker{color:#ffad7b!important}.oaci-result-mast h2{margin:0!important;color:#fff!important;font:700 24px/1.08 Georgia,serif!important}.oaci-result-mast p{margin:5px 0 0!important;color:#c9cecd!important;font-size:11px!important}.oaci-result-overall{min-width:92px;padding-left:12px;border-left:1px solid #4e5657;text-align:right}.oaci-result-overall span,.oaci-result-overall b{display:block;color:#c9cecd;font-size:9px;letter-spacing:.08em;text-transform:uppercase}.oaci-result-overall strong{display:block;color:#ffad7b;font:700 28px/1.05 Georgia,serif}.oaci-result-overall b{margin-top:3px;color:#fff}.oaci-result-spine{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.oaci-result-spine section{min-width:0;padding:11px;border:1px solid var(--oaci-line);border-top:4px solid var(--oaci-blue);background:var(--oaci-card)}.oaci-result-spine section[data-axis=integrity]{border-top-color:var(--oaci-orange)}.oaci-result-spine section[data-axis=editorial]{border-top-color:var(--oaci-green)}.oaci-result-spine p{margin:0!important;color:#5f605e!important;font-size:9px!important;font-weight:800!important;letter-spacing:.08em;text-transform:uppercase}.oaci-result-spine h3{margin:5px 0!important;color:var(--oaci-ink)!important;font:700 17px/1.12 Georgia,serif!important}.oaci-result-spine span{display:block;color:#5f605e;font-size:10px;line-height:1.4}.oaci-result-empty,.oaci-result-sections,.oaci-result-run{padding:14px;border:1px solid var(--oaci-line);background:var(--oaci-card)}.oaci-result-empty{border-left:4px solid var(--oaci-blue)}.oaci-result-empty h3,.oaci-result-section-head h3,.oaci-result-run h3{margin:0!important;color:var(--oaci-ink)!important;font:700 18px/1.18 Georgia,serif!important}.oaci-result-empty>p:not(.oaci-result-kicker){margin:7px 0 0!important;color:#494b4a!important}.oaci-result-empty .oaci-result-boundary{font-size:11px!important;font-weight:750}.oaci-result-section-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:10px}.oaci-result-section-head>p{max-width:48%;margin:0!important;color:#5f605e!important;font-size:10px!important;text-align:right}.oaci-result-sections ol{display:grid;gap:9px;margin:0;padding:0;list-style:none}.oaci-result-section{padding:12px;border:1px solid var(--oaci-line);border-left:4px solid var(--oaci-orange);background:#fff}.oaci-result-section--human{border-left-color:var(--oaci-green)}.oaci-result-section--uncertain{border-left-color:var(--oaci-blue)}.oaci-result-section[data-strongest=true]{box-shadow:inset 0 0 0 1px var(--oaci-ink)}.oaci-result-section-score{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;align-items:baseline}.oaci-result-section-score span{color:#5f605e;font-size:10px;font-weight:750;text-transform:uppercase}.oaci-result-section-score strong{grid-row:1/3;grid-column:2;color:var(--oaci-ink);font:700 24px/1 Georgia,serif}.oaci-result-section-score b{color:#70300f;font-size:11px}.oaci-result-section--human .oaci-result-section-score b{color:var(--oaci-green)}.oaci-result-section blockquote{margin:10px 0 7px;padding:9px 10px;border-left:2px solid var(--oaci-line);background:var(--oaci-paper);color:#292b2a;font:italic 13px/1.5 Georgia,serif}.oaci-result-evidence{margin:7px 0 0;padding:0;list-style:none}.oaci-result-evidence li{display:grid;gap:2px;padding-top:6px;color:#4e504f;font-size:11px}.oaci-result-evidence span,.oaci-result-evidence small{display:block;color:#656765}.oaci-result-section em{display:block;margin-top:7px;color:#70300f;font-size:10px;font-style:normal;font-weight:800;text-transform:uppercase}.oaci-result-ledger{border:1px solid var(--oaci-line);background:var(--oaci-card)}.oaci-result-ledger summary{padding:12px!important;color:var(--oaci-ink)!important;font-weight:800;cursor:pointer}.oaci-result-ledger ul{margin:0;padding:0 12px 12px;list-style:none}.oaci-result-ledger li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 9px;padding:10px 0;border-top:1px solid #e3ddd5}.oaci-result-ledger li div span{display:block;color:#686967;font-size:9px;overflow-wrap:anywhere}.oaci-result-ledger li>b{color:#70300f;font-size:9px;letter-spacing:.05em;text-align:right;text-transform:uppercase}.oaci-result-ledger li p{grid-column:1/-1;margin:0!important;color:#545655!important;font-size:10px!important}.oaci-result-ledger li small{grid-column:1/-1;color:#686967;font-size:9px;text-transform:uppercase}.oaci-result-run{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:13px;border-left:4px solid var(--oaci-orange);background:var(--oaci-paper)}.oaci-result-run h3{overflow-wrap:anywhere;font-size:15px!important}.oaci-result-run span{display:block;margin-top:5px;color:#5f605e;font-size:10px;overflow-wrap:anywhere}.oaci-result-run ul{margin:0;padding-left:18px;color:#494b4a;font-size:10px}.oaci-result-run li+li{margin-top:4px}@media(max-width:420px){.oaci-result-mast,.oaci-result-run{grid-template-columns:1fr}.oaci-result-overall{padding:9px 0 0;border-top:1px solid #4e5657;border-left:0;text-align:left}.oaci-result-spine{grid-template-columns:1fr}.oaci-result-section-head{align-items:start;flex-direction:column}.oaci-result-section-head>p{max-width:none;text-align:left}.oaci-result-mark{flex-basis:42px;width:42px;height:42px}}@media(forced-colors:active){.oaci-result-mast,.oaci-result-spine section,.oaci-result-empty,.oaci-result-sections,.oaci-result-section,.oaci-result-ledger,.oaci-result-run{border:2px solid CanvasText}.oaci-result-kicker,.oaci-result-overall strong{color:CanvasText!important}}
`;

/* ==========================================================================
   Website-grade result presentation (Lane D1, 2 September 2026)

   Everything above this line is the earlier Chrome/Astro shell and stays
   byte-for-byte compatible with its consumers. Everything below renders the
   canonical checker-result contract the way the web checker does: masthead,
   five-band dial, headline level, section score bars, per-section deep dives
   with the measured word re-use signal, three axes, named checks, the
   means/does-not-mean panel, the certainty disclosure and the run record.

   Companion stylesheet: shared/presentation/checker-ui.css (mirrored as a
   string in shared/presentation/checker-ui-css.mjs).

   Rules this renderer keeps:
     - `display_score` strings come from the contract verbatim. Nothing here
       rounds, reformats or re-derives a score.
     - A level is never inferred from a score. `level` is read from the
       contract and only mapped to a label and a colour.
     - Section numbers are `index + 1`, in the view only.
     - Every interpolated string passes through `escapeResultHtml`.
     - Withheld, error, too-short, not-run and not-assessed states render as
       themselves. None of them is ever drawn as a pass or as a low score.
   ========================================================================== */

/**
 * The product logo, 96x96, embedded so no surface needs a network request or a
 * packaged file path.
 *
 * Source: docs/assets/opace-ai-content-integrity-logo-v2.png
 * Source SHA-256: 9117f9d4527b103f8d527b9edf297b0b32876c293a0ce27983dee4bc557c1f74
 * Produced with sharp 0.34 (extensions/chrome/node_modules/sharp):
 *   sharp(src).resize(96, 96, {fit: 'contain', background: transparent})
 *             .png({compressionLevel: 9, palette: true})
 * Resized PNG SHA-256: 67b6fb38e07b423576ebfc006ec2b19b7e6f128b160d6640dffb8d01cbc853a7
 */
export const PRODUCT_LOGO_DATA_URI = 'data:image/png;base64,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';

/** The product name and the honesty line, used by every surface. */
export const PRODUCT_NAME = 'Opace AI Content Checker & Detector';
export const PRODUCT_TAGLINE = 'Evidence, not guarantees';

/** The five bands in gauge order, low to high. The withheld state is not on the gauge. */
export const CHECKER_GAUGE_ORDER = Object.freeze([
  'signal-likely-human',
  'signal-unclear',
  'signal-potentially-ai',
  'signal-likely-ai',
  'signal-strongly-ai',
]);

/**
 * One plain sentence per level, saying what the reading means. These are the
 * accepted website sentences; a level's meaning must not drift between
 * surfaces.
 */
export const CHECKER_LEVEL_MEANINGS = Object.freeze({
  'signal-strongly-ai': 'This draft very strongly matches AI writing — the kind of match we rarely see in human work.',
  'signal-likely-ai': 'Much of this draft reads like AI writing.',
  'signal-potentially-ai': 'Parts of this draft resemble AI writing, but the match is not strong enough to be sure.',
  'signal-unclear': 'We cannot call this one either way. Some passages read slightly machine-like, but people write that way too.',
  'signal-likely-human': 'This reads like human writing. Nothing here matches the AI patterns we test for — though a heavily disguised AI draft can slip past any checker, ours included.',
});

/** The closed status vocabulary, in friendly words. Same values as the shell above: one vocabulary, not two. */
export const CHECKER_METHOD_STATUS_LABELS = METHOD_STATE_LABEL;

/**
 * Take a surface's own level vocabulary and use it instead of the built-in one.
 *
 * A surface that already holds the canonical levels in its runtime (the
 * WordPress plugin's `CHECKER_LEVELS`, the website's `SIGNAL_LEVELS`) should
 * pass them in rather than let two copies of the same five names drift apart.
 * Pass either `{'signal-likely-ai': 'Likely AI'}` or
 * `{'signal-likely-ai': {name, support}}`.
 *
 * It fails closed. All five scale ids must be present and named; the withheld
 * id may come along, and any other id is a mistake worth stopping for.
 */
export function resolveCheckerLevels(levels) {
  if (levels === undefined || levels === null) {
    return { labels: CHECKER_LEVEL_LABELS, meanings: CHECKER_LEVEL_MEANINGS };
  }
  const supplied = asRecord(levels);
  if (!supplied) throw new Error('checker_ui_levels_invalid');
  for (const id of Object.keys(supplied)) {
    if (!LEVEL_IDS.has(id) && id !== 'signal-withheld') throw new Error('checker_ui_levels_unknown_id');
  }
  const labels = {};
  const meanings = {};
  for (const id of Object.keys(CHECKER_LEVEL_LABELS)) {
    const entry = supplied[id];
    const record = asRecord(entry);
    const name = record ? cleanText(record.name ?? record.label, '') : cleanText(entry, '');
    if (!name) throw new Error('checker_ui_levels_incomplete');
    labels[id] = name;
    meanings[id] = record ? cleanText(record.support ?? record.meaning, CHECKER_LEVEL_MEANINGS[id]) : CHECKER_LEVEL_MEANINGS[id];
  }
  return { labels: Object.freeze(labels), meanings: Object.freeze(meanings) };
}

/** The two-column boundary panel. Fixed copy: it is what stops the result being over-read. */
export const CHECKER_MEANING_PANEL = Object.freeze({
  meansTitle: 'What this means',
  means: Object.freeze([
    'Parts of the writing match patterns common in AI text.',
    'The marked sections carry the strongest match and are worth a careful read.',
  ]),
  notTitle: 'What this does not mean',
  not: Object.freeze([
    'It does not prove who wrote the draft.',
    'It says nothing about whether the content is accurate or good.',
    'Human writing polished with an AI tool is deliberately not flagged.',
  ]),
});

/**
 * Reference points for the one measured passage signal, from the project's own
 * corpus (25,723 documents). They are printed beside the passage reading so the
 * number has somewhere to sit.
 */
export const OVERLAP_NORMS = Object.freeze({ machineMedian: 2.1, humanMedian: 6.3, corpus: '25,723 documents' });

const INTEGRITY_READINGS = Object.freeze({
  clean: 'Clean',
  attention: 'Review',
  manipulated: 'Planted pattern',
  inconclusive: 'No clear answer',
  error: 'Error',
});

const EDITORIAL_READINGS = Object.freeze({
  none: 'No patterns to review',
  some: 'A few patterns',
  many: 'Several patterns',
  not_assessed: 'Not assessed',
  error: 'Error',
});

const ROUTE_KIND_LABELS = Object.freeze({
  browser_model: 'On this device, in the browser',
  eu_server: 'Opace EU server',
  wordpress_same_site: 'This WordPress site',
  loopback_engine: 'Local engine on this machine',
  deterministic_only: 'Named rule checks only',
});

const TRANSFER_LABELS = Object.freeze({
  none: 'The text stayed on this device.',
  same_site: 'The text went to this site and nowhere else.',
  loopback: 'The text went to the local engine on this machine and nowhere else.',
  eu_server: 'The text was sent once to the Opace EU server for this request.',
});

/**
 * The route line, without saying the same name twice.
 *
 * `route.kind` gives a label and `route.location` gives a place, and the two
 * often start with the same words: "Opace EU server" and "Opace EU server,
 * europe-west1" printed together read as a stutter. When one contains the
 * other, the fuller of the two is the whole line.
 */
function routeLine(label, location) {
  const a = cleanText(label, '');
  const b = cleanText(location, '');
  if (!a) return b;
  if (!b) return a;
  const flat = (value) => value.toLowerCase().replace(/[^a-z0-9]+/gu, ' ').trim();
  const flatA = flat(a);
  const flatB = flat(b);
  if (flatB.startsWith(flatA) || flatB.includes(flatA)) return b;
  if (flatA.startsWith(flatB) || flatA.includes(flatB)) return a;
  return `${a} · ${b}`;
}

const CONSENT_LABELS = Object.freeze({
  not_required: 'No transfer, so no consent was needed.',
  explicit: 'You agreed to this route before the run.',
});

/* ---------------------------------------------------------------- helpers */

const escape = escapeResultHtml;

const safeId = (value) => String(value).replace(/[^A-Za-z0-9_-]/gu, '-');

const headingTag = (base, offset) => `h${Math.min(6, Math.max(1, base + offset))}`;

const countWord = (count, singular, plural) => `${count.toLocaleString('en-GB')} ${count === 1 ? singular : plural}`;

const isoDate = (value) => {
  const text = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})/u.exec(text);
  return match ? `${match[3]} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(match[2]) - 1]} ${match[1]}` : text;
};

/** Where the needle sits: the centre of the level's own band, never a point computed from the score. */
export function gaugePosition(level) {
  const index = CHECKER_GAUGE_ORDER.indexOf(level);
  if (index < 0) throw new Error('checker_result_level_not_on_gauge');
  return index * 20 + 10;
}

/* ------------------------------------------------- the measured passage signal */

const MEASURE_STOPWORDS = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'have', 'has', 'had', 'for', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'been', 'being', 'but', 'not', 'you', 'your', 'our', 'their', 'they', 'them', 'its', 'his', 'her', 'she', 'him', 'who', 'what', 'when', 'where', 'which', 'while', 'than', 'then', 'there', 'here', 'these', 'those', 'into', 'onto', 'over', 'under', 'about', 'after', 'before', 'between', 'through', 'also', 'more', 'most', 'some', 'such', 'only', 'just', 'very', 'each', 'other', 'any', 'all', 'one', 'two', 'how', 'why', 'out', 'off', 'own', 'same', 'too', 'did', 'does', 'doing', 'because', 'against', 'during', 'without', 'within', 'upon', 'among']);

const measureSentences = (text) => String(text)
  .split(/(?<=[.!?…])\s+/u)
  .map((part) => part.trim())
  .filter((part) => part.split(/\s+/u).length >= 3);

const measureContentWords = (sentence) => {
  const words = sentence.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  return new Set(words.filter((word) => word.length >= 4 && !MEASURE_STOPWORDS.has(word)));
};

const trimSentence = (sentence) => {
  const flat = sentence.replace(/\s+/gu, ' ').trim();
  return flat.length > 110 ? `${flat.slice(0, 110).trimEnd()}…` : flat;
};

/**
 * The one descriptive statistic the deep dive prints: the share of content
 * words repeated between neighbouring sentences.
 *
 * It is measured from the passage the contract supplied, it is descriptive
 * context, and it never sets or moves a level. A passage of fewer than three
 * usable sentences returns null and the meter is not drawn.
 */
export function measurePassageOverlap(passage) {
  const sentences = measureSentences(passage ?? '');
  if (sentences.length < 3) return null;
  const sets = sentences.map(measureContentWords);
  let shared = 0;
  let pairs = 0;
  let worst = null;
  for (let index = 0; index < sets.length - 1; index += 1) {
    const a = sets[index];
    const b = sets[index + 1];
    if (!a.size || !b.size) continue;
    const common = [];
    for (const word of a) if (b.has(word)) common.push(word);
    const ratio = common.length / ((a.size + b.size) / 2);
    shared += ratio;
    pairs += 1;
    if (worst === null || ratio < worst.ratio) worst = { ratio, index, common };
  }
  const lengths = sentences.map((sentence) => sentence.split(/\s+/u).length);
  let run = 1;
  let longestRun = 1;
  for (let index = 1; index < lengths.length; index += 1) {
    if (Math.abs(lengths[index] - lengths[index - 1]) <= 3) run += 1; else run = 1;
    if (run > longestRun) longestRun = run;
  }
  const evenRun = longestRun >= 4 ? longestRun : null;
  if (!pairs || worst === null) return null;
  return {
    label: 'Word re-use between neighbouring sentences',
    unit: '%',
    value: Math.round((shared / pairs) * 1000) / 10,
    scaleMax: 10,
    machineMedian: OVERLAP_NORMS.machineMedian,
    humanMedian: OVERLAP_NORMS.humanMedian,
    evenRun,
    leastConnected: {
      first: trimSentence(sentences[worst.index]),
      second: trimSentence(sentences[worst.index + 1]),
      sharedWords: worst.common,
    },
    computed: true,
  };
}

/**
 * The measure a section is drawn with. A measure carried by the contract wins;
 * otherwise, when the contract supplied the passage, the same statistic is
 * measured from it here. Both are labelled in the DOM so a reader of the markup
 * can tell which happened.
 */
function sectionMeasure(section, options) {
  const supplied = section.evidence.find((item) => asRecord(item?.measure));
  if (supplied) {
    const measure = supplied.measure;
    const value = Number(measure.value);
    if (!Number.isFinite(value)) return null;
    return {
      label: cleanText(measure.label, 'Measured signal'),
      unit: cleanText(measure.unit, ''),
      value,
      scaleMax: Number.isFinite(Number(measure.scale_max)) ? Number(measure.scale_max) : 10,
      machineMedian: Number.isFinite(Number(measure.machine_median)) ? Number(measure.machine_median) : null,
      humanMedian: Number.isFinite(Number(measure.human_median)) ? Number(measure.human_median) : null,
      evenRun: Number.isFinite(Number(measure.even_run)) ? Number(measure.even_run) : null,
      leastConnected: asRecord(measure.least_connected)
        ? {
          first: cleanText(measure.least_connected.first, ''),
          second: cleanText(measure.least_connected.second, ''),
          sharedWords: Array.isArray(measure.least_connected.shared_words) ? measure.least_connected.shared_words : [],
        }
        : null,
      computed: false,
    };
  }
  if (options.measurePassages === false) return null;
  return typeof section.passage === 'string' ? measurePassageOverlap(section.passage) : null;
}

/* ------------------------------------------------------------- the masthead */

function renderMasthead(result, options) {
  const tag = headingTag(options.headingLevel, 0);
  const logo = options.logoHtml
    ? options.logoHtml
    : `<img src="${escape(options.logoDataUri)}" alt="" width="44" height="44" decoding="async">`;
  const counts = [
    countWord(result.source.word_count, 'word', 'words'),
    countWord(result.source.character_count, 'character', 'characters'),
  ];
  if (result.source.section_count > 0) counts.push(countWord(result.source.section_count, 'section', 'sections'));
  return `<header class="oaci-mast"><span class="oaci-mast__logo" data-oaci-logo>${logo}</span>`
    + `<div class="oaci-mast__identity"><${tag} class="oaci-mast__product">${escape(PRODUCT_NAME)}</${tag}>`
    + `<p class="oaci-mast__tagline">${escape(PRODUCT_TAGLINE)}</p></div>`
    + `<p class="oaci-mast__meta"><span>${escape(counts.join(' · '))}</span>`
    + `<span>${escape(isoDate(result.generated_at))} · ${escape(options.surface)}</span></p></header>`;
}

/* -------------------------------------------------------- the action slot */

function renderActions(options) {
  const actions = Array.isArray(options.actions) ? options.actions : [];
  if (!actions.length && !options.actionStatusSlot) return '';
  const buttons = actions.map((action) => {
    const id = safeId(cleanText(action.id, 'action'));
    const label = cleanText(action.label, id);
    const glyph = action.glyph ? `<i class="oaci-action__glyph" aria-hidden="true">${escape(action.glyph)}</i>` : '';
    const described = action.description ? ` title="${escape(action.description)}"` : '';
    return `<button type="button" class="oaci-action" data-oaci-action="${escape(id)}"${action.disabled ? ' disabled' : ''}${described}>${glyph}<span>${escape(label)}</span></button>`;
  }).join('');
  const status = options.actionStatusSlot
    ? '<p class="oaci-actions__status" role="status" data-oaci-action-status></p>'
    : '';
  return `<div class="oaci-actions" data-oaci-action-bar data-oaci-noprint>${buttons}${status}</div>`;
}

/* ----------------------------------------------------------- the dial gauge */

const DIAL_CX = 100;
const DIAL_CY = 98;
const DIAL_R = 78;
const DIAL_SWEEP = 180;
const DIAL_PAD = 2.4;

const dialPoint = (angle, radius) => {
  const rad = (angle * Math.PI) / 180;
  return { x: DIAL_CX + radius * Math.cos(rad), y: DIAL_CY - radius * Math.sin(rad) };
};

function renderDial(level, names) {
  const position = gaugePosition(level);
  const span = DIAL_SWEEP / CHECKER_GAUGE_ORDER.length;
  const segments = CHECKER_GAUGE_ORDER.map((id, index) => {
    const start = 180 - index * span - (index === 0 ? 0 : DIAL_PAD);
    const end = 180 - (index + 1) * span + (index === CHECKER_GAUGE_ORDER.length - 1 ? 0 : DIAL_PAD);
    const a = dialPoint(start, DIAL_R);
    const b = dialPoint(end, DIAL_R);
    return `<path class="oaci-dial__seg" data-level="${escape(id)}"${id === level ? ' data-active="true"' : ''} d="M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${DIAL_R} ${DIAL_R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}"/>`;
  }).join('');
  const needleAngle = 180 - position * 1.8;
  const tip = dialPoint(needleAngle, DIAL_R - 24);
  const tail = dialPoint(needleAngle + 180, 10);
  const labels = CHECKER_GAUGE_ORDER.map((id) => `<span data-level="${escape(id)}"${id === level ? ' data-active="true"' : ''}>${escape(names[id])}</span>`).join('');
  return `<div class="oaci-dial" role="img" aria-label="${escape(`AI reading: ${names[level]}, shown on the five-band dial from likely human to strongly AI`)}" data-oaci-dial data-level="${escape(level)}" data-position="${position.toFixed(2)}">`
    + `<svg viewBox="0 0 200 104" aria-hidden="true" focusable="false">${segments}`
    + `<line class="oaci-dial__needle" x1="${tail.x.toFixed(2)}" y1="${tail.y.toFixed(2)}" x2="${tip.x.toFixed(2)}" y2="${tip.y.toFixed(2)}"/>`
    + `<circle class="oaci-dial__hub" cx="${DIAL_CX}" cy="${DIAL_CY}" r="5"/></svg>`
    + `<div class="oaci-dial__labels" aria-hidden="true">${labels}</div></div>`;
}

/* -------------------------------------------------------------- the verdict */

function withheldHeading(ai) {
  if (ai.assessment_status === 'error') return 'AI reading unavailable';
  if (ai.assessment_status === 'not_assessed') return 'No trained model ran';
  return ai.method_status === 'inconclusive' ? 'Not enough text to read' : 'AI reading withheld';
}

function renderVerdict(result, options, ids) {
  const ai = result.axes.ai_pattern;
  const tag = headingTag(options.headingLevel, 1);
  const assessed = ai.assessment_status === 'assessed';
  if (!assessed) {
    const stateClass = ai.assessment_status === 'error' ? 'oaci-state--error' : ai.assessment_status === 'withheld' ? 'oaci-state--withheld' : '';
    return `<section class="oaci-panel oaci-verdict" data-assessed="false" data-oaci-state="${escape(ai.assessment_status)}" aria-labelledby="${escape(ids.verdict)}">`
      + `<p class="oaci-kicker">AI reading</p>`
      + `<${tag} class="oaci-verdict__level" id="${escape(ids.verdict)}">${escape(withheldHeading(ai))}</${tag}>`
      + `<p class="oaci-verdict__meaning">${escape(ai.reason)}</p>`
      + `<p class="oaci-state ${stateClass}">${escape(CHECKER_METHOD_STATUS_LABELS[ai.method_status] ?? String(ai.method_status).replaceAll('_', ' '))}</p>`
      + `<p class="oaci-verdict__score">No score and no level are shown, because none was produced. Character findings and writing rules cannot supply an AI-pattern reading.</p>`
      + `</section>`;
  }
  const strongest = result.sections.find((section) => section.index === ai.strongest_section_index);
  const strongestLine = strongest && result.sections.length > 1 && ai.level !== 'signal-likely-human'
    ? ` The strongest evidence is in section ${strongest.index + 1}.`
    : '';
  const meaning = `${options.levels.meanings[ai.level]}${strongestLine}`;
  return `<section class="oaci-panel oaci-verdict" data-assessed="true" data-oaci-state="assessed" data-level="${escape(ai.level)}" aria-labelledby="${escape(ids.verdict)}">`
    + `<p class="oaci-kicker">AI reading</p>`
    + renderDial(ai.level, options.levels.labels)
    + `<${tag} class="oaci-verdict__level" id="${escape(ids.verdict)}" data-level="${escape(ai.level)}">${escape(options.levels.labels[ai.level])}</${tag}>`
    + `<p class="oaci-verdict__meaning">${escape(meaning)}</p>`
    + `<p class="oaci-verdict__score">Score <b data-oaci-display-score="${escape(ai.display_score)}">${escape(ai.display_score)}</b> on the zero-to-one pattern scale. It is not a percentage of the text written by AI.</p>`
    + `</section>`;
}

/* ------------------------------------------------------- the section scores */

function renderSectionScores(result, options, ids) {
  const ai = result.axes.ai_pattern;
  if (ai.assessment_status !== 'assessed' || !result.sections.length) return '';
  const tag = headingTag(options.headingLevel, 1);
  const total = result.sections.length;
  const rows = result.sections.map((section) => {
    const number = section.index + 1;
    const strongest = section.index === ai.strongest_section_index;
    // Bar length is confidence, not the raw score: a confident human reading
    // must not look like a failing grade.
    const confidence = Math.max(4, Math.round(Math.abs(section.raw_score - 0.5) * 200));
    const label = `Section ${number} of ${total}: ${options.levels.labels[section.level]}, AI-writing similarity score ${section.display_score}${strongest ? ', the strongest section' : ''}. Show the evidence for this section.`;
    return `<li><button type="button" class="oaci-strip__bar" data-oaci-section-toggle="${escape(String(section.index))}"`
      + ` aria-expanded="true" aria-controls="${escape(ids.dive(section.index))}"`
      + ` data-level="${escape(section.level)}" data-strongest="${strongest}" aria-label="${escape(label)}">`
      + `<span class="oaci-strip__name">Section ${number}</span>`
      + `<span class="oaci-strip__track" aria-hidden="true"><i class="oaci-strip__fill" data-level="${escape(section.level)}" style="width:${confidence}%"></i></span>`
      + `<b class="oaci-strip__score" data-oaci-display-score="${escape(section.display_score)}">${escape(section.display_score)}</b>`
      + `<span class="oaci-strip__band" data-level="${escape(section.level)}">${escape(options.levels.labels[section.level])}</span>`
      + `<span class="oaci-strip__go" aria-hidden="true">›</span></button></li>`;
  }).join('');
  return `<section class="oaci-panel oaci-strip" aria-labelledby="${escape(ids.strip)}">`
    + `<div class="oaci-strip__head"><${tag} class="oaci-strip__title" id="${escape(ids.strip)}">Section scores</${tag}>`
    + `<p>In document order. The strongest section is marked, never moved to the top.</p></div>`
    + `<ol class="oaci-strip__list">${rows}</ol>`
    + `<p class="oaci-strip__foot">Bar length shows how confident the reading is, not how much of a section was written by AI.</p>`
    + `</section>`;
}

/* --------------------------------------------------------- the deep dives */

function renderMeasure(measure, section) {
  // Positions are clamped a little inside the ends of the scale: a marker at
  // exactly nought pushes its own label off the edge of the panel. The printed
  // number is always the measured one.
  const clamp = (value) => Math.min(97, Math.max(3, (value / measure.scaleMax) * 100));
  // A label centred on a mark near either end of the scale hangs off the panel,
  // so a mark in the outer quarter anchors its label inwards instead.
  const anchor = (position) => (position < 25 ? 'start' : position > 75 ? 'end' : 'middle');
  // Each reference mark carries a full label and a short one. The short label
  // is what a narrow panel shows: an unlabelled scale with a dot on it says
  // nothing, so the labels shorten rather than disappear.
  const mark = (kind, position, label, brief) => {
    const left = clamp(position);
    return `<span class="oaci-measure__mark oaci-measure__mark--${kind}" data-anchor="${anchor(left)}" style="left:${left.toFixed(2)}%"><i></i>`
      + `<small class="oaci-measure__full">${label}</small>`
      + (brief ? `<small class="oaci-measure__brief">${brief}</small>` : '')
      + `</span>`;
  };
  const marks = [];
  if (measure.machineMedian !== null) {
    const value = `${escape(String(measure.machineMedian))}${escape(measure.unit)}`;
    marks.push(mark('machine', measure.machineMedian, `typical AI ~${value}`, `AI ~${value}`));
  }
  if (measure.humanMedian !== null) {
    const value = `${escape(String(measure.humanMedian))}${escape(measure.unit)}`;
    marks.push(mark('human', measure.humanMedian, `typical human ~${value}`, `human ~${value}`));
  }
  marks.push(mark('this', measure.value, `this passage ${escape(String(measure.value))}${escape(measure.unit)}`));

  const aiSide = section.level === 'signal-strongly-ai' || section.level === 'signal-likely-ai' || section.level === 'signal-potentially-ai';
  const humanSide = section.level === 'signal-likely-human';
  const midpoint = measure.machineMedian !== null && measure.humanMedian !== null
    ? (measure.machineMedian + measure.humanMedian) / 2
    : null;
  const machineLike = midpoint === null ? null : measure.value <= midpoint;
  let reading = null;
  if (machineLike !== null) {
    if (aiSide && !machineLike) {
      reading = measure.evenRun
        ? `This passage actually repeats words the way people do; its AI reading came from other patterns — for example, ${measure.evenRun} sentences in a row here are almost exactly the same length, an evenness people rarely keep up.`
        : 'This passage actually repeats words the way people do; its AI reading came from other patterns in how the whole passage flows — the mix of sentence shapes and word choices the model has learnt to recognise.';
    } else if (humanSide && machineLike) {
      reading = 'This passage repeats a little less than people typically do — common in list-like or link-heavy writing — and the model still read it as human on everything else it weighs.';
    } else if (!aiSide && !humanSide) {
      reading = 'This passage sits between the typical ranges — one reason the model could not commit either way.';
    }
  }

  let example = '';
  const least = measure.leastConnected;
  if (aiSide && machineLike && least && least.sharedWords.length === 0 && least.first && least.second) {
    example = `<div class="oaci-measure__example"><b>The tell, in your own sentences:</b>`
      + `<p class="oaci-measure__note">These neighbours share no key words at all —</p>`
      + `<p>“${escape(least.first)}”</p><p>“${escape(least.second)}”</p></div>`;
  } else if (humanSide && machineLike === false && least && least.sharedWords.length) {
    const words = least.sharedWords.slice(0, 3).map((word) => `“${word}”`).join(', ');
    example = `<p class="oaci-measure__note">For example, neighbouring sentences here carry ${escape(words)} across from one to the next — the thread human writing usually keeps.</p>`;
  }

  return `<div class="oaci-measure" data-oaci-measure="${measure.computed ? 'measured-here' : 'from-contract'}">`
    + `<b class="oaci-measure__label">${escape(measure.label)}</b>`
    + `<div class="oaci-measure__scale" aria-hidden="true">${marks.join('')}</div>`
    + `<p class="oaci-sr">${escape(`${measure.label}: this passage ${measure.value}${measure.unit}${measure.machineMedian !== null ? `, typical AI about ${measure.machineMedian}${measure.unit}` : ''}${measure.humanMedian !== null ? `, typical human about ${measure.humanMedian}${measure.unit}` : ''}.`)}</p>`
    + (reading ? `<p class="oaci-measure__reading">${escape(reading)}</p>` : '')
    + example
    + `</div>`;
}

const ADVICE_LIMIT = 3;

/**
 * The editing advice for one section.
 *
 * Two sources, in this order. First, evidence the contract itself carries with
 * `kind: 'editorial_rule'`. Second, whatever the surface passes as
 * `options.advice`, for the common case where a surface's writing-rule findings
 * live outside the section evidence: the WordPress plugin's `pattern_findings`
 * are a separate deterministic result, and asking a surface to graft entries
 * onto a frozen, contract-validated object to get them drawn would be a worse
 * answer than an injection point.
 *
 * `options.advice` may be a callback `(section, index) => entries`, an array
 * indexed by section index, or an object keyed by section index. An entry is
 * `{rule_id?, quote?, suggestion?, message?}`. Nothing here is written back to
 * the result.
 */
function suppliedAdvice(section, options) {
  const source = options.advice;
  let entries = null;
  if (typeof source === 'function') entries = source(section, section.index);
  else if (Array.isArray(source)) entries = source[section.index];
  else if (asRecord(source)) entries = source[section.index] ?? source[String(section.index)];
  if (!Array.isArray(entries)) return [];
  return entries.filter((entry) => asRecord(entry)).map((entry) => ({
    ruleId: cleanText(entry.rule_id ?? entry.ruleId, ''),
    title: cleanText(entry.quote ?? entry.matched, '') ? `“${cleanText(entry.quote ?? entry.matched, '')}”` : 'In this passage',
    suggestion: cleanText(entry.suggestion, ''),
    why: cleanText(entry.message, ''),
  }));
}

function contractAdvice(section) {
  return section.evidence.filter((item) => item.kind === 'editorial_rule').map((item) => {
    const suggestion = cleanText(item.suggestion, cleanText(item.detail, ''));
    const basis = cleanText(item.basis, '');
    return {
      ruleId: cleanText(item.rule_id ?? item.id, ''),
      title: cleanText(item.summary, 'In this passage'),
      suggestion,
      why: basis === suggestion ? '' : basis,
    };
  });
}

function renderAdvice(section, options) {
  const tag = headingTag(options.headingLevel, 3);
  const all = [...contractAdvice(section), ...suppliedAdvice(section, options)];
  if (!all.length) {
    return `<div class="oaci-advice"><p class="oaci-advice__none">✓ Nothing to tweak here — this passage reads naturally.</p></div>`;
  }
  const shown = all.slice(0, ADVICE_LIMIT);
  const body = shown.map((card) => `<div class="oaci-advice__card"${card.ruleId ? ` data-oaci-rule="${escape(card.ruleId)}"` : ''}>`
    + `<b>${escape(card.title)}</b>`
    + (card.suggestion ? `<span class="oaci-advice__try">Try: ${escape(card.suggestion)}</span>` : '')
    + (card.why ? `<p class="oaci-advice__why">${escape(card.why)}</p>` : '')
    + `</div>`).join('');
  // A dropped card is said out loud rather than silently cut.
  const more = all.length > shown.length
    ? `<p class="oaci-advice__more">${escape(`${all.length - shown.length} more suggestion${all.length - shown.length === 1 ? '' : 's'} in this passage, under the writing patterns to review.`)}</p>`
    : '';
  return `<div class="oaci-advice" data-oaci-advice="${all.length}"><${tag} class="oaci-advice__title">How to improve this passage</${tag}>`
    + `<p class="oaci-advice__note">Editing advice from our writing rules — it never counts towards the AI reading.</p>`
    + body + more + `</div>`;
}

function renderDive(result, section, options, ids) {
  const ai = result.axes.ai_pattern;
  const tag = headingTag(options.headingLevel, 2);
  const total = result.sections.length;
  const number = section.index + 1;
  const strongest = section.index === ai.strongest_section_index;
  // The quote box caps its own height, so it is a scrollable region: it needs
  // to be reachable and scrollable from the keyboard, and it needs a name.
  const passage = typeof section.passage === 'string' && section.passage.trim()
    ? `<blockquote class="oaci-quote" data-level="${escape(section.level)}" tabindex="0" aria-label="${escape(`The passage the model read in section ${number}`)}">${escape(section.passage.trim())}</blockquote>`
    : `<p class="oaci-locator">Content-free result: this section is identified by its position in the text, characters ${section.start_utf16}–${section.end_utf16}. The passage itself was deliberately not carried.</p>`;
  const measure = sectionMeasure(section, options);
  const modelEvidence = section.evidence.filter((item) => item.kind !== 'editorial_rule' && !asRecord(item.measure));
  const evidenceList = modelEvidence.length
    ? `<ul class="oaci-limits">${modelEvidence.map((item) => `<li>${escape(item.summary)}${item.detail ? ` ${escape(item.detail)}` : ''}</li>`).join('')}</ul>`
    : '';
  return `<section class="oaci-dive" id="${escape(ids.dive(section.index))}" data-oaci-section="${section.index}" data-level="${escape(section.level)}" data-strongest="${strongest}" aria-label="${escape(`Inside section ${number} of ${total}`)}">`
    + `<div class="oaci-dive__head"><${tag} class="oaci-dive__title">Inside section ${number}${total > 1 ? ` of ${total}` : ''}</${tag}>`
    + (strongest && total > 1 ? `<span class="oaci-note">The strongest section</span>` : '')
    + `</div>`
    + `<div class="oaci-dive__sub"><span class="oaci-chip" data-level="${escape(section.level)}">${escape(options.levels.labels[section.level])}</span>`
    + `<span class="oaci-dive__score">Score <b data-oaci-display-score="${escape(section.display_score)}">${escape(section.display_score)}</b> · ${escape(countWord(section.word_count, 'word', 'words'))}</span></div>`
    + passage
    + (measure ? renderMeasure(measure, section) : '')
    + evidenceList
    + renderAdvice(section, options)
    + `</section>`;
}

function renderDives(result, options, ids) {
  const ai = result.axes.ai_pattern;
  if (ai.assessment_status !== 'assessed' || !result.sections.length) return '';
  const tag = headingTag(options.headingLevel, 1);
  return `<section class="oaci-dives" aria-labelledby="${escape(ids.dives)}">`
    + `<${tag} id="${escape(ids.dives)}" class="oaci-sr">Section evidence</${tag}>`
    + `<p class="oaci-dives__intro">Each section below shows the passage the model read and one measured signal: how often key words carry over between neighbouring sentences. People average about six in a hundred; machine writing about two.</p>`
    + result.sections.map((section) => renderDive(result, section, options, ids)).join('')
    + `</section>`;
}

/* ----------------------------------------------------------------- the axes */

function renderAxes(result, options, ids) {
  const tag = headingTag(options.headingLevel, 1);
  const cardTag = headingTag(options.headingLevel, 2);
  const ai = result.axes.ai_pattern;
  const integrity = result.axes.text_integrity;
  const editorial = result.axes.editorial;
  const cards = [
    {
      id: 'ai',
      label: 'AI-pattern reading',
      reading: ai.level ? options.levels.labels[ai.level] : withheldHeading(ai),
      reason: ai.reason,
      state: ai.assessment_status,
      level: ai.level,
    },
    {
      id: 'integrity',
      label: 'Text integrity',
      reading: INTEGRITY_READINGS[integrity.reading] ?? 'Not assessed',
      reason: integrity.reason,
      state: integrity.reading,
      level: null,
    },
    {
      id: 'editorial',
      label: 'Editorial signals',
      reading: EDITORIAL_READINGS[editorial.reading] ?? 'Not assessed',
      reason: editorial.reason,
      state: editorial.reading,
      level: null,
    },
  ];
  const body = cards.map((card) => `<div class="oaci-axis" data-axis="${escape(card.id)}" data-state="${escape(card.state)}"${card.level ? ` data-level="${escape(card.level)}"` : ''}>`
    + `<${cardTag} class="oaci-axis__label">${escape(card.label)}</${cardTag}>`
    + `<p class="oaci-axis__reading">${escape(card.reading)}</p>`
    + `<p class="oaci-axis__reason">${escape(card.reason)}</p></div>`).join('');
  return `<section aria-labelledby="${escape(ids.axes)}">`
    + `<${tag} id="${escape(ids.axes)}" class="oaci-kicker">Three separate readings</${tag}>`
    + `<div class="oaci-axes">${body}</div></section>`;
}

/* -------------------------------------------------------- the named checks */

function renderChecks(result, options, ids) {
  const tag = headingTag(options.headingLevel, 1);
  const checks = result.methods.map((method) => {
    const name = method.id === 'watermark.anthropic' ? 'Anthropic official watermark verifier' : cleanText(method.provider_or_method, method.id);
    const status = CHECKER_METHOD_STATUS_LABELS[method.status] ?? String(method.status).replaceAll('_', ' ');
    const limitation = Array.isArray(method.limitations) && method.limitations.length ? method.limitations[0] : '';
    // Name and outcome share the first line, so the status chips line up down
    // the column however long the check names are.
    return `<li class="oaci-check" data-method="${escape(method.id)}" data-status="${escape(method.status)}">`
      + `<div class="oaci-check__top"><span class="oaci-check__name">${escape(name)}</span>`
      + `<span class="oaci-status" data-status="${escape(method.status)}">${escape(status)}</span></div>`
      + `<span class="oaci-check__id">${escape(method.id)} · ${escape(method.version)}</span>`
      + `<span class="oaci-check__where">Ran on the ${escape(String(method.privacy_route).replaceAll('_', ' '))} route</span>`
      + (limitation ? `<p class="oaci-check__limit">${escape(limitation)}</p>` : '')
      + `</li>`;
  }).join('');
  const limitations = unique([...result.limitations, 'A check that did not run is never counted as a pass.', 'No result proves who wrote a text.']);
  return `<section class="oaci-panel oaci-checks" aria-labelledby="${escape(ids.checks)}">`
    + `<${tag} class="oaci-checks__title" id="${escape(ids.checks)}">Named checks and limitations</${tag}>`
    + `<ul class="oaci-checks__list">${checks}</ul>`
    + `<ul class="oaci-limits">${limitations.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`
    + `</section>`;
}

/* -------------------------------------------------- means / does not mean */

function renderMeaningPanel(result, options, ids) {
  const ai = result.axes.ai_pattern;
  if (ai.assessment_status !== 'assessed') return '';
  const tag = headingTag(options.headingLevel, 1);
  const colTag = headingTag(options.headingLevel, 2);
  return `<section aria-labelledby="${escape(ids.meaning)}">`
    + `<${tag} id="${escape(ids.meaning)}" class="oaci-sr">What this result means, and what it does not</${tag}>`
    + `<div class="oaci-meaning">`
    + `<div><${colTag} class="oaci-meaning__title">${escape(CHECKER_MEANING_PANEL.meansTitle)}</${colTag}>${CHECKER_MEANING_PANEL.means.map((line) => `<p>${escape(line)}</p>`).join('')}</div>`
    + `<div><${colTag} class="oaci-meaning__title">${escape(CHECKER_MEANING_PANEL.notTitle)}</${colTag}>${CHECKER_MEANING_PANEL.not.map((line) => `<p>${escape(line)}</p>`).join('')}</div>`
    + `</div></section>`;
}

/* ----------------------------------------------------- the certainty drawer */

function renderCertainty(result, options) {
  const ai = result.axes.ai_pattern;
  if (ai.assessment_status !== 'assessed') return '';
  const model = result.route.model;
  const raw = String(ai.raw_score);
  const primary = ai.primary_display_threshold;
  const secondary = ai.secondary_display_threshold;
  const barLine = primary === null
    ? 'This run did not record a display equivalent for the certainty bar, so no bar figure is quoted. The bar is a margin rule, not a probability cut-off.'
    : `Certainty bar: ${primary} on its own, or ${secondary === null ? 'a second passage agreeing' : `${secondary} twice`}.`;
  const meter = primary === null
    ? ''
    : `<span class="oaci-certainty__meter" aria-hidden="true"><i style="width:${Math.min(100, Math.max(2, (ai.raw_score / Math.max(primary, 0.0001)) * 100)).toFixed(2)}%"></i></span>`;
  const flag = ai.flagged
    ? ai.flag_reason === 'secondary'
      ? 'This reading also cleared our strictest certainty bar the second way: two passages agreed. Two passages reading as AI together is stronger evidence than one alone.'
      : 'This reading also cleared our strictest certainty bar: the strongest passage went past it on its own.'
    : 'The reading above comes from where the strongest passages sit on the scale. Our separate, strictest certainty bar was not met in this run. It is set deliberately high on purpose, so that few human documents are ever wrongly accused.';
  const rawNote = model && model.input_contract === 'raw-v1'
    ? 'The model reads your text exactly as you supplied it, formatting included (input contract raw-v1): it was trained and measured on raw text with the markdown left in, so formatting symbols carry no false weight.'
    : model
      ? `The model reads your text through the ${model.input_contract} input contract.`
      : '';
  const identity = model
    ? `Read by ${model.identity}${model.registry_identity ? ` (${model.registry_identity})` : ''}, ${model.precision}, ${result.route.location}.`
    : `Read on the ${ROUTE_KIND_LABELS[result.route.kind] ?? result.route.kind} route.`;
  return `<details class="oaci-certainty" data-oaci-certainty>`
    + `<summary>How certain is this reading?</summary>`
    + `<p>${escape(flag)}</p>`
    + `<p class="oaci-certainty__plain">In plain terms: the model gives every section a score between 0 and 1, and the reading above comes from where the strongest sections sit on the scale. On the section bars, a full bar means a confident reading and the small number is that raw score, never a percentage of AI text. The certainty bar is a separate, stricter test: a real AI draft can sit just under it, because it is set high on purpose to protect human writers.</p>`
    + meter
    + `<p class="oaci-certainty__raw">Raw model reading: ${escape(raw)} on a zero-to-one pattern scale — not a percentage of AI text. ${escape(barLine)}</p>`
    + `<p>${escape(identity)}</p>`
    + (rawNote ? `<p>${escape(rawNote)}</p>` : '')
    + `</details>`;
}

/* -------------------------------------------------------- the run record */

function renderRunRecord(result, options, ids) {
  const tag = headingTag(options.headingLevel, 1);
  const route = result.route;
  const model = route.model;
  const report = result.exports.report;
  const rows = [
    ['Route', routeLine(ROUTE_KIND_LABELS[route.kind] ?? route.kind, route.location)],
    ['Where the text went', TRANSFER_LABELS[route.content_transfer] ?? String(route.content_transfer).replaceAll('_', ' ')],
    ['What was kept', cleanText(route.retention?.statement, `Source: ${route.retention?.source ?? 'unknown'}. Result: ${route.retention?.result ?? 'unknown'}.`)],
    ['Consent', CONSENT_LABELS[route.consent] ?? String(route.consent).replaceAll('_', ' ')],
    ['Model', model ? `${model.identity}${model.registry_identity ? ` · ${model.registry_identity}` : ''} · ${model.precision} · ${model.segmentation_contract}, ${model.input_contract}, ${model.features_contract}, ${model.scoring_contract}` : 'No trained model ran in this result.'],
    ['Counts', `${countWord(result.source.word_count, 'word', 'words')} · ${countWord(result.source.character_count, 'character', 'characters')} · ${countWord(result.source.section_count, 'scored section', 'scored sections')} · ${countWord(result.methods.length, 'named check', 'named checks')} · ${countWord(result.provenance.protected_facts.count, 'protected fact', 'protected facts')}`],
    ['Result reference', result.result_id],
    ['Report export', report.available && report.complete_evidence ? `${report.format}, complete evidence, created only when you ask for it` : 'Not available from this result.'],
  ];
  return `<section class="oaci-run" aria-labelledby="${escape(ids.run)}">`
    + `<${tag} class="oaci-run__title" id="${escape(ids.run)}">Run record</${tag}>`
    + `<dl>${rows.map(([term, value]) => `<div><dt>${escape(term)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`
    + `</section>`;
}

/* -------------------------------------------------------------- the shell */

function normaliseOptions(options) {
  const given = asRecord(options) ?? {};
  const surface = cleanText(given.surface, '');
  if (!surface) throw new Error('checker_ui_surface_required');
  const logoDataUri = cleanText(given.logoDataUri, PRODUCT_LOGO_DATA_URI);
  const headingLevel = Number.isInteger(given.headingLevel) ? Math.min(3, Math.max(1, given.headingLevel)) : 2;
  return {
    surface,
    logoDataUri,
    logoHtml: typeof given.logoHtml === 'string' && given.logoHtml.trim() ? given.logoHtml : '',
    headingLevel,
    idPrefix: safeId(cleanText(given.idPrefix, 'oaci')),
    actions: Array.isArray(given.actions) ? given.actions : [],
    actionStatusSlot: given.actionStatusSlot !== false,
    measurePassages: given.measurePassages !== false,
    advice: typeof given.advice === 'function' || Array.isArray(given.advice) || asRecord(given.advice) ? given.advice : null,
    theme: given.theme === 'light' || given.theme === 'dark' ? given.theme : null,
    levels: resolveCheckerLevels(given.levels),
    onAction: typeof given.onAction === 'function' ? given.onAction : null,
    onToggleSection: typeof given.onToggleSection === 'function' ? given.onToggleSection : null,
  };
}

function buildIds(prefix) {
  return {
    verdict: `${prefix}-verdict`,
    strip: `${prefix}-sections`,
    dives: `${prefix}-evidence`,
    axes: `${prefix}-axes`,
    checks: `${prefix}-checks`,
    meaning: `${prefix}-meaning`,
    run: `${prefix}-run`,
    dive: (index) => `${prefix}-section-${index + 1}`,
  };
}

/**
 * The complete result, as an HTML string.
 *
 * @param result canonical checker-result object (validated here, fails closed)
 * @param options {surface, logoDataUri?, logoHtml?, headingLevel?, idPrefix?,
 *                 actions?, actionStatusSlot?, measurePassages?, theme?}
 */
export function renderCheckerResult(result, options) {
  assertCanonicalResult(result);
  const settings = normaliseOptions(options);
  const ids = buildIds(settings.idPrefix);
  const ai = result.axes.ai_pattern;
  return `<article class="oaci-result" data-oaci-result`
    + (settings.theme ? ` data-theme="${escape(settings.theme)}"` : '')
    + ` data-oaci-status="${escape(ai.assessment_status)}"`
    + ` data-oaci-profile="${escape(result.profile)}"`
    + (ai.level ? ` data-oaci-level="${escape(ai.level)}"` : '')
    + ` data-oaci-surface="${escape(settings.surface)}">`
    + renderMasthead(result, settings)
    + renderActions(settings)
    + `<div class="oaci-result__body">`
    + renderVerdict(result, settings, ids)
    + renderSectionScores(result, settings, ids)
    + renderDives(result, settings, ids)
    + renderAxes(result, settings, ids)
    + renderChecks(result, settings, ids)
    + renderMeaningPanel(result, settings, ids)
    + renderCertainty(result, settings)
    + renderRunRecord(result, settings, ids)
    + `</div></article>`;
}

/**
 * Render into a DOM node and wire the behaviour: each section score row expands
 * and collapses its own deep dive, and action buttons report back.
 *
 * Returns a handle with `update(nextResult)`, `element` and `destroy()`.
 * Requires a DOM; in Node, use `renderCheckerResult` instead.
 */
export function mount(root, result, options) {
  if (!root || typeof root.querySelectorAll !== 'function') throw new Error('checker_ui_mount_root_required');
  const settings = normaliseOptions(options);
  const listeners = [];

  const attach = (node, type, handler) => {
    node.addEventListener(type, handler);
    listeners.push(() => node.removeEventListener(type, handler));
  };

  const wire = () => {
    for (const button of root.querySelectorAll('[data-oaci-section-toggle]')) {
      attach(button, 'click', () => {
        const panel = root.querySelector(`#${CSS && typeof CSS.escape === 'function' ? CSS.escape(button.getAttribute('aria-controls')) : button.getAttribute('aria-controls')}`);
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(open));
        if (panel) panel.hidden = !open;
        if (settings.onToggleSection) settings.onToggleSection(Number(button.dataset.oaciSectionToggle), open);
      });
    }
    for (const button of root.querySelectorAll('[data-oaci-action]')) {
      attach(button, 'click', () => {
        const id = button.dataset.oaciAction;
        if (settings.onAction) settings.onAction(id, button);
        button.dispatchEvent(new CustomEvent('oaci:action', { bubbles: true, detail: { action: id } }));
      });
    }
  };

  const draw = (next) => {
    for (const remove of listeners.splice(0)) remove();
    root.innerHTML = renderCheckerResult(next, options);
    wire();
  };

  draw(result);
  return {
    get element() { return root.querySelector('[data-oaci-result]'); },
    update(next) { draw(next); },
    setActionStatus(text) {
      const status = root.querySelector('[data-oaci-action-status]');
      if (status) status.textContent = text == null ? '' : String(text);
    },
    destroy() {
      for (const remove of listeners.splice(0)) remove();
      root.innerHTML = '';
    },
  };
}

/**
 * A complete standalone HTML document: the result, the stylesheet and nothing
 * else. Used by the printable report surfaces and by the visual test harness.
 */
export function renderCheckerDocument(result, options, stylesheet) {
  const settings = normaliseOptions(options);
  const title = `${PRODUCT_NAME}: result ${result?.result_id ?? ''}`.trim();
  // A standalone page owns its own outline: the result is the main landmark and
  // the product name is its h1, unless the caller says otherwise.
  const inner = renderCheckerResult(result, {
    ...options,
    surface: settings.surface,
    headingLevel: Number.isInteger(options?.headingLevel) ? options.headingLevel : 1,
  });
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">`
    + `<meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${escape(title)}</title>`
    + `<style>html,body{margin:0;padding:0;background:#f2ede6}${stylesheet ?? ''}</style>`
    + `</head><body><main>${inner}</main></body></html>`;
}
