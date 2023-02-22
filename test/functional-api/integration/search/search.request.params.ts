import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const search = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query search($searchData: SearchInput!){
      search(searchData: $searchData) {
        contributorResults {
          id
          score
          terms
          type
          ... on SearchResultUser {
            user {
              nameID
            }
          }
          ... on SearchResultOrganization {
            organization {
              nameID
            }
          }
        }
        journeyResults {
          id
          score
          terms
          type
          ... on SearchResultHub {
            hub {
              nameID
            }
          }
          ... on SearchResultChallenge {
            challenge {
              nameID
            }
          }
          ... on SearchResultOpportunity {
            opportunity {
              nameID
            }
          }
        }
        contributionResults {
          id
          score
          terms
          type
          ... on SearchResultCard {
            card {
              nameID
            }
          }

        }
      }
    }`,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const searchOriginal = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query search($searchData: SearchInput!){
      search(searchData: $searchData) {
        id
        terms
        score
        type
        ... on SearchResultHub {
          hub {
            id
            displayName
          }
        }
        ... on SearchResultChallenge {
          challenge {
            id
            displayName
          }
        }
        ... on SearchResultOpportunity {
          opportunity {
            id
            displayName
          }
        }
        ... on SearchResultUser {
          user {
            id
            displayName
          }
        }
        ... on SearchResultOrganization {
          organization {
            id
            displayName
          }
        }
      }
    }`,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
