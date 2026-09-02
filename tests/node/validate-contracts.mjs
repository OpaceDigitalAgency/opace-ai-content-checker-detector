import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";
import canonicalize from "canonicalize";
import { validateProtectedSpan, validatePatternFinding } from "../../packages/contracts/src/semantic-validation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaDir = path.join(root, "schemas/v1");
const schemas = fs.readdirSync(schemaDir).filter((name) => name.endsWith(".schema.json")).map((name) => JSON.parse(fs.readFileSync(path.join(schemaDir, name), "utf8")));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
for (const schema of schemas) ajv.addSchema(schema);
for (const schema of schemas) {
  const generatedName = `${path.basename(new URL(schema.$id).pathname, ".json")}.d.ts`;
  assert.ok(fs.existsSync(path.join(root, "packages/contracts/src/generated", generatedName)), `generated DTO for ${schema.$id}`);
}

function validateFixture(kind, file) {
  const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
  const schemaId = `https://schemas.opace.agency/content-integrity/v1/${fixture.schema}`;
  const validate = ajv.getSchema(schemaId);
  assert.ok(validate, `schema registered for ${fixture.schema}`);
  let valid = validate(fixture.data);
  if (valid && (fixture.schema === "protected-span.schema.json" || fixture.semantic === "protected_span_offsets")) {
    const item = fixture.data;
    const semanticValid = item.end_utf16 > item.start_utf16 && item.end_codepoint > item.start_codepoint && item.end_utf16 - item.start_utf16 === item.text.length && item.end_codepoint - item.start_codepoint === [...item.text].length && /^sha256:[a-f0-9]{64}$/.test(item.content_hash);
    valid = semanticValid;
  }
  if (kind === "valid") assert.equal(valid, true, `${file}: ${ajv.errorsText(validate.errors)}`);
  else assert.equal(valid, false, `${file} should be invalid`);
}

for (const kind of ["valid", "invalid"]) {
  const dir = path.join(root, `fixtures/contracts/${kind}`);
  for (const name of fs.readdirSync(dir).filter((value) => value.endsWith(".json"))) validateFixture(kind, path.join(dir, name));
}
const coveredSchemas = new Set(fs.readdirSync(path.join(root, "fixtures/contracts/valid")).filter((name) => name.endsWith(".json")).map((name) => JSON.parse(fs.readFileSync(path.join(root, "fixtures/contracts/valid", name), "utf8")).schema));
for (const schema of schemas.filter((item) => !item.$id.endsWith("common.schema.json"))) assert.ok(coveredSchemas.has(path.basename(new URL(schema.$id).pathname)), `valid fixture covers ${schema.$id}`);

const common = schemas.find((schema) => schema.$id.endsWith("common.schema.json"));
assert.deepEqual(common.$defs.status.enum, ["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"]);
assert.deepEqual(common.$defs.privacyRoute.enum, ["browser", "wordpress_local", "local_service", "hub_provider", "commercial_byok"]);

const openApi = YAML.parse(fs.readFileSync(path.join(root, "openapi/local-engine.openapi.yaml"), "utf8"));
assert.equal(openApi.openapi, "3.1.0");
assert.equal(openApi.servers[0].url, "http://127.0.0.1:8741");
for (const route of ["/health", "/v1/capabilities", "/v1/analyses", "/v1/checker-results", "/v1/rewrite-jobs", "/v1/jobs/{id}", "/v1/jobs/{id}/events", "/v1/jobs/{id}/payload", "/v1/receipts/validate", "/v1/admin/models/plan", "/v1/admin/models/install", "/v1/admin/models/{id}"]) assert.ok(openApi.paths[route], `OpenAPI route ${route}`);
assert.equal(openApi.paths["/v1/checker-results"].post.responses["200"].content["application/json"].schema.$ref, "../schemas/v1/checker-result.schema.json");
const openApiText = fs.readFileSync(path.join(root, "openapi/local-engine.openapi.yaml"), "utf8");
for (const match of openApiText.matchAll(/\$ref:\s*['"]?([^'"#\s}]+\.json)/g)) assert.ok(fs.existsSync(path.resolve(root, "openapi", match[1])), `OpenAPI external ref ${match[1]}`);

for (const name of fs.readdirSync(path.join(root, "fixtures/contracts/hash")).filter((value) => value.endsWith(".json"))) {
  const vector = JSON.parse(fs.readFileSync(path.join(root, "fixtures/contracts/hash", name), "utf8"));
  const canonical = canonicalize(vector.value);
  assert.equal(canonical, vector.canonical, `${name} canonical bytes`);
  assert.equal(crypto.createHash("sha256").update(canonical, "utf8").digest("hex"), vector.sha256, `${name} SHA-256`);
}

const goldenManifest = JSON.parse(fs.readFileSync(path.join(root, "fixtures/golden/manifest.json"), "utf8"));
for (const fixture of goldenManifest.cases) assert.ok(fs.existsSync(path.join(root, "fixtures/golden", fixture.file)), `golden fixture ${fixture.id}`);

const unicodeSpan = JSON.parse(fs.readFileSync(path.join(root, "fixtures/contracts/valid/protected-span-unicode-offsets.json"), "utf8")).data;
assert.equal(validateProtectedSpan(unicodeSpan).valid, true, "UTF-16/code-point astral and combining-mark offsets");
assert.equal(validateProtectedSpan({ ...unicodeSpan, content_hash: "sha256:bad" }).valid, false, "protected span requires a source hash");
const pattern = JSON.parse(fs.readFileSync(path.join(root, "fixtures/contracts/valid/pattern-finding.json"), "utf8")).data;
assert.equal(validatePatternFinding(pattern).valid, true, "pattern finding offsets and matched hash");

const phpApi = JSON.parse(fs.readFileSync(path.join(root, "fixtures/integration/php-public-api-v1.json"), "utf8"));
const jsMount = JSON.parse(fs.readFileSync(path.join(root, "fixtures/integration/js-mount-v1.json"), "utf8"));
const contractSource = fs.readFileSync(path.join(root, "packages/contracts/src/index.ts"), "utf8");
for (const method of phpApi.methods) assert.ok(contractSource.includes(`"${method}"`), `PHP API method ${method}`);
for (const option of jsMount.requiredOptions) assert.ok(contractSource.includes(`"${option}"`), `JS mount option ${option}`);

console.log(`contracts: ${schemas.length} schemas; valid/invalid fixtures and OpenAPI passed`);
