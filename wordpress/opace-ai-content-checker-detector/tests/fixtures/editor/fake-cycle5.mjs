/**
 * Stands in for the Cycle-5 wrapper.
 *
 * It answers with the same shapes and the same synchronicity as the real module:
 * a primitive result whose AI axis is honestly not assessed, and the canonical
 * fixture for a run that a model read. It can be told to refuse, to need a
 * download or to be cancelled, which are the states the panel has to show.
 */
const FIXTURE = (await (await fetch('/tests/fixtures/contracts/valid/checker-result.json')).json()).data;

const NOT_ASSESSED = Object.freeze({
	assessment_status: 'not_assessed',
	method_status: 'not_run',
	source: null,
	raw_score: null,
	display_score: null,
	level: null,
	strongest_section_index: null,
	reason: 'No trained model ran on this text, so the AI-pattern reading is not assessed.',
	limitations: ['Authorship cannot be proved from these checks.']
});

export function buildWordPressPrimitiveResult() {
	return {
		...FIXTURE,
		profile: 'primitive',
		sections: [],
		axes: { ...FIXTURE.axes, ai_pattern: NOT_ASSESSED }
	};
}

export function composeWordPressServerResult() {
	if (globalThis.__oaciServerRefuses) {
		throw Object.assign(new Error('refused'), { code: String(globalThis.__oaciServerRefuses) });
	}
	return FIXTURE;
}

export function composeWordPressOnDeviceResult() {
	return FIXTURE;
}

export function createWordPressCycle5Runtime() {
	return {
		async prepareFromCache() { return globalThis.__oaciModelCached === true; },
		async prepareWithConsent(options) {
			options.onProgress({ fileIndex: 1, fileCount: 1, receivedBytes: 18 * 1024 * 1024, totalBytes: 36 * 1024 * 1024 });
			if (!globalThis.__oaciHoldDownload) return;
			// A held download ends only when the reader cancels, which is how the
			// real runtime behaves and the only way to photograph the cancelled state.
			await new Promise((resolve, reject) => {
				options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
			});
		},
		async score() { return { status: 'scored', sections: FIXTURE.sections }; },
		dispose() {}
	};
}

export async function cachedModelPresent() {
	return globalThis.__oaciModelCached === true;
}
