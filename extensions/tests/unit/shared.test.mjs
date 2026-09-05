import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "../../chrome");
const readDist = (file) => readFile(path.join(root, "dist", file), "utf8");

const OPTIONAL_HOSTS = ["https://opace-detector-877422072168.europe-west1.run.app/*", "https://*/*", "http://*/*"];

test("built manifest is MV3, Chrome-only and minimum-permission", async () => {
  const manifest = JSON.parse(await readDist("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "Opace AI Content Checker & Detector");
  assert.equal(manifest.short_name, "AI Content Checker");
  assert.equal(manifest.version, "1.2.3");
  const fields = JSON.parse(await readFile(path.join(root, '../submission/chrome-web-store/field-values.json'), 'utf8'));
  assert.equal(manifest.description, fields.summary);
  assert.ok(manifest.description.length <= 132);
  assert.equal(manifest.minimum_chrome_version, "145");
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage", "sidePanel", "contextMenus", "clipboardWrite"]);
  assert.equal("host_permissions" in manifest, false);
  assert.deepEqual(manifest.optional_host_permissions, OPTIONAL_HOSTS);
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'");
});

test("the toolbar click opens the side panel itself, so it carries the activeTab grant", async () => {
  const manifest = JSON.parse(await readDist("manifest.json"));
  assert.equal("default_popup" in manifest.action, false);
  assert.equal(manifest.action.default_title, "Open Opace AI Content Checker & Detector");
  assert.equal(manifest.side_panel.default_path, "sidepanel.html");
  const worker = await readDist("background.js");
  assert.match(worker, /openPanelOnActionClick: false/u);
  assert.match(worker, /action\.onClicked\.addListener/u);
  let onAction;
  const opened = [];
  const chrome = {
    runtime: { onInstalled: { addListener() {} }, onMessage: { addListener() {} } },
    contextMenus: { onClicked: { addListener() {} } },
    action: { onClicked: { addListener(callback) { onAction = callback; } } },
    sidePanel: { setPanelBehavior(options) { assert.equal(options.openPanelOnActionClick, false); return Promise.resolve(); }, open(options) { opened.push(options.tabId); return Promise.resolve(); } },
  };
  vm.runInNewContext(worker, { chrome });
  onAction({ id: 17 });
  onAction({});
  assert.deepEqual(opened, [17], "an explicit native extension action opens only its own tab");
  assert.match(worker, /Check selection with Opace AI Content Checker & Detector/u);
  await assert.rejects(() => readDist("popup/popup.html"), "the retired popup is still packaged");
});

test("the panel offers Chrome's per-site prompt rather than a standing host permission", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /permissions\.request/u);
  assert.match(panel, /permissions\.contains/u);
  assert.match(panel, /Chrome will ask once to let this extension read text on/u);
  assert.match(panel, /Allowing it covers that one site and no other/u);
  assert.match(panel, /take it back at any time from chrome:\/\/extensions/u);
  assert.match(panel, /Permission was not given/u);
  /* Honest states for the pages no permission can ever open. */
  assert.match(panel, /pages closed to every extension/u);
  assert.match(panel, /Chrome does not let any extension read the Chrome Web Store/u);
  assert.match(panel, /built-in PDF viewer does not hand its text to extensions/u);
  /* The origin is built from the tab in front of the user; no wildcard pattern
     is ever requested from the panel. */
  assert.doesNotMatch(panel, /<all_urls>/u);
  assert.doesNotMatch(panel, /origins:\s*\[\s*"https?:\/\/\*/u);
  /* A Chrome match pattern has no port. Building the request from `url.origin`
     produces `http://127.0.0.1:8931/*`, which Chrome rejects outright, so the
     local WordPress page could never be allowed. */
  assert.match(panel, /\$\{[a-zA-Z_$][\w$]*\.protocol\}\/\/\$\{[a-zA-Z_$][\w$]*\.hostname\}\/\*/u);
  assert.doesNotMatch(panel, /\$\{[a-zA-Z_$][\w$]*\.origin\}\/\*/u);
  /* Chrome hides the address of a tab it has given no access to, so the panel
     has to say that rather than invent a site to ask about. */
  assert.match(panel, /Allow this page to be read/u);
  assert.match(panel, /addHostAccessRequest\(\{ tabId:/u);
  assert.match(panel, /Ask Chrome for access to this site/u);
  assert.match(panel, /request allows this site until you remove access/u);
  assert.match(panel, /Selected text/u);
});

test("the on-device consent is the primary button, with the size and fingerprint beside it", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /Download model and check/u);
  assert.match(panel, /Check this text/u);
  assert.match(panel, /Pressing the button downloads the model/u);
  assert.match(panel, /The model is already on this device/u);
  assert.match(panel, /CYCLE5_MODEL_DOWNLOAD_LABEL\}\s*·\s*SHA-256|MODEL_DOWNLOAD_LABEL/u);
  /* The tick box is gone: nothing may ask the reader to tick before checking. */
  assert.doesNotMatch(panel, /model-consent/u);
  assert.doesNotMatch(panel, /Tick the download box/u);
});

test("built files contain no remote code, telemetry, eval or source maps outside the fixed model and support destinations", async () => {
  const inventory = JSON.parse(await readFile(path.join(root, "BUILD-INVENTORY.json"), "utf8"));
  assert.equal(inventory.version, "1.2.3");
  assert.ok(inventory.files.length >= 20);
  for (const item of inventory.files.filter((item) => /\.(?:js|html|css|json)$/.test(item.path))) {
    const text = await readDist(item.path);
    /* The two optional wildcard patterns are declarations Chrome reads, not
       addresses anything fetches, and they exist only in the manifest. They
       are removed here so the scan below still sees every real URL. */
    if (item.path === "manifest.json") {
      const manifest = JSON.parse(text);
      assert.deepEqual(manifest.optional_host_permissions, OPTIONAL_HOSTS);
      assert.equal("host_permissions" in manifest, false);
    }
    const withoutApprovedReferences = (item.path === "manifest.json" ? text.replaceAll('"https://*/*",', "").replaceAll('"http://*/*"', "") : text)
      .replaceAll("https://opace.agency/models/local-signals-v1/", "")
      .replaceAll("https://opace.agency/tools/ai/content-verification-integrity/", "")
      .replaceAll("https://opace-detector-877422072168.europe-west1.run.app", "")
      /* onnxruntime-web prints this documentation URL inside a cross-origin-isolation
         warning string. It is a message, never a fetch: no code path requests it. */
      .replaceAll("https://web.dev/cross-origin-isolation-guide/", "")
      /* The share sheet's four destinations. Each is the `href` of a link the
         reader clicks; nothing in the package requests any of them, and the
         assertion below holds them to `panel.js` and to that shape. */
      .replaceAll("https://www.linkedin.com/sharing/share-offsite/?url=", "")
      .replaceAll("https://www.facebook.com/sharer/sharer.php?u=", "")
      .replaceAll("https://twitter.com/intent/tweet?text=", "")
      .replaceAll("https://wa.me/?text=", "");
    assert.doesNotMatch(withoutApprovedReferences, /(?:https?:\/\/|wss?:\/\/|google-analytics|segment\.io|sentry|new Function\s*\(|\beval\s*\()/i, item.path);
    assert.doesNotMatch(text, /sourceMappingURL|<all_urls>|localhost|127\.0\.0\.1/i, item.path);
    /* No file but the panel may name a share destination at all. */
    if (item.path !== "panel.js") assert.doesNotMatch(text, /linkedin|facebook|twitter\.com|wa\.me/i, item.path);
  }
});

test("the share destinations are links the reader clicks, never something the package requests", async () => {
  const panel = await readDist("panel.js");
  const destinations = [
    "https://www.linkedin.com/sharing/share-offsite/?url=",
    "https://www.facebook.com/sharer/sharer.php?u=",
    "https://twitter.com/intent/tweet?text=",
    "https://wa.me/?text=",
  ];
  for (const destination of destinations) {
    assert.equal(panel.split(destination).length - 1, 1, `${destination} appears more than once`);
    /* Each one is built into a template string and handed to an anchor. A
       fetch, a beacon or a socket to any of them would fail this. */
    const around = panel.slice(Math.max(0, panel.indexOf(destination) - 200), panel.indexOf(destination) + 200);
    assert.doesNotMatch(around, /fetch\s*\(|sendBeacon|XMLHttpRequest|new WebSocket/u, destination);
  }
  assert.match(panel, /Only the reading summary and result link are shared/u);
});

test("the shipped model base is the fixed Opace host and no test mirror leaked into the build", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /https:\/\/opace\.agency\/models\/local-signals-v1\//u);
  assert.doesNotMatch(panel, /http:\/\//u);
});

test("capture validation exposes and clears an associated screen-reader error", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /setAttribute\("aria-invalid",\s*"true"\)/);
  assert.match(panel, /setAttribute\("aria-describedby",\s*"count privacy capture-error"\)/);
  assert.match(panel, /removeAttribute\("aria-invalid"\)/);
  assert.match(panel, /setAttribute\("aria-describedby",\s*"count privacy"\)/);
  assert.match(panel, /capture-error[^>]*role=\\?"alert\\?"[^>]*tabindex=\\?"-1\\?"/);
});

test("the bundled shared renderer carries the website's gauge, section bars, deep dives and honesty panels", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /data-oaci-result/u);
  assert.match(panel, /data-oaci-section-toggle/u);
  assert.match(panel, /Three separate readings/u);
  assert.match(panel, /Section scores/u);
  assert.match(panel, /Inside section/u);
  assert.match(panel, /An example of word re-use in this passage/u);
  assert.match(panel, /What this means/u);
  assert.match(panel, /What this does not mean/u);
  assert.match(panel, /Score and calibration details/u);
  assert.match(panel, /Run record/u);
  assert.match(panel, /Named checks/u);
  assert.match(panel, /zero-to-one/u);
  assert.match(panel, /No result proves/u);
  assert.match(panel, /It does not prove who wrote the draft/u);
  const css = await readDist("checker-ui.css");
  assert.match(css, /\.oaci-result/u);
  assert.match(css, /\.oaci-dial/u);
});

