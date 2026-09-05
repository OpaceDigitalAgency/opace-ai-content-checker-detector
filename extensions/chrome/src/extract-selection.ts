import type { CapturePayload } from "../../shared/types.js";

((): CapturePayload => ({
  kind: "selection",
  text: window.getSelection()?.toString() ?? "",
  host: location.hostname,
  title: document.title,
  limitations: []
}))();
