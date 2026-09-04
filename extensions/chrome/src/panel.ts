import { createInspectionWorker } from "@opace/content-integrity-browser";
import {
  CYCLE5_CACHE_NAME,
  CYCLE5_MODEL_BASE,
  CYCLE5_MODEL_DOWNLOAD_LABEL,
  CYCLE5_MODEL_FILE,
  CYCLE5_MODEL_SHA256,
  composeCycle5BrowserCheckerResult,
  composeCycle5ServerCheckerResult,
  createCycle5BrowserRuntime,
  type CheckerResult,
} from "@opace/content-integrity-cycle5-browser";
import { buildReceipt, prefixedSha256, previewSafeFixes, validateCandidate } from "@opace/content-integrity-core";
import type { AnalysisResult, IntegrityReceipt, ProtectedSpan } from "@opace/content-integrity-contracts";
import {
  adaptLegacyAnalysisResult,
  escapeResultHtml,
  mount,
  type MountedCheckerResult,
} from "../../../shared/presentation/checker-result-presentation.mjs";
import { buildCheckerReportHtml } from "../../../shared/report/checker-report-html.mjs";
import {
  buildCheckerPdf,
  buildProvenanceExport,
  buildProvenancePdf,
  checkerPdfFilename,
  provenancePdfFilename,
} from "../../../shared/report/checker-pdf.mjs";
import { logoJpegBytes } from "../../../shared/report/logo.mjs";
import { buildContentFreeCheckerReceipt, buildShareSummary } from "./checker-exports.js";
import { requestChromeServicePermission, requestChromeServerScore, CHROME_SERVICE_PERMISSION } from "./eu-service.js";
import { createProvenanceInspector, MAX_PROVENANCE_BYTES, type C2paFileResult } from "./provenance.js";
import { clearAllExtensionData, loadEuAllowance, loadSettings, noteEuRequest, saveSettings } from "../../shared/storage.js";
import { EU_ALLOWANCE, euAllowanceNotice, evaluateEuAllowance } from "../../shared/eu-allowance.mjs";
import { MAX_TEXT_LENGTH, sourceLabel, validateCapture, type CapturePayload } from "../../shared/types.js";

/** Replaced at build time only when a local model mirror is requested for testing. */
declare const __OACI_MODEL_BASE__: string;
const modelBase = typeof __OACI_MODEL_BASE__ === "string" && __OACI_MODEL_BASE__ ? __OACI_MODEL_BASE__ : CYCLE5_MODEL_BASE;
const modelBaseIsShipped = modelBase === CYCLE5_MODEL_BASE;

const app = document.querySelector<HTMLElement>("#app")!;
const live = document.querySelector<HTMLElement>("#live")!;
const steps = ["Capture", "Inspect", "Protect", "Improve", "Compare", "Export"] as const;
const escapeHtml = escapeResultHtml;

type Route = "cycle5" | "eu-server" | "deterministic";
type CaptureMode = "article" | "selection" | "paste";
type PageCaptureMode = Exclude<CaptureMode, "paste">;
interface PageAccessRequest { tabId: number; mode: PageCaptureMode; origin: string; host: string }

let capture: CapturePayload | null = null;
let result: AnalysisResult | null = null;
let checkerResult: CheckerResult | null = null;
let mounted: MountedCheckerResult | null = null;
let route: Route = "cycle5";
let captureMode: CaptureMode = "paste";
let notice: { tone: "attention" | "error" | "good"; title: string; body: string } | null = null;
let candidate = "";
let receipt: IntegrityReceipt | null = null;
let abortController: AbortController | null = null;
let provenanceResult: C2paFileResult | null = null;
let provenanceFile: { size: number } | null = null;
let provenanceNotice = "";
let euRemaining = "";
let modelCached = false;
let pageAccess: PageAccessRequest | null = null;
let persistOffer: PageAccessRequest | null = null;

const modelRuntime = createCycle5BrowserRuntime({
  modelBaseUrl: modelBase,
  allowedModelBaseUrls: [...new Set([CYCLE5_MODEL_BASE, modelBase])],
  wasmUrl: chrome.runtime.getURL("runtime/ort-wasm-simd-threaded.wasm"),
});
const provenanceInspector = createProvenanceInspector();
const logoUrl = chrome.runtime.getURL("assets/icon-128.png");
const SURFACE = "Chrome extension";

const announce = (message: string): void => {
  live.textContent = "";
  requestAnimationFrame(() => { live.textContent = message; });
};

const rail = (active: number): string => `<nav class="rail" aria-label="Where you are"><ol>${steps
  .map((step, index) => `<li ${index === active ? 'aria-current="step"' : index < active ? 'data-state="done"' : ""}><span>${step}</span></li>`)
  .join("")}</ol></nav>`;

const shell = (active: number, body: string): void => {
  mounted?.destroy();
  mounted = null;
  app.innerHTML = `${rail(active)}<main tabindex="-1"><div class="sheet">${body}</div></main>`;
  app.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
};

const noticeHtml = (): string => notice
  ? `<div class="notice ${notice.tone}" role="status">${noticeGlyph(notice.tone)}<b>${escapeHtml(notice.title)}</b><p>${escapeHtml(notice.body)}</p></div>`
  : "";

/* Chrome's per-site prompt is never sprung on the reader. The panel says what
   is about to be asked, for which one site, and how to take it back, and the
   prompt itself only appears if they press the button. */
const pageAccessHtml = (request: PageAccessRequest | null): string => request
  ? `<div class="notice attention" role="status">${noticeGlyph("attention")}
      <b>Chrome will ask about ${escapeHtml(request.host)}</b>
      <p>Chrome will ask once to let this extension read text on ${escapeHtml(request.host)}. Allowing it covers that one site and no other, it is used only when you press This page or Selection, and you can take it back at any time from chrome://extensions. Nothing has been read yet.</p>
      <div class="actions"><button type="button" class="primary" id="grant-access">Ask Chrome about ${escapeHtml(request.host)}</button><button type="button" id="skip-access">Paste the text instead</button></div>
    </div>`
  : "";

const persistOfferHtml = (request: PageAccessRequest | null): string => request
  ? `<div class="notice" role="status">${noticeGlyph()}
      <b>Keep this working on ${escapeHtml(request.host)}?</b>
      <p>Chrome's access to that page lasts until you move to another one. Chrome can ask once to let this extension read text on ${escapeHtml(request.host)} for as long as you want it to, so This page keeps working as you move around that site. It covers that one site and no other, and you can take it back at any time from chrome://extensions.</p>
      <div class="actions"><button type="button" id="persist-access">Ask Chrome about ${escapeHtml(request.host)}</button><button type="button" id="dismiss-persist">Not now</button></div>
    </div>`
  : "";

const saveFile = (bytes: BlobPart, name: string, type: string, spoken: string): void => {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  announce(spoken);
};

const preview = (text: string): string => escapeHtml(text.slice(0, 1_200)) + (text.length > 1_200 ? "…" : "");

