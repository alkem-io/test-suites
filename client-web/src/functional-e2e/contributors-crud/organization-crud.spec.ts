// spec: client-web/src/functional-e2e/contributors-crud/contributors-crud-test-plan.md
// Story: alkem-io/alkemio#1699 (QA P1: Contributors - CRUD Full), section "Organization".
//
// The platform admin creates and deletes an organisation in Administration;
// every later change is made by the organisation's admin (`organization.admin`)
// on the scenario organisation this file seeds. The oracle for each write is
// the reloaded tab AND the record read back over the API.

import { test, expect } from '@playwright/test';
import {
  readOrganization,
  RoleName,
  TestUserManager,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { grantCookieConsent } from '../helpers/cookies.helper';
import { must } from '../helpers/lib-actor.helper';
import {
  expectMutationAnswered,
  openPersonaPage,
  type PersonaPage,
} from '../helpers/space-access.helper';
import { openSettingsSection } from '../helpers/settings-section.helper';
import {
  accountSectionHeadings,
  adminOrganizationRow,
  associateUser,
  baseUrl,
  deleteDisposableUser,
  deleteOrganizationIfPresent,
  deleteOrganizationInAdmin,
  expectAccessibleNames,
  expectSettingsTabs,
  organizationIdByNameId,
  orgSettingsUrl,
  registerDisposableUser,
  runCleanup,
  runId,
  saveChanges,
  seedOrganizationScenario,
  teardownScenario,
  usersInOrgRole,
  type DisposableUser,
} from './contributors-crud.helpers';

const RUN = runId();

let scenario: OrganizationWithSpaceModel | undefined;
let leaving: DisposableUser | undefined;
let promoted: DisposableUser | undefined;
let orgAdmin: PersonaPage | undefined;

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120_000);
  scenario = await seedOrganizationScenario(`org-crud-${RUN}`);
  leaving = await registerDisposableUser(`leaving ${RUN}`);
  promoted = await registerDisposableUser(`promoted ${RUN}`);
  await associateUser(leaving.id, scenario.organization.roleSetId);
  await associateUser(promoted.id, scenario.organization.roleSetId);
  orgAdmin = await openPersonaPage(
    browser,
    TestUserManager.users.organizationAdmin.email
  );
});

// File level, so it also runs when a failure retires the worker mid-file.
test.afterAll(async () => {
  await runCleanup([
    ['close orgAdmin', () => orgAdmin?.close() ?? Promise.resolve()],
    ['delete leaving', () => deleteDisposableUser(leaving)],
    ['delete promoted', () => deleteDisposableUser(promoted)],
    ['teardown scenario', () => teardownScenario(scenario)],
  ]);
});

const org = () => scenario!.organization;

/** One associate's row on the Associates tab, by display name. */
const associateRow = (displayName: string) =>
  orgAdmin!.page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ has: orgAdmin!.page.getByText(displayName, { exact: true }) });

