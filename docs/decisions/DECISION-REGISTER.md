# Phase 0 decision register

Date: 26 August 2026. Authority: project specifications plus current owner instruction to begin local development. This register does not authorise publication or future Hub/AI-Scribe edits.

| ID | State | Phase 0 value | Evidence/reason | Downstream note |
|---|---|---|---|---|
| DEC-01 | working only | Organisation `OpaceDigitalAgency`; repository/package names provisional | Spec 08 resolved working assumption | Verify access, trademark and registry availability before any public creation |
| DEC-02 | resolved design | One `/tools/` card to `/tools/ai/content-integrity/`; plugin route `/tools/ai/content-integrity/wordpress/` | Owner clarification in planning set | Live active Astro checkout must still be verified |
| DEC-03 | resolved planning | MIT for Opace-authored non-WordPress code | Specs 04/08 | Dependency ledger gates distribution |
| DEC-04 | resolved planning | GPL-2.0-or-later WordPress distribution | Spec 08 | Bundled dependency review still required |
| DEC-05 | resolved | JSON Schema sole wire source; `schema_version` and `contract_version` | Specs 04/08 | Implemented in `schemas/v1/` |
| DEC-06 | resolved | `browser`, `wordpress_local`, `local_service`, `hub_provider`, `commercial_byok` | Specs 00/04/08 | Closed enum |
| DEC-07 | resolved | WordPress REST namespace `oaci/v1` | Spec 08 | Collision test belongs to WordPress lane |
| DEC-08 | resolved | `admin.php?page=oaci-lab` | Spec 08 | Hub must consume registered URL |
| DEC-09 | resolved | `http://127.0.0.1:8741` | Specs 04/08 | Explicit alternate port may be configured |
| DEC-10 | resolved | Resource/job routes in Spec 04 | Specs 04/08 | Implemented in OpenAPI candidate |
| DEC-11 | resolved recommendation | Loopback only in v1 | Spec 08 | Remote/LAN requires later threat model and approval |
| DEC-17 | resolved recommendation | No Opace telemetry in v1 | Spec 08 | Local categorical no-text hooks may be added later |
| DEC-21 | resolved | `Opace\ContentIntegrity\Integration\PublicApi::instance()`, `oaci_ready`, Spec 01 method set | Specs 01/08 | Contract declaration records exact facade |
| DEC-22 | resolved | `watermark.anthropic`; unsupported until official authorised call | Specs 00/04/08 | Golden fixture forbids proxy score |
| DEC-23 | accepted local candidate; effective after G2 | Per-site `$wpdb` prefix plus `opace_ci_jobs` and `opace_ci_receipts`; never `base_prefix`; no v1 candidate table | ADR 0007; integration owner acceptance on 26 August 2026 | Legacy `oaci_*` fails read-only; any zero-loss migration needs separate approval |

Owner-dependent items remain in `OWNER-DECISIONS.md`. A planning recommendation is not recorded as owner approval.
