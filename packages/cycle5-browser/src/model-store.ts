import {
  CYCLE5_ASSETS,
  CYCLE5_CACHE_NAME,
  CYCLE5_MANIFEST_FILE,
  CYCLE5_MODEL_FILE,
  CYCLE5_SUPERSEDED_CACHES,
  CYCLE5_VOCAB_FILE,
  CYCLE5_WASM_FILE,
} from "./constants.js";
import { Cycle5BrowserError } from "./errors.js";
import type { DownloadProgress } from "./types.js";

export interface VerifiedAssets { model: Uint8Array; vocab: Uint8Array; wasm: Uint8Array; }

interface ManifestEntry { bytes?: unknown; sha256?: unknown; }
interface Manifest { version?: unknown; files?: Record<string, ManifestEntry>; }

export function normaliseAllowedModelBase(candidate: string, allowed: readonly string[]): string {
  let parsed: URL;
  try { parsed = new URL(candidate); } catch (cause) {
    throw new Cycle5BrowserError("invalid_model_base", "The model base is not a valid URL.", { cause });
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Cycle5BrowserError("invalid_model_base", "The model base must be an exact credential-free HTTPS directory URL.");
  }
  if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
  const normalised = parsed.href;
  const allowlist = allowed.map((entry) => {
    const url = new URL(entry);
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    return url.href;
  });
  if (!allowlist.includes(normalised)) throw new Cycle5BrowserError("invalid_model_base", "The model base is not in this host's fixed allowlist.");
  return normalised;
}

function throwIfAborted(signal?: AbortSignal, message = "The on-device model preparation was cancelled."): void {
  if (signal?.aborted) throw new Cycle5BrowserError("cancelled", message);
}

async function sha256(bytes: Uint8Array, signal?: AbortSignal): Promise<string> {
  throwIfAborted(signal);
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer as ArrayBuffer);
  throwIfAborted(signal);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function abortReason(signal?: AbortSignal): never {
  if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model preparation was cancelled.");
  throw new Cycle5BrowserError("engine_error", "The model asset stream ended unexpectedly.");
}

async function boundedFetch(
  fetcher: typeof globalThis.fetch,
  url: string,
  maxBytes: number,
  signal?: AbortSignal,
  onProgress?: (received: number) => void,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetcher(url, { method: "GET", credentials: "omit", redirect: "error", cache: "no-store", signal });
  } catch (cause) {
    if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model download was cancelled.", { cause });
    throw new Cycle5BrowserError("offline", `The on-device asset could not be fetched: ${url}`, { cause });
  }
  if (!response.ok) throw new Cycle5BrowserError("offline", `The on-device asset returned HTTP ${response.status}: ${url}`);
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    throwIfAborted(signal, "The on-device model download was cancelled.");
    if (bytes.byteLength > maxBytes) throw new Cycle5BrowserError("integrity_error", `The on-device asset exceeded its byte bound: ${url}`);
    onProgress?.(bytes.byteLength);
    return bytes;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    if (signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      abortReason(signal);
    }
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Cycle5BrowserError("integrity_error", `The on-device asset exceeded its byte bound: ${url}`);
    }
    chunks.push(value);
    onProgress?.(total);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function validateManifest(manifest: Manifest): void {
  if (manifest.version !== "tier3-cycle5-v1" || !manifest.files || typeof manifest.files !== "object") {
    throw new Cycle5BrowserError("integrity_error", "The model manifest does not identify tier3-cycle5-v1.");
  }
  for (const [file, expected] of Object.entries(CYCLE5_ASSETS)) {
    const entry = manifest.files[file];
    if (!entry || entry.bytes !== expected.bytes || entry.sha256 !== expected.sha256) {
      throw new Cycle5BrowserError("integrity_error", `The model manifest does not match the pinned ${file} identity.`);
    }
  }
}

async function validateAsset(file: keyof typeof CYCLE5_ASSETS, bytes: Uint8Array, signal?: AbortSignal): Promise<void> {
  const expected = CYCLE5_ASSETS[file];
  throwIfAborted(signal);
  if (bytes.byteLength !== expected.bytes || await sha256(bytes, signal) !== expected.sha256) {
    throw new Cycle5BrowserError("integrity_error", `Integrity check failed for ${file}.`);
  }
  throwIfAborted(signal);
}

const availableCaches = (provided?: CacheStorage): CacheStorage | undefined =>
  provided ?? (typeof caches === "undefined" ? undefined : caches);

async function pruneSuperseded(storage?: CacheStorage, signal?: AbortSignal): Promise<void> {
  const cacheStorage = availableCaches(storage);
  if (!cacheStorage) return;
  throwIfAborted(signal);
  const names = await cacheStorage.keys().catch(() => []);
  throwIfAborted(signal);
  await Promise.all(names.filter((name) => CYCLE5_SUPERSEDED_CACHES.includes(name as typeof CYCLE5_SUPERSEDED_CACHES[number])).map((name) => cacheStorage.delete(name)));
  throwIfAborted(signal);
}

function assetUrl(baseUrl: string, wasmUrl: string | undefined, file: keyof typeof CYCLE5_ASSETS): string {
  if (file === CYCLE5_WASM_FILE && wasmUrl) return new URL(wasmUrl, globalThis.location?.href ?? baseUrl).href;
  return new URL(file, baseUrl).href;
}

