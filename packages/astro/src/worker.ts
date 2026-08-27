import { inspect } from '@opace/content-integrity-core';

const cancelled = new Set<string>();
self.addEventListener('message', async (event: MessageEvent) => {
  const message = event.data as { type?: string; id?: string; request?: Parameters<typeof inspect>[0] };
  if (!message.id) return;
  if (message.type === 'cancel') {
    cancelled.add(message.id);
    return;
  }
  if (message.type !== 'inspect' || !message.request) return;
  const id = message.id;
  try {
    const result = await inspect(message.request, {
      onProgress: (phase) => {
        if (!cancelled.has(id)) self.postMessage({ type: 'progress', id, phase });
      },
    });
    if (!cancelled.delete(id)) self.postMessage({ type: 'result', id, result });
  } catch (error) {
    self.postMessage({ type: 'error', id, code: error instanceof Error ? error.message : 'inspection_error' });
  }
});
