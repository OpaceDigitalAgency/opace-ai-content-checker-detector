/**
 * The panel both editors draw.
 *
 * The block editor's sidebar and the Classic Editor's box are the same panel in
 * two frames, so they are one function here rather than two files that drift.
 * The block editor supplies the post content from its own store; the Classic
 * Editor reads TinyMCE or the plain textarea. Everything after that — the
 * consent line, the run, the states, the compact reading and the hand-off into
 * the checker screen — is identical, and is here.
 *
 * The panel never speaks in codes and never leaves a stale claim on screen. Each
 * notice is one sentence about what happened and one about what to do, which is
 * the shape every other screen in this plugin uses.
 */
const editorVersion = encodeURIComponent(new URL(import.meta.url).searchParams.get('ver') || '0');
const {
	clearEditorHandoff,
	consentLine,
	createDeterministicEngine,
	draftState,
	editorRouteFor,
	fetchEditorServiceStatus,
	primaryLabel,
	refusalNotice,
	routeSentence,
	runEditorCheck,
	storeEditorHandoff
} = await import(`./editor-check.mjs?ver=${editorVersion}`);
const { renderEditorSummary } = await import(`./editor-summary.mjs?ver=${editorVersion}`);

/*
	Every module this panel reaches for at run time is given to it as a URL that
	already carries the plugin version, because a browser that cached
	`editor-check.mjs` from the release before would otherwise keep using it. The
	imports above explicitly inherit the version from this module's entry URL;
	`core.mjs`, the worker and the Cycle-5 wrapper are not, so they arrive in
	`config.modules`.
*/

const element = (tag, className, text) => {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text !== undefined && text !== null) node.textContent = String(text);
	return node;
};

/**
 * Draws the panel into `host` and keeps it right.
 *
 * @param {Element} host
 * @param {object} options
 * @param {Function} options.getContent  Returns the draft as it is right now.
 * @param {object} options.config        The localised editor configuration.
 * @param {string} [options.surface]     'block' or 'classic', for the caller name.
 * @returns {{destroy: Function, refreshLabels: Function}}
 */
