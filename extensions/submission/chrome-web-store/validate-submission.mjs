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
check(fields.version === "1.0.0", "dashboard version is not 1.0.0");
check(fields.data_types.length === 1 && fields.data_types[0] === "Website content", "data-type disclosure drifted");
check(fields.data_uses.length === 1 && fields.data_uses[0] === "Application functionality", "data-use disclosure drifted");

const packagePath = join(root, assets.package.path);
check(statSync(packagePath).size === assets.package.bytes, "package byte count changed");
check(sha256(packagePath) === assets.package.sha256, "package SHA-256 changed");
for (const entry of [...assets.assets, ...assets.screenshots]) validateFile(entry);

const archiveFiles = execFileSync("unzip", ["-Z1", packagePath], { encoding: "utf8" }).trim().split("\n");
check(archiveFiles.length === 15, `package has ${archiveFiles.length} files instead of 15`);
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
  check(!manifest.host_permissions && !manifest.optional_host_permissions, "host permissions are present");

  const runtimeText = archiveFiles
    .filter((path) => /\.(?:js|html|css|json)$/.test(path))
    .map((path) => readFileSync(join(extraction, path), "utf8"))
    .join("\n");
  check(!/\b(?:https?|wss?):\/\//i.test(runtimeText), "runtime contains a network endpoint");
  check(!/\b(?:eval|Function)\s*\(/.test(runtimeText), "runtime contains dynamic code execution");
  check(!/(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(runtimeText), "runtime contains a loopback endpoint");
  check(!/(?:\/Users\/|\\Users\\|BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY)/.test(runtimeText), "runtime contains a local path or private key marker");
} finally {
  rmSync(extraction, { recursive: true, force: true });
}

check(readdirSync(join(root, "screenshots")).filter((name) => name.endsWith(".png")).length === 5, "screenshot set is not exactly five PNGs");

if (failures.length) {
  console.error(`FAIL (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS: Chrome Web Store bundle metadata, archive, disclosures and 8 image assets are internally consistent.");
console.log(`Package SHA-256: ${assets.package.sha256}`);
console.log(`Summary: ${fields.summary.length}/132 characters; archive: ${archiveFiles.length} files; screenshots: 5.`);
