import { createInspectionWorker } from "@opace/content-integrity-browser";
import { buildReceipt, prefixedSha256, previewSafeFixes, validateCandidate } from "@opace/content-integrity-core";
import type { AnalysisResult, IntegrityReceipt, MethodResult, ProtectedSpan } from "@opace/content-integrity-contracts";
import { clearAllExtensionData, loadSettings, saveSettings } from "../../shared/storage.js";
import { MAX_TEXT_LENGTH, sourceLabel, validateCapture, type CapturePayload } from "../../shared/types.js";

const app = document.querySelector<HTMLElement>("#app")!;
const live = document.querySelector<HTMLElement>("#live")!;
const steps = ["Capture", "Inspect", "Protect", "Improve", "Compare", "Export"];
let capture: CapturePayload | null = null;
let result: AnalysisResult | null = null;
let candidate = "";
let receipt: IntegrityReceipt | null = null;
let abortController: AbortController | null = null;

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]!);
const announce = (message: string): void => { live.textContent = ""; requestAnimationFrame(() => { live.textContent = message; }); };
const stepNav = (active: number): string => `<nav aria-label="Inspection workflow"><ol class="steps">${steps.map((step, index) => `<li ${index === active ? 'aria-current="step"' : ""}>${index + 1}<span>${step}</span></li>`).join("")}</ol></nav>`;
const shell = (active: number, body: string): void => {
  app.innerHTML = `${stepNav(active)}<main tabindex="-1">${body}</main>`;
  app.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
};
const preview = (text: string): string => escapeHtml(text.slice(0, 1_200)) + (text.length > 1_200 ? "…" : "");

const renderCapture = (message = ""): void => {
  const isPaste = capture?.kind === "paste";
  const text = capture?.text ?? "";
  const editable = isPaste || !capture;
  const displayText = !editable && text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
  const limitation = capture?.limitations[0] ?? message;
  shell(0, `<section class="sheet"><p class="eyebrow">Local evidence desk</p><h1>Capture text</h1>
    <p class="lede">Review the exact scope before anything runs. Nothing has left this browser.</p>
    ${limitation ? `<div class="notice attention" role="status"><strong>Paste fallback</strong><p>${escapeHtml(limitation)}</p></div>` : ""}
    <label for="source">${isPaste || !capture ? "Paste text" : escapeHtml(sourceLabel(capture))}</label>
    <textarea id="source" ${editable ? "" : "readonly"} maxlength="250001" aria-describedby="count privacy">${escapeHtml(displayText)}</textarea>
    <div class="meta"><span id="count">${text.length.toLocaleString("en-GB")} / ${MAX_TEXT_LENGTH.toLocaleString("en-GB")} characters${displayText.length < text.length ? ` · preview shows the first ${MAX_TEXT_LENGTH.toLocaleString("en-GB")}` : ""}</span><span id="privacy">Text is held in memory only.</span></div>
    <div id="capture-error" class="notice error" role="alert" tabindex="-1" hidden></div>
    <div class="actions"><button class="primary" id="inspect">Inspect text</button><button id="clear-capture">Clear</button></div>
  </section>`);
  const input = app.querySelector<HTMLTextAreaElement>("#source")!;
  const count = app.querySelector<HTMLElement>("#count")!;
  const errorBox = app.querySelector<HTMLElement>("#capture-error")!;
  const clearValidationError = (): void => {
    input.removeAttribute("aria-invalid");
    input.setAttribute("aria-describedby", "count privacy");
    errorBox.hidden = true;
    errorBox.textContent = "";
  };
  input.addEventListener("input", () => {
    count.textContent = `${input.value.length.toLocaleString("en-GB")} / ${MAX_TEXT_LENGTH.toLocaleString("en-GB")} characters`;
    clearValidationError();
  });
  app.querySelector("#clear-capture")?.addEventListener("click", () => { capture = { kind: "paste", text: "", host: "", title: "Pasted text", limitations: [] }; renderCapture(); });
  app.querySelector("#inspect")?.addEventListener("click", () => {
    capture = { ...(capture ?? { kind: "paste", host: "", title: "Pasted text", limitations: [] }), text: input.readOnly ? text : input.value };
    const error = validateCapture(capture);
    if (error) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "count privacy capture-error");
      errorBox.hidden = false;
      errorBox.textContent = error;
      errorBox.focus();
      return;
    }
    clearValidationError();
    void inspectCapture();
  });
};

