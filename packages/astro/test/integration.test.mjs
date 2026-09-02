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
  assert.equal(apps[0].name, 'Content Integrity');
});

test('toolbar can be disabled without enabling a fail-build or service lane', () => {
  const candidate = integration({ toolbar: false, buildCheck: false, localService: false });
  const apps = [];
  candidate.hooks['astro:config:setup']({ command: 'dev', addDevToolbarApp: (app) => apps.push(app) });
  assert.equal(apps.length, 0);
});

test('toolbar reads explicit consent from the checkbox rather than its label', () => {
  const source = readFileSync(new URL('../src/toolbar.ts', import.meta.url), 'utf8');
  assert.match(source, /querySelector<HTMLInputElement>\('\.oacit-consent input'\)\?\.checked/u);
  assert.doesNotMatch(source, /querySelector<HTMLInputElement>\('\.oacit-consent'\)\?\.checked/u);
});
