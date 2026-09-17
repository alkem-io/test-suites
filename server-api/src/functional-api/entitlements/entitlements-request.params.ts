import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const getMyEntitlementsQuery = async (
  userRole: TestUser = TestUser.BOOTSTRAP_PLATFORM_ROLES_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.MyEntitlementsQuery(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getOrganazationEntitlementsQuery = async (
  organizationId: string,
  userRole: TestUser = TestUser.BOOTSTRAP_PLATFORM_ROLES_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.OrganizationEntitlementsQuery(
      { ID: organizationId },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
