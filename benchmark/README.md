# Opace Content Integrity benchmark candidate

Private BENCH-10 mechanics for deterministic, offline benchmark runs. The included corpus is Opace-authored synthetic text; it is not evidence of detector or product performance.

```sh
npm ci --ignore-scripts
npm run test:all
node runners/cli.mjs validate manifests/synthetic/benchmark.json
node runners/cli.mjs freeze manifests/synthetic/benchmark.json --output .private/demo.lock.json
node runners/cli.mjs run .private/demo.lock.json --output .private/run --offline
node runners/cli.mjs aggregate .private/run --output .private/bundle
node runners/cli.mjs reproduce .private/bundle
node runners/cli.mjs inspect-release .private/bundle
```

Raw records are physically separated under `restricted/`. A bundle containing a mock result, restricted reference, raw text, local path, secret-shaped value or unapproved licence fails release inspection. Public Index publication and comparative claims remain blocked.

## What the mechanics prove

The runner validates manifest and result schemas, freezes exact input hashes, records environment details, calculates confidence intervals and paired comparisons, applies multiple-testing correction, and checks that an aggregate bundle can be reproduced byte-for-byte. It is designed to make an approved future benchmark inspectable.

The included 600 Opace-authored synthetic documents and 1,800 records test only those mechanics. They are not a representative evaluation corpus, do not support a detector ranking and must not appear in a public Index as product evidence.

## Release inspection

`inspect-release` fails when it finds mock results, restricted references, raw text, absolute/local paths, secret-shaped values, missing licences or an unapproved corpus state. Keep private records under `.private/` or `restricted/`; do not copy them into public output.

Before any comparative release, record the corpus licence, provider terms, human-review protocol, exact method versions, missing/failed runs, statistical plan and independent reproduction. The repository's G7 gate remains authoritative.

## Security, provenance and licence

Run `npm run audit:licences` and `npm run sbom` with the full test suite. The generated CycloneDX inventory is at `reports/sbom.cdx.json`. Report vulnerabilities through the repository [security policy](../SECURITY.md), without attaching restricted data.

Opace-authored benchmark mechanics are available under the [MIT Licence](LICENSE). Third-party runtime and research references are listed in the repository [dependency ledger](../docs/legal/DEPENDENCY-LEDGER.md); their inclusion there does not approve them for a public corpus or performance claim.
