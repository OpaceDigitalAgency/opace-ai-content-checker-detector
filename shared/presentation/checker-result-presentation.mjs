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
 * Source: docs/assets/opace-ai-content-checker-detector-logo-v3.png
 * Source SHA-256: cee92ccc36ae18bef908fa536f370792b4034b6d0446b18b83a028ac12a42e37
 * Produced with sharp 0.34 (extensions/chrome/node_modules/sharp):
 *   sharp(src).resize(96, 96, {fit: 'contain', background: transparent})
 *             .png({compressionLevel: 9, palette: true})
 * Resized PNG SHA-256: c0652480a14430b1b2e947673d2e94277d7e97666e4cb51fb0d925760ab99d17
 */
export const PRODUCT_LOGO_DATA_URI =
  'data:image/png;base64,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';

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

/* ------------------------------------- what the model measured, per passage */

/**
 * The signals the "What the model measured" block draws, and the reference
 * points beside them.
 *
 * Every median here is one of the project's own measured figures, quoted from
 * `docs/research-drafts/burstiness-does-not-work.md` ("What actually separates
 * the two populations" and "Burstiness"), which in turn quotes
 * `SIGNAL-SCIENCE.md` §2's top-ten table and `tables/famous-heuristics.md`.
 * Nothing on this list is estimated, rounded to taste or carried over from
 * another product.
 *
 * The medians are per DOCUMENT, over 670 register-and-length-matched pairs of
 * fresh long-form documents. A scored section is shorter than a document, which
 * is why the block says so in its own words rather than presenting a passage
 * reading as if it were a corpus one.
 *
 * A fourth signal from the same table, the share of two-word runs that appear
 * only once, is deliberately NOT drawn. Its medians (0.878 machine, 0.797 human)
 * are per document; on a passage of a few hundred words almost every two-word run
 * is unique whoever wrote it, so the meter would read as machine every time. A
 * signal that cannot be wrong is not evidence.
 *
 * `sentence_length_cv` is on the list for the opposite reason to the others: the
 * project measured the most famous signal in the category and found it at
 * chance. It is drawn with no typical-AI and no typical-human marker, because
 * there is no separation to mark, and the sentence beside it says so.
 */
export const PASSAGE_SIGNAL_REFERENCES = Object.freeze({
  adjacent_overlap: Object.freeze({
    label: 'Word re-use between neighbouring sentences',
    aiMedian: 2.1,
    humanMedian: 6.3,
    auroc: 0.912,
    basis: 'medians over 670 matched pairs of long-form documents; this is the signal that separates the two populations best',
  }),
  vocabulary_variety: Object.freeze({
    label: 'Vocabulary variety across the passage',
    aiMedian: 0.776,
    humanMedian: 0.694,
    auroc: 0.911,
    basis: 'moving-average type-token ratio over 100-word windows; medians over the same 670 matched pairs',
  }),
  sentence_length_cv: Object.freeze({
    label: 'Sentence-length evenness',
    aiMedian: null,
    humanMedian: null,
    auroc: 0.521,
    basis: 'measured on 5,935 matched pairs: AUROC 0.521 against 0.500 for chance, catching 2.5% of machine documents at a 1% false-positive budget',
  }),
});

