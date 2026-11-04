import {
  assignRoleToUser as libAssignRoleToUser,
  removeRoleFromUser as libRemoveRoleFromUser,
  ensureSpaceMembers,
  ensureSpaceOrganizationMember,
  getGraphqlClient,
  TestUser,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getRoleName = async (
  organizationID: string,

  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetRolesOrganization(
      {
        organizationID,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/**
 * workspace#027 Slice B: delegates to the lib helper, which falls back to the
 * user JOINING the space when the harness admin is refused
 * `ROLESET_ENTRY_ROLE_ASSIGN` (nobody holds it on an L0 space any more).
 */
export const assignRoleToUser = (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => libAssignRoleToUser(userID, roleSetID, role, userRole);

const ENTRY_ASSIGN_GAP = [
  'roleset-entry-role-assign',
  'not a member of parent roleSet',
];

const assignRoleToUserExtendedDataDirect = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToUserExtendedData(
      {
        roleData: {
          actorID: userID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignRoleToUserExtendedData = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const result = await assignRoleToUserExtendedDataDirect(
    userID,
    roleSetID,
    role,
    userRole
  );
  const message = String(result?.error?.errors?.[0]?.message ?? '');
  if (
    userRole !== TestUser.GLOBAL_ADMIN ||
    !result?.error ||
    !ENTRY_ASSIGN_GAP.some(gap => message.includes(gap))
  ) {
    return result;
  }
  // Slice B: join as the user, then re-issue the call — a user already in the
  // role is answered with their credentials, which is what callers read.
  await ensureSpaceMembers(roleSetID, [userID]);
  return assignRoleToUserExtendedDataDirect(userID, roleSetID, role, userRole);
};

export const removeRoleFromUser = (
  userID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => libRemoveRoleFromUser(userID, roleSetID, role, userRole);

export const removeRoleFromUserExtendedData = async (
  userID: string,
  roleSetID: string,
  role: RoleName = RoleName.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRoleFromUserExtendedData(
      {
        roleData: {
          actorID: userID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/** workspace#027 Slice B: delegates to the lib helper (invitation fallback for a new organisation). */
const assignRoleToOrganizationRaw = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName,
  userRole: TestUser
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToOrganization(
      {
        roleData: {
          actorID: organizationID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Same result shape as before (`{ data, error }`, never throws) so refusal
 * assertions keep reading `error.errors[0].message`.
 *
 * workspace#027 Slice B removed `ROLESET_ENTRY_ROLE_ASSIGN_ORGANIZATION`
 * from every actor, so the harness admin can no longer seed an organization
 * into a Space directly. For GLOBAL_ADMIN only, that one refusal falls back to
 * the product path (invite the organization, accept as its admin) via the lib;
 * every other actor's refusal is returned as-is — those are the assertions.
 */
export const assignRoleToOrganization = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName = RoleName.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const result = await assignRoleToOrganizationRaw(
    organizationID,
    roleSetID,
    role,
    userRole
  );
  const message = String(result?.error?.errors?.[0]?.message ?? '');
  if (
    !result?.error ||
    userRole !== TestUser.GLOBAL_ADMIN ||
    !message.includes('roleset-entry-role-assign-organization')
  ) {
    return result;
  }
  await ensureSpaceOrganizationMember(roleSetID, organizationID);
  if (role === RoleName.Member) {
    return {
      data: { assignRoleToOrganization: { id: organizationID } },
      error: undefined,
    } as unknown as typeof result;
  }
  return assignRoleToOrganizationRaw(organizationID, roleSetID, role, userRole);
};

export const assignRoleToOrganization4 = (
  roleSetID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => assignRoleToOrganization(organizationID, roleSetID, RoleName.Member, userRole);

export const removeRoleFromOrganization = async (
  organizationID: string,
  roleSetID: string,
  role: RoleName = RoleName.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRoleFromOrganization(
      {
        roleData: {
          actorID: organizationID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/** Generic actor removal: the server resolves the actor type from `actorID`. */
export const removeRole = async (
  actorID: string,
  roleSetID: string,
  role: RoleName = RoleName.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRole(
      {
        roleData: {
          actorID,
          roleSetID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const joinRoleSet = async (
  roleSetID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.joinRoleSet(
      {
        joinData: {
          roleSetID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignOrganizationAsCommunityLead = async (
  roleSetID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToOrganization(
      {
        roleData: {
          roleSetID,
          actorID: organizationID,
          role: RoleName.Lead,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
