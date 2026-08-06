/* eslint-disable @typescript-eslint/no-explicit-any */
// 034-messaging-notifications — US4-AS2 / FR-012: a messaging digest push never
// decrements the SHARED (non-messaging) push throttle bucket.
//
// Replaces messaging-budget-independence.it-spec.ts, deleted by Operator
// Ruling R4. That spec exercised two per-minute budgets — the messaging push
// budget (D-9) and the messaging email budget (sec-server-10) — both of which
// R4 removed outright (D-21). Volume is now bounded structurally instead: a
// track can dispatch at most `3600 / max_delay_seconds` times per recipient
// per hour no matter how much traffic arrives (data-model.md §5.5), so there
// is no counter left to exhaust and nothing for a burst to race.
//
// The deleted spec's `waitForFreshEpochMinute()` — up to a 60s sleep, taken
// against a hard-coded 120s test timeout, purely to stop a burst straddling an
// epoch-minute boundary — is precisely the fragility R4 removes. Nothing here
// needs epoch alignment, because the messaging side no longer has a per-minute
// counter at all. What remains to prove is the ONE direction that still
// matters: messaging traffic must not eat into the shared bucket that carries
// every OTHER notification for the same user.
//
// SCOPE — what this proves and what it does not. Two exact publish deltas: the
// messaging digest publishes, and a non-messaging push for the SAME user
// immediately afterwards still publishes. That falsifies the regression of
// concern (messaging routed through, and decrementing, the shared throttle).
// It does NOT re-derive the shared throttle's own cap behaviour, which is the
// pre-existing PushThrottleService's concern and is covered by its own
// server-side tests — including the D-7 epoch-minute-suffixed key fix. Do not
// widen this spec into a cap test; that is what reintroduces the epoch
// alignment R4 just removed.
//
// Location note (sec-test-suites-2): this spec lives in
// notifications/messaging/ so it is picked up ONLY by the explicitly-invoked
// `notifications-messaging` vitest project — the `nightly` project's
// push-notifications glob does not reach this directory, and this file's
// RabbitMQ-management dependency is not provisioned in the nightly CI job.
import {
  delay,
  digestTestTimeoutMs,
  digestWindow,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToUser } from '@functional-api/communications/communication.params';
import {
  createDirectConversation,
  getPushQueuePublishedTotal,
  markConversationRead,
  PushSubscriptionHandle,
  sendConversationMessage,
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  updateConversationMessagingSettings,
} from '../notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'messaging-shared-push-throttle-independence',
};

const directPush = digestWindow('push', 'direct');

// A persona no other messaging spec drives push for, so the publish deltas
// asserted below are attributable to this test alone.
const recipient = () => TestUserManager.users.subsubspaceMember;
const RECIPIENT_ROLE = TestUser.SUBSUBSPACE_MEMBER;

let pushSubscriptions: PushSubscriptionHandle[] = [];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  // Required precondition: the push adapter no-ops for a recipient with zero
  // active subscriptions, which would make every delta below a vacuous zero.
  pushSubscriptions = await subscribeRecipientsToPush([
    { userRole: RECIPIENT_ROLE, label: 'messaging-shared-throttle' },
  ]);
  // Push on for direct (the mandated default, set explicitly so the test does
  // not silently depend on another spec having left it alone); email off, so
  // the mailbox plays no part here.
  await updateConversationMessagingSettings(
    recipient().id,
    { direct: { email: false, push: true } },
    RECIPIENT_ROLE
  );
}, 300_000);

afterAll(async () => {
  await unsubscribeRecipientsFromPush(pushSubscriptions);
}, 120_000);

describe('Messaging digests never decrement the shared push throttle (US4-AS2, FR-012)', () => {
  let roomId = '';

  beforeAll(async () => {
    const res = await createDirectConversation(
      recipient().agentId,
      TestUser.GLOBAL_ADMIN
    );
    roomId = res?.data?.createConversation?.room?.id ?? '';
    expect(roomId).toBeTruthy();

    // Zero the unread baseline — a DIRECT conversation is deduped per actor
    // pair and cannot be left, so it can carry a previous run's backlog, and a
    // digest is only produced for conversations that are still unread at fire
    // time.
    const drainId = await sendConversationMessage(
      roomId,
      'Shared-throttle baseline drain',
      TestUser.GLOBAL_ADMIN
    );
    await markConversationRead(roomId, drainId, RECIPIENT_ROLE);
    await delay(directPush.maxDelayGraceMs);
  }, digestTestTimeoutMs(directPush, { cycles: 1 }));

  test(
    'after a messaging digest push, a non-messaging push for the same user still publishes',
    async () => {
      // Act 1 — arm and flush the recipient's `push:direct` track.
      const messagingBaseline = await getPushQueuePublishedTotal();
      await sendConversationMessage(
        roomId,
        'Message that produces a digest push',
        TestUser.GLOBAL_ADMIN
      );

      // Wait for the DIGEST, not for the message: grace covers `push:direct`
      // quiet + sweep + settle. A shorter wait here would read zero and
      // mistake the debounce for a suppressed push.
      await delay(directPush.quietGraceMs);
      const afterMessaging = await getPushQueuePublishedTotal();
      // Exactly one publish for the whole thing — the digest.
      expect(afterMessaging - messagingBaseline).toBe(1);

      // Act 2 — immediately drive a NON-messaging push for the SAME user, on
      // the pre-existing person-to-person path (NotificationEvent.USER_MESSAGE),
      // which the push adapter routes through the shared throttle. No epoch
      // alignment: the messaging side has no per-minute counter to align with.
      const sharedBaseline = await getPushQueuePublishedTotal();
      await sendMessageToUser(
        [recipient().id],
        'Non-messaging notification for the same user',
        TestUser.GLOBAL_ADMIN
      );
      await delay(directPush.settleMs);

      // Assert — it published. Had the digest been routed through the shared
      // bucket (the regression of concern), this user's shared allowance would
      // already have been partly consumed by messaging traffic they never
      // asked to be counted against their other notifications.
      const afterShared = await getPushQueuePublishedTotal();
      expect(afterShared - sharedBaseline).toBe(1);
    },
    digestTestTimeoutMs(directPush)
  );
});
