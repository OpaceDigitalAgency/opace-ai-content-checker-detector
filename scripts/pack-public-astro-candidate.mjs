#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node scripts/pack-public-astro-candidate.mjs <destination>');
mkdirSync(destination, { recursive: true });
const stagingRoot = mkdtempSync(join(tmpdir(), 'oaci-public-astro-'));
const staging = join(stagingRoot, 'astro');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 300_000, maxBuffer: 20 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

try {
  cpSync(join(root, 'packages/astro'), staging, {
    recursive: true,
    filter: path => !path.includes(`${join('', 'node_modules')}`) && !path.includes(`${join('', 'evidence')}`),
  });
  run('npm', ['ci', '--ignore-scripts'], staging);
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
