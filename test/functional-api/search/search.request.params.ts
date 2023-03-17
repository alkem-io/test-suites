import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const search = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `query search($searchData: SearchInput!) {
      search(searchData: $searchData) {
        contributorResultsCount
        contributorResults {
          id
          score
          terms
          type

          ... on SearchResultUserGroup{
            userGroup{name }
            type
          }

          ... on SearchResultUser{
            user
            {
              profile {
                displayName
              }
            }

            type
          }

          ... on SearchResultOrganization{
            organization
            {
              profile {
                displayName
              }
              associates
              {
                profile
                {
                  displayName
                }
              }
            }
            type
          }
          ... on SearchResultCard {
            hub {
              nameID
              community {
                memberUsers {
                  email
                }
              }
            }
            challenge {
              nameID
              community {
                memberUsers {
                  email
                }
              }
            }
            opportunity {
              nameID
              community {
                memberUsers {
                  email
                }
              }
            }
            callout {
              nameID
              aspects {
                displayName
              }
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

export const searchContributor = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInHubFilter?: string
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
        searchInHubFilter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const searchJourney = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInHubFilter?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query search($searchData: SearchInput!) {
      search(searchData: $searchData) {
        journeyResultsCount
        journeyResults {
          score
          terms
          type

          ... on SearchResultHub{
            hub {
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
    }`,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInHubFilter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const searchContributions = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInHubFilter?: string
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
          ... on SearchResultCard {
            hub {
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
            callout {id displayName}
            card {
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
        searchInHubFilter,
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
            profile
            {
              displayName
            }
          }
        }
        ... on SearchResultChallenge {
          challenge {
            id
            profile
            {
              displayName
            }
          }
        }
        ... on SearchResultOpportunity {
          opportunity {
            id
            profile
            {
              displayName
            }
          }
        }
        ... on SearchResultUser {
          user {
            id
            profile
            {
              displayName
            }
          }
        }
        ... on SearchResultOrganization {
          organization {
            id
            profile
            {
              displayName
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
