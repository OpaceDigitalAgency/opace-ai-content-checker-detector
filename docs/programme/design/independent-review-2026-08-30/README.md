# Independent design comparison evidence

Captured 30 August 2026 for the continuing AI Content Integrity design review. These are evidence files, not implementation instructions or accepted designs.

> **The three assessments are here; the seven images are not.** The `.png` files listed below are
> part of the screenshot corpus held privately outside this repository — see
> [`../README.md`](../README.md) and `../../DESIGN-FAILURE.md` §13. Each composition is described in
> full in `DESIGN-FAILURE.md` §16.2, and the SHA-256 block at the foot of this file remains the
> integrity record for every one of them, so the exact image can be identified against the owner's
> copy. Nothing in the reconciliation depends on opening one.

## Live captures

- `content-detector-live-v0.1-before-expand.png` — live result with the method disclosure closed.
- `content-detector-live-v0.1.png` — the same live generation with the method disclosure open.
- `content-detector-live-v0.2-expand.png` — the interim repair after the pattern-match, check-summary and known-watermark wording changes, with method detail open.

## Candidate compositions

- `content-detector-mockup1.png` — sparse public checker with desktop, 756 px and 375 px states.
- `content-detector-mockup2.png` — two-column checker with a separate analysed-draft view and six evidence disclosures.
- `content-detector-mockup3.png` — independent competitor-led platform concept covering text, URL, site and media workflows.
- `content-detector-mockup4.png` — two-column checker with linked, colour-coded source passages and evidence disclosures.

## Independent assessments

- `assessment-1.txt` — ranking: mockup 4, 2, 3, 1, live; live score 7.7/10.
- `assessment-2.txt` — ranking: mockup 4, 2, live, 1, 3; live score 7.8/10.
- `assessment-3.txt` — ranking: mockup 4, 2, 3, 1, live; live score 7.0/10.

The assessments are preserved verbatim. Their scores are opinions produced under different implicit weightings; the reconciliation in `DESIGN-FAILURE.md` explains why their diagnoses largely agree even when their numeric scores do not.

## SHA-256

```text
4041a9ec5b3bd228a3196a9c85217d86e5cbee9a3144215db2f64ece2ff3d87f  assessment-1.txt
4c4e98396e8271aae6b886799427e3831d38a97ed2182cadd51a3703a72efa2c  assessment-2.txt
98c29ac1ca7d51ec4da4212bbf34de30f625dced762aebc14e95deb73d7826a6  assessment-3.txt
b8897f8aa2b22defe25225b8a67e9225dee308dc64d0093b7cd9efdca8bbe98f  content-detector-live-v0.1-before-expand.png
9edbd63b77d46e6f2f8f443da414c6b42df7ae4d63a15e52d533bc20b802eb48  content-detector-live-v0.1.png
d06e58f185e2422d8b0a975c26913c77a133ea98a54a96a6c1ea1799780ab785  content-detector-live-v0.2-expand.png
36cf0269691821fd0141d0eac00f2879793775fcdd5b83b43049c0e285f9e413  content-detector-mockup1.png
74b3a8dd6d707b4802efac0809922153ac0c2ec09faf074f520b500ce788a986  content-detector-mockup2.png
2f44b25c4888ddb850aa16b8041ab88d1b041983100576410304279af318f48b  content-detector-mockup3.png
c813a7547fb42056157e70c20653091ee46fd8bc32b968cc3ad43b1fda43bdb9  content-detector-mockup4.png
```
