# @opace/content-integrity-client

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-integrity/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Typed client for the frozen Opace AI Content Integrity loopback API. It defaults to `http://127.0.0.1:8741`, performs no I/O during construction, rejects non-loopback origins and never logs bearer tokens or source text.

The package exposes the 12 frozen operations on the 11 OpenAPI route templates. Model administration operations exist for parity but the model-free service returns an honest disabled error until their request contracts and model manifests are approved.

MIT licensed. No telemetry, remote fallback or provider transport is included.

Use this package when a Node.js or browser-capable ESM client needs the separately started local engine. It is not required for deterministic browser-only checks.

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Install

```sh
npm install @opace/content-integrity-client
```

## Use

```js
import { createLocalClient } from '@opace/content-integrity-client';

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

Use the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-integrity/blob/main/SECURITY.md) for a vulnerability and never include a bearer token or source document in an issue. Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-integrity/blob/main/LICENSE).

For non-sensitive help, use [Content Integrity support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Troubleshooting and links

- **Origin rejected:** use `http://127.0.0.1:8741`; public hosts, redirects and alternate hostnames fail closed.
- **Authentication failed:** confirm the token callback returns the matching run or administration token without logging it.
- **Response rejected:** check the service and client use the same frozen contract and that the response stayed within the configured size limit.

[Opace AI Content Integrity](https://opace.agency/tools/ai/content-verification-integrity/) · [Local CLI and API guide](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/) · [Privacy notice](https://opace.agency/privacy-policy/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related CLI package](../cli/README.md)

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
[THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-integrity/blob/main/THIRD_PARTY_NOTICES.md).
