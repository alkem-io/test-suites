// 034-messaging-notifications — US1-AS3 / risk R-1: email suppression burst.
//
// A burst of messages in one conversation, within one suppression window,
// must yield exactly ONE email to a given recipient (FR-011); once the
// window elapses, the next message yields exactly one MORE email. A second,
// independent conversation with the SAME recipient gets its own window — the
// suppression marker is per (recipient, conversation), never just per
// recipient (data-model.md §5).
//
// The suppression window is server-side config
// (`notifications.messaging.email_suppression_window_seconds`, in-code
// default 300s, env override `MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS` —
// D-8). This spec reads the SAME env var (shared by the verification stack
// across the server + test-suites processes — repos.yaml stack notes
// recommend shortening it to 30s for walk speed) so its own wait matches
// whatever window the live server is actually enforcing.
import {
  delay,
  deleteMailSlurperMails,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { leaveConversation } from '@functional-api/communications/conversations/conversation.request.params';
import {
  createDirectConversation,
  updateConversationMessagingSettings,
  waitForMailsCountAtLeast,
} from '../notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-messages-suppression',
};

const SUPPRESSION_WINDOW_SECONDS = Number(
  process.env.MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS ?? 300
);

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Conversation-message notifications — email suppression burst (US1-AS3)', () => {
  const conversationsToCleanup: string[] = [];

  beforeAll(async () => {
    await updateConversationMessagingSettings(
      TestUserManager.users.spaceMember.id,
      { direct: { email: true } },
      TestUser.SPACE_MEMBER
    );
  });

  afterAll(async () => {
    for (const id of conversationsToCleanup) {
      await leaveConversation(id, TestUser.GLOBAL_ADMIN).catch(() => {});
    }
    await updateConversationMessagingSettings(
      TestUserManager.users.spaceMember.id,
      { direct: { email: false } },
      TestUser.SPACE_MEMBER
    );
  });

  test(
    'burst is absorbed to 1 email; a second conversation with the same recipient gets its own window; the first conversation gets one more once its window elapses',
    async () => {
      // Arrange — recipient B (spaceMember) has email enabled for direct messages.
      await deleteMailSlurperMails();
      const conversation1Res = await createDirectConversation(
        TestUserManager.users.spaceMember.agentId,
        TestUser.GLOBAL_ADMIN
      );
      const conversation1Id =
        conversation1Res?.data?.createConversation?.id ?? '';
      const room1Id = conversation1Res?.data?.createConversation?.room?.id;
      expect(room1Id).toBeDefined();
      if (conversation1Id) conversationsToCleanup.push(conversation1Id);

      // Act — 5 rapid messages, well inside one suppression window
      for (let i = 0; i < 5; i++) {
        await sendMessageToRoom(
          room1Id as string,
          `Burst message ${i + 1}`,
          TestUser.GLOBAL_ADMIN
        );
      }

      // Assert — the FIRST message's email lands...
      const [, totalAfterBurst] = await waitForMailsCountAtLeast(1);
      expect(totalAfterBurst).toBe(1);

      // ...and no further email trickles in for the rest of the burst.
      await delay(3_000);
      const [, totalStillAfterBurst] = await waitForMailsCountAtLeast(1);
      expect(totalStillAfterBurst).toBe(1);

      // Act — WHILE conversation 1's window is still open, message the SAME
      // recipient in a brand-new, independent conversation.
      const conversation2Res = await createDirectConversation(
        TestUserManager.users.spaceMember.agentId,
        TestUser.SPACE_ADMIN
      );
      const conversation2Id =
        conversation2Res?.data?.createConversation?.id ?? '';
      const room2Id = conversation2Res?.data?.createConversation?.room?.id;
      expect(room2Id).toBeDefined();
      if (conversation2Id) conversationsToCleanup.push(conversation2Id);

      await sendMessageToRoom(
        room2Id as string,
        'Hello from a different conversation',
        TestUser.SPACE_ADMIN
      );

      // Assert — a NEW email arrives (not suppressed by conversation 1's
      // still-open window): the marker is per (recipient, conversation).
      const [, totalAfterSecondConversation] = await waitForMailsCountAtLeast(2);
      expect(totalAfterSecondConversation).toBe(2);

      // Act — wait out conversation 1's window, then send once more there.
      await delay(SUPPRESSION_WINDOW_SECONDS * 1_000 + 3_000);
      await sendMessageToRoom(
        room1Id as string,
        'Post-window message',
        TestUser.GLOBAL_ADMIN
      );

      // Assert — exactly one MORE email for conversation 1 (total 2 -> 3)
      const [, totalAfterWindow] = await waitForMailsCountAtLeast(3);
      expect(totalAfterWindow).toBe(3);
    },
    // Generous per-test timeout headroom on top of the suppression wait
    // itself, for whatever window the live stack is actually configured with.
    Math.max(60_000, SUPPRESSION_WINDOW_SECONDS * 1_000 + 60_000)
  );
});
