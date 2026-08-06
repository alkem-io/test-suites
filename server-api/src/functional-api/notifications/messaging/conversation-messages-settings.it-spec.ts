/* eslint-disable @typescript-eslint/no-explicit-any */
// 034-messaging-notifications — US3: messaging notification settings & backfill.
//
// Covers FR-002/FR-003/FR-004/FR-017 and risk R-2 (settings surface must never
// 500 for a legacy/un-backfilled user). The pre-migration/legacy-row proof
// itself lives server-side (server:T008 harness + the migration-revert/re-run
// walk in the verification stack notes) — an API-only harness cannot shape a
// legacy row, only observe the shape once created (US3-AS2).
import {
  createUser,
  deleteUser,
  getUserData,
} from '@functional-api/contributor-management/user/user.request.params';
import {
  delay,
  digestTestTimeoutMs,
  digestWindow,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import {
  createDirectConversation,
  getConversationMessagingInAppNotificationsCount,
  updateConversationMessagingSettings,
} from '../notification.helpers';
import { sendMessageToRoom } from '@functional-api/communications/communication.params';
import { leaveConversation } from '@functional-api/communications/conversations/conversation.request.params';

const uniqueId = UniqueIDGenerator.getID();

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-messages-settings',
};

// US3-AS3's assertion is negative ("no in-app notification is ever created"),
// so its wait must outlast the DISPATCH path, not the message. Under R4 the
// dispatch happens at flush time, on whichever direct track is armed for the
// recipient — email is off for this persona, push is on at its mandated
// default — so `push:direct` is the track that would carry a leak.
const directPush = digestWindow('push', 'direct');
const directEmail = digestWindow('email', 'direct');

const messagingRowsFromNotificationUser = (notificationUser: any) => ({
  direct: notificationUser?.conversationMessageDirect,
  group: notificationUser?.conversationMessageGroup,
});

// Accessor for `getUserData` query responses: `res.data.user.settings...`
const getUserMessagingSettings = (res: any) =>
  messagingRowsFromNotificationUser(
    res?.data?.user?.settings?.notification?.user
  );

// Accessor for `updateUserSettings` mutation responses:
// `res.data.updateUserSettings.settings...`
const getUpdatedMessagingSettings = (res: any) =>
  messagingRowsFromNotificationUser(
    res?.data?.updateUserSettings?.settings?.notification?.user
  );

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Conversation-message notification settings (US3)', () => {
  describe('Defaults on a freshly registered account (US3-AS1)', () => {
    let newUserId = '';

    afterEach(async () => {
      if (newUserId) {
        await deleteUser(newUserId).catch(() => {});
        newUserId = '';
      }
    });

    test('both messaging rows are present with mandated defaults: email OFF, inApp OFF, push ON', async () => {
      // Arrange — a genuinely new account, not one of the shared personas
      const createRes = await createUser({
        email: `conversation-messages-settings-${uniqueId}@alkem.io`,
        profileData: { displayName: `ConvSettingsUser${uniqueId}` },
      });
      newUserId = createRes?.data?.createUser.id ?? '';
      expect(newUserId).toBeTruthy();

      // Act
      const res = await getUserData(newUserId, TestUser.GLOBAL_ADMIN);

      // Assert
      const { direct, group } = getUserMessagingSettings(res);
      expect(direct).toEqual(
        expect.objectContaining({ email: false, inApp: false, push: true })
      );
      expect(group).toEqual(
        expect.objectContaining({ email: false, inApp: false, push: true })
      );
    });
  });

  describe('Settings merge field-by-field (FR-017)', () => {
    test('updating the direct row leaves the group row (and other user-notification rows) untouched', async () => {
      // Arrange — capture the group row before the update
      const before = await getUserData(
        TestUserManager.users.qaUser.id,
        TestUser.GLOBAL_ADMIN
      );
      const groupBefore = getUserMessagingSettings(before).group;

      // Act — touch ONLY the direct row
      await updateConversationMessagingSettings(
        TestUserManager.users.qaUser.id,
        { direct: { email: true } },
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const after = await getUserData(
        TestUserManager.users.qaUser.id,
        TestUser.GLOBAL_ADMIN
      );
      const { direct, group } = getUserMessagingSettings(after);
      expect(direct?.email).toBe(true);
      expect(group).toEqual(groupBefore);

      // Cleanup — restore the mandated default
      await updateConversationMessagingSettings(
        TestUserManager.users.qaUser.id,
        { direct: { email: false } },
        TestUser.GLOBAL_ADMIN
      );
    });
  });

  describe('In-app is permanently OFF regardless of the stored preference (US3-AS3, FR-003)', () => {
    const conversationsToCleanup: string[] = [];

    afterAll(async () => {
      for (const id of conversationsToCleanup) {
        await leaveConversation(id, TestUser.GLOBAL_ADMIN).catch(() => {});
      }
      // Restore the mandated default regardless of test outcome.
      await updateConversationMessagingSettings(
        TestUserManager.users.spaceMember.id,
        { direct: { inApp: false } },
        TestUser.SPACE_MEMBER
      );
    });

    test(
      'forcing the stored inApp flag to true via updateUserSettings never produces an in-app notification',
      async () => {
        // Arrange — force the platform-enforced-off channel on via the public API
        const updateRes = await updateConversationMessagingSettings(
          TestUserManager.users.spaceMember.id,
          { direct: { inApp: true } },
          TestUser.SPACE_MEMBER
        );
        // The write itself is accepted and round-trips (the stored value is
        // retained for row-shape symmetry — FR-003 — even though it is never
        // honored at dispatch time).
        expect(getUpdatedMessagingSettings(updateRes).direct?.inApp).toBe(true);

        const before = await getConversationMessagingInAppNotificationsCount(
          TestUser.SPACE_MEMBER
        );

        const conversationRes = await createDirectConversation(
          TestUserManager.users.spaceMember.agentId,
          TestUser.GLOBAL_ADMIN
        );
        const conversationId = conversationRes?.data?.createConversation?.id;
        const roomId = conversationRes?.data?.createConversation?.room?.id;
        expect(conversationId).toBeDefined();
        expect(roomId).toBeDefined();
        if (conversationId) conversationsToCleanup.push(conversationId);

        // Act
        await sendMessageToRoom(roomId as string, 'Hello!', TestUser.GLOBAL_ADMIN);

        // The intent of this assertion is unchanged by R4 — in-app is never
        // produced on any path — but its TIMING is. Nothing is dispatched on
        // arrival any more, so the old literal 3s wait would have observed
        // zero in-app notifications before the pipeline had even decided what
        // to send: it would have passed on a build that leaked in-app
        // notifications at flush time. Grace covers the LONGER of the two
        // direct tracks at its MAX-DELAY bound, so the dispatch this is
        // asserting the absence of has provably already happened.
        await delay(
          Math.max(directPush.maxDelayGraceMs, directEmail.maxDelayGraceMs)
        );

        // Assert — server-enforced: zero in-app notifications regardless of
        // the stored preference (the client cell is a locked affordance only).
        const after = await getConversationMessagingInAppNotificationsCount(
          TestUser.SPACE_MEMBER
        );
        expect(after).toBe(before);
      },
      digestTestTimeoutMs([directPush, directEmail])
    );
  });
});
