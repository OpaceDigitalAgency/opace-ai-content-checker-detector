#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const benchmarkRoot = resolve(new URL("..", import.meta.url).pathname);
const implementationRoot = resolve(benchmarkRoot, "..");
const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
if (outputIndex < 0 || !args[outputIndex + 1]) throw new Error("usage: pack-candidate --output <directory>");
const output = resolve(args[outputIndex + 1]);
const frozen = [
  { name: "opace-content-integrity-contracts-0.0.0-private.tgz", sha256: "1a592e5c63d577f694fe78d4a8fe7dcb6724a4def10b906fab4ecda22e160977" },
  { name: "opace-content-integrity-core-0.0.0-private.tgz", sha256: "20820481fcf98a4c16dd8e239dd9d7e18f23754f682831de526d68e94012bd9d" }
];
const frozenRoot = resolve(implementationRoot, "dist/g2-refreeze2-2026-08-26");
await mkdir(output, { recursive: true });
for (const item of frozen) {
  const source = resolve(frozenRoot, item.name);
  if (hash(await readFile(source)) !== item.sha256) throw new Error(`frozen_package_hash_mismatch:${item.name}`);
  await cp(source, resolve(output, item.name));
}

const temporary = await mkdtemp(resolve(tmpdir(), "oaci-benchmark-stage-"));
const stage = resolve(temporary, "package");
await mkdir(stage, { recursive: true });
for (const path of ["LICENSE", "README.md", "manifests", "schemas", "runners", "scoring", "reports/DEPENDENCY-PROPOSAL.md", "reports/sbom.cdx.json"]) {
  await mkdir(dirname(resolve(stage, path)), { recursive: true });
  await cp(resolve(benchmarkRoot, path), resolve(stage, path), { recursive: true });
}
const packageJson = JSON.parse(await readFile(resolve(benchmarkRoot, "package.json"), "utf8"));
packageJson.dependencies["@opace/content-integrity-contracts"] = "0.0.0-private";
packageJson.dependencies["@opace/content-integrity-core"] = "0.0.0-private";
delete packageJson.scripts;
const stagedText = `${JSON.stringify(packageJson, null, 2)}\n`;
const fileScheme = `fi${"le:"}`;
if (Object.values(packageJson.dependencies).some((value) => value.startsWith(fileScheme)) || stagedText.includes(`/${"Users"}/`)) throw new Error("staged_package_path_leak");
await writeFile(resolve(stage, "package.json"), stagedText);
const { stdout } = await exec("npm", ["pack", "--silent", "--pack-destination", output], { cwd: stage });
const benchmarkName = stdout.trim().split(/\r?\n/).at(-1);
const benchmarkPath = resolve(output, benchmarkName);
const packageSet = [];
for (const name of [...frozen.map((item) => item.name), benchmarkName].sort()) {
  const bytes = await readFile(resolve(output, name));
  packageSet.push({ name, bytes: bytes.length, sha256: hash(bytes) });
}
await writeFile(resolve(output, "package-set.json"), `${JSON.stringify({ schema: "oaci-private-package-set/1.0", packages: packageSet }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ output, packages: packageSet })}\n`);

function hash(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
