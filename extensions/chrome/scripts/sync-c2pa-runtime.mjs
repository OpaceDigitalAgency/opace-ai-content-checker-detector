import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modules = path.join(root, "node_modules");
const output = path.join(root, "dist/runtime/c2pa");
const packageJson = JSON.parse(await readFile(path.join(modules, "@contentauth/c2pa-web/package.json"), "utf8"));
if (packageJson.version !== "0.14.3") throw new Error(`@contentauth/c2pa-web must remain pinned to 0.14.3, received ${packageJson.version}`);
const web = path.join(modules, "@contentauth/c2pa-web");
const index = await readFile(path.join(web, "dist/index.js"));
const chunk = index.toString("utf8").match(/\.\/(c2pa-[A-Za-z0-9_-]+\.js)/u)?.[1];
if (!chunk) throw new Error("The audited C2PA runtime chunk could not be resolved.");
const runtime = await readFile(path.join(web, "dist", chunk));
const worker = await readFile(path.join(web, "dist/c2pa_worker.js"));
const wasm = await readFile(path.join(web, "dist/resources/c2pa_bg.wasm"));
const highgain = await readFile(path.join(modules, "highgain/dist/index.js"));
const hashes = {
  index: createHash("sha256").update(index).digest("hex"),
  runtime: createHash("sha256").update(runtime).digest("hex"),
  worker: createHash("sha256").update(worker).digest("hex"),
  wasm: createHash("sha256").update(wasm).digest("hex"),
  highgain: createHash("sha256").update(highgain).digest("hex"),
};
const expected = {
  index: "0045fa12803fc366e4d1350e80f98f6673a74ce7e14dc749e1d16c5083e165e0",
  runtime: "8cca5d03694364c315d5d5b221427f69548c4307cc406698c66ab03aa404c6f1",
  worker: "49032ee72ef64b7cb200f3934ebdc12fc702d00fb304618b679f1f34b3c46202",
  wasm: "2e27f91fe1e50999ac1407472d411d1247c53c32788595c37c7abfdd19988b6d",
  highgain: "318220c98cc72436b2a9108f54f64b904476a3e738d2866da9e946567373a078",
};
for (const key of Object.keys(expected)) if (hashes[key] !== expected[key]) throw new Error(`The audited C2PA ${key} bytes changed.`);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(path.join(output, "index.js"), index.toString("utf8").replace(`./${chunk}`, "./c2pa-runtime.js")),
  writeFile(path.join(output, "c2pa-runtime.js"), runtime.toString("utf8").replace('from "highgain"', 'from "./highgain.js"')),
  writeFile(path.join(output, "c2pa_bg.wasm"), wasm),
  writeFile(path.join(output, "highgain.js"), highgain),
  writeFile(path.join(output, "LICENSE-c2pa-web.txt"), await readFile(path.join(web, "LICENSE"))),
  writeFile(path.join(output, "LICENSE-c2pa-wasm.txt"), await readFile(path.join(modules, "@contentauth/c2pa-wasm/LICENSE"))),
  writeFile(path.join(output, "LICENSE-c2pa-types.txt"), await readFile(path.join(modules, "@contentauth/c2pa-types/LICENSE"))),
  writeFile(path.join(output, "LICENSE-c2pa-utilities.txt"), await readFile(path.join(modules, "@contentauth/c2pa-utilities/LICENSE"))),
  writeFile(path.join(output, "SOURCE-BUILD-NOTICE.txt"), `Opace Content Credentials browser runtime\n\nPinned source: @contentauth/c2pa-web 0.14.3 and its audited MIT/ISC dependencies.\nSource: https://github.com/contentauth/c2pa-js\n\nRemote manifest, OCSP and trust-list fetching are disabled by the extension wrapper.
The standalone worker file is verified but not emitted: the runtime only accepts an
https worker URL, so its own packaged worker is used instead.\nRuntime SHA-256: ${hashes.runtime}\nWorker SHA-256: ${hashes.worker}\nWASM SHA-256: ${hashes.wasm}\n`),
]);