const inspectCapture = async (): Promise<void> => {
  if (!capture) return;
  abortController?.abort();
  abortController = new AbortController();
  shell(1, `<section class="sheet"><p class="eyebrow">Browser route · no network</p><h1>Inspecting text</h1><div class="progress" aria-hidden="true"><span></span></div><p id="phase">Validating source…</p><button id="cancel">Cancel inspection</button></section>`);
  app.querySelector("#cancel")?.addEventListener("click", () => abortController?.abort());
  const worker = createInspectionWorker({ workerUrl: new URL("./worker.js", import.meta.url) });
  try {
    result = await worker.inspect({
      schema_version: "1.0",
      contract_version: "1.0.0",
      request_id: `ext_${Date.now()}`,
      created_at: new Date().toISOString(),
      source: { content: capture.text, content_type: "plain_text", language: "en-GB" },
      checks: ["unicode.invisible", "style.patterns", "watermark.anthropic", "detector.local"],
      privacy: { allowed_routes: ["browser"], save_receipt: false, retain_content: false },
      context: { caller: "chrome-extension", correlation_id: "private-session" }
    }, {
      signal: abortController.signal,
      onProgress: phase => {
        const target = app.querySelector<HTMLElement>("#phase");
        if (target) target.textContent = phase.replaceAll("_", " ");
      }
    });
    renderResults();
    announce("Inspection complete. Results are ready.");
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      shell(1, `<section class="sheet"><p class="eyebrow">Interrupted</p><h1>Inspection cancelled</h1><p>No result or source was retained.</p><button id="return">Return to capture</button></section>`);
      app.querySelector("#return")?.addEventListener("click", () => renderCapture());
      announce("Inspection cancelled.");
    } else {
      renderCapture(`Inspection stopped safely: ${(error as Error).message}`);
    }
  } finally {
    worker.dispose();
    abortController = null;
  }
};

const statusLabel = (status: string): string => status.replaceAll("_", " ");
const renderResults = (): void => {
  if (!result || !capture) return;
  const rows = result.methods.map((method: MethodResult) => {
    const label = method.id === "watermark.anthropic" ? "Official verifier unavailable" : method.provider_or_method;
    return `<li class="method ${method.status}"><div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(method.id)}</span></div><b>${escapeHtml(statusLabel(method.status))}</b><p>${escapeHtml(method.limitations[0])}</p></li>`;
  }).join("");
  shell(1, `<section class="sheet"><p class="eyebrow">Evidence, not guarantees</p><h1>Inspection results</h1>
    <div class="summary"><div><b>${result.summary.attention}</b><span>Attention</span></div><div><b>${result.protected_spans.length}</b><span>Protected</span></div><div><b>${result.summary.unsupported}</b><span>Unavailable</span></div></div>
    <details open><summary>Named checks</summary><ul class="methods">${rows}</ul></details>
    <div class="notice neutral"><strong>Local signals</strong><p>Not configured. Browser inspection remains available without a model or provider.</p></div>
    <div class="actions"><button class="primary" id="protect">Protect facts</button><button id="back">Change source</button></div>
  </section>`);
  app.querySelector("#back")?.addEventListener("click", () => renderCapture());
  app.querySelector("#protect")?.addEventListener("click", renderProtect);
};

const renderProtect = (): void => {
  if (!result) return;
  const spans = result.protected_spans as ProtectedSpan[];
  shell(2, `<section class="sheet"><p class="eyebrow">Immutable evidence rail</p><h1>Protected content</h1><p>${spans.length} names, figures, dates, links, quotations, citations or code spans are locked before comparison.</p>
    <ul class="protected-list">${spans.slice(0, 12).map(span => `<li><strong>${escapeHtml(span.kind)}</strong><span>${span.start_utf16}–${span.end_utf16}</span></li>`).join("") || "<li>No protected spans were found.</li>"}</ul>
    <div class="actions"><button class="primary" id="improve">Prepare local candidate</button><button id="results">Back to results</button></div></section>`);
  app.querySelector("#results")?.addEventListener("click", renderResults);
  app.querySelector("#improve")?.addEventListener("click", renderImprove);
};

const renderImprove = (): void => {
  if (!result || !capture) return;
  const unicodeEvidence = result.methods.flatMap(method => method.evidence).filter((item: any) => item?.type === "unicode_finding");
  const selected = unicodeEvidence.filter((item: any) => item.fix !== "review").map((item: any) => item.id);
  const fix = previewSafeFixes(capture.text, unicodeEvidence as any, selected, result.protected_spans);
  candidate = fix.candidate;
  const changed = fix.applied_finding_ids.length > 0;
  shell(3, `<section class="sheet"><p class="eyebrow">Copy-only candidate</p><h1>${changed ? "Safe character treatment prepared" : "No automatic change proposed"}</h1>
    <p>${changed ? `${fix.applied_finding_ids.length} explainable character treatment(s) were applied outside protected spans.` : "Browser-only checks found no safe automatic edit. The original remains the copyable fallback."}</p>
    <div class="notice neutral"><strong>Local engine unavailable</strong><p>The frozen local API has no pairing-code exchange operation. Connection and rewrite controls are disabled rather than simulated.</p></div>
    <div class="actions"><button class="primary" id="compare">Compare candidate</button><button id="protect-back">Back</button></div></section>`);
  app.querySelector("#protect-back")?.addEventListener("click", renderProtect);
  app.querySelector("#compare")?.addEventListener("click", renderCompare);
};

