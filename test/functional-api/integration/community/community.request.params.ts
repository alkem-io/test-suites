import { CommunityRole } from '@alkemio/client-lib';
import { TestUser } from '@test/utils';
import { organizationData, userData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';
import { getGraphqlClient } from '@test/utils/graphqlClient';

export enum RoleType {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  LEAD = 'LEAD',
  HOST = 'HOST',
}

export const assignCommunityRoleToUser = async (
  userID: string,
  communityID: string,
  role: RoleType = RoleType.MEMBER,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation AssignCommunityRoleToUser($roleData: AssignCommunityRoleToUserInput!) {
      assignCommunityRoleToUser(roleData: $roleData) {
        ${userData}
      }
    }`,
    variables: {
      roleData: {
        userID,
        communityID,
        role,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const assignCommunityRoleToUserCodegen = async (
  userID: string,
  communityID: string,
  role: CommunityRole = CommunityRole.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
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

export const removeCommunityRoleFromUserCodegen = async (
  userID: string,
  communityID: string,
  role: CommunityRole = CommunityRole.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
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

export const removeCommunityRoleFromUser = async (
  userID: string,
  communityID: string,
  role: RoleType = RoleType.MEMBER,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeCommunityRoleFromUser($roleData: RemoveCommunityRoleFromUserInput!) {
      removeCommunityRoleFromUser(roleData: $roleData) {
        ${userData}
      }
    }`,
    variables: {
      roleData: {
        userID,
        communityID,
        role,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const assignCommunityRoleToOrganization = async (
  organizationID: string,
  communityID: string,
  role: RoleType = RoleType.MEMBER,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignCommunityRoleToOrganization($roleData: AssignCommunityRoleToOrganizationInput!) {
      assignCommunityRoleToOrganization(roleData: $roleData)
        ${organizationData}

    }`,
    variables: {
      roleData: {
        organizationID,
        communityID,
        role,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeCommunityRoleFromOrganization = async (
  organizationID: string,
  communityID: string,
  role: RoleType = RoleType.MEMBER,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeCommunityRoleFromOrganization($roleData: RemoveCommunityRoleFromOrganizationInput!) {
      removeCommunityRoleFromOrganization(roleData: $roleData)
        ${organizationData}

    }`,
    variables: {
      roleData: {
        organizationID,
        communityID,
        role,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const getUserCommunityPrivilegeCodegen = async (
  communityId: string,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.CommunityUserPrivileges(
      {
        communityId,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};

export const getUserCommunityPrivilegeToOpportunityCodegen = async (
  spaceId: string,
  opportunityId: string,
  includeDetails: boolean,
  role = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.CommunityUserPrivilegesToOpportunity(
      {
        spaceId,
        opportunityId,
        includeDetails,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, role);
};
