import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import ts from "typescript";
import YAML from "yaml";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaDirectory = path.join(root, "schemas/v1");
const failures = [];
let passed = 0;

function clone(value) {
  return structuredClone(value);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

async function check(name, test) {
  try {
    await test();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL ${name}`);
    console.error(`     ${error instanceof Error ? error.message : String(error)}`);
  }
}

function resultIsValid(result) {
  if (typeof result === "boolean") return result;
  if (result && typeof result === "object" && "valid" in result) return result.valid === true;
  throw new TypeError("semantic validator must return a boolean or { valid: boolean }");
}

const schemas = fs.readdirSync(schemaDirectory)
  .filter((name) => name.endsWith(".schema.json"))
  .map((name) => readJson(`schemas/v1/${name}`));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema);

function validator(schemaName) {
  const validate = ajv.getSchema(`https://schemas.opace.agency/content-integrity/v1/${schemaName}`);
  assert.ok(validate, `registered schema ${schemaName}`);
  return validate;
}

function assertValid(schemaName, value, message) {
  const validate = validator(schemaName);
  assert.equal(validate(value), true, `${message}: ${ajv.errorsText(validate.errors)}`);
}

function assertInvalid(schemaName, value, message) {
  const validate = validator(schemaName);
  assert.equal(validate(value), false, message);
}

async function loadSemanticValidator() {
  const candidates = [
    process.env.OACI_SEMANTIC_VALIDATOR,
    "packages/contracts/src/semantic-validation.mjs",
    "packages/contracts/src/semantic-validator.mjs",
    "packages/contracts/dist/semantic-validation.js",
    "packages/contracts/dist/semantic-validator.js"
  ].filter(Boolean);

  for (const candidate of candidates) {
    const absolute = path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
    if (fs.existsSync(absolute)) return import(pathToFileURL(absolute).href);
  }
  return null;
}

const semanticValidator = await loadSemanticValidator();

async function assertOffsetInvalid(schemaName, value, specificExport) {
  const validate = validator(schemaName);
  if (!validate(value)) return;
  assert.ok(semanticValidator, `${schemaName} accepted invalid offsets and no semantic validator was found`);
  const general = semanticValidator.validateContractSemantics;
  const specific = semanticValidator[specificExport];
  assert.ok(typeof general === "function" || typeof specific === "function", `semantic validator must export validateContractSemantics or ${specificExport}`);
  const result = typeof general === "function" ? await general(schemaName, value) : await specific(value);
  assert.equal(resultIsValid(result), false, `${schemaName} semantic validator accepted invalid offsets`);
}

function responseHasSchema(openApi, response) {
  let resolved = response;
  if (resolved?.$ref?.startsWith("#/")) {
    resolved = resolved.$ref.slice(2).split("/").reduce((value, part) => value?.[part.replaceAll("~1", "/").replaceAll("~0", "~")], openApi);
  }
  return Object.values(resolved?.content ?? {}).some((media) => Boolean(media?.schema));
}

function operationEntries(openApi) {
  const verbs = ["get", "post", "put", "patch", "delete"];
  return Object.entries(openApi.paths).flatMap(([route, pathItem]) => verbs
    .filter((verb) => pathItem[verb])
    .map((verb) => ({ route, verb, operation: pathItem[verb] })));
}

await check("Draft 2020-12 schemas compile strictly", () => {
  assert.equal(schemas.length, 13);
  for (const schema of schemas) assert.ok(validator(path.basename(new URL(schema.$id).pathname)));
});

await check("all valid and invalid fixtures have the declared outcome", () => {
  for (const kind of ["valid", "invalid"]) {
    const fixtureDirectory = path.join(root, `fixtures/contracts/${kind}`);
    for (const name of fs.readdirSync(fixtureDirectory).filter((value) => value.endsWith(".json"))) {
      const fixture = readJson(`fixtures/contracts/${kind}/${name}`);
      if (kind === "valid") assertValid(fixture.schema, fixture.data, name);
      else assertInvalid(fixture.schema, fixture.data, `${name} must fail closed`);
    }
  }
});

await check("same-major additive fields are accepted", () => {
  const request = clone(readJson("fixtures/contracts/valid/analysis-request.json").data);
  request.contract_version = "1.1.0";
  request.future_optional_field = { note: "same-major reader compatibility" };
  request.privacy.future_optional_field = true;
  assertValid("analysis-request.schema.json", request, "same-major additive request");
});

await check("wrong contract major and unknown method status fail closed", () => {
  const request = clone(readJson("fixtures/contracts/valid/analysis-request.json").data);
  request.contract_version = "2.0.0";
  assertInvalid("analysis-request.schema.json", request, "contract major 2 must be rejected");

  const method = clone(readJson("fixtures/contracts/valid/anthropic-unsupported.json").data);
  method.status = "not_available";
  assertInvalid("method-result.schema.json", method, "unknown canonical status must be rejected");
});

await check("hash-only and content-bearing receipts are bidirectionally consistent", () => {
  const hashOnly = clone(readJson("fixtures/contracts/valid/integrity-receipt.json").data);
  assert.equal(hashOnly.contains_content, false);
  assert.equal(hashOnly.policy.retain_content, false);
  assert.equal("content" in hashOnly.source, false);
  assertValid("integrity-receipt.schema.json", hashOnly, "baseline hash-only receipt");

  const leaked = clone(hashOnly);
  leaked.source.content = "private article content";
  assertInvalid("integrity-receipt.schema.json", leaked, "hash-only receipt must reject embedded source content");

  const retainedWithoutFlag = clone(hashOnly);
  retainedWithoutFlag.policy.retain_content = true;
  assertInvalid("integrity-receipt.schema.json", retainedWithoutFlag, "retention consent must agree with contains_content");

  const flaggedWithoutConsent = clone(hashOnly);
  flaggedWithoutConsent.contains_content = true;
  flaggedWithoutConsent.source.content = "private article content";
  assertInvalid("integrity-receipt.schema.json", flaggedWithoutConsent, "content-bearing receipt requires retention consent");

  const contentBearing = clone(hashOnly);
  contentBearing.contains_content = true;
  contentBearing.policy.retain_content = true;
  contentBearing.source.content = "private article content";
  assertValid("integrity-receipt.schema.json", contentBearing, "consented content-bearing receipt");

  const contentFlagWithoutContent = clone(hashOnly);
  contentFlagWithoutContent.contains_content = true;
  contentFlagWithoutContent.policy.retain_content = true;
  assertInvalid("integrity-receipt.schema.json", contentFlagWithoutContent, "contains_content=true requires content");
});

await check("Anthropic method is forced to the current unsupported invariant", () => {
  const unsupported = clone(readJson("fixtures/contracts/valid/anthropic-unsupported.json").data);
  assertValid("method-result.schema.json", unsupported, "Anthropic unsupported baseline");

  for (const status of ["pass", "attention", "fail", "inconclusive", "not_configured", "not_run", "error"]) {
    const changed = clone(unsupported);
    changed.status = status;
    assertInvalid("method-result.schema.json", changed, `Anthropic status ${status} must not be accepted before an authorised official adapter`);
  }

  const noAvailability = clone(unsupported);
  delete noAvailability.availability;
  assertInvalid("method-result.schema.json", noAvailability, "Anthropic availability is required");

  const available = clone(unsupported);
  available.availability = "available";
  assertInvalid("method-result.schema.json", available, "Anthropic availability must be not_available");

  const scored = clone(unsupported);
  scored.score = 0.9;
  scored.score_scale = { min: 0, max: 1 };
  assertInvalid("method-result.schema.json", scored, "Anthropic proxy score must be rejected");

  const thresholded = clone(unsupported);
  thresholded.threshold = { value: 0.5 };
  assertInvalid("method-result.schema.json", thresholded, "Anthropic proxy threshold must be rejected");
});

await check("Anthropic capability remains unsupported", () => {
  const capabilities = clone(readJson("fixtures/contracts/valid/capabilities.json").data);
  const anthropic = capabilities.methods.find((method) => method.id === "watermark.anthropic");
  assert.ok(anthropic, "Anthropic capability fixture exists");
  assert.equal(anthropic.state, "unsupported");
  assertValid("capabilities.schema.json", capabilities, "unsupported Anthropic capability");
  for (const state of ["available", "experimental", "not_configured"]) {
    const changed = clone(capabilities);
    changed.methods.find((method) => method.id === "watermark.anthropic").state = state;
    assertInvalid("capabilities.schema.json", changed, `Anthropic capability state ${state} must be rejected`);
  }
});

await check("job transition states use the closed job-state enum", () => {
  const jobSchema = readJson("schemas/v1/job.schema.json");
  assert.deepEqual(jobSchema.properties.transitions.items.properties.state.enum, jobSchema.properties.state.enum, "transition state schema must reuse the closed state set");
  const job = clone(readJson("fixtures/contracts/valid/job.json").data);
  job.transitions[0].state = "invented_state";
  assertInvalid("job.schema.json", job, "unknown transition state must be rejected");
});

await check("protected-span reversed and empty offsets are rejected", async () => {
  const base = clone(readJson("fixtures/contracts/valid/protected-spans.json").data);
  const reversed = clone(base);
  reversed.start_utf16 = 70;
  reversed.end_utf16 = 2;
  reversed.start_codepoint = 70;
  reversed.end_codepoint = 2;
  await assertOffsetInvalid("protected-span.schema.json", reversed, "validateProtectedSpan");

  const empty = clone(base);
  empty.end_utf16 = empty.start_utf16;
  empty.end_codepoint = empty.start_codepoint;
  await assertOffsetInvalid("protected-span.schema.json", empty, "validateProtectedSpan");
});

await check("pattern-finding reversed and empty offsets are rejected", async () => {
  const base = clone(readJson("fixtures/contracts/valid/pattern-finding.json").data);
  const reversed = clone(base);
  reversed.span.start_utf16 = 10;
  reversed.span.end_utf16 = 2;
  reversed.span.start_codepoint = 10;
  reversed.span.end_codepoint = 2;
  await assertOffsetInvalid("pattern-finding.schema.json", reversed, "validatePatternFinding");

  const empty = clone(base);
  empty.span.end_utf16 = empty.span.start_utf16;
  empty.span.end_codepoint = empty.span.start_codepoint;
  await assertOffsetInvalid("pattern-finding.schema.json", empty, "validatePatternFinding");
});

await check("OpenAPI has exactly the DEC-10 resource and job routes", () => {
  const openApi = YAML.parse(fs.readFileSync(path.join(root, "openapi/local-engine.openapi.yaml"), "utf8"));
  const expected = [
    "/health", "/v1/capabilities", "/v1/analyses", "/v1/rewrite-jobs", "/v1/jobs/{id}",
    "/v1/jobs/{id}/events", "/v1/jobs/{id}/payload", "/v1/receipts/validate",
    "/v1/admin/models/plan", "/v1/admin/models/install", "/v1/admin/models/{id}"
  ];
  assert.deepEqual(Object.keys(openApi.paths).sort(), expected.sort());
  assert.equal(openApi.servers[0].url, "http://127.0.0.1:8741");
});

await check("OpenAPI success and error responses have machine-readable schemas", () => {
  const openApi = YAML.parse(fs.readFileSync(path.join(root, "openapi/local-engine.openapi.yaml"), "utf8"));
  for (const { route, verb, operation } of operationEntries(openApi)) {
    const responses = operation.responses ?? {};
    const success = Object.entries(responses).filter(([status]) => /^2\d\d$/.test(status));
    assert.ok(success.length > 0, `${verb.toUpperCase()} ${route} has a success response`);
    for (const [status, response] of success) assert.ok(responseHasSchema(openApi, response), `${verb.toUpperCase()} ${route} ${status} needs a response schema`);
    const errors = Object.entries(responses).filter(([status]) => status === "default" || /^[45]\d\d$/.test(status));
    assert.ok(errors.length > 0, `${verb.toUpperCase()} ${route} needs a documented error response`);
    for (const [status, response] of errors) assert.ok(responseHasSchema(openApi, response), `${verb.toUpperCase()} ${route} ${status} needs an error schema`);
  }
});

await check("all non-health OpenAPI operations require bearer security", () => {
  const openApi = YAML.parse(fs.readFileSync(path.join(root, "openapi/local-engine.openapi.yaml"), "utf8"));
  for (const { route, verb, operation } of operationEntries(openApi)) {
    if (route === "/health") {
      assert.deepEqual(operation.security, [], "health alone is unauthenticated");
    } else {
      assert.ok(Array.isArray(operation.security) && operation.security.length > 0, `${verb.toUpperCase()} ${route} requires security`);
    }
  }
});

await check("exported PHP facade identity is exact and separate from the JS mount contract", async () => {
  const contractSource = fs.readFileSync(path.join(root, "packages/contracts/src/index.ts"), "utf8");
  const output = ts.transpileModule(contractSource, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
  const contract = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

  assert.equal(contract.PUBLIC_API_IDENTITY, "Opace\\ContentIntegrity\\Integration\\PublicApi::instance()");
  assert.equal(contract.READY_HOOK, "oaci_ready");
  assert.deepEqual(contract.PHP_PUBLIC_API_METHODS, [
    "version", "is_compatible", "capabilities", "register_source_adapter", "create_session", "get_session",
    "approve", "get_approved_output", "mark_applied", "get_receipt", "asset_handles"
  ]);

  assert.ok(contract.JS_MOUNT_CONTRACT && typeof contract.JS_MOUNT_CONTRACT === "object", "JS_MOUNT_CONTRACT metadata export is required");
  assert.equal(contract.JS_MOUNT_CONTRACT.global, "OpaceContentIntegrity");
  assert.equal(contract.JS_MOUNT_CONTRACT.apiVersion, "1.0");
  assert.deepEqual(contract.JS_MOUNT_CONTRACT.requiredOptions, ["surface", "sourceRef", "sourceHash", "getContent", "onApproved", "onClose"]);
  assert.deepEqual(contract.JS_MOUNT_CONTRACT.returns, ["destroy", "refresh", "getState"]);
  assert.deepEqual(contract.JS_MOUNT_CONTRACT.events, ["oaci:statechange", "oaci:approved", "oaci:error"]);
});

console.log(`\nG1 contract probe: ${passed} passed; ${failures.length} failed`);
if (failures.length > 0) {
  console.error("\nBlocking failures:");
  failures.forEach(({ name }, index) => console.error(`${index + 1}. ${name}`));
  process.exitCode = 1;
}
