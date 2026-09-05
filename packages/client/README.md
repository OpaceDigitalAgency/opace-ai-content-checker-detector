# @opacedev/ai-content-checker-client

![Free Opace AI Content Checker, Detector and Watermark Tools](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-checker-detector/main/docs/assets/opace-ai-content-checker-detector-hero-v3.png)

Typed client for the frozen Opace AI Content Checker & Detector loopback API. It defaults to `http://127.0.0.1:8741`, performs no I/O during construction, rejects non-loopback origins and never logs bearer tokens or source text.

The package exposes the 12 frozen operations on the 11 OpenAPI route templates. Model administration operations exist for parity but the model-free service returns an honest disabled error until their request contracts and model manifests are approved.

MIT licensed. No telemetry, remote fallback or provider transport is included.

Use this package when a Node.js or browser-capable ESM client needs the separately started local engine. It is not required for deterministic browser-only checks.

> Release state: a 0.3.1 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Local API client for AI content checker applications

Connect a JavaScript or TypeScript application to Opace's separately started local engine. The free typed client supplies the API transport for an on-machine content-checking workflow, with loopback-only destinations and explicit authentication.

## Use cases for developers

Use it when a desktop tool or Node application needs structured local-service results. It does not start a server, install a model or fall back to a hosted AI detector. Model capability depends on the server configuration; disabled operations remain explicit.

## New in the 0.3.1 package set

The renamed `@opacedev/ai-content-checker-*` packages share the current result contracts and documented privacy boundaries. This documentation revision adds component-specific guidance and corrected discovery links; it does not add model inference to this library.

## AI checker integration questions

**Is this a hosted AI detection API?** No. It connects only to the supported local endpoint.

**Does the client itself detect AI text?** No. It transports requests and validates responses; analysis belongs to the configured engine.

**Is the API key a paid provider key?** No. The bearer token is local access control and must be supplied securely at runtime.

[Use the free online AI checker](https://opace.agency/tools/ai/content-verification-integrity/checker/) · [Browse the complete source](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector) · [Opace AI development services](https://opace.agency/services/artificial-intelligence/)

## Install

```sh
npm install @opacedev/ai-content-checker-client
```

## Use

```js
import { createLocalClient } from '@opacedev/ai-content-checker-client';

const client = createLocalClient({
  baseUrl: 'http://127.0.0.1:8741',
  token: () => process.env.OACI_RUN_TOKEN,
});
```

Pass tokens at runtime and keep them out of source, logs, command history and browser bundles. The client validates request/response envelopes and error codes against the frozen contract. It does not start the service or retry through a remote origin.

Requires Node.js 20 or another modern ESM runtime with `fetch`, streams and `AbortSignal`. The default endpoint is loopback only. Browsers remain subject to the local engine's Origin policy.

## Failure behaviour

Non-loopback URLs, malformed envelopes, unknown error codes and illegal job transitions fail closed. Cancellation and stream parsing preserve the server's terminal state. Model administration returns the service's explicit disabled response in the model-free release.

## Verify and support

```sh
npm ci
npm run typecheck
npm test
npm run pack:check
```

Use the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/SECURITY.md) for a vulnerability and never include a bearer token or source document in an issue. Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/LICENSE).

For non-sensitive help, use [Opace AI Content Checker & Detector support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CONTRIBUTING.md) and [changelog](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/CHANGELOG.md).

## Troubleshooting and links

- **Origin rejected:** use `http://127.0.0.1:8741`; public hosts, redirects and alternate hostnames fail closed.
- **Authentication failed:** confirm the token callback returns the matching run or administration token without logging it.
- **Response rejected:** check the service and client use the same frozen contract and that the response stayed within the configured size limit.

[Opace AI Content Checker & Detector](https://opace.agency/tools/ai/content-verification-integrity/) · [Local CLI and API guide](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/) · [Privacy notice](https://opace.agency/privacy-policy/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related CLI package](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/packages/cli/README.md)

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
