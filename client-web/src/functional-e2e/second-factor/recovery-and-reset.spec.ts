// plan: second-factor-test-plan.md (US2, US4-AS6)
//
// Recovery codes in Security, signing in with one, and the support reset of a
// member covered by an organisation rule whose deadline has passed: the next
// sign-in lands on /second-factor, which is the only thing the session can
// reach until a factor is set up and the member signs in again.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  ageRuleSince,
  clearAddressCounters,
  createThrowawayUser,
  credentialTypes,
  deleteThrowawayUser,
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
import {
  passwordField,
  signInButton,
} from '../authentication/common-authentication-page-elements';
import { fillUpSignInPageElements } from '../identity-flows/signin-page-objects';
import {
  COPY,
  baseUrl,
  block,
  enrolAuthenticatorOnPage,
  expectSignedIn,
  failedRequests,
  freshPage,
  nameIdOf,
  openSecurityTab,
  password,
  roleTokens,
  secondStepCodeField,
  secondStepHeading,
  secondStepRecoveryField,
  shownAuthenticatorKey,
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

/** Generates codes in Security and confirms them; returns the codes shown. */
const generateCodes = async (
  page: Page,
  context: BrowserContext,
  browserName: string
): Promise<string[]> => {
  const recovery = recoveryBlock(page);
  await recovery
    .getByRole('button', { name: COPY.generate, exact: true })
    .click();
  await expect(recovery.getByText(COPY.shownOnce, { exact: true })).toBeVisible();
  const codes = (await recovery.getByRole('listitem').allTextContents()).map(
    c => c.trim()
  );
  expect(codes.length).toBeGreaterThan(0);
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: baseUrl,
    });
    await recovery.getByRole('button', { name: COPY.copy, exact: true }).click();
    await expect(
      recovery.getByRole('button', { name: COPY.copied, exact: true })
    ).toBeVisible();
  }
  await recovery
    .getByRole('button', { name: COPY.savedCodes, exact: true })
    .click();
  await expect(
    recovery.getByText(COPY.recoveryActive, { exact: true })
  ).toBeVisible();
  // Shown once: once confirmed, the codes are no longer on screen.
  await expect(recovery.getByText(COPY.shownOnce, { exact: true })).toHaveCount(0);
  return codes;
};

test.describe('US2 — recovery codes and the support reset', () => {
  test.beforeAll(async () => {
    tokens = await roleTokens();
    member = await createThrowawayUser('recmember');
    orgAdmin = await createThrowawayUser('recorgadmin');
    nameId = await nameIdOf(member);
  });

  test.afterAll(async () => {
    for (const user of [member, orgAdmin]) {
      if (user) await deleteThrowawayUser(user, tokens.usersAdmin);
    }
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

      await generateCodes(page, context, browserName);
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
      codes = await generateCodes(setup.page, setup.context, browserName);
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
      const status = await readSecondFactorRequirement(await sessionActor(page));
      expect(status.body.data?.me.secondFactorRequirement.satisfied).toBe(true);
    } finally {
      await context.close();
    }
  });

  test('US2-AS8/US4-AS6 after a reset past the organisation deadline, sign-in lands on /second-factor; enrolling there and signing in again opens the platform', async ({
    browser,
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
        // SERVER's clock; one extra second covers a runner up to a second
        // ahead of it (a port-forwarded cluster). A condition, bounded.
        const marker = await readSubjectMarker(member!.identityId);
        await expect
          .poll(() => Math.floor(Date.now() / 1000), { timeout: 5_000 })
          .toBeGreaterThan(marker + 1);

        const { context, page } = await freshPage(browser);
        const failed = failedRequests(page);
        try {
          await submitPassword(page, member!.email);
          await page.waitForURL(url => url.pathname === '/second-factor');
          await expect(
            page.getByRole('heading', { name: COPY.pageTitle, exact: true })
          ).toBeVisible();
          await expect(
            page.getByText(COPY.pageRequired, { exact: true })
          ).toHaveCount(1);
          await expect(
            page.getByText(COPY.refusalToast, { exact: true })
          ).toHaveCount(0);

          // The rest of the platform is refused: a page sends the session
          // back here, and the API answers with the refusal code.
          await page.goto(`${baseUrl}/home`);
          await page.waitForURL(url => url.pathname === '/second-factor');
          const refused = await readSecondFactorRequirement(
            await sessionActor(page)
          );
          expect(errorCodes(refused)).toContain('SECOND_FACTOR_REQUIRED');

          // A wrong code resumes on this page with the identity provider's
          // message, not on any other card.
          const authenticator = block(page, COPY.authenticatorTitle);
          await authenticator
            .getByRole('textbox', { name: COPY.codeFromApp, exact: true })
            .fill(wrongTotpCode(await shownAuthenticatorKey(page)));
          await authenticator
            .getByRole('button', { name: COPY.confirm, exact: true })
            .click();
          await page.waitForURL(
            url => url.pathname === '/second-factor' && url.searchParams.has('flow')
          );
          await expect(
            page.getByRole('heading', { name: COPY.pageTitle, exact: true })
          ).toBeVisible();
          // The field-level error, or a form-level alert: whichever the
          // identity provider attached its message to.
          await expect(
            authenticator
              .getByRole('textbox', { name: COPY.codeFromApp, exact: true })
              .and(page.locator('[aria-invalid="true"]'))
              .or(page.getByRole('alert'))
              .first()
          ).toBeVisible();

          const enrolledSecret = await enrolAuthenticatorOnPage(page);
          await expect(
            page.getByText(COPY.pageEnrolled, { exact: true })
          ).toBeVisible();
          expect(await credentialTypes(member!.identityId)).toContain('totp');

          // "Sign in again" with both steps. The identity provider may still
          // hold the first-step session and ask for the code alone.
          await page
            .getByRole('link', { name: COPY.signInAgain, exact: true })
            .click();
          await expect(
            passwordField(page).or(secondStepCodeField(page))
          ).toBeVisible();
          if (await passwordField(page).isVisible()) {
            await fillUpSignInPageElements(member!.email, password, page);
            await signInButton(page).click();
          }
          await expect(secondStepHeading(page)).toBeVisible();
          await submitSecondStep(
            page,
            secondStepCodeField(page),
            totpCode(enrolledSecret)
          );
          await expectSignedIn(page);
          expect(new URL(page.url()).pathname).not.toBe('/second-factor');
          const status = await readSecondFactorRequirement(
            await sessionActor(page)
          );
          expect(status.body.data?.me.secondFactorRequirement).toMatchObject({
            covered: true,
            satisfied: true,
          });

          // Risk R3: nothing the page needed sat behind an unreachable host.
          expect(failed).toEqual([]);
        } finally {
          await context.close();
        }
      }
    );
  });
});
