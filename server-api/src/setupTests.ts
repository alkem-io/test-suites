import WebSocket from 'ws';

// define websocket as a global, because it will fail with ReferenceError: WebSocket is not defined
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).WebSocket = WebSocket;
