set -e
R="$1"; PY="$2"; cd "$R"
echo "[pipeline] waiting for train-report.json"
while [ ! -f "$R/train-report.json" ]; do
  if ! ps aux | grep -q "[t]rain.py"; then echo "[pipeline] FATAL: train.py exited with no report"; tail -5 train.log; exit 1; fi
  sleep 15
done
echo "[pipeline] training done -> export"
"$PY" export_onnx.py
echo "[pipeline] quantisation gate"
"$PY" quant_check.py
echo "[pipeline] quarantine probe"
"$PY" quarantine_probe.py
echo "[pipeline] eval"
"$PY" eval.py
echo "[pipeline] report"
"$PY" make_report.py
echo "[pipeline] COMPLETE"
