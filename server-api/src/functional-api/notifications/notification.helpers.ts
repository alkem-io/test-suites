import {
  ConversationCreationType,
  delay,
  getMailsData,
  getQueueStats,
  NotificationEvent,
  QueueStats,
  TestUser,
  waitForQueuePublishIncrease,
} from '@alkemio/tests-lib';
import { UpdateUserSettingsNotificationUserInput } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { createConversation } from '@functional-api/communications/conversations/conversation.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import {
  generateFakePushSubscription,
  getMyPushSubscriptions,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@functional-api/push-notifications/push-notifications.request.params';

// Shared helper for building NotificationSettingInput objects in specs
// Keeps tests concise and consistent with schema shape.
export const notif = (v: boolean) => ({ email: v, inApp: v });

// Extended helper that includes push channel for PWA push notification tests
export const notifWithPush = (v: boolean) => ({ email: v, inApp: v, push: v });

// Helper for setting push channel independently
export const notifPush = (emailInApp: boolean, push: boolean) => ({
  email: emailInApp,
  inApp: emailInApp,
  push,
});

// ============================================================================
// 034-messaging-notifications — conversation-message notification helpers
// ============================================================================

/**
 * The internal RabbitMQ queue the server's push adapter publishes to and its
 * own PushDeliveryService consumes, same-process (server/src/common/enums/
 * messaging.queue.ts PUSH_NOTIFICATIONS). Push is verified at this EMIT/queue
 * boundary only (Operator Ruling 3c) — never real browser delivery, since the
 * acceptance overlay ships no real VAPID keys (risk R-10).
 */
export const PUSH_NOTIFICATIONS_QUEUE = 'alkemio-push-notifications';