/** The study's own word and sentence rules, so the site computes what was measured. */
const SIGNAL_WORD_RE = /[A-Za-zÀ-ɏ']+/gu;
const SIGNAL_SENTENCE_SPLIT = /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)(?<=[.!?])["'”’)\]]*\s+(?=["'“‘(\[]*[A-Z0-9])/u;

/**
 * Sentence segmentation, ported from `features.py::_sentences` by way of
 * `packages/cycle5-browser/src/reference/document-tells.ts`: split on bare
 * newlines first, then within each line. A hard line-wrap with no terminal
 * punctuation is always a boundary, which is the training-time behaviour.
 */
const signalSentences = (text) => {
  const out = [];
  for (const line of String(text ?? '').split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    for (const sentence of trimmedLine.split(SIGNAL_SENTENCE_SPLIT)) {
      const trimmed = sentence.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
};

const signalWords = (text) => (String(text ?? '').match(SIGNAL_WORD_RE) ?? []).map((word) => word.toLowerCase());

/** Population coefficient of variation, the measurement's own cv() (pstdev/mean). */
const populationCv = (values) => {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!mean) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
};

const MATTR_WINDOW = 100;
/** 60 words is the corpus's own minimum document length; below it these readings are noise. */
const SIGNAL_MIN_WORDS = 60;

/** Moving-average type-token ratio: the mean unique-word share over 100-word windows. */
function mattr(words) {
  if (words.length < MATTR_WINDOW) return null;
  const counts = new Map();
  let distinct = 0;
  let total = 0;
  let windows = 0;
  for (let index = 0; index < words.length; index += 1) {
    const entering = words[index];
    const seen = counts.get(entering) ?? 0;
    counts.set(entering, seen + 1);
    if (seen === 0) distinct += 1;
    if (index >= MATTR_WINDOW) {
      const leaving = words[index - MATTR_WINDOW];
      const left = counts.get(leaving) - 1;
      counts.set(leaving, left);
      if (left === 0) distinct -= 1;
    }
    if (index >= MATTR_WINDOW - 1) { total += distinct / MATTR_WINDOW; windows += 1; }
  }
  return windows ? total / windows : null;
}

const round = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/**
 * The structural signals this component can measure on one passage, each with
 * the project's own reference points and one plain sentence on what it
 * indicates. A signal whose passage is too short for an honest reading is not
 * drawn at all; nothing here is estimated to fill a row.
 *
 * The value returned is descriptive. None of it set the level: the level came
 * from the trained model, which reads the whole passage rather than these four
 * numbers.
 */
export function measurePassageSignals(passage) {
  const text = typeof passage === 'string' ? passage : '';
  const words = signalWords(text);
  const sentences = signalSentences(text);
  const meters = [];

  const variety = mattr(words);
  if (variety !== null) {
    const reference = PASSAGE_SIGNAL_REFERENCES.vocabulary_variety;
    meters.push({
      id: 'vocabulary_variety',
      label: reference.label,
      unit: '',
      value: round(variety, 3),
      scaleMin: 0.6,
      scaleMax: 0.95,
      aiMedian: reference.aiMedian,
      humanMedian: reference.humanMedian,
      auroc: reference.auroc,
      basis: reference.basis,
      // Which side is the AI side is a property of the reference points, never of the value.
      note: 'How many different words the passage uses for its length. A model tends to reach for a synonym where a person repeats the term they started with.',
      computed: true,
    });
  }

  const lengths = sentences.map((sentence) => (sentence.match(SIGNAL_WORD_RE) ?? []).length).filter((count) => count > 0);
  const cv = lengths.length >= 4 ? populationCv(lengths) : null;
  if (cv !== null) {
    const reference = PASSAGE_SIGNAL_REFERENCES.sentence_length_cv;
    meters.push({
      id: 'sentence_length_cv',
      label: reference.label,
      unit: '',
      value: round(cv, 2),
      scaleMin: 0,
      scaleMax: 1,
      aiMedian: null,
      humanMedian: null,
      auroc: reference.auroc,
      basis: reference.basis,
      note: 'The best-known way to spot machine writing, and the one we measured at chance: machine prose varies its sentence lengths very slightly more than human prose, not less. It is drawn here because it is worth seeing, and it is drawn with no typical-AI or typical-human marker because there is no separation to mark.',
      informative: false,
      computed: true,
    });
  }

  return meters;
}

/**
 * Which way each measured signal leans, and by how much.
 *
 * The lean is the value's position between the two medians: 1 is exactly at the
 * typical-AI median, 0 at the typical-human one. A signal with no measured
 * separation has no lean and is never named as a reason.
 */
function signalLean(meter) {
  if (meter.informative === false || meter.aiMedian === null || meter.humanMedian === null) return null;
  const span = meter.aiMedian - meter.humanMedian;
  if (!span) return null;
  const position = (meter.value - meter.humanMedian) / span;
  return { side: position >= 0.5 ? 'ai' : 'human', strength: Math.abs(position - 0.5) };
}

const LEAN_PHRASES = Object.freeze({
  adjacent_overlap: { ai: 'it re-uses fewer words between neighbouring sentences than people typically do', human: 'it re-uses words between neighbouring sentences the way people typically do' },
  vocabulary_variety: { ai: 'its vocabulary is more varied for its length than people typically write', human: 'its vocabulary is about as varied for its length as people typically write' },
});

const joinPhrases = (parts) => (parts.length === 1
  ? parts[0]
  : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/**
 * "Why it reads this way": the two or three measured signals that lean towards
 * the level this section was given, named and ranked, with the boundary that
 * has to travel with them.
 *
 * It never says a signal produced the reading. The trained model produced the
 * reading; these are what stands out when the same passage is measured, and
 * where nothing leans that way the paragraph says exactly that instead of
 * reaching for "other patterns".
 */
export function explainSectionSignals(meters, level, levelLabel) {
  const aiSide = level === 'signal-strongly-ai' || level === 'signal-likely-ai' || level === 'signal-potentially-ai';
  const humanSide = level === 'signal-likely-human';
  const leaning = meters
    .map((meter) => ({ meter, lean: signalLean(meter) }))
    .filter((entry) => entry.lean !== null)
    .sort((a, b) => b.lean.strength - a.lean.strength);
  if (!leaning.length) {
    return 'None of the signals we can measure on a passage this length has a reference to compare against, so there is nothing here to name. The reading above is the model\'s, taken from the passage as a whole.';
  }
  if (!aiSide && !humanSide) {
    const towardsAi = leaning.filter((entry) => entry.lean.side === 'ai').length;
    const split = towardsAi && towardsAi < leaning.length
      ? ` ${towardsAi} of the ${leaning.length} lean towards AI writing and the rest towards human writing.`
      : '';
    return `The measured signals here do not agree with each other, which is one reason the model could not commit either way.${split} They did not set the reading; the model did.`;
  }
  const wanted = aiSide ? 'ai' : 'human';
  const agreeing = leaning.filter((entry) => entry.lean.side === wanted).slice(0, 3);
  if (!agreeing.length) {
    return `None of the signals we can measure on this passage leans towards ${levelLabel}. The reading above rests on patterns across the whole passage: the mix of sentence shapes and word choices the model was trained to recognise, which are too diffuse to point at one line. Nothing on this list set the reading; the model did.`;
  }
  const phrases = agreeing.map((entry) => LEAN_PHRASES[entry.meter.id]?.[wanted] ?? `its ${entry.meter.label.toLowerCase()} leans that way`);
  if (agreeing.length === 1) {
    return `One measured signal leans the way this reading went: ${phrases[0]}. It did not set the reading. The model reads the passage whole, and this is what stands out when the same passage is measured.`;
  }
  const count = ['', 'One', 'Two', 'Three'][agreeing.length] ?? String(agreeing.length);
  return `${count} measured signals lean the way this reading went: ${joinPhrases(phrases)}. The clearest is ${agreeing[0].meter.label.toLowerCase()}. They did not set the reading. The model reads the passage whole, and these are what stand out when the same passage is measured.`;
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

/**
 * One meter: a labelled scale with the two reference medians marked, this
 * passage's own value marked, and a screen-reader line saying the same thing in
 * words. `scaleMin` lets a signal whose useful range does not start at nought
 * (vocabulary variety lives between about 0.6 and 0.95) use the whole bar.
 */
function renderMeasureScale(measure) {
  const min = Number.isFinite(measure.scaleMin) ? measure.scaleMin : 0;
  const max = Number.isFinite(measure.scaleMax) ? measure.scaleMax : 10;
  const span = max - min || 1;
  // Positions are clamped a little inside the ends of the scale: a marker at
  // exactly nought pushes its own label off the edge of the panel. The printed
  // number is always the measured one.
  const clamp = (value) => Math.min(97, Math.max(3, ((value - min) / span) * 100));
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
  if (measure.machineMedian !== null && measure.machineMedian !== undefined) {
    const value = `${escape(String(measure.machineMedian))}${escape(measure.unit)}`;
    marks.push(mark('machine', measure.machineMedian, `typical AI ~${value}`, `AI ~${value}`));
  }
  if (measure.humanMedian !== null && measure.humanMedian !== undefined) {
    const value = `${escape(String(measure.humanMedian))}${escape(measure.unit)}`;
    marks.push(mark('human', measure.humanMedian, `typical human ~${value}`, `human ~${value}`));
  }
  marks.push(mark('this', measure.value, `this passage ${escape(String(measure.value))}${escape(measure.unit)}`));
  const direction = measure.machineMedian === null || measure.machineMedian === undefined || measure.humanMedian === null || measure.humanMedian === undefined
    ? 'none'
    : measure.machineMedian > measure.humanMedian ? 'ai-high' : 'ai-low';
  return `<div class="oaci-measure__scale" data-direction="${direction}" aria-hidden="true">${marks.join('')}</div>`
    + `<p class="oaci-sr">${escape(`${measure.label}: this passage ${measure.value}${measure.unit}`
      + `${measure.machineMedian !== null && measure.machineMedian !== undefined ? `, typical AI about ${measure.machineMedian}${measure.unit}` : ''}`
      + `${measure.humanMedian !== null && measure.humanMedian !== undefined ? `, typical human about ${measure.humanMedian}${measure.unit}` : ', with no typical AI or typical human marker, because none was measured'}.`)}</p>`;
}

function renderMeasure(measure, section) {
  const aiSide = section.level === 'signal-strongly-ai' || section.level === 'signal-likely-ai' || section.level === 'signal-potentially-ai';
  const humanSide = section.level === 'signal-likely-human';
  const midpoint = measure.machineMedian !== null && measure.humanMedian !== null
    ? (measure.machineMedian + measure.humanMedian) / 2
    : null;
  const machineLike = midpoint === null ? null : measure.value <= midpoint;
  // What this one number indicates, in one sentence. It never explains the
  // level: "Why it reads this way" underneath does that from all the meters
  // together, which is what replaced the old "it came from other patterns".
  let reading = null;
  if (machineLike !== null) {
    if (machineLike) {
      reading = aiSide
        ? 'This passage re-uses fewer words between neighbouring sentences than people typically do, which is the side of the scale this reading came down on.'
        : humanSide
          ? 'This passage repeats a little less than people typically do — common in list-like or link-heavy writing — and the model still read it as human on everything else it weighs.'
          : 'This passage sits on the machine side of this one signal, though not far enough from the middle for the model to commit either way.';
    } else {
      reading = aiSide
        ? 'This passage re-uses words between neighbouring sentences the way people typically do, so this one signal leans against the reading above.'
        : humanSide
          ? 'This passage carries words from one sentence to the next about as often as people typically do.'
          : 'This passage sits between the typical ranges — one reason the model could not commit either way.';
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

  return `<div class="oaci-measure" data-oaci-measure="${measure.computed ? 'measured-here' : 'from-contract'}" data-oaci-signal="adjacent_overlap">`
    + `<b class="oaci-measure__label">${escape(measure.label)}</b>`
    + renderMeasureScale(measure)
    + (reading ? `<p class="oaci-measure__reading">${escape(reading)}</p>` : '')
    + example
    + `</div>`;
}

/** One of the extra structural signals, drawn with the same meter as the first. */
function renderSignalMeter(meter) {
  return `<div class="oaci-measure" data-oaci-measure="measured-here" data-oaci-signal="${escape(meter.id)}"${meter.informative === false ? ' data-oaci-informative="false"' : ''}>`
    + `<b class="oaci-measure__label">${escape(meter.label)}</b>`
    + renderMeasureScale({ ...meter, machineMedian: meter.aiMedian, humanMedian: meter.humanMedian })
    + `<p class="oaci-measure__reading">${escape(meter.note)}</p>`
    + `<p class="oaci-measure__basis">${escape(`Reference: ${meter.basis}.`)}</p>`
    + `</div>`;
}

/**
 * "What the model measured", per section.
 *
 * Every meter is a signal the project has measured on its own corpus, computed
 * here from the passage the contract supplied. The block is descriptive and says
 * so: the level came from the trained model, which reads the passage whole.
 *
 * The closing paragraph names the two or three signals that lean the way the
 * reading went, ranked by how far from the middle they sit. Where nothing leans
 * that way it says so, rather than reaching for "other patterns".
 */
function renderModelMeasured(section, options, ids, measure) {
  const tag = headingTag(options.headingLevel, 3);
  const passage = typeof section.passage === 'string' ? section.passage : '';
  const extra = options.measurePassages === false ? [] : measurePassageSignals(passage);
  if (!measure && !extra.length) return '';
  const meters = [];
  if (measure) {
    meters.push({
      id: 'adjacent_overlap',
      label: measure.label,
      unit: measure.unit,
      value: measure.value,
      aiMedian: measure.machineMedian,
      humanMedian: measure.humanMedian,
    });
  }
  meters.push(...extra);
  const why = explainSectionSignals(meters, section.level, options.levels.labels[section.level]);
  return `<div class="oaci-measured" data-oaci-measured="${meters.length}" aria-labelledby="${escape(ids.measured(section.index))}">`
    + `<${tag} class="oaci-measured__title" id="${escape(ids.measured(section.index))}">What the model measured</${tag}>`
    + `<p class="oaci-measured__intro">Signals we can measure on this passage, each against the point where AI writing and human writing typically sit. Those reference points were measured over whole long-form documents, so read them as context for one passage rather than as a verdict on it.</p>`
    + (measure ? renderMeasure(measure, section) : '')
    + extra.map(renderSignalMeter).join('')
    + `<div class="oaci-measured__why"><b>Why it reads this way</b><p>${escape(why)}</p></div>`
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
    // No tick, and no "reads naturally". Both said the opposite of a Strongly AI chip sitting
    // four lines above, and a reader is entitled to read a tick as a verdict. The line states
    // only what is true — the writing rules found nothing to suggest — and the sentence under
    // it says which question that answers.
    return `<div class="oaci-advice" data-oaci-advice="0">`
      + `<p class="oaci-advice__none">No editing suggestions for this passage.</p>`
      + `<p class="oaci-advice__note">Editing advice is about phrasing, not the AI reading. A passage can sit in any band and still have nothing to change here.</p>`
      + `</div>`;
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
    + renderModelMeasured(section, options, ids, measure)
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
    + `<p class="oaci-dives__intro">Each section below shows the passage the model read, then what we can measure in it: how often key words carry over between neighbouring sentences (people average about six in a hundred, machine writing about two), how varied the vocabulary is for the length, and how even the sentence lengths are. None of these set the reading. The model did, from the passage as a whole.</p>`
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

/**
 * Which of the three readings a named check belongs to.
 *
 * The contract's `category` decides it, with the method id as a tie-breaker for
 * a run whose category is missing or new. Anything unrecognised lands in its own
 * group rather than being dropped or filed under a reading it did not feed.
 */
const CHECK_GROUP_BY_CATEGORY = Object.freeze({
  detector: 'ai',
  watermark: 'ai',
  unicode: 'integrity',
  provenance: 'integrity',
  fidelity: 'integrity',
  pattern: 'editorial',
});

const CHECK_GROUP_BY_ID = Object.freeze([
  [/^(?:detector|model|classifier)\b/u, 'ai'],
  [/^watermark\b/u, 'ai'],
  [/^(?:unicode|homoglyph|invisible)\b/u, 'integrity'],
  [/^(?:c2pa|provenance|credential)/u, 'integrity'],
  [/^(?:pattern|rule|editorial|writing)\b/u, 'editorial'],
]);

const CHECK_GROUP_LABELS = Object.freeze({
  ai: 'AI-pattern reading',
  integrity: 'Text integrity',
  editorial: 'Editorial signals',
  other: 'Other named checks',
});

const CHECK_GROUP_ORDER = Object.freeze(['ai', 'integrity', 'editorial', 'other']);

/** What a check in each category is looking for, in the reader's words. */
const CHECK_SUBJECTS = Object.freeze({
  detector: 'patterns in this draft that match AI writing',
  watermark: 'an invisible watermark that some AI systems add to their own text',
  unicode: 'invisible or lookalike characters in this draft',
  provenance: 'Content Credentials attached to this draft or the file it came from',
  fidelity: 'whether a suggested fix would change what the draft says',
  pattern: 'phrasing and structure a person might want to edit',
});

/** What happened, per status. The closed vocabulary, said as a clause. */
const CHECK_OUTCOMES = Object.freeze({
  pass: 'it ran on this draft and found nothing to raise',
  attention: 'it ran on this draft and found something worth your eye, shown above',
  fail: 'it ran but did not finish cleanly, so nothing from it counts here',
  inconclusive: 'it ran on this draft but could not settle on an answer',
  unsupported: 'it is not available on this route, so it did not look at your draft',
  not_configured: 'it is not set up on this route, so it did not look at your draft',
  not_run: 'it did not run on this draft, and nothing is assumed from that',
  error: 'it stopped with an error, so nothing from it counts here',
});

/** The statuses that mean the check actually looked at the draft. */
const CHECK_RAN = Object.freeze(new Set(['pass', 'attention', 'fail', 'inconclusive', 'error']));

function checkGroupOf(method) {
  const byCategory = CHECK_GROUP_BY_CATEGORY[method.category];
  if (byCategory) return byCategory;
  const id = String(method.id ?? '');
  for (const [pattern, group] of CHECK_GROUP_BY_ID) if (pattern.test(id)) return group;
  return 'other';
}

/**
 * One named check, as the row draws it: a friendly name, the closed status in
 * friendly words, one sentence saying what it means for this draft, and the
 * auditor's three facts behind a disclosure.
 */
function checkRowModel(method) {
  const group = checkGroupOf(method);
  const status = String(method.status);
  const subject = CHECK_SUBJECTS[method.category] ?? 'what this named check covers';
  const outcome = CHECK_OUTCOMES[status] ?? `its outcome was recorded as “${status.replaceAll('_', ' ')}”`;
  return {
    id: String(method.id),
    group,
    groupLabel: CHECK_GROUP_LABELS[group],
    // The one long name the contract does not carry in words a reader knows.
    name: method.id === 'watermark.anthropic' ? 'Anthropic official watermark verifier' : cleanText(method.provider_or_method, String(method.id)),
    status,
    statusLabel: CHECKER_METHOD_STATUS_LABELS[status] ?? status.replaceAll('_', ' '),
    ran: CHECK_RAN.has(status),
    means: `This check looks for ${subject}; ${outcome}.`,
    version: cleanText(method.version, 'not recorded'),
    route: String(method.privacy_route ?? 'not recorded').replaceAll('_', ' '),
    limitations: Array.isArray(method.limitations) ? method.limitations.filter((item) => typeof item === 'string' && item.trim()) : [],
  };
}

/**
 * Every named check in the run, grouped by the reading it feeds and in the
 * contract's own order inside each group.
 */
export function buildCheckerChecks(result) {
  const rows = (Array.isArray(result?.methods) ? result.methods : []).filter(asRecord).map(checkRowModel);
  return CHECK_GROUP_ORDER
    .map((group) => ({ id: group, label: CHECK_GROUP_LABELS[group], checks: rows.filter((row) => row.group === group) }))
    .filter((entry) => entry.checks.length);
}

/**
 * Limitations that contradict the run they are printed under.
 *
 * The worst of them shipped: a primitive result's "No trained model ran on this
 * text" travelled with any surface that reused the list, and it appeared under
 * assessed runs where a model plainly had run. Each rule names the condition it
 * fires under, so a limitation is never dropped on a hunch.
 */
const LIMITATION_CONTRADICTIONS = Object.freeze([
  {
    id: 'model-did-run',
    when: (result) => result.axes.ai_pattern.assessment_status === 'assessed',
    match: /no trained model (?:ran|was run)|ai-pattern reading is not assessed|cannot supply an ai-pattern reading|no ai-pattern reading is available/iu,
  },
  {
    id: 'full-checker-parity',
    when: (result) => result.profile === 'full_checker',
    match: /not full-checker parity/iu,
  },
  {
    id: 'sections-were-scored',
    when: (result) => result.sections.length > 0,
    match: /no section (?:was|were) scored|no scored passages? (?:is|are) available/iu,
  },
]);

/** Never dropped and never capped away: the two standing commitments. */
const LIMITATION_CONSTANTS = Object.freeze([
  'A check that did not run is never counted as a pass.',
  'No result proves who wrote a text.',
]);

const LIMITATION_LIMIT = 6;

/**
 * Sentences that say the same thing in different words.
 *
 * A real run carried three of these at once — "it does not prove authorship",
 * "This result does not prove authorship", "The model provides a pattern
 * reading, not proof of authorship" and the component's own "No result proves
 * who wrote a text" — which is how a short honest note turns into a wall.
 * The first sentence in a theme is kept and every later one in that theme is
 * dropped, so the wording the run chose survives and the repetition does not.
 */
const LIMITATION_THEMES = Object.freeze([
  { id: 'authorship', match: /prov(?:e|es|ing|en)\b[^.]*\b(?:who wrote|authorship)|not proof of authorship|proves? who wrote/iu },
  { id: 'not-a-percentage', match: /not a percentage/iu },
  { id: 'absence-is-not-evidence', match: /absence of [^.]* is not evidence/iu },
]);

const normaliseLimitation = (value) => String(value).toLowerCase().replace(/[\s‐-―]+/gu, ' ').replace(/[.\s]+$/u, '').trim();

/**
 * The "Good to know" list: every limitation the run actually earned, once each.
 *
 * Sources, in order: the run's own list, the limitations of the axes that
 * produced a reading, and the limitations of the checks that ran. A check that
 * did not run contributes nothing — its own row already says it did not run, and
 * repeating its caveats down here made the panel read as a wall of disclaimers
 * with no relation to the result on screen.
 */
export function buildCheckerLimitations(result) {
  const ai = result.axes.ai_pattern;
  const sources = [...(Array.isArray(result.limitations) ? result.limitations : [])];
  // The AI axis always contributes. On an assessed run its caveats are about the
  // score; on an unassessed one they are the reason there is no score, which a
  // reader needs at least as much. The contradiction rules below remove anything
  // that does not fit the run that actually happened.
  sources.push(...(Array.isArray(ai.limitations) ? ai.limitations : []));
  for (const axis of [result.axes.text_integrity, result.axes.editorial]) {
    if (CHECK_RAN.has(String(axis.method_status))) sources.push(...(Array.isArray(axis.limitations) ? axis.limitations : []));
  }
  for (const row of buildCheckerChecks(result).flatMap((group) => group.checks)) {
    if (row.ran) sources.push(...row.limitations);
  }

  const active = LIMITATION_CONTRADICTIONS.filter((rule) => rule.when(result));
  const dropped = [];
  const kept = [];
  const seen = new Set();
  const themesUsed = new Set();
  const take = (raw) => {
    if (typeof raw !== 'string' || !raw.trim()) return;
    const text = raw.trim();
    const key = normaliseLimitation(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    const rule = active.find((candidate) => candidate.match.test(text));
    if (rule) { dropped.push({ text, reason: 'contradicts the run', rule: rule.id }); return; }
    const theme = LIMITATION_THEMES.find((candidate) => candidate.match.test(text));
    if (theme) {
      if (themesUsed.has(theme.id)) { dropped.push({ text, reason: 'already said', rule: theme.id }); return; }
      themesUsed.add(theme.id);
    }
    kept.push(text);
  };
  for (const raw of sources) take(raw);
  for (const constant of LIMITATION_CONSTANTS) take(constant);
  // The constants stay whatever else is trimmed; only the run's own sentences are capped.
  const constants = kept.filter((item) => LIMITATION_CONSTANTS.includes(item));
  const variable = kept.filter((item) => !LIMITATION_CONSTANTS.includes(item));
  return {
    items: [...variable.slice(0, LIMITATION_LIMIT), ...constants],
    overflow: Math.max(0, variable.length - LIMITATION_LIMIT),
    dropped,
  };
}

function renderChecks(result, options, ids) {
  const tag = headingTag(options.headingLevel, 1);
  const groupTag = headingTag(options.headingLevel, 2);
  const groups = buildCheckerChecks(result);
  const body = groups.map((group) => {
    const rows = group.checks.map((check) => `<li class="oaci-check" data-method="${escape(check.id)}" data-status="${escape(check.status)}" data-group="${escape(group.id)}">`
      + `<div class="oaci-check__row"><span class="oaci-check__name">${escape(check.name)}</span>`
      + `<span class="oaci-status" data-status="${escape(check.status)}">${escape(check.statusLabel)}</span></div>`
      + `<p class="oaci-check__means">${escape(check.means)}</p>`
      + `<details class="oaci-check__details"><summary>Details</summary>`
      + `<dl class="oaci-check__facts">`
      + `<div><dt>Method</dt><dd>${escape(check.id)}</dd></div>`
      + `<div><dt>Version</dt><dd>${escape(check.version)}</dd></div>`
      + `<div><dt>Route</dt><dd>${escape(check.route)}</dd></div>`
      + `</dl></details></li>`).join('');
    return `<div class="oaci-checks__group" data-group="${escape(group.id)}">`
      + `<${groupTag} class="oaci-checks__group-title">${escape(group.label)}</${groupTag}>`
      + `<ul class="oaci-checks__list">${rows}</ul></div>`;
  }).join('');

  const limitations = buildCheckerLimitations(result);
  const overflow = limitations.overflow
    ? `<p class="oaci-goodtoknow__more">${escape(countWord(limitations.overflow, 'further limitation is', 'further limitations are'))} recorded in the full report.</p>`
    : '';
  return `<section class="oaci-panel oaci-checks" aria-labelledby="${escape(ids.checks)}">`
    + `<${tag} class="oaci-checks__title" id="${escape(ids.checks)}">Named checks</${tag}>`
    + `<p class="oaci-checks__intro">One row per check, grouped by the reading it feeds. “Details” carries the method id, its version and the route it ran on.</p>`
    + body
    + `<div class="oaci-goodtoknow" data-oaci-limitations="${limitations.items.length}" role="note" aria-labelledby="${escape(ids.goodToKnow)}">`
    + `<${groupTag} class="oaci-goodtoknow__title" id="${escape(ids.goodToKnow)}">Good to know</${groupTag}>`
    + `<ul class="oaci-limits">${limitations.items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`
    + overflow
    + `</div></section>`;
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
    goodToKnow: `${prefix}-good-to-know`,
    measured: (index) => `${prefix}-measured-${index + 1}`,
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

/* ==========================================================================
   The share sheet (Lane D3, 4 September 2026)

   One dialog, shared by every surface, matching the website's toolbar chooser
   (opace-website/astro-latest/src/components/tools/content-integrity/ui/
   ShareResult.ts, buildShareChooser) word for word where the wording is
   settled.

   What travels is a SUMMARY, never the draft: the level, the per-section
   scores already on screen, the word count, the date and the model version.
   It rides in the URL fragment of the website checker, which a browser never
   sends to a server, and the encoding is byte-identical to the one the Astro
   toolbar already builds (packages/astro/src/share.ts), so a link made in the
   Chrome panel or the WordPress Lab opens as a read-only result on the
   product page.
   ========================================================================== */

/** The canonical page a shared fragment belongs to. */
export const CHECKER_SHARE_URL = 'https://opace.agency/tools/ai/content-verification-integrity/checker/';

/** Travels with every share payload. A level never leaves without its limits. */
export const SHARE_HONESTY_LINE = 'No AI checker can prove who wrote a text — this is a pattern reading.';

/**
 * Fixed by the wire format, `v:1`. A withheld run produced no level and is
 * never shared, so the withheld id is not on this list.
 */
const SHAREABLE_LEVELS = Object.freeze([
  'signal-likely-human',
  'signal-unclear',
  'signal-potentially-ai',
  'signal-likely-ai',
  'signal-strongly-ai',
]);

/** Every fixed string the sheet prints, in one place, so two surfaces cannot drift. */
export const SHARE_SHEET_COPY = Object.freeze({
  eyebrow: 'Share result',
  title: 'Choose where to share',
  intro: 'These options work across Mac, Windows, iPhone and Android. Which apps appear still depends on the device and the browser.',
  copy: 'Copy result link',
  email: 'Email',
  device: 'More apps on this device',
  directly: 'Share directly',
  close: 'Close sharing options',
  privacy: 'Only the reading summary and result link are shared. Your checked text is never included.',
  copied: 'Result link copied.',
  copyFailed: 'The link could not be copied. You can use Email or a social option instead.',
  shared: 'Result shared.',
  cancelled: 'Sharing cancelled.',
  shareFailed: 'Share options were unavailable, so the link was copied instead.',
  unavailable: 'Could not share or copy the link. Use one of the options above.',
});

/** Four decimals: two could not keep 0.9655 and 0.9685 on opposite sides of a level boundary. */
const round4 = (value) => Math.round(value * 10_000) / 10_000;
const isShareableLevel = (value) => SHAREABLE_LEVELS.includes(value);

const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = typeof btoa === 'function'
    ? btoa(binary)
    // Node before a global btoa, and any surface that removed it.
    : Buffer.from(bytes).toString('base64');
  return base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
};

/**
 * The summary a share carries, from a canonical checker-result.
 *
 * The contract's own content-free share payload wins when the run produced
 * one — it is the object the core already asserts carries no draft. When a
 * result has no share export, the same fields are read off the reading
 * itself: levels, scores, a word count, a date and the model's name. The
 * passage text is never a parameter, so no excerpt can reach a share by
 * accident.
 *
 * Returns null for anything not shareable: a withheld, errored or
 * not-assessed run, or a result whose share export declares that it contains
 * content.
 */
export function buildShareSummary(result) {
  const record = asRecord(result);
  if (!record) return null;
  const ai = asRecord(record.axes?.ai_pattern);
  const share = asRecord(record.exports?.share);
  // A run that produced no reading is never shareable, whatever its share export
  // still carries: a withheld or errored result keeps its export block, and a
  // level shared out of one would be a reading the run refused to give.
  if (!ai || ai.assessment_status !== 'assessed') return null;
  const payload = share && share.available === true && share.contains_content === false ? asRecord(share.payload) : null;
  if (payload && isShareableLevel(payload.level) && Array.isArray(payload.sections) && payload.sections.length) {
    return Object.freeze({
      levelId: payload.level,
      display: cleanText(payload.display_score, ''),
      sections: payload.sections.map((section) => ({
        index: Number.isInteger(section.index) ? section.index : 0,
        score: round4(Number(section.raw_score) || 0),
        display: cleanText(section.display_score, ''),
        levelId: isShareableLevel(section.level) ? section.level : payload.level,
      })),
      words: Number.isInteger(payload.word_count) ? payload.word_count : 0,
      date: cleanText(payload.date, String(record.generated_at ?? '').slice(0, 10)),
      version: cleanText(payload.model_version, 'unknown').slice(0, 80),
    });
  }
  if (!ai || ai.assessment_status !== 'assessed' || !isShareableLevel(ai.level)) return null;
  const sections = Array.isArray(record.sections) ? record.sections : [];
  if (!sections.length) return null;
  const model = asRecord(record.route?.model);
  return Object.freeze({
    levelId: ai.level,
    display: cleanText(ai.display_score, ''),
    sections: sections.map((section) => ({
      index: section.index,
      score: round4(Number(section.raw_score) || 0),
      display: cleanText(section.display_score, ''),
      levelId: isShareableLevel(section.level) ? section.level : ai.level,
    })),
    words: Number.isInteger(record.source?.word_count) ? record.source.word_count : 0,
    date: String(record.generated_at ?? '').slice(0, 10),
    version: cleanText(model?.identity, 'unknown').slice(0, 80),
  });
}

/** The base64url payload for `#shared=`. Identical wire shape to packages/astro/src/share.ts. */
export function encodeSharePayload(summary) {
  return toBase64Url(JSON.stringify({
    v: 1,
    l: SHAREABLE_LEVELS.indexOf(summary.levelId),
    s: summary.sections.map((section) => [section.index, round4(section.score), SHAREABLE_LEVELS.indexOf(section.levelId)]),
    w: summary.words,
    d: summary.date,
    t: summary.version,
  }));
}

/** The full link: the canonical checker page plus the content-free fragment. */
export function shareResultUrl(summary, base) {
  return `${cleanText(base, CHECKER_SHARE_URL)}#shared=${encodeSharePayload(summary)}`;
}

/** The mail subject. The level name only: no numbers, no percentages. */
export function shareSubject(summary, labels) {
  const names = labels ?? CHECKER_LEVEL_LABELS;
  return `AI content check result — ${names[summary.levelId]}`;
}

/**
 * The plain-text summary offered alongside the link, and the body of the mail
 * intent. Counts, levels and the exact display strings the reading printed —
 * nothing from the draft.
 */
export function shareSummaryText(summary, options) {
  const settings = asRecord(options) ?? {};
  const names = settings.levels ?? CHECKER_LEVEL_LABELS;
  const url = cleanText(settings.url, shareResultUrl(summary, settings.base));
  const sections = summary.sections.map((section) => `  Section ${section.index + 1}: ${section.display} · ${names[section.levelId]}`);
  return [
    `${PRODUCT_NAME} — reading summary`,
    `Overall: ${names[summary.levelId]}, ${summary.display}`,
    `Checked: ${countWord(summary.words, 'word', 'words')} on ${summary.date} (${summary.version})`,
    'Section readings on a zero-to-one pattern scale, never a percentage of AI text:',
    ...sections,
    '',
    SHARE_HONESTY_LINE,
    `Open the full reading: ${url}`,
  ].join('\n');
}

/** The direct destinations, each one a plain intent URL and nothing else. */
export function shareDestinationLinks(summary, options) {
  const settings = asRecord(options) ?? {};
  const names = settings.levels ?? CHECKER_LEVEL_LABELS;
  const url = cleanText(settings.url, shareResultUrl(summary, settings.base));
  const subject = shareSubject(summary, names);
  const count = summary.sections.length;
  const strongest = summary.sections.reduce((best, section) => (section.score > best.score ? section : best), summary.sections[0]);
  const line = `${names[summary.levelId]}. ${countWord(count, 'section', 'sections')}, strongest ${strongest.display}. ${SHARE_HONESTY_LINE} ${url}`;
  return {
    url,
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(shareSummaryText(summary, { ...settings, url }))}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(line)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(line)}`,
  };
}

const SOCIAL_ORDER = Object.freeze([
  ['linkedin', 'LinkedIn'],
  ['facebook', 'Facebook'],
  ['x', 'X'],
  ['whatsapp', 'WhatsApp'],
]);

/**
 * The share dialog, as an HTML string.
 *
 * `options.nativeShare` decides whether the "More apps on this device" button
 * is drawn at all: a surface with no Web Share API must not show a control
 * that does nothing. `openShareSheet` sets it from `navigator.share`.
 *
 * The markup is inert. It carries no script, and every control is either a
 * button the caller wires or a plain link.
 */
export function renderShareSheet(summary, options) {
  const settings = asRecord(options) ?? {};
  if (!summary || !Array.isArray(summary.sections) || !summary.sections.length) return '';
  const prefix = safeId(cleanText(settings.idPrefix, 'oaci-share'));
  const links = shareDestinationLinks(summary, settings);
  const native = settings.nativeShare === true;
  const social = SOCIAL_ORDER.map(([id, label]) =>
    `<a class="oaci-share__action oaci-share__action--${id}" data-oaci-share-to="${id}" href="${escape(links[id])}" target="_blank" rel="noopener noreferrer" aria-label="${escape(`${label} (opens in a new tab)`)}">${escape(label)}</a>`).join('');
  // The scrim carries `oaci-result` as well as its own class. Every rule in the stylesheet is
  // scoped under `.oaci-result`, and so are the colour tokens, so a dialog appended to
  // `document.body` — outside the result element — still gets both.
  const theme = settings.theme === 'light' || settings.theme === 'dark' ? ` data-theme="${escape(settings.theme)}"` : '';
  return `<div class="oaci-result oaci-share__scrim" data-oaci-share-scrim${theme} hidden>`
    + `<div class="oaci-share" role="dialog" aria-modal="true" id="${escape(prefix)}"`
    + ` aria-labelledby="${escape(prefix)}-title" aria-describedby="${escape(prefix)}-intro ${escape(prefix)}-privacy"`
    + ` data-oaci-share-sheet>`
    + `<div class="oaci-share__head"><div>`
    + `<p class="oaci-share__eyebrow">${escape(SHARE_SHEET_COPY.eyebrow)}</p>`
    + `<h2 class="oaci-share__title" id="${escape(prefix)}-title">${escape(SHARE_SHEET_COPY.title)}</h2></div>`
    + `<button type="button" class="oaci-share__close" data-oaci-share-close aria-label="${escape(SHARE_SHEET_COPY.close)}">`
    + `<span aria-hidden="true">×</span></button></div>`
    + `<p class="oaci-share__intro" id="${escape(prefix)}-intro">${escape(SHARE_SHEET_COPY.intro)}</p>`
    + `<div class="oaci-share__quick" role="group" aria-label="Quick sharing options">`
    + `<button type="button" class="oaci-share__action oaci-share__action--copy" data-oaci-share-copy data-oaci-share-first>${escape(SHARE_SHEET_COPY.copy)}</button>`
    + `<a class="oaci-share__action oaci-share__action--email" data-oaci-share-to="email" href="${escape(links.email)}" aria-label="Email this result">${escape(SHARE_SHEET_COPY.email)}</a>`
    + (native ? `<button type="button" class="oaci-share__action oaci-share__action--device" data-oaci-share-device>${escape(SHARE_SHEET_COPY.device)}</button>` : '')
    + `</div>`
    + `<p class="oaci-share__label">${escape(SHARE_SHEET_COPY.directly)}</p>`
    + `<div class="oaci-share__social" role="group" aria-label="Social sharing options">${social}</div>`
    + `<p class="oaci-share__status" role="status" data-oaci-share-status></p>`
    + `<p class="oaci-share__privacy" id="${escape(prefix)}-privacy">${escape(SHARE_SHEET_COPY.privacy)}</p>`
    + `</div></div>`;
}

/** Clipboard write, with the textarea fallback for a browser without the async API. */
async function writeClipboard(text, doc, navigatorRef) {
  try {
    if (navigatorRef?.clipboard?.writeText) {
      await navigatorRef.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const scratch = doc.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'fixed';
    scratch.style.opacity = '0';
    doc.body.append(scratch);
    scratch.select();
    const copied = doc.execCommand('copy');
    scratch.remove();
    return copied === true;
  } catch {
    return false;
  }
}

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Open the share dialog and wire it.
 *
 * ```js
 * const sheet = openShareSheet({
 *   result,                       // or summary: buildShareSummary(result)
 *   root: resultElement,          // where the dialog is inserted; the result root by default
 *   returnFocusTo: shareButton,   // focus goes back here on close
 *   onOutcome(outcome) {},        // {status, message, url}
 * });
 * sheet.close();
 * ```
 *
 * Keyboard: Tab and Shift+Tab cycle inside the dialog, Escape closes it, a
 * click on the scrim closes it, and focus returns to whatever opened it.
 * Returns null when the run produced nothing shareable, so a surface can
 * disable its own control rather than open an empty sheet.
 */
export function openShareSheet(options) {
  const settings = asRecord(options) ?? {};
  const summary = settings.summary ?? buildShareSummary(settings.result);
  if (!summary) return null;
  const doc = settings.document ?? (typeof document !== 'undefined' ? document : null);
  if (!doc) throw new Error('checker_ui_share_document_required');
  const navigatorRef = settings.navigator ?? (typeof navigator !== 'undefined' ? navigator : null);
  const nativeShare = typeof settings.nativeShare === 'function'
    ? settings.nativeShare
    : navigatorRef && typeof navigatorRef.share === 'function'
      ? navigatorRef.share.bind(navigatorRef)
      : null;

  // `document.body` by default. The result element sets `container-type: inline-size`, which
  // makes it the containing block for anything fixed inside it, so a dialog mounted there
  // would cover the component rather than the window. A surface whose component lives in a
  // shadow root passes that root as `root` instead.
  const host = settings.root ?? doc.body;
  const holder = doc.createElement('div');
  holder.innerHTML = renderShareSheet(summary, { ...settings, nativeShare: Boolean(nativeShare) });
  const scrim = holder.firstElementChild;
  if (!scrim) return null;
  const sheet = scrim.querySelector('[data-oaci-share-sheet]');
  const status = scrim.querySelector('[data-oaci-share-status]');
  const links = shareDestinationLinks(summary, settings);
  const returnFocusTo = settings.returnFocusTo ?? (doc.activeElement instanceof Object ? doc.activeElement : null);
  const listeners = [];
  const on = (node, type, handler, capture) => {
    node.addEventListener(type, handler, capture);
    listeners.push(() => node.removeEventListener(type, handler, capture));
  };

  const report = (outcome) => {
    if (status) status.textContent = outcome.message;
    if (typeof settings.onOutcome === 'function') settings.onOutcome(outcome);
  };

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    for (const remove of listeners.splice(0)) remove();
    scrim.remove();
    if (typeof settings.onClose === 'function') settings.onClose();
    if (returnFocusTo && typeof returnFocusTo.focus === 'function') returnFocusTo.focus();
  };

  on(scrim.querySelector('[data-oaci-share-close]'), 'click', close);
  on(scrim, 'mousedown', (event) => { if (event.target === scrim) close(); });

  const copyButton = scrim.querySelector('[data-oaci-share-copy]');
  on(copyButton, 'click', async () => {
    const copied = await writeClipboard(links.url, doc, navigatorRef);
    // A data attribute rather than a state class: every class in the stylesheet is
    // namespaced `oaci-`, and a test holds the file to that.
    copyButton.setAttribute('data-oaci-copied', String(copied));
    report(copied
      ? { status: 'copied', message: SHARE_SHEET_COPY.copied, url: links.url }
      : { status: 'failed', message: SHARE_SHEET_COPY.copyFailed, url: links.url });
  });

  const deviceButton = scrim.querySelector('[data-oaci-share-device]');
  if (deviceButton && nativeShare) {
    on(deviceButton, 'click', async () => {
      try {
        await nativeShare({ title: shareSubject(summary, settings.levels), text: shareSummaryText(summary, { ...settings, url: links.url }), url: links.url });
        report({ status: 'shared', message: SHARE_SHEET_COPY.shared, url: links.url });
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          report({ status: 'cancelled', message: SHARE_SHEET_COPY.cancelled, url: links.url });
          return;
        }
      }
      const copied = await writeClipboard(links.url, doc, navigatorRef);
      report(copied
        ? { status: 'copied', message: SHARE_SHEET_COPY.shareFailed, url: links.url }
        : { status: 'failed', message: SHARE_SHEET_COPY.unavailable, url: links.url });
    });
  }

  for (const link of scrim.querySelectorAll('[data-oaci-share-to]')) {
    on(link, 'click', () => {
      if (typeof settings.onDestination === 'function') settings.onDestination(link.dataset.oaciShareTo);
    });
  }

  // The trap. Tab and Shift+Tab stay inside the dialog; Escape leaves it.
  on(scrim, 'keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const stops = [...sheet.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null || node === doc.activeElement);
    if (!stops.length) return;
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (event.shiftKey && doc.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && doc.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  host.append(scrim);
  scrim.hidden = false;
  const opener = scrim.querySelector('[data-oaci-share-first]') ?? scrim.querySelector(FOCUSABLE);
  if (opener) opener.focus();

  return {
    element: scrim,
    summary,
    url: links.url,
    text: shareSummaryText(summary, { ...settings, url: links.url }),
    setStatus(message) { if (status) status.textContent = message == null ? '' : String(message); },
    close,
  };
}
