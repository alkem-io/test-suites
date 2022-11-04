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
