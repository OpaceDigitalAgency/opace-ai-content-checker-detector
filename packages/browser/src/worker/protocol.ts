import type { AnalysisRequest, AnalysisResult } from "@opacedev/ai-content-checker-contracts";
export const WORKER_PROTOCOL_VERSION="1.0" as const;
export type InspectionPhase="validating"|"mapping_text"|"unicode_checks"|"protected_spans"|"writing_patterns"|"complete";
export type WorkerRequest={protocol_version:"1.0";type:"inspect";id:string;request:AnalysisRequest}|{protocol_version:"1.0";type:"cancel";id:string};
export type WorkerResponse={protocol_version:"1.0";type:"progress";id:string;phase:InspectionPhase}|{protocol_version:"1.0";type:"result";id:string;result:AnalysisResult}|{protocol_version:"1.0";type:"error";id:string;code:string;message:string};
