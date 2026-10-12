// spec: client-web/src/functional-e2e/authentication/AUTHENTICATION_TEST_PLAN.md
//
// Password recovery, end to end against the CRD recovery LINK flow (both the
// local and the remote Kratos send a self-service recovery link, not a code).
//
// The account under test is a DISPOSABLE identity registered by this file and
// deleted again in `afterAll` — never a shared harness persona. Recovery
// changes the account's password, and a persona whose password was changed by
// a run that then failed before restoring it is exactly how every later
// sign-in of that persona went red on the nightly (login, restricted access,
// language offer…). A throwaway identity makes the walk independent of the
// rest of the suite and of previous runs.

import { test, expect, Page } from '@playwright/test';
import {
  getRecoveryLinkFor,
  getUserToken,
  postGraphqlRaw,
  registerInKratosOrFail,
  TestUser,
  UniqueIDGenerator,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { navigateToLoginPageFromMenu } from './login-page-objects';
import {
  continueButton,
  dismissNewLookDialog,
  passwordField,
  recoveryEmailField,
  saveButton,
} from './common-authentication-page-elements';
import { expectSignedIn } from '../my-dashboard/my-dashboard-page-objects';
import { fillSecret } from '../helpers/login.helper';

const harnessPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const uniqueId = UniqueIDGenerator.getID();
const recoveryEmail = `recovery.${uniqueId}@alkem.io`;
/** Must differ from the registration password: Kratos refuses to "change" a
 * password to its current value. */
const recoveredPassword = `${harnessPassword}Rec${uniqueId}!`;

let recoveryUserId: string | undefined;

/**
 * Drives the recovery screen (already open) through to a saved new password:
 * request the link for `email`, follow it from the shared inbox, set
 * `newPassword`. The inbox is read scoped to this address and never pruned —
 * other flows' mail is theirs.
 */
async function recoverPassword(page: Page, email: string, newPassword: string) {
  await recoveryEmailField(page).fill(email);
  await continueButton(page).click();

  // The screen confirms the request before the mail is sent; from there the
  // link is a matter of delivery latency.
  await expect(page.getByText(/sent|check your/i).first()).toBeVisible();
  await expect
    .poll(() => getRecoveryLinkFor(email), {
      message: `recovery link for ${email} in the inbox`,
      timeout: 30_000,
    })
    .toBeTruthy();

  await page.goto((await getRecoveryLinkFor(email))!);
  await expect(page.getByRole('heading', { name: 'Set new password' })).toBeVisible();
  await fillSecret(passwordField(page), newPassword);
  await saveButton(page).click();
}

test.describe('Authentication - Password Recovery Flows', () => {
  test.beforeAll(async () => {
    // Self-service registration + verification through Kratos, same path a
    // real user takes; the identity then exists with the harness password.
    const { verificationFlowId } = await registerInKratosOrFail(
      'Recovery',
      uniqueId,
      recoveryEmail
    );
    await verifyInKratosOrFail(recoveryEmail, verificationFlowId);
    // First authenticated contact creates the Alkemio user; capture its id so
    // afterAll can remove user AND identity.
    const token = await getUserToken(recoveryEmail);
    const me = await postGraphqlRaw<{ me: { user: { id: string } | null } }>(
      '{ me { user { id } } }',
      { bearerToken: token }
    );
    recoveryUserId = me.body.data?.me?.user?.id;
    expect(recoveryUserId, `Alkemio user for ${recoveryEmail}`).toBeTruthy();
  });

  test.afterAll(async () => {
    if (!recoveryUserId) return;
    // User AND Kratos identity, so the address is free for the next run.
    const res = await postGraphqlRaw(
      'mutation($id: UUID!) { deleteUser(deleteData: { ID: $id, deleteIdentity: true }) { id } }',
      { variables: { id: recoveryUserId }, bearerToken: await getUserToken(TestUser.GLOBAL_ADMIN + '@alkem.io') }
    );
    if (res.body.errors) {
      throw new Error(
        `could not remove the disposable recovery identity ${recoveryEmail}: ${JSON.stringify(res.body.errors)}`
      );
    }
  });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('user successful password recovery', async ({ page }) => {
    // Entry via the sign-in screen's "Forgot password?" link.
    await navigateToLoginPageFromMenu(baseUrl, page);
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(recoveryEmailField(page)).toBeVisible();

    await recoverPassword(page, recoveryEmail, recoveredPassword);

    // Saving the new password signs the user in.
    await dismissNewLookDialog(page);
    await expectSignedIn(page);

    // The NEW password is what the account accepts now — proven against the
    // server, not inferred from the redirect: the non-interactive login with
    // the new password succeeds, and with the old one it is refused.
    await expect
      .poll(() => getUserTokenWith(recoveryEmail, recoveredPassword), {
        message: 'non-interactive login with the recovered password',
        timeout: 20_000,
      })
      .toBe('ok');
    expect(await getUserTokenWith(recoveryEmail, harnessPassword)).toBe('refused');
  });
});

/** 'ok' when the server issues a token for the pair, 'refused' when it does not. */
async function getUserTokenWith(email: string, password: string): Promise<'ok' | 'refused'> {
  const response = await fetch(`${baseUrl}/api/auth/non-interactive-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) return 'refused';
  const body = (await response.json().catch(() => ({}))) as { api_token?: string };
  return body.api_token ? 'ok' : 'refused';
}
