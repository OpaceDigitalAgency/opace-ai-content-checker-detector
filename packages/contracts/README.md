# @opace/content-integrity-contracts

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-content-integrity/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Package containing the frozen Opace AI Content Integrity v1 TypeScript contract declarations and cross-surface constants.

Use it to keep JavaScript, TypeScript, WordPress and local-service integrations aligned on the same schemas, statuses and privacy routes. It defines evidence structures; it does not prove authorship or run a detector.

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

- Schema version: `1.0`
- Contract version: `1.0.0`
- Source of truth: the repository JSON Schemas under `schemas/v1/`
- Runtime behaviour: no transport, telemetry or content processing
- Licence: MIT for the Opace-authored package

Generated declarations must remain schema-checked. Unsupported, unavailable, not configured, not run, inconclusive and error states must never be converted to pass.

Repository-wide dependency, contract and provenance evidence is recorded in `THIRD_PARTY_NOTICES.md`, `MODEL_AND_DATA_PROVENANCE.md` and `docs/legal/DEPENDENCY-LEDGER.md` at the project root.

## Install

```sh
npm install @opace/content-integrity-contracts
```

## Use and compatibility

```js
import {
  CONTRACT_VERSION,
  SCHEMA_VERSION,
  METHOD_STATUSES,
  PRIVACY_ROUTES,
} from '@opace/content-integrity-contracts';
```

Readers accept additive fields from the same contract major and fail closed on an unknown status or wrong major. Every consuming surface must preserve the canonical statuses and the `browser`, `wordpress_local`, `local_service`, `hub_provider` and `commercial_byok` privacy routes. Do not infer availability from a missing method.

Requires an ESM-compatible JavaScript runtime. TypeScript declarations ship with the package. Contract `1.0.0` is paired with schema `1.0`; consumers must check both values at their boundary.

Run `npm test` in this package after a declaration change, then run the repository G1 and G2 gates. Contract or schema changes require compatibility review; editing generated declarations alone is not supported.

## Privacy, security and licence

This package performs no I/O and contains no content processor, network client or install hook. It is safe to import in browser and server builds, but it does not validate untrusted runtime payloads by itself; use the schema/semantic validators at the relevant boundary.

See the repository [security policy](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/SECURITY.md) before reporting a vulnerability. Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/LICENSE).

For non-sensitive help, use [Content Integrity support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Troubleshooting and links

- **Unknown status:** reject the payload and confirm both sides use contract `1.0.0`.
- **Types changed but runtime did not:** regenerate from `schemas/v1/`; do not edit generated declarations alone.
- **Need runtime validation:** apply the canonical JSON Schemas at the trust boundary. This constants package is not a validator.

[Opace AI Content Integrity](https://opace.agency/tools/ai/content-verification-integrity/) · [Developer and CLI guide](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related browser package](../browser/README.md)
