import { TestUser } from '@test/utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { graphqlErrorWrapper } from '@test/utils/graphql.wrapper';

export const searchContributor = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.searchContributor(
      {
        searchData: {
          tagsetNames: ['Keywords'],
          terms: terms,
          typesFilter: filter,
          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const searchJourney = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.searchJourney(
      {
        searchData: {
          tagsetNames: ['Keywords'],
          terms: terms,
          typesFilter: filter,
          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const searchContributions = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string) =>
    graphqlClient.searchContributions(
      {
        searchData: {
          tagsetNames: ['Keywords'],
          terms: terms,
          typesFilter: filter,
          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};
