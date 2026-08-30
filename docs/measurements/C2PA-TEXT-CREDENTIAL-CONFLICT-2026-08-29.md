# The invisible-character fix destroys C2PA text credentials

**Date:** 29 August 2026
**Agent:** C2
**Verdict:** The conflict is **real**, it is **silent**, and it is **unrecoverable**. Fixed on the website checker; the same fix is needed in `packages/core` and is handed off below.

---

## 1. Is the conflict real?

Yes. Verified against the specification text and reproduced against the shipped engine.

### 1.1 What C2PA §A.8 actually specifies

Read directly from [C2PA Specification 2.4](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html), fetched 29 August 2026, §A.8 *Embedding Manifests into Unstructured Text*. Not from a summary, and not assumed from the fact that variation selectors exist.

Verbatim, §A.8.2:

> "Unicode variation selectors (U+FE00-U+FE0F and U+E0100-U+E01EF) are used because they are specifically designed to be visually non-rendering while remaining part of the valid Unicode character set."

The encoder, §A.8.3.1, is a byte-to-code-point map with no gaps:

```
function byteToVariationSelector(byte b) {
    if (b >= 0 && b <= 15) {  return U+FE00 + b; }
    else if (b >= 16 && b <= 255) { return U+E0100 + (b - 16); }
}
```

So the ranges are used **in full**: all 16 of U+FE00–U+FE0F carry byte values 0–15, and all 240 of U+E0100–U+E01EF carry byte values 16–255. There is no subset to exempt. §A.8.4.1 adds one more code point: the wrapper "shall be prefixed with a single Zero-Width No-Break Space (U+FEFF)", which §A.8.4.2 uses as the scan sentinel. Total carrier set: **257 code points**.

The payload is a `C2PATextManifestWrapper` (§A.8.2.2): 8-byte magic `0x4332504154585400` ("C2PATXT\0"), a 1-byte version, a 4-byte big-endian `manifestLength`, then the JUMBF Manifest Store.

### 1.2 What the checker does with those code points

From `implementation/packages/core/src/unicode/data.ts`, `CARRIER_RULES`:

| Rule | Range | Severity | `fix` | Context |
|---|---|---|---|---|
| VARIATION SELECTOR-1..16 | `0xfe00`–`0xfe0f` | medium | **`remove`** | `variation` |
| supplementary variation selectors | `0xe0100`–`0xe01ef` | medium | `review` | `variation_sup` |
| BYTE ORDER MARK | `0xfeff` | low | **`remove`** | — |

`previewSafeFixes` (`packages/core/src/fixes/preview.ts`) applies `fix:"remove"` and `fix:"space"` findings and skips `fix:"review"` with reason `user_review`. It also skips a `U+FEFF` finding whose span does not start at index 0, reason `invalid_bom_position`.

### 1.3 The overlap, exactly

**Flagged by the checker:** all 257 carrier code points. Every byte of a text credential produces a finding.

**Removed by the safe-fix path:**

- **U+FE00–U+FE0F — all 16 code points.** These are the manifest's bytes 0–15. Contextual downgrade does not save them: `contextualise` only exempts a variation selector whose *preceding* character is emoji-capable or CJK, and inside a wrapper the preceding character is another variation selector from the supplementary range.
- **U+FEFF — the wrapper sentinel — when the wrapper is placed at the start of the text.** §A.8.4.1 says the wrapper "should" go at the end, which is a recommendation, not a requirement. At the end, the BOM-position guard skips it by accident; at the start it is removed.

**Not removed:** U+E0100–U+E01EF, because they carry `fix:"review"`. They are still flagged and still visible in the rail.

That partial removal is what makes this bad rather than merely lossy. Byte 0x00 is the last byte of the magic number, so **every** wrapper loses at least one magic byte. The magic no longer matches, §A.8.4.2 finds nothing, and the validator does not even report `manifest.text.corruptedWrapper` — it reports no credential at all.

### 1.4 Reproduced against the shipped engine

Constructed a genuine §A.8 wrapper (magic, version 1, `manifestLength`, a JUMBF-shaped payload, U+FEFF prefix) and appended it to an ordinary paragraph. Ran `inspectUnicode` and `previewSafeFixes` from `packages/core/dist/index.js` with the selection the Chrome extension and WordPress plugin use by default (every finding whose `fix` is not `review`), and decoded the result with the spec's own §A.8.4.2 detection algorithm.

```
BEFORE cleaning
  detect(): {"status":"ok","version":1,"manifestLength":37, ...}
  findings total: 51
  U+FE00-FE0F flagged: 8   fix=remove: 8
  U+E0100-E01EF flagged: 42  fix=remove: 0
  U+FEFF flagged: 1  fix: remove

AFTER the default safe-fix
  applied edits: 8
  visible text unchanged: true
  detect(): {"status":"none"}
  credential recoverable from candidate: false
```

Wrapper at the start of the text instead: 7 edits applied, no `invalid_bom_position` skip, sentinel gone too.