const icon = (name: CaptureMode): string => {
  const paths: Record<CaptureMode, string> = {
    article: '<path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    selection: '<path d="M4 6V4h4M20 6V4h-4M4 18v2h4M20 18v2h-4"/><path d="M8 10h8M8 14h5"/>',
    paste: '<path d="M9 4h6v3H9z"/><path d="M7 6H5v14h14V6h-2"/><path d="M9 12h6M9 16h4"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

/* Line-art glyphs, inline in the markup rather than fetched or encoded into a
   stylesheet: an SVG data URI has to carry the SVG namespace, and no shipped
   file may contain a URL. Each one inherits `currentColor` and is hidden from
   assistive technology, because the words beside it already say the same thing. */
const GLYPHS = {
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11.2v5M12 7.9h.01"/>',
  alert: '<path d="M12 3.6 2.3 20.4h19.4z"/><path d="M12 10v4.2M12 17.6h.01"/>',
  stop: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  tick: '<circle cx="12" cy="12" r="9"/><path d="m8 12.4 2.6 2.6L16.2 9.4"/>',
  download: '<path d="M12 3.2v11.4M7.4 10.2 12 14.8l4.6-4.6"/><path d="M4 19.4h16"/>',
  lock: '<rect x="4.6" y="10.2" width="14.8" height="9.6" rx="2.4"/><path d="M8.2 10.2V7.4a3.8 3.8 0 0 1 7.6 0v2.8"/>',
  file: '<path d="M13.4 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.6z"/><path d="M13.4 3v5.6H19"/>',
} as const;

type Glyph = keyof typeof GLYPHS;

const glyph = (name: Glyph): string =>
  `<svg class="glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[name]}</svg>`;

const NOTICE_GLYPH: Readonly<Record<string, Glyph>> = Object.freeze({ "": "info", attention: "alert", error: "stop", good: "tick" });

const noticeGlyph = (tone = ""): string => glyph(NOTICE_GLYPH[tone] ?? "info");

/* ------------------------------------------------------- reading a live page */

/* No standing host permission is declared. Reading the open page uses the
   activeTab grant the toolbar click or the context menu carries; when that
   grant is absent or has lapsed, the user is offered Chrome's own per-site
   prompt for the one origin in front of them and nothing wider. */

const READABLE_SCHEMES = new Set(["http:", "https:"]);
const CLOSED_HOSTS = new Set(["chromewebstore.google.com", "chrome.google.com"]);
const PERMISSION_REFUSAL = /cannot access contents|must request permission|permission to access|host permission/iu;

/** Why this page can never be read, or null when it is worth trying. */
const pageBlockReason = (rawUrl: string): string | null => {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return "Chrome did not report an address for that tab. Open an ordinary web page, or paste the text instead."; }
  if (!READABLE_SCHEMES.has(url.protocol)) {
    return `Chrome keeps ${url.protocol}// pages closed to every extension, so there is nothing here for this one to read. Open an ordinary web page, or paste the text instead.`;
  }
  if (CLOSED_HOSTS.has(url.hostname)) return "Chrome does not let any extension read the Chrome Web Store. Paste the text instead.";
  if (/\.pdf$/iu.test(url.pathname)) return "Chrome's built-in PDF viewer does not hand its text to extensions. Copy the text out of the PDF and paste it here instead.";
  return null;
};

/** The capture the injected reader sends back, or null if it never answered. */
const nextCapturePayload = (timeoutMs = 5_000): Promise<CapturePayload | null> => new Promise((resolve) => {
  let timer = 0;
  const listener = (message: unknown): undefined => {
    if ((message as { type?: string } | null)?.type !== "CAPTURE_READY") return undefined;
    clearTimeout(timer);
    chrome.runtime.onMessage.removeListener(listener);
    resolve((message as { payload: CapturePayload }).payload);
    return undefined;
  };
  chrome.runtime.onMessage.addListener(listener);
  timer = setTimeout(() => {
    chrome.runtime.onMessage.removeListener(listener);
    resolve(null);
  }, timeoutMs) as unknown as number;
});

const injectReader = async (tabId: number, mode: PageCaptureMode): Promise<CapturePayload | null> => {
  const answer = nextCapturePayload();
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [mode === "selection" ? "content/extract-selection.js" : "content/extract-article.js"],
  });
  const payload = await answer;
  await chrome.runtime.sendMessage({ type: "CLEAR_PENDING" }).catch(() => undefined);
  return payload;
};

const emptyCaptureNotice = (host: string, mode: PageCaptureMode): void => {
  notice = mode === "selection"
    ? { tone: "attention", title: "Nothing was selected", body: `Nothing is highlighted on ${host}. Select at least one sentence and try again, or choose This page.` }
    : { tone: "attention", title: "That page returned no text", body: `The reader ran on ${host} and found no visible article text. The page may still be loading, or its text may be drawn in a way an extension cannot read. Reload it and try again, or paste the text instead.` };
};

/* Chrome's one-time grant dies the moment the tab navigates, which is why
   "This page" worked once and then stopped. The moment a capture succeeds the
   host is known, so this is the one point at which a lasting per-site
   permission can honestly be offered by name. */
const offerToRemember = async (request: PageAccessRequest): Promise<void> => {
  const held = await chrome.permissions.contains({ origins: [request.origin] }).catch(() => true);
  persistOffer = held ? null : request;
};

/** Runs the reader and turns whatever comes back into a screen the user can act on. */
const readPage = async (request: PageAccessRequest): Promise<boolean> => {
  const payload = await injectReader(request.tabId, request.mode);
  if (payload && payload.text.trim()) {
    capture = payload;
    await offerToRemember(request);
    return true;
  }
  if (payload) {
    emptyCaptureNotice(request.host, request.mode);
    return true;
  }
  notice = { tone: "attention", title: "Nothing came back", body: `Chrome started the reader on ${request.host} but nothing came back within five seconds. Reload the page and try again, or paste the text instead.` };
  return true;
};

/* ------------------------------------------------------------------ capture */

const refreshEuAllowance = async (): Promise<void> => {
  const decision = evaluateEuAllowance(await loadEuAllowance(), Date.now());
  euRemaining = decision.allowed
    ? `You have ${decision.remainingMinute} of ${EU_ALLOWANCE.perMinute} checks left this minute and ${decision.remainingHour} of ${EU_ALLOWANCE.perHour} this hour on this installation.`
    : "This installation has used its EU checks for now. The full check on this device has no limit.";
};

/* Is the consented model already in this browser's cache? The runtime verifies
   the bytes before it loads them; this is the cheap presence check that decides
   what the button should promise, so it never claims a download that is not
   about to happen. */
const refreshModelCached = async (): Promise<void> => {
  try {
    if (typeof caches === "undefined" || !(await caches.keys()).includes(CYCLE5_CACHE_NAME)) { modelCached = false; return; }
    const cache = await caches.open(CYCLE5_CACHE_NAME);
    modelCached = Boolean(await cache.match(new URL(CYCLE5_MODEL_FILE, modelBase).href));
  } catch {
    modelCached = false;
  }
};

