import { defineToolbarApp } from 'astro/toolbar';
import { projectDomVisibleText } from '@opace/content-integrity-browser';
import { diff, inspectUnicode, prefixedSha256, previewSafeFixes } from '@opace/content-integrity-core';
import type { AnalysisResult } from '@opace/content-integrity-contracts';

type View = 'checker' | 'rewrite' | 'claude' | 'index' | 'receipts' | 'settings';
const VIEWS: Array<[View, string]> = [['checker', 'Check page'], ['rewrite', 'Protect & rewrite'], ['claude', 'Claude readiness'], ['index', 'Index'], ['receipts', 'Receipts'], ['settings', 'Settings']];
const LIMIT = 50_000;

function element<K extends keyof HTMLElementTagNameMap>(name: K, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function safeVisibleText(): { text: string; truncated: boolean } {
  const projection = projectDomVisibleText(document.body);
  let text = projection.text;
  const truncated = text.length > LIMIT;
  if (truncated) {
    let end = LIMIT;
    if (/[\uD800-\uDBFF]/u.test(text[end - 1] ?? '')) end -= 1;
    text = text.slice(0, end);
  }
  return { text, truncated };
}

function escape(value: string): string {
  return value.replace(/[&<>"']/gu, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

function hashOnlyReceipt(result: AnalysisResult): Record<string, unknown> {
  return {
    schema_version: result.schema_version,
    contract_version: result.contract_version,
    receipt_version: 'astro-hash-only/1.0.0',
    contains_content: false,
    privacy_route: 'browser',
    source: { content_hash: result.source.content_hash, word_count: result.source.word_count },
    methods: result.methods.map(({ id, version, status, limitations }) => ({ id, version, status, limitations })),
    summary: result.summary,
    limitations: [...result.limitations, 'No route, URL or source text is retained.'],
  };
}

export default defineToolbarApp({
  init(canvas, app) {
    const style = element('style');
    style.textContent = `
      :host{color-scheme:dark}.oaci{box-sizing:border-box;width:min(430px,calc(100vw - 16px));max-height:min(760px,calc(100vh - 72px));overflow:auto;border:1px solid #444a50;border-radius:16px;background:#17191b;color:#f5f4f1;box-shadow:0 18px 55px rgba(0,0,0,.48);font:14px/1.45 Inter,ui-sans-serif,system-ui,sans-serif}.oaci *{box-sizing:border-box}.mast{padding:16px 16px 12px;border-bottom:1px solid #34383c;background:linear-gradient(135deg,#202326,#17191b)}.eyebrow{margin:0 0 3px;color:#ff9a61;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.mast h2{margin:0;font-size:20px}.promise{margin:5px 0 0;color:#b9bdc1;font-size:12px}.tabs{display:flex;gap:6px;overflow:auto;padding:10px;border-bottom:1px solid #34383c;scrollbar-width:thin}.tabs button{flex:0 0 auto;min-height:40px;border:1px solid #454b50;border-radius:999px;padding:8px 11px;background:#24282b;color:#e7e5e1;font:700 12px/1 system-ui;cursor:pointer}.tabs button[aria-selected=true]{border-color:#ff8a47;background:#3b2b22;color:#fff}.tabs button:focus-visible,.oaci button:focus-visible{outline:3px solid #ffd1b6;outline-offset:2px}.body{padding:16px}.body h3{margin:0 0 6px;font-size:17px}.body p{margin:6px 0;color:#c1c4c7}.scope{margin:12px 0;padding:11px;border:1px solid #3d4348;border-left:3px solid #ff8a47;border-radius:10px;background:#202326}.actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.actions button{min-height:44px;border:1px solid #555d63;border-radius:9px;padding:9px 12px;background:#292e32;color:#fff;font-weight:750;cursor:pointer}.actions .primary{border-color:#ff8a47;background:#a43e08}.actions button:disabled{cursor:not-allowed;opacity:.52}.status{min-height:22px;margin-top:12px;color:#e6c7b5}.methods{display:grid;gap:8px;margin:14px 0 0;padding:0;list-style:none}.method{padding:10px;border:1px solid #3b4146;border-radius:10px;background:#202326}.method strong{display:block}.state{display:inline-flex;margin-top:5px;border:1px solid currentColor;border-radius:999px;padding:2px 7px;color:#f2b48f;font-size:11px;font-weight:800;text-transform:uppercase}.details{margin-top:8px;color:#aeb3b6;font-size:12px}.patch{max-height:180px;overflow:auto;padding:10px;border:1px solid #3e4449;border-radius:9px;background:#101214;color:#e8e4dd;font:12px/1.45 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}.notice{padding:10px;border:1px solid #68523f;border-radius:9px;background:#2b241f;color:#f2d2bd}.oaci[hidden]{display:none}@media(max-width:420px){.oaci{width:calc(100vw - 8px);border-radius:12px}.mast,.body{padding:13px}.tabs{padding:8px}.actions{display:grid}.actions button{width:100%}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}@media(forced-colors:active){.oaci,.method,.scope,.notice{border:1px solid CanvasText}.tabs button[aria-selected=true]{outline:2px solid Highlight}}
    `;
    const panel = element('section', { class: 'oaci', hidden: '', 'aria-label': 'Opace AI Content Integrity evidence workbench' });
    panel.innerHTML = `<header class="mast"><p class="eyebrow">Local evidence workbench</p><h2>Content Integrity</h2><p class="promise">Free and open source · Evidence, not guarantees</p></header><nav class="tabs" role="tablist" aria-label="Content Integrity views">${VIEWS.map(([id, label], i) => `<button type="button" role="tab" id="oaci-tab-${id}" aria-controls="oaci-view" data-view="${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? '0' : '-1'}">${label}</button>`).join('')}</nav><div class="body" id="oaci-view" role="tabpanel" aria-labelledby="oaci-tab-checker" tabindex="-1"></div>`;
    canvas.append(style, panel);
    const body = panel.querySelector<HTMLElement>('.body')!;
    const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[role=tab]')];
    let current: View = 'checker';
    let result: AnalysisResult | undefined;
    let sourceText = '';
    let controller: AbortController | undefined;
    let worker: Worker | undefined;
    let requestSerial = 0;

    const stop = (message = 'Inspection cancelled. No content was retained.'): void => {
      requestSerial += 1;
      controller?.abort();
      worker?.terminate();
      controller = undefined;
      worker = undefined;
      const status = body.querySelector<HTMLElement>('.status');
      if (status) status.textContent = message;
    };

    const run = async (): Promise<void> => {
      stop('Preparing local inspection…');
      const serial = requestSerial;
      const visible = safeVisibleText();
      sourceText = visible.text;
      const status = body.querySelector<HTMLElement>('.status');
      if (!status) return;
      if (!sourceText.trim()) { status.textContent = 'Nothing visible to inspect on this page.'; return; }
      controller = new AbortController();
      const request = { schema_version: '1.0' as const, contract_version: '1.0.0', request_id: `req_${crypto.randomUUID().replaceAll('-', '')}`, created_at: new Date().toISOString(), source: { content: sourceText, content_type: 'plain_text' as const, language: 'en-GB' }, checks: ['unicode.invisible', 'style.patterns', 'watermark.anthropic'], privacy: { allowed_routes: ['browser' as const], save_receipt: false, retain_content: false } };
      worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      const id = request.request_id;
      const onAbort = () => worker?.postMessage({ type: 'cancel', id });
      controller.signal.addEventListener('abort', onAbort, { once: true });
      status.textContent = `Inspecting ${sourceText.length.toLocaleString('en-GB')} characters locally…`;
      try {
        result = await new Promise<AnalysisResult>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('Inspection timed out.')), 10_000);
          worker!.onmessage = (event) => {
            if (serial !== requestSerial) return;
            if (event.data.type === 'progress') status.textContent = `Local check: ${String(event.data.phase).replaceAll('_', ' ')}…`;
            if (event.data.type === 'result') { window.clearTimeout(timeout); resolve(event.data.result); }
            if (event.data.type === 'error') { window.clearTimeout(timeout); reject(new Error(event.data.code)); }
          };
          worker!.onerror = () => reject(new Error('Worker failed safely.'));
          worker!.postMessage({ type: 'inspect', id, request });
        });
        if (serial !== requestSerial) return;
        status.textContent = `Complete. ${result.source.word_count} words checked${visible.truncated ? '; first 50,000 characters only' : ''}.`;
        renderMethods();
      } catch (error) {
        if (serial === requestSerial) status.textContent = error instanceof Error ? error.message : 'Inspection failed safely.';
      } finally {
        worker?.terminate();
        worker = undefined;
      }
    };

    const renderMethods = (): void => {
      const list = body.querySelector<HTMLElement>('.methods');
      if (!list || !result) return;
      list.innerHTML = result.methods.map((method) => `<li class="method"><strong>${escape(method.provider_or_method)}</strong><span class="state">${escape(method.status.replaceAll('_', ' '))}</span><div class="details">${escape(method.limitations.join(' '))}</div></li>`).join('');
    };

    const download = (name: string, content: string, type: string): void => {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = element('a', { href: url, download: name });
      link.click();
      URL.revokeObjectURL(url);
    };

    const render = (): void => {
      stop('View changed. Any active inspection was cancelled.');
      if (current === 'checker') body.innerHTML = `<h3>Check this page</h3><p>Inspect the visible page text in a local Worker. Nothing runs until you choose the action.</p><div class="scope"><strong>Scope</strong><br>Visible body text, maximum 50,000 characters. Scripts, styles, templates, noscript and hidden or aria-hidden ancestors are excluded.</div><div class="actions"><button type="button" class="primary run">Inspect visible text</button><button type="button" class="cancel" disabled>Cancel</button></div><p class="status" role="status" aria-live="polite">Ready. No scan has run.</p><ul class="methods" aria-label="Method results"></ul>`;
      if (current === 'rewrite') body.innerHTML = `<h3>Protect & rewrite</h3><p>Preview a patch that removes only locally explainable invisible Unicode. It never writes source files.</p><div class="notice">Writing-pattern rewrites and model-backed candidates are not configured in this offline release.</div><div class="actions"><button type="button" class="primary patch-action" ${result ? '' : 'disabled'}>Prepare reviewed patch</button></div><p class="status" role="status">${result ? 'Inspection available.' : 'Run Check page first.'}</p><pre class="patch" tabindex="0">No patch prepared.</pre>`;
      if (current === 'claude') body.innerHTML = `<h3>Claude readiness</h3><p>Deterministic public readiness checks are local. Anthropic's official text-watermark verifier is unavailable.</p><ul class="methods"><li class="method"><strong>Anthropic official verification</strong><span class="state">unsupported</span><div class="details">No supported authorised detector interface ran. This is not a removal or clearance claim.</div></li><li class="method"><strong>Local Unicode and writing-pattern checks</strong><span class="state">${result ? 'available' : 'not run'}</span><div class="details">${result ? 'See the checked method evidence.' : 'Use Check page to run them explicitly.'}</div></li></ul>`;
      if (current === 'index') body.innerHTML = `<h3>Index</h3><div class="notice"><strong>Planned · Not configured</strong><br>No approved immutable benchmark summary is bundled, so no sample rankings are shown.</div>`;
      if (current === 'receipts') body.innerHTML = `<h3>Receipts</h3><p>Receipts are created only when requested and contain hashes, counts, method versions, states and limitations. No page route or text is retained.</p><div class="actions"><button type="button" class="primary receipt" ${result ? '' : 'disabled'}>Download hash-only receipt</button></div><p class="status" role="status">${result ? 'A checked result is ready.' : 'Run Check page first.'}</p>`;
      if (current === 'settings') body.innerHTML = `<h3>Settings</h3><ul class="methods"><li class="method"><strong>Execution</strong><span class="state">offline</span><div class="details">Browser Worker only. No provider or local service.</div></li><li class="method"><strong>Retention</strong><span class="state">off</span><div class="details">No localStorage, sessionStorage, IndexedDB or cookie use.</div></li><li class="method"><strong>Build policy</strong><span class="state">report only</span><div class="details">Builds do not fail on findings in v1.</div></li></ul>`;
      body.querySelector('.run')?.addEventListener('click', () => { const cancel = body.querySelector<HTMLButtonElement>('.cancel'); if (cancel) cancel.disabled = false; void run().finally(() => { if (cancel) cancel.disabled = true; }); });
      body.querySelector('.cancel')?.addEventListener('click', () => stop());
      body.querySelector('.patch-action')?.addEventListener('click', () => {
        if (!result) return;
        const findings = inspectUnicode(sourceText);
        const preview = previewSafeFixes(sourceText, findings, findings.map((finding) => finding.id), result.protected_spans);
        const patch = diff(sourceText, preview.candidate);
        const safe = { source_hash: patch.source_hash, candidate_hash: patch.candidate_hash, change_count: patch.change_count, segments: patch.segments.map(({ type, source_start, source_end, candidate_start, candidate_end }) => ({ type, source_start, source_end, candidate_start, candidate_end })), contains_content: false, writes_source: false };
        body.querySelector<HTMLElement>('.patch')!.textContent = JSON.stringify(safe, null, 2);
        body.querySelector<HTMLElement>('.status')!.textContent = patch.change_count ? `${patch.change_count} change segment(s) prepared for review. Source unchanged.` : 'No eligible deterministic fixes. Source unchanged.';
      });
      body.querySelector('.receipt')?.addEventListener('click', () => {
        if (!result) return;
        download('opace-content-integrity-receipt.json', `${JSON.stringify(hashOnlyReceipt(result), null, 2)}\n`, 'application/json');
        body.querySelector<HTMLElement>('.status')!.textContent = 'Hash-only receipt downloaded.';
      });
    };

    const select = (view: View): void => {
      current = view;
      tabs.forEach((tab) => {
        const selected = tab.dataset.view === view;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      body.setAttribute('aria-labelledby', `oaci-tab-${view}`);
      render();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab.dataset.view as View));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        select(tabs[next]!.dataset.view as View);
        tabs[next]!.focus();
      });
    });
    app.onToggled(({ state }) => {
      if (state) { panel.removeAttribute('hidden'); render(); tabs.find((tab) => tab.dataset.view === current)?.focus(); }
      else { stop(); panel.setAttribute('hidden', ''); }
    });
    render();
  },
  beforeTogglingOff() { return true; },
});
