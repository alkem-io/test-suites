// server#6329 — the Matrix half of "removal revokes access" (cases M-1, M-2, M-3).
// Plan: conversations-test-plan.md.
//
// Since client-web#10365 browsers read and send conversation text through the
// user's own Matrix session, so Synapse membership is the control users
// actually hit. An API-only check of the Alkemio policy proves half the fix.
//
// LOCAL STACK ONLY. Needs HARNESS_SYNAPSE_AS_TOKEN (dev appservice token) on a
// loopback Synapse; `getSynapseUrl()` refuses anything else. All Matrix reads
// and the one Matrix write assert the appservice identity of a PERSONA, never
// the adapter bot (the bot LEAVES conversation rooms once members join, so a
// read as the bot returns stale state).
//
// The adapter must be >= v0.8.23 (matrix-adapter#82: the member leaves through
// their own account). Deliberately NOT gated on the version: on an older
// adapter these cases must FAIL, and each failure message says why.
import {
  ConversationCreationType,
  getSynapseAsToken,
  mxid,
  resolveAlias,
  roomAlias,
  roomMembersAs,
  roomMessagesAs,
  sendTextAs,
  TestScenarioFactory,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { sendMessageToRoom } from '../communication.params';
import {
  createConversation,
  leaveConversation,
  removeConversationMember,
} from './conversation.request.params';
import { pollUntil } from './conversation-events.helpers';

const synapseReady = !!getSynapseAsToken();
const ADAPTER_HINT =
  'adapter must be >= v0.8.23 (matrix-adapter#82); check MATRIX_ADAPTER_IMAGE';

describe.skipIf(!synapseReady)(
  'Removal revokes access — Matrix side (server#6329) [needs HARNESS_SYNAPSE_AS_TOKEN on a loopback Synapse (dev appservice token) — local stack only]',
  () => {
    const runId = `${Date.now()}`;
    const A = TestUser.GLOBAL_ADMIN;
    const B = TestUser.QA_USER;
    const C = TestUser.SUBSUBSPACE_MEMBER;
    let aId: string;
    let bId: string;
    let cId: string;
    const createdConversations: string[] = [];

    type Group = {
      conversationId: string;
      alkemioRoomId: string;
      matrixRoomId: string;
    };

    const membershipOf = async (group: Group, actorId: string) =>
      (await roomMembersAs(group.matrixRoomId, mxid(bId))).find(
        m => m.stateKey === mxid(actorId)
      );

    /** Fresh group A+B+C, with the Matrix joins confirmed. */
    const setupGroup = async (label: string): Promise<Group> => {
      const created = await createConversation(
        [bId, cId],
        ConversationCreationType.Group,
        { displayName: `${label} ${runId}` },
        A
      );
      const conversationId = created?.data?.createConversation?.id ?? '';
      const alkemioRoomId = created?.data?.createConversation?.room?.id ?? '';
      expect(conversationId, 'createConversation returned no id').toBeTruthy();
      expect(alkemioRoomId, 'createConversation returned no room').toBeTruthy();
      createdConversations.push(conversationId);

      const matrixRoomId = await resolveAlias(roomAlias(alkemioRoomId));
      if (!matrixRoomId) {
        throw new Error(
          'room alias not resolvable — is this the stack the API points at?'
        );
      }
      const group: Group = { conversationId, alkemioRoomId, matrixRoomId };

      let lastSeen = 'nothing';
      await pollUntil(
        async () => {
          const members = await roomMembersAs(matrixRoomId, mxid(bId));
          lastSeen = JSON.stringify(
            members.map(m => [m.stateKey, m.membership])
          );
          const joined = (id: string) =>
            members.some(
              m => m.stateKey === mxid(id) && m.membership === 'join'
            );
          return joined(bId) && joined(cId) ? true : undefined;
        },
        () =>
          `B and C did not both reach membership 'join' within 30000 ms; observed ${lastSeen}`
      );
      return group;
    };

    /** Polls (as B) until C is no longer joined; returns C's member event. */
    const waitForCToLeave = async (group: Group) => {
      let lastSeen = 'nothing';
      return pollUntil(
        async () => {
          const c = await membershipOf(group, cId);
          lastSeen = c?.membership ?? 'absent';
          return c && c.membership !== 'join' ? c : undefined;
        },
        () =>
          `C still '${lastSeen}' in Synapse after 30000 ms — ${ADAPTER_HINT}`
      );
    };

    beforeAll(async () => {
      await TestScenarioFactory.createBaseScenarioEmpty({
        name: 'conversation-member-removal-matrix',
      });
      aId = TestUserManager.users.globalAdmin.agentId;
      bId = TestUserManager.users.qaUser.agentId;
      cId = TestUserManager.users.subsubspaceMember.agentId;
    });

    afterAll(async () => {
      for (const conversationId of createdConversations) {
        // B first, so A's leave is the last-member auto-delete.
        await leaveConversation(conversationId, B).catch(() => {});
        await leaveConversation(conversationId, A).catch(() => {});
      }
    });

    describe('M-1 — the member leaves the Matrix room through their own account (DT: removal x leave)', () => {
      const rows = [
        {
          row: 'remove',
          act: (conversationId: string) =>
            removeConversationMember(conversationId, cId, A).then(
              r => r?.data?.removeConversationMember
            ),
        },
        {
          row: 'leave',
          act: (conversationId: string) =>
            leaveConversation(conversationId, C).then(
              r => r?.data?.leaveConversation
            ),
        },
      ];

      test.each(rows)(
        'M-1 ($row) — C ends up left, by their own account; B and A are untouched',
        async ({ row, act }) => {
          const group = await setupGroup(`M-1 ${row}`);
          const aBefore = await membershipOf(group, aId);

          expect(
            await act(group.conversationId),
            `${row} mutation did not return true`
          ).toBe(true);
          const cAfter = await waitForCToLeave(group);

          expect(
            cAfter.membership,
            "C's membership (not ban, not absent)"
          ).toBe('leave');
          expect(
            cAfter.sender,
            "the leave event's sender must be C's own account (a kick would carry another sender)"
          ).toBe(mxid(cId));
          // Positive control: reading as B worked and B was untouched.
          expect((await membershipOf(group, bId))?.membership).toBe('join');
          // A: compared with the state before the act, never assumed.
          expect((await membershipOf(group, aId))?.membership).toBe(
            aBefore?.membership
          );
        }
      );
    });

    test('M-2 — the removed member’s Matrix send is refused (ST: joined -> left)', async () => {
      const group = await setupGroup('M-2');
      const before = `M2-before-${runId}`;
      const after = `M2-after-${runId}`;

      // Lever control: C can send while a member.
      const sendBefore = await sendTextAs(
        group.matrixRoomId,
        mxid(cId),
        before
      );
      expect(sendBefore.status, 'C sends while still a member').toBe(200);

      const removed = await removeConversationMember(
        group.conversationId,
        cId,
        A
      );
      expect(removed?.data?.removeConversationMember).toBe(true);
      await waitForCToLeave(group);

      const sendAfter = await sendTextAs(group.matrixRoomId, mxid(cId), after);
      expect(sendAfter.status, 'C sends after removal').toBe(403);
      expect(sendAfter.errcode, 'C sends after removal').toBe('M_FORBIDDEN');

      const history = await roomMessagesAs(group.matrixRoomId, mxid(bId));
      expect(history.bodies, 'B reads the room history').toContain(before);
      expect(
        history.bodies,
        'the refused send must not be in the room'
      ).not.toContain(after);
    });

    test('M-3 — messages after removal are absent from the removed member’s Matrix history', async () => {
      const group = await setupGroup('M-3');
      const t1 = `M3-T1-${runId}`;
      const t2 = `M3-T2-${runId}`;

      expect(
        (await sendMessageToRoom(group.alkemioRoomId, t1, A))?.error,
        'A sends T1 through the API'
      ).toBeUndefined();
      // Lever control: C can read the room while a member.
      await pollUntil(
        async () =>
          (await roomMessagesAs(group.matrixRoomId, mxid(cId))).bodies.includes(
            t1
          )
            ? true
            : undefined,
        () =>
          'T1 did not reach C’s Matrix history within 30000 ms (before removal)'
      );

      const removed = await removeConversationMember(
        group.conversationId,
        cId,
        A
      );
      expect(removed?.data?.removeConversationMember).toBe(true);
      await waitForCToLeave(group);

      expect(
        (await sendMessageToRoom(group.alkemioRoomId, t2, A))?.error,
        'A sends T2 through the API after the removal'
      ).toBeUndefined();
      // Positive control, and it orders C's read after T2 is in the room.
      await pollUntil(
        async () =>
          (await roomMessagesAs(group.matrixRoomId, mxid(bId))).bodies.includes(
            t2
          )
            ? true
            : undefined,
        () => 'T2 did not reach B’s Matrix history within 30000 ms'
      );

      const cHistory = await roomMessagesAs(group.matrixRoomId, mxid(cId));
      expect(
        [200, 403],
        `C's history read answered ${cHistory.status}; only 200 (pre-leave history) or 403 (stricter) are acceptable`
      ).toContain(cHistory.status);
      expect(
        cHistory.bodies,
        `T2 in C's Matrix history (status ${cHistory.status})`
      ).not.toContain(t2);
      if (cHistory.status === 200) {
        // The read works and returns pre-leave history, so the absence means something.
        expect(cHistory.bodies, "C's pre-leave history (status 200)").toContain(
          t1
        );
      }
    });
  }
);