/* The button is the consent. Pressing it when the model is not here yet is the
   choice to fetch it, so the button has to say so. */
const primaryLabel = (selected: Route): string => (selected === "cycle5" && !modelCached ? "Download model and check" : "Check this text");
const downloadMeta = (): string => `${CYCLE5_MODEL_DOWNLOAD_LABEL} · SHA-256 ${CYCLE5_MODEL_SHA256.slice(0, 8)}…`;

const modelDownloadNote = (): string => (modelCached
  ? `<b>The model is already on this device</b>${escapeHtml(CYCLE5_MODEL_DOWNLOAD_LABEL)} of model weights and a word list are cached in this browser, so nothing is fetched again. They are removed in one click with <b>Clear everything stored</b>. Your draft is not uploaded.`
  : `<b>Pressing the button downloads the model</b>${escapeHtml(CYCLE5_MODEL_DOWNLOAD_LABEL)} of model weights and a word list come from opace.agency. These are data files, not a program: the software that reads them is already inside the extension and nothing new is executed. Their exact size and SHA-256 fingerprint (starting ${escapeHtml(CYCLE5_MODEL_SHA256.slice(0, 8))}) are checked before anything is loaded, they are kept in this browser's cache, and they are removed in one click with <b>Clear everything stored</b>. Your draft is not uploaded.`);

