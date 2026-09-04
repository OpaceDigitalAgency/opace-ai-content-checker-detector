# Opace AI Content Checker & Detector local engine

![Free Opace AI Content Checker, Detector and Watermark Tools](https://raw.githubusercontent.com/OpaceDigitalAgency/opace-ai-content-checker-detector/main/docs/assets/opace-ai-content-checker-detector-hero-v3.png)

Loopback-only control plane for the frozen `oaci/v1` local API. It binds
to `127.0.0.1`, requires separate run/admin bearer tokens, retains job payloads
only in bounded process memory, and contains no telemetry or remote provider
transport. Its optional full-checker route runs only an explicitly configured,
hash-pinned Cycle-5 model on the same device.

Use the engine for authenticated local API workflows and offline command-line checks. It supplies evidence about named methods; it does not prove authorship, clear a commercial detector or provide a public web service.

## Names

The distribution on PyPI is **`opace-ai-content-checker`**. It was `opace-content-integrity` before
0.3.0; nothing was published under that name.

The **import package is still `opace_integrity`** — `from opace_integrity import ...`,
`python -m opace_integrity`. It is deliberately unchanged, because renaming it would break every
import path, every `PYTHONPATH` recipe in this repository and every model-manifest example for no
reader-facing benefit. Expect the two names to differ.

The command is **`opace-ai-checker`**. `opace-integrity` is still installed as an alias for this one
release so existing scripts keep working; it will be removed in the next minor version.

Version 0.3.0 supports Python 3.11–3.13. The current final-byte evidence records clean Cycle-5
inference on Python 3.11.13, 3.12.11 and 3.13.7 on Linux x86_64, plus Python 3.12.11 on macOS
arm64. Other operating-system and architecture combinations remain unclaimed until their exact
wheel matrix passes. Install `requirements.lock` with `--require-hashes`, then install the built
wheel with `--no-deps`. Set distinct `OACI_RUN_TOKEN` and `OACI_ADMIN_TOKEN` values before starting
`opace-ai-checker serve`. `/health` is the sole unauthenticated route.

Offline `inspect`, `protect`, `compare` and hash-only `receipt` commands require
no service. `POST /v1/checker-results` is available only when `serve` receives
an absolute `--model-dir` whose manifest, model, vocabulary, runtime and
contracts all match the pinned Cycle-5 values; otherwise it returns
`method_not_configured` without a score. Model-backed `improve`, watermark-lab
and benchmark execution remain explicitly unavailable. `--config` and
`--cache-dir` fail clearly until their
persistence and permission policy is approved; they are never silently ignored.
Cycle-5 scoring accepts 60–8,000 words and up to 100,000 browser-compatible
UTF-16 code units; the loopback HTTP envelope is capped at 250,000 bytes. Inputs
outside those limits are refused rather than truncated.

No model is part of the Python package. `model install` is the explicit-consent convenience route:
it first presents a 34.5 MB plan, then downloads only the hash-pinned int8 model and vocabulary
from the exact Opace HTTPS asset directory after both consent flags are supplied. Redirects,
compressed responses, wrong sizes and wrong hashes fail closed; interrupted or failed installs
leave no partial destination. `model prepare` remains the zero-network route for authorised local
int8 files or the 133.8 MB fp32 compatibility model. Neither command sends checked text.

## Install from PyPI

After the owner-approved public release:

```sh
python -m pip install opace-ai-content-checker==0.3.0
```

Confirm the installed version with `opace-ai-checker --version`. Use the exact-wheel route below before public registry publication or when verifying a release archive.

## Install the verified wheel

Build and test from the repository rather than installing an unverified archive:

```sh
python -m venv .venv
.venv/bin/pip install --require-hashes -r requirements.lock
.venv/bin/python -m build
.venv/bin/pip install --no-deps dist/opace_ai_content_checker-*.whl
```

## Install the recommended local model

Review the exact bytes, licence, storage and two-request network plan first:

```sh
opace-ai-checker --format json model plan
```

When you accept both the download and the model licence record, install to a new absolute directory:

```sh
opace-ai-checker model install \
  --output /absolute/path/to/opace-cycle5-int8 \
  --accept-download \
  --accept-model-licence
opace-ai-checker --format json model verify \
  --model-dir /absolute/path/to/opace-cycle5-int8
```

The allowlist is `https://opace.agency/models/local-signals-v1/` and contains only
`tier3-cycle5-full-e5small-int8-perchannel.onnx` (34,301,767 bytes; SHA-256
`9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b`) and `vocab.txt`
(231,508 bytes; SHA-256 `07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3`).
The files stay in the directory you choose. Removal is a normal local-directory operation and is
never performed automatically by the package.

For an air-gapped install, use `model prepare --precision int8` with those exact two local files.
Use `--precision fp32` only when the separately authorised fp32 bytes are already available; the
installer never downloads or bundles that 133.8 MB artefact.

Start the service with distinct runtime tokens:

```sh
export OACI_RUN_TOKEN='generate-a-long-random-run-token'
export OACI_ADMIN_TOKEN='generate-a-different-long-admin-token'
opace-ai-checker serve --model-dir /absolute/path/to/verified-cycle5-directory
```

Do not commit tokens or put them in shared shell history. The server rejects non-loopback bind addresses and wipes captured token values from its process environment after startup. Omit `--model-dir` only when running deterministic endpoints; the full-checker endpoint then fails closed. The required directory layout is in `model-manifest.example.json`.

## Offline commands

```sh
opace-ai-checker inspect article.txt
opace-ai-checker protect extract article.txt
opace-ai-checker compare before.txt after.txt
opace-ai-checker receipt verify receipt.json
```

Run the complete Cycle-5 checker directly and create a self-contained printable report:

```sh
opace-ai-checker --format html inspect - \
  --model-dir /absolute/path/to/opace-cycle5-int8 < article.txt > report.html
```

The HTML report is the branded printable evidence report: a five-band dial gauge, the level and its
plain-English meaning, the strongest section, every section with its score, level, passage and
evidence, the three independent readings, every named check, the route, model, privacy and
input-limit record, the counts and hashes, the correct-use limitations and the complete machine
record. It loads no script, stylesheet, font or image, makes no request and prints to A4. The score
is a zero-to-one pattern reading and is never presented as a percentage. The Node CLI renders the
same report from the same result.

Version 0.3.0 is development source. It supersedes the frozen local 0.1.0 and 0.2.0 wheels and
source archives, which were built under the previous distribution name; nothing has been
published.

Without `--model-dir`, `inspect` deliberately stays deterministic and reports the AI-pattern axis
as `not_assessed`.

Use standard input for sensitive content. Receipts are hash-only unless a future, separately approved retention policy states otherwise.

## API and failure states

`/health` is public on loopback; every other route requires the correct bearer token. Invalid envelopes, unknown codes, illegal job transitions and non-loopback origins fail closed. `POST /v1/checker-results` is declared in the shared OpenAPI file, negotiates the version-1 canonical result and returns full sections, axes, route and retention facts.

## Troubleshooting

### The service refuses to start

Confirm both token variables are present, different and sufficiently long, then check that `127.0.0.1:8741` is free. The service will not bind to a public interface.

### A browser request is rejected

Use the exact loopback origin and an allowed browser Origin. Redirects, remote hosts and unexpected Host headers are rejected before request-body processing.

### A model route is disabled

No model is bundled. Run `model plan` and `model install`, or supply an absolute air-gapped
directory based on `model-manifest.example.json`; any missing or mismatched byte, contract or
runtime fails closed. `numpy==2.3.4` and `onnxruntime==1.29.0` are part of the exact dependency lock.

## Support, security and licence

- [CLI and local-engine documentation](https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/)
- [Privacy](https://opace.agency/privacy-policy/)
- [Support](https://opace.agency/get-in-touch/)
- [Repository security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/SECURITY.md)
- [Opace AI Content Checker & Detector](https://opace.agency/tools/ai/content-verification-integrity/)
- [Opace artificial intelligence services](https://opace.agency/services/artificial-intelligence/)
- [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency)
- [Opace](https://opace.agency/)
- [Related Node CLI](../../packages/cli/README.md)

The local engine is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/LICENSE). Its exact dependencies and provenance are recorded in the [local-engine third-party notices](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/services/local-engine/THIRD_PARTY_NOTICES.md) and the [dependency ledger](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/legal/DEPENDENCY-LEDGER.md).

Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Evidence

Every accuracy figure this project publishes is measured, carries its denominator and names its
source report. The six result charts, the per-register detection and false-positive tables and the
complete weakness list are on the [repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#what-it-measures-and-where-it-fails).

- [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/EVIDENCE-INDEX.md) — every test result and research artefact, with paths
- [Test evidence](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/TEST-EVIDENCE.md) — verbatim suite totals and the current-model appendix
- [Route parity](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/blob/main/docs/measurements/ROUTE-PARITY.md) — browser int8 against server fp32, all disagreements written out
- [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector#honest-limitations) — where the tool is weakest, ranked, with denominators
