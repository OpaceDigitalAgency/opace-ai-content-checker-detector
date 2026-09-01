# WordPress 1.0.8 exact-candidate gate

- Candidate: `dist/opace-ai-content-integrity-1.0.8.zip`
- SHA-256: `b7b2c411862c6407ade38edbf95022f2f237c2dda63f80d9e1fae143ca63ce03`
- Reproducibility: 10/10 independent final builds byte-identical
- Identity: plugin header, runtime constant, stable tag, package, citation and cache-bust version all `1.0.8`; database schema remains `1.0.1`
- Source suites: JavaScript 16/16; package contract 2/2; PHPUnit 14/14 with 82 assertions; PHPCS 33/33
- Syntax/dependencies: 258/258 PHP files on PHP 7.4.33 and 8.3.33; npm audit zero vulnerabilities; Composer audit no advisories
- Exact runtime: installed-byte parity and active version `1.0.8` on WordPress 6.5.5/PHP 7.4, WordPress 7.1/PHP 8.3 and per-site Multisite
- Plugin Check 2.1.0: no errors on minimum and current lanes
- Exact visible runtime: current and minimum lanes at 1280/375 CSS px; zero external inspection requests, zero plugin-owned axe violations, zero console errors, no horizontal overflow, C2PA safe-fix guard pass and hash-only receipt pass
- Multisite: per-site activation pass; network activation refused with the intended error
- Lifecycle: default retention, opt-in delete and clean reinstall/activation pass

The 1.0.8 candidate supersedes the unpublished 1.0.7 bytes because current listing copy changed and therefore required a real WordPress/cache-bust version increment. The historical 1.0.6 record remains 8/9 matching builds with one unexplained overwritten mismatch. This gate proves 1.0.8 determinism only and does not claim that the historical anomaly's cause was found.

Nothing was submitted or published. WordPress.org account access, owner approval, upload, moderation, downloaded-byte/live-listing verification and owner-environment Safari/VoiceOver acceptance remain held manual gates.
