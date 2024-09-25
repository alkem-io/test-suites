import { graphqlRequestAuth } from '../graphql.request';
import { TestUser } from '../token.helper';
import { getGraphqlClient } from '../graphqlClient';
import { graphqlErrorWrapper } from '../graphql.wrapper';
import { PlatformRole } from '@test/generated/alkemio-schema';

export const assignPlatformRoleToUser = async (
  userID: string,
  platformRole: PlatformRole,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        input: { userID, role: platformRole },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removePlatformRoleFromUser = async (
  userID: string,
  platformRole: PlatformRole,

  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removePlatformRoleFromUser(
      {
        input: { userID, role: platformRole },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignUserAsGlobalCommunityAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        input: { userID, role: PlatformRole.CommunityReader },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeUserAsGlobalCommunityAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removePlatformRoleFromUser(
      {
        input: { userID, role: PlatformRole.CommunityReader },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignUserAsGlobalSupport = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        input: { userID, role: PlatformRole.Support },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeUserAsGlobalSupport = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removePlatformRoleFromUser(
      {
        input: { userID, role: PlatformRole.Support },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const assignUserAsGlobalAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        input: { userID, role: PlatformRole.GlobalAdmin },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeUserAsGlobalAdmin = async (
  userID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removePlatformRoleFromUser(
      {
        input: { userID, role: PlatformRole.GlobalAdmin },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const authorizationPolicyResetOnPlatform = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation authorizationPolicyResetOnPlatform {
      authorizationPolicyResetOnPlatform {
        id
      }
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
