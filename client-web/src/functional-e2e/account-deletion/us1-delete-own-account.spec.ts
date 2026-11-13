// plan: client-web/src/functional-e2e/account-deletion/account-deletion-test-plan.md
// (US1 — delete my account, no blocking resources; TC-12 / D-3 / D-4)
//
// A disposable subject, registered + verified through public Kratos (never a
// fabricated session — the self-branch freshness gate needs a genuinely fresh,
// cookie-authenticated session), deletes its own account in the browser:
// AS1 (card on the Account tab's Danger Zone, immediate/permanent copy) → AS2
// (a mismatched typed name keeps the confirm disabled) → AS3 (the exact name
// enables it; confirming signs the user out and the user is gone — on this
// device and on a second one, whose session is refused) → AS4 (the old
// credentials never sign in again). Serial: AS3 is a one-way door.
//
// W2 Tier 0 item 3: the outcome is read back over GraphQL (`lookup.user` as
// the platform admin answers ENTITY_NOT_FOUND), not from Postgres. Two cases
// stay `@local-stack` because the cluster cannot serve them:
//  - US1-AS5 (exactly one PII-free `account_deleted` audit row): the audit
//    trail has no GraphQL read surface; it needs loopback Postgres.
//  - US1-AS6 (an active subscription does not block, and is audited): the
//    `externalSubscriptionID` can only be seeded by SQL (no mutation sets it
//    since the Wingback integration was removed, workspace#027 FR-021).

import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import {
  queryHarnessDb,
  UniqueIDGenerator,
  type GraphqlActor,
} from '@alkemio/tests-lib';
import { acceptCookiesIfVisible } from '../helpers/cookies.helper';
import { sessionActor } from '../helpers/lib-actor.helper';
import { fillSecret } from '../helpers/login.helper';
import {
  expectRefused,
  expectResolvesTo,
  whoAmI,
} from '../session-revocation/session-revocation.helpers';
import {
  baseUrl,
  confirmDeleteButton,
  deleteAccountTriggerButton,
  deleteSubjectIfPresent,
  DisposableSubject,
  getAuditRowsFor,
  harnessPassword,
  loginAsSubject,
  logInHeaderLink,
  notificationsButton,
  openDeleteAccountSection,
  provisionSubject,
  runTeardown,
  typedNameField,
  userExists,
} from './delete-account.helpers';

let cleanSubject: DisposableSubject | undefined;
let subSubject: DisposableSubject | undefined;
let cleanContext: BrowserContext | undefined;
let otherDeviceContext: BrowserContext | undefined;
let subContext: BrowserContext | undefined;

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await runTeardown([
    ['close clean context', async () => cleanContext?.close()],
    ['close other-device context', async () => otherDeviceContext?.close()],
    ['close subscription context', async () => subContext?.close()],
    // No-ops once AS3 / AS6 deleted them — the normal outcome.
    [
      'delete clean subject',
      () => deleteSubjectIfPresent(cleanSubject?.userId),
    ],
    [
      'delete subscription subject',
      () => deleteSubjectIfPresent(subSubject?.userId),
    ],
  ]);
});

