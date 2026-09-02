export const SCHEMA_VERSION = "1.0" as const;
export const CONTRACT_VERSION = "1.0.0" as const;
export const WORDPRESS_REST_NAMESPACE = "oaci/v1" as const;
export const WORDPRESS_ADMIN_PAGE = "admin.php?page=oaci-lab" as const;
export const LOCAL_ENGINE_ORIGIN = "http://127.0.0.1:8741" as const;
export const PUBLIC_API_IDENTITY = "Opace\\ContentIntegrity\\Integration\\PublicApi::instance()" as const;
export const READY_HOOK = "oaci_ready" as const;
export const PHP_PUBLIC_API_METHODS = ["version", "is_compatible", "capabilities", "register_source_adapter", "create_session", "get_session", "approve", "get_approved_output", "mark_applied", "get_receipt", "asset_handles"] as const;
export const JS_MOUNT_CONTRACT = {
  global: "OpaceContentIntegrity",
  apiVersion: "1.0",
  requiredOptions: ["surface", "sourceRef", "sourceHash", "getContent", "onApproved", "onClose"],
  returns: ["destroy", "refresh", "getState"],
  events: ["oaci:statechange", "oaci:approved", "oaci:error"]
} as const;

export const METHOD_STATUSES = ["pass", "attention", "fail", "inconclusive", "unsupported", "not_configured", "not_run", "error"] as const;
export type MethodStatus = (typeof METHOD_STATUSES)[number];

export const PRIVACY_ROUTES = ["browser", "wordpress_local", "local_service", "hub_provider", "commercial_byok"] as const;
export type PrivacyRoute = (typeof PRIVACY_ROUTES)[number];

export type { HttpsSchemasOpaceAgencyContentIntegrityV1EnvelopeSchemaJson as ContractEnvelope } from "./generated/envelope.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1MethodResultSchemaJson as MethodResult } from "./generated/method-result.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1AnalysisRequestSchemaJson as AnalysisRequest } from "./generated/analysis-request.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1AnalysisResultSchemaJson as AnalysisResult } from "./generated/analysis-result.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1ProtectedSpanSchemaJson as ProtectedSpan } from "./generated/protected-span.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1PatternFindingSchemaJson as PatternFinding } from "./generated/pattern-finding.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1GateResultSchemaJson as GateResult } from "./generated/gate-result.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1CandidateSchemaJson as Candidate } from "./generated/candidate.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1RewriteRequestSchemaJson as RewriteRequest } from "./generated/rewrite-request.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1JobSchemaJson as Job } from "./generated/job.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1CapabilitiesSchemaJson as Capabilities } from "./generated/capabilities.schema.js";
export type { HttpsSchemasOpaceAgencyContentIntegrityV1IntegrityReceiptSchemaJson as IntegrityReceipt } from "./generated/integrity-receipt.schema.js";
export type { OpaceAIContentIntegrityCheckerResult as CheckerResult } from "./generated/checker-result.schema.js";

export interface AnthropicUnsupportedMethodResultV1 {
  id: "watermark.anthropic";
  category: "watermark";
  provider_or_method: string;
  version: "unavailable-2026-08-26";
  status: "unsupported";
  availability: "not_available";
  native_outcome?: "not_available";
  score: null;
  threshold: null;
  segments: Record<string, unknown>[];
  evidence: Record<string, unknown>[];
  limitations: [string, ...string[]];
  started_at: string;
  completed_at: string;
  privacy_route: PrivacyRoute;
  [key: string]: unknown;
}

export interface JsMountOptionsV1 {
  surface: string;
  sourceRef: string;
  sourceHash: string;
  getContent(): string | Promise<string>;
  onApproved(payload: unknown): void;
  onClose(): void;
}
