// 034-messaging-notifications — US4-AS2 / risk R-6 / FR-012: the messaging
// push budget and the shared (non-messaging) push throttle are disjoint —
// exhausting one never affects the other, in either direction.
//
// IMPORTANT (runtime ordering — see tasks/test-suites.md T006 note): this
// spec pollutes push-budget state for its recipient by design. It is
// authored here in Phase 4 order but MUST be run LAST among the messaging
// specs (after the settings/negative/suppression/positive matrix specs) so
// budget exhaustion never skews their push-emit counts.
import {
  generateFakePushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from '@functional-api/push-notifications/push-notifications.request.params';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom, sendMessageToUser } from '@functional-api/communications/communication.params';
import { leaveConversation } from '@functional-api/communications/conversations/conversation.request.params';
import {
  createDirectConversation,
  expectPushEmitAfter,
  getPushQueuePublishedTotal,
} from '../notifications/notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'messaging-push-budget-independence',
};

// Server in-code defaults (D-9 / pre-existing shared throttle), overridable
// by the same env vars the live server reads — see
// server/src/config/messaging-notifications.config.spec.ts and
// PushThrottleService's own config key.
const MESSAGING_PUSH_MAX_PER_MINUTE = Number(
  process.env.MESSAGING_PUSH_THROTTLE_MAX_PER_MINUTE ?? 10
);
const SHARED_PUSH_MAX_PER_MINUTE = Number(
  process.env.PUSH_THROTTLE_MAX_PER_MINUTE ?? 10
);

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Messaging push budget independence (US4-AS2)', () => {
  const conversationsToCleanup: string[] = [];
  let subscriptionId = '';

  beforeAll(async () => {
    // A real (fake-endpoint) push subscription is required for any push to
    // actually reach the queue — the adapter no-ops when there are zero
    // active subscriptions for a recipient.
    const sub = generateFakePushSubscription('messaging-budget-independence');
    const res = await subscribeToPushNotifications(
      sub.endpoint,
      sub.p256dh,
      sub.auth,
      TestUser.GLOBAL_BETA_TESTER,
      'messaging-budget-independence-test'
    );
    subscriptionId = res.body?.data?.subscribeToPushNotifications?.id ?? '';
    expect(subscriptionId).toBeTruthy();
  });

  afterAll(async () => {
    for (const id of conversationsToCleanup) {
      await leaveConversation(id, TestUser.GLOBAL_ADMIN).catch(() => {});
    }
    if (subscriptionId) {
      await unsubscribeFromPushNotifications(
        subscriptionId,
        TestUser.GLOBAL_BETA_TESTER
      ).catch(() => {});
    }
  });

  test(
    'exhausting the messaging push budget never blocks a non-messaging push for the same user, and vice versa',
    async () => {
      const recipientId = TestUserManager.users.betaTester.id;
      const recipientActorId = TestUserManager.users.betaTester.agentId;

      const conversationRes = await createDirectConversation(
        recipientActorId,
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();
      if (conversationId) conversationsToCleanup.push(conversationId);

      const baseline = await getPushQueuePublishedTotal();

      // Act 1 — exhaust the MESSAGING budget: send one more message than the
      // cap allows, rapidly, within one epoch-minute.
      const afterMessagingBurst = await expectPushEmitAfter(async () => {
        for (let i = 0; i < MESSAGING_PUSH_MAX_PER_MINUTE + 1; i++) {
          await sendMessageToRoom(
            roomId as string,
            `Budget-exhausting message ${i + 1}`,
            TestUser.GLOBAL_ADMIN
          );
        }
      }, MESSAGING_PUSH_MAX_PER_MINUTE);

      // Assert — exactly the cap's worth of pushes made it to the queue,
      // never the extra one (the budget is enforced, not merely present).
      expect(afterMessagingBurst.publishedTotal).toBe(
        baseline + MESSAGING_PUSH_MAX_PER_MINUTE
      );

      // Act 2 — with the MESSAGING budget now exhausted, drive the SHARED
      // (non-messaging) bucket for the SAME user up to its own full cap via
      // the pre-existing person-to-person message feature (a distinct
      // NotificationEvent.USER_MESSAGE path — NotificationPushAdapter routes
      // it through the shared throttle, never the messaging budget).
      const afterSharedBurst = await expectPushEmitAfter(async () => {
        for (let i = 0; i < SHARED_PUSH_MAX_PER_MINUTE; i++) {
          await sendMessageToUser(
            [recipientId],
            `Non-messaging push ${i + 1}`,
            TestUser.GLOBAL_ADMIN
          );
        }
      }, SHARED_PUSH_MAX_PER_MINUTE);

      // Assert — every one of those non-messaging pushes still made it to
      // the queue. This is the core US4-AS2 assertion (a non-messaging push
      // is never suppressed by messaging budget exhaustion) AND proves the
      // messaging burst above never touched the shared bucket (had it, the
      // shared bucket would already have been partially consumed and fewer
      // than SHARED_PUSH_MAX_PER_MINUTE of these would have gone through).
      expect(afterSharedBurst.publishedTotal).toBe(
        afterMessagingBurst.publishedTotal + SHARED_PUSH_MAX_PER_MINUTE
      );
    },
    120_000
  );
});
