/* eslint-disable @typescript-eslint/no-explicit-any */
import Headers from "graphql-request";
import { TestUserManager } from "../scenario/TestUserManager";
import { LogManager } from "../scenario/LogManager";
import { TestUser } from "../common/enums/test.user";
import { describeError, isEnvFailure } from "./env-failure";

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

// Environment-failure signatures + classifier are centralised in
// ./env-failure so the GraphQL wrapper and core scenario-setup retry share one
// source of truth (test-suites#563).
const classifyNonGraphqlError = (
  err: unknown,
): { code: "ENV_FAILURE" | "UNKNOWN"; detail: string } => {
  const detail = describeError(err);
  return { code: isEnvFailure(err) ? "ENV_FAILURE" : "UNKNOWN", detail };
};

/**
 * Shapes thrown request errors into the `{ error: { errors } }` contract the
 * helpers/tests rely on. It does NOT retry.
 *
 * ENV_FAILURE (connection-level) retries live one layer deeper, in the SDK
 * wrapper (`getGraphqlClient`), where the operation type is known — so only
 * idempotent QUERIES are retried. Mutations must never be auto-retried: the
 * server may have committed a create before a ~5s connection reset, and
 * re-issuing it hits `nameID already taken`, failing a test for an entity that
 * actually exists (the 2026-07-15 nightly cascades). By the time we catch here,
 * any query retries have already happened; we just classify and report.
 */
export const graphqlErrorWrapper = async <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  userRole?: TestUser,
): Promise<GraphqlReturnWithError<TData>> => {
  let authToken = undefined;
  if (userRole) {
    const userModel = TestUserManager.getUserModelByType(userRole);
    authToken = userModel.authToken;
  }
  const startedAt = Date.now();
  try {
    LogManager.getLogger().info(`Executing request: ${fn}`);
    return await fn(authToken);
  } catch (error) {
    const err = error as ErrorType;
    if (!err.response || !err.response.errors) {
      const elapsedMs = Date.now() - startedAt;
      const { code, detail } = classifyNonGraphqlError(error);
      LogManager.getLogger().error(
        `[${code}] request failed (${elapsedMs}ms): '${fn}'`,
      );
      LogManager.getLogger().error("Returned error:");
      LogManager.getLogger().error(err);
      return {
        error: {
          errors: [
            {
              message: `[${code}] ${detail} (after ${elapsedMs}ms)`,
              code,
            },
          ],
        },
      };
    } else {
      const badErrors = err.response.errors.filter(
        (e) =>
          e.extensions.code !== "BAD_USER_INPUT" &&
          e.extensions.code !== "FORBIDDEN_POLICY",
      );
      if (badErrors.length > 0) {
        LogManager.getLogger().error(badErrors);
        LogManager.getLogger().error(`Unable to complete call '${fn}'`);

        //throw new Error(`GraphQL error: ${badErrors.map(e => e.message).join(', ')}`);
      }
      return {
        error: {
          errors: err.response.errors.map((error) => ({
            ...error,
            message: error.message,
            code: error.extensions.code,
          })),
        },
      };
    }
  }
};
