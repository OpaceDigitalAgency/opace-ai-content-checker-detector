import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import integration, { APP_ID } from '../dist/index.js';

test('exposes one integration and one development toolbar app', () => {
  const candidate = integration();
  assert.equal(candidate.name, '@opace/astro-content-integrity');
  const apps = [];
  candidate.hooks['astro:config:setup']({ command: 'build', addDevToolbarApp: (app) => apps.push(app) });
  assert.equal(apps.length, 0);
  candidate.hooks['astro:config:setup']({ command: 'dev', addDevToolbarApp: (app) => apps.push(app) });
  assert.equal(apps.length, 1);
  assert.equal(apps[0].id, APP_ID);
  assert.equal(apps[0].name, 'Opace AI Content Integrity');
});

test('toolbar can be disabled without enabling a fail-build or service lane', () => {
  const candidate = integration({ toolbar: false, buildCheck: false, localService: false });
  const apps = [];
  candidate.hooks['astro:config:setup']({ command: 'dev', addDevToolbarApp: (app) => apps.push(app) });
  assert.equal(apps.length, 0);
});

test('the press of the download button is the consent, and no tick box remains', () => {
  const source = readFileSync(new URL('../src/toolbar.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /oacit-consent/u, 'the separate consent control must be gone');
  assert.doesNotMatch(source, /type="checkbox"/u, 'no tick box may gate the download');
  assert.match(source, /const consentedToDownload = route === 'device' && !modelCached;/u);
  assert.match(source, /if \(route === 'device'\) await scoreOnDevice\(primitive, consentedToDownload\);/u);
  assert.match(source, /prepareWithConsent\(\{\s*consent: true,/u);
});

test('a run the button did not offer a download for never downloads', () => {
  const source = readFileSync(new URL('../src/toolbar.ts', import.meta.url), 'utf8');
  const guard = /if \(!cached\) \{[\s\S]*?if \(!consentedToDownload\) \{([\s\S]*?)\n {10}\}/u.exec(source)?.[1] ?? '';
  assert.ok(guard, 'the uncached-without-consent branch is missing');
  assert.match(guard, /modelCached = false;/u);
  assert.match(guard, /modelNotice = /u);
  assert.match(guard, /return;/u);
  // The refusal has to come before the fetch, not after it.
  assert.ok(source.indexOf('if (!consentedToDownload)') < source.indexOf('await modelRuntime.prepareWithConsent'));
});
