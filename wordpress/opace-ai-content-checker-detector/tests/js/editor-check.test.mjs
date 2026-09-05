/**
 * The check the editor panels run.
 *
 * These hold the four things a reader would be misled by if they slipped: which
 * route the panel picks, what the button promises before it is pressed, what the
 * panel does when the draft is too short or a route refuses, and that a finished
 * reading is handed to the checker screen through this site rather than through
 * a link.
 *
 * Every test that could pass by accident carries a control.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
	EDITOR_CHECKS,
	EDITOR_MIN_WORDS,
	collectEditorHandoff,
	clearEditorHandoff,
	consentLine,
	countWords,
	createDeterministicEngine,
	draftState,
	editorRequest,
	editorRouteFor,
	fetchEditorServiceStatus,
	primaryLabel,
	readableEditorText,
	refusalNotice,
	routeSentence,
	runEditorCheck,
	storeEditorHandoff
} from '../../assets/js/editor-check.mjs';
import { defaultRoute } from '../../assets/js/lab-route-choice.mjs';

const LIMITS = { maxChars: 100000, minWords: 60, serverPerMin: 3, serverPerHour: 20, sitePerHour: 30, sitePerDay: 120 };
const REST = 'https://wordpress.example/wp-json/oaci/v1/';
const PAGE = 'https://wordpress.example/wp-admin/post.php?post=12&action=edit';

/* --------------------------------------------------------- choosing a route */

test('the panel picks the route the checker screen picks, from the same function', () => {
	for (const conditions of [
		{ serverAvailable: true, secureContext: true },
		{ serverAvailable: true, secureContext: false },
		{ serverAvailable: false, secureContext: true },
		{ serverAvailable: false, secureContext: false },
		{}
	]) {
		assert.equal(editorRouteFor(conditions), defaultRoute(conditions), `the two surfaces disagreed for ${JSON.stringify(conditions)}`);
	}
});

test('an open EU route leads, a plain-HTTP page falls to integrity checks only', () => {
	assert.equal(editorRouteFor({ serverAvailable: true, secureContext: true }), 'server');
	assert.equal(editorRouteFor({ serverAvailable: false, secureContext: true }), 'on_device');
	assert.equal(editorRouteFor({ serverAvailable: false, secureContext: false }), 'local');
});

/* ------------------------------------------------------- the draft's own state */

test('the draft states are told apart before anything runs', () => {
	assert.equal(draftState({ content: '   ' }).state, 'empty');
	assert.equal(draftState({ content: 'a'.repeat(200), maxChars: 100 }).state, 'too_long');
	assert.equal(draftState({ content: 'one two three', minWords: 60 }).state, 'too_short');
	assert.equal(draftState({ content: 'word '.repeat(60), minWords: 60 }).state, 'ready');
});

test('a short draft says how many words are missing, not a proportion', () => {
	const short = draftState({ content: 'word '.repeat(41), minWords: 60 });
	assert.equal(short.words, 41);
	assert.equal(short.missing, 19);
	const line = consentLine('on_device', { words: 41, minWords: 60, modelCached: true });
	assert.match(line, /19 more words for an AI reading/);
	assert.doesNotMatch(line, /%/, 'the panel must never state a percentage');
});

test('the word count is the same function the run uses', () => {
	assert.equal(countWords('  one   two\nthree '), 3);
	assert.equal(countWords(''), 0);
	assert.equal(EDITOR_MIN_WORDS, 60);
});

/* ---------------------------------------------------------- what the button says */

test('the button names the transfer or the download before it happens', () => {
	assert.equal(primaryLabel('server', {}), 'Send once to the EU server and check');
	assert.equal(primaryLabel('on_device', { secureContext: true, modelCached: false, download: '34.5 MB' }), 'Download model (34.5 MB) and check');
	// A reader who downloaded the model last week is not told to download it again.
	assert.equal(primaryLabel('on_device', { secureContext: true, modelCached: true }), 'Check this draft');
	assert.equal(primaryLabel('local', {}), 'Check this draft');
});

