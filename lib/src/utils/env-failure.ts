/**
 * Environment-failure classification (test-suites#563).
 *
 * A failure is an ENVIRONMENT problem when the product code under test is not
 * actually at fault — the API was never reached, an infra dependency (Matrix /
 * Synapse / RabbitMQ / Kratos) was unhealthy, or the server pod was mid-roll.
 * Tagging these distinctly is what keeps environment flakiness from
 * masquerading as product regressions in the nightly report: green/red must
 * mean product-correct / product-broken, not "the cluster hiccuped".
 *
 * These signatures are matched against thrown error text (message + cause +
 * stack). They are deliberately used only where a match cannot be a legitimate
 * API assertion:
 *   - connection-level throws in the GraphQL wrapper, and
 *   - core scenario *setup* failures (setup is never an assertion).
 * They are NOT used to reclassify GraphQL error responses that a test asserts
 * on.
 */
export const ENV_FAILURE_SIGNATURES = [
  // Connection-level (runner <-> cluster): reset / refused / DNS / timeout.
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'EPIPE',
  'socket hang up',
  'fetch failed',
  'network timeout',
  'getaddrinfo',
  // Matrix / RabbitMQ RPC infra (server#6258 area). An unhealthy or saturated
  // Synapse surfaces as a 30s RPC timeout / adapter transport error during
  // space/room setup — infrastructure, not a product assertion.
  'Communication adapter',
  'transport error',
  'MATRIX_ENTITY_NOT_FOUND',
  'Failed to receive response within timeout',
  'communication.room',
  // Auth endpoint unavailable / disabled — the symptom of the server pod being
  // rolled or a feature-flag regression mid-run (the deploy-collision cascade
  // that this issue was ultimately traced to). The non-interactive-login route
  // 404s while the pod is down / the flag is off.
  'non-interactive-login',
  'feature disabled',
  'kratos_unavailable',
  'Unable to retrieve access token',
];

/**
 * Renders an unknown error to the text we scan for signatures: message, any
 * nested `cause`, and the stack (the Matrix/RPC detail often lives in a nested
 * GraphQL error string surfaced through the stack).
 */
export const describeError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const cause = (err as Error & { cause?: unknown }).cause;
  return [err.message, cause ? String(cause) : '', err.stack ?? '']
    .filter(Boolean)
    .join(' ');
};

/** True when the error text matches a known environment-failure signature. */
export const isEnvFailure = (err: unknown): boolean => {
  const text = describeError(err);
  return ENV_FAILURE_SIGNATURES.some(sig => text.includes(sig));
};
