import { testConfiguration } from '../config/test.configuration';
import { getSdk, Sdk, SdkFunctionWrapper } from '../core/generated/graphql';
import { GraphQLClient } from 'graphql-request';
import { isEnvFailure } from './env-failure';
import { LogManager } from '../scenario/LogManager';

let graphqlSdkClient: Sdk;

/**
 * Retry only ENV_FAILURE (connection-level) failures, and ONLY for idempotent
 * operations (queries).
 *
 * A ~5s connection reset by a network element between the runner and the cluster
 * can drop a heavy request before it responds (test-suites#563; the durable fix
 * is server latency, alkem-io/server#6258). Retrying a QUERY is safe. Retrying a
 * MUTATION is not: the server may have committed before the reset, so re-issuing
 * a create comes back as `nameID already taken` (BAD_USER_INPUT) and fails a test
 * for an entity that actually exists — the root cause of the 2026-07-15 nightly
 * cascades across subspace/subsubspace/entitlements. Mutations therefore run
 * exactly once; a reset during a mutation surfaces as a real ENV_FAILURE rather
 * than a duplicate.
 *
 * The operation type comes from the generated SDK wrapper, so this needs no
 * per-helper changes and covers every call site uniformly.
 */
const ENV_FAILURE_MAX_ATTEMPTS = 3;
const ENV_FAILURE_RETRY_BASE_MS = 1000;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const envFailureRetryWrapper: SdkFunctionWrapper = async (
  action,
  operationName,
  operationType
) => {
  if (operationType !== 'query') {
    return action();
  }
  for (let attempt = 1; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt < ENV_FAILURE_MAX_ATTEMPTS && isEnvFailure(error)) {
        const delay = ENV_FAILURE_RETRY_BASE_MS * attempt;
        LogManager.getLogger().warn(
          `[ENV_FAILURE] query '${operationName}' failed (attempt ${attempt}/${ENV_FAILURE_MAX_ATTEMPTS}); retrying in ${delay}ms`
        );
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
};

export const getGraphqlClient = (): Sdk => {
  if (!graphqlSdkClient) {
    const graphqlClient = new GraphQLClient(
      testConfiguration.endPoints.graphql.private
    );
    graphqlSdkClient = getSdk(graphqlClient, envFailureRetryWrapper);
  }
  return graphqlSdkClient;
};
