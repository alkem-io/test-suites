/**
 * Authenticator app at Kratos (US1, SC-004) and the login proxy's bounds on the
 * second step (D28, D34, D36, D41 (c)).
 * Plan: ./second-factor-test-plan.md. Needs a stack with the feature's Kratos
 * values, the Kratos admin port, loopback Redis/Postgres, and — for the
 * re-login and forged-header case — this feature's kratos-webhooks build.
 */
import {
  clearAddressCounters,
  credentialTypes,
  enrolTotp,
  isInvalidCodeVerdict,
  getUserToken,
  kratosErrorId,
  loginWithPassword,
  loginWithTotp,
  passwordLogin,
  readLoginFlow,
  removeTotp,
  startSecondStep,
  submitLogin,
  submitWrongTotp,
  totpCode,
  whoami,
  wrongTotpCode,
} from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();

const enrolled = async (tag: string) => {
  const user = await throwawayUser(tag);
  const enrolling = await loginWithPassword(user.email);
  const secret = await enrolTotp(enrolling.sessionToken);
  return { user, secret, enrollingToken: enrolling.sessionToken };
};

describe('Second factor — authenticator app', () => {
  test('US1-AS2 enrolment leaves a totp credential at Kratos; US1-AS4 the password alone owes the second step', async () => {
    const { user } = await enrolled('totp');

    expect(await credentialTypes(user.identityId)).toContain('totp');

    const first = await loginWithPassword(user.email);
    expect(first.session.authenticator_assurance_level).toBe('aal1');
    const answer = await whoami(first.sessionToken);
    expect(answer.status).toBe(403);
    expect(kratosErrorId(answer)).toBe('session_aal2_required');
  });

  test('R11 what the enrolling session is worth (recorded, either answer accepted)', async () => {
    const { enrollingToken } = await enrolled('enrolling');

    const answer = await whoami(enrollingToken);
    const found =
      answer.status === 200
        ? `200 ${answer.body?.authenticator_assurance_level}`
        : `${answer.status} ${kratosErrorId(answer)}`;
    console.log(`[second-factor R11] whoami for the enrolling session: ${found}`);
    expect(['200 aal2', '403 session_aal2_required']).toContain(found);
  });

  test('US1-AS4 a wrong code is refused; the right one yields aal2 with totp; US1-AS6 after removal the password alone signs in', async () => {
    const { user, secret } = await enrolled('signin');

    const first = await loginWithPassword(user.email);
    const step = await startSecondStep(first.sessionToken);
    const [wrong] = await submitWrongTotp({ ...step, secret }, 1);
    expect(wrong.status).toBe(400);
    expect(isInvalidCodeVerdict(wrong)).toBe(true);

    const second = await loginWithTotp(user.email, secret);
    expect(second.session.authenticator_assurance_level).toBe('aal2');
    expect(second.session.authentication_methods.map(m => m.method)).toContain(
      'totp'
    );

    await removeTotp(second.sessionToken);
    expect(await credentialTypes(user.identityId)).not.toContain('totp');
    const after = await loginWithPassword(user.email);
    const answer = await whoami(after.sessionToken);
    expect(answer.status).toBe(200);
    expect(answer.body.authenticator_assurance_level).toBe('aal1');
  });

  test('D28 D34 D36 the per-address bound survives a re-login and forged address headers', async () => {
    const { user, secret } = await enrolled('bound');
    const max = Number(process.env.LOGIN_BACKOFF_MAX_IP_ATTEMPTS ?? '20');
    const firstBatch = Math.floor(max / 2);
    const secondBatch = max - firstBatch;
    // Two counters of the harness: no two submissions name the same address.
    let n = 0;
    const forged = () => {
      n++;
      return {
        'True-Client-Ip': `198.18.${n >> 8}.${n & 255}`,
        'X-Forwarded-For': `198.19.${n >> 8}.${n & 255}`,
      };
    };

    /** A password login, then `size - 1` wrong codes at its second step. */
    const loginThenWrongCodes = async (size: number) => {
      // A fresh native flow carries nothing over: the re-login's new jar.
      const login = await passwordLogin(user.email, { headers: forged() });
      expect(login.status).toBe(200);
      const step = await startSecondStep(login.body.session_token);
      const wrong = await submitWrongTotp({ ...step, secret }, size - 1, {
        headers: forged,
      });
      return { step, answers: [login, ...wrong] };
    };

    // Nothing else signs in between this clear and the last submission.
    await clearAddressCounters();
    try {
      const first = await loginThenWrongCodes(firstBatch);
      const second = await loginThenWrongCodes(secondBatch);
      const answers = [...first.answers, ...second.answers];
      expect(answers).toHaveLength(max);
      expect(answers.map(a => a.status)).not.toContain(429);

      const step = { ...second.step, secret };
      const [overBound] = await submitWrongTotp(step, 1, { headers: forged });
      expect(overBound.status).toBe(429);
      const correct = await submitLogin(
        step.flowId,
        { method: 'totp', totp_code: totpCode(secret) },
        { sessionToken: step.sessionToken, headers: forged() }
      );
      expect(correct.status).toBe(429);
    } finally {
      await clearAddressCounters();
    }
  });

  test('D41 (c) a code sent by GET, PUT or PATCH is not evaluated; POST still is', async () => {
    const { user, secret } = await enrolled('methods');
    const first = await loginWithPassword(user.email);
    const step = await startSecondStep(first.sessionToken);

    for (const method of ['GET', 'PUT', 'PATCH'] as const) {
      const [answer] = await submitWrongTotp({ ...step, secret }, 1, { method });
      expect(isInvalidCodeVerdict(answer), `${method} answer`).toBe(false);
      const flow = await readLoginFlow(step.flowId);
      expect(isInvalidCodeVerdict(flow), `flow after ${method}`).toBe(false);
    }

    // Control: the same detector sees the verdict a POST gets.
    const posted = await submitLogin(
      step.flowId,
      { method: 'totp', totp_code: wrongTotpCode(secret) },
      { sessionToken: step.sessionToken }
    );
    expect(isInvalidCodeVerdict(posted)).toBe(true);

    const signedIn = await submitLogin(
      step.flowId,
      { method: 'totp', totp_code: totpCode(secret) },
      { sessionToken: step.sessionToken }
    );
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.session.authenticator_assurance_level).toBe('aal2');
  });

  test('SC-004 an identity with no second factor signs in exactly as before', async () => {
    const user = await throwawayUser('plain');

    const session = await loginWithPassword(user.email);
    const answer = await whoami(session.sessionToken);
    expect(answer.status).toBe(200);
    expect(answer.body.authenticator_assurance_level).toBe('aal1');
    expect(await getUserToken(user.email)).toEqual(expect.any(String));
  });
});
