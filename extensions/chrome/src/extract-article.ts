import { projectDomVisibleText } from "@opace/content-integrity-browser";
import type { CapturePayload } from "../../shared/types.js";

((): CapturePayload => {
  const root = document.querySelector("article, main, [role='main']") ?? document.body;
  const projection = projectDomVisibleText(root);
  return {
    kind: "article",
    text: projection.text,
    host: location.hostname,
    title: document.title,
    limitations: projection.limitations
  };
})();
