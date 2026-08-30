/*
 * Per-sentence cost in the browser, measured on the runtime that ships.
 *
 * Run in the page context of the site's DEV server (Vite serves and transforms
 * these source modules on demand, so no page is needed). Returns timings; see
 * README.md for why there is deliberately no harness page.
 *
 * Reported separately: the document check (the verdict, which is what a reader
 * waits for today) and the sentence pass (the new cost). The ratio between them
 * is the number that decides whether this layer can ship on the browser route.
 */
(async () => {
  const [{enableWithDownload}, {splitSentences}, {rankSentences}, fixture, evidence] =
    await Promise.all([
      import("/src/lib/local-signals/engine.ts"),
      import("/src/lib/local-signals/sentences.ts"),
      import("/src/lib/content-integrity/sentence-scale.ts"),
      fetch("/@fs" + window.__PERF_FIXTURE__).then(r => r.json()),
      import("/src/data/content-integrity-sentence-evidence.json").then(m => m.default)
    ]);

  const t0 = performance.now();
  const session = await enableWithDownload(() => {});
  const tReady = performance.now();

  const text = fixture.text;
  const tRun0 = performance.now();
  const run = await session.run(text);
  const tRun1 = performance.now();

  const sentences = splitSentences(text);
  const scorable = sentences.filter(s => s.scorable).length;
  const tSent0 = performance.now();
  const probabilities = await session.scoreSentences(text);
  const tSent1 = performance.now();

  const gradient = rankSentences(sentences, probabilities, evidence.floor);
  return {
    provider: session.provider,
    crossOriginIsolated: self.crossOriginIsolated,
    hardwareConcurrency: navigator.hardwareConcurrency,
    words: fixture.words,
    model_ready_ms: Math.round(tReady - t0),
    sections: "segments" in run ? run.segments.length : 0,
    document_check_ms: Math.round(tRun1 - tRun0),
    sentences_total: sentences.length,
    sentences_scored: scorable,
    sentence_pass_ms: Math.round(tSent1 - tSent0),
    ms_per_sentence: +((tSent1 - tSent0) / Math.max(1, scorable)).toFixed(1),
    sentence_pass_multiple_of_document_check:
      +((tSent1 - tSent0) / Math.max(1, tRun1 - tRun0)).toFixed(2),
    passages_marked: gradient.highlighted,
    document_flagged: "flagged" in run ? Boolean(run.flagged) : null
  };
})()
