/* eslint-disable @typescript-eslint/no-explicit-any */
import Headers from "graphql-request";
import { TestUserManager } from "../scenario/TestUserManager";
import { LogManager } from "../scenario/LogManager";
import { TestUser } from "../common/enums/test.user";

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

/**
 * Connection-level failure signatures. When one of these is hit the API was
 * never (or not fully) reached — the failure is an ENVIRONMENT problem
 * (proxy reset, DNS, service down), NOT an assertion-worthy API response.
 * Tagging them distinctly keeps environment flakiness from masquerading as
 * product regressions in the reports.
 */
const ENV_FAILURE_SIGNATURES = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "EPIPE",
  "socket hang up",
  "fetch failed",
  "network timeout",
  "getaddrinfo",
];

const classifyNonGraphqlError = (
  err: unknown,
): { code: "ENV_FAILURE" | "UNKNOWN"; detail: string } => {
  const cause =
    err instanceof Error
      ? (err as Error & { cause?: unknown }).cause
      : undefined;
  const detail =
    err instanceof Error
      ? `${err.message}${cause ? ` (cause: ${cause})` : ""}`
      : String(err);
  const isEnv = ENV_FAILURE_SIGNATURES.some((sig) => detail.includes(sig));
  return { code: isEnv ? "ENV_FAILURE" : "UNKNOWN", detail };
};

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
        `[${code}] request failed after ${elapsedMs}ms: '${fn}'`,
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
