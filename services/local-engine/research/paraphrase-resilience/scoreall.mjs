import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
// Resolved from this file so the run reproduces from any checkout, not just the machine it was made on.
const LAB = HERE + '../../../../packages/watermark-lab';
const lab = await import(LAB + '/dist/bundle.js');
const corpus = JSON.parse(readFileSync('corpus.json','utf8'));
const byId = Object.fromEntries(corpus.map(c=>[c.id,c]));

const files = process.argv.slice(2).filter(f=>existsSync(f));
const variants = files.flatMap(f=>JSON.parse(readFileSync(f,'utf8')));

// baselines
const rows = [];
for (const c of corpus) {
  const t0 = process.hrtime.bigint();
  const s = lab.score(lab.tokenise(c.text), lab.DEMO_KEYS[c.key_id]);
  const ms = Number(process.hrtime.bigint()-t0)/1e6;
  rows.push({ id:c.id, key_id:c.key_id, variant:'baseline', tokens:lab.tokenise(c.text).length,
    meanG:s.meanG, weightedMeanG:s.weightedMeanG, scored:s.scoredPositions, z:s.z, p:s.pValue, ms:+ms.toFixed(2) });
}
for (const v of variants) {
  const c = byId[v.id];
  const toks = lab.tokenise(v.text);
  const t0 = process.hrtime.bigint();
  const s = lab.score(toks, lab.DEMO_KEYS[c.key_id]);
  const ms = Number(process.hrtime.bigint()-t0)/1e6;
  rows.push({ id:v.id, key_id:c.key_id, variant:v.variant, tokens:toks.length,
    meanG:s.meanG, weightedMeanG:s.weightedMeanG, scored:s.scoredPositions, z:s.z, p:s.pValue, ms:+ms.toFixed(2) });
}
writeFileSync('scores.json', JSON.stringify(rows,null,1));
const w=(x,n)=>String(x).padEnd(n);
console.log(w('id',22)+w('variant',20)+w('tok',6)+w('scored',8)+w('meanG',9)+w('p',12));
for (const r of rows) console.log(w(r.id,22)+w(r.variant,20)+w(r.tokens,6)+w(r.scored,8)+w(r.meanG.toFixed(4),9)+w(r.p.toExponential(2),12));
