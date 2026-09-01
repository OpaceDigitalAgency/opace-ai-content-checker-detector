# GitHub homepage model-coverage audit — 1 September 2026

## Scope

This is the separate issue log for the GitHub README model, corpus and differentiator review. It
records discrepancies rather than hiding them inside the revised homepage. It does not authorise a
model change, threshold change, deployment or competitor-accuracy claim.

## Evidence boundary

The exact final Cycle-2 fit split was read from the local frozen
`services/local-engine/research/cycle2-train/dataset.jsonl`, SHA-256
`8f758df5b152b2db860e4e54e5ee702504c81b0772542cad8c8b53a5c830d32a`:

- 8,944 training rows;
- 5,109 AI and 3,835 human;
- 102 distinct exact `model` values on the AI side;
- the 102 counts published in `README.md` sum to 5,109;
- the human-source counts published in `README.md` sum to 3,835.

The aggregate split, human evaluation-only count and training configuration were cross-checked
against `cycle2-train/dataset-manifest.json` and `cycle2-train/CYCLE2-REPORT.md`. The long-form
overlap figures were taken from the correction at the top of `docs/PER-MODEL-DETECTION.md`.

`dataset.jsonl` is intentionally excluded from Git because research JSONL files are ignored. The
public repository therefore carries the frozen aggregate manifest, report, source-corpus manifest,
README inventory and dataset digest, but not the 64 MB row-level training file.

## Findings

| ID | State | Finding | Action or next investigation |
|---|---|---|---|
| HMA-001 | Corrected in README | The homepage named 13 evaluation models and linked a separate per-model report, but did not state the actual fit-split counts or list every model identifier used in training. Training, source-corpus and evaluation numbers were easy to conflate. | Added an opening differentiator section, 5,109/3,835 fit counts, the human-source breakdown and a complete expandable 102-ID inventory. |
| HMA-002 | Corrected in README | The opening said all 5,558 long-form documents were unseen and hash-quarantined against every training split. `docs/PER-MODEL-DETECTION.md` proves that 268 of 922 AI documents and 11 of 4,636 human documents overlap a Cycle-2 split. | Replaced the false independence claim with the exact 654/268 AI split, the 168/72/28 allocation and 11 human overlaps. The current pooled two-threshold rates remain labelled as pooled because no current seen-versus-unseen split is published. |
| HMA-003 | Corrected in README | The opening said identical input produced identical findings everywhere. Deterministic core findings are parity-tested, but the fp32 hosted and int8 browser model routes publish different measurements and can disagree. | Narrowed the claim to the shared deterministic engine and explicitly separated model route/runtime measurements. |
| HMA-004 | Open — separate task | `MODEL_AND_DATA_PROVENANCE.md` says the `intfloat/e5-small` licence is not recorded, while `THIRD_PARTY_NOTICES.md`, `docs/CAPABILITIES.md` and `docs/RELEASE-STATE.md` say MIT was confirmed from the model card on 29 August 2026. | Reconcile the provenance file, dependency ledger and decision/status documents against the captured primary-source evidence. Do not remove the remaining canonical-revision and upstream-training-provenance gaps. |
| HMA-005 | Open — separate task | `PROJECT.md`, `STATUS.md` and `docs/programme/PROGRAMME-STATUS.md` still say the public GitHub repository does not exist or no remote is configured. The repository is now public and `origin` is configured. | Refresh release-state documents while preserving the separate npm, PyPI, WordPress.org, Chrome and Astro publication gates. |
| HMA-006 | Open — separate task | The public aggregate manifest does not include `train_ai_by_model`; the complete list currently has to be regenerated from the ignored row-level dataset. | Add a deterministic, privacy-safe `train_ai_by_model` field to the corpus preparation output and commit the regenerated manifest after reproducing the frozen digest. Do not hand-edit the generated manifest. |
| HMA-007 | Guard retained | The repository has no current same-corpus, same-threshold independent comparison proving higher accuracy than every free or paid detector. | The README says why the product is measurably different without saying it is universally more accurate. Any future superiority claim requires a dated shared-corpus benchmark. |

## What the homepage can now say accurately

- The shipped classifier used older and newer generator outputs, with the exact 2022–2026 training
  identifiers and per-ID row counts visible on the homepage.
- The actual fit split is 5,109 AI and 3,835 human examples. The larger 15,514-document source
  corpus and 17,295-row prepared dataset are different denominators and are not presented as the
  number the optimiser saw.
- The wider product combines a trained AI-pattern model with deterministic text-integrity checks,
  writing suggestions, provenance reading, demo-key watermark science, protected facts and
  reproducible receipts.
- It cannot honestly say that every headline measurement is wholly held out, that one score proves
  authorship, that production provider watermarks are verifiable, or that Opace has beaten every
  named detector on a shared benchmark.
