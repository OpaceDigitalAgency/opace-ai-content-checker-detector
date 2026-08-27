# Opace AI Content Integrity local engine

![Opace AI Content Integrity evidence workflow](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-content-integrity/main/docs/assets/opace-ai-content-integrity-hero-v2.png)

Loopback-only control plane for the frozen `oaci/v1` local API. It binds
to `127.0.0.1`, requires separate run/admin bearer tokens, retains job payloads
only in bounded process memory, and contains no telemetry or remote provider
transport.

Use the engine for authenticated local API workflows and offline command-line checks. It supplies evidence about named methods; it does not prove authorship, clear a commercial detector or provide a public web service.

Version 0.1.0 is tested on Python 3.12.11 on macOS arm64. Install
`requirements.lock` with `--require-hashes`, then install the built wheel with
`--no-deps`. Set distinct `OACI_RUN_TOKEN` and `OACI_ADMIN_TOKEN` values before
starting `opace-integrity serve`. `/health` is the sole unauthenticated route.

Offline `inspect`, `protect`, `compare` and hash-only `receipt` commands require
no service. Model-backed `improve`, watermark-lab and benchmark execution remain
explicitly unavailable. `--config` and `--cache-dir` fail clearly until their
persistence and permission policy is approved; they are never silently ignored.

Model administration is deliberately disabled pending approved model, data,
licence and hash records. The Docker candidate also requires an explicitly
approved digest-pinned Python base image and a pre-built offline wheelhouse, so
no Dockerfile or image is claimed by this component candidate.

## Install from PyPI

After the owner-approved public release:

```sh
python -m pip install opace-content-integrity==0.1.0
```

Confirm the installed version with `opace-integrity --version`. Use the exact-wheel route below before public registry publication or when verifying a release archive.

## Install the verified wheel

Build and test from the repository rather than installing an unverified archive:

```sh
python -m venv .venv
.venv/bin/pip install --require-hashes -r requirements.lock
.venv/bin/python -m build
.venv/bin/pip install --no-deps dist/opace_content_integrity-*.whl
```

Start the service with distinct runtime tokens:

```sh
export OACI_RUN_TOKEN='generate-a-long-random-run-token'
export OACI_ADMIN_TOKEN='generate-a-different-long-admin-token'
opace-integrity serve
```

Do not commit tokens or put them in shared shell history. The server rejects non-loopback bind addresses and wipes captured token values from its process environment after startup.

## Offline commands

```sh
opace-integrity inspect article.txt
opace-integrity protect extract article.txt
opace-integrity compare before.txt after.txt
opace-integrity receipt verify receipt.json
```

Use standard input for sensitive content. Receipts are hash-only unless a future, separately approved retention policy states otherwise.

## API and failure states

The OpenAPI source of truth is `../../openapi/oaci-v1.yaml`. `/health` is public on loopback; every other route requires the correct bearer token. Invalid envelopes, unknown codes, illegal job transitions and non-loopback origins fail closed. Model routes return a documented disabled error in this release rather than a sample result.

## Troubleshooting

### The service refuses to start

Confirm both token variables are present, different and sufficiently long, then check that `127.0.0.1:8741` is free. The service will not bind to a public interface.

### A browser request is rejected

Use the exact loopback origin and an allowed browser Origin. Redirects, remote hosts and unexpected Host headers are rejected before request-body processing.

### A model route is disabled

That is the expected 0.1.0 boundary. No model, detector or provider is bundled. Use deterministic offline commands or wait for a separately approved model manifest and release.

## Support, security and licence

- [CLI and local-engine documentation](https://opace.agency/tools/ai/content-integrity/cli/)
- [Privacy](https://opace.agency/tools/ai/content-integrity/privacy/)
- [Support](https://opace.agency/tools/ai/content-integrity/support/)
- [Repository security policy](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/SECURITY.md)
- [Opace AI Content Integrity](https://opace.agency/tools/ai/content-integrity/)
- [Opace artificial intelligence services](https://opace.agency/services/artificial-intelligence/)
- [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency)
- [Opace](https://opace.agency/)
- [Related Node CLI](../../packages/cli/README.md)

The local engine is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/LICENSE). Its exact dependencies and provenance are recorded in the [local-engine third-party notices](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/services/local-engine/THIRD_PARTY_NOTICES.md) and the [dependency ledger](https://github.com/OpaceDigitalAgency/opace-content-integrity/blob/main/docs/legal/DEPENDENCY-LEDGER.md).

Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).
