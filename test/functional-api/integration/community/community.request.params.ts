import { TestUser } from '@test/utils';
import {
  organizationData,
  spaceData,
  userData,
} from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

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
