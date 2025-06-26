import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import {
  InviteForEntryRoleOnRoleSetMutation,
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

export const getSingleInvitationResult = (
  invitationResponse: GraphqlReturnWithError<InviteForEntryRoleOnRoleSetMutation>
):
  | {
      type: RoleSetInvitationResultType;
      invitation?: {
        id: string;
        state: string;
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
