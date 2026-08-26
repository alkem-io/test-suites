// Durable regression cover for the delete-own-account acceptance walk
// covering the "delete my account, no blocking resources" story. Two
// disposable subjects, each registered + verified through the real Kratos
// self-service flow (never a fabricated session — the self-branch freshness
// gate is exactly what the freshness-hardening story hardens, so this walk
// must present a genuinely fresh, cookie-authenticated session the same way
// a real user does):
//
//  - `cleanSubject` holds no blocking resources. One continuous authenticated
//    page carries it through AS1 (card visible, immediate/permanent copy) →
//    AS2 (mismatched typed name keeps the destructive confirm disabled) →
//    AS3 (exact typed name enables it; confirming succeeds with no error and
//    signs the user out). AS4 (old credentials can never sign in again) and
//    AS5 (exactly one self-initiated, PII-free `account_deleted` audit row
//    survives the deleted subject) run after, against the one-way-door state
//    AS3 left behind — hence `serial` mode for this file.
//  - `subSubject` has a stored `account.externalSubscriptionID` (seeded by
//    direct SQL — no GraphQL mutation exists for it, quickstart.md §4) and no
//    blocking resources. AS6 confirms the subscription notice renders, the
//    deletion proceeds anyway, and the linkage lands in the audit record.

import { expect, test, type Page } from '@playwright/test';
import {
  delay,
  getUserToken,
  postGraphqlRaw,
  queryHarnessDb,
  registerInKratosOrFail,
  UniqueIDGenerator,
  verifyInKratosOrFail,
} from '@alkemio/tests-lib';
import { acceptCookiesIfVisible } from '../helpers/cookies.helper';

const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

// `registerInKratosOrFail` submits the harness admin password
// (`testConfiguration.identities.admin.password`) for every identity it
// creates — this is that same constant's env-var mirror, so the UI login
// step below authenticates with the password Kratos actually stored.
const harnessPassword = process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

interface DisposableSubject {
  email: string;
  displayName: string;
  userId: string;
  accountId: string;
}

type SubjectRow = {
  id: string;
  accountId: string;
  displayName: string;
};

/**
 * The Alkemio `User`/`Account`/`Profile` rows are created by the Kratos
 * verification webhook asynchronously — polled by email rather than resolved
 * over a bearer token, since `/api/auth/non-interactive-login` is an
 * opt-in dev/CI feature flag this walk must not depend on being enabled.
 */
const resolveSubjectRow = async (email: string): Promise<SubjectRow> => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const rows = await queryHarnessDb<SubjectRow>(
      `SELECT u.id, u."accountID" AS "accountId", p."displayName" AS "displayName"
       FROM "user" u
       JOIN actor a ON a.id = u.id
       JOIN profile p ON p.id = a."profileId"
       WHERE u.email = $1`,
      [email]
    );
    if (rows[0]) return rows[0];
    await delay(500);
  }
  throw new Error(
    `resolveSubjectRow: no Alkemio user row appeared for '${email}' after registration + verification`
  );
};

/**
 * Registers + email-verifies a fresh disposable identity through the real
 * Kratos self-service flow, then resolves the Alkemio user/account ids and
 * displayed name once the verification webhook has materialized them.
 */
const provisionSubject = async (label: string): Promise<DisposableSubject> => {
  const uniqueId = UniqueIDGenerator.getID();
  const email = `del-${label}-${uniqueId}@test.alkem.io`;
  const firstName = `Del${uniqueId}`;
  const lastName = `${label}Fixture`;

  const { verificationFlowId } = await registerInKratosOrFail(
    firstName,
    lastName,
    email
  );
  await verifyInKratosOrFail(email, verificationFlowId);

  const row = await resolveSubjectRow(email);

  return {
    email,
    displayName: row.displayName,
    userId: row.id,
    accountId: row.accountId,
  };
};

/** Signs `email` in through the real SPA sign-in form — never a fabricated
 * cookie — so the session the delete flow gates on is genuinely fresh. */
const loginAsSubject = async (page: Page, email: string): Promise<void> => {
  await page.goto(baseUrl);
  await acceptCookiesIfVisible(page);
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await page.waitForURL(/.*login.*/);
  await page.getByRole('textbox', { name: 'E-Mail *' }).fill(email);
  await page
    .getByRole('textbox', { name: 'Password *' })
    .fill(harnessPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/.*home.*/, { timeout: 30_000 });
};

