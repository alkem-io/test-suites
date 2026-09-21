import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  ConversationCreationType,
  delay,
  SubscriptionClient,
  SubscriptionMessage,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '../communication.params';
import { addReaction } from '../reactions/reactions.request.params';
import {
  assignConversationMember,
  createConversation,
  deleteConversation,
  removeConversationMember,
  updateConversation,
} from './conversation.request.params';

const governanceDocument = readFileSync(
  resolve(
    __dirname,
    '../../../../../lib/src/scenario/graphql/subscriptions/communication/conversationGovernanceEvents.graphql'
  ),
  'utf-8'
);
const legacyDocument = readFileSync(
  resolve(
    __dirname,
    '../../../../../lib/src/scenario/graphql/subscriptions/communication/conversationEvents.graphql'
  ),
  'utf-8'
);

type GovernanceMessage = {
  conversationGovernanceEvents?: {
    eventType: string;
    conversationID: string;
    conversation?: { id: string; room?: { readiness?: { state: string } } };
    member?: { id: string };
    memberID?: string;
    readiness?: { state: string; reason: string };
  };
};
type LegacyMessage = {
  conversationEvents?: { eventType: string };
};

const governanceEvents = (client: SubscriptionClient, conversationId: string) =>
  client
    .getMessages()
    .map(
      (m: SubscriptionMessage) =>
        (m as GovernanceMessage)?.conversationGovernanceEvents
    )
    .filter(e => e && e.conversationID === conversationId) as NonNullable<
    GovernanceMessage['conversationGovernanceEvents']
  >[];

const legacyEventTypes = (client: SubscriptionClient) =>
  client
    .getMessages()
    .map(
      (m: SubscriptionMessage) =>
        (m as LegacyMessage)?.conversationEvents?.eventType
    )
    .filter((t): t is string => !!t);

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-governance-events',
};

const MESSAGE_OPERATIONS = 100;
const SETTLE_MS = 3000;

let governanceA: SubscriptionClient; // creator, governance channel
let legacyB: SubscriptionClient; // member, legacy mixed channel
let governanceC: SubscriptionClient; // member added later, governance channel
let governanceD: SubscriptionClient; // never a member, governance channel
let conversationId = '';
let roomId = '';

const memberB = () => TestUserManager.users.spaceMember.agentId;
const memberC = () => TestUserManager.users.spaceAdmin.agentId;

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);

  governanceA = new SubscriptionClient();
  legacyB = new SubscriptionClient();
  governanceC = new SubscriptionClient();
  governanceD = new SubscriptionClient();
  await governanceA.subscribe(
    {
      operationName: 'ConversationGovernanceEvents',
      query: governanceDocument,
      variables: {},
    },
    TestUser.GLOBAL_ADMIN
  );
  await legacyB.subscribe(
    {
      operationName: 'ConversationEvents',
      query: legacyDocument,
      variables: {},
    },
    TestUser.SPACE_MEMBER
  );
  await governanceC.subscribe(
    {
      operationName: 'ConversationGovernanceEvents',
      query: governanceDocument,
      variables: {},
    },
    TestUser.SPACE_ADMIN
  );
  await governanceD.subscribe(
    {
      operationName: 'ConversationGovernanceEvents',
      query: governanceDocument,
      variables: {},
    },
    TestUser.NON_SPACE_MEMBER
  );
});

afterAll(async () => {
  governanceA?.terminate();
  legacyB?.terminate();
  governanceC?.terminate();
  governanceD?.terminate();
  if (conversationId) {
    await deleteConversation(conversationId, TestUser.GLOBAL_ADMIN).catch(
      () => {}
    );
  }
});