**What would have changed the answer.** Any of these, and the finding would have been a clean negative: §A.8 specifying a reserved sub-range rather than the whole of both ranges; the encoder skipping U+FE00–U+FE0F for low bytes; `contextualise` downgrading a variation selector that follows another variation selector; or `previewSafeFixes` carrying an existing provenance exemption. I checked each. None hold. I read the rule table and the preview logic in full rather than grepping for "C2PA", and I read §A.8 from the specification HTML rather than from the earlier report's summary of it, because the report that raised this records three false negatives from searches that stopped early.

---

## 2. How bad is it in practice?

| Question | Answer |
|---|---|
| Would a user of this tool plausibly have a text credential? | Yes, and increasingly. §A.8 exists precisely for "content intended for copy-paste operations across different systems", which is exactly what this checker takes. A journalist or editor pasting a supplied draft is the tool's core case. |
| Does the checker warn before cleaning? | **It did not.** The findings read "An invisible variation selector is present" with the suggestion "Preview the deterministic change before approval". Nothing named provenance. |
| Is the removal reversible? | **No.** The manifest cannot be rebuilt from the visible text. §A.8.5 binds it with a `c2pa.hash.data` assertion over the NFC-normalised text, so even a re-signed replacement is a different claim by a different signer. |
| Did the receipt record what was stripped? | No. The receipt records hashes and method results; a stripped credential appeared as an ordinary Unicode edit. |
| Does the provenance check run before the cleaning path? | **It never ran on text at all.** `runProvenanceInspection` is the file-upload path — images and PDF via `@contentauth/c2pa-web`. Pasted text had no provenance read, so the tool could not see what it was about to destroy. |
| Is it a silent destructive default anywhere? | **Yes, in three of four surfaces.** |

The default-selection audit is the part that turns this from a footgun into a defect:

| Surface | Selection passed to `previewSafeFixes` | Silent? |
|---|---|---|
| `extensions/chrome/src/panel.ts:141` | `unicodeEvidence.filter(item => item.fix !== "review")` — every removable finding, **no user choice at all** | Yes |
| `wordpress/.../lab-app.mjs:117` | every non-review finding, `checkbox.checked = true` | Yes, one click |
| `packages/astro/src/toolbar.ts:138` | `findings.map(finding => finding.id)` — **every finding** | Yes |
| Website checker | per-finding checkboxes, unchecked by default | No, but nothing warned |

Against the product's stated position — refuse rather than round over when it cannot be certain — this was the inverse. It rounded over silently, and the thing it rounded over was somebody else's signed claim.

---

## 3. What was changed

Website repo `opace-website/astro-latest`, commit `c841a658` on branch `checker/redesign-steps-0-2`, pushed to `origin`. **Not yet on `main`, so not yet deployed** — see §5.

**New:** `src/lib/content-integrity/c2pa-text.ts`. The §A.8.3.2 decoder and the §A.8.4.2 detection algorithm, written from the specification text with the clauses cited in comments. Detection only. It returns the wrapper's UTF-16 span, its version, its declared `manifestLength`, and whether the run is complete or truncated (the spec's `manifest.text.corruptedWrapper` condition).

**Changed:** `src/components/tools/content-integrity/integrity-controller.ts`.

1. Credentials are detected on every run, before the findings render.
2. Every finding whose span falls inside a credential is still listed, still counted, still highlighted in the draft. Its fix checkbox is disabled and relabelled "Held back: removing it would destroy the content credential", with a line saying why.
3. The "Hidden characters" group leads with a notice naming C2PA 2.3 §A.8, saying the listed characters include the credential's bytes and that removal is permanent.
4. The preview handler re-detects against the **live textarea**, not the scored snapshot, so an edited draft cannot smuggle a credential past the guard. Held-back ids are filtered out of the selection.
5. Defence in depth: the credential's spans are passed into `previewSafeFixes` as protected spans, so the core engine refuses those edits (`reason:"protected_span"`) even if the checkbox state is forged in the DOM.
6. Deliberate removal is possible, but only through a separate confirmation control that states what it destroys, defaults to off, and resets on every run. When it is used, the preview appends a line saying how many credentials the change destroyed and that it cannot be undone.
7. The exported receipt gains a limitation recording that a credential was present and excluded, and stating that the tool reads the wrapper's presence only — no manifest parse, no signature check, no trust list.

**Changed:** `src/pages/tools/ai/content-verification-integrity/checker.astro`. The provenance stub said "Pasted text is never given a provenance verdict", which was true but is now incomplete. It says what the checker does recognise in text and, more importantly, what recognising it does *not* mean.

**Changed:** `src/styles/content-integrity-tools.css`. Three rules so the destructive-action warning does not read as body copy.

The hidden-character detection itself is untouched. No rule was softened, no code point was dropped from the tables, no severity was lowered.

---

## 4. How it was proved

`tsc --noEmit`: 12 errors, all pre-existing and all in unrelated files (`migration/`, showreel components, `serviceContentMapper.ts`). None in the checker. Same count before and after. `astro build` was not run.

