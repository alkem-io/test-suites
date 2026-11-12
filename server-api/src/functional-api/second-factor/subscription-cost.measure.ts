/**
 * A ONE-OFF MEASUREMENT, not a test (risk R22): what re-checking the session
 * before every event costs on a room with a hundred cookie sockets under an
 * organisation rule in grace. Run once, by path, in the verify phase — never
 * by CI:
 *
 *   cd server-api && SECOND_FACTOR_MEASURE=1 pnpm exec vitest run --project second-factor-measure subscription-cost
 *
 * Records, per message, the wall time from the post to the hundredth delivery
 * (the number R22 is judged on: it includes the session, marker and actor
 * reads the query count does not show) and, when the database exposes
 * `pg_stat_statements` over the loopback connection, the statements executed
 * per delivered event; otherwise it says the count was not available. Asserts
 * only that every socket received every message. Copy the `[second-factor
 * R22]` lines into the workspace plan's Performance / constraints note.
 */
import {
  clearAddressCounters,
  createPrivateRoom,
  eventually,
  mintBffSession,
  postToRoom,
  queryHarnessDb,
  setOrganizationRule,
  subscribeToRoom,
  withThrowawayOrganization,
  type RoomSubscription,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();
const SOCKETS = 100;
const MESSAGES = 10;
const DELIVERY_BOUND_MS = 120_000;

/** Statements executed so far, or null when the database does not expose them. */
const statementCount = async (): Promise<number | null> => {
  try {
    const [row] = await queryHarnessDb<{ calls: string }>(
      'SELECT sum(calls)::text AS calls FROM pg_stat_statements'
    );
    return Number(row.calls);
  } catch {
    return null;
  }
};

test('R22 a hundred cookie sockets on one room under a rule in grace', async () => {
  const admin = await throwawayUser('costadmin');
  const members: ThrowawayUser[] = [];
  for (let i = 0; i < SOCKETS; i++) {
    // Each creation signs in through the login proxy from this address.
    await clearAddressCounters();
    members.push(await throwawayUser(`cost${i}`));
  }

  await withThrowawayOrganization({ admin, associates: members }, async org => {
    const asAdmin = { bearerToken: admin.token };
    expect((await setOrganizationRule(org.id, true, asAdmin)).body.errors).toBeUndefined();
    const roomId = await createPrivateRoom(asAdmin, members.map(m => m.userId));

    const sockets: RoomSubscription[] = [];
    try {
      for (const member of members) {
        const { cookieHeader } = await mintBffSession(member.identityId, member.userId);
        sockets.push(await subscribeToRoom(cookieHeader, roomId));
      }

      for (let n = 0; n < MESSAGES; n++) {
        const queriesBefore = await statementCount();
        const startedAt = Date.now();
        const id = await postToRoom(roomId, `measure ${n}`, asAdmin);
        await eventually(
          () => sockets.every(s => s.messageIds.includes(id)),
          DELIVERY_BOUND_MS,
          `delivery of message ${n} to every socket`
        );
        const wallMs = Date.now() - startedAt;
        const queriesAfter = await statementCount();
        const perEvent =
          queriesBefore === null || queriesAfter === null
            ? 'not available (pg_stat_statements not exposed)'
            : ((queriesAfter - queriesBefore) / SOCKETS).toFixed(1);
        console.log(
          `[second-factor R22] message ${n}: ${wallMs} ms to the ${SOCKETS}th delivery; statements per delivered event: ${perEvent}`
        );
      }

      for (const socket of sockets) {
        expect(socket.messageIds).toHaveLength(MESSAGES);
      }
    } finally {
      for (const socket of sockets) socket.dispose();
    }
  });
});
