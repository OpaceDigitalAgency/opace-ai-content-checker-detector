# WordPress.org release record: Opace AI Content Checker & Detector 1.1.12

Date: 9 September 2026. Public release verified at 07:51 BST.

## Permanent identity and accounts

- Plugin name: **Opace AI Content Checker & Detector**.
- Permanent slug and text domain: `opace-ai-content-checker-detector`.
- WordPress.org SVN username: `opacewebdesign` (case-sensitive; never use the email address).
- SVN repository: <https://plugins.svn.wordpress.org/opace-ai-content-checker-detector>.
- Public listing: <https://wordpress.org/plugins/opace-ai-content-checker-detector/>.
- SVN passwords are separate from WordPress.org account passwords and are managed under the
  profile's Account & Security SVN-password screen. A credential is currently available through the
  macOS Keychain; no password is recorded in this repository.
- Whitelist `plugins@wordpress.org` and follow <https://make.wordpress.org/plugins/> for directory
  notices. Failure to receive or act on directory mail can put the listing at risk.

## Approval trail

- First reviewed candidate: 1.1.11.
- Automated pre-review ID:
  `AUTOPREREVIEW opace-ai-content-checker-detector/opacewebdesign/7Sep26/T1 7Sep26/4.2.1 (P0TDX365358HGN)`.
- The review flagged Guideline 11 admin-notice patterns and the unmatched private path package
  `opace/content-integrity-contracts 1.0.0`.
- The admin-notice match required no functional change: the plugin has one single-use post-activation
  notice, deleted when first rendered, plus the WordPress 6.5/PHP 7.4 requirements notice. It has no
  upgrade, review or promotional notices.
- Version 1.1.12 moved the first-party contracts library into `includes/Contracts`; the package then
  declared only published Composer dependencies, including Opis JSON Schema 2.6.0. This was a
  packaging-only change with no change to checks, scores or reports.
- The 1.1.12 resubmission was uploaded on 7 September 2026 at 14:41 UTC with the permalink unchanged.
- Approval ID:
  `APPROVED opace-ai-content-checker-detector/opacewebdesign/7Sep26/T2 9Sep26/4.2.1 (P0TDX365358HGN)`.
- WordPress.org stated that commit access would be granted within one hour. The repository and cached
  credential were available when the release began on 9 September.

## Released bytes and source state

- Source branch and commit: `release/wordpress-1.1.12` at `7436f57` (`WordPress 1.1.12: ship the
  contract library as plugin code`). The branch was already pushed to
  `origin/release/wordpress-1.1.12`.
- Approved candidate:
  `dist/release-final-2026-09-07/wordpress/opace-ai-content-checker-detector-1.1.12.zip`.
- Approved candidate SHA-256:
  `d048bc4f3a3fa717fa131f732ec27623ae5a365162ed73a472dfde093e17649c`.
- Candidate size and contents: 7,563,314 bytes; 380 files; `readme.txt` stable tag 1.1.12; plugin
  header and runtime constant 1.1.12; tested up to WordPress 7.1; requires WordPress 6.5 and PHP 7.4.
- Pre-release evidence: PHPCS 47 files clean; PHPUnit 65 tests/399 assertions; PHP 7.4 lint clean;
  deterministic repeat build; active installs verified on WordPress 6.5.5/PHP 7.4.33 and WordPress
  7.1/PHP 8.3.33 with 17 REST routes.
- Existing unrelated working-tree changes in two sentence-evidence screenshots and one untracked
  Astro tarball were preserved and excluded from the SVN release.

## SVN publication

- Official structure used: latest release files directly under `trunk`; release copy under
  `tags/1.1.12`; listing artwork only under top-level `assets`.
- Directory assets: `banner-772x250.png`, `banner-1544x500.png`, `icon-128x128.png`,
  `icon-256x256.png`, and `screenshot-1.png` through `screenshot-8.png`.
- Commit message: `Initial release of Opace AI Content Checker & Detector 1.1.12`.
- SVN revision: `3687726`, committed by `opacewebdesign` at 07:47:43 BST on 9 September 2026.
- Fresh remote export verified 380 tag files and byte-for-byte equality with the approved ZIP. The
  top-level remote asset directory contains 12 files.

