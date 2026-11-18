/**
 * The reset with the password made unusable, the settings profile method
 * switched off (so a session cannot change its own recovery address) and the
 * two-step sign-up that still works without it.
 * Plan: ./second-factor-test-plan.md. Needs a stack with the feature's Kratos
 * values, the Kratos admin port, loopback Redis/Postgres and the mail catcher.
 */
import { randomUUID } from 'crypto';
import {
  authenticationAuditRows,
  changePasswordInBrowser,
  clearAddressCounters,
  deleteIdentity,
  deleteThrowawayUser,
  enrolTotp,
  flowMessages,
  getUserToken,
  identitySessions,
  kratosErrorId,
  loginWithPassword,
  loginWithTotp,
  passwordLogin,
  readServedUser,
  readIdentity,
  recoverViaLink,
  registerTwoStep,
  resetSecondFactor,
  secondFactorCredentialsLeft,
  updateSettings,
  verifyInKratosOrFail,
  whoami,
} from '@alkemio/tests-lib';
import { roleTokens, secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();

/** Kratos' "the provided credentials are invalid" message. */
const INVALID_CREDENTIALS = /^4000006:/;

describe('Second factor — reset after a compromise', () => {
  test('US2-AS11 D43 D46 the password is made unusable, matches the outcome row, and is regained only through the emailed link', async () => {
    const member = await throwawayUser('compromise');
    const secret = await enrolTotp(
      (await loginWithPassword(member.email)).sessionToken
    );
    await loginWithTotp(member.email, secret);
    const passwordBefore = (await readIdentity(member.identityId)).credentials
      ?.password?.updated_at;
    expect(passwordBefore).toBeDefined();

    const reset = await resetSecondFactor(
      member.userId,
      { bearerToken: roleTokens().support },
      { invalidatePassword: true }
    );
    expect(reset.body.data?.adminResetUserSecondFactor.passwordInvalidated, reset.raw).toBe(true);

    const rows = (await authenticationAuditRows({ userId: member.userId })).filter(r =>
      r.outcome.startsWith('second_factor_reset_')
    );
    expect(rows.map(r => r.outcome)).toEqual([
      'second_factor_reset_started',
      'second_factor_reset_completed',
    ]);
    expect(rows[0].details).toMatchObject({ invalidatePassword: true });
    const completed = rows[1].details as {
      passwordInvalidated: boolean;
      passwordLastChangedAt?: string;
    };
    expect(completed.passwordInvalidated).toBe(true);

    await clearAddressCounters();
    const oldPassword = await passwordLogin(member.email);
    expect(oldPassword.status).toBe(400);
    expect(flowMessages(oldPassword).some(m => INVALID_CREDENTIALS.test(m))).toBe(true);

    const identity = await readIdentity(member.identityId);
    expect(await secondFactorCredentialsLeft(member.identityId)).toEqual([]);
    expect(await identitySessions(member.identityId)).toEqual([]);
    const passwordAfterReset = identity.credentials?.password?.updated_at;
    expect(Date.parse(passwordAfterReset!)).toBeGreaterThan(Date.parse(passwordBefore!));
    expect(passwordAfterReset).toBe(completed.passwordLastChangedAt);

    // No factor is left: the link's session may set a password straight away.
    const newPassword = `Sf-${randomUUID()}`;
    const { jar, settingsFlowId } = await recoverViaLink(member.identityId);
    expect((await changePasswordInBrowser(jar, settingsFlowId, newPassword)).status).toBe(200);
    const signedIn = await loginWithPassword(member.email, { password: newPassword });
    expect((await whoami(signedIn.sessionToken)).status).toBe(200);

    // The password-change check can fail: after the member's own change it no
    // longer matches.
    expect((await readIdentity(member.identityId)).credentials?.password?.updated_at).not.toBe(
      completed.passwordLastChangedAt
    );
  });

  test('D47 the settings profile method is refused and the identity’s addresses are unchanged', async () => {
    const member = await throwawayUser('profile');
    const before = await readIdentity(member.identityId);
    const session = await loginWithPassword(member.email);

    const answer = await updateSettings(session.sessionToken, {
      method: 'profile',
      traits: { ...before.traits, email: `sf.moved${randomUUID().slice(0, 8)}@alkem.io` },
    });
    expect(answer.status).toBe(404);

    const after = await readIdentity(member.identityId);
    expect(after.traits.email).toBe(before.traits.email);
    expect(after.recovery_addresses?.map(a => a.value)).toEqual(
      before.recovery_addresses?.map(a => a.value)
    );
    expect(after.verifiable_addresses?.map(a => a.value)).toEqual(
      before.verifiable_addresses?.map(a => a.value)
    );
  });

  test('D47 the two-step sign-up still creates an identity that verifies and signs in', async () => {
    const email = `sf.signup${randomUUID().slice(0, 8)}@alkem.io`;
    const { profileStep, passwordStep } = await registerTwoStep(email);
    const identityId: string | undefined = passwordStep.body?.identity?.id;
    let cleanupError: unknown;
    try {
      // The profile step was accepted as a step: Kratos answers with the
      // flow's next screen (the password field) and no error. A refused
      // profile method would leave the password step creating the identity
      // in one go, which is not the product's sign-up.
      const profileFlow = JSON.stringify(profileStep.body).slice(0, 300);
      expect(kratosErrorId(profileStep), profileFlow).toBeUndefined();
      expect(
        (profileStep.body?.ui?.nodes ?? []).some(
          (n: { attributes?: { name?: string } }) => n.attributes?.name === 'password'
        ),
        profileFlow
      ).toBe(true);
      expect(
        [
          ...(profileStep.body?.ui?.messages ?? []),
          ...(profileStep.body?.ui?.nodes ?? []).flatMap(
            (n: { messages?: unknown[] }) => n.messages ?? []
          ),
        ].filter((m: { type?: string }) => m.type === 'error'),
        profileFlow
      ).toEqual([]);
      expect(passwordStep.status, JSON.stringify(passwordStep.body).slice(0, 300)).toBe(200);
      expect(identityId).toBeDefined();

      await verifyInKratosOrFail(email);
      expect((await readIdentity(identityId!)).verifiable_addresses?.[0]?.verified).toBe(true);
      const session = await loginWithPassword(email);
      expect((await whoami(session.sessionToken)).status).toBe(200);
    } finally {
      try {
        const token = await getUserToken(email).catch(() => undefined);
        const me = token ? await readServedUser({ bearerToken: token }) : undefined;
        const userId = me?.body.data?.me?.user?.id;
        if (userId) {
          await deleteThrowawayUser({ userId }, roleTokens().usersAdmin);
        } else if (identityId) {
          await deleteIdentity(identityId);
        }
      } catch (error) {
        cleanupError = error;
      }
    }
    // Checked after the case's own outcome, which a throw in `finally` would mask.
    if (cleanupError) {
      throw cleanupError;
    }
  });
});
