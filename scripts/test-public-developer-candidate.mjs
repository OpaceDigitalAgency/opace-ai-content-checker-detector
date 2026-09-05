#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { posix, resolve } from 'node:path';

const archive = process.argv[2];
assert.ok(archive, 'Pass the exact public CLI tarball to validate');
const filename = resolve(archive);
const files = execFileSync('tar', ['-tzf', filename], { encoding: 'utf8' }).trim().split('\n');
const members = new Set(files);
const read = (name) => execFileSync('tar', ['-xOzf', filename, name], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
const manifest = JSON.parse(read('package/package.json'));
assert.equal(manifest.name, '@opacedev/ai-content-checker-cli');
assert.notEqual(manifest.private, true);
assert.ok(!JSON.stringify(manifest.dependencies).includes('file:'), 'Public dependencies must not reference the build checkout');
assert.ok(members.has('package/dist/vendor/evidence/index.mjs'), 'Production evidence modules must survive staging');
assert.ok(members.has('package/dist/vendor/evidence/readings.mjs'), 'Report reading dependencies must survive staging');
for (const name of files) {
  assert.ok(!/(^|\/)(?:tests?|\.agent|node_modules)(?:\/|$)/u.test(name), `Private/test content escaped into ${name}`);
  if (!/\.(?:m?js)$/u.test(name)) continue;
  const source = read(name);
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.\.?\/[^'"]+)['"]/gu)) {
    const dependency = posix.normalize(posix.join(posix.dirname(name), match[1]));
    assert.ok(members.has(dependency), `${name} references missing ${dependency}`);
  }
}
console.log(`Public CLI package closure passed: ${files.length} files; evidence present; relative runtime imports resolved; private/test paths absent.`);