## Public verification

- Plugin Directory API: HTTP 200; name, slug, version 1.1.12, contributor, requirements and download
  URL correct.
- Public listing: HTTP 200; correct title and H1; correct 1.1.12 version; description, banner and icon
  visible.
- Gallery: eight distinct screenshots, each 1280 x 800, loaded with the matching readme caption and
  opened through the WordPress.org lightbox.
- Browser checks: 1440 x 1000 desktop and 390 x 844 mobile; zero broken real images, zero console
  errors and no mobile horizontal overflow.
- Public download:
  <https://downloads.wordpress.org/plugin/opace-ai-content-checker-detector.1.1.12.zip>, HTTP 200.
- WordPress.org-generated download SHA-256 observed at release:
  `2c8b25a9a31327486b1cf5712276fde3470f7ab3bc447817d7a073d46b09b365`. Its extracted 380-file tree
  matches the approved candidate byte for byte; the archive hash differs because WordPress.org
  rebuilds the ZIP container.
- Search results and profile association may take up to 72 hours to update. Directory images are
  CDN-cached separately and can occasionally take several hours to refresh after later changes.

## Non-blocking documentation audit notes for the next release

- The generic repository documentation auditor reports that `README.md` links to three local
  `.wordpress-org/screenshot-*.png` paths that are absent from the runtime package. The source
  repository contains those files, while WordPress.org correctly serves all eight copies from
  top-level SVN `assets`. In the next release, use absolute GitHub image URLs in the developer README
  or exclude that README from the runtime ZIP; do not add directory screenshots to runtime files.
- `readme.txt` is 10,213 bytes. WordPress.org parsed and published it correctly, but the generic audit
  treats values above 10,000 bytes as exceeding its recommended target. Keep the next edit below
  10,000 bytes where possible without losing required privacy, external-service or limitation text.
- Thin `assets/images/README.md` warnings concern bundled image-source notes, not the Plugin Directory
  listing. They did not block approval or publication.

## Future WordPress.org update procedure

1. Confirm the canonical Git checkout, origin, default/deployment branch, current WordPress.org
   version and any unrelated working-tree changes. Obtain explicit owner authority for that release.
2. Create a named release branch from the current default branch. Update the plugin header, runtime
   constant, `readme.txt` stable tag, `package.json`, `CITATION.cff`, changelog and every enqueued
   asset version/cache buster.
3. Build the final ZIP with `wordpress/opace-ai-content-checker-detector/bin/build-plugin.sh`. Record
   its path, size and SHA-256. A rebuild creates new candidate bytes and reopens byte-specific checks.
4. Run the repository test matrix, PHPCS/WPCS, PHPUnit, PHP-minimum lint, official Plugin Check,
   archive safety/secret checks and exact-ZIP installation checks on minimum/current WordPress. Run
   browser checks appropriate to the changed UI.
5. Check out or update the SVN repository. Replace `trunk` with the extracted plugin contents, with
   the main plugin file directly in `trunk`; never upload the ZIP itself.
6. Review `svn status` and `svn diff`, add/delete only intended files, then create the release tag with
   `svn copy trunk tags/<version>`. Never edit an existing stable tag after publication.
7. Put listing banners, icons and screenshots in top-level `assets`, not in `trunk/assets` or the tag.
   Publish only recognised filenames and exact platform dimensions.
8. Commit the finished trunk, new tag and any approved assets once with a clear release message and
   the case-sensitive username `opacewebdesign`.
9. Verify a fresh SVN export, Plugin Directory API version, public listing, generated download tree,
   desktop/mobile rendering and all changed assets. Record committed, public, rendered and indexed
   states separately; allow for directory/CDN propagation.

Current official references:

- <https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/>
- <https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/>
- <https://developer.wordpress.org/plugins/wordpress-org/plugin-assets/>
- <https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/>
- <https://wordpress.org/plugins/developers/readme-validator/>
- <https://wordpress.org/plugins/plugin-check/>
