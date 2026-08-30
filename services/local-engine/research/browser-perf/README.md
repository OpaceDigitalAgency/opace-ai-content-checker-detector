# Browser-route performance harness

Times the per-sentence pass in a real browser, on the runtime a visitor actually
uses: `onnxruntime-web`, the int8 model, batch size one, dynamic sequence length.

**There is deliberately no page.** An earlier version of this harness was an
`.astro` page under `src/pages/`. That was wrong twice over: the site is a fully
static build, so an on-demand page fails the whole build with
`NoAdapterInstalled`, and a prerendered one would have become a **public URL**
serving a harness that downloads a 34 MB model and prints raw timings. Deleting
half the guard to fix the build would have traded a loud broken build for a
silent public route.

Instead the harness is a snippet run against the dev server. Vite serves and
transforms source modules on demand in development, so `import("/src/…")` works
without any page existing, and nothing can be committed into the site's route
table by accident.

## Running it

1. Start the site's dev server (`npm run dev`) and note the port.
2. Open any page on that origin — the origin is what matters, not the page.
3. Execute `harness.js` in the page context (devtools console, or an automation
   tool's evaluate). It returns a JSON object of timings.

The model download is ~34 MB on the first run and is then served from Cache
Storage, so run it twice and report the second run: a first run measures the
network, not the machine.
