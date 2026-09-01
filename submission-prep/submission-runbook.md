# Publication runbook

Run only after explicit owner approval.

1. Confirm the exact accepted Git tree, package tarball SHA-256 and clean status.
2. Confirm the public `OpaceDigitalAgency/opace-ai-content-verification-integrity-checker` repository still has the prepared About fields, topics, social preview, issue forms and private vulnerability reporting.
3. Push the accepted tree and create the signed package-release tag `packages-v0.1.0`. Do not move or reuse the existing historical `v0.1.0`–`v0.1.2` tags.
4. Verify the intended privacy, support, CLI and Astro website routes return 200 in production.
5. Confirm `@opace` npm scope ownership and account two-factor authentication without exposing credentials. npm cannot configure a trusted publisher or stage a brand-new package, so bootstrap all six `0.1.0` packages interactively from the accepted tarballs with `npm publish <exact-tarball> --access public --provenance=false`, completing each 2FA prompt. The explicit override is required because the package manifests correctly require provenance for later OIDC releases. Publish contracts, core, browser, client, CLI and Astro in that order. Do not use a bypass-2FA token; the initial npm release will not carry CI provenance because npm OIDC is unavailable until each package exists.
6. Download each npm registry tarball, compare its inventory and SHA-512 integrity with the accepted candidate, and run the clean npm and Astro consumers. Stop before PyPI if any package, version or byte inventory differs.
7. Once the packages exist, configure each npm trusted publisher for `OpaceDigitalAgency/opace-ai-content-verification-integrity-checker` and a future release workflow. Permit staged publishing only, require maintainer 2FA approval, disallow traditional tokens and record that CI provenance begins with the next release.
8. Configure the PyPI project or pending publisher for this repository, workflow `release.yml` and environment `pypi`, with a required GitHub environment reviewer.
9. From the signed `packages-v0.1.0` tag only, run `verify-and-publish-pypi-0.1.0` and enter `PUBLISH-PYPI-0.1.0-AFTER-NPM-BOOTSTRAP` after owner approval. The held workflow rebuilds and hash-checks all accepted archives, verifies all six npm `0.1.0` packages are live, then publishes the exact Python wheel and sdist through PyPI trusted publishing.
10. Compare the PyPI-downloaded archives and inventories with the accepted candidates and run a clean Python consumer.
11. Wait for Astro's weekly integration-library ingestion, then verify name, description, category, homepage and repository on the rendered catalogue.
12. Record repository, npm, PyPI, Astro catalogue, website, indexing and owner-acceptance states separately.

Stop on an account, legal-terms, two-factor, hash, inventory or rendered-page mismatch. Do not rebuild a different tarball during the release action. The first-release npm provenance exception is an npm platform constraint, not permission to relax provenance on later versions.
