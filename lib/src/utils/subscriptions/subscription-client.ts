import { Client, createClient, SubscribePayload } from 'graphql-ws';
import { GraphQLError } from 'graphql';
import { WebSocket as WsWebSocket, ClientOptions } from 'ws';
import { buildConnectionParams } from './build-connection-params';
import { testConfiguration } from '../../config/test.configuration';
import { TestUser } from '../../common/enums/test.user';

type SubscriptionCleanUpFn = () => void;
export type SubscriptionMessage = Record<string, unknown> | null | undefined;

/**
 * Build a WebSocket subclass that injects auth headers on the upgrade request.
 * graphql-ws calls `new WebSocket(url, protocols)` (no headers slot), so we
 * forward through the `ws` package's extended (url, protocols, options)
 * constructor to attach the bearer where the server actually reads it.
 */
const createAuthedWebSocketImpl = (
  headers: Record<string, string>
): typeof WebSocket => {
  return class extends WsWebSocket {
    constructor(address: string | URL, protocols?: string | string[]) {
      super(address, protocols, { headers } as ClientOptions);
    }
  } as unknown as typeof WebSocket;
};

export class SubscriptionClient {
  private client: Client | undefined;
  private readonly _messages: SubscriptionMessage[] = [];
  private readonly errors: GraphQLError[] = [];
  /** do not use directly */
  private _terminateFn: SubscriptionCleanUpFn | undefined;

  /**
   * Subscribe to a GraphQL operation over Websocket.
   * @param payload Subscription payload (query, variables, operationName).
   * @param user The user whose auth token authorises the subscription.
   * @return A promise resolved once the `connected` event fires, so callers
   * can rely on messages being received promptly after subscribe().
   */
  public async subscribe(
    payload: SubscribePayload,
    user: TestUser
  ): Promise<void> {
    const upgradeHeaders = await buildConnectionParams(user);

    return new Promise<void>((res, rej) => {
      this.client = createClient({
        url: testConfiguration.endPoints.ws,
        webSocketImpl: createAuthedWebSocketImpl(upgradeHeaders),
      });

      this._terminateFn = this.client.subscribe(payload, {
        next: data => {
          if (data.errors?.length) {
            this.terminate();
            this.errors.push(
              ...(data?.errors?.map(e => new GraphQLError(e.message)) ?? [])
            );
            return;
          }

          this._messages.push(data.data);
        },
        error: err => {
          this.terminate();
          throw new Error((err as Error).message);
        },
        complete: () => null,
      });

      this.client.on('connected', () => res());
      this.client.on('error', () => rej());
    });
  }
  /**
   * Terminates the WebSocket abruptly and immediately.
   *
   * A close event `4499: Terminated` is issued to the current WebSocket and an
   * artificial `{ code: 4499, reason: 'Terminated', wasClean: false }` close-event-like
   * object is immediately emitted without waiting for the one coming from `WebSocket.onclose`.
   *
   * Terminating is not considered fatal and a connection retry will occur as expected.
   */
  public terminate(): void {
    this._terminateFn?.();
    this.client?.terminate();
  }
  /** Returns all received errors */
  public getErrors(): GraphQLError[] {
    return this.errors;
  }
  /** Returns all the received messages so far or throws on received errors */
  public getMessages(): SubscriptionMessage[] | never {
    if (this.errors.length) {
      throw new Error('Unable to access messages due to errors received');
    }
    return this._messages;
  }
  /** Returns the latest received message */
  public getLatest(): SubscriptionMessage | undefined {
    return this.getMessages().slice(-1)?.[0];
  }
  /** Returns the first received message */
  public getFirst(): SubscriptionMessage | undefined {
    return this.getMessages().slice(0)?.[0];
  }
}
