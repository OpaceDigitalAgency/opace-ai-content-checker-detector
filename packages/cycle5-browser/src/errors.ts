import type { RuntimeErrorCode } from "./types.js";

export class Cycle5BrowserError extends Error {
  readonly code: RuntimeErrorCode;
  constructor(code: RuntimeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "Cycle5BrowserError";
    this.code = code;
  }
}
