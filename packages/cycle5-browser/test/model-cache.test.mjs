import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const base = 'https://model.example.test/pinned/';
const packagedWasm = 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/runtime/model.wasm';
const files = { 'model.onnx': new TextEncoder().encode('pinned model'), 'vocab.txt': new TextEncoder().encode('pinned vocabulary'), 'ort/runtime.wasm': new TextEncoder().encode('pinned runtime') };
const assets = Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), mediaType: 'application/octet-stream' }]));
// The real storage implementation runs against small, genuinely SHA-256-pinned
// test artefacts. No fake digest or relaxation of production validation.
const bundle = await build({ entryPoints: [fileURLToPath(new URL('../src/model-store.ts', import.meta.url))], bundle: true, format: 'esm', platform: 'node', write: false, plugins: [{ name: 'small-pinned-test-artefacts', setup(builder) { builder.onLoad({ filter: /\/constants\.ts$/ }, () => ({ contents: `export const CYCLE5_ASSETS=${JSON.stringify(assets)};export const CYCLE5_CACHE_NAME='test-pinned-cache';export const CYCLE5_SUPERSEDED_CACHES=[];export const CYCLE5_MANIFEST_FILE='manifest.json';export const CYCLE5_MODEL_FILE='model.onnx';export const CYCLE5_VOCAB_FILE='vocab.txt';export const CYCLE5_WASM_FILE='ort/runtime.wasm';`, loader: 'js' })); } }] });
const { downloadVerifiedAssets, loadVerifiedCachedAssets } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

function harness(wasmUrl) {
  const entries = new Map(); const requests = []; let deletes = 0;
  const cache = {
    async match(url) { return entries.get(url)?.clone(); },
    async put(url, response) { assert.match(url, /^https?:\/\//u, 'real Cache Storage rejects extension-scheme keys'); entries.set(url, response.clone()); },
  };
  const storage = { async keys() { return ['test-pinned-cache']; }, async open() { return cache; }, async delete() { entries.clear(); deletes++; return true; } };
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    if (url === `${base}manifest.json`) return new Response(JSON.stringify({ version: 'tier3-cycle5-v1', files: assets }));
    const name = url === wasmUrl ? 'ort/runtime.wasm' : url.slice(base.length);
    assert.ok(files[name], `unexpected fetch ${url}`);
    return new Response(files[name]);
  };
  return { entries, requests, storage, fetcher, deletes: () => deletes };
}

test('packaged Chrome WASM uses a valid cache key and reload needs no public fetch', async () => {
  const h = harness(packagedWasm);
  const first = await downloadVerifiedAssets({ baseUrl: base, wasmUrl: packagedWasm, fetcher: h.fetcher, cacheStorage: h.storage });
  assert.deepEqual([...h.entries.keys()], Object.keys(files).map(name => new URL(name, base).href));
  assert.equal(h.requests.at(-1).url, packagedWasm, 'WASM still comes from the shipped package');
  assert.equal(h.requests.filter(r => r.url === `${base}ort/runtime.wasm`).length, 0, 'cache identity is never fetched');
  const count = h.requests.length;
  const restored = await loadVerifiedCachedAssets(base, packagedWasm, h.storage);
  assert.deepEqual(restored, first);
  assert.equal(h.requests.length, count, 'all restored bytes are verified without a downloader');
});

test('HTTP packaged WASM preserves its existing cache identity', async () => {
  const wasmUrl = 'https://site.example.test/plugin/runtime.wasm'; const h = harness(wasmUrl);
  await downloadVerifiedAssets({ baseUrl: base, wasmUrl, fetcher: h.fetcher, cacheStorage: h.storage });
  assert.ok(h.entries.has(wasmUrl));
  assert.ok(await loadVerifiedCachedAssets(base, wasmUrl, h.storage));
});

test('same-length tampering of cached packaged runtime is rejected and cache removed', async () => {
  const h = harness(packagedWasm);
  await downloadVerifiedAssets({ baseUrl: base, wasmUrl: packagedWasm, fetcher: h.fetcher, cacheStorage: h.storage });
  const altered = files['ort/runtime.wasm'].slice(); altered[0] ^= 1;
  h.entries.set(`${base}ort/runtime.wasm`, new Response(altered));
  assert.equal(await loadVerifiedCachedAssets(base, packagedWasm, h.storage), undefined);
  assert.equal(h.deletes(), 1);
  assert.equal(h.entries.size, 0);
});
