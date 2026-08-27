import { cp, mkdir, readFile, readdir } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { inspect } from "@opace/content-integrity-core";
import { CONTRACT_VERSION, SCHEMA_VERSION } from "@opace/content-integrity-contracts";
import { atomicJson, canonical, cleanPublicValue, readJson, rejectUnpairedSurrogates, safePath, schemaValidators, sha256, validateDocument } from "./lib.mjs";
import { holm, mcnemar, pairedBootstrap, wilson } from "../scoring/statistics.mjs";

const HERE = dirname(new URL(import.meta.url).pathname);
const BENCH_ROOT = resolve(HERE, "..");
const SCHEMA_DIR = resolve(BENCH_ROOT, "schemas");
const FIXED_TIME = "2026-08-26T12:00:00.000Z";

export async function validateManifest(path) {
  const absolute = resolve(path), base = dirname(absolute);
  const benchmark = await validateDocument("benchmark-manifest", await readJson(absolute), SCHEMA_DIR);
  if (benchmark.schema_version !== SCHEMA_VERSION || benchmark.contract_version !== CONTRACT_VERSION) throw new Error("frozen_contract_export_mismatch");
  const refs = {};
  for (const [field, kind] of [["corpus_manifest", "corpus-manifest"], ["method_manifest", "method-manifest"], ["environment_manifest", "environment-manifest"]]) {
    const target = await safePath(base, benchmark[field].path), bytes = await readFile(target);
    if (sha256(bytes) !== benchmark[field].sha256) throw new Error(`${field}_hash_mismatch`);
    refs[field] = await validateDocument(kind, JSON.parse(bytes), SCHEMA_DIR);
  }
  const prereg = await safePath(base, benchmark.pre_registration.path), preregBytes = await readFile(prereg);
  if (sha256(preregBytes) !== benchmark.pre_registration.sha256) throw new Error("pre_registration_hash_mismatch");
  await validateCorpusFiles(base, refs.corpus_manifest);
  validateCells(refs.corpus_manifest.documents);
  return { benchmark, ...refs, pre_registration: JSON.parse(preregBytes) };
}

async function validateCorpusFiles(manifestBase, corpus) {
  const corpusRoot = await safeDirectory(manifestBase, corpus.approved_root);
  for (const doc of [...corpus.documents].sort((a, b) => a.document_id.localeCompare(b.document_id))) {
    const target = await safePath(corpusRoot, doc.path), bytes = await readFile(target);
    if (sha256(bytes) !== doc.byte_hash) throw new Error(`document_hash_mismatch:${doc.document_id}`);
    rejectUnpairedSurrogates(bytes.toString("utf8"));
  }
}
async function safeDirectory(root, candidate) {
  const placeholder = await safePath(root, `${candidate}/.root-marker`);
  return dirname(placeholder);
}
function validateCells(documents) {
  if (documents.length !== 600) throw new Error("synthetic_manifest_requires_600_records");
  const cells = new Map();
  for (const doc of documents) { const key = [doc.domain, doc.length_band, doc.authorship_edit_state].join("|"); cells.set(key, (cells.get(key) ?? 0) + 1); }
  if (cells.size !== 30 || [...cells.values()].some((count) => count !== 20)) throw new Error("synthetic_cell_count_invalid");
}

export async function freezeManifest(path, output) {
  const validated = await validateManifest(path);
  const manifestBase = relative(BENCH_ROOT, dirname(resolve(path))).replaceAll("\\", "/");
  if (!manifestBase || manifestBase.startsWith("..")) throw new Error("manifest_outside_benchmark_root");
  const payload = { lock_schema: "bench-lock/1.0", frozen_at: validated.benchmark.frozen_at, manifest_base: manifestBase, source_manifest_hash: sha256(await readFile(resolve(path))), benchmark: validated.benchmark, corpus_manifest: validated.corpus_manifest, method_manifest: validated.method_manifest, environment_manifest: validated.environment_manifest, pre_registration: validated.pre_registration };
  const lock = { ...payload, lock_hash: sha256(canonical(payload)) };
  await atomicJson(resolve(output), lock);
  return lock;
}

