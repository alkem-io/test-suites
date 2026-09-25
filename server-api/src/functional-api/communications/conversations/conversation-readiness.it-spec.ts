import {
  ConversationCreationType,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '../communication.params';
import {
  createConversation,
  deleteConversation,
  getConversationReadiness,
} from './conversation.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-readiness',
};

let conversationId = '';
let roomId = '';

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
});

afterAll(async () => {
  if (conversationId) {
    await deleteConversation(conversationId, TestUser.QA_USER).catch(() => {});
  }
});

describe('Conversation room readiness', () => {
  test('a conversation created against a healthy backend reads READY / PROVISIONED and accepts messages', async () => {
    // Arrange
    const otherActorId = TestUserManager.users.nonSpaceMember.agentId;

    // Act
    const created = await createConversation(
      [otherActorId],
      ConversationCreationType.Direct,
      undefined,
      TestUser.QA_USER
    );
    conversationId = created?.data?.createConversation?.id ?? '';
    roomId = created?.data?.createConversation?.room?.id ?? '';
    expect(conversationId).not.toBe('');

    const readiness = await getConversationReadiness(
      conversationId,
      TestUser.QA_USER
    );

    // Assert
    const room = readiness?.data?.lookup?.conversation?.room;
    expect(room?.id).toBe(roomId);
    expect(room?.readiness?.state).toBe('READY');
    expect(room?.readiness?.reason).toBe('PROVISIONED');
    expect(room?.readiness?.updatedDate).toBeDefined();

    const sent = await sendMessageToRoom(
      roomId,
      'readiness smoke message',
      TestUser.QA_USER
    );
    expect(sent?.error).toBeUndefined();
    expect(sent?.data?.sendMessageToRoom?.id).toBeDefined();
  });

  test('readiness is never an adapter round trip: a second read returns the same recorded outcome', async () => {
    const first = await getConversationReadiness(
      conversationId,
      TestUser.QA_USER
    );
    const second = await getConversationReadiness(
      conversationId,
      TestUser.QA_USER
    );
    expect(first?.data?.lookup?.conversation?.room?.readiness).toEqual(
      second?.data?.lookup?.conversation?.room?.readiness
    );
  });

  test('a non-member cannot read the conversation (and so its readiness)', async () => {
    const res = await getConversationReadiness(
      conversationId,
      TestUser.SPACE_MEMBER
    );
    const denied =
      (res?.error?.errors?.length ?? 0) > 0 || !res?.data?.lookup?.conversation;
    expect(denied).toBe(true);
  });
});
