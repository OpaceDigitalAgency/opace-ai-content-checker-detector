const config = window.OpaceContentIntegrityConfig || {};
const { inspect, previewSafeFixes } = await import(`./core.mjs?ver=${encodeURIComponent(config.pluginVersion || '0')}`);
const checks = ['unicode.invisible', 'unicode.homoglyph', 'style.patterns', 'watermark.anthropic'];

function requestFor(content, context = {}) {
	return {
		schema_version: '1.0', contract_version: '1.0.0', request_id: `request_${crypto.randomUUID().replaceAll('-', '')}`, created_at: new Date().toISOString(),
		source: { content, content_type: 'plain_text', language: document.documentElement.lang || 'en-GB' }, checks,
		privacy: { allowed_routes: ['browser', 'wordpress_local'], save_receipt: false, retain_content: false },
		context: { caller: context.caller || 'standalone', caller_object_id: context.sourceRef || 'paste:working-copy' }
	};
}

function textNode(tag, text, className) {
	const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node;
}

function methodLabel(method) {
	if (method.id === 'unicode.invisible') return 'Invisible Unicode';
	if (method.id === 'unicode.homoglyph') return 'Homoglyphs and mixed scripts';
	return method.provider_or_method;
}

function mount(element, options = {}) {
	let state = { status: 'idle', result: null, sourceHash: options.sourceHash || '', error: null };
	const listeners = new AbortController();
	const getContent = options.getContent || (() => element.querySelector('#oaci-source')?.value || '');
	const status = element.querySelector('#oaci-status');
	const results = element.querySelector('#oaci-results');
	const protectedPanel = element.querySelector('#oaci-protected');
	const protectedList = element.querySelector('#oaci-protected-list');
	const inspectButton = element.querySelector('#oaci-inspect');
	const fixesButton = element.querySelector('#oaci-preview-fixes');
	const receiptButton = element.querySelector('#oaci-save-receipt');
	const source = element.querySelector('#oaci-source');
	const sourceError = element.querySelector('#oaci-source-error');
	const fixPanel = element.querySelector('#oaci-fix-panel');
	const fixList = element.querySelector('#oaci-fix-list');
	const applyFixes = element.querySelector('#oaci-apply-fixes');
	let request;
	let unicodeFindings = [];
	let inspectedContent = null;

	const announce = (message, kind = '') => { if (status) { status.textContent = message; status.className = kind ? `oaci-notice oaci-notice--${kind}` : ''; } };
	const emit = (name, detail) => element.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
	const clearSourceError = () => {
		if (!source) return;
		source.removeAttribute('aria-invalid');
		source.removeAttribute('aria-describedby');
		if (sourceError) { sourceError.textContent = ''; sourceError.hidden = true; }
	};
	const showSourceError = (message) => {
		announce(message, 'error');
		if (!source) return;
		source.setAttribute('aria-invalid', 'true');
		if (sourceError) { sourceError.textContent = message; sourceError.hidden = false; source.setAttribute('aria-describedby', sourceError.id); }
		source.focus();
	};

	async function run() {
		const content = String(await getContent());
		if (!content.trim()) { showSourceError('Add text to inspect.'); return; }
		if (content.length > Number(config.maxChars || 100000)) { showSourceError('The text exceeds this site’s inspection limit.'); return; }
		clearSourceError();
		state = { ...state, status: 'loading', error: null }; announce('Inspecting draft…'); inspectButton?.setAttribute('disabled', 'disabled');
		try {
			request = requestFor(content, options);
			const result = await inspect(request);
			inspectedContent = content;
			if (String(await getContent()) !== inspectedContent) {
				state = { status: 'stale', result, sourceHash: result.source.content_hash, error: null };
				render(result); announce('The working copy changed during inspection. Inspect it again before relying on the result.', 'warning');
				fixesButton.disabled = true; receiptButton.disabled = true; emit('oaci:statechange', state);
				return;
			}
			state = { status: 'complete', result, sourceHash: result.source.content_hash, error: null };
			unicodeFindings = result.methods.filter((method) => method.category === 'unicode').flatMap((method) => method.evidence).filter((item) => item.type === 'unicode_finding');
			render(result); announce(`${result.pattern_findings.length + unicodeFindings.length} findings need review. A finding is not proof that AI wrote this text.`, 'success');
			fixesButton.disabled = !unicodeFindings.some((finding) => finding.fix !== 'review'); receiptButton.disabled = false;
			emit('oaci:statechange', state);
		} catch (error) {
			state = { ...state, status: 'error', error: String(error?.message || error) }; announce(config.strings?.error || 'Inspection could not be completed.', 'error'); emit('oaci:error', { code: 'inspection_failed' });
		} finally { inspectButton?.removeAttribute('disabled'); }
	}

	function markStale() {
		if ('complete' !== state.status || null === inspectedContent) return;
		if (String(element.querySelector('#oaci-source')?.value ?? '') === inspectedContent) return;
		state = { ...state, status: 'stale' };
		fixesButton.disabled = true; receiptButton.disabled = true;
		announce('The working copy changed. Inspect it again before relying on the result.', 'warning');
		emit('oaci:statechange', state);
	}

	function render(result) {
		if (!results) return; results.replaceChildren();
		const summary = textNode('p', `${result.summary.pass} passed · ${result.summary.attention} review · ${result.summary.unsupported} unsupported`, 'oaci-summary'); results.append(summary);
		for (const method of result.methods) {
			const card = document.createElement('section'); card.className = 'oaci-result';
			card.append(textNode('h3', methodLabel(method))); card.append(textNode('span', method.status.replace('_', ' '), `oaci-status oaci-status--${method.status}`));
			if (method.id.startsWith('unicode.')) card.append(textNode('p', method.provider_or_method, 'oaci-method-provider'));
			card.append(textNode('p', method.limitations[0])); results.append(card);
		}
		if (protectedPanel && protectedList) {
			protectedList.replaceChildren();
			for (const span of result.protected_spans) protectedList.append(textNode('div', `${span.kind}: ${span.text}`, 'oaci-lock'));
			protectedPanel.hidden = result.protected_spans.length === 0;
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

	function apply() {
		if (!request || !state.result) return;
		const selected = [...fixList.querySelectorAll('input:checked')].map((input) => input.value);
		const previewResult = previewSafeFixes(request.source.content, unicodeFindings, selected, state.result.protected_spans);
		if (source) source.value = previewResult.candidate;
		state = { ...state, status: 'stale' }; announce('The working copy changed. Inspect it again before relying on the result.', 'warning'); fixesButton.disabled = true; receiptButton.disabled = true; if (fixPanel) fixPanel.hidden = true; source?.focus(); emit('oaci:statechange', state);
	}

	async function saveReceipt() {
		if (!request || !state.result) return;
		if (String(await getContent()) !== request.source.content) { announce('The draft changed. Inspect it again before saving a receipt.', 'warning'); return; }
		receiptButton.disabled = true; announce('Saving a hash-only receipt to this WordPress site…');
		try {
			const response = await fetch(`${config.restUrl}sessions`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': config.nonce, 'Idempotency-Key': request.request_id }, body: JSON.stringify({ ...request, privacy: { ...request.privacy, save_receipt: true } }) });
			const payload = await response.json(); if (!response.ok) throw new Error(payload?.message || 'receipt_save_failed');
			announce(`Receipt ${payload.receipt.receipt_id} saved without source text.`, 'success'); emit('oaci:statechange', { ...state, receipt: payload.receipt });
		} catch (error) { announce('The receipt could not be saved. The inspection result is still available in this browser.', 'error'); }
		finally { receiptButton.disabled = false; }
	}

	source?.addEventListener('input', () => { clearSourceError(); markStale(); }, { signal: listeners.signal });
	inspectButton?.addEventListener('click', run, { signal: listeners.signal }); fixesButton?.addEventListener('click', preview, { signal: listeners.signal }); applyFixes?.addEventListener('click', apply, { signal: listeners.signal }); receiptButton?.addEventListener('click', saveReceipt, { signal: listeners.signal });
	return { destroy() { listeners.abort(); element.replaceChildren(); }, refresh() { return run(); }, getState() { return structuredClone(state); } };
}

window.OpaceContentIntegrity = Object.freeze({ apiVersion: '1.0', mount });
document.querySelectorAll('[data-oaci-lab]').forEach((element) => mount(element));
document.dispatchEvent(new CustomEvent('oaci:ready'));