const openAssociateEditor = async (displayName: string) => {
  const page = orgAdmin!.page;
  await page.goto(orgSettingsUrl(org().nameId, 'associates'));
  await associateRow(displayName)
    .getByRole('button', { name: `Edit ${displayName}`, exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: `Edit ${displayName}`,
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('Contributors CRUD — Organization', () => {
  test('2.1 the platform admin creates an organisation in Administration, and deleting it there removes it', async ({
    browser,
  }) => {
    const name = `Crud Created ${RUN}`;
    const nameId = `crud-created-${RUN}`;
    const admin = await openPersonaPage(
      browser,
      TestUserManager.users.globalAdmin.email
    );
    try {
      const page = admin.page;
      await page.goto(`${baseUrl}/admin/organizations`);
      await page
        .getByRole('button', { name: 'New organisation', exact: true })
        .click();
      await expect(
        page.getByRole('heading', { level: 1, name: 'New organisation' })
      ).toBeVisible();
      await page
        .getByRole('textbox', { name: 'Alias (name ID)', exact: true })
        .fill(nameId);
      await page
        .getByRole('textbox', { name: 'Display name', exact: true })
        .fill(name);
      const created = expectMutationAnswered(page, 'createOrganization');
      await page
        .getByRole('button', { name: 'Create organisation', exact: true })
        .click();
      await created();

      const id = await organizationIdByNameId(nameId);
      expect(id, `organisation ${nameId} exists after create`).not.toBeNull();
      const stored = must(
        await readOrganization(id!),
        'created organisation'
      ).organization;
      expect([stored.nameID, stored.profile?.displayName]).toEqual([
        nameId,
        name,
      ]);
      await expect(await adminOrganizationRow(page, name)).toHaveCount(1);

      await deleteOrganizationInAdmin(page, name);
      await expect.poll(() => organizationIdByNameId(nameId)).toBeNull();
    } finally {
      await admin.close();
      await deleteOrganizationIfPresent(nameId);
    }
  });

  test('2.2 the organisation admin updates the profile; it survives a reload and is what anonymous and signed-in visitors see', async ({
    browser,
  }) => {
    const page = orgAdmin!.page;
    const newName = `Crud Org Renamed ${RUN}`;
    const newTagline = `Org tagline ${RUN}`;
    const newWebsite = `https://example.org/crud-${RUN}`;

    await page.goto(orgSettingsUrl(org().nameId, 'profile'));
    await expectSettingsTabs(page, [
      'Profile',
      'Account',
      'Associates',
      'Membership',
      'Invitations',
      'Settings',
    ]);
    await page
      .getByRole('textbox', { name: 'Display Name', exact: true })
      .fill(newName);
    await page
      .getByRole('textbox', { name: 'Tagline', exact: true })
      .fill(newTagline);
    await openSettingsSection(page, 'Contact & Legal');
    await page
      .getByRole('textbox', { name: 'Website', exact: true })
      .fill(newWebsite);
    await saveChanges(page);

    await page.reload();
    await expect(
      page.getByRole('textbox', { name: 'Display Name', exact: true })
    ).toHaveValue(newName);
    await expect(
      page.getByRole('textbox', { name: 'Tagline', exact: true })
    ).toHaveValue(newTagline);
    await openSettingsSection(page, 'Contact & Legal');
    await expect(
      page.getByRole('textbox', { name: 'Website', exact: true })
    ).toHaveValue(newWebsite);

    const stored = must(
      await readOrganization(org().id),
      'organisation after update'
    ).organization;
    expect([
      stored.profile?.displayName,
      stored.profile?.tagline,
      stored.website,
    ]).toEqual([newName, newTagline, newWebsite]);

    const anonymous = await browser.newContext({ locale: 'en-US' });
    const member = await openPersonaPage(
      browser,
      TestUserManager.users.spaceMember.email
    );
    try {
      await grantCookieConsent(anonymous);
      const anonymousPage = await anonymous.newPage();
      for (const viewer of [anonymousPage, member.page]) {
        await viewer.goto(`${baseUrl}/organization/${org().nameId}`);
        await expect(
          viewer.getByRole('heading', { level: 1, name: newName, exact: true })
        ).toBeVisible();
        await expect(
          viewer.getByRole('main').getByText(newTagline, { exact: true })
        ).toBeVisible();
        // Neither visitor administers the organisation.
        await expect(
          viewer.getByRole('link', { name: 'Open organisation settings' })
        ).toHaveCount(0);
      }
    } finally {
      await anonymous.close();
      await member.close();
    }
  });

  test('2.3 the Account tab shows each resource block with used / available counts from the licence plan', async () => {
    const page = orgAdmin!.page;
    await page.goto(orgSettingsUrl(org().nameId, 'account'));
    // ACCOUNT_LICENSE_PLUS (assigned by the factory): 3 spaces, 3 VCs, 3
    // packs, 1 hub. Custom homepages need CREATE_INNOVATION_HUB, held only by
    // a platform licence manager, so the organisation admin reads "Not available".
    await expectAccessibleNames(accountSectionHeadings(page), [
      'Hosted Spaces 0/3',
      'Virtual Contributors 0/3',
      'Template Packs 0/3',
      'Custom Homepages Not available',
    ]);
  });

  test('2.4 the organisation admin removes an associate on the Associates tab, and the role is gone', async () => {
    const page = orgAdmin!.page;
    const name = leaving!.displayName;
    expect(await usersInOrgRole(org().roleSetId, RoleName.Associate)).toContain(
      leaving!.id
    );

    const dialog = await openAssociateEditor(name);
    await expect(
      dialog.getByRole('switch', { name: 'Associate', exact: true })
    ).toBeChecked();
    await dialog
      .getByRole('button', { name: 'Remove from organisation', exact: true })
      .click();
    const confirm = page.getByRole('alertdialog', {
      name: `Remove ${name} from the organisation?`,
    });
    await confirm
      .getByRole('button', { name: 'Remove from organisation', exact: true })
      .click();
    await expect(confirm).toBeHidden();
    await expect(
      page.getByText(`${name} removed from the organisation`, { exact: true })
    ).toBeVisible();

    await expect(associateRow(name)).toHaveCount(0);
    // Positive control: the list still renders the organisation's own admin.
    await expect(
      associateRow(TestUserManager.users.organizationAdmin.displayName)
    ).toHaveCount(1);
    await expect
      .poll(() => usersInOrgRole(org().roleSetId, RoleName.Associate))
      .not.toContain(leaving!.id);
  });

  test('2.5 the organisation admin grants and then revokes Admin for an associate on the Associates tab (the retired Authorization tab)', async () => {
    const name = promoted!.displayName;
    expect(await usersInOrgRole(org().roleSetId, RoleName.Admin)).not.toContain(
      promoted!.id
    );

    let dialog = await openAssociateEditor(name);
    await dialog.getByRole('switch', { name: 'Admin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
      associateRow(name).getByText('Admin', { exact: true })
    ).toBeVisible();
    await expect
      .poll(() => usersInOrgRole(org().roleSetId, RoleName.Admin))
      .toContain(promoted!.id);

    dialog = await openAssociateEditor(name);
    await expect(
      dialog.getByRole('switch', { name: 'Admin', exact: true })
    ).toBeChecked();
    await dialog.getByRole('switch', { name: 'Admin', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(
      associateRow(name).getByText('Admin', { exact: true })
    ).toHaveCount(0);
    await expect(
      associateRow(name).getByText('Associate', { exact: true })
    ).toBeVisible();
    await expect
      .poll(() => usersInOrgRole(org().roleSetId, RoleName.Admin))
      .not.toContain(promoted!.id);
    expect(await usersInOrgRole(org().roleSetId, RoleName.Associate)).toContain(
      promoted!.id
    );
  });

  test('2.6 the organisation admin turns off applications on the Settings tab; it is saved and survives a reload', async () => {
    const page = orgAdmin!.page;
    const label = 'Allow users to apply to associate';
    await page.goto(orgSettingsUrl(org().nameId, 'settings'));
    const toggle = page.getByRole('switch', { name: label, exact: true });
    await expect(toggle).toBeChecked();
    const saved = expectMutationAnswered(page, 'updateOrganizationSettings');
    await toggle.click();
    await saved();
    await expect(toggle).not.toBeChecked();

    const settings = must(
      await readOrganization(org().id),
      'organisation settings'
    ).organization.settings;
    expect(settings.membership.allowApplications).toBe(false);
    // The other switches on the card were not touched.
    expect(settings.membership.allowSpaceInvitations).toBe(true);
    await page.reload();
    await expect(
      page.getByRole('switch', { name: label, exact: true })
    ).not.toBeChecked();
  });
});
