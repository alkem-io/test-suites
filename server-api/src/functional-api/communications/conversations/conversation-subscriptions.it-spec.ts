import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
  ConversationCreationType,
  SubscriptionClient,
  SubscriptionMessage,
  delay,
} from '@alkemio/tests-lib';

const subscriptionConversationEvents = readFileSync(
  resolve(
    __dirname,
    '../../../../../lib/src/scenario/graphql/subscriptions/communication/conversationEvents.graphql'
  ),
  'utf-8'
);
import {
  createConversation,
  updateConversation,
  assignConversationMember,
  removeConversationMember,
  leaveConversation,
} from './conversation.request.params';

type ConversationEventMessage = {
  conversationEvents?: {
    eventType: string;
    conversationCreated?: {
      conversation: { id: string };
    };
    conversationDeleted?: {
      conversationID: string;
    };
    conversationUpdated?: {
      conversation: {
        id: string;
        room?: { displayName?: string; avatarUrl?: string };
      };
    };
    memberAdded?: {
      conversation: { id: string };
      addedMember: { id: string };
    };
    memberRemoved?: {
      conversation: { id: string };
      removedMemberID: string;
    };
  };
};

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-subscriptions',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

/** @testCase TC-0105 */
describe('Conversation Event Subscriptions', () => {
  describe('MEMBER_ADDED event', () => {
    let subscription: SubscriptionClient;
    let groupConversationId: string;

    beforeAll(async () => {
      // Create a group conversation
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Member Add Test' },
        TestUser.GLOBAL_ADMIN
      );
      groupConversationId = res?.data?.createConversation?.id ?? '';

      // Subscribe to conversation events
      subscription = new SubscriptionClient();
      await subscription.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );
    });

    afterAll(async () => {
      subscription.terminate();
      if (groupConversationId) {
        await leaveConversation(
          groupConversationId,
          TestUser.GLOBAL_ADMIN
        ).catch(() => {});
      }
    });

    test('should receive MEMBER_ADDED event when a member is added to a group', async () => {
      // Arrange
      const newMemberActorId = TestUserManager.users.spaceAdmin.agentId;

      // Act
      await assignConversationMember(
        groupConversationId,
        newMemberActorId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert — wait for subscription event
      await delay(3000);
      const messages = subscription.getMessages();
      const memberAddedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
          'MEMBER_ADDED'
      );

      expect(memberAddedEvent).toBeDefined();
      const payload = (memberAddedEvent as ConversationEventMessage)
        ?.conversationEvents?.memberAdded;
      expect(payload?.conversation?.id).toBe(groupConversationId);
      expect(payload?.addedMember?.id).toBe(newMemberActorId);
    });
  });

  // skipped until this one is fixed: BUG: [Conversation] When user try to leave group chat, the conversation remains in the list#9543
  describe.skip('MEMBER_REMOVED event', () => {
    let subscription: SubscriptionClient;
    let groupConversationId: string;
    let memberToRemoveActorId: string;

    beforeAll(async () => {
      memberToRemoveActorId = TestUserManager.users.spaceAdmin.agentId;
      const memberActorId = TestUserManager.users.spaceMember.agentId;

      // Create a group with multiple members
      const res = await createConversation(
        [memberActorId, memberToRemoveActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Member Remove Test' },
        TestUser.GLOBAL_ADMIN
      );
      groupConversationId = res?.data?.createConversation?.id ?? '';

      // Subscribe to conversation events
      subscription = new SubscriptionClient();
      await subscription.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );
    });

    afterAll(async () => {
      subscription.terminate();
      if (groupConversationId) {
        await leaveConversation(
          groupConversationId,
          TestUser.GLOBAL_ADMIN
        ).catch(() => {});
      }
    });

    test('should receive MEMBER_REMOVED event when a member is removed', async () => {
      // Act
      await removeConversationMember(
        groupConversationId,
        memberToRemoveActorId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert — wait for subscription event
      await delay(3000);
      const messages = subscription.getMessages();
      const memberRemovedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
          'MEMBER_REMOVED'
      );

      expect(memberRemovedEvent).toBeDefined();
      const payload = (memberRemovedEvent as ConversationEventMessage)
        ?.conversationEvents?.memberRemoved;
      expect(payload?.conversation?.id).toBe(groupConversationId);
      expect(payload?.removedMemberID).toBe(memberToRemoveActorId);
    });

    test('should receive MEMBER_REMOVED event when a member leaves', async () => {
      // Arrange — create a new group and subscribe
      const leavingMemberActorId = TestUserManager.users.subspaceMember.agentId;
      const res = await createConversation(
        [leavingMemberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Leave Test' },
        TestUser.GLOBAL_ADMIN
      );
      const convId = res?.data?.createConversation?.id ?? '';

      // Clear previous messages
      const sub = new SubscriptionClient();
      await sub.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );

      // Act
      await leaveConversation(convId, TestUser.SUBSPACE_MEMBER);

      // Assert
      await delay(3000);
      const messages = sub.getMessages();
      const leaveEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
            'MEMBER_REMOVED' &&
          (m as ConversationEventMessage)?.conversationEvents?.memberRemoved
            ?.conversation?.id === convId
      );

      expect(leaveEvent).toBeDefined();
      sub.terminate();

      // Cleanup
      await leaveConversation(convId, TestUser.GLOBAL_ADMIN).catch(() => {});
    });
  });

  describe('CONVERSATION_UPDATED event', () => {
    let subscription: SubscriptionClient;
    let groupConversationId: string;

    beforeAll(async () => {
      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Update Test' },
        TestUser.GLOBAL_ADMIN
      );
      groupConversationId = res?.data?.createConversation?.id ?? '';

      subscription = new SubscriptionClient();
      await subscription.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );
    });

    afterAll(async () => {
      subscription.terminate();
      if (groupConversationId) {
        await leaveConversation(
          groupConversationId,
          TestUser.GLOBAL_ADMIN
        ).catch(() => {});
      }
    });

    test('should receive CONVERSATION_UPDATED event when displayName changes', async () => {
      // Act
      await updateConversation(
        groupConversationId,
        { displayName: 'Updated Via Sub Test' },
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      await delay(3000);
      const messages = subscription.getMessages();
      const updatedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
          'CONVERSATION_UPDATED'
      );

      expect(updatedEvent).toBeDefined();
      const payload = (updatedEvent as ConversationEventMessage)
        ?.conversationEvents?.conversationUpdated;
      expect(payload?.conversation?.id).toBe(groupConversationId);
    });

    test('should receive CONVERSATION_UPDATED event when avatarUrl changes', async () => {
      // Clear by creating a fresh subscription
      const sub = new SubscriptionClient();
      await sub.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );

      // Act
      await updateConversation(
        groupConversationId,
        { avatarUrl: 'https://example.com/sub-avatar.png' },
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      await delay(3000);
      const messages = sub.getMessages();
      const updatedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
          'CONVERSATION_UPDATED'
      );

      expect(updatedEvent).toBeDefined();
      sub.terminate();
    });
  });

  describe('CONVERSATION_DELETED event', () => {
    // skipped until bug is fixed: BUG: [Conversation] When user try to leave group chat, the conversation remains in the list#9543
    test.skip('should receive CONVERSATION_DELETED event when all members leave', async () => {
      // Arrange — subscribe before creating the conversation
      const subscription = new SubscriptionClient();
      await subscription.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );

      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Delete Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';
      expect(conversationId).toBeTruthy();

      // Act — all members leave, triggering implicit deletion
      await leaveConversation(conversationId, TestUser.SPACE_MEMBER);
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN);

      // Assert
      await delay(5000);
      const messages = subscription.getMessages();
      const deletedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
          'CONVERSATION_DELETED'
      );

      expect(deletedEvent).toBeDefined();
      const payload = (deletedEvent as ConversationEventMessage)
        ?.conversationEvents?.conversationDeleted;
      expect(payload?.conversationID).toBe(conversationId);
      subscription.terminate();
    });

    // skipped until bug is fixed: BUG: [Conversation] When user try to leave group chat, the conversation remains in the list#9543
    test.skip('should notify member via subscription before they leave', async () => {
      // Arrange — subscribe as a member who will receive the event
      const memberSub = new SubscriptionClient();
      await memberSub.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.SPACE_MEMBER
      );

      const memberActorId = TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Delete Notify Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId = res?.data?.createConversation?.id ?? '';

      // Act — creator leaves first, then member leaves (triggers deletion)
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN);

      // Assert — member should receive MEMBER_REMOVED for the creator
      await delay(5000);
      const messages = memberSub.getMessages();
      const memberRemovedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents?.eventType ===
            'MEMBER_REMOVED' &&
          (m as ConversationEventMessage)?.conversationEvents?.memberRemoved
            ?.conversation?.id === conversationId
      );

      expect(memberRemovedEvent).toBeDefined();
      memberSub.terminate();

      // Cleanup — member leaves too
      await leaveConversation(conversationId, TestUser.SPACE_MEMBER).catch(
        () => {}
      );
    });
  });
});