export function mountEditorPanel(host, options) {
	const config = options.config || {};
	const listeners = new AbortController();
	const secureContext = window.isSecureContext !== false;
	const minWords = Number(config.limits?.minWords) > 0 ? Number(config.limits.minWords) : 60;
	let checking = config.serverAnalysis?.checking === true;
	let serverAvailable = config.serverAnalysis?.available === true;
	let modelCached = false;
	let running = false;
	let activeRun = null;
	let lastContent = null;
	let completedRoute = null;
	let engine = null;
	let semantics = null;

	host.replaceChildren();
	host.classList.add('oaci-ed');

	/* ------------------------------------------------------------ the frame */

	const head = element('div', 'oaci-ed__head');
	if (config.logoUrl) {
		const mark = document.createElement('img');
		mark.className = 'oaci-ed__mark';
		mark.src = config.logoUrl;
		mark.alt = '';
		mark.width = 28;
		mark.height = 28;
		head.append(mark);
	}
	const routeLine = element('p', 'oaci-ed__route');
	head.append(routeLine);
	const runButton = element('button', 'oaci-ed__go');
	runButton.type = 'button';
	const note = element('p', 'oaci-ed__note');

	const progress = element('div', 'oaci-ed__progress');
	progress.hidden = true;
	const bar = document.createElement('progress');
	bar.max = 1;
	const phase = element('p', 'oaci-ed__phase');
	const cancel = element('button', 'oaci-ed__cancel', 'Cancel');
	cancel.type = 'button';
	progress.append(bar, phase, cancel);

	const notice = element('div', 'oaci-ed__notice');
	notice.setAttribute('role', 'status');
	notice.setAttribute('aria-live', 'polite');
	notice.hidden = true;

	const results = element('div', 'oaci-ed__results');
	results.hidden = true;

	const actions = element('div', 'oaci-ed__actions');
	actions.hidden = true;
	const open = document.createElement('a');
	open.className = 'oaci-ed__open';
	open.textContent = 'View full report';
	open.href = config.checkUrl || config.labUrl || '#';
	actions.append(open);

	// The reading leads once there is one, and the button that would run it
	// again sits under it still naming what a press costs. There is no separate
	// "Check again": a second button doing the same thing with a vaguer label is
	// how a panel ends up promising less than it does.
	host.append(head, notice, results, actions, runButton, note, progress);

	/* ---------------------------------------------------------- the notices */

	const clearNotice = () => {
		notice.replaceChildren();
		notice.hidden = true;
		notice.removeAttribute('data-kind');
	};

	/**
	 * One sentence saying what happened, one saying what to do, and at most one
	 * control that does it.
	 *
	 * @param {string} happened
	 * @param {{next?: string, kind?: string, offer?: {route: string, label: string}}} detail
	 */
	const say = (happened, detail = {}) => {
		notice.replaceChildren();
		if (!happened) return clearNotice();
		notice.hidden = false;
		notice.dataset.kind = detail.kind || 'info';
		notice.append(element('strong', null, happened));
		if (detail.next) notice.append(element('p', null, detail.next));
		if (!detail.offer) return;
		const button = element('button', 'oaci-ed__offer', detail.offer.label);
		button.type = 'button';
		button.addEventListener('click', () => run({ consented: true, route: detail.offer.route }), { signal: listeners.signal });
		notice.append(button);
	};

	/* ------------------------------------------------------------ the label */

	const currentRoute = () => editorRouteFor({ serverAvailable, secureContext });

	const refreshLabels = () => {
		const content = String(options.getContent() ?? '');
		const draft = draftState({ content, maxChars: config.maxChars, minWords });
		const route = currentRoute();
		const displayedRoute = host.classList.contains('has-result') && completedRoute ? completedRoute : route;
		const checkingHeader = checking && !host.classList.contains('has-result');
		routeLine.textContent = checkingHeader
			? 'Checking available methods…'
			: displayedRoute === 'server'
				? 'Private EU analysis'
				: displayedRoute === 'on_device'
					? 'On-device analysis'
					: 'Integrity checks only';
		routeLine.dataset.route = checkingHeader ? 'checking' : displayedRoute;
		runButton.textContent = checking
			? 'Checking which routes are open…'
			: primaryLabel(route, {
				modelCached,
				secureContext,
				download: config.onDevice?.download,
				hasResult: host.classList.contains('has-result'),
				modelWillRun: (route === 'server' || route === 'on_device') && draft.state === 'ready'
			});
		runButton.disabled = running || checking || draft.state === 'empty';
		note.textContent = draft.state === 'empty'
			? 'There is nothing to check yet. Write some text and the button will wake up.'
			: draft.state === 'too_long'
				? `This draft is ${(draft.characters - Number(config.maxChars || 100000)).toLocaleString('en-GB')} characters over this site’s limit. Nothing will be shortened.`
				: consentLine(route, { modelCached, secureContext, words: draft.words, minWords, checking });
		if (draft.state === 'too_long') runButton.disabled = true;
	};

	/* -------------------------------------------------------------- the run */

	const setRunning = (value, message = '') => {
		running = value;
		progress.hidden = !value;
		if (message) phase.textContent = message;
		if (!value) bar.removeAttribute('value');
		host.classList.toggle('is-running', value);
		refreshLabels();
	};

	async function loadEngine() {
		if (!engine) {
			engine = createDeterministicEngine({
				workerUrl: config.modules?.worker,
				moduleUrl: config.modules?.core
			});
		}
		if (!semantics) {
			const core = await import(config.modules?.core || './core.mjs');
			semantics = { levels: core.CHECKER_LEVELS, honestyLine: core.CHECKER_HONESTY_LINE };
		}
		return engine;
	}

	async function run(request = {}) {
		if (running) return;
		invalidateHandoff();
		const content = String(options.getContent() ?? '');
		const route = request.route || currentRoute();
		clearNotice();
		results.hidden = true;
		actions.hidden = true;
		host.classList.remove('has-result', 'is-stale');
		activeRun = new AbortController();
		const controller = activeRun;
		setRunning(true, 'Getting ready…');
		try {
			await loadEngine();
			const { deterministic, result, route: ranOn, aiAssessed } = await runEditorCheck({
				// The run is given what is true now, not what the page was rendered
				// with. The EU service scales to zero, so its answer usually lands
				// after the page: a run built from the render-time configuration
				// refused itself with "off in this site's settings" on a site where
				// the route had just come up, and the route line above the button
				// said the opposite.
				config: {
					...config,
					caller: options.surface === 'classic' ? 'wordpress-classic' : 'wordpress-editor',
					serverAnalysis: { ...(config.serverAnalysis || {}), available: serverAvailable, checking }
				},
				consented: request.consented === true,
				content,
				engine,
				onPhase: (message) => { phase.textContent = message; },
				onProgress: (fraction) => {
					if (fraction === null) bar.removeAttribute('value');
					else bar.value = Math.min(1, Math.max(0, fraction));
				},
				importCycle5: config.modules?.cycle5 ? import(config.modules.cycle5) : undefined,
				route,
				secureContext,
				signal: controller.signal
			});
			if (controller.signal.aborted) return;
			if (route === 'on_device' && aiAssessed) modelCached = true;
			lastContent = content;
			completedRoute = ranOn;
			renderEditorSummary(results, result, {
				sourceText: content,
				selectedRuleFindings: deterministic?.pattern_findings ?? [],
				levels: semantics.levels,
				honestyLine: semantics.honestyLine,
				routeSentence: routeSentence(ranOn, { aiAssessed, secureContext })
			});
			results.hidden = false;
			actions.hidden = false;
			host.classList.add('has-result');
			host.classList.remove('is-stale');
			const draftChanged = String(options.getContent() ?? '') !== lastContent;
			if (draftChanged) {
				host.classList.add('is-stale');
				say('The draft changed while it was being read.', { next: 'Run it again before relying on this reading.', kind: 'warning' });
			} else if (!aiAssessed) {
				const draft = draftState({ content, maxChars: config.maxChars, minWords });
				say(
					draft.state === 'too_short' ? `There is not enough text for the model to read: it needs about ${minWords} words.` : 'This run produced no AI reading.',
					{ next: 'The character and writing checks above ran on what you have.', kind: 'warning' }
				);
			}
			// The full reading opens with this result already on it, so the
			// checker screen does not read the same draft a second time.
			const handed = !draftChanged && await storeEditorHandoff({
				restUrl: config.restUrl,
				pageUrl: window.location.href,
				nonce: config.nonce,
				postId: config.postId,
				result,
				sourceText: content,
				findings: deterministic?.pattern_findings ?? []
			});
			open.textContent = handed && String(options.getContent() ?? '') === lastContent ? 'View full report' : 'Open in full checker';
		} catch (error) {
			if (controller.signal.aborted || error?.name === 'AbortError') {
				say('Run cancelled.', { next: 'Nothing was put in place of the reading you stopped.', kind: 'warning' });
			} else if (error?.code === 'model_consent_required') {
				say('The model has not been downloaded to this device yet.', { next: 'Press the button above, which names the download, to fetch and verify it once.', kind: 'warning' });
				runButton.focus();
			} else {
				const refusal = refusalNotice(error, { route, secureContext, limits: config.limits });
				say(refusal.happened, refusal);
			}
		} finally {
			if (activeRun === controller) {
				activeRun = null;
				setRunning(false);
			}
		}
	}

	/* ------------------------------------------------------------- the wiring */

	function invalidateHandoff() {
		clearEditorHandoff({ restUrl: config.restUrl, pageUrl: window.location.href, nonce: config.nonce, postId: config.postId });
		open.textContent = 'Open in full checker';
	}

	runButton.addEventListener('click', () => run({ consented: true }), { signal: listeners.signal });
	cancel.addEventListener('click', () => activeRun?.abort(), { signal: listeners.signal });

	/**
	 * Whether a verified model is already in this browser's cache. The button's
	 * label depends on it: a reader who downloaded the model last week should not
	 * be told they are about to download it again. Unknown reads as absent, which
	 * promises a download that may not happen rather than hiding one.
	 */
	(async () => {
		if (!secureContext) return;
		try {
			const { cachedModelPresent } = await import(config.modules?.cycle5 || './cycle5-wordpress.mjs');
			modelCached = await cachedModelPresent({ modelBaseUrl: config.onDevice?.overriddenModelBaseUrl || config.onDevice?.modelBaseUrl });
		} catch {
			modelCached = false;
		}
		refreshLabels();
	})();

	/**
	 * The EU service scales to zero, so the answer can take longer than any
	 * editor screen should wait for. The panel draws from what the site already
	 * knew and corrects itself once the answer lands.
	 */
	if (checking) {
		fetchEditorServiceStatus({ restUrl: config.restUrl, pageUrl: window.location.href, nonce: config.nonce, signal: listeners.signal })
			.then((answer) => { serverAvailable = answer.available; checking = false; refreshLabels(); })
			.catch((error) => { if (error?.name !== 'AbortError') { serverAvailable = false; checking = false; refreshLabels(); } });
	}

	refreshLabels();

	return {
		refreshLabels,
		markStale() {
			if (results.hidden || lastContent === null) return;
			if (String(options.getContent() ?? '') === lastContent) return;
			invalidateHandoff();
			host.classList.add('is-stale');
			say('The draft changed since this reading.', { next: 'Run it again before relying on it.', kind: 'warning' });
		},
		destroy() {
			listeners.abort();
			activeRun?.abort();
			engine?.destroy();
			host.replaceChildren();
		}
	};
}
