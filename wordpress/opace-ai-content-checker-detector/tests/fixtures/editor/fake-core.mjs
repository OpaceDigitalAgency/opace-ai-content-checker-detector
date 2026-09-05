/**
 * Stands in for the compiled engine where a test needs the panel's behaviour
 * rather than the engine's. It answers with the shape the panel reads and
 * nothing more; every real run in evidence goes through the real `core.mjs`.
 */
export const CHECKER_LEVELS = {
	'signal-strongly-ai': { name: 'Strongly AI', support: 'This draft very strongly matches AI writing — the kind of match we rarely see in human work.' },
	'signal-likely-ai': { name: 'Likely AI', support: 'Much of this draft reads like AI writing.' },
	'signal-potentially-ai': { name: 'Potentially AI', support: 'Parts of this draft resemble AI writing, but the match is not strong enough to be sure.' },
	'signal-unclear': { name: 'Unclear', support: 'We cannot call this one either way.' },
	'signal-likely-human': { name: 'Likely human', support: 'This reads like human writing.' }
};

export const CHECKER_HONESTY_LINE = 'No AI checker can prove who wrote a text — this is a pattern reading.';

export async function inspect(request) {
	if (globalThis.__oaciEngineFails) throw Object.assign(new Error('The checks could not be completed.'), { code: 'inspection_failed' });
	return {
		ran: 'on this thread',
		source: { content_hash: 'sha256:abc', word_count: 120 },
		pattern_findings: [{ rule_id: 'style.negated_contrast', evidence: { matched: 'is not one thing' }, suggestion: 'State what it is.', message: 'A negated contrast template appears here.' }],
		protected_spans: [],
		methods: [],
		limitations: [],
		combined_verdict: {},
		completed_at: '2026-09-05T09:00:00.000Z',
		request_id: request?.request_id ?? 'req_test'
	};
}
