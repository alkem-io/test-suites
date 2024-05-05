import {
  CommunityRole,
  OrganizationRole,
} from '@test/generated/alkemio-schema';
import { TestUser } from '@test/utils';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';


export const getOrganizationRoleCodegen = async (
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

export const assignCommunityRoleToUserCodegen = async (
  userID: string,
  communityID: string,
  role: CommunityRole,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignCommunityRoleToUser(
      {
        roleData: {
          userID,
          communityID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignUserToOrganizationCodegen = async (
  userID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignOrganizationRoleToUser(
      {
        membershipData: {
          userID,
          organizationID,
          role: OrganizationRole.Associate,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeCommunityRoleFromUserCodegen = async (
  userID: string,
  communityID: string,
  role: CommunityRole = CommunityRole.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removeCommunityRoleFromUser(
      {
        roleData: {
          userID,
          communityID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignCommunityRoleToOrganizationCodegen = async (
  organizationID: string,
  communityID: string,
  role: CommunityRole = CommunityRole.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignCommunityRoleToOrganization(
      {
        roleData: {
          organizationID,
          communityID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeCommunityRoleFromOrganizationCodegen = async (
  organizationID: string,
  communityID: string,
  role: CommunityRole = CommunityRole.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveCommunityRoleFromOrganization(
      {
        roleData: {
          organizationID,
          communityID,
          role,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const joinCommunityCodegen = async (
  communityID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.JoinCommunity(
      {
        joinCommunityData: {
          communityID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignOrganizationAsCommunityMemberCodegen = async (
  communityID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignOrganizationAsCommunityMember(
      {
        roleData: {
          communityID,
          organizationID,
          role: CommunityRole.Member,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignOrganizationAsCommunityLeadCodegen = async (
  communityID: string,
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignOrganizationAsCommunityLead(
      {
        roleData: {
          communityID,
          organizationID,
          role: CommunityRole.Lead,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
