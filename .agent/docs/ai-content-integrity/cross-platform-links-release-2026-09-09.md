# Cross-platform links release record — 9 September 2026

## Canonical identity

- Product: **Opace AI Content Checker & Detector**
- WordPress.org slug: `opace-ai-content-checker-detector`
- GitHub: `https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector`
- WordPress.org: `https://wordpress.org/plugins/opace-ai-content-checker-detector/`
- Chrome Web Store: `https://chromewebstore.google.com/detail/opace-ai-content-checker/fjpbijpdnjcpjfaibhahojllibcjpcfa`
- npm: `https://www.npmjs.com/package/@opacedev/astro-ai-content-checker`

The historical checkout directory `ai-watermark-and-content-authenticity` is only a local folder
name. It does not replace the approved WordPress slug or public product identity.

## WordPress.org 1.1.13

- SVN repository: `https://plugins.svn.wordpress.org/opace-ai-content-checker-detector`
- SVN account: `opacewebdesign`
- Trunk revision: `3688033`, committed 9 September 2026 at 09:45:11 UTC
- Immutable tag revision: `3688034`, `tags/1.1.13`
- Plugin Directory API: version 1.1.13; last updated `2026-09-09 9:45am GMT`
- Versioned download: HTTP 200; observed content length 7,617,410 bytes
- Exact local ZIP: `dist/release-cross-links-2026-09-09/wordpress/opace-ai-content-checker-detector-1.1.13.zip`
- ZIP SHA-256: `1421ab259600d4bbd1483839fd4a05b284e92717ff138cabcc570b8aedecfc29`
- Archive contents: 380 files; file names match the approved 1.1.12 tree

The release changes only the version and public cross-links in `CHANGELOG.md`, `CITATION.cff`, the
main plugin file and `readme.txt`. The 1.1.12 tag remains unchanged. PHP lint, 166 JavaScript tests,
26 end-to-end tests and the package contract checks passed before publication.

## Astro/npm 0.3.2

- Package: `@opacedev/astro-ai-content-checker`
- Published version and `latest` dist-tag: 0.3.2
- Exact tarball: `dist/release-cross-links-2026-09-09/astro/opacedev-astro-ai-content-checker-0.3.2.tgz`
- Tarball SHA-256: `6cbad47a5f1dd9c3715a78a22ca5b1073ed3679f048ced9b4ba948ab755a63c9`
- Registry shasum: `b9e611fbbdc405b29d0d90ba345fd51223afcb26`
- Registry integrity: `sha512-AMkO84YwMMjR33sU2yjUPl3jCW6QzXkWDRADe9xCfB0wJ+eMt3hbAfgKZ4bPp+7J7QTeawwweHaEjjWMD7iKPg==`
- Archive contents: 185 files; package size 802,461 bytes

Astro's 79 tests passed. The package README links directly to WordPress.org, the Chrome Web Store,
npm and GitHub. A seven-day npm token with read/write access limited to this single package was
created for the direct publication, then revoked; the system clipboard was cleared afterwards.

## Opace website installation guides

Website repository commit `49459c53` was pushed to its deployment branch on 9 September 2026.
Public HTTP and rendered-page checks covered:

- `/tools/ai/content-verification-integrity/wordpress-plugin/`: WordPress.org primary action,
  GitHub secondary action, version 1.1.13.
- `/tools/ai/content-verification-integrity/chrome-extension/`: Chrome Web Store primary action,
  GitHub secondary action, version 1.2.3.
- `/tools/ai/content-verification-integrity/astro-integration/`: npm primary action, GitHub secondary
  action, version 0.3.2.

All three routes returned HTTP 200. Local rendered checks at 1440 and 375 CSS pixels found one H1,
the expected canonical URL and primary link, no horizontal overflow and no console errors. The
deployed HTML exposes the same exact links and versions.

## GitHub and Chrome boundary

The repository README and package READMEs now present the four public surfaces as one product and
use the exact public URLs above. The Chrome Web Store public listing remains version 1.2.3. No
Chrome Web Store dashboard field was edited, including the dashboard homepage link excluded by the
owner.

## Future update sequence

1. Increment the affected product version before rebuilding; WordPress releases also require cache
   busting and matching versions in the plugin file, `package.json`, tests and `readme.txt`.
2. Build once, record the exact archive path, file count, SHA-256 and registry/store integrity.
3. Run the surface tests and inspect representative rendered desktop and mobile pages.
4. Publish WordPress trunk first, then copy that exact trunk revision to a new immutable SVN tag.
5. Publish the exact npm tarball and verify the version, `latest` dist-tag, shasum and integrity from
   the public registry.
6. Push the canonical GitHub branch and the website deployment branch only after public versions
   are known, so their copy cannot claim an unpublished release.
7. Recheck the public WordPress, npm, GitHub, Chrome and Opace guide URLs. Keep prepared, submitted,
   published and indexed states separate in release notes.