test("the panel fails closed when no trained model ran", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /No trained model ran/u);
  assert.match(panel, /Character findings and writing rules cannot supply an AI-pattern reading/u);
  assert.match(panel, /Not assessed/u);
  assert.match(panel, /That is too short to score/u);
  assert.match(panel, /You appear to be offline/u);
  assert.match(panel, /The model files did not match/u);
  assert.match(panel, /The EU service is not available yet/u);
});

test("both website routes plus the deterministic subset are offered with honest EU copy", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /On this device/u);
  assert.match(panel, /Private EU analysis/u);
  assert.match(panel, /Not available yet/u);
  assert.match(panel, /Quick checks only/u);
  assert.match(panel, /scored in memory in Belgium/u);
  assert.match(panel, /requestChromeServicePermission|chrome\/challenge/u);
  assert.match(panel, /x-opace-chrome-token/u);
  assert.match(panel, /chrome-extension-v1/u);
  assert.match(panel, /tier3-cycle5-v1/u);
  assert.match(panel, /runtime\/ort-wasm-simd-threaded\.wasm/u);
});

test("exports offer the branded PDF, complete report, content-free receipts, share and file provenance", async () => {
  const panel = await readDist("panel.js");
  assert.match(panel, /oaci-provenance-report:1/u);
  assert.match(panel, /%PDF-1\.4/u);
  assert.match(panel, /Branded PDF report/u);
  assert.match(panel, /Complete HTML report/u);
  assert.match(panel, /Result receipt \(JSON, content-free\)/u);
  assert.match(panel, /Check receipt \(JSON, content-free\)/u);
  assert.match(panel, /Copy share summary/u);
  assert.match(panel, /Check a file's Content Credentials/u);
  assert.match(panel, /runtime\/c2pa\/index\.js/u);
  assert.match(panel, /Clear everything stored/u);
  assert.match(panel, /Files you have already downloaded are still on your computer/u);
});

test("build packages exact WASM, C2PA runtime, fonts and logo derivatives with only the exact optional service origin", async () => {
  const manifest = JSON.parse(await readDist("manifest.json"));
  const inventory = JSON.parse(await readFile(path.join(root, "BUILD-INVENTORY.json"), "utf8"));
  assert.equal("host_permissions" in manifest, false);
  assert.deepEqual(manifest.optional_host_permissions, OPTIONAL_HOSTS);
  const byPath = Object.fromEntries(inventory.files.map((item) => [item.path, item]));
  assert.deepEqual(byPath["runtime/ort-wasm-simd-threaded.wasm"], { path: "runtime/ort-wasm-simd-threaded.wasm", bytes: 13_961_845, sha256: "ec8580a9d7b9476ceee52e10a7f94124e4dc71a019d666ed6d4726697c109a4d" });
  assert.equal(byPath["runtime/c2pa/c2pa_bg.wasm"].sha256, "2e27f91fe1e50999ac1407472d411d1247c53c32788595c37c7abfdd19988b6d");
  assert.equal(byPath["assets/fonts/outfit-variable.woff2"].sha256, "92684e4acde79ef07758cd09380b7e01e9824d8b061eddeda046f78c166d7b12");
  assert.equal(byPath["assets/fonts/plus-jakarta-sans-latin.woff2"].sha256, "153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79");
  const fontBytes = byPath["assets/fonts/outfit-variable.woff2"].bytes + byPath["assets/fonts/plus-jakarta-sans-latin.woff2"].bytes;
  assert.ok(fontBytes < 250_000, `packaged fonts are ${fontBytes} bytes`);
  assert.ok(byPath["assets/fonts/LICENCES.txt"].bytes > 3_000);
  assert.equal(byPath["assets/icon-16.png"].bytes > 400, true);
  assert.equal(byPath["assets/icon-128.png"].bytes > 10_000, true);
  /* Nothing may ship that the build did not just write: the bundle is rebuilt
     from empty, so an orphan such as the old `assets/report-logo.jpg` cannot
     survive into the package again. */
  assert.equal("assets/report-logo.jpg" in byPath, false);
  assert.notEqual(byPath["assets/icon-128.png"].sha256, "261ad6f416626ad874781b7f9d90a008cc3109e138a901c66a4b94a1b0126344");
  const canonical = await readFile(path.resolve(root, "../../docs/assets/opace-ai-checker-chrome-mark-v4.png"));
  assert.equal(createHash("sha256").update(canonical).digest("hex"), "042c37cdfd175cc6f529644f927fc6830e1589a6c29a84e2163cdd5f95b2e38d");
});

test("the panel stylesheet uses the website's tokens, fonts and five bands with a system fallback", async () => {
  const css = await readDist("panel.css");
  assert.match(css, /--paper:#f2ede6/u);
  assert.match(css, /--orange:#fb700a/u);
  assert.match(css, /--blue:#0068b3/u);
  assert.match(css, /assets\/fonts\/outfit-variable\.woff2/u);
  assert.match(css, /assets\/fonts\/plus-jakarta-sans-latin\.woff2/u);
  assert.match(css, /--font-display:Outfit,"Segoe UI",system-ui/u);
  assert.match(css, /--font-body:"Plus Jakarta Sans","Segoe UI",system-ui/u);
  for (const band of ["--band-human", "--band-unclear", "--band-potential", "--band-likely", "--band-strong"]) {
    assert.match(css, new RegExp(`${band}:#`, "u"), band);
  }
  assert.match(css, /prefers-reduced-motion:reduce/u);
  assert.match(css, /forced-colors:active/u);
});

test("capability declaration keeps history off and the server service unavailable by default", async () => {
  const capability = JSON.parse(await readFile(path.resolve(root, "../shared/capabilities.json"), "utf8"));
  assert.equal(capability.version, "1.2.3");
  assert.equal(capability.features.receipt_history, false);
  assert.equal(capability.features.loopback_pairing, false);
  assert.equal(capability.features.telemetry, false);
  assert.equal(capability.features.page_write_back, false);
  assert.deepEqual(capability.optional_host_permissions, OPTIONAL_HOSTS);
  assert.equal(capability.features.on_device_cycle5, true);
  assert.equal(capability.features.eu_server_opt_in, true);
  assert.equal(capability.features.eu_server_live, false);
  assert.equal(capability.features.local_c2pa_file_inspection, true);
  assert.equal(capability.features.generated_pdf_report, true);
  assert.equal(capability.features.content_free_share, true);
});

test("the approved product name is carried by every place that states it", async () => {
  /* The owner approved these exact strings on 3 September 2026: the Store name
     and manifest `name`, the short name Chrome shows under the icon, and the
     package file name. A rename that lands in one place and not another is how
     a listing and its archive stop agreeing, which is a moderation rejection. */
  const NAME = "Opace AI Content Checker & Detector";
  const SHORT = "AI Content Checker";
  const manifest = JSON.parse(await readDist("manifest.json"));
  assert.equal(manifest.name, NAME);
  assert.equal(manifest.short_name, SHORT);
  const capability = JSON.parse(await readFile(path.resolve(root, "../shared/capabilities.json"), "utf8"));
  assert.equal(capability.product, NAME);
  const fields = JSON.parse(await readFile(path.resolve(root, "../submission/chrome-web-store/field-values.json"), "utf8"));
  assert.equal(fields.name, NAME);
  assert.equal(fields.version, manifest.version);
  assert.equal(fields.summary, manifest.description);
  assert.ok(fields.summary.length <= 132, `summary is ${fields.summary.length} characters`);
  const assets = JSON.parse(await readFile(path.resolve(root, "../submission/chrome-web-store/asset-manifest.json"), "utf8"));
  assert.equal(assets.package.path, `package/opace-ai-content-checker-detector-chrome-${manifest.version}.zip`);
  /* The panel's own surfaces carry the same name, and the retired one is gone
     from every shipped byte. */
  const panelHtml = await readDist("sidepanel.html");
  assert.match(panelHtml, /<title>Opace AI Content Checker &amp; Detector<\/title>/u);
  assert.match(panelHtml, /<strong>Opace AI Content Checker<\/strong>/u);
  /* The retired name is gone from every shipped byte, the bundled Cycle-5
     runtime included. It briefly survived in that runtime's `product_identity`
     field while its generated `dist/` lagged its own renamed source; the
     packages lane rebuilt it on 4 September 2026, so the narrow exemption this
     test carried for a few hours is gone with it. */
  for (const file of ["manifest.json", "sidepanel.html", "panel.js", "background.js", "panel.css"]) {
    assert.doesNotMatch(await readDist(file), /AI Content Integrity/u, file);
  }
});

test("no later browser package exists", async () => {
  for (const browser of ["edge", "firefox", "safari"]) {
    await assert.rejects(() => readFile(path.resolve(root, `../${browser}/manifest.json`)));
  }
});
