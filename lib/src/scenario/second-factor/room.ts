import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { testConfiguration } from '../../config/test.configuration';
import { type GraphqlActor } from '../../utils/graphql.actor';
import { postGraphqlRawAs } from '../../utils/graphql.raw.client';

/**
 * A private room and a cookie-authenticated `roomEvents` subscription on it:
 * the socket presents the session cookie on its upgrade, which is what makes
 * the server re-check the session before every event.
 */

/** A group conversation `creator` opens with `memberIds`: its room id. */
export const createPrivateRoom = async (
  creator: GraphqlActor,
  memberIds: string[]
): Promise<string> => {
  const response = await postGraphqlRawAs<{
    createConversation: { room: { id: string } };
  }>(
    creator,
    `mutation($conversationData: CreateConversationInput!) {
       createConversation(conversationData: $conversationData) { room { id } }
     }`,
    { conversationData: { type: 'GROUP', memberIDs: memberIds } }
  );
  const roomId = response.body.data?.createConversation?.room?.id;
  if (!roomId) {
    throw new Error(`second-factor: create room failed: ${response.raw.slice(0, 400)}`);
  }
  return roomId;
};

/** Posts `message` to the room; returns the message id. */
export const postToRoom = async (
  roomID: string,
  message: string,
  author: GraphqlActor
): Promise<string> => {
  const response = await postGraphqlRawAs<{ sendMessageToRoom: { id: string } }>(
    author,
    `mutation($messageData: RoomSendMessageInput!) {
       sendMessageToRoom(messageData: $messageData) { id }
     }`,
    { messageData: { roomID, message } }
  );
  const id = response.body.data?.sendMessageToRoom?.id;
  if (!id) {
    throw new Error(`second-factor: post to room failed: ${response.raw.slice(0, 400)}`);
  }
  return id;
};

export type RoomSubscription = {
  /** Message ids delivered on the subscription, in order. */
  messageIds: string[];
  /** Resolves with the socket's close code once the server closes it. */
  closed: Promise<number>;
  /** The close code, once closed. */
  closeCode: () => number | undefined;
  dispose: () => void;
};

const ROOM_EVENTS = `subscription($roomID: UUID!) {
  roomEvents(roomID: $roomID) { message { data { id } } }
}`;

/** Opens `roomEvents` on `roomID` with the session cookie on the upgrade. */
export const subscribeToRoom = (
  cookieHeader: string,
  roomID: string
): Promise<RoomSubscription> => {
  class CookieWebSocket extends WebSocket {
    constructor(address: string, protocols?: string | string[]) {
      super(address, protocols, { headers: { Cookie: cookieHeader } });
    }
  }
  const messageIds: string[] = [];
  let code: number | undefined;
  let resolveClosed: (code: number) => void = () => undefined;
  const closed = new Promise<number>(resolve => (resolveClosed = resolve));

  const client = createClient({
    url: testConfiguration.endPoints.ws,
    webSocketImpl: CookieWebSocket,
    lazy: false,
    retryAttempts: 0,
    shouldRetry: () => false,
    on: {
      closed: event => {
        code = (event as { code: number }).code;
        resolveClosed(code);
      },
    },
  });

  return new Promise((resolve, reject) => {
    const unsubscribe = client.subscribe<{
      roomEvents: { message?: { data?: { id: string } } };
    }>(
      { query: ROOM_EVENTS, variables: { roomID } },
      {
        next: result => {
          const id = result.data?.roomEvents?.message?.data?.id;
          if (id) messageIds.push(id);
        },
        error: () => undefined,
        complete: () => undefined,
      }
    );
    const subscription: RoomSubscription = {
      messageIds,
      closed,
      closeCode: () => code,
      dispose: () => {
        unsubscribe();
        void client.dispose();
      },
    };
    client.on('connected', () => resolve(subscription));
    closed.then(c =>
      reject(new Error(`second-factor: room socket closed (${c}) before it connected`))
    );
  });
};

/**
 * Resolves once `check` holds, polling every 100 ms; rejects after `withinMs`.
 * A bound on a condition, never a fixed wait.
 */
export const eventually = async (
  check: () => boolean,
  withinMs: number,
  what: string
): Promise<void> => {
  const deadline = Date.now() + withinMs;
  while (!check()) {
    if (Date.now() > deadline) {
      throw new Error(`second-factor: ${what} did not happen within ${withinMs} ms`);
    }
    await new Promise(r => setTimeout(r, 100));
  }
};
