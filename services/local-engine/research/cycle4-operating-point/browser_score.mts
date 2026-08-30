/**
 * Score a document set through the SHIPPED BROWSER RUNTIME, segment by segment.
 *
 * onnxruntime-web on the WASM execution provider, the shipped TypeScript
 * WordPiece tokeniser, the shipped `segmentText` (segments-v3) and the shipped
 * `calibratedProbability`. One forward pass per segment, unpadded, exactly as
 * the visitor's browser does it - no batching, because batching changes the
 * padding and the padding changes the numbers.
 *
 * Differs from `route-parity.mts` only in that the model file and the
 * calibration temperature are ARGUMENTS rather than read from
 * `thresholds.json`. The browser int8 curve has never been measured for any
 * model other than the shipped one, and it cannot be measured for a candidate
 * without swapping the model file - which must not be done by editing the
 * deployed `thresholds.json`.
 *
 * Nothing here writes to the website repository. Measurement only.
 *
 *   cd <opace-website>/astro-latest
 *   npx tsx <this file> --model <int8.onnx> --temperature <T> \
 *       --in <docs.jsonl> --out <scores.jsonl>
 *
 * Output is one JSON object per line with the FULL-PRECISION per-segment
 * probability, the same shape `score_set.py` writes for the fp32 route, so the
 * two runtimes go through identical downstream analysis.
 */
import {readFileSync, writeSync, openSync, closeSync} from "node:fs";
import {createHash} from "node:crypto";
import * as ort from "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/node_modules/onnxruntime-web/dist/ort.node.min.mjs";
import {WordPieceTokenizer} from "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/src/lib/local-signals/tokenizer.ts";
import {calibratedProbability} from "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/src/lib/local-signals/engine.ts";
import {segmentText, SEGMENTATION_CONTRACT} from "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/src/lib/local-signals/segments.ts";

const ASSETS = "/Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest/public/models/local-signals-v1";
const MAX_LEN = 512;

const arg = (name: string) => {
  const i = process.argv.indexOf("--" + name);
  if (i < 0 || i + 1 >= process.argv.length) throw new Error("missing --" + name);
  return process.argv[i + 1];
};
const modelPath = arg("model");
const temperature = Number(arg("temperature"));
const inPath = arg("in");
const outPath = arg("out");

const KEEP = ["id", "side", "register", "genre", "source", "group", "target_len",
              "word_count", "words", "style", "cond", "model_label", "topic",
              "era_year", "prompt_style", "ttr", "model", "provider"];

// WASM thread count. Scoring is one unbatched forward pass per segment, so
// this is a throughput knob, not a numerical one - and it is asserted to be a
// throughput knob by the harness proof, which reproduces the shipped browser
// scores bit for bit at whatever value is used.
const threadsArg = process.argv.indexOf("--wasm-threads");
if (threadsArg > 0) (ort as any).env.wasm.numThreads = Number(process.argv[threadsArg + 1]);

const modelBytes = readFileSync(modelPath);
const modelSha = createHash("sha256").update(modelBytes).digest("hex").slice(0, 16);
const tk = new WordPieceTokenizer(readFileSync(ASSETS + "/vocab.txt", "utf8"));
const session = await ort.InferenceSession.create(new Uint8Array(modelBytes),
                                                  {executionProviders: ["wasm"]});

const score = async (text: string) => {
  const {inputIds} = tk.encode(text, MAX_LEN);
  const ids = new BigInt64Array(inputIds.map((id: number) => BigInt(id)));
  const out = await session.run({
    input_ids: new ort.Tensor("int64", ids, [1, inputIds.length]),
    attention_mask: new ort.Tensor("int64", new BigInt64Array(inputIds.length).fill(1n),
                                   [1, inputIds.length])
  });
  return calibratedProbability(await out["logits"].getData() as Float32Array, temperature);
};

const fd = openSync(outPath, "w");
const t0 = Date.now();
let docs = 0, segs = 0;
for (const line of readFileSync(inPath, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const doc = JSON.parse(line);
  const pieces = segmentText(doc.text, (strings: string[]) => tk.countTokens(strings));
  const probs: number[] = [];
  for (const piece of pieces) probs.push(await score(piece.text));
  const rec: any = {};
  for (const k of KEEP) if (k in doc) rec[k] = doc[k];
  rec.model_sha16 = modelSha;
  rec.runtime = "onnxruntime-web/wasm";
  rec.temperature = temperature;
  rec.segmentation_contract = SEGMENTATION_CONTRACT;
  rec.n_words = doc.text.split(/\s+/).filter(Boolean).length;
  rec.n_seg = pieces.length;
  rec.seg_p = probs;
  writeSync(fd, JSON.stringify(rec) + "\n");
  docs++; segs += pieces.length;
  if (docs % 250 === 0)
    console.log(`  ${docs} docs ${segs} seg ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
closeSync(fd);
console.log(`DONE ${inPath} -> ${outPath}: ${docs} docs ${segs} segments ` +
            `${((Date.now() - t0) / 1000).toFixed(0)}s  model ${modelSha}`);
