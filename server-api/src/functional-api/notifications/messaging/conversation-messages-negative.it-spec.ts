/* eslint-disable @typescript-eslint/no-explicit-any */
// 034-messaging-notifications — negative matrix (risk R-4).
//
// Covers: non-member receives nothing (US2-AS3), a removed former member
// receives nothing once membership is re-read at send time (US2-AS4), the
// sender is never notified of their own message (US1-AS4), and a disabled
// channel produces zero emits for that channel while others proceed
// (US2-AS5). US4-AS1 (VC/guidance-bot sender) is addressed separately below
// — see the rationale on the skipped test.
import {
  delay,
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import {
  leaveConversation,
  removeConversationMember,
} from '@functional-api/communications/conversations/conversation.request.params';
import {
  createDirectConversation,
  createGroupConversation,
  expectExactMailsAfter,
  expectNoPushEmitAfter,
  expectPushEmitAfter,
  getPushQueuePublishedTotal,
  PushSubscriptionHandle,
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  updateConversationMessagingSettings,
  waitForMailsCountAtLeast,
} from '../notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-messages-negative',
};

const toAddressesOf = (mailItems: any[]) =>
  mailItems.flatMap(item => item.toAddresses ?? []);

let pushSubscriptions: PushSubscriptionHandle[] = [];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  // Required precondition for the push-emit assertion in the "disabled
  // channel" describe below: the adapter no-ops for a recipient with zero
  // active subscriptions.
  pushSubscriptions = await subscribeRecipientsToPush([
    { userRole: TestUser.SPACE_MEMBER, label: 'conv-messages-negative-member' },
    { userRole: TestUser.SPACE_ADMIN, label: 'conv-messages-negative-admin' },
  ]);
});

afterAll(async () => {
  await unsubscribeRecipientsFromPush(pushSubscriptions);
});

beforeEach(async () => {
  await deleteMailSlurperMails();
});

