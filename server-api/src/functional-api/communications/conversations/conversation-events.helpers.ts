import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  delay,
  SubscriptionClient,
  SubscriptionMessage,
  TestUser,
} from '@alkemio/tests-lib';

/**
 * Helpers for asserting on `conversationEvents` subscription payloads without
 * fixed waits (plan: conversations-test-plan.md, server#6329 — P-1).
 *
 * Positive waits are a bounded poll that returns the moment the expected
 * event is there. A NEGATIVE ("exactly once", "never arrives") cannot be
 * bounded by a product constant, so it uses one derived settle window — see
 * `negativeWindowMs`. These two helpers are the only places a sleep appears;
 * specs never call `delay` for event timing.
 */

const subscriptionConversationEvents = readFileSync(
  resolve(
    __dirname,
    '../../../../../lib/src/scenario/graphql/subscriptions/communication/conversationEvents.graphql'
  ),
  'utf-8'
);

export type ConversationEvent = {
  eventType: string;
  conversationCreated?: { conversation: { id: string } };
  conversationDeleted?: { conversationID: string };
  memberRemoved?: {
    conversation: { id: string; members?: { id: string }[] };
    removedMemberID: string;
  };
  messageReceived?: {
    roomId: string;
    message: { id: string; message: string; sender?: { id: string } };
  };
};

type ConversationEventMessage = { conversationEvents?: ConversationEvent };

/** Opens a `ConversationEvents` subscription as `user`. Resolves once connected. */
export const subscribeConversationEvents = async (
  user: TestUser
): Promise<SubscriptionClient> => {
  const subscription = new SubscriptionClient();
  await subscription.subscribe(
    {
      operationName: 'ConversationEvents',
      query: subscriptionConversationEvents,
      variables: {},
    },
    user
  );
  return subscription;
};

/** Every received `conversationEvents` payload of `eventType` that `match` accepts. */
export const eventsFor = (
  subscription: SubscriptionClient,
  eventType: string,
  match: (event: ConversationEvent) => boolean = () => true
): ConversationEvent[] =>
  subscription
    .getMessages()
    .map(
      (message: SubscriptionMessage) =>
        (message as ConversationEventMessage | null)?.conversationEvents
    )
    .filter(
      (event): event is ConversationEvent =>
        !!event && event.eventType === eventType && match(event)
    );

/** Matches the conversation lifecycle events of one conversation. */
export const byConversation =
  (conversationId: string) =>
  (event: ConversationEvent): boolean =>
    event.memberRemoved?.conversation?.id === conversationId ||
    event.conversationCreated?.conversation?.id === conversationId ||
    event.conversationDeleted?.conversationID === conversationId;

/** Matches the message events of one (Alkemio) room. */
export const byRoom =
  (roomId: string) =>
  (event: ConversationEvent): boolean =>
    event.messageReceived?.roomId === roomId;

/** Matches a `MESSAGE_RECEIVED` in `roomId` whose text is exactly `text`. */
export const byRoomAndText =
  (roomId: string, text: string) =>
  (event: ConversationEvent): boolean =>
    byRoom(roomId)(event) && event.messageReceived?.message?.message === text;

/**
 * Polls (bounded) until at least `atLeast` matching events have arrived.
 * Throws a message naming the event type and the subscriber on timeout, so a
 * dead subscription fails the setup rather than turning a later negative
 * assertion vacuous.
 */
export const waitForEvents = async (
  subscription: SubscriptionClient,
  eventType: string,
  match: (event: ConversationEvent) => boolean,
  {
    atLeast = 1,
    timeoutMs = 30_000,
    intervalMs = 250,
    label = 'subscriber',
  }: {
    atLeast?: number;
    timeoutMs?: number;
    intervalMs?: number;
    label?: string;
  } = {}
): Promise<{ events: ConversationEvent[]; observedAtMs: number }> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const events = eventsFor(subscription, eventType, match);
    if (events.length >= atLeast) {
      return { events, observedAtMs: Date.now() };
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `${eventType} (>= ${atLeast}) not received on ${label} within ${timeoutMs} ms`
      );
    }
    // bounded poll interval - the loop exits on the event or the deadline
    await delay(intervalMs);
  }
};

/**
 * The settle window for a negative assertion ("exactly once", "never arrives").
 *
 * No product constant bounds a duplicate event. The adapter dispatches each
 * Matrix event in its own goroutine (`internal/infrastructure/matrix/listener.go`),
 * so there is no per-room ordering to anchor on. A second, independently
 * produced event would travel the same pipeline, so twice the latency observed
 * for the first one, floored at 5 s, is the window.
 */
export const negativeWindowMs = (observedLatencyMs: number): number =>
  Math.min(30_000, Math.max(5_000, 2 * observedLatencyMs));

/** Negative settle window — the one place a sleep stands in for "nothing more arrives". */
export const settle = async (ms: number): Promise<void> => {
  // negative settle window - the only deliberate sleep in these specs
  await delay(ms);
};

/**
 * Bounded poll for a state that lands asynchronously (for example a Matrix
 * membership). Returns the first non-`undefined` value `read` yields; on
 * timeout throws `describeTimeout()` so the failure names what was observed.
 */
export const pollUntil = async <T>(
  read: () => Promise<T | undefined>,
  describeTimeout: () => string,
  { timeoutMs = 30_000, intervalMs = 250 } = {}
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (value !== undefined) return value;
    if (Date.now() >= deadline) {
      throw new Error(describeTimeout());
    }
    // bounded poll interval - the loop exits on the value or the deadline
    await delay(intervalMs);
  }
};
