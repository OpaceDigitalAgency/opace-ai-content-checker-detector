# Developer package set

The public npm handoff contains five version-aligned packages. `scripts/pack-public-developer-candidate.mjs` builds them from the tested source, replaces local `file:` links with exact `0.3.0` dependencies, removes the private flag and injects the common verified repository metadata. It does not publish.

| Package | Purpose | Publish order |
|---|---|---:|
| `@opacedev/ai-content-checker-contracts` | Frozen types, constants and semantic contract | 1 |
| `@opacedev/ai-content-checker-core` | Deterministic inspection, diffs and receipts | 2 |
| `@opacedev/ai-content-checker-browser` | DOM projection and Worker adapter | 3 |
| `@opacedev/ai-content-checker-client` | Typed loopback API client | 4 |
| `@opacedev/ai-content-checker-cli` | Node command line; binary `opace-ai-checker` (alias `opace-integrity` for one release) | 5 |

All packages use MIT, Node `>=20`, public access, the Opace author identity and the target monorepo/issue URLs. npm requires each package to exist before OIDC trusted publishing can be configured, so the first `0.3.0` release uses interactive account 2FA and has no CI provenance. Every later release must use stage-only OIDC, provenance and maintainer 2FA approval. Package-specific descriptions, keywords, exports, types, files and binary fields remain in their source manifests. The CLI homepage points to the intended CLI route; the library packages point to the parent product route.

The moderation review did not classify these packages as npm dual-use content: they perform offline Unicode inspection, local text projection and receipt verification, and contain no exploitation, credential, evasion, obfuscation or remote-execution capability. The first publish still uses human 2FA. Stop and obtain a registry decision if npm applies a different classification during review.

The exact release set is in `dist/public-0.3.0/npm/manifest.json`. It was reproduced byte-for-byte in two independent staging directories, installed together in a clean consumer, checked with `npm ls --all`, imported through every public package entry point and exercised through the canonical `opace-integrity` binary. Registry publication must follow the table order and the downloaded registry tarballs must match the accepted source/tag and inventories. These packages contain model-free deterministic mechanics only; no model, provider, real corpus or comparative claim is introduced.
