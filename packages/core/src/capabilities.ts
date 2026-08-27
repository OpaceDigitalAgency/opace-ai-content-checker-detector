export interface MethodDescriptor {id:string;category:"unicode"|"pattern"|"watermark";version:string;state:"available"|"unsupported";privacy_routes:readonly ["browser"];limitations:readonly string[]}
const METHODS:readonly MethodDescriptor[]=Object.freeze([
  Object.freeze({id:"unicode.invisible",category:"unicode",version:"unicode:2026.08.1",state:"available",privacy_routes:["browser"] as const,limitations:["Controls can be legitimate in multilingual text."]}),
  Object.freeze({id:"unicode.homoglyph",category:"unicode",version:"unicode:2026.08.1",state:"available",privacy_routes:["browser"] as const,limitations:["Mixed scripts require contextual human review."]}),
  Object.freeze({id:"style.patterns",category:"pattern",version:"en-gb:2026.08.1",state:"available",privacy_routes:["browser"] as const,limitations:["Editorial pattern findings are not authorship evidence."]}),
  Object.freeze({id:"watermark.anthropic",category:"watermark",version:"adapter-placeholder/1",state:"unsupported",privacy_routes:["browser"] as const,limitations:["No official detector interface is available."]})
]);
export const listMethods=()=>METHODS.map(method=>Object.freeze({...method,privacy_routes:Object.freeze([...method.privacy_routes]),limitations:Object.freeze([...method.limitations])}));
