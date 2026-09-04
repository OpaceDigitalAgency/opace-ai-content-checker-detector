import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = join(pluginDir, 'node_modules');
const outputDir = join(pluginDir, 'assets', 'vendor', 'c2pa');
const c2paWebDir = join(modulesDir, '@contentauth', 'c2pa-web');
const c2paWasmDir = join(modulesDir, '@contentauth', 'c2pa-wasm');
const c2paTypesDir = join(modulesDir, '@contentauth', 'c2pa-types');
const c2paUtilitiesDir = join(modulesDir, '@contentauth', 'c2pa-utilities');
const highgainDir = join(modulesDir, 'highgain');
const deepmergeDir = join(modulesDir, 'ts-deepmerge');

const EXPECTED = Object.freeze({
	'@contentauth/c2pa-web': '0.14.3',
	'@contentauth/c2pa-wasm': '0.11.3',
	'@contentauth/c2pa-types': '0.7.3',
	'@contentauth/c2pa-utilities': '0.2.1',
	highgain: '0.1.0',
	'ts-deepmerge': '8.0.0'
});

const SOURCE_HASHES = Object.freeze({
	'index.js': '0045fa12803fc366e4d1350e80f98f6673a74ce7e14dc749e1d16c5083e165e0',
	'c2pa-runtime.js': '8cca5d03694364c315d5d5b221427f69548c4307cc406698c66ab03aa404c6f1',
	'c2pa_worker.js': '49032ee72ef64b7cb200f3934ebdc12fc702d00fb304618b679f1f34b3c46202',
	'c2pa_bg.wasm': '2e27f91fe1e50999ac1407472d411d1247c53c32788595c37c7abfdd19988b6d',
	'highgain.js': '318220c98cc72436b2a9108f54f64b904476a3e738d2866da9e946567373a078'
});

const sha256 = (content) => createHash('sha256').update(content).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const verify = (name, content, expected) => {
	const actual = sha256(content);
	if (actual !== expected) throw new Error(`${name} changed upstream: expected ${expected}, received ${actual}`);
};

const webPackage = await readJson(join(c2paWebDir, 'package.json'));
const wasmPackage = await readJson(join(c2paWasmDir, 'package.json'));
const typesPackage = await readJson(join(c2paTypesDir, 'package.json'));
const utilitiesPackage = await readJson(join(c2paUtilitiesDir, 'package.json'));
const highgainPackage = await readJson(join(highgainDir, 'package.json'));
const deepmergePackage = await readJson(join(deepmergeDir, 'package.json'));
for (const [name, packageJson] of Object.entries({
	'@contentauth/c2pa-web': webPackage,
	'@contentauth/c2pa-wasm': wasmPackage,
	'@contentauth/c2pa-types': typesPackage,
	'@contentauth/c2pa-utilities': utilitiesPackage,
	highgain: highgainPackage,
	'ts-deepmerge': deepmergePackage
})) {
	if (packageJson.version !== EXPECTED[name]) throw new Error(`${name} must be pinned to ${EXPECTED[name]}`);
}
if (webPackage.license !== 'MIT' || wasmPackage.license !== 'MIT' || utilitiesPackage.license !== 'MIT' || highgainPackage.license !== 'ISC' || deepmergePackage.license !== 'ISC') {
	throw new Error('The audited C2PA dependency licence declarations changed.');
}

const upstreamIndex = await readFile(join(c2paWebDir, 'dist', 'index.js'));
verify('index.js', upstreamIndex, SOURCE_HASHES['index.js']);
const chunkMatch = upstreamIndex.toString('utf8').match(/\.\/(c2pa-[A-Za-z0-9_-]+\.js)/);
if (!chunkMatch) throw new Error('The audited C2PA runtime chunk could not be resolved.');

const upstreamRuntime = await readFile(join(c2paWebDir, 'dist', chunkMatch[1]));
const worker = await readFile(join(c2paWebDir, 'dist', 'c2pa_worker.js'));
const wasm = await readFile(join(c2paWebDir, 'dist', 'resources', 'c2pa_bg.wasm'));
const highgain = await readFile(join(highgainDir, 'dist', 'index.js'));
verify('c2pa-runtime.js', upstreamRuntime, SOURCE_HASHES['c2pa-runtime.js']);
verify('c2pa_worker.js', worker, SOURCE_HASHES['c2pa_worker.js']);
verify('c2pa_bg.wasm', wasm, SOURCE_HASHES['c2pa_bg.wasm']);
verify('highgain.js', highgain, SOURCE_HASHES['highgain.js']);

