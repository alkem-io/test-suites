import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const search = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query create($searchData: SearchInput!) {
      search(searchData: $searchData) {
        terms
        score
        result {
          __typename
          ... on User {
            id
            displayName
          }
          ... on Opportunity {
            id
            displayName
          }
          ... on Challenge {
            id
            displayName
          }
          ... on Organization {
            id
            displayName
          }
          ... on Hub {
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
