#!/usr/bin/env node

import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "schemas/v1");
const targets = [
  join(root, "packages/client/src/schemas"),
  join(root, "services/local-engine/src/opace_integrity/contracts/schemas")
];
const check = process.argv.includes("--check");
const schemaNames = readdirSync(source).filter((name) => name.endsWith(".schema.json")).sort();
const failures = [];

for (const target of targets) {
  for (const name of schemaNames) {
    const canonical = join(source, name);
    const copy = join(target, name);
    if (check) {
      if (!existsSync(copy) || !readFileSync(copy).equals(readFileSync(canonical))) failures.push(`${copy} does not match schemas/v1/${name}`);
    } else {
      copyFileSync(canonical, copy);
    }
  }
}

if (failures.length) throw new Error(`Contract schema copies are stale:\n${failures.join("\n")}`);
process.stdout.write(`${check ? "checked" : "synchronised"}: ${schemaNames.length} schemas across ${targets.length} transport/runtime copies\n`);
