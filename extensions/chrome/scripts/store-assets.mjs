/**
 * Regenerates the Chrome Web Store listing images from the exact built
 * extension and the canonical brand assets.
 *
 * The five screenshots are real captures of `dist/` driven through the real
 * workflow, composited at the required 1280x800 with the product's own
 * typography. The promotional tiles reuse the canonical logo and the hero's
 * brand block; nothing is drawn that the package does not do.
 *
 * The pinned model artefacts are served to the packaged bytes by request
 * interception, so the screenshots show a real populated result without
 * changing a single byte of the package.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const repo = path.resolve(root, "../..");
const dist = path.join(root, "dist");
const submission = path.resolve(root, "../submission/chrome-web-store");
const modelDir = process.env.OACI_MODEL_DIR;
if (!modelDir) throw new Error("Set OACI_MODEL_DIR to the local directory containing the pinned model assets before capturing store screenshots.");
const chrome = process.env.OACI_CHROME ?? chromium.executablePath();
const logoPath = path.join(repo, "docs/assets/opace-ai-checker-chrome-mark-v4.png");
const fixtures = path.join(root, "tests/browser/fixtures");

const dataUri = async (file, mime) => `data:${mime};base64,${(await readFile(file)).toString("base64")}`;

const PANEL_WIDTH = 470;
const PANEL_HEIGHT = 700;

const SHOTS = [
  {
    file: "01-choose-the-text-and-route.png",
    kicker: "Step 1 · Capture",
    title: "You choose the text, and where it is read",
    body: "Selected text, the visible article or a paste. Choose the full check on this device or quick checks only. The optional EU route is marked unavailable. Nothing runs until you say so.",
  },
  {
    file: "02-the-reading-and-section-scores.png",
    kicker: "Step 2 · Inspect",
    title: "A clear reading, with patterns you can inspect",
    body: "A five-band dial and a level in plain words, followed by measured writing observations with examples from your text. The model score is a pattern reading, never a percentage of AI-written words.",
  },
  {
    file: "03-inside-a-section.png",
    kicker: "Evidence",
    title: "Open a section, and its evidence opens in place",
    body: "A section score opens into the passage the model read, what we can measure in it against typical human and AI values, and any editing advice. One section at a time, with a strip that names it and steps to the next.",
  },
  {
    file: "04-checks-and-what-it-means.png",
    kicker: "Honesty",
    title: "Every check named, and what the result does not mean",
    body: "Three separate readings, every method with its status, version and limits, and a plain statement that no result proves who wrote a text.",
  },
  {
    file: "05-reports-receipts-and-files.png",
    kicker: "Step 6 · Export",
    title: "Branded reports, content-free receipts, file credentials",
    body: "Save a branded PDF or the complete HTML report, copy a share line that carries none of your draft, and inspect a JPEG, PNG, WebP or PDF for Content Credentials on this device.",
  },
];

const composite = async ({ fontOutfit, fontJakarta, mark, image, kicker, title, body }) => `
<style>
@font-face{font-family:Outfit;src:url("${fontOutfit}") format("woff2");font-weight:400 900}
@font-face{font-family:"Plus Jakarta Sans";src:url("${fontJakarta}") format("woff2");font-weight:400 800}
*{box-sizing:border-box;margin:0}
body{width:1280px;height:800px;display:grid;grid-template-columns:620px 1fr;align-items:center;gap:40px;padding:56px 60px;background:radial-gradient(circle at 18% 12%,#12376b 0%,#061a3c 46%,#041129 100%);color:#fff;font-family:"Plus Jakarta Sans",system-ui,sans-serif;overflow:hidden}
.brand{display:flex;align-items:center;gap:14px;margin-bottom:34px}
.brand img{width:56px;height:56px;border-radius:12px}
.brand p{color:#38bdf8;font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
.brand strong{display:block;margin-top:3px;color:#fff;font:700 22px/1.1 Outfit,sans-serif;letter-spacing:-.02em}
.kicker{margin-bottom:14px;color:#ffb057;font-size:13px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
h1{max-width:15ch;color:#fff;font:700 46px/1.06 Outfit,sans-serif;letter-spacing:-.035em}
p.body{max-width:46ch;margin-top:20px;color:#c3d3e8;font-size:17px;line-height:1.62}
.tag{display:inline-block;margin-top:30px;padding:9px 16px;color:#ffb057;background:rgb(251 112 10 / 14%);border:1px solid rgb(251 112 10 / 38%);border-radius:999px;font-size:13px;font-weight:800}
.shot{position:relative;justify-self:end;width:470px;height:700px;overflow:hidden;background:#f2ede6;border:1px solid rgb(255 255 255 / 18%);border-radius:18px;box-shadow:0 40px 90px rgb(0 0 0 / 45%)}
.shot img{display:block;width:100%}
</style>
<div>
  <div class="brand"><img src="${mark}" alt=""><div><p>Opace</p><strong>AI Content Checker &amp; Detector</strong></div></div>
  <p class="kicker">${kicker}</p>
  <h1>${title}</h1>
  <p class="body">${body}</p>
  <span class="tag">Evidence, not guarantees</span>
</div>
<div class="shot"><img src="${image}" alt=""></div>
`;

const promo = async ({ fontOutfit, fontJakarta, mark, width, height }) => {
  const wide = width > 800;
  return `
<style>
@font-face{font-family:Outfit;src:url("${fontOutfit}") format("woff2");font-weight:400 900}
@font-face{font-family:"Plus Jakarta Sans";src:url("${fontJakarta}") format("woff2");font-weight:400 800}
*{box-sizing:border-box;margin:0}
body{width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;gap:${wide ? 46 : 22}px;padding:${wide ? "0 92px" : "0 30px"};background:radial-gradient(circle at 16% 14%,#12376b 0%,#061a3c 48%,#041129 100%);color:#fff;font-family:"Plus Jakarta Sans",system-ui,sans-serif;overflow:hidden}
img{width:${wide ? 184 : 104}px;height:${wide ? 184 : 104}px;border-radius:${wide ? 32 : 18}px;flex:none}
p.k{color:#38bdf8;font-size:${wide ? 17 : 10}px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
h1{margin:${wide ? "12px 0 16px" : "7px 0 9px"};color:#fff;font:700 ${wide ? 59 : 27}px/1.02 Outfit,sans-serif;letter-spacing:-.04em}
h1 span{color:#ffa64d}
p.t{color:#c3d3e8;font-size:${wide ? 18 : 11}px;line-height:1.5;max-width:${wide ? 68 : 32}ch}
.pill{display:${wide ? "inline-block" : "none"};margin-top:20px;padding:9px 16px;border:1px solid rgb(56 189 248 / 55%);border-radius:999px;color:#fff;background:rgb(0 104 179 / 28%);font-size:13px;font-weight:800}
</style>
<img src="${mark}" alt="">
<div>
  ${wide ? '' : '<p class="k">Opace</p>'}
  <h1>${wide ? 'Opace ' : ''}AI Content <span>Checker &amp; Detector</span></h1>
  <p class="t">${wide ? "Check articles, selected text and drafts for AI writing patterns and hidden characters. Inspect file Content Credentials. All on your device." : "AI detector for articles, selections and drafts"}</p>
  ${wide ? '<span class="pill">Evidence, not guarantees</span>' : ''}
</div>
`;
};

const record = async (relativePath, alt, caption) => {
  const absolute = path.join(submission, relativePath);
  const bytes = await readFile(absolute);
  const meta = await sharp(bytes).metadata();
  return { path: relativePath, width: meta.width, height: meta.height, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), alt, ...(caption ? { caption } : {}) };
};

async function main() {
  await mkdir(path.join(submission, "assets"), { recursive: true });
  await mkdir(path.join(submission, "screenshots"), { recursive: true });

  const context = await chromium.launchPersistentContext(path.join(process.env.TMPDIR ?? "/tmp", `oaci-store-${Date.now()}`), {
    headless: false,
    executablePath: chrome,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, "--no-first-run"],
    viewport: { width: PANEL_WIDTH, height: PANEL_HEIGHT },
    deviceScaleFactor: 2,
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  await context.route("https://opace.agency/models/local-signals-v1/**", async (routeRequest) => {
    const name = new URL(routeRequest.request().url()).pathname.split("/").pop();
    await routeRequest.fulfill({ status: 200, body: await readFile(path.join(modelDir, name)), headers: { "content-type": "application/octet-stream" } });
  });

  const page = await context.newPage();
  const modelRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://opace.agency/models/local-signals-v1/")) modelRequests.push(request.url());
  });
  const panelUrl = `chrome-extension://${extensionId}/sidepanel.html`;
  const sample = await readFile(path.join(fixtures, "ai-sample.txt"), "utf8");
  /* Every capture is the panel's own viewport, scrolled so the part the caption
     describes is the part the reader sees. Nothing is composited into the panel
     itself. */
  const shotAt = async (selector, offset = 14) => {
    if (selector) {
      await page.evaluate(([target, gap]) => {
        const node = document.querySelector(target);
        window.scrollTo(0, node ? node.getBoundingClientRect().top + window.scrollY - gap : 0);
      }, [selector, offset]);
    } else {
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.waitForTimeout(180);
    return { buffer: await page.screenshot() };
  };

  await page.goto(panelUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#inspect");
  /* The listing images should not show a scrollbar the reader never sees in a
     real side panel, which has no visible track at this width. */
  await page.addStyleTag({ content: "::-webkit-scrollbar{width:0;height:0}" });
  const shot1 = await shotAt(null);

  await page.fill("#source", sample);
  await page.click("#inspect");
  await page.waitForSelector("[data-oaci-result]", { timeout: 600_000 });
  const shot2 = await shotAt(".oaci-panel", 14);
  /* A section row now opens in place, so the evidence has to be opened before
     it can be shown. The row itself is what the shot is scrolled to: the strip
     above it names the open section and steps between them. */
  await page.click("[data-oaci-section-toggle]");
  await page.waitForSelector("#section-strip:not([hidden])", { timeout: 20_000 });
  await page.waitForTimeout(500);
  const shot3 = await shotAt(".oaci-strip__list>li[data-oaci-open=true]", 96);
  await page.click('[data-part="close"]');
  await page.waitForSelector("#section-strip", { state: "hidden", timeout: 10_000 });
  await page.evaluate(() => { for (const element of document.querySelectorAll("details")) element.open = true; });
  const shot4 = await shotAt(".oaci-axes", 14);

  await page.click('[data-oaci-action="export"]');
  await page.waitForSelector("#download-pdf");
  if (process.env.OACI_CAPTURE_REPORT_DIR) {
    await mkdir(process.env.OACI_CAPTURE_REPORT_DIR, { recursive: true });
    for (const [selector, extension] of [["#download-pdf", "pdf"], ["#download-html", "html"]]) {
      const pending = page.waitForEvent("download");
      await page.click(selector);
      await (await pending).saveAs(path.join(process.env.OACI_CAPTURE_REPORT_DIR, `chrome-store-fixture-report.${extension}`));
    }
  }
  await page.setInputFiles("#prov-file", path.join(fixtures, "signed.jpg"));
  await page.waitForSelector(".prov", { timeout: 60_000 });
  const shot5 = await shotAt(null);

  const fontOutfit = await dataUri(path.join(dist, "assets/fonts/outfit-variable.woff2"), "font/woff2");
  const fontJakarta = await dataUri(path.join(dist, "assets/fonts/plus-jakarta-sans-latin.woff2"), "font/woff2");
  const mark = await dataUri(path.join(dist, "assets/icon-128.png"), "image/png");

  const composer = await context.newPage();
  const shots = [shot1, shot2, shot3, shot4, shot5];
  for (const [index, definition] of SHOTS.entries()) {
    const image = `data:image/png;base64,${shots[index].buffer.toString("base64")}`;
    await composer.setViewportSize({ width: 1280, height: 800 });
    await composer.setContent(await composite({ fontOutfit, fontJakarta, mark, image, ...definition }), { waitUntil: "load" });
    await composer.evaluate(() => document.fonts.ready);
    const raw = await composer.screenshot({ clip: { x: 0, y: 0, width: 1280, height: 800 } });
    /* The composer runs at a 2x device scale for crisp type; the store requires
       exactly 1280x800, so the capture is resampled to the required size. */
    await sharp(raw).resize(1280, 800, { fit: "fill", kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toFile(path.join(submission, "screenshots", definition.file));
  }

  for (const [file, width, height] of [["small-promo-440x280.png", 440, 280], ["marquee-promo-1400x560.png", 1400, 560]]) {
    await composer.setViewportSize({ width, height });
    await composer.setContent(await promo({ fontOutfit, fontJakarta, mark, width, height }), { waitUntil: "load" });
    await composer.evaluate(() => document.fonts.ready);
    const rawPromo = await composer.screenshot({ clip: { x: 0, y: 0, width, height } });
    await sharp(rawPromo).resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 }).png({ compressionLevel: 9 }).toFile(path.join(submission, "assets", file));
  }
  if (process.env.OACI_VERIFY_CACHE === "1") {
    const beforeReload = modelRequests.length;
    await page.goto(panelUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#download-meta")?.hidden === true, null, { timeout: 30_000 });
    await context.setOffline(true);
    await page.fill("#source", sample);
    await page.click("#inspect");
    await page.waitForSelector('[data-oaci-result][data-oaci-status="assessed"]', { timeout: 120_000 });
    const verification = {
      version: await page.evaluate(() => chrome.runtime.getManifest().version),
      reloadedPanel: true,
      scoredWhileOffline: true,
      publicRequestsAfterReload: modelRequests.length - beforeReload,
      cacheKeys: await page.evaluate(async () => (await (await caches.open("opace-content-integrity-cycle5-browser-2026-09-1")).keys()).map(request => request.url)),
    };
    if (verification.publicRequestsAfterReload !== 0 || verification.cacheKeys.length !== 3) throw new Error("The reopened Chrome panel did not restore all three verified assets without network requests.");
    if (process.env.OACI_CAPTURE_REPORT_DIR) await writeFile(path.join(process.env.OACI_CAPTURE_REPORT_DIR, "chrome-cache-verification.json"), `${JSON.stringify(verification, null, 2)}\n`);
    console.log(JSON.stringify(verification));
  }
  await context.close();

  await sharp(logoPath)
    .resize(128, 128, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(submission, "assets/icon-128.png"));

  const packagePath = path.join(submission, "package", `opace-ai-content-checker-detector-chrome-${JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8")).version}.zip`);
  const packageBytes = await readFile(packagePath);
  const manifest = {
    package: { path: path.relative(submission, packagePath).split(path.sep).join("/"), bytes: packageBytes.length, sha256: createHash("sha256").update(packageBytes).digest("hex") },
    assets: [
      await record("assets/icon-128.png", "The Opace AI Content Checker & Detector mark: a cyan magnifying glass around a navy field with an orange tick."),
      await record("assets/small-promo-440x280.png", "Opace AI Content Checker & Detector promotional tile on deep blue, with the approved product mark and the line AI detector for articles, selections and drafts.", "The product identity, with no detector-score or authorship claim."),
      await record("assets/marquee-promo-1400x560.png", "Wide Opace AI Content Checker & Detector marquee on deep blue, with the approved product mark, the name and the line Evidence, not guarantees.", "Evidence-led identity for the extension, describing the available on-device checks."),
    ],
    screenshots: await Promise.all(SHOTS.map((definition, index) => record(
      `screenshots/${definition.file}`,
      `${definition.title}. ${definition.body}`,
      [
        "Choose the exact text, then choose where it is read. Nothing runs until you decide.",
        "A five-band reading followed by measured writing observations and examples from the draft.",
        "A section row opens in place: the passage, the measured signals and any editing advice.",
        "Every named check, its status and limits, and what the result does not mean.",
        "Branded PDF and HTML reports, content-free receipts, and local Content Credentials.",
      ][index],
    ))),
  };
  await writeFile(path.join(submission, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

await main();