function cacheAssetUrl(baseUrl: string, wasmUrl: string | undefined, file: keyof typeof CYCLE5_ASSETS): string {
  const transportUrl = assetUrl(baseUrl, wasmUrl, file);
  // Cache Storage accepts HTTP(S) request keys, not chrome-extension URLs.
  // Packaged bytes use the pinned asset's HTTPS identity only as a cache key;
  // their fetch still uses the packaged URL and their size/hash are verified.
  return /^https?:$/u.test(new URL(transportUrl).protocol)
    ? transportUrl
    : new URL(file, baseUrl).href;
}

export async function loadVerifiedCachedAssets(
  baseUrl: string,
  wasmUrl: string | undefined,
  storage?: CacheStorage,
  signal?: AbortSignal,
): Promise<VerifiedAssets | undefined> {
  const cacheStorage = availableCaches(storage);
  if (!cacheStorage) return undefined;
  throwIfAborted(signal);
  await pruneSuperseded(cacheStorage, signal);
  let cache: Cache;
  try {
    cache = await cacheStorage.open(CYCLE5_CACHE_NAME);
    throwIfAborted(signal);
  } catch (cause) {
    if (cause instanceof Cycle5BrowserError && cause.code === "cancelled") throw cause;
    return undefined;
  }
  const loaded = {} as Record<keyof typeof CYCLE5_ASSETS, Uint8Array>;
  try {
    for (const file of Object.keys(CYCLE5_ASSETS) as Array<keyof typeof CYCLE5_ASSETS>) {
      throwIfAborted(signal);
      const response = await cache.match(cacheAssetUrl(baseUrl, wasmUrl, file));
      throwIfAborted(signal);
      if (!response) return undefined;
      const bytes = new Uint8Array(await response.arrayBuffer());
      throwIfAborted(signal);
      await validateAsset(file, bytes, signal);
      loaded[file] = bytes;
    }
  } catch (cause) {
    if (cause instanceof Cycle5BrowserError && cause.code === "cancelled") throw cause;
    await cacheStorage.delete(CYCLE5_CACHE_NAME).catch(() => false);
    return undefined;
  }
  throwIfAborted(signal);
  return { model: loaded[CYCLE5_MODEL_FILE], vocab: loaded[CYCLE5_VOCAB_FILE], wasm: loaded[CYCLE5_WASM_FILE] };
}

export async function downloadVerifiedAssets(options: {
  baseUrl: string;
  wasmUrl?: string;
  fetcher: typeof globalThis.fetch;
  cacheStorage?: CacheStorage;
  signal?: AbortSignal;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<VerifiedAssets> {
  const { baseUrl, wasmUrl, fetcher, cacheStorage, signal, onProgress } = options;
  await pruneSuperseded(cacheStorage, signal);
  const manifestBytes = await boundedFetch(fetcher, new URL(CYCLE5_MANIFEST_FILE, baseUrl).href, 65_536, signal);
  let manifest: Manifest;
  try { manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as Manifest; } catch (cause) {
    throw new Cycle5BrowserError("integrity_error", "The model manifest is not valid JSON.", { cause });
  }
  validateManifest(manifest);
  const files = Object.keys(CYCLE5_ASSETS) as Array<keyof typeof CYCLE5_ASSETS>;
  const loaded = {} as Record<keyof typeof CYCLE5_ASSETS, Uint8Array>;
  for (const [index, file] of files.entries()) {
    const expected = CYCLE5_ASSETS[file];
    const url = assetUrl(baseUrl, wasmUrl, file);
    const bytes = await boundedFetch(fetcher, url, expected.bytes, signal, (receivedBytes) => onProgress?.({
      file, fileIndex: index + 1, fileCount: files.length, receivedBytes, totalBytes: expected.bytes,
    }));
    await validateAsset(file, bytes, signal);
    loaded[file] = bytes;
  }
  const storage = availableCaches(cacheStorage);
  if (storage) {
    try {
      const cache = await storage.open(CYCLE5_CACHE_NAME);
      throwIfAborted(signal);
      for (const file of files) {
        throwIfAborted(signal);
        const expected = CYCLE5_ASSETS[file];
        await cache.put(cacheAssetUrl(baseUrl, wasmUrl, file), new Response(loaded[file].slice().buffer, { headers: { "content-type": expected.mediaType, "content-length": String(expected.bytes) } }));
        throwIfAborted(signal);
      }
    } catch (cause) {
      if (signal?.aborted) throw new Cycle5BrowserError("cancelled", "The on-device model preparation was cancelled.", { cause });
      // Cache Storage can be unavailable or quota-limited. The verified in-memory session remains usable.
    }
  }
  return { model: loaded[CYCLE5_MODEL_FILE], vocab: loaded[CYCLE5_VOCAB_FILE], wasm: loaded[CYCLE5_WASM_FILE] };
}

export async function clearCycle5Cache(storage?: CacheStorage): Promise<boolean> {
  const cacheStorage = availableCaches(storage);
  return cacheStorage ? cacheStorage.delete(CYCLE5_CACHE_NAME) : false;
}
