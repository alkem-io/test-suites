import { expect, type Locator, type Page } from '@playwright/test';
import {
  assignRoleToUser,
  deleteOrganization,
  deleteUser,
  deleteVirtualContributor,
  getOrganizationIdByNameId,
  getUserData,
  readRoleSetUsersInRole,
  registerVerifiedUser,
  RoleName,
  TestScenarioFactory,
  TestUser,
  UniqueIDGenerator,
  type TestScenarioConfig,
} from '@alkemio/tests-lib';
import type { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';
import { must } from '../helpers/lib-actor.helper';
import {
  baseUrl,
  expectMutationAnswered,
  teardownScenario,
} from '../helpers/space-access.helper';

/**
 * Shared set-up, teardown and locators for the contributors CRUD walks
 * (alkem-io/alkemio#1699). Every walk owns its data: a scenario
 * organisation (the `organization.admin` persona is made its Associate +
 * Admin by the factory), disposable users for anything that is edited, and
 * VCs seeded over the API (creating one in the UI is paused,
 * alkem-io/client-web#10398). The harness personas are only ever read.
 */

export { baseUrl };

/** One id per file run; every display name and nameID carries it. */
export const runId = (): string => UniqueIDGenerator.getID();

// ---------------------------------------------------------------- seeding

/** An organisation-only scenario (no Space): org + licence plan + org admin persona. */
export const seedOrganizationScenario = async (
  name: string,
  config: Partial<TestScenarioConfig> = {}
): Promise<OrganizationWithSpaceModel> => {
  const scenario = await TestScenarioFactory.createBaseScenarioOrganization({
    name,
    organization: { verification: { setVerified: true } },
    ...config,
  });
  expect(scenario.scenarioSetupSucceeded, `scenario '${name}' set up`).toBe(
    true
  );
  return scenario;
};

export { teardownScenario };

export type DisposableUser = {
  id: string;
  email: string;
  nameId: string;
  displayName: string;
};

/**
 * A verified Kratos identity + Alkemio user that can sign in with the
 * harness password. Use it for every walk that edits a user: the shared
 * personas are never mutated.
 */
export const registerDisposableUser = async (
  label: string
): Promise<DisposableUser> => {
  const token = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const email = `crud-${token}@alkem.io`;
  const id = await registerVerifiedUser(email, 'Crud', token);
  const user = must(await getUserData(id), `getUserData(${email})`).user;
  return {
    id,
    email,
    nameId: user.nameID,
    displayName: user.profile?.displayName ?? '',
  };
};

/** Deletes a disposable user together with its Kratos identity; a no-op for undefined. */
export const deleteDisposableUser = async (
  user: DisposableUser | undefined
): Promise<void> => {
  if (!user) return;
  must(
    await deleteUser(user.id, TestUser.GLOBAL_ADMIN, true),
    `deleteUser(${user.email})`
  );
};

/** Makes a user an Associate of an organisation (as the platform admin). */
export const associateUser = async (
  userId: string,
  organizationRoleSetId: string
): Promise<void> => {
  must(
    await assignRoleToUser(userId, organizationRoleSetId, RoleName.Associate),
    `assign ASSOCIATE to ${userId}`
  );
};

/** Ids of the users holding `role` on an organisation's role set. */
export const usersInOrgRole = async (
  organizationRoleSetId: string,
  role: RoleName
): Promise<string[]> =>
  (
    must(
      await readRoleSetUsersInRole(organizationRoleSetId, role),
      `usersInRole(${role})`
    ).lookup.roleSet?.usersInRole ?? []
  ).map(u => u.id);

/** The id behind an organisation nameID, or null once it no longer exists. */
export const organizationIdByNameId = async (
  nameId: string
): Promise<string | null> => {
  const result = await getOrganizationIdByNameId(nameId);
  if (result.error?.errors?.[0]?.code === 'ENTITY_NOT_FOUND') return null;
  return (
    must(result, `lookupByName(${nameId})`).lookupByName.organization ?? null
  );
};

/** Deletes an organisation a walk created in the UI, if it still exists. */
export const deleteOrganizationIfPresent = async (
  nameId: string | undefined
) => {
  if (!nameId) return;
  const id = await organizationIdByNameId(nameId);
  if (id) must(await deleteOrganization(id), `deleteOrganization(${nameId})`);
};

/** Deletes a VC a walk seeded, unless the walk already deleted it. */
export const deleteVcIfPresent = async (id: string | undefined) => {
  if (!id) return;
  const result = await deleteVirtualContributor(id);
  const code = result.error?.errors?.[0]?.code;
  if (result.error && code !== 'ENTITY_NOT_FOUND') {
    throw new Error(
      `deleteVirtualContributor(${id}): ${JSON.stringify(result.error.errors)}`
    );
  }
};

// --------------------------------------------------------------- locators

/** A settings tab in the user / organisation / VC settings shell. */
export const settingsTab = (page: Page, name: string): Locator =>
  page
    .getByRole('main')
    .getByRole('tablist')
    .getByRole('tab', { name, exact: true });

/** The exact, ordered tab strip of a settings shell. */
export const expectSettingsTabs = async (page: Page, names: string[]) => {
  await expect(
    page.getByRole('main').getByRole('tablist').getByRole('tab')
  ).toHaveText(names);
};

/**
 * An Account-tab resource section by its full heading, e.g.
 * "Virtual Contributors 0/3" or "Custom Homepages Not available". The
 * heading text carries the used/limit capacity, so an exact name pins it.
 */
export const accountSection = (page: Page, heading: string): Locator =>
  page.getByRole('heading', { level: 3, name: heading, exact: true });

/** The tab-wide "Unsaved changes" bar every CRD settings tab commits through. */
export const unsavedChangesBar = (page: Page): Locator =>
  page.getByRole('region', { name: 'Unsaved changes' });

/** Saves through the bar and waits for the toast and the bar to go away. */
export const saveChanges = async (page: Page) => {
  const bar = unsavedChangesBar(page);
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByText('Changes saved', { exact: true })).toBeVisible();
  await expect(bar).toBeHidden();
};

