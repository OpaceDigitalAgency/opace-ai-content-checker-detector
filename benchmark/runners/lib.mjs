import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, lstat, mkdir, readFile, realpath, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const STATES = ["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"];
export const ROUTES = ["browser", "wordpress_local", "local_service", "hub_provider", "commercial_byok"];
export const CLASSIFICATIONS = ["direct", "mock", "local", "public_fixture"];

export function canonical(value) {
  return JSON.stringify(sortValue(value));
}
function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
  return value;
}
export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}
export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.tmp-${process.pid}`;
  await writeFile(temp, `${canonical(value)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temp, path);
}
export function opaqueId(value, label = "id") {
  if (typeof value !== "string" || !/^[a-z][a-z0-9_.-]{2,79}$/i.test(value)) throw new Error(`${label}_invalid`);
  return value;
}
export async function safePath(root, candidate, { mustExist = true } = {}) {
  if (typeof candidate !== "string" || !candidate || isAbsolute(candidate) || candidate.includes("\\") || candidate.split("/").includes("..")) throw new Error("path_unsafe");
  const rootReal = await realpath(root);
  const target = resolve(rootReal, candidate);
  const rel = relative(rootReal, target);
  if (!rel || rel.startsWith(`..${sep}`) || rel === ".." || isAbsolute(rel)) throw new Error("path_outside_root");
  if (mustExist) {
    const targetReal = await realpath(target);
    const realRel = relative(rootReal, targetReal);
    if (realRel.startsWith(`..${sep}`) || realRel === ".." || isAbsolute(realRel)) throw new Error("path_symlink_escape");
    await access(targetReal, fsConstants.R_OK);
    if (!(await lstat(targetReal)).isFile()) throw new Error("path_not_file");
    return targetReal;
  }
  return target;
}

let validators;
export async function schemaValidators(schemaDir) {
  if (validators) return validators;
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false, allowUnionTypes: true });
  addFormats(ajv);
  const names = ["benchmark-manifest", "corpus-manifest", "method-manifest", "environment-manifest", "run-record", "release-aggregate"];
  validators = {};
  for (const name of names) {
    const schema = await readJson(resolve(schemaDir, `${name}.schema.json`));
    validators[name] = ajv.compile(schema);
  }
  return validators;
}
export async function validateDocument(kind, value, schemaDir) {
  const validate = (await schemaValidators(schemaDir))[kind];
  if (!validate) throw new Error(`schema_unknown:${kind}`);
  if (!validate(value)) throw new Error(`schema_invalid:${kind}:${ajvErrors(validate.errors)}`);
  semanticValidate(kind, value);
  return value;
}
function ajvErrors(errors = []) { return errors.map((item) => `${item.instancePath || "/"} ${item.message}`).join("; "); }
function unique(values, label) { if (new Set(values).size !== values.length) throw new Error(`duplicate_${label}`); }
function semanticValidate(kind, value) {
  if (kind === "benchmark-manifest") {
    if (value.schema_version !== "1.0" || value.contract_version !== "1.0.0") throw new Error("contract_incompatible");
    for (const field of ["corpus_manifest", "method_manifest", "environment_manifest", "pre_registration"]) if (!value[field].sha256.startsWith("sha256:")) throw new Error(`${field}_hash_invalid`);
  }
  if (kind === "corpus-manifest") {
    unique(value.documents.map((item) => item.document_id), "document_id");
    for (const doc of value.documents) {
      if (doc.content_location_class !== "synthetic" && doc.licence_state !== "approved") throw new Error("licence_unapproved");
      if (!doc.licence_or_consent_record_id) throw new Error("consent_provenance_missing");
      if (doc.split === "held_out" && value.mode === "tuning") throw new Error("held_out_tuning_denied");
    }
  }
  if (kind === "method-manifest") {
    unique(value.methods.map((item) => item.method_id), "method_id");
    for (const method of value.methods) {
      if (method.network_behaviour !== "none" || method.route !== "browser") throw new Error("network_not_authorised");
      if (!method.licence_record_id) throw new Error("method_licence_missing");
      if (method.classification === "direct" && !method.provider_terms_approval_reference) throw new Error("direct_terms_missing");
    }
  }
  if (kind === "run-record") {
    if (!STATES.includes(value.status)) throw new Error("status_unknown");
  }
}
export function rejectUnpairedSurrogates(text) {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) { const next = text.charCodeAt(i + 1); if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error("invalid_unicode_unpaired_surrogate"); i++; }
    else if (code >= 0xdc00 && code <= 0xdfff) throw new Error("invalid_unicode_unpaired_surrogate");
  }
}
export function cleanPublicValue(value) {
  const text = canonical(value);
  const forbidden = [/(?:api|secret|token|password)[_-]?(?:key)?\s*[=:]\s*[A-Za-z0-9_-]{8,}/i, /-----BEGIN [A-Z ]+PRIVATE KEY-----/, /(?:^|[\s"'])(?:\/Users\/|[A-Za-z]:\\)/, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i];
  if (forbidden.some((pattern) => pattern.test(text))) throw new Error("public_sensitive_value");
  if (/"(?:source_content|candidate_content|raw_response|content)"\s*:/.test(text)) throw new Error("public_text_bearing_field");
  if (/"restricted_raw_reference"\s*:\s*"(?!null)/.test(text)) throw new Error("public_restricted_reference");
  return true;
}
