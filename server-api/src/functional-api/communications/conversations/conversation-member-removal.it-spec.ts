// server#6329 — removing a member from a group conversation revokes their access.
// Plan: conversations-test-plan.md (cases N-1, N-2, N-3).
//
// One fresh group per run: A (global admin) creates it with B (qa user) and
// C (subsubspace member), then removes C. The tests run in file order
// N-1 -> N-3 -> N-2; N-2 issues the denial attempts last, so a defect there
// cannot disturb the event-delivery assertions of N-1 / N-3.
//
// Every subscription read filters by THIS run's conversation or room id, so the
// file is safe next to other files that create groups for the same personas.
import {
  ConversationCreationType,
  SubscriptionClient,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { rawRequest } from '@functional-api/platform-roles/_support/raw-request';
import { getErrorCode } from '@functional-api/roleset/roleset.request.params';
import { sendMessageToRoom } from '../communication.params';
import {
  assignConversationMember,
  createConversation,
  getMeConversations,
  leaveConversation,
  removeConversationMember,
  updateConversation,
} from './conversation.request.params';
import {
  byConversation,
  byRoomAndText,
  eventsFor,
  negativeWindowMs,
  settle,
  subscribeConversationEvents,
  waitForEvents,
} from './conversation-events.helpers';

// Inline reads (no codegen, no widening of shared documents).
const LookupConversationForRemoval = /* GraphQL */ `
  query LookupConversationForRemoval($id: UUID!) {
    lookup {
      conversation(ID: $id) {
        id
        members {
          id
        }
      }
    }
  }
`;
const LookupRoomMessagesForRemoval = /* GraphQL */ `
  query LookupRoomMessagesForRemoval($id: UUID!) {
    lookup {
      room(ID: $id) {
        id
        messages {
          id
          message
        }
      }
    }
  }
`;

type ConversationLookup = {
  lookup: { conversation: { id: string; members: { id: string }[] } | null };
};
type RoomLookup = {
  lookup: {
    room: { id: string; messages: { id: string; message: string }[] } | null;
  };
};

const token = (user: TestUser): string =>
  TestUserManager.getUserModelByType(user).authToken;
const lookupConversation = (user: TestUser, id: string) =>
  rawRequest<ConversationLookup>(token(user), LookupConversationForRemoval, {
    id,
  });
const lookupRoomMessages = (user: TestUser, id: string) =>
  rawRequest<RoomLookup>(token(user), LookupRoomMessagesForRemoval, { id });

const FORBIDDEN = 'FORBIDDEN_POLICY';

describe('Removal revokes access (server#6329)', () => {
  const runId = `${Date.now()}`;
  const A = TestUser.GLOBAL_ADMIN;
  const B = TestUser.QA_USER;
  const C = TestUser.SUBSUBSPACE_MEMBER;

  let aId: string;
  let bId: string;
  let cId: string;
  let conversationId: string;
  let roomId: string;
  let subA: SubscriptionClient;
  let subB: SubscriptionClient;
  let subC: SubscriptionClient;
  let latencyMs: number;

  // Pre-removal controls (rows a-c of the N-2 matrix; T1 for N-3).
  const t1 = `T1-before-removal-${runId}`;
  const t3 = `T3-removed-member-attempt-${runId}`;
  let sendBeforeRes: Awaited<ReturnType<typeof sendMessageToRoom>>;
  let lookupConversationBefore: Awaited<ReturnType<typeof lookupConversation>>;
  let lookupRoomBefore: Awaited<ReturnType<typeof lookupRoomMessages>>;
  // C's READ probe taken the moment A observes MEMBER_REMOVED (re-apply ordering guard).
  let lookupConversationAtEvent: Awaited<ReturnType<typeof lookupConversation>>;

  beforeAll(async () => {
    await TestScenarioFactory.createBaseScenarioEmpty({
      name: 'conversation-member-removal',
    });
    aId = TestUserManager.users.globalAdmin.agentId;
    bId = TestUserManager.users.qaUser.agentId;
    cId = TestUserManager.users.subsubspaceMember.agentId;

    // Subscribe BEFORE the conversation exists.
    subA = await subscribeConversationEvents(A);
    subB = await subscribeConversationEvents(B);
    subC = await subscribeConversationEvents(C);

    const created = await createConversation(
      [bId, cId],
      ConversationCreationType.Group,
      { displayName: `Removal revokes access ${runId}` },
      A
    );
    conversationId = created?.data?.createConversation?.id ?? '';
    roomId = created?.data?.createConversation?.room?.id ?? '';
    expect(conversationId, 'createConversation returned no id').toBeTruthy();
    expect(roomId, 'createConversation returned no room id').toBeTruthy();

    // Readiness anchor: every subscription must be live before anything is
    // asserted as ABSENT, otherwise a later negative would be vacuous.
    for (const [label, sub] of [
      ['A', subA],
      ['B', subB],
      ['C', subC],
    ] as const) {
      await waitForEvents(
        sub,
        'CONVERSATION_CREATED',
        byConversation(conversationId),
        { label }
      );
    }

    // Pre-removal controls: C can send, read the conversation, read the room.
    sendBeforeRes = await sendMessageToRoom(roomId, t1, C);
    lookupConversationBefore = await lookupConversation(C, conversationId);
    lookupRoomBefore = await lookupRoomMessages(C, roomId);

    // Act: A removes C.
    const t0 = Date.now();
    const removed = await removeConversationMember(conversationId, cId, A);
    expect(
      removed?.data?.removeConversationMember,
      `removeConversationMember did not return true: ${JSON.stringify(removed?.error)}`
    ).toBe(true);

    const { observedAtMs } = await waitForEvents(
      subA,
      'MEMBER_REMOVED',
      byConversation(conversationId),
      { label: 'A' }
    );
    latencyMs = observedAtMs - t0;

    // The server saves the re-applied policy BEFORE it publishes MEMBER_REMOVED
    // (message.inbox.service.ts › handleConversationMemberLeft), so C's READ is
    // already gone when the event is observed. Probe now, with no poll and
    // before N-1/N-3's settle windows, so a publish-before-re-apply regression
    // is caught (plan: "Regression guards", re-apply ordering).
    lookupConversationAtEvent = await lookupConversation(C, conversationId);
  });

  afterAll(async () => {
    for (const sub of [subA, subB, subC]) sub?.terminate();
    if (conversationId) {
      // B first, so A's leave is the last-member auto-delete.
      await leaveConversation(conversationId, B).catch(() => {});
      await leaveConversation(conversationId, A).catch(() => {});
    }
  });

  test('N-1 — MEMBER_REMOVED reaches the remaining and the removed member exactly once', async () => {
    await waitForEvents(
      subB,
      'MEMBER_REMOVED',
      byConversation(conversationId),
      { label: 'B' }
    );
    await waitForEvents(
      subC,
      'MEMBER_REMOVED',
      byConversation(conversationId),
      { label: 'C (removed member)' }
    );
    // A duplicate publish would travel the same pipeline as the first event.
    await settle(negativeWindowMs(latencyMs));

    const forA = eventsFor(
      subA,
      'MEMBER_REMOVED',
      byConversation(conversationId)
    );
    const forB = eventsFor(
      subB,
      'MEMBER_REMOVED',
      byConversation(conversationId)
    );
    const forC = eventsFor(
      subC,
      'MEMBER_REMOVED',
      byConversation(conversationId)
    );

    expect(forA, 'MEMBER_REMOVED count for the remover (A)').toHaveLength(1);
    expect(
      forB,
      'MEMBER_REMOVED count for the remaining member (B)'
    ).toHaveLength(1);
    expect(
      forC,
      'MEMBER_REMOVED count for the removed member (C) — FR-019'
    ).toHaveLength(1);

    for (const event of [...forA, ...forB, ...forC]) {
      expect(event.memberRemoved?.removedMemberID).toBe(cId);
      expect(event.memberRemoved?.conversation.id).toBe(conversationId);
    }
  });

  // Was skipped 2026-10-16 → 2026-10-20 on alkem-io/server#6673: the memberships DataLoader
  // hardcoded cache:true, so a subscription that had already resolved this conversation's members
  // (CONVERSATION_CREATED in beforeAll) still listed the removed member. Fixed by server#6680
  // (v0.169.1). The case deliberately keeps the long-lived subscriptions from beforeAll, because
  // that is the path that regressed.
  test('N-1b — the MEMBER_REMOVED payload reflects the post-removal state', async () => {
    const forB = eventsFor(
      subB,
      'MEMBER_REMOVED',
      byConversation(conversationId)
    );
    // Positive control: B is in it.
    const memberIds = (forB[0].memberRemoved?.conversation.members ?? []).map(
      m => m.id
    );
    expect(memberIds).toContain(bId);
    expect(memberIds).not.toContain(cId);
  });

  test('N-3 — a message sent after removal reaches the remaining member, never the removed one', async () => {
    const t2 = `T2-after-removal-${runId}`;
    const tSend = Date.now();
    const sendRes = await sendMessageToRoom(roomId, t2, A);
    expect(
      sendRes?.error,
      `A could not send after the removal: ${JSON.stringify(sendRes?.error)}`
    ).toBeUndefined();

    // Positive control: B receives it.
    const { observedAtMs } = await waitForEvents(
      subB,
      'MESSAGE_RECEIVED',
      byRoomAndText(roomId, t2),
      { label: 'B' }
    );
    // One publish is fanned out by the subscription filter, so a copy for C
    // would arrive alongside B's; the derived window is ample.
    await settle(negativeWindowMs(observedAtMs - tSend));

    expect(
      eventsFor(subB, 'MESSAGE_RECEIVED', byRoomAndText(roomId, t2)),
      'MESSAGE_RECEIVED of the post-removal message for B'
    ).toHaveLength(1);
    expect(
      eventsFor(subC, 'MESSAGE_RECEIVED', byRoomAndText(roomId, t2)),
      'MESSAGE_RECEIVED of the post-removal message for the REMOVED member C'
    ).toHaveLength(0);

    // Lever control: C's subscription could receive message events while a
    // member (bounded wait — T1 was sent before the removal).
    await waitForEvents(subC, 'MESSAGE_RECEIVED', byRoomAndText(roomId, t1), {
      label: 'C (pre-removal T1) — otherwise the negative above is vacuous',
    });

    // B reads the room through GraphQL: both messages are there.
    const roomRes = await lookupRoomMessages(B, roomId);
    expect(roomRes.errors).toHaveLength(0);
    const texts = (roomRes.data?.lookup.room?.messages ?? []).map(
      m => m.message
    );
    expect(texts).toContain(t1);
    expect(texts).toContain(t2);
  });

  test('N-2 — removed member loses privileges, remaining member keeps them (DT)', async () => {
    // Rows a-c: controls captured before the removal.
    expect(
      sendBeforeRes?.error,
      'row a: C could send before removal'
    ).toBeUndefined();
    expect(
      lookupConversationBefore.errors,
      'row b: C could read the conversation before removal'
    ).toHaveLength(0);
    expect(lookupConversationBefore.data?.lookup.conversation?.id).toBe(
      conversationId
    );
    expect(
      lookupRoomBefore.errors,
      'row c: C could read the room before removal'
    ).toHaveLength(0);
    expect(
      (lookupRoomBefore.data?.lookup.room?.messages ?? []).map(m => m.message),
      'row c: C saw T1 before removal'
    ).toContain(t1);

    // Row e0: READ was already revoked when MEMBER_REMOVED was observed
    // (captured in beforeAll; the rows below run after N-1/N-3's settle windows,
    // so on their own they cannot detect a publish-before-re-apply ordering).
    expect(
      lookupConversationAtEvent.errors[0]?.extensions?.code,
      'row e0: removed C reads the conversation at the moment MEMBER_REMOVED is observed'
    ).toBe(FORBIDDEN);
    expect(
      lookupConversationAtEvent.data?.lookup?.conversation ?? null,
      'row e0: no conversation returned at MEMBER_REMOVED'
    ).toBeNull();

    // Row d: send via API.
    const sendAfter = await sendMessageToRoom(roomId, t3, C);
    expect(getErrorCode(sendAfter), 'row d: removed C sends to the room').toBe(
      FORBIDDEN
    );

    // Row e: read the conversation.
    const convAfter = await lookupConversation(C, conversationId);
    expect(
      convAfter.errors[0]?.extensions?.code,
      'row e: removed C reads the conversation'
    ).toBe(FORBIDDEN);
    expect(
      convAfter.data?.lookup?.conversation ?? null,
      'row e: no conversation returned'
    ).toBeNull();

    // Row f: read the room.
    const roomAfter = await lookupRoomMessages(C, roomId);
    expect(
      roomAfter.errors[0]?.extensions?.code,
      'row f: removed C reads the room'
    ).toBe(FORBIDDEN);
    expect(
      roomAfter.data?.lookup?.room?.messages ?? null,
      'row f: no messages returned'
    ).toBeNull();

    // Row g: re-add self (Cause 2 regression pin — a stale CONTRIBUTE grant).
    const reAdd = await assignConversationMember(conversationId, cId, C);
    expect(
      getErrorCode(reAdd),
      'row g: removed C re-adds themselves (if this succeeded C was RE-ADDED to the group)'
    ).toBe(FORBIDDEN);

    // Row h: update the conversation.
    const update = await updateConversation(
      conversationId,
      { displayName: `hijacked-${runId}` },
      C
    );
    expect(
      getErrorCode(update),
      'row h: removed C updates the conversation'
    ).toBe(FORBIDDEN);

    // Row i: remove another member.
    const removeB = await removeConversationMember(conversationId, bId, C);
    expect(getErrorCode(removeB), 'row i: removed C removes B').toBe(FORBIDDEN);

    // Row j: leave. `leaveConversation` is gated on READ on the conversation
    // (conversation.resolver.mutations.ts › removeMemberAndSendRpc), which rows
    // e/e0 show C no longer holds, so the denial is the authorization one.
    const leave = await leaveConversation(conversationId, C);
    expect(leave?.data?.leaveConversation, 'row j: removed C leaves').not.toBe(
      true
    );
    expect(
      leave?.error?.errors?.length ?? 0,
      'row j: removed C leaves'
    ).toBeGreaterThan(0);
    expect(getErrorCode(leave), 'row j: removed C leaves').toBe(FORBIDDEN);

    // Row k: the group is not in C's own list.
    const cList = await getMeConversations(C);
    expect(
      (cList?.data?.me.conversations.conversations ?? []).map(c => c.id),
      'row k: removed C lists their conversations'
    ).not.toContain(conversationId);

    // Row l: B (remaining) still reads the conversation.
    const bView = await lookupConversation(B, conversationId);
    expect(bView.errors, 'row l: B reads the conversation').toHaveLength(0);
    const members = (bView.data?.lookup.conversation?.members ?? []).map(
      m => m.id
    );
    expect(members, 'row l: B and A remain').toEqual(
      expect.arrayContaining([aId, bId])
    );
    expect(members, 'row l: C is gone (row g did not re-add C)').not.toContain(
      cId
    );

    // Row m: B (remaining) still sends.
    const bSend = await sendMessageToRoom(
      roomId,
      `T4-remaining-member-${runId}`,
      B
    );
    expect(bSend?.error, 'row m: B sends to the room').toBeUndefined();

    // The refused send produced nothing.
    const afterRows = await lookupRoomMessages(B, roomId);
    expect(
      (afterRows.data?.lookup.room?.messages ?? []).map(m => m.message),
      'the refused send of row d must not exist in the room'
    ).not.toContain(t3);
  });
});
