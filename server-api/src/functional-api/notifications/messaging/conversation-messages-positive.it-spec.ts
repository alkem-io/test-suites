/* eslint-disable @typescript-eslint/no-explicit-any */
// 034-messaging-notifications — positive matrix (US1/US2, SC-004).
//
// Push is verified at the EMIT/queue-count boundary only (Operator Ruling
// 3c) — a single-replica live consumer drains `alkemio-push-notifications`
// near-instantly, so peeking at message bodies would race the real
// consumer. Exact push payload content (sender name, no message text, the
// `/?chat=` url) is a server-side unit-test concern (contract C-4). Email,
// by contrast, lands in Mailslurper — a real sink, not a competing consumer
// — so email content (subject, body, deep link, footer, hostile-content
// safety) IS asserted here directly.
//
// Legacy-room dynamic classification (US4-AS3) is NOT exercised here: every
// conversation reachable through the public API is created with an explicit
// `ConversationCreationType` (DIRECT/GROUP), so an untyped legacy
// `RoomType.CONVERSATION` room cannot be produced from a black-box,
// API-only harness (test-suites has no DB access). That case is covered by
// server unit tests + it-specs (server:T010) per repos.yaml's own
// acceptance-track delegation for US4-AS3.
import {
  deleteMailSlurperMails,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { leaveConversation } from '@functional-api/communications/conversations/conversation.request.params';
import {
  conversationMessageDirectSubject,
  conversationMessageGroupSubject,
  createDirectConversation,
  createGroupConversation,
  expectExactMailsAfter,
  expectPushEmitAfter,
  PushSubscriptionHandle,
  subscribeRecipientsToPush,
  unsubscribeRecipientsFromPush,
  updateConversationMessagingSettings,
} from '../notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-messages-positive',
};

let pushSubscriptions: PushSubscriptionHandle[] = [];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  // Required precondition for the push-emit assertions below: the adapter
  // no-ops for a recipient with zero active subscriptions.
  pushSubscriptions = await subscribeRecipientsToPush([
    { userRole: TestUser.SPACE_MEMBER, label: 'conv-messages-positive-member' },
    { userRole: TestUser.SPACE_ADMIN, label: 'conv-messages-positive-admin' },
  ]);
});

afterAll(async () => {
  await unsubscribeRecipientsFromPush(pushSubscriptions);
});

beforeEach(async () => {
  await deleteMailSlurperMails();
});

