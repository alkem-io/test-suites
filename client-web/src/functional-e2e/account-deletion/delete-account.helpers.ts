// Shared scaffolding for the delete-own-account walks (US1
// `us1-delete-own-account.spec.ts`, US2 `us2-blocked-resources.spec.ts`, US3
// `us3-reauth-freshness.spec.ts`).
//
// W2 Tier 0 item 3: subjects are provisioned and read back through named
// `@alkemio/tests-lib` functions only — public Kratos registration with the
// subject's own verification mail, then `readMyUser` / `readUserAccount`. No
// SQL, so everything here runs on the shared test cluster. The audit-row
// reader (`getAuditRowsFor`) is the one exception and is used only by
// `@local-stack` cases.
//
// Since client-web#10437 (054 FR-001 amended 2026-10-23) the Delete-account
// card lives in the collapsed "Danger Zone" section at the end of the user
// settings **Account** tab, not on the Security tab.

import { expect, type Page } from '@playwright/test';
import {
  deleteUser,
  getUserToken,
  queryHarnessDb,
  readMyUser,
  readUserAccount,
  registerVerifiedUser,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { testConfiguration } from '@src/config/test.configuration';
import { userMenuAvatar } from '../authentication/common-authentication-page-elements';
import { must } from '../helpers/lib-actor.helper';
import { openSettingsSection } from '../helpers/settings-section.helper';
import { signIn } from './account-deletion.helpers';

export const baseUrl = (
  process.env.ALKEMIO_BASE_URL || 'http://localhost:3000'
).replace(/\/$/, '');

// `registerInKratosOrFail` stores the harness admin password for every
// identity it creates; sign in with the same config value.
export const harnessPassword = testConfiguration.identities.admin.password;
export const adminEmail = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';

/** contracts/deleteuser-self-branch.md §2 — the 15-minute privileged window,
 * mirrored so US3 can age a real session "just outside" it. */
export const PRIVILEGED_SESSION_WINDOW_S = 15 * 60;

export interface DisposableSubject {
  email: string;
  displayName: string;
  userId: string;
  accountId: string;
}

/**
 * Registers + verifies a fresh disposable identity through public Kratos (its
 * own verification mail, read by recipient), lets its first sign-in create
 * the Alkemio user, and reads back the id, account and the display name the
 * typed-name confirm requires.
 */
export const provisionSubject = async (
  label: string
): Promise<DisposableSubject> => {
  const uniqueId = UniqueIDGenerator.getID();
  const email = `del-${label}-${uniqueId}@test.alkem.io`;
  const userId = await registerVerifiedUser(
    email,
    `Del${uniqueId}`,
    `${label}Fixture`
  );
  const { me } = must(
    await readMyUser({ bearerToken: await getUserToken(email) }),
    `read the new subject ${label}`
  );
  const user = me.user;
  if (!user || user.id !== userId || !user.account?.id || !user.profile) {
    throw new Error(`provisionSubject(${label}): incomplete user read back`);
  }
  return {
    email,
    displayName: user.profile.displayName,
    userId,
    accountId: user.account.id,
  };
};

/** Signs `email` in through the real SPA form in `page`'s own context, so
 * the session the delete flow gates on is genuinely fresh. */
export const loginAsSubject = (page: Page, email: string): Promise<void> =>
  signIn(page, email, harnessPassword);

/**
 * Reaches the Delete-account card the way a user does: header avatar menu →
 * "My Account" (the settings Account tab) → expand "Danger Zone". Idempotent:
 * an already-open section stays open.
 */
export const openDeleteAccountSection = async (page: Page): Promise<void> => {
  await userMenuAvatar(page).click();
  await page.getByRole('menuitem', { name: 'My Account', exact: true }).click();
  await page.waitForURL(/\/settings\/account(\?|$)/);
  await expect(
    page
      .getByRole('main')
      .getByRole('tablist')
      .getByRole('tab', { name: 'Account', exact: true })
  ).toHaveAttribute('aria-selected', 'true');
  await openSettingsSection(page, /^Danger Zone/);
  await expect(deleteAccountTriggerButton(page)).toBeVisible();
};

export const deleteAccountTriggerButton = (page: Page) =>
  page.getByRole('button', { name: 'Delete account', exact: true });
export const typedNameField = (page: Page) =>
  page.getByPlaceholder('Type your name to confirm');
export const confirmDeleteButton = (page: Page) =>
  page.getByRole('button', { name: 'Delete my account', exact: true });
export const logInHeaderLink = (page: Page) =>
  page.getByRole('link', { name: 'Log in', exact: true });
export const notificationsButton = (page: Page) =>
  page
    .getByRole('banner')
    .getByRole('button', { name: 'Notifications', exact: true });

let adminTokenPromise: Promise<string> | undefined;
export const getAdminToken = (): Promise<string> => {
  if (!adminTokenPromise) {
    adminTokenPromise = getUserToken(adminEmail);
  }
  return adminTokenPromise;
};

/**
 * Whether the platform still holds this user, read by the platform admin:
 * `lookup.user` resolves it (true) or answers ENTITY_NOT_FOUND (false). Any
 * other answer is an error, never a silent "gone".
 */
export const userExists = async (userId: string): Promise<boolean> => {
  const result = await readUserAccount(userId, {
    bearerToken: await getAdminToken(),
  });
  if (result.data?.lookup?.user?.id === userId) return true;
  const codes = (result.error?.errors ?? []).map(e => e.code);
  if (codes.length > 0 && codes.every(code => code === 'ENTITY_NOT_FOUND')) {
    return false;
  }
  throw new Error(
    `userExists(${userId}): unexpected answer ${JSON.stringify(result.error?.errors ?? result.data)}`
  );
};

/**
 * Teardown: delete the subject with its sign-in identity unless the walk
 * already did. ENTITY_NOT_FOUND (deleted by the walk) is the expected outcome
 * after a green run; anything else fails the hook — a leaked user is a leaked
 * fixture on a shared environment.
 */
export const deleteSubjectIfPresent = async (
  userId?: string
): Promise<void> => {
  if (!userId) return;
  const result = await deleteUser(
    userId,
    { bearerToken: await getAdminToken() },
    true
  );
  if (!result.error) return;
  if (result.error.errors.every(e => e.code === 'ENTITY_NOT_FOUND')) return;
  throw new Error(
    `teardown: deleting subject ${userId} failed: ${JSON.stringify(result.error.errors)}`
  );
};

/**
 * Runs every teardown step and fails once at the end if any did, so one
 * failure never hides (or skips) the others.
 */
export const runTeardown = async (
  steps: Array<[what: string, step: () => Promise<unknown>]>
): Promise<void> => {
  const failures: string[] = [];
  for (const [what, step] of steps) {
    try {
      await step();
    } catch (error) {
      failures.push(`${what}: ${(error as Error).message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(`teardown failed:\n${failures.join('\n')}`);
  }
};

// --- @local-stack only ------------------------------------------------------

export type AuditRow = {
  category: string;
  initiatorRole: string;
  outcome: string;
  details: Record<string, unknown> | null;
};

/**
 * The account-deletion audit rows for a subject. The audit trail has no
 * GraphQL read surface, so this needs loopback Postgres (HARNESS_POSTGRES_*):
 * only `@local-stack` cases call it.
 */
export const getAuditRowsFor = (subjectUserId: string): Promise<AuditRow[]> =>
  queryHarnessDb<AuditRow>(
    `SELECT category, "initiatorRole", outcome, details
     FROM platform_audit_entry
     WHERE "subjectUserId" = $1
     ORDER BY "createdDate" ASC`,
    [subjectUserId]
  );
