// plan: second-factor-test-plan.md
//
// Recovery codes in Security, signing in with one, and the support reset of a
// member covered by an organisation rule whose deadline has passed: the next
// sign-in lands on /second-factor, which is the only thing the session can
// reach until two ways to pass the second step are set up (D55) and the
// member signs in again.
import { expect, test, type Page } from '@playwright/test';
import {
  ageRuleSince,
  clearAddressCounters,
  createThrowawayUser,
  credentialTypes,
  deleteThrowawayUsers,
  errorCodes,
  readSecondFactorRequirement,
  readSubjectMarker,
  resetSecondFactor,
  setOrganizationRule,
  totpCode,
  withThrowawayOrganization,
  wrongTotpCode,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { sessionActor } from '../helpers/lib-actor.helper';
import { fillSecret } from '../helpers/login.helper';
import {
  COPY,
  baseUrl,
  block,
  enrolAuthenticatorOnPage,
  expectRefusalPage,
  expectSignedIn,
  generateRecoveryCodesOnPage,
  refusalPageRequests,
  freshPage,
  nameIdOf,
  openSecurityTab,
  roleTokens,
  secondStepCodeField,
  secondStepHeading,
  secondStepRecoveryField,
  shownAuthenticatorKey,
  signInAgainFromRefusalPage,
  storedSignIn,
  submitPassword,
  submitSecondStep,
} from './second-factor.helpers';

test.describe.configure({ mode: 'serial' });

let tokens: { support: string; usersAdmin: string };
let member: ThrowawayUser | undefined;
let orgAdmin: ThrowawayUser | undefined;
let nameId = '';
let secret = '';

const recoveryBlock = (page: Page) => block(page, COPY.recoveryTitle);

/** Signs the member in with both steps and opens their Security tab. */
const signInWithCode = async (page: Page): Promise<void> => {
  await submitPassword(page, member!.email);
  await expect(secondStepHeading(page)).toBeVisible();
  await submitSecondStep(page, secondStepCodeField(page), totpCode(secret));
  await expectSignedIn(page);
  await openSecurityTab(page, nameId);
};

test.describe('US2 — recovery codes and the support reset', () => {
  test.beforeAll(async () => {
    tokens = await roleTokens();
    member = await createThrowawayUser('recmember');
    orgAdmin = await createThrowawayUser('recorgadmin');
    nameId = await nameIdOf(member);
  });

  test.afterAll(async () => {
    await deleteThrowawayUsers([member, orgAdmin], tokens.usersAdmin);
  });

  test.beforeEach(async () => {
    await clearAddressCounters();
  });

  test('US2-AS4 with no factor, "Generate recovery codes" is disabled and says why', async ({
    browser,
  }) => {
    const { context, page } = await freshPage(browser);
    try {
      await submitPassword(page, member!.email);
      await expectSignedIn(page);
      const authenticator = await openSecurityTab(page, nameId);
      // Positive control: the section rendered, with the setup form.
      await expect(
        authenticator.getByRole('button', { name: COPY.confirm, exact: true })
      ).toBeVisible();
      const recovery = recoveryBlock(page);
      await expect(
        recovery.getByText(COPY.needsFactor, { exact: true })
      ).toBeVisible();
      await expect(
        recovery.getByRole('button', { name: COPY.generate, exact: true })
      ).toBeDisabled();
    } finally {
      await context.close();
    }
  });

  test('US2-AS1/AS9 codes are shown once with copy and a notice; removing them offers "Generate" again', async ({
    browser,
    browserName,
  }) => {
    const { context, page } = await freshPage(browser);
    try {
      await submitPassword(page, member!.email);
      await expectSignedIn(page);
      await openSecurityTab(page, nameId);
      secret = await enrolAuthenticatorOnPage(page);
      await expect(
        block(page, COPY.authenticatorTitle).getByText(
          COPY.authenticatorActive,
          { exact: true }
        )
      ).toBeVisible();

      await generateRecoveryCodesOnPage(page, context, browserName);
      expect(await credentialTypes(member!.identityId)).toContain(
        'lookup_secret'
      );

      const recovery = recoveryBlock(page);
      await recovery
        .getByRole('button', { name: COPY.removeRecovery, exact: true })
        .click();
      const dialog = page.getByRole('alertdialog', {
        name: COPY.removeRecoveryTitle,
      });
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole('button', { name: COPY.removeRecovery, exact: true })
        .click();
      await expect(dialog).toBeHidden();
      // The identity, not only the screen: the confirm removed the codes.
      await expect
        .poll(() => credentialTypes(member!.identityId))
        .not.toContain('lookup_secret');
      await expect(
        recovery.getByRole('button', { name: COPY.generate, exact: true })
      ).toBeEnabled();
      await expect(
        recovery.getByText(COPY.recoveryActive, { exact: true })
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('US2-AS2 new codes sign in through "Use a recovery code"', async ({
    browser,
    browserName,
  }) => {
    let codes: string[] = [];
    const setup = await freshPage(browser);
    try {
      await signInWithCode(setup.page);
      codes = await generateRecoveryCodesOnPage(
        setup.page,
        setup.context,
        browserName
      );
    } finally {
      await setup.context.close();
    }

    const { context, page } = await freshPage(browser);
    try {
      await submitPassword(page, member!.email);
      await expect(secondStepHeading(page)).toBeVisible();
      await page
        .getByRole('button', { name: COPY.useRecoveryCode, exact: true })
        .click();
      await submitSecondStep(page, secondStepRecoveryField(page), codes[0]);
      await expectSignedIn(page);
      const status = await readSecondFactorRequirement(
        await sessionActor(page)
      );
      expect(status.body.data?.me.secondFactorRequirement.satisfied).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('US2-AS8/US4-AS6 after a reset past the organisation deadline, sign-in lands on /second-factor; enrolling there asks for a second way (D55); with two, signing in again opens the platform', async ({
    browser,
    browserName,
  }) => {
    await withThrowawayOrganization(
      { admin: orgAdmin!, associates: [member!] },
      async organization => {
        const switched = await setOrganizationRule(organization.id, true, {
          bearerToken: orgAdmin!.token,
        });
        expect(errorCodes(switched)).toEqual([]);
        await ageRuleSince({ organizationId: organization.id }, 15);

        const reset = await resetSecondFactor(
          member!.userId,
          { bearerToken: tokens.support },
          { invalidatePassword: false }
        );
        expect(errorCodes(reset)).toEqual([]);
        expect(
          reset.body.data?.adminResetUserSecondFactor.removedCredentialTypes
        ).toEqual(expect.arrayContaining(['totp', 'lookup_secret']));

        // A sign-in that begins in the marker's own second is rejected by the
        // reset's fence. The marker and the sign-in's start are both the
        // server's clock; one extra second covers a runner up to a second
        // ahead of it. A condition, bounded.
        const marker = await readSubjectMarker(member!.identityId);
        await expect
          .poll(() => Math.floor(Date.now() / 1000), {
            timeout: 5_000,
            message:
              "the runner's clock did not pass the reset's marker within 5 s: it is behind the stack's",
          })
          .toBeGreaterThan(marker + 1);

        const { context, page } = await freshPage(browser);
        const watch = refusalPageRequests(page);
        try {
          await submitPassword(page, member!.email);
          await expectRefusalPage(page);

          // The rest of the platform is refused: a page sends the session
          // back here, and the API answers with the refusal code.
          await page.goto(`${baseUrl}/home`);
          await page.waitForURL(url => url.pathname === '/second-factor', {
            timeout: 30_000,
          });
          const refused = await readSecondFactorRequirement(
            await sessionActor(page)
          );
          expect(errorCodes(refused)).toContain('SECOND_FACTOR_REQUIRED');

          // A wrong code resumes on this page with the identity provider's
          // message, not on any other card.
          const authenticator = block(page, COPY.authenticatorTitle);
          const codeField = authenticator.getByRole('textbox', {
            name: COPY.codeFromApp,
            exact: true,
          });
          const verdict = codeField
            .and(page.locator('[aria-invalid="true"]'))
            .or(authenticator.getByRole('alert'));
          // Once the block is rendered and before the wrong code, it carries
          // neither verdict, so either one after it is the answer to that code.
          const key = await shownAuthenticatorKey(page);
          await expect(verdict).toHaveCount(0);
          await fillSecret(codeField, wrongTotpCode(key));
          await authenticator
            .getByRole('button', { name: COPY.confirm, exact: true })
            .click();
          // The answer is shown in place (the code is submitted as JSON), so
          // the page stays where it is rather than reloading on a new flow.
          await expect(page).toHaveURL(
            url => new URL(url).pathname === '/second-factor'
          );
          await expect(
            page.getByRole('heading', { name: COPY.pageTitle, exact: true })
          ).toBeVisible();
          // The field-level error, or an alert of this form: whichever the
          // identity provider attached its message to. Never any alert on
          // the page.
          await expect(verdict.first()).toBeVisible();

          const enrolledSecret = await enrolAuthenticatorOnPage(page);
          // One way is not enough under the rule (D55): the page asks for a
          // second and keeps the settings flow on screen, with "Sign in
          // again" still offered beside it.
          await expect(
            page.getByText(COPY.pageSecondWay, { exact: true })
          ).toBeVisible();
          await expect(
            page.getByText(COPY.pageEnrolled, { exact: true })
          ).toHaveCount(0);
          await expect(
            page.getByRole('link', { name: COPY.signInAgain, exact: true })
          ).toBeVisible();
          expect(await credentialTypes(member!.identityId)).toContain('totp');

          // The second way: recovery codes, in the same section.
          await generateRecoveryCodesOnPage(page, context, browserName, {
            onRefusalPage: true,
          });
          await expect(
            page.getByText(COPY.pageEnrolled, { exact: true })
          ).toBeVisible();
          await expect(
            page.getByText(COPY.pageSecondWay, { exact: true })
          ).toHaveCount(0);
          expect(await credentialTypes(member!.identityId)).toEqual(
            expect.arrayContaining(['totp', 'lookup_secret'])
          );

          await signInAgainFromRefusalPage(page, member!.email, enrolledSecret);
          await expectSignedIn(page);
          expect(new URL(page.url()).pathname).not.toBe('/second-factor');
          const status = await readSecondFactorRequirement(
            await sessionActor(page)
          );
          expect(status.body.data?.me.secondFactorRequirement).toMatchObject({
            covered: true,
            satisfied: true,
            secondWayNeeded: false,
          });
          // The count the server took at this sign-in: the app and the codes.
          expect(await storedSignIn(page)).toEqual({ acr: 'aal2', ways: 2 });

          // Nothing the page needed sat behind an unreachable host or was
          // refused from behind the edge — and the page's own requests were
          // seen, so that answer covers them.
          expect(watch.sent).not.toEqual([]);
          expect(watch.failed).toEqual([]);
        } finally {
          await context.close();
        }
      }
    );
  });
});
