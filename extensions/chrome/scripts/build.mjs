import { build } from "esbuild";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { mkdir, readFile, writeFile, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(root, "dist");
const shared = path.resolve(root, "../shared/capabilities.json");
await mkdir(path.join(dist, "assets"), { recursive: true });
await mkdir(path.join(dist, "content"), { recursive: true });

const capabilities = JSON.parse(await readFile(shared, "utf8"));
const manifest = {
  manifest_version: 3,
  name: capabilities.product,
  short_name: "Content Integrity",
  version: capabilities.version,
  description: "Check selected, visible or pasted AI-assisted text locally, protect facts and export hash-only evidence receipts. No Opace upload.",
  minimum_chrome_version: capabilities.minimum_chrome_version,
  permissions: capabilities.permissions,
  background: { service_worker: "background.js", type: "module" },
  action: { default_popup: "popup/popup.html", default_title: "Open Opace AI Content Integrity" },
  side_panel: { default_path: "sidepanel.html" },
  icons: { "16": "assets/icon-16.png", "32": "assets/icon-32.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" },
  content_security_policy: { extension_pages: "script-src 'self'; object-src 'none'" }
};
if (capabilities.optional_host_permissions.length) manifest.optional_host_permissions = capabilities.optional_host_permissions;
await writeFile(path.join(dist, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

const common = { bundle: true, format: "esm", platform: "browser", target: "chrome145", sourcemap: false, legalComments: "none", logLevel: "warning" };
await Promise.all([
  build({ ...common, entryPoints: [path.join(root, "src/background.ts")], outfile: path.join(dist, "background.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/popup.ts")], outfile: path.join(dist, "popup/popup.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/panel.ts")], outfile: path.join(dist, "panel.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/extract-selection.ts")], outfile: path.join(dist, "content/extract-selection.js") }),
  build({ ...common, entryPoints: [path.join(root, "src/extract-article.ts")], outfile: path.join(dist, "content/extract-article.js") }),
  build({ ...common, entryPoints: [path.resolve(root, "node_modules/@opace/content-integrity-browser/dist/worker/entry.js")], outfile: path.join(dist, "worker.js") })
]);
await mkdir(path.join(dist, "popup"), { recursive: true });
await copyFile(path.join(root, "src/popup.html"), path.join(dist, "popup/popup.html"));
await copyFile(path.join(root, "src/popup.css"), path.join(dist, "popup/popup.css"));
await copyFile(path.join(root, "src/sidepanel.html"), path.join(dist, "sidepanel.html"));
await copyFile(path.join(root, "src/panel.css"), path.join(dist, "panel.css"));
for (const size of [16, 32, 48, 128]) await writeFile(path.join(dist, `assets/icon-${size}.png`), makeIcon(size));

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

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const set = (x, y, colour) => { if (x < 0 || y < 0 || x >= size || y >= size) return; const at = (y * size + x) * 4; rgba.set(colour, at); };
  const ink = [17, 20, 21, 255], paper = [242, 237, 230, 255], orange = [251, 112, 10, 255], blue = [27, 101, 166, 255];
  const scale = size / 16;
  const rect = (x0, y0, x1, y1, colour) => { for (let y = Math.floor(y0 * scale); y < Math.ceil(y1 * scale); y++) for (let x = Math.floor(x0 * scale); x < Math.ceil(x1 * scale); x++) set(x, y, colour); };
  rect(2, 2, 14, 14, ink);
  rect(4, 3, 10, 13, paper); rect(5, 6, 9, 7, blue); rect(5, 9, 8, 10, blue);
  rect(9, 3, 12, 5, orange); rect(11, 4, 12, 7, orange); rect(9, 9, 10, 11, orange); rect(10, 10, 11, 12, orange); rect(11, 9, 13, 10, orange);
  const scanlines = [];
  for (let y = 0; y < size; y++) scanlines.push(Buffer.concat([Buffer.from([0]), rgba.subarray(y * size * 4, (y + 1) * size * 4)]));
  const chunk = (type, data) => { const typeBytes = Buffer.from(type); const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data]))); return Buffer.concat([length, typeBytes, data, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(scanlines), { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
function crc32(buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
