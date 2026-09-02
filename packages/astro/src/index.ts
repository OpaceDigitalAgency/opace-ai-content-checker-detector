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
          // A single-colour line glyph, so it sits with Astro's own white rail
          // icons instead of dropping a colour tile into their row. The full
          // colour product mark stays inside the panel masthead.
          icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3.2h6a1.5 1.5 0 0 1 1.5 1.5v.6a1.5 1.5 0 0 1-1.5 1.5H9a1.5 1.5 0 0 1-1.5-1.5v-.6A1.5 1.5 0 0 1 9 3.2Z"/><path d="M16.5 4.7h1.9A1.6 1.6 0 0 1 20 6.3v13.1a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19.4V6.3a1.6 1.6 0 0 1 1.6-1.6h1.9"/><path d="M8 10.4h5"/><path d="m8.3 15.2 2.3 2.3 5.1-5.6"/></svg>',
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
