import { readFileSync, writeFileSync } from 'node:fs';
const HERE = new URL('.', import.meta.url).pathname;
// Resolved from this file so the run reproduces from any checkout, not just the machine it was made on.
const LAB = HERE + '../../../../packages/watermark-lab';
const fx = JSON.parse(readFileSync(LAB+'/fixtures/synthid-demo-v1.json','utf8'));
const out = fx.fixtures.filter(f=>f.kind==='watermarked').map(f=>({
  id:f.id, key_id:f.key_id, n_tokens:f.token_ids.length, prompt:f.prompt, text:f.text
}));
writeFileSync('corpus.json', JSON.stringify(out,null,1));
console.log(out.map(o=>`${o.id} ${o.key_id} ${o.n_tokens}tok ${o.text.length}ch`).join('\n'));
