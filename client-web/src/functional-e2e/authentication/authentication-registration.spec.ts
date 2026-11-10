import { test, expect, type Page } from '@playwright/test';
import {
  navigateToRegistrationFromAcceptTerms,
  navigateToRegistrationFromSignUpFillFormAndContinue,
} from './login-page-objects';
import {
  fillUpSignUpPageElements,
  fillUpSignUpPasswordElements,
} from '../identity-flows/registration-page-objects';
import {
  fillUpSignInPageElements,
  pressSignInButtonSignInPage,
} from '../identity-flows/signin-page-objects';
import { expectSignedIn } from '../my-dashboard/my-dashboard-page-objects';
import {
  nextButton,
} from './common-authentication-page-elements';
import {
  deleteUser,
  findUsersPaginated,
  getUserToken,
  getVerificationLinkFor,
  readMyUser,
  TestUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { must, sessionActor } from '../helpers/lib-actor.helper';

const password = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** Every address this file registered, so afterAll can remove user + identity. */
const registeredEmails: string[] = [];

/** The platform admin as a bearer: this file seeds no scenario, so the harness
 * persona map is not populated and the `TestUser` actor cannot resolve. */
const platformAdmin = async () => ({
  bearerToken: await getUserToken(`${TestUser.GLOBAL_ADMIN}@alkem.io`),
});

/** The Alkemio user behind an email, read by the platform admin (null if none). */
const findAlkemioUser = async (email: string) => {
  const found = must(
    await findUsersPaginated({ email }, 1, await platformAdmin()),
    `findUsersPaginated(${email})`
  );
  return found.usersPaginated.users.find(u => u.email === email) ?? null;
};

/**
 * The sign-up was not only accepted by Kratos: the first sign-in created the
 * Alkemio user, and that user carries the names typed into the form. Read two
 * ways — as the new session itself (`me`) and by the platform admin by email —
 * and they must be the same record.
 */
const expectAlkemioUserRegistered = async (
  page: Page,
  email: string,
  firstName: string,
  lastName: string
) => {
  const me = must(await readMyUser(await sessionActor(page)), 'readMyUser(new session)')
    .me.user;
  expect(me, `Alkemio user for the new session of ${email}`).toBeTruthy();
  // Rebaseline candidate: the server composes displayName as "<first> <last>".
  expect(me!.profile?.displayName).toBe(`${firstName} ${lastName}`);

  const user = await findAlkemioUser(email);
  expect(user, `Alkemio user with email ${email}`).toBeTruthy();
  expect(user!.id).toBe(me!.id);
  expect(user!.email).toBe(email);
  expect(user!.firstName).toBe(firstName);
  expect(user!.lastName).toBe(lastName);
  expect(user!.profile?.displayName).toBe(`${firstName} ${lastName}`);
};

// File level, so it also runs when a failure retires the worker mid-file:
// removes every identity this file registered — the Alkemio user AND its
// Kratos identity (deleteIdentity) — so a run leaks nothing. A sign-up that
// never reached its first sign-in has no Alkemio user, and its Kratos
// identity cannot be removed through the platform API; that is logged.
test.afterAll(async () => {
  const failures: string[] = [];
  for (const email of registeredEmails.splice(0)) {
    // One failed lookup or token request must not abort the loop: the rest of
    // the addresses are already spliced out and would never be retried.
    try {
      const user = await findAlkemioUser(email);
      if (!user) {
        console.warn(`[teardown] no Alkemio user for ${email}; its Kratos identity (if any) stays`);
        continue;
      }
      const res = await deleteUser(user.id, await platformAdmin(), true);
      if (res.error) failures.push(`${email}: ${JSON.stringify(res.error.errors ?? res.error)}`);
    } catch (e) {
      failures.push(`${email}: ${(e as Error).message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`could not remove registered identities: ${failures.join('; ')}`);
  }
});

test.describe('Authentication - Registration Flows', () => {
  // Run serially: each test polls the shared MailSlurper inbox for its own
  // recipient's verification email (read, never pruned).
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  /**
   * Creates a real user with a unique email (test+{uniqueId}@alkem.io) through
   * the sign-up form and email verification; removed in the file's afterAll.
   */
  test('user successful registration with email verification', async ({
    page,
  }) => {
    test.setTimeout(60000); // Extended timeout for email-dependent flow

    const uniqueId = UniqueIDGenerator.getID();
    const userEmail = `test+${uniqueId}@alkem.io`;
    registeredEmails.push(userEmail);

    // Navigate to registration and accept terms
    await navigateToRegistrationFromAcceptTerms(baseUrl, page);

    // Fill in registration form
    await fillUpSignUpPageElements(userEmail, 'Test', 'Alkemio', page);
    await nextButton(page).click();

    // Set password
    await fillUpSignUpPasswordElements(password, page);
    await nextButton(page).click();

    // Verify we reached the verification step (CRD "Verify your email" screen)
    await expect(
      page.getByRole('heading', { name: 'Verify your email' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'The last step is to verify your email address. Please check your inbox for an email with instructions.'
      )
    ).toBeVisible();

    // The verification mail for THIS address — read scoped to the recipient,
    // so other flows' mail in the shared inbox is neither matched nor removed.
    await expect
      .poll(() => getVerificationLinkFor(userEmail), {
        message: `verification link for ${userEmail} in the inbox`,
        timeout: 30_000,
      })
      .toBeTruthy();
    const verificationLink = (await getVerificationLinkFor(userEmail))!;

    await page.goto(verificationLink);
    await expect(page.getByText('You successfully verified')).toBeVisible({
      timeout: 10000,
    });
    const continueLink = page.getByRole('link', { name: 'Continue' });
    if (await continueLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueLink.click();
    }

    await expect(
      page.getByRole('heading', { name: 'Sign in' })
    ).toBeVisible({ timeout: 10000 });

    // Sign in with new account
    await fillUpSignInPageElements(userEmail, password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login
    await expectSignedIn(page);

    // The Alkemio user exists with the names typed into the form.
    await expectAlkemioUserRegistered(page, userEmail, 'Test', 'Alkemio');
  });

  // Previously skipped for client-web bug #8317; re-enabled against the CRD
  // registration flow (accept terms + fill form on the same step, then password).
  test('user registration with accept terms first then fill form', async ({
    page,
  }) => {
    test.setTimeout(60000);

    const uniqueId = UniqueIDGenerator.getID();
    const userEmail = `test+${uniqueId}@alkem.io`;
    registeredEmails.push(userEmail);

    // Navigate and fill form with pre-accepted terms
    await navigateToRegistrationFromSignUpFillFormAndContinue(
      baseUrl,
      page,
      userEmail,
      'Test',
      'Alkemio'
    );

    // Set password and advance (CRD password step uses the "Next" button)
    await fillUpSignUpPasswordElements(password, page);
    await nextButton(page).click();

    // Verify we reached the CRD "Verify your email" step
    await expect(
      page.getByRole('heading', { name: 'Verify your email' })
    ).toBeVisible();

    // The verification mail for THIS address — read scoped to the recipient,
    // so other flows' mail in the shared inbox is neither matched nor removed.
    await expect
      .poll(() => getVerificationLinkFor(userEmail), {
        message: `verification link for ${userEmail} in the inbox`,
        timeout: 30_000,
      })
      .toBeTruthy();
    const verificationLink = (await getVerificationLinkFor(userEmail))!;

    await page.goto(verificationLink);
    await expect(page.getByText('You successfully verified')).toBeVisible({
      timeout: 10000,
    });
    const continueLink = page.getByRole('link', { name: 'Continue' });
    if (await continueLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await continueLink.click();
    }

    await expect(
      page.getByRole('heading', { name: 'Sign in' })
    ).toBeVisible({ timeout: 10000 });

    // Sign in with new account
    await fillUpSignInPageElements(userEmail, password, page);
    await pressSignInButtonSignInPage(page);

    // Verify successful login
    await expectSignedIn(page);

    // The Alkemio user exists with the names typed into the form.
    await expectAlkemioUserRegistered(page, userEmail, 'Test', 'Alkemio');
  });
});
