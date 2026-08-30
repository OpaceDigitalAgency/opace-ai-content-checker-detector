import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const scores = JSON.parse(readFileSync('scores.json','utf8'));
const fid = existsSync('fidelity.json') ? JSON.parse(readFileSync('fidelity.json','utf8')) : [];
const fmap = Object.fromEntries(fid.map(f=>[f.id+'|'+f.variant,f]));
const base = Object.fromEntries(scores.filter(s=>s.variant==='baseline').map(s=>[s.id,s]));

// The lab's own shipped decision rule.
const VERDICT_MIN_POSITIONS = 40;
const P_THRESHOLD = 1e-3;
const detected = r => r.scored >= VERDICT_MIN_POSITIONS && r.p < P_THRESHOLD;

const rows = scores.filter(s=>s.variant!=='baseline').map(r=>{
  const b = base[r.id];
  const f = fmap[r.id+'|'+r.variant] || {};
  return { ...r,
    base_meanG:b.meanG, base_scored:b.scored, base_tokens:b.tokens,
    d_meanG:+(r.meanG-b.meanG).toFixed(4),
    len_ratio:+(r.tokens/b.tokens).toFixed(3),
    in_gate: r.tokens/b.tokens >= 0.90 && r.tokens/b.tokens <= 1.10,
    e5_cosine:f.e5_cosine, jaccard:f.content_word_jaccard, ngram4:f.ngram4_retained,
    detected: detected(r), base_detected: detected(b),
  };
});
writeFileSync('analysis.json', JSON.stringify(rows,null,1));

const med = a => { const s=[...a].sort((x,y)=>x-y); const m=s.length>>1;
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2; };
const arms = [...new Set(rows.map(r=>r.variant))];
const groupOf = v => v.startsWith('qwen3-4b') ? 'qwen3-4b-instruct-2507'
                : v.startsWith('t5') ? 't5-paraphraser' : 'deterministic:'+v;
const groups = {};
for (const r of rows) (groups[groupOf(r.variant)] ??= []).push(r);

const summarise = (name, rs, gated=false) => {
  const g = rs.map(r=>r.meanG), c = rs.map(r=>r.e5_cosine).filter(x=>x!=null);
  return { arm:name, gate: gated?'90-110% token gate applied':'ungated', n:rs.length,
    passages:[...new Set(rs.map(r=>r.id))].length,
    meanG_mean:+(g.reduce((a,b)=>a+b,0)/g.length).toFixed(4),
    meanG_median:+med(g).toFixed(4), meanG_min:+Math.min(...g).toFixed(4), meanG_max:+Math.max(...g).toFixed(4),
    scored_median: med(rs.map(r=>r.scored)),
    scored_min: Math.min(...rs.map(r=>r.scored)),
    len_ratio_median:+med(rs.map(r=>r.len_ratio)).toFixed(3),
    detected: rs.filter(r=>r.detected).length,
    detection_rate: +(rs.filter(r=>r.detected).length/rs.length*100).toFixed(1),
    e5_cosine_median: c.length?+med(c).toFixed(4):null,
    e5_cosine_min: c.length?+Math.min(...c).toFixed(4):null,
    ngram4_median:+med(rs.map(r=>r.ngram4).filter(x=>x!=null)).toFixed(3),
  };
};
const summary = [];
for (const [name, rs] of Object.entries(groups)) {
  summary.push(summarise(name, rs));
  const gated = rs.filter(r=>r.in_gate);
  if (gated.length && gated.length !== rs.length) summary.push(summarise(name, gated, true));
}
writeFileSync('summary.json', JSON.stringify(summary,null,1));
console.table(summary);
