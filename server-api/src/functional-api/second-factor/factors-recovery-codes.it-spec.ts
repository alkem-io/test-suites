/**
 * Recovery codes at Kratos and the emailed recovery link of an enrolled
 * identity. Codes with no other factor are a one-off measurement
 * (recovery-codes-only.measure.ts). Plan: ./second-factor-test-plan.md.
 * Needs a stack with the feature's Kratos values and the Kratos admin port.
 */
import { randomUUID } from 'crypto';
import {
  changePasswordInBrowser,
  clearAddressCounters,
  createBrowserSettingsFlow,
  credentialTypes,
  disableRecoveryCodes,
  enrolTotp,
  flowMessages,
  generateRecoveryCodes,
  identitySessions,
  kratosErrorId,
  loginWithPassword,
  loginWithRecoveryCode,
  loginWithTotp,
  passwordLogin,
  readSettingsFlow,
  recoverViaLink,
  recoveryCodesOf,
  startSecondStep,
  submitLogin,
  upgradeBrowserSessionWithTotp,
  whoamiInBrowser,
  type KratosAnswer,
} from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();

const enrolledWithCodes = async (tag: string) => {
  const user = await throwawayUser(tag);
  const secret = await enrolTotp(
    (await loginWithPassword(user.email)).sessionToken
  );
  const secondFactorSession = await loginWithTotp(user.email, secret);
  const codes = await generateRecoveryCodes(secondFactorSession.sessionToken);
  return { user, secret, codes, token: secondFactorSession.sessionToken };
};

/** One recovery code at the second step of a fresh password login, raw. */
const submitRecoveryCode = async (
  email: string,
  code: string
): Promise<KratosAnswer> => {
  const step = await startSecondStep(
    (await loginWithPassword(email)).sessionToken
  );
  return submitLogin(
    step.flowId,
    { method: 'lookup_secret', lookup_secret: code },
    { sessionToken: step.sessionToken }
  );
};

/**
 * Kratos judged the recovery code and refused it: already used (4000012), no
 * codes set up (4000014) or not valid (4000016) — not a flow, CSRF or server
 * error that never reached the code.
 */
const isRecoveryCodeRefused = (answer: KratosAnswer): boolean =>
  answer.status === 400 &&
  answer.body?.session === undefined &&
  flowMessages(answer).some(m => /^40000(12|14|16):/.test(m));

/**
 * A failure message for a code's answer: its status and Kratos' messages,
 * never the body, which carries a session token when a code was accepted.
 */
const verdictOf = (answer: KratosAnswer): string =>
  `${answer.status} ${JSON.stringify(flowMessages(answer))}`;

describe('Second factor — recovery codes', () => {
  test('US2-AS1 a later settings flow does not include the codes; US2-AS2 a code signs in at aal2 and only once', async () => {
    const { user, codes, token } = await enrolledWithCodes('once');
    expect(codes.length).toBeGreaterThan(0);
    const later = await readSettingsFlow(token);
    expect(later.status).toBe(200);
    // Counts only: a failure message must not carry a live code.
    expect(recoveryCodesOf(later.body).length).toBe(0);

    const signedIn = await loginWithRecoveryCode(user.email, codes[0]);
    expect(signedIn.session.authenticator_assurance_level).toBe('aal2');
    expect(signedIn.session.authentication_methods.map(m => m.method)).toContain(
      'lookup_secret'
    );

    const reused = await submitRecoveryCode(user.email, codes[0]);
    expect(isRecoveryCodeRefused(reused), verdictOf(reused)).toBe(true);
    // Control: an unused code on the same kind of flow is accepted.
    expect((await submitRecoveryCode(user.email, codes[1])).status).toBe(200);
  });

  test('US2-AS3 after regenerating, the previous codes fail and the new ones work', async () => {
    const { user, codes, token } = await enrolledWithCodes('regen');

    const fresh = await generateRecoveryCodes(token);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.filter(code => codes.includes(code)).length).toBe(0);

    const old = await submitRecoveryCode(user.email, codes[1]);
    expect(isRecoveryCodeRefused(old), verdictOf(old)).toBe(true);
    const signedIn = await loginWithRecoveryCode(user.email, fresh[0]);
    expect(signedIn.session.authenticator_assurance_level).toBe('aal2');
  });

  test('US2-AS9 removing the codes leaves no lookup_secret credential and refuses a code that was valid', async () => {
    const { user, codes, token } = await enrolledWithCodes('remove');
    expect(await credentialTypes(user.identityId)).toContain('lookup_secret');

    await disableRecoveryCodes(token);

    expect(await credentialTypes(user.identityId)).not.toContain(
      'lookup_secret'
    );
    const refused = await submitRecoveryCode(user.email, codes[0]);
    expect(isRecoveryCodeRefused(refused), verdictOf(refused)).toBe(true);
  });

  test('US2-AS10 D31 the emailed link signs an enrolled identity in at aal1 only, which whoami refuses; the password changes after the second step', async () => {
    const { user, secret } = await enrolledWithCodes('link');
    const newPassword = `Sf-${randomUUID()}`;

    const { jar, settingsFlowId } = await recoverViaLink(user.identityId);

    const recoverySession = (await identitySessions(user.identityId)).find(s =>
      s.authentication_methods.some(m => /recovery/.test(m.method))
    );
    expect(recoverySession?.authenticator_assurance_level).toBe('aal1');
    // And Kratos does not accept that aal1 session where aal2 is available.
    const recoveryWhoami = await whoamiInBrowser(jar);
    expect(recoveryWhoami.status).toBe(403);
    expect(kratosErrorId(recoveryWhoami)).toBe('session_aal2_required');

    const refused = await changePasswordInBrowser(jar, settingsFlowId, newPassword);
    const owesSecondStep =
      (refused.status === 403 &&
        kratosErrorId(refused) === 'session_aal2_required') ||
      String(refused.body?.redirect_browser_to ?? '').includes('aal=aal2');
    expect(owesSecondStep, `${verdictOf(refused)} ${kratosErrorId(refused)}`).toBe(true);
    expect((await passwordLogin(user.email)).status).toBe(200);

    const upgraded = await upgradeBrowserSessionWithTotp(jar, secret);
    expect(upgraded.status).toBe(200);
    expect((await whoamiInBrowser(jar)).status).toBe(200);
    const flow = await createBrowserSettingsFlow(jar);
    expect(flow.status).toBe(200);
    const changed = await changePasswordInBrowser(jar, flow.body.id, newPassword);
    expect(changed.status).toBe(200);

    expect(
      (await passwordLogin(user.email, { password: newPassword })).status
    ).toBe(200);
    // Kratos itself judges the old password, not the login proxy's counter.
    await clearAddressCounters();
    const oldPassword = await passwordLogin(user.email);
    expect(oldPassword.status).toBe(400);
    expect(flowMessages(oldPassword).some(m => /^4000006:/.test(m))).toBe(true);
  });
});