const runtimeText = upstreamRuntime.toString('utf8');
if ((runtimeText.match(/from "highgain"/g) || []).length !== 1) {
	throw new Error('The audited highgain import boundary changed.');
}
const browserIndex = upstreamIndex.toString('utf8').replace(`./${chunkMatch[1]}`, './c2pa-runtime.js');
const browserRuntime = runtimeText.replace('from "highgain"', 'from "./highgain.js"');

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await Promise.all([
	writeFile(join(outputDir, 'index.js'), browserIndex),
	writeFile(join(outputDir, 'c2pa-runtime.js'), browserRuntime),
	writeFile(join(outputDir, 'c2pa_worker.js'), worker),
	writeFile(join(outputDir, 'c2pa_bg.wasm'), wasm),
	writeFile(join(outputDir, 'highgain.js'), highgain),
	writeFile(join(outputDir, 'LICENSE-c2pa-web.txt'), await readFile(join(c2paWebDir, 'LICENSE'))),
	writeFile(join(outputDir, 'LICENSE-c2pa-wasm.txt'), await readFile(join(c2paWasmDir, 'LICENSE'))),
	writeFile(join(outputDir, 'LICENSE-c2pa-types.txt'), await readFile(join(c2paTypesDir, 'LICENSE'))),
	writeFile(join(outputDir, 'LICENSE-c2pa-utilities.txt'), await readFile(join(c2paUtilitiesDir, 'LICENSE'))),
	writeFile(join(outputDir, 'LICENSE-highgain.txt'), `ISC Licence\n\nPermission to use, copy, modify, and/or distribute this software for any\npurpose with or without fee is hereby granted, provided that the above\ncopyright notice and this permission notice appear in all copies.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\" AND THE AUTHOR DISCLAIMS ALL WARRANTIES\nWITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF\nMERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR\nANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES\nWHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN\nACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF\nOR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.\n\nThe highgain 0.1.0 npm package declares ISC and names Eli Mensch as its\nauthor, but does not include a separate licence file. This is the standard\nISC licence text.\n`)
]);

// Both packages declare ISC but omit a standalone licence file. Retain the
// standard text beside each redistributed runtime dependency.
await writeFile(join(outputDir, 'LICENSE-ts-deepmerge.txt'), `ISC Licence

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

The ts-deepmerge 8.0.0 npm package declares ISC but does not include a
separate licence file. This is the standard ISC licence text.
`);

const outputs = [
	['index.js', Buffer.from(browserIndex)],
	['c2pa-runtime.js', Buffer.from(browserRuntime)],
	['c2pa_worker.js', worker],
	['c2pa_bg.wasm', wasm],
	['highgain.js', highgain]
];
const outputLines = outputs.map(([name, content]) => `${sha256(content)}  ${name}`).join('\n');
const notice = `Opace Content Credentials runtime source and build notice
=====================================================

This directory contains only the browser runtime needed for local C2PA file
inspection, plus its licence and source notice. It is generated by running:

  npm ci --ignore-scripts
  npm run build

Pinned packages:
- @contentauth/c2pa-web ${webPackage.version} (MIT)
- @contentauth/c2pa-wasm ${wasmPackage.version} (MIT)
- @contentauth/c2pa-types ${typesPackage.version} (MIT licence file)
- @contentauth/c2pa-utilities ${utilitiesPackage.version} (MIT)
- highgain ${highgainPackage.version} (ISC)
- ts-deepmerge ${deepmergePackage.version} (ISC)

Source:
- https://github.com/contentauth/c2pa-js
- https://www.npmjs.com/package/highgain/v/${highgainPackage.version}
- https://github.com/voodoocreation/ts-deepmerge

Included runtime artefacts:
- dist/index.js, renamed internal chunk and dist/c2pa_worker.js from c2pa-web
- dist/resources/c2pa_bg.wasm from c2pa-wasm via c2pa-web
- dist/index.js from highgain, renamed highgain.js

The upstream minified runtime is not re-minified. Two deterministic path-only
changes let native browser modules load from this plugin without a bundler:
- the hashed C2PA chunk import is renamed to ./c2pa-runtime.js;
- its bare highgain import becomes ./highgain.js.

No source map, declaration, test, builder tool, CDN loader or inline-WASM build
is shipped. Remote manifest fetching, OCSP fetching and trust-list verification
are disabled by the Opace wrapper in assets/js/c2pa-provenance.mjs.

Generated SHA-256 hashes:
${outputLines}
`;
await writeFile(join(outputDir, 'SOURCE-BUILD-NOTICE.txt'), notice);

process.stdout.write(`Synced C2PA browser runtime ${webPackage.version} (${wasm.length} WASM bytes).\n`);
