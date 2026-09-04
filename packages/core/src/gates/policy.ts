import type { GateResult, ProtectedSpan } from "@opacedev/ai-content-checker-contracts";
import { validateAdditions, validateProtected } from "../protected/validate.js";
import { prefixedSha256 } from "../source/utf8.js";

export interface GatePolicy {mode?:"strict"|"manual_review";expected_source_hash?:string;language?:string;max_length_ratio?:number;allow_html?:boolean}
export function validateCandidate(source:{content:string;content_hash?:string;content_type?:string;language?:string},candidate:string,spans:ProtectedSpan[],policy:GatePolicy={}):GateResult[]{
  const gates=[validateProtected(source.content,candidate,spans),validateAdditions(source.content,candidate)];
  const current=prefixedSha256(source.content),expected=policy.expected_source_hash??source.content_hash??current;gates.push({id:"source_version",version:"1.0.0",status:current===expected?"pass":"fail",hard:true,summary:current===expected?"Source hash matches":"Source changed since protection",failures:current===expected?[]:[{expected_hash:expected,observed:current}],limitations:[]});
  const executable=/<\s*(?:script|iframe|object|embed|form)\b|\son\w+\s*=|javascript:/i.test(candidate);gates.push({id:"html_safety",version:"1.0.0",status:executable?"fail":"pass",hard:true,summary:executable?"Executable or unsafe HTML found":"No executable HTML found",failures:executable?[{observed:"executable_markup"}]:[],limitations:["This deterministic gate is not a complete HTML sanitiser."]});
  const max=policy.max_length_ratio??2;const ratio=source.content.length?candidate.length/source.content.length:1;gates.push({id:"language_length",version:"1.0.0",status:ratio>max?"fail":"pass",hard:true,summary:ratio>max?"Candidate exceeds the configured length bound":"Candidate is within the configured length bound",failures:ratio>max?[{observed_ratio:ratio,max_ratio:max}]:[],limitations:["CORE-10 does not infer language; it preserves the requested language as a host-reviewed constraint."]});
  const leakage=/\b(?:protected_span_id|system prompt|<\|(?:system|assistant|user)\|>)\b/i.test(candidate);gates.push({id:"output_safety",version:"1.0.0",status:leakage?"fail":"pass",hard:true,summary:leakage?"Prompt or protected-ID leakage found":"No prompt/control-token leakage found",failures:leakage?[{observed:"control_or_prompt_marker"}]:[],limitations:[]});
  gates.push({id:"semantic_entailment",version:"unconfigured/1",status:"not_configured",hard:true,summary:"Semantic entailment is not configured in the deterministic core",failures:[],limitations:["Strict policy must treat this required semantic gate as blocking when generation depends on semantic fidelity."]});
  return gates;
}
