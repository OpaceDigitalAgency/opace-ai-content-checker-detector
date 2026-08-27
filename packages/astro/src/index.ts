import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { normaliseOptions, type ContentIntegrityAstroOptions } from './options.js';
import { writeBuildReport } from './report.js';

export type { ContentIntegrityAstroOptions } from './options.js';
export { analyseHtml, visibleHtml } from './report.js';

export const APP_ID = 'opace-content-integrity';

export default function contentIntegrity(userOptions: ContentIntegrityAstroOptions = {}): AstroIntegration {
  const options = normaliseOptions(userOptions);
  return {
    name: '@opace/astro-content-integrity',
    hooks: {
      'astro:config:setup': ({ addDevToolbarApp, command }) => {
        if (!options.toolbar || command !== 'dev') return;
        addDevToolbarApp({
          id: APP_ID,
          name: 'Content Integrity',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3 4.8 6v5.4c0 4.6 3 7.9 7.2 9.6 4.2-1.7 7.2-5 7.2-9.6V6L12 3Z"/><path d="m8.4 12 2.1 2.1 5.1-5.1"/></svg>',
          entrypoint: fileURLToPath(new URL('./toolbar.js', import.meta.url)),
        });
      },
      'astro:build:done': async ({ dir, logger }) => {
        if (options.buildCheck === false) return;
        const evidence = await writeBuildReport(dir, options);
        logger.info(`Hash-only Content Integrity report: ${evidence.hash}`);
      },
    },
  };
}
