/* eslint-disable @typescript-eslint/no-explicit-any */
// 034-messaging-notifications — User Story 5: never be told about messages I
// have already read. New coverage; nothing equivalent existed before Operator
// Ruling R4, because before R4 the notification was already gone by the time
// the user could read anything.
//
// The property under test (data-model.md §5.3): a flush re-derives its entries
// from the LIVE unread signal, and a track whose conversations are all read by
// fire time dispatches NOTHING. Cancellation, not postponement. That makes the
// negative assertions here the most safety-critical in the feature — and the
// easiest to fake. Every one of them waits `maxDelayGraceMs` for the track it
// names: the strongest bound the design offers (`max_delay + sweep + settle`),
// past which even a debounce that kept being reset must have fired. A shorter
// grace would prove only that nothing had arrived YET.
//
// Reading is driven through `markMessageAsReadInRoom` — the exact mutation the
// chat panel issues when a user opens a conversation with the tab focused — so
// this is the real read path, not a simulation of it.
//
// SCOPE — what this file does NOT cover. US5-AS2 (tab open but NOT focused =>
// treated as absent, digest still delivered) and US5-AS1's "reads as they
// arrive" walk are browser-state questions: they turn on whether the client
// advances the read receipt, which an API-only harness cannot observe or
// falsify. They belong to the client-web Playwright walk. Asserting them here
// by simply NOT calling the mutation would be a tautology — of course an
// unread conversation notifies — dressed up as focus handling. AS3 below is
// the API-observable half of AS3/AS1: once the receipt does advance, a
// subsequent message starts a genuinely fresh cycle.
import {
  delay,
  deleteMailSlurperMails,
  digestTestTimeoutMs,
  digestWindow,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { leaveConversation } from '@functional-api/communications/conversations/conversation.request.params';
import {
  createDirectConversation,
  createGroupConversation,
  getPushQueuePublishedTotal,
  markConversationRead,
  PushSubscriptionHandle,
  sendConversationMessage,
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  updateConversationMessagingSettings,
  waitForMailsCountAtLeast,
} from '../notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-messages-read-state',
};

// All four tracks matter here: US1-AS6 asserts silence on BOTH channels, so
// the grace period must outlast the slowest of the two direct tracks.
const directEmail = digestWindow('email', 'direct');
const directPush = digestWindow('push', 'direct');
const groupEmail = digestWindow('email', 'group');

/** Longest direct-track bound — the grace for "nothing on ANY channel". */
const directAnyChannelGraceMs = Math.max(
  directEmail.maxDelayGraceMs,
  directPush.maxDelayGraceMs
);

const recipient = () => TestUserManager.users.betaTester;
const RECIPIENT_ROLE = TestUser.GLOBAL_BETA_TESTER;

let pushSubscriptions: PushSubscriptionHandle[] = [];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  // Required precondition for every push assertion below — the adapter no-ops
  // for a recipient with zero active subscriptions, which would make "zero
  // push publishes" pass vacuously.
  pushSubscriptions = await subscribeRecipientsToPush([
    { userRole: RECIPIENT_ROLE, label: 'conv-messages-read-state-recipient' },
  ]);
  await updateConversationMessagingSettings(
    recipient().id,
    { direct: { email: true, push: true }, group: { email: true, push: true } },
    RECIPIENT_ROLE
  );
}, 300_000);

afterAll(async () => {
  await updateConversationMessagingSettings(
    recipient().id,
    { direct: { email: false, push: true }, group: { email: false, push: true } },
    RECIPIENT_ROLE
  );
  await unsubscribeRecipientsFromPush(pushSubscriptions);
}, 120_000);

