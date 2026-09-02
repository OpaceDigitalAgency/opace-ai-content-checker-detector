const config = window.OpaceContentIntegrityConfig || {};
const cacheVersion = encodeURIComponent(config.pluginVersion || '0');
const [{ inspect, previewSafeFixes, CHECKER_LEVELS, CHECKER_HONESTY_LINE, assertCheckerResultInvariants }, { renderEvidence, unicodeFindingsForResult }, { analyseOnServer, readTextFile, isProvenanceFile, MAX_LOCAL_FILE_BYTES }, { renderCheckerResult }, { downloadCheckerPdf }, { copyCheckerShareSummary }, { LAB_EXAMPLES }, { limitNotice }, { requestId }] = await Promise.all([
	import(`./core.mjs?ver=${cacheVersion}`),
	import(`./lab-evidence.mjs?ver=${cacheVersion}`),
	import(`./lab-route.mjs?ver=${cacheVersion}`),
	import(`./checker-result.mjs?ver=${cacheVersion}`),
	import(`./checker-report.mjs?ver=${cacheVersion}`),
	import(`./checker-share.mjs?ver=${cacheVersion}`),
	import(`./lab-examples.mjs?ver=${cacheVersion}`),
	import(`./lab-limits.mjs?ver=${cacheVersion}`),
	import(`./random-id.mjs?ver=${cacheVersion}`)
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
	const routeDisclosure = element.querySelector('#oaci-route-disclosure');
	const serverConsentRow = element.querySelector('#oaci-server-consent-row');
	const serverConsent = element.querySelector('#oaci-server-consent');
	const modelConsentRow = element.querySelector('#oaci-model-consent-row');
	const modelConsent = element.querySelector('#oaci-model-consent');
	const modelDownload = element.querySelector('#oaci-model-download');
	const modelStateBadge = element.querySelector('#oaci-model-state-badge');
	const modelStateNote = element.querySelector('#oaci-model-state-note');
	const modelCacheState = element.querySelector('#oaci-model-cache-state');
	const modelBar = element.querySelector('#oaci-model-bar');
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

	const announce = (message, kind = '') => { if (status) { status.textContent = message; status.className = kind ? `oaci-notice oaci-notice--${kind}` : ''; } };
	/** Prefer a plain-English limit message over any raw code the layer beneath returned. */
	const announceError = (error, fallback) => {
		const friendly = limitNotice(error, config.limits || {});
		announce(friendly || error?.message || fallback, friendly ? 'warning' : 'error');
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
	const setResultsLayout = (hasResults) => element.classList.toggle('has-results', Boolean(hasResults));
	/**
	 * The rail's model panel always says whether a trained model actually ran.
	 * Character and writing checks never move it off "Not run".
	 */
	const setModelState = (status, label, note) => {
		if (modelStateBadge) {
			modelStateBadge.className = `oaci-chip oaci-chip--${status}`;
			modelStateBadge.textContent = label;
		}
		if (modelStateNote) modelStateNote.textContent = note;
	};
	const publicState = () => Object.freeze({ status: state.status, sourceHash: state.sourceHash || '', route: selectedRoute(), hasResult: Boolean(canonicalResult), error: state.error ? 'inspection_failed' : null });
	const emit = (name, detail) => element.dispatchEvent(new CustomEvent(name, { detail: name === 'oaci:statechange' ? publicState() : detail, bubbles: true }));
	const clearSourceError = () => {
		if (!source) return;
		source.removeAttribute('aria-invalid');
		source.removeAttribute('aria-describedby');
		if (sourceError) { sourceError.textContent = ''; sourceError.hidden = true; }
	};
	const showSourceError = (message) => {
		announce(message, 'error');
		selectTab('paste', false);
		if (!source) return;
		source.setAttribute('aria-invalid', 'true');
		if (sourceError) { sourceError.textContent = message; sourceError.hidden = false; source.setAttribute('aria-describedby', sourceError.id); }
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
	};

	const updateRoute = () => {
		const route = selectedRoute();
		const server = route === 'server';
		const onDevice = route === 'on_device';
		if (serverConsentRow) serverConsentRow.hidden = !server;
		if (modelConsentRow) modelConsentRow.hidden = !onDevice;
		if (modelDownload) modelDownload.hidden = !onDevice || !secureContext();
		if (modelConsentRow && !secureContext()) modelConsentRow.hidden = true;
		if (!server && serverConsent) serverConsent.checked = false;
		if (routeDisclosure) {
			routeDisclosure.replaceChildren();
			routeDisclosure.append(
				textNode('strong', server ? 'What happens to your draft: private EU analysis' : onDevice ? 'What happens to your draft: on this device' : 'What happens to your draft: integrity checks only'),
				textNode('p', server
					? 'When you press the button, the draft goes once through this WordPress site to our fixed EU service, and the reading comes back. Neither the plugin nor the service keeps a copy of the draft.'
					: onDevice
						? (secureContext()
							? 'The model runs in this browser. On this route your draft is not sent to Opace or to this site for scoring; only the pinned model files download, and only after you agree. The check for a cached model needs no network at all.'
							: 'This site is being served over plain HTTP, and your browser will not let a page on an insecure connection verify a downloaded file or keep it cached. Rather than run a model we could not check, this route is unavailable here. Open the site over HTTPS, or use “Integrity checks only”.')
						: 'Character and writing checks run in this browser. Nothing downloads, nothing is sent, and no AI reading is produced.')
			);
		}
		if (inspectButton) inspectButton.textContent = 'Check my draft';
		if (primaryNote) {
			primaryNote.textContent = server
				? 'Tick the box above, then press the button to send the draft once.'
				: onDevice
					? 'Add at least 60 words for an AI reading. Shorter drafts still get the character and writing checks.'
					: 'This route never produces an AI reading. Choose “On this device” if you want one.';
		}
	};

	const setModelProgress = (fraction) => {
		if (!modelBar) return;
		if (fraction === null) { modelBar.hidden = true; return; }
		modelBar.hidden = false;
		modelBar.style.setProperty('--oaci-model-progress', `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`);
	};

	const setRunning = (running, message = '') => {
		if (progress) progress.hidden = !running;
		if (runPhase && message) runPhase.textContent = message;
		if (inspectButton) {
			inspectButton.disabled = running;
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

	async function runOnDevice(primitive, content, runController) {
		if (!secureContext()) {
			const error = new Error('On-device analysis needs a secure connection.');
			error.code = 'insecure_context';
			throw error;
		}
		const { api, runtime } = await getCycle5();
		if (runPhase) runPhase.textContent = 'Looking for a verified model already on this device…';
		let ready = await runtime.prepareFromCache(runController.signal);
		if (!ready) {
			if (!modelConsent?.checked) {
				const error = new Error('Tick the download box before the first on-device run. No network request was made.');
				error.code = 'model_consent_required';
				throw error;
			}
			await runtime.prepareWithConsent({
				consent: true,
				signal: runController.signal,
				onProgress: ({ file, fileIndex, fileCount, receivedBytes, totalBytes }) => {
					const received = (receivedBytes / (1024 * 1024)).toFixed(1);
					const total = totalBytes ? ` of ${(totalBytes / (1024 * 1024)).toFixed(1)} MB` : ' MB';
					const message = `Downloading verified model file ${fileIndex} of ${fileCount}: ${received}${total}`;
					if (runPhase) runPhase.textContent = message;
					if (modelCacheState) modelCacheState.textContent = `${file}: ${message}`;
					setModelProgress(totalBytes ? receivedBytes / totalBytes : null);
				}
			});
			ready = true;
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

	async function run() {
		const content = String(await getContent());
		if (!content.trim()) { showSourceError('Add some text before running the checker.'); return; }
		if (content.length > Number(config.maxChars || 100000)) { showSourceError(limitNotice({ code: 'text_too_long' }, config.limits || {})); return; }
		const route = selectedRoute();
		if (route === 'server' && !config.serverAnalysis?.available) { announce('Private EU analysis is not available on this site yet. Choose “On this device” instead.', 'error'); routeInputs.find((input) => input.value === 'on_device')?.focus(); return; }
		if (route === 'server' && !serverConsent?.checked) { announce('Tick the box to confirm the one-off transfer before running it.', 'error'); serverConsent?.focus(); return; }
		clearSourceError();
		activeRun?.abort();
		activeRun = new AbortController();
		const runController = activeRun;
		canonicalResult = null; provenanceExport = null; if (pdfButton) pdfButton.disabled = true; if (jsonButton) jsonButton.disabled = true; if (shareButton) shareButton.disabled = true; if (printButton) printButton.disabled = true;
		setExportLabels();
		setModelState('not_run', 'Not run', 'Waiting for this run to finish.');
		state = { ...state, status: 'loading', error: null }; announce('Reading your draft…'); setRunning(true, 'Running the character and writing checks…');
		try {
			request = requestFor(content, { ...options, contentType });
			const result = await inspect(request, { signal: runController.signal });
			inspectedContent = content;
			if (String(await getContent()) !== inspectedContent) {
				state = { status: 'stale', result, sourceHash: result.source.content_hash, error: null };
				canonicalResult = null; if (pdfButton) pdfButton.disabled = true;
				render(result); announce('The draft changed while it was being read. Run the checker again before relying on this result.', 'warning');
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
					consent: serverConsent?.checked === true,
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
					announce('The draft changed while the EU server was reading it. Run the checker again before relying on this result.', 'warning');
					emit('oaci:statechange', state);
					return;
				}
			} else if (route === 'on_device') {
				fullResult = await runOnDevice(primitive, content, runController);
			}
			state = { status: 'complete', result, serverResult: fullResult, sourceHash: result.source.content_hash, error: null };
			if (fullResult) {
				canonicalResult = fullResult;
				setModelState(fullResult.axes.ai_pattern.method_status, CHECKER_LEVELS[fullResult.axes.ai_pattern.level].name, `${fullResult.route.model.identity} read this draft ${route === 'server' ? 'on the Opace EU server' : 'on this device'}. Score ${fullResult.axes.ai_pattern.display_score} on a zero-to-one pattern scale.`);
				renderFullResult(fullResult, content);
				if (pdfButton) pdfButton.disabled = false;
				if (jsonButton) jsonButton.disabled = false;
				if (shareButton) shareButton.disabled = false;
				if (printButton) printButton.disabled = false;
				announce(`${CHECKER_LEVELS[fullResult.axes.ai_pattern.level].name} · score ${fullResult.axes.ai_pattern.display_score}. The page, the JSON receipt and the PDF all use this same result.`, 'success');
			} else {
				canonicalResult = null;
				setModelState('not_run', 'Not run', 'No trained model ran on this text, so there is no AI reading. Character and writing checks alone never set that score.');
				if (pdfButton) pdfButton.disabled = true;
				if (printButton) printButton.disabled = false;
				setResultsLayout(true);
				announce(`${result.pattern_findings.length + unicodeFindings.length} things to review. A finding is not proof that AI wrote this text.`, 'success');
			}
			emit('oaci:statechange', state);
		} catch (error) {
			if (error?.name === 'AbortError') {
				state = { ...state, status: 'cancelled', error: null }; announce('Run cancelled. No result was put in place of the one you stopped.', 'warning'); emit('oaci:statechange', state);
			} else if (null !== inspectedContent && String(await getContent()) !== inspectedContent) {
				state = { ...state, status: 'stale', error: null }; fixesButton.disabled = true; receiptButton.disabled = true; announce('The draft changed. Run the checker again before relying on this result.', 'warning'); emit('oaci:statechange', state);
			} else {
				state = { ...state, status: 'error', error: String(error?.message || error) };
				announceError(error, config.strings?.error || 'The check could not be completed.');
				emit('oaci:error', { code: error?.code || 'inspection_failed' });
				if (error?.code === 'model_consent_required') modelConsent?.focus();
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
		if (serverConsent) serverConsent.checked = false;
		announce('The draft changed. Run the checker again before relying on this result.', 'warning');
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
		state = { ...state, status: 'stale' }; canonicalResult = null; announce('The draft changed. Run the checker again before relying on this result.', 'warning'); fixesButton.disabled = true; receiptButton.disabled = true; if (pdfButton) pdfButton.disabled = true; if (jsonButton) jsonButton.disabled = true; if (shareButton) shareButton.disabled = true; if (fixPanel) fixPanel.hidden = true; source?.focus(); emit('oaci:statechange', state);
	}

	async function saveReceipt() {
		if (!request || !state.result) return;
		if (String(await getContent()) !== request.source.content) { announce('The draft changed. Run the checker again before saving a receipt.', 'warning'); return; }
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
			announce(`Receipt ${payload.receipt.receipt_id} saved. It holds hashes and check results, never your text.`, 'success'); emit('oaci:statechange', { ...state, receipt: payload.receipt });
		} catch (error) { announce('The receipt could not be saved. Your result is still on this page.', 'error'); }
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
			announce('Loading the packaged Content Credentials engine. The file stays in this browser.');
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
				state = { status: 'provenance_complete', result: null, serverResult: null, sourceHash: '', error: null };
				announce('Content Credentials check complete. The file was read in this browser and not sent to Opace or to this site; a JSON receipt and a PDF are ready.', result.status === 'present' ? 'success' : result.status === 'error' ? 'error' : 'warning');
				emit('oaci:statechange', state);
			} catch (error) {
				if (error?.name === 'AbortError') {
					const { renderProvenanceCancelled } = await import(`./c2pa-panel.mjs?ver=${cacheVersion}`);
					renderProvenanceCancelled(results, document);
					state = { status: 'cancelled', result: null, serverResult: null, sourceHash: '', error: null };
					announce('File check cancelled. No result was put in its place.', 'warning');
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
			announce('File loaded into this browser. It was not sent to Opace or to this site.', 'success');
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
				announce(`“${name}” has no text to check yet. Add some writing to the post first.`, 'warning');
				return;
			}
			announce(`“${name}” is loaded as readable text. Choose how it runs, then press Check my draft.`, 'success');
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
				announce('The Content Credentials PDF could not be created. Your result is still on this page.', 'error');
			}
			return;
		}
		if (!canonicalResult || !inspectedContent || String(source?.value ?? '') !== inspectedContent) {
			announce('Run the checker again before downloading a report.', 'warning');
			return;
		}
		try {
			const filename = await downloadCheckerPdf(canonicalResult, inspectedContent, checkerSemantics, document);
			announce(`PDF downloaded: ${filename}.`, 'success');
		} catch {
			announce('The PDF could not be created. Your result is still on this page.', 'error');
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
				announce('Content Credentials JSON downloaded. It holds the file hash and the result, never the file.', 'success');
			} catch {
				announce('The Content Credentials JSON could not be created.', 'error');
			}
			return;
		}
		if (!canonicalResult || !inspectedContent || String(source?.value ?? '') !== inspectedContent) {
			announce('Run the checker again before downloading a result record.', 'warning');
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
			announce('JSON receipt downloaded. It holds hashes and scores, not your draft or its passages.', 'success');
		} catch {
			announce('The JSON receipt could not be created.', 'error');
		}
	}

	async function copyShare() {
		try {
			await copyCheckerShareSummary(canonicalResult, CHECKER_LEVELS, { clipboard: navigator.clipboard, document });
			announce('Share summary copied. It holds no draft, no passage and no public result link.', 'success');
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
			if (modelConsent) modelConsent.checked = false;
			if (modelCacheState) modelCacheState.textContent = cleared ? 'The downloaded model has been removed from this browser.' : 'No downloaded model was found on this device.';
			announce('Downloaded model cleared. The packaged inference engine stays installed.', 'success');
		} catch {
			announce('The downloaded model could not be cleared.', 'error');
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
				announce(`Example loaded: ${example.name}. Choose how it runs, then press Check my draft.`, 'success');
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
	routeInputs.forEach((input) => input.addEventListener('change', updateRoute, { signal: listeners.signal }));
	fileInput?.addEventListener('change', loadFile, { signal: listeners.signal });
	cancelButton?.addEventListener('click', () => activeRun?.abort(), { signal: listeners.signal });
	inspectButton?.addEventListener('click', run, { signal: listeners.signal }); fixesButton?.addEventListener('click', preview, { signal: listeners.signal }); applyFixes?.addEventListener('click', apply, { signal: listeners.signal }); receiptButton?.addEventListener('click', saveReceipt, { signal: listeners.signal });
	protectedButton?.addEventListener('click', showProtected, { signal: listeners.signal });
	printButton?.addEventListener('click', () => window.print(), { signal: listeners.signal });
	pdfButton?.addEventListener('click', downloadPdf, { signal: listeners.signal });
	jsonButton?.addEventListener('click', downloadJson, { signal: listeners.signal });
	shareButton?.addEventListener('click', copyShare, { signal: listeners.signal });
	clearModelCache?.addEventListener('click', clearCycle5Model, { signal: listeners.signal });
	if (source) source.maxLength = Number(config.maxChars || 100000);
	// An insecure connection is named on the card itself, not only when a run fails.
	if (!secureContext()) {
		for (const input of routeInputs) {
			if (input.value !== 'on_device') continue;
			input.disabled = true;
			input.closest('.oaci-route-card')?.classList.add('is-unavailable');
			const tag = textNode('span', 'Needs HTTPS', 'oaci-route-tag oaci-route-tag--unavailable');
			input.closest('.oaci-route-card')?.querySelector('span')?.prepend(tag);
			if (input.checked) {
				input.checked = false;
				const fallback = routeInputs.find((option) => option.value === 'local');
				if (fallback) fallback.checked = true;
			}
		}
	}
	buildExamples(); updateCount(); updateRoute(); setRunning(false);
	loadRequestedPost();
	return { destroy() { listeners.abort(); cycle5Runtime?.dispose(); element.replaceChildren(); }, refresh() { return run(); }, getState() { return structuredClone(publicState()); } };
}

window.OpaceContentIntegrity = Object.freeze({ apiVersion: '1.0', mount });
document.querySelectorAll('[data-oaci-lab]').forEach((element) => mount(element));
document.dispatchEvent(new CustomEvent('oaci:ready'));
