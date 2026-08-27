export type ClientErrorKind="unavailable"|"incompatible_version"|"consent_required"|"bad_request"|"auth"|"model_missing"|"cancelled"|"timeout"|"rate_limited"|"internal_error";
export class ContentIntegrityClientError extends Error{
  constructor(public readonly kind:ClientErrorKind,public readonly code:string,message:string,public readonly status?:number){super(message);this.name="ContentIntegrityClientError";}
}
export const errorKind=(code:string,status?:number):ClientErrorKind=>code==="contract_incompatible"||code==="unsupported_schema"?"incompatible_version":code==="consent_required"||code==="route_not_allowed"?"consent_required":code==="permission_denied"||status===401||status===403?"auth":code==="model_unavailable"||code==="method_not_configured"?"model_missing":code==="job_cancelled"?"cancelled":code==="rate_limited"||status===429?"rate_limited":code==="engine_unreachable"?"unavailable":code==="invalid_request"||status===400||status===422?"bad_request":"internal_error";