describe('Conversation-message notifications — read state cancels the digest (US5)', () => {
  describe('US1-AS6 / SC-008: reading before the timer fires cancels every channel', () => {
    let roomId = '';

    beforeAll(async () => {
      const res = await createDirectConversation(
        recipient().agentId,
        TestUser.GLOBAL_ADMIN
      );
      roomId = res?.data?.createConversation?.room?.id ?? '';
      expect(roomId).toBeTruthy();

      // Zero the unread baseline: a DIRECT conversation is deduped per actor
      // pair and cannot be left, so it can carry unread messages from an
      // earlier run. An unrelated unread message would keep the digest alive
      // after this test reads its own, turning a real cancellation failure
      // into an indistinguishable pass/fail.
      const drainId = await sendConversationMessage(
        roomId,
        'Read-state baseline drain',
        TestUser.GLOBAL_ADMIN
      );
      await markConversationRead(roomId, drainId, RECIPIENT_ROLE);
      await delay(directAnyChannelGraceMs);
    }, digestTestTimeoutMs([directEmail, directPush], { cycles: 1 }));

    test(
      'send, read before the quiet period elapses, then zero emails AND zero push publishes',
      async () => {
        await deleteMailSlurperMails();
        const pushBaseline = await getPushQueuePublishedTotal();

        // Act 1 — A sends; both direct tracks are now armed for B.
        const messageId = await sendConversationMessage(
          roomId,
          'US1-AS6 message that B reads before the timer fires',
          TestUser.GLOBAL_ADMIN
        );

        // Act 2 — B reads it BEFORE either quiet period elapses. The probe
        // bound is the SHORTER of the two direct tracks (push, quiet 2s by
        // default), so the read genuinely beats both timers rather than only
        // the slower one.
        const readBeforeMs = Math.min(
          directPush.preFireProbeMs,
          directEmail.preFireProbeMs
        );
        await delay(Math.floor(readBeforeMs / 2));
        const marked = await markConversationRead(
          roomId,
          messageId,
          RECIPIENT_ROLE
        );
        expect(marked).toBe(true);

        // Assert — nothing, ever. Grace covers the LONGER of `email:direct`
        // and `push:direct` at their MAX-DELAY bound, so this is "no
        // notification will ever be produced", not "none has arrived yet".
        await delay(directAnyChannelGraceMs);

        const [, emailTotal] = await getMailsData();
        expect(emailTotal).toBe(0);

        const pushTotal = await getPushQueuePublishedTotal();
        expect(pushTotal - pushBaseline).toBe(0);
      },
      digestTestTimeoutMs([directEmail, directPush])
    );
  });

  describe('US5-AS4: reading two of three conversations leaves a digest naming only the third', () => {
    const groupIds: string[] = [];
    const rooms: { name: string; roomId: string }[] = [];

    beforeAll(async () => {
      // Three GROUP conversations rather than three direct ones: a group is
      // created fresh per run, so each starts with a genuinely zero unread
      // baseline and the "only the third" assertion cannot be polluted by a
      // previous run's backlog. All three share one `email:group` track.
      for (const name of [
        'Read State Group One',
        'Read State Group Two',
        'Read State Group Three',
      ]) {
        const res = await createGroupConversation(
          [recipient().agentId, TestUserManager.users.spaceMember.agentId],
          name,
          TestUser.GLOBAL_ADMIN
        );
        const roomId = res?.data?.createConversation?.room?.id ?? '';
        expect(roomId).toBeTruthy();
        rooms.push({ name, roomId });
        groupIds.push(res?.data?.createConversation?.id ?? '');
      }
    }, 180_000);

    afterAll(async () => {
      for (const id of groupIds) {
        if (id) await leaveConversation(id, TestUser.GLOBAL_ADMIN).catch(() => {});
      }
    }, 120_000);

    test(
      'the digest names only the unread conversation, with its count',
      async () => {
        await deleteMailSlurperMails();

        // Act 1 — unread in all three, inside one group-email quiet period.
        const messageIds: string[] = [];
        for (const { name, roomId } of rooms) {
          messageIds.push(
            await sendConversationMessage(
              roomId,
              `Message in ${name}`,
              TestUser.GLOBAL_ADMIN
            )
          );
        }

        // Act 2 — B reads the first two before the group timer fires.
        await delay(Math.floor(groupEmail.preFireProbeMs / 2));
        await markConversationRead(
          rooms[0].roomId,
          messageIds[0],
          RECIPIENT_ROLE
        );
        await markConversationRead(
          rooms[1].roomId,
          messageIds[1],
          RECIPIENT_ROLE
        );

        // Assert — exactly one email, and it names ONLY the third group.
        // Poll bound covers `email:group` quiet + sweep + settle.
        const [, total] = await waitForMailsCountAtLeast(1, {
          timeout: groupEmail.quietGraceMs,
        });
        expect(total).toBe(1);

        // Settle a full `email:group` max-delay bound before asserting the
        // count is exactly one — a build that dispatched per conversation
        // rather than per track would land the other two in this stretch.
        await delay(groupEmail.maxDelayGraceMs);
        const [mailItems, settledTotal] = await getMailsData();
        expect(settledTotal).toBe(1);

        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(recipient().email)
        );
        expect(mail).toBeDefined();
        expect(mail.body).toContain(rooms[2].name);
        // The read ones are absent — the fire-time unread check dropped them.
        expect(mail.body).not.toContain(rooms[0].name);
        expect(mail.body).not.toContain(rooms[1].name);
      },
      digestTestTimeoutMs(groupEmail)
    );
  });

  describe('US5-AS3: reading AFTER a digest was dispatched starts a fresh cycle', () => {
    let roomId = '';
    let groupId = '';
    const groupName = 'Read State Fresh Cycle';

    beforeAll(async () => {
      const res = await createGroupConversation(
        [recipient().agentId, TestUserManager.users.spaceMember.agentId],
        groupName,
        TestUser.GLOBAL_ADMIN
      );
      roomId = res?.data?.createConversation?.room?.id ?? '';
      groupId = res?.data?.createConversation?.id ?? '';
      expect(roomId).toBeTruthy();
    }, 120_000);

    afterAll(async () => {
      if (groupId) {
        await leaveConversation(groupId, TestUser.GLOBAL_ADMIN).catch(() => {});
      }
    }, 120_000);

    test(
      'a message after the read receipt advances produces a NEW digest',
      async () => {
        await deleteMailSlurperMails();

        // Act 1 — B is away; the first digest is dispatched.
        const firstMessageId = await sendConversationMessage(
          roomId,
          'US5-AS3 message while B is away',
          TestUser.GLOBAL_ADMIN
        );
        const [, firstTotal] = await waitForMailsCountAtLeast(1, {
          timeout: groupEmail.quietGraceMs,
        });
        expect(firstTotal).toBe(1);

        // Act 2 — B returns and reads. The track is already drained, so this
        // must not itself produce anything...
        await markConversationRead(roomId, firstMessageId, RECIPIENT_ROLE);
        await delay(groupEmail.quietGraceMs);
        const [, totalAfterRead] = await getMailsData();
        expect(totalAfterRead).toBe(1);

        // Act 3 — ...and a subsequent message starts a genuinely fresh cycle
        // rather than being swallowed as "already notified about".
        await sendConversationMessage(
          roomId,
          'US5-AS3 message after B caught up',
          TestUser.GLOBAL_ADMIN
        );
        const [mailItems, secondTotal] = await waitForMailsCountAtLeast(2, {
          timeout: groupEmail.quietGraceMs,
        });
        expect(secondTotal).toBe(2);
        expect(
          mailItems.filter((m: any) =>
            m.toAddresses?.includes(recipient().email)
          ).length
        ).toBe(2);
      },
      digestTestTimeoutMs(groupEmail, { cycles: 4 })
    );
  });
});
