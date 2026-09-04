const config = window.OpaceContentIntegrityConfig || {};
const cacheVersion = encodeURIComponent(config.pluginVersion || '0');
const [{ inspect, previewSafeFixes, CHECKER_LEVELS, CHECKER_HONESTY_LINE, assertCheckerResultInvariants }, { renderEvidence, unicodeFindingsForResult }, { analyseOnServer, readTextFile, isProvenanceFile, MAX_LOCAL_FILE_BYTES }, { renderCheckerResult }, { downloadCheckerPdf }, { copyCheckerShareSummary }, { LAB_EXAMPLES }, { limitNotice, limitNoticeParts }, { requestId }, { defaultRoute, fallbackOffer }, { applyServiceStatus, fetchServiceStatus, serviceStateFrom }] = await Promise.all([
	import(`./core.mjs?ver=${cacheVersion}`),
	import(`./lab-evidence.mjs?ver=${cacheVersion}`),
	import(`./lab-route.mjs?ver=${cacheVersion}`),
	import(`./checker-result.mjs?ver=${cacheVersion}`),
	import(`./checker-report.mjs?ver=${cacheVersion}`),
	import(`./checker-share.mjs?ver=${cacheVersion}`),
	import(`./lab-examples.mjs?ver=${cacheVersion}`),
	import(`./lab-limits.mjs?ver=${cacheVersion}`),
	import(`./random-id.mjs?ver=${cacheVersion}`),
	import(`./lab-route-choice.mjs?ver=${cacheVersion}`),
	import(`./lab-service-status.mjs?ver=${cacheVersion}`)
]);
const checks = ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'];
const checkerSemantics = Object.freeze({ levels: CHECKER_LEVELS, honestyLine: CHECKER_HONESTY_LINE, assertResult: assertCheckerResultInvariants });
const MODEL_WORD_MINIMUM = Number(config.limits?.minWords) > 0 ? Number(config.limits.minWords) : 60;


function requestFor(content, context = {}) {
	return {
		schema_version: '1.0', contract_version: '1.0.0', request_id: requestId(), created_at: new Date().toISOString(),
		source: { content, content_type: context.contentType || 'plain_text', language: document.documentElement.lang || 'en-GB' }, checks,
		privacy: { allowed_routes: ['browser', 'wordpress_local'], save_receipt: false, retain_content: false },
		context: { caller: context.caller || 'standalone', caller_object_id: context.sourceRef || 'paste:working-copy' }
	};
}

function textNode(tag, text, className) {
	const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node;
}

const countWords = (value) => String(value).trim().match(/\S+/gu)?.length ?? 0;

