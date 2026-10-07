import { expect, Locator, Page } from '@playwright/test';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { OrganizationWithSpaceModel } from '@alkemio/tests-lib/scenario/models/OrganizationWithSpaceModel';

/**
 * Shared fixtures and locators for the organization Membership tab walks
 * (Organization → Settings → Membership): the organization's Space and
 * Subspace membership cards, and leaving a Space on the organization's behalf.
 *
 * The server-api request-params helpers live in another workspace package that
 * `client-web` cannot import, so the generated SDK client is used directly here,
 * mirroring them one-for-one.
 */

export const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';

/** English copy the walks assert on (namespace `crd-contributorSettings`). */
export const COPY = {
  tab: 'Membership',
  tabBefore: 'Associates',
  tabAfter: 'Invitations',
  searchPlaceholder: 'Search memberships...',
  summary: (shown: number, total: number) =>
    `Showing ${shown} of ${total} memberships`,
  empty: 'This organisation is not a member of any Space yet.',
  filteredEmptyTitle: 'No memberships found',
  clearFilters: 'Clear Filters',
  filterAll: 'All',
  filterSpaces: 'Spaces',
  filterSubspaces: 'Subspaces',
  roleLead: 'Lead',
  roleMember: 'Member',
  menuTrigger: 'More actions',
  dialogTitle: 'Leave this membership?',
  dialogConfirm: 'Leave',
  dialogCancel: 'Cancel',
  success: 'Membership left',
  error: "Couldn't leave — try again",
} as const;

export type MembershipType = 'Space' | 'Subspace';

export const membershipTabUrl = (base: string, orgNameId: string) =>
  `${base}/organization/${orgNameId}/settings/membership`;

// ---------------------------------------------------------------------------
// API fixtures
// ---------------------------------------------------------------------------

type SpaceRole = RoleName.Member | RoleName.Lead;

/** Organization ids holding `role` on a Space role set. */
export const organizationsInRole = async (
  roleSetId: string,
  role: SpaceRole
): Promise<string[]> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetMembersList(
      { roleSetId },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
  const roleSet = res.data?.lookup.roleSet;
  const orgs =
    role === RoleName.Lead
      ? roleSet?.leadOrganizations
      : roleSet?.memberOrganizations;
  if (!orgs) {
    throw new Error(
      `Unable to read ${role} organizations of role set ${roleSetId}: ${JSON.stringify(res.error)}`
    );
  }
  return orgs.map(org => org.id);
};

export const orgIsMemberOf = async (roleSetId: string, orgId: string) =>
  (await organizationsInRole(roleSetId, RoleName.Member)).includes(orgId);

export const orgIsLeadOf = async (roleSetId: string, orgId: string) =>
  (await organizationsInRole(roleSetId, RoleName.Lead)).includes(orgId);

const changeOrgRole = async (
  action: 'assign' | 'remove',
  organizationID: string,
  roleSetID: string,
  role: SpaceRole
) => {
  const graphqlClient = getGraphqlClient();
  const roleData = { actorID: organizationID, roleSetID, role };
  const res =
    action === 'assign'
      ? await graphqlErrorWrapper(
          authToken =>
            graphqlClient.AssignRoleToOrganization(
              { roleData },
              { authorization: `Bearer ${authToken}` }
            ),
          TestUser.GLOBAL_ADMIN
        )
      : await graphqlErrorWrapper(
          authToken =>
            graphqlClient.RemoveRoleFromOrganization(
              { roleData },
              { authorization: `Bearer ${authToken}` }
            ),
          TestUser.GLOBAL_ADMIN
        );
  if (res.error) {
    throw new Error(
      `${action} ${role} of organization ${organizationID} on ${roleSetID} failed: ${JSON.stringify(res.error)}`
    );
  }
};

/** Grants `role` unless the organization already holds it. */
export const ensureOrgRole = async (
  organizationID: string,
  roleSetID: string,
  role: SpaceRole
) => {
  if ((await organizationsInRole(roleSetID, role)).includes(organizationID)) {
    return;
  }
  await changeOrgRole('assign', organizationID, roleSetID, role);
};

/** Revokes `role` if the organization holds it, as GLOBAL_ADMIN. */
export const removeOrgRoleIfHeld = async (
  organizationID: string,
  roleSetID: string,
  role: SpaceRole
) => {
  if (!(await organizationsInRole(roleSetID, role)).includes(organizationID)) {
    return;
  }
  await changeOrgRole('remove', organizationID, roleSetID, role);
};

/**
 * Makes the scenario organization a plain MEMBER of the Space and its
 * Subspace (and of the sub-subspace when asked), parent first because a
 * Subspace role requires the parent role.
 */