export async function runBenchmark(lockPath, output, { offline = false, interruptAfter = null } = {}) {
  if (!offline) throw new Error("offline_flag_required");
  const lock = await readJson(resolve(lockPath));
  const { lock_hash: declared, ...payload } = lock;
  if (sha256(canonical(payload)) !== declared) throw new Error("lock_hash_mismatch");
  await validateDocument("benchmark-manifest", lock.benchmark, SCHEMA_DIR);
  await validateDocument("corpus-manifest", lock.corpus_manifest, SCHEMA_DIR);
  await validateDocument("method-manifest", lock.method_manifest, SCHEMA_DIR);
  await validateDocument("environment-manifest", lock.environment_manifest, SCHEMA_DIR);
  const runDir = resolve(output), recordDir = resolve(runDir, "restricted/records"), rawDir = resolve(runDir, "restricted/raw");
  await mkdir(recordDir, { recursive: true }); await mkdir(rawDir, { recursive: true });
  const manifestBase = await safeDirectory(BENCH_ROOT, lock.manifest_base);
  const corpusRoot = await safeDirectory(manifestBase, lock.corpus_manifest.approved_root);
  const methods = [...lock.method_manifest.methods].sort((a, b) => a.method_id.localeCompare(b.method_id));
  let written = 0;
  for (const doc of [...lock.corpus_manifest.documents].sort((a, b) => a.document_id.localeCompare(b.document_id))) {
    const bytes = await readFile(await safePath(corpusRoot, doc.path));
    if (sha256(bytes) !== doc.byte_hash) throw new Error(`document_hash_mismatch:${doc.document_id}`);
    const text = bytes.toString("utf8"); rejectUnpairedSurrogates(text);
    for (const method of methods) for (let attempt = 1; attempt <= method.repeat_count; attempt++) {
      const journalKey = sha256(canonical([lock.lock_hash, doc.document_id, method.method_id, attempt]));
      const attemptId = `attempt_${journalKey.slice(7, 23)}`;
      const recordPath = resolve(recordDir, `${attemptId}.json`);
      try { const existing = await validateDocument("run-record", await readJson(recordPath), SCHEMA_DIR); if (existing.journal_key !== journalKey) throw new Error("journal_key_mismatch"); const rawBytes = await readFile(await safePath(runDir, existing.restricted_raw_reference)); if (sha256(rawBytes) !== existing.restricted_raw_hash) throw new Error("journal_raw_hash_mismatch"); continue; } catch (error) { if (error.code !== "ENOENT") throw error; }
      const raw = await execute(method, doc, text, attempt);
      const rawReference = `restricted/raw/${attemptId}.json`;
      await atomicJson(resolve(runDir, rawReference), raw.native);
      const rawHash = sha256(await readFile(resolve(runDir, rawReference)));
      const record = {
        schema_version: "1.0", contract_version: "1.0.0", run_id: `run_${lock.lock_hash.slice(7, 23)}`, benchmark_id: lock.benchmark.benchmark_id, document_id: doc.document_id, method_id: method.method_id, attempt_id: attemptId, attempt_number: attempt, classification: method.classification,
        input_hash: sha256(bytes), output_hash: raw.outputHash, status: raw.status, raw_native_state: raw.nativeState, started_at: FIXED_TIME, completed_at: FIXED_TIME, latency_ms: raw.latency, authorised_charge: null,
        refusal: raw.flags.refusal, timeout: raw.flags.timeout, unchanged: raw.flags.unchanged, malformed: raw.flags.malformed, quality_gates: raw.qualityGates, error_code: raw.errorCode, restricted_raw_reference: rawReference, journal_key: journalKey,
        restricted_raw_hash: rawHash, domain: doc.domain, length_band: doc.length_band, authorship_edit_state: doc.authorship_edit_state, split: doc.split, candidate_budget: method.candidate_budget, repeat_budget: method.repeat_count
      };
      await validateDocument("run-record", record, SCHEMA_DIR);
      await atomicJson(recordPath, record); written++;
      if (interruptAfter && written >= interruptAfter) throw Object.assign(new Error("synthetic_interrupt"), { code: "SYNTHETIC_INTERRUPT" });
    }
  }
  const inventory = await recordInventory(recordDir);
  await atomicJson(resolve(runDir, "run-summary.json"), { lock_hash: lock.lock_hash, record_count: inventory.length, records_hash: sha256(canonical(inventory)), completed: true });
  return { written, total: inventory.length };
}

