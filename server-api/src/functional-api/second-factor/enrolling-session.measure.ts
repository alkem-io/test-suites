/**
 * A ONE-OFF MEASUREMENT, not a test: what whoami answers for the session that
 * enrolled an authenticator (R11). Either answer is a product behaviour; the
 * helpers hold for both. Run once, by path — never by CI:
 *
 *   cd server-api && SECOND_FACTOR_MEASURE=1 pnpm exec vitest run --project second-factor-measure enrolling-session
 *
 * Copy the `[second-factor R11]` line into second-factor-test-plan.md.
 */
import { enrolTotp, kratosErrorId, loginWithPassword, whoami } from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();

test('R11 what the enrolling session is worth', async () => {
  const user = await throwawayUser('enrolling');
  const enrolling = await loginWithPassword(user.email);
  await enrolTotp(enrolling.sessionToken);

  const answer = await whoami(enrolling.sessionToken);
  const found =
    answer.status === 200
      ? `200 ${answer.body?.authenticator_assurance_level}`
      : `${answer.status} ${kratosErrorId(answer)}`;
  console.log(`[second-factor R11] whoami for the enrolling session: ${found}`);
});
