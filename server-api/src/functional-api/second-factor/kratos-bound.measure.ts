/**
 * A ONE-OFF MEASUREMENT, not a test: does
 * Kratos itself bound wrong codes at the second step, past the login proxy?
 * Run once, by path, in the verify phase — never by CI:
 *
 *   cd server-api && SECOND_FACTOR_MEASURE=1 pnpm exec vitest run --project second-factor-measure kratos-bound
 *
 * Needs `KRATOS_PUBLIC_DIRECT_URL` (Kratos' own public port, default
 * http://localhost:4433). It has no failing outcome: "no bound" is a result.
 * Copy the three `[second-factor R16]` lines into second-factor-test-plan.md
 * and the pull request.
 */
import {
  enrolTotp,
  isInvalidCodeVerdict,
  loginWithPassword,
  passwordLogin,
  startSecondStep,
  submitWrongTotp,
  type KratosAnswer,
  type SecondStep,
} from '@alkemio/tests-lib';
import { secondFactorCases } from './_support/cases';

const throwawayUser = secondFactorCases();
const LIMIT = 100;

const verdict = (answer: KratosAnswer) =>
  isInvalidCodeVerdict(answer)
    ? 'code invalid, try again (no bound)'
    : `refused: ${answer.status} ${JSON.stringify(answer.body?.error ?? answer.body?.ui?.messages ?? '').slice(0, 200)}`;

const directSecondStep = async (email: string) => {
  const login = await passwordLogin(email, { via: 'kratos' });
  return startSecondStep(login.body.session_token, 'kratos');
};

test('R16 Kratos’ own bound on wrong second-step codes, and whether a new flow or a re-login escapes it', async () => {
  const user = await throwawayUser('probe');
  const secret = await enrolTotp((await loginWithPassword(user.email)).sessionToken);

  const step = await directSecondStep(user.email);
  let sent = 0;
  let last: KratosAnswer | undefined;
  while (sent < LIMIT) {
    [last] = await submitWrongTotp({ ...step, secret }, 1, { via: 'kratos' });
    sent++;
    if (!isInvalidCodeVerdict(last)) break;
  }
  console.log(
    `[second-factor R16] bound: ${
      last && !isInvalidCodeVerdict(last)
        ? `Kratos refused the flow after ${sent} wrong codes — ${verdict(last)}`
        : `none within ${LIMIT}`
    }`
  );

  // A bound that ends the session or refuses a new flow is itself a verdict.
  const wrongCodeAfter = async (open: () => Promise<SecondStep>): Promise<string> => {
    try {
      const [answer] = await submitWrongTotp({ ...(await open()), secret }, 1, {
        via: 'kratos',
      });
      return verdict(answer);
    } catch (error) {
      return `no second step to submit to — ${String(error).slice(0, 300)}`;
    }
  };
  console.log(
    `[second-factor R16] new second-step flow: ${await wrongCodeAfter(() =>
      startSecondStep(step.sessionToken, 'kratos')
    )}`
  );
  console.log(
    `[second-factor R16] fresh password login: ${await wrongCodeAfter(() =>
      directSecondStep(user.email)
    )}`
  );

  // It ran to the end; nothing here is a pass or a fail of the product.
  expect(sent).toBeGreaterThan(0);
});
