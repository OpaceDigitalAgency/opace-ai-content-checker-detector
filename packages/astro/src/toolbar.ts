import { defineToolbarApp } from 'astro/toolbar';
import { projectDomVisibleText } from '@opacedev/ai-content-checker-browser';
import {
  CYCLE5_CACHE_NAME,
  CYCLE5_MODEL_BASE,
  CYCLE5_MODEL_DOWNLOAD_LABEL,
  CYCLE5_MODEL_FILE,
  CYCLE5_MODEL_SHA256,
  CYCLE5_RUNTIME_DOWNLOAD_LABEL,
  CYCLE5_VOCAB_FILE,
  CYCLE5_WASM_FILE,
  composeCycle5BrowserCheckerResult,
  createCycle5BrowserRuntime,
  type CheckerResult,
} from '@opace/content-integrity-cycle5-browser';
import { diff, inspectUnicode, previewSafeFixes } from '@opacedev/ai-content-checker-core';
import type { AnalysisResult } from '@opacedev/ai-content-checker-contracts';
import { adaptLegacyAnalysisResult, mount, openShareSheet, PRODUCT_LOGO_DATA_URI as canonicalProductLogo } from '../../../shared/presentation/checker-result-presentation.mjs';
import { CHECKER_UI_CSS } from '../../../shared/presentation/checker-ui-css.mjs';
import { buildCheckerReportHtml, CHECKER_REPORT_CSS } from '../../../shared/report/checker-report-html.mjs';
import { registerToolbarFonts, TOOLBAR_CSS } from './toolbar-theme.js';
import { buildContentFreeReceipt } from './receipt.js';
import { buildShareSummary, HONESTY_LINE } from './share.js';
import { createPageHighlighter, type PageHighlighter, type SourceRun } from './highlight.js';
import { installSectionAccordion, type SectionAccordion } from './sections.js';
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

/**
 * Line glyphs drawn inline, so a notice or an empty state carries a mark
 * without a network request and without a second colour of its own. Each takes
 * the colour of the text around it and is hidden from assistive technology,
 * because every one of them sits beside words that already say the same thing.
 */
const GLYPH = {
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 4.5 2.8 20h18.4z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/></svg>',
  patch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.5 3.5h7l5 5v12h-12z"/><path d="M13.5 3.5v5h5"/><path d="M9.5 13.5h5"/><path d="M9.5 16.5h3"/></svg>',
};

/** A tinted card with a mark, what happened, and one way onward. */
const notice = (options: { tone?: 'plain'; glyph: string; title: string; body: string; out?: { label: string; goto: string }; role?: string }): string =>
  `<div class="oacit-notice${options.tone === 'plain' ? ' oacit-notice--plain' : ''}"${options.role ? ` role="${options.role}"` : ''}>
    <span class="oacit-notice-mark">${options.glyph}</span>
    <div class="oacit-notice-body">
      <strong>${options.title}</strong>
      <p>${options.body}</p>
      ${options.out ? `<button type="button" class="oacit-notice-out" data-goto="${options.out.goto}">${options.out.label}</button>` : ''}
    </div>
  </div>`;

/** A friendly, honest placeholder rather than a blank space. */
const emptyState = (glyph: string, title: string, body: string, options: { cls?: string; hidden?: boolean } = {}): string =>
  `<div class="oacit-empty${options.cls ? ` ${options.cls}` : ''}"${options.hidden ? ' hidden' : ''}><span class="oacit-empty-mark">${glyph}</span><b>${title}</b><span>${body}</span></div>`;

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

