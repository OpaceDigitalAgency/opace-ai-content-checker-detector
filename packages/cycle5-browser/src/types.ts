import type { AnalysisResult, CheckerResult } from "@opacedev/ai-content-checker-contracts";
import type { Cycle5BandId } from "@opacedev/ai-content-checker-core";

export type RuntimeState = "not_ready" | "checking_cache" | "downloading" | "loading" | "ready" | "offline" | "integrity_error" | "error";
export type RuntimeErrorCode = "consent_required" | "not_ready" | "offline" | "integrity_error" | "invalid_model_base" | "too_long" | "too_short" | "cancelled" | "engine_error";

export interface RuntimeSnapshot { state: RuntimeState; message: string; cacheVersion: string; }
export interface DownloadProgress { file: string; fileIndex: number; fileCount: number; receivedBytes: number; totalBytes: number; }
export interface Cycle5BrowserRuntimeConfig {
  modelBaseUrl: string;
  allowedModelBaseUrls: readonly string[];
  wasmUrl?: string;
  maxCharacters?: number;
  fetch?: typeof globalThis.fetch;
  cacheStorage?: CacheStorage;
  createSession?: SessionFactory;
  now?: () => Date;
}
export interface SessionOutput { logits: Float32Array; }
export interface InferenceSession { run(feeds: { input_ids: BigInt64Array; attention_mask: BigInt64Array; feats: Float32Array }, shape: readonly [number, number]): Promise<SessionOutput>; release?(): Promise<void> | void; }
export type SessionFactory = (assets: { model: Uint8Array; wasm: Uint8Array }, signal?: AbortSignal) => Promise<InferenceSession>;
export interface ScoredSection { index: number; startUtf16: number; endUtf16: number; wordCount: number; tokenCount: number; rawScore: number; rawMargin: number; bandId: Cycle5BandId; passage: string; }
export interface Cycle5BrowserScore { status: "scored"; provider: "onnxruntime-web-wasm"; modelVersion: "tier3-cycle5-v1"; rawScore: number; rawMargin: number; flagged: boolean; flagReason: "primary" | "secondary" | null; sections: ScoredSection[]; }
export interface Cycle5ServerScore { status: "scored"; provider: "opace-eu-server-fp32"; modelVersion: "tier3-cycle5-v1"; modelBuild: "45e00978b10d1df6"; rawScore: number; rawMargin: number; flagged: boolean; flagReason: "primary" | "secondary" | null; wordCount: number; sections: ScoredSection[]; }
export interface Cycle5NotScored { status: "not_scored"; code: RuntimeErrorCode; reason: string; }
export type Cycle5ScoreResult = Cycle5BrowserScore | Cycle5NotScored;
export interface ComposeBrowserCheckerOptions { surface: "Chrome extension" | "Astro toolbar"; resultId: string; reportFormat: "pdf" | "html"; maxCharacters: number; generatedAt?: string; supportDestination?: string; }
export interface ComposeServerCheckerOptions { surface: "Chrome extension"; resultId: string; reportFormat: "pdf" | "html"; maxCharacters: number; maxWords: number; generatedAt?: string; supportDestination?: string; requestCount?: number; }
export type { AnalysisResult, CheckerResult };