test('with a reading already on screen the button says it is a second run, and still names the cost', () => {
	assert.equal(primaryLabel('server', { hasResult: true }), 'Check again, sending once to the EU server');
	assert.equal(primaryLabel('on_device', { hasResult: true, secureContext: true, modelCached: false, download: '34.5 MB' }), 'Check again, downloading the model (34.5 MB)');
	assert.equal(primaryLabel('on_device', { hasResult: true, secureContext: true, modelCached: true }), 'Check this draft again');
	assert.equal(primaryLabel('local', { hasResult: true }), 'Check this draft again');
});

test('a draft the model will not read is never offered a download or a transfer', () => {
	// The press cannot reach a model, so the label must not promise one. It used
	// to offer a 34.5 MB download beside a note explaining the draft was too short.
	assert.equal(primaryLabel('on_device', { modelWillRun: false, secureContext: true, modelCached: false, download: '34.5 MB' }), 'Check the characters and writing');
	assert.equal(primaryLabel('server', { modelWillRun: false }), 'Check the characters and writing');
	assert.equal(primaryLabel('server', { modelWillRun: false, hasResult: true }), 'Check the characters and writing again');
	// The control: with the model in play the same route names its cost again.
	assert.equal(primaryLabel('server', { modelWillRun: true }), 'Send once to the EU server and check');
});

test('the line under the button says what the press costs, and never claims privacy absolutely', () => {
	assert.match(consentLine('server', { words: 200 }), /sent once to our EU server for this run and is not kept there/);
	assert.match(consentLine('on_device', { words: 200, modelCached: false }), /checked against a hash published in this plugin/);
	assert.match(consentLine('on_device', { words: 200, secureContext: false }), /needs an HTTPS connection/);
	assert.match(consentLine('local', { words: 200 }), /No AI reading is possible here/);
	assert.match(consentLine('server', { checking: true }), /Waiting to hear whether private EU analysis is open/);
	for (const route of ['server', 'on_device', 'local']) {
		assert.doesNotMatch(consentLine(route, { words: 200 }), /never|guaranteed|completely private/i);
	}
});

test('the route sentence says where the reading came from, or that there was none', () => {
	assert.match(routeSentence('server', { aiAssessed: true }), /Read once on our EU server/);
	assert.match(routeSentence('on_device', { aiAssessed: true }), /Read on this device/);
	assert.match(routeSentence('local', { aiAssessed: false, secureContext: true }), /no trained model ran, so there is no AI reading/);
	assert.match(routeSentence('local', { aiAssessed: false, secureContext: false }), /plain HTTP/);
});

/* ------------------------------------------------------------------ refusals */

test('an EU refusal is said in words and offers the device in one press', () => {
	const notice = refusalNotice({ code: 'site_hourly_limit', retryAfter: 900 }, { route: 'server', secureContext: true, limits: LIMITS });
	assert.match(notice.happened, /30 section readings an hour/);
	assert.match(notice.next, /in about 15 minutes/);
	assert.deepEqual(notice.offer, { route: 'on_device', label: 'Run on this device instead' });
	assert.equal(notice.kind, 'warning');
	assert.doesNotMatch(`${notice.happened} ${notice.next}`, /site_hourly_limit/, 'a code reached the reader');
});

test('a refusal both routes would give offers nothing rather than a second dead end', () => {
	const notice = refusalNotice({ code: 'request_too_large' }, { route: 'server', secureContext: true, limits: LIMITS });
	assert.equal(notice.offer, null);
	assert.match(notice.happened, /longer than this site’s limit of 100,000 characters/);
});

test('an unrecognised failure still says something a person can act on', () => {
	const notice = refusalNotice({ code: 'something_new', message: 'The check stopped.' }, { route: 'on_device', secureContext: true, limits: LIMITS });
	assert.equal(notice.happened, 'The check stopped.');
	assert.equal(notice.kind, 'error');
	assert.ok(notice.next.length > 0);
});

/* --------------------------------------------------- the request that is sent */

test('the panel asks for the same four checks the checker screen asks for', () => {
	const request = editorRequest('Some writing.', { caller: 'wordpress-editor', postId: 12 });
	assert.deepEqual(request.checks, [...EDITOR_CHECKS]);
	assert.equal(request.source.content_type, 'plain_text');
	assert.equal(request.context.caller_object_id, 'post:12');
	assert.equal(request.privacy.retain_content, false);
	assert.equal(request.privacy.save_receipt, false);
});

