import { randomUUID } from 'crypto';
import {
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { updateUserSettings } from '@functional-api/contributor-management/user/user.request.params';
import {
  deleteConversation,
  getMeConversations,
  resolveDirectConversations,
} from './conversation.request.params';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'resolve-direct-conversations',
};

const consentSettings = (allowMessages: boolean) => ({
  privacy: { contributionRolesPubliclyVisible: true },
  communication: {
    allowOtherUsersToSendMessages: allowMessages,
    allowOtherUsersToContactViaEmail: true,
  },
  notification: {
    user: {
      commentReply: { email: false, inApp: false, push: false },
      mentioned: { email: false, inApp: false, push: false },
      messageReceived: { email: false, inApp: false, push: false },
      membership: {
        spaceCommunityInvitationReceived: {
          email: false,
          inApp: false,
          push: false,
        },
        spaceCommunityJoined: { email: false, inApp: false, push: false },
      },
    },
  },
});

/** Delete every direct conversation qa.user has with the given actor so a run starts from "no conversation yet". */
const ensureNoDirectConversationWith = async (actorId: string) => {
  const res = await getMeConversations(TestUser.QA_USER);
  const conversations = res?.data?.me?.conversations?.conversations ?? [];
  for (const conversation of conversations) {
    const memberIds = (conversation.members ?? []).map(m => m.id);
    if (
      (conversation.room?.type as string) === 'conversation_direct' &&
      memberIds.includes(actorId)
    ) {
      await deleteConversation(conversation.id, TestUser.QA_USER).catch(
        () => {}
      );
    }
  }
};

const createdConversationIds: string[] = [];

const newActor = () => TestUserManager.users.subspaceMember.agentId;
const existingActor = () => TestUserManager.users.nonSpaceMember.agentId;
const nonConsentingActor = () => TestUserManager.users.subspaceAdmin.agentId;
const nonConsentingUserId = () => TestUserManager.users.subspaceAdmin.id;
const concurrencyActor = () => TestUserManager.users.subsubspaceMember.agentId;

let existingConversationId = '';

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await ensureNoDirectConversationWith(newActor());
  await ensureNoDirectConversationWith(concurrencyActor());
  await ensureNoDirectConversationWith(existingActor());

  const seeded = await resolveDirectConversations(
    [existingActor()],
    TestUser.QA_USER
  );
  existingConversationId =
    seeded?.data?.resolveDirectConversations?.[0]?.conversation?.id ?? '';
  expect(existingConversationId).not.toBe('');
  createdConversationIds.push(existingConversationId);

  await updateUserSettings(nonConsentingUserId(), consentSettings(false));
});

afterAll(async () => {
  await updateUserSettings(nonConsentingUserId(), consentSettings(true)).catch(
    () => {}
  );
  for (const id of createdConversationIds) {
    await deleteConversation(id, TestUser.QA_USER).catch(() => {});
  }
});

describe('Resolve direct conversations without a proxied send', () => {
  test('reports CREATED, RESOLVED and BLOCKED_NO_CONSENT per recipient and sends nothing', async () => {
    const res = await resolveDirectConversations(
      [newActor(), existingActor(), nonConsentingActor()],
      TestUser.QA_USER
    );

    expect(res?.error).toBeUndefined();
    const results = res?.data?.resolveDirectConversations ?? [];
    expect(results.map(r => r.memberID)).toEqual([
      newActor(),
      existingActor(),
      nonConsentingActor(),
    ]);

    const [created, resolved, blocked] = results;
    expect(created.status).toBe('CREATED');
    expect(created.conversation?.id).toBeDefined();
    expect(created.conversation?.room?.messagesCount).toBe(0);
    expect(created.conversation?.room?.readiness?.state).toBe('READY');
    if (created.conversation?.id)
      createdConversationIds.push(created.conversation.id);

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.conversation?.id).toBe(existingConversationId);
    expect(resolved.conversation?.room?.messagesCount).toBe(0);

    expect(blocked.status).toBe('BLOCKED_NO_CONSENT');
    expect(blocked.conversation ?? null).toBeNull();
  });

  test('two concurrent resolves for a new pair return the same single conversation', async () => {
    const [first, second] = await Promise.all([
      resolveDirectConversations([concurrencyActor()], TestUser.QA_USER),
      resolveDirectConversations([concurrencyActor()], TestUser.QA_USER),
    ]);

    const firstId =
      first?.data?.resolveDirectConversations?.[0]?.conversation?.id;
    const secondId =
      second?.data?.resolveDirectConversations?.[0]?.conversation?.id;
    expect(firstId).toBeDefined();
    expect(secondId).toBe(firstId);
    if (firstId) createdConversationIds.push(firstId);

    const statuses = [
      first?.data?.resolveDirectConversations?.[0]?.status,
      second?.data?.resolveDirectConversations?.[0]?.status,
    ].sort();
    expect(statuses).toEqual(['CREATED', 'RESOLVED']);
  });

  test('more than 100 recipients is rejected before any recipient is processed', async () => {
    const before = await getMeConversations(TestUser.QA_USER);
    const countBefore =
      before?.data?.me?.conversations?.conversations?.length ?? 0;

    const res = await resolveDirectConversations(
      Array.from({ length: 101 }, () => randomUUID()),
      TestUser.QA_USER
    );

    expect(res?.error?.errors?.length).toBeGreaterThan(0);
    const after = await getMeConversations(TestUser.QA_USER);
    expect(after?.data?.me?.conversations?.conversations?.length ?? 0).toBe(
      countBefore
    );
  });

  test('an unresolvable recipient is reported FAILED without aborting the rest', async () => {
    const ghost = randomUUID();
    const res = await resolveDirectConversations(
      [ghost, existingActor()],
      TestUser.QA_USER
    );

    expect(res?.error).toBeUndefined();
    const results = res?.data?.resolveDirectConversations ?? [];
    expect(results[0]).toMatchObject({ memberID: ghost, status: 'FAILED' });
    expect(results[1].status).toBe('RESOLVED');
  });
});
