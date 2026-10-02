// workspace#027 — platform role redesign. Manual checklist Part B, automated:
// the Authorization page (/admin/authorization) as each kind of viewer.
//
//   Platform Roles Admin   all 14 roles; adds and removes holders; the assignment
//                          rules refuse in the UI exactly as they do in the API
//   Platform Users Admin   ONLY the 4 Feature roles
//   Platform Audit Reader  all 14, strictly read-only
//
// Every test that is about ONE role first proves the page is showing that role
// (`openRole`): the page falls back to its FIRST tab — Platform Roles Admin —
// for a role name it does not recognise, so clicking "Add" without that check
// can grant the most powerful role there is.
import { expect, type Page } from '@playwright/test';
import {
  getGraphqlClient,
  getUserToken,
  platformRoleEmail,
  registerTestUser,
  seedPlatformRoleUsers,
  testConfiguration,
  type SeededPlatformRoleUsers,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { createPersonaTest } from '../fixtures/authenticated-session.fixture';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

const PLATFORM_TABS = [
  'Platform Roles Admin',
  'Platform Content Full Access',
  'Platform Resource Admin',
  'Platform Settings Admin',
  'Platform Operations Admin',
  'Platform Users Admin',
  'Platform Support',
  'Platform License Manager',
  'Platform Spaces Reader',
  'Platform Audit Reader',
];
const FEATURE_TABS = [
  'Feature Beta Tester',
  'Feature Virtual Assistant',
  'Feature Organization Creator',
  'Feature VC Campaign',
];

// The users roles are granted to and taken from in this file. Persistent (each
// is registered once per environment) and NORMALISED before and after: never one
// of the 14 role users or a shared `TestUser`, where a role left behind would
// poison every other suite's negatives. ONE PER BLOCK: the blocks run in
// parallel workers, and a shared subject let one block's clean-up strip the role
// another block was in the middle of testing.
type Subject = { user: string; name: string };
const ROLES_ADMIN_SUBJECT: Subject = { user: 'platformroles.uisubjecta', name: 'platformroles uisubjecta' };
const USERS_ADMIN_SUBJECT: Subject = { user: 'platformroles.uisubjectb', name: 'platformroles uisubjectb' };

type Setup = SeededPlatformRoleUsers & { subjectId: string; subject: Subject };
const prepared = new Map<string, Promise<Setup>>();

const assignerHeaders = (s: Setup) => ({ authorization: `Bearer ${s.bootstrapToken}` });

/** A small authenticated read, as the user whose token it is. */
const read = async <T>(token: string, query: string): Promise<T> => {
  const response = await fetch(testConfiguration.endPoints.graphql.private, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  });
  const body = await response.json();
  if (!body.data) throw new Error(`read failed: ${JSON.stringify(body.errors ?? body).slice(0, 300)}`);
  return body.data as T;
};

const normaliseSubject = async (s: Setup): Promise<void> => {
  const token = await getUserToken(`${s.subject.user}@alkem.io`);
  const held = (
    await read<{ platform: { roleSet: { myRoles: string[] } } }>(token, 'query { platform { roleSet { myRoles } } }')
  ).platform.roleSet.myRoles;
  for (const role of held.filter(r => r !== 'REGISTERED')) {
    await getGraphqlClient().PlatformRolesRemoveRoleFromUser(
      { roleData: { actorID: s.subjectId, role: role as RoleName } },
      assignerHeaders(s)
    );
  }
};

const setup = (subject: Subject): Promise<Setup> => {
  let ready = prepared.get(subject.user);
  if (!ready) {
    ready = (async () => {
      const seeded = await seedPlatformRoleUsers();
      await registerTestUser(subject.user);
      const token = await getUserToken(`${subject.user}@alkem.io`);
      const subjectId = (await read<{ me: { user: { id: string } } }>(token, 'query { me { user { id } } }')).me.user.id;
      const all = { ...seeded, subjectId, subject };
      await normaliseSubject(all);
      return all;
    })();
    prepared.set(subject.user, ready);
  }
  return ready;
};

const roleTabs = (page: Page) => page.getByRole('navigation', { name: 'Role', exact: true }).getByRole('button');

/** Opens a role's page and PROVES it is the one on screen. */
const openRole = async (page: Page, role: string, label: string) => {
  await page.goto(`${baseUrl}/admin/authorization/roles/${role}`);
  await expect(
    page.getByRole('navigation', { name: 'Role', exact: true }).getByRole('button', { name: label, exact: true })
  ).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });
  await expect(
    page.getByRole('navigation', { name: 'Role', exact: true }).locator('button[aria-pressed="true"]')
  ).toHaveCount(1);
};