const renderCapture = (): void => {
  /* The permission offer belongs to the screen that raised it and to no later
     one, so it is taken off the module state as it is drawn. */
  const accessRequest = pageAccess;
  const rememberRequest = persistOffer;
  pageAccess = null;
  persistOffer = null;
  const isPaste = capture?.kind === "paste" || !capture;
  const text = capture?.text ?? "";
  const editable = isPaste;
  const displayText = !editable && text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const limitation = capture?.limitations[0] ?? "";
  captureMode = capture?.kind === "article" ? "article" : capture?.kind === "selection" ? "selection" : "paste";
  shell(0, `<p class="eyebrow">Step 1 of 6</p><h1>Choose the text to check</h1>
    <p class="lede">Nothing runs until you say so, and nothing leaves this browser unless you pick the server route.</p>
    ${noticeHtml()}
    ${pageAccessHtml(accessRequest)}
    ${persistOfferHtml(rememberRequest)}
    ${limitation ? `<div class="notice ${text.trim() ? "" : "attention"}" role="status">${noticeGlyph(text.trim() ? "" : "attention")}<b>${text.trim() ? "One thing about this capture" : "We could not read that page"}</b><p>${escapeHtml(limitation)}</p></div>` : ""}
    <section class="card">
      <div class="tabs" role="tablist" aria-label="Where the text comes from">
        <button type="button" role="tab" data-mode="article" aria-selected="${captureMode === "article"}">${icon("article")}<b>This page</b><small>Visible article text</small></button>
        <button type="button" role="tab" data-mode="selection" aria-selected="${captureMode === "selection"}">${icon("selection")}<b>Selection</b><small>Only what you highlight</small></button>
        <button type="button" role="tab" data-mode="paste" aria-selected="${captureMode === "paste"}">${icon("paste")}<b>Paste</b><small>No page access</small></button>
      </div>
      <label for="source">${escapeHtml(capture && !isPaste ? sourceLabel(capture) : "Paste or edit the text")}</label>
      <textarea id="source" ${editable ? "" : "readonly"} maxlength="250001" aria-describedby="count privacy">${escapeHtml(displayText)}</textarea>
      <p class="meta"><span id="count">${text.length.toLocaleString("en-GB")} of ${MAX_TEXT_LENGTH.toLocaleString("en-GB")} characters</span><span id="privacy">Held in memory only</span></p>
      <div id="capture-error" class="notice error" role="alert" tabindex="-1" hidden></div>
    </section>
    <section class="card">
      <fieldset class="routes"><legend>How would you like it checked?</legend>
        <label class="route" data-tone="good"><input type="radio" name="checker-route" value="cycle5" ${route === "cycle5" ? "checked" : ""}><span class="route-head"><b>On this device</b><em data-tone="good">Recommended</em></span><span class="route-body">The full Opace model runs here in your browser. Your draft stays here and is not sent for scoring. There is no limit on how often you can use it, and no queue to wait in. Up to ${MAX_TEXT_LENGTH.toLocaleString("en-GB")} characters a check.</span></label>
        <label class="route" data-tone="held"><input type="radio" name="checker-route" value="eu-server" ${route === "eu-server" ? "checked" : ""}><span class="route-head"><b>Private EU analysis</b><em data-tone="held">Not available yet</em></span><span class="route-body">Your text goes once to Opace's server in Belgium, scored in memory, kept nowhere. Chrome asks permission for that address first. The shared server is paced: ${MAX_TEXT_LENGTH.toLocaleString("en-GB")} characters a check, ${EU_ALLOWANCE.perMinute} checks a minute and ${EU_ALLOWANCE.perHour} an hour from this installation, within ${EU_ALLOWANCE.serviceDailySegmentInferences.toLocaleString("en-GB")} section readings a day service-wide. It replies only to this extension, after a small piece of work from your browser, so automated traffic stays out. Not switched on yet, and it says so plainly.</span></label>
        <label class="route" data-tone="plain"><input type="radio" name="checker-route" value="deterministic" ${route === "deterministic" ? "checked" : ""}><span class="route-head"><b>Quick checks only</b><em data-tone="plain">No AI reading</em></span><span class="route-body">Hidden characters and writing suggestions, with no trained model. The AI reading stays Not assessed. No limit and no network.</span></label>
      </fieldset>
      <div class="consent note" data-consent="cycle5">${glyph(modelCached ? "tick" : "download")}<span>${modelDownloadNote()}</span></div>
      <label class="consent" data-consent="eu-server" hidden><input id="server-consent" type="checkbox"><span><b>Send this text to the EU server once</b>It is scored in memory in Belgium and discarded straight afterwards. Chrome will ask you to allow the exact address ${escapeHtml(CHROME_SERVICE_PERMISSION)} before anything is sent. <span data-eu-remaining>${escapeHtml(euRemaining)}</span></span></label>
      ${modelBaseIsShipped ? "" : `<div class="notice attention" role="status">${noticeGlyph("attention")}<b>Test build</b><p>Model files are being read from a local mirror instead of the shipped Opace address. This build is for testing only.</p></div>`}
      <div class="actions"><button type="button" class="primary" id="inspect">${escapeHtml(primaryLabel(route))}</button><span class="beside" id="download-meta" ${route === "cycle5" && !modelCached ? "" : "hidden"}>${escapeHtml(downloadMeta())}</span><button type="button" id="clear-capture">Start again</button></div>
    </section>`);
  notice = null;
  const input = app.querySelector<HTMLTextAreaElement>("#source")!;
  const count = app.querySelector<HTMLElement>("#count")!;
  const errorBox = app.querySelector<HTMLElement>("#capture-error")!;
  /* The selected route tile is marked with an attribute rather than styled from
     `:has(input:checked)`. Chrome does not always re-evaluate that selector for
     the radio a sibling has just turned off, which left the old tile looking
     chosen. This runs on every change and on the first paint, so exactly one
     tile ever carries the mark. */
  const markSelectedRoute = (): void => {
    for (const control of app.querySelectorAll<HTMLInputElement>('input[name="checker-route"]')) {
      const tile = control.closest(".route");
      if (tile instanceof HTMLElement) tile.toggleAttribute("data-selected", control.checked);
    }
  };
  const updateRouteControls = (): void => {
    markSelectedRoute();
    const selected = (app.querySelector<HTMLInputElement>('input[name="checker-route"]:checked')?.value ?? "cycle5") as Route;
    for (const control of app.querySelectorAll<HTMLElement>("[data-consent]")) control.hidden = control.dataset.consent !== selected;
    const primary = app.querySelector<HTMLButtonElement>("#inspect");
    if (primary) primary.textContent = primaryLabel(selected);
    const meta = app.querySelector<HTMLElement>("#download-meta");
    if (meta) meta.hidden = !(selected === "cycle5" && !modelCached);
  };
  const clearValidationError = (): void => {
    input.removeAttribute("aria-invalid");
    input.setAttribute("aria-describedby", "count privacy");
    errorBox.hidden = true;
    errorBox.textContent = "";
  };
  /* A refusal always leaves a way forward on the same card: the on-device route
     has no pace and sends nothing, so it is one button press away. */
  const fail = (message: string, wayOut = false): void => {
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", "count privacy capture-error");
    errorBox.hidden = false;
    errorBox.innerHTML = `${noticeGlyph("error")}<b>Nothing has run</b><p>${escapeHtml(message)}</p>${wayOut ? '<div class="actions"><button type="button" class="primary" id="switch-on-device">Run on this device instead</button></div>' : ""}`;
    errorBox.querySelector("#switch-on-device")?.addEventListener("click", () => {
      const onDevice = app.querySelector<HTMLInputElement>('input[name="checker-route"][value="cycle5"]');
      if (!onDevice) return;
      onDevice.checked = true;
      route = "cycle5";
      updateRouteControls();
      clearValidationError();
      announce("The on-device route is selected. Nothing has been sent.");
      app.querySelector<HTMLButtonElement>("#inspect")?.focus();
    });
    errorBox.focus();
  };
  input.addEventListener("input", () => {
    count.textContent = `${input.value.length.toLocaleString("en-GB")} of ${MAX_TEXT_LENGTH.toLocaleString("en-GB")} characters`;
    clearValidationError();
  });
  for (const tab of app.querySelectorAll<HTMLButtonElement>(".tabs button")) {
    tab.addEventListener("click", () => void startCapture(tab.dataset.mode as CaptureMode));
  }
  for (const control of app.querySelectorAll<HTMLInputElement>('input[name="checker-route"]')) {
    control.addEventListener("change", () => {
      updateRouteControls();
      if (control.value === "eu-server" && control.checked) {
        void refreshEuAllowance().then(() => {
          const target = app.querySelector<HTMLElement>('[data-consent="eu-server"] span');
          const line = target?.querySelector("[data-eu-remaining]");
          if (line) line.textContent = euRemaining;
        });
      }
    });
  }
  app.querySelector("#grant-access")?.addEventListener("click", () => {
    if (accessRequest) void grantAndRead(accessRequest);
  });
  app.querySelector("#skip-access")?.addEventListener("click", () => void startCapture("paste"));
  app.querySelector("#persist-access")?.addEventListener("click", () => {
    if (rememberRequest) void rememberPage(rememberRequest);
  });
  app.querySelector("#dismiss-persist")?.addEventListener("click", () => {
    const target = app.querySelector<HTMLElement>("#persist-access")?.closest(".notice");
    if (target instanceof HTMLElement) target.hidden = true;
    announce("The offer was dismissed. Nothing changed.");
  });
  app.querySelector("#clear-capture")?.addEventListener("click", () => {
    capture = { kind: "paste", text: "", host: "", title: "Pasted text", limitations: [] };
    result = null;
    checkerResult = null;
    renderCapture();
  });
  app.querySelector("#inspect")?.addEventListener("click", () => {
    const selected = app.querySelector<HTMLInputElement>('input[name="checker-route"]:checked')?.value;
    route = selected === "deterministic" ? "deterministic" : selected === "eu-server" ? "eu-server" : "cycle5";
    if (route === "eu-server" && !(app.querySelector<HTMLInputElement>("#server-consent")?.checked ?? false)) {
      fail("Tick the box to send this text to the EU server, or choose one of the on-device options.");
      return;
    }
    capture = { ...(capture ?? { kind: "paste", host: "", title: "Pasted text", limitations: [] }), text: input.readOnly ? text : input.value };
    const error = validateCapture(capture);
    if (error) { fail(error); return; }
    clearValidationError();
    if (route === "eu-server") {
      void loadEuAllowance().then((state) => {
        const decision = evaluateEuAllowance(state, Date.now());
        if (!decision.allowed) {
          const { title, body } = euAllowanceNotice(decision);
          fail(`${title}. ${body}`, true);
          return undefined;
        }
        return requestChromeServicePermission()
          .then(async (granted) => {
            if (!granted) {
              fail("Chrome did not allow the Opace EU address. Nothing was sent — the on-device check is still available.", true);
              return undefined;
            }
            await noteEuRequest();
            return inspectCapture();
          });
      }).catch(() => fail("Chrome could not ask for the Opace EU address. Nothing was sent — the on-device check is still available.", true));
      return;
    }
    void inspectCapture();
  });
  updateRouteControls();
};

