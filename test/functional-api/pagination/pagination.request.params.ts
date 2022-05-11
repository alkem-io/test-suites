import { organizationData, userData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import { Response } from 'superagent';
import { PaginationArgs } from './pagination';

const argsToString = (args: Record<string, unknown>) => {
  return Object.keys(args).reduce((acc, key) => {
    const val = (args as any)[key];
    return `${acc ? `${acc},` : ''}${key}:${
      typeof val === 'string' ? `"${val}"` : val
    }`;
  }, '');
};

export async function paginationFn(
  paginationArgs: PaginationArgs
): Promise<Response>;
export async function paginationFn<T>(
  paginationArgs: PaginationArgs,
  filterArgs: T
): Promise<Response>;
export async function paginationFn<T extends Record<string, unknown>>(
  paginationArgs: PaginationArgs,
  filterArgs?: T
): Promise<Response> {
  let args;
  // build args with the provided pagination params
  if (paginationArgs) {
    args = argsToString(paginationArgs);
  }
  // continue with the provided filters
  if (filterArgs) {
    args = `${args}${args ? ',' : ''}filter:{${argsToString(filterArgs)}}`;
  }

  const requestParams = {
    operationName: null,
    query: `{
      usersPaginated${args ? `(${args})` : ''} {
        users {
          ${userData}
        }
        pageInfo {
          startCursor
          endCursor
          hasNextPage
          hasPreviousPage
        }
      }
    }`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
}

export async function paginationFnOrganization<
  T extends Record<string, unknown>
>(paginationArgs: PaginationArgs, filterArgs?: T): Promise<Response> {
  let args;
  // build args with the provided pagination params
  if (paginationArgs) {
    args = argsToString(paginationArgs);
  }
  // continue with the provided filters
  if (filterArgs) {
    args = `${args}${args ? ',' : ''}filter:{${argsToString(filterArgs)}}`;
  }

  const requestParams = {
    operationName: null,
    query: `{
      organizationsPaginated${args ? `(${args})` : ''} {
        organization
          ${organizationData}

        pageInfo {
          startCursor
          endCursor
          hasNextPage
          hasPreviousPage
        }
      }
    }`,
    variables: null,
  };
  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
}
