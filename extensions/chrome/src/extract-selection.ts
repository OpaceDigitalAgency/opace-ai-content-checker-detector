import type { CapturePayload } from "../../shared/types.js";

const selection = window.getSelection();
const text = selection?.toString() ?? "";
const payload: CapturePayload = {
  kind: "selection",
  text,
  host: location.hostname,
  title: document.title,
  limitations: []
};
void chrome.runtime.sendMessage({ type: "CAPTURE_READY", payload });
