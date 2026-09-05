# @opacedev/ai-content-checker-contracts

![Free Opace AI Content Checker, Detector and Watermark Tools](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-checker-detector/main/docs/assets/opace-ai-content-checker-detector-hero-v3.png)

Package containing the frozen Opace AI Content Checker & Detector v1 TypeScript contract declarations and cross-surface constants.

Use it to keep JavaScript, TypeScript, WordPress and local-service integrations aligned on the same schemas, statuses and privacy routes. It defines evidence structures; it does not prove authorship or run a detector.

`checker-result.schema.json` is the additive full-result interchange contract. It carries the three independent result axes, Cycle-5 route/model identity, zero-based scored sections, provenance/C2PA/watermark states, content-free share/receipt metadata, complete-report metadata and abuse-control state. The JSON Schema checks structure; producers and renderers must also run the semantic guard exported by `@opacedev/ai-content-checker-core` before serialising or presenting a result.

> Release state: a 0.3.1 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

- Schema version: `1.0`
- Contract version: `1.0.0`
- Source of truth: the repository JSON Schemas under `schemas/v1/`
- Runtime behaviour: no transport, telemetry or content processing
- Licence: MIT for the Opace-authored package

Generated declarations must remain schema-checked. Unsupported, unavailable, not configured, not run, inconclusive and error states must never be converted to pass.

Repository-wide dependency, contract and provenance evidence is recorded in `THIRD_PARTY_NOTICES.md`, `MODEL_AND_DATA_PROVENANCE.md` and `docs/legal/DEPENDENCY-LEDGER.md` at the project root.

## TypeScript contracts for AI content checker integrations

Build a consistent integration around the Opace free AI content checker. This package supplies shared types and status constants so an application can distinguish a model reading from Unicode findings, editorial suggestions and unavailable checks. It is a contract library, not an AI detector.

## Use cases for developers

Use the declarations when building an editor panel, validating an integration boundary or exchanging evidence between a browser and local service. Preserve route identity and section indexes so users can connect an explanation to the text actually assessed.

## New in the 0.3.1 package set

The renamed `@opacedev/ai-content-checker-*` packages share the current result contracts and documented privacy boundaries. This documentation revision adds component-specific guidance and corrected discovery links; it does not add model inference to this library.

## AI checker integration questions

**Does this package check text for AI?** No. Use a full checker surface or an explicitly configured model runtime. Importing types does not analyse content.

**Is a valid schema enough?** No. Validate semantic invariants as well as shape; an unrun model must remain unassessed.

**Is it free?** Opace-authored code is MIT licensed and importing this package performs no network request.

[Use the free online AI checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Browse the complete source](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector) · [Opace AI development services](https://opace.agency/services/artificial-intelligence/)

## Install

```sh
npm install @opacedev/ai-content-checker-contracts
```

## Use and compatibility

```js
import {
  CONTRACT_VERSION,
  SCHEMA_VERSION,
  METHOD_STATUSES,
  PRIVACY_ROUTES,
} from '@opacedev/ai-content-checker-contracts';
```

Readers accept additive fields from the same contract major and fail closed on an unknown status or wrong major. Every consuming surface must preserve the canonical statuses and the `browser`, `wordpress_local`, `local_service`, `hub_provider` and `commercial_byok` privacy routes. Do not infer availability from a missing method.

Requires an ESM-compatible JavaScript runtime. TypeScript declarations ship with the package. Contract `1.0.0` is paired with schema `1.0`; consumers must check both values at their boundary.

Run `npm run sync:contracts` at the repository root after changing a schema. It regenerates the TypeScript declarations and synchronises the client and Python schema copies. Then run `npm test` in this package and the repository G1 and G2 gates. Contract or schema changes require compatibility review; editing generated declarations alone is not supported.

## Privacy, security and licence

This package performs no I/O and contains no content processor, network client or install hook. It is safe to import in browser and server builds, but it does not validate untrusted runtime payloads by itself; use the schema/semantic validators at the relevant boundary.

See the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/SECURITY.md) before reporting a vulnerability. Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/LICENSE).

For non-sensitive help, use [Opace AI Content Checker & Detector support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CONTRIBUTING.md) and [changelog](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CHANGELOG.md).

## Troubleshooting and links

- **Unknown status:** reject the payload and confirm both sides use contract `1.0.0`.
- **Types changed but runtime did not:** regenerate from `schemas/v1/`; do not edit generated declarations alone.
- **Need runtime validation:** apply the canonical JSON Schemas at the trust boundary. This constants package is not a validator.

[Opace AI Content Checker & Detector](https://opace.agency/tools/ai/content-verification-integrity/) · [Developer and CLI guide](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related browser package](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/packages/browser/README.md)

## Attribution

The engine this package serves was built on credited open-source work: chiefly
[avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) (MIT, Conor Bronsdon and
contributors) for the writing-signal rules and stylometrics,
[watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover) (MIT, Guillaume Meyer)
for the carrier and confusable table data, and
[Unicode Consortium character data](https://www.unicode.org/Public/UCD/latest/), with phrase and
structural rule data adapted from [antislop-sampler](https://github.com/sam-paech/antislop-sampler),
[slop-forensics](https://github.com/sam-paech/slop-forensics),
[SLOP_Detector](https://github.com/SicariusSicariiStuff/SLOP_Detector),
[slop-gate](https://github.com/hwajongpark/slop-gate),
[anti-ai-writing](https://github.com/avectats7/anti-ai-writing),
[anti-slop](https://github.com/kjmagnan1s/anti-slop),
[claude-slop-detector](https://github.com/aplaceforallmystuff/claude-slop-detector) and
[Wikipedia's *Signs of AI writing*](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
(CC BY-SA 4.0). Several well-known detector repositories were cloned and read during research and
are credited as read, not used; nothing here derives from `fast-detect-gpt`, `Binoculars`,
`RADAR`, `DIPPER`, `ai-detector-bench`, `BIRA`, `SIRA` or `MarkLLM`. Full records:
[THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/THIRD_PARTY_NOTICES.md).

## Evidence

Every accuracy figure this project publishes is measured, carries its denominator and names its
source report. The six result charts, the per-register detection and false-positive tables and the
complete weakness list are on the [repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#what-it-measures-and-where-it-fails).

- [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/EVIDENCE-INDEX.md) — every test result and research artefact, with paths
- [Test evidence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/TEST-EVIDENCE.md) — verbatim suite totals and the current-model appendix
- [Route parity](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/measurements/ROUTE-PARITY.md) — browser int8 against server fp32, all disagreements written out
- [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations) — where the tool is weakest, ranked, with denominators