/* ------------------------------------------------- the prose, out of the markup */

test('block delimiters, tags and shortcodes are gone before anything is scored', () => {
	const raw = '<!-- wp:paragraph --><p>First line.</p><!-- /wp:paragraph -->\n<!-- wp:paragraph --><p>Second line.</p><!-- /wp:paragraph -->';
	assert.equal(readableEditorText(raw), 'First line.\n\nSecond line.');
	assert.equal(readableEditorText('<p>A<br>B</p>'), 'A\nB');
	assert.equal(readableEditorText('<p>Before [gallery ids="1,2"] after.</p>'), 'Before  after.');
	assert.equal(readableEditorText('<p>Code</p><script>alert(1)</script>'), 'Code');
});

test('the title leads the draft only when it is writing rather than a label', () => {
	assert.equal(readableEditorText('<p>Body.</p>', 'A real title'), 'A real title\n\nBody.');
	assert.equal(readableEditorText('<p>Body.</p>', 'Auto Draft'), 'Body.');
	assert.equal(readableEditorText('<p>Body.</p>', '2026-09-05'), 'Body.');
	// A title already standing as the first line is not printed twice.
	assert.equal(readableEditorText('<p>A real title</p><p>Body.</p>', 'A real title'), 'A real title\n\nBody.');
});

/* --------------------------------------------------------------- the engine */

test('the engine runs in a worker when there is one, and on this thread when there is not', async () => {
	const seen = [];
	const engine = createDeterministicEngine({
		workerUrl: 'worker.mjs',
		createWorker() {
			return {
				listeners: {},
				addEventListener(name, handler) { this.listeners[name] = handler; },
				postMessage(message) {
					seen.push(message);
					queueMicrotask(() => this.listeners.message({ data: { id: message.id, ok: true, result: { ran: 'in the worker' } } }));
				},
				terminate() { seen.push('terminated'); }
			};
		}
	});
	assert.deepEqual(await engine.inspect({ source: { content: 'x' } }), { ran: 'in the worker' });
	assert.equal(engine.threaded, true);
	assert.equal(seen.length, 1);

	const onThisThread = createDeterministicEngine({ workerUrl: '', moduleUrl: new URL('../fixtures/editor/fake-core.mjs', import.meta.url).href });
	assert.equal(onThisThread.threaded, false);
	assert.equal((await onThisThread.inspect({ source: { content: 'x' } })).ran, 'on this thread');
});

test('cancelling a run tears the worker down rather than leaving it holding an answer', async () => {
	let terminated = false;
	const engine = createDeterministicEngine({
		workerUrl: 'worker.mjs',
		createWorker() {
			return {
				listeners: {},
				addEventListener(name, handler) { this.listeners[name] = handler; },
				postMessage() {},
				terminate() { terminated = true; }
			};
		}
	});
	const controller = new AbortController();
	const running = engine.inspect({ source: { content: 'x' } }, controller.signal);
	controller.abort();
	await assert.rejects(running, (error) => error.name === 'AbortError');
	assert.equal(terminated, true);
});

/* ---------------------------------------------------------------- one run */

const deterministicResult = (content) => Object.freeze({
	source: { content_hash: 'sha256:abc', word_count: 80 },
	pattern_findings: [{ rule_id: 'style.negated_contrast' }],
	combined_verdict: {},
	protected_spans: [],
	methods: [],
	limitations: [],
	completed_at: '2026-09-05T09:00:00.000Z',
	content
});

function fakeCycle5() {
	return Promise.resolve({
		buildWordPressPrimitiveResult: (deterministic) => ({ primitive: true, hash: deterministic.source.content_hash }),
		composeWordPressServerResult: (primitive, payload) => ({ ...primitive, from: 'server', payload }),
		composeWordPressOnDeviceResult: (primitive, score) => ({ ...primitive, from: 'on_device', score }),
		createWordPressCycle5Runtime: () => ({
			prepareFromCache: async () => true,
			score: async () => ({ status: 'scored', sections: [] }),
			dispose() {}
		})
	});
}

const engineFor = (result) => ({ inspect: async () => result, destroy() {} });