describe('Conversation-message notifications — positive matrix', () => {
  describe('Default settings: push only, no email', () => {
    let conversationId = '';

    afterEach(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
        conversationId = '';
      }
    });

    test('direct message produces a push emit for the recipient and no email (US1-AS1)', async () => {
      const conversationRes = await createDirectConversation(
        TestUserManager.users.spaceMember.agentId,
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      const { delta } = await expectPushEmitAfter(
        () =>
          sendMessageToRoom(roomId as string, 'Hello!', TestUser.GLOBAL_ADMIN),
        1
      );

      expect(delta).toBe(1);
      const [, emailTotal] = await getMailsData();
      expect(emailTotal).toBe(0);
    });

    test('group message produces one push emit per non-sender member and no email (US2-AS1)', async () => {
      const conversationRes = await createGroupConversation(
        [
          TestUserManager.users.spaceMember.agentId,
          TestUserManager.users.spaceAdmin.agentId,
        ],
        'Positive Matrix - Group Defaults',
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // 2 non-sender members (spaceMember + spaceAdmin) => +2 push publishes.
      const { delta } = await expectPushEmitAfter(
        () =>
          sendMessageToRoom(
            roomId as string,
            'Hello group!',
            TestUser.GLOBAL_ADMIN
          ),
        2
      );

      expect(delta).toBe(2);
      const [, emailTotal] = await getMailsData();
      expect(emailTotal).toBe(0);
    });
  });

  describe('Email opt-in (US1-AS2, US2-AS2)', () => {
    let conversationId = '';

    afterEach(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
        conversationId = '';
      }
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { direct: { email: false }, group: { email: false } },
        TestUser.SPACE_MEMBER
      );
    });

    test('direct message: exactly one email naming the sender, no message text, deep link + settings footer', async () => {
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { direct: { email: true } },
        TestUser.SPACE_MEMBER
      );

      const conversationRes = await createDirectConversation(
        TestUserManager.users.spaceMember.agentId,
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // Settle + re-read (not just first-hit) so a leaked second email would
      // not be missed by an "exactly one" assertion (corr-test-suites-7).
      const [mailItems, total] = await expectExactMailsAfter(
        () =>
          sendMessageToRoom(
            roomId as string,
            'Hello, opted-in!',
            TestUser.GLOBAL_ADMIN
          ),
        1
      );
      expect(total).toBe(1);

      const mail = mailItems.find((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.spaceMember.email)
      );
      expect(mail).toBeDefined();
      expect(mail.subject).toBe(
        conversationMessageDirectSubject(
          TestUserManager.users.globalAdmin.displayName
        )
      );
      expect(mail.body).not.toContain('Hello, opted-in!');
      expect(mail.body).toContain(`/?chat=${conversationId}`);
      expect(mail.body).toContain('/settings/notifications');
    });

    test('group message: exactly one email naming sender + conversation, no message text, deep link', async () => {
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { group: { email: true } },
        TestUser.SPACE_MEMBER
      );

      const conversationRes = await createGroupConversation(
        [
          TestUserManager.users.spaceMember.agentId,
          TestUserManager.users.spaceAdmin.agentId,
        ],
        'Positive Matrix - Group Email',
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      // Only spaceMember opted in for the group row; spaceAdmin stayed
      // default. Settle + re-read so a leak to spaceAdmin isn't missed.
      const [mailItems, total] = await expectExactMailsAfter(
        () =>
          sendMessageToRoom(
            roomId as string,
            'Hello group, opted-in!',
            TestUser.GLOBAL_ADMIN
          ),
        1
      );
      expect(total).toBe(1);

      const mail = mailItems.find((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.spaceMember.email)
      );
      expect(mail).toBeDefined();
      expect(mail.subject).toBe(
        conversationMessageGroupSubject(
          TestUserManager.users.globalAdmin.displayName,
          'Positive Matrix - Group Email'
        )
      );
      expect(mail.body).not.toContain('Hello group, opted-in!');
      expect(mail.body).toContain(`/?chat=${conversationId}`);
    });
  });

  describe('Hostile message content never leaks into email (US1-AS5, SC-004)', () => {
    // Deliberately a DIFFERENT recipient than the "Email opt-in" describe
    // above (subspaceMember, not spaceMember): DIRECT conversations dedupe
    // per (creator, other-actor) pair (messaging.service.ts
    // findConversationBetweenActors), so reusing (globalAdmin, spaceMember)
    // here would risk landing this message on the SAME conversation the
    // "Email opt-in" test just emailed on, inside its still-open per
    // (recipient, conversation) suppression window (300s default) — an
    // order/timing-dependent false failure, not a real regression.
    let conversationId = '';
    const hostileMessage =
      'Say "hi" to <script>alert(1)</script>\nline two <b>bold</b> & "quoted"';

    afterEach(async () => {
      if (conversationId) {
        await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
          () => {}
        );
        conversationId = '';
      }
      await updateConversationMessagingSettings(
        TestUserManager.users.subspaceMember.id,
        { direct: { email: false } },
        TestUser.SUBSPACE_MEMBER
      );
    });

    test('subject and body contain none of the message-derived text', async () => {
      await updateConversationMessagingSettings(
        TestUserManager.users.subspaceMember.id,
        { direct: { email: true } },
        TestUser.SUBSPACE_MEMBER
      );

      const conversationRes = await createDirectConversation(
        TestUserManager.users.subspaceMember.agentId,
        TestUser.GLOBAL_ADMIN
      );
      conversationId = conversationRes?.data?.createConversation?.id ?? '';
      const roomId = conversationRes?.data?.createConversation?.room?.id;
      expect(roomId).toBeDefined();

      const [mailItems, total] = await expectExactMailsAfter(
        () =>
          sendMessageToRoom(roomId as string, hostileMessage, TestUser.GLOBAL_ADMIN),
        1
      );
      expect(total).toBe(1);

      const mail = mailItems.find((m: any) =>
        m.toAddresses?.includes(TestUserManager.users.subspaceMember.email)
      );
      expect(mail).toBeDefined();
      expect(mail.subject).toBe(
        conversationMessageDirectSubject(
          TestUserManager.users.globalAdmin.displayName
        )
      );
      expect(mail.subject).not.toContain('script');
      expect(mail.body).not.toContain('<script>alert(1)</script>');
      expect(mail.body).not.toContain('line two');
      expect(mail.body).not.toContain('quoted');
    });
  });
});
