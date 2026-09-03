import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const fields = JSON.parse(readFileSync(join(root, "field-values.json"), "utf8"));
const assets = JSON.parse(readFileSync(join(root, "asset-manifest.json"), "utf8"));
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function pngDimensions(path) {
  const bytes = readFileSync(path);
  check(bytes.subarray(1, 4).toString("ascii") === "PNG", `${path} is not a PNG`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function validateFile(entry) {
  const path = join(root, entry.path);
  check(statSync(path).size === entry.bytes, `${entry.path} byte count changed`);
  check(sha256(path) === entry.sha256, `${entry.path} SHA-256 changed`);
  const dimensions = pngDimensions(path);
  check(dimensions.width === entry.width && dimensions.height === entry.height, `${entry.path} dimensions changed`);
}

check(fields.summary.length === fields.summary_characters, "summary character count is stale");
check(fields.summary.length <= 132, "summary exceeds Chrome Web Store 132-character limit");
check(fields.version === "1.1.1", "dashboard version is not 1.1.1");
check(fields.data_types.length === 1 && fields.data_types[0] === "Website content", "data-type disclosure drifted");
check(fields.data_uses.length === 1 && fields.data_uses[0] === "Application functionality", "data-use disclosure drifted");

const packagePath = join(root, assets.package.path);
check(statSync(packagePath).size === assets.package.bytes, "package byte count changed");
check(sha256(packagePath) === assets.package.sha256, "package SHA-256 changed");
for (const entry of [...assets.assets, ...assets.screenshots]) validateFile(entry);

const archiveFiles = execFileSync("unzip", ["-Z1", packagePath], { encoding: "utf8" }).trim().split("\n");
check(archiveFiles.length === 27, `package has ${archiveFiles.length} files instead of 27`);
const required = [
  "manifest.json", "sidepanel.html", "panel.js", "panel.css", "checker-ui.css",
  "assets/icon-128.png", "assets/fonts/outfit-variable.woff2", "assets/fonts/plus-jakarta-sans-latin.woff2",
  "assets/fonts/LICENCES.txt", "runtime/ort-wasm-simd-threaded.wasm", "runtime/c2pa/c2pa_bg.wasm",
  "runtime/c2pa/index.js", "runtime/c2pa/SOURCE-BUILD-NOTICE.txt",
];
for (const entry of required) check(archiveFiles.includes(entry), `package is missing ${entry}`);
check(!archiveFiles.some((path) => path.startsWith("tests/") || path.startsWith("evidence/")), "package contains test or evidence files");
/* The action opens the side panel directly, so there is no popup to package,
   and the build now writes `dist/` from empty so no orphan can ride along. */
check(!archiveFiles.some((path) => path.startsWith("popup/")), "package still contains the retired popup");
check(!archiveFiles.includes("assets/report-logo.jpg"), "package still contains the orphaned report logo");
check(archiveFiles.every((path) => path && !path.startsWith("/") && !path.split("/").includes("..")), "package contains an unsafe path");
check(archiveFiles.every((path) => !path.endsWith(".map") && !path.startsWith("__MACOSX/") && !path.endsWith(".DS_Store")), "package contains development metadata");

const extraction = mkdtempSync(join(tmpdir(), "opace-cws-"));
try {
  execFileSync("unzip", ["-qq", packagePath, "-d", extraction]);
  const manifest = JSON.parse(readFileSync(join(extraction, "manifest.json"), "utf8"));
  check(manifest.manifest_version === 3, "manifest is not MV3");
  check(manifest.name === fields.name, "manifest/listing name mismatch");
  check(manifest.version === fields.version, "manifest/listing version mismatch");
  check(manifest.description === fields.summary, "manifest/listing summary mismatch");
  check(JSON.stringify(manifest.permissions) === JSON.stringify(["activeTab", "scripting", "storage", "sidePanel", "contextMenus", "clipboardWrite"]), "permission set or order changed");
  check(!manifest.host_permissions, "standing host permissions are present");
  check(JSON.stringify(manifest.optional_host_permissions) === JSON.stringify(["https://opace-detector-877422072168.europe-west1.run.app/*", "https://*/*", "http://*/*"]), "the optional origin set is missing or changed");
  /* Optional means optional: none of these is granted at install, and the panel
     asks for one exact origin at a time, only when the reader presses a button. */
  check(manifest.action && !("default_popup" in manifest.action), "the action declares a popup, which would swallow the activeTab grant");
  check(manifest.short_name === "AI Content Integrity", "the side-panel short name is not the product name");

  /* The two optional wildcard patterns are declarations Chrome reads, not
     addresses anything fetches, and they appear only in the manifest. They are
     removed before the endpoint scan so every real URL is still caught. */
  const runtimeText = archiveFiles
    .filter((path) => /\.(?:js|html|css|json)$/.test(path))
    .map((path) => {
      const text = readFileSync(join(extraction, path), "utf8");
      return path === "manifest.json" ? text.replaceAll('"https://*/*",', "").replaceAll('"http://*/*"', "") : text;
    })
    .join("\n");
  const endpoints = [...runtimeText.matchAll(/https?:\/\/[^\s"'`)]+/giu)].map((match) => match[0]);
  check(endpoints.every((endpoint) => endpoint.startsWith("https://opace-detector-877422072168.europe-west1.run.app") || endpoint.startsWith("https://opace.agency/models/local-signals-v1/") || endpoint.startsWith("https://opace.agency/tools/ai/content-verification-integrity/") || endpoint.startsWith("https://web.dev/cross-origin-isolation-guide/")), "runtime contains an undeclared external URL");
  /* Dynamic code execution means a real constructor call. The audited Content
     Credentials runtime builds the debug string `Function(name)` when it
     describes a value; that literal is text, not a call site. */
  check(!/\bnew\s+Function\s*\(|\beval\s*\(|\bnew\s+AsyncFunction\s*\(/.test(runtimeText), "runtime contains dynamic code execution");
  check(!/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(runtimeText), "runtime contains a loopback endpoint");
  check(!/(?:\/Users\/|\\Users\\|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/.test(runtimeText), "runtime contains a local path or private key marker");

  /* The listing must not promise a capability the package lacks, and must not
     hide one it has. Each phrase below is checked against the packaged bytes. */
  const promises = [
    ["Branded PDF report", "the branded PDF report"],
    ["Complete HTML report", "the complete HTML report"],
    ["Result receipt (JSON, content-free)", "the content-free result receipt"],
    ["Copy share summary", "the content-free share summary"],
    ["Check a file's Content Credentials", "the local file Content Credentials workflow"],
    ["Private EU analysis", "the optional EU route"],
    ["Not available yet", "the honest EU-unavailable state"],
    ["On this device", "the on-device route"],
    ["Quick checks only", "the deterministic subset route"],
    ["Clear everything stored", "the clear-data control"],
    ["Download model and check", "the on-device download button that carries the consent"],
    ["Chrome will ask once to let this extension read text on", "the per-site page-reading notice shown before Chrome's own prompt"],
  ];
  for (const [phrase, described] of promises) {
    check(runtimeText.includes(phrase), `the package does not contain ${described} the listing describes`);
  }
  check(!/receipt_history\s*:\s*true/.test(runtimeText), "receipt history is enabled in the package");
} finally {
  rmSync(extraction, { recursive: true, force: true });
}

check(readdirSync(join(root, "screenshots")).filter((name) => name.endsWith(".png")).length === 5, "screenshot set is not exactly five PNGs");
for (const entry of assets.screenshots) check(entry.width === 1280 && entry.height === 800, `${entry.path} is not 1280x800`);
check(assets.assets.some((entry) => entry.path.endsWith("icon-128.png") && entry.width === 128 && entry.height === 128), "the store icon is not 128x128");
check(assets.assets.some((entry) => entry.path.endsWith("small-promo-440x280.png") && entry.width === 440 && entry.height === 280), "the small promotional image is not 440x280");
check(assets.assets.some((entry) => entry.path.endsWith("marquee-promo-1400x560.png") && entry.width === 1400 && entry.height === 560), "the marquee image is not 1400x560");

/* The retired 1-2-3 placeholder mark must not reappear in any listing image. */
const retired = new Set([
  "261ad69c8c6437b15cc928fef6460c4fe8548f21d3fd4144dbaffa7c03c77014",
  "42b9df11db43757b157402d91e6e2e6f7e56ab9508f9163c4ab0a95ab362be5c",
  "0424360b7f67296e47efae28cc5921ada88a56f44479928308f560d9cde3c3ab",
]);
for (const entry of [...assets.assets, ...assets.screenshots]) check(!retired.has(entry.sha256), `${entry.path} is still the retired placeholder image`);

const listing = readFileSync(join(root, "store-listing.md"), "utf8");
check(listing.includes("- Version: `1.1.1`"), "the listing copy is not at 1.1.1");
check(listing.includes(fields.summary), "the listing summary does not match field-values.json");
check(!/\b(?:100%|guarantee[sd]?\b|proves that|certainly written)/i.test(listing), "the listing makes an absolute or guarantee claim");

if (failures.length) {
  console.error(`FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: Chrome Web Store bundle metadata, archive, disclosures and 8 image assets are internally consistent.");
console.log(`Package SHA-256: ${assets.package.sha256}`);
console.log(`Summary: ${fields.summary.length}/132 characters; archive: ${archiveFiles.length} files; screenshots: 5 at 1280x800.`);
