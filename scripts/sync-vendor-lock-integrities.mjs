#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lockfiles = process.argv.slice(2);

if (!lockfiles.length) {
  throw new Error('Usage: node scripts/sync-vendor-lock-integrities.mjs <package-lock.json> [...]');
}

for (const requested of lockfiles) {
  const lockPath = resolve(root, requested);
  const packageDirectory = dirname(lockPath);
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  let updated = 0;

  for (const entry of Object.values(lock.packages ?? {})) {
    if (typeof entry?.resolved !== 'string' || !entry.resolved.startsWith('file:')) continue;
    const archive = resolve(packageDirectory, entry.resolved.slice('file:'.length));
    if (!existsSync(archive)) throw new Error(`${requested}: missing vendored archive ${archive}`);
    const integrity = `sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`;
    if (entry.integrity !== integrity) {
      entry.integrity = integrity;
      updated += 1;
    }
  }

  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  process.stdout.write(`${requested}: ${updated} vendored integrity value(s) updated\n`);
}
