# Local C2PA runtime record

Status: implemented and browser-proven in the 1.0.10 development source; not installed, submitted or published.

## Runtime and build

The WordPress Lab uses the same official Content Authenticity Initiative engine as the Opace website:

- `@contentauth/c2pa-web` 0.14.3, MIT;
- `@contentauth/c2pa-wasm` 0.11.3, MIT;
- `@contentauth/c2pa-types` 0.7.3 and `@contentauth/c2pa-utilities` 0.2.1, MIT;
- `highgain` 0.1.0 and `ts-deepmerge` 8.0.0, ISC.

`package-lock.json` pins the npm inputs. `bin/sync-c2pa-runtime.mjs` checks the audited package versions, licence declarations and source hashes before recreating `assets/vendor/c2pa/`. The shipped directory contains only five runtime files, six licence files and one source/build notice. Declarations, maps, tests, npm metadata, builder tools and the 10,925,526-byte inline-WASM build are excluded.

The upstream minified distribution is not re-minified. The sync makes two path-only changes: it gives the hashed C2PA chunk the stable name `c2pa-runtime.js`, and changes that chunk's bare `highgain` import to `./highgain.js`. `SOURCE-BUILD-NOTICE.txt` records source URLs, build commands and generated hashes.

Runtime source inputs:

| File | Bytes | Audited upstream SHA-256 |
| --- | ---: | --- |
| `dist/index.js` | 893 | `0045fa12803fc366e4d1350e80f98f6673a74ce7e14dc749e1d16c5083e165e0` |
| `dist/c2pa-ClWjHDBi.js` | 40,208 | `8cca5d03694364c315d5d5b221427f69548c4307cc406698c66ab03aa404c6f1` |
| `dist/c2pa_worker.js` | 43,829 | `49032ee72ef64b7cb200f3934ebdc12fc702d00fb304618b679f1f34b3c46202` |
| `dist/resources/c2pa_bg.wasm` | 8,193,627 | `2e27f91fe1e50999ac1407472d411d1247c53c32788595c37c7abfdd19988b6d` |
| `highgain/dist/index.js` | 1,922 | `318220c98cc72436b2a9108f54f64b904476a3e738d2866da9e946567373a078` |

## Execution and privacy boundary

The main Lab module does not import the C2PA wrapper until a JPEG, PNG, WebP or PDF is chosen. The 8.19 MB WASM and worker load only for that local file route. Files over 20 MB fail before the C2PA runtime loads. Each run has an `AbortController`; cancellation terminates the active worker and publishes no substitute result.

The wrapper compiles WASM fetched from the same plugin origin. HTTPS uses the packaged module worker; HTTP localhost uses c2pa-web's packaged Blob-worker fallback. Both forms run the same bundled code. The SDK settings explicitly disable remote manifest fetches, OCSP fetches, certificate trust verification and timestamp trust verification.

The selected file is passed only to the local SDK reader. Its bytes and name are not placed in a receipt, share, URL, analytics event, plugin log or public state event. A completed check can create a user-requested content-free provenance JSON/PDF containing the file SHA-256, media type, byte size, result state, bounded manifest summary, validation issues and limitations. It never embeds the file or filename; text receipt and share actions stay disabled.

## Result states

The UI and canonical adapter keep these outcomes separate:

- `present`: credentials and local signature validation succeeded; `trust` remains `not_validated`;
- `absent`: no credentials found, shown as inconclusive rather than pass or fail;
- `invalid`: credential/signature/manifest validation failed;
- `untrusted`: the SDK reported an untrusted signing credential; no trust list was fetched;
- `error`: the local engine could not complete and makes no judgement;
- `unsupported`: outside JPEG, PNG, WebP and PDF.

Signer, generator, signed date, counts, validation state and bounded issue details are rendered with text nodes. An untrusted result is not a claim that a signer is malicious. Absence is not evidence of human authorship or lack of AI use.

## Browser and fixture evidence

The MIT-licensed tests copy three real upstream JPEG fixtures from `c2pa-js` commit `9be486f`; `tests/fixtures/c2pa/SOURCE.md` records their paths and hashes. They are excluded from the plugin ZIP. A generated Opace PDF and existing Opace PNG/WebP assets cover the other accepted formats.

On 2 September 2026, visible Chromium runs proved both worker paths:

- HTTP localhost: JPEG `untrusted`, `absent`, `invalid`; PNG, WebP and PDF `absent`; one local WASM load and one local Blob-worker load;
- HTTPS localhost: the same six results, one local WASM load and one packaged `c2pa_worker.js` request;
- each run recorded only same-origin or Blob GETs, with zero external, POST or body-bearing requests;
- WASM was served as `application/wasm` and the packaged worker as `text/javascript`;
- the detailed result took keyboard focus, the text receipt stayed disabled, and the static 1280/375 layouts had no horizontal page overflow.

Screenshots: `docs/evidence/c2pa/c2pa-untrusted-1280.png` and `docs/evidence/c2pa/c2pa-untrusted-375.png`.

The previous installed-runtime proof predates the provenance JSON/PDF controls. Current source tests cover all six result states, content minimisation, non-ASCII PDF handling and long multi-page issue lists. Exact current test/package counts are recorded in the moderation audit after the final source gate. `readme.txt` is 9,998 bytes.

The current shared WordPress instance on port 8931 has not been changed. Its C2PA asset URLs return 404 because it still contains the earlier preview; installed Apache MIME, exact installed bytes and browser behaviour there remain deliberately unproven until the owner authorises installation.

## Remaining installation and release gates

- build the exact ZIP, then install it only in an authorised isolated/current/minimum WordPress lane and re-prove MIME, real fixtures, content-free provenance exports, keyboard, 1280/375 layout and installed-byte parity;
- owner Safari and VoiceOver acceptance;
- owner approval before any commit, push, WordPress.org submission or publication.
