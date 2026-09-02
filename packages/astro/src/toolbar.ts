import { defineToolbarApp } from 'astro/toolbar';
import { projectDomVisibleText } from '@opace/content-integrity-browser';
import {
  CYCLE5_MODEL_BASE,
  CYCLE5_MODEL_DOWNLOAD_LABEL,
  CYCLE5_MODEL_SHA256,
  CYCLE5_RUNTIME_DOWNLOAD_LABEL,
  composeCycle5BrowserCheckerResult,
  createCycle5BrowserRuntime,
  type CheckerResult,
} from '@opace/content-integrity-cycle5-browser';
import { diff, inspectUnicode, previewSafeFixes } from '@opace/content-integrity-core';
import type { AnalysisResult } from '@opace/content-integrity-contracts';
import { adaptLegacyAnalysisResult, mount } from '../../../shared/presentation/checker-result-presentation.mjs';
import { CHECKER_UI_CSS } from '../../../shared/presentation/checker-ui-css.mjs';
import { buildCheckerReportHtml, CHECKER_REPORT_CSS } from '../../../shared/report/checker-report-html.mjs';
import canonicalProductLogo from '../../../docs/assets/opace-ai-content-integrity-logo-v2.png';
import { registerToolbarFonts, TOOLBAR_CSS } from './toolbar-theme.js';
import { buildContentFreeReceipt } from './receipt.js';
import { buildShareSummary, HONESTY_LINE, shareText } from './share.js';
import workerSource from 'opace:worker';

type View = 'checker' | 'fix' | 'claude' | 'receipts' | 'settings';
type Route = 'device' | 'quick';
type Tone = 'idle' | 'working' | 'done' | 'refused' | 'error';

/** Every tab that ships. A tab with nothing behind it is not a tab. */
const VIEWS: Array<[View, string]> = [
  ['checker', 'Check page'],
  ['fix', 'Protect & fix'],
  ['claude', 'Claude readiness'],
  ['receipts', 'Receipts'],
  ['settings', 'Settings'],
];

/** The surface limit. Longer pages are refused rather than trimmed. */
const LIMIT = 50_000;
/** Below this the writing rules have nothing worth reporting, so the run is refused. */
const MIN_CHARACTERS = 50;
/** The on-device model needs roughly this much text before a section can be scored. */
const MIN_WORDS_FOR_MODEL = 60;
/** The dev-only loopback model base a test harness may set before the toolbar opens. */
const DEV_MODEL_BASE_KEY = '__opaceContentIntegrityDevModelBase';

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/gu, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);
const count = (value: number): string => value.toLocaleString('en-GB');

