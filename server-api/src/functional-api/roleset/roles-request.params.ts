import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
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

export const assignRoleToUser = async (
  userID: string,
  roleSetID: string,
  role: RoleName,
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

export const assignRoleToUserExtendedData = async (
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
  role: RoleName,
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
  role: RoleName = RoleName.Member,
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
          role: RoleName.Member,
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
  role: RoleName = RoleName.Member,
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
          role: RoleName.Lead,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
