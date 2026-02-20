import WebSocket from 'ws';
import { LogManager } from '@alkemio/tests-lib';
import './utils/array.matcher';

// define websocket as a global, because it will fail with ReferenceError: WebSocket is not defined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = WebSocket;

beforeAll(() => {
  // In Vitest setupFiles, expect.getState().testPath may not be populated
  // before tests are collected. Use the worker's filepath as a reliable fallback.
  const testFileName =
    expect.getState()?.testPath ??
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__vitest_worker__?.filepath ??
    'Unknown Test Suite';
  LogManager.getLogger().info(`Starting test suite: ${testFileName}`);
});
