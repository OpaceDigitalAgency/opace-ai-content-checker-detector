import {
  CYCLE5_BANDS,
  CYCLE5_CACHE_NAME,
  CYCLE5_DEFAULT_MAX_CHARACTERS,
  CYCLE5_MAX_CHARACTERS,
  CYCLE5_MAX_LEN,
  CYCLE5_MIN_SCORED_TOKENS,
  CYCLE5_PRIMARY_MARGIN,
  CYCLE5_SECONDARY_GAP,
  CYCLE5_TEMPERATURE,
} from "./constants.js";
import { Cycle5BrowserError } from "./errors.js";
import { clearCycle5Cache, downloadVerifiedAssets, loadVerifiedCachedAssets, normaliseAllowedModelBase } from "./model-store.js";
import { featuresV1 } from "./reference/features-v1.js";
import { scoringOrder, segmentText } from "./reference/segments.js";
import { WordPieceTokenizer } from "./reference/tokenizer.js";
import type {
  Cycle5BrowserRuntimeConfig,
  Cycle5BrowserScore,
  Cycle5ScoreResult,
  DownloadProgress,
  InferenceSession,
  RuntimeSnapshot,
  RuntimeState,
  SessionFactory,
} from "./types.js";

const probabilityFromMargin = (margin: number): number => 1 / (1 + Math.exp(-margin / CYCLE5_TEMPERATURE));
const bandFor = (score: number) => CYCLE5_BANDS.find((band) => score >= band.min)!.id;

async function defaultSessionFactory(assets: { model: Uint8Array; wasm: Uint8Array }, signal?: AbortSignal): Promise<InferenceSession> {
  if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
  const ort = await import("onnxruntime-web/wasm");
  const wasmUrl = URL.createObjectURL(new Blob([assets.wasm.slice().buffer], { type: "application/wasm" }));
  try {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = { wasm: wasmUrl };
    const session = await ort.InferenceSession.create(assets.model.slice(), { executionProviders: ["wasm"], graphOptimizationLevel: "basic" });
    if (signal?.aborted) {
      await session.release();
      throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    }
    return {
      async run(feeds, shape) {
        const output = await session.run({
          input_ids: new ort.Tensor("int64", feeds.input_ids, shape),
          attention_mask: new ort.Tensor("int64", feeds.attention_mask, shape),
          feats: new ort.Tensor("float32", feeds.feats, [1, 8]),
        });
        const logits = await output.logits?.getData();
        if (!logits || logits.length !== 2) throw new Cycle5BrowserError("engine_error", "The Cycle-5 model returned an invalid logits tensor.");
        return { logits: Float32Array.from(logits as ArrayLike<number>) };
      },
      release: () => session.release(),
    };
  } finally {
    URL.revokeObjectURL(wasmUrl);
  }
}

export class Cycle5BrowserRuntime {
  readonly modelBaseUrl: string;
  readonly maxCharacters: number;
  private readonly wasmUrl?: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly cacheStorage?: CacheStorage;
  private readonly sessionFactory: SessionFactory;
  private session?: InferenceSession;
  private tokenizer?: WordPieceTokenizer;
  private preparation?: Promise<void>;
  private snapshot: RuntimeSnapshot = { state: "not_ready", message: "The on-device model has not been prepared.", cacheVersion: CYCLE5_CACHE_NAME };

  constructor(config: Cycle5BrowserRuntimeConfig) {
    this.modelBaseUrl = normaliseAllowedModelBase(config.modelBaseUrl, config.allowedModelBaseUrls);
    this.wasmUrl = config.wasmUrl;
    this.maxCharacters = config.maxCharacters ?? CYCLE5_DEFAULT_MAX_CHARACTERS;
    if (!Number.isInteger(this.maxCharacters) || this.maxCharacters < 1 || this.maxCharacters > CYCLE5_MAX_CHARACTERS) {
      throw new RangeError(`maxCharacters must be an integer from 1 to ${CYCLE5_MAX_CHARACTERS}.`);
    }
    this.fetcher = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.cacheStorage = config.cacheStorage;
    this.sessionFactory = config.createSession ?? defaultSessionFactory;
  }

  state(): Readonly<RuntimeSnapshot> { return Object.freeze({ ...this.snapshot }); }

  private setState(state: RuntimeState, message: string): void {
    this.snapshot = { state, message, cacheVersion: CYCLE5_CACHE_NAME };
  }

  async prepareFromCache(signal?: AbortSignal): Promise<boolean> {
    if (this.session) return true;
    if (this.preparation) { await this.preparation; return Boolean(this.session); }
    this.setState("checking_cache", "Checking for a previously consented Cycle-5 model.");
    let assets;
    try {
      assets = await loadVerifiedCachedAssets(this.modelBaseUrl, this.wasmUrl, this.cacheStorage, signal);
    } catch (cause) {
      if (cause instanceof Cycle5BrowserError && cause.code === "cancelled") this.setState("not_ready", cause.message);
      throw cause;
    }
    if (!assets) {
      this.setState("not_ready", "The Cycle-5 model is not cached. An explicit download choice is required.");
      return false;
    }
    this.preparation = this.loadAssets(assets, signal);
    try { await this.preparation; return true; } finally { this.preparation = undefined; }
  }

