import * as Dom from 'graphql-request/dist/types.dom';
import { TestUser } from './token.helper';
import { getTestUserToken } from './getTestUserToken';

export type ErrorType = {
  response: {
    errors: Array<{ message: string; extensions: { code: string } }>;
  };
};

export type GraphQLReturnType<TData> = Promise<{
  data: TData;
  extensions?: any;
  headers: Dom.Headers;
  status: number;
}>;
export type GraphQLAwaitedReturnType<TData> = Awaited<GraphQLReturnType<TData>>;
export type GraphqlReturnWithError<TData> = Partial<
  GraphQLAwaitedReturnType<TData>
> & {
  error?: {
    errors: Array<{ message: string; code: string }>;
  };
};

export const graphqlErrorWrapper = async <TData>(
  fn: (authToken: string) => GraphQLReturnType<TData>,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
): Promise<GraphqlReturnWithError<TData>> => {
  const authToken = await getTestUserToken(userRole);
  try {
    return await fn(authToken);
  } catch (error) {
    const err = error as ErrorType;
    return {
      error: {
        errors: err.response.errors.map(error => ({
          message: error.message,
          code: error.extensions.code,
        })),
      },
    };
  }
};
