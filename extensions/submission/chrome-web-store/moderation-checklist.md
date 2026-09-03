# Chrome Web Store moderation checklist

## Package

- [ ] Do not upload until the owner accepts this exact version and hash. The bundled package is the 1.1.0 development candidate, not an approved release.
- [ ] Dashboard reports Manifest V3, version 1.1.0 and no manifest error.
- [ ] Uploaded package standing permissions exactly match the six documented permissions.
- [ ] No standing host permission is present; the sole optional permission is the exact Opace EU service origin and is requested only after EU-route choice.
- [ ] No remote code, obfuscated loader, telemetry endpoint or source map is present.
- [ ] Test instructions require no credentials or paid service.

## Listing

- [ ] Name and 127-character summary exactly match `field-values.json`.
- [ ] Category is Productivity and language is English (United Kingdom).
- [ ] Detailed description states the single purpose, route-specific handling and honest limitations before promotional links.
- [ ] No human-authorship, Anthropic-clearance, detector-accuracy, ranking or endorsement claim appears.
- [ ] All five 1280 x 800 screenshots show distinct genuine 1.1.0 states captured from the exact package, and remain legible at 640 x 400.
- [ ] Icon is 128 x 128 PNG derived from the canonical product logo, not the retired 1-2-3 placeholder mark.
- [ ] Small promo is 440 x 280; marquee is 1400 x 560; both are full bleed and use no third-party mark.
- [ ] Every image and the package hash in `asset-manifest.json` match the files on disk (`node validate-submission.mjs`).
- [ ] No screenshot or promotional image promises a model, result, report or route the package does not produce.

## Reports, receipts and files

- [ ] The branded PDF and the HTML report both open, are A4, carry page numbers and contain no
      interactive control.
- [ ] Both JSON receipts carry `contains_content: false` and no draft text or web address.
- [ ] The share summary carries no part of the draft.
- [ ] The Content Credentials record carries the file hash, type and size, and never the filename
      or any file bytes.

## Usage limits

- [ ] The panel states the character cap, the per-installation EU pace, the service-wide daily
      ceiling and that the on-device route has no limit.
- [ ] Reaching a limit shows what happened, when to try again and the on-device alternative, and
      sends nothing.
- [ ] The listing and privacy answers quote the same numbers as the package.
- [ ] The pace record survives a service-worker restart and is cleared by **Clear everything
      stored**.

## Privacy

- [ ] Single-purpose statement matches the package behaviour.
- [ ] Website content is selected as handled data; Application functionality is its only use.
- [ ] All Limited Use certifications are completed accurately.
- [ ] Privacy policy, dashboard disclosure and package behaviour agree.
- [ ] Legal/owner review resolves Chrome's service-provider/third-party-transfer dashboard answer.
- [ ] Homepage visibly explains deterministic local processing, consented model-asset download and optional EU transfer.
- [ ] Privacy page contains the exact Limited Use affirmation and no contradictory general analytics language for extension content.

## URLs and distribution

- [ ] Homepage returns 200: `https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/`.
- [ ] Privacy policy returns 200: `https://opace.agency/privacy-policy/`.
- [x] No separate product Terms page (owner decision, 3 September 2026): listing and package link only the privacy policy and support pages.
- [ ] Support returns 200: `https://opace.agency/get-in-touch/`.
- [ ] Official URL is the verified `https://opace.agency/` domain under the Opace publisher.
- [ ] Visibility, regions and publishing timing receive owner approval in the final dashboard review.
- [ ] Submission and publication are not described as complete until the dashboard records them separately.
