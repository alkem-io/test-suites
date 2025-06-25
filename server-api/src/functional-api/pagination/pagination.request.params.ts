import { UserFilterInput, OrganizationFilterInput } from '@alkemio/client-lib';
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/dist/utils/graphql.wrapper';

export const paginatedUser = async (
  options: {
    first?: number | undefined;
    last?: number | undefined;
    before?: string | undefined;
    after?: string | undefined;
    filter?: UserFilterInput | undefined;
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UsersPaginated(
      {
        ...options,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const paginatedOrganization = async (
  options: {
    first?: number | undefined;
    last?: number | undefined;
    before?: string | undefined;
    after?: string | undefined;
    filter?: OrganizationFilterInput | undefined;
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.OrganizationsPaginated(
      {
        ...options,
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
