import { projectDomVisibleText } from "@opace/content-integrity-browser";
import type { CapturePayload } from "../../shared/types.js";

const root = document.querySelector("article, main, [role='main']") ?? document.body;
const projection = projectDomVisibleText(root);
const payload: CapturePayload = {
  kind: "article",
  text: projection.text,
  host: location.hostname,
  title: document.title,
  limitations: projection.limitations
};
void chrome.runtime.sendMessage({ type: "CAPTURE_READY", payload });
