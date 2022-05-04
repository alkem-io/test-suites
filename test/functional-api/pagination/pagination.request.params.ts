import { userData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import { Response } from 'superagent';

export const userPeginationWithFilter = async (
  email?: string,
  firstName?: string,
  lastName?: string
) => {
  const requestParams = {
    operationName: null,
    query: `{
      usersPaginated(filter: {email:"${email}"}) {
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
};

// pagination.ts
export type PaginationArgs = {
  first?: number;
  last?: number;
  before?: string;
  after?: string;
};

// user filter .ts
export type UserFilter = {
  firstname?: string;
  lastname?: string;
  email?: string;
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
    args = argsToString(filterArgs, args);
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

const argsToString = (args: Record<string, unknown>, startValue = '') => {
  return Object.keys(args).reduce((acc, key) => {
    const val = (args as any)[key];
    return `${acc ? `${acc},` : ''}${key}:${
      typeof val === 'string' ? `"${val}"` : val
    }`;
  }, startValue);
};

export const pageFn2 = async ({
  first,
  after,
  before,
  last,
}: PaginationArgs) => {
  const requestParams = {
    operationName: null,
    query: `{
      usersPaginated(first:${first}, last:${last}) {
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
};

export const pageFn = async ({ email }: UserFilter) => {
  const requestParams = {
    operationName: null,
    query: `{
      usersPaginated(filter:{email:${email}) {
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
};
