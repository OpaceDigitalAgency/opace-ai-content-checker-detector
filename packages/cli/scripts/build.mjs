#!/usr/bin/env node
/**
 * Build the CLI: sync the shared report, compile, copy the vendored modules beside the compiled
 * output, then bundle the executable.
 *
 * `tsc` type-checks the vendored `.mjs` through its `.d.mts` but does not emit it, so the copy
 * into `dist/vendor/report/` is what makes `dist/output.js` runnable for a library consumer.
 * `dist/main.js` is bundled by esbuild and needs nothing beside it.
 */

import { cpSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit' });

run(process.execPath, [join(root, 'scripts/sync-shared-report.mjs')]);
run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '-p', join(root, 'tsconfig.json')]);
rmSync(join(root, 'dist/vendor'), { recursive: true, force: true });
cpSync(join(root, 'src/vendor'), join(root, 'dist/vendor'), { recursive: true });
run(join(root, 'node_modules/.bin/esbuild'), [
  join(root, 'src/main.ts'),
  '--bundle',
  '--format=esm',
  '--platform=node',
  '--target=node20',
  "--banner:js=#!/usr/bin/env node",
  `--outfile=${join(root, 'dist/main.js')}`,
  '--log-level=warning',
]);
