import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  ConversationCreationType,
  ActorType,
  RoomType,
  delay,
} from '@alkemio/tests-lib';
import {
  createConversation,
  updateConversation,
  leaveConversation,
  removeConversationMember,
  getMeConversations,
} from './conversation.request.params';
import { sendMessageToRoom } from '../communication.params';

/**
 * Fire-and-forget mutations dispatch to Matrix and return immediately.
 * State changes arrive asynchronously via inbound Matrix events.
 * This helper waits for a condition to become true, polling at intervals.
 */
const waitForCondition = async (
  check: () => Promise<boolean>,
  { timeout = 15_000, interval = 1_500 } = {}
): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await delay(interval);
  }
  // Final check — let it throw if still failing
  const result = await check();
  if (!result) {
    throw new Error(
      `Condition not met within ${timeout}ms (eventual consistency timeout)`
    );
  }
};

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversations',
};

// Store conversation IDs for cleanup
const conversationsToCleanup: { id: string; user: TestUser }[] = [];

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

afterAll(async () => {
  // Leave all conversations created during tests
  for (const conv of conversationsToCleanup) {
    await leaveConversation(conv.id, conv.user).catch(() => {
      // Ignore errors during cleanup — conversation may already be left
    });
  }
});

/** @testCase TC-0100, TC-0101, TC-0102, TC-0103, TC-0104 */
describe('Create Conversation', () => {
  describe('Direct Conversations', () => {
    test('should create a DIRECT conversation between two users', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.spaceMember.agentId;

      // Act
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const conversation = res?.data?.createConversation;
      expect(conversation).toBeDefined();
      expect(conversation?.id).toBeDefined();
      expect(conversation?.members).toHaveLength(2);
      expect(conversation?.room?.type).toBe(RoomType.ConversationDirect);

      if (conversation?.id) {
        conversationsToCleanup.push({
          id: conversation.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });

    test('should deduplicate DIRECT conversations with the same member', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.subspaceAdmin.agentId;

      // Act — create twice with the same member
      const res1 = await createConversation(
        [memberActorId],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );
      const res2 = await createConversation(
        [memberActorId],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );

      // Assert — should return the same conversation
      const conv1 = res1?.data?.createConversation;
      const conv2 = res2?.data?.createConversation;
      expect(conv1?.id).toBeDefined();
      expect(conv1?.id).toBe(conv2?.id);

      if (conv1?.id) {
        conversationsToCleanup.push({
          id: conv1.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });

    test('should include both creator and member in DIRECT conversation members', async () => {
      // Arrange
      const creatorActorId = TestUserManager.users.globalAdmin.agentId;
      const memberActorId = TestUserManager.users.globalLicenseAdmin.agentId;

      // Act
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const conversation = res?.data?.createConversation;
      expect(conversation).toBeDefined();
      expect(conversation?.id).toBeDefined();

      // Verify members via query (createConversation may return before members are synced)
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conversations = meRes?.data?.me.conversations.conversations ?? [];
      const conv = conversations.find(c => c.id === conversation?.id);
      expect(conv).toBeDefined();
      expect(conv?.members).toHaveLength(2);
      const memberIds = conv?.members?.map(m => m.id) ?? [];
      expect(memberIds).toContain(creatorActorId);
      expect(memberIds).toContain(memberActorId);

      if (conversation?.id) {
        conversationsToCleanup.push({
          id: conversation.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });

    test('should have User actor types for DIRECT conversation members', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.qaUser.agentId;

      // Act
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const members = res?.data?.createConversation?.members;
      expect(members).toBeDefined();
      members?.forEach(member => {
        expect(member.type).toBe(ActorType.User);
      });

      if (res?.data?.createConversation?.id) {
        conversationsToCleanup.push({
          id: res.data.createConversation.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });
  });

  describe('Group Conversations', () => {
    test('should create a GROUP conversation with multiple members', async () => {
      // Arrange
      const member1ActorId = TestUserManager.users.spaceMember.agentId;
      const member2ActorId = TestUserManager.users.spaceAdmin.agentId;

      // Act
      const res = await createConversation(
        [member1ActorId, member2ActorId],
        ConversationCreationType.Group,
        { displayName: 'Test Group Chat' },
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const conversation = res?.data?.createConversation;
      expect(conversation).toBeDefined();
      expect(conversation?.id).toBeDefined();
      expect(conversation?.members).toHaveLength(3); // creator + 2 members
      expect(conversation?.room?.type).toBe(RoomType.ConversationGroup);

      if (conversation?.id) {
        conversationsToCleanup.push({
          id: conversation.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });

    test('should create a GROUP conversation with displayName and avatarUrl', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const displayName = 'My Test Group';
      const avatarUrl = 'https://example.com/avatar.png';

      // Act
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName, avatarUrl },
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const conversation = res?.data?.createConversation;
      expect(conversation).toBeDefined();
      expect(conversation?.room?.displayName).toBe(displayName);

      if (conversation?.id) {
        conversationsToCleanup.push({
          id: conversation.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });

    test('should NOT deduplicate GROUP conversations with the same members', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.subspaceMember.agentId;
      const displayName1 = 'Group A';
      const displayName2 = 'Group B';

      // Act
      const res1 = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: displayName1 },
        TestUser.GLOBAL_ADMIN
      );
      const res2 = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: displayName2 },
        TestUser.GLOBAL_ADMIN
      );

      // Assert — should create two separate conversations
      const conv1 = res1?.data?.createConversation;
      const conv2 = res2?.data?.createConversation;
      expect(conv1?.id).toBeDefined();
      expect(conv2?.id).toBeDefined();
      expect(conv1?.id).not.toBe(conv2?.id);

      if (conv1?.id) {
        conversationsToCleanup.push({
          id: conv1.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
      if (conv2?.id) {
        conversationsToCleanup.push({
          id: conv2.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });

    test('should auto-include creator in GROUP conversation members', async () => {
      // Arrange
      const creatorActorId = TestUserManager.users.globalAdmin.agentId;
      const memberActorId = TestUserManager.users.spaceMember.agentId;

      // Act
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Creator Auto-Include' },
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      const members = res?.data?.createConversation?.members;
      expect(members).toHaveLength(2); // creator auto-included + 1 member
      const memberIds = members?.map(m => m.id) ?? [];
      expect(memberIds).toContain(creatorActorId);
      expect(memberIds).toContain(memberActorId);

      if (res?.data?.createConversation?.id) {
        conversationsToCleanup.push({
          id: res.data.createConversation.id,
          user: TestUser.GLOBAL_ADMIN,
        });
      }
    });
  });

  describe('Validation', () => {
    test('should fail to create conversation with empty members array', async () => {
      // Act
      const res = await createConversation(
        [],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(res?.error?.errors?.length).toBeGreaterThan(0);
    });

    test('should fail to create conversation with invalid actorId', async () => {
      // Act
      const res = await createConversation(
        ['00000000-0000-0000-0000-000000000000'],
        ConversationCreationType.Direct,
        undefined,
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      expect(res?.error?.errors?.length).toBeGreaterThan(0);
    });

    test('should fail to create conversation when unauthenticated', async () => {
      // Arrange
      const memberActorId = TestUserManager.users.spaceMember.agentId;

      // Act — no userRole passed, so request is unauthenticated
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Direct,
        undefined,
        undefined
      );

      // Assert
      expect(res?.error?.errors?.length).toBeGreaterThan(0);
    });
  });
});

describe('Update Conversation', () => {
  let groupConversationId = '';

  beforeAll(async () => {
    const memberActorId = TestUserManager.users.spaceMember.agentId;
    const res = await createConversation(
      [memberActorId],
      ConversationCreationType.Group,
      { displayName: 'Update Test Group' },
      TestUser.GLOBAL_ADMIN
    );
    groupConversationId = res?.data?.createConversation?.id ?? '';
  });

  afterAll(async () => {
    if (groupConversationId) {
      await leaveConversation(groupConversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    }
  });

  test('should update displayName of a GROUP conversation', async () => {
    // Arrange
    const newDisplayName = 'Updated Group Name';

    // Act
    const res = await updateConversation(
      groupConversationId,
      { displayName: newDisplayName },
      TestUser.GLOBAL_ADMIN
    );

    // Assert — mutation returns true
    expect(res?.data?.updateConversation).toBe(true);

    // Assert — query confirms the change persisted (eventual consistency)
    await waitForCondition(async () => {
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
        c => c.id === groupConversationId
      );
      return conv?.room?.displayName === newDisplayName;
    });

    const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
      c => c.id === groupConversationId
    );
    expect(conv).toBeDefined();
    expect(conv?.room?.displayName).toBe(newDisplayName);
  });

  test('should update avatarUrl of a GROUP conversation', async () => {
    // Arrange
    const newAvatarUrl = 'https://example.com/new-avatar.png';

    // Act
    const res = await updateConversation(
      groupConversationId,
      { avatarUrl: newAvatarUrl },
      TestUser.GLOBAL_ADMIN
    );

    // Assert — mutation returns true
    expect(res?.data?.updateConversation).toBe(true);

    // Assert — query confirms the change persisted (eventual consistency)
    await waitForCondition(async () => {
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
        c => c.id === groupConversationId
      );
      return conv?.room?.avatarUrl === newAvatarUrl;
    });

    const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
      c => c.id === groupConversationId
    );
    expect(conv).toBeDefined();
    expect(conv?.room?.avatarUrl).toBe(newAvatarUrl);
  });

  test('should update both displayName and avatarUrl', async () => {
    // Arrange
    const newDisplayName = 'Both Updated';
    const newAvatarUrl = 'https://example.com/both-avatar.png';

    // Act
    const res = await updateConversation(
      groupConversationId,
      { displayName: newDisplayName, avatarUrl: newAvatarUrl },
      TestUser.GLOBAL_ADMIN
    );

    // Assert — mutation returns true
    expect(res?.data?.updateConversation).toBe(true);

    // Assert — query confirms both changes persisted (eventual consistency)
    await waitForCondition(async () => {
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
        c => c.id === groupConversationId
      );
      return (
        conv?.room?.displayName === newDisplayName &&
        conv?.room?.avatarUrl === newAvatarUrl
      );
    });

    const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
      c => c.id === groupConversationId
    );
    expect(conv).toBeDefined();
    expect(conv?.room?.displayName).toBe(newDisplayName);
    expect(conv?.room?.avatarUrl).toBe(newAvatarUrl);
  });

  test('should fail to update conversation by non-member', async () => {
    // Arrange — capture current state
    const beforeRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const beforeConv = (
      beforeRes?.data?.me.conversations.conversations ?? []
    ).find(c => c.id === groupConversationId);
    const originalName = beforeConv?.room?.displayName;

    // Act
    const res = await updateConversation(
      groupConversationId,
      { displayName: 'Unauthorized Update' },
      TestUser.NON_SPACE_MEMBER
    );

    // Assert — mutation returns error
    expect(res?.error?.errors?.length).toBeGreaterThan(0);

    // Assert — query confirms the name was NOT changed
    const afterRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const afterConv = (
      afterRes?.data?.me.conversations.conversations ?? []
    ).find(c => c.id === groupConversationId);
    expect(afterConv?.room?.displayName).toBe(originalName);
  });
});

describe('Leave Conversation', () => {
  // skipped until this one is fixed: BUG: [Conversation] When user try to leave group chat, the conversation remains in the list#9543
  test.skip('should leave a GROUP conversation', async () => {
    // Arrange
    const memberActorId = TestUserManager.users.globalAdmin.agentId;
    const creatorUser = TestUser.SPACE_MEMBER;
    const creatorActorId = TestUserManager.users.spaceMember.agentId;
    const res = await createConversation(
      [memberActorId],
      ConversationCreationType.Group,
      { displayName: 'Leave Test Group' },
      creatorUser
    );
    const conversationId = res?.data?.createConversation?.id ?? '';
    expect(conversationId).toBeTruthy();

    // Act
    const leaveRes = await leaveConversation(conversationId, creatorUser);

    // Assert — mutation returns true
    expect(leaveRes?.data?.leaveConversation).toBe(true);

    // Assert — conversation no longer appears in the leaving user's list
    // (eventual consistency: membership change arrives via Matrix event)
    await waitForCondition(async () => {
      const meRes = await getMeConversations(creatorUser);
      const conversations = meRes?.data?.me.conversations.conversations ?? [];
      return !conversations.some(c => c.id === conversationId);
    });

    const meRes = await getMeConversations(creatorUser);
    const conversations = meRes?.data?.me.conversations.conversations ?? [];
    const conv = conversations.find(c => c.id === conversationId);
    expect(conv).toBeUndefined();

    // Assert — remaining member still sees the conversation without the leaving user
    await waitForCondition(async () => {
      const otherRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const otherConv = (
        otherRes?.data?.me.conversations.conversations ?? []
      ).find(c => c.id === conversationId);
      const memberIds = otherConv?.members?.map(m => m.id) ?? [];
      return !memberIds.includes(creatorActorId);
    });

    const otherRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const otherConversations =
      otherRes?.data?.me.conversations.conversations ?? [];
    const otherConv = otherConversations.find(c => c.id === conversationId);
    expect(otherConv).toBeDefined();
    const remainingMemberIds = otherConv?.members?.map(m => m.id) ?? [];
    expect(remainingMemberIds).not.toContain(creatorActorId);
  });

  test('should fail to leave a conversation that does not exist', async () => {
    // Act
    const res = await leaveConversation(
      '00000000-0000-0000-0000-000000000000',
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(res?.error?.errors?.length).toBeGreaterThan(0);
  });
});

describe('Remove Conversation Member', () => {
  let groupConversationId = '';
  const memberToRemoveActorId = () => TestUserManager.users.spaceAdmin.agentId;

  beforeAll(async () => {
    const member1 = TestUserManager.users.spaceAdmin.agentId;
    const member2 = TestUserManager.users.spaceMember.agentId;
    const res = await createConversation(
      [member1, member2],
      ConversationCreationType.Group,
      { displayName: 'Remove Member Test' },
      TestUser.GLOBAL_ADMIN
    );
    groupConversationId = res?.data?.createConversation?.id ?? '';
  });

  afterAll(async () => {
    if (groupConversationId) {
      await leaveConversation(groupConversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    }
  });

  // skipped until this one is fixed: BUG: [Conversation] When user try to leave group chat, the conversation remains in the list#9543
  test.skip('should remove a member from a GROUP conversation', async () => {
    // Arrange — verify member is present before removal
    const meResBefore = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const convBefore = (
      meResBefore?.data?.me.conversations.conversations ?? []
    ).find(c => c.id === groupConversationId);
    const membersBefore = convBefore?.members?.map(m => m.id) ?? [];
    expect(membersBefore).toContain(memberToRemoveActorId());

    // Act
    const res = await removeConversationMember(
      groupConversationId,
      memberToRemoveActorId(),
      TestUser.GLOBAL_ADMIN
    );

    // Assert — mutation returns true
    expect(res?.data?.removeConversationMember).toBe(true);

    // Assert — member no longer in conversation
    // (eventual consistency: membership change arrives via Matrix event)
    await waitForCondition(async () => {
      const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
      const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
        c => c.id === groupConversationId
      );
      const memberIds = conv?.members?.map(m => m.id) ?? [];
      return !memberIds.includes(memberToRemoveActorId());
    });

    const meResAfter = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const convAfter = (
      meResAfter?.data?.me.conversations.conversations ?? []
    ).find(c => c.id === groupConversationId);
    const membersAfter = convAfter?.members?.map(m => m.id) ?? [];
    expect(membersAfter).not.toContain(memberToRemoveActorId());
  });

  test('should fail to remove member from non-existent conversation', async () => {
    // Act
    const res = await removeConversationMember(
      '00000000-0000-0000-0000-000000000000',
      memberToRemoveActorId(),
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(res?.error?.errors?.length).toBeGreaterThan(0);
  });

  test('should fail to remove member by non-member user', async () => {
    // Arrange — create a fresh group for this test
    const member = TestUserManager.users.qaUser.agentId;
    const res = await createConversation(
      [member],
      ConversationCreationType.Group,
      { displayName: 'Auth Test Group' },
      TestUser.GLOBAL_ADMIN
    );
    const convId = res?.data?.createConversation?.id ?? '';

    // Act — non-member tries to remove
    const removeRes = await removeConversationMember(
      convId,
      member,
      TestUser.NON_SPACE_MEMBER
    );

    // Assert — mutation returns error
    expect(removeRes?.error?.errors?.length).toBeGreaterThan(0);

    // Assert — member is still in the conversation
    const meRes = await getMeConversations(TestUser.GLOBAL_ADMIN);
    const conv = (meRes?.data?.me.conversations.conversations ?? []).find(
      c => c.id === convId
    );
    const memberIds = conv?.members?.map(m => m.id) ?? [];
    expect(memberIds).toContain(member);

    // Cleanup
    if (convId) {
      await leaveConversation(convId, TestUser.GLOBAL_ADMIN).catch(() => {});
    }
  });
});

describe('Query Conversations', () => {
  let directConversationId = '';
  let groupConversationId = '';

  beforeAll(async () => {
    // Create a DIRECT conversation
    const directRes = await createConversation(
      [TestUserManager.users.subspaceMember.agentId],
      ConversationCreationType.Direct,
      undefined,
      TestUser.GLOBAL_ADMIN
    );
    directConversationId = directRes?.data?.createConversation?.id ?? '';

    // Create a GROUP conversation
    const groupRes = await createConversation(
      [
        TestUserManager.users.spaceMember.agentId,
        TestUserManager.users.spaceAdmin.agentId,
      ],
      ConversationCreationType.Group,
      { displayName: 'Query Test Group' },
      TestUser.GLOBAL_ADMIN
    );
    groupConversationId = groupRes?.data?.createConversation?.id ?? '';
  });

  afterAll(async () => {
    if (directConversationId) {
      await leaveConversation(
        directConversationId,
        TestUser.GLOBAL_ADMIN
      ).catch(() => {});
    }
    if (groupConversationId) {
      await leaveConversation(groupConversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    }
  });

  test('should return a flat list of all conversations', async () => {
    // Act
    const res = await getMeConversations(TestUser.GLOBAL_ADMIN);

    // Assert
    const conversations = res?.data?.me.conversations.conversations;
    expect(conversations).toBeDefined();
    expect(Array.isArray(conversations)).toBe(true);
    expect(conversations!.length).toBeGreaterThanOrEqual(2);
  });

  test('should include both DIRECT and GROUP conversations in flat list', async () => {
    // Act
    const res = await getMeConversations(TestUser.GLOBAL_ADMIN);

    // Assert
    const conversations = res?.data?.me.conversations.conversations ?? [];
    const roomTypes = conversations.map(c => c.room?.type);
    expect(roomTypes).toContain(RoomType.ConversationDirect);
    expect(roomTypes).toContain(RoomType.ConversationGroup);
  });

  test('should return conversation members as Actor array', async () => {
    // Act
    const res = await getMeConversations(TestUser.GLOBAL_ADMIN);

    // Assert
    const conversations = res?.data?.me.conversations.conversations ?? [];
    const groupConv = conversations.find(c => c.id === groupConversationId);
    expect(groupConv).toBeDefined();
    expect(groupConv?.members).toBeDefined();
    expect(groupConv!.members.length).toBeGreaterThanOrEqual(2);

    // All members should have Actor fields
    groupConv?.members.forEach(member => {
      expect(member.id).toBeDefined();
      expect(member.type).toBeDefined();
      expect(Object.values(ActorType)).toContain(member.type);
    });
  });

  test('should return conversation room with correct fields', async () => {
    // Act
    const res = await getMeConversations(TestUser.GLOBAL_ADMIN);

    // Assert
    const conversations = res?.data?.me.conversations.conversations ?? [];
    const conv = conversations.find(c => c.id === directConversationId);
    expect(conv).toBeDefined();
    expect(conv?.room).toBeDefined();
    expect(conv?.room?.id).toBeDefined();
    expect(conv?.room?.type).toBe(RoomType.ConversationDirect);
    expect(conv?.room?.messagesCount).toBeDefined();
  });

  test('should show conversations from the perspective of each member', async () => {
    // Act — query conversations as a member (not the creator)
    const res = await getMeConversations(TestUser.SPACE_MEMBER);

    // Assert
    const conversations = res?.data?.me.conversations.conversations ?? [];
    const groupConv = conversations.find(c => c.id === groupConversationId);
    expect(groupConv).toBeDefined();
    expect(groupConv?.members?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Messaging in Conversations', () => {
  let conversationRoomId = '';
  let conversationId = '';

  beforeAll(async () => {
    const res = await createConversation(
      [TestUserManager.users.spaceMember.agentId],
      ConversationCreationType.Group,
      { displayName: 'Messaging Test Group' },
      TestUser.GLOBAL_ADMIN
    );
    conversationId = res?.data?.createConversation?.id ?? '';
    conversationRoomId = res?.data?.createConversation?.room?.id ?? '';
  });

  afterAll(async () => {
    if (conversationId) {
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
        () => {}
      );
    }
  });

  test('should send a message to a conversation room', async () => {
    // Act
    const res = await sendMessageToRoom(
      conversationRoomId,
      'Hello group!',
      TestUser.GLOBAL_ADMIN
    );

    // Assert
    expect(res?.data?.sendMessageToRoom).toBeDefined();
    expect(res?.data?.sendMessageToRoom.id).toBeDefined();
    expect(res?.data?.sendMessageToRoom.message).toBe('Hello group!');
  });

  test('should show message count after sending messages', async () => {
    // Arrange — send a message
    await sendMessageToRoom(
      conversationRoomId,
      'Another message',
      TestUser.GLOBAL_ADMIN
    );

    // Act — query conversations
    const res = await getMeConversations(TestUser.GLOBAL_ADMIN);

    // Assert
    const conversations = res?.data?.me.conversations.conversations ?? [];
    const conv = conversations.find(c => c.id === conversationId);
    expect(conv?.room?.messagesCount).toBeGreaterThanOrEqual(1);
  });
});