/** Create a DIRECT (1:1) conversation between the caller and `otherMemberActorID`. */
export const createDirectConversation = async (
  otherMemberActorID: string,
  creatorRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  createConversation(
    [otherMemberActorID],
    ConversationCreationType.Direct,
    undefined,
    creatorRole
  );

/** Create a GROUP conversation containing the caller plus every actor in `memberActorIDs`. */
export const createGroupConversation = async (
  memberActorIDs: string[],
  displayName: string,
  creatorRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  createConversation(
    memberActorIDs,
    ConversationCreationType.Group,
    { displayName },
    creatorRole
  );

export type NotificationSettingChannels = {
  email?: boolean;
  inApp?: boolean;
  push?: boolean;
};

/**
 * Update one or both messaging-notification settings rows
 * (`conversationMessageDirect` / `conversationMessageGroup`) for a user,
 * merging field-by-field (FR-017) — omitted rows/channels are left untouched.
 */
export const updateConversationMessagingSettings = async (
  userID: string,
  overrides: {
    direct?: NotificationSettingChannels;
    group?: NotificationSettingChannels;
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const notificationUserInput: UpdateUserSettingsNotificationUserInput = {};
  if (overrides.direct) {
    notificationUserInput.conversationMessageDirect = overrides.direct;
  }
  if (overrides.group) {
    notificationUserInput.conversationMessageGroup = overrides.group;
  }

  return updateUserSettings(
    userID,
    { notification: { user: notificationUserInput } },
    userRole
  );
};

export type PushSubscriptionRecipient = { userRole: TestUser; label: string };
export type PushSubscriptionHandle = {
  userRole: TestUser;
  subscriptionId: string;
};

/**
 * Subscribes each given recipient to push with a fake (non-delivering)
 * endpoint. This is a REQUIRED precondition for any push-emit assertion: the
 * server's `NotificationPushAdapter` no-ops (never publishes to the queue)
 * for a recipient with zero active push subscriptions
 * (notification.push.adapter.ts — `if (subscriptions.length === 0) return;`).
 * Tear down with `unsubscribeRecipientsFromPush` in `afterAll`.
 *
 * THROWS if any subscription is not created. A missing subscription is not a
 * degraded precondition, it is an inverted one: the adapter then no-ops for
 * that recipient, so every positive push assertion fails for a reason that
 * looks like a product bug, and every NEGATIVE one passes vacuously.
 */
export const subscribeRecipientsToPush = async (
  recipients: PushSubscriptionRecipient[]
): Promise<PushSubscriptionHandle[]> => {
  const handles: PushSubscriptionHandle[] = [];
  for (const { userRole, label } of recipients) {
    const sub = generateFakePushSubscription(label);
    const res = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      userRole,
      `${label}-test`
    );
    const subscriptionId = res.body?.data?.subscribeToPushNotifications?.id;
    if (!subscriptionId) {
      throw new Error(
        'subscribeToPushNotifications returned no subscription id for ' +
          `"${label}" (${userRole}) — push-emit assertions for this recipient ` +
          `would be meaningless: ${JSON.stringify(
            res.body?.errors ?? res.body ?? {}
          )}`
      );
    }
    handles.push({ userRole, subscriptionId });
  }
  return handles;
};

/**
 * Tears down subscriptions created by `subscribeRecipientsToPush`. Every
 * handle is attempted even if an earlier one fails, but the failures are
 * REPORTED rather than swallowed: a subscription that outlives its spec keeps
 * attracting publishes and inflates the queue deltas of every later spec in
 * the (sequential) run, which surfaces as an unattributable failure elsewhere.
 */
export const unsubscribeRecipientsFromPush = async (
  handles: PushSubscriptionHandle[]
): Promise<void> => {
  const failures: string[] = [];
  for (const { userRole, subscriptionId } of handles) {
    if (!subscriptionId) continue;
    try {
      const res = await unsubscribeFromPushNotifications(
        subscriptionId,
        userRole
      );
      if (res.body?.errors) {
        failures.push(
          `${userRole}/${subscriptionId}: ${JSON.stringify(res.body.errors)}`
        );
      }
    } catch (error) {
      failures.push(`${userRole}/${subscriptionId}: ${String(error)}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `Failed to unsubscribe ${failures.length} push subscription(s); they ` +
        "will keep attracting publishes and skew later specs' queue deltas:\n" +
        failures.join('\n')
    );
  }
};

/** Current cumulative publish count for the push-notifications queue (baseline for emit assertions). */
export const getPushQueuePublishedTotal = async (): Promise<number> => {
  const stats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
  return stats.publishedTotal;
};

/**
 * Number of ACTIVE push subscriptions the calling user currently has.
 *
 * This is the FAN-OUT FACTOR of every push emit for that recipient: the
 * server's push adapter publishes ONE queue message PER ACTIVE SUBSCRIPTION
 * (notification.push.adapter.ts `publishToSubscriptions` — `for (const
 * subscription of subscriptions)`), not one per recipient. A spec that
 * hardcodes `expect(delta).toBe(1)` is therefore only correct on a stack
 * where the recipient happens to have exactly one active subscription, and
 * goes red on any stack where a real browser (or a previous run) left
 * another one behind — a stack artifact that reads exactly like a product
 * bug. Positive push-emit assertions must scale the expected delta by this
 * count instead.
 *
 * THROWS on a GraphQL error: a failed query that silently read as 0 would
 * make a positive assertion expect no publish at all.
 */
export const getActivePushSubscriptionCount = async (
  userRole: TestUser
): Promise<number> => {
  const res = await getMyPushSubscriptions(userRole);
  if (res.body?.errors) {
    throw new Error(
      `myPushSubscriptions query failed for ${userRole}: ${JSON.stringify(
        res.body.errors
      )}`
    );
  }
  const subscriptions = res.body?.data?.myPushSubscriptions;
  if (!Array.isArray(subscriptions)) {
    throw new Error(
      `myPushSubscriptions returned no list for ${userRole}: ${JSON.stringify(
        res.body ?? {}
      )}`
    );
  }
  return subscriptions.filter(
    (s: { status?: string }) => s?.status === 'ACTIVE'
  ).length;
};

/**
 * Waits until the push queue's cumulative publish counter has stopped moving
 * for `quietMs`, then returns that settled total.
 *
 * Use it to take the BASELINE of any push assertion that must not inherit the
 * previous spec's stragglers. `expectPushEmitAfter` returns as soon as the
 * expected increase is visible plus a short settle, so a publish that was
 * already in flight (a slower subscription in the same fan-out, a retry) can
 * land a second or two later — inside the NEXT spec's measurement window,
 * where it presents as an unexplained extra publish. Anchoring on a quiet
 * queue makes each spec's delta attributable to its own action.
 */
export const waitForPushQueueQuiet = async ({
  quietMs = 3_000,
  timeout = 30_000,
}: { quietMs?: number; timeout?: number } = {}): Promise<number> => {
  const deadline = Date.now() + timeout;
  let last = await getPushQueuePublishedTotal();
  let stableSince = Date.now();

  for (;;) {
    await delay(500);
    const current = await getPushQueuePublishedTotal();
    if (current !== last) {
      last = current;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= quietMs) {
      return current;
    }
    if (Date.now() > deadline) {
      // Deliberately non-fatal: a queue that never goes quiet is reported by
      // the assertion that follows (as an unexpected delta), with the actual
      // numbers, rather than as an opaque timeout here.
      return current;
    }
  }
};

export interface PushEmitResult {
  /** `publishedTotal` observed immediately before `action` ran. */
  baseline: number;
  /** `publishedTotal` observed after the expected increase, plus a settle delay. */
  stats: QueueStats;
  /**
   * `stats.publishedTotal - baseline` — the actual number of publishes
   * attributable to `action`. Callers MUST assert on this (exact equality),
   * never on `stats.publishedTotal` directly — the queue's cumulative
   * counter never resets, so asserting the raw total against a literal
   * passes regardless of what `action` did (it is nonzero the moment
   * anything has ever published to the queue).
   */
  delta: number;
}

/**
 * Runs `action`, waits for the push queue's cumulative publish counter to
 * advance by at least `expectedIncrease` past its pre-action baseline, then
 * settles a little longer and re-reads before returning. Use for POSITIVE
 * push-emit assertions (a definite push is expected) — assert
 * `expect(result.delta).toBe(expectedIncrease)`, an EXACT equality. The
 * settle delay matters as much as the poll: without it, an extra/late
 * publish that arrives a moment after the target is first reached (e.g. a
 * leak to a channel that should have stayed suppressed) would never be
 * observed, and a `>=` assertion would hide it entirely.
 */
export const expectPushEmitAfter = async (
  action: () => Promise<unknown>,
  expectedIncrease = 1,
  {
    settleMs = 2_000,
    timeout = 15_000,
    baseline: providedBaseline,
  }: { settleMs?: number; timeout?: number; baseline?: number } = {}
): Promise<PushEmitResult> => {
  // A caller that has already anchored on a QUIET queue
  // (`waitForPushQueueQuiet`) passes that total in, so a straggler from the
  // previous spec cannot be counted as this one's publish.
  const baseline = providedBaseline ?? (await getPushQueuePublishedTotal());
  await action();
  await waitForQueuePublishIncrease(
    PUSH_NOTIFICATIONS_QUEUE,
    baseline,
    expectedIncrease,
    { timeout }
  );
  await delay(settleMs);
  const stats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
  return { baseline, stats, delta: stats.publishedTotal - baseline };
};

/**
 * Runs `action`, waits out a grace period, then returns the push queue's
 * stats unconditionally. Use for NEGATIVE push-emit assertions — callers
 * assert `publishedTotal` is unchanged from their own baseline. A fixed
 * grace delay (rather than a polling wait-for-increase) is deliberate: there
 * is nothing to wait FOR in the negative case.
 *
 * `graceMs` is REQUIRED, and MUST come from `digestWindow(...)` — normally
 * `maxDelayGraceMs` for the push track in question. Under R4 a push is
 * debounced before it is ever published, so a literal 3s grace would report
 * "no push" while the dispatch was still comfortably pending: the assertion
 * would pass because nothing had arrived YET, not because nothing ever will.
 */
export const expectNoPushEmitAfter = async (
  action: () => Promise<unknown>,
  graceMs: number
): Promise<QueueStats> => {
  await action();
  await delay(graceMs);
  return getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
};

/**
 * Count of in-app notification records the CALLING user (`userRole`) has for
 * the two messaging events. The in-app channel is permanently OFF for both
 * (FR-003/D-2) — enforced platform-wide via the unsupported-in-app-events
 * list, independent of any stored preference — so this MUST be 0 even when
 * the stored `inApp` flag has been forced to `true` (US3-AS3). Uses a raw
 * query (rather than a committed `.graphql` document) because it only reads
 * `total`, not the polymorphic per-event-type payload union.
 *
 * THROWS on a GraphQL error or a missing/non-numeric `total` rather than
 * defaulting to 0. This helper only ever feeds "in-app was never produced"
 * assertions, so a swallowed contract failure would read as a pass.
 */
export const getConversationMessagingInAppNotificationsCount = async (
  userRole: TestUser
): Promise<number> => {
  const requestParams = {
    operationName: 'GetMyConversationMessagingNotifications',
    query: `
      query GetMyConversationMessagingNotifications($types: [NotificationEvent!]) {
        me {
          notifications(filter: { types: $types }) {
            total
          }
        }
      }
    `,
    variables: {
      types: [
        NotificationEvent.UserConversationMessageDirect,
        NotificationEvent.UserConversationMessageGroup,
      ],
    },
  };

  const response = await graphqlRequestAuth(requestParams, userRole);
  if (response.body?.errors) {
    throw new Error(
      `me.notifications query failed for ${userRole}: ${JSON.stringify(
        response.body.errors
      )}`
    );
  }

  const total = response.body?.data?.me?.notifications?.total;
  if (typeof total !== 'number') {
    throw new Error(
      `me.notifications returned no numeric total for ${userRole}: ${JSON.stringify(
        response.body ?? {}
      )}`
    );
  }
  return total;
};

// ---------------------------------------------------------------------------
// Digest email subjects (R4) — data-model.md §9.1.
//
// Both templates render a LIST of entries, never a single sender, so the
// subject depends on how many entries the digest carries and on the total
// message count across them. These MUST stay in sync with
// notifications/service/src/email-templates/user.conversation.message.{direct,group}.js.
// ---------------------------------------------------------------------------

/**
 * Direct digest, ONE entry (one counterpart). `count === 1` deliberately
 * renders identically to the pre-R4 single-message subject.
 */
export const conversationMessageDirectSubject = (
  senderDisplayName: string,
  count = 1
) =>
  count === 1
    ? `${senderDisplayName} sent you a message`
    : `${senderDisplayName} sent you ${count} messages`;

/** Direct digest, MULTIPLE entries (US1-AS8) — no single sender to name. */
export const conversationMessageDirectDigestSubject = (
  totalMessages: number,
  senderCount: number
) => `${totalMessages} new messages from ${senderCount} people`;

/**
 * Group digest, ONE entry (one conversation). Note this differs from the
 * pre-R4 copy (`{sender} sent a message in {group}`): a group digest reports
 * conversations, not senders, so there is no single sender to name.
 */
export const conversationMessageGroupSubject = (
  conversationDisplayName: string,
  count = 1
) =>
  count === 1
    ? `New message in ${conversationDisplayName}`
    : `${count} new messages in ${conversationDisplayName}`;

/** Group digest, MULTIPLE entries (US2-AS6). */
export const conversationMessageGroupDigestSubject = (
  totalMessages: number,
  conversationCount: number
) => `${totalMessages} new messages in ${conversationCount} conversations`;

/**
 * Polls Mailslurper until at least `expectedCount` mails are present, or the
 * timeout elapses (message send → email delivery crosses Matrix + the
 * notifications-service RabbitMQ consumer, so a single fixed delay is
 * flakier than a short poll). Returns the last-observed `[mailItems, total]`
 * tuple either way — callers assert on it, so a timeout is a normal
 * (informative) test failure rather than a thrown harness error.
 */
export const waitForMailsCountAtLeast = async (
  expectedCount: number,
  {
    timeout = 15_000,
    interval = 1_000,
  }: { timeout?: number; interval?: number } = {}
): Promise<Awaited<ReturnType<typeof getMailsData>>> => {
  const start = Date.now();
  let last = await getMailsData();

  while (last[1] < expectedCount && Date.now() - start < timeout) {
    await delay(interval);
    last = await getMailsData();
  }

  return last;
};

/**
 * Runs `action`, waits for at least `expectedCount` mails to land (via
 * `waitForMailsCountAtLeast`), then settles a little longer and re-reads
 * before returning — the email-channel counterpart of `expectPushEmitAfter`'s
 * settle discipline. Use for any "exactly N emails" / "email X never
 * appears" assertion: without the settle + re-read, a leaked extra email
 * that lands a moment after the target count is first reached (e.g. a
 * regression that also notifies a non-member or the sender) would never be
 * observed, and the first-hit read that `waitForMailsCountAtLeast` alone
 * returns would let the leak pass silently.
 */
export const expectExactMailsAfter = async (
  action: () => Promise<unknown>,
  expectedCount: number,
  {
    settleMs = 3_000,
    timeout = 15_000,
    interval = 1_000,
  }: { settleMs?: number; timeout?: number; interval?: number } = {}
): Promise<Awaited<ReturnType<typeof getMailsData>>> => {
  await action();
  await waitForMailsCountAtLeast(expectedCount, { timeout, interval });
  await delay(settleMs);
  return getMailsData();
};

// ===========================================================================
// R4 digest helpers — debounce, cancellation, and negative assertions
// ===========================================================================

/**
 * Sends a message to a room and returns its message id — needed to mark the
 * conversation read via `markConversationRead` (the cancellation path under
 * test in US1-AS6 / US5).
 */
export const sendConversationMessage = async (
  roomID: string,
  message: string,
  senderRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string> => {
  const res = (await sendMessageToRoom(roomID, message, senderRole)) as {
    data?: { sendMessageToRoom?: { id?: string } };
    error?: unknown;
  };
  const messageID = res?.data?.sendMessageToRoom?.id ?? '';
  if (!messageID) {
    throw new Error(
      `sendMessageToRoom returned no message id for room ${roomID}: ${JSON.stringify(
        res?.error ?? res
      )}`
    );
  }
  return messageID;
};

/**
 * Marks a message (and therefore everything up to it) as read in a room, AS
 * `readerRole` — the very same `markMessageAsReadInRoom` mutation the chat
 * panel issues when the user opens a conversation with the tab focused.
 *
 * This is what makes the R4 cancellation path testable from an API-only
 * harness: the flush re-derives unread counts at fire time
 * (`batchGetUnreadCounts`), so advancing the read receipt before the timer
 * fires must cancel the pending digest outright rather than delay it
 * (US1-AS6, US5-AS4, SC-008).
 *
 * Raw query rather than a committed `.graphql` document: the mutation returns
 * a bare Boolean, so there is no fragment to share.
 */
export const markConversationRead = async (
  roomID: string,
  messageID: string,
  readerRole: TestUser
): Promise<boolean> => {
  const requestParams = {
    operationName: 'MarkMessageAsReadInRoom',
    query: `
      mutation MarkMessageAsReadInRoom($messageData: RoomMarkMessageReadInput!) {
        markMessageAsReadInRoom(messageData: $messageData)
      }
    `,
    variables: { messageData: { roomID, messageID } },
  };

  const response = await graphqlRequestAuth(requestParams, readerRole);
  if (response.body?.errors) {
    throw new Error(
      `markMessageAsReadInRoom failed for room ${roomID}: ${JSON.stringify(
        response.body.errors
      )}`
    );
  }
  return response.body?.data?.markMessageAsReadInRoom ?? false;
};
