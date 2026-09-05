/**
 * The deterministic engine, off the editor's own thread.
 *
 * The block editor re-renders the post on every keystroke, so running 116
 * writing rules and 38 carrier rules on the main thread would be felt as the
 * editor stuttering. The compiled engine that ships in this plugin is imported
 * here instead and answers one message at a time. Nothing in `core.mjs` touches
 * the DOM, so the worker needs no shim: it is the same code, the same rules and
 * the same result the checker screen produces.
 *
 * One message in, one message out. There is no state between runs, so a worker
 * that is terminated mid-run leaves nothing behind.
 */
import { inspect } from './core.mjs';

self.addEventListener('message', async (event) => {
	const { id, request } = event.data || {};
	try {
		const result = await inspect(request);
		self.postMessage({ id, ok: true, result });
	} catch (error) {
		self.postMessage({ id, ok: false, code: String(error?.code || error?.message || 'inspection_failed'), message: String(error?.message || error) });
	}
});
