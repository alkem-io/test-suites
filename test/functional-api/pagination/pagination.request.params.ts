import { userData } from '@test/utils/common-params';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';

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

type PaginationWithFilter<T = any> = T extends any
  ? PaginationArgs & { filter?: T }
  : PaginationArgs & { filter?: T };
export async function paginationFn<T>({
  filter,
  ...pagination
}: PaginationWithFilter<T>) {
  let args;
  // build args with the provided pagination params
  if (pagination) {
    args = Object.keys(pagination).reduce(
      (acc, val) => `${acc ? `${acc},` : ''}${val}:${(pagination as any)[val]}`,
      ''
    );
  }
  // continue with the provided filters
  if (filter) {
    args = Object.keys(pagination).reduce(
      (acc, val) => `${acc},${val}:${(pagination as any)[val]}`,
      args
    );
  }
  console.log(args);
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
