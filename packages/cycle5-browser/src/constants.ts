import type { Cycle5BandId } from "@opacedev/ai-content-checker-core";

export const CYCLE5_BROWSER_RUNTIME_VERSION = "cycle5-browser:2026.09.1" as const;
export const CYCLE5_MODEL_BASE = "https://opace.agency/models/local-signals-v1/" as const;
export const CYCLE5_CACHE_NAME = "opace-content-integrity-cycle5-browser-2026-09-1" as const;
export const CYCLE5_SUPERSEDED_CACHES = [
  "opace-local-signals-v1",
  "opace-local-signals-cycle2",
  "opace-local-signals-cycle5",
] as const;
export const CYCLE5_MODEL_FILE = "tier3-cycle5-full-e5small-int8-perchannel.onnx" as const;
export const CYCLE5_VOCAB_FILE = "vocab.txt" as const;
export const CYCLE5_WASM_FILE = "ort/ort-wasm-simd-threaded.wasm" as const;
export const CYCLE5_MANIFEST_FILE = "manifest.json" as const;
export const CYCLE5_MODEL_BYTES = 34_301_767;
export const CYCLE5_MODEL_SHA256 = "9f57d6a8fe48a329170c5272f4f09a08ed383f9f461e7900fecd70f9fb15ef1b" as const;
export const CYCLE5_VOCAB_BYTES = 231_508;
export const CYCLE5_VOCAB_SHA256 = "07eced375cec144d27c900241f3e339478dec958f92fddbc551f295c992038a3" as const;
export const CYCLE5_WASM_BYTES = 13_961_845;
export const CYCLE5_WASM_SHA256 = "ec8580a9d7b9476ceee52e10a7f94124e4dc71a019d666ed6d4726697c109a4d" as const;
export const CYCLE5_DOWNLOAD_BYTES = CYCLE5_MODEL_BYTES + CYCLE5_VOCAB_BYTES;
export const CYCLE5_MODEL_DOWNLOAD_LABEL = "34.5 MB" as const;
export const CYCLE5_RUNTIME_DOWNLOAD_LABEL = "14–26 MB" as const;
export const CYCLE5_DEFAULT_MAX_CHARACTERS = 50_000;
export const CYCLE5_MAX_CHARACTERS = 100_000;
export const CYCLE5_MAX_LEN = 512;
export const CYCLE5_MIN_SCORED_TOKENS = 50;
export const CYCLE5_TEMPERATURE = 1.0479;
export const CYCLE5_PRIMARY_MARGIN = 3.570935;
export const CYCLE5_SECONDARY_GAP = 0.34;
export const CYCLE5_PRIMARY_DISPLAY_THRESHOLD = 0.9679444972866822;
export const CYCLE5_SECONDARY_DISPLAY_THRESHOLD = 0.9561964051006938;
export const CYCLE5_BANDS: ReadonlyArray<{ id: Cycle5BandId; min: number }> = [
  { id: "very_likely_ai", min: CYCLE5_PRIMARY_DISPLAY_THRESHOLD },
  { id: "uncertain", min: 0.95 },
  { id: "likely_human", min: 0.5 },
  { id: "very_likely_human", min: 0 },
];

export const CYCLE5_ASSETS = Object.freeze({
  [CYCLE5_MODEL_FILE]: { bytes: CYCLE5_MODEL_BYTES, sha256: CYCLE5_MODEL_SHA256, mediaType: "application/octet-stream" },
  [CYCLE5_VOCAB_FILE]: { bytes: CYCLE5_VOCAB_BYTES, sha256: CYCLE5_VOCAB_SHA256, mediaType: "text/plain" },
  [CYCLE5_WASM_FILE]: { bytes: CYCLE5_WASM_BYTES, sha256: CYCLE5_WASM_SHA256, mediaType: "application/wasm" },
});
