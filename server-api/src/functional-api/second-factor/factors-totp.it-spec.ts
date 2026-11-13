/**
 * Authenticator app at Kratos, an identity with no second factor, and the
 * login proxy's bounds on the second step (its per-address count, the forged
 * address headers it ignores, and the methods it does not evaluate).
 * Plan: ./second-factor-test-plan.md. Needs a stack with the feature's Kratos
 * values, the Kratos admin port, loopback Redis/Postgres, and — for the
 * re-login and forged-header case — this feature's kratos-webhooks build.
 */
import {
  addressCounters,
  addressCountersExpireAt,
  clearAddressCounters,
  credentialTypes,
  enrolTotp,
  isInvalidCodeVerdict,
  getUserToken,
  kratosErrorId,
  loginWithPassword,
  loginWithTotp,
  passwordLogin,
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
const FORGED_TRUE_CLIENT_IP = '198.18.';
const FORGED_FORWARDED_FOR = '198.19.';

const enrolled = async (tag: string) => {
  const user = await throwawayUser(tag);
  const secret = await enrolTotp((await loginWithPassword(user.email)).sessionToken);
  return { user, secret };
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
    const max = Number(process.env.LOGIN_BACKOFF_MAX_IP_ATTEMPTS);
    if (!Number.isInteger(max) || max < 2) {
      throw new Error(
        "LOGIN_BACKOFF_MAX_IP_ATTEMPTS must be the stack's login-proxy threshold (see .env.default)"
      );
    }
    const firstBatch = Math.floor(max / 2);
    const secondBatch = max - firstBatch;
    // No two submissions name the same address, and each header has its own
    // range, so a key the proxy holds says which header it trusted.
    let n = 0;
    const forged = () => {
      n++;
      return {
        'True-Client-Ip': `${FORGED_TRUE_CLIENT_IP}${n >> 8}.${n & 255}`,
        'X-Forwarded-For': `${FORGED_FORWARDED_FOR}${n >> 8}.${n & 255}`,
      };
    };

    // The end of the window the counting started in, read once, right after
    // the submission that creates the key: past it, a short count or a
    // missing key is the stack's slowness, not the product.
    let windowEnd: number | null | undefined;
    const windowLapsed = () =>
      windowEnd !== null && windowEnd !== undefined && Date.now() >= windowEnd;

    /** A password login, then `size - 1` wrong codes at its second step. */
    const loginThenWrongCodes = async (size: number) => {
      // A fresh native flow carries nothing over: the re-login's new jar.
      const login = await passwordLogin(user.email, { headers: forged() });
      expect(login.status).toBe(200);
      if (windowEnd === undefined) windowEnd = await addressCountersExpireAt();
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
      const early = answers.findIndex(a => a.status === 429);
      expect(
        early,
        `submission ${early + 1} of ${max} answered 429: the stack's threshold is lower than LOGIN_BACKOFF_MAX_IP_ATTEMPTS=${max}, or the proxy counts a submission more than once`
      ).toBe(-1);

      // Whose red each outcome is. No counter at all: the harness reads
      // another Redis (environment). Keys in the forged X-Forwarded-For range:
      // the edge in front of the proxy passes a sender's header through
      // (environment). Keys in the forged True-Client-Ip range: the proxy
      // trusts a header any sender sets (product). A count short of every
      // submission: a re-login cleared the address (product), unless the
      // window the first batch counted in has passed (environment).
      const counters = await addressCounters();
      const lapsed = (when: string) =>
        new Error(
          `environment: the proxy's fixed window lapsed before ${when} (${max} submissions took too long on this stack) — rerun on a faster stack`
        );
      if (windowLapsed()) throw lapsed('the counter was read');
      if (counters.length === 0) {
        throw new Error(
          "environment: the harness Redis (REDIS_HOST) holds no login_backoff:ip:* key — it is not the login proxy's Redis"
        );
      }
      const addresses = counters.map(c => c.address);
      expect(
        addresses.filter(a => a.startsWith(FORGED_FORWARDED_FOR)),
        `R32, the environment's red, not the product's: the edge passes a sender's X-Forwarded-For through, so the per-address bound may not be cited behind it. Keys: ${addresses.join(', ')}`
      ).toEqual([]);
      expect(
        addresses,
        `D36: the proxy keyed ${addresses.length} addresses — it counts the forged True-Client-Ip`
      ).toHaveLength(1);
      const [{ value }] = counters;
      expect(
        Number(value),
        `D34: the address counter holds '${value}' after ${max} submissions within one window — the re-login cleared it. A value that is not a plain number is the harness misreading the proxy's stored shape, not the product`
      ).toBe(max);

      const step = { ...second.step, secret };
      const [overBound] = await submitWrongTotp(step, 1, { headers: forged });
      if (overBound.status !== 429 && windowLapsed()) {
        throw lapsed('the submission over the bound');
      }
      expect(overBound.status).toBe(429);
      const correct = await submitLogin(
        step.flowId,
        { method: 'totp', totp_code: totpCode(secret) },
        { sessionToken: step.sessionToken, headers: forged() }
      );
      if (correct.status !== 429 && windowLapsed()) {
        throw lapsed('the correct code');
      }
      expect(correct.status).toBe(429);
    } finally {
      await clearAddressCounters();
    }
  });

  test('D41 (c) a code sent by GET, PUT or PATCH is not evaluated, and the correct one signs nobody in; POST still is', async () => {
    const { user, secret } = await enrolled('methods');
    const first = await loginWithPassword(user.email);
    const step = await startSecondStep(first.sessionToken);

    for (const method of ['GET', 'PUT', 'PATCH'] as const) {
      const [answer] = await submitWrongTotp({ ...step, secret }, 1, { method });
      expect(isInvalidCodeVerdict(answer), `${method} answer`).toBe(false);
      // An answer with no verdict could still come from an evaluation (a
      // redirect, a rewritten body). A sign-in by the correct code cannot.
      const correct = await submitLogin(
        step.flowId,
        { method: 'totp', totp_code: totpCode(secret) },
        { sessionToken: step.sessionToken, method }
      );
      expect(correct.body?.session, `${method} correct code`).toBeUndefined();
      expect(correct.body?.session_token, `${method} correct code`).toBeUndefined();
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