const startCapture = async (mode: CaptureMode): Promise<void> => {
  notice = null;
  pageAccess = null;
  if (mode === "paste") {
    capture = { kind: "paste", text: capture?.kind === "paste" ? capture.text : "", host: "", title: "Pasted text", limitations: [] };
    renderCapture();
    app.querySelector<HTMLTextAreaElement>("#source")?.focus();
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (typeof tab?.id !== "number") {
    notice = { tone: "attention", title: "No page is open", body: "Open a page in this window, or paste the text instead." };
    renderCapture();
    return;
  }
  const address = tab.url ?? "";
  if (!address) {
    /* Chrome hides a tab's address from an extension that has no access to it.
       The toolbar click is what hands that access over, so that is what to say
       rather than guessing at a site to ask about. */
    notice = {
      tone: "attention",
      title: "Chrome has not said which page is open",
      body: "Chrome will not name the open page until this extension has access to it. Click the extension's icon on that tab, which gives it one-time access to that page, then choose This page again. Or paste the text instead.",
    };
    renderCapture();
    return;
  }
  const blocked = pageBlockReason(address);
  if (blocked) {
    notice = { tone: "attention", title: "This page cannot be read", body: blocked };
    renderCapture();
    return;
  }
  const url = new URL(address);
  /* A Chrome match pattern names a scheme and a host and never a port, so a
     port in the address is dropped rather than smuggled into the request. */
  const request: PageAccessRequest = { tabId: tab.id, mode, origin: `${url.protocol}//${url.hostname}/*`, host: url.hostname };
  try {
    await readPage(request);
    renderCapture();
    return;
  } catch (error) {
    if (!PERMISSION_REFUSAL.test(String((error as Error)?.message ?? ""))) {
      notice = { tone: "attention", title: "We could not read that page", body: `${(error as Error).message} Paste the text instead.` };
      renderCapture();
      return;
    }
  }
  /* Chrome refused for want of access. If the origin is already allowed the
     refusal is something else, and saying so is more use than asking again. */
  const allowed = await chrome.permissions.contains({ origins: [request.origin] }).catch(() => false);
  if (allowed) {
    notice = { tone: "attention", title: "We could not read that page", body: `Chrome already allows ${request.host}, and it still would not run the reader there. Reload the page and try again, or paste the text instead.` };
    renderCapture();
    return;
  }
  pageAccess = request;
  renderCapture();
};

/** The lasting per-site grant, offered after a capture that already worked. */
const rememberPage = async (request: PageAccessRequest): Promise<void> => {
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [request.origin] });
  } catch (error) {
    notice = { tone: "attention", title: "Chrome could not ask", body: `${(error as Error).message} Nothing changed, and the text you captured is still here.` };
    renderCapture();
    return;
  }
  notice = granted
    ? { tone: "good", title: `${request.host} is allowed`, body: `This page and Selection will keep working on ${request.host} without Chrome asking again. Take it back at any time from chrome://extensions.` }
    : { tone: "attention", title: "Nothing changed", body: `Chrome did not allow ${request.host}. The text you captured is still here, and This page still works one page at a time after you click the extension's icon.` };
  renderCapture();
};

const grantAndRead = async (request: PageAccessRequest): Promise<void> => {
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: [request.origin] });
  } catch (error) {
    pageAccess = null;
    notice = { tone: "attention", title: "Chrome could not ask", body: `${(error as Error).message} Nothing was read. Paste the text instead.` };
    renderCapture();
    return;
  }
  pageAccess = null;
  if (!granted) {
    notice = {
      tone: "attention",
      title: "Permission was not given",
      body: `Chrome did not allow reading ${request.host}, so nothing was read and nothing was kept. Paste the text instead, or allow that one site later from chrome://extensions.`,
    };
    renderCapture();
    return;
  }
  try {
    await readPage(request);
  } catch (error) {
    notice = { tone: "attention", title: "We could not read that page", body: `${(error as Error).message} Paste the text instead.` };
  }
  renderCapture();
};

/* ------------------------------------------------------------------ inspect */

const routeStrapline = (): string => route === "eu-server"
  ? "Private EU analysis · sent once, kept nowhere"
  : route === "cycle5"
    ? "On this device · only model files are fetched"
    : "On this device · nothing is fetched";

const friendlyModelFailure = (code: string, reason: string): { title: string; body: string } => {
  switch (code) {
    case "too_short":
      return { title: "That is too short to score", body: "The model needs a few paragraphs to read a pattern. Add more text, or read the quick checks below." };
    case "too_long":
      return { title: "That is longer than we can score", body: reason };
    case "offline":
      return { title: "You appear to be offline", body: "The model files could not be fetched. Reconnect and try again — nothing was sent anywhere." };
    case "integrity_error":
      return { title: "The model files did not match", body: "The downloaded files failed their fingerprint check, so nothing was loaded. Clear the saved model in Export and try again." };
    case "consent_required":
      return { title: "The download did not go ahead", body: "Go back, choose On this device and press Download model and check, or choose quick checks only." };
    case "cancelled":
      return { title: "Check cancelled", body: "Nothing was kept." };
    default:
      return { title: "The model did not run", body: `${reason} The quick checks below still ran, and the AI reading stays Not assessed.` };
  }
};

const inspectCapture = async (): Promise<void> => {
  if (!capture) return;
  abortController?.abort();
  abortController = new AbortController();
  shell(1, `<p class="eyebrow">${escapeHtml(routeStrapline())}</p><h1>Reading your text</h1>
    <p class="lede">You can stop at any point. Nothing is kept unless a reading finishes.</p>
    <section class="card"><div class="progress" aria-hidden="true"><i></i></div><p class="phase" id="phase" role="status">Checking what you gave us…</p>
    <div class="actions"><button type="button" id="cancel">Stop and keep nothing</button></div></section>`);
  const phaseText = (message: string): void => {
    const target = app.querySelector<HTMLElement>("#phase");
    if (target) target.textContent = message;
  };
  app.querySelector("#cancel")?.addEventListener("click", () => abortController?.abort());
  const worker = createInspectionWorker({ workerUrl: new URL("./worker.js", import.meta.url) });
  try {
    checkerResult = null;
    notice = null;
    result = await worker.inspect({
      schema_version: "1.0",
      contract_version: "1.0.0",
      request_id: `ext_${Date.now()}`,
      created_at: new Date().toISOString(),
      source: { content: capture.text, content_type: "plain_text", language: "en-GB" },
      checks: ["unicode.invisible", "style.patterns", "watermark.anthropic"],
      privacy: { allowed_routes: ["browser"], save_receipt: false, retain_content: false },
      context: { caller: "chrome-extension", correlation_id: "private-session" },
    }, {
      signal: abortController.signal,
      onProgress: (phase) => phaseText(`${String(phase).replaceAll("_", " ")}…`),
    });
    const primitive = adaptLegacyAnalysisResult(result, { surface: SURFACE, characterCount: capture.text.length, maxCharacters: MAX_TEXT_LENGTH, refuseNotTruncate: true }) as CheckerResult;
    checkerResult = primitive;
    if (route === "cycle5") {
      try {
        phaseText("Looking for the model already saved here…");
        const cached = await modelRuntime.prepareFromCache(abortController.signal);
        if (!cached) {
          await modelRuntime.prepareWithConsent({
            consent: true,
            signal: abortController.signal,
            onProgress: (progress) => phaseText(`Downloading and checking file ${progress.fileIndex} of ${progress.fileCount} — ${(progress.receivedBytes / 1_000_000).toFixed(1)} of ${(progress.totalBytes / 1_000_000).toFixed(1)} MB`),
          });
        }
        await refreshModelCached();
        phaseText("Reading each section on this device…");
        const score = await modelRuntime.score(capture.text, {
          signal: abortController.signal,
          onSection: (done, total) => phaseText(`Reading section ${done} of ${total} on this device…`),
        });
        if (score.status === "scored") {
          checkerResult = composeCycle5BrowserCheckerResult(primitive, score, capture.text, {
            surface: SURFACE,
            resultId: `chrome_cycle5_${Date.now()}`,
            reportFormat: "pdf",
            maxCharacters: MAX_TEXT_LENGTH,
          });
        } else {
          notice = { tone: "attention", ...friendlyModelFailure(score.code, score.reason) };
        }
      } catch (error) {
        if ((error as Error).name === "AbortError" || abortController.signal.aborted) throw error;
        const code = (error as { code?: string }).code ?? "engine_error";
        notice = { tone: "attention", ...friendlyModelFailure(code, (error as Error).message) };
      }
    } else if (route === "eu-server") {
      try {
        const score = await requestChromeServerScore(capture.text, abortController.signal, phaseText);
        checkerResult = composeCycle5ServerCheckerResult(primitive, score, capture.text, {
          surface: SURFACE,
          resultId: `chrome_server_${Date.now()}`,
          reportFormat: "pdf",
          maxCharacters: MAX_TEXT_LENGTH,
          maxWords: 8_000,
        });
      } catch (error) {
        if ((error as Error).name === "AbortError" || abortController.signal.aborted) throw error;
        notice = {
          tone: "attention",
          title: "The EU service is not available yet",
          body: `${(error as Error).message} No text was kept. The full check on this device is still available, and the quick checks below already ran.`,
        };
      }
    }
    renderResults();
    announce("The check has finished. Your result is ready.");
  } catch (error) {
    if ((error as Error).name === "AbortError" || abortController.signal.aborted || (error as { code?: string }).code === "cancelled") {
      shell(1, `<p class="eyebrow">Stopped</p><h1>Check cancelled</h1>
        <section class="card"><p class="lede">Nothing was kept: no result, no copy of your text.</p>
        <div class="actions"><button type="button" class="primary" id="return">Back to the text</button></div></section>`);
      app.querySelector("#return")?.addEventListener("click", () => renderCapture());
      announce("Check cancelled.");
    } else {
      notice = { tone: "error", title: "The check stopped safely", body: (error as Error).message };
      renderCapture();
    }
  } finally {
    worker.dispose();
    abortController = null;
  }
};

