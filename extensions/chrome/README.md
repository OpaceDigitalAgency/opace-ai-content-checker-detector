# Opace AI Content Integrity for Chrome

Chrome-first Manifest V3 submission candidate. Version `1.0.0` inspects explicitly selected, visible-article or pasted text in the packaged browser Worker. It never writes to the page, sends telemetry or retains text by default.

![Opace AI Content Integrity Chrome side panel showing named local checks](../submission/chrome-web-store/screenshots/02-review-named-checks.png)

_Review named checks, evidence and limitations in the genuine packaged side panel._

> Release state: the exact local package has passed automated browser and moderation checks. It has not been submitted to the Chrome Web Store or accepted by the owner.

[Explore the Chrome extension](https://opace.agency/tools/ai/content-verification-integrity/chrome-extension/) · [Read the privacy notice](https://opace.agency/privacy-policy/) · [Get support](https://opace.agency/get-in-touch/)

## What it does

- checks selected text, visible article text or pasted text only after a user action;
- reports invisible characters, mixed scripts, writing-pattern evidence and protected spans;
- compares a reviewed candidate before copying it;
- exports a hash-only receipt without source text or page URL;
- preserves explicit unsupported, not configured, inconclusive and error states.

A passing named check is evidence about that check only. The extension does not prove human authorship, clear a commercial AI detector or verify an official Anthropic watermark.

## Install the local candidate

1. Build and package the extension with the commands below.
2. Open `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
3. Select this component's generated `dist/` folder.
4. Pin **Opace AI Content Integrity**, choose a supported capture mode and review the side-panel evidence.

Use the exact ZIP under `artifacts/` for release-candidate testing. Store installation becomes available only after owner-approved publication.

## Build and verify

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run audit
npm run package
```

Load `dist/` as an unpacked extension for development, or extract the 1.0.0 ZIP under `artifacts/` and load that exact tree. Copy-ready listing fields, permissions, privacy answers, reviewer instructions and verified store assets are under `../submission/chrome-web-store/`. Nothing in this folder authorises a Chrome Web Store submission.

The manifest deliberately declares no host or optional-host permissions. The frozen local-engine OpenAPI contract has no pairing-code exchange operation, so **Connect local engine** is visibly unavailable instead of accepting a token or requesting loopback access.

## Where this extension is weakest

Version 1.0.0 ships the deterministic checks and the editorial writing rules. It does **not**
include the trained model that produces an AI reading; that runs in the free Opace browser
checker. Both sets of limits are listed, because both matter to anyone deciding what to trust.

**The writing rules are editorial feedback, not detection.** Measured on 922 machine and 1,200
human long-form documents the engine had never seen, they detect 45.1% of machine writing while
flagging **24.8% of human writing** — one human document in four. That is why the score is shown
as writing suggestions and never counted toward an AI reading.

**The trained model in the free Opace web checker**, measured on a fresh 5,558-document long-form
corpus (922 machine, 4,636 human) **at the operating point that ships today (cycle-5,
`tier3-cycle5-v1`, deployed 1 September 2026, margin-space rule `max(m1, m2+0.34) >= 3.571`)**.
Detection is 902/922 = 97.8% on the EU server route and 900/922 = 97.6% in the browser, at
46/4,636 = 0.99% and 73/4,636 = 1.57% human false positives respectively. *Superseded: cycle-2
(`tier3-cycle2-v1`, live 28 August – 1 September 2026, probability pair 0.9855/0.9763) read
883/922 = 95.8% / 889/922 = 96.4% at 45/4,636 = 0.97% / 90/4,636 = 1.94% on the same corpus — kept
for the record, not current.* The fine-grained weakness rows below are cycle-2 measurements and
have not yet been re-cut for cycle-5. Where it is weakest:

| weakness | measured | denominator |
|---|---|---|
| human fiction and stories wrongly flagged | **8.8%** | 23 of 260, server route (26 of 260, 10.0%, in the browser) |
| detection at 100–199 words, by achieved word count | **16.9%** | 29 of 172 |
| detection on deliberately keyword-repetitive copy | **43.5%** | 188 of 432 |
| machine rewrite of a human original | 30–35% | HAT-Bench v6–v8 bands |
| human academic discussion wrongly flagged | 1.9% | 8 of 420 |
| human academic conclusions wrongly flagged | 1.9% | 7 of 360 |
| human student essays wrongly flagged | 0.0% | 0 of 420 |
| business reports, AUROC | 0.69 | 72 held-out rows, against 0.93–0.99 elsewhere |
| short human text wrongly flagged | 0.5% | 22 of 4,368 across nine sources |

Every measured rate, by document length, by the model that wrote the text and by content type,
each with its denominator and a 95% confidence interval:
<https://opace.agency/tools/ai/content-verification-integrity/research/detection-rates/>

A novelist checking their own writing has roughly a one in eleven chance of being told it looks
machine-written. Earlier published fiction figures of 12.69% and 11.15% belong to the 0.980 and
0.984 flag points and must not be placed beside the rows above. The model was deliberately never trained on human fiction, because no matched
human fiction corpus was available and training on unmatched machine fiction would have taught it
that fiction equals AI.

Do not rely on this tool if you write fiction, if you are checking text under 200 words, or if
you are about to make an academic misconduct decision about a single student.

The complete list, with sources for every figure:
[Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations).

## Credit

This extension was built on existing open-source work by deliberate choice. The rule tiers and
character forensics come chiefly from
[avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) (MIT, Conor Bronsdon and
contributors) and [watermarks-remover](https://github.com/guillaumemeyer/watermarks-remover)
(MIT, Guillaume Meyer), over
[Unicode Consortium character data](https://www.unicode.org/Public/UCD/latest/). Phrase and
structural rule data is adapted from
[antislop-sampler](https://github.com/sam-paech/antislop-sampler) (Apache-2.0),
[slop-forensics](https://github.com/sam-paech/slop-forensics) (MIT),
[SLOP_Detector](https://github.com/SicariusSicariiStuff/SLOP_Detector) (Apache-2.0),
[slop-gate](https://github.com/hwajongpark/slop-gate) (MIT),
[anti-ai-writing](https://github.com/avectats7/anti-ai-writing) (MIT),
[anti-slop](https://github.com/kjmagnan1s/anti-slop) (MIT),
[claude-slop-detector](https://github.com/aplaceforallmystuff/claude-slop-detector) (MIT) and
[Wikipedia's *Signs of AI writing*](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
(CC BY-SA 4.0, credited as its licence requires). The watermark mathematics is a TypeScript port
of [google-deepmind/synthid-text](https://github.com/google-deepmind/synthid-text) (Apache-2.0)
with the [OpenAI GPT-2](https://github.com/openai/gpt-2) tokeniser (MIT).

Several well-known detector repositories were cloned and read during research and are credited as
exactly that — read, not used. Nothing in this extension is derived from `fast-detect-gpt`,
`Binoculars`, `RADAR`, `DIPPER`, `ai-detector-bench`, `BIRA`, `SIRA` or `MarkLLM`.

Full records, with versions, snapshot commits and what was taken from each:
[THIRD_PARTY_NOTICES.md](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/THIRD_PARTY_NOTICES.md).

## Privacy defaults

- capture and results live only in memory;
- local storage contains settings only;
- receipt history is fixed off;
- exports are hash-only and omit source URL, input and candidate text;
- clearing data removes local settings and session interruption markers;
- all inspection runs through the `browser` privacy route with no network request.

See `../EXT-30-EVIDENCE.md` for the exact candidate hash, browser matrix, rendered evidence and remaining release holds.

## Compatibility and accessibility

The candidate targets Chrome 145 or newer with Manifest V3, side-panel and module Worker support. It uses no host permissions and has no optional host-permission prompt. Keyboard navigation, visible focus, text status, high contrast, reduced motion, 375 px layout and 400%-equivalent reflow are covered by automated candidate checks; owner-environment screen-reader acceptance remains separate.

## Troubleshooting

### No text was captured

Choose **Selected text** after selecting content, use **Visible article** on an ordinary page, or paste text directly. Browser-owned pages and restricted contexts can prevent page capture.

### Connect local engine is unavailable

This is intentional in version 1.0.0. The frozen loopback API has no pairing-code exchange, so the extension does not request loopback access or accept a raw token.

### A check is unsupported

Keep the reported state. The extension does not substitute another detector or turn an unavailable method into a pass.

## Support, security and licence

Use the [Content Integrity support page](https://opace.agency/get-in-touch/) for non-sensitive help. Report vulnerabilities through the repository [security policy](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/SECURITY.md) and do not include captured text or credentials. Opace-authored extension code is available under the [MIT Licence](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/LICENSE).

Changes should follow the repository [contribution guide](../../CONTRIBUTING.md) and [changelog](../../CHANGELOG.md).

## Evidence

Every accuracy figure this project publishes is measured, carries its denominator and names its
source report. The six result charts, the per-register detection and false-positive tables and the
complete weakness list are on the [repository front page](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#what-it-measures-and-where-it-fails).

- [Capability register](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/CAPABILITIES.md) — the exhaustive technical inventory
- [Evidence index](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/EVIDENCE-INDEX.md) — every test result and research artefact, with paths
- [Test evidence](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/TEST-EVIDENCE.md) — verbatim suite totals and the current-model appendix
- [Route parity](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker/blob/main/docs/measurements/ROUTE-PARITY.md) — browser int8 against server fp32, all disagreements written out
- [Honest limitations](https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker#honest-limitations) — where the tool is weakest, ranked, with denominators

## More content-integrity tools by Opace

- [Opace AI Content Integrity product hub](https://opace.agency/tools/ai/content-verification-integrity/)
- [Browser-based Content Integrity Checker](https://opace.agency/tools/ai/content-verification-integrity/checker/)
- [Opace AI Content Integrity for WordPress](https://opace.agency/tools/ai/content-verification-integrity/wordpress-plugin/)
- [Opace AI Content Integrity for Astro](https://opace.agency/tools/ai/content-verification-integrity/astro-integration/)
- [Opace artificial intelligence services](https://opace.agency/services/artificial-intelligence/)
- [Opace Digital Agency on GitHub](https://github.com/OpaceDigitalAgency)
- [Opace](https://opace.agency/)
