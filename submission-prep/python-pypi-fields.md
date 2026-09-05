# Python and PyPI fields

Canonical source: `services/local-engine/pyproject.toml` and `services/local-engine/README.md`.

| Field | Prepared value |
|---|---|
| Project (distribution name) | `opace-ai-content-checker` |
| Import package | `opace_integrity` — deliberately unchanged, see below |
| Version | `0.3.1` |
| Summary | Free local AI content checker CLI and authenticated loopback API, with optional pinned ONNX model detection, section evidence and content-free receipts. |
| Python | `>=3.11,<3.14` |
| Licence | MIT |
| CLI | `opace-ai-checker` (alias `opace-integrity` for one release) |
| Service | `opace-ai-checker serve` |
| Keywords | ai-checker, ai-detector, ai-content-checker, loopback, offline, cli, privacy |
| Homepage and docs | `https://opace.agency/tools/ai/content-verification-integrity/cli-local-service/` |
| Source | `https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector` |
| Issues | `https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/issues` |
| Privacy | `https://opace.agency/privacy-policy/` |
| Support | `https://opace.agency/get-in-touch/` |

## The distribution name and the import package differ, on purpose

The distribution is `opace-ai-content-checker`. The import package stays `opace_integrity`, so
`from opace_integrity import ...` and `python -m opace_integrity` are unchanged. Renaming it would
break every import path, every `PYTHONPATH` recipe in this repository, the packaged contract schemas
under `opace_integrity/contracts/schemas/` and both model-manifest examples, for no reader-facing
benefit — nobody searching for an AI checker types an import path. The difference is stated in the
first section of `services/local-engine/README.md` so nobody hits it as a surprise.

The command is `opace-ai-checker`. `opace-integrity` remains installed as a second console script
for this one release so existing scripts keep working, and is removed in the next minor version.
Both entry points are declared in `[project.scripts]`.

## Current copy-refresh candidate

The September 5 wheel and sdist are in `services/local-engine/dist/discovery-2026-09-05/`. Both reproduce byte-for-byte in the repeat build; Twine metadata and long-description checks pass. Exact hashes are in `submission-manifest.json`. These files are not published.

## Previous candidate evidence

The following records the pre-copy-refresh build. Rebuilding is required before publication; do not treat its hashes as covering the September 5 documentation.

`services/local-engine/dist/public-0.3.0/` holds the exact wheel and sdist. Both were built twice
with `services/local-engine/scripts/build-local-candidate.py` (`SOURCE_DATE_EPOCH=1787745600`,
`python -m build`, then the sdist rewritten to USTAR with uid/gid 0, empty owner names, that mtime,
no PAX headers and a zeroed gzip header) and are byte identical across the two runs. Twine 7.0.0
metadata and long-description checks pass on both. `SHA256SUMS` for the pair is kept in
`services/local-engine/dist/cycle5-0.3.0-candidate-2026-09-03/`, out of the publish directory so a
`twine upload dist/public-0.3.0/*` cannot pick it up.

A clean Python 3.12 consumer installed the hash-locked runtime dependencies with `--require-hashes`
and then the exact wheel with `--no-deps`: `pip check` reported no broken requirements, and
`opace-ai-checker --version`, `opace-integrity --version` and `python -m opace_integrity --version`
all printed `0.3.1`.

## Account gates

PyPI returned 404 for the previous project URL on 26 August 2026, and the new name was not probed by
this lane. A 404 does not prove account ownership or reserve a name. Owner login, organisation
membership, two-factor authentication and trusted publishing all remain submission-time account
gates. Models and comparative benchmark claims remain held.
