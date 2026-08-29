# longform-corpus

Long-form training data for the failing registers: academic prose, white papers,
research summaries, long-form journalism, creative long-form, student essays and
corporate narrative. Both sides. Short-form social is out of scope here by
instruction.

Read `MANIFEST.md` for sources and licences, `REPORT.md` for distributions and the
shipped-model baseline.

## Rebuild

```sh
# human side (each writes into raw/)
python3 fetch_epmc.py 55                      # Europe PMC open access
EPMC_DATE='FIRST_PDATE:[2018-01-01 TO 2018-12-31]' EPMC_OUT=epmc-2018.jsonl \
  python3 fetch_epmc.py 22                    # ...and 2019, 2020, 2021
python3 fetch_govuk.py 90                     # GOV.UK reports
python3 fetch_crs.py 450                      # CRS reports
python3 fetch_news.py 720                     # Global Voices
python3 fetch_mongabay.py 450                 # Mongabay
python3 fetch_corporate.py 45                 # SEC EDGAR 10-K Item 7
python3 fetch_essays.py 700 500               # PERSUADE 2.0
python3 fetch_fiction.py 280                  # Internet Archive CC texts

# AI side (needs OPENROUTER_API_KEY in the environment; hard budget cap)
python3 generate_lf.py --budget 12.55 --workers 10

# assemble, score, report
python3 build_corpus.py
$PY score_tier3.py        # $PY = a venv with onnxruntime + transformers
$PY report.py
python3 manifest_md.py
```

`build_corpus.py` aborts if any document collides with held-out material.
