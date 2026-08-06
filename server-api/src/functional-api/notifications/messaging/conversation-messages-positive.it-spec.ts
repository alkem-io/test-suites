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
// TIMING (Operator Ruling R4) — nothing here is sent on message arrival any
// more. Each channel is debounced on its own per-(recipient, channel, kind)
// track and dispatched by a sweep once the track's quiet period has elapsed,
// so every wait below is derived from `digestWindow(...)` rather than written
// as a literal. Note in particular that the "and no email" halves of the
// default-settings scenarios are NEGATIVE assertions: they wait out the
// relevant EMAIL track's max-delay bound, not merely the push track's quiet
// period, or they would pass simply because the email had not been dispatched
// yet.
//
// Legacy-room dynamic classification (US4-AS3) is NOT exercised here: every
// conversation reachable through the public API is created with an explicit
// `ConversationCreationType` (DIRECT/GROUP), so an untyped legacy
// `RoomType.CONVERSATION` room cannot be produced from a black-box,
// API-only harness (test-suites has no DB access). That case is covered by
// server unit tests + it-specs (server:T010) per repos.yaml's own
// acceptance-track delegation for US4-AS3.
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

// The four R4 tracks this matrix waits on. `digestWindow` reads the same env
// vars the server does and falls back to the PRODUCTION defaults when unset.
const directPush = digestWindow('push', 'direct');
const directEmail = digestWindow('email', 'direct');
const groupPush = digestWindow('push', 'group');
const groupEmail = digestWindow('email', 'group');

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

    test(
      'direct message produces a push emit for the recipient and no email (US1-AS1)',
      async () => {
        const conversationRes = await createDirectConversation(
          TestUserManager.users.spaceMember.agentId,
          TestUser.GLOBAL_ADMIN
        );
        conversationId = conversationRes?.data?.createConversation?.id ?? '';
        const roomId = conversationRes?.data?.createConversation?.room?.id;
        expect(roomId).toBeDefined();

        // Positive half — poll for the digest push. Bound covers `push:direct`
        // quiet + sweep + settle; the settle then gives a leaked second
        // publish a chance to show up before the exact-equality assertion.
        const { delta } = await expectPushEmitAfter(
          () =>
            sendMessageToRoom(roomId as string, 'Hello!', TestUser.GLOBAL_ADMIN),
          1,
          { timeout: directPush.quietGraceMs, settleMs: directPush.settleMs }
        );
        expect(delta).toBe(1);

        // Negative half — "no email" must outlast the EMAIL track, which is
        // far slower than the push one. Grace covers `email:direct` at its
        // max-delay bound, measured from the send; the push wait above has
        // already consumed part of it, so this sleeps the remainder.
        await delay(directEmail.maxDelayGraceMs);
        const [, emailTotal] = await getMailsData();
        expect(emailTotal).toBe(0);
      },
      digestTestTimeoutMs([directPush, directEmail])
    );

    test(
      'group message produces one push emit per non-sender member and no email (US2-AS1)',
      async () => {
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
        // Each recipient has their OWN `push:group` track, but both were armed
        // by the same message, so both flush within one quiet period.
        const { delta } = await expectPushEmitAfter(
          () =>
            sendMessageToRoom(
              roomId as string,
              'Hello group!',
              TestUser.GLOBAL_ADMIN
            ),
          2,
          { timeout: groupPush.quietGraceMs, settleMs: groupPush.settleMs }
        );
        expect(delta).toBe(2);

        // Negative half — grace covers `email:group` at its max-delay bound,
        // the slowest of the four tracks.
        await delay(groupEmail.maxDelayGraceMs);
        const [, emailTotal] = await getMailsData();
        expect(emailTotal).toBe(0);
      },
      digestTestTimeoutMs([groupPush, groupEmail])
    );
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

    test(
      'direct message: exactly one email naming the sender, no message text, deep link + settings footer',
      async () => {
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

        // Poll bound covers `email:direct` quiet + sweep + settle; the settle
        // then runs to that track's MAX-DELAY bound so a leaked second email
        // cannot slip past the "exactly one" assertion (corr-test-suites-7).
        const [mailItems, total] = await expectExactMailsAfter(
          () =>
            sendMessageToRoom(
              roomId as string,
              'Hello, opted-in!',
              TestUser.GLOBAL_ADMIN
            ),
          1,
          {
            timeout: directEmail.quietGraceMs,
            settleMs: directEmail.maxDelayGraceMs,
          }
        );
        expect(total).toBe(1);

        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(TestUserManager.users.spaceMember.email)
        );
        expect(mail).toBeDefined();
        // Single entry, single message — the R4 digest renders this case
        // identically to the pre-R4 single-message email (data-model 9.1).
        expect(mail.subject).toBe(
          conversationMessageDirectSubject(
            TestUserManager.users.globalAdmin.displayName,
            1
          )
        );
        expect(mail.body).not.toContain('Hello, opted-in!');
        expect(mail.body).toContain(`/?chat=${conversationId}`);
        expect(mail.body).toContain('/settings/notifications');
      },
      digestTestTimeoutMs(directEmail)
    );

    test(
      'group message: exactly one email naming the conversation, no message text, deep link',
      async () => {
        await updateConversationMessagingSettings(
          TestUserManager.users.spaceMember.id,
          { group: { email: true } },
          TestUser.SPACE_MEMBER
        );

        const groupName = 'Positive Matrix - Group Email';
        const conversationRes = await createGroupConversation(
          [
            TestUserManager.users.spaceMember.agentId,
            TestUserManager.users.spaceAdmin.agentId,
          ],
          groupName,
          TestUser.GLOBAL_ADMIN
        );
        conversationId = conversationRes?.data?.createConversation?.id ?? '';
        const roomId = conversationRes?.data?.createConversation?.room?.id;
        expect(roomId).toBeDefined();

        // Only spaceMember opted in for the group row; spaceAdmin stayed
        // default. Poll bound covers `email:group` quiet + sweep + settle; the
        // settle runs to that track's MAX-DELAY bound so a leak to spaceAdmin
        // cannot land after the count is read.
        const [mailItems, total] = await expectExactMailsAfter(
          () =>
            sendMessageToRoom(
              roomId as string,
              'Hello group, opted-in!',
              TestUser.GLOBAL_ADMIN
            ),
          1,
          {
            timeout: groupEmail.quietGraceMs,
            settleMs: groupEmail.maxDelayGraceMs,
          }
        );
        expect(total).toBe(1);

        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(TestUserManager.users.spaceMember.email)
        );
        expect(mail).toBeDefined();
        // R4 group digests report CONVERSATIONS, not senders — there is no
        // single sender to name once a digest can span several (data-model
        // 9.1). This is a deliberate copy change from the pre-R4 subject.
        expect(mail.subject).toBe(conversationMessageGroupSubject(groupName, 1));
        expect(mail.body).not.toContain('Hello group, opted-in!');
        expect(mail.body).toContain(`/?chat=${conversationId}`);
      },
      digestTestTimeoutMs(groupEmail)
    );
  });

  describe('Hostile message content never leaks into email (US1-AS5, SC-004)', () => {
    // Deliberately a DIFFERENT recipient than the "Email opt-in" describe
    // above (subspaceMember, not spaceMember). The pre-R4 reason was the
    // per-(recipient, conversation) suppression window, which R4 deleted; the
    // reason that REPLACES it is stronger, not weaker. R4 debounces per
    // RECIPIENT track, so reusing spaceMember here would let this message join
    // the opt-in test's still-pending direct-email digest — producing one
    // email listing two entries, and an assertion about "the" subject that is
    // about the wrong shape entirely. A separate recipient gives this scenario
    // its own track.
    //
    // Separately: the recipient here has no unread backlog to clear, because
    // subspaceMember's direct-email channel is off outside this test, so no
    // earlier digest could have been armed for them.
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

    test(
      'subject and body contain none of the message-derived text',
      async () => {
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

        // Poll bound covers `email:direct` quiet + sweep + settle.
        const [mailItems, total] = await expectExactMailsAfter(
          () =>
            sendMessageToRoom(
              roomId as string,
              hostileMessage,
              TestUser.GLOBAL_ADMIN
            ),
          1,
          {
            timeout: directEmail.quietGraceMs,
            settleMs: directEmail.settleMs,
          }
        );
        expect(total).toBe(1);

        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(TestUserManager.users.subspaceMember.email)
        );
        expect(mail).toBeDefined();
        expect(mail.subject).toBe(
          conversationMessageDirectSubject(
            TestUserManager.users.globalAdmin.displayName,
            1
          )
        );
        expect(mail.subject).not.toContain('script');
        expect(mail.body).not.toContain('<script>alert(1)</script>');
        expect(mail.body).not.toContain('line two');
        expect(mail.body).not.toContain('quoted');
      },
      digestTestTimeoutMs(directEmail)
    );
  });
});