function safeVisibleText(): { text: string; runs: SourceRun[]; tooLong: boolean; structureHtml: string } {
  const projection = projectDomVisibleText(document.body);
  const structure = document.body.cloneNode(true) as HTMLElement;
  structure.querySelectorAll('script,style,template,noscript,[hidden],[aria-hidden="true"]').forEach(node => node.remove());
  // The run table is what lets a chosen section be shown back on the page: it
  // carries, for every text node, the exact window it occupies in the string
  // the model read. It is kept in memory for the life of one reading and never
  // written anywhere.
  return { text: projection.text, runs: projection.runs as SourceRun[], tooLong: projection.text.length > LIMIT, structureHtml: structure.innerHTML };
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

/** The three pinned files a complete on-device run needs to find in the cache. */
const CACHED_MODEL_FILES = [CYCLE5_MODEL_FILE, CYCLE5_VOCAB_FILE, CYCLE5_WASM_FILE];

/**
 * Is every pinned file already in this browser's cache?
 *
 * This is a key lookup, not a verification: it decides only what the button is
 * allowed to promise. Every byte is still hashed against its pinned SHA-256
 * before the model runs, and a cached copy that fails that check is thrown away
 * and the run refused rather than quietly replaced by a download.
 */
async function modelIsCached(base: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    if (!(await caches.has(CYCLE5_CACHE_NAME))) return false;
    const cache = await caches.open(CYCLE5_CACHE_NAME);
    for (const file of CACHED_MODEL_FILES) {
      if (!(await cache.match(new URL(file, base).href))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

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
  { id: 'share', label: 'Share this result', description: 'A link carrying the levels and the section scores. No page text.' },
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

    const panel = element('section', { class: 'oacit', hidden: '', 'aria-label': 'Opace AI Content Checker & Detector' });
    panel.innerHTML = `
      <div class="oacit-head">
        <header class="oacit-mast">
          <img src="${canonicalProductLogo}" alt="" width="46" height="46">
          <div>
            <p class="oacit-brand">Opace AI Content Checker &amp; Detector</p>
            <p class="oacit-promise">Read this page on your own machine. Evidence, not guarantees.</p>
          </div>
        </header>
        <nav class="oacit-rail" role="tablist" aria-label="Opace AI Content Checker &amp; Detector views">${VIEWS.map(([id, label], index) => `<button type="button" role="tab" id="oacit-tab-${id}" aria-controls="oacit-view" data-view="${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? '0' : '-1'}">${label}</button>`).join('')}</nav>
      </div>
      <div class="oacit-body" id="oacit-view" role="tabpanel" aria-labelledby="oacit-tab-checker" tabindex="-1"></div>`;
    canvas.append(style, panel);

    const body = panel.querySelector<HTMLElement>('.oacit-body')!;
    const tabs = [...panel.querySelectorAll<HTMLButtonElement>('[role=tab]')];

    let current: View = 'checker';
    let result: AnalysisResult | undefined;
    let checkerResult: CheckerResult | undefined;
    let route: Route = 'device';
    /** Proved by a cache lookup before the button says what it will do. Never assumed. */
    let modelCached = false;
    let modelNotice = '';
    let sourceText = '';
    let structureHtml = '';
    let controller: AbortController | undefined;
    let worker: Worker | undefined;
    let requestSerial = 0;
    let mounted: { destroy(): void; setActionStatus(text: string): void } | undefined;
    /** The accordion and the page tint belong to one reading and die with it. */
    let accordion: SectionAccordion | undefined;
    let highlighter: PageHighlighter | undefined;
    let sourceRuns: SourceRun[] = [];
    let shareSheet: { close(): void } | null = null;

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

    /**
     * Drop the accordion and take every tint back off the page.
     *
     * Called on a view change, on a fresh run, when the panel closes and when
     * the reading is redrawn, so a tint can never outlive the reading that
     * explained it.
     */
    const forgetSections = (): void => {
      accordion?.destroy();
      accordion = undefined;
      highlighter?.clear();
      highlighter = undefined;
    };

    const stop = (message = 'Cancelled. Nothing about the page was kept.', tone: Tone = 'idle'): void => {
      requestSerial += 1;
      controller?.abort();
      worker?.terminate();
      controller = undefined;
      worker = undefined;
      setStatus(message, tone);
    };

    /* ------------------------------------------------- the run affordance -- */

    /**
     * The button says what pressing it will do, and pressing it is the consent.
     * With no verified model on the machine it reads "Download model and check"
     * and carries the size and the published hash beside it; with one already
     * cached it reads "Check this page" and downloads nothing.
     */
    const downloadsOnPress = (): boolean => route === 'device' && !modelCached;

    const applyRunAffordance = (): void => {
      const start = body.querySelector<HTMLButtonElement>('.oacit-run');
      if (!start) return;
      const downloads = downloadsOnPress();
      start.textContent = downloads ? 'Download model and check' : 'Check this page';
      body.querySelector('.oacit-run-meta')?.toggleAttribute('hidden', !downloads);
      body.querySelector('.oacit-model-note')?.toggleAttribute('hidden', !downloads);
    };

    const refreshRunAffordance = async (): Promise<void> => {
      modelCached = await modelIsCached(base);
      applyRunAffordance();
    };

    /* ------------------------------------------------------------- run ---- */

    const run = async (): Promise<void> => {
      route = body.querySelector<HTMLInputElement>('input[name="oacit-route"]:checked')?.value === 'quick' ? 'quick' : 'device';
      // Pressing a button that says it will download the model is the consent.
      // Nothing is fetched when the button did not offer a download.
      const consentedToDownload = route === 'device' && !modelCached;

      stop('Getting ready…', 'working');
      const serial = requestSerial;
      // The previous reading's tint is taken off the page before the next one
      // is projected: a mark left behind would be read as page text.
      forgetSections();
      const visible = safeVisibleText();
      sourceText = visible.text;
      structureHtml = visible.structureHtml;
      sourceRuns = visible.runs;

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
          modelCached = false;
          applyRunAffordance();
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

        if (route === 'device') await scoreOnDevice(primitive, consentedToDownload);

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
    const scoreOnDevice = async (primitive: CheckerResult, consentedToDownload: boolean): Promise<void> => {
      try {
        setStatus('Looking for a verified model already on this machine…', 'working', 26);
        const cached = await modelRuntime.prepareFromCache(controller!.signal);
        if (!cached) {
          // The button said "Check this page", so a download was never agreed to.
          // A cached copy that has gone or failed its hash is a refusal, not a
          // reason to fetch 34.5 MB nobody asked for.
          if (!consentedToDownload) {
            modelCached = false;
            applyRunAffordance();
            modelNotice = `The model files are no longer on this machine, or one of them failed its hash check and was thrown away. Nothing was downloaded and nothing was scored. The button now offers the ${MODEL_FACTS.size} download again; press it when you are ready.`;
            return;
          }
          await modelRuntime.prepareWithConsent({
            consent: true,
            signal: controller!.signal,
            onProgress: (progress) => {
              const share = progress.totalBytes ? (progress.receivedBytes / progress.totalBytes) * 100 : 0;
              setStatus(`Downloading and checking file ${progress.fileIndex} of ${progress.fileCount}: ${(progress.receivedBytes / 1_000_000).toFixed(1)} of ${(progress.totalBytes / 1_000_000).toFixed(1)} MB`, 'working', 26 + share * 0.5);
            },
          });
        }
        modelCached = true;
        applyRunAffordance();
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
        // A failed download or a discarded file changes what the button should
        // promise next, so the cache is asked again rather than guessed at.
        void refreshRunAffordance();
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
      forgetSections();
      body.querySelector('.oacit-result-empty')?.toggleAttribute('hidden', true);
      target.innerHTML = modelNotice
        ? notice({
          role: 'status',
          glyph: GLYPH.warn,
          title: 'The AI-pattern reading is held back',
          body: escapeHtml(modelNotice),
          out: { label: 'Change how this page is read', goto: 'routes' },
        })
        : '';
      const host = element('div');
      target.append(host);
      mounted = mount(host, checkerResult, {
        ...RESULT_OPTIONS,
        sourceText,
        structureHtml,
        selectedRuleFindings: result?.pattern_findings,
        actionStatusSlot: true,
        actions: checkerResult.profile === 'full_checker' ? EXPORT_ACTIONS : [],
        onAction: (action, button) => {
          if (action === 'report') openReport();
          if (action === 'receipt') downloadReceipt();
          if (action === 'share') openShare(button instanceof HTMLElement ? button : null);
        },
        // The renderer owns the row's own expanded state; the accordion owns
        // everything around it — one open at a time, the pinning, the sticky
        // strip and the tint on the page.
        onToggleSection: (index, expanded) => accordion?.toggled(index, expanded),
      });

      // The tint is drawn on the page being previewed, so it needs the run
      // table from the projection this reading was made from. A reading
      // restored on a tab change without a fresh projection simply tints
      // nothing, and says so.
      highlighter = createPageHighlighter({
        root: document.body,
        runs: sourceRuns,
        document,
        guard: canvas instanceof ShadowRoot ? canvas.host : null,
        avoid: () => panel.getBoundingClientRect(),
      });
      const spans = checkerResult.sections.map((section) => ({
        start: Number(section.start_utf16),
        end: Number(section.end_utf16),
        level: String(section.level),
      }));
      accordion = installSectionAccordion(host, {
        scroller: panel,
        offsetHost: panel,
        onOpen: (index) => {
          const span = spans[index];
          if (!span || !Number.isFinite(span.start) || !Number.isFinite(span.end)) return 0;
          return highlighter?.show(span.start, span.end, span.level) ?? 0;
        },
        onClose: () => highlighter?.clear(),
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
        structureHtml,
        selectedRuleFindings: result?.pattern_findings,
        fragment: true,
      });
      const title = `Opace AI Content Checker & Detector report — ${checkerResult.result_id}`;
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
      // Opening with the `noopener` window feature always returns null, so asking
      // it whether the tab opened told every developer their browser had blocked
      // a report that was sitting open in the next tab. The handle is taken and
      // its `opener` severed instead, which keeps the same boundary and lets the
      // panel say what actually happened.
      const opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
      say(opened
        ? 'The complete report opened in a new tab. Print it from there, or save it as a PDF.'
        : 'Your browser blocked the new tab. Allow pop-ups for this site, then try again.', opened ? 'done' : 'refused');
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    };

    /**
     * Open the shared share sheet: copy the result link, email it, hand it to
     * the device's own apps, or go straight to LinkedIn, Facebook, X or
     * WhatsApp. The same dialog the website draws, from the same module.
     *
     * What travels is the content-free result link. The levels, the section
     * scores, the word count, the date and the model version ride in the URL
     * fragment, which a browser never sends to a server, and the website opens
     * it as a read-only reading. The page text is not in it.
     */
    const openShare = (returnFocusTo?: HTMLElement | null): void => {
      if (!checkerResult) return;
      if (!buildShareSummary(checkerResult)) {
        say('There is no reading to share yet.', 'refused');
        return;
      }
      shareSheet?.close();
      // The dialog is mounted in the toolbar's own shadow root, which is where
      // the shared stylesheet lives; mounted in the page it would be unstyled.
      shareSheet = openShareSheet({
        result: checkerResult,
        root: canvas,
        document,
        returnFocusTo: returnFocusTo ?? undefined,
        onOutcome: (outcome) => {
          say(outcome.message, outcome.status === 'failed' ? 'refused' : 'done');
        },
        onClose: () => { shareSheet = null; },
      });
      if (!shareSheet) say('There is no reading to share yet.', 'refused');
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
        <label class="oacit-route" data-accent="device">
          <input type="radio" name="oacit-route" value="device" ${route === 'device' ? 'checked' : ''}>
          <span class="oacit-tags"><span class="oacit-tag" data-tone="good">Recommended</span><span class="oacit-tag" data-tone="info">Private, no limit</span></span>
          <b>On this device</b>
          <span class="oacit-route-note">The trained model runs inside this browser, so your page text never leaves the machine. It downloads a ${MODEL_FACTS.size} file once, then reads from the browser cache.</span>
        </label>
        <label class="oacit-route" data-accent="quick">
          <input type="radio" name="oacit-route" value="quick" ${route === 'quick' ? 'checked' : ''}>
          <span class="oacit-tags"><span class="oacit-tag">No AI reading</span></span>
          <b>Quick checks only</b>
          <span class="oacit-route-note">Hidden characters, watermark markers and the named writing rules. No model runs, so the AI-pattern reading stays unread rather than guessed.</span>
        </label>
      </fieldset>
      <p class="oacit-elsewhere">Both routes stay on this machine. The private EU server route is offered in the WordPress plugin and the Chrome extension, not here.</p>
      <div class="oacit-actions">
        <button type="button" class="oacit-primary oacit-run" aria-describedby="oacit-run-meta oacit-model-note">${downloadsOnPress() ? 'Download model and check' : 'Check this page'}</button>
        <button type="button" class="oacit-cancel" disabled>Cancel</button>
        <p class="oacit-run-meta" id="oacit-run-meta" ${downloadsOnPress() ? '' : 'hidden'}>${MODEL_FACTS.size} once · SHA-256 <code>${MODEL_FACTS.hashShort}…</code></p>
      </div>
      <p class="oacit-model-note" id="oacit-model-note" ${downloadsOnPress() ? '' : 'hidden'}>That ${MODEL_FACTS.size} is a data file of model weights — numbers the checker reads. It is
      not a program and it cannot execute anything on your machine. Every byte is compared against the published
      SHA-256 <code>${MODEL_FACTS.hashShort}…</code> before it is used, and a file that does not match is thrown
      away. It is stored in the browser cache like any other web asset, the download can be cancelled while it
      runs, and one click in Settings clears it. A ${MODEL_FACTS.runtime} browser runtime comes with it. Your page
      text is not sent to Opace on this route.</p>
      ${statusBlock('Ready. Nothing has run yet.')}
      ${emptyState(GLYPH.target, 'Your reading will appear here', 'Choose how the page should be read, then press the button. Every check that ran, and every one that could not, stays on this page.', { cls: 'oacit-result-empty', hidden: Boolean(checkerResult) })}
      <div class="oacit-result-slot"></div>`;

    const fixView = (): string => `
      <h2>Protect &amp; fix</h2>
      <p>Only one kind of fix ships here: removing invisible Unicode characters we can explain. Nothing is rewritten, and your source files are never touched.</p>
      <div class="oacit-card">
        <p class="oacit-legend">What you get</p>
        <p>A patch you can read before you use it: which characters would go, where they sit, and the hash of the text before and after. Protected facts — figures, names, quotations — are left alone.</p>
      </div>
      ${notice({
        tone: 'plain',
        glyph: GLYPH.info,
        title: 'Rewriting the writing is not in this release',
        body: 'There is no model-backed rewriting and no automatic wording change. If that is what you need, edit the draft yourself; the writing rules on the Check page say what to look at.',
        out: { label: 'Open the Check page', goto: 'checker' },
      })}
      <div class="oacit-actions"><button type="button" class="oacit-primary oacit-patch-action" ${result ? '' : 'disabled'}>Prepare a patch to review</button></div>
      ${statusBlock(result ? 'A checked page is ready.' : 'Read a page on the Check page tab first.')}
      ${emptyState(GLYPH.patch, 'No patch prepared yet', result ? 'Press the button above and the exact character changes, with the hash before and after, will be listed here for you to read.' : 'Read a page on the Check page tab first, then come back and a patch can be prepared from what was found.', { cls: 'oacit-patch-empty' })}
      <pre class="oacit-patch" tabindex="0" hidden>No patch prepared.</pre>`;

    const claudeView = (): string => `
      <h2>Claude readiness</h2>
      <p>Whether this page carries anything an AI vendor's own verifier would recognise, and what we honestly cannot tell you.</p>
      ${result ? '' : notice({
        tone: 'plain',
        glyph: GLYPH.info,
        title: 'Nothing has been read yet',
        body: 'These two lines describe the page you are previewing once a check has run. Until then they say only what has not happened.',
        out: { label: 'Open the Check page', goto: 'checker' },
      })}
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
        <button type="button" class="oacit-share-view" ${checkerResult?.profile === 'full_checker' ? '' : 'disabled'}>Share this result</button>
      </div>
      ${statusBlock(result ? 'A checked page is ready.' : 'Read a page on the Check page tab first.')}
      ${result ? '' : emptyState(GLYPH.target, 'Nothing to save yet', 'A receipt is written from a reading, so read a page on the Check page tab and both buttons above will come alive.')}
      <div class="oacit-card oacit-card--spaced"><p class="oacit-legend">What travels with a share</p><p>${HONESTY_LINE}</p></div>`;

    const settingsView = (): string => `
      <h2>Settings</h2>
      <p>What this integration will and will not do, and the one thing it stores.</p>
      <ul class="oacit-facts">
        <li><strong>When anything runs</strong><span class="oacit-chip" data-tone="on">Only when you ask</span><p>The model runs in this browser only after you press a button that says it will download it. Quick checks stay available with no model at all.</p></li>
        <li><strong>What is kept</strong><span class="oacit-chip" data-tone="off">Nothing of yours</span><p>Page text and readings are never written to localStorage, sessionStorage, IndexedDB or cookies. The only thing stored is the model file itself.</p></li>
        <li><strong>The model file</strong><span class="oacit-chip" data-tone="held">${MODEL_FACTS.size} data file</span><p>Model weights — numbers the checker reads. Not a program: it cannot execute anything. Checked against the published SHA-256 <code>${MODEL_FACTS.hashShort}…</code> before use, and refused if it does not match. Kept in the browser cache like any other web asset, and cleared by the button below.</p></li>
        <li><strong>Model source</strong><span class="oacit-chip" data-tone="${base === CYCLE5_MODEL_BASE ? 'on' : 'held'}">${base === CYCLE5_MODEL_BASE ? 'Shipped default' : 'Local test mirror'}</span><p>${escapeHtml(base)}</p></li>
        <li><strong>Builds</strong><span class="oacit-chip" data-tone="held">Build scan only</span><p>A build runs the deterministic scan, never the model, and never fails on a finding.</p></li>
      </ul>
      <ul class="oacit-stats">
        <li><b>${MODEL_FACTS.size}</b><span>of model weights, downloaded once and then kept in the browser cache</span></li>
        <li><b>SHA-256</b><span>compared byte for byte before anything reads the file</span></li>
        <li><b>One click</b><span>removes it again from this browser</span></li>
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
      forgetSections();
      shareSheet?.close();
      body.innerHTML = markup[current]();
      body.scrollTop = 0;
      wire();
      if (current === 'checker' && checkerResult) renderResult();
    };

    const wire = (): void => {
      body.querySelectorAll<HTMLInputElement>('input[name="oacit-route"]').forEach((input) => {
        input.addEventListener('change', () => {
          route = input.value === 'quick' ? 'quick' : 'device';
          applyRunAffordance();
        });
      });

      if (body.querySelector('.oacit-run')) {
        applyRunAffordance();
        void refreshRunAffordance();
      }

      body.querySelector('.oacit-run')?.addEventListener('click', () => {
        const cancel = body.querySelector<HTMLButtonElement>('.oacit-cancel');
        const start = body.querySelector<HTMLButtonElement>('.oacit-run');
        if (cancel) cancel.disabled = false;
        if (start) start.disabled = true;
        void run().finally(() => {
          if (cancel) cancel.disabled = true;
          if (start) start.disabled = false;
          applyRunAffordance();
        });
      });
      body.querySelector('.oacit-cancel')?.addEventListener('click', () => stop());

      body.querySelector('.oacit-clear-model')?.addEventListener('click', async () => {
        const cleared = await modelRuntime.clearCache();
        modelCached = false;
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
        const patchView = body.querySelector<HTMLElement>('.oacit-patch')!;
        patchView.textContent = JSON.stringify(safe, null, 2);
        patchView.hidden = false;
        body.querySelector('.oacit-patch-empty')?.toggleAttribute('hidden', true);
        setStatus(patch.change_count
          ? `${count(patch.change_count)} change${patch.change_count === 1 ? '' : 's'} ready for you to review. Your source is untouched.`
          : 'Nothing here can be fixed safely. Your source is untouched.', 'done');
      });

      body.querySelector('.oacit-receipt')?.addEventListener('click', () => {
        if (!result) return;
        const payload = checkerResult?.profile === 'full_checker' ? buildContentFreeReceipt(checkerResult) : primitiveReceipt(result);
        download('opace-ai-content-checker-receipt.json', `${JSON.stringify(payload, null, 2)}\n`, 'application/json');
        setStatus('Receipt downloaded. It holds hashes, counts and levels — no page text.', 'done');
      });
      const shareView = body.querySelector<HTMLButtonElement>('.oacit-share-view');
      shareView?.addEventListener('click', () => openShare(shareView));
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

    /**
     * Every notice offers a way out, and the panel body outlives each render, so
     * one delegated listener carries them all rather than a fresh handler per
     * paint.
     */
    body.addEventListener('click', (event) => {
      const out = (event.target as HTMLElement | null)?.closest?.('.oacit-notice-out');
      if (!out) return;
      const destination = out.getAttribute('data-goto');
      if (destination === 'routes') {
        const first = body.querySelector<HTMLInputElement>('input[name="oacit-route"]');
        first?.scrollIntoView({ block: 'nearest' });
        first?.focus();
        return;
      }
      if (destination && VIEWS.some(([id]) => id === destination)) {
        select(destination as View);
        tabs.find((tab) => tab.dataset.view === destination)?.focus();
      }
    });

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
        forgetSections();
        shareSheet?.close();
        panel.setAttribute('hidden', '');
      }
    });

    render();
  },
  beforeTogglingOff() { return true; },
});
