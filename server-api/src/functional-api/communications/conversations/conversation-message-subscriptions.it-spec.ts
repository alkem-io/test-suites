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
  resolve(__dirname, '../../../../../lib/src/scenario/graphql/subscriptions/communication/conversationEvents.graphql'),
  'utf-8'
);
import {
  createConversation,
  leaveConversation,
} from './conversation.request.params';
import {
  sendMessageToRoom,
  removeMessageOnRoom,
} from '../communication.params';

type ConversationEventMessage = {
  conversationEvents?: {
    eventType: string;
    messageReceived?: {
      roomId: string;
      message: { id: string; message: string; sender: { id: string } };
    };
    messageRemoved?: {
      roomId: string;
      messageId: string;
    };
  };
};

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-message-subscriptions',
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

/** @testCase TC-0105 */
describe('Conversation Message Subscriptions', () => {
  describe('MESSAGE_RECEIVED event', () => {
    let subscription: SubscriptionClient;
    let groupConversationId: string;
    let conversationRoomId: string;

    beforeAll(async () => {
      const memberActorId =
        TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Message Received Test' },
        TestUser.GLOBAL_ADMIN
      );
      groupConversationId =
        res?.data?.createConversation?.id ?? '';
      conversationRoomId =
        res?.data?.createConversation?.room?.id ?? '';

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

    test('should receive MESSAGE_RECEIVED event when a message is sent', async () => {
      // Act
      await sendMessageToRoom(
        conversationRoomId,
        'Hello subscription!',
        TestUser.GLOBAL_ADMIN
      );

      // Assert
      await delay(3000);
      const messages = subscription.getMessages();
      const messageEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents
            ?.eventType === 'MESSAGE_RECEIVED'
      );

      expect(messageEvent).toBeDefined();
      const payload = (messageEvent as ConversationEventMessage)
        ?.conversationEvents?.messageReceived;
      expect(payload?.roomId).toBe(conversationRoomId);
      expect(payload?.message?.message).toBe('Hello subscription!');
    });

    test('should receive MESSAGE_RECEIVED event for other member messages', async () => {
      // Arrange — fresh subscription for the member
      const memberSub = new SubscriptionClient();
      await memberSub.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.SPACE_MEMBER
      );

      // Act — admin sends a message
      await sendMessageToRoom(
        conversationRoomId,
        'Message from admin',
        TestUser.GLOBAL_ADMIN
      );

      // Assert — member should receive the event
      await delay(3000);
      const messages = memberSub.getMessages();
      const messageEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents
            ?.eventType === 'MESSAGE_RECEIVED' &&
          (m as ConversationEventMessage)?.conversationEvents
            ?.messageReceived?.roomId === conversationRoomId
      );

      expect(messageEvent).toBeDefined();
      const payload = (messageEvent as ConversationEventMessage)
        ?.conversationEvents?.messageReceived;
      expect(payload?.message?.message).toBe('Message from admin');
      memberSub.terminate();
    });
  });

  describe('MESSAGE_REMOVED event', () => {
    test('should receive MESSAGE_REMOVED event when a message is deleted', async () => {
      // Arrange — create conversation, send a message, subscribe
      const memberActorId =
        TestUserManager.users.spaceMember.agentId;
      const res = await createConversation(
        [memberActorId],
        ConversationCreationType.Group,
        { displayName: 'Sub Message Removed Test' },
        TestUser.GLOBAL_ADMIN
      );
      const conversationId =
        res?.data?.createConversation?.id ?? '';
      const roomId =
        res?.data?.createConversation?.room?.id ?? '';

      const msgRes = await sendMessageToRoom(
        roomId,
        'Message to delete',
        TestUser.GLOBAL_ADMIN
      );
      const messageId =
        msgRes?.data?.sendMessageToRoom?.id ?? '';
      expect(messageId).toBeTruthy();

      const subscription = new SubscriptionClient();
      await subscription.subscribe(
        {
          operationName: 'ConversationEvents',
          query: subscriptionConversationEvents,
          variables: {},
        },
        TestUser.GLOBAL_ADMIN
      );

      // Act
      await removeMessageOnRoom(roomId, messageId, TestUser.GLOBAL_ADMIN);

      // Assert
      await delay(3000);
      const messages = subscription.getMessages();
      const removedEvent = messages.find(
        (m: SubscriptionMessage) =>
          (m as ConversationEventMessage)?.conversationEvents
            ?.eventType === 'MESSAGE_REMOVED'
      );

      expect(removedEvent).toBeDefined();
      const payload = (removedEvent as ConversationEventMessage)
        ?.conversationEvents?.messageRemoved;
      expect(payload?.roomId).toBe(roomId);
      expect(payload?.messageId).toBe(messageId);
      subscription.terminate();

      // Cleanup
      await leaveConversation(
        conversationId,
        TestUser.GLOBAL_ADMIN
      ).catch(() => {});
    });
  });
});
