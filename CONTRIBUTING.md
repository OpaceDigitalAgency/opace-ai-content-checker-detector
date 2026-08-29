# Contributing

Contract changes require an ADR, updated schema and valid/invalid fixtures, compatibility analysis and all runtime tests. Never add secrets, customer data, copied unlicensed source, models or datasets.

Start with an issue for a contract, model, provider, corpus or new persistence route. Small documentation and isolated defect fixes may go directly to a pull request when their scope is clear.

Run the component tests and the full gate named in its status document before handoff. For rendered changes, include desktop and 375 px evidence plus keyboard and accessibility checks. Keep unsupported/unavailable states explicit and never describe a check as proof of human authorship.

Use synthetic content in tests and bug reports. Read `CODE_OF_CONDUCT.md` and `SECURITY.md`. Publication, deployment and package signing remain maintainer actions even after public contributions open.

## Running the tests

From this directory, with Node 20+ (Python 3.10+ and PHP 7.4+ for the full cross-language run):

```sh
npm ci
npm test                                   # typecheck, contracts, Python and PHP fixtures
npm --prefix packages/core test            # 123 pass / 0 fail
npm run test:battery                       # 110 pass / 0 fail
npm --prefix packages/watermark-lab test   # 30 pass / 0 fail
npm run test:gates                         # G2 core probe 24/24, package and client gates
```

`npm run test:battery` includes the cross-surface suite, which compares the engine built here
against the copy installed in the website's `node_modules`. If those four tests fail, the website
has not been re-vendored: run `npm run pack:vendor <dest>` from this directory, copy the tarballs
into `opace-website/astro-latest/vendor/content-integrity/` and reinstall. **Always use that
script.** It rewrites monorepo `file:` dependency specs to real versions before packing and refuses
to emit a tarball that still carries one. Hand-vendoring a tarball with a `file:` spec produces a
broken lockfile, which is what caused two failed Netlify deploys on 27 August 2026
(`../v0.2-BUILD-LOG.md` §5). After reinstalling, check that `package-lock.json` has zero
`"link": true` entries.

Note that `npm install` alone may not pick up a re-vendored tarball: the lockfile's recorded
integrity hash makes npm restore the previous package from its content-addressable cache. Remove
the four `node_modules/@opace/*` entries from `package-lock.json`, delete `node_modules/@opace`,
then reinstall.

### Building the Astro site inside Dropbox

If this repository lives in a Dropbox folder, `npm run build` in `opace-website/astro-latest` can
fail **after** all pages have generated, with one of:

```
ENOENT: no such file or directory, rmdir '.../dist/pages/blog'
Cannot find module '.../dist/pages/blog.astro.mjs'
ENOENT: no such file or directory, copyfile '.../public/images/....webp'
```

This is not a code fault and the missing file usually exists on disk. Dropbox is syncing files
underneath Astro's post-build `cleanServerOutput` step, which then races on the directories it is
trying to remove. The give-away is that the log shows `✓ Completed` and the page count before the
error.

Build to a directory outside the synced folder instead:

```sh
npx astro build --outDir /tmp/astro-dist
```

That completes cleanly (697 pages, exit 0, verified 29 August 2026). Pausing Dropbox syncing for
the duration of the build works too. Deploys are unaffected, because Netlify builds from the Git
remote rather than from a synced folder.
