import {
  ConversationCreationType,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import {
  createConversation,
  deleteConversation,
  getConversationReadiness,
  repairConversationRoom,
} from './conversation.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-repair',
};

let conversationId = '';

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  const created = await createConversation(
    [TestUserManager.users.nonSpaceMember.agentId],
    ConversationCreationType.Direct,
    undefined,
    TestUser.QA_USER
  );
  conversationId = created?.data?.createConversation?.id ?? '';
});

afterAll(async () => {
  if (conversationId) {
    await deleteConversation(conversationId, TestUser.QA_USER).catch(() => {});
  }
});

describe('Conversation room repair', () => {
  test('repairing a READY room is idempotent: ROOM_VERIFIED, no membership change, readiness stays READY', async () => {
    const res = await repairConversationRoom(conversationId, TestUser.QA_USER);

    expect(res?.error).toBeUndefined();
    const result = res?.data?.repairConversationRoom;
    expect(result?.outcome).toBe('ROOM_VERIFIED');
    expect(result?.membersAdded).toBe(0);
    expect(result?.membersRemoved).toBe(0);
    expect(result?.readiness?.state).toBe('READY');
    expect(result?.conversation?.id).toBe(conversationId);

    const after = await getConversationReadiness(
      conversationId,
      TestUser.QA_USER
    );
    expect(after?.data?.lookup?.conversation?.room?.readiness?.state).toBe(
      'READY'
    );
  });

  test('the other member may repair too', async () => {
    const res = await repairConversationRoom(
      conversationId,
      TestUser.NON_SPACE_MEMBER
    );
    expect(res?.error).toBeUndefined();
    expect(res?.data?.repairConversationRoom?.outcome).toBe('ROOM_VERIFIED');
  });

  test('two concurrent repairs converge: both report ROOM_VERIFIED with zero counts', async () => {
    const [first, second] = await Promise.all([
      repairConversationRoom(conversationId, TestUser.QA_USER),
      repairConversationRoom(conversationId, TestUser.NON_SPACE_MEMBER),
    ]);

    for (const res of [first, second]) {
      expect(res?.error).toBeUndefined();
      expect(res?.data?.repairConversationRoom?.outcome).toBe('ROOM_VERIFIED');
      expect(res?.data?.repairConversationRoom?.membersAdded).toBe(0);
      expect(res?.data?.repairConversationRoom?.membersRemoved).toBe(0);
    }
  });

  test('a non-member is denied with an authorization error, distinguishable from an infrastructure failure', async () => {
    const res = await repairConversationRoom(
      conversationId,
      TestUser.SPACE_MEMBER
    );

    expect(res?.error?.errors?.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(res?.error);
    expect(serialized).toContain('FORBIDDEN_POLICY');
    expect(serialized).not.toContain('COMMUNICATION_ADAPTER_UNAVAILABLE');
  });
});