test('a draft under the minimum stops at the integrity result rather than being refused by a route', async () => {
	const content = 'word '.repeat(20);
	const run = await runEditorCheck({
		config: { maxChars: 100000, limits: { minWords: 60 } },
		consented: true,
		content,
		engine: engineFor(deterministicResult(content)),
		importCycle5: fakeCycle5(),
		route: 'server',
		signal: new AbortController().signal
	});
	assert.equal(run.aiAssessed, false);
	assert.equal(run.route, 'local');
	assert.equal(run.result.primitive, true);
});

test('the on-device route composes an on-device reading and disposes the runtime', async () => {
	const content = 'word '.repeat(80);
	const phases = [];
	const run = await runEditorCheck({
		config: { maxChars: 100000, limits: { minWords: 60 }, onDevice: {} },
		consented: true,
		content,
		engine: engineFor(deterministicResult(content)),
		importCycle5: fakeCycle5(),
		onPhase: (message) => phases.push(message),
		route: 'on_device',
		secureContext: true,
		signal: new AbortController().signal
	});
	assert.equal(run.aiAssessed, true);
	assert.equal(run.result.from, 'on_device');
	assert.ok(phases.some((message) => /character and writing checks/.test(message)));
	assert.ok(phases.some((message) => /on this device/.test(message)));
});

test('a run with nothing in it, or more than the site allows, never reaches a route', async () => {
	const base = {
		config: { maxChars: 50, limits: { minWords: 60 } },
		consented: true,
		engine: { inspect: async () => { throw new Error('the engine should not have run'); }, destroy() {} },
		importCycle5: fakeCycle5(),
		route: 'server',
		signal: new AbortController().signal
	};
	await assert.rejects(runEditorCheck({ ...base, content: '   ' }), (error) => error.code === 'empty_source');
	await assert.rejects(runEditorCheck({ ...base, content: 'a'.repeat(80) }), (error) => error.code === 'text_too_long');
});

test('the on-device route refuses a page the browser will not let it verify a download on', async () => {
	const content = 'word '.repeat(80);
	await assert.rejects(
		runEditorCheck({
			config: { maxChars: 100000, limits: { minWords: 60 } },
			consented: true,
			content,
			engine: engineFor(deterministicResult(content)),
			importCycle5: fakeCycle5(),
			route: 'on_device',
			secureContext: false,
			signal: new AbortController().signal
		}),
		(error) => error.code === 'insecure_context'
	);
});

/* -------------------------------------------------------------- the hand-off */

const handoffStorage = () => {
	const entries = new Map();
	return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key), entries };
};

test('a finished reading stays in tab storage without sending the draft to any server', async () => {
	const calls = [];
	const storage = handoffStorage();
	const stored = await storeEditorHandoff({
		restUrl: REST,
		pageUrl: PAGE,
		nonce: 'nonce-wp_rest',
		postId: 12,
		result: { result_id: 'result_1', axes: {} },
		sourceText: 'The draft the model read.',
		findings: [{ rule_id: 'style.negated_contrast' }],
		storage,
		fetchImpl: async (url, options) => {
			calls.push({ url, options });
			return { ok: true, json: async () => ({ stored: true }) };
		}
	});
	assert.equal(stored, true);
	assert.equal(calls.length, 0);
	assert.equal(storage.entries.size, 1);
	const [key, encoded] = [...storage.entries][0];
	assert.doesNotMatch(key, /result_1|The draft/);
	const body = JSON.parse(encoded);
	assert.equal(body.content, 'The draft the model read.');
	assert.ok(body.expires > Date.now());
});

test('a hand-off that cannot be stored is not an error the reader has to solve', async () => {
	assert.equal(await storeEditorHandoff({ restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 12, result: {}, storage: { setItem() { throw new Error('storage blocked'); } } }), false);
	assert.equal(await storeEditorHandoff({ restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 0, result: {} }), false);
});

test('the checker screen collects a reading once, or nothing', async () => {
	const options = { restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 12, storage: handoffStorage(), now: 1000 };
	await storeEditorHandoff({ ...options, result: { result_id: 'result_1' }, sourceText: 'Draft.' });
	const handed = await collectEditorHandoff(options);
	assert.deepEqual(handed, { result: { result_id: 'result_1' }, content: 'Draft.', findings: [] });
	assert.equal(await collectEditorHandoff(options), null);
	assert.equal(options.storage.entries.size, 0);
});

