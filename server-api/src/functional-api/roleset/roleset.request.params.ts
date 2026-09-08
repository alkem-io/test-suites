import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
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

// 062-organization-user-associates: the pending applications/invitations of
// an organization role set, confidentiality-gated to GRANT (contract §6) —
// so the caller matters as much as the roleSetId.
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
      platformInvitation?: { id: string };
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
