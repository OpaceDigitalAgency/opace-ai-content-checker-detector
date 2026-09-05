const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const strings = value => Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))] : [];
const ran = status => status === 'pass' || status === 'attention';
const writingMethod = method => method?.id === 'style.patterns' || method?.id === 'editorial.writing-patterns';
const unavailable = (error, subject) => Object.freeze({
  value: error ? 'Error' : 'Not assessed', status: error ? 'error' : 'not_run',
  statusLabel: error ? 'Error' : 'Not assessed', count: null,
  detail: `${subject} did not complete, so no finding or all-clear is available.`,
});

export const EDITORIAL_SCOPE = 'These are matches to the selected writing rules, not a probability or finding of AI authorship. They do not change the trained model’s reading.';
export const CHARACTER_NEGATIVE = 'No hidden or lookalike characters were found by the checks that ran';

/** Only selected rule matches count; the legacy aggregate style band is not a match count. */
export function formatEditorialReading(result) {
  const axis = record(result?.axes?.editorial);
  const methods = Array.isArray(result?.methods) ? result.methods.filter(writingMethod) : [];
  if (axis?.method_status === 'error' || axis?.reading === 'error' || methods.some(method => method.status === 'error')) return unavailable(true, 'The writing-rule checks');
  const active = methods.filter(method => ran(method.status));
  if (!axis || !ran(axis.method_status) || (methods.length && !active.length)) return unavailable(false, 'The writing-rule checks');
  const evidence = active.flatMap(method => Array.isArray(method.evidence) ? method.evidence : []);
  const matches = evidence.filter(item => item?.type === 'pattern_finding' && typeof item.rule_id === 'string');
  const reported = evidence.filter(item => item?.type === 'editorial_signals').map(item => count(item.finding_count ?? item.findingCount)).filter(value => value !== null);
  const axisFindings = Array.isArray(axis.findings) ? axis.findings.filter(item => record(item) && (typeof item.rule_id === 'string' || typeof item.category === 'string')) : null;
  const total = matches.length || (reported.length ? Math.max(...reported) : axisFindings?.length ?? null);
  if (total === null) return unavailable(false, 'The writing-rule checks');
  const value = total === 0 ? 'No selected writing rules matched' : `${total.toLocaleString('en-GB')} writing pattern ${total === 1 ? 'match' : 'matches'}`;
  return Object.freeze({ value, count: total, status: total ? 'attention' : 'pass', statusLabel: total ? 'Review writing patterns' : 'Writing rules checked', detail: `${value}. ${EDITORIAL_SCOPE}` });
}

/** Character checks never clear an unavailable provider watermark verifier. */
export function formatCharacterReading(result) {
  const axis = record(result?.axes?.text_integrity);
  if (axis?.method_status === 'error' || axis?.reading === 'error') return unavailable(true, 'The character checks');
  if (axis?.reading === 'inconclusive' && (ran(axis.method_status) || axis.method_status === 'inconclusive')) return Object.freeze({
    value: 'No clear answer', status: 'inconclusive', statusLabel: 'Inconclusive',
    count: Array.isArray(axis.findings) ? axis.findings.length : null,
    detail: typeof axis.reason === 'string' && axis.reason.trim() ? axis.reason.trim() : 'The character checks ran but could not reach a clear conclusion. This is not an all-clear or a finding of AI authorship.',
  });
  if (!axis || !ran(axis.method_status)) return unavailable(false, 'The character checks');
  const total = Array.isArray(axis.findings) ? axis.findings.length : null;
  if (axis.reading === 'clean' && total === 0) return Object.freeze({ value: 'No hidden or lookalike characters found', status: 'pass', statusLabel: 'Character checks complete', count: 0, detail: `${CHARACTER_NEGATIVE}. This does not indicate who wrote the text or clear a provider watermark.` });
  if (axis.reading === 'attention' || axis.reading === 'manipulated' || total > 0) return Object.freeze({ value: 'Review character findings', status: 'attention', statusLabel: 'Review character findings', count: total, detail: 'The character checks recorded findings to review. Hidden or lookalike characters can have ordinary uses; these findings do not establish AI authorship.' });
  return unavailable(false, 'The character checks');
}

/** Human-facing allowlist; raw editorial probabilities remain solely in the original result. */
export function sanitiseEditorialSignals(value) {
  if (!record(value) || value.type !== 'editorial_signals') return value;
  const safe = {
    type: 'editorial_rule_summary',
    finding_count: count(value.finding_count ?? value.findingCount),
    categories_hit: strings(value.categories_hit ?? value.categoriesHit),
    scope: EDITORIAL_SCOPE,
  };
  const rulesRun = count(value.rules_run ?? value.rulesRun);
  if (rulesRun !== null) safe.rules_run = rulesRun;
  if (typeof value.version === 'string' && value.version.trim()) safe.version = value.version;
  return Object.freeze(safe);
}
