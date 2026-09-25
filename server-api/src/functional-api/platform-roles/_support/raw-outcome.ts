import { classify } from './outcome';
import type { Outcome } from './outcome';
import { rawRequest } from './raw-request';

/**
 * A raw GraphQL call judged by the suite's ONE classifier — so a rule spec
 * says `denied` and means exactly what a role spec means: an authorization
 * error at (or above) the gate, never "some error came back".
 */
export const rawOutcome = <T = Record<string, unknown>>(
  gate: readonly string[],
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<Outcome<T | null>> =>
  classify(gate, async () => {
    const { data, errors } = await rawRequest<T>(token, query, variables);
    if (errors.length > 0) throw { response: { errors } };
    return { data };
  });
