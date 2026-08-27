import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats/dist/index.js";
import {ContentIntegrityClientError} from "./errors.js";
import common from "./schemas/common.schema.json" with {type:"json"};
import envelope from "./schemas/envelope.schema.json" with {type:"json"};
import methodResult from "./schemas/method-result.schema.json" with {type:"json"};
import protectedSpan from "./schemas/protected-span.schema.json" with {type:"json"};
import patternFinding from "./schemas/pattern-finding.schema.json" with {type:"json"};
import gateResult from "./schemas/gate-result.schema.json" with {type:"json"};
import candidate from "./schemas/candidate.schema.json" with {type:"json"};
import analysisRequest from "./schemas/analysis-request.schema.json" with {type:"json"};
import analysisResult from "./schemas/analysis-result.schema.json" with {type:"json"};
import rewriteRequest from "./schemas/rewrite-request.schema.json" with {type:"json"};
import job from "./schemas/job.schema.json" with {type:"json"};
import capabilities from "./schemas/capabilities.schema.json" with {type:"json"};
import receipt from "./schemas/integrity-receipt.schema.json" with {type:"json"};

const AjvConstructor:any=(Ajv2020 as any).default??Ajv2020;const formatPlugin:any=(addFormats as any).default??addFormats;const ajv=new AjvConstructor({strict:true,allErrors:true});formatPlugin(ajv);
for(const schema of [common,envelope,methodResult,protectedSpan,patternFinding,gateResult,candidate,analysisRequest,analysisResult,rewriteRequest,job,capabilities,receipt])ajv.addSchema(schema);
const validators={analysisRequest:ajv.getSchema(analysisRequest.$id)!,analysisResult:ajv.getSchema(analysisResult.$id)!,rewriteRequest:ajv.getSchema(rewriteRequest.$id)!,job:ajv.getSchema(job.$id)!,capabilities:ajv.getSchema(capabilities.$id)!,receipt:ajv.getSchema(receipt.$id)!};
function fail(message="The local service returned a contract-invalid response."):never{throw new ContentIntegrityClientError("internal_error","malformed_response",message);}
function check(name:keyof typeof validators,value:unknown,request=false):void{if(!validators[name](value)){const incompatible=validators[name].errors?.some((error:any)=>error.instancePath==="/schema_version"||error.instancePath==="/contract_version");if(request)throw new ContentIntegrityClientError(incompatible?"incompatible_version":"bad_request",incompatible?"contract_incompatible":"invalid_request",incompatible?"Only schema 1.0 and contract major 1 are supported.":"The request did not match the frozen contract.");fail(incompatible?"The local service returned an incompatible contract version.":undefined);}}
function semanticResult(value:any):void{for(const span of value.protected_spans){if(span.end_utf16<=span.start_utf16||span.end_codepoint<=span.start_codepoint||span.content_hash!==value.source.content_hash)fail();const utf16=[...span.text].reduce((total:number,character:string)=>total+(character.codePointAt(0)!>0xffff?2:1),0);if(span.end_utf16-span.start_utf16!==utf16||span.end_codepoint-span.start_codepoint!==[...span.text].length)fail();}for(const finding of value.pattern_findings)if(finding.span.end_utf16<=finding.span.start_utf16||finding.span.end_codepoint<=finding.span.start_codepoint)fail();}
export function validateAnalysisRequest(value:unknown):void{check("analysisRequest",value,true);}
export function validateRewriteRequest(value:unknown):void{check("rewriteRequest",value,true);}
export function validateAnalysisResult<T>(value:T):T{check("analysisResult",value);semanticResult(value);return value;}
export function validateJob<T>(value:T):T{check("job",value);return value;}
export function validateCapabilities<T>(value:T):T{check("capabilities",value);return value;}
export function validateReceiptRequest(value:unknown):void{check("receipt",value,true);}
export function validateHealth<T>(value:T):T{if(!value||typeof value!=="object"||(value as any).status!=="ok")fail();return value;}
export function validateAcknowledgement<T>(value:T):T{const item=value as any;if(!item||typeof item!=="object"||!["accepted","cancelled","deleted","installed"].includes(item.status)||typeof item.request_id!=="string")fail();return value;}
export function validateReceiptResult<T>(value:T):T{const item=value as any;if(!item||typeof item!=="object"||typeof item.valid!=="boolean"||item.schema_version!=="1.0"||!/^1\.\d+\.\d+$/.test(item.contract_version)||!Array.isArray(item.errors))fail();return value;}
export function validateModelPlan<T>(value:T):T{const item=value as any;if(!item||typeof item!=="object"||typeof item.model_id!=="string"||typeof item.licence!=="string"||!Number.isInteger(item.size_bytes)||item.size_bytes<0||!/^[a-f0-9]{64}$/.test(item.sha256)||typeof item.installed!=="boolean")fail();return value;}
const ERROR_CODES=new Set(["invalid_request","request_too_large","unsupported_schema","contract_incompatible","permission_denied","object_not_found","route_not_allowed","consent_required","method_unsupported","method_not_configured","engine_unreachable","engine_auth_failed","model_unavailable","provider_not_configured","provider_error","rate_limited","job_timeout","job_cancelled","candidate_invalid","fidelity_failed","receipt_save_failed","retention_delete_failed","internal_error"]);
export function validateErrorEnvelope(value:unknown):void{const item=value as any;if(!item||typeof item!=="object"||item.schema_version!=="1.0"||typeof item.request_id!=="string"||!item.error||!ERROR_CODES.has(item.error.code)||typeof item.error.message!=="string"||typeof item.error.retryable!=="boolean")fail();}
