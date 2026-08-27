import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../chrome");

test("built manifest is MV3, Chrome-only and minimum-permission", async () => {
  const manifest = JSON.parse(await readFile(path.join(root, "dist/manifest.json"), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, "AI Content Integrity Checker by Opace");
  assert.equal(manifest.version, "1.0.0");
  assert.equal(manifest.description.length, 130);
  assert.equal(manifest.minimum_chrome_version, "145");
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage", "sidePanel", "contextMenus", "clipboardWrite"]);
  assert.equal("host_permissions" in manifest, false);
  assert.equal("optional_host_permissions" in manifest, false);
  assert.equal(manifest.content_security_policy.extension_pages, "script-src 'self'; object-src 'none'");
  const popup = await readFile(path.join(root, "dist/popup/popup.html"), "utf8");
  assert.match(popup, /Selected, visible-article or pasted content is processed locally only after you choose an action\. Nothing is sent to Opace\./);
});

test("built files contain no remote code, telemetry, eval or source maps", async () => {
  const inventory = JSON.parse(await readFile(path.join(root, "BUILD-INVENTORY.json"), "utf8"));
  assert.ok(inventory.files.length >= 12);
  for (const item of inventory.files.filter(item => /\.(?:js|html|css|json)$/.test(item.path))) {
    const text = await readFile(path.join(root, "dist", item.path), "utf8");
    assert.doesNotMatch(text, /(?:https?:\/\/|wss?:\/\/|google-analytics|segment\.io|sentry|new Function\s*\(|\beval\s*\()/i, item.path);
    assert.doesNotMatch(text, /sourceMappingURL|<all_urls>|localhost|127\.0\.0\.1/i, item.path);
  }
});

test("capture validation exposes and clears an associated screen-reader error", async () => {
  const panel = await readFile(path.join(root, "dist/panel.js"), "utf8");
  assert.match(panel, /setAttribute\("aria-invalid",\s*"true"\)/);
  assert.match(panel, /setAttribute\("aria-describedby",\s*"count privacy capture-error"\)/);
  assert.match(panel, /removeAttribute\("aria-invalid"\)/);
  assert.match(panel, /setAttribute\("aria-describedby",\s*"count privacy"\)/);
  assert.match(panel, /capture-error[^>]*role=\\?"alert\\?"[^>]*tabindex=\\?"-1\\?"/);
});

test("capability declaration keeps history and network off", async () => {
  const capability = JSON.parse(await readFile(path.resolve(root, "../shared/capabilities.json"), "utf8"));
  assert.equal(capability.features.receipt_history, false);
  assert.equal(capability.features.loopback_pairing, false);
  assert.equal(capability.features.telemetry, false);
  assert.equal(capability.features.page_write_back, false);
  assert.deepEqual(capability.optional_host_permissions, []);
});

test("no later browser package exists", async () => {
  for (const browser of ["edge", "firefox", "safari"]) {
    await assert.rejects(() => readFile(path.resolve(root, `../${browser}/manifest.json`)));
  }
});
