import { expect, Locator, Page } from '@playwright/test';
import {
  getGraphqlClient,
  TestUser,
  TestUserManager,
} from '@alkemio/tests-lib';
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

/** Revokes `role` if the organization holds it, as GLOBAL_ADMIN. */
export const removeOrgRoleIfHeld = async (
  organizationID: string,
  roleSetID: string,
  role: SpaceRole
) => {
  if (!(await organizationsInRole(roleSetID, role)).includes(organizationID)) {
    return;
  }
  const graphqlClient = getGraphqlClient();
  const res = await graphqlErrorWrapper(
    authToken =>
      graphqlClient.RemoveRoleFromOrganization(
        { roleData: { actorID: organizationID, roleSetID, role } },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (res.error) {
    throw new Error(
      `remove ${role} of organization ${organizationID} on ${roleSetID} failed: ${JSON.stringify(res.error)}`
    );
  }
};

/**
 * Invites `actorID` to the entry role of a Space role set (as GLOBAL_ADMIN)
 * and accepts it as `accepter`. A NEW organization can only enter a Space this
 * way: `roleset-entry-role-assign-organization` is held by nobody, so
 * `assignRoleToOrganization` cannot add one. A platform admin may accept on an
 * organization's behalf; accepting a Subspace invitation also seats the actor
 * in the parent chain (`invitedToParent`).
 */
export const inviteAndAccept = async (
  actorID: string,
  roleSetId: string,
  accepter: TestUser,
  extraRoles: RoleName[] = []
) => {
  const graphqlClient = getGraphqlClient();
  const invited = await graphqlErrorWrapper(
    authToken =>
      graphqlClient.InviteForEntryRoleOnRoleSet(
        {
          roleSetId,
          invitedActorIds: [actorID],
          invitedUserEmails: [],
          welcomeMessage: 'organization-space-membership',
          extraRoles,
        },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  const invitationID =
    invited.data?.inviteForEntryRoleOnRoleSet[0]?.invitation?.id;
  if (!invitationID) {
    throw new Error(
      `No invitation created for ${actorID} on ${roleSetId}: ${JSON.stringify(invited.error ?? invited.data)}`
    );
  }
  const accepted = await graphqlErrorWrapper(
    authToken =>
      graphqlClient.InvitationStateEvent(
        { input: { invitationID, eventName: 'ACCEPT' } },
        { authorization: `Bearer ${authToken}` }
      ),
    accepter
  );
  if (accepted.error) {
    throw new Error(
      `Accepting invitation ${invitationID} as ${accepter} failed: ${JSON.stringify(accepted.error)}`
    );
  }
};

/**
 * Makes the organization a MEMBER of each role set it is not already in,
 * parent first (pass the role sets in that order), through invite + accept.
 */
export const ensureOrgMemberOf = async (
  organizationID: string,
  roleSetIds: string[]
) => {
  for (const roleSetId of roleSetIds) {
    if (!(await orgIsMemberOf(roleSetId, organizationID))) {
      await inviteAndAccept(organizationID, roleSetId, TestUser.GLOBAL_ADMIN);
    }
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

/** Grants or revokes a user's role on a role set, as GLOBAL_ADMIN. */
export const changeUserRole = async (
  action: 'assign' | 'remove',
  userID: string,
  roleSetId: string,
  role: RoleName
) => {
  const graphqlClient = getGraphqlClient();
  const roleData = { actorID: userID, roleSetID: roleSetId, role };
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
      `${action} ${role} for user ${userID} on ${roleSetId} failed: ${JSON.stringify(res.error)}`
    );
  }
};

/**
 * The Membership tab lists only Spaces the VIEWER can read (Clarification
 * C-5), and a Subspace is readable by its members only, so the organization
 * admin persona is made a user-Member of the Space (invite + accept: nobody
 * may add a user to an L0 directly) and of the given Subspaces.
 */
export const makePersonaUserMember = async (
  spaceRoleSetId: string,
  subspaceRoleSetIds: string[]
) => {
  const persona = TestUserManager.users.organizationAdmin;
  await inviteAndAccept(
    persona.id,
    spaceRoleSetId,
    TestUser.ORGANIZATION_ADMIN
  );
  for (const roleSetId of subspaceRoleSetIds) {
    await changeUserRole('assign', persona.id, roleSetId, RoleName.Member);
  }
};

// ---------------------------------------------------------------------------
// Locators
// ---------------------------------------------------------------------------

/**
 * Every membership card on the tab: a leaf card carrying the per-card menu.
 * The outer "Space Memberships" container is a card too and is excluded.
 * The cards expose no role or test id (client-web `MembershipsSection.tsx`),
 * so the CRD `Card` primitive's `data-slot` is the hook.
 */
export const membershipCards = (page: Page): Locator =>
  page
    .locator('[data-slot="card"]')
    .filter({ hasNot: page.locator('[data-slot="card"]') })
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
