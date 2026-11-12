/**
 * A member's own change to their second factor is recorded in the audit
 * trail — the standing proof that Kratos' settings hooks run for totp and
 * lookup_secret. Plan: ./second-factor-test-plan.md.
 * Needs this feature's kratos-webhooks build (KRATOS_WEBHOOKS_IMAGE): on the
 * released image the hook's route does not exist and the red is the
 * environment's. The webauthn hook is the browser track's (security-key.spec.ts).
 */
import {
  authenticationAuditRows,
  disableRecoveryCodes,
  enrolTotp,
  generateRecoveryCodes,
  loginWithPassword,
  loginWithTotp,
  removeTotp,
  type AuthenticationAuditRow,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();
const ROW_BOUND_MS = 10_000;

const observedRows = async (user: ThrowawayUser, method: string) =>
  (await authenticationAuditRows({ userId: user.userId })).filter(
    r =>
      r.outcome === 'observed' &&
      (r.details as { method?: string } | null)?.method === method
  );

/** Polls loopback SQL until `count` rows for `method` exist, within the bound. */
const awaitObservedRows = async (
  user: ThrowawayUser,
  method: string,
  count: number
): Promise<AuthenticationAuditRow[]> => {
  const deadline = Date.now() + ROW_BOUND_MS;
  for (;;) {
    const rows = await observedRows(user, method);
    if (rows.length >= count) return rows;
    if (Date.now() > deadline) {
      throw new Error(
        `${method}: settings hook did not run — ${rows.length} of ${count} 'observed' rows within ${ROW_BOUND_MS} ms (research R32)`
      );
    }
    await new Promise(r => setTimeout(r, 250));
  }
};

/** Every key an observed row's details may carry: nothing names an address. */
const DETAILS_KEYS = ['method', 'observedAt', 'requestContext', 'sourceFlowId'];

const expectRowShape = (row: AuthenticationAuditRow, user: ThrowawayUser) => {
  expect(row.subjectUserId).toBe(user.userId);
  expect(row.initiatorUserId).toBe(user.userId);
  expect(JSON.stringify(row.details)).not.toContain(user.email);
  const keys = Object.keys(row.details ?? {});
  expect(keys).toEqual(expect.arrayContaining(['method', 'observedAt']));
  expect(keys.filter(key => !DETAILS_KEYS.includes(key))).toEqual([]);
  const context = (row.details as { requestContext?: Record<string, unknown> })
    .requestContext;
  if (context !== undefined) {
    expect(Object.keys(context)).toEqual(['userAgent']);
    expect(String(context.userAgent).length).toBeLessThanOrEqual(256);
  }
};

describe('Second factor — a member’s own change is recorded', () => {
  test('US2-AS12 enrolling and removing an authenticator, generating and removing recovery codes: one observed row each', async () => {
    const user = await throwawayUser('record');

    const secret = await enrolTotp(
      (await loginWithPassword(user.email)).sessionToken
    );
    const [enrolment] = await awaitObservedRows(user, 'totp', 1);
    expect(await observedRows(user, 'totp')).toHaveLength(1);
    expectRowShape(enrolment, user);

    const secondFactor = await loginWithTotp(user.email, secret);
    await generateRecoveryCodes(secondFactor.sessionToken);
    expectRowShape((await awaitObservedRows(user, 'lookup_secret', 1))[0], user);
    expect(await observedRows(user, 'lookup_secret')).toHaveLength(1);

    await disableRecoveryCodes(secondFactor.sessionToken);
    expectRowShape((await awaitObservedRows(user, 'lookup_secret', 2))[1], user);
    expect(await observedRows(user, 'lookup_secret')).toHaveLength(2);

    await removeTotp(secondFactor.sessionToken);
    expectRowShape((await awaitObservedRows(user, 'totp', 2))[1], user);
    expect(await observedRows(user, 'totp')).toHaveLength(2);
  });
});
