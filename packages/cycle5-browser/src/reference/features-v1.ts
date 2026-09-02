/**
 * The `features-v1` contract: the 8 structural features cycle-5's model
 * reads, in the exact order and normalisation `train.py` used, computed on
 * RAW draft text (no `md-strip-v1` — see PHASE1-PARITY-NOTE-2026-09-01.md
 * in the engine repository, `services/local-engine/research/cycle5-train/deploy-prep/`,
 * for the verification: cycle 5's encoder and structural features were both
 * trained on the raw `text` field, including the 418-document held-out
 * structured-human set behind the headline 27.3%->0.2% result. Feeding
 * `md-strip-v1` output into these functions would remove the very
 * headings/bullets `classifyBlocks` exists to detect.
 *
 * Order, means, standard deviations and the clip bound are copied verbatim
 * from `../models/tier3-cycle5-full-config.json` (`feature_names`,
 * `feature_norm`) in the engine repository — the packaged candidate's own
 * config, not re-derived — so a config change there is the only place this
 * needs to be re-copied from, never re-fitted independently.
 *
 * Each raw feature function is verified against its Python original with
 * golden fixtures in `deploy-prep/fixtures/` (PHASE1-PARITY-NOTE-2026-09-01.md):
 * `wordMetrics` (features 0/1/2), `scaffoldFeaturesRaw` (3/4),
 * `adjacentCohesionRaw` (5), `paragraphCadenceRate` (6) and `hasStructure`
 * (7), all in `document-tells.ts` and `cadence.ts`. This module composes
 * them; it computes nothing itself beyond ordering and z-normalisation.
 */

import {adjacentCohesionRaw, hasStructure, scaffoldFeaturesRaw, wordMetrics} from "./document-tells.js";
import {paragraphCadenceRate} from "./cadence.js";

/** The shared contract name, advertised by the server once cycle 5 is live. */
export const FEATURES_V1_CONTRACT = "features-v1";

/**
 * Verbatim from `../models/tier3-cycle5-full-config.json` as packaged with
 * the candidate (`tier3-cycle5-full-e5small-int8-perchannel.onnx`,
 * `tier3-cycle5-full-e5small-fp32.onnx`). Order matches `FEAT_NAMES` in
 * `struct_features.py`.
 */
export const FEATURE_NAMES = [
  "wpp_cv", "sec_within15", "pps_var", "body_mode_share",
  "spp_cv", "adj_overlap", "cadence_rate", "has_structure"
] as const;

export const FEATURE_NORM = {
  mean: [
    0.4083594134418581, 0.3858695169470864, 3.972885878050851, 0.47256837589441686,
    0.3761888885414563, 0.04671324010389126, 0.43453264073828046, 0.4892945080826464
  ],
  sd: [
    0.21248020231631692, 0.26923918696432436, 41.53045781679202, 0.20330337201399315,
    0.16477298430411097, 0.04122616971543623, 1.3061158641315476, 0.49988537930490373
  ],
  clip: 4.0
} as const;

/**
 * The 8 raw feature values in the model's order, `undefined` where Python
 * would produce NaN (missing/ungated). Operates on RAW text — the caller
 * must NOT run `stripForModel`/`md-strip-v1` on the draft first.
 */
export const rawFeatures = (text: string): (number | undefined)[] => {
  const wm = wordMetrics(text);
  const scaffold = scaffoldFeaturesRaw(text);
  const cohesion = adjacentCohesionRaw(text);
  const cadenceRate = paragraphCadenceRate(text);
  return [
    wm.wppCv,
    wm.secWithin15,
    wm.ppsVar,
    scaffold.bodyModeShare,
    scaffold.sppCv,
    cohesion?.value,
    cadenceRate,
    hasStructure(text)
  ];
};

/**
 * Z-normalised, clipped, NaN/undefined -> 0 — exactly `model_lib.py::apply_norm`:
 * `z = clip((x - mean) / sd, -clip, clip)`, then any non-finite result to 0.
 */
export const normaliseFeatures = (raw: (number | undefined)[]): number[] =>
  raw.map((value, i) => {
    if (value === undefined || !Number.isFinite(value)) return 0;
    const z = (value - FEATURE_NORM.mean[i]) / FEATURE_NORM.sd[i];
    const clipped = Math.min(FEATURE_NORM.clip, Math.max(-FEATURE_NORM.clip, z));
    return Number.isFinite(clipped) ? clipped : 0;
  });

/** The full `feats[8]` tensor the ONNX model's third input expects, from raw draft text. */
export const featuresV1 = (text: string): number[] => normaliseFeatures(rawFeatures(text));
