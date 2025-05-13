import Headers from 'graphql-request';
import { getTestUserToken } from './getTestUserToken';
import { TestUser } from '@alkemio/tests-lib';

export type ErrorType = {
  response: {
    errors: Array<{ message: string; extensions: { code: string } }>;
  };
};

export type GraphQLReturnType<TData> = Promise<{
  data: TData;
  extensions?: any;
  headers: Headers;
  status: number;
}>;
export type GraphQLAwaitedReturnType<TData> = Awaited<GraphQLReturnType<TData>>;
export type GraphqlReturnWithError<TData> = Partial<
  GraphQLAwaitedReturnType<TData>
> & {
  error?: {
    // errors: Array<{ message: string; code: string }>;
    errors: Array<Record<string, unknown>>;
  };
};

export const graphqlErrorWrapper = async <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  userRole?: TestUser
): Promise<GraphqlReturnWithError<TData>> => {
  let authToken = undefined;
  if (userRole) {
    authToken = await getTestUserToken(userRole);
  }
  try {
    return await fn(authToken);
  } catch (error) {
    const err = error as ErrorType;
    const badErrors = err.response.errors.filter(
      e => e.extensions.code !== 'BAD_USER_INPUT' && e.extensions.code !== 'FORBIDDEN_POLICY'
    );
    if (badErrors.length > 0) {
      console.error(badErrors);
      console.error(`Unable to complete call '${fn}'`);
    }
    return {
      error: {
        errors: err.response.errors.map(error => ({
          ...error,
          message: error.message,
          code: error.extensions.code,
        })),
      },
    };
  }
};
