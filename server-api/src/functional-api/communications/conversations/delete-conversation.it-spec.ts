import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  ConversationCreationType,
  delay,
} from '@alkemio/tests-lib';
import {
  createConversation,
  deleteConversation,
  getMeConversations,
  leaveConversation,
} from './conversation.request.params';

const waitForCondition = async (
  check: () => Promise<boolean>,
  { timeout = 15_000, interval = 1_500 } = {}
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await delay(interval);
  }
  const result = await check();
  if (!result) {
    throw new Error(
      `Condition not met within ${timeout}ms (eventual consistency timeout)`
    );
  }
};

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'delete-conversations',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

describe('Delete Conversation', () => {
  describe('Implicit deletion — all members leave', () => {
    test('should remove GROUP conversation when all members leave', async () => {
      // Arrange — create a group with 2 members (creator + 1)
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Implicit Delete Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';
      expect(conversationId).toBeTruthy();

      // Act — both members leave
      await leaveConversation(conversationId, TestUser.SPACE_MEMBER);
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN);

      // Assert — conversation no longer appears for either user
      await waitForCondition(async () => {
        const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
        const conversations = meRes?.data?.me.conversations.conversations ?? [];
        return !conversations.some(c => c.id === conversationId);
      });
      const adminRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const adminConversations =
        adminRes?.data?.me.conversations.conversations ?? [];
      expect(adminConversations.some(c => c.id === conversationId)).toBe(false);

      await waitForCondition(async () => {
        const meRes = await getMeConversations(TestUser.SPACE_MEMBER);
        const conversations = meRes?.data?.me.conversations.conversations ?? [];
        return !conversations.some(c => c.id === conversationId);
      });
      const memberRes = await getMeConversations(TestUser.SPACE_MEMBER);
      const memberConversations =
        memberRes?.data?.me.conversations.conversations ?? [];
      expect(memberConversations.some(c => c.id === conversationId)).toBe(
        false
      );
    });

    test('should remove GROUP conversation from remaining member after last member leaves', async () => {
      // Arrange — create group with creator + 2 members
      const member1ActorId = TestUserManager.users.spaceMember.agentId;
      const member2ActorId = TestUserManager.users.spaceAdmin.agentId;
      const res = await createConversation(
        [member1ActorId, member2ActorId],
        ConversationCreationType.Group,
        { displayName: 'Last Member Leave Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';
      expect(conversationId).toBeTruthy();

      // Act — all 3 members leave sequentially
      await leaveConversation(conversationId, TestUser.SPACE_MEMBER);
      await leaveConversation(conversationId, TestUser.SPACE_ADMIN);
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN);

      // Assert — gone for all users
      await waitForCondition(async () => {
        const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
        const conversations = meRes?.data?.me.conversations.conversations ?? [];
        return !conversations.some(c => c.id === conversationId);
      });
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conversations = meRes?.data?.me.conversations.conversations ?? [];
      expect(conversations.some(c => c.id === conversationId)).toBe(false);
    });
  });

  describe('deleteConversation mutation — authorization', () => {
    test('should fail to delete conversation as GLOBAL_ADMIN (no delete privilege)', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Delete Auth Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';
      expect(conversationId).toBeTruthy();

      // Act
      const deleteRes = await deleteConversation(
        conversationId,
        TestUser.GLOBAL_ADMIN
      );
      console.log('Delete response:', deleteRes.error?.errors);

      // Assert — should fail with FORBIDDEN_POLICY
      expect(deleteRes?.error?.errors?.length).toBeGreaterThan(0);

      // Cleanup
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    });

    test('should fail to delete conversation by non-member', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Non-member Delete Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';
      expect(conversationId).toBeTruthy();

      // Act — non-member tries to delete
      const deleteRes = await deleteConversation(
        conversationId,
        TestUser.NON_SPACE_MEMBER
      );

      // Assert — should fail with error
      expect(deleteRes?.error?.errors?.length).toBeGreaterThan(0);

      // Assert — conversation still exists for the creator
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conversations = meRes?.data?.me.conversations.conversations ?? [];
      expect(conversations.some(c => c.id === conversationId)).toBe(true);

      // Cleanup
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    });

    test('should fail to delete conversation when unauthenticated', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Unauth Delete Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';
      expect(conversationId).toBeTruthy();

      // Act — unauthenticated request
      const deleteRes = await deleteConversation(
        conversationId,
        undefined as unknown as TestUser
      );

      // Assert
      expect(deleteRes?.error?.errors?.length).toBeGreaterThan(0);

      // Cleanup
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    });

    test('should fail to delete a non-existent conversation', async () => {
      // Act
      const res = await deleteConversation(
        '00000000-0000-0000-0000-000000000000',
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(res?.error?.errors?.length).toBeGreaterThan(0);
    });
  });
});