/** Reaches the Security tab purely through the CRD UI a real user takes —
 * avatar menu → "My Account" (the owner-settings entry point, distinct from
 * "My Profile"'s public-style view) → the "Security" tab — never a
 * hand-built `/user/<nameID>/settings/security` URL. */
const navigateToSecurityTab = async (page: Page): Promise<void> => {
  await page.getByRole('banner').getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'My Account' }).click();
  await page.getByRole('tab', { name: 'Security', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Delete account', level: 4 })
  ).toBeVisible({ timeout: 15_000 });
};

const deleteAccountTriggerButton = (page: Page) =>
  page.getByRole('button', { name: 'Delete account', exact: true });
const typedNameField = (page: Page) =>
  page.getByPlaceholder('Type your name to confirm');
const confirmDeleteButton = (page: Page) =>
  page.getByRole('button', { name: 'Delete my account', exact: true });
const logInHeaderLink = (page: Page) =>
  page.getByRole('link', { name: 'Log in', exact: true });

type AuditRow = {
  category: string;
  initiatorRole: string;
  outcome: string;
  details: Record<string, unknown> | null;
};

const getAuditRowsFor = (subjectUserId: string): Promise<AuditRow[]> =>
  queryHarnessDb<AuditRow>(
    `SELECT category, "initiatorRole", outcome, details
     FROM platform_audit_entry
     WHERE "subjectUserId" = $1
     ORDER BY "createdDate" ASC`,
    [subjectUserId]
  );

/** Best-effort teardown via the admin bearer path — a no-op once the
 * subject's own in-flow deletion (AS3 / AS6) has already run. Never masks a
 * test failure: swallows its own errors. */
const deleteUserQuietly = async (userId?: string): Promise<void> => {
  if (!userId) return;
  try {
    const adminToken = await getUserToken(
      process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io'
    );
    await postGraphqlRaw(
      `mutation Us1DeleteOwnAccountTeardown($deleteData: DeleteUserInput!) {
        deleteUser(deleteData: $deleteData) { id }
      }`,
      {
        bearerToken: adminToken,
        variables: { deleteData: { ID: userId, deleteIdentity: true } },
      }
    );
  } catch {
    // Subject already gone (the normal case), or the admin token could not
    // be minted during teardown — either way nothing useful is left to do.
  }
};

