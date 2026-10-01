/**
 * The ONE place a platform-roles call is judged.
 *
 * Three outcomes, never two. A suite that only knows "error / no error" reads a
 * validation failure as a denial and a forbidden sub-field as a refusal of the
 * action itself — both were found in the review of test-suites#600.
 *
 *  - `ok`      the call returned without any GraphQL error
 *  - `denied`  an AUTHORIZATION error located AT THE GATE: its `path` is the
 *              capability's gate path, or a prefix of it (refused higher up)
 *  - `failed`  anything else — validation, not-found, transport, or an
 *              authorization error on a field BELOW the gate (the action itself
 *              ran; only part of the response was withheld). Fails a positive
 *              AND a negative, loudly.
 */

export type GqlError = {
  message: string;
  path?: ReadonlyArray<string | number>;
  extensions?: { code?: string };
};

export type Outcome<T = unknown> =
  | { kind: 'ok'; data: T }
  | { kind: 'denied'; errors: GqlError[] }
  | { kind: 'failed'; reason: string; errors: GqlError[] };

/**
 * `EMAIL_CHANGE_UNAUTHORIZED` is the server's own feature-scoped authorization
 * code: `admin.user.email.change.resolver.mutations.ts` catches the policy
 * denial and re-raises it under this code, by design. `MCP_ACCESS_DENIED` is
 * how `mcp-client.ts` reports an MCP tool's "Access denied" result — MCP
 * refuses through a tool result, not a GraphQL error, and the client names it
 * explicitly rather than pretending it was FORBIDDEN.
 */
const AUTHORIZATION_CODES: ReadonlySet<string> = new Set([
  'FORBIDDEN',
  'FORBIDDEN_POLICY',
  'EMAIL_CHANGE_UNAUTHORIZED',
  'MCP_ACCESS_DENIED',
]);

const isAuthorizationError = (e: GqlError): boolean =>
  AUTHORIZATION_CODES.has(e.extensions?.code ?? '');

const fieldPath = (e: GqlError): string[] =>
  (e.path ?? []).filter((s): s is string => typeof s === 'string');

/** `errorPath` equals `gate`, or is a (non-empty) prefix of it. */
const atOrAboveGate = (errorPath: string[], gate: readonly string[]): boolean =>
  errorPath.length > 0 &&
  errorPath.length <= gate.length &&
  errorPath.every((segment, i) => segment === gate[i]);

const errorsOf = (thrown: unknown): GqlError[] | undefined => {
  const errors = (thrown as { response?: { errors?: GqlError[] } })?.response
    ?.errors;
  return Array.isArray(errors) && errors.length > 0 ? errors : undefined;
};

/**
 * Connection-level failures only (no GraphQL response at all). These stacks cut
 * a request that has not answered within ~5 s (test-suites#563); the shared
 * `graphqlErrorWrapper` retries them for the same reason. A GraphQL ANSWER is
 * never retried — it is the thing under test. A retry cannot fake a pass: if the
 * first attempt did commit, the second one answers with a loud `failed`.
 */
const TRANSPORT_ATTEMPTS = 3;
const TRANSPORT_BACKOFF_MS = 1_000;

export const classify = async <T>(
  gate: readonly string[],
  call: () => Promise<{ data: T }>
): Promise<Outcome<T>> => {
  for (let attempt = 1; ; attempt++) {
    try {
      const { data } = await call();
      return { kind: 'ok', data };
    } catch (thrown) {
      const errors = errorsOf(thrown);
      if (!errors) {
        if (attempt < TRANSPORT_ATTEMPTS) {
          await new Promise(resolve =>
            setTimeout(resolve, TRANSPORT_BACKOFF_MS * attempt)
          );
          continue;
        }
        return {
          kind: 'failed',
          reason: `transport/unknown after ${attempt} attempts: ${(thrown as Error)?.message ?? String(thrown)}`,
          errors: [],
        };
      }
      return judge(gate, errors);
    }
  }
};

const judge = <T>(gate: readonly string[], errors: GqlError[]): Outcome<T> => {
  const authorization = errors.filter(isAuthorizationError);
  if (authorization.some(e => atOrAboveGate(fieldPath(e), gate))) {
    return { kind: 'denied', errors };
  }
  if (authorization.length > 0) {
    return {
      kind: 'failed',
      reason: `authorization error BELOW the gate [${gate.join('.')}] — the action itself was not refused: ${authorization
        .map(e => fieldPath(e).join('.'))
        .join(', ')}`,
      errors,
    };
  }
  return {
    kind: 'failed',
    reason: errors
      .map(e => `${e.extensions?.code ?? 'NO_CODE'}: ${e.message}`)
      .join(' | '),
    errors,
  };
};

/** For assertion messages — short enough to read in a report line. */
export const describeOutcome = (o: Outcome): string =>
  o.kind === 'ok'
    ? 'ok'
    : o.kind === 'denied'
      ? `denied (${o.errors[0]?.extensions?.code}: ${o.errors[0]?.message})`
      : `FAILED — ${o.reason}`;