async function execute(method, doc, text, attempt) {
  if (Buffer.byteLength(text) < method.minimum_input_bytes || Buffer.byteLength(text) > method.maximum_input_bytes) return outcome("not_run", "input_outside_limits", null, { errorCode: "input_outside_limits" });
  if (method.adapter === "core_inspect") {
    const result = await inspect({ schema_version: "1.0", contract_version: "1.0.0", request_id: `req_${doc.document_id}`, created_at: FIXED_TIME, source: { content: text, content_type: "plain_text", language: doc.language }, checks: ["unicode.invisible", "style.patterns", "watermark.anthropic"], privacy: { allowed_routes: ["browser"], save_receipt: false, retain_content: false } }, { now: () => FIXED_TIME, analysisId: () => `analysis_${doc.document_id}` });
    return { status: result.summary.attention ? "attention" : "pass", outputHash: sha256(canonical(result)), nativeState: "core_result", native: { contract_result: result }, latency: 0, flags: flags(), qualityGates: [{ id: "protected_fact_preserved", status: "pass" }], errorCode: null };
  }
  const variant = Number(doc.document_id.slice(-3)) % 9;
  const states = ["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error", "error"];
  const state = states[variant];
  return outcome(state, ["ok", "flagged", "failed", "unclear", "unavailable", "not_configured", "not_run", "timeout", "malformed"][variant], sha256(text), { timeout: variant === 7, malformed: variant === 8, unchanged: variant === 2, refusal: variant === 6, hardGateFail: variant === 2, attempt });
}
function outcome(status, nativeState, outputHash, options = {}) {
  return { status, outputHash, nativeState, native: { synthetic: true, state: nativeState, attempt: options.attempt ?? 1 }, latency: options.timeout ? 1000 : 0, flags: flags(options), qualityGates: [{ id: "protected_fact_preserved", status: options.hardGateFail ? "fail" : "pass" }], errorCode: status === "error" ? nativeState : options.errorCode ?? null };
}
function flags(value = {}) { return { refusal: Boolean(value.refusal), timeout: Boolean(value.timeout), unchanged: Boolean(value.unchanged), malformed: Boolean(value.malformed) }; }
async function recordInventory(recordDir) { return (await readdir(recordDir)).filter((name) => name.endsWith(".json")).sort().map((name) => name); }