export const seedOrgMemberships = async (
  scenario: OrganizationWithSpaceModel,
  { includeSubsubspace = false } = {}
) => {
  const orgId = scenario.organization.id;
  await ensureOrgRole(
    orgId,
    scenario.space.community.roleSetId,
    RoleName.Member
  );
  await ensureOrgRole(
    orgId,
    scenario.subspace.community.roleSetId,
    RoleName.Member
  );
  if (includeSubsubspace) {
    await ensureOrgRole(
      orgId,
      scenario.subsubspace.community.roleSetId,
      RoleName.Member
    );
  }
};

/**
 * The hosting organization of a Space is made MEMBER and LEAD of it when the
 * Space is created. The walks start from a plain-Member organization, so the
 * Lead granted at creation is removed first.
 */
export const clearHostLead = async (scenario: OrganizationWithSpaceModel) =>
  removeOrgRoleIfHeld(
    scenario.organization.id,
    scenario.space.community.roleSetId,
    RoleName.Lead
  );

/**
 * Strips every Space role the scenario organization still holds; removing
 * MEMBER on the L0 role set also ends its Subspace roles.
 */
export const removeAllOrgSpaceRoles = async (
  scenario: OrganizationWithSpaceModel
) => {
  const orgId = scenario.organization.id;
  const spaceRoleSetId = scenario.space.community.roleSetId;
  await removeOrgRoleIfHeld(orgId, spaceRoleSetId, RoleName.Lead);
  await removeOrgRoleIfHeld(orgId, spaceRoleSetId, RoleName.Member);
};

/** Grants or revokes a user's role on an organization's own role set. */
export const changeUserOrgRole = async (
  action: 'assign' | 'remove',
  userID: string,
  organizationRoleSetId: string,
  role: RoleName
) => {
  const graphqlClient = getGraphqlClient();
  const roleData = { actorID: userID, roleSetID: organizationRoleSetId, role };
  const res =
    action === 'assign'
      ? await graphqlErrorWrapper(
          authToken =>
            graphqlClient.assignRoleToUser(
              { roleData },
              { authorization: `Bearer ${authToken}` }
            ),
          TestUser.GLOBAL_ADMIN
        )
      : await graphqlErrorWrapper(
          authToken =>
            graphqlClient.removeRoleFromUser(
              { roleData },
              { authorization: `Bearer ${authToken}` }
            ),
          TestUser.GLOBAL_ADMIN
        );
  if (res.error) {
    throw new Error(
      `${action} ${role} for user ${userID} on ${organizationRoleSetId} failed: ${JSON.stringify(res.error)}`
    );
  }
};

// ---------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------

/** Every membership card on the tab (a card carrying the per-card menu). */
export const membershipCards = (page: Page): Locator =>
  page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('button', { name: COPY.menuTrigger }) });

/** The card whose title is exactly `name`. */
export const membershipCard = (page: Page, name: string): Locator =>
  membershipCards(page).filter({
    has: page.getByText(name, { exact: true }),
  });

export const openCardMenu = async (card: Locator) => {
  await card.getByRole('button', { name: COPY.menuTrigger }).click();
};

export const viewMenuItem = (page: Page, type: MembershipType): Locator =>
  page.getByRole('menuitem', { name: `View ${type}`, exact: true });

export const leaveMenuItem = (page: Page, type: MembershipType): Locator =>
  page.getByRole('menuitem', { name: `Leave ${type}`, exact: true });

export const confirmDialog = (page: Page): Locator =>
  page.getByRole('alertdialog');

export const confirmButton = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: COPY.dialogConfirm, exact: true });

export const cancelButton = (dialog: Locator): Locator =>
  dialog.getByRole('button', { name: COPY.dialogCancel, exact: true });

export const successToast = (page: Page): Locator =>
  page.getByText(COPY.success, { exact: true });

export const errorToast = (page: Page): Locator =>
  page.getByText(COPY.error, { exact: true });

export const summaryLine = (page: Page, shown: number, total: number) =>
  page.getByText(COPY.summary(shown, total), { exact: true });

/**
 * Opens the organization's Membership tab and waits until the grid has
 * resolved. Retries the navigation because a role granted moments earlier can
 * still be invisible to the settings access guard.
 */
export const gotoMembershipTab = async (
  page: Page,
  orgNameId: string,
  ready: (page: Page) => Promise<void>
) => {
  await expect(async () => {
    await page.goto(membershipTabUrl(baseUrl, orgNameId));
    await expect(page).toHaveURL(/\/settings\/membership/, { timeout: 5_000 });
    await ready(page);
  }).toPass({ timeout: 45_000 });
};
