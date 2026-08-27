#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'submission-prep/submission-manifest.json'), 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const verify = (relative, expected) => {
  const path = join(root, relative);
  if (!existsSync(path)) throw new Error(`missing submission candidate: ${relative}`);
  const actual = digest(path);
  if (actual !== expected) throw new Error(`submission hash mismatch for ${relative}: ${actual} != ${expected}`);
};

verify(manifest.npm.candidate_file, manifest.npm.candidate_sha256);
verify(manifest.pypi.wheel_file, manifest.pypi.wheel_sha256);
verify(manifest.pypi.sdist_file, manifest.pypi.sdist_sha256);

const npmManifestPath = join(root, manifest.developer_npm.manifest);
if (digest(npmManifestPath) !== manifest.developer_npm.manifest_sha256) throw new Error('developer npm manifest hash mismatch');
const npmManifest = JSON.parse(readFileSync(npmManifestPath, 'utf8'));
for (const item of npmManifest.packages) verify(join(dirname(manifest.developer_npm.manifest), item.file), item.sha256);
console.log(`Submission candidate hashes passed: ${npmManifest.packages.length + 3}`);
