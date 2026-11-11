// plan: second-factor-test-plan.md (US1)
//
// The authenticator app, end to end in the browser: enrolled from Security,
// asked for at the second sign-in step, reflected in the session the server
// holds, and removed again.
import { expect, test, type Page } from '@playwright/test';
import {
  clearAddressCounters,
  createThrowawayUser,
  credentialTypes,
  deleteThrowawayUser,
  readSecondFactorRequirement,
  totpCode,
  wrongTotpCode,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { sessionActor } from '../helpers/lib-actor.helper';
import {
  goToHomeButton,
  signInSignUpLink,
} from '../authentication/common-authentication-page-elements';
import { fillUpSignInPageElements } from '../identity-flows/signin-page-objects';
import {
  COPY,
  baseUrl,
  block,
  enrolAuthenticatorOnPage,
  expectSignedIn,
  freshPage,
  nameIdOf,
  openSecurityTab,
  password,
  roleTokens,
  secondStepCodeField,
  secondStepHeading,
  submitPassword,
  submitSecondStep,
} from './second-factor.helpers';

test.describe.configure({ mode: 'serial' });

let usersAdminToken = '';
let user: ThrowawayUser | undefined;
let nameId = '';
let secret = '';

const requirementOf = async (page: Page) => {
  const response = await readSecondFactorRequirement(await sessionActor(page));
  expect(response.status).toBe(200);
  return response.body.data!.me.secondFactorRequirement;
};

test.describe('US1 — the authenticator app in Security', () => {
  test.beforeAll(async () => {
    usersAdminToken = (await roleTokens()).usersAdmin;
    user = await createThrowawayUser('totpui');
    nameId = await nameIdOf(user);
  });

  test.afterAll(async () => {
    if (user) await deleteThrowawayUser(user, usersAdminToken);
  });

  test.beforeEach(async () => {
    await clearAddressCounters();
  });

  test('US1-AS1/AS2 setup shows the QR code and the key; a computed code makes the app active', async ({
    browser,
  }) => {
    const { context, page } = await freshPage(browser);
    try {
      await submitPassword(page, user!.email);
      // No factor yet: the password alone signs in, with no second step.
      await expectSignedIn(page);
      await openSecurityTab(page, nameId);

      expect(await credentialTypes(user!.identityId)).not.toContain('totp');
      secret = await enrolAuthenticatorOnPage(page);

      const authenticator = block(page, COPY.authenticatorTitle);
      await expect(
        authenticator.getByText(COPY.authenticatorActive, { exact: true })
      ).toBeVisible();
      await expect(
        authenticator.getByRole('button', { name: COPY.remove, exact: true })
      ).toBeVisible();
      // The second angle: the identity provider holds the credential.
      expect(await credentialTypes(user!.identityId)).toContain('totp');
    } finally {
      await context.close();
    }
  });

  test('US1-AS4/AS7 the next sign-in asks for a code: a wrong one is refused, the right one lands on the page asked for, and the session is second-factor', async ({
    browser,
  }) => {
    const { context, page } = await freshPage(browser);
    try {
      // The page asked for: a restricted page, signed out.
      await page.goto(`${baseUrl}/admin/spaces`);
      await signInSignUpLink(page).click();
      await fillUpSignInPageElements(user!.email, password, page);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();

      await expect(secondStepHeading(page)).toBeVisible();
      await submitSecondStep(
        page,
        secondStepCodeField(page),
        wrongTotpCode(secret)
      );
      // Refused: still the second step, not signed in.
      await expect(secondStepHeading(page)).toBeVisible();
      await expect(secondStepCodeField(page)).toBeVisible();

      await submitSecondStep(page, secondStepCodeField(page), totpCode(secret));
      await page.waitForURL(url => url.pathname === '/admin/spaces');
      await expectSignedIn(page);
      // The authenticated "Access Restricted" variant: the user is back on the
      // page they asked for, signed in.
      await expect(goToHomeButton(page)).toBeVisible();

      // US1-AS7: the server's session carries the second factor.
      expect(await requirementOf(page)).toMatchObject({ satisfied: true });

      // FR-007: a refresh of the session keeps it.
      const refreshed = await page.request.post(
        `${baseUrl}/api/auth/oidc/refresh`,
        { failOnStatusCode: false }
      );
      expect(refreshed.status()).toBe(204);
      expect(await requirementOf(page)).toMatchObject({ satisfied: true });
    } finally {
      await context.close();
    }
  });

  test('US1-AS6 after removing the app the password alone signs in', async ({
    browser,
  }) => {
    const signedIn = await freshPage(browser);
    try {
      await submitPassword(signedIn.page, user!.email);
      await expect(secondStepHeading(signedIn.page)).toBeVisible();
      await submitSecondStep(
        signedIn.page,
        secondStepCodeField(signedIn.page),
        totpCode(secret)
      );
      await expectSignedIn(signedIn.page);

      await openSecurityTab(signedIn.page, nameId);
      const authenticator = block(signedIn.page, COPY.authenticatorTitle);
      await authenticator
        .getByRole('button', { name: COPY.remove, exact: true })
        .click();
      const dialog = signedIn.page.getByRole('alertdialog', {
        name: COPY.removeAuthenticatorTitle,
      });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: COPY.remove, exact: true }).click();
      await expect(dialog).toBeHidden();
      // The setup form is offered again.
      await expect(
        authenticator.getByRole('button', { name: COPY.confirm, exact: true })
      ).toBeVisible();
      expect(await credentialTypes(user!.identityId)).not.toContain('totp');
    } finally {
      await signedIn.context.close();
    }

    const { context, page } = await freshPage(browser);
    try {
      await submitPassword(page, user!.email);
      await expectSignedIn(page);
      await expect(secondStepHeading(page)).toHaveCount(0);
      expect(await requirementOf(page)).toMatchObject({ satisfied: false });
    } finally {
      await context.close();
    }
  });
});
