# Private EU analysis for WordPress

Private EU analysis is an optional processing route in Opace AI Content Checker & Detector.
An administrator enables it in Settings; each person then confirms the draft transfer before
running a check. The plugin offers the route only when the service reports that the WordPress
channel is accepting requests. No Opace account or saved provider API key is required.

## Choose where your draft is checked

- **Private EU analysis:** sends the draft once through your WordPress server to Opace's EU
  service. The service reports that it processes draft content in memory and does not retain it.
  Network and abuse-control information is separate; see the [privacy policy](https://opace.agency/privacy-policy/).
- **On this device:** downloads hash-checked model data after consent and runs the model in
  your browser. It does not send your draft to the Opace analysis service.
- **Integrity checks only:** runs character and writing checks locally without an AI-model
  reading. A clean character check does not establish human authorship.

When the EU route is unavailable or an allowance is reached, the interface explains the
restriction and offers on-device analysis. It does not silently move a draft to another route.
The model reading is a fallible pattern assessment, not proof of who wrote the text.

## What the EU route sends

The service base is fixed to
`https://opace-detector-877422072168.europe-west1.run.app`.
After administrator opt-in, `/v1/status` supplies channel availability and current allowance
figures. That status request does not include a draft.

For an explicitly confirmed run:

1. `/v1/wordpress/challenge` receives a SHA-256 site identifier, a random installation
   identifier, a request identifier and the draft's SHA-256 hash.
2. `/v1/wordpress/token` receives the challenge and its proof-of-work answer, returning a
   short-lived token bound to that request and valid for one check.
3. `/v1/wordpress/check` receives the draft with the authorised request.

The browser calls authenticated endpoints on the same WordPress site. WordPress contacts the
fixed HTTPS service; redirects are refused. Status checks happen after the admin screen renders
and use a short cache, so rendering does not wait on a service cold start. A completed negative
status is not retried automatically; an interrupted status request may be tried once more.

## Limits and access controls

AI analysis requires at least 60 words. The EU route accepts up to 8,000 words within the
administrator's character limit, capped at 100,000 UTF-16 code units. Over-limit input is refused,
not silently shortened. The WordPress account allowance is three EU requests per minute and
twenty per hour; service-wide and per-site allowances also apply. Settings displays the latest
figures received from the service rather than promising permanent capacity.

Requests require a logged-in user with the relevant editing capability, a valid WordPress REST
nonce and explicit route consent. The service response must match the expected channel, model,
input hash, section offsets, scoring contract and retention fields before the plugin displays it.
An invalid or incomplete response is an error, never a successful check.

## Results, receipts and reports

AI-pattern results, character findings and editorial observations remain separate. Section
scores identify the passages the model assessed. Quoted writing observations describe visible
features of the draft; they do not claim to reveal the model's internal reasoning or prove a
sentence was AI-written.

Saved receipts contain result metadata, hashes and passage locators, not the draft. A complete
report includes the checked text only after the person explicitly permits that export. Editor
to-workbench transfers stay on the WordPress site and are separate from EU service processing.

## Developer reference

The implementation is in `includes/Adapters/WordPressServerAnalysisChannel.php`,
`includes/Adapters/OpaceEuServerAdapter.php`, `includes/Contracts/WordPressServerScoreValidator.php`
and `includes/Rest/RestController.php`. The channel uses bounded status/challenge/token responses;
the scoring adapter permits a larger bounded response for multi-section results. Runtime code
is packaged with the plugin; the on-device route fetches model data, not remote JavaScript.

See the [C2PA runtime documentation](C2PA-RUNTIME.md) for separate local file-provenance checks,
the [plugin guide](https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/)
for setup and [GitHub issues](https://github.com/OpaceDigitalAgency/opace-ai-content-checker-detector/issues)
for support. Do not include private drafts, credentials or authentication tokens in a public issue.
