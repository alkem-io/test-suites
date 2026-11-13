// plan: second-factor-test-plan.md
//
// Security keys as a second factor, and the passkey sign-in beside them, with
// a CDP virtual authenticator standing in for the hardware (Chromium only).
// A real hardware key is walked by a person on acceptance.
import { expect, test, type Page } from '@playwright/test';
import {
  authenticationAuditRows,
  clearAddressCounters,
  createThrowawayUser,
  credentialTypes,
  deleteThrowawayUsers,
  errorCodes,
  readSecondFactorRequirement,
  resetSecondFactor,
  secondFactorCredentialsLeft,
  totpCode,
  type ThrowawayUser,
} from '@alkemio/tests-lib';
import { navigateToLoginPageFromMenu } from '../authentication/login-page-objects';
import { sessionActor } from '../helpers/lib-actor.helper';
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

let tokens: { support: string; usersAdmin: string };
const users: ThrowawayUser[] = [];

/**
 * The passkey controls are rendered with the identity provider's own copy,
 * which the client does not define for this feature. On the sign-in page the
 * word names one control; in Settings the section trigger carries it too, so
 * the add control is matched by its whole name there.
 */
const PASSKEY = /passkey/i;
const ADD_PASSKEY = 'Add passkey';

/** The settings hook's record of a member's own security-key change. */
const observedKeyRows = async (user: ThrowawayUser): Promise<number> =>
  (
    await authenticationAuditRows({ userId: user.userId, outcome: 'observed' })
  ).filter(
    row => (row.details as { method?: string } | null)?.method === 'webauthn'
  ).length;

/** The server's session carries the second factor, not only a sign-in. */
const expectSecondFactorSession = async (page: Page) => {
  const status = await readSecondFactorRequirement(await sessionActor(page));
  expect(status.body.data?.me.secondFactorRequirement.satisfied).toBe(true);
};

/** Bounded as the API track's totp and lookup_secret rows are. */
const ROW_BOUND = { timeout: 10_000, message: 'webauthn: settings hook did not run' };

test.describe('US3 — security keys', () => {
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'the virtual authenticator is a Chromium DevTools Protocol feature'
  );

  test.beforeAll(async () => {
    tokens = await roleTokens();
  });

  test.afterAll(async () => {
    await deleteThrowawayUsers(users, tokens.usersAdmin);
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
      expect(await secondFactorCredentialsLeft(user.identityId)).toContain(
        'webauthn'
      );
      await expect.poll(() => observedKeyRows(user), ROW_BOUND).toBe(1);
      const enrolled = Date.now();

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
      await expectSecondFactorSession(page);

      // Remove the key again. The enrolment's count is held for the whole
      // bound first, so a late duplicate of its row cannot stand in for the
      // removal's: a held count, not a wait for a condition.
      const left = enrolled + ROW_BOUND.timeout - Date.now();
      // eslint-disable-next-line no-restricted-syntax -- ROW_BOUND.timeout: the enrolment's row count is held until the hook's bound has passed
      if (left > 0) await page.waitForTimeout(left);
      expect(
        await observedKeyRows(user),
        'webauthn: a row written after the bound, which would count for the removal'
      ).toBe(1);
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
      expect(await secondFactorCredentialsLeft(user.identityId)).not.toContain(
        'webauthn'
      );
      await expect.poll(() => observedKeyRows(user), ROW_BOUND).toBe(2);
    } finally {
      await context.close();
    }
  });

  test('US2-AS5 a support reset removes a security key, so a stolen key no longer signs in', async ({
    browser,
  }) => {
    const user = await createThrowawayUser('resetkey');
    users.push(user);
    const nameId = await nameIdOf(user);
    const keyName = `Lost key ${user.identityId.slice(0, 8)}`;

    const { context, page } = await freshPage(browser);
    try {
      await addVirtualAuthenticator(page);
      await submitPassword(page, user.email);
      await expectSignedIn(page);
      await openSecurityTab(page, nameId);
      const keys = block(page, COPY.securityKeysTitle);
      await keys
        .getByRole('textbox', { name: COPY.keyName, exact: true })
        .fill(keyName);
      await keys.getByRole('button', { name: COPY.addKey, exact: true }).click();
      await expect(keys.getByText(keyName, { exact: true })).toBeVisible();
      // Before the reset the identity holds the key, so its absence after
      // the reset is the reset's doing.
      expect(await secondFactorCredentialsLeft(user.identityId)).toContain(
        'webauthn'
      );
    } finally {
      await context.close();
    }

    const reset = await resetSecondFactor(
      user.userId,
      { bearerToken: tokens.support },
      { invalidatePassword: false }
    );
    expect(errorCodes(reset)).toEqual([]);
    expect(
      reset.body.data?.adminResetUserSecondFactor.removedCredentialTypes
    ).toContain('webauthn');
    expect(await secondFactorCredentialsLeft(user.identityId)).toEqual([]);
  });

  test('US3-AS3 a passkey still signs in without a password; once an authenticator app is enrolled, the second step follows the passkey (risk R8)', async ({
    browser,
  }) => {
    // The tag reaches the display name in the user menu: it must not carry
    // the word the sign-in page's passkey control is matched on.
    const user = await createThrowawayUser('pwless');
    users.push(user);
    const nameId = await nameIdOf(user);

    const { context, page } = await freshPage(browser);
    try {
      await addVirtualAuthenticator(page);
      await submitPassword(page, user.email);
      await expectSignedIn(page);
      await openSecurityTab(page, nameId);
      await page.getByRole('button', { name: ADD_PASSKEY, exact: true }).click();
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
      await expectSecondFactorSession(page);
    } finally {
      await context.close();
    }
  });
});
