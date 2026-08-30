# Public package and WordPress README refreeze — 27 August 2026

## Verdict

**PASS for the local submission boundary.** The final README/listing improvements were refrozen into every affected public artefact. Product versions remain npm/PyPI `0.1.0` and WordPress `1.0.4`. No executable, schema, API, database or cache-bust version changed. Nothing was committed, pushed, published, deployed or submitted.

The Astro README is byte-identical to the already accepted archive, so the Astro package was deliberately not rebuilt. Its SHA-256 remains `4a45e4530acb82b514797b7424a4d4d71bff314cd5d48136b8aefef6d1e82da5`.

## Exact current artefacts

| Artefact | SHA-256 |
|---|---|
| npm five-package manifest | `f2e09e2e3894263544503c3d0d1c416104bdb7def33e9409ea4e15745193fe20` |
| `@opace/content-integrity-contracts@0.1.0` | `a5d220b89a1ad6d0f1a63dedf62cdd452613d0eaf16db4fdb5872a9bfd956b76` |
| `@opace/content-integrity-core@0.1.0` | `3f3ece941cb1c03bc9dd89d4db8561f1477530545bc91ecaf4d474e8d3719833` |
| `@opace/content-integrity-browser@0.1.0` | `6a3918c3efb48d76179b18d3000f3602daa65ef1958146a8cf588dbb57f86718` |
| `@opace/content-integrity-client@0.1.0` | `0afc623f53e37e9880a899ee8110998faeec33be48e756d1e2975b9ee0c57d73` |
| `@opace/content-integrity-cli@0.1.0` | `8f7325b102eb21a466929cd70fa554d17bfc1c2290ca80fe2cdef10a15d7ec86` |
| `@opace/astro-content-integrity@0.1.0` (unchanged) | `4a45e4530acb82b514797b7424a4d4d71bff314cd5d48136b8aefef6d1e82da5` |
| Python wheel | `ddd0b16009cdb3980a6a0a6f46a265312e49da7687d7c7ff87358adacb3b943d` |
| Python canonical sdist | `34c65f6efbfb8f3a4f014b9de49888bf3b7ffefb63ca3ab3754f1a40587f7d46` |
| WordPress 1.0.4 ZIP | `084556a727022f23cd33e6b8111694fb6e447898d9c5b005b091d2057f8520ec` |

`submission-prep/submission-manifest.json`, `dist/public-0.1.0/npm/manifest.json`, `dist/WORDPRESS-CURRENT-SHA256.txt` and the WordPress submission-bundle checksums now identify these exact files. `node scripts/verify-submission-candidates.mjs` passed all eight manifest-controlled npm/Astro/Python hashes.

## Superseded exact hashes

The following pre-copy-improvement candidates are historical and must not be published:

- npm manifest `df37ecd297185e1e4cf69dc6d0593676b43279d0c31b8582200b6e8afea3afd9`;
- Python wheel `02aecd6b9d3aac55a3b21adc089d0e81f6c769940946fd399442386ce589ee3c`;
- Python sdist `1ebbc8d7fa5499584b7d8b865f65de3c254263cac812b812f763f46527f67cbe`;
- WordPress ZIP `a69f0eac300d27a0106f7db768d92d51f1a235ef269d735c0c0d8db6eb9e3a4e`.

The five individual prior npm hashes are retained only in `PUBLIC-PACKAGES-INDEPENDENT-SUBMISSION-AUDIT.md`, which is now marked superseded. The former WordPress ZIP remains only in the historical FINAL1 evidence builds.

## Reproducibility and package consumers

- Two independent developer-package builds reproduced all five npm archives and their manifest byte-for-byte.
- A clean consumer installed the five exact npm archives together, passed `npm ls --all`, imported all five public entry points, ran `opace-integrity --version` and `--help`, and reported zero audit findings.
- All five exact npm archives passed `npm publish --dry-run --access public --provenance=false`; no publication occurred.
- Two Python builds produced byte-identical wheels. Canonical fixed-metadata repacking produced byte-identical sdists from both builds.
- Twine 7.0.0 passed the exact wheel and sdist. Fresh Python 3.12 wheel and sdist consumers passed `pip check`, package/version imports, CLI help and service help.
- The Python source suite passed 31/31.
- The full root regression passed: 13 schemas and all cross-language fixtures, core 20/20, G1 14/14, G2 24/24 across Chromium, Firefox and WebKit, plus both deterministic package gates.

## WordPress exact-package closure

- Three ordinary builds reproduced the current ZIP byte-for-byte.
- The ZIP contains one plugin root, 301 files and 258 PHP files.
- Compared with the previously accepted 1.0.4 ZIP, exactly `README.md` and `readme.txt` changed. There are no added or removed files and every executable/runtime byte is identical.
- An isolated WordPress/PHP 8.3 installation of the exact ZIP passed Plugin Check with `Success: Checks complete. No errors found.`
- The official WordPress.org readme validator returned no errors or warnings. Its only informational note was the absence of an optional donate link.
- The source suites passed JavaScript 9/9, package contract 2/2, PHPUnit 14/14 with 82 assertions, PHPCS 33/33, JavaScript lint, PHP source lint and npm audit with zero vulnerabilities.
- Every file in `dist/wordpress-submission-prep-1.0.4/CHECKSUMS.sha256` verified, including the refrozen ZIP and copied `readme.txt`.
- The unchanged executable tree retains the accepted minimum/current/Multisite, PHP 7.4, lifecycle, REST, editor, responsive, focus and plugin-scope axe evidence. No runtime claim is inferred from documentation-only testing.

Exact WordPress refreeze logs and validator output are under `wordpress/opace-ai-content-integrity/tests/evidence/g4/1.0.4-readme-refreeze-2026-08-27/`.

## Documentation audit boundary

The `plugin-repo-seo` strict audit returned zero errors for all five npm package folders, the Python package folder and WordPress. Satellite package scans report an expected local-asset warning because their README heroes use the canonical repository-hosted raster rather than duplicating it inside each package folder. The Python folder also exposes generated `.pytest_cache/README.md` to a source-tree scanner; that cache file is not included in the wheel or sdist. These are scanner-scope notes, not shipped-package defects.

All public/account gates remain held: repository creation, commit, push, npm/PyPI publication, website deployment, WordPress.org submission/SVN, manual assistive-technology checks and owner acceptance require separate approval.
