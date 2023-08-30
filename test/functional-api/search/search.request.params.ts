import * as SchemaTypes from '../../generated/alkemio-schema';
import * as Dom from 'graphql-request/dist/types.dom';
import { TestUser } from '@test/utils/token.helper';
import { getGraphqlClient } from '@test/utils/graphqlClient';
import { getTestUserToken } from '@test/utils/getTestUserToken';

type ErrorType = {
  response: {
    errors: Array<{ message: string }>;
  };
};

export const searchContributorWithError = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
): Promise<{
  data?: SchemaTypes.SearchContributorQuery;
  extensions?: any;
  headers?: Dom.Headers;
  status?: number;
  error?: ErrorType;
}> => {
  const graphqlClient = await getGraphqlClient();
  const auth_token = await getTestUserToken(userRole);

  try {
    const res = await graphqlClient.searchContributor(
      {
        searchData: {
          tagsetNames: ['Keywords'],
          terms: terms,
          typesFilter: filter,
          searchInSpaceFilter,
        },
      },
      {
        authorization: `Bearer ${auth_token}`,
      }
    );
    return res;
  } catch (error) {
    return { error: error as ErrorType };
  }
};

export const searchContributor = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const auth_token = await getTestUserToken(userRole);

  return await graphqlClient.searchContributor(
    {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInSpaceFilter,
      },
    },
    {
      authorization: `Bearer ${auth_token}`,
    }
  );
};

export const searchJourney = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const auth_token = await getTestUserToken(userRole);

  return await graphqlClient.searchJourney(
    {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInSpaceFilter,
      },
    },
    {
      authorization: `Bearer ${auth_token}`,
    }
  );
};

export const searchContributions = async (
  terms: any,
  filter: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN,
  searchInSpaceFilter?: string
) => {
  const graphqlClient = await getGraphqlClient();
  const auth_token = await getTestUserToken(userRole);

  return await graphqlClient.searchContributions(
    {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
        searchInSpaceFilter,
      },
    },
    {
      authorization: `Bearer ${auth_token}`,
    }
  );
};
