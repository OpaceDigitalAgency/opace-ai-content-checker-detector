import { rangeFromUtf16 } from "../source/offsets.js";
import { prefixedSha256 } from "../source/utf8.js";
import { CARRIER_RULES, CONFUSABLES, UNICODE_RULES_VERSION, type CarrierContext, type CarrierFix, type CarrierSeverity } from "./data.js";

export { UNICODE_RULES_VERSION };
export interface UnicodeFinding { id:string; code_point:string; name:string; severity:"note"|"low"|"medium"|"high"; message:string; suggestion:string; span:ReturnType<typeof rangeFromUtf16>; matched_text_hash:string; fix:"remove"|"space"|"review"; limitations:string[] }

interface ResolvedRule { name:string; severity:CarrierSeverity; fix:CarrierFix; message:string; context?:CarrierContext; limitation?:string }
const TABLE=new Map<number,ResolvedRule>();
for(const rule of CARRIER_RULES){for(let cp=rule.from;cp<=(rule.to??rule.from);cp++){TABLE.set(cp,{name:typeof rule.name==="function"?rule.name(cp):rule.name,severity:rule.severity,fix:rule.fix,message:rule.message,context:rule.context,limitation:rule.limitation});}}

const BASE_LIMIT="Unicode controls can be legitimate in multilingual text; this finding is not evidence of authorship.";
// Emoji-capable neighbours for ZWJ sequences and variation selectors: pictographs, skin-tone modifiers, VS16, keycap bases.
const EMOJI_SIDE=/[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\uFE0F0-9#*]/u;
// Scripts whose orthography legitimately uses ZWJ/ZWNJ between letters (cursive joining and Indic conjunct control).
const JOINING_SCRIPT=/[\p{sc=Arabic}\p{sc=Syriac}\p{sc=Nko}\p{sc=Mongolian}\p{sc=Devanagari}\p{sc=Bengali}\p{sc=Gurmukhi}\p{sc=Gujarati}\p{sc=Oriya}\p{sc=Tamil}\p{sc=Telugu}\p{sc=Kannada}\p{sc=Malayalam}\p{sc=Sinhala}\p{sc=Myanmar}\p{sc=Khmer}\p{sc=Tibetan}]/u;
const CJK_BASE=/[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\p{sc=Mongolian}]/u;

function contextualise(rule:ResolvedRule,cp:number,prev:string,next:string):ResolvedRule|undefined{
  if(rule.context==="joiner"){
    if((cp===0x200d)&&prev&&next&&EMOJI_SIDE.test(prev)&&EMOJI_SIDE.test(next))return undefined; // legitimate emoji ZWJ sequence
    if(prev&&next&&JOINING_SCRIPT.test(prev)&&JOINING_SCRIPT.test(next))return undefined; // legitimate cursive/Indic joining control
    return rule;
  }
  if(rule.context==="variation"){
    if(prev&&EMOJI_SIDE.test(prev))return undefined; // presentation selector on an emoji-capable base
    if(prev&&CJK_BASE.test(prev))return {...rule,severity:"note",fix:"review",message:`${rule.message} It follows a base character that commonly takes glyph variants.`};
    return rule;
  }
  if(rule.context==="variation_sup"){
    if(prev&&CJK_BASE.test(prev))return {...rule,severity:"note",message:`${rule.message} It follows a CJK ideograph and may select a registered glyph variant.`};
    return rule;
  }
  return rule;
}

export function inspectUnicode(text:string):UnicodeFinding[]{
  const findings:UnicodeFinding[]=[];
  let prev="";
  for(let i=0;i<text.length;){const cp=text.codePointAt(i)!;const width=cp>0xffff?2:1;const raw=text.slice(i,i+width);
    const base=TABLE.get(cp);
    if(base){const next=i+width<text.length?String.fromCodePoint(text.codePointAt(i+width)!):"";const rule=contextualise(base,cp,prev,next);
      if(rule){findings.push({id:`unicode_${i}_${cp.toString(16)}`,code_point:`U+${cp.toString(16).toUpperCase().padStart(4,"0")}`,name:rule.name,severity:rule.severity,message:rule.message,suggestion:rule.fix==="review"?"Review the surrounding script and direction before editing.":"Preview the deterministic change before approval.",span:rangeFromUtf16(text,i,i+width),matched_text_hash:prefixedSha256(raw),fix:rule.fix,limitations:rule.limitation?[BASE_LIMIT,rule.limitation]:[BASE_LIMIT]});}}
    if(cp>=0xd800&&cp<=0xdfff){findings.push({id:`unicode_${i}_surrogate`,code_point:`U+${cp.toString(16).toUpperCase()}`,name:"UNPAIRED SURROGATE",severity:"high",message:"An unpaired UTF-16 surrogate cannot be encoded as valid UTF-8.",suggestion:"Replace or remove it after checking the source encoding.",span:{start_utf16:i,end_utf16:i+1,start_codepoint:Array.from(text.slice(0,i)).length,end_codepoint:Array.from(text.slice(0,i)).length+1},matched_text_hash:prefixedSha256("�"),fix:"review",limitations:["The displayed replacement may differ from the original invalid code unit."]});}
    prev=raw;i+=width;
  }
  const tokens=[...text.matchAll(/[\p{L}\p{N}_-]+/gu)];
  for(const token of tokens){const value=token[0];if(!/\p{Script=Latin}/u.test(value)||!/\p{Script=Cyrillic}|\p{Script=Greek}/u.test(value))continue;let local=0;for(const char of value){const cp=char.codePointAt(0)!,entry=CONFUSABLES.get(cp);if(entry){const start=token.index!+local;findings.push({id:`unicode_${start}_homoglyph_${cp.toString(16)}`,code_point:`U+${cp.toString(16).toUpperCase().padStart(4,"0")}`,name:entry.name,severity:"medium",message:`A mixed-script token contains a character visually confusable with Latin '${entry.latin}'.`,suggestion:"Verify the intended spelling; homoglyphs are never replaced automatically.",span:rangeFromUtf16(text,start,start+char.length),matched_text_hash:prefixedSha256(char),fix:"review",limitations:["Mixed scripts can be legitimate in names and multilingual text; this is contextual evidence only."]});}local+=char.length;}}
  return findings;
}