function mount(element, options = {}) {
	let state = { status: 'idle', result: null, sourceHash: options.sourceHash || '', error: null };
	const listeners = new AbortController();
	const getContent = options.getContent || (() => element.querySelector('#oaci-source')?.value || '');
	const status = element.querySelector('#oaci-status');
	const results = element.querySelector('#oaci-results');
	const protectedPanel = element.querySelector('#oaci-protected');
	const protectedList = element.querySelector('#oaci-protected-list');
	const protectedButton = element.querySelector('#oaci-show-protected');
	const inspectButton = element.querySelector('#oaci-inspect');
	const fixesButton = element.querySelector('#oaci-preview-fixes');
	const receiptButton = element.querySelector('#oaci-save-receipt');
	const pdfButton = element.querySelector('#oaci-download-pdf');
	const jsonButton = element.querySelector('#oaci-download-json');
	const shareButton = element.querySelector('#oaci-copy-share');
	const printButton = element.querySelector('#oaci-print');
	const source = element.querySelector('#oaci-source');
	const sourceError = element.querySelector('#oaci-source-error');
	const fixPanel = element.querySelector('#oaci-fix-panel');
	const fixList = element.querySelector('#oaci-fix-list');
	const applyFixes = element.querySelector('#oaci-apply-fixes');
	const routeInputs = [...element.querySelectorAll('input[name="oaci-analysis-route"]')];
	const routeDetail = element.querySelector('#oaci-route-detail');
	const modelFacts = element.querySelector('#oaci-model-facts');
	const routeLive = element.querySelector('#oaci-route-live');
	const serverRouteCard = element.querySelector('[data-oaci-route-card="server"]');
	const serverRouteTag = element.querySelector('[data-oaci-route-tag="server"]');
	const serverRouteBlurb = element.querySelector('[data-oaci-route-blurb="server"]');
	const onDeviceRouteTag = element.querySelector('[data-oaci-route-tag="on_device"]');
	const modelDownload = element.querySelector('#oaci-model-download');
	const modelCacheState = element.querySelector('#oaci-model-cache-state');
	const toolbar = element.querySelector('#oaci-toolbar');
	const toolbarNote = element.querySelector('#oaci-toolbar-note');
	const resultPanel = element.querySelector('#oaci-result-panel');
	const runBar = element.querySelector('#oaci-run-progress progress');
	const clearModelCache = element.querySelector('#oaci-clear-model-cache');
	const fileInput = element.querySelector('#oaci-source-file');
	const dropzone = element.querySelector('#oaci-dropzone');
	const fileName = element.querySelector('#oaci-file-name');
	const fileError = element.querySelector('#oaci-file-error');
	const sourceCount = element.querySelector('#oaci-source-count');
	const wordCount = element.querySelector('#oaci-word-count');
	const countHint = element.querySelector('#oaci-count-hint');
	const primaryNote = element.querySelector('#oaci-primary-note');
	const progress = element.querySelector('#oaci-run-progress');
	const runPhase = element.querySelector('#oaci-run-phase');
	const cancelButton = element.querySelector('#oaci-cancel-run');
	const tabs = [...element.querySelectorAll('[data-oaci-tab]')];
	const examplesHost = element.querySelector('#oaci-examples');
	let request;
	let unicodeFindings = [];
	let inspectedContent = null;
	let activeRun = null;
	let contentType = 'plain_text';
	let canonicalResult = null;
	let provenanceExport = null;
	let cycle5Module = null;
	let cycle5Runtime = null;
	// Whether the reader has picked a card themselves. A late answer from the
	// service relabels the cards either way, but it only moves the selection
	// while nobody has moved it, so an answer never overrides a decision.
	let routeChosen = false;
	let runningNow = false;
	// Whether a verified model is already in this browser's cache. The button's
	// label depends on it: a reader who downloaded the model last week should
	// not be told they are about to download it again. Unknown reads as absent,
	// which promises a download that may not happen rather than hiding one.
	let modelCached = false;
	// Whether this site is still waiting to hear if private EU analysis is open.
	// While it is, the button's meaning is genuinely unsettled: the answer can
	// move the selected route and therefore the button's own label. A control
	// that could change under the reader's cursor must not be pressable, so it
	// is disabled until the answer lands or the reader picks a route themselves.
	let serviceChecking = config.serverAnalysis?.checking === true;
	// How long the draft is now, so the button's line can say what is missing.
	let draftWords = 0;

	/**
	 * Every notice on this screen has the same shape: one sentence saying what
	 * happened, one saying what to do about it, and at most one button that does
	 * the thing. No codes, no stack of boxes, and nothing left on the screen from
	 * the run before.
	 *
	 * @param {string} happened  What happened, in one sentence.
	 * @param {{next?: string, kind?: string, offer?: {route: string, label: string}}} options
	 */
	const notice = (happened, options = {}) => {
		if (!status) return;
		status.replaceChildren();
		if (!happened) { status.className = ''; return; }
		status.className = `oaci-notice${options.kind ? ` oaci-notice--${options.kind}` : ''}`;
		status.append(textNode('strong', happened));
		if (options.next) status.append(textNode('p', options.next));
		if (options.link) {
			const link = document.createElement('a');
			link.className = 'oaci-button';
			link.href = options.link.href;
			link.textContent = options.link.label;
			status.append(link);
		}
		if (!options.offer) return;
		// A refused EU run is not a dead end: the same model runs here, with no
		// limit, and the button does the switching so the reader does not have to
		// find the card again.
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'oaci-button';
		button.id = 'oaci-run-fallback';
		button.textContent = options.offer.label;
		button.addEventListener('click', () => {
			const input = routeInputs.find((option) => option.value === options.offer.route);
			if (!input || input.disabled) return;
			input.checked = true;
			routeChosen = true;
			if (routeLive) routeLive.textContent = '';
			updateRoute();
			input.focus();
			run({ consented: true });
		}, { signal: listeners.signal });
		status.append(button);
	};
	const announce = (message, kind = '') => notice(message, { kind });
	/** Prefer a plain-English limit message over any raw code the layer beneath returned. */
	const announceError = (error, fallback) => {
		const friendly = limitNoticeParts(error, config.limits || {});
		const offer = fallbackOffer(error, { route: selectedRoute(), secureContext: secureContext() });
		notice(friendly ? friendly.happened : (error?.message || fallback), {
			next: friendly ? friendly.next : '',
			kind: friendly ? 'warning' : 'error',
			offer
		});
		return Boolean(friendly);
	};
	const setButtonLabel = (button, label) => {
		if (!button) return;
		const text = [...button.childNodes].reverse().find((node) => node.nodeType === Node.TEXT_NODE);
		if (text) text.textContent = label; else button.append(document.createTextNode(label));
	};
	const setExportLabels = (provenance = false) => {
		setButtonLabel(pdfButton, provenance ? 'Download provenance PDF' : 'Download PDF');
		setButtonLabel(jsonButton, provenance ? 'Download provenance JSON' : 'Download JSON receipt');
	};
	/**
	 * The result panel carries a result, so its export toolbar appears with one
	 * and not before. An empty toolbar of seven greyed-out buttons above an empty
	 * state was the first thing on the panel and said nothing.
	 */
	const setResultsLayout = (hasResults) => {
		element.classList.toggle('has-results', Boolean(hasResults));
		if (toolbar) toolbar.hidden = !hasResults;
		explainDisabledExports();
	};

	/**
	 * Why some of the export buttons are not available. A row of greyed controls
	 * with no reason beside it is a puzzle; three of them need an AI reading, and
	 * an integrity-only run does not produce one.
	 */
	const explainDisabledExports = () => {
		if (!toolbarNote) return;
		const needsReading = [pdfButton, jsonButton, shareButton].filter(Boolean);
		const show = !toolbar?.hidden && needsReading.length > 0 && needsReading.every((button) => button.disabled);
		toolbarNote.hidden = !show;
		if (show) toolbarNote.textContent = 'The PDF, the JSON receipt and the share summary carry an AI reading, so they wait for a run on the EU server or on this device.';
	};
	/** Brings the result into view once a run has produced one. */
	const showResult = () => {
		if (!resultPanel?.scrollIntoView) return;
		const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		resultPanel.scrollIntoView({ block: 'start', behavior: still ? 'auto' : 'smooth' });
	};
	const publicState = () => Object.freeze({ status: state.status, sourceHash: state.sourceHash || '', route: selectedRoute(), hasResult: Boolean(canonicalResult), error: state.error ? 'inspection_failed' : null });
	const emit = (name, detail) => element.dispatchEvent(new CustomEvent(name, { detail: name === 'oaci:statechange' ? publicState() : detail, bubbles: true }));
	const clearSourceError = () => {
		if (!source) return;
		source.removeAttribute('aria-invalid');
		source.removeAttribute('aria-describedby');
		if (sourceError) { sourceError.textContent = ''; sourceError.hidden = true; }
	};
	/**
	 * A problem with the draft itself, said twice: in the notice at the top of the
	 * result panel, and beside the box the reader has to change.
	 *
	 * @param {string} happened What is wrong.
	 * @param {string} next     What to do about it.
	 */
	const showSourceError = (happened, next = '') => {
		notice(happened, { next, kind: 'error' });
		selectTab('paste', false);
		if (!source) return;
		source.setAttribute('aria-invalid', 'true');
		if (sourceError) { sourceError.textContent = next ? `${happened} ${next}` : happened; sourceError.hidden = false; source.setAttribute('aria-describedby', sourceError.id); }
		source.focus();
	};
	const clearFileError = () => {
		if (!fileInput || !fileError) return;
		fileInput.removeAttribute('aria-invalid');
		fileError.textContent = '';
		fileError.hidden = true;
	};
	const showFileError = (message) => {
		announce(message, 'error');
		if (!fileInput || !fileError) return;
		fileInput.setAttribute('aria-invalid', 'true');
		fileError.textContent = message;
		fileError.hidden = false;
		fileInput.focus();
	};
	const selectedRoute = () => routeInputs.find((input) => input.checked)?.value || 'on_device';

	function selectTab(name, moveFocus = true) {
		for (const tab of tabs) {
			const selected = tab.dataset.oaciTab === name;
			tab.setAttribute('aria-selected', selected ? 'true' : 'false');
			tab.tabIndex = selected ? 0 : -1;
			const panel = element.querySelector(`#${tab.getAttribute('aria-controls')}`);
			if (panel) panel.hidden = !selected;
			if (selected && moveFocus) tab.focus();
		}
	}

	const updateCount = () => {
		const value = source ? source.value : '';
		const words = countWords(value);
		draftWords = words;
		const limit = Number(config.maxChars || 100000);
		if (sourceCount) sourceCount.textContent = value.length.toLocaleString('en-GB');
		if (wordCount) wordCount.textContent = words.toLocaleString('en-GB');
		if (countHint) {
			if (value.length > limit) {
				countHint.textContent = `${(value.length - limit).toLocaleString('en-GB')} characters over the limit`;
				countHint.dataset.state = 'over';
			} else if (words >= MODEL_WORD_MINIMUM) {
				countHint.textContent = 'Long enough for AI analysis';
				countHint.dataset.state = 'ready';
			} else {
				countHint.textContent = `${MODEL_WORD_MINIMUM} words needed for AI analysis`;
				countHint.dataset.state = 'short';
			}
		}
		updateRoute();
	};

	/** The download size this build ships, for the button that offers it. */
	const modelSizeLabel = () => String(config.onDevice?.download || '34.5 MB');

	/**
	 * What the button will do, written on the button.
	 *
	 * There is no tick box anywhere on this screen. Agreement to send the draft
	 * once, or to download the model, is the press itself, so the label has to
	 * name the thing before it happens and the sentence under it has to say the
	 * rest. A label that says only "Check my draft" for a route that transfers
	 * the draft would be the box nobody read, moved.
	 */
	const primaryLabel = (route) => {
		if (route === 'server') return 'Send once to the EU server and check';
		if (route === 'on_device' && secureContext() && !modelCached) return `Download model (${modelSizeLabel()}) and check`;
		return 'Check my draft';
	};

	/**
	 * The one line under the button: what the press costs, and what is standing
	 * in its way. It sits beside the control it is about, not in another card.
	 */
	const primaryNoteFor = (route) => {
		if (primaryBlocked()) return 'Waiting to hear whether private EU analysis is open. Choose a route above to start now.';
		const aiRoute = route === 'server' || route === 'on_device';
		if (aiRoute && draftWords > 0 && draftWords < MODEL_WORD_MINIMUM) {
			const missing = MODEL_WORD_MINIMUM - draftWords;
			return `${missing} more ${missing === 1 ? 'word' : 'words'} for an AI reading. The character and writing checks still run on what you have.`;
		}
		if (route === 'server') return 'Your draft is sent once to our EU server for this run and is not kept there. Nothing downloads.';
		if (route === 'on_device' && !secureContext()) return 'This route needs an HTTPS connection, so it cannot run here. Integrity checks only still works.';
		if (route === 'on_device') {
			return modelCached
				? 'The model is already on this device, so nothing downloads and the draft is not sent anywhere.'
				: `The model file downloads once to this browser, is checked against a hash published in this plugin, then stays cached.`;
		}
		return 'This route never produces an AI reading. Choose “On this device” if you want one.';
	};

	/** The whole of it, for the reader who opens the disclosure. */
	const routeDetailFor = (route) => {
		if (route === 'server') return 'When you press the button, the draft goes once through this WordPress site to our fixed EU service, is read there in memory to produce the reading, and is not kept. If that route is busy or has reached an allowance we say so and offer to run it on this device instead.';
		if (route === 'on_device') {
			return secureContext()
				? 'The model runs in this browser. On this route your draft is not sent to Opace or to this site for scoring; only the pinned model files download, and only when you press the button that names the download. The check for a model already on this device needs no network at all.'
				: 'This site is being served over plain HTTP, and your browser will not let a page on an insecure connection verify a downloaded file or keep it cached. Rather than run a model we could not check, this route is unavailable here. Open the site over HTTPS, or use “Integrity checks only”.';
		}
		return 'Character and writing checks run in this browser. Nothing downloads, nothing is sent, and no AI reading is produced.';
	};

	const updateRoute = () => {
		const route = selectedRoute();
		const onDevice = route === 'on_device';
		if (modelDownload) modelDownload.hidden = !onDevice || !secureContext();
		if (modelFacts) modelFacts.hidden = !onDevice;
		if (routeDetail) routeDetail.textContent = routeDetailFor(route);
		if (inspectButton) {
			inspectButton.textContent = primaryBlocked() ? 'Checking which routes are open…' : primaryLabel(route);
			inspectButton.disabled = runningNow || primaryBlocked();
		}
		if (primaryNote) primaryNote.textContent = primaryNoteFor(route);
		if (modelCacheState && onDevice && secureContext()) {
			modelCacheState.textContent = modelCached
				? 'A verified model is already on this device, so nothing will download.'
				: 'No model on this device yet. The button above downloads it once and then it stays cached.';
		}
		// Nothing offers to remove a file that is not here.
		if (clearModelCache) clearModelCache.hidden = !modelCached;
	};

	/**
	 * Asks the browser cache whether the model is already here, then relabels the
	 * button. No network request and no inference session: this only opens a
	 * cache and looks for one entry.
	 */
	async function refreshModelCacheState() {
		if (!secureContext()) { modelCached = false; updateRoute(); return; }
		try {
			const { cachedModelPresent } = await import(`./cycle5-wordpress.mjs?ver=${cacheVersion}`);
			modelCached = await cachedModelPresent({ modelBaseUrl: config.onDevice?.overriddenModelBaseUrl || config.onDevice?.modelBaseUrl });
		} catch {
			modelCached = false;
		}
		updateRoute();
	}

	/**
	 * How far the download has got, on the progress panel's own bar. There is one
	 * bar and one sentence about a run, in one place: two of each, saying the same
	 * thing a few pixels apart, is what this screen used to do.
	 *
	 * @param {number|null} fraction 0 to 1, or null for "we do not know yet".
	 */
	/** Whether the reader is free to press the button right now. */
	const primaryBlocked = () => serviceChecking && !routeChosen;

	const setModelProgress = (fraction) => {
		if (!runBar) return;
		if (fraction === null) { runBar.removeAttribute('value'); return; }
		runBar.max = 1;
		runBar.value = Math.min(1, Math.max(0, fraction));
	};

	const setRunning = (running, message = '') => {
		runningNow = running;
		if (progress) progress.hidden = !running;
		// While a run is going, the progress panel is the only thing on the screen
		// talking about it.
		if (running && modelDownload) modelDownload.hidden = true;
		if (runPhase && message) runPhase.textContent = message;
		if (inspectButton) {
			inspectButton.disabled = running || primaryBlocked();
			if (running) inspectButton.setAttribute('aria-busy', 'true'); else inspectButton.removeAttribute('aria-busy');
		}
		for (const input of routeInputs) input.disabled = running || (input.value === 'server' && !config.serverAnalysis?.available) || (input.value === 'on_device' && !secureContext());
		if (fileInput) fileInput.disabled = running;
		if (pdfButton && running) pdfButton.disabled = true;
		if (jsonButton && running) jsonButton.disabled = true;
		if (shareButton && running) shareButton.disabled = true;
		if (printButton && running) printButton.disabled = true;
		if (!running) setModelProgress(null);
	};

	async function getCycle5() {
		if (!cycle5Module) cycle5Module = await import(`./cycle5-wordpress.mjs?ver=${cacheVersion}`);
		if (!cycle5Runtime) {
			cycle5Runtime = cycle5Module.createWordPressCycle5Runtime({
				modelBaseUrl: config.onDevice?.modelBaseUrl,
				overriddenModelBaseUrl: config.onDevice?.overriddenModelBaseUrl || '',
				wasmUrl: config.onDevice?.wasmUrl
			});
		}
		return { api: cycle5Module, runtime: cycle5Runtime };
	}

	/**
	 * The browser only exposes the hash verification and the cache the on-device
	 * route depends on in a secure context. On a site served over plain HTTP we
	 * refuse the route rather than run a model we could not verify.
	 */
	const secureContext = () => window.isSecureContext !== false;

	async function runOnDevice(primitive, content, runController, consented) {
		if (!secureContext()) {
			const error = new Error('On-device analysis needs a secure connection.');
			error.code = 'insecure_context';
			throw error;
		}
		const { api, runtime } = await getCycle5();
		if (runPhase) runPhase.textContent = 'Looking for a verified model already on this device…';
		let ready = await runtime.prepareFromCache(runController.signal);
		if (!ready) {
			// Nothing downloads unless the reader pressed the button that said it
			// would. A run started any other way stops here, having made no
			// network request at all.
			if (consented !== true) {
				const error = new Error('The model has not been downloaded to this device yet.');
				error.code = 'model_consent_required';
				throw error;
			}
			// The packaged runtime turns an aborted download into its own generic
			// preparation error, so a reader who pressed Cancel used to be told the
			// model "could not be prepared". If this run's own controller was
			// aborted, the run was cancelled, and it is named as that.
			try {
				await runtime.prepareWithConsent({
					consent: true,
					signal: runController.signal,
					onProgress: ({ fileIndex, fileCount, receivedBytes, totalBytes }) => {
						const received = (receivedBytes / (1024 * 1024)).toFixed(1);
						const total = totalBytes ? ` of ${(totalBytes / (1024 * 1024)).toFixed(1)} MB` : ' MB';
						if (runPhase) runPhase.textContent = `Downloading the verified model, file ${fileIndex} of ${fileCount}: ${received}${total}`;
						setModelProgress(totalBytes ? receivedBytes / totalBytes : null);
					}
				});
			} catch (cause) {
				if (runController.signal.aborted) {
					const cancelled = new Error('The model download was cancelled.');
					cancelled.name = 'AbortError';
					throw cancelled;
				}
				throw cause;
			}
			ready = true;
			modelCached = true;
		}
		if (!ready) throw new Error('The verified model is not ready.');
		setModelProgress(null);
		if (modelCacheState) modelCacheState.textContent = runtime.state().message;
		if (runPhase) runPhase.textContent = 'Reading every section on this device…';
		const score = await runtime.score(content, {
			signal: runController.signal,
			onSection: (done, total) => { if (runPhase) runPhase.textContent = `Reading section ${done} of ${total} on this device…`; }
		});
		if (score.status !== 'scored') {
			const error = new Error(score.reason);
			error.code = score.code;
			if (score.code === 'cancelled') error.name = 'AbortError';
			throw error;
		}
		return api.composeWordPressOnDeviceResult(primitive, score, content);
	}

	/**
	 * Opening a scored section also shows it in the draft: the passage is
	 * selected in the box above, so a reader can see exactly which words the
	 * model read.
	 */
	function showInDraft(start, end, number) {
		if (!source) return;
		// A selection only takes in a focused field, so the box is focused just
		// long enough to set it and focus is handed straight back to whatever the
		// reader was using. The selection stays visible after the box blurs.
		const previous = document.activeElement;
		selectTab('paste', false);
		try {
			source.focus({ preventScroll: true });
			source.setSelectionRange(start, end);
			const ratio = source.value.length ? start / source.value.length : 0;
			source.scrollTop = Math.max(0, source.scrollHeight * ratio - source.clientHeight / 3);
		} catch {
			source.setSelectionRange(0, 0);
		}
		if (previous && previous !== source && typeof previous.focus === 'function') previous.focus({ preventScroll: true });
		announce(number ? `Section ${number} is selected in your draft above.` : 'That passage is selected in your draft above.', 'success');
	}

	function renderFullResult(fullResult, content) {
		renderCheckerResult(results, fullResult, content, checkerSemantics, document, {
			findings: state.result?.pattern_findings ?? [],
			contentType,
			onShowInDraft: showInDraft,
			logoUrl: config.logoUrl
		});
		setResultsLayout(true);
	}

	/**
	 * One run.
	 *
	 * `consented` is true only when the reader pressed the primary button, whose
	 * label names the transfer or the download for the route that is selected.
	 * That press is the agreement; nothing else on the screen grants it, and a
	 * run started programmatically cannot send a draft or fetch a model.
	 *
	 * @param {{consented?: boolean}} options
	 */
	async function run(options = {}) {
		const consented = options.consented === true;
		const content = String(await getContent());
		if (!content.trim()) { showSourceError('There is nothing to check yet.', 'Paste a draft into the box, open a file, or try one of the examples.'); return; }
		if (content.length > Number(config.maxChars || 100000)) {
			const tooLong = limitNoticeParts({ code: 'text_too_long' }, config.limits || {});
			showSourceError(tooLong.happened, tooLong.next);
			return;
		}
		const route = selectedRoute();
		if (route === 'server' && !config.serverAnalysis?.available) {
			announceError({ code: 'server_route_disabled' }, 'Private EU analysis is not available on this site.');
			return;
		}
		if (route === 'server' && !consented) { announceError({ code: 'server_consent_required' }, 'This run needs the button that names the transfer.'); inspectButton?.focus(); return; }
		clearSourceError();
		activeRun?.abort();
		activeRun = new AbortController();
		const runController = activeRun;
		canonicalResult = null; provenanceExport = null; if (pdfButton) pdfButton.disabled = true; if (jsonButton) jsonButton.disabled = true; if (shareButton) shareButton.disabled = true; if (printButton) printButton.disabled = true;
		setExportLabels();
		state = { ...state, status: 'loading', error: null }; notice(''); setRunning(true, 'Running the character and writing checks…');
		try {
			request = requestFor(content, { ...options, contentType });
			const result = await inspect(request, { signal: runController.signal });
			inspectedContent = content;
			if (String(await getContent()) !== inspectedContent) {
				state = { status: 'stale', result, sourceHash: result.source.content_hash, error: null };
				canonicalResult = null; if (pdfButton) pdfButton.disabled = true;
				render(result); notice('The draft changed while it was being read.', { next: 'Run the checker again before relying on this result.', kind: 'warning' });
				fixesButton.disabled = true; receiptButton.disabled = true; emit('oaci:statechange', state);
				return;
			}
			unicodeFindings = unicodeFindingsForResult(result);
			state = { status: 'local_complete', result, serverResult: null, sourceHash: result.source.content_hash, error: null };
			render(result);
			fixesButton.disabled = !unicodeFindings.some((finding) => finding.fix !== 'review'); receiptButton.disabled = false;
			if (protectedButton) protectedButton.disabled = result.protected_spans.length === 0;
			emit('oaci:statechange', state);

			const { buildWordPressPrimitiveResult, composeWordPressServerResult } = await import(`./cycle5-wordpress.mjs?ver=${cacheVersion}`);
			const primitive = buildWordPressPrimitiveResult(result, content, { expectedHash: result.source.content_hash });
			let fullResult = null;
			if (route === 'server') {
				if (runPhase) runPhase.textContent = 'Sending the draft once through this site to our EU service…';
				const serverScore = await analyseOnServer({
					available: config.serverAnalysis?.available === true,
					consent: consented,
					content,
					nonce: config.nonce,
					pageUrl: window.location.href,
					requestId: request.request_id,
					restUrl: config.restUrl,
					signal: runController.signal
				});
				fullResult = composeWordPressServerResult(primitive, serverScore, content);
				if (String(await getContent()) !== inspectedContent) {
					state = { ...state, status: 'stale', serverResult: null };
					fixesButton.disabled = true; receiptButton.disabled = true;
					notice('The draft changed while the EU server was reading it.', { next: 'Run the checker again before relying on this result.', kind: 'warning' });
					emit('oaci:statechange', state);
					return;
				}
			} else if (route === 'on_device') {
				fullResult = await runOnDevice(primitive, content, runController, consented);
			}
			state = { status: 'complete', result, serverResult: fullResult, sourceHash: result.source.content_hash, error: null };
			if (fullResult) {
				canonicalResult = fullResult;
				renderFullResult(fullResult, content);
				if (pdfButton) pdfButton.disabled = false;
				if (jsonButton) jsonButton.disabled = false;
				if (shareButton) shareButton.disabled = false;
				if (printButton) printButton.disabled = false;
				notice(`${CHECKER_LEVELS[fullResult.axes.ai_pattern.level].name} · score ${fullResult.axes.ai_pattern.display_score} on a zero-to-one pattern scale.`, { next: 'This page, the JSON receipt and the PDF all use the same result.', kind: 'success' });
			} else {
				canonicalResult = null;
				if (pdfButton) pdfButton.disabled = true;
				if (printButton) printButton.disabled = false;
				setResultsLayout(true);
				notice(`${result.pattern_findings.length + unicodeFindings.length} things to review.`, { next: 'A finding is somewhere to look, not proof that AI wrote this text.', kind: 'success' });
			}
			explainDisabledExports();
			showResult();
			emit('oaci:statechange', state);
		} catch (error) {
			// A refused or cancelled run leaves no AI reading behind, and every
			// branch below says so in its own words rather than leaving a panel
			// claiming a run is still going. This run did not produce an AI reading.
			if (error?.name === 'AbortError') {
				state = { ...state, status: 'cancelled', error: null }; notice('Run cancelled.', { next: 'Nothing was put in place of the result you stopped.', kind: 'warning' }); emit('oaci:statechange', state);
			} else if (null !== inspectedContent && String(await getContent()) !== inspectedContent) {
				state = { ...state, status: 'stale', error: null }; fixesButton.disabled = true; receiptButton.disabled = true; notice('The draft changed since this reading.', { next: 'Run the checker again before relying on it.', kind: 'warning' }); emit('oaci:statechange', state);
			} else {
				state = { ...state, status: 'error', error: String(error?.message || error) };
				announceError(error, config.strings?.error || 'The check could not be completed.');
				emit('oaci:error', { code: error?.code || 'inspection_failed' });
				if (error?.code === 'model_consent_required') inspectButton?.focus();
			}
		} finally {
			if (activeRun === runController) { activeRun = null; setRunning(false); updateRoute(); }
		}
	}

	function markStale() {
		if (!['complete', 'local_complete'].includes(state.status) || null === inspectedContent) return;
		if (String(element.querySelector('#oaci-source')?.value ?? '') === inspectedContent) return;
		state = { ...state, status: 'stale' };
		canonicalResult = null; fixesButton.disabled = true; receiptButton.disabled = true; if (pdfButton) pdfButton.disabled = true; if (jsonButton) jsonButton.disabled = true; if (shareButton) shareButton.disabled = true;
		notice('The draft changed since this reading.', { next: 'Run the checker again before relying on it.', kind: 'warning' });
		emit('oaci:statechange', state);
	}

	function render(result) {
		if (!results) return;
		renderEvidence(results, result, document);
		setResultsLayout(true);
		if (protectedPanel && protectedList) {
			protectedList.replaceChildren();
			for (const span of result.protected_spans) protectedList.append(textNode('div', `${span.kind}: ${span.text}`, 'oaci-lock'));
		}
	}

	function preview() {
		if (!state.result || !request) return;
		fixList.replaceChildren();
		for (const finding of unicodeFindings.filter((item) => item.fix !== 'review')) {
			const label = document.createElement('label'); label.className = 'oaci-fix';
			const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = finding.id; checkbox.checked = true;
			label.append(checkbox, document.createTextNode(` ${finding.code_point} · ${finding.name} · ${finding.fix === 'space' ? 'replace with a space' : 'remove'}`)); fixList.append(label);
		}
		if (fixPanel) { fixPanel.hidden = false; fixPanel.focus(); }
	}

	function showProtected() {
		if (!protectedPanel) return;
		protectedPanel.hidden = false;
		protectedPanel.focus();
	}

	function apply() {
		if (!request || !state.result) return;
		const selected = [...fixList.querySelectorAll('input:checked')].map((input) => input.value);
		const previewResult = previewSafeFixes(request.source.content, unicodeFindings, selected, state.result.protected_spans);
		if (source) source.value = previewResult.candidate;
		updateCount();
		state = { ...state, status: 'stale' }; canonicalResult = null; notice('The draft changed since this reading.', { next: 'Run the checker again before relying on it.', kind: 'warning' }); fixesButton.disabled = true; receiptButton.disabled = true; if (pdfButton) pdfButton.disabled = true; if (jsonButton) jsonButton.disabled = true; if (shareButton) shareButton.disabled = true; if (fixPanel) fixPanel.hidden = true; source?.focus(); emit('oaci:statechange', state);
	}

	async function saveReceipt() {
		if (!request || !state.result) return;
		if (String(await getContent()) !== request.source.content) { notice('The draft changed since this reading.', { next: 'Run the checker again before saving a receipt.', kind: 'warning' }); return; }
		receiptButton.disabled = true; announce('Saving a hash-only receipt to this site…');
		try {
			let url = `${config.restUrl}sessions`;
			let body = { ...request, privacy: { ...request.privacy, save_receipt: true } };
			if (canonicalResult) {
				const { buildContentFreeCheckerRecord } = await import(`./cycle5-wordpress.mjs?ver=${cacheVersion}`);
				url = `${config.restUrl}receipts/checker`;
				body = { result: buildContentFreeCheckerRecord(canonicalResult) };
			}
			const response = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce, 'Idempotency-Key': request.request_id }, body: JSON.stringify(body) });
			const payload = await response.json(); if (!response.ok) throw new Error(payload?.message || 'receipt_save_failed');
			notice(`Receipt ${payload.receipt.receipt_id} saved.`, {
				next: 'It holds hashes and check results, never your text.',
				kind: 'success',
				link: config.receiptsUrl ? { href: config.receiptsUrl, label: 'View it in Receipts' } : null
			}); emit('oaci:statechange', { ...state, receipt: payload.receipt });
		} catch (error) { notice('The receipt could not be saved.', { next: 'Your result is still on this page, so you can try again or download it instead.', kind: 'error' }); }
		finally { receiptButton.disabled = false; }
	}

	async function handleFile(file) {
		if (!file) return;
		clearFileError();
		if (isProvenanceFile(file)) {
			if (Number(file.size || 0) > MAX_LOCAL_FILE_BYTES) {
				if (fileInput) fileInput.value = '';
				if (fileName) fileName.textContent = 'No file chosen';
				showFileError(limitNotice({ code: 'file_too_large' }, config.limits || {}));
				return;
			}
			activeRun?.abort();
			activeRun = new AbortController();
			const fileController = activeRun;
			request = undefined;
			unicodeFindings = [];
			inspectedContent = null;
			canonicalResult = null;
			provenanceExport = null;
			state = { status: 'provenance_loading', result: null, serverResult: null, sourceHash: '', error: null };
			if (fixesButton) fixesButton.disabled = true;
			if (receiptButton) receiptButton.disabled = true;
			if (pdfButton) pdfButton.disabled = true;
			if (jsonButton) jsonButton.disabled = true;
			if (shareButton) shareButton.disabled = true;
			if (printButton) printButton.disabled = true;
			if (fileName) fileName.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB · Content Credentials check`;
			notice('Loading the packaged Content Credentials engine.', { next: 'The file stays in this browser.' });
			setRunning(true, 'Reading Content Credentials here…');
			try {
				const [{ inspectProvenance }, { renderProvenanceProgress, renderProvenanceResult }, { buildProvenanceExport }] = await Promise.all([
					import(`./c2pa-provenance.mjs?ver=${cacheVersion}`),
					import(`./c2pa-panel.mjs?ver=${cacheVersion}`),
					import(`./provenance-report.mjs?ver=${cacheVersion}`)
				]);
				if (activeRun !== fileController || fileController.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
				renderProvenanceProgress(results, file, document);
				setResultsLayout(true);
				const result = await inspectProvenance(file, { signal: fileController.signal });
				if (activeRun !== fileController || fileController.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
				renderProvenanceResult(results, file, result, document);
				provenanceExport = buildProvenanceExport(file, result);
				setExportLabels(true);
				if (pdfButton) pdfButton.disabled = false;
				if (jsonButton) jsonButton.disabled = false;
				if (printButton) printButton.disabled = false;
				explainDisabledExports();
				state = { status: 'provenance_complete', result: null, serverResult: null, sourceHash: '', error: null };
				notice('Content Credentials check complete.', { next: 'The file was read in this browser and not sent to Opace or to this site. A JSON receipt and a PDF are ready.', kind: result.status === 'present' ? 'success' : result.status === 'error' ? 'error' : 'warning' });
				emit('oaci:statechange', state);
			} catch (error) {
				if (error?.name === 'AbortError') {
					const { renderProvenanceCancelled } = await import(`./c2pa-panel.mjs?ver=${cacheVersion}`);
					renderProvenanceCancelled(results, document);
					state = { status: 'cancelled', result: null, serverResult: null, sourceHash: '', error: null };
					notice('File check cancelled.', { next: 'No result was put in its place.', kind: 'warning' });
					emit('oaci:statechange', state);
				} else {
					state = { status: 'error', result: null, serverResult: null, sourceHash: '', error: null };
					showFileError('The Content Credentials check could not start. No judgement was made about this file.');
					emit('oaci:error', { code: 'provenance_failed' });
				}
			} finally {
				if (activeRun === fileController) { activeRun = null; setRunning(false); updateRoute(); }
			}
			return;
		}
		try {
			provenanceExport = null;
			setExportLabels();
			if (pdfButton) pdfButton.disabled = true;
			if (jsonButton) jsonButton.disabled = true;
			const content = await readTextFile(file, Number(config.maxChars || 100000));
			contentType = /\.html?$/i.test(file.name) ? 'html' : /\.(?:md|markdown)$/i.test(file.name) ? 'markdown' : 'plain_text';
			if (source) { source.value = content; source.dispatchEvent(new Event('input', { bubbles: true })); }
			if (fileName) fileName.textContent = `${file.name} · ${content.length.toLocaleString('en-GB')} characters`;
			selectTab('paste');
			notice('File loaded into this browser. It was not sent to Opace or to this site.', { next: 'Choose how it runs in step two, then press the button.', kind: 'success' });
		} catch (error) {
			if (fileInput) fileInput.value = '';
			if (fileName) fileName.textContent = 'No file chosen';
			showFileError(error?.message || 'That file could not be read.');
		}
	}

	const loadFile = () => handleFile(fileInput?.files?.[0]);

	/**
	 * Loads the post the "Check with Content Integrity" row action was used on.
	 * The link carried only the post id; the text arrives through the
	 * authenticated REST route, which checks edit_post for that post again.
	 */
	async function loadRequestedPost() {
		const postId = Number(config.post || 0);
		if (!Number.isInteger(postId) || postId < 1 || !source) return;
		announce('Loading that post into the checker…');
		try {
			const response = await fetch(`${config.restUrl}posts/${postId}`, {
				credentials: 'same-origin',
				cache: 'no-store',
				headers: { 'X-WP-Nonce': config.nonce }
			});
			const payload = await response.json().catch(() => ({}));
			if (!response.ok) {
				const error = new Error(payload?.message || 'That post could not be loaded.');
				error.code = payload?.code || 'post_load_failed';
				throw error;
			}
			// The route strips the block delimiters and the HTML, so what arrives
			// is the writing itself and is scored as plain text.
			const loaded = String(payload.content || '');
			source.value = loaded;
			contentType = 'plain_text';
			source.dispatchEvent(new Event('input', { bubbles: true }));
			selectTab('paste', false);
			const name = payload.title || 'That post';
			if (!loaded.trim()) {
				notice(`“${name}” has no text to check yet.`, { next: 'Add some writing to the post first.', kind: 'warning' });
				return;
			}
			notice(`“${name}” is loaded as readable text.`, { next: 'Choose how it runs in step two, then press the button.', kind: 'success' });
		} catch (error) {
			announceError(error, 'That post could not be loaded into the checker.');
		}
	}

	async function downloadPdf() {
		if (provenanceExport) {
			try {
				const { downloadProvenancePdf } = await import(`./provenance-report.mjs?ver=${cacheVersion}`);
				const filename = downloadProvenancePdf(provenanceExport, document);
				announce(`Content Credentials PDF downloaded: ${filename}.`, 'success');
			} catch {
				notice('The Content Credentials PDF could not be created.', { next: 'Your result is still on this page, so you can print it or try again.', kind: 'error' });
			}
			return;
		}
		if (!canonicalResult || !inspectedContent || String(source?.value ?? '') !== inspectedContent) {
			notice('The draft changed since this reading.', { next: 'Run the checker again before downloading a report.', kind: 'warning' });
			return;
		}
		try {
			const filename = await downloadCheckerPdf(canonicalResult, inspectedContent, checkerSemantics, document);
			announce(`PDF downloaded: ${filename}.`, 'success');
		} catch {
			notice('The PDF could not be created.', { next: 'Your result is still on this page, so you can print it or try again.', kind: 'error' });
		}
	}

	async function downloadJson() {
		if (provenanceExport) {
			try {
				const url = URL.createObjectURL(new Blob([`${JSON.stringify(provenanceExport, null, 2)}\n`], { type: 'application/json' }));
				const link = document.createElement('a');
				link.href = url;
				link.download = `opace-content-credentials-${provenanceExport.generated_at.slice(0, 10)}.json`;
				link.hidden = true;
				document.body.append(link);
				link.click();
				link.remove();
				setTimeout(() => URL.revokeObjectURL(url), 0);
				notice('Content Credentials JSON downloaded.', { next: 'It holds the file hash and the result, never the file.', kind: 'success' });
			} catch {
				notice('The Content Credentials JSON could not be created.', { next: 'Your result is still on this page, so you can try again.', kind: 'error' });
			}
			return;
		}
		if (!canonicalResult || !inspectedContent || String(source?.value ?? '') !== inspectedContent) {
			notice('The draft changed since this reading.', { next: 'Run the checker again before downloading a result record.', kind: 'warning' });
			return;
		}
		try {
			const { buildContentFreeCheckerRecord } = await import(`./cycle5-wordpress.mjs?ver=${cacheVersion}`);
			const record = buildContentFreeCheckerRecord(canonicalResult);
			const url = URL.createObjectURL(new Blob([`${JSON.stringify(record, null, 2)}\n`], { type: 'application/json' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = `opace-ai-content-integrity-${canonicalResult.result_id}.json`;
			link.hidden = true;
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 0);
			notice('JSON receipt downloaded.', { next: 'It holds hashes and scores, not your draft or its passages.', kind: 'success' });
		} catch {
			notice('The JSON receipt could not be created.', { next: 'Your result is still on this page, so you can try again.', kind: 'error' });
		}
	}

	async function copyShare() {
		try {
			await copyCheckerShareSummary(canonicalResult, CHECKER_LEVELS, { clipboard: navigator.clipboard, document });
			notice('Share summary copied.', { next: 'It holds no draft, no passage and no public result link.', kind: 'success' });
		} catch (error) {
			announce(error?.message || 'The share summary could not be copied.', 'error');
		}
	}

	async function clearCycle5Model() {
		try {
			const { runtime } = await getCycle5();
			await runtime.dispose();
			const cleared = await runtime.clearCache();
			cycle5Runtime = null;
			modelCached = false;
			updateRoute();
			if (modelCacheState) modelCacheState.textContent = cleared ? 'The downloaded model has been removed from this browser.' : 'No downloaded model was found on this device.';
			notice('Downloaded model cleared.', { next: 'The packaged inference engine stays installed. The next on-device run downloads the model again.', kind: 'success' });
		} catch {
			notice('The downloaded model could not be cleared.', { next: 'Your browser may be blocking site storage. Nothing else changed.', kind: 'error' });
		}
	}

	function buildExamples() {
		if (!examplesHost) return;
		examplesHost.replaceChildren();
		for (const example of LAB_EXAMPLES) {
			const button = document.createElement('button');
			button.type = 'button';
			button.append(textNode('b', example.name), textNode('small', example.summary));
			button.addEventListener('click', () => {
				if (!source) return;
				source.value = example.text;
				contentType = 'plain_text';
				source.dispatchEvent(new Event('input', { bubbles: true }));
				selectTab('paste');
				source.focus();
				source.setSelectionRange(0, 0);
				notice(`Example loaded: ${example.name}.`, { next: 'Choose how it runs in step two, then press the button.', kind: 'success' });
			}, { signal: listeners.signal });
			examplesHost.append(button);
		}
	}

	const dragTargets = [dropzone, source].filter(Boolean);
	for (const target of dragTargets) {
		target.addEventListener('dragover', (event) => { event.preventDefault(); target.classList.add('is-dragging'); }, { signal: listeners.signal });
		target.addEventListener('dragleave', () => target.classList.remove('is-dragging'), { signal: listeners.signal });
		target.addEventListener('drop', (event) => {
			event.preventDefault();
			target.classList.remove('is-dragging');
			const file = event.dataTransfer?.files?.[0];
			if (file) handleFile(file);
		}, { signal: listeners.signal });
	}

	tabs.forEach((tab, index) => {
		tab.addEventListener('click', () => selectTab(tab.dataset.oaciTab, false), { signal: listeners.signal });
		tab.addEventListener('keydown', (event) => {
			if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
			event.preventDefault();
			const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
			selectTab(tabs[next].dataset.oaciTab);
		}, { signal: listeners.signal });
	});

	source?.addEventListener('input', () => { clearSourceError(); updateCount(); markStale(); }, { signal: listeners.signal });
	routeInputs.forEach((input) => input.addEventListener('change', () => {
		routeChosen = true;
		// The line under the chooser announces a change in what is available. Once
		// the reader has chosen for themselves it would be standing there saying
		// the page recommends something other than what is selected, so it goes.
		if (routeLive) routeLive.textContent = '';
		updateRoute();
	}, { signal: listeners.signal }));
	fileInput?.addEventListener('change', loadFile, { signal: listeners.signal });
	cancelButton?.addEventListener('click', () => activeRun?.abort(), { signal: listeners.signal });
	inspectButton?.addEventListener('click', () => run({ consented: true }), { signal: listeners.signal }); fixesButton?.addEventListener('click', preview, { signal: listeners.signal }); applyFixes?.addEventListener('click', apply, { signal: listeners.signal }); receiptButton?.addEventListener('click', saveReceipt, { signal: listeners.signal });
	protectedButton?.addEventListener('click', showProtected, { signal: listeners.signal });
	printButton?.addEventListener('click', () => window.print(), { signal: listeners.signal });
	pdfButton?.addEventListener('click', downloadPdf, { signal: listeners.signal });
	jsonButton?.addEventListener('click', downloadJson, { signal: listeners.signal });
	shareButton?.addEventListener('click', copyShare, { signal: listeners.signal });
	clearModelCache?.addEventListener('click', clearCycle5Model, { signal: listeners.signal });
	if (source) source.maxLength = Number(config.maxChars || 100000);
	// The card the page opens on. The markup already carries it, and this says
	// the same thing from the one function the tests read, so the two cannot
	// drift apart when the service's availability changes.
	const opening = routeInputs.find((input) => input.value === defaultRoute({ serverAvailable: config.serverAnalysis?.available === true, secureContext: secureContext() }));
	if (opening && !opening.disabled) opening.checked = true;
	// An insecure connection is named on the card itself, not only when a run fails.
	if (!secureContext()) {
		for (const input of routeInputs) {
			if (input.value !== 'on_device') continue;
			input.disabled = true;
			const card = input.closest('.oaci-route');
			card?.classList.add('is-unavailable');
			// A route the browser will not let us run is not the recommended one.
			// The tag the page was rendered with is replaced, not joined, so the
			// card cannot read "Needs HTTPS" and "Recommended" at the same time.
			card?.querySelector('.oaci-route-tag')?.remove();
			card?.querySelector('span')?.prepend(textNode('span', 'Needs HTTPS', 'oaci-route-tag oaci-route-tag--unavailable'));
			if (input.checked) {
				input.checked = false;
				const fallback = routeInputs.find((option) => option.value === 'local');
				if (fallback) fallback.checked = true;
			}
		}
	}
	/**
	 * The chooser is drawn from what the site already knew, then corrected here.
	 *
	 * The EU service scales to zero, so the answer can take longer than any page
	 * render should. Nothing waited for it: this asks once the screen is up,
	 * moves the cards in place and announces the outcome, so a cold service
	 * shows as being woken rather than as one that is not there.
	 */
	const serviceNodes = () => ({
		card: serverRouteCard,
		tag: serverRouteTag,
		blurb: serverRouteBlurb,
		radio: routeInputs.find((input) => input.value === 'server'),
		onDeviceRadio: routeInputs.find((input) => input.value === 'on_device'),
		// On a plain-HTTP page the on-device card already says "Needs HTTPS",
		// and it must not be relabelled into the recommended route.
		onDeviceTag: secureContext() ? onDeviceRouteTag : null,
		live: routeLive,
		chosen: routeChosen
	});
	const setServiceState = (serviceState) => {
		serviceChecking = serviceState === 'checking';
		config.serverAnalysis = { ...(config.serverAnalysis || {}), available: serviceState === 'ready', checking: serviceChecking };
		applyServiceStatus(serviceNodes(), serviceState);
		updateRoute();
	};
	async function refreshServiceStatus() {
		try {
			const answer = await fetchServiceStatus({ restUrl: config.restUrl, pageUrl: window.location.href, nonce: config.nonce, signal: listeners.signal });
			setServiceState(serviceStateFrom(answer));
		} catch (error) {
			if (error?.name === 'AbortError') return;
			setServiceState('unavailable');
		}
	}

	buildExamples(); updateCount(); updateRoute(); setRunning(false);
	// Whether the model is already here decides what the button says, so it is
	// asked for as the screen settles rather than at the moment of the press.
	refreshModelCacheState();
	// Only a route that is on but unasked needs asking. When the site already
	// holds an answer the cards are already right, and asking again would cost
	// the service a request for nothing.
	if (config.serverAnalysis?.checking === true) {
		setServiceState('checking');
		refreshServiceStatus();
	}
	loadRequestedPost();
	// `refresh()` re-runs the current draft. It carries no agreement, so on a
	// route that would send the draft or fetch the model it stops and says which
	// button to press; a host page cannot use it to transfer anything.
	return { destroy() { listeners.abort(); cycle5Runtime?.dispose(); element.replaceChildren(); }, refresh() { return run(); }, getState() { return structuredClone(publicState()); } };
}

window.OpaceContentIntegrity = Object.freeze({ apiVersion: '1.0', mount });
document.querySelectorAll('[data-oaci-lab]').forEach((element) => mount(element));
document.dispatchEvent(new CustomEvent('oaci:ready'));
