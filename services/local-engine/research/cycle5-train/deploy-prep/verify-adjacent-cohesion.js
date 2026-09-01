const fs = require('fs');
// Verbatim copy of COHESION_STOPWORDS / COHESION_WORD_RE / COHESION_SENT_SPLIT / adjacentCohesion
// from opace-website/astro-latest/src/lib/content-integrity/document-tells.ts lines 393-453
const COHESION_STOPWORDS = new Set(`a about above after again against all am an and any are aren't as at be because been
before being below between both but by can cannot could couldn't did didn't do does doesn't doing don't
down during each few for from further had hadn't has hasn't have haven't having he her here hers herself
him himself his how i if in into is isn't it its itself let's me more most mustn't my myself no nor not
of off on once only or other ought our ours ourselves out over own same shan't she should shouldn't so
some such than that the their theirs them themselves then there these they this those through to too
under until up very was wasn't we were weren't what when where which while who whom why with won't would
wouldn't you your yours yourself yourselves`.split(/\s+/));

const COHESION_WORD_RE = /[A-Za-zÀ-ɏ']+/g;
const COHESION_SENT_SPLIT = /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\betc)(?<!\be\.g)(?<!\bi\.e)(?<!\bFig)(?<!\bNo)(?<=[.!?])["'”’)\]]*\s+(?=["'“‘(\[]*[A-Z0-9])/;

const COHESION_MIN_PAIRS = 15; // disabled for fixture generation to see raw values

const adjacentCohesion = (draft) => {
  const sentenceSets = draft.split(COHESION_SENT_SPLIT).map(sentence => {
    const words = sentence.match(COHESION_WORD_RE) ?? [];
    return new Set(words.map(word => word.toLowerCase()).filter(word => !COHESION_STOPWORDS.has(word)));
  });
  let total = 0, pairs = 0;
  for (let i = 0; i < sentenceSets.length - 1; i++) {
    const a = sentenceSets[i], b = sentenceSets[i + 1];
    if (!a.size || !b.size) continue;
    let shared = 0;
    for (const word of a) if (b.has(word)) shared += 1;
    total += shared / (a.size + b.size - shared);
    pairs += 1;
  }
  return {value: pairs ? total/pairs : 0, pairs, sentenceCount: sentenceSets.length, sentences: draft.split(COHESION_SENT_SPLIT)};
};

const file = process.argv[2];
const text = fs.readFileSync(file, 'utf8');
const r = adjacentCohesion(text);
console.log("TS sentence count:", r.sentenceCount);
r.sentences.forEach(s => console.log(" -", JSON.stringify(s)));
console.log("TS dis_adjacent_sent_cohesion:", r.value, "pairs:", r.pairs);
