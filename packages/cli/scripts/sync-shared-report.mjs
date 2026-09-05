#!/usr/bin/env node
/**
 * Copies the browser-safe part of `shared/report/` into `src/vendor/report/`.
 *
 * The CLI bundles the shared printable report rather than keeping a second copy of it, in the same
 * way the WordPress, Chrome and Astro surfaces sync shared code into their own bundles. Only the
 * three modules `buildCheckerReportHtml` actually imports are copied; `node.mjs`, the PDF writer
 * and the font metrics stay out, so nothing on this path can reach a Node built-in.
 *
 * `--check` fails instead of writing, so a build or a test can prove the copy has not drifted.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(packageRoot, '../../shared/report');
const destination = join(packageRoot, 'src/vendor/report');

const files = [
  'checker-report-html.mjs',
  'checker-report-html.d.mts',
  'report-model.mjs',
  'report-model.d.mts',
  'logo.mjs',
  'logo.d.mts',
  ...['index.mjs', 'index.d.mts', 'cadence.mjs', 'document-tells.mjs', 'finding-spans.mjs', 'phrase-ratios.mjs', 'phrase-table.mjs', 'rule-liveness.mjs', 'rule-tells.mjs', 'readings.mjs', 'readings.d.mts'].map((name) => `../evidence/${name}`),
];

const check = process.argv.includes('--check');
mkdirSync(destination, { recursive: true });

const drifted = [];
for (const name of files) {
  const wanted = readFileSync(join(source, name));
  const path = join(destination, name);
  let current;
  try {
    current = readFileSync(path);
  } catch {
    current = undefined;
  }
  if (current && current.equals(wanted)) continue;
  if (check) drifted.push(name);
  else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, wanted);
  }
}

if (check && drifted.length) {
  console.error(`shared/report copy is stale: ${drifted.join(', ')}. Run node scripts/sync-shared-report.mjs`);
  process.exit(1);
}
console.log(check ? 'shared/report copy matches source' : `synced ${files.length} files from shared/report`);
