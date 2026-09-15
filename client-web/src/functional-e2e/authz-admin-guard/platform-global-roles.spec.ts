// Feature: 085-authz-admin-guard (client-web#9537) — Platform Global Roles.
// Release 75 verification row 4 (P4). #9537 fixed this page to gate on
// GRANT_GLOBAL_ADMINS (the privilege the server enforces) instead of GRANT.
//
//  - GLOBAL_ADMIN   — add and remove a user on a harmless global role; the
//                     change persists and raises no denied toast.
//  - GLOBAL_SUPPORT — must NOT be offered an enabled Add/Remove it cannot use:
//                     either the admin area is not reachable for it, or the
//                     editor's controls are gated off with the tooltip.
import { expect } from '@playwright/test';
import { TestUserManager } from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { DENIED_TOAST, DENIED_TOOLTIP } from './authz-admin-guard.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
// A read-only platform role: granting it to the QA persona changes nothing
// another suite relies on, and it is removed again in the same file.
const ROLE = 'GLOBAL_COMMUNITY_READER';
const rolePageUrl = `${baseUrl}/admin/authorization/roles/${ROLE}`;
const subject = () => TestUserManager.users.qaUser.displayName;

const globalAdminTest = createPersonaTest('admin@alkem.io');
const globalSupportTest = createPersonaTest('global.support@alkem.io');
globalAdminTest.describe.configure({ mode: 'serial' });

// No scenario is created in this file, so populate the persona map explicitly.
globalAdminTest.beforeAll(async () => {
  await TestUserManager.populateUserModelMap();
});

// List items read "<name> (<email>)". A current member's item carries "Remove",
// a candidate's item carries "Add" — that is what tells the two lists apart.
const memberRow = (page: import('@playwright/test').Page) =>
  page.getByRole('listitem').filter({ hasText: subject() }).filter({ has: page.getByRole('button', { name: 'Remove', exact: true }) });
const candidateRow = (page: import('@playwright/test').Page) =>
  page.getByRole('listitem').filter({ hasText: subject() }).filter({ has: page.getByRole('button', { name: 'Add', exact: true }) });

globalAdminTest.describe('Platform Global Roles — GLOBAL_ADMIN (P4)', () => {
  globalAdminTest('4.1 Add the subject to the role; it persists; no denied toast', async ({ page }) => {
    await page.goto(rolePageUrl);
    await expect(page.getByRole('heading', { name: 'Add members' })).toBeVisible({ timeout: 15_000 });
    await page.getByPlaceholder('Search users…').fill(subject());
    const add = candidateRow(page).getByRole('button', { name: 'Add', exact: true });
    await expect(add).toBeEnabled({ timeout: 15_000 });
    await add.click();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expect(memberRow(page)).toBeVisible({ timeout: 15_000 });
  });

  globalAdminTest('4.2 Remove the subject from the role; it persists', async ({ page }) => {
    await page.goto(rolePageUrl);
    await expect(memberRow(page)).toBeVisible({ timeout: 15_000 });
    await memberRow(page).getByRole('button', { name: 'Remove', exact: true }).click();
    const confirm = page.getByRole('alertdialog').filter({ hasText: `Remove ${subject()}?` });
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
    await expect(confirm).toBeHidden();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 15_000 });
    await expect(memberRow(page)).toHaveCount(0);
  });
});

globalSupportTest('4.3 GLOBAL_SUPPORT is never offered an enabled control it cannot use', async ({ page }) => {
  await TestUserManager.populateUserModelMap();
  await page.goto(rolePageUrl);
  await page.waitForLoadState('networkidle');
  const editorHeading = page.getByRole('heading', { name: 'Add members' });
  if ((await editorHeading.count()) === 0) {
    // The admin area itself is not reachable for this persona — an acceptable
    // boundary: no control is offered at all.
    await expect(page).not.toHaveURL(/\/admin\/authorization/);
    return;
  }
  await page.getByPlaceholder('Search users…').fill(subject());
  const add = candidateRow(page).getByRole('button', { name: 'Add', exact: true });
  await expect(add).toBeVisible({ timeout: 15_000 });
  await expect(add).toBeDisabled();
  await add.locator('xpath=ancestor::span[@tabindex="0"][1]').focus();
  await expect(page.getByRole('tooltip').filter({ hasText: DENIED_TOOLTIP })).toBeVisible();
});