The DOM behaviour was verified in a real browser against the actual page, not inferred. A dev server was started on a spare port because the server already running on 4325 is `astro preview` serving a stale `dist/`. Four checks:

| Check | Result |
|---|---|
| Credentialled draft, findings rendered | 51 findings, **51** marked as credential carriers, **0** with an enabled fix checkbox (was 6 enabled and removable before the change), warning panel visible with the §A.8 notice |
| Forged UI: every checkbox re-enabled and ticked, preview clicked | "Every selected finding carries the C2PA content credential. Nothing was changed." Apply button stays hidden |
| Confirmation ticked, then the same forged selection | Credential destroyed as asked, with the warning "1 content credential(s) destroyed by this change, at your explicit confirmation." Decoded with §A.8.4.2: `ok` before, `none` after — the deliberate path still works, and now it says so |
| Ordinary draft with hidden characters and no credential | 9 findings, 0 carriers, 8 removable, cleaning applied normally, no warning panel. **No regression** |

The engine-level reproduction in §1.4 was run against `packages/core/dist/index.js`, the built engine, not a re-implementation.

---

## 5. What needs another session

### 5.1 The core engine — the real fix (owner: whoever holds `packages/core/src/**`)

The website is one of four consumers, and it is the only one that did not already default to select-all. **The Chrome extension, the WordPress plugin and the Astro toolbar are still silently destructive today.** A per-surface patch is the wrong shape; the guard belongs in the engine so every surface inherits it.

Proposed change, in two parts:

**(a) New module `packages/core/src/provenance/c2pa-text.ts`.** Port `src/lib/content-integrity/c2pa-text.ts` from the website commit verbatim — it has no website dependencies. Export `detectC2paTextCredentials`, `variationSelectorToByte`, `isCredentialCarrier`, `withinCredential`.

**(b) `packages/core/src/fixes/preview.ts`.** Detect credentials in `source` at the top of `previewSafeFixes`, and skip any selected finding overlapping one unless the caller opts in explicitly:

```ts
export function previewSafeFixes(
  source: string,
  findings: UnicodeFinding[],
  selectedFindingIds: string[],
  protectedSpans: ProtectedSpan[] = [],
  options: { allow_c2pa_credential_removal?: boolean } = {},
): FixPreview {
  const credentials = options.allow_c2pa_credential_removal ? [] : detectC2paTextCredentials(source);
  // …inside the per-finding loop, alongside the existing protected_span check:
  if (withinCredential(credentials, f.span)) { skipped.push({ id: f.id, reason: "c2pa_text_credential" }); continue; }
```

Three properties matter and are worth stating so they are not traded away:

- **Default-safe.** The new option defaults to off, so the three surfaces that pass no options become safe without being touched.
- **Additive to `FixPreview`.** A new `skipped.reason` value only. `applied_finding_ids`, both hashes and `diff` keep their shapes, so no consumer breaks.
- **Not a detection change.** `inspectUnicode` is untouched. Every carrier is still found and still reported; only the automatic edit is withheld.

Optionally, add a `c2pa_text_credential` field to the inspection result so surfaces can render the warning without each implementing §A.8.4.2. Not required for safety, and it does touch `analysis-result.schema`, so it is a separate decision.

Once (b) lands, the website's own filter becomes belt-and-braces rather than the only guard, and it should stay: it is what drives the warning copy and the confirmation control, which the engine cannot render.

### 5.2 Deploy the website fix

Commit `c841a658` sits on `checker/redesign-steps-0-2`, pushed, **four commits ahead of `origin/main`** and behind the other three commits of another session's work. I did not push to `main`, because doing so would ship those three commits as a side effect of shipping mine. Whoever owns that branch should merge it when their work is ready. The fix is inert until then.

### 5.3 Documentation not in my ownership

- `implementation/docs/WATERMARK-LAB.md` (W1's) — §3.2's note "the checker's invisible-character cleaning would silently destroy a C2PA text credential" can be upgraded from a flagged tension to a resolved one, with the exact code points and the guard.
- `implementation/docs/CAPABILITIES.md` — the honest-limits section should say that a text credential's presence is recognised, that its characters are held back from the fix, and that the manifest is not parsed, its signature not checked and no trust list consulted. Recognising a wrapper is not validating a credential, and the distinction should be in the document, not only in the tooltip.
- `wordpress/.../readme.txt` and the Chrome store listing — no change needed until §5.1 lands, since neither makes a claim about text provenance.

---

## 6. One thing worth keeping straight

`c2pa-rs`, the reference implementation, still has no text support. Nothing can be integrated for *reading* a text credential today beyond what §A.8.4.2 gives you, which is the wrapper's presence and its declared length. That is a good reason not to build a text provenance verdict. It is not a reason to leave the destruction in place: recognising 257 code points well enough to refuse to delete them is a much smaller job than validating a manifest, and the two are independent.
