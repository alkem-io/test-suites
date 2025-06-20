import { TestUser } from '@alkemio/tests-lib';
import { getGraphqlClient } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';
import { graphqlRequestAuth } from '@alkemio/tests-lib/dist/utils/graphql.request';
import { RoleName } from '@alkemio/tests-lib/dist/core/generated/alkemio-schema';
export const assignPlatformRole = async (
  contributorID: string,
  roleName: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.assignPlatformRoleToUser(
      {
        roleData: { contributorID, role: roleName },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removePlatformRole = async (
  contributorID: string,
  roleName: RoleName,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.removePlatformRoleFromUser(
      {
        roleData: { contributorID, role: roleName },
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
