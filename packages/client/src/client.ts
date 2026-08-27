import type {AnalysisRequest,AnalysisResult,Capabilities,IntegrityReceipt,Job,RewriteRequest} from "@opace/content-integrity-contracts";
import {requestJson,type TransportOptions} from "./transport.js";import {DEFAULT_LOCAL_ORIGIN,safePathSegment,validateLocalOrigin} from "./url-policy.js";import {pollJob} from "./polling.js";
import {requestSse} from "./sse.js";
import {validateAcknowledgement,validateAnalysisRequest,validateAnalysisResult,validateCapabilities,validateHealth,validateJob,validateReceiptRequest,validateReceiptResult,validateRewriteRequest} from "./validation.js";
export interface ClientOptions{baseUrl?:string;token?:()=>string|Promise<string>;timeoutMs?:number;maxResponseBytes?:number;fetchImpl?:typeof fetch}
export class LocalClient{
  protected readonly transport:TransportOptions;constructor(options:ClientOptions={}){this.transport=clientTransport(options);}
  async health(signal?:AbortSignal){return(requestJson<{status:"ok"}>({...this.transport,token:undefined},"/health",{},signal)).then(x=>validateHealth(x.data));}
  async capabilities(signal?:AbortSignal){return(requestJson<Capabilities>(this.transport,"/v1/capabilities",{},signal)).then(x=>validateCapabilities(x.data));}
  async analyse(request:AnalysisRequest,signal?:AbortSignal):Promise<AnalysisResult|Job>{validateAnalysisRequest(request);const body=requestBody(request);return(requestJson<AnalysisResult|Job>(this.transport,"/v1/analyses",{method:"POST",body},signal)).then(x=>"analysis_id" in (x.data as any)?validateAnalysisResult(x.data):validateJob(x.data));}
  async startRewrite(request:RewriteRequest,idempotencyKey:string,signal?:AbortSignal):Promise<Job>{validateRewriteRequest(request);const body=requestBody(request);if(!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey))throw new Error("invalid_idempotency_key");return(requestJson<Job>(this.transport,"/v1/rewrite-jobs",{method:"POST",headers:{"idempotency-key":idempotencyKey},body},signal)).then(x=>validateJob(x.data));}
  async getJob(id:string,signal?:AbortSignal){return(requestJson<Job>(this.transport,`/v1/jobs/${safePathSegment(id)}`,{},signal)).then(x=>validateJob(x.data));}
  waitForJob(id:string,options:{signal?:AbortSignal;hidden?:()=>boolean;sleep?:(ms:number)=>Promise<void>}={}){return pollJob(()=>this.getJob(id,options.signal),options);}
  async jobEvents(id:string,signal?:AbortSignal):Promise<Response>{return requestSse(this.transport,`/v1/jobs/${safePathSegment(id)}/events`,signal);}
  async cancel(id:string,signal?:AbortSignal){return(requestJson(this.transport,`/v1/jobs/${safePathSegment(id)}`,{method:"DELETE"},signal)).then(x=>validateAcknowledgement(x.data));}
  async deletePayload(id:string,signal?:AbortSignal){return(requestJson(this.transport,`/v1/jobs/${safePathSegment(id)}/payload`,{method:"DELETE"},signal)).then(x=>validateAcknowledgement(x.data));}
  async validateReceipt(receipt:IntegrityReceipt,signal?:AbortSignal){validateReceiptRequest(receipt);const body=requestBody(receipt);return(requestJson(this.transport,"/v1/receipts/validate",{method:"POST",body},signal)).then(x=>validateReceiptResult(x.data));}
}
function requestBody(value:unknown){const body=JSON.stringify(value);if(new TextEncoder().encode(body).byteLength>250000)throw new Error("request_too_large");return body;}
export function clientTransport(options:ClientOptions={}):TransportOptions{const timeoutMs=options.timeoutMs??10000,maxResponseBytes=options.maxResponseBytes??1_000_000;if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>300_000)throw new Error("invalid_timeout");if(!Number.isInteger(maxResponseBytes)||maxResponseBytes<1||maxResponseBytes>16_000_000)throw new Error("invalid_max_response");return{origin:validateLocalOrigin(options.baseUrl??DEFAULT_LOCAL_ORIGIN),token:options.token,fetchImpl:options.fetchImpl,timeoutMs,maxResponseBytes};}
export const createLocalClient=(options:ClientOptions={})=>new LocalClient(options);
