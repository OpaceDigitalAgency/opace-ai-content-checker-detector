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

    // Consent refusal: the primary action without the download box ticked.
    await page.fill("#source", HUMAN_SAMPLE.slice(0, 400));
    await page.click("#inspect");
    await page.waitForSelector("#capture-error:not([hidden])");
    await capture(page, "02-consent-required", width);

    // Refuse-not-truncate at the 50,000-character surface limit.
    await reload(width);
    await page.evaluate(() => {
      const field = document.querySelector("#source");
      field.value = "Sample sentence for the limit test. ".repeat(1600);
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.check("#model-consent");
    await page.click("#inspect");
    await page.waitForSelector("#capture-error:not([hidden])");
    await capture(page, "03-over-limit-refused", width);

    // Too short for the model: quick checks still reported honestly.
    await reload(width);
    await page.fill("#source", "One short line of text.");
    await page.check("#model-consent");
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
    await page.check("#model-consent");
    await page.click("#inspect");
    await page.waitForSelector("#phase", { timeout: 10_000 });
    await capture(page, "06-loading", width);
    await page.waitForSelector("[data-oaci-result]", { timeout: 600_000 });
    await capture(page, "07-result-on-device", width);

    const resultJson = await page.evaluate(() => ({ ...document.querySelector("[data-oaci-result]")?.dataset }));
    summary.result_dataset = resultJson;

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
  await page.check("#model-consent");
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
