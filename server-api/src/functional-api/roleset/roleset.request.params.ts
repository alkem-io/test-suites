import {
  getGraphqlClient,
  harnessPostgresConfigured,
  queryHarnessDb,
  TestUser,
} from '@alkemio/tests-lib';
import {
  ActorType,
  InviteForEntryRoleOnRoleSetMutation,
  RoleName,
  RoleSetInvitationResultNotice,
  RoleSetInvitationResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  graphqlErrorWrapper,
  GraphqlReturnWithError,
} from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getUserCommunityPrivilege = async (
  roleSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetUserPrivileges(
      {
        roleSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getRoleSetAvailableUsers = async (
  roleSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetAvailableMembers(
      {
        roleSetId,
        first: 40,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getRoleSetMembersList = async (
  roleSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetMembersList(
      {
        roleSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getCommunityApplicationsInvitations = async (
  roleSetId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CommunityApplicationsInvitations(
      {
        roleSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getRoleSetUsersInMemberRole = async (
  roleSetId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const roleSetMembers = await getRoleSetMembersList(roleSetId);

  const res = roleSetMembers?.data?.lookup?.roleSet?.memberUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

export const getRoleSetUsersInLeadRole = async (
  spaceCommunityId: string
): Promise<Array<{ id: string; nameId: string }>> => {
  const roleSetMembers = await getRoleSetMembersList(spaceCommunityId);

  const res = roleSetMembers?.data?.lookup?.roleSet?.leadUsers || [];
  const formattedUsers = res.map(user => ({
    id: user.id,
    nameId: user.nameID,
  }));

  return formattedUsers;
};

// The pending applications/invitations of an organization role set are
// confidentiality-gated to GRANT, so the caller matters as much as the
// roleSetId.
export const getOrganizationRoleSetPending = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetOrganizationRoleSetPending(
      {
        roleSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// One pending field per read. The three lists are non-null and gated
// independently (applications on GRANT; invitations and platformInvitations
// on ROLESET_ENTRY_ROLE_INVITE), so `getOrganizationRoleSetPending` above —
// which selects all three — nulls the whole role set on the first refusal.
// A persona that may see one list but not another (global support, a
// subspace admin allowed to invite) can only be proven through these.
export const getRoleSetPendingApplications = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetPendingApplications(
      { roleSetId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getRoleSetPendingInvitations = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetPendingInvitations(
      { roleSetId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getRoleSetPendingPlatformInvitations = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RoleSetPendingPlatformInvitations(
      { roleSetId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

// One platform invitation by id — the only read that still answers for a
// consumed row and the one that proves an erased row is gone (the role set's
// own list is open-only).
export const lookupPlatformInvitation = async (
  invitationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.LookupPlatformInvitation(
      { invitationId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const lookupPlatformInvitationCreatedBy = async (
  invitationId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.LookupPlatformInvitationCreatedBy(
      { invitationId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** True when the platform invitation no longer resolves: the lookup answers
 * entity-not-found, or it resolves to null. Any other error (an authorization
 * refusal on a row that survived without its policy, a transient failure) is
 * NOT proof the row is gone. */
export const isPlatformInvitationGone = (
  res:
    | {
        data?: { lookup?: { platformInvitation?: { id: string } | null } };
        error?: { errors: Array<Record<string, unknown>> };
      }
    | undefined
): boolean => {
  if (res?.error) {
    const first = res.error.errors?.[0] as
      | { extensions?: { code?: string } }
      | undefined;
    return first?.extensions?.code === 'ENTITY_NOT_FOUND';
  }
  return !res?.data?.lookup?.platformInvitation;
};

/** Whether a platform_invitation row with this id exists in the harness
 * database; undefined when the harness cannot reach Postgres (remote runs). */
export const platformInvitationRowExists = async (
  invitationId: string
): Promise<boolean | undefined> => {
  if (!harnessPostgresConfigured()) return undefined;
  const rows = await queryHarnessDb<{ id: string }>(
    'SELECT id FROM platform_invitation WHERE id = $1',
    [invitationId]
  );
  return rows.length > 0;
};

// The union list this feature ships is ASSOCIATE ∪ ADMIN ∪ OWNER, badged —
// this is the read that proves an admin who is not an associate is still
// visible (spec US5-AS2, D-1's discriminating gate).
export const usersInRoles = async (
  roleSetId: string,
  roles: RoleName[],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetRoleSetUsersInRoles(
      {
        roleSetId,
        roles,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const getRoleSetApplicationForm = async (
  roleSetId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetRoleSetApplicationForm(
      {
        roleSetId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** The GraphQL error `code` (`AlkemioErrorStatus`) of the first error on a
 * `graphqlErrorWrapper` response, e.g. `ROLESET_ALREADY_MEMBER`,
 * `ROLESET_APPLICATIONS_NOT_ACCEPTED`, `ROLESET_JOIN_NOT_ELIGIBLE`. These are
 * server-internal error codes, not a GraphQL enum, so string comparison is
 * the contract. */
export const getErrorCode = (
  res: { error?: { errors: Array<Record<string, unknown>> } } | undefined
): string | undefined => {
  const first = res?.error?.errors?.[0] as
    | { extensions?: { code?: string } }
    | undefined;
  return first?.extensions?.code;
};

export const getSingleInvitationResult = (
  invitationResponse: GraphqlReturnWithError<InviteForEntryRoleOnRoleSetMutation>
):
  | {
      type: RoleSetInvitationResultType;
      notice?: RoleSetInvitationResultNotice;
      invitation?: {
        id: string;
        state: string;
        extraRoles: string[];
        invitedToParent: boolean;
        actor: {
          id: string;
          type: ActorType;
        };
      };
      invitedActorID?: string | null;
      invitedEmail?: string | null;
      platformInvitation?: {
        id: string;
        email: string;
        roleSetExtraRoles: RoleName[];
      };
    }
  | undefined => {
  const invitationResults =
    invitationResponse?.data?.inviteForEntryRoleOnRoleSet;
  if (invitationResults && invitationResults.length > 0) {
    const invitationResult = invitationResults[0];
    return invitationResult;
  }
  return undefined;
};