const memberRow = (page: Page, name: string) =>
  page
    .getByRole('listitem')
    .filter({ hasText: name })
    .filter({ has: page.getByRole('button', { name: 'Remove', exact: true }) });
const candidateRow = (page: Page, name: string) =>
  page
    .getByRole('listitem')
    .filter({ hasText: name })
    .filter({ has: page.getByRole('button', { name: 'Add', exact: true }) });

/** Searches the USERS editor (a Feature role's page has a second, organization one). */
const tryToAdd = async (page: Page, name: string) => {
  await page.getByPlaceholder('Search users…').first().fill(name);
  const add = candidateRow(page, name).getByRole('button', { name: 'Add', exact: true });
  await expect(add).toBeEnabled({ timeout: 20_000 });
  await add.click();
};

const remove = async (page: Page, name: string) => {
  await memberRow(page, name).getByRole('button', { name: 'Remove', exact: true }).click();
  const confirm = page.getByRole('alertdialog').filter({ hasText: `Remove ${name}?` });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(confirm).toBeHidden();
};

// ===== Platform Roles Admin ===================================================
const asRolesAdmin = createPersonaTest(platformRoleEmail('PLATFORM_ROLES_ADMIN'));

asRolesAdmin.describe('Authorization page — Platform Roles Admin', () => {
  asRolesAdmin.describe.configure({ mode: 'serial' });
  asRolesAdmin.beforeEach(async () => void (await setup(ROLES_ADMIN_SUBJECT)));
  asRolesAdmin.afterAll(async () => normaliseSubject(await setup(ROLES_ADMIN_SUBJECT)));

  asRolesAdmin('is offered all 14 roles, Platform first then Feature', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/authorization`);
    await expect(roleTabs(page)).toHaveText([...PLATFORM_TABS, ...FEATURE_TABS], { timeout: 20_000 });
  });

  asRolesAdmin('an unknown role in the URL falls back to the FIRST tab — and says so', async ({ page }) => {
    // Documents the trap described at the top of this file: the fallback is the
    // most powerful role, so it must at least be unmistakable on screen.
    await page.goto(`${baseUrl}/admin/authorization/roles/NO_SUCH_ROLE`);
    await expect(roleTabs(page).first()).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });
    await expect(roleTabs(page).first()).toHaveText('Platform Roles Admin');
    await expect(page.getByRole('heading', { name: 'Platform Roles Admin', level: 2 })).toBeVisible();
  });

  asRolesAdmin('adds a user to a Platform role; it persists across a reload', async ({ page }) => {
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await tryToAdd(page, ROLES_ADMIN_SUBJECT.name);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.reload();
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await expect(memberRow(page, ROLES_ADMIN_SUBJECT.name)).toBeVisible({ timeout: 20_000 });
  });

  asRolesAdmin('Audit Reader exclusion: a holder of another Platform role is refused, in the UI too', async ({ page }) => {
    // The subject holds Platform Support from the test above.
    await openRole(page, 'PLATFORM_AUDIT_READER', 'Platform Audit Reader');
    await tryToAdd(page, ROLES_ADMIN_SUBJECT.name);
    await expect(page.getByRole('alert')).toContainText('mutually exclusive', { timeout: 20_000 });
    await page.reload();
    await openRole(page, 'PLATFORM_AUDIT_READER', 'Platform Audit Reader');
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 20_000 });
    await expect(memberRow(page, ROLES_ADMIN_SUBJECT.name)).toHaveCount(0);
  });

  asRolesAdmin('removes the user again; it persists across a reload', async ({ page }) => {
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await expect(memberRow(page, ROLES_ADMIN_SUBJECT.name)).toBeVisible({ timeout: 20_000 });
    await remove(page, ROLES_ADMIN_SUBJECT.name);
    await page.reload();
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 20_000 });
    await expect(memberRow(page, ROLES_ADMIN_SUBJECT.name)).toHaveCount(0);
  });

  asRolesAdmin('Spaces Reader goes to service accounts only: a human is refused', async ({ page }) => {
    await openRole(page, 'PLATFORM_SPACES_READER', 'Platform Spaces Reader');
    await tryToAdd(page, ROLES_ADMIN_SUBJECT.name);
    await expect(page.getByRole('alert')).toContainText('service account', { timeout: 20_000 });
    await expect(memberRow(page, ROLES_ADMIN_SUBJECT.name)).toHaveCount(0);
  });

  asRolesAdmin('cannot assign a role to ITSELF', async ({ page }) => {
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await tryToAdd(page, 'platform rolesadmin');
    await expect(page.getByRole('alert')).toContainText('self-assignment', { timeout: 20_000 });
    await expect(memberRow(page, 'platform rolesadmin')).toHaveCount(0);
  });

  asRolesAdmin('a Feature role can also be held by organizations; a Platform role cannot', async ({ page }) => {
    await openRole(page, 'FEATURE_ORGANIZATION_CREATOR', 'Feature Organization Creator');
    await expect(page.getByRole('heading', { name: 'Current organisations' })).toBeVisible({ timeout: 20_000 });
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('heading', { name: 'Current organisations' })).toHaveCount(0);
  });
});

// ===== Platform Users Admin ===================================================
const asUsersAdmin = createPersonaTest(platformRoleEmail('PLATFORM_USERS_ADMIN'));

asUsersAdmin.describe('Authorization page — Platform Users Admin', () => {
  asUsersAdmin.describe.configure({ mode: 'serial' });
  asUsersAdmin.beforeEach(async () => void (await setup(USERS_ADMIN_SUBJECT)));
  asUsersAdmin.afterAll(async () => normaliseSubject(await setup(USERS_ADMIN_SUBJECT)));

  asUsersAdmin('is offered ONLY the 4 Feature roles', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/authorization`);
    await expect(roleTabs(page)).toHaveText(FEATURE_TABS, { timeout: 20_000 });
  });

  asUsersAdmin('a Platform role typed into the URL does not open: it falls back to a Feature role', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/authorization/roles/PLATFORM_SUPPORT`);
    await expect(roleTabs(page)).toHaveText(FEATURE_TABS, { timeout: 20_000 });
    await expect(roleTabs(page).first()).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('heading', { name: 'Platform Support', level: 2 })).toHaveCount(0);
  });

  asUsersAdmin('adds and removes a user on a Feature role', async ({ page }) => {
    await openRole(page, 'FEATURE_VIRTUAL_ASSISTANT', 'Feature Virtual Assistant');
    await tryToAdd(page, USERS_ADMIN_SUBJECT.name);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.reload();
    await openRole(page, 'FEATURE_VIRTUAL_ASSISTANT', 'Feature Virtual Assistant');
    await expect(memberRow(page, USERS_ADMIN_SUBJECT.name)).toBeVisible({ timeout: 20_000 });
    await remove(page, USERS_ADMIN_SUBJECT.name);
    await page.reload();
    await openRole(page, 'FEATURE_VIRTUAL_ASSISTANT', 'Feature Virtual Assistant');
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 20_000 });
    await expect(memberRow(page, USERS_ADMIN_SUBJECT.name)).toHaveCount(0);
  });
});

// ===== Platform Audit Reader ==================================================
const asAuditReader = createPersonaTest(platformRoleEmail('PLATFORM_AUDIT_READER'));

asAuditReader.describe('Authorization page — Platform Audit Reader', () => {
  asAuditReader.beforeEach(async () => void (await seedPlatformRoleUsers()));

  asAuditReader('is read-only: the notice is shown and nothing can be added', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/authorization`);
    await expect(roleTabs(page).first()).toHaveText('Platform Roles Admin', { timeout: 20_000 });
    await expect(
      page.getByText("You can view this role's holders but not add or remove them.")
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add members' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
  });

  asAuditReader('is offered all 14 roles', async ({ page }) => {
    // KNOWN CLIENT DEFECT (027): only the 10 Platform tabs are offered. The
    // requirements give Audit Reader the holder lists of ALL 14 roles and the
    // server serves them (the API suite proves it), but the client decides which
    // tabs to show from FEATURE_ROLE_HOLDERS_READ, which Audit Reader does not
    // hold. Expected to fail until fixed — then it turns RED: delete this line.
    asAuditReader.fail(true, 'client-web 027: Audit Reader is not offered the 4 Feature role tabs');
    await page.goto(`${baseUrl}/admin/authorization`);
    await expect(roleTabs(page).first()).toHaveText('Platform Roles Admin', { timeout: 20_000 });
    await expect(roleTabs(page)).toHaveText([...PLATFORM_TABS, ...FEATURE_TABS], { timeout: 5_000 });
  });

  asAuditReader('sees the holder of a role: the single-role Platform Support user is listed', async ({ page }) => {
    await openRole(page, 'PLATFORM_SUPPORT', 'Platform Support');
    await expect(page.getByRole('listitem').filter({ hasText: 'platform support' })).toBeVisible({
      timeout: 20_000,
    });
  });

  asAuditReader('is offered no Remove anywhere on the page', async ({ page }) => {
    await page.goto(`${baseUrl}/admin/authorization`);
    await expect(page.getByRole('heading', { name: 'Current members' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Remove', exact: true })).toHaveCount(0);
  });
});
