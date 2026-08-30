import { readFileSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
// Resolved from this file so the run reproduces from any checkout, not just the machine it was made on.
const LAB = HERE + '../../../../packages/watermark-lab';
const lab = await import(LAB + '/dist/bundle.js');
const fx = JSON.parse(readFileSync(LAB+'/fixtures/synthid-demo-v1.json','utf8'));
const ref = JSON.parse(readFileSync(LAB+'/fixtures/reference-scores.json','utf8'));
const f = fx.fixtures.find(x=>x.id==='wm-alpha-400-03');
const key = lab.DEMO_KEYS['opace-demo-alpha'];
// A: score the stored token ids directly
const a = lab.score(f.token_ids, key);
console.log('A token_ids  meanG', a.meanG, 'scored', a.scoredPositions, 'p', a.pValue);
console.log('  reference  meanG', ref['wm-alpha-400-03']['opace-demo-alpha'].meanG, 'scored', ref['wm-alpha-400-03']['opace-demo-alpha'].scored);
// B: re-tokenise the stored text (the path a paraphrase attack must use)
const t = lab.tokenise(f.text);
console.log('B retokenise n=', t.length, 'identical to stored?', JSON.stringify(t)===JSON.stringify(f.token_ids));
const b = lab.score(t, key);
console.log('B text->tok  meanG', b.meanG, 'scored', b.scoredPositions, 'p', b.pValue);
console.log('text chars', f.text.length);
// C: all fixtures parity check
let worst=0, n=0;
for (const fixt of fx.fixtures) {
  const r = ref[fixt.id]; if(!r) continue;
  for (const kid of Object.keys(r)) {
    const s = lab.score(fixt.token_ids, lab.DEMO_KEYS[kid]);
    worst = Math.max(worst, Math.abs(s.meanG - r[kid].meanG));
    if (s.scoredPositions !== r[kid].scored) console.log('POSITION MISMATCH', fixt.id, kid, s.scoredPositions, r[kid].scored);
    n++;
  }
}
console.log('C parity over', n, 'fixture x key scores, max |delta meanG| =', worst);
