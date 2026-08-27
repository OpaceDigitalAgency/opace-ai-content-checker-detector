# G1 contract gate probe

This independent probe exercises the contract invariants required before G1 can be frozen. It does not replace the normal test suite.

Run from the repository root:

```sh
node tests/gate/g1-contract-gate.mjs
```

The command deliberately exits non-zero while any contract invariant is missing. It checks every valid and invalid fixture, same-major additive compatibility, fail-closed majors/statuses, receipt retention privacy, the Anthropic placeholder, job transitions, offsets, OpenAPI routes/security/responses and the distinct PHP/JavaScript consumer identities.

Offset checks first use the JSON Schema. If cross-field offset rules live in code, expose either `validateContractSemantics(schemaName, value)` or the specific `validateProtectedSpan(value)` and `validatePatternFinding(value)` functions from one of:

- `packages/contracts/src/semantic-validation.mjs`
- `packages/contracts/src/semantic-validator.mjs`
- `packages/contracts/dist/semantic-validation.js`
- `packages/contracts/dist/semantic-validator.js`

Each function must return a boolean or `{ valid: boolean }`. A different reviewed module can be tested without changing the gate:

```sh
OACI_SEMANTIC_VALIDATOR=/absolute/path/to/module.mjs node tests/gate/g1-contract-gate.mjs
```

Do not weaken an assertion to obtain a green run. Resolve the owning schema, contract metadata, semantic validator or OpenAPI response contract, then run both:

```sh
npm test
node tests/gate/g1-contract-gate.mjs
```
