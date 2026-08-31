#!/bin/zsh
# Wait for the fp32 probe to finish, then re-shard the browser work that is
# still outstanding and run it. Serialised on purpose: running both at once
# oversubscribed the machine and cost ~30x throughput.
set -e
D=/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/services/local-engine/research/humaniser-detection-2026-08-31
cd $D
until [ -f probe-fp32.jsonl ] && [ $(wc -l < probe-fp32.jsonl) -ge 5558 ]; do sleep 30; done
echo "fp32 probe complete, re-sharding browser work"
/Users/davidbryan/Dropbox/Opace-Sales-Marketing/other-plugins/ai-watermark-and-content-authenticity/implementation/.venv-research/bin/python - <<'PY'
import json,glob,os
done=set()
for f in ['pairs-browser-out.jsonl']+glob.glob('shard*-out.jsonl'):
    if os.path.exists(f):
        for l in open(f):
            if l.strip(): done.add(json.loads(l)['id'])
rows=[json.loads(l) for l in open('pairs-browser-in.jsonl') if l.strip()]
todo=[r for r in rows if r['id'] not in done]
N=6
for i in range(N):
    with open(f'r{i}-in.jsonl','w') as o:
        for r in todo[i::N]: o.write(json.dumps(r)+'\n')
print('resume: remaining',len(todo))
PY
cd /Users/davidbryan/Dropbox/Opace-Sales-Marketing/opace-website/astro-latest
for i in 0 1 2 3 4 5; do
  npx tsx src/lib/local-signals/verify/humaniser-pairs-browser.mts $D/r$i-in.jsonl $D/r$i-out.jsonl > $D/r$i.log 2>&1 &
done
wait
echo "BROWSER RESUME COMPLETE"
