import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "dist");
const shared = path.resolve(root, "../shared/capabilities.json");
const canonicalLogo = path.resolve(root, "../../docs/assets/opace-ai-checker-chrome-mark-v4.png");
const cycle5Wasm = path.resolve(root, "../../packages/cycle5-browser/node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm");
const fontSource = path.join(root, "assets/fonts");
const fontFiles = Object.freeze({
  "outfit-variable.woff2": "92684e4acde79ef07758cd09380b7e01e9824d8b061eddeda046f78c166d7b12",
  "plus-jakarta-sans-latin.woff2": "153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79"
});
const FONT_BUDGET_BYTES = 250_000;

/**
 * A local mirror of the pinned model assets, used only for testing. The shipped
 * default is always the fixed Opace host; an unset variable emits an empty
 * string so no extra origin ever reaches a packaged build.
 */
const testModelBase = process.env.OACI_TEST_MODEL_BASE ?? "";
if (testModelBase && !/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+\/[\w./-]*$/u.test(testModelBase)) {
  throw new Error("OACI_TEST_MODEL_BASE must be a loopback URL ending in a path, or unset.");
}

/* The bundle is rebuilt from empty every time. A file left behind by an earlier
   build is a file that ships without anything referencing it, which is how
   `assets/report-logo.jpg` reached the 1.1.0 package. */
await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "assets/fonts"), { recursive: true });
await mkdir(path.join(dist, "content"), { recursive: true });
await mkdir(path.join(dist, "runtime"), { recursive: true });

const capabilities = JSON.parse(await readFile(shared, "utf8"));
const manifest = {
  manifest_version: 3,
  name: capabilities.product,
  short_name: "AI Content Checker",
  version: capabilities.version,
  description: "Free AI content checker and AI detector for ChatGPT, Claude and Gemini text. Runs on your device or Opace's EU server.",
  minimum_chrome_version: capabilities.minimum_chrome_version,
  permissions: capabilities.permissions,
  background: { service_worker: "background.js", type: "module" },
  /* No `default_popup`: a popup would swallow the action click, so the side
     panel would open without the activeTab grant the click carries. The worker
     sets `openPanelOnActionClick`, and the click opens the panel on the tab the
     user is looking at. */
  action: { default_title: "Open Opace AI Content Checker & Detector" },
  side_panel: { default_path: "sidepanel.html" },
  icons: { "16": "assets/icon-16.png", "32": "assets/icon-32.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" },
  content_security_policy: { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'none'" }
};
if (capabilities.optional_host_permissions.length) manifest.optional_host_permissions = capabilities.optional_host_permissions;
await writeFile(path.join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const common = { bundle: true, format: "esm", platform: "browser", target: "chrome145", sourcemap: false, legalComments: "none", logLevel: "warning" };
await Promise.all([
  build({ ...common, entryPoints: [path.join(root, "src/background.ts")], outfile: path.join(dist, "background.js") }),
  build({ ...common, define: { __OACI_MODEL_BASE__: JSON.stringify(testModelBase) }, entryPoints: [path.join(root, "src/panel.ts")], outfile: path.join(dist, "panel.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/eu-pow-worker.ts")], outfile: path.join(dist, "eu-pow-worker.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/extract-selection.ts")], outfile: path.join(dist, "content/extract-selection.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/extract-article.ts")], outfile: path.join(dist, "content/extract-article.js") }),
  /* Injected only into a tab whose text the reader has already captured, and
     only when they choose a section. It draws the tint and nothing else. */
  build({ ...common, entryPoints: [path.join(root, "src/highlight.ts")], outfile: path.join(dist, "content/highlight.js") }),
  build({ ...common, entryPoints: [path.resolve(root, "node_modules/@opace/content-integrity-browser/dist/worker/entry.js")], outfile: path.join(dist, "worker.js") })
]);
await copyFile(path.join(root, "src/sidepanel.html"), path.join(dist, "sidepanel.html"));
await copyFile(path.join(root, "src/panel.css"), path.join(dist, "panel.css"));
await copyFile(cycle5Wasm, path.join(dist, "runtime/ort-wasm-simd-threaded.wasm"));

/* The two SIL Open Font Licence subsets the website uses, so the extension
   reads in the product's own typography without any network font request.
   Licences and provenance are recorded beside the files. */
let fontBytes = 0;
for (const [file, expected] of Object.entries(fontFiles)) {
  const bytes = await readFile(path.join(fontSource, file));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== expected) throw new Error(`The packaged font ${file} changed: expected ${expected}, found ${actual}.`);
  fontBytes += bytes.length;
  await writeFile(path.join(dist, "assets/fonts", file), bytes);
}
if (fontBytes >= FONT_BUDGET_BYTES) throw new Error(`Packaged fonts are ${fontBytes} bytes, over the ${FONT_BUDGET_BYTES}-byte budget.`);
await copyFile(path.join(root, "FONT-LICENCES.md"), path.join(dist, "assets/fonts/LICENCES.txt"));

/* Chrome icons use the owner-selected magnifier-and-tick mark. */
for (const size of [16, 32, 48, 128]) {
  await sharp(canonicalLogo)
    .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(dist, `assets/icon-${size}.png`));
}

/* The shared website-grade result stylesheet, copied in at build time so the
   panel and every other Opace surface stay one design. */
await copyFile(path.resolve(root, "../../shared/presentation/checker-ui.css"), path.join(dist, "checker-ui.css"));

/* The audited Content Credentials runtime, verified against its pinned hashes. */
await import(path.join(here, "sync-c2pa-runtime.mjs"));

const inventory = [];
const walk = async directory => {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else {
      const bytes = await readFile(absolute);
      inventory.push({ path: path.relative(dist, absolute).split(path.sep).join("/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
  }
};
await walk(dist);
await writeFile(path.join(root, "BUILD-INVENTORY.json"), `${JSON.stringify({ version: capabilities.version, files: inventory }, null, 2)}\n`);
