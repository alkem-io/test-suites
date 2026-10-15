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
import {
  byConversation,
  eventsFor,
  negativeWindowMs,
  settle,
  subscribeConversationEvents,
  waitForEvents,
} from './conversation-events.helpers';

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

  describe('MEMBER_REMOVED event', () => {
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
      const t0 = Date.now();
      await removeConversationMember(
        groupConversationId,
        memberToRemoveActorId,
        TestUser.GLOBAL_ADMIN
      );

      // Assert — bounded wait for the event, then a settle window so a
      // duplicate publish cannot hide behind `find` (server#6329 U-3)
      const { observedAtMs } = await waitForEvents(
        subscription,
        'MEMBER_REMOVED',
        byConversation(groupConversationId)
      );
      await settle(negativeWindowMs(observedAtMs - t0));
      const removedEvents = eventsFor(
        subscription,
        'MEMBER_REMOVED',
        byConversation(groupConversationId)
      );

      expect(removedEvents).toHaveLength(1);
      const payload = removedEvents[0].memberRemoved;
      expect(payload?.conversation?.id).toBe(groupConversationId);
      expect(payload?.removedMemberID).toBe(memberToRemoveActorId);
    });

    test('should receive MEMBER_REMOVED event when a member leaves', async () => {
      // Arrange — subscribe BEFORE the conversation exists and wait for its
      // creation event, so a slow handshake cannot drop the event under test
      const sub = await subscribeConversationEvents(TestUser.GLOBAL_ADMIN);
      const leavingMemberActorId = TestUserManager.users.subspaceMember.agentId;
      const res = await createConversation(
        [leavingMemberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Leave Test' },
        TestUser.GLOBAL_ADMIN
      );
      const convId = res?.data?.createConversation?.id ?? '';
      expect(convId).toBeTruthy();
      await waitForEvents(sub, 'CONVERSATION_CREATED', byConversation(convId));

      // Act
      const t0 = Date.now();
      await leaveConversation(convId, TestUser.SUBSPACE_MEMBER);

      // Assert
      const { observedAtMs } = await waitForEvents(
        sub,
        'MEMBER_REMOVED',
        byConversation(convId)
      );
      await settle(negativeWindowMs(observedAtMs - t0));
      const leaveEvents = eventsFor(
        sub,
        'MEMBER_REMOVED',
        byConversation(convId)
      );

      expect(leaveEvents).toHaveLength(1);
      expect(leaveEvents[0].memberRemoved?.removedMemberID).toBe(
        leavingMemberActorId
      );
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
    test('should receive CONVERSATION_DELETED event when all members leave', async () => {
      // Arrange — subscribe before creating the conversation
      const subscription = await subscribeConversationEvents(
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
      await waitForEvents(
        subscription,
        'CONVERSATION_CREATED',
        byConversation(conversationId)
      );

      // Act — all members leave, triggering implicit deletion. The two leaves
      // are issued back-to-back on purpose (concurrent leaves are processed
      // independently; DB atomicity prevents a double delete) — exactly one
      // CONVERSATION_DELETED pins "no double delete".
      const t0 = Date.now();
      await leaveConversation(conversationId, TestUser.SPACE_MEMBER);
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN);

      // Assert
      const { observedAtMs } = await waitForEvents(
        subscription,
        'CONVERSATION_DELETED',
        byConversation(conversationId)
      );
      await settle(negativeWindowMs(observedAtMs - t0));
      const deletedEvents = eventsFor(
        subscription,
        'CONVERSATION_DELETED',
        byConversation(conversationId)
      );

      expect(deletedEvents).toHaveLength(1);
      expect(deletedEvents[0].conversationDeleted?.conversationID).toBe(
        conversationId
      );
      subscription.terminate();
    });

    test('should notify member via subscription before they leave', async () => {
      // Arrange — subscribe as a member who will receive the event
      const memberSub = await subscribeConversationEvents(
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
      expect(conversationId).toBeTruthy();
      await waitForEvents(
        memberSub,
        'CONVERSATION_CREATED',
        byConversation(conversationId)
      );

      // Act — creator leaves first, then member leaves (triggers deletion)
      const t0 = Date.now();
      await leaveConversation(conversationId, TestUser.GLOBAL_ADMIN);

      // Assert — member should receive MEMBER_REMOVED for the creator, once
      const { observedAtMs } = await waitForEvents(
        memberSub,
        'MEMBER_REMOVED',
        byConversation(conversationId)
      );
      await settle(negativeWindowMs(observedAtMs - t0));
      const memberRemovedEvents = eventsFor(
        memberSub,
        'MEMBER_REMOVED',
        byConversation(conversationId)
      );

      expect(memberRemovedEvents).toHaveLength(1);
      expect(memberRemovedEvents[0].memberRemoved?.removedMemberID).toBe(
        TestUserManager.users.globalAdmin.agentId
      );
      memberSub.terminate();

      // Cleanup — member leaves too
      await leaveConversation(conversationId, TestUser.SPACE_MEMBER).catch(
        () => {}
      );
    });
  });
});
