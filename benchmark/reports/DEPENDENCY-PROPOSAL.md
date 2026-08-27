# BENCH-10 dependency proposal

This is a component-owner proposal, not a change to the shared legal ledger or release approval.

| Component | Exact role | Licence | Package state |
|---|---|---|---|
| `@opace/content-integrity-contracts` `0.0.0-private` | Frozen schema/contract identity | MIT | Runtime local package, already programme-approved |
| `@opace/content-integrity-core` `0.0.0-private` | Actual deterministic core-result ingestion | MIT | Runtime local package, corrected G2 refreeze2 |
| `ajv` `8.20.0` | Draft 2020-12 runtime validation | MIT | Runtime dependency; already allowed for private contract tests |
| `ajv-formats` `3.0.1` | Runtime date-time validation | MIT | Runtime dependency; already allowed for private contract tests |
| `fast-uri` `3.1.6` | Ajv transitive URI parser | BSD-3-Clause | Runtime transitive; propose LEGAL-00 allow before distribution |
| `fast-deep-equal` `3.1.3` | Ajv transitive | MIT | Runtime transitive |
| `json-schema-traverse` `1.0.0` | Ajv transitive | MIT | Runtime transitive |
| `require-from-string` `2.0.2` | Ajv-formats transitive | MIT | Runtime transitive |

No model, dataset, source snapshot, provider SDK, telemetry or post-install dependency is included. The exact private npm candidate contains source/manifests but no `node_modules`; any distribution remains held for the integrator/legal review.