/** The notice client-web#10398 puts wherever a VC used to be created, added or mentioned. */
export const VC_PAUSED_TITLE =
  'Virtual Contributors are getting an upgrade! 🚀';
export const vcPausedNotice = (page: Page): Locator =>
  page.getByRole('region', { name: VC_PAUSED_TITLE, exact: true });

export const orgSettingsUrl = (nameId: string, tab: string) =>
  `${baseUrl}/organization/${nameId}/settings/${tab}`;
export const userSettingsUrl = (nameId: string, tab: string) =>
  `${baseUrl}/user/${nameId}/settings/${tab}`;

/** The row for one organisation in Administration → Organisations, found by its display name. */
export const adminOrganizationRow = async (
  page: Page,
  displayName: string
): Promise<Locator> => {
  await page.goto(`${baseUrl}/admin/organizations`);
  // The list filters server-side on displayName.
  await page.getByRole('searchbox', { name: 'Search…' }).fill(displayName);
  return page.getByRole('row').filter({
    has: page.getByRole('link', { name: displayName, exact: true }),
  });
};

/** Deletes an organisation from Administration → Organisations and waits for its row to go. */
export const deleteOrganizationInAdmin = async (
  page: Page,
  displayName: string
) => {
  const row = await adminOrganizationRow(page, displayName);
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  const confirm = page.getByRole('alertdialog', {
    name: `Delete ${displayName}?`,
  });
  // The row leaves the list before the delete round trip has finished: wait
  // for the mutation's answer, or a read-back right after races the delete.
  const deleted = expectMutationAnswered(page, 'deleteOrganization');
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await deleted();
  await expect(confirm).toBeHidden();
  await expect(row).toHaveCount(0);
};

/** The Account tab's resource-section headings (the collapsible triggers), in page order. */
export const accountSectionHeadings = (page: Page): Locator =>
  page
    .getByRole('main')
    .getByRole('heading', { level: 3 })
    .filter({ has: page.getByRole('button') });

/**
 * Exact count, order and accessible names of a locator's matches. The
 * Account-tab headings render their capacity badge as a separate node, so
 * textContent reads "Hosted Spaces0/0" while the accessible name — what a
 * user hears and what `accountSection` matches — is "Hosted Spaces 0/0".
 */
export const expectAccessibleNames = async (
  locator: Locator,
  names: string[]
) => {
  await expect(locator).toHaveCount(names.length);
  for (const [index, name] of names.entries()) {
    await expect(locator.nth(index)).toHaveAccessibleName(name);
  }
};

/** A literal string as a RegExp source (display names may carry `.`, `(`, `+` …). */
export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
