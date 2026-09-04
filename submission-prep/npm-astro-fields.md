# npm and Astro catalogue fields

Canonical source: `packages/astro/package.json` and `packages/astro/README.md`.

| Field | Prepared value |
|---|---|
| Package | `@opacedev/astro-ai-content-checker` |
| Version | `0.3.0` |
| Display name | Opace AI Content Checker & Detector for Astro |
| Description | The full Opace AI Content Checker & Detector in the Astro Dev Toolbar: a free AI content checker and AI detector that reads the previewed page with an on-device model, plus a deterministic, content-free build scan. |
| Access | Public |
| Licence | MIT |
| Node engine | `>=20.3.0` |
| Astro peer | `>=5.0.0 <8.0.0` |
| Homepage | `https://opace.agency/tools/ai/content-verification-integrity/astro-integration/` |
| Repository | `https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector`, directory `packages/astro` |
| Issues | `https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/issues` |
| Privacy | `https://opace.agency/privacy-policy/` |
| Support | `https://opace.agency/get-in-touch/` |

Keywords:

```text
astro-integration, astro, withastro, ai-checker, ai-detector,
ai-content-checker, devtools, dev-toolbar, privacy
```

Astro's catalogue ingests npm packages with the `astro-integration` keyword and reads `name`, `description`, `repository` and `homepage`, so `astro-integration` stays first. `devtools`/`dev-toolbar` places the package in the Dev Toolbar category, and `withastro` is the community tag. The default export is a function, so it meets the `astro add` integration requirement.

## Developer package set

Published alongside the integration, all at `0.3.0`, all `@opacedev`:

| Package | Description |
|---|---|
| `@opacedev/ai-content-checker-contracts` | Frozen JSON Schema types, status constants and privacy-route enums for the Opace AI Content Checker & Detector. |
| `@opacedev/ai-content-checker-core` | Deterministic offline text checks, invisible-character forensics, reviewed diffs and hash-only receipts for the Opace AI Content Checker & Detector. |
| `@opacedev/ai-content-checker-browser` | Browser visible-text projection and Worker adapter for the Opace AI Content Checker & Detector. |
| `@opacedev/ai-content-checker-client` | Typed loopback-only local API client for the Opace AI Content Checker & Detector. |
| `@opacedev/ai-content-checker-cli` | Offline command line for deterministic text checks, safe fixes and hash-only receipts, for the Opace AI Content Checker & Detector. |

The CLI installs `opace-ai-checker` as its command. `opace-integrity` is installed as an alias for
this one release and is removed in the next minor version; both are recorded in
`packages/cli/CHANGELOG.md`.

`@opace/watermark-lab`, `@opace/content-integrity-cycle5-browser` and
`@opace/content-integrity-benchmark` stay private and are not in the release set. Their names were
deliberately left alone.

## Naming and scope

The whole set moved from `@opace/content-integrity-*` and `@opace/astro-content-integrity` to
`@opacedev/*` on 3 September 2026, before any first publication, so there is no redirect and nothing
to migrate. **`@opacedev` is the scope Opace owns**; `@opace` is not owned, which is why the earlier
names could never have been published as they stood. Registry availability under the new names is
still a submission-time account gate and was not probed by this lane.
