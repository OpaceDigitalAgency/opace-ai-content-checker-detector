import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../chrome");
const readDist = (file) => readFile(path.join(root, "dist", file), "utf8");

test("built manifest is MV3, Chrome-only and minimum-permission", async () => {
  const manifest = JSON.parse(await readDist("manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "AI Content Integrity Checker by Opace");
  assert.equal(manifest.version, "1.1.0");
  assert.equal(manifest.description.length, 127);
  assert.equal(manifest.minimum_chrome_version, "145");
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage", "sidePanel", "contextMenus", "clipboardWrite"]);
  assert.equal("host_permissions" in manifest, false);
  assert.deepEqual(manifest.optional_host_permissions, ["https://opace-detector-877422072168.europe-west1.run.app/*"]);
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'");
  const popup = await readDist("popup/popup.html");
  assert.match(popup, /choose deterministic, on-device Cycle-5, or an optional Opace EU-service route before anything runs/u);
  assert.match(popup, /Not available yet/u);
});

test("built files contain no remote code, telemetry, eval or source maps outside the fixed model and support destinations", async () => {
  const inventory = JSON.parse(await readFile(path.join(root, "BUILD-INVENTORY.json"), "utf8"));
  assert.equal(inventory.version, "1.1.0");
  assert.ok(inventory.files.length >= 20);
  for (const item of inventory.files.filter((item) => /\.(?:js|html|css|json)$/.test(item.path))) {
    const text = await readDist(item.path);
    const withoutApprovedReferences = text
      .replaceAll("https://opace.agency/models/local-signals-v1/", "")
      .replaceAll("https://opace.agency/tools/ai/content-verification-integrity/", "")
      .replaceAll("https://opace-detector-877422072168.europe-west1.run.app", "")
      /* onnxruntime-web prints this documentation URL inside a cross-origin-isolation
         warning string. It is a message, never a fetch: no code path requests it. */
      .replaceAll("https://web.dev/cross-origin-isolation-guide/", "");
    assert.doesNotMatch(withoutApprovedReferences, /(?:https?:\/\/|wss?:\/\/|google-analytics|segment\.io|sentry|new Function\s*\(|\beval\s*\()/i, item.path);
    assert.doesNotMatch(text, /sourceMappingURL|<all_urls>|localhost|127\.0\.0\.1/i, item.path);
  }
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
  assert.match(panel, /The tell, in your own sentences/u);
  assert.match(panel, /What this means/u);
  assert.match(panel, /What this does not mean/u);
  assert.match(panel, /How certain is this reading\?/u);
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
  assert.deepEqual(manifest.optional_host_permissions, ["https://opace-detector-877422072168.europe-west1.run.app/*"]);
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
  assert.ok(byPath["assets/report-logo.jpg"].bytes > 3_000);
  assert.notEqual(byPath["assets/icon-128.png"].sha256, "261ad6f416626ad874781b7f9d90a008cc3109e138a901c66a4b94a1b0126344");
  const canonical = await readFile(path.resolve(root, "../../docs/assets/opace-ai-content-integrity-logo-v2.png"));
  assert.equal(createHash("sha256").update(canonical).digest("hex"), "9117f9d4527b103f8d527b9edf297b0b32876c293a0ce27983dee4bc557c1f74");
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
  assert.equal(capability.version, "1.1.0");
  assert.equal(capability.features.receipt_history, false);
  assert.equal(capability.features.loopback_pairing, false);
  assert.equal(capability.features.telemetry, false);
  assert.equal(capability.features.page_write_back, false);
  assert.deepEqual(capability.optional_host_permissions, ["https://opace-detector-877422072168.europe-west1.run.app/*"]);
  assert.equal(capability.features.on_device_cycle5, true);
  assert.equal(capability.features.eu_server_opt_in, true);
  assert.equal(capability.features.eu_server_live, false);
  assert.equal(capability.features.local_c2pa_file_inspection, true);
  assert.equal(capability.features.generated_pdf_report, true);
  assert.equal(capability.features.content_free_share, true);
});

test("no later browser package exists", async () => {
  for (const browser of ["edge", "firefox", "safari"]) {
    await assert.rejects(() => readFile(path.resolve(root, `../${browser}/manifest.json`)));
  }
});