describe('Conversation-message notifications — negative matrix', () => {
  describe('Non-member never receives anything, even with the channel enabled (US2-AS3)', () => {
    let conversationId = '';

    afterAll(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
      }
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { group: { email: false } },
        TestUser.SPACE_MEMBER
      );
      await updateConversationMessagingSettings(
        TestUserManager.users.nonSpaceMember.id,
        { group: { email: false } },
        TestUser.NON_SPACE_MEMBER
      );
    });

    test('D (never invited) receives nothing while B (a real member) does', async () => {
      // Arrange — B is a member; D is NOT invited to this conversation, yet
      // still has the channel enabled (proves absence is membership-driven,
      // not merely "D never opted in").
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { group: { email: true } },
        TestUser.SPACE_MEMBER
      );
      await updateConversationMessagingSettings(
        TestUserManager.users.nonSpaceMember.id,
        { group: { email: true } },
        TestUser.NON_SPACE_MEMBER
      );

      const conversationRes = await createGroupConversation(
        [TestUserManager.users.spaceMember.agentId],
        'Negative Matrix - Non-Member',
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // Act — settle + re-read (not just first-hit) so a leaked email to D
      // arriving moments after B's is not missed (corr-test-suites-7).
      const [mailItems, total] = await expectExactMailsAfter(
        () =>
          sendMessageToRoom(roomId as string, 'Hello group', TestUser.GLOBAL_ADMIN),
        1
      );

      // Assert
      expect(total).toBe(1);
      expect(toAddressesOf(mailItems)).toContain(
        TestUserManager.users.spaceMember.email
      );
      expect(toAddressesOf(mailItems)).not.toContain(
        TestUserManager.users.nonSpaceMember.email
      );
    });
  });

  describe('Removed member stops receiving — membership re-read at send time (US2-AS4)', () => {
    let conversationId = '';

    afterAll(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
      }
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceAdmin.id,
        { group: { email: false } },
        TestUser.SPACE_ADMIN
      );
    });

    test('C receives one email while a member, zero more once removed', async () => {
      // Arrange — only C has email enabled, to isolate the assertion to C's mailbox.
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceAdmin.id,
        { group: { email: true } },
        TestUser.SPACE_ADMIN
      );

      const conversationRes = await createGroupConversation(
        [
          TestUserManager.users.spaceMember.agentId,
          TestUserManager.users.spaceAdmin.agentId,
        ],
        'Negative Matrix - Removed Member',
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // Act 1 — while C is still a member
      await sendMessageToRoom(
        roomId as string,
        'Message while C is a member',
        TestUser.GLOBAL_ADMIN
      );
      const [, totalWhileMember] = await waitForMailsCountAtLeast(1);
      expect(totalWhileMember).toBe(1);
      expect(
        toAddressesOf((await getMailsData())[0])
      ).toContain(TestUserManager.users.spaceAdmin.email);

      // Act 2 — remove C (admin action, not a voluntary leave), then send again.
      // Membership removal dispatches to Matrix and is applied asynchronously
      // (room.member.updated -> conversation_membership) — give it a moment
      // to land before the second message, matching the eventual-consistency
      // pattern used elsewhere in this suite (conversations.it-spec.ts).
      await removeConversationMember(
        conversationId,
        TestUserManager.users.spaceAdmin.agentId,
        TestUser.GLOBAL_ADMIN
      );
      await delay(3_000);

      // C still has an active push subscription (beforeAll) and group push
      // at its default ON — assert the PUSH channel too (qual-test-suites
      // -r2-2), not only email, so a membership-re-read regression that
      // affects only the push path (e.g. a stale cached recipient list)
      // isn't invisible to this test.
      const pushBaselineAfterRemoval = await getPushQueuePublishedTotal();
      const pushStatsAfterRemoval = await expectNoPushEmitAfter(
        () =>
          sendMessageToRoom(
            roomId as string,
            'Message after C left',
            TestUser.GLOBAL_ADMIN
          ),
        5_000 // grace period — nothing SHOULD arrive for C
      );
      expect(pushStatsAfterRemoval.publishedTotal - pushBaselineAfterRemoval).toBe(
        0
      );

      // Assert — no NEW email for C (mail count unchanged from step 1)
      const [, totalAfterRemoval] = await getMailsData();
      expect(totalAfterRemoval).toBe(totalWhileMember);
    });
  });

  describe('Sender never notified of their own message (US1-AS4)', () => {
    // Recipient is subspaceAdmin (NOT spaceMember): the recipient's direct
    // channel defaults to OFF, so without ALSO enabling it here there would
    // be zero emails to assert on at all (an unsatisfiable assertion, not a
    // self-exclusion proof). Using a persona distinct from the "Email
    // opt-in"/"Hostile message" describes elsewhere in this matrix also
    // avoids colliding with their (globalAdmin, spaceMember/subspaceMember)
    // DIRECT conversations, which dedupe per actor pair.
    let conversationId = '';

    afterAll(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
      }
      await updateConversationMessagingSettings(
        TestUserManager.users.globalAdmin.id,
        { direct: { email: false } },
        TestUser.GLOBAL_ADMIN
      );
      await updateConversationMessagingSettings(
        TestUserManager.users.subspaceAdmin.id,
        { direct: { email: false } },
        TestUser.SUBSPACE_ADMIN
      );
    });

    test('A (sender, email enabled) never appears as an email recipient', async () => {
      // Arrange — BOTH the sender (A, self-exclusion under test) and the
      // recipient (B) have the channel enabled: exactly one email is
      // expected (B's), and if self-exclusion ever regressed, A would
      // appear alongside it in `toAddresses` below.
      await updateConversationMessagingSettings(
        TestUserManager.users.globalAdmin.id,
        { direct: { email: true } },
        TestUser.GLOBAL_ADMIN
      );
      await updateConversationMessagingSettings(
        TestUserManager.users.subspaceAdmin.id,
        { direct: { email: true } },
        TestUser.SUBSPACE_ADMIN
      );

      const conversationRes = await createDirectConversation(
        TestUserManager.users.subspaceAdmin.agentId,
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // Act — settle + re-read so a late, erroneous email to A (self-notify
      // regression) arriving after B's is not missed (corr-test-suites-7).
      const [mailItems, total] = await expectExactMailsAfter(
        () => sendMessageToRoom(roomId as string, 'Hello!', TestUser.GLOBAL_ADMIN),
        1
      );

      // Assert — exactly B's email, and A never appears as a recipient.
      expect(total).toBe(1);
      expect(toAddressesOf(mailItems)).toContain(
        TestUserManager.users.subspaceAdmin.email
      );
      expect(toAddressesOf(mailItems)).not.toContain(
        TestUserManager.users.globalAdmin.email
      );
    });
  });

  describe('A disabled channel produces zero emits for that channel while others proceed (US2-AS5)', () => {
    let conversationId = '';

    afterAll(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
      }
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { group: { push: true } }, // restore the mandated default
        TestUser.SPACE_MEMBER
      );
    });

    test('B (push disabled) gets no push while C (default) still does', async () => {
      // Arrange
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { group: { push: false } },
        TestUser.SPACE_MEMBER
      );

      const conversationRes = await createGroupConversation(
        [
          TestUserManager.users.spaceMember.agentId,
          TestUserManager.users.spaceAdmin.agentId,
        ],
        'Negative Matrix - Disabled Push',
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // Act — with B disabled, only C (default push ON) can produce a push
      // emit; the exact +1 delta (rather than +2) IS the proof B got none.
      const { delta } = await expectPushEmitAfter(
        () => sendMessageToRoom(roomId as string, 'Hello group', TestUser.GLOBAL_ADMIN),
        1
      );

      // Assert — EXACT equality: a delta of 2 would mean B's disabled push
      // leaked through too, which `>=` would have silently let pass.
      expect(delta).toBe(1);
    });
  });

  test.skip(
    'VC/guidance-bot sender produces zero notifications (US4-AS1) — delegated, not fabricated here',
    () => {
      // Rationale for skipping rather than fabricating a synthetic pass:
      // Triggering a REAL virtual-contributor reply requires the VC engine
      // round trip (server -> virtual-contributor-engine-*), which is not
      // part of this feature's verification stack (repos.yaml
      // forge.verification.stack.services lists only server, notifications
      // and client-web + Postgres/Redis/RabbitMQ/Kratos/Mailslurper — no VC
      // engine). Without the real engine, "the human sends a message and we
      // wait for a VC reply that never arrives" would pass vacuously (zero
      // notifications observed because no VC message was ever produced, not
      // because the sender guard fired) — a false-confidence test.
      // Coverage for this scenario lives at:
      //  - server unit level: conversation.notification.service.spec.ts
      //    ("produces zero notifications for a VIRTUAL_CONTRIBUTOR sender").
      //  - acceptance level: repos.yaml verification.tracks[type=acceptance]
      //    US4-AS1, using the platform's real guidance-bot conversation.
    }
  );
});
