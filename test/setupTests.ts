import { config } from 'dotenv';
config({
  path: '.env',
});
// define websocket as a global, because it will fail with ReferenceError: WebSocket is not defined
(global as any).WebSocket = require('ws');
