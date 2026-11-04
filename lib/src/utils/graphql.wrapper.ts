/* eslint-disable @typescript-eslint/no-explicit-any */
import Headers from "graphql-request";
import { LogManager } from "../scenario/LogManager";
import { describeError, isEnvFailure } from "./env-failure";
import { GraphqlActor, resolveActor } from "./graphql.actor";
import { getGraphqlClientFor } from "./graphqlClient";
import type { Sdk } from "../core/generated/graphql";

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
 * which are legitimate API responses to assert on. Until 2026-10-26 the
 * dominant ENV_FAILURE was a `socket hang up` after exactly ~5 s, blamed on a
 * network element between the runner and the cluster (test-suites#563); it was
 * in fact the GraphQL client reusing an axios-tainted keep-alive socket from
 * Node's global agent pool — see `graphqlClient.ts`, which now keeps the client
 * on its own agents. The retry stays as resilience against genuine resets.
 * Caveat: for a mutation the server may have committed before the reset, so a
 * retry can hit a duplicate/conflict — for the ephemeral, unique-named test
 * data here that is harmless (it re-fails at worst, never silently corrupts a
 * real store); setup helpers such as `createSubspaceOrFail` recover from it.
 */
const ENV_FAILURE_MAX_ATTEMPTS = 3;
const ENV_FAILURE_RETRY_BASE_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// JSON.stringify throws on circular structures (axios errors carry them);
// throwing inside the wrapper's catch handler would replace the real failure
// with a serialization error.
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};

export const graphqlErrorWrapper = async <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  userRole?: GraphqlActor,
): Promise<GraphqlReturnWithError<TData>> => {
  let authToken: string | undefined = undefined;
  if (userRole !== undefined) {
    const resolved = resolveActor(userRole);
    if (resolved.endpoint !== "private") {
      // The legacy callbacks build their own bearer header against the
      // non-interactive client; a cookie session or the public endpoint
      // needs the endpoint-aware path.
      throw new Error(
        "graphqlErrorWrapper only carries persona/bearer actors — use runAs() for a cookie session or an anonymous call",
      );
    }
    authToken = resolved.authToken;
  }
  return executeWithRetry(() => fn(authToken), String(fn));
};

/**
 * Run one generated-SDK operation as any `GraphqlActor` — the entry point
 * every business-action function added for the W2 lib boundary uses. The
 * callback receives the SDK bound to the actor's endpoint plus the request
 * headers that authenticate the actor; it returns the same `{ data } |
 * { error }` shape as `graphqlErrorWrapper`, with the same ENV_FAILURE retry.
 */
export const runAs = async <TData>(
  actor: GraphqlActor,
  fn: (sdk: Sdk, headers: Record<string, string>) => GraphQLReturnType<TData>,
): Promise<GraphqlReturnWithError<TData>> => {
  const resolved = resolveActor(actor);
  const sdk = getGraphqlClientFor(resolved.endpoint);
  return executeWithRetry(() => fn(sdk, resolved.headers), String(fn));
};

const executeWithRetry = async <TData>(
  fn: () => GraphQLReturnType<TData>,
  label: string,
): Promise<GraphqlReturnWithError<TData>> => {
  const wrapperStartedAt = Date.now();
  for (let attempt = 1; ; attempt++) {
    const startedAt = Date.now();
    try {
      LogManager.getLogger().info(`Executing request: ${label}`);
      return await fn();
    } catch (error) {
      const err = error as ErrorType;
      if (!err.response || !err.response.errors) {
        const elapsedMs = Date.now() - startedAt;
        const { code, detail } = classifyNonGraphqlError(error);
        if (code === "ENV_FAILURE" && attempt < ENV_FAILURE_MAX_ATTEMPTS) {
          const delay = ENV_FAILURE_RETRY_BASE_MS * attempt;
          LogManager.getLogger().warn(
            `[ENV_FAILURE] request failed after ${elapsedMs}ms (attempt ${attempt}/${ENV_FAILURE_MAX_ATTEMPTS}) — ${detail.split("\n")[0].slice(0, 300)}; retrying in ${delay}ms: '${label}'`,
          );
          await sleep(delay);
          continue;
        }
        const totalMs = Date.now() - wrapperStartedAt;
        LogManager.getLogger().error(
          `[${code}] request failed on attempt ${attempt} (${elapsedMs}ms this attempt, ${totalMs}ms total incl. retries): '${label}'`,
        );
        LogManager.getLogger().error("Returned error:");
        LogManager.getLogger().error(
          err instanceof Error ? (err.stack ?? err.message) : safeStringify(err),
        );
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
        // Stringify explicitly — winston's console transport renders raw
        // objects as `[object Object]`, which hid the actual GraphQL errors of
        // the failed recovery lookups in the 2026-07-15 nightly (#563).
        LogManager.getLogger().error(safeStringify(badErrors));
        LogManager.getLogger().error(`Unable to complete call '${label}'`);

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