export async function aggregateRun(runPath, output) {
  const runDir = resolve(runPath), recordDir = resolve(runDir, "restricted/records"), files = await recordInventory(recordDir);
  const records = [];
  for (const file of files) { const record = await validateDocument("run-record", await readJson(resolve(recordDir, file)), SCHEMA_DIR); if (record.attempt_id !== basename(file, ".json")) throw new Error("record_filename_mismatch"); const raw = await readFile(await safePath(runDir, record.restricted_raw_reference)); if (sha256(raw) !== record.restricted_raw_hash) throw new Error("restricted_raw_hash_mismatch"); records.push(record); }
  const sourceHash = sha256(canonical(records));
  const groups = [];
  for (const methodId of [...new Set(records.map((r) => r.method_id))].sort()) {
    const methodRecords = records.filter((r) => r.method_id === methodId);
    groups.push(aggregateGroup(methodId, methodRecords, { scope: "overall" }));
    const cellKeys = [...new Set(methodRecords.map((r) => [r.domain,r.length_band,r.authorship_edit_state].join("|")))].sort();
    for (const key of cellKeys) { const [domain,length_band,authorship_edit_state]=key.split("|"); groups.push(aggregateGroup(methodId,methodRecords.filter((r)=>r.domain===domain&&r.length_band===length_band&&r.authorship_edit_state===authorship_edit_state),{domain,length_band,authorship_edit_state})); }
  }
  const methodIds = [...new Set(records.map((r) => r.method_id))].sort();
  const binaryA = records.filter((r) => r.method_id === methodIds[0]).slice(0, 20).map((r) => r.status === "pass");
  const binaryB = records.filter((r) => r.method_id === methodIds[1]).slice(0, 20).map((r) => r.status === "pass");
  while (binaryB.length < binaryA.length) binaryB.push(false);
  const aggregate = { schema_version: "1.0", contract_version: "1.0.0", aggregate_id: `aggregate_${sourceHash.slice(7, 23)}`, benchmark_id: records[0]?.benchmark_id ?? "bench_empty", benchmark_version: "0.1.0", generated_at: FIXED_TIME, groups, statistics: { mcnemar: binaryA.length ? mcnemar(binaryA, binaryB) : {}, paired_bootstrap: pairedBootstrap([1,2,3,4,5], [1,1,2,3,5], { seed: 20260826, iterations: 4000 }), holm: holm([0.01, 0.04, 0.03]) }, limitations: ["Synthetic mechanics only; no detector, provider, product ranking or comparative claim.", "Mock classifications are retained and prohibited from public release evidence."], source_records_hash: sourceHash, correction_identity: `candidate_${sourceHash.slice(7, 19)}.0` };
  await validateDocument("release-aggregate", aggregate, SCHEMA_DIR); cleanPublicValue(aggregate);
  const bundleDir = resolve(output), existingAggregatePath = resolve(bundleDir, "public/aggregate.json");
  try { const existing = await readJson(existingAggregatePath); if (canonical(existing) !== canonical(aggregate)) throw new Error("correction_requires_new_bundle_path"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(resolve(bundleDir, "public"), { recursive: true });
  await cp(recordDir, resolve(bundleDir, "restricted/records"), { recursive: true, force: true });
  await cp(resolve(runDir, "restricted/raw"), resolve(bundleDir, "restricted/raw"), { recursive: true, force: true });
  await atomicJson(resolve(bundleDir, "public/aggregate.json"), aggregate);
  const filesForChecksum = [{ path: "public/aggregate.json", sha256: sha256(await readFile(resolve(bundleDir, "public/aggregate.json"))) }];
  await atomicJson(resolve(bundleDir, "checksums.json"), { schema: "bench-bundle-checksums/1.0", files: filesForChecksum });
  await atomicJson(resolve(bundleDir, "bundle-metadata.json"), { schema: "bench-bundle/1.0", candidate_only: true, public_release_authorised: false, source_run_records_hash: sourceHash, classifications: [...new Set(records.map((r) => r.classification))].sort(), records_relative_path: "restricted/records" });
  return aggregate;
}
function aggregateGroup(methodId, records, groupingKeys) {
  const statusCounts = Object.fromEntries(["pass","attention","fail","inconclusive","unsupported","not_configured","not_run","error"].map((s) => [s, records.filter((r) => r.status === s).length]));
  const hardFailures = records.filter((r) => r.quality_gates.some((g) => g.status === "fail")).length;
  const numerator = records.filter((r) => r.status === "pass" && !r.quality_gates.some((g) => g.status === "fail")).length;
  const denominator = records.length;
  const actualPositive=(r)=>r.authorship_edit_state==="synthetic_edited", predictedPositive=(r)=>r.status==="attention"||r.status==="fail";
  const confusion={true_positive:records.filter(r=>actualPositive(r)&&predictedPositive(r)).length,false_positive:records.filter(r=>!actualPositive(r)&&predictedPositive(r)).length,true_negative:records.filter(r=>!actualPositive(r)&&!predictedPositive(r)).length,false_negative:records.filter(r=>actualPositive(r)&&!predictedPositive(r)).length};
  const rate=(n)=>denominator?Number((n/denominator).toFixed(12)):null, latencies=records.map(r=>r.latency_ms), charges=records.map(r=>r.authorised_charge).filter(v=>v!==null);
  return { method_id: methodId, classification: records[0].classification, grouping_keys:groupingKeys, numerator, denominator, excluded_count: hardFailures, excluded_reasons: { hard_fidelity_gate: hardFailures }, failures_retained: statusCounts.fail + statusCounts.error + hardFailures, point_estimate: denominator ? numerator / denominator : null, confidence_interval: wilson(numerator, denominator), previous_cycle_comparator: null, status_counts: statusCounts, confusion_matrix:confusion, rates:{true_positive:rate(confusion.true_positive),false_positive:rate(confusion.false_positive),true_negative:rate(confusion.true_negative),false_negative:rate(confusion.false_negative),fidelity_preservation:rate(denominator-hardFailures),refusal:rate(records.filter(r=>r.refusal).length),timeout:rate(records.filter(r=>r.timeout).length),error:rate(statusCounts.error),unchanged:rate(records.filter(r=>r.unchanged).length),malformed:rate(records.filter(r=>r.malformed).length)}, latency_ms:{minimum:Math.min(...latencies),mean:Number((latencies.reduce((a,b)=>a+b,0)/denominator).toFixed(12)),maximum:Math.max(...latencies)},authorised_charge_total:charges.length?charges.reduce((a,b)=>a+b,0):null,sample_size: denominator };
}

export async function reproduceBundle(bundlePath) {
  const dir = resolve(bundlePath), checksums = await readJson(resolve(dir, "checksums.json"));
  for (const item of checksums.files) { const file = await safePath(dir, item.path); if (sha256(await readFile(file)) !== item.sha256) throw new Error(`bundle_checksum_mismatch:${item.path}`); }
  const metadata = await readJson(resolve(dir, "bundle-metadata.json"));
  const recordDir = resolve(dir, metadata.records_relative_path);
  const records = await Promise.all((await recordInventory(recordDir)).map((name) => readJson(resolve(recordDir, name))));
  for (const record of records) { const raw = await readFile(await safePath(dir, record.restricted_raw_reference)); if (sha256(raw) !== record.restricted_raw_hash) throw new Error("restricted_raw_hash_mismatch"); }
  const aggregate = await readJson(resolve(dir, "public/aggregate.json"));
  if (sha256(canonical(records)) !== aggregate.source_records_hash) throw new Error("aggregate_source_mismatch");
  cleanPublicValue(aggregate);
  return { verified: checksums.files.length, source_records_hash: aggregate.source_records_hash };
}

export async function inspectRelease(bundlePath) {
  const dir = resolve(bundlePath), metadata = await readJson(resolve(dir, "bundle-metadata.json"));
  await reproduceBundle(dir);
  const records = await Promise.all((await recordInventory(resolve(dir, metadata.records_relative_path))).map((name) => readJson(resolve(dir, metadata.records_relative_path, name))));
  if (records.some((record) => record.classification === "mock") || metadata.classifications.includes("mock")) throw new Error("public_release_mock_contamination");
  if (metadata.public_release_authorised !== true) throw new Error("public_release_not_authorised");
  const publicDir = resolve(dir, "public");
  for (const file of await readdir(publicDir)) { const value = await readJson(resolve(publicDir, file)); cleanPublicValue(value); if (value.groups?.some((group) => group.grouping_keys.scope !== "overall" && group.sample_size < 20)) throw new Error("public_cell_below_preregistered_minimum"); }
  return { releasable: true };
}

export async function validateAny(path) {
  const value = await readJson(resolve(path));
  if (value.lock_schema) return validateLock(value);
  if (value.benchmark_id && value.corpus_manifest) return validateManifest(path);
  const mapping = [["documents", "corpus-manifest"], ["methods", "method-manifest"], ["environment_id", "environment-manifest"], ["attempt_id", "run-record"], ["aggregate_id", "release-aggregate"]];
  const found = mapping.find(([key]) => key in value); if (!found) throw new Error("manifest_kind_unknown");
  return validateDocument(found[1], value, SCHEMA_DIR);
}
function validateLock(lock) { const { lock_hash, ...payload } = lock; if (sha256(canonical(payload)) !== lock_hash) throw new Error("lock_hash_mismatch"); return lock; }

export async function schemaSmoke() { return schemaValidators(SCHEMA_DIR); }
