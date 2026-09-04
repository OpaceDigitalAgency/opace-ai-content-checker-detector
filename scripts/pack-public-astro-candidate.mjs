#!/usr/bin/env node

/**
 * Packs the public Astro integration candidate from a hermetic copy of the
 * repository, then proves the copy with the same gates the package ships with.
 *
 * The sources compile against three things that live outside
 * `packages/astro`: the frozen shared presentation and report modules
 * (`../../../shared/**`), the canonical product logo (`../../../docs/assets/**`)
 * and the private Cycle-5 browser runtime, linked as `file:../cycle5-browser`.
 * The shared presentation tests additionally read the canonical contract
 * fixture from `../../../fixtures/**`. Staging `packages/astro` on its own
 * therefore cannot build, so the staging tree mirrors the repository layout
 * instead of flattening it.
 *
 * `packages/cycle5-browser/node_modules/onnxruntime-web` is deliberately kept:
 * the Cycle-5 runtime leaves `onnxruntime-web/wasm` external in its own bundle,
 * so esbuild resolves it from that directory while bundling the toolbar. The
 * resolved path is recorded in the output, so dropping it would either fail the
 * build or change the shipped bytes. Nothing else under any `node_modules` is
 * staged, and no `evidence` directory is staged.
 *
 * The Cycle-5 declarations re-export `CheckerResult` and `Cycle5BandId` from
 * `@opacedev/ai-content-checker-contracts` and `@opacedev/ai-content-checker-core`. In
 * the repository those resolve through symlinks into the unpublished workspace
 * sources. The candidate must not depend on unpublished bytes, so they are
 * satisfied instead from the exact developer packages `npm ci` has just installed
 * beside the Astro package. Nothing is loosened: `tsc` still runs under
 * `strict`, and a missing declaration would surface as an implicit `any`.
 */

import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node scripts/pack-public-astro-candidate.mjs <destination>');
mkdirSync(destination, { recursive: true });
const stagingRoot = mkdtempSync(join(tmpdir(), 'oaci-public-astro-'));
const staging = join(stagingRoot, 'packages', 'astro');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 300_000, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

/** Path segments of `path` relative to `from`, so a filter matches directories rather than substrings. */
const segmentsUnder = (from, path) => relative(from, path).split(sep).filter(Boolean);

/**
 * Copies one repository path into the same place in the staging tree.
 * `keep` receives the path's segments relative to that source and returns
 * false for anything the staged build must not see.
 */
function stage(relativePath, keep = () => true) {
  const source = join(root, relativePath);
  cpSync(source, join(stagingRoot, relativePath), {
    recursive: true,
    filter: path => keep(segmentsUnder(source, path)),
  });
}

const withoutBuildNoise = segments => !segments.includes('node_modules') && !segments.includes('evidence');

try {
  stage('packages/astro', withoutBuildNoise);
  // The Cycle-5 runtime is consumed as its built `dist/`; only its own
  // `onnxruntime-web` dependency is staged, and its `file:` links are not.
  stage('packages/cycle5-browser', segments => {
    if (segments.includes('evidence')) return false;
    const at = segments.indexOf('node_modules');
    if (at === -1) return true;
    return segments.length === at + 1 || segments[at + 1] === 'onnxruntime-web';
  });
  stage('shared/presentation', withoutBuildNoise);
  stage('shared/report', withoutBuildNoise);
  stage('fixtures/contracts', withoutBuildNoise);
  stage('docs/assets/opace-ai-content-checker-detector-logo-v3.png');

  run('npm', ['ci', '--ignore-scripts'], staging);
  for (const name of ['@opacedev/ai-content-checker-contracts', '@opacedev/ai-content-checker-core']) {
    cpSync(join(staging, 'node_modules', name), join(stagingRoot, 'packages/cycle5-browser/node_modules', name), { recursive: true });
  }
  run('npm', ['test'], staging);
  run('npm', ['run', 'check'], staging);
  run('npm', ['audit', '--audit-level=high'], staging);
  const packedName = run('npm', ['pack', '--ignore-scripts', '--pack-destination', destination], staging).trim().split('\n').at(-1);
  const packedPath = join(destination, packedName);
  const sha256 = createHash('sha256').update(readFileSync(packedPath)).digest('hex');
  process.stdout.write(`${JSON.stringify({ file: packedName, sha256 }, null, 2)}\n`);
} finally {
  rmSync(stagingRoot, { recursive: true, force: true });
}
