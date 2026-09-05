# npm and Astro catalogue fields

Canonical source: `packages/astro/package.json` and `packages/astro/README.md`.

| Field | Prepared value |
|---|---|
| Package | `@opacedev/astro-ai-content-checker` |
| Version | `0.3.1` |
| Display name | Opace AI Content Checker & Detector for Astro |
| Description | Free AI content checker and on-device AI detector for Astro Dev Toolbar: section evidence, passage highlights and reports, plus model-free build checks. |
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
ai-content-checker, devtools, dev-toolbar, privacy, ai-content-detector,
ai-text-checker, on-device, content-review
```

Astro's catalogue ingests npm packages with the `astro-integration` keyword and reads `name`, `description`, `repository` and `homepage`, so `astro-integration` stays first. `devtools`/`dev-toolbar` places the package in the Dev Toolbar category, and `withastro` is the community tag. The default export is a function, so it meets the `astro add` integration requirement.

## Developer package set

Prepared alongside the integration, all at `0.3.1`, all `@opacedev`:

| Package | Description |
|---|---|
| `@opacedev/ai-content-checker-contracts` | TypeScript contracts and evidence schemas for AI content checker integrations: model status, scored sections, privacy routes and receipts. No detector runtime. |
| `@opacedev/ai-content-checker-core` | Free offline text-checking engine for AI content checker applications: invisible Unicode, lookalike letters, protected facts, editing signals and receipts. Model-free. |
| `@opacedev/ai-content-checker-browser` | Browser adapter for AI content checker applications: visible-text extraction, local Web Worker inspection and cancellation. No bundled AI detector model. |
| `@opacedev/ai-content-checker-client` | Typed local API client for AI content checker integrations: authenticated loopback requests and validated results, with no cloud fallback. |
| `@opacedev/ai-content-checker-cli` | Free AI content checker CLI: offline text checks, receipts and printable reports, plus AI detection through an explicitly configured local Python model. |

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
