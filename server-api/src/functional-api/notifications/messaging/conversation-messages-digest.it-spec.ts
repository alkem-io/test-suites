/* eslint-disable @typescript-eslint/no-explicit-any */
// 034-messaging-notifications — the debounce + digest matrix (Operator Ruling
// R4). Replaces conversation-messages-suppression.it-spec.ts, whose entire
// premise (a leading-edge send followed by a per-(recipient, conversation)
// suppression window) no longer exists.
//
// What changed, and why every wait here is derived rather than literal:
// message arrival now only ARMS a per-(recipient, channel, kind) track in
// Redis. A sweep flushes the track once its quiet period has elapsed with no
// further message, or at the latest once its max delay has elapsed since the
// recipient's FIRST un-notified message on that track. Only at flush time is
// anything rendered or sent, and the entries are re-derived from the live
// unread signal. So the assertion "an email arrives promptly" is now false by
// construction, and any wait shorter than the relevant quiet period proves
// nothing. Every sleep and timeout below comes from `digestWindow(...)` —
// lib/src/utils/messaging-digest-windows.ts.
//
// Covers US1-AS3 (burst -> one digest, including the ZERO-before-quiet
// assertion the pre-R4 design would have failed), US1-AS8 (per-RECIPIENT
// aggregation across two counterparts — the headline behaviour change, with
// no pre-R4 equivalent), US2-AS6 (two groups -> one email), US2-AS7 (the
// direct and group tracks run on independent schedules) and US1-AS7 /
// SC-009 (the max-delay cap: a debounce that keeps resetting cannot starve
// delivery). SC-003 is the burst case's exactly-one + correct-count pair.
//
// UNREAD STATE IS THE INPUT, not message count (data-model.md §5.3): a digest
// reports what is still unread at fire time. DIRECT conversations dedupe per
// unordered actor pair and cannot be left, so a direct conversation — and its
// unread backlog — outlives the test that created it. Every test therefore
// drains the recipient's read state through `markConversationRead` before
// handing over, and `beforeAll` drains whatever a previous run left behind.
// This is the R4 replacement for the deleted spec's actor-pair juggling: with
// no per-conversation marker to leak, disjoint pairs are no longer required —
// a drained read receipt is.
import {
  delay,
  deleteMailSlurperMails,
  digestTestTimeoutMs,
  digestWindow,
  preFireProbeAfterBurstMs,
  getMailsData,
  TestScenarioFactory,
  TestScenarioNoPreCreationConfig,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
import { leaveConversation } from '@functional-api/communications/conversations/conversation.request.params';
import {
  conversationMessageDirectDigestSubject,
  conversationMessageDirectSubject,
  conversationMessageGroupDigestSubject,
  conversationMessageGroupSubject,
  createDirectConversation,
  createGroupConversation,
  markConversationRead,
  sendConversationMessage,
  updateConversationMessagingSettings,
  waitForMailsCountAtLeast,
} from '../notification.helpers';

const scenarioConfig: TestScenarioNoPreCreationConfig = {
  name: 'conversation-messages-digest',
};

// The two email tracks under test. `digestWindow` reads the same env vars the
// server does and falls back to the PRODUCTION defaults when they are unset —
// so a harness pointed at a production-windowed stack waits production-length
// periods rather than concluding "nothing arrived" after four seconds.
const directEmail = digestWindow('email', 'direct');
const groupEmail = digestWindow('email', 'group');

// Recipient B for every scenario here; A and C are her two 1:1 counterparts.
const recipient = () => TestUserManager.users.qaUser;
const RECIPIENT_ROLE = TestUser.QA_USER;

/** Room id -> the last message id sent into it, for the read-state drain. */
const lastMessageByRoom = new Map<string, string>();

const sendInto = async (
  roomId: string,
  message: string,
  senderRole: TestUser
) => {
  const messageId = await sendConversationMessage(roomId, message, senderRole);
  lastMessageByRoom.set(roomId, messageId);
  return messageId;
};

/**
 * Marks everything the recipient has been sent as read, then waits out the
 * LONGER of the two email windows so any track still armed flushes (and,
 * finding nothing unread, cancels) before the next test arms it again.
 *
 * Without this, unread backlog would accumulate across tests and every
 * "count of N" assertion after the first would be reporting the wrong number
 * — a slow-motion false failure that is painful to diagnose.
 */
const drainRecipientUnread = async () => {
  for (const [roomId, messageId] of lastMessageByRoom) {
    await markConversationRead(roomId, messageId, RECIPIENT_ROLE).catch(
      () => {}
    );
  }
  // Grace covers `email:group` — the longer of the two email tracks — at its
  // MAX-DELAY bound, so a track armed earlier in the test cannot fire during
  // the next one.
  await delay(groupEmail.maxDelayGraceMs);
};

beforeAll(async () => {
  await TestScenarioFactory.createBaseScenarioEmpty(scenarioConfig);
  await updateConversationMessagingSettings(
    recipient().id,
    { direct: { email: true }, group: { email: true } },
    RECIPIENT_ROLE
  );
}, 300_000);

afterAll(async () => {
  await updateConversationMessagingSettings(
    recipient().id,
    { direct: { email: false }, group: { email: false } },
    RECIPIENT_ROLE
  );
}, 120_000);

describe('Conversation-message notifications — debounce & digest (R4)', () => {
  describe('US1-AS3 / SC-003: a burst inside one quiet period yields exactly ONE digest', () => {
    let roomId = '';

    beforeAll(async () => {
      const res = await createDirectConversation(
        recipient().agentId,
        TestUser.GLOBAL_ADMIN
      );
      roomId = res?.data?.createConversation?.room?.id ?? '';
      expect(roomId).toBeTruthy();

      // Zero the unread baseline: this actor pair's conversation may already
      // carry unread messages from an earlier run (a DIRECT conversation is
      // deduped per pair and cannot be left), which would inflate the count
      // this test asserts on.
      await sendInto(roomId, 'Digest spec baseline drain', TestUser.GLOBAL_ADMIN);
      await drainRecipientUnread();
    }, directEmail.testTimeoutMs + groupEmail.maxDelayGraceMs);

    afterAll(async () => {
      await drainRecipientUnread();
    }, groupEmail.maxDelayGraceMs + 60_000);

    test(
      'zero emails before the quiet period elapses, then exactly one reporting a count of 5',
      async () => {
        await deleteMailSlurperMails();

        // Act — 5 messages spaced far closer together than the quiet period,
        // so each one resets the debounce. The burst start is recorded because
        // the probe below must respect the FR-011b cap, which is measured from
        // the FIRST message and can fire the digest before the quiet period.
        const burstStartedAtMs = Date.now();
        for (let i = 1; i <= 5; i++) {
          await sendInto(
            roomId,
            `Digest burst message ${i}`,
            TestUser.GLOBAL_ADMIN
          );
        }

        // Assert 1 (LOAD-BEARING, new in R4) — nothing has been sent yet.
        // The bound is the earlier of `lastMessage + quiet` and the FR-011b
        // cap, so any email observed here means the pipeline sent on arrival
        // instead of debouncing. The pre-R4 build emailed on the FIRST message
        // and would fail here.
        await delay(preFireProbeAfterBurstMs(directEmail, burstStartedAtMs));
        const [, totalBeforeQuietElapsed] = await getMailsData();
        expect(totalBeforeQuietElapsed).toBe(0);

        // Assert 2 — the digest lands once the quiet period does elapse.
        // Timeout covers `email:direct` quiet + sweep + pipeline settle.
        const [, totalAfterQuiet] = await waitForMailsCountAtLeast(1, {
          timeout: directEmail.quietGraceMs,
        });
        expect(totalAfterQuiet).toBe(1);

        // Assert 3 — and it is the ONLY one. Grace covers `email:direct` at
        // its MAX-DELAY bound: if the burst had armed five dispatches rather
        // than one, the stragglers have had every chance to land by now.
        await delay(directEmail.maxDelayGraceMs);
        const [mailItems, totalSettled] = await getMailsData();
        expect(totalSettled).toBe(1);

        // Assert 4 — no information was lost: the count is stated (SC-003).
        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(recipient().email)
        );
        expect(mail).toBeDefined();
        expect(mail.subject).toBe(
          conversationMessageDirectSubject(
            TestUserManager.users.globalAdmin.displayName,
            5
          )
        );
        expect(mail.body).toContain('5');
        // Still no message text, and still the per-conversation deep link.
        expect(mail.body).not.toContain('Digest burst message');
      },
      directEmail.testTimeoutMs
    );
  });

  describe('US1-AS8: unread from two counterparts aggregates into ONE per-recipient email', () => {
    // No pre-R4 equivalent — the old design's marker was per (recipient,
    // conversation), so two conversations deliberately produced two emails.
    // R4 debounces per RECIPIENT track, so they must produce one.
    let roomAId = '';
    let roomCId = '';

    beforeAll(async () => {
      const resA = await createDirectConversation(
        recipient().agentId,
        TestUser.GLOBAL_ADMIN
      );
      roomAId = resA?.data?.createConversation?.room?.id ?? '';
      // A DIFFERENT sender makes this a genuinely distinct actor pair, hence a
      // distinct conversation under the dedup rule.
      const resC = await createDirectConversation(
        recipient().agentId,
        TestUser.SPACE_ADMIN
      );
      roomCId = resC?.data?.createConversation?.room?.id ?? '';
      expect(roomAId).toBeTruthy();
      expect(roomCId).toBeTruthy();

      await sendInto(roomAId, 'Aggregation baseline drain A', TestUser.GLOBAL_ADMIN);
      await sendInto(roomCId, 'Aggregation baseline drain C', TestUser.SPACE_ADMIN);
      await drainRecipientUnread();
    }, directEmail.testTimeoutMs + groupEmail.maxDelayGraceMs);

    afterAll(async () => {
      await drainRecipientUnread();
    }, groupEmail.maxDelayGraceMs + 60_000);

    test(
      'ONE email lists both counterparts with their own counts, not one email per conversation',
      async () => {
        await deleteMailSlurperMails();

        // Act — 2 messages from A and 3 from C, all inside one quiet period.
        const burstStartedAtMs = Date.now();
        for (let i = 1; i <= 2; i++) {
          await sendInto(roomAId, `From A ${i}`, TestUser.GLOBAL_ADMIN);
        }
        for (let i = 1; i <= 3; i++) {
          await sendInto(roomCId, `From C ${i}`, TestUser.SPACE_ADMIN);
        }

        // Assert — still nothing before the window elapses (the earlier of
        // `email:direct` quiet from the last message and the FR-011b cap from
        // the first).
        await delay(preFireProbeAfterBurstMs(directEmail, burstStartedAtMs));
        const [, totalBeforeQuietElapsed] = await getMailsData();
        expect(totalBeforeQuietElapsed).toBe(0);

        const [, totalAfterQuiet] = await waitForMailsCountAtLeast(1, {
          timeout: directEmail.quietGraceMs,
        });
        expect(totalAfterQuiet).toBe(1);

        // Settle a full `email:direct` max-delay bound: a regression that kept
        // the pre-R4 per-conversation model would deliver C's separate email
        // in this stretch, and an "at least 1" check would never see it.
        await delay(directEmail.maxDelayGraceMs);
        const [mailItems, totalSettled] = await getMailsData();
        expect(totalSettled).toBe(1);

        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(recipient().email)
        );
        expect(mail).toBeDefined();
        // Multi-entry subject: neither counterpart is singled out.
        expect(mail.subject).toBe(conversationMessageDirectDigestSubject(5, 2));
        // Body lists BOTH counterparts, each with its own count.
        expect(mail.body).toContain(
          TestUserManager.users.globalAdmin.displayName
        );
        expect(mail.body).toContain(TestUserManager.users.spaceAdmin.displayName);
        expect(mail.body).not.toContain('From A 1');
        expect(mail.body).not.toContain('From C 1');
      },
      directEmail.testTimeoutMs
    );
  });

  describe('US2-AS6: unread in two groups aggregates into ONE email', () => {
    const groupIds: string[] = [];
    let group1RoomId = '';
    let group2RoomId = '';
    const group1Name = 'Digest Group One';
    const group2Name = 'Digest Group Two';

    beforeAll(async () => {
      // Fresh groups every run: unlike a DIRECT pair, a group conversation is
      // created new here, so its unread baseline is genuinely zero and needs
      // no drain.
      const res1 = await createGroupConversation(
        [recipient().agentId, TestUserManager.users.spaceMember.agentId],
        group1Name,
        TestUser.GLOBAL_ADMIN
      );
      const res2 = await createGroupConversation(
        [recipient().agentId, TestUserManager.users.spaceMember.agentId],
        group2Name,
        TestUser.GLOBAL_ADMIN
      );
      group1RoomId = res1?.data?.createConversation?.room?.id ?? '';
      group2RoomId = res2?.data?.createConversation?.room?.id ?? '';
      groupIds.push(
        res1?.data?.createConversation?.id ?? '',
        res2?.data?.createConversation?.id ?? ''
      );
      expect(group1RoomId).toBeTruthy();
      expect(group2RoomId).toBeTruthy();
    }, 120_000);

    afterAll(async () => {
      await drainRecipientUnread();
      for (const id of groupIds) {
        if (id) await leaveConversation(id, TestUser.GLOBAL_ADMIN).catch(() => {});
      }
    }, groupEmail.maxDelayGraceMs + 60_000);

    test(
      'ONE email lists both groups with their own counts',
      async () => {
        await deleteMailSlurperMails();

        const burstStartedAtMs = Date.now();
        await sendInto(group1RoomId, 'Group one message', TestUser.GLOBAL_ADMIN);
        for (let i = 1; i <= 2; i++) {
          await sendInto(
            group2RoomId,
            `Group two message ${i}`,
            TestUser.GLOBAL_ADMIN
          );
        }

        // The earlier of `email:group` quiet from the last message and the
        // FR-011b cap from the first.
        await delay(preFireProbeAfterBurstMs(groupEmail, burstStartedAtMs));
        const [, totalBeforeQuietElapsed] = await getMailsData();
        expect(totalBeforeQuietElapsed).toBe(0);

        const [, totalAfterQuiet] = await waitForMailsCountAtLeast(1, {
          timeout: groupEmail.quietGraceMs,
        });
        expect(totalAfterQuiet).toBe(1);

        // Settle a full `email:group` max-delay bound before claiming "one".
        await delay(groupEmail.maxDelayGraceMs);
        const [mailItems, totalSettled] = await getMailsData();
        expect(totalSettled).toBe(1);

        const mail = mailItems.find((m: any) =>
          m.toAddresses?.includes(recipient().email)
        );
        expect(mail).toBeDefined();
        expect(mail.subject).toBe(conversationMessageGroupDigestSubject(3, 2));
        expect(mail.body).toContain(group1Name);
        expect(mail.body).toContain(group2Name);
        expect(mail.body).not.toContain('Group two message 1');
      },
      groupEmail.testTimeoutMs
    );
  });

  describe('US2-AS7: the direct and group email tracks run on independent schedules', () => {
    let directRoomId = '';
    let groupRoomId = '';
    let groupId = '';
    const groupName = 'Digest Track Independence';

    beforeAll(async () => {
      const directRes = await createDirectConversation(
        recipient().agentId,
        TestUser.SUBSPACE_ADMIN
      );
      directRoomId = directRes?.data?.createConversation?.room?.id ?? '';
      const groupRes = await createGroupConversation(
        [recipient().agentId, TestUserManager.users.spaceMember.agentId],
        groupName,
        TestUser.GLOBAL_ADMIN
      );
      groupRoomId = groupRes?.data?.createConversation?.room?.id ?? '';
      groupId = groupRes?.data?.createConversation?.id ?? '';
      expect(directRoomId).toBeTruthy();
      expect(groupRoomId).toBeTruthy();

      await sendInto(
        directRoomId,
        'Track independence baseline drain',
        TestUser.SUBSPACE_ADMIN
      );
      await drainRecipientUnread();
    }, directEmail.testTimeoutMs + groupEmail.maxDelayGraceMs);

    afterAll(async () => {
      await drainRecipientUnread();
      if (groupId) {
        await leaveConversation(groupId, TestUser.GLOBAL_ADMIN).catch(() => {});
      }
    }, groupEmail.maxDelayGraceMs + 60_000);

    test(
      'two emails arrive, each on its own track, and the direct one is not held back by the longer group window',
      async () => {
        // Declared precondition, asserted rather than assumed: the ordering
        // claim below only means anything on a stack whose direct quiet period
        // is genuinely shorter than its group one. A stack configured
        // otherwise fails loudly here instead of flaking later.
        expect(directEmail.quietMs).toBeLessThan(groupEmail.quietMs);

        await deleteMailSlurperMails();

        await sendInto(groupRoomId, 'Independence group message', TestUser.GLOBAL_ADMIN);
        await sendInto(
          directRoomId,
          'Independence direct message',
          TestUser.SUBSPACE_ADMIN
        );

        // The direct track fires first: poll only as long as the DIRECT
        // window allows. If the direct digest were merged into, or gated
        // behind, the group schedule, nothing would be here yet.
        const [firstBatch, firstTotal] = await waitForMailsCountAtLeast(1, {
          timeout: directEmail.quietGraceMs,
        });
        expect(firstTotal).toBe(1);
        expect(firstBatch[0].subject).toBe(
          conversationMessageDirectSubject(
            TestUserManager.users.subspaceAdmin.displayName,
            1
          )
        );

        // ...and the group digest follows on its own, longer schedule.
        const [, secondTotal] = await waitForMailsCountAtLeast(2, {
          timeout: groupEmail.maxDelayGraceMs,
        });
        expect(secondTotal).toBe(2);

        const [mailItems] = await getMailsData();
        const subjects = mailItems.map((m: any) => m.subject);
        // TWO emails with two distinct shapes — never one merged digest.
        expect(subjects).toContain(
          conversationMessageDirectSubject(
            TestUserManager.users.subspaceAdmin.displayName,
            1
          )
        );
        expect(subjects).toContain(conversationMessageGroupSubject(groupName, 1));
      },
      // Waits on BOTH email tracks in sequence — timeout derived from both.
      digestTestTimeoutMs([directEmail, groupEmail])
    );
  });

  describe('US1-AS7 / SC-009: the max-delay cap bounds a debounce that never settles', () => {
    let roomId = '';

    beforeAll(async () => {
      const res = await createDirectConversation(
        recipient().agentId,
        TestUser.SUBSPACE_MEMBER
      );
      roomId = res?.data?.createConversation?.room?.id ?? '';
      expect(roomId).toBeTruthy();

      await sendInto(roomId, 'Max-delay baseline drain', TestUser.SUBSPACE_MEMBER);
      await drainRecipientUnread();
    }, directEmail.testTimeoutMs + groupEmail.maxDelayGraceMs);

    afterAll(async () => {
      await drainRecipientUnread();
    }, groupEmail.maxDelayGraceMs + 60_000);

    test(
      'an email still arrives within the max delay while messages keep resetting the quiet period',
      async () => {
        await deleteMailSlurperMails();

        // Send faster than the quiet period for LONGER than the cap, so the
        // debounce alone would never fire. Both the interval and the duration
        // are derived from the window — a stack with different windows
        // exercises the same property, not a differently-shaped one.
        const sendIntervalMs = Math.max(
          250,
          Math.floor(directEmail.quietMs / 2)
        );
        const keepSendingUntil =
          Date.now() + directEmail.maxDelayMs + directEmail.quietMs;

        const firstMessageAt = Date.now();
        let stopped = false;
        const senderLoop = (async () => {
          let n = 0;
          while (!stopped && Date.now() < keepSendingUntil) {
            await sendInto(
              roomId,
              `Max-delay probe ${++n}`,
              TestUser.SUBSPACE_MEMBER
            );
            await delay(sendIntervalMs);
          }
        })();

        // Poll for the digest for as long as the CAP allows, measured from the
        // first message on the track — that is exactly the SC-009 bound.
        const [, total] = await waitForMailsCountAtLeast(1, {
          timeout: directEmail.maxDelayGraceMs,
          interval: 1_000,
        });
        const elapsedMs = Date.now() - firstMessageAt;

        stopped = true;
        await senderLoop;

        expect(total).toBeGreaterThanOrEqual(1);
        // The cap held: delivery was not starved by the continuous traffic.
        expect(elapsedMs).toBeLessThanOrEqual(directEmail.maxDelayGraceMs);
        // ...and the debounce was genuinely still being reset when it fired —
        // the send loop had not finished, so this was the cap firing, not the
        // quiet period finally elapsing after the traffic stopped.
        expect(Date.now()).toBeLessThanOrEqual(keepSendingUntil + 5_000);
      },
      directEmail.testTimeoutMs
    );
  });
});
