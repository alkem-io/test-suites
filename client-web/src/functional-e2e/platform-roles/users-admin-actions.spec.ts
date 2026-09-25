// workspace#027 — platform role redesign. Manual checklist C6 (can), automated:
// Platform Users Admin changes a user's login email and deletes a user from
// Administration → Users. Both act on a DISPOSABLE user registered for this
// file; nothing else is touched. (Viewing / revoking another user's MCP API
// keys is API-only by design — no admin UI exists for it.)
import { expect, test as base, type Page } from '@playwright/test';
import {
  platformRoleEmail,
  registerTestUser,
  seedPlatformRoleUsers,
  TestUserManager,
} from '@alkemio/tests-lib';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const victim = `pr-usersadmin-${Math.random().toString(36).slice(2, 7)}`;
const newEmail = `${victim}-renamed@alkem.io`;

base.beforeAll(async () => {
  base.setTimeout(120_000);
  await TestUserManager.populateUserModelMap();
  await seedPlatformRoleUsers();
  await registerTestUser(victim);
});

const search = async (page: Page, term: string) => {
  const box = page.getByRole('main').getByRole('searchbox').or(page.getByRole('main').getByRole('textbox')).first();
  await box.fill(term);
  return page.getByRole('row').filter({ hasText: term });
};

const asUsersAdmin = createPersonaTest(platformRoleEmail('PLATFORM_USERS_ADMIN'));
asUsersAdmin.describe('PLATFORM_USERS_ADMIN on Administration → Users', () => {
  asUsersAdmin.describe.configure({ mode: 'serial' });

  asUsersAdmin('changes a login email, with reason and approver; the list shows the new address', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/users`);
    const row = await search(page, victim);
    await expect(row.first()).toBeVisible({ timeout: 20_000 });
    await row.first().getByRole('button', { name: 'Change email' }).click();
    const dialog = page.getByRole('dialog', { name: 'Change login email' });
    await dialog.getByRole('textbox', { name: 'New login email', exact: true }).fill(newEmail);
    await dialog.getByRole('textbox', { name: 'Confirm new login email' }).fill(newEmail);
    await dialog.getByRole('textbox', { name: 'Reason for change' }).fill('027 acceptance check');
    await dialog.getByRole('textbox', { name: 'Approved by' }).fill('QA lead');
    await dialog.getByRole('textbox', { name: "Approver's role", exact: true }).fill('QA');
    const done = page.waitForResponse(
      r => r.url().includes('/graphql') && r.request().postDataJSON()?.operationName === 'AdminUserEmailChange'
    );
    await dialog.getByRole('button', { name: 'Change email' }).click();
    expect((await (await done).json()).errors).toBeUndefined();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await page.reload();
    await expect((await search(page, victim)).first()).toContainText(newEmail, { timeout: 20_000 });
  });

  asUsersAdmin('deletes the user; the list drops the row without a reload', async ({ page }) => {
    // KNOWN CLIENT DEFECT (027, E26): `useAdminGlobalUserList` evicts the cache
    // field `usersPaginated` after a delete, but the list reads
    // `platformAdmin.users` — nothing is refetched and the deleted user stays
    // listed until the page is reloaded. Expected to fail until fixed.
    asUsersAdmin.fail(true, 'client-web 027: users list is stale after delete');

    await page.goto(`${baseUrl}/admin/users`);
    const row = await search(page, victim);
    await expect(row.first()).toBeVisible({ timeout: 20_000 });
    await row.first().getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog')).first();
    const done = page.waitForResponse(
      r => r.url().includes('/graphql') && r.request().postDataJSON()?.operationName === 'deleteUser'
    );
    await confirm.getByRole('button', { name: 'Delete' }).click();
    expect((await (await done).json()).errors).toBeUndefined();
    await expect(page.getByRole('main').getByRole('status')).toContainText(/Showing 0/, { timeout: 10_000 });
    await expect(row).toHaveCount(0);
  });

  asUsersAdmin('…and the user is really gone after a reload', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/users`);
    await search(page, victim);
    await expect(page.getByRole('main').getByRole('status')).toContainText(/Showing 0/, { timeout: 20_000 });
  });
});
