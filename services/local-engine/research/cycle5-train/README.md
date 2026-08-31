# Cycle-5 training — structural features, calibration spread as an objective

Owner-authorised scope: training, evaluation, a candidate model. NOT
authorised from here: deployment, threshold changes, any live-surface change.
The candidate and its evaluation go to the owner.

## What this cycle changes (the two cycle-4 lessons, built in)

1. **Calibration spread is a training objective.** Label smoothing 0.05;
   per-epoch fitted temperature and calibrated cal spread recorded; an epoch
   with fitted T > 1.30 or calibrated sd < 0.25 cannot be selected
   (cycle 4 died at T = 1.7137).
2. **The int8 gate runs at every epoch**, not at the end (cycle 3 died at the
   end on a 5.2-point int8 recall loss).
3. **Structural features as model inputs.** The 7 measured fingerprint
   components (+1 missingness flag) are concatenated to the pooled embedding
   before the head — computed by importing the measurement code
   (document-tells, structured-corpus, signal-science), never re-derived.
   An ablation arm trains the identical architecture with zeroed features so
   the contribution is measured, not assumed.
4. **The secondary flag point is fitted in margin space** (`analyse.py`):
   flag iff max(m1, m2+g) >= a — never a probability ratio.

## Pipeline

```sh
PY=<venv with torch/transformers/onnx/onnxruntime/sklearn>
python3 prepare_data.py            # dataset.jsonl + manifest + eval-exclusions
python3 struct_features.py dataset.jsonl features.jsonl
C5_ARM=full     $PY train.py       # ckpt-full/ + train-report-full.json
C5_ARM=ablation $PY train.py       # ckpt-ablation/ (features zeroed)
$PY export_final.py <arm>          # models/tier3-cycle5-* (fp32 + int8 pc)
$PY score_battery.py --model shipped --tag old            # baseline scores
$PY score_battery.py --model ckpt:ckpt-full --tag c5
$PY score_battery.py --model ckpt:ckpt-ablation --tag c5abl --zero-feats
$PY score_battery.py --model int8:<onnx>,ckpt-full --tag c5i8
$PY analyse.py --new c5           # gates -> results-c5.json
$PY bench_runtime.py <int8> ckpt-full
```

## Data (see dataset-manifest.json for SHA-256 and counts)

- Base: cycle4-fiction/dataset.jsonl verbatim (embeds cycle 3 + cycle 2 with
  their group-aware splits, battery pinning, measurement guard).
- cycle4-humaniser-pairs corpus-train.jsonl outputs (owner-approved):
  AI rewrites all intensities; heavy human-rewrites as AI; light/medium
  human rewrites excluded. measurement_overlap sources -> eval-exclusions.
- human-structured-corpus GREEN only; matched-generation topic bucket
  (sha256(slug)%100<15) and gemini family never trained on.
- matched-generation matched.jsonl non-eval rows, grouped by topic slug
  jointly with their human partners.

`c3sets/` are the banked measurement sets (rescued from a session scratchpad
on 31 Aug; SHA-256 in dataset-manifest.json's guard notes). The long-form
5,558 corpus, battery corpora, held-out short-form slices and the nine are
never trained on; long-form docs contaminated by base-corpus history or
trained rewrites are excluded from measurement via eval-exclusions.json.
