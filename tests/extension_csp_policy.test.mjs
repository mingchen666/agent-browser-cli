import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const backgroundPath = new URL('../assets/tmwd_cdp_bridge/background.js', import.meta.url);
const contentPath = new URL('../assets/tmwd_cdp_bridge/content.js', import.meta.url);

function eventTarget(listeners = []) {
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    removeListener() {},
  };
}

function createBackgroundContext(dynamicRuleCalls) {
  const onInstalled = [];
  const noOpEvent = eventTarget();
  const chrome = {
    alarms: {
      clear: async () => true,
      create() {},
      onAlarm: noOpEvent,
    },
    debugger: {
      onDetach: noOpEvent,
      onEvent: noOpEvent,
    },
    declarativeNetRequest: {
      async updateDynamicRules(update) {
        dynamicRuleCalls.push(update);
      },
    },
    extension: {
      async isAllowedFileSchemeAccess() {
        return false;
      },
    },
    runtime: {
      getManifest() {
        return { version: 'test' };
      },
      onInstalled: eventTarget(onInstalled),
      onMessage: noOpEvent,
      onStartup: noOpEvent,
    },
    scripting: {
      async executeScript() {
        return [];
      },
    },
    storage: {
      local: {
        async get(defaults) {
          return defaults;
        },
        async set() {},
      },
    },
    tabGroups: {
      async query() {
        return [];
      },
    },
    tabs: {
      async query() {
        return [];
      },
      onCreated: noOpEvent,
      onRemoved: noOpEvent,
      onUpdated: noOpEvent,
    },
  };

  class FakeWebSocket {}
  FakeWebSocket.CONNECTING = 0;
  FakeWebSocket.OPEN = 1;

  return {
    context: vm.createContext({
      AbortController,
      WebSocket: FakeWebSocket,
      chrome,
      console: { log() {}, warn() {}, error() {} },
      crypto: webcrypto,
      fetch: async () => {
        throw new Error('daemon unavailable in test');
      },
      setTimeout: () => 1,
    }),
    onInstalled,
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test('extension startup removes the legacy CSP rule without installing a replacement', async () => {
  const source = await readFile(backgroundPath, 'utf8');
  const dynamicRuleCalls = [];
  const { context, onInstalled } = createBackgroundContext(dynamicRuleCalls);

  vm.runInContext(source, context, { filename: backgroundPath.pathname });
  await flushMicrotasks();

  assert.deepEqual(JSON.parse(JSON.stringify(dynamicRuleCalls[0])), { removeRuleIds: [9999] });
  assert.ok(dynamicRuleCalls.every((update) => !('addRules' in update)));

  for (const listener of onInstalled) await listener({ reason: 'update' });
  assert.ok(dynamicRuleCalls.every((update) => !('addRules' in update)));
});

test('content script leaves page CSP metadata untouched', async () => {
  const source = await readFile(contentPath, 'utf8');
  assert.doesNotMatch(source, /Content-Security-Policy/i);
});
