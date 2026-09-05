import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const chromeRoot = path.resolve(import.meta.dirname, '../../chrome');
const require = createRequire(path.join(chromeRoot, 'package.json'));
const { build } = require('esbuild');
const bundled = await build({ entryPoints: [path.join(chromeRoot, 'src/background.ts')], bundle: true, platform: 'browser', format: 'iife', write: false, logLevel: 'silent' });
const worker = bundled.outputFiles[0].text;
const flush = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));

function harness({ rejectMessage = false, interrupted = null } = {}) {
  let action, menu, message;
  const opens = [], broadcasts = [], storageWrites = [];
  const chrome = {
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener(fn) { message = fn; } },
      sendMessage(value) { broadcasts.push(plain(value)); return rejectMessage ? Promise.reject(new Error('No receiving end')) : Promise.resolve(); },
    },
    action: { onClicked: { addListener(fn) { action = fn; } } },
    contextMenus: { onClicked: { addListener(fn) { menu = fn; } } },
    sidePanel: {
      setPanelBehavior() { return Promise.resolve(); },
      open(options) {
        let resolve, reject;
        const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
        opens.push({ ...plain(options), resolve, reject });
        return promise;
      },
    },
    scripting: { executeScript() { throw new Error('Background must not extract text'); } },
    storage: { session: {
      async get() { return interrupted ? { unfinished_action: interrupted } : {}; },
      async remove(key) { storageWrites.push(['remove', key]); },
      async set(value) { storageWrites.push(['set', value]); },
    } },
  };
  vm.runInNewContext(worker, { chrome });
  const send = value => new Promise(resolve => message(value, {}, answer => resolve(plain(answer))));
  return { action: value => action(value), menu: (info, tab) => menu(info, tab), send, opens, broadcasts, storageWrites };
}

test('toolbar stores a tab-bound article intent before synchronous opening; cold reads do not consume it', async () => {
  const h = harness({ interrupted: { phase: 'old' } });
  h.action({ id: 17 });
  assert.equal(h.opens.length, 1, 'sidePanel.open runs before the event returns');
  assert.equal(h.opens[0].tabId, 17);
  const first = await h.send({ type: 'GET_PENDING' });
  assert.deepEqual(first.intent, { id: first.intent.id, tabId: 17, mode: 'article' });
  assert.equal(typeof first.intent.id, 'string');
  assert.equal(first.interrupted, null);
  assert.deepEqual(await h.send({ type: 'GET_PENDING' }), first);
  assert.deepEqual(h.broadcasts, []);
  h.opens[0].resolve();
  await flush();
  assert.deepEqual(h.broadcasts, [{ type: 'CAPTURE_INTENT', intent: first.intent }]);
  assert.deepEqual(h.storageWrites, [], 'intent contains no stored draft or automatic processing');
});

test('warm selection context-menu uses the supplied tab, without extraction', async () => {
  const h = harness();
  h.menu({ menuItemId: 'inspect-selection' }, { id: 23 });
  h.opens[0].resolve();
  await flush();
  assert.equal(h.broadcasts[0].intent.mode, 'selection');
  assert.equal(h.broadcasts[0].intent.tabId, 23);
  assert.deepEqual((await h.send({ type: 'GET_PENDING' })).intent, h.broadcasts[0].intent);
});

test('latest request wins and an older open or acknowledgement cannot replace or clear it', async () => {
  const h = harness();
  h.action({ id: 1 });
  const old = (await h.send({ type: 'GET_PENDING' })).intent;
  h.action({ id: 2 });
  const latest = (await h.send({ type: 'GET_PENDING' })).intent;
  assert.notEqual(old.id, latest.id);
  await h.send({ type: 'CLEAR_CAPTURE_INTENT', id: old.id });
  h.opens[0].resolve();
  h.opens[1].resolve();
  await flush();
  assert.deepEqual(h.broadcasts, [{ type: 'CAPTURE_INTENT', intent: latest }]);
  assert.deepEqual((await h.send({ type: 'GET_PENDING' })).intent, latest);
  await h.send({ type: 'CLEAR_CAPTURE_INTENT', id: latest.id });
  assert.equal((await h.send({ type: 'GET_PENDING' })).intent, undefined);
});

test('cold acknowledgement before opening resolves prevents duplicate warm notification', async () => {
  const h = harness();
  h.action({ id: 2 });
  const { intent } = await h.send({ type: 'GET_PENDING' });
  await h.send({ type: 'CLEAR_CAPTURE_INTENT', id: intent.id });
  h.opens[0].resolve();
  await flush();
  assert.deepEqual(h.broadcasts, []);
});

test('a missing receiver or failed opening leaves the intent available without an unhandled rejection', async () => {
  const h = harness({ rejectMessage: true });
  h.action({ id: 8 });
  h.opens[0].resolve();
  await flush();
  assert.equal((await h.send({ type: 'GET_PENDING' })).intent.tabId, 8);
  h.action({ id: 9 });
  h.opens[1].reject(new Error('Window closed'));
  await flush();
  assert.equal((await h.send({ type: 'GET_PENDING' })).intent.tabId, 9);
});

test('legacy captures remain one-shot and CLEAR_PENDING does not consume the new intent', async () => {
  const h = harness();
  const capture = { kind: 'article', text: 'public fixture', host: 'example.test', title: 'Example', limitations: [] };
  await h.send({ type: 'CAPTURE_READY', payload: capture });
  assert.deepEqual((await h.send({ type: 'GET_PENDING' })).capture, capture);
  assert.equal((await h.send({ type: 'GET_PENDING' })).capture, null);
  h.action({ id: 4 });
  await h.send({ type: 'CLEAR_PENDING' });
  assert.equal((await h.send({ type: 'GET_PENDING' })).intent.tabId, 4);
});

test('explicit paste cancels pending page intent and preserves legacy paste payload', async () => {
  const h = harness();
  h.action({ id: 4 });
  await h.send({ type: 'START_PASTE' });
  h.opens[0].resolve();
  await flush();
  const pending = await h.send({ type: 'GET_PENDING' });
  assert.equal(pending.intent, undefined);
  assert.equal(pending.capture.kind, 'paste');
  assert.equal(pending.capture.text, '');
  assert.deepEqual(h.broadcasts, []);
});

test('invalid action/context menu events are ignored and interrupted legacy state still loads', async () => {
  const h = harness({ interrupted: { phase: 'capturing_article' } });
  h.action({});
  h.menu({ menuItemId: 'other' }, { id: 3 });
  h.menu({ menuItemId: 'inspect-selection' }, undefined);
  assert.deepEqual(h.opens, []);
  assert.deepEqual((await h.send({ type: 'GET_PENDING' })).interrupted, { phase: 'capturing_article' });
});
