#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node scripts/pack-public-developer-candidate.mjs <destination>');
mkdirSync(destination, { recursive: true });

const version = '0.3.0';
const common = {
  author: { name: 'Opace Digital Agency', url: 'https://opace.agency/' },
  homepage: 'https://opace.agency/tools/ai/content-verification-integrity/',
  bugs: { url: 'https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/issues' },
  publishConfig: { access: 'public', provenance: true },
  engines: { node: '>=20' },
};
const packages = [
  { dir: 'packages/contracts', internal: [] },
  { dir: 'packages/core', internal: ['@opacedev/ai-content-checker-contracts'] },
  { dir: 'packages/browser', internal: ['@opacedev/ai-content-checker-contracts', '@opacedev/ai-content-checker-core'] },
  { dir: 'packages/client', internal: ['@opacedev/ai-content-checker-contracts'] },
  { dir: 'packages/cli', internal: ['@opacedev/ai-content-checker-contracts', '@opacedev/ai-content-checker-core', '@opacedev/ai-content-checker-client'], homepage: 'https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/' },
];
const staging = mkdtempSync(join(tmpdir(), 'oaci-public-pack-'));
const output = [];

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed in ${cwd}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

try {
  for (const item of packages) {
    const source = join(root, item.dir);
    if (!existsSync(source)) throw new Error(`Missing package source: ${source}`);
    run('npm', ['run', 'build'], source);
    const staged = join(staging, basename(item.dir));
    cpSync(source, staged, {
      recursive: true,
      filter: (path) => !path.includes(`${join('', 'node_modules')}`) && !path.includes(`${join('', 'evidence')}`) && !path.endsWith('.tgz'),
    });
    const manifestPath = join(staged, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    delete manifest.private;
    Object.assign(manifest, common);
    manifest.homepage = item.homepage ?? common.homepage;
    manifest.repository = {
      type: 'git',
      url: 'git+https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector.git',
      directory: item.dir,
    };
    for (const name of item.internal) {
      if (!manifest.dependencies?.[name]) throw new Error(`${manifest.name} is missing ${name}`);
      manifest.dependencies[name] = version;
    }
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const packedName = run('npm', ['pack', '--ignore-scripts', '--pack-destination', destination], staged).trim().split('\n').at(-1);
    const packedPath = join(destination, packedName);
    const sha256 = createHash('sha256').update(readFileSync(packedPath)).digest('hex');
    output.push({ name: manifest.name, version, file: packedName, sha256 });
  }
  writeFileSync(join(destination, 'manifest.json'), `${JSON.stringify({ version, packages: output }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ version, packages: output }, null, 2)}\n`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
