// plan: second-factor-test-plan.md (US3)
//
// Security keys as a second factor, and the passkey sign-in beside them, with
// a CDP virtual authenticator standing in for the hardware (Chromium only).
// A real hardware key is walked by a person on acceptance.
import { expect, test } from '@playwright/test';
import {
  clearAddressCounters,
  createThrowawayUser,
  credentialTypes,
  deleteThrowawayUser,
  totpCode,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { navigateToLoginPageFromMenu } from '../authentication/login-page-objects';
import {
  COPY,
  addVirtualAuthenticator,
  baseUrl,
  block,
  enrolAuthenticatorOnPage,
  expectSignedIn,
  freshPage,
  logOut,
  nameIdOf,
  openSecurityTab,
  roleTokens,
  secondStepCodeField,
  secondStepHeading,
  submitPassword,
  submitSecondStep,
} from './second-factor.helpers';

let usersAdminToken = '';
const users: ThrowawayUser[] = [];

/**
 * The passkey controls are rendered with the identity provider's own copy
 * ("… passkey"), which the client does not define for this feature; matched
 * on the word, which no other control of these screens carries.
 */
const PASSKEY = /passkey/i;

test.describe('US3 — security keys', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'the virtual authenticator is a Chromium DevTools Protocol feature'
  );

  test.beforeAll(async () => {
    usersAdminToken = (await roleTokens()).usersAdmin;
  });

  test.afterAll(async () => {
    for (const user of users) await deleteThrowawayUser(user, usersAdminToken);
  });

  test.beforeEach(async () => {
    await clearAddressCounters();
  });

  test('US3-AS1/AS2 a named key is listed with "Remove", the next sign-in offers it, and it signs in', async ({
    browser,
  }) => {
    const user = await createThrowawayUser('seckey');
    users.push(user);
    const nameId = await nameIdOf(user);
    const keyName = `Desk key ${user.identityId.slice(0, 8)}`;

    const { context, page } = await freshPage(browser);
    try {
      await addVirtualAuthenticator(page);
      await submitPassword(page, user.email);
      await expectSignedIn(page);
      await openSecurityTab(page, nameId);

      const keys = block(page, COPY.securityKeysTitle);
      await expect(keys.getByText(COPY.noKeys, { exact: true })).toBeVisible();
      await keys
        .getByRole('textbox', { name: COPY.keyName, exact: true })
        .fill(keyName);
      await keys.getByRole('button', { name: COPY.addKey, exact: true }).click();

      await expect(keys.getByText(keyName, { exact: true })).toBeVisible();
      await expect(
        keys.getByRole('button', { name: COPY.removeKey(keyName), exact: true })
      ).toBeVisible();
      expect(await credentialTypes(user.identityId)).toContain('webauthn');

      await logOut(page);
      await submitPassword(page, user.email);
      await expect(secondStepHeading(page)).toBeVisible();
      // What the identity holds is what is offered: the key, and no code
      // field (no authenticator app is enrolled).
      const useKey = page.getByRole('button', {
        name: COPY.useSecurityKey,
        exact: true,
      });
      await expect(useKey).toBeVisible();
      await expect(secondStepCodeField(page)).toHaveCount(0);
      await useKey.click();
      await expectSignedIn(page);

      // Remove the key again.
      await openSecurityTab(page, nameId);
      await keys
        .getByRole('button', { name: COPY.removeKey(keyName), exact: true })
        .click();
      const dialog = page.getByRole('alertdialog', {
        name: COPY.removeKeyTitle(keyName),
      });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: COPY.remove, exact: true }).click();
      await expect(dialog).toBeHidden();
      await expect(keys.getByText(COPY.noKeys, { exact: true })).toBeVisible();
      await expect(keys.getByText(keyName, { exact: true })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('US3-AS3 a passkey still signs in without a password; once an authenticator app is enrolled, the second step follows the passkey (risk R8)', async ({
    browser,
  }) => {
    const user = await createThrowawayUser('passkey');
    users.push(user);
    const nameId = await nameIdOf(user);

    const { context, page } = await freshPage(browser);
    try {
      await addVirtualAuthenticator(page);
      await submitPassword(page, user.email);
      await expectSignedIn(page);
      await openSecurityTab(page, nameId);
      await page.getByRole('button', { name: PASSKEY }).click();
      await expect
        .poll(() => credentialTypes(user.identityId))
        .toContain('passkey');

      // Passwordless, as before this feature.
      await logOut(page);
      await navigateToLoginPageFromMenu(baseUrl, page);
      await page.getByRole('button', { name: PASSKEY }).click();
      await expectSignedIn(page);
      await expect(secondStepHeading(page)).toHaveCount(0);

      await openSecurityTab(page, nameId);
      const secret = await enrolAuthenticatorOnPage(page);
      await expect(
        block(page, COPY.authenticatorTitle).getByText(
          COPY.authenticatorActive,
          { exact: true }
        )
      ).toBeVisible();

      // The passkey is the first step only: the code is asked after it.
      await logOut(page);
      await navigateToLoginPageFromMenu(baseUrl, page);
      await page.getByRole('button', { name: PASSKEY }).click();
      await expect(secondStepHeading(page)).toBeVisible();
      await submitSecondStep(page, secondStepCodeField(page), totpCode(secret));
      await expectSignedIn(page);
    } finally {
      await context.close();
    }
  });
});
