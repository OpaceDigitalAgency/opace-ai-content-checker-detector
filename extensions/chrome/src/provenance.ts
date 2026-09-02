export const MAX_PROVENANCE_BYTES = 20 * 1024 * 1024;

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
});
const SUPPORTED_MIME = new Set(Object.values(MIME_BY_EXTENSION));
const LIMITATIONS = Object.freeze([
  "Content Credentials describe recorded provenance; they do not prove authorship or whether AI was used.",
  "Certificate trust lists, remote manifests and online certificate status are not fetched by this local check.",
  "The selected file stays in this extension and no file bytes or filename are included in exports.",
]);

export type C2paState = "present" | "absent" | "invalid" | "untrusted" | "error" | "unsupported";
export interface C2paFileResult {
  file_hash: string;
  media_type: string;
  file_size: number;
  status: C2paState;
  trust: "not_validated" | "untrusted" | "not_applicable";
  reason: string;
  issues: ReadonlyArray<{ code: string; explanation: string | null; success: boolean | null }>;
  manifest_summary: null | {
    claim_generator: string | null;
    signer: string | null;
    signed_on: string | null;
    assertions_count: number;
    ingredients_count: number;
    validation_state: string | null;
  };
  limitations: readonly string[];
}

export class ProvenanceInspectionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ProvenanceInspectionError";
  }
}

const clipped = (value: unknown, maximum = 300): string | null => {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, maximum) : null;
};
const formatFor = (file: File): string | null => {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/u)?.[0] ?? "";
  return MIME_BY_EXTENSION[extension] ?? (SUPPORTED_MIME.has(file.type.toLowerCase()) ? file.type.toLowerCase() : null);
};
const abortError = (): DOMException => new DOMException("The local file inspection was cancelled.", "AbortError");
const throwIfAborted = (signal?: AbortSignal): void => { if (signal?.aborted) throw abortError(); };

async function raceWithSignal<T>(work: Promise<T>, signal?: AbortSignal, onAbort?: () => void): Promise<T> {
  if (!signal) return work;
  throwIfAborted(signal);
  let abort: (() => void) | undefined;
  const stopped = new Promise<never>((_resolve, reject) => {
    abort = () => { try { onAbort?.(); } finally { reject(abortError()); } };
    signal.addEventListener("abort", abort, { once: true });
  });
  try { return await Promise.race([work, stopped]); }
  finally { if (abort) signal.removeEventListener("abort", abort); }
}

async function digest(file: File): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

const baseResult = (fileHash: string, file: File, mediaType: string | null, status: C2paState, reason: string): C2paFileResult => Object.freeze({
  file_hash: `sha256:${fileHash}`,
  media_type: mediaType ?? (file.type || "application/octet-stream"),
  file_size: file.size,
  status,
  trust: status === "present" ? "not_validated" : status === "untrusted" ? "untrusted" : "not_applicable",
  reason,
  issues: Object.freeze([]),
  manifest_summary: null,
  limitations: LIMITATIONS,
});

function canonicalResult(fileHash: string, file: File, mediaType: string, store: any): C2paFileResult {
  const activeLabel = clipped(store?.active_manifest);
  const manifest = activeLabel && store?.manifests && typeof store.manifests === "object" ? store.manifests[activeLabel] : null;
  if (!manifest) return baseResult(fileHash, file, mediaType, "absent", "No Content Credentials were found. Their absence is normal and proves nothing about how the file was made.");
  const collected: Array<{ code: string; explanation: string | null; success: boolean | null }> = [];
  const seen = new Set<string>();
  const push = (status: any, successOverride?: boolean): void => {
    const code = clipped(String(status?.code ?? ""), 120);
    if (!code) return;
    const explanation = clipped(status?.explanation, 500);
    const key = `${code}|${explanation ?? ""}`;
    if (seen.has(key) || collected.length >= 25) return;
    seen.add(key);
    collected.push({ code, explanation, success: typeof status?.success === "boolean" ? status.success : successOverride ?? null });
  };
  const active = store.validation_results?.activeManifest;
  for (const status of Array.isArray(active?.failure) ? active.failure : []) push(status, false);
  for (const status of Array.isArray(active?.informational) ? active.informational : []) push(status, true);
  for (const status of Array.isArray(store.validation_status) ? store.validation_status : []) push(status);
  const failures = collected.filter((issue) => issue.success === false);
  const trustIssue = (issue: { code: string }): boolean => /(?:untrusted|trust)/iu.test(issue.code);
  const hasUntrusted = collected.some((issue) => /untrusted/iu.test(issue.code));
  const hasNonTrustFailure = failures.some((issue) => !trustIssue(issue));
  const invalidState = String(store.validation_state ?? "").toLowerCase() === "invalid";
  const status: C2paState = hasNonTrustFailure || (invalidState && !hasUntrusted) ? "invalid" : hasUntrusted ? "untrusted" : "present";
  const signature = manifest.signature_info ?? {};
  const generator = manifest.claim_generator_info?.[0];
  return Object.freeze({
    ...baseResult(fileHash, file, mediaType, status, status === "invalid"
      ? "Content Credentials are present, but local signature or manifest validation reported a problem."
      : status === "untrusted"
        ? "Content Credentials are present, but the signer was not established as trusted. No trust list was fetched."
        : "Content Credentials are present and the signature validated locally. Certificate trust was not checked."),
    issues: Object.freeze(collected),
    manifest_summary: Object.freeze({
      claim_generator: clipped(generator ? [generator.name, generator.version].filter(Boolean).join(" ") : manifest.claim_generator, 200),
      signer: clipped(signature.issuer ?? signature.common_name, 200),
      signed_on: clipped(signature.time, 100),
      assertions_count: Math.min(10_000, Math.max(0, Number(manifest.assertions?.length ?? 0))),
      ingredients_count: Math.min(10_000, Math.max(0, Number(manifest.ingredients?.length ?? 0))),
      validation_state: clipped(store.validation_state, 100),
    }),
  });
}

