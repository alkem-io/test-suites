/**
 * A ONE-OFF MEASUREMENT, not a test (D2, risk R33): what Kratos does with
 * recovery codes on an identity that has no other second factor. Neither
 * answer is asserted. Run once, by path — never by CI:
 *
 *   cd server-api && SECOND_FACTOR_MEASURE=1 pnpm exec vitest run --project second-factor-measure recovery-codes-only
 *
 * Copy the `[second-factor D2]` line into second-factor-test-plan.md.
 */
import {
  createSettingsFlow,
  credentialTypes,
  kratosErrorId,
  loginWithPassword,
  recoveryCodesOf,
  submitSettings,
  whoami,
} from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();

test('D2 recovery codes with no other factor', async () => {
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
