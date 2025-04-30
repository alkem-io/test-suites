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

export const searchSpaces = async (
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

export const searchResponses = async (
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
          //  tagsetNames: ['Keywords'],
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

  //  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  // types: SearchResultType[] = [
  //   SearchResultType.User,
  //   SearchResultType.Organization,
  // ],
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.search(
      {
        searchData: {
          // tagsetNames: ['Keywords'],
          terms: terms,
          filters: [
            {
              category: SearchCategory.Contributors, // filter,
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
