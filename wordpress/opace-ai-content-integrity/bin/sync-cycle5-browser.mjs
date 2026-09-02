import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(pluginDir, '../..');
const packageDir = join(repoDir, 'packages/cycle5-browser');
const ortDir = join(packageDir, 'node_modules/onnxruntime-web');
const outputDir = join(pluginDir, 'assets/vendor/cycle5');
const bundlePath = join(outputDir, 'index.js');
const wasmPath = join(ortDir, 'dist/ort-wasm-simd-threaded.wasm');
const ortModulePath = join(ortDir, 'dist/ort.wasm.bundle.min.mjs');
const esbuild = join(packageDir, 'node_modules/.bin/esbuild');
const expected = Object.freeze({
	packageVersion: '0.0.0-private',
	ortVersion: '1.29.0',
	wasmBytes: 13961845,
	wasmSha256: 'ec8580a9d7b9476ceee52e10a7f94124e4dc71a019d666ed6d4726697c109a4d',
	ortModuleSha256: '7a3913dc5c7a9c3ad1144f5fbfecd402bc5013bcc886bc67664b18d8a15ab298'
});

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const assertIdentity = (condition, message) => { if (!condition) throw new Error(message); };

const packageJson = await readJson(join(packageDir, 'package.json'));
const ortJson = await readJson(join(ortDir, 'package.json'));
const wasm = await readFile(wasmPath);
const ortModule = await readFile(ortModulePath);
assertIdentity(packageJson.version === expected.packageVersion, 'Unexpected shared Cycle-5 browser package version.');
assertIdentity(packageJson.dependencies?.['onnxruntime-web'] === expected.ortVersion, 'The shared Cycle-5 package does not pin the audited ORT version.');
assertIdentity(ortJson.version === expected.ortVersion && ortJson.license === 'MIT', 'Unexpected onnxruntime-web identity or licence.');
assertIdentity(wasm.byteLength === expected.wasmBytes && sha256(wasm) === expected.wasmSha256, 'The ORT WebAssembly binary does not match the audited identity.');
assertIdentity(sha256(ortModule) === expected.ortModuleSha256, 'The ORT browser module does not match the audited identity.');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
execFileSync(esbuild, [
	join(packageDir, 'src/index.ts'),
	'--bundle',
	'--format=esm',
	'--platform=browser',
	'--target=es2022',
	`--alias:onnxruntime-web/wasm=${ortModulePath}`,
	`--outfile=${bundlePath}`
], { stdio: 'inherit' });
await writeFile(join(outputDir, 'ort-wasm-simd-threaded.wasm'), wasm);
await writeFile(join(outputDir, 'LICENSE-cycle5-browser.txt'), await readFile(join(packageDir, 'LICENSE')));
await writeFile(join(outputDir, 'LICENSE-onnxruntime-web.txt'), `MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

onnxruntime-web 1.29.0 declares the MIT licence in its npm package metadata.
Upstream source: https://github.com/microsoft/onnxruntime/tree/v1.29.0/js/web
`);

const sourceFiles = [
	'checker-result.ts', 'constants.ts', 'errors.ts', 'index.ts', 'model-store.ts', 'report.ts', 'runtime.ts', 'types.ts',
	'reference/cadence.ts', 'reference/document-tells.ts', 'reference/features-v1.ts', 'reference/segments.ts', 'reference/tokenizer.ts'
];
const sourceHashes = [];
for (const sourceFile of sourceFiles) {
	const bytes = await readFile(join(packageDir, 'src', sourceFile));
	sourceHashes.push(`${sha256(bytes)}  packages/cycle5-browser/src/${sourceFile}`);
}
const bundle = await readFile(bundlePath);
await writeFile(join(outputDir, 'SOURCE-BUILD-NOTICE.txt'), `Opace Cycle-5 browser runtime for WordPress

Source package: packages/cycle5-browser, version ${expected.packageVersion}
Browser engine: onnxruntime-web ${expected.ortVersion}, MIT
Build: esbuild the shared src/index.ts for browser ESM, with the exact audited
onnxruntime-web WASM-only module substituted for its package import.

The WordPress ZIP includes the JavaScript runtime and its verified WASM binary.
It does not include the 34,301,767-byte model or 231,508-byte vocabulary. Those
two files are fetched from the fixed Opace model directory only after explicit
user consent and are verified by byte length and SHA-256 before use.

Generated bundle SHA-256: ${sha256(bundle)}
Generated bundle bytes: ${(await stat(bundlePath)).size}
ORT module input SHA-256: ${expected.ortModuleSha256}
ORT WASM SHA-256: ${expected.wasmSha256}

Shared source inputs:
${sourceHashes.join('\n')}

Upstream ORT source: https://github.com/microsoft/onnxruntime/tree/v1.29.0/js/web
Model provenance: https://opace.agency/tools/ai/content-verification-integrity/research/server-and-browser-parity/
`);
console.log(`Synced Cycle-5 browser runtime with ORT ${expected.ortVersion} (${wasm.byteLength} WASM bytes).`);
