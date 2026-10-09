// Feature: 085-authz-admin-guard (client-web#9537) — Platform Global Roles.
// Release 75 verification row 4 (P4), updated for workspace#027 (platform role
// redesign): the legacy read-only role this file used no longer exists.
//
//  - An assigner (the bootstrap admin)  — adds and removes a user on a harmless
//                     FEATURE role; the change persists and raises no denied toast.
//  - (4.3 / 4.4, the read-only viewer, moved: at Slice B `global.support` holds
//    Platform Support, which has no holder-list read at all, and the legacy
//    section those tests targeted is deleted. The read-only viewer is Platform
//    Audit Reader — covered in platform-roles/authorization-page-per-viewer.)
//
// SAFETY: the 027 page resolves the role from the URL and FALLS BACK to the
// first offered role when it does not recognise it — and the first offered role
// is Platform Roles Admin. With the old role name this file would have granted
// Roles Admin to the QA persona. So every test first proves the page is showing
// the role it asked for (`expectRoleSelected`) and touches nothing otherwise.
import { expect, type Page } from '@playwright/test';
import { getGraphqlClient, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';
import { DENIED_TOAST } from './authz-admin-guard.helpers';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
// A Feature role: low-risk by design (grants access to a feature, administers
// nothing), and it is removed again in this file — even when a test fails.
const ROLE = 'FEATURE_VIRTUAL_ASSISTANT';
const ROLE_LABEL = 'Feature Virtual Assistant';
const rolePageUrl = `${baseUrl}/admin/authorization/roles/${ROLE}`;
const subject = () => TestUserManager.users.qaUser.displayName;

const assignerTest = createPersonaTest('admin@alkem.io');
assignerTest.describe.configure({ mode: 'serial' });

// No scenario is created in this file, so populate the persona map explicitly.
assignerTest.beforeAll(async () => {
  await TestUserManager.populateUserModelMap();
});

/** The role tabs are toggle buttons; exactly the requested one must be pressed. */
const expectRoleSelected = async (page: Page) => {
  const tabs = page.getByRole('navigation', { name: 'Role', exact: true });
  await expect(
    tabs.getByRole('button', { name: ROLE_LABEL, exact: true })
  ).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 });
  await expect(tabs.locator('button[aria-pressed="true"]')).toHaveCount(1);
};

// List items read "<name> (<email>)". A current member's item carries "Remove",
// a candidate's item carries "Add" — that is what tells the two lists apart.
const memberRow = (page: Page) =>
  page
    .getByRole('listitem')
    .filter({ hasText: subject() })
    .filter({ has: page.getByRole('button', { name: 'Remove', exact: true }) });
const candidateRow = (page: Page) =>
  page
    .getByRole('listitem')
    .filter({ hasText: subject() })
    .filter({ has: page.getByRole('button', { name: 'Add', exact: true }) });

const removeSubject = async (page: Page) => {
  await memberRow(page).getByRole('button', { name: 'Remove', exact: true }).click();
  const confirm = page.getByRole('alertdialog').filter({ hasText: `Remove ${subject()}?` });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(confirm).toBeHidden();
};

assignerTest.describe('Platform Global Roles — an assigner (P4)', () => {
  // Whatever happened above, the QA persona must not keep the role: every other
  // suite uses it as an unprivileged user. Done through the API so it works
  // even when the page is what broke.
  assignerTest.afterAll(async () => {
    const { qaUser, globalAdmin } = TestUserManager.users;
    const asAssigner = { authorization: `Bearer ${globalAdmin.authToken}` };
    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.FeatureVirtualAssistant },
      asAssigner
    );
    const stillHolds = holders.data.platform.roleSet.usersInRole.some(
      user => user.id === qaUser.id
    );
    if (stillHolds) {
      await getGraphqlClient().PlatformRolesRemoveRoleFromUser(
        { roleData: { actorID: qaUser.id, role: RoleName.FeatureVirtualAssistant } },
        asAssigner
      );
    }
  });

  assignerTest('4.1 Add the subject to the role; it persists; no denied toast', async ({ page }) => {
    await page.goto(rolePageUrl);
    await expectRoleSelected(page);
    await expect(page.getByRole('heading', { name: 'Add members' })).toBeVisible({ timeout: 15_000 });
    // A Feature role's page has TWO editors (users, then organizations) and the
    // organization search box is labelled "Search users…" too — take the first.
    await page.getByPlaceholder('Search users…').first().fill(subject());
    const add = candidateRow(page).getByRole('button', { name: 'Add', exact: true });
    await expect(add).toBeEnabled({ timeout: 15_000 });
    await add.click();
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expectRoleSelected(page);
    await expect(memberRow(page)).toBeVisible({ timeout: 15_000 });
  });

  assignerTest('4.2 Remove the subject from the role; it persists', async ({ page }) => {
    await page.goto(rolePageUrl);
    await expectRoleSelected(page);
    await expect(memberRow(page)).toBeVisible({ timeout: 15_000 });
    await removeSubject(page);
    await expect(page.getByText(DENIED_TOAST)).toHaveCount(0);
    await page.reload();
    await expectRoleSelected(page);
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 15_000 });
    await expect(memberRow(page)).toHaveCount(0);
  });
});