const renderResults = (): void => {
  if (!result || !capture || !checkerResult) return;
  shell(1, `<p class="eyebrow">Evidence, not guarantees</p><h1>Your result</h1>
    ${noticeHtml()}
    <div id="result-slot"></div>`);
  notice = null;
  const slot = app.querySelector<HTMLElement>("#result-slot")!;
  mounted = mount(slot, checkerResult as never, {
    surface: SURFACE,
    logoDataUri: logoUrl,
    headingLevel: 2,
    actions: [
      { id: "protect", label: "Protect the facts", glyph: "🔒" },
      { id: "export", label: "Save or share", glyph: "⭳" },
      { id: "restart", label: "Check something else", glyph: "↺" },
    ],
    onAction: (actionId) => {
      if (actionId === "protect") renderProtect();
      else if (actionId === "export") void renderExport();
      else renderCapture();
    },
    onToggleSection: (sectionIndex, expanded) => {
      if (expanded) announce(`Section ${sectionIndex + 1} opened.`);
    },
  });
};

/* ------------------------------------------------------------------ protect */

const renderProtect = (): void => {
  if (!result) return;
  const spans = result.protected_spans as ProtectedSpan[];
  shell(2, `<p class="eyebrow">Step 3 of 6</p><h1>Facts we will not touch</h1>
    <p class="lede">Names, figures, dates, links, quotations, citations and code are locked before anything is suggested.</p>
    <section class="card">
      ${spans.length === 0
        ? `<div class="empty"><span class="ring">${glyph("lock")}</span><b>Nothing in this draft needed locking</b><p>No names, figures, dates, links, quotations, citations or code were found to protect, so nothing is held back from the suggestions.</p></div>`
        : `<p class="tally">${glyph("lock")}<span>${spans.length} ${spans.length === 1 ? "item is" : "items are"} locked.</span></p>
      <ul class="facts">${spans.slice(0, 12).map((span) => `<li><b>${escapeHtml(String(span.kind).replaceAll("_", " "))}</b><span>characters ${span.start_utf16}–${span.end_utf16}</span></li>`).join("")}</ul>
      ${spans.length > 12 ? `<p class="fine">${spans.length - 12} more are locked and not listed here.</p>` : ""}`}
    </section>
    <div class="actions"><button type="button" class="primary" id="improve">See suggested changes</button><button type="button" id="results">Back to the result</button></div>`);
  app.querySelector("#results")?.addEventListener("click", renderResults);
  app.querySelector("#improve")?.addEventListener("click", renderImprove);
};

const renderImprove = (): void => {
  if (!result || !capture) return;
  const unicodeEvidence = result.methods.flatMap((method) => method.evidence).filter((item: any) => item?.type === "unicode_finding");
  const selected = unicodeEvidence.filter((item: any) => item.fix !== "review").map((item: any) => item.id);
  const fix = previewSafeFixes(capture.text, unicodeEvidence as any, selected, result.protected_spans);
  candidate = fix.candidate;
  const changed = fix.applied_finding_ids.length > 0;
  shell(3, `<p class="eyebrow">Step 4 of 6</p><h1>${changed ? "A cleaned-up copy is ready" : "No automatic change to suggest"}</h1>
    <section class="card">
      <p class="lede">${changed
        ? `${fix.applied_finding_ids.length} character ${fix.applied_finding_ids.length === 1 ? "problem was" : "problems were"} tidied outside the locked facts. Your original is untouched — this is a copy for you to review.`
        : "The browser checks found nothing safe to change on their own. Your original text stays as the copyable version."}</p>
      <div class="notice">${noticeGlyph()}<b>Look-alike characters are never swapped for you</b><p>Homoglyph replacements always need your decision, so they are shown rather than applied.</p></div>
    </section>
    <div class="actions"><button type="button" class="primary" id="compare">Compare the two</button><button type="button" id="protect-back">Back</button></div>`);
  app.querySelector("#protect-back")?.addEventListener("click", renderProtect);
  app.querySelector("#compare")?.addEventListener("click", renderCompare);
};

