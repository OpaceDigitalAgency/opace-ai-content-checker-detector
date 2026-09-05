# GitHub repository fields

Target repository: `OpaceDigitalAgency/opace-ai-content-checker-detector` (public)

**Applied 3 September 2026.** The repository was renamed from
`opace-ai-content-verification-integrity-checker` to `opace-ai-content-checker-detector` on owner
authorisation. GitHub serves a 301 from the old path and every sub-path; the old name must not be
reused for another repository, because that would silently break the redirect. Description, homepage and topics were re-read on 5 September. Existing public settings were preserved during the copy refresh. The social-preview source is prepared artwork; its upload still needs verification.

| Field | Source value |
|---|---|
| Name | `opace-ai-content-checker-detector` |
| Visibility | Public |
| Default branch | `main` |
| About description | Free AI Content Checker, Detector & Watermark Tools by Opace: open-source AI content checker and AI detector for ChatGPT, Claude and Gemini text, hidden watermark character checks, SynthID-Text lab and C2PA verification. WordPress plugin, Chrome extension, Astro integration, CLI and Python engine. |
| About homepage (observed) | `https://opace.agency/tools/ai/content-verification-integrity/checker/` |
| Social preview | `docs/assets/opace-ai-content-checker-detector-social-preview-v3.png` (1280 x 640; prepared artwork, upload not verified) |
| Licence | MIT for the monorepo; WordPress distribution retains its declared GPL-compatible licence |
| Issues | Enabled with the prepared forms |
| Discussions | Disabled for the first release; support has an owned website route |
| Security advisories | Private vulnerability reporting enabled |

Topics, 20 of the 20 available:

```text
ai-checker
ai-content-detector
ai-detection
ai-detector
ai-text-detection
astro
c2pa
chatgpt-detector
chrome-extension
claude-detector
content-authenticity
gptzero-alternative
homoglyph
invisible-characters
onnx
open-source
synthid
typescript
watermark
wordpress-plugin
```

The set is at GitHub's 20-topic ceiling, so adding a topic now means removing one. `unicode` and
`zero-width-characters` were removed on 3 September 2026 to make room for `ai-checker` and
`claude-detector`; `invisible-characters` and `homoglyph` still carry the character-forensics
meaning, and they are the more specific terms.

`humanizer` and `watermark-remover` must not be used as discovery topics: the project ships
neither a model-backed humaniser nor a guaranteed watermark removal method. `ai-detector` and
`chatgpt-detector` are accurate as of the Cycle-5 classifier and are used. They describe what the
tool measures; they do not license a claim that a reading proves authorship.
