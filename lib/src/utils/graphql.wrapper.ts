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
 * Retry only ENV_FAILURE (connection-level) failures — never GraphQL errors,
 * which are legitimate API responses to assert on. These come from a ~5s
 * connection reset by a network element between the runner and the cluster when
 * a heavy request (e.g. subspace-tree creation) hasn't responded yet
 * (test-suites#563). A retry gives a fresh connection a chance to complete under
 * the cutoff. The durable fix is server-side latency (alkem-io/server#6258);
 * this is resilience until then. Caveat: for a mutation the server may have
 * committed before the reset, so a retry can hit a duplicate/conflict — for the
 * ephemeral, unique-named test data here that is harmless (it re-fails at worst,
 * never silently corrupts a real store).
 */
const ENV_FAILURE_MAX_ATTEMPTS = 3;
const ENV_FAILURE_RETRY_BASE_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const graphqlErrorWrapper = async <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  userRole?: TestUser,
): Promise<GraphqlReturnWithError<TData>> => {
  let authToken = undefined;
  if (userRole) {
    const userModel = TestUserManager.getUserModelByType(userRole);
    authToken = userModel.authToken;
  }
  const wrapperStartedAt = Date.now();
  for (let attempt = 1; ; attempt++) {
    const startedAt = Date.now();
    try {
      LogManager.getLogger().info(`Executing request: ${fn}`);
      return await fn(authToken);
    } catch (error) {
      const err = error as ErrorType;
      if (!err.response || !err.response.errors) {
        const elapsedMs = Date.now() - startedAt;
        const { code, detail } = classifyNonGraphqlError(error);
        if (code === "ENV_FAILURE" && attempt < ENV_FAILURE_MAX_ATTEMPTS) {
          const delay = ENV_FAILURE_RETRY_BASE_MS * attempt;
          LogManager.getLogger().warn(
            `[ENV_FAILURE] request failed after ${elapsedMs}ms (attempt ${attempt}/${ENV_FAILURE_MAX_ATTEMPTS}); retrying in ${delay}ms: '${fn}'`,
          );
          await sleep(delay);
          continue;
        }
        const totalMs = Date.now() - wrapperStartedAt;
        LogManager.getLogger().error(
          `[${code}] request failed on attempt ${attempt} (${elapsedMs}ms this attempt, ${totalMs}ms total incl. retries): '${fn}'`,
        );
        LogManager.getLogger().error("Returned error:");
        LogManager.getLogger().error(err);
        return {
          error: {
            errors: [
              {
                message: `[${code}] ${detail} (after ${totalMs}ms across ${attempt} attempt(s))`,
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
  }
};
