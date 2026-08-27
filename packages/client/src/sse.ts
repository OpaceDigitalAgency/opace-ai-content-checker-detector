import {ContentIntegrityClientError,errorKind} from "./errors.js";
import {readBounded,type TransportOptions} from "./transport.js";
import {validateErrorEnvelope} from "./validation.js";

export async function requestSse(options:TransportOptions,path:string,signal?:AbortSignal):Promise<Response>{
  if(!options.token)throw new ContentIntegrityClientError("auth","permission_denied","A bearer token is required.");
  const token=await options.token();if(!token)throw new ContentIntegrityClientError("auth","permission_denied","A bearer token is required.");
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort("timeout"),options.timeoutMs),abort=()=>controller.abort(signal?.reason);
  signal?.addEventListener("abort",abort,{once:true});
  const finish=()=>{clearTimeout(timer);signal?.removeEventListener("abort",abort);};
  try{
    const response=await(options.fetchImpl??fetch)(new URL(path,options.origin),{headers:{accept:"text/event-stream",authorization:`Bearer ${token}`},signal:controller.signal,redirect:"error"});
    const contentType=response.headers.get("content-type")?.split(";",1)[0]?.trim().toLowerCase();
    if(!response.ok){
      if(contentType!=="application/json"){await response.body?.cancel();throw new ContentIntegrityClientError("internal_error","malformed_response","The local service returned an invalid error response.",response.status);}
      const raw=await readBounded(response,options.maxResponseBytes);let data:any;
      try{data=raw.byteLength?JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(raw)):{};}catch{throw new ContentIntegrityClientError("internal_error","malformed_response","The local service returned an invalid error response.",response.status);}
      validateErrorEnvelope(data);const code=data.error.code;throw new ContentIntegrityClientError(errorKind(code,response.status),code,"The local service event stream failed.",response.status);
    }
    if(contentType!=="text/event-stream"||!response.body){finish();throw new ContentIntegrityClientError("internal_error","malformed_response","The local service returned an invalid event stream.",response.status);}
    let total=0;const reader=response.body.getReader();const body=new ReadableStream<Uint8Array>({async pull(target){try{const value=await reader.read();if(value.done){finish();target.close();return;}total+=value.value.byteLength;if(total>options.maxResponseBytes){await reader.cancel();finish();target.error(new ContentIntegrityClientError("bad_request","response_too_large","The local service response exceeded the configured limit.",response.status));return;}target.enqueue(value.value);}catch(error){finish();target.error(error);}},async cancel(reason){finish();await reader.cancel(reason);}});
    return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }catch(error){finish();if(error instanceof ContentIntegrityClientError)throw error;if(controller.signal.aborted){if(signal?.aborted)throw new ContentIntegrityClientError("cancelled","job_cancelled","The local request was cancelled.");throw new ContentIntegrityClientError("timeout","engine_unreachable","The local service did not respond before the timeout.");}throw new ContentIntegrityClientError("unavailable","engine_unreachable","The local service could not be reached.");}
}

export async function* parseSse(response:Response,maxEventBytes=65536):AsyncGenerator<Record<string,unknown>>{
  if(!response.ok||!response.body)throw new Error("sse_unavailable");if(!Number.isSafeInteger(maxEventBytes)||maxEventBytes<1)throw new Error("sse_invalid_limit");
  const reader=response.body.getReader(),decoder=new TextDecoder("utf-8",{fatal:true}),encoder=new TextEncoder();let buffer="",pendingBytes=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;pendingBytes+=value.byteLength;buffer+=decoder.decode(value,{stream:true});
      for(;;){const match=/\r?\n\r?\n/.exec(buffer);if(!match)break;const block=buffer.slice(0,match.index),consumed=buffer.slice(0,match.index+match[0].length),eventBytes=encoder.encode(block).byteLength;if(eventBytes>maxEventBytes)throw new Error("sse_event_too_large");buffer=buffer.slice(consumed.length);pendingBytes-=encoder.encode(consumed).byteLength;const data=block.split(/\r?\n/).filter(line=>line.startsWith("data:")).map(line=>line.slice(5).replace(/^ /,"")).join("\n");if(data)yield JSON.parse(data);}
      if(pendingBytes>maxEventBytes)throw new Error("sse_event_too_large");
    }
    buffer+=decoder.decode();if(buffer.trim())throw new Error("sse_incomplete_event");
  }catch(error){await reader.cancel(error);throw error;}finally{reader.releaseLock();}
}