const renderCompare = (): void => {
  if (!result || !capture) return;
  const gates = validateCandidate({ content: capture.text, content_hash: result.source.content_hash, content_type: "plain_text", language: "en-GB" }, candidate, result.protected_spans, { expected_source_hash: result.source.content_hash });
  const blocking = gates.filter((gate) => gate.hard && gate.status !== "pass" && gate.id !== "semantic_entailment");
  shell(4, `<p class="eyebrow">Step 5 of 6</p><h1>Compare before you copy</h1>
    <div class="rails">
      <section><h2>Your original</h2><pre>${preview(capture.text)}</pre></section>
      <section><h2>Suggested copy</h2><pre>${preview(candidate)}</pre></section>
    </div>
    <p class="gate ${blocking.length ? "fail" : "pass"}">${glyph(blocking.length ? "stop" : "tick")}<span><b>${blocking.length ? "Held back" : "Safe to copy"}</b> — ${gates.length} checks ran on the copy. Meaning-matching is not set up in the browser and is reported as such.</span></p>
    <div id="copy-fallback" hidden><label for="fallback">Your browser blocked the clipboard. Select all and copy:</label><textarea id="fallback" readonly>${escapeHtml(candidate)}</textarea></div>
    <div class="actions"><button type="button" class="primary" id="copy" ${blocking.length ? "disabled" : ""}>Copy the suggested text</button><button type="button" id="export">Save or share</button><button type="button" id="improve-back">Back</button></div>`);
  app.querySelector("#improve-back")?.addEventListener("click", renderImprove);
  app.querySelector("#copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(candidate);
      announce("Copied. The page you were on was not changed.");
    } catch {
      const fallback = app.querySelector<HTMLElement>("#copy-fallback")!;
      fallback.hidden = false;
      app.querySelector<HTMLTextAreaElement>("#fallback")?.focus();
      announce("The clipboard was blocked. A read-only copy box is ready.");
    }
  });
  app.querySelector("#export")?.addEventListener("click", () => void renderExport(gates));
};

/* ------------------------------------------------------------------- export */

const reportOptions = () => ({
  surfaceName: SURFACE,
  sourceText: capture?.text,
  generatedAt: checkerResult?.generated_at,
});

const renderExport = async (gates?: ReturnType<typeof validateCandidate>): Promise<void> => {
  if (!result || !capture) return;
  receipt = await buildReceipt({
    receipt_id: `ext_receipt_${Date.now()}`,
    product_version: "1.2.0",
    created_at: new Date().toISOString(),
    source: { content: capture.text, content_type: "plain_text", language: "en-GB", normalised_text: capture.text.normalize("NFC") },
    policy: { id: "extension-browser", version: "1.2.0", requested_checks: result.methods.map((method) => method.id), allowed_routes: ["browser"], retain_content: false },
    methods: result.methods,
    rewrite: candidate && candidate !== capture.text
      ? { source_hash: result.source.content_hash, candidate_hash: prefixedSha256(candidate), generator: { route: "browser", provider: "Opace deterministic core", model: "none", prompt_template: "safe-unicode-preview" }, gates: gates ?? [], selected_candidate: "candidate_1", candidate_content: candidate }
      : null,
    approval: { scope: "none" },
    limitations: ["This receipt holds hashes and check states only. It contains no web address and no text, and it does not prove human authorship."],
    contains_content: false,
  });
  const full = checkerResult?.profile === "full_checker";
  const shareable = Boolean(checkerResult?.exports.share.available);
  shell(5, `<p class="eyebrow">Step 6 of 6</p><h1>Save or share the evidence</h1>
    <p class="lede">Everything except the full report is content-free: hashes, check states and limits, never your words.</p>
    ${noticeHtml()}
    <section class="card">
      <h2>Files you can keep</h2>
      <div class="exports">
        <button type="button" class="primary" id="download-pdf" ${full ? "" : "disabled"}>Branded PDF report</button>
        <button type="button" id="download-html" ${full ? "" : "disabled"}>Complete HTML report</button>
        <button type="button" id="download-result-json" ${full ? "" : "disabled"}>Result receipt (JSON, content-free)</button>
        <button type="button" id="download-receipt">Check receipt (JSON, content-free)</button>
      </div>
      ${full ? '<p class="fine">The PDF and HTML reports include the passages that were scored, because that is the evidence. Everything else here is content-free.</p>' : '<p class="fine">Reports need a model reading. This run has quick checks only, so only the content-free check receipt is available.</p>'}
    </section>
    <section class="card">
      <h2>Share the reading, not the draft</h2>
      <p class="fine" style="margin-top:0">A one-line summary with the level, the score and the honesty line. No part of your text travels with it.</p>
      <div class="actions"><button type="button" id="copy-share" ${shareable ? "" : "disabled"}>Copy share summary</button></div>
      <div id="share-out" hidden><label for="share-text">Copy this summary:</label><textarea id="share-text" class="share-box" readonly></textarea></div>
    </section>
    <section class="card">
      <h2>Check a file's Content Credentials</h2>
      <p class="fine" style="margin-top:0">JPEG, PNG, WebP or PDF, up to ${Math.round(MAX_PROVENANCE_BYTES / (1024 * 1024))} MB. The file is read inside this extension and is not sent anywhere on this route, and no file name or file bytes appear in any export.</p>
      <div class="file-drop"><label for="prov-file">Choose a file to inspect</label><input id="prov-file" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"></div>
      <div id="prov-out">${renderProvenance()}</div>
    </section>
    <section class="card">
      <h2>Your data</h2>
      <p class="fine" style="margin-top:0">Your text and result live in this panel only. Settings are the only thing stored, receipt history is off, and clearing removes the saved model too.</p>
      <div class="actions"><button type="button" id="clear-data">Clear everything stored</button><button type="button" id="results-back">Back to the result</button></div>
      <div id="clear-result" role="status"></div>
    </section>`);
  notice = null;
  app.querySelector("#results-back")?.addEventListener("click", () => (checkerResult ? renderResults() : renderCapture()));
  app.querySelector("#download-receipt")?.addEventListener("click", () => {
    saveFile(`${JSON.stringify(receipt, null, 2)}\n`, `${receipt!.receipt_id}.json`, "application/json", "Content-free check receipt saved.");
  });
  app.querySelector("#download-result-json")?.addEventListener("click", () => {
    if (!checkerResult) return;
    saveFile(`${JSON.stringify(buildContentFreeCheckerReceipt(checkerResult), null, 2)}\n`, `${checkerResult.result_id}-receipt.json`, "application/json", "Content-free result receipt saved.");
  });
  app.querySelector("#download-html")?.addEventListener("click", () => {
    if (!checkerResult) return;
    const html = buildCheckerReportHtml(checkerResult as never, reportOptions() as never);
    saveFile(html, `${checkerResult.result_id}.html`, "text/html;charset=utf-8", "Complete HTML report saved.");
  });
  app.querySelector("#download-pdf")?.addEventListener("click", () => {
    if (!checkerResult || !capture) return;
    try {
      const bytes = buildCheckerPdf(checkerResult as never, { ...reportOptions(), fullText: capture.text, logoJpegBytes: logoJpegBytes() } as never);
      saveFile(bytes as BlobPart, checkerPdfFilename(checkerResult.generated_at), "application/pdf", "Branded PDF report saved.");
    } catch (error) {
      notice = { tone: "error", title: "The PDF could not be made", body: (error as Error).message };
      void renderExport(gates);
    }
  });
  app.querySelector("#copy-share")?.addEventListener("click", async () => {
    if (!checkerResult) return;
    const summary = buildShareSummary(checkerResult);
    const output = app.querySelector<HTMLElement>("#share-out")!;
    const box = app.querySelector<HTMLTextAreaElement>("#share-text")!;
    box.value = summary;
    output.hidden = false;
    try {
      await navigator.clipboard.writeText(summary);
      announce("Share summary copied. It carries no part of your text.");
    } catch {
      box.focus();
      box.select();
      announce("The clipboard was blocked. The summary is ready to copy by hand.");
    }
  });
  app.querySelector<HTMLInputElement>("#prov-file")?.addEventListener("change", (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void inspectFile(file);
  });
  app.querySelector("#clear-data")?.addEventListener("click", async () => {
    const [counts, clearedModelCache] = await Promise.all([clearAllExtensionData(), modelRuntime.clearCache()]);
    modelCached = false;
    const target = app.querySelector<HTMLElement>("#clear-result")!;
    target.innerHTML = `<div class="notice good">${noticeGlyph("good")}<b>Everything stored has been cleared</b><p>${escapeHtml(`Cleared ${counts.local} stored setting ${counts.local === 1 ? "group" : "groups"} and ${counts.session} session ${counts.session === 1 ? "marker" : "markers"}${clearedModelCache ? ", and removed the saved model files" : ""}. There was no text history to clear, and the EU route\u2019s pace record has been reset. Files you have already downloaded are still on your computer.`)}</p></div>`;
    announce("Stored data cleared.");
  });
  bindProvenanceActions();
};