  async prepareWithConsent(options: { consent: boolean; signal?: AbortSignal; onProgress?: (progress: DownloadProgress) => void }): Promise<void> {
    if (!options.consent) throw new Cycle5BrowserError("consent_required", "Explicit consent is required before the model download starts.");
    if (this.session) return;
    if (this.preparation) return this.preparation;
    this.setState("downloading", this.wasmUrl
      ? "Downloading the pinned model and vocabulary after explicit consent, then verifying the packaged browser runtime."
      : "Downloading the pinned model, vocabulary and browser runtime after explicit consent.");
    this.preparation = (async () => {
      try {
        const cached = await loadVerifiedCachedAssets(this.modelBaseUrl, this.wasmUrl, this.cacheStorage, options.signal);
        const assets = cached ?? await downloadVerifiedAssets({
          baseUrl: this.modelBaseUrl,
          wasmUrl: this.wasmUrl,
          fetcher: this.fetcher,
          cacheStorage: this.cacheStorage,
          signal: options.signal,
          onProgress: options.onProgress,
        });
        await this.loadAssets(assets, options.signal);
      } catch (cause) {
        const error = cause instanceof Cycle5BrowserError ? cause : new Cycle5BrowserError("engine_error", "The on-device model could not be prepared.", { cause });
        const state: RuntimeState = error.code === "offline" ? "offline" : error.code === "integrity_error" ? "integrity_error" : error.code === "cancelled" ? "not_ready" : "error";
        this.setState(state, error.message);
        throw error;
      }
    })();
    try { await this.preparation; } finally { this.preparation = undefined; }
  }

  private async loadAssets(assets: { model: Uint8Array; vocab: Uint8Array; wasm: Uint8Array }, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    this.setState("loading", "Loading the verified Cycle-5 model on this device.");
    const tokenizer = new WordPieceTokenizer(new TextDecoder().decode(assets.vocab));
    if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    const session = await this.sessionFactory({ model: assets.model, wasm: assets.wasm }, signal);
    if (signal?.aborted) {
      await session.release?.();
      throw new Cycle5BrowserError("cancelled", "The on-device model load was cancelled.");
    }
    this.tokenizer = tokenizer;
    this.session = session;
    this.setState("ready", "The verified Cycle-5 model is ready on this device.");
  }

  async score(text: string, options: { signal?: AbortSignal; onSection?: (done: number, total: number) => void } = {}): Promise<Cycle5ScoreResult> {
    if (!this.session || !this.tokenizer) return { status: "not_scored", code: "not_ready", reason: this.snapshot.message };
    if (text.length > this.maxCharacters) return { status: "not_scored", code: "too_long", reason: `The draft is ${text.length} characters; this route refuses more than ${this.maxCharacters} rather than truncating it.` };
    if (options.signal?.aborted) return { status: "not_scored", code: "cancelled", reason: "The on-device model run was cancelled." };
    const pieces = segmentText(text, (values) => this.tokenizer!.countTokens(values));
    const sections: Cycle5BrowserScore["sections"] = [];
    let done = 0;
    for (const position of scoringOrder(pieces.length)) {
      if (options.signal?.aborted) return { status: "not_scored", code: "cancelled", reason: "The on-device model run was cancelled." };
      const piece = pieces[position]!;
      const encoded = this.tokenizer.encode(piece.text, CYCLE5_MAX_LEN);
      const scoredTokens = encoded.inputIds.length - 2;
      if (scoredTokens < CYCLE5_MIN_SCORED_TOKENS) continue;
      if (encoded.truncated || piece.tokens > CYCLE5_MAX_LEN) throw new Cycle5BrowserError("integrity_error", "segments-v3 failed to fit a complete section in the model window.");
      const inputIds = new BigInt64Array(encoded.inputIds.map((id) => BigInt(id)));
      const output = await this.session.run({
        input_ids: inputIds,
        attention_mask: new BigInt64Array(inputIds.length).fill(1n),
        feats: Float32Array.from(featuresV1(piece.text)),
      }, [1, inputIds.length]);
      const rawMargin = output.logits[1]! - output.logits[0]!;
      const rawScore = probabilityFromMargin(rawMargin);
      sections.push({
        index: piece.index,
        startUtf16: piece.start,
        endUtf16: piece.end,
        wordCount: piece.words,
        tokenCount: scoredTokens,
        rawScore,
        rawMargin,
        bandId: bandFor(rawScore),
        passage: piece.text,
      });
      done += 1;
      options.onSection?.(done, pieces.length);
    }
    if (!sections.length) return { status: "not_scored", code: "too_short", reason: `At least ${CYCLE5_MIN_SCORED_TOKENS} scored tokens are required for an AI-pattern reading.` };
    sections.sort((a, b) => a.index - b.index);
    sections.forEach((section, index) => { section.index = index; });
    const strongest = sections.reduce((best, section) => section.rawScore > best.rawScore ? section : best, sections[0]!);
    const margins = sections.map((section) => section.rawMargin).sort((a, b) => b - a);
    const primary = margins[0]! >= CYCLE5_PRIMARY_MARGIN;
    const secondary = margins.length > 1 && margins[1]! + CYCLE5_SECONDARY_GAP >= CYCLE5_PRIMARY_MARGIN;
    return {
      status: "scored",
      provider: "onnxruntime-web-wasm",
      modelVersion: "tier3-cycle5-v1",
      rawScore: strongest.rawScore,
      rawMargin: strongest.rawMargin,
      flagged: primary || secondary,
      flagReason: primary ? "primary" : secondary ? "secondary" : null,
      sections,
    };
  }

  async clearCache(): Promise<boolean> { return clearCycle5Cache(this.cacheStorage); }

  async dispose(): Promise<void> {
    await this.session?.release?.();
    this.session = undefined;
    this.tokenizer = undefined;
    this.setState("not_ready", "The on-device session was released. Cached verified assets were not deleted.");
  }
}

export function createCycle5BrowserRuntime(config: Cycle5BrowserRuntimeConfig): Cycle5BrowserRuntime {
  return new Cycle5BrowserRuntime(config);
}
