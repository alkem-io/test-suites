// plan: second-factor-test-plan.md
//
// The authenticator app, end to end in the browser: enrolled from Security,
// asked for at the second sign-in step, reflected in the session the server
// holds, and removed again.
import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import {
  clearAddressCounters,
  createThrowawayUser,
  credentialTypes,
  deleteThrowawayUser,
  findBffSessionIdBySub,
  mutateBffSession,
  readBffSession,
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
  getQuietly,
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

const requirementOf = async (pageOrContext: Page | BrowserContext) => {
  const response = await readSecondFactorRequirement(
    await sessionActor(pageOrContext)
  );
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
      const secondStepForm = page
        .locator('form')
        .filter({ has: secondStepCodeField(page) });
      // Once the field is rendered and before the wrong code, the form carries
      // neither verdict, so either one after it is the answer to that code.
      await expect(secondStepCodeField(page)).toBeVisible();
      await expect(secondStepForm.getByRole('alert')).toHaveCount(0);
      await expect(
        secondStepCodeField(page).and(page.locator('[aria-invalid="true"]'))
      ).toHaveCount(0);
      await submitSecondStep(
        page,
        secondStepCodeField(page),
        wrongTotpCode(secret)
      );
      // Refused: the identity provider's verdict on the code, on the field or
      // as an alert of the second step's form (never any alert on the page),
      // and still the second step, not signed in.
      await expect(
        secondStepCodeField(page)
          .and(page.locator('[aria-invalid="true"]'))
          .or(secondStepForm.getByRole('alert'))
          .first()
      ).toBeVisible();
      await expect(secondStepHeading(page)).toBeVisible();
      await expect(secondStepCodeField(page)).toBeVisible();

      await submitSecondStep(page, secondStepCodeField(page), totpCode(secret));
      await page.waitForURL(url => url.pathname === '/admin/spaces');
      await expectSignedIn(page);
      // The authenticated "Access Restricted" variant: the user is back on the
      // page they asked for, signed in.
      await expect(goToHomeButton(page)).toBeVisible();

      // The server's session carries the second factor.
      expect(await requirementOf(page)).toMatchObject({ satisfied: true });

      // A refresh of the session keeps it. The stored token is made due
      // first, so the route has to go to the identity provider instead of
      // answering from a token that is still fresh, and the swapped token
      // shows that it did. The page is closed first: no request of its own
      // can rewrite the stored session between the read and the write.
      await page.close();
      const sessionId = await findBffSessionIdBySub(user!.identityId);
      const before = await readBffSession(sessionId);
      expect(before, 'the browser session in the store').not.toBeNull();
      await mutateBffSession(sessionId, stored => ({
        ...stored,
        expires_at: Math.floor(Date.now() / 1000) - 1,
      }));
      const refreshed = await getQuietly(
        context.request,
        `${baseUrl}/api/auth/oidc/refresh`
      );
      expect(refreshed.status()).toBe(204);
      const after = await readBffSession(sessionId);
      // Compared outside the matcher: a red must not print a live token.
      expect(
        typeof after?.access_token === 'string' &&
          after.access_token !== before!.access_token,
        'the refresh swapped the stored access token'
      ).toBe(true);
      expect(await requirementOf(context)).toMatchObject({ satisfied: true });
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
      await expect
        .poll(() => credentialTypes(user!.identityId))
        .not.toContain('totp');
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