export function createProvenanceInspector() {
  let sdk: any = null;
  let sdkPromise: Promise<any> | null = null;
  const dispose = (): void => { try { sdk?.dispose?.(); } finally { sdk = null; sdkPromise = null; } };
  const load = (signal?: AbortSignal): Promise<any> => {
    if (!sdkPromise) {
      sdkPromise = (async () => {
        const moduleUrl = chrome.runtime.getURL("runtime/c2pa/index.js");
        const wasmUrl = chrome.runtime.getURL("runtime/c2pa/c2pa_bg.wasm");
        const [runtime, response] = await Promise.all([import(moduleUrl), fetch(wasmUrl, { cache: "force-cache", signal })]);
        if (!response.ok) throw new Error("The packaged Content Credentials runtime could not be loaded.");
        const wasm = await WebAssembly.compile(await response.arrayBuffer());
        throwIfAborted(signal);
        /* `workerSrc` is deliberately omitted. The audited runtime only accepts an
           https worker URL, which no extension origin can satisfy, so the runtime's
           own packaged worker is used instead. Nothing is fetched either way. */
        sdk = await runtime.createC2pa({
          wasmSrc: wasm,
          settings: { verify: { remoteManifestFetch: false, ocspFetch: false, verifyTrust: false, verifyTimestampTrust: false } },
        });
        return sdk;
      })().catch((error) => { sdkPromise = null; throw error; });
    }
    return raceWithSignal(sdkPromise, signal, dispose);
  };
  const inspect = async (file: File, signal?: AbortSignal): Promise<C2paFileResult> => {
    throwIfAborted(signal);
    if (file.size > MAX_PROVENANCE_BYTES) throw new ProvenanceInspectionError("file_too_large", "Choose a file no larger than 20 MB.");
    const mediaType = formatFor(file);
    const fileHash = await raceWithSignal(digest(file), signal);
    if (!mediaType) return baseResult(fileHash, file, null, "unsupported", "This release inspects JPEG, PNG, WebP and PDF files only.");
    let reader: any = null;
    try {
      const activeSdk = await load(signal);
      reader = await raceWithSignal(activeSdk.reader.fromBlob(mediaType, file), signal, dispose);
      if (!reader) return baseResult(fileHash, file, mediaType, "absent", "No Content Credentials were found. Their absence is normal and proves nothing about how the file was made.");
      return canonicalResult(fileHash, file, mediaType, await raceWithSignal(reader.manifestStore(), signal, dispose));
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      const message = String((error as Error).message ?? error);
      const invalid = /(?:UnknownAlgorithm|Invalid.*(?:claim|manifest|signature)|C2pa\((?:BadParam|ClaimVerification|Jumbf|Signature))/iu.test(message);
      return baseResult(fileHash, file, mediaType, invalid ? "invalid" : "error", invalid
        ? "The file contains Content Credentials that the local validator could not validate."
        : "The local Content Credentials check could not complete. No judgement was made.");
    } finally {
      try { await reader?.free?.(); } catch {}
    }
  };
  return Object.freeze({ inspect, dispose });
}

export function contentFreeProvenanceRecord(result: C2paFileResult) {
  return Object.freeze({
    schema: "opace-c2pa-provenance-1.0",
    generated_at: new Date().toISOString(),
    contains_content: false,
    file: { hash: result.file_hash, media_type: result.media_type, size_bytes: result.file_size },
    finding: { status: result.status, trust: result.trust, reason: result.reason, manifest_summary: result.manifest_summary, issues: result.issues },
    limitations: result.limitations,
  });
}
