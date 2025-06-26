/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import {
  SearchCategory,
  SearchResultType,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const adminSearchIngestFromScratch = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AdminSearchIngestFromScratch(
      {},
      {
        authorization: `Bearer ${authToken}`,
      }
    );
  return graphqlErrorWrapper(callback, userRole);
};

export const searchSpaces = async (
  terms: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          terms: terms,
          filters: [
            {
              category: SearchCategory.Spaces,
              size: 3,
              types: [SearchResultType.Space, SearchResultType.Subspace],
            },
          ],

          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const searchResponses = async (
  terms: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          terms: terms,
          filters: [
            {
              category: SearchCategory.Responses,
              size: 3,
              types: [SearchResultType.Post, SearchResultType.Whiteboard],
            },
          ],

          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const searchContributors = async (
  terms: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          terms: terms,
          filters: [
            {
              category: SearchCategory.Contributors,
              size: 3,
              types: [SearchResultType.User, SearchResultType.Organization],
            },
          ],
          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
