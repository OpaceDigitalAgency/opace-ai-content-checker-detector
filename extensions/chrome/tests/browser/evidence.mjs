/**
 * Drives the real unpacked extension and records the parity evidence.
 *
 * It loads `dist/` into a persistent Chromium profile, opens the side panel
 * document directly at 900 and exactly 375 CSS pixels, walks every state the
 * acceptance gate names, and records screenshots, axe results, console errors,
 * the exact network requests the panel made and the canonical result JSON.
 *
 * The on-device model is read from a local HTTPS mirror of the pinned assets.
 * The shipped default host is unchanged; the mirror is a build-time test flag.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(here, "../..");
const dist = path.join(extensionRoot, "dist");
const out = process.env.OACI_EVIDENCE_DIR ?? path.join(extensionRoot, "evidence/parity-2026-09-02");
const axeSource = await readFile(path.resolve(extensionRoot, "node_modules/axe-core/axe.min.js"), "utf8");
const DEFAULT_CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const profile = path.join(process.env.TMPDIR ?? "/tmp", `oaci-chrome-profile-${Date.now()}`);

const HUMAN_SAMPLE = await readFile(path.join(here, "fixtures/human-sample.txt"), "utf8");
const AI_SAMPLE = await readFile(path.join(here, "fixtures/ai-sample.txt"), "utf8");

const summary = { started_at: new Date().toISOString(), model_source: process.env.OACI_INTERCEPT_MODEL === "1" ? "intercepted pinned artefacts against the shipped host" : "build-time local HTTPS mirror", intercepted_model_assets: [], states: [], console_errors: [], network: [], axe: {} };

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAxe(page, label) {
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    const run = await window.axe.run(document, { resultTypes: ["violations"], runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } });
    return run.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length, help: violation.help, targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")) }));
  });
  summary.axe[label] = results;
  return results;
}

async function capture(page, label, width) {
  const scrollWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const overflow = scrollWidth > clientWidth + 1;
  const file = path.join(out, `${label}-${width}.png`);
  await page.screenshot({ path: file, fullPage: true });
  const violations = await runAxe(page, `${label}-${width}`);
  summary.states.push({ label, width, file: path.relative(extensionRoot, file), scrollWidth, clientWidth, horizontal_overflow: overflow, axe_violations: violations.length });
  if (overflow) console.error(`OVERFLOW ${label} at ${width}: ${scrollWidth} > ${clientWidth}`);
  if (violations.length) console.error(`AXE ${label} at ${width}:`, JSON.stringify(violations));
  return { overflow, violations };
}

async function main() {
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, {
    headless: false,
    executablePath: process.env.OACI_CHROME ?? DEFAULT_CHROME,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      "--ignore-certificate-errors",
      "--no-first-run",
      "--disable-features=DialMediaRouteProvider",
    ],
    viewport: { width: 900, height: 1200 },
  });

  /* An unpacked extension's identity is derived from its absolute path, so the
     side panel can be opened directly without waiting for a service-worker
     event that MV3 only fires on demand. */
  const digest = createHash("sha256").update(dist).digest("hex").slice(0, 32);
  const extensionId = [...digest].map((character) => String.fromCharCode(97 + Number.parseInt(character, 16))).join("");
  summary.extension_id = extensionId;
  console.log("extension id", extensionId);

  /* The shipped build points at the fixed Opace model host, which has no live
     CORS today. With OACI_INTERCEPT_MODEL the exact pinned artefacts are served
     from disk so the packaged bytes can be exercised unchanged; otherwise the
     build-time test mirror is used. Either way nothing else is intercepted. */
  if (process.env.OACI_INTERCEPT_MODEL === "1") {
    const mirror = process.env.OACI_MODEL_DIR ?? "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/public/models/local-signals-v1";
    await context.route("https://opace.agency/models/local-signals-v1/**", async (routeRequest) => {
      const name = new URL(routeRequest.request().url()).pathname.split("/").pop();
      try {
        const body = await readFile(path.join(mirror, name));
        summary.intercepted_model_assets.push(name);
        await routeRequest.fulfill({ status: 200, body, headers: { "content-type": name.endsWith(".json") ? "application/json" : name.endsWith(".txt") ? "text/plain" : "application/octet-stream" } });
      } catch {
        await routeRequest.fulfill({ status: 404, body: "" });
      }
    });
  }

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") summary.console_errors.push({ url: page.url(), text: message.text() });
  });
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(`chrome-extension://${extensionId}/`)) summary.network.push({ url, method: request.method(), resource: request.resourceType() });
  });

  const panelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
  const reload = async (width) => {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto(panelUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#inspect", { timeout: 20_000 });
    await page.waitForFunction(() => document.fonts.status === "loaded", null, { timeout: 10_000 }).catch(() => undefined);
  };

  for (const width of [900, 375]) {
    await reload(width);
    await capture(page, "01-capture-empty", width);

    /* The consent is the button. With no model cached the primary action says
       what pressing it will fetch, and the size and fingerprint sit beside it. */
    const consentState = await page.evaluate(() => ({
      button: document.querySelector("#inspect")?.textContent?.trim() ?? null,
      meta: document.querySelector("#download-meta")?.textContent?.trim() ?? null,
      metaHidden: document.querySelector("#download-meta")?.hidden ?? null,
      note: document.querySelector('[data-consent="cycle5"]')?.textContent?.trim().slice(0, 120) ?? null,
      tickBoxes: document.querySelectorAll("#model-consent").length,
    }));
    summary.consent_before_download ??= consentState;
    await capture(page, "02-consent-in-the-button", width);

    // Refuse-not-truncate at the 50,000-character surface limit.
    await reload(width);
    await page.evaluate(() => {
      const field = document.querySelector("#source");
      field.value = "Sample sentence for the limit test. ".repeat(1600);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.click("#inspect");
    await page.waitForSelector("#capture-error:not([hidden])");
    await capture(page, "03-over-limit-refused", width);

    // Too short for the model: quick checks still reported honestly.
    await reload(width);
    await page.fill("#source", "One short line of text.");
    await page.click("#inspect");
    await page.waitForSelector("[data-oaci-result]", { timeout: 180_000 });
    await capture(page, "04-too-short-withheld", width);

    // Deterministic-only route: the AI reading must stay Not assessed.
    await reload(width);
    await page.fill("#source", HUMAN_SAMPLE);
    await page.check('input[value="deterministic"]');
    await page.click("#inspect");
    await page.waitForSelector("[data-oaci-result]", { timeout: 180_000 });
    await capture(page, "05-quick-checks-not-assessed", width);

    // The full on-device run.
    await reload(width);
    await page.fill("#source", AI_SAMPLE);
    await page.click("#inspect");
    await page.waitForSelector("#phase", { timeout: 10_000 });
    await capture(page, "06-loading", width);
    await page.waitForSelector("[data-oaci-result]", { timeout: 600_000 });
    await capture(page, "07-result-on-device", width);

    const resultJson = await page.evaluate(() => ({ ...document.querySelector("[data-oaci-result]")?.dataset }));
    summary.result_dataset = resultJson;

    /* The same screen once the model is here: the button no longer promises a
       download, and the size and fingerprint are put away. */
    const scrolled = await page.evaluate(() => window.scrollY);
    await reload(width);
    summary.consent_after_download ??= await page.evaluate(() => ({
      button: document.querySelector("#inspect")?.textContent?.trim() ?? null,
      metaHidden: document.querySelector("#download-meta")?.hidden ?? null,
      note: document.querySelector('[data-consent="cycle5"]')?.textContent?.trim().slice(0, 120) ?? null,
    }));
    await capture(page, "25-consent-model-cached", width);
    await page.goBack({ waitUntil: "domcontentloaded" }).catch(() => undefined);
    await page.goto(panelUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#inspect");
    await page.fill("#source", AI_SAMPLE);
    await page.click("#inspect");
    await page.waitForSelector("[data-oaci-result]", { timeout: 600_000 });
    await page.evaluate((y) => window.scrollTo(0, y), scrolled);

    // The section deep dives, and the disclosure that collapses one.
    await capture(page, "08-section-deep-dive", width);
    const toggle = page.locator("[data-oaci-section-toggle]").first();
    const diveId = await toggle.getAttribute("aria-controls");
    await toggle.click();
    await page.waitForSelector(`#${diveId}`, { state: "hidden", timeout: 10_000 });
    summary.section_toggle = { id: diveId, collapsed: true };
    await capture(page, "09-section-collapsed", width);
    await toggle.click();
    await page.waitForSelector(`#${diveId}`, { state: "visible", timeout: 10_000 });

    // Open the certainty and named-check disclosures.
    await page.evaluate(() => { for (const element of document.querySelectorAll("details")) element.open = true; });
    await capture(page, "10-certainty-and-checks", width);

    // Protect, improve and compare.
    await page.click('[data-oaci-action="protect"]');
    await page.waitForSelector(".facts");
    await capture(page, "11-protect-facts", width);
    await page.click("#improve");
    await page.waitForSelector("#compare");
    await capture(page, "12-improve", width);
    await page.click("#compare");
    await page.waitForSelector(".rails");
    await capture(page, "13-compare", width);

    // Export: reports, receipts, share and the file provenance workflow.
    await page.click("#export");
    await page.waitForSelector("#download-pdf");
    await capture(page, "14-export", width);
    await page.click("#copy-share");
    await page.waitForSelector("#share-out:not([hidden])");
    summary.share_summary = await page.inputValue("#share-text");
    await capture(page, "15-share-summary", width);

    if (width === 900) {
      const [pdfDownload] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.click("#download-pdf")]);
      await pdfDownload.saveAs(path.join(out, "checker-report.pdf"));
      const [htmlDownload] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.click("#download-html")]);
      await htmlDownload.saveAs(path.join(out, "checker-report.html"));
      const [jsonDownload] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.click("#download-result-json")]);
      await jsonDownload.saveAs(path.join(out, "result-receipt.json"));
      const [receiptDownload] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.click("#download-receipt")]);
      await receiptDownload.saveAs(path.join(out, "check-receipt.json"));
    }

    const provenanceFixtures = {
      "16-provenance-credentials-found": "signed.jpg",
      "17-provenance-absent": "plain.jpg",
      "18-provenance-invalid": "malformed.jpg",
      "19-provenance-unsupported": "note.txt",
    };
    for (const [label, fixture] of Object.entries(provenanceFixtures)) {
      const fixturePath = path.join(here, "fixtures", fixture);
      await page.setInputFiles("#prov-file", fixturePath);
      await page.waitForSelector(".prov, .notice.attention", { timeout: 60_000 });
      await wait(400);
      await capture(page, label, width);
      summary.provenance ??= {};
      summary.provenance[fixture] = await page.evaluate(() => document.querySelector(".prov .chip")?.dataset.state ?? document.querySelector(".notice.attention b")?.textContent ?? null);
    }
    if (width === 900) {
      const [provPdf] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.click("#prov-pdf")]);
      await provPdf.saveAs(path.join(out, "provenance-report.pdf"));
      const [provJson] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.click("#prov-json")]);
      await provJson.saveAs(path.join(out, "provenance-record.json"));
    }

    // Clear data, proved by reading storage back.
    await page.click("#clear-data");
    await page.waitForFunction(() => document.querySelector("#clear-result")?.textContent?.trim().length > 0);
    summary.clear_message = await page.textContent("#clear-result");
    summary.storage_after_clear = await page.evaluate(async () => ({
      local: Object.keys(await chrome.storage.local.get(null)),
      session: Object.keys(await chrome.storage.session.get(null)),
      caches: await caches.keys(),
    }));
    await capture(page, "20-cleared", width);

    // The EU route: permission is requested only after the choice, then an
    // honest unavailable state.
    await reload(width);
    await page.fill("#source", HUMAN_SAMPLE);
    await page.check('input[value="eu-server"]');
    await capture(page, "21-eu-route-chosen", width);

    /* The per-installation pace, proved by seeding the stored record and
       confirming the refusal is local: no request reaches the service. */
    const networkBefore = summary.network.length;
    await page.evaluate(async () => {
      const now = Date.now();
      await chrome.storage.local.set({ eu_allowance: { requests: [now - 1_000, now - 2_000, now - 3_000] } });
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("#inspect");
    await page.fill("#source", HUMAN_SAMPLE);
    await page.check('input[value="eu-server"]');
    await page.check("#server-consent");
    await page.click("#inspect");
    await page.waitForSelector("#capture-error:not([hidden])");
    summary.eu_pace_refusal = (await page.textContent("#capture-error")) ?? "";
    summary.eu_pace_requests_made = summary.network.length - networkBefore;
    await capture(page, "22-eu-pace-reached", width);
    await page.evaluate(async () => chrome.storage.local.remove("eu_allowance"));
  }

  /* ------------------------------------------------- reading a real live page
     The panel document is an ordinary tab in this harness, so each target page
     is opened first and brought to the front; `chrome.tabs.query` then resolves
     to the real page exactly as it does from a real side panel.

     Two things Chrome will not do under automation are substituted, and nothing
     else. Both are recorded in `evidence.json` so the claim stays exact.

     1. Chrome discloses a tab's address only to an extension that already has
        access to it, and that access arrives with a toolbar click no automation
        can perform. `chrome.tabs.query` is therefore wrapped to return the
        tab's real URL, which is precisely what Chrome returns once the click
        has happened.
     2. Chrome's own permission bubble cannot be accepted by automation, so
        `chrome.permissions.request` is wrapped by a recorder that returns the
        answer the state is proving, and the retry's injection is served by the
        extension's own packaged `content/extract-article.js` bytes run against
        the real page, broadcast through the real service worker as the real
        content script would.

     The page, the extraction code, the projection, the panel and the check are
     all real. */

  const articleReader = await readFile(path.join(dist, "content/extract-article.js"), "utf8");
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker", { timeout: 20_000 }));

  const instrument = (panelPage, { targetUrl, grant }) => panelPage.evaluate(({ url, answer }) => {
    window.__oaci = { permissionRequests: [], injections: [], injectionErrors: [], noticeWhenAsked: [], standInUsed: 0 };
    /* Chrome tells an extension a tab's address only once it has access to it.
       The active tab's real URL is put back, which is exactly what Chrome
       returns after the toolbar click that no automation can perform. */
    const realQuery = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = async (spec) => (await realQuery(spec)).map((tab) => (tab.active ? { ...tab, url } : tab));
    chrome.permissions.request = async (spec) => {
      window.__oaci.permissionRequests.push(spec);
      window.__oaci.noticeWhenAsked.push([...document.querySelectorAll(".notice b")].map((node) => node.textContent));
      return answer;
    };
    const realInject = chrome.scripting.executeScript.bind(chrome.scripting);
    chrome.scripting.executeScript = async (spec) => {
      window.__oaci.injections.push({ tabId: spec.target?.tabId, files: spec.files });
      /* The first attempt is Chrome's own, unaltered, and it fails for want of
         access exactly as it does for a reader whose grant has lapsed. */
      if (window.__oaci.injections.length === 1) {
        try { return await realInject(spec); }
        catch (error) { window.__oaci.injectionErrors.push(error.message); throw error; }
      }
      window.__oaci.standInUsed += 1;
      void window.__oaciStandIn(spec);
      return [];
    };
  }, { url: targetUrl, answer: grant });

  const realPageStates = [
    { label: "26-live-https", url: "https://opace.agency/tools/ai/content-verification-integrity/checker/", host: "opace.agency", origin: "https://opace.agency/*" },
    { label: "27-local-wordpress", url: "http://127.0.0.1:8931/?p=2", host: "127.0.0.1", origin: "http://127.0.0.1/*" },
  ];

  summary.real_pages = [];
  for (const state of realPageStates) {
    const target = await context.newPage();
    await target.goto(state.url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const panelPage = await context.newPage();
    panelPage.on("console", (message) => { if (message.type() === "error") summary.console_errors.push({ url: panelPage.url(), text: message.text() }); });
    panelPage.on("request", (request) => {
      const url = request.url();
      if (!url.startsWith(`chrome-extension://${extensionId}/`)) summary.network.push({ url, method: request.method(), resource: request.resourceType() });
    });
    await panelPage.setViewportSize({ width: 900, height: 1200 });
    await panelPage.goto(panelUrl, { waitUntil: "domcontentloaded" });
    await panelPage.waitForSelector("#inspect");

    /* The stand-in runs the packaged reader against the real page and hands the
       payload back through the real service worker, which is the same message
       the real content script sends. */
    await panelPage.exposeFunction("__oaciStandIn", async () => {
      const payload = await target.evaluate((source) => {
        globalThis.chrome = { runtime: { sendMessage: (message) => { globalThis.__oaciPayload = message.payload; } } };
        // eslint-disable-next-line no-new-func
        new Function(source)();
        return globalThis.__oaciPayload;
      }, articleReader);
      await worker.evaluate((message) => chrome.runtime.sendMessage(message), { type: "CAPTURE_READY", payload });
    });

    const record = { label: state.label, url: state.url };

    // (i) The grant is refused: nothing is read, and the panel says so plainly.
    await instrument(panelPage, { targetUrl: state.url, grant: false });
    await target.bringToFront();
    await panelPage.evaluate(() => document.querySelector('[data-mode="article"]').click());
    await panelPage.waitForSelector("#grant-access", { timeout: 20_000 });
    record.first_injection = await panelPage.evaluate(() => ({ calls: window.__oaci.injections, errors: window.__oaci.injectionErrors }));
    record.offer_before_any_request = await panelPage.evaluate(() => ({
      heading: document.querySelector(".notice.attention b")?.textContent ?? null,
      body: document.querySelector(".notice.attention p")?.textContent ?? null,
      requestsSoFar: window.__oaci.permissionRequests.length,
    }));
    await panelPage.bringToFront();
    await capture(panelPage, `${state.label}-permission-offer`, 900);
    await target.bringToFront();
    await panelPage.evaluate(() => document.querySelector("#grant-access").click());
    await panelPage.waitForFunction(() => document.querySelector(".notice b")?.textContent?.includes("Permission was not given"), null, { timeout: 20_000 });
    record.refused = await panelPage.evaluate(() => ({
      requested: window.__oaci.permissionRequests,
      heading: document.querySelector(".notice b")?.textContent ?? null,
      body: document.querySelector(".notice p")?.textContent ?? null,
      injections: window.__oaci.injections.length,
    }));
    await panelPage.bringToFront();
    await capture(panelPage, `${state.label}-permission-refused`, 900);

    // (ii) The grant is given: the packaged reader runs and the text comes back.
    await panelPage.goto(panelUrl, { waitUntil: "domcontentloaded" });
    await panelPage.waitForSelector("#inspect");
    await instrument(panelPage, { targetUrl: state.url, grant: true });
    await target.bringToFront();
    await panelPage.evaluate(() => document.querySelector('[data-mode="article"]').click());
    await panelPage.waitForSelector("#grant-access", { timeout: 20_000 });
    await panelPage.evaluate(() => document.querySelector("#grant-access").click());
    await panelPage.waitForFunction(() => document.querySelector("#source")?.value.length > 400, null, { timeout: 30_000 });
    record.granted = await panelPage.evaluate(() => ({
      requested: window.__oaci.permissionRequests,
      standInUsed: window.__oaci.standInUsed,
      injections: window.__oaci.injections,
      label: document.querySelector('label[for="source"]')?.textContent ?? null,
      characters: document.querySelector("#source")?.value.length ?? 0,
      opening: document.querySelector("#source")?.value.slice(0, 140) ?? "",
      readOnly: document.querySelector("#source")?.readOnly ?? null,
    }));
    await panelPage.bringToFront();
    await capture(panelPage, `${state.label}-captured`, 900);
    await panelPage.setViewportSize({ width: 375, height: 1200 });
    await capture(panelPage, `${state.label}-captured`, 375);
    await panelPage.setViewportSize({ width: 900, height: 1200 });

    // (iii) The captured page text is checked, on device, end to end.
    await panelPage.click("#inspect");
    await panelPage.waitForSelector("[data-oaci-result]", { timeout: 600_000 });
    record.checked = await panelPage.evaluate(() => ({ ...document.querySelector("[data-oaci-result]")?.dataset }));
    await capture(panelPage, `${state.label}-result`, 900);

    summary.real_pages.push(record);
    await panelPage.close();
    await target.close();
  }

  /* Pages no permission can ever open. Nothing here is substituted: these are
     the real addresses and the real refusals. */
  summary.closed_pages = [];
  for (const [label, tabUrl] of [
    ["28-closed-chrome-page", "chrome://version/"],
    ["29-closed-web-store", "https://chromewebstore.google.com/category/extensions"],
    ["30-closed-pdf", "https://opace.agency/reports/example.pdf"],
  ]) {
    const panelPage = await context.newPage();
    await panelPage.setViewportSize({ width: 900, height: 1200 });
    await panelPage.goto(panelUrl, { waitUntil: "domcontentloaded" });
    await panelPage.waitForSelector("#inspect");
    await panelPage.evaluate((url) => {
      const realQuery = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = async (spec) => (await realQuery(spec)).map((tab) => (tab.active ? { ...tab, url } : tab));
    }, tabUrl);
    await panelPage.evaluate(() => document.querySelector('[data-mode="article"]').click());
    await panelPage.waitForSelector(".notice.attention", { timeout: 20_000 });
    summary.closed_pages.push({
      label,
      tab_url: tabUrl,
      heading: await panelPage.textContent(".notice.attention b"),
      body: await panelPage.textContent(".notice.attention p"),
      asked_for_permission: await panelPage.evaluate(() => document.querySelectorAll("#grant-access").length),
    });
    await capture(panelPage, label, 900);
    await panelPage.close();
  }

  // Keyboard journey and visible focus at 375.
  await reload(375);
  const focusOrder = [];
  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press("Tab");
    focusOrder.push(await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      const style = getComputedStyle(active);
      return {
        tag: active.tagName.toLowerCase(),
        id: active.id || null,
        label: (active.getAttribute("aria-label") ?? active.textContent ?? "").trim().slice(0, 48),
        outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
        boxShadow: style.boxShadow,
        borderColor: style.borderColor,
      };
    }));
  }
  summary.keyboard_focus_order = focusOrder;
  await page.screenshot({ path: path.join(out, "23-keyboard-focus-375.png"), fullPage: true });

  // Reduced motion.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await reload(375);
  await page.fill("#source", HUMAN_SAMPLE.slice(0, 900));
  await page.click("#inspect");
  await page.waitForSelector("#phase", { timeout: 10_000 });
  await page.screenshot({ path: path.join(out, "24-reduced-motion-loading-375.png"), fullPage: true });
  summary.reduced_motion_animation = await page.evaluate(() => {
    const bar = document.querySelector(".progress i");
    return bar ? getComputedStyle(bar).animationName : "no-progress-bar";
  });
  await page.waitForSelector("[data-oaci-result]", { timeout: 600_000 });
  await page.emulateMedia({ reducedMotion: null });

  summary.finished_at = new Date().toISOString();
  await writeFile(path.join(out, "evidence.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await context.close();
  await rm(profile, { recursive: true, force: true });

  const failures = [
    ...summary.states.filter((state) => state.horizontal_overflow).map((state) => `horizontal overflow: ${state.label} at ${state.width}`),
    ...summary.states.filter((state) => state.axe_violations).map((state) => `axe violations: ${state.label} at ${state.width}`),
    ...summary.console_errors.map((error) => `console error: ${error.text}`),
  ];
  console.log(JSON.stringify({ states: summary.states.length, failures, network: summary.network.length }, null, 2));
  if (failures.length) process.exitCode = 1;
}

await main();
