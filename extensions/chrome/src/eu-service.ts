import { prefixedSha256 } from "@opace/content-integrity-core";
import { parseCycle5ChromeServerResponse, type Cycle5ServerScore } from "@opace/content-integrity-cycle5-browser";

export const CHROME_SERVICE_ORIGIN = "https://opace-detector-877422072168.europe-west1.run.app" as const;
export const CHROME_SERVICE_PERMISSION = `${CHROME_SERVICE_ORIGIN}/*` as const;
const INSTALL_KEY = "chrome_service_install_id";
const MAX_RESPONSE_BYTES = 65_536;
const REQUEST_TIMEOUT_MS = 45_000;

export class ChromeServiceError extends Error {
  constructor(message: string, readonly code: string, readonly retryable = false, readonly retryAfter?: number) {
    super(message);
    this.name = "ChromeServiceError";
  }
}

const randomId = (prefix: "cx_" | "req_"): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const encoded = btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${prefix}${encoded}`;
};

const installId = async (): Promise<string> => {
  const stored = await chrome.storage.local.get(INSTALL_KEY);
  const candidate = stored[INSTALL_KEY];
  if (typeof candidate === "string" && /^cx_[A-Za-z0-9_-]{16,64}$/u.test(candidate)) return candidate;
  const created = randomId("cx_");
  await chrome.storage.local.set({ [INSTALL_KEY]: created });
  return created;
};

const readBoundedJson = async (response: Response): Promise<unknown> => {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new ChromeServiceError("The EU service returned an oversized response.", "response_too_large");
  const reader = response.body?.getReader();
  if (!reader) return response.json();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new ChromeServiceError("The EU service returned an oversized response.", "response_too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch {
    throw new ChromeServiceError("The EU service returned invalid JSON.", "bad_response");
  }
};

const post = async (path: string, body: unknown, signal: AbortSignal, token?: string): Promise<unknown> => {
  const response = await fetch(`${CHROME_SERVICE_ORIGIN}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "x-opace-chrome-token": token } : {}) },
    body: JSON.stringify(body),
    credentials: "omit",
    cache: "no-store",
    redirect: "error",
    referrerPolicy: "no-referrer",
    signal,
  });
  const payload = await readBoundedJson(response);
  if (!response.ok) {
    const error = payload as { error?: unknown; message?: unknown; retryable?: unknown; retry_after?: unknown };
    throw new ChromeServiceError(
      typeof error.message === "string" ? error.message : `The EU service returned HTTP ${response.status}.`,
      typeof error.error === "string" ? error.error : "server_refused",
      error.retryable === true,
      typeof error.retry_after === "number" ? error.retry_after : undefined,
    );
  }
  return payload;
};

const solveChallenge = (challenge: string, difficultyBits: number, signal: AbortSignal, onPhase?: (message: string) => void): Promise<string> => new Promise((resolve, reject) => {
  const worker = new Worker(new URL("./eu-pow-worker.js", import.meta.url), { type: "module" });
  const onAbort = () => finish(new DOMException("The EU service check was cancelled.", "AbortError"));
  let timer: ReturnType<typeof setTimeout>;
  const finish = (error?: Error, nonce?: string): void => {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    worker.terminate();
    if (error) reject(error); else resolve(nonce!);
  };
  timer = setTimeout(() => finish(new ChromeServiceError("The EU service proof-of-work timed out.", "challenge_timeout")), 30_000);
  worker.onmessage = (event: MessageEvent<{ type?: string; nonce?: string; attempts?: number; code?: string }>) => {
    if (event.data.type === "solution" && typeof event.data.nonce === "string") finish(undefined, event.data.nonce);
    else if (event.data.type === "progress") onPhase?.(`Authorising the EU route locally… ${Number(event.data.attempts).toLocaleString("en-GB")} attempts`);
    else if (event.data.type === "error") finish(new ChromeServiceError("The EU service challenge could not be solved.", event.data.code ?? "challenge_failed"));
  };
  worker.onerror = () => finish(new ChromeServiceError("The EU service authorisation worker failed safely.", "challenge_worker_failed"));
  signal.addEventListener("abort", onAbort, { once: true });
  if (signal.aborted) onAbort(); else worker.postMessage({ challenge, difficultyBits });
});

export const requestChromeServicePermission = (): Promise<boolean> => chrome.permissions.request({ origins: [CHROME_SERVICE_PERMISSION] });

export async function requestChromeServerScore(text: string, signal?: AbortSignal, onPhase?: (message: string) => void): Promise<Cycle5ServerScore> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const extensionId = chrome.runtime.id;
    if (!/^[a-p]{32}$/u.test(extensionId)) throw new ChromeServiceError("This extension build has no valid Chrome extension identity.", "extension_identity_invalid");
    const currentInstallId = await installId();
    const requestId = randomId("req_");
    const bodyHash = prefixedSha256(text);
    onPhase?.("Requesting a body-bound EU service challenge…");
    const challengePayload = await post("/v1/chrome/challenge", { extension_id: extensionId, install_id: currentInstallId, request_id: requestId, body_sha256: bodyHash }, timeout.signal) as Record<string, unknown>;
    if (challengePayload.channel !== "chrome-extension-v1" || typeof challengePayload.challenge !== "string" || !Number.isInteger(challengePayload.difficulty_bits)) {
      throw new ChromeServiceError("The EU service returned an invalid challenge.", "challenge_invalid");
    }
    const nonce = await solveChallenge(challengePayload.challenge, Number(challengePayload.difficulty_bits), timeout.signal, onPhase);
    onPhase?.("Exchanging the one-use EU service challenge…");
    const tokenPayload = await post("/v1/chrome/token", { challenge: challengePayload.challenge, nonce }, timeout.signal) as Record<string, unknown>;
    if (tokenPayload.channel !== "chrome-extension-v1" || tokenPayload.header !== "x-opace-chrome-token" || typeof tokenPayload.token !== "string" || tokenPayload.max_checks !== 1) {
      throw new ChromeServiceError("The EU service returned an invalid one-use token.", "token_invalid");
    }
    onPhase?.("Scoring complete sections once in the Opace EU service…");
    const response = await post("/v1/chrome/check", {
      text,
      full_word_count: text.match(/\S+/gu)?.length ?? 0,
      extension_id: extensionId,
      install_id: currentInstallId,
      request_id: requestId,
    }, timeout.signal, tokenPayload.token);
    return parseCycle5ChromeServerResponse(response, text);
  } catch (cause) {
    if (timeout.signal.aborted) {
      if (signal?.aborted) throw new DOMException("The EU service check was cancelled.", "AbortError");
      throw new ChromeServiceError("The EU service did not complete within 45 seconds.", "timeout", true);
    }
    throw cause;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
