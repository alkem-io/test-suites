/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestUser } from '@alkemio/tests-lib';
import { getGraphqlClient } from '@utils/graphqlClient';
import { graphqlErrorWrapper } from '@utils/graphql.wrapper';
import { SearchCategory, SearchResultType } from '@generated/alkemio-schema';

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

export const searchGlobalSpaces = async (
  terms: any,
  //filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          //tagsetNames: ['Keywords'],
          terms: terms,
          filters: [
            {
              category: SearchCategory.Spaces, // filter,
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

export const searchGlobalContributions = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          tagsetNames: ['Keywords'],
          terms: terms,
          filters: [
            {
              category: filter,
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

export const searchGlobalContributors = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          tagsetNames: ['Keywords'],
          terms: terms,
          filters: [
            {
              category: filter,
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

// export const searchContributor = async (
//   terms: any,
//   filter: any,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN,
//   searchInSpaceFilter?: string
// ) => {
//   const graphqlClient = await getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.searchContributor(
//       {
//         searchData: {
//           tagsetNames: ['Keywords'],
//           terms: terms,
//           typesFilter: filter,
//           searchInSpaceFilter,
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };

// export const searchJourney = async (
//   terms: any,
//   filter: any,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN,
//   searchInSpaceFilter?: string
// ) => {
//   const graphqlClient = await getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.searchJourney(
//       {
//         searchData: {
//           tagsetNames: ['Keywords'],
//           terms: terms,
//           typesFilter: filter,
//           searchInSpaceFilter,
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );

//   return graphqlErrorWrapper(callback, userRole);
// };

// export const searchContributions = async (
//   terms: any,
//   filter: any,
//   userRole: TestUser = TestUser.GLOBAL_ADMIN,
//   searchInSpaceFilter?: string
// ) => {
//   const graphqlClient = await getGraphqlClient();
//   const callback = (authToken: string | undefined) =>
//     graphqlClient.searchContributions(
//       {
//         searchData: {
//           tagsetNames: ['Keywords'],
//           terms: terms,
//           typesFilter: filter,
//           searchInSpaceFilter,
//         },
//       },
//       {
//         authorization: `Bearer ${authToken}`,
//       }
//     );
//   return graphqlErrorWrapper(callback, userRole);
// };