describe('Conversation governance channel', () => {
  test('CONVERSATION_CREATED is delivered exactly once to the creator, carrying the room readiness', async () => {
    const res = await createConversation(
      [memberB()],
      ConversationCreationType.Group,
      { displayName: 'Governance channel test' },
      TestUser.GLOBAL_ADMIN
    );
    conversationId = res?.data?.createConversation?.id ?? '';
    roomId = res?.data?.createConversation?.room?.id ?? '';
    expect(conversationId).not.toBe('');

    await delay(SETTLE_MS);
    const created = governanceEvents(governanceA, conversationId).filter(
      e => e.eventType === 'CONVERSATION_CREATED'
    );
    expect(created).toHaveLength(1);
    expect(created[0].conversation?.id).toBe(conversationId);
    expect(created[0].conversation?.room?.readiness?.state).toBe('READY');
  });

  test('MEMBER_ADDED is delivered exactly once with the added member', async () => {
    await assignConversationMember(
      conversationId,
      memberC(),
      TestUser.GLOBAL_ADMIN
    );

    await delay(SETTLE_MS);
    const added = governanceEvents(governanceA, conversationId).filter(
      e => e.eventType === 'MEMBER_ADDED'
    );
    expect(added).toHaveLength(1);
    expect(added[0].member?.id).toBe(memberC());
    expect(added[0].memberID).toBe(memberC());
    expect(added[0].conversation?.id).toBe(conversationId);
  });

  test('CONVERSATION_UPDATED is delivered exactly once', async () => {
    await updateConversation(
      conversationId,
      { displayName: 'Governance channel test (renamed)' },
      TestUser.GLOBAL_ADMIN
    );

    await delay(SETTLE_MS);
    const updated = governanceEvents(governanceA, conversationId).filter(
      e => e.eventType === 'CONVERSATION_UPDATED'
    );
    expect(updated).toHaveLength(1);
  });

  test(`${MESSAGE_OPERATIONS} message operations deliver zero governance events while the legacy channel keeps its message events`, async () => {
    const legacyBefore = legacyEventTypes(legacyB).length;
    const governanceBefore = governanceEvents(
      governanceA,
      conversationId
    ).length;

    const sent = await sendMessageToRoom(
      roomId,
      'governance-probe 0',
      TestUser.GLOBAL_ADMIN
    );
    const firstMessageId = sent?.data?.sendMessageToRoom?.id ?? '';
    expect(firstMessageId).not.toBe('');

    for (let i = 1; i < MESSAGE_OPERATIONS; i++) {
      if (i % 2 === 0) {
        await sendMessageToRoom(
          roomId,
          `governance-probe ${i}`,
          TestUser.GLOBAL_ADMIN
        );
      } else {
        await addReaction(
          roomId,
          firstMessageId,
          '👍',
          i % 4 === 1 ? TestUser.GLOBAL_ADMIN : TestUser.SPACE_MEMBER
        );
      }
    }

    await delay(SETTLE_MS * 2);
    expect(governanceEvents(governanceA, conversationId).length).toBe(
      governanceBefore
    );
    const legacyTypes = legacyEventTypes(legacyB).slice(legacyBefore);
    expect(
      legacyTypes.filter(t => t === 'MESSAGE_RECEIVED').length
    ).toBeGreaterThan(0);
  });

  test('MEMBER_REMOVED is delivered once to the remaining members and once to the removed member', async () => {
    await removeConversationMember(
      conversationId,
      memberC(),
      TestUser.GLOBAL_ADMIN
    );

    await delay(SETTLE_MS);
    const removedForA = governanceEvents(governanceA, conversationId).filter(
      e => e.eventType === 'MEMBER_REMOVED'
    );
    const removedForC = governanceEvents(governanceC, conversationId).filter(
      e => e.eventType === 'MEMBER_REMOVED'
    );
    expect(removedForA).toHaveLength(1);
    expect(removedForA[0].memberID).toBe(memberC());
    expect(removedForC).toHaveLength(1);
    expect(removedForC[0].memberID).toBe(memberC());
  });

  test('CONVERSATION_DELETED is delivered once with no conversation payload', async () => {
    await deleteConversation(conversationId, TestUser.GLOBAL_ADMIN);
    const deletedId = conversationId;
    conversationId = '';

    await delay(SETTLE_MS);
    const deleted = governanceEvents(governanceA, deletedId).filter(
      e => e.eventType === 'CONVERSATION_DELETED'
    );
    expect(deleted).toHaveLength(1);
    expect(deleted[0].conversation ?? null).toBeNull();
  });

  test('a non-member received nothing throughout', () => {
    expect(governanceD.getMessages().length).toBe(0);
  });
});