const renderCompare = (): void => {
  if (!result || !capture) return;
  const gates = validateCandidate({ content: capture.text, content_hash: result.source.content_hash, content_type: "plain_text", language: "en-GB" }, candidate, result.protected_spans, { expected_source_hash: result.source.content_hash });
  const blocking = gates.filter(gate => gate.hard && gate.status !== "pass" && gate.id !== "semantic_entailment");
  shell(4, `<section class="sheet"><p class="eyebrow">Two-rail comparison</p><h1>Compare before copying</h1>
    <div class="rails"><section><h2>Original</h2><pre>${preview(capture.text)}</pre></section><section><h2>Candidate</h2><pre>${preview(candidate)}</pre></section></div>
    <p class="gate ${blocking.length ? "fail" : "pass"}"><strong>${blocking.length ? "Blocked" : "Deterministic gates passed"}</strong> · ${gates.length} gates checked; semantic entailment remains not configured.</p>
    <div id="copy-fallback" hidden><label for="fallback">Clipboard unavailable. Select all and copy:</label><textarea id="fallback" readonly>${escapeHtml(candidate)}</textarea></div>
    <div class="actions"><button class="primary" id="copy" ${blocking.length ? "disabled" : ""}>Copy selected candidate</button><button id="export">Export receipt</button><button id="improve-back">Back</button></div></section>`);
  app.querySelector("#improve-back")?.addEventListener("click", renderImprove);
  app.querySelector("#copy")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(candidate);
      announce("Candidate copied. The page was not changed.");
    } catch {
      const fallback = app.querySelector<HTMLElement>("#copy-fallback")!;
      fallback.hidden = false;
      app.querySelector<HTMLTextAreaElement>("#fallback")?.focus();
      announce("Clipboard unavailable. A read-only copy field is ready.");
    }
  });
  app.querySelector("#export")?.addEventListener("click", () => void renderExport(gates));
};

const renderExport = async (gates: ReturnType<typeof validateCandidate>): Promise<void> => {
  if (!result || !capture) return;
  receipt = await buildReceipt({
    receipt_id: `ext_receipt_${Date.now()}`,
    product_version: "1.0.0",
    created_at: new Date().toISOString(),
    source: { content: capture.text, content_type: "plain_text", language: "en-GB", normalised_text: capture.text.normalize("NFC") },
    policy: { id: "extension-browser", version: "1.0.0", requested_checks: result.methods.map(method => method.id), allowed_routes: ["browser"], retain_content: false },
    methods: result.methods,
    rewrite: candidate === capture.text ? null : { source_hash: result.source.content_hash, candidate_hash: prefixedSha256(candidate), generator: { route: "browser", provider: "Opace deterministic core", model: "none", prompt_template: "safe-unicode-preview" }, gates, selected_candidate: "candidate_1", candidate_content: candidate },
    approval: { scope: "none" },
    limitations: ["This hash-only receipt contains no source URL or text and does not prove human authorship."],
    contains_content: false
  });
  shell(5, `<section class="sheet"><p class="eyebrow">Hash-only evidence</p><h1>Receipt ready</h1><p>The JSON contains hashes, method states and limitations. It contains no source URL, source text or candidate text.</p>
    <dl><div><dt>Methods</dt><dd>${receipt.methods.length}</dd></div><div><dt>Content retained</dt><dd>No</dd></div><div><dt>History</dt><dd>Off</dd></div></dl>
    <div class="actions"><button class="primary" id="download">Download JSON receipt</button><button id="clear-data">Clear extension data</button><button id="compare-back">Back</button></div><p id="clear-result" role="status"></p></section>`);
  app.querySelector("#compare-back")?.addEventListener("click", renderCompare);
  app.querySelector("#download")?.addEventListener("click", () => {
    const blob = new Blob([`${JSON.stringify(receipt, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${receipt!.receipt_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    announce("Hash-only receipt download started.");
  });
  app.querySelector("#clear-data")?.addEventListener("click", async () => {
    const counts = await clearAllExtensionData();
    const target = app.querySelector<HTMLElement>("#clear-result")!;
    target.textContent = `Cleared ${counts.local} local setting group(s) and ${counts.session} session marker(s). No text history existed.`;
  });
};

const initialise = async (): Promise<void> => {
  const settings = await loadSettings();
  document.documentElement.dataset.contrast = settings.highContrast ? "high" : "normal";
  await saveSettings(settings);
  const pending = await chrome.runtime.sendMessage({ type: "GET_PENDING" });
  if (pending?.capture) {
    capture = pending.capture as CapturePayload;
    renderCapture();
    return;
  }
  if (pending?.interrupted) {
    capture = { kind: "paste", text: "", host: "", title: "Interrupted", limitations: [] };
    renderCapture("The browser interrupted an unfinished capture. No source or result was retained; paste or capture again.");
    return;
  }
  capture = { kind: "paste", text: "", host: "", title: "Pasted text", limitations: [] };
  renderCapture();
};

void initialise();
