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
const modelDir = process.env.OACI_MODEL_DIR ?? "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/public/models/local-signals-v1";
const chrome = process.env.OACI_CHROME ?? `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const heroPath = path.join(repo, "docs/assets/opace-ai-content-integrity-hero-v2.png");
const logoPath = path.join(repo, "docs/assets/opace-ai-content-integrity-logo-v2.png");
const fixtures = path.join(root, "tests/browser/fixtures");

const dataUri = async (file, mime) => `data:${mime};base64,${(await readFile(file)).toString("base64")}`;

const PANEL_WIDTH = 470;
const PANEL_HEIGHT = 700;

const SHOTS = [
  {
    file: "01-choose-the-text-and-route.png",
    kicker: "Step 1 · Capture",
    title: "You choose the text, and where it is read",
    body: "Selected text, the visible article or a paste. Then pick the full check on this device, the optional private EU route, or quick checks only. Nothing runs until you say so.",
  },
  {
    file: "02-the-reading-and-section-scores.png",
    kicker: "Step 2 · Inspect",
    title: "One clear reading, with every section scored",
    body: "A five-band dial, the level in plain words and a score bar for every section in document order. The score is a zero-to-one pattern reading, never a percentage of AI text.",
  },
  {
    file: "03-inside-a-section.png",
    kicker: "Evidence",
    title: "The passage the model read, in your own words",
    body: "Each section shows its exact passage and one measured signal: how often key words carry over between neighbouring sentences. Editing advice appears when the writing rules have any, and never counts towards the reading.",
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
  <div class="brand"><img src="${mark}" alt=""><div><p>Opace</p><strong>AI Content Integrity</strong></div></div>
  <p class="kicker">${kicker}</p>
  <h1>${title}</h1>
  <p class="body">${body}</p>
  <span class="tag">Evidence, not guarantees</span>
</div>
<div class="shot"><img src="${image}" alt=""></div>
`;

const promo = async ({ fontOutfit, fontJakarta, mark, width, height }) => `
<style>
@font-face{font-family:Outfit;src:url("${fontOutfit}") format("woff2");font-weight:400 900}
@font-face{font-family:"Plus Jakarta Sans";src:url("${fontJakarta}") format("woff2");font-weight:400 800}
*{box-sizing:border-box;margin:0}
body{width:${width}px;height:${height}px;display:flex;align-items:center;justify-content:center;gap:${width > 800 ? 46 : 22}px;padding:${width > 800 ? "0 92px" : "0 30px"};background:radial-gradient(circle at 16% 14%,#12376b 0%,#061a3c 48%,#041129 100%);color:#fff;font-family:"Plus Jakarta Sans",system-ui,sans-serif;overflow:hidden}
img{width:${width > 800 ? 168 : 92}px;height:${width > 800 ? 168 : 92}px;border-radius:${width > 800 ? 30 : 18}px;flex:none}
p.k{color:#38bdf8;font-size:${width > 800 ? 17 : 10}px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}
h1{margin:${width > 800 ? "12px 0 14px" : "7px 0 8px"};color:#fff;font:700 ${width > 800 ? 62 : 31}px/1.02 Outfit,sans-serif;letter-spacing:-.04em}
h1 span{color:#ffa64d}
p.s{color:#9fc6ef;font-size:${width > 800 ? 22 : 12}px;font-weight:700}
p.t{margin-top:${width > 800 ? 18 : 9}px;color:#c3d3e8;font-size:${width > 800 ? 18 : 10}px;line-height:1.5;max-width:${width > 800 ? 52 : 40}ch}
</style>
<img src="${mark}" alt="">
<div>
  <p class="k">Opace</p>
  <h1>AI Content <span>Integrity</span></h1>
  <p class="s">Evidence, not guarantees.</p>
  <p class="t">Check writing for AI patterns on your own device, or on Opace's EU server after you choose. Section-level evidence, branded reports and content-free receipts.</p>
</div>
`;

const record = async (relativePath, alt, caption) => {
  const absolute = path.join(submission, relativePath);
  const bytes = await readFile(absolute);
  const meta = await sharp(bytes).metadata();
  return { path: relativePath, width: meta.width, height: meta.height, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), alt, ...(caption ? { caption } : {}) };
};

async function main() {
  await mkdir(path.join(submission, "assets"), { recursive: true });
  await mkdir(path.join(submission, "screenshots"), { recursive: true });

  const digest = createHash("sha256").update(dist).digest("hex").slice(0, 32);
  const extensionId = [...digest].map((character) => String.fromCharCode(97 + Number.parseInt(character, 16))).join("");
  const context = await chromium.launchPersistentContext(path.join(process.env.TMPDIR ?? "/tmp", `oaci-store-${Date.now()}`), {
    headless: false,
    executablePath: chrome,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, "--no-first-run"],
    viewport: { width: PANEL_WIDTH, height: PANEL_HEIGHT },
    deviceScaleFactor: 2,
  });
  await context.route("https://opace.agency/models/local-signals-v1/**", async (routeRequest) => {
    const name = new URL(routeRequest.request().url()).pathname.split("/").pop();
    await routeRequest.fulfill({ status: 200, body: await readFile(path.join(modelDir, name)), headers: { "content-type": "application/octet-stream" } });
  });

  const page = await context.newPage();
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
  const shot3 = await shotAt(".oaci-dive", 14);
  await page.evaluate(() => { for (const element of document.querySelectorAll("details")) element.open = true; });
  const shot4 = await shotAt(".oaci-axes", 14);

  await page.click('[data-oaci-action="export"]');
  await page.waitForSelector("#download-pdf");
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
  await context.close();

  await sharp(logoPath)
    .extract({ left: 258, top: 118, width: 560, height: 560 })
    .resize(128, 128, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(submission, "assets/icon-128.png"));

  const packagePath = path.join(submission, "package", `opace-ai-content-integrity-chrome-${JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8")).version}.zip`);
  const packageBytes = await readFile(packagePath);
  const manifest = {
    package: { path: path.relative(submission, packagePath).split(path.sep).join("/"), bytes: packageBytes.length, sha256: createHash("sha256").update(packageBytes).digest("hex") },
    assets: [
      await record("assets/icon-128.png", "The Opace AI Content Integrity mark: a document with a checklist and an orange approval tick."),
      await record("assets/small-promo-440x280.png", "Opace AI Content Integrity promotional tile on deep blue, with the product mark and the line Evidence, not guarantees.", "The product identity, with no detector-score or authorship claim."),
      await record("assets/marquee-promo-1400x560.png", "Wide Opace AI Content Integrity marquee on deep blue, with the product mark, the name and the line Evidence, not guarantees.", "Evidence-led identity for the extension, with the on-device and optional EU routes named."),
    ],
    screenshots: await Promise.all(SHOTS.map((definition, index) => record(
      `screenshots/${definition.file}`,
      `${definition.title}. ${definition.body}`,
      [
        "Choose the exact text, then choose where it is read. Nothing runs until you decide.",
        "A five-band reading, the level in plain words and a score for every section.",
        "Every section shows its own passage, one measured signal and editing advice.",
        "Every named check, its status and limits, and what the result does not mean.",
        "Branded PDF and HTML reports, content-free receipts, and local Content Credentials.",
      ][index],
    ))),
  };
  await writeFile(path.join(submission, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

await main();