test.describe(
  'Delete my account, no blocking resources',
  { tag: '@forge-acceptance' },
  () => {
    test.describe.configure({ mode: 'serial' });

    let cleanPage: Page;
    /** The subject's session on a second device, snapshotted before AS3. */
    let otherDevice: GraphqlActor;

    test.beforeAll(async ({ browser }) => {
      // Registration + verification mail + two SPA sign-ins.
      test.setTimeout(180_000);
      cleanSubject = await provisionSubject('us1clean');
      cleanContext = await browser.newContext();
      cleanPage = await cleanContext.newPage();
      await loginAsSubject(cleanPage, cleanSubject.email);

      // "Signed out on this and all other devices" (US1-AS3): a second,
      // independent sign-in that the deleting page never touches.
      otherDeviceContext = await browser.newContext();
      await loginAsSubject(
        await otherDeviceContext.newPage(),
        cleanSubject.email
      );
      otherDevice = await sessionActor(otherDeviceContext);
    });

    test('US1-AS1: the Delete-account card states that deletion is immediate and permanent', async () => {
      await openDeleteAccountSection(cleanPage);

      await expect(
        cleanPage.getByText(
          'Deleting your account is immediate and permanent. Your profile, settings, uploaded files, and sign-in credentials are removed, and this cannot be undone.',
          { exact: true }
        )
      ).toBeVisible();
      await expect(deleteAccountTriggerButton(cleanPage)).toBeEnabled();
    });

    test('US1-AS2: a non-matching typed name keeps the destructive confirm disabled', async () => {
      await deleteAccountTriggerButton(cleanPage).click();

      const confirmButton = confirmDeleteButton(cleanPage);
      await expect(typedNameField(cleanPage)).toBeVisible();
      await expect(confirmButton).toBeDisabled();

      await typedNameField(cleanPage).fill('A Name That Does Not Match');
      await expect(confirmButton).toBeDisabled();
    });

    test('US1-AS3: the exact typed name enables confirm; the account is deleted and the user signed out on every device', async () => {
      // Positive controls for the read-backs below.
      expect(await userExists(cleanSubject!.userId)).toBe(true);
      expectResolvesTo(
        await whoAmI(otherDevice),
        cleanSubject!.userId,
        'the other device before the deletion'
      );

      await typedNameField(cleanPage).fill(cleanSubject!.displayName);
      const confirmButton = confirmDeleteButton(cleanPage);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      // The client navigates to /logout and lands signed out.
      await expect(logInHeaderLink(cleanPage)).toBeVisible();
      await expect(notificationsButton(cleanPage)).toHaveCount(0);

      // And the platform no longer holds the user.
      expect(await userExists(cleanSubject!.userId)).toBe(false);

      // The other device is signed out too. This page went through /logout,
      // which ends only its own session; the second session ends only if the
      // self-deletion revoked it. Same oracle as the admin-deletion cascade
      // (session-revocation-test-plan.md, R2): refused, never served as an
      // anonymous visitor.
      expectRefused(
        await whoAmI(otherDevice),
        'the other device after the self-deletion'
      );
    });

    test('US1-AS4: the deleted account can never sign in again', async ({
      browser,
    }) => {
      const context = await browser.newContext();
      try {
        const page = await context.newPage();
        await page.goto(baseUrl);
        await acceptCookiesIfVisible(page);
        await logInHeaderLink(page).click();
        await page.waitForURL(/.*login.*/);
        await page
          .getByRole('textbox', { name: 'E-Mail' })
          .fill(cleanSubject!.email);
        await fillSecret(
          page.getByRole('textbox', { name: 'Password' }),
          harnessPassword
        );
        await page
          .getByRole('button', { name: 'Sign in', exact: true })
          .click();

        // Kratos answers a wrong password and a non-existent identity with the
        // same message (enumeration-safe) — this IS "fails as for a
        // non-existent identity". A surviving identity would sign in and mint
        // a fresh empty account instead.
        const errorAlert = page.getByRole('alert');
        await expect(errorAlert).toBeVisible();
        await expect(errorAlert).toContainText(/invalid/i);
        await expect(page).toHaveURL(/.*login.*/);
        await expect(notificationsButton(page)).toHaveCount(0);
      } finally {
        await context.close();
      }
    });

    test(
      'US1-AS5: exactly one durable, self-initiated account_deleted audit row survives the subject, with no PII',
      // The audit trail has no GraphQL read surface: loopback Postgres only.
      { tag: '@local-stack' },
      async () => {
        const rows = await getAuditRowsFor(cleanSubject!.userId);

        const primaryRows = rows.filter(
          row => row.outcome === 'account_deleted'
        );
        expect(primaryRows).toHaveLength(1);
        expect(primaryRows[0].category).toBe('account_deletion');
        expect(primaryRows[0].initiatorRole).toBe('self');

        const serialized = JSON.stringify(rows);
        expect(serialized).not.toContain(cleanSubject!.email);
        expect(serialized).not.toContain(cleanSubject!.displayName);
      }
    );
  }
);

test.describe(
  'Delete my account with an active subscription',
  // The subscription linkage can only be seeded by SQL, and the outcome read
  // from the audit row: loopback Postgres only.
  { tag: ['@forge-acceptance', '@local-stack'] },
  () => {
    test.beforeAll(async () => {
      test.setTimeout(180_000);
      subSubject = await provisionSubject('us1sub');
    });

    test('US1-AS6: an active subscription does not block deletion and is captured in the audit record', async ({
      browser,
    }) => {
      const externalSubscriptionId = `wingback-test-${UniqueIDGenerator.getID()}`;
      await queryHarnessDb(
        'UPDATE account SET "externalSubscriptionID" = $1 WHERE id = $2',
        [externalSubscriptionId, subSubject!.accountId]
      );

      subContext = await browser.newContext();
      const page = await subContext.newPage();
      await loginAsSubject(page, subSubject!.email);
      await openDeleteAccountSection(page);

      await deleteAccountTriggerButton(page).click();
      // The stored billing linkage is surfaced; it does not block.
      await expect(
        page.getByText(
          'Your account has an active subscription linked to it. Deletion will proceed; billing is reconciled separately.',
          { exact: true }
        )
      ).toBeVisible();

      await typedNameField(page).fill(subSubject!.displayName);
      const confirmButton = confirmDeleteButton(page);
      await expect(confirmButton).toBeEnabled();
      await confirmButton.click();

      await expect(logInHeaderLink(page)).toBeVisible();
      expect(await userExists(subSubject!.userId)).toBe(false);

      const rows = await getAuditRowsFor(subSubject!.userId);
      const primaryRows = rows.filter(row => row.outcome === 'account_deleted');
      expect(primaryRows).toHaveLength(1);
      expect(primaryRows[0].details?.externalSubscriptionID).toBe(
        externalSubscriptionId
      );
    });
  }
);
