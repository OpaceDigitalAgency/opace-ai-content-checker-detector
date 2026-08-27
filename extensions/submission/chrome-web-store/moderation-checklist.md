# Chrome Web Store moderation checklist

## Package

- [ ] Upload only `package/opace-ai-content-integrity-chrome-1.0.0.zip` and confirm its SHA-256 against `asset-manifest.json`.
- [ ] Dashboard reports Manifest V3, version 1.0.0 and no manifest error.
- [ ] Uploaded package permissions exactly match the six documented permissions.
- [ ] No host or optional-host permission, remote code, obfuscated loader, telemetry endpoint or source map is present.
- [ ] Test instructions require no credentials or paid service.

## Listing

- [ ] Name and 130-character summary exactly match `field-values.json`.
- [ ] Category is Productivity and language is English (United Kingdom).
- [ ] Detailed description states the single purpose, local handling and honest limitations before promotional links.
- [ ] No human-authorship, Anthropic-clearance, detector-accuracy, ranking or endorsement claim appears.
- [ ] All five 1280 × 800 screenshots show distinct genuine 1.0.0 states and remain legible at 640 × 400.
- [ ] Icon is 128 × 128 PNG with alpha and approximately 16 px transparent padding around 96 px square artwork.
- [ ] Small promo is 440 × 280; marquee is 1400 × 560; both are full bleed and use no third-party mark.

## Privacy

- [ ] Single-purpose statement matches the package behaviour.
- [ ] Website content is selected as handled data; Application functionality is its only use.
- [ ] All Limited Use certifications are completed accurately.
- [ ] Privacy policy, dashboard disclosure and package behaviour agree.
- [ ] Homepage visibly explains selected/visible/pasted local processing.
- [ ] Privacy page contains the exact Limited Use affirmation and no contradictory general analytics language for extension content.

## URLs and distribution

- [ ] Homepage returns 200: `https://opace.agency/tools/ai/content-integrity/browser-extension/`.
- [ ] Privacy policy returns 200: `https://opace.agency/tools/ai/content-integrity/privacy/`.
- [ ] Support returns 200: `https://opace.agency/tools/ai/content-integrity/support/`.
- [ ] Official URL is the verified `https://opace.agency/` domain under the Opace publisher.
- [ ] Visibility, regions and publishing timing receive owner approval in the final dashboard review.
- [ ] Submission and publication are not described as complete until the dashboard records them separately.