const PROVENANCE_HEADLINE: Readonly<Record<C2paFileResult["status"], string>> = Object.freeze({
  present: "Content Credentials found",
  absent: "No Content Credentials",
  invalid: "Content Credentials did not check out",
  untrusted: "Signer not recognised",
  error: "The check could not finish",
  unsupported: "File type not supported",
});

function renderProvenance(): string {
  if (provenanceNotice) return `<div class="notice attention" role="status">${noticeGlyph("attention")}<b>Nothing was inspected</b><p>${escapeHtml(provenanceNotice)}</p></div>`;
  if (!provenanceResult) {
    return `<div class="empty"><span class="ring">${glyph("file")}</span><b>No file inspected yet</b><p>Choose a JPEG, PNG, WebP or PDF above. It is read here, and what comes back is shown in plain words rather than a verdict.</p></div>`;
  }
  const summary = provenanceResult.manifest_summary;
  const rows: Array<[string, string]> = [
    ["File type", provenanceResult.media_type],
    ["Size", `${(provenanceResult.file_size / 1024).toFixed(0)} KB`],
    ["Fingerprint", provenanceResult.file_hash],
  ];
  if (summary) {
    rows.push(["Made with", summary.claim_generator ?? "Not recorded"]);
    rows.push(["Signed by", summary.signer ?? "Not recorded"]);
    rows.push(["Signed on", summary.signed_on ?? "Not recorded"]);
    rows.push(["Recorded steps", `${summary.assertions_count} ${summary.assertions_count === 1 ? "entry" : "entries"}, ${summary.ingredients_count} ${summary.ingredients_count === 1 ? "ingredient" : "ingredients"}`]);
  }
  return `<div class="prov" role="status">
    <span class="chip" data-state="${escapeHtml(provenanceResult.status)}">${escapeHtml(PROVENANCE_HEADLINE[provenanceResult.status])}</span>
    <p>${escapeHtml(provenanceResult.reason)}</p>
    <dl>${rows.map(([term, value]) => `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
    ${provenanceResult.issues.length ? `<ul class="checks">${provenanceResult.issues.slice(0, 6).map((issue) => `<li class="check"><b>${escapeHtml(issue.code)}</b><span class="state" data-state="${issue.success === false ? "fail" : "pass"}">${issue.success === false ? "Problem" : "Note"}</span><p>${escapeHtml(issue.explanation ?? "No further explanation was recorded.")}</p></li>`).join("")}</ul>` : ""}
    <ul class="checks" aria-label="Limits of this file check">${provenanceResult.limitations.map((limitation) => `<li class="check"><p>${escapeHtml(limitation)}</p></li>`).join("")}</ul>
    <div class="exports"><button type="button" id="prov-pdf">Save file report (PDF)</button><button type="button" id="prov-json">Save file record (JSON)</button></div>
  </div>`;
}

const provenanceRecord = () => buildProvenanceExport(
  { size: provenanceFile?.size ?? provenanceResult!.file_size },
  provenanceResult as never,
  new Date().toISOString(),
);

const bindProvenanceActions = (): void => {
  app.querySelector("#prov-pdf")?.addEventListener("click", () => {
    if (!provenanceResult) return;
    const record = provenanceRecord();
    const bytes = buildProvenancePdf(record, { logoJpegBytes: logoJpegBytes() });
    saveFile(bytes as BlobPart, provenancePdfFilename(record.generated_at), "application/pdf", "Content-free file report saved.");
  });
  app.querySelector("#prov-json")?.addEventListener("click", () => {
    if (!provenanceResult) return;
    saveFile(`${JSON.stringify(provenanceRecord(), null, 2)}\n`, `opace-content-credentials-${provenanceResult.file_hash.slice(7, 19)}.json`, "application/json", "Content-free file record saved.");
  });
};

const inspectFile = async (file: File): Promise<void> => {
  const output = app.querySelector<HTMLElement>("#prov-out");
  if (!output) return;
  provenanceNotice = "";
  provenanceResult = null;
  provenanceFile = { size: file.size };
  output.innerHTML = `<div class="notice" role="status">${noticeGlyph()}<b>Reading the file here</b><p>The file stays inside this extension and is not sent anywhere on this route.</p></div>`;
  try {
    provenanceResult = await provenanceInspector.inspect(file);
  } catch (error) {
    provenanceNotice = (error as { code?: string }).code === "file_too_large"
      ? `That file is larger than ${Math.round(MAX_PROVENANCE_BYTES / (1024 * 1024))} MB. Choose a smaller one.`
      : `${(error as Error).message} No judgement was made about the file.`;
  }
  output.innerHTML = renderProvenance();
  bindProvenanceActions();
  announce(provenanceResult ? PROVENANCE_HEADLINE[provenanceResult.status] : "The file could not be inspected.");
};

/* --------------------------------------------------------------------- boot */

const initialise = async (): Promise<void> => {
  const settings = await loadSettings();
  document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
  await saveSettings(settings);
  await refreshEuAllowance();
  await refreshModelCached();
  const pending = await chrome.runtime.sendMessage({ type: "GET_PENDING" }).catch(() => undefined);
  if (pending?.capture) {
    capture = pending.capture as CapturePayload;
    renderCapture();
    return;
  }
  if (pending?.interrupted) {
    capture = { kind: "paste", text: "", host: "", title: "Interrupted", limitations: [] };
    notice = { tone: "attention", title: "That capture did not finish", body: "Chrome interrupted it. Nothing was kept — capture or paste the text again." };
    renderCapture();
    return;
  }
  capture = { kind: "paste", text: "", host: "", title: "Pasted text", limitations: [] };
  renderCapture();
};

void initialise();
