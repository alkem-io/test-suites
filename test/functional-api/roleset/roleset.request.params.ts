import { TestUser } from '@test/utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

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

//   spaceId: string,
//   opportunityId: string,
//   includeDetails: boolean,
//   role = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.CommunityUserPrivilegesToOpportunity(
//       {
//         spaceId,
//         opportunityId,
//         includeDetails,
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, role);
// };

// export const getUserCommunityPrivilegeToChallenge = async (
//   spaceId: string,
//   subspaceId: string,
//   includeDetails: boolean,
//   role = TestUser.GLOBAL_ADMIN
// ) => {
//   const graphqlClient = getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.CommunityUserPrivilegesToChallenge(
//       {
//         spaceId,
//         subspaceId,
//         includeDetails,
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, role);
// };

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
