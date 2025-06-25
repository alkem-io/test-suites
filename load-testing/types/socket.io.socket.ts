import { Socket } from 'socket.io-client';
import {
  CLIENT_BROADCAST,
  IDLE_STATE,
  SCENE_INIT,
  JOIN_ROOM,
  ROOM_USER_CHANGE,
  SERVER_BROADCAST,
  SERVER_VOLATILE_BROADCAST,
  ERROR,
  CONNECTION_CLOSED, COLLABORATOR_MODE,
  ROOM_SAVED,
  ROOM_NOT_SAVED,
  INIT_ROOM,
  PING,
} from './event.names.js';
import { CollaboratorModeReasons } from './collaboration.mode.reasons.js';

type ListenEvents = {
  [INIT_ROOM]: () => void;
  [SCENE_INIT]: (roomId: string, data: ArrayBuffer) => void;
  [CONNECTION_CLOSED]: (message?: string) => void;
  [ROOM_USER_CHANGE]: (socketIds: Array<string>) => void;
  [CLIENT_BROADCAST]: (data: ArrayBuffer) => void;
  [ROOM_SAVED]: () => void;
  [ROOM_NOT_SAVED]: ({ error }: { error: string }) => void;
  [ERROR]: ({
              code,
              description,
            }: {
    code: number;
    description: string;
  }) => void;
  [COLLABORATOR_MODE]: (data: {
    mode: 'read' | 'write';
    reason?: CollaboratorModeReasons;
  }) => void;
};

type EmitEvents = {
  [IDLE_STATE]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_BROADCAST]: (roomId: string, data: ArrayBuffer) => void;
  [SERVER_VOLATILE_BROADCAST]: (roomId: string, data: ArrayBuffer) => void;
  [JOIN_ROOM]: (roomId: string) => void;
  [PING]: (cb: (serverAckAt: number) => void) => void;
};

export type SocketIoSocket = Socket<
  ListenEvents,
  EmitEvents
>;
