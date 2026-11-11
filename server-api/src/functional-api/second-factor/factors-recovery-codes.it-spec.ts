/**
 * Recovery codes at Kratos and the emailed recovery link of an enrolled
 * identity (US2-AS1–AS3, AS9, AS10; D2, D31). Plan: ./second-factor-test-plan.md.
 * Needs a stack with the feature's Kratos values and the Kratos admin port.
 */
import { randomUUID } from 'crypto';
import {
  changePasswordInBrowser,
  createBrowserSettingsFlow,
  createSettingsFlow,
  credentialTypes,
  disableRecoveryCodes,
  enrolTotp,
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
  submitSettings,
  upgradeBrowserSessionWithTotp,
  whoami,
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

describe('Second factor — recovery codes', () => {
  test('D2 recovery codes with no other factor (recorded, neither answer asserted)', async () => {
    const user = await throwawayUser('codesonly');
    const session = await loginWithPassword(user.email);
    const flowId = await createSettingsFlow(session.sessionToken);

    const regenerate = await submitSettings(session.sessionToken, flowId, {
      method: 'lookup_secret',
      lookup_secret_regenerate: true,
    });
    const confirm = await submitSettings(session.sessionToken, flowId, {
      method: 'lookup_secret',
      lookup_secret_confirm: true,
    });
    const next = await whoami((await loginWithPassword(user.email)).sessionToken);
    console.log(
      `[second-factor D2] codes with no other factor: regenerate ${regenerate.status} ` +
        `(${recoveryCodesOf(regenerate.body).length} codes), confirm ${confirm.status} ` +
        `${kratosErrorId(confirm) ?? ''}; credentials [${(await credentialTypes(user.identityId)).join(', ')}]; ` +
        `next password login whoami ${next.status} ${kratosErrorId(next) ?? next.body?.authenticator_assurance_level}`
    );
  });

  test('US2-AS1 codes are shown once; US2-AS2 a code signs in at aal2 and only once', async () => {
    const { user, codes, token } = await enrolledWithCodes('once');
    expect(codes.length).toBeGreaterThan(0);
    const later = await readSettingsFlow(token);
    expect(later.status).toBe(200);
    expect(recoveryCodesOf(later.body)).toEqual([]);

    const signedIn = await loginWithRecoveryCode(user.email, codes[0]);
    expect(signedIn.session.authenticator_assurance_level).toBe('aal2');
    expect(signedIn.session.authentication_methods.map(m => m.method)).toContain(
      'lookup_secret'
    );

    const reused = await submitRecoveryCode(user.email, codes[0]);
    expect(reused.status).not.toBe(200);
    expect(reused.body?.session).toBeUndefined();
  });

  test('US2-AS3 after regenerating, the previous codes fail and the new ones work', async () => {
    const { user, codes, token } = await enrolledWithCodes('regen');

    const fresh = await generateRecoveryCodes(token);
    expect(fresh).not.toEqual(codes);

    const old = await submitRecoveryCode(user.email, codes[1]);
    expect(old.status).not.toBe(200);
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
    expect(refused.status).not.toBe(200);
    expect(refused.body?.session).toBeUndefined();
  });

  test('US2-AS10 D31 the emailed link signs an enrolled identity in at aal1 only; the password changes after the second step', async () => {
    const { user, secret } = await enrolledWithCodes('link');
    const newPassword = `Sf-${randomUUID()}`;

    const { jar, settingsFlowId } = await recoverViaLink(user.identityId);

    const recoverySession = (await identitySessions(user.identityId)).find(s =>
      s.authentication_methods.some(m => /recovery/.test(m.method))
    );
    expect(recoverySession?.authenticator_assurance_level).toBe('aal1');

    const refused = await changePasswordInBrowser(jar, settingsFlowId, newPassword);
    const owesSecondStep =
      (refused.status === 403 &&
        kratosErrorId(refused) === 'session_aal2_required') ||
      String(refused.body?.redirect_browser_to ?? '').includes('aal=aal2');
    expect(owesSecondStep, JSON.stringify(refused.body).slice(0, 300)).toBe(true);
    expect((await passwordLogin(user.email)).status).toBe(200);

    const upgraded = await upgradeBrowserSessionWithTotp(jar, secret);
    expect(upgraded.status).toBe(200);
    const flow = await createBrowserSettingsFlow(jar);
    expect(flow.status).toBe(200);
    const changed = await changePasswordInBrowser(jar, flow.body.id, newPassword);
    expect(changed.status).toBe(200);

    expect(
      (await passwordLogin(user.email, { password: newPassword })).status
    ).toBe(200);
    expect((await passwordLogin(user.email)).status).not.toBe(200);
  });
});
