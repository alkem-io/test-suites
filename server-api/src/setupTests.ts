import WebSocket from 'ws';
import { LogManager } from '@alkemio/tests-lib';
import './utils/array.matcher';

// define websocket as a global, because it will fail with ReferenceError: WebSocket is not defined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = WebSocket;

beforeAll(() => {
  // This will run before any test is executed in the suite
  const testFileName = expect.getState().testPath || 'Unknown Test Suite';
  LogManager.getLogger().info(`Starting test suite: ${testFileName}`);
});
