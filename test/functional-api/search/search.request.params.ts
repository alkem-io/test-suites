import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const searchContributor = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query search($searchData: SearchInput!) {
      search(searchData: $searchData) {
        contributorResultsCount
        contributorResults {

          score
          terms
          type

          ... on SearchResultUser{
            user{
              id
              profile {
                displayName
              }
            }
            type
          }

          ... on SearchResultOrganization{
            organization{
              id
              profile {
                displayName
              }
            }
            type
          }
        }
      }
    }`,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInSpaceFilter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

const searchJourneyQuery = `
query search($searchData: SearchInput!) {
  search(searchData: $searchData) {
    journeyResultsCount
    journeyResults {
      score
      terms
      type

      ... on SearchResultSpace{
        space {
          id
          profile
          {
            displayName
          }
        }
        type
      }

      ... on SearchResultChallenge{
        challenge
        {
          id
          profile
          {
            displayName
          }
        }
        type
      }

      ... on SearchResultOpportunity{
        opportunity
        {
          id
          profile
          {
            displayName
          }
        }
        type
      }

    }
  }
}`;
export const searchJourney = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const requestParams = {
    operationName: null,
    query: searchJourneyQuery,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInSpaceFilter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const searchContributions = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query search($searchData: SearchInput!) {
      search(searchData: $searchData) {
        contributionResultsCount
        contributionResults {
          id
          score
          terms
          type
          ... on SearchResultPost {
            space {
              id
              profile
              {
                displayName
              }
            }
            challenge
            {
              id
              profile
              {
                displayName
              }
            }
            opportunity
            {
              id
              profile
              {
                displayName
              }
            }
            callout {id profile{displayName}}
            post {
              id
              profile {
                displayName
              }
            }
          }
        }
      }
    }
    `,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInSpaceFilter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
