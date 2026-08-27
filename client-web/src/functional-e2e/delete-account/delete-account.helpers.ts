// Shared scaffolding for the delete-own-account acceptance walks
// (US1 `us1-delete-own-account.spec.ts`, US2 `us2-blocked-resources.spec.ts`,
// US3 `us3-reauth-freshness.spec.ts`). Provisioning a disposable subject,
// logging in through the real SPA form, and reaching the Security tab are
// identical across every walk in this area — extracted here once so a
// client-web UI change (avatar-menu label, header layout, the Security tab
// route, ...) is fixed in one place instead of drifting silently between
// files (test-suites/CLAUDE.md: "Shared code lives in `fixtures/` and
// `helpers/`").

import { expect, type Page } from '@playwright/test';
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

export const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

// `registerInKratosOrFail` submits the harness admin password
// (`testConfiguration.identities.admin.password`) for every identity it
// creates — this is that same constant's env-var mirror, so the UI login
// step below authenticates with the password Kratos actually stored.
export const harnessPassword =
  process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';
export const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';

/** contracts/deleteuser-self-branch.md §2 — 15-minute privileged window,
 * mirrored here (not imported — client-web has no dependency on the
 * server's source tree) so the US3 walk can age a real session "just
 * outside" it without a magic number. Same constant, same rationale, as
 * `server-api/.../delete-own-account.request.params.ts`. */
export const PRIVILEGED_SESSION_WINDOW_S = 15 * 60;

export interface DisposableSubject {
  email: string;
  displayName: string;
  userId: string;
  accountId: string;
}

type SubjectRow = { id: string; accountId: string; displayName: string };

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
export const provisionSubject = async (
  label: string
): Promise<DisposableSubject> => {
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
export const loginAsSubject = async (
  page: Page,
  email: string
): Promise<void> => {
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
export const navigateToSecurityTab = async (page: Page): Promise<void> => {
  await page.getByRole('banner').getByRole('button').last().click();
  await page.getByRole('menuitem', { name: 'My Account' }).click();
  await page.getByRole('tab', { name: 'Security', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Delete account', level: 4 })
  ).toBeVisible({ timeout: 15_000 });
};

export const deleteAccountTriggerButton = (page: Page) =>
  page.getByRole('button', { name: 'Delete account', exact: true });
export const typedNameField = (page: Page) =>
  page.getByPlaceholder('Type your name to confirm');
export const confirmDeleteButton = (page: Page) =>
  page.getByRole('button', { name: 'Delete my account', exact: true });
export const logInHeaderLink = (page: Page) =>
  page.getByRole('link', { name: 'Log in', exact: true });

let adminTokenPromise: Promise<string> | undefined;
const getSharedAdminToken = (): Promise<string> => {
  if (!adminTokenPromise) {
    adminTokenPromise = getUserToken(adminEmail);
  }
  return adminTokenPromise;
};

/**
 * Best-effort teardown via the admin bearer path — a no-op once the
 * subject's own in-flow deletion has already run. Never masks a test
 * failure: swallows its own errors.
 *
 * Accepts an already-minted admin token so a describe block that resolved
 * one for its own admin-authenticated fixtures (US2's space seeding, say)
 * doesn't mint a second; omit it to use the lazily-minted shared one.
 */
export const deleteUserQuietly = async (
  userId?: string,
  adminToken?: string
): Promise<void> => {
  if (!userId) return;
  try {
    const token = adminToken ?? (await getSharedAdminToken());
    await postGraphqlRaw(
      `mutation DeleteAccountWalkTeardown($deleteData: DeleteUserInput!) {
        deleteUser(deleteData: $deleteData) { id }
      }`,
      {
        bearerToken: token,
        variables: { deleteData: { ID: userId, deleteIdentity: true } },
      }
    );
  } catch {
    // Subject already gone (the normal case), or the admin token could not
    // be minted during teardown — either way nothing useful is left to do.
  }
};

export type AuditRow = {
  category: string;
  initiatorRole: string;
  outcome: string;
  details: Record<string, unknown> | null;
};

export const getAuditRowsFor = (
  subjectUserId: string
): Promise<AuditRow[]> =>
  queryHarnessDb<AuditRow>(
    `SELECT category, "initiatorRole", outcome, details
     FROM platform_audit_entry
     WHERE "subjectUserId" = $1
     ORDER BY "createdDate" ASC`,
    [subjectUserId]
  );
