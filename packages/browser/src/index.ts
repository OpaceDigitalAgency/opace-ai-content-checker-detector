export { createInspectionWorker,type InspectionWorkerClient } from "./worker/client.js";
export { projectDomVisibleText,type DomVisibleTextProjection,type DomSourceRun } from "./dom/visible-text.js";
export const supportsWorkerInspection=()=>typeof Worker!=="undefined"&&typeof URL!=="undefined";
