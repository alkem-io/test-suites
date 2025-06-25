import { io } from 'socket.io-client';
import { setTimeout } from 'node:timers/promises';
import { SocketIoSocket } from './types/socket.io.socket.js';
import { COLLABORATOR_MODE, JOIN_ROOM, PING, SERVER_BROADCAST } from './types/event.names.js';

export class ServiceSocket {
  private socket: SocketIoSocket;

  constructor(url: string, path: string) {
    this.socket = io(url, {
      path: path,
      transports: ["websocket"],
      retries: 0,
      reconnection: false,
    });
  }

  public joinRoom = async (roomID: string) => {
    this.socket.emit(JOIN_ROOM, roomID);

    return new Promise<void>((resolve) => {
      this.socket.once(COLLABORATOR_MODE, async ({ mode, reason }) => {
        if (mode === 'read') {
          console.log(`Service socket ${this.socket.id} is in ${mode} mode ${reason && `due to: ${reason}`}`);
        }
        resolve();
      });
    });
  }

  public disconnect = () => {
    this.socket.disconnect();
  }
  // todo: does not work
  public deleteAllElementsInRoom = async (roomID: string, elements: any[]) => {
    return new Promise<void>(async (resolve) => {
      const nonDeletedElements = elements.filter(element => !element.isDeleted);
      // batch it 20 elements at a time
      for (let i = 0; i < nonDeletedElements.length; i += 20) {
        const batch = nonDeletedElements.slice(i, i + 20).map(element => ({
          ...element,
          isDeleted: true,
          version: element.version + 100,
          versionNonce: element.versionNonce + 100,
        }));
        const payload = {
          "type": "SCENE_UPDATE",
          "payload": {
            elements: batch
          }
        };
        const jsonStr = JSON.stringify(payload);
        const buffer = new TextEncoder().encode(jsonStr).buffer;
        this.socket.emit(SERVER_BROADCAST, roomID, buffer);
        await setTimeout(300);
      }

      resolve();
    });
  }

  public measurePing = () => {
    setInterval(() => {
      const start = performance.now();
      this.socket.emitWithAck(PING).then((serverAckAt) => {
        const now = performance.now();
        const pingInMilliseconds = Math.round(now - start);
        console.log(`Ping: ${pingInMilliseconds}ms`);
      });
    }, 1000);
  }
}
