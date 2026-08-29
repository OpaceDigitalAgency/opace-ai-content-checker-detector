# PHASE 2 — deferred work, deliberately not done in phase 1

Read this alongside OBJECTIVE.md (the binding target) and BRIEF.md (the standing intent).
Everything here was consciously deferred, not forgotten. Each item states why.

---

## 1. Teacher and education mode — DEFERRED (new product scope)

Raised by the independent audit. Genuinely valuable, but it is new product scope beyond the
original brief rather than a gap against it, so it was not built.

What it would need:
- A 200-word minimum enforced in the interface, since detection is unreliable below that
  (measured: 67% at 200 words, 50% at 150, 19% at 100).
- Validation against humanities, literary criticism, genuinely student-written work, and
  AI-edited student work. Our academic corpus is social-science and STEM weighted; the
  humanities were identified as a gap and never closed.
- A review and appeal workflow, and an exportable evidence pack a student can respond to.
- A prominent, unavoidable safeguard: this must never be the sole evidence for a
  disciplinary decision. False positives on academic writing are the highest of any genre
  we measure (6.6% at the training threshold).

## 2. Head-to-head against GPTZero, Copyleaks and Originality — DEFERRED (owner's call, costs money)

The brief's competitive claim ("rivals GPTZero") remains plausible but unproven. No
controlled comparison has been run.

What it would need:
- A frozen, reproducible corpus: roughly 500 AI documents across all 21 models and 500
  human documents across all genres, drawn from what we already hold.
- Estimated cost about £40 against the owner's existing Copyleaks and Originality credits.
  The full 32,000-document corpus would be roughly £1,300 and is not worth it.
- Publish corpus composition, exclusions, confidence intervals and cost.
- Honest risk: they may beat us. Pangram-class accuracy is real. If so, the defensible
  claim becomes "the best free, local, private option" rather than "the best", which is
  still strong and still true.

## 3. Segment-aware model training — DEFERRED (needs a training cycle)

Whole-document segment scoring was shipped in phase 1 (score every ~340-word segment, take
the highest), which raised detection from 88.5% to 96.2% at identical false positives.

But the model itself is still trained only on document openings. A properly segment-aware
model — trained across opening, middle and ending passages — should do better than applying
an opening-trained model to each segment. Naive 120-word windowing was tested and collapsed
detection to 1.8%, so this needs training, not a scoring change.

## 4. Cycle-3 edited-text model — MEASURED, NOT SHIPPED

Built and evaluated in cycle3-edited/. Improves AI-rewrites-of-human from 30% to 46-56% and
rank correlation with true AI share from 0.58 to 0.74. Not shipped because int8 quantisation
costs it 5.2 points of recall (so it cannot run in a browser), stories regress 79.8% to
69.3%, journalism 89.1% to 81.0%, and paragraph-mixed documents regress badly.

Revisit with a quantisation-friendly architecture. The technique that worked — a soft target
of the document's AI word share, saturating at 0.85 — is worth carrying forward.

## 5. Known weaknesses to close, with evidence

- **Corporate communications defeat the transparent scorecard** (35.6% against the neural
  model's 98.9%) and we cannot say why. Unexplained, and unexplained is worse than known-bad.
- **The scorecard's largest single feature is effectively document length** — a real flaw,
  visible only because the model is transparent. First thing a revision should remove.
- **Business reports are data-starved**: 72 held-out rows, AUROC 0.69 against 0.93-0.99
  elsewhere. Clears the floor but must not be quoted as settled.
- **Stories carry the highest human false-positive rate** (6.7%), and the flagged samples
  come from the one source the corpus author flagged as least trustworthy. Data quality or
  model defect, unresolved.
- **Fast-DetectGPT measured 0.545** with a GPT-2-small observer against ~0.93 published.
  That is a floor for the browser-deployable variant, not a refutation of the method.
- **Binoculars was never implemented** (needs two models). The degenerate proxy in our
  records must never be quoted as its score.
- **GLTR's licence is an unclosed gap** in the project's own records.

## 6. Maintenance — the ongoing commitment

Detectors go stale. Our own evidence: the cycle-1 model, trained on 2025 chat data, scored
2.5% on 2026 articles. Plan for a refresh cycle — a few hundred fresh samples per quarter
across current models, retrain, republish the numbers with their dates.

This is also the moat. Every free competitor is stale precisely because nobody maintains
them. A maintained free detector with published measurement dates is something none of them
offer.

## 7. Open-source publication — not yet done

The implementation repository has no configured remote and nothing is published. Packages,
the WordPress plugin, Chrome extension and Astro integration remain local release candidates.
The GitHub repository, npm and PyPI publication, and store submissions are all outstanding,
and the brief's distribution strategy depends on them.