test.describe(
  'Delete my account, no blocking resources',
  { tag: '@forge-acceptance' },
  () => {
    // AS3 is a one-way door (the subject stops existing) and AS4/AS5 read the
    // state it leaves behind — the whole file must run in one fixed order.
    test.describe.configure({ mode: 'serial' });

    let cleanSubject: DisposableSubject;
    let subSubject: DisposableSubject;
    let cleanContext: Awaited<ReturnType<Page['context']>> | undefined;
    let cleanPage: Page | undefined;

    test.beforeAll(async () => {
      // Two Kratos registrations + email verifications, well beyond the
      // default 30s hook budget.
      test.setTimeout(180_000);
      cleanSubject = await provisionSubject('us1clean');
      subSubject = await provisionSubject('us1sub');
    });

    test.afterAll(async () => {
      await cleanContext?.close().catch(() => {});
      // No-ops for both once AS3 / AS6 have run — the normal, successful
      // outcome. Only fires for real on an aborted run.
      await deleteUserQuietly(cleanSubject?.userId);
      await deleteUserQuietly(subSubject?.userId);
    });

    test('US1-AS1: Delete-account entry is visible, stating deletion is immediate and permanent', async ({
      browser,
    }) => {
      test.setTimeout(60_000);
      cleanContext = await browser.newContext();
      cleanPage = await cleanContext.newPage();

      await loginAsSubject(cleanPage, cleanSubject.email);
      await navigateToSecurityTab(cleanPage);

      const cardCopy = cleanPage.getByText(
        /Deleting your account is immediate and permanent/i
      );
      await expect(cardCopy).toBeVisible();
      await expect(cardCopy).toContainText(/cannot be undone/i);
      await expect(deleteAccountTriggerButton(cleanPage)).toBeEnabled();
    });

    test('US1-AS2: a non-matching typed name keeps the destructive confirm disabled', async () => {
      const page = cleanPage!;
      await deleteAccountTriggerButton(page).click();

      const confirmButton = confirmDeleteButton(page);
      await expect(confirmButton).toBeVisible();
      await expect(confirmButton).toBeDisabled();

      await typedNameField(page).fill('A Name That Does Not Match');
      await expect(confirmButton).toBeDisabled();
    });

    test('US1-AS3: the exact typed name enables confirm; deletion succeeds and signs the user out', async () => {
      test.setTimeout(30_000);
      const page = cleanPage!;

      await typedNameField(page).fill(cleanSubject.displayName);
      const confirmButton = confirmDeleteButton(page);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // Success, never a false failure: the dialog's own generic
      // error text must never appear.
      await expect(
        page.getByText(/Couldn't delete your account/i)
      ).toHaveCount(0);

      // Client navigates to AUTH_LOGOUT_PATH ('/logout'), which revokes the
      // session and lands on the signed-out header state.
      await expect(logInHeaderLink(page)).toBeVisible({ timeout: 15_000 });
    });

    test('US1-AS4: the deleted account can never sign in again', async ({
      browser,
    }) => {
      test.setTimeout(30_000);
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(baseUrl);
      await acceptCookiesIfVisible(page);
      await page.getByRole('link', { name: 'Log in', exact: true }).click();
      await page.waitForURL(/.*login.*/);
      await page
        .getByRole('textbox', { name: 'E-Mail *' })
        .fill(cleanSubject.email);
      await page
        .getByRole('textbox', { name: 'Password *' })
        .fill(harnessPassword);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();

      // Kratos returns the same generic "invalid credentials" message for a
      // wrong password AND a non-existent identity (enumeration-safe) — this
      // IS "sign-in fails as for a non-existent identity".
      const errorAlert = page.getByRole('alert');
      await expect(errorAlert).toBeVisible({ timeout: 15_000 });
      await expect(errorAlert).toContainText(/invalid/i);
      await expect(page).toHaveURL(/.*login.*/);

      await context.close();
    });

    test('US1-AS5: exactly one durable, self-initiated account_deleted audit row survives the subject, with no PII', async () => {
      const rows = await getAuditRowsFor(cleanSubject.userId);

      const primaryRows = rows.filter(row => row.outcome === 'account_deleted');
      expect(primaryRows).toHaveLength(1);
      expect(primaryRows[0].category).toBe('account_deletion');
      expect(primaryRows[0].initiatorRole).toBe('self');

      const serialized = JSON.stringify(rows);
      expect(serialized).not.toContain(cleanSubject.email);
      expect(serialized).not.toContain(cleanSubject.displayName);
    });

    test('US1-AS6: an active subscription does not block deletion and is captured in the audit record', async ({
      browser,
    }) => {
      test.setTimeout(60_000);

      const externalSubscriptionId = `wingback-test-${UniqueIDGenerator.getID()}`;
      await queryHarnessDb(
        'UPDATE account SET "externalSubscriptionID" = $1 WHERE id = $2',
        [externalSubscriptionId, subSubject.accountId]
      );

      const context = await browser.newContext();
      const page = await context.newPage();

      await loginAsSubject(page, subSubject.email);
      await navigateToSecurityTab(page);

      await deleteAccountTriggerButton(page).click();
      // Pre-flight information: the stored billing linkage is surfaced,
      // deletion is not blocked by it.
      await expect(
        page.getByText(/active subscription linked/i)
      ).toBeVisible();

      await typedNameField(page).fill(subSubject.displayName);
      const confirmButton = confirmDeleteButton(page);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      await expect(logInHeaderLink(page)).toBeVisible({ timeout: 15_000 });

      const rows = await getAuditRowsFor(subSubject.userId);
      const primaryRows = rows.filter(row => row.outcome === 'account_deleted');
      expect(primaryRows).toHaveLength(1);
      expect(primaryRows[0].details?.externalSubscriptionID).toBe(
        externalSubscriptionId
      );

      await context.close();
    });
  }
);
