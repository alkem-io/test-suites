import WebSocket from 'ws';
import { inject } from 'vitest';
import { LogManager, TestUserManager } from '@alkemio/tests-lib';
import './utils/array.matcher';
import './vitest-provide';

// define websocket as a global, because it will fail with ReferenceError: WebSocket is not defined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = WebSocket;

beforeAll(async () => {
  // Mint hoist: hydrate the cached user models globalSetup
  // provided instead of minting our own tokens. `TestUserManager` is a
  // per-worker module singleton under isolate:false, so this only does real
  // work on that worker's first file; every subsequent file's beforeAll
  // hydrates the same already-populated state again, which is harmless.
  // The mint path is kept as a fallback for invocations that never went
  // through globalTestsSetup.ts's provide() (exotic/ad-hoc runs).
  const provided = inject('alkemioUserModels');
  if (provided) {
    TestUserManager.hydrateFromProvided(provided);
  } else {
    await TestUserManager.populateUserModelMap();
  }

  // In Vitest setupFiles, expect.getState().testPath may not be populated
  // before tests are collected. Use the worker's filepath as a reliable fallback.
  const testFileName =
    expect.getState()?.testPath ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__vitest_worker__?.filepath ??
    'Unknown Test Suite';
  LogManager.getLogger().info(`Starting test suite: ${testFileName}`);
});
