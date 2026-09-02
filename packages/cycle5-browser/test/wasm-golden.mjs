import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  CYCLE5_MODEL_BASE,
  createCycle5BrowserRuntime,
} from '../dist/index.js';

const assetDirectory = process.env.OACI_CYCLE5_BROWSER_ASSET_DIR;
if (!assetDirectory) throw new Error('Set OACI_CYCLE5_BROWSER_ASSET_DIR to the operator-provided Cycle-5 asset directory. No model is downloaded by this test.');
const root = resolve(assetDirectory);
const map = new Map([
  ['manifest.json', 'manifest.json'],
  ['tier3-cycle5-full-e5small-int8-perchannel.onnx', 'tier3-cycle5-full-e5small-int8-perchannel.onnx'],
  ['vocab.txt', 'vocab.txt'],
  ['ort/ort-wasm-simd-threaded.wasm', 'ort/ort-wasm-simd-threaded.wasm'],
]);
const localFetch = async (input) => {
  const url = new URL(String(input));
  const relative = url.pathname.split('/models/local-signals-v1/')[1];
  const file = map.get(relative);
  if (!file) return new Response('not found', { status: 404 });
  return new Response(await readFile(resolve(root, file)), { status: 200 });
};
const runtime = createCycle5BrowserRuntime({ modelBaseUrl: CYCLE5_MODEL_BASE, allowedModelBaseUrls: [CYCLE5_MODEL_BASE], fetch: localFetch });
await runtime.prepareWithConsent({ consent: true });
const text = await readFile(new URL('../../../services/local-engine/research/cycle5-train/deploy-prep/fixtures/cadence-04-real-ai-article.txt', import.meta.url), 'utf8');
const result = await runtime.score(text);
assert.equal(result.status, 'scored');
assert.equal(result.provider, 'onnxruntime-web-wasm');
assert.equal(result.modelVersion, 'tier3-cycle5-v1');
assert.equal(result.sections.length, 2);
assert.equal(result.sections[0].startUtf16, 0);
assert.equal(result.sections.at(-1).endUtf16, text.length);
assert.ok(Math.abs(result.rawMargin - 3.857169508934021) <= 1e-6, `margin ${result.rawMargin}`);
assert.ok(Math.abs(result.rawScore - 0.9754181163899984) <= 1e-9, `probability ${result.rawScore}`);
assert.equal(result.flagged, true);
console.log(JSON.stringify({ margin: result.rawMargin, probability: result.rawScore, sections: result.sections.length, flagged: result.flagged }));
await runtime.dispose();
