import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, unlink, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const artifacts = path.join(root, "artifacts");
await mkdir(artifacts, { recursive: true });
const files = [];
const walk = async directory => {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else files.push(path.relative(dist, absolute).split(path.sep).join("/"));
  }
};
await walk(dist);
const frozen = new Date("2026-08-26T00:00:00Z");
for (const file of files) await utimes(path.join(dist, file), frozen, frozen);
const manifest = JSON.parse(await readFile(path.join(dist, "manifest.json"), "utf8"));
const output = path.join(artifacts, `opace-ai-content-checker-detector-chrome-${manifest.version}.zip`);
try { await stat(output); await unlink(output); } catch {}
execFileSync("zip", ["-X", "-q", output, ...files], { cwd: dist, env: { ...process.env, TZ: "UTC" } });
const bytes = await readFile(output);
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(`${output}.sha256`, `${sha256}  ${path.basename(output)}\n`);
console.log(JSON.stringify({ output, files: files.length, bytes: bytes.length, sha256 }));