function element<K extends keyof HTMLElementTagNameMap>(name: K, attrs: Record<string, string> = {}): HTMLElementTagNameMap[K] {
  const node = document.createElement(name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

/**
 * The shipped model base is the fixed Opace HTTPS directory. A test harness may
 * point the toolbar at a loopback HTTPS mirror of the same pinned bytes while
 * live CORS is an open deployment gate; anything that is not loopback HTTPS is
 * ignored, and every byte is still verified against its pinned hash.
 */
function modelBase(): string {
  const candidate = (globalThis as Record<string, unknown>)[DEV_MODEL_BASE_KEY];
  if (typeof candidate !== 'string' || !candidate) return CYCLE5_MODEL_BASE;
  try {
    const url = new URL(candidate);
    const loopback = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
    if (url.protocol !== 'https:' || !loopback) return CYCLE5_MODEL_BASE;
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.href;
  } catch {
    return CYCLE5_MODEL_BASE;
  }
}

function safeVisibleText(): { text: string; tooLong: boolean } {
  const projection = projectDomVisibleText(document.body);
  return { text: projection.text, tooLong: projection.text.length > LIMIT };
}

const words = (value: string): number => value.trim().split(/\s+/u).filter(Boolean).length;

let workerUrl: string | undefined;
/**
 * The inspection worker is started from a blob of its own bundled source. A
 * separate file would be fetched through the host's dev server, and Vite refuses
 * any path outside the consumer's project — which is where an installed
 * dependency always is.
 */
function inspectionWorkerUrl(): string {
  workerUrl ??= URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
  return workerUrl;
}

/** The pinned model file, described the way a careful reader would want it described. */
const MODEL_FACTS = {
  size: CYCLE5_MODEL_DOWNLOAD_LABEL,
  runtime: CYCLE5_RUNTIME_DOWNLOAD_LABEL,
  hashShort: CYCLE5_MODEL_SHA256.slice(0, 8),
  hash: CYCLE5_MODEL_SHA256,
};

/** Everything the shared renderer needs to draw this surface's result and report. */
const RESULT_OPTIONS = {
  surface: 'Astro toolbar',
  logoDataUri: canonicalProductLogo,
  headingLevel: 3 as const,
  idPrefix: 'oacit-result',
  measurePassages: true,
};

/** The three exports offered beside a complete reading. */
const EXPORT_ACTIONS = [
  { id: 'report', label: 'Open the printable report', description: 'The whole reading, ready to print or save as a PDF.' },
  { id: 'receipt', label: 'Download the JSON receipt', description: 'Hashes, counts and levels. No page text.' },
  { id: 'share', label: 'Copy a share summary', description: 'Levels and section scores only. No page text.' },
];

/** The deterministic-only receipt kept for runs where no model result exists. */
function primitiveReceipt(result: AnalysisResult): Record<string, unknown> {
  return {
    schema_version: result.schema_version,
    contract_version: result.contract_version,
    receipt_version: 'astro-toolbar-content-free/2.0.0',
    profile: 'primitive',
    contains_content: false,
    privacy_route: 'browser',
    source: { content_hash: result.source.content_hash, word_count: result.source.word_count },
    methods: result.methods.map(({ id, version, status, limitations }) => ({ id, version, status, limitations })),
    summary: result.summary,
    limitations: [...result.limitations, 'No page text, page URL or route path is retained in this receipt.'],
  };
}

export default defineToolbarApp({
  init(canvas, app) {
    void registerToolbarFonts();

    const style = element('style');
    style.textContent = `${TOOLBAR_CSS}\n${CHECKER_UI_CSS}`;

    const panel = element('section', { class: 'oacit', hidden: '', 'aria-label': 'Opace AI Content Integrity' });
    panel.innerHTML = `
      <header class="oacit-mast">
        <img src="${canonicalProductLogo}" alt="" width="42" height="42">
        <div>
          <p class="oacit-brand">Opace AI Content Integrity</p>
          <p class="oacit-promise">Evidence, not guarantees</p>
        </div>
      </header>
      <nav class="oacit-rail" role="tablist" aria-label="Content Integrity views">${VIEWS.map(([id, label], index) => `<button type="button" role="tab" id="oacit-tab-${id}" aria-controls="oacit-view" data-view="${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}">${label}</button>`).join('')}</nav>
      <div class="oacit-body" id="oacit-view" role="tabpanel" aria-labelledby="oacit-tab-checker" tabindex="-1"></div>`;
    canvas.append(style, panel);

    const body = panel.querySelector<HTMLElement>('.oacit-body')!;
    const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[role=tab]')];

    let current: View = 'checker';
    let result: AnalysisResult | undefined;
    let checkerResult: CheckerResult | undefined;
    let route: Route = 'device';
    let modelNotice = '';
    let sourceText = '';
    let controller: AbortController | undefined;
    let worker: Worker | undefined;
    let requestSerial = 0;
    let mounted: { destroy(): void; setActionStatus(text: string): void } | undefined;

    const base = modelBase();
    const modelRuntime = createCycle5BrowserRuntime({
      modelBaseUrl: base,
      allowedModelBaseUrls: [base],
      maxCharacters: LIMIT,
    });

    /* ----------------------------------------------------------- status --- */

    const statusText = (): HTMLElement | null => body.querySelector<HTMLElement>('.oacit-status-text');

    const setStatus = (message: string, tone: Tone = 'idle', progress?: number): void => {
      const holder = body.querySelector<HTMLElement>('.oacit-status');
      const text = statusText();
      if (!holder || !text) return;
      holder.dataset.tone = tone;
      holder.querySelector<HTMLElement>('.oacit-spinner')?.toggleAttribute('hidden', tone !== 'working');
      text.textContent = message;
      const bar = body.querySelector<HTMLElement>('.oacit-progress');
      if (!bar) return;
      bar.toggleAttribute('hidden', progress === undefined);
      if (progress !== undefined) bar.querySelector<HTMLElement>('i')!.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    };

    /** Say something in both the panel status line and the result's own polite status. */
    const say = (message: string, tone: Tone = 'idle'): void => {
      setStatus(message, tone);
      mounted?.setActionStatus(message);
    };

    const stop = (message = 'Cancelled. Nothing about the page was kept.', tone: Tone = 'idle'): void => {
      requestSerial += 1;
      controller?.abort();
      worker?.terminate();
      controller = undefined;
      worker = undefined;
      setStatus(message, tone);
    };

    /* ------------------------------------------------------------- run ---- */

    const run = async (): Promise<void> => {
      route = body.querySelector<HTMLInputElement>('input[name="oacit-route"]:checked')?.value === 'quick' ? 'quick' : 'device';
      const consent = body.querySelector<HTMLInputElement>('.oacit-consent input')?.checked ?? false;
      if (route === 'device' && !consent) {
        setStatus('Tick the download box before the on-device model can run, or choose the quick checks instead.', 'refused');
        return;
      }

      stop('Getting ready…', 'working');
      const serial = requestSerial;
      const visible = safeVisibleText();
      sourceText = visible.text;

      if (!sourceText.trim()) {
        setStatus('There is no visible text on this page to read.', 'refused');
        return;
      }
      if (sourceText.trim().length < MIN_CHARACTERS) {
        setStatus(`This page has ${count(sourceText.trim().length)} visible characters. That is too short to read either way, so nothing was scored.`, 'refused');
        return;
      }
      if (visible.tooLong) {
        setStatus(`This page has ${count(sourceText.length)} visible characters. The toolbar refuses anything over ${count(LIMIT)} rather than reading a trimmed extract and calling it the whole page.`, 'refused');
        return;
      }
      if (route === 'device' && !navigator.onLine) {
        const cached = await modelRuntime.prepareFromCache().catch(() => false);
        if (!cached) {
          setStatus('You are offline and the model has not been downloaded yet. Reconnect once to fetch it, or run the quick checks now.', 'refused');
          return;
        }
      }

      controller = new AbortController();
      const request = {
        schema_version: '1.0' as const,
        contract_version: '1.0.0',
        request_id: `req_${crypto.randomUUID().replaceAll('-', '')}`,
        created_at: new Date().toISOString(),
        source: { content: sourceText, content_type: 'plain_text' as const, language: 'en-GB' },
        checks: ['unicode.invisible', 'style.patterns', 'watermark.anthropic'],
        privacy: { allowed_routes: ['browser' as const], save_receipt: false, retain_content: false },
      };
      worker = new Worker(inspectionWorkerUrl(), { type: 'module' });
      const id = request.request_id;
      const onAbort = () => worker?.postMessage({ type: 'cancel', id });
      controller.signal.addEventListener('abort', onAbort, { once: true });
      setStatus(`Reading ${count(sourceText.length)} characters on this machine…`, 'working', 8);

      try {
        checkerResult = undefined;
        modelNotice = '';
        result = await new Promise<AnalysisResult>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error('The checks took longer than ten seconds and were stopped.')), 10_000);
          worker!.onmessage = (event) => {
            if (serial !== requestSerial) return;
            if (event.data.type === 'progress') setStatus(`Checking: ${String(event.data.phase).replaceAll('_', ' ')}…`, 'working', 18);
            if (event.data.type === 'result') { window.clearTimeout(timeout); resolve(event.data.result); }
            if (event.data.type === 'error') { window.clearTimeout(timeout); reject(new Error(event.data.code)); }
          };
          worker!.onerror = () => reject(new Error('The background check stopped safely.'));
          worker!.postMessage({ type: 'inspect', id, request });
        });
        if (serial !== requestSerial) return;

        const primitive = adaptLegacyAnalysisResult(result, { surface: 'Astro toolbar', characterCount: sourceText.length, maxCharacters: LIMIT, refuseNotTruncate: true }) as CheckerResult;
        checkerResult = primitive;

        if (route === 'device') await scoreOnDevice(primitive);

        if (serial !== requestSerial) return;
        // A held-back reading is not a clean pass, so it never gets the green tone.
        setStatus(checkerResult.profile === 'full_checker'
          ? `Done. ${count(result.source.word_count)} words read by the model on this machine.`
          : `Done. ${count(result.source.word_count)} words checked. The AI-pattern reading was not made.`, checkerResult.profile === 'full_checker' ? 'done' : 'refused');
        renderResult();
      } catch (error) {
        if (serial !== requestSerial) return;
        setStatus(error instanceof Error ? error.message : 'The check stopped safely. Nothing was kept.', 'error');
      } finally {
        worker?.terminate();
        worker = undefined;
      }
    };

    /** Prepare, verify and run the pinned on-device model, keeping every refusal honest. */
    const scoreOnDevice = async (primitive: CheckerResult): Promise<void> => {
      try {
        setStatus('Looking for a verified model already on this machine…', 'working', 26);
        const cached = await modelRuntime.prepareFromCache(controller!.signal);
        if (!cached) {
          await modelRuntime.prepareWithConsent({
            consent: true,
            signal: controller!.signal,
            onProgress: (progress) => {
              const share = progress.totalBytes ? (progress.receivedBytes / progress.totalBytes) * 100 : 0;
              setStatus(`Downloading and checking file ${progress.fileIndex} of ${progress.fileCount}: ${(progress.receivedBytes / 1_000_000).toFixed(1)} of ${(progress.totalBytes / 1_000_000).toFixed(1)} MB`, 'working', 26 + share * 0.5);
            },
          });
        }
        setStatus('Reading each section with the model, here on this machine…', 'working', 78);
        const score = await modelRuntime.score(sourceText, {
          signal: controller!.signal,
          onSection: (done, total) => setStatus(`Reading section ${done} of ${total} on this machine…`, 'working', 78 + (done / Math.max(total, 1)) * 20),
        });
        if (score.status === 'scored') {
          checkerResult = composeCycle5BrowserCheckerResult(primitive, score, sourceText, {
            surface: 'Astro toolbar',
            resultId: `astro_cycle5_${crypto.randomUUID().replaceAll('-', '')}`,
            reportFormat: 'html',
            maxCharacters: LIMIT,
          });
          return;
        }
        modelNotice = score.code === 'too_short'
          ? `There is not enough text here for the model to read. It needs about ${MIN_WORDS_FOR_MODEL} words in a section, and this page has ${count(words(sourceText))}. The AI-pattern reading is held back rather than guessed.`
          : `${score.reason} The AI-pattern reading is held back rather than guessed.`;
      } catch (error) {
        if (controller?.signal.aborted) throw error;
        const code = (error as { code?: string }).code;
        if (code === 'cancelled') throw error;
        modelNotice = code === 'offline'
          ? 'The model could not be reached, so nothing was scored. The character and writing checks below still ran.'
          : code === 'integrity_error'
            ? 'A downloaded file did not match its pinned hash, so it was thrown away and never run. Nothing was scored.'
            : `The model did not run: ${error instanceof Error ? error.message : 'unknown error'}. The character and writing checks below still ran.`;
      }
    };

    /* ---------------------------------------------------------- result ---- */

    const renderResult = (): void => {
      const target = body.querySelector<HTMLElement>('.oacit-result-slot');
      if (!target || !checkerResult) return;
      mounted?.destroy();
      mounted = undefined;
      target.innerHTML = modelNotice
        ? `<div class="oacit-notice" role="status"><strong>The AI-pattern reading is held back</strong>${escapeHtml(modelNotice)}</div>`
        : '';
      const host = element('div');
      target.append(host);
      mounted = mount(host, checkerResult, {
        ...RESULT_OPTIONS,
        actionStatusSlot: true,
        actions: checkerResult.profile === 'full_checker' ? EXPORT_ACTIONS : [],
        onAction: (action) => {
          if (action === 'report') openReport();
          if (action === 'receipt') downloadReceipt();
          if (action === 'share') void copyShare();
        },
      });
    };

    /** Write the exact-result receipt with every content-bearing field removed. */
    const downloadReceipt = (): void => {
      if (!checkerResult) return;
      const payload = checkerResult.profile === 'full_checker' ? buildContentFreeReceipt(checkerResult) : result ? primitiveReceipt(result) : undefined;
      if (!payload) return;
      download(`${checkerResult.result_id}-receipt.json`, `${JSON.stringify(payload, null, 2)}\n`, 'application/json');
      say('Receipt downloaded. It holds hashes, counts and levels — no page text.', 'done');
    };

    /** Open the complete printable report in its own tab, ready for the browser's print dialogue. */
    const openReport = (): void => {
      if (!checkerResult) return;
      // The shared report is taken as a fragment and given this surface's own
      // document shell, so the article sits inside a <main> landmark. Everything
      // inside the article, and every byte of its styling, stays Lane D2's.
      const article = buildCheckerReportHtml(checkerResult, {
        surfaceName: 'Astro dev toolbar',
        logoDataUri: canonicalProductLogo,
        generatedAt: checkerResult.generated_at,
        sourceText,
        fragment: true,
      });
      const title = `Opace AI Content Integrity report — ${checkerResult.result_id}`;
      const report = `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex">
<style>html,body{margin:0;padding:0}${CHECKER_REPORT_CSS}</style>
</head>
<body><main>${article}</main></body>
</html>
`;
      const url = URL.createObjectURL(new Blob([report], { type: 'text/html;charset=utf-8' }));
      const opened = window.open(url, '_blank', 'noopener');
      say(opened
        ? 'The complete report opened in a new tab. Print it from there, or save it as a PDF.'
        : 'Your browser blocked the new tab. Allow pop-ups for this site, then try again.', opened ? 'done' : 'refused');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    };

    /** Copy the content-free summary: levels, section scores, counts and the honesty line. */
    const copyShare = async (): Promise<void> => {
      if (!checkerResult) return;
      const summary = buildShareSummary(checkerResult);
      if (!summary) {
        say('There is no reading to share yet.', 'refused');
        return;
      }
      const text = shareText(summary);
      try {
        await navigator.clipboard.writeText(text);
        say('Summary copied. It carries the levels, the section scores and the counts — never the page text.', 'done');
      } catch {
        download('opace-content-integrity-share-summary.txt', `${text}\n`, 'text/plain;charset=utf-8');
        say('Clipboard access was refused, so the content-free summary was downloaded instead.', 'done');
      }
    };

    const download = (name: string, content: string, type: string): void => {
      const url = URL.createObjectURL(new Blob([content], { type }));
      const link = element('a', { href: url, download: name });
      link.click();
      URL.revokeObjectURL(url);
    };

    /* ------------------------------------------------------------ views --- */

    const statusBlock = (message: string): string =>
      `<div class="oacit-status" data-tone="idle"><span class="oacit-spinner" hidden aria-hidden="true"></span><span class="oacit-status-text" role="status" aria-live="polite">${message}</span></div><div class="oacit-progress" hidden><i style="width:0%"></i></div>`;

    const checkerView = (): string => `
      <h2>Check this page</h2>
      <p>Read the visible text of the page you are previewing. Nothing runs, and nothing downloads, until you ask for it.</p>
      <div class="oacit-card">
        <p class="oacit-legend">What gets read</p>
        <p>Only what a reader can see, up to ${count(LIMIT)} characters. A longer page is refused rather than trimmed, because half a page would give you half an answer. Scripts, styles, templates and anything hidden are left out.</p>
      </div>
      <fieldset class="oacit-routes">
        <legend class="oacit-legend">How should it be read?</legend>
        <label class="oacit-route">
          <input type="radio" name="oacit-route" value="device" ${route === 'device' ? 'checked' : ''}>
          <b>On this device<span class="oacit-tag">Recommended</span></b>
          <span>The trained model runs inside this browser, so your page text never leaves the machine. It downloads a ${MODEL_FACTS.size} file once, then reads from the browser cache.</span>
        </label>
        <label class="oacit-route">
          <input type="radio" name="oacit-route" value="quick" ${route === 'quick' ? 'checked' : ''}>
          <b>Quick checks only</b>
          <span>Hidden characters, watermark markers and the named writing rules. No model runs, so the AI-pattern reading stays unread rather than guessed.</span>
        </label>
      </fieldset>
      <label class="oacit-consent" ${route === 'device' ? '' : 'hidden'}>
        <input type="checkbox">
        <span><b>Download the model file (${MODEL_FACTS.size}), plus a ${MODEL_FACTS.runtime} browser runtime, if they are not already cached.</b>
        The ${MODEL_FACTS.size} download is a data file of model weights — numbers the checker reads. It is not a
        program and it cannot execute anything on your machine. Every byte is compared against the published
        SHA-256 <code>${MODEL_FACTS.hashShort}…</code> before it is used, and a file that does not match is
        thrown away. It is stored in the browser cache like any other web asset, one click in Settings clears
        it, and the download can be cancelled while it runs. Your page text is not sent to Opace on this route.</span>
      </label>
      <p class="oacit-elsewhere">Both routes stay on this machine. The private EU server route is offered in the WordPress plugin and the Chrome extension, not here.</p>
      <div class="oacit-actions">
        <button type="button" class="oacit-primary oacit-run">Read this page</button>
        <button type="button" class="oacit-cancel" disabled>Cancel</button>
      </div>
      ${statusBlock('Ready. Nothing has run yet.')}
      <div class="oacit-result-slot"></div>`;

    const fixView = (): string => `
      <h2>Protect &amp; fix</h2>
      <p>Only one kind of fix ships here: removing invisible Unicode characters we can explain. Nothing is rewritten, and your source files are never touched.</p>
      <div class="oacit-card">
        <p class="oacit-legend">What you get</p>
        <p>A patch you can read before you use it: which characters would go, where they sit, and the hash of the text before and after. Protected facts — figures, names, quotations — are left alone.</p>
      </div>
      <div class="oacit-notice oacit-notice--plain"><strong>Rewriting the writing is not in this release</strong>There is no model-backed rewriting and no automatic wording change. If that is what you need, edit the draft yourself; the writing rules on the Check page say what to look at.</div>
      <div class="oacit-actions"><button type="button" class="oacit-primary oacit-patch-action" ${result ? '' : 'disabled'}>Prepare a patch to review</button></div>
      ${statusBlock(result ? 'A checked page is ready.' : 'Read a page on the Check page tab first.')}
      <pre class="oacit-patch" tabindex="0">No patch prepared.</pre>`;

    const claudeView = (): string => `
      <h2>Claude readiness</h2>
      <p>Whether this page carries anything an AI vendor's own verifier would recognise, and what we honestly cannot tell you.</p>
      <ul class="oacit-facts">
        <li>
          <strong>Anthropic's official check</strong>
          <span class="oacit-chip" data-tone="off">Not available</span>
          <p>No approved verifier was run. That is not a clearance, and it is not a removal claim either.</p>
        </li>
        <li>
          <strong>Our own character and writing checks</strong>
          <span class="oacit-chip" data-tone="${result ? 'on' : 'off'}">${result ? 'Ran' : 'Not run'}</span>
          <p>${result ? 'See the named checks in the reading on the Check page.' : 'Use Check page to run them when you choose to.'}</p>
        </li>
      </ul>`;

    const receiptsView = (): string => `
      <h2>Receipts</h2>
      <p>Save a record of what ran and what it found, in a form you can attach to a ticket without moving the page text.</p>
      <div class="oacit-card">
        <p class="oacit-legend">What a receipt holds</p>
        <p>Hashes, counts, levels, scores, method identities, versions and limitations. It is written only when you ask for one. No page text, no page URL, no route path.</p>
      </div>
      <div class="oacit-actions">
        <button type="button" class="oacit-primary oacit-receipt" ${result ? '' : 'disabled'}>Download the JSON receipt</button>
        <button type="button" class="oacit-share-view" ${checkerResult?.profile === 'full_checker' ? '' : 'disabled'}>Copy a share summary</button>
      </div>
      ${statusBlock(result ? 'A checked page is ready.' : 'Read a page on the Check page tab first.')}
      <div class="oacit-card" style="margin-top:14px"><p class="oacit-legend">What travels with a share</p><p>${HONESTY_LINE}</p></div>`;

    const settingsView = (): string => `
      <h2>Settings</h2>
      <p>What this integration will and will not do, and the one thing it stores.</p>
      <ul class="oacit-facts">
        <li><strong>When anything runs</strong><span class="oacit-chip" data-tone="on">Only when you ask</span><p>The model runs in this browser after you agree to the download. Quick checks stay available with no model at all.</p></li>
        <li><strong>What is kept</strong><span class="oacit-chip" data-tone="off">Nothing of yours</span><p>Page text and readings are never written to localStorage, sessionStorage, IndexedDB or cookies. The only thing stored is the model file itself.</p></li>
        <li><strong>The model file</strong><span class="oacit-chip" data-tone="held">${MODEL_FACTS.size} data file</span><p>Model weights — numbers the checker reads. Not a program: it cannot execute anything. Checked against the published SHA-256 <code>${MODEL_FACTS.hashShort}…</code> before use, and refused if it does not match. Kept in the browser cache like any other web asset, and cleared by the button below.</p></li>
        <li><strong>Model source</strong><span class="oacit-chip" data-tone="${base === CYCLE5_MODEL_BASE ? 'on' : 'held'}">${base === CYCLE5_MODEL_BASE ? 'Shipped default' : 'Local test mirror'}</span><p>${escapeHtml(base)}</p></li>
        <li><strong>Builds</strong><span class="oacit-chip" data-tone="held">Build scan only</span><p>A build runs the deterministic scan, never the model, and never fails on a finding.</p></li>
      </ul>
      <div class="oacit-actions"><button type="button" class="oacit-clear-model">Clear the ${MODEL_FACTS.size} model file</button></div>
      ${statusBlock('')}`;

    const render = (): void => {
      stop('View changed. Any run in progress was cancelled.');
      const markup: Record<View, () => string> = {
        checker: checkerView,
        fix: fixView,
        claude: claudeView,
        receipts: receiptsView,
        settings: settingsView,
      };
      mounted?.destroy();
      mounted = undefined;
      body.innerHTML = markup[current]();
      body.scrollTop = 0;
      wire();
      if (current === 'checker' && checkerResult) renderResult();
    };

    const wire = (): void => {
      body.querySelectorAll<HTMLInputElement>('input[name="oacit-route"]').forEach((input) => {
        input.addEventListener('change', () => {
          route = input.value === 'quick' ? 'quick' : 'device';
          body.querySelector<HTMLElement>('.oacit-consent')?.toggleAttribute('hidden', route !== 'device');
        });
      });

      body.querySelector('.oacit-run')?.addEventListener('click', () => {
        const cancel = body.querySelector<HTMLButtonElement>('.oacit-cancel');
        const start = body.querySelector<HTMLButtonElement>('.oacit-run');
        if (cancel) cancel.disabled = false;
        if (start) start.disabled = true;
        void run().finally(() => {
          if (cancel) cancel.disabled = true;
          if (start) start.disabled = false;
        });
      });
      body.querySelector('.oacit-cancel')?.addEventListener('click', () => stop());

      body.querySelector('.oacit-clear-model')?.addEventListener('click', async () => {
        const cleared = await modelRuntime.clearCache();
        setStatus(cleared ? `The ${MODEL_FACTS.size} model file was deleted from this browser's cache.` : 'There was no model file to clear.', 'done');
      });

      body.querySelector('.oacit-patch-action')?.addEventListener('click', () => {
        if (!result) return;
        const findings = inspectUnicode(sourceText);
        const preview = previewSafeFixes(sourceText, findings, findings.map((finding) => finding.id), result.protected_spans);
        const patch = diff(sourceText, preview.candidate);
        const safe = {
          source_hash: patch.source_hash,
          candidate_hash: patch.candidate_hash,
          change_count: patch.change_count,
          segments: patch.segments.map(({ type, source_start, source_end, candidate_start, candidate_end }) => ({ type, source_start, source_end, candidate_start, candidate_end })),
          contains_content: false,
          writes_source: false,
        };
        body.querySelector<HTMLElement>('.oacit-patch')!.textContent = JSON.stringify(safe, null, 2);
        setStatus(patch.change_count
          ? `${count(patch.change_count)} change${patch.change_count === 1 ? '' : 's'} ready for you to review. Your source is untouched.`
          : 'Nothing here can be fixed safely. Your source is untouched.', 'done');
      });

      body.querySelector('.oacit-receipt')?.addEventListener('click', () => {
        if (!result) return;
        const payload = checkerResult?.profile === 'full_checker' ? buildContentFreeReceipt(checkerResult) : primitiveReceipt(result);
        download('opace-content-integrity-receipt.json', `${JSON.stringify(payload, null, 2)}\n`, 'application/json');
        setStatus('Receipt downloaded. It holds hashes, counts and levels — no page text.', 'done');
      });
      body.querySelector('.oacit-share-view')?.addEventListener('click', () => void copyShare());
    };

    /* -------------------------------------------------------------- tabs -- */

    const select = (view: View): void => {
      current = view;
      tabs.forEach((tab) => {
        const selected = tab.dataset.view === view;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      body.setAttribute('aria-labelledby', `oacit-tab-${view}`);
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
      if (state) {
        panel.removeAttribute('hidden');
        render();
        tabs.find((tab) => tab.dataset.view === current)?.focus();
      } else {
        stop();
        panel.setAttribute('hidden', '');
      }
    });

    render();
  },
  beforeTogglingOff() { return true; },
});