test('a refused replacement never leaves a previous reading waiting', async () => {
	const options = { restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 12, storage: handoffStorage(), now: 1000 };
	for (const replacement of [null, { result_id: 'too-large' }]) {
		await storeEditorHandoff({ ...options, result: { result_id: 'old' }, sourceText: 'Old draft.' });
		assert.equal(await storeEditorHandoff({ ...options, result: replacement, sourceText: 'x'.repeat(1000001) }), false);
		assert.equal(await collectEditorHandoff(options), null);
	}
});

test('clearing a handover preserves other users, posts and unrelated tab data', async () => {
	const options = { restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 12, storage: handoffStorage() };
	await storeEditorHandoff({ ...options, result: { result_id: 'current' }, sourceText: 'Current.' });
	await storeEditorHandoff({ ...options, postId: 13, result: { result_id: 'other' }, sourceText: 'Other.' });
	options.storage.setItem('unrelated', 'keep');
	assert.equal(clearEditorHandoff(options), true);
	assert.equal(await collectEditorHandoff(options), null);
	assert.equal((await collectEditorHandoff({ ...options, postId: 13 })).content, 'Other.');
	assert.equal(options.storage.getItem('unrelated'), 'keep');
});

test('a storage write failure cannot resurrect the preceding report', async () => {
	const storage = handoffStorage();
	const options = { restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 12, storage };
	await storeEditorHandoff({ ...options, result: { result_id: 'old' }, sourceText: 'Old.' });
	storage.setItem = () => { throw new Error('quota exceeded'); };
	assert.equal(await storeEditorHandoff({ ...options, result: { result_id: 'new' }, sourceText: 'New.' }), false);
	assert.equal(await collectEditorHandoff(options), null);
});

test('tab hand-offs expire and cannot cross the site, user or post boundary', async () => {
	const options = { restUrl: REST, pageUrl: PAGE, nonce: 'n', postId: 12, storage: handoffStorage(), now: 1000 };
	await storeEditorHandoff({ ...options, result: { result_id: 'result_1' }, sourceText: 'Draft.' });
	assert.equal(await collectEditorHandoff({ ...options, nonce: 'different-user' }), null);
	assert.equal(await collectEditorHandoff({ ...options, postId: 13 }), null);
	assert.equal(await collectEditorHandoff({ ...options, now: 301000 }), null);
	assert.equal(options.storage.entries.size, 0);
	assert.equal(await storeEditorHandoff({ ...options, result: {}, sourceText: 'x'.repeat(1000001) }), false);
});

test('the hand-off and the status probe both stay on this site', async () => {
	for (const call of [
		() => storeEditorHandoff({ restUrl: 'https://elsewhere.example/wp-json/oaci/v1/', pageUrl: PAGE, nonce: 'n', postId: 12, result: {}, fetchImpl: async () => ({ ok: true }) }),
		() => collectEditorHandoff({ restUrl: 'https://elsewhere.example/wp-json/oaci/v1/', pageUrl: PAGE, nonce: 'n', postId: 12, fetchImpl: async () => ({ ok: true, json: async () => ({}) }) })
	]) {
		assert.ok([false, null].includes(await call()), 'a cross-site REST URL was followed');
	}
	await assert.rejects(
		fetchEditorServiceStatus({ restUrl: 'https://elsewhere.example/wp-json/oaci/v1/', pageUrl: PAGE, nonce: 'n', fetchImpl: async () => ({ ok: true, json: async () => ({}) }) }),
		/not on this site/
	);
});

test('the status probe reads this site’s answer and asks it on the same origin', async () => {
	let asked = '';
	const answer = await fetchEditorServiceStatus({
		restUrl: REST,
		pageUrl: PAGE,
		nonce: 'n',
		fetchImpl: async (url) => {
			asked = url;
			return { ok: true, json: async () => ({ available: true, checking: false, state: 'ready' }) };
		}
	});
	assert.equal(asked, 'https://wordpress.example/wp-json/oaci/v1/analysis/server/status');
	assert.deepEqual(answer, { available: true, checking: false, state: 'ready' });
});
