# @opace/content-integrity-cli

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-content-integrity/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Node CLI for offline Opace AI Content Integrity inspection, protected-span checks, comparison and hash-only receipt operations.

`opace-integrity --format json inspect -` reads UTF-8 stdin and writes machine output without banners or progress. `--offline` asserts the zero-network path; `--quiet` suppresses text-mode output. Unsupported configuration/cache options and held commands fail explicitly rather than being silently ignored. Models, provider calls, public watermark fixtures and content-bearing receipt storage remain unavailable.

MIT licensed.

Requires Node.js 20 or newer. The package installs the `opace-integrity` executable and uses the same frozen contract and deterministic core as the browser surfaces.

> Release state: a 0.1.0 npm candidate is prepared locally but is not published. The install command below applies only after owner-approved publication.

## Install

```sh
npm install --global @opace/content-integrity-cli
```

## Commands

```sh
opace-integrity inspect article.txt
opace-integrity inspect - --format json < article.txt
opace-integrity protect extract article.txt --format json
opace-integrity receipt verify receipt.json --format json
```

Use JSON mode for automation. Standard output contains only the requested machine result; diagnostics go to standard error. Hash-only receipts exclude the input text. The CLI never converts an unsupported or unavailable check into a passing result.

## Privacy and limits

Offline commands do not require the loopback service. Service-backed commands accept only the frozen loopback origin and runtime token handling; no cloud endpoint or provider fallback exists. Do not pass confidential text on a shared command line where shell history or process inspection may expose it; prefer standard input.

## Verify and support

```sh
npm ci
npm run typecheck
npm test
npm run pack:check
```

Models, comparative detector claims and content-bearing storage remain outside this package boundary. Report vulnerabilities through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/SECURITY.md). Opace-authored code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/LICENSE).

For non-sensitive help, use [Content Integrity support](https://opace.agency/get-in-touch/). Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Troubleshooting and links

- **Machine output contains unexpected text:** use `--format json`; normal results go to standard output and diagnostics to standard error.
- **A held option fails:** `--config`, `--cache-dir` and unavailable model commands are intentionally rejected rather than ignored.
- **Sensitive text appears in process arguments:** pipe it through standard input instead of placing it on the command line.

[Opace AI Content Integrity](https://opace.agency/tools/ai/content-verification-integrity/) · [CLI and local API guide](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/) · [Privacy notice](https://opace.agency/privacy-policy/) · [AI and automation services](https://opace.agency/services/artificial-intelligence/) · [Opace](https://opace.agency/) · [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency) · [Related local engine](../../services/local-engine/README.md)
