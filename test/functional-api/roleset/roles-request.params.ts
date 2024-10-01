import { CommunityRoleType, OrganizationRole } from '../../generated/alkemio-schema';
import { TestUser } from '../../utils';
import { graphqlErrorWrapper } from '../../utils/graphql.wrapper';
import { getGraphqlClient } from '../../utils/graphqlClient';

export const getOrganizationRole = async (
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

export const assignRoleToUser = async (
  userID: string,
  roleSetID: string,
  role: CommunityRoleType,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignRoleToUser(
      {
        roleData: {
          contributorID: userID,
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

export const removeRoleFromUser = async (
  userID: string,
  roleSetID: string,
  role: CommunityRoleType = CommunityRoleType.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removeRoleFromUser(
      {
        roleData: {
          contributorID: userID,
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

export const assignRoleToOrganization = async (
  organizationID: string,
  roleSetID: string,
  role: CommunityRoleType = CommunityRoleType.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AssignRoleToOrganization(
      {
        roleData: {
          contributorID: organizationID,
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

export const assignRoleToOrganization4 = async (
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
          contributorID: organizationID,
          role: CommunityRoleType.Member,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeRoleFromOrganization = async (
  organizationID: string,
  roleSetID: string,
  role: CommunityRoleType = CommunityRoleType.Member,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveRoleFromOrganization(
      {
        roleData: {
          contributorID: organizationID,
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
          contributorID: organizationID,
          role: CommunityRoleType.Lead,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

/// TODO: This is a different context + should not be mixed up here
export const assignUserToOrganization = async (
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
