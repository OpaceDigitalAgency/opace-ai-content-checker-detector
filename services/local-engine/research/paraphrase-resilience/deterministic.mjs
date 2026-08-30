// Deterministic lexical-substitution + sentence-reordering transform.
// NOT a paraphraser. A fixed, seedless, rule-based edit used as the weak-attack floor.
import { readFileSync, writeFileSync } from 'node:fs';

// Fixed one-to-one substitution table, applied case-insensitively with case restored.
// Chosen for near-synonymy on general English; no model, no randomness.
const SUB = new Map(Object.entries({
  big:'large', small:'little', begin:'start', begins:'starts', started:'begun',
  make:'create', makes:'creates', made:'created', help:'assist', helps:'assists',
  use:'employ', uses:'employs', used:'employed', show:'display', shows:'displays',
  said:'stated', says:'states', say:'state', get:'obtain', gets:'obtains',
  many:'numerous', very:'highly', quickly:'rapidly', often:'frequently',
  about:'regarding', because:'since', however:'though', also:'additionally',
  people:'persons', thing:'item', things:'items', good:'fine', bad:'poor',
  new:'fresh', old:'former', first:'initial', last:'final', next:'subsequent',
  need:'require', needs:'requires', want:'wish', think:'believe', thinks:'believes',
  find:'locate', finds:'locates', give:'provide', gives:'provides', take:'accept',
  look:'appear', looks:'appears', work:'function', works:'functions',
  place:'location', part:'portion', way:'manner', time:'period', year:'annum',
  really:'genuinely', maybe:'perhaps', almost:'nearly', enough:'sufficient',
  keep:'retain', keeps:'retains', put:'place', let:'permit', ask:'enquire',
  tell:'inform', tells:'informs', call:'name', calls:'names', seem:'appear',
  come:'arrive', comes:'arrives', went:'travelled', know:'understand',
  knows:'understands', like:'similar', just:'merely', still:'yet', back:'rear',
  even:'indeed', much:'considerably', more:'further', most:'the majority of',
  every:'each', some:'certain', other:'alternative', same:'identical',
  right:'correct', long:'lengthy', great:'excellent', little:'small',
}));

function restoreCase(orig, repl) {
  if (orig[0] === orig[0].toUpperCase() && orig[0] !== orig[0].toLowerCase()) {
    return repl[0].toUpperCase() + repl.slice(1);
  }
  return repl;
}

export function substitute(text) {
  return text.replace(/[A-Za-z]+/g, (w) => {
    const r = SUB.get(w.toLowerCase());
    return r ? restoreCase(w, r) : w;
  });
}

export function reorderSentences(text) {
  // Split on sentence-final punctuation, keeping the delimiter with its sentence.
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  if (parts.length < 2) return text;
  // Fixed permutation: reverse order. Deterministic, no seed.
  return parts.slice().reverse().join('').replace(/\s+$/,'');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const corpus = JSON.parse(readFileSync('corpus.json','utf8'));
  const rows = [];
  for (const c of corpus) {
    rows.push({ id:c.id, variant:'det-subst',        text: substitute(c.text) });
    rows.push({ id:c.id, variant:'det-reorder',      text: reorderSentences(c.text) });
    rows.push({ id:c.id, variant:'det-subst-reorder',text: reorderSentences(substitute(c.text)) });
  }
  writeFileSync('variants-deterministic.json', JSON.stringify(rows,null,1));
  console.log('wrote', rows.length, 'deterministic variants');
}
