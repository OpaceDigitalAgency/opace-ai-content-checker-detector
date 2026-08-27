export const MAX_TEXT_LENGTH = 50_000;

export type CaptureKind = "selection" | "article" | "paste";

export interface CapturePayload {
  kind: CaptureKind;
  text: string;
  host: string;
  title: string;
  limitations: string[];
}

export interface ExtensionSettings {
  receiptHistory: false;
  highContrast: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = Object.freeze({
  receiptHistory: false,
  highContrast: false
});

export const sourceLabel = (capture: CapturePayload): string => {
  if (capture.kind === "paste") return "Pasted text";
  const noun = capture.kind === "selection" ? "Selected text" : "Visible article text";
  return `${noun} from ${capture.host || "this page"}`;
};

export const validateCapture = (capture: CapturePayload): string | null => {
  if (!capture.text.trim()) return capture.kind === "selection"
    ? "Select at least one sentence, or choose Check this article."
    : "Paste or capture some text before inspection.";
  if (capture.text.length > MAX_TEXT_LENGTH) {
    return `This text is ${capture.text.length.toLocaleString("en-GB")} characters. The local browser limit is ${MAX_TEXT_LENGTH.toLocaleString("en-GB")}; choose or paste a smaller scope. Nothing was truncated.`;
  }
  for (let index = 0; index < capture.text.length; index += 1) {
    const current = capture.text.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = capture.text.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return "The text contains an unpaired Unicode surrogate and cannot be inspected safely.";
      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      return "The text contains an unpaired Unicode surrogate and cannot be inspected safely.";
    }
  }
  return null;
};
