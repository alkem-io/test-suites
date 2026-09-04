import {
  createOrganization,
  getGraphqlClient,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Local GraphQL helpers for the organization-space-invitations acceptance
 * walks, User Story 1. `@alkemio/tests-lib`'s `baseFunctions.ts` has `createOrganization` but
 * not the organization-settings / roleset / invitation mutations this walk
 * needs (those live as local `.request.params.ts` files inside the
 * `server-api` package, which `client-web` cannot import across the
 * workspace-package boundary) — so the same generated SDK client
 * (`getGraphqlClient()`) is used directly here, mirroring the server-api
 * request-params pattern one-for-one.
 */

/** One org fixture, with just what the walk needs to drive the UI and assert outcomes. */
export type OrgFixture = {
  id: string;
  nameID: string;
  displayName: string;
  roleSetId: string;
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24);

/** Creates a fresh organization for this walk, returning its id/roleSetId. */
export const createTestOrganization = async (
  label: string,
  runSuffix: string
): Promise<OrgFixture> => {
  const displayName = `${label} ${runSuffix}`;
  const nameID = slugify(`${label}${runSuffix}`);
  const res = await createOrganization(displayName, nameID);
  if (!res.data?.createOrganization) {
    throw new Error(
      `Failed to create organization "${label}": ${JSON.stringify(res.error)}`
    );
  }
  return {
    id: res.data.createOrganization.id,
    nameID: res.data.createOrganization.nameID,
    displayName,
    roleSetId: res.data.createOrganization.roleSet.id,
  };
};

/** Grants `role` to `org` directly on `roleSetId` (bypasses invite/accept — used to seed
 * pre-existing Member/Lead state, exactly as the direct "add organisation" action would). */
export const assignOrgRole = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToOrganization(
      { roleData: { actorID: organizationID, roleSetID, role } },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `assignOrgRole(${role}) failed for ${organizationID}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** Toggles the "Allow Spaces to invite this organisation" setting (US5's own switch, used
 * here only as an AS4 fixture — off before the space admin ever invites it). */
export const setAllowSpaceInvitations = async (
  organizationID: string,
  allowSpaceInvitations: boolean,
  allowUsersMatchingDomainToJoin = false,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateOrganizationSettings(
      {
        settingsData: {
          organizationID,
          settings: {
            membership: { allowSpaceInvitations, allowUsersMatchingDomainToJoin },
          },
        },
      },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `setAllowSpaceInvitations failed for ${organizationID}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** Pre-seeds a pending invitation via the API — used only to put an organization into the
 * "already invited" state ahead of the UI's own AS5 attempt (the UI walk itself drives every
 * invite it is actually asserting on). */
export const inviteOrganizationViaApi = async (
  roleSetId: string,
  organizationId: string,
  welcomeMessage: string,
  userRole: TestUser = TestUser.SPACE_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.InviteForEntryRoleOnRoleSet(
      {
        roleSetId,
        invitedActorIds: [organizationId],
        invitedUserEmails: [],
        welcomeMessage,
        extraRoles: [],
      },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `inviteOrganizationViaApi failed for ${organizationId}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** Grants `actorID` ADMIN on an organization's OWN roleset (org-admin standing, not
 * Space membership) — used for the AS6 org-admin-side "gone from their pending invitations"
 * check via `me.communityInvitations`. */
export const assignOrganizationAdmin = async (
  organizationRoleSetId: string,
  actorID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignRoleToUser(
      { roleData: { actorID, roleSetID: organizationRoleSetId, role: RoleName.Admin } },
      { authorization: `Bearer ${authToken}` }
    );
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error) {
    throw new Error(
      `assignOrganizationAdmin failed for ${actorID} on ${organizationRoleSetId}: ${JSON.stringify(res.error)}`
    );
  }
  return res;
};

/** The ids of every pending invitation visible to `userRole` via `me.communityInvitations` —
 * the org-admin-side view of a Space's organization invitations (AS6). */
export const getMyCommunityInvitationIds = async (
  userRole: TestUser
): Promise<string[]> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MeQuery({}, { authorization: `Bearer ${authToken}` });
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error || !res.data) {
    throw new Error(`getMyCommunityInvitationIds failed: ${JSON.stringify(res.error)}`);
  }
  return res.data.me.communityInvitations.map(inv => inv.invitation.id);
};

/** The ids of every pending organization invitation still open on the Space (AS3/AS6 cleanup
 * and assertions on the Space side, via the same query the server exposes for it). */
export const getSpaceInvitationIds = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<string[]> => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.getSpaceInvitations({ spaceId }, { authorization: `Bearer ${authToken}` });
  const res = await graphqlErrorWrapper(callback, userRole);
  if (res.error || !res.data?.lookup.space) {
    throw new Error(`getSpaceInvitationIds failed: ${JSON.stringify(res.error)}`);
  }
  return res.data.lookup.space.community.roleSet.invitations.map(inv => inv.id);
};

export const runSuffix = UniqueIDGenerator.getID();
export { TestUserManager, TestUser };
