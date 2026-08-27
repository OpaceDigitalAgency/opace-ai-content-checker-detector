import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname), base = resolve(root, "manifests/synthetic"), corpus = resolve(base, "corpus");
await mkdir(corpus, { recursive: true });
await writeFile(resolve(base, ".root-marker"), "BENCH-10 manifest root\n"); await writeFile(resolve(corpus, ".root-marker"), "BENCH-10 synthetic corpus root\n");
const domains = ["agency","commerce","education","publishing","technology"], lengths = ["short","medium","long"], states = ["synthetic_reference","synthetic_edited"], documents = [];
let serial = 0;
for (const domain of domains) for (const length of lengths) for (const state of states) for (let cell = 0; cell < 20; cell++) {
  serial++; const id = `doc_synth_${String(serial).padStart(3,"0")}`, path = `${id}.txt`;
  const repeats = length === "short" ? 1 : length === "medium" ? 4 : 10;
  const sentence = `Opace synthetic ${domain} fixture ${cell + 1} records a fictional £${100 + serial} budget on 26 August 2026. “Evidence remains separate from claims,” the editor wrote; see https://example.invalid/${domain}/${serial} and citation [${(serial % 9) + 1}]. العربية עברית café 🧪 remain intentional Unicode samples. `;
  const text = `${Array.from({length:repeats}, (_, i) => `${sentence} Segment ${i + 1} preserves Name-${serial} and code \`const sample${serial} = ${i + 1};\`.`).join("\n")}\n`;
  const bytes = Buffer.from(text); await writeFile(resolve(corpus, path), bytes);
  documents.push({ document_id:id, path, byte_hash:hash(bytes), content_location_class:"synthetic", licence_or_consent_record_id:"opace_synthetic_2026_08", licence_state:"approved", language:"en-GB", domain, task:"editorial_integrity", length_band:length, authorship_edit_state:state, source_metadata:{authoring_party:"Opace",created_at:"2026-08-26T12:00:00.000Z",model:null}, split: cell < 4 ? "tuning" : cell < 16 ? "evaluation" : "held_out" });
}
const corpusManifest = { schema_version:"1.0", corpus_id:"opace_synthetic_mechanics", corpus_version:"0.1.0", approved_root:"corpus", mode:"all", documents };
const methods = { schema_version:"1.0", manifest_id:"methods_synthetic_mechanics", manifest_version:"0.1.0", methods:[
  { method_id:"opace_core",version:"2026.08.1",category:"deterministic_core",classification:"public_fixture",adapter:"core_inspect",native_score_semantics:"Canonical deterministic state only; no authorship probability.",threshold_provenance:"No statistical threshold; named deterministic rules.",minimum_input_bytes:0,maximum_input_bytes:250000,route:"browser",repeat_count:1,candidate_budget:0,network_behaviour:"none",provider_terms_approval_reference:null,licence_record_id:"opace_mit",model_record_id:null,data_record_id:"opace_synthetic_2026_08" },
  { method_id:"synthetic_matrix",version:"0.1.0",category:"synthetic_control",classification:"mock",adapter:"synthetic_matrix",native_score_semantics:"Deterministic control state selected by opaque fixture sequence; never a provider result.",threshold_provenance:"Test matrix only; no threshold or product claim.",minimum_input_bytes:0,maximum_input_bytes:250000,route:"browser",repeat_count:2,candidate_budget:2,network_behaviour:"none",provider_terms_approval_reference:null,licence_record_id:"opace_mit",model_record_id:null,data_record_id:"opace_synthetic_2026_08" }
]};
const lockBytes = await readFile(resolve(root,"package-lock.json"));
const environment = { schema_version:"1.0",environment_id:"env_synthetic_node",os:"recorded-at-run",runtime:"Node >=20",cpu:"recorded-at-run",gpu:null,ram_bytes:1,dependency_lock_hash:hash(lockBytes),code_evidence_hash:hash(Buffer.from("BENCH-10 candidate 0.1.0")),locale:"en-GB",timezone:"Europe/London",permitted_secret_identifiers:[] };
const prereg = { schema:"bench-preregistration/1.0",identity:"opace_synthetic_mechanics_0.1.0",frozen_at:"2026-08-26T12:00:00.000Z",minimum_per_key_cell:20,analysis:["Wilson 95% binomial intervals","exact paired McNemar","fixed-seed paired bootstrap","Holm family adjustment"],rules:["No held-out tuning","Hard fidelity failures remain failures","Mock results cannot enter public release"] };
await json("corpus.json",corpusManifest); await json("methods.json",methods); await json("environment.json",environment); await json("pre-registration.json",prereg);
const ref = async (path) => ({path,sha256:hash(await readFile(resolve(base,path)))});
const benchmark = { schema_version:"1.0",contract_version:"1.0.0",benchmark_id:"opace_synthetic_mechanics",benchmark_version:"0.1.0",purpose:"Prove BENCH-10 deterministic offline mechanics without a product comparison or public claim.",observation_window:{starts_at:"2026-08-26T12:00:00.000Z",ends_at:"2026-08-26T12:00:00.000Z"},frozen_at:"2026-08-26T12:00:00.000Z",corpus_manifest:await ref("corpus.json"),method_manifest:await ref("methods.json"),environment_manifest:await ref("environment.json"),pre_registration:await ref("pre-registration.json"),split_policy:{tuning:true,evaluation:true,held_out_minimum_per_cell:20},runner_version:"0.1.0",scorer_version:"0.1.0",correction_policy:"new_patch_identity_only",fixed_seed:20260826 };
await json("benchmark.json",benchmark); console.log(`generated ${documents.length} Opace-authored synthetic fixtures across 30 cells`);
async function json(name,value){await writeFile(resolve(base,name),`${JSON.stringify(value)}\n`);} function hash(value){return `sha256:${createHash("sha256").update(value).digest("hex")}`;}
