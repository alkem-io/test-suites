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
import { createConversation } from '@functional-api/communications/conversations/conversation.request.params';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';

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

/** Current cumulative publish count for the push-notifications queue (baseline for emit assertions). */
export const getPushQueuePublishedTotal = async (): Promise<number> => {
  const stats = await getQueueStats(PUSH_NOTIFICATIONS_QUEUE);
  return stats.publishedTotal;
};

/**
 * Runs `action`, then waits for the push queue's cumulative publish counter
 * to advance by at least `expectedIncrease` past its pre-action baseline.
 * Use for POSITIVE push-emit assertions (a definite push is expected).
 */
export const expectPushEmitAfter = async (
  action: () => Promise<unknown>,
  expectedIncrease = 1
): Promise<QueueStats> => {
  const baseline = await getPushQueuePublishedTotal();
  await action();
  return waitForQueuePublishIncrease(
    PUSH_NOTIFICATIONS_QUEUE,
    baseline,
    expectedIncrease
  );
};

/**
 * Runs `action`, waits out a grace period, then returns the push queue's
 * stats unconditionally. Use for NEGATIVE push-emit assertions — callers
 * assert `publishedTotal` is unchanged from their own baseline. A fixed
 * grace delay (rather than a polling wait-for-increase) is deliberate: there
 * is nothing to wait FOR in the negative case.
 */
export const expectNoPushEmitAfter = async (
  action: () => Promise<unknown>,
  graceMs = 3_000
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
  return response.body?.data?.me?.notifications?.total ?? 0;
};

/** Subject line of the direct-message email (must stay in sync with notifications/service/src/email-templates/user.conversation.message.direct.js). */
export const conversationMessageDirectSubject = (senderDisplayName: string) =>
  `${senderDisplayName} sent you a message`;

/** Subject line of the group-message email (must stay in sync with notifications/service/src/email-templates/user.conversation.message.group.js). */
export const conversationMessageGroupSubject = (
  senderDisplayName: string,
  conversationDisplayName: string
) => `${senderDisplayName} sent a message in ${conversationDisplayName}`;

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
  { timeout = 15_000, interval = 1_000 }: { timeout?: number; interval?: number } = {}
): Promise<Awaited<ReturnType<typeof getMailsData>>> => {
  const start = Date.now();
  let last = await getMailsData();

  while (last[1] < expectedCount && Date.now() - start < timeout) {
    await delay(interval);
    last = await getMailsData();
  }

  return last;
};
