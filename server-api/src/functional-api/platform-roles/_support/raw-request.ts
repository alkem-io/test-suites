import axios from 'axios';
import { testConfiguration } from '@alkemio/tests-lib';
import type { GqlError } from './outcome';

/**
 * A GraphQL POST that keeps BOTH `data` and `errors`.
 *
 * The shared `graphqlErrorWrapper` drops `data` whenever an error is present,
 * and the generated SDK throws. Neither can express "the server answered with
 * an error AND some rows" — which is exactly what a fail-closed assertion has
 * to be able to see. Also used for the small bespoke reads that do not warrant
 * a codegen document.
 */
export type RawResult<T> = { data: T | null; errors: GqlError[] };

export const rawRequest = async <T = Record<string, unknown>>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<RawResult<T>> => {
  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      // A GraphQL error is an answer to assert on, not a transport failure.
      validateStatus: () => true,
    }
  );

  if (typeof response.data !== 'object' || response.data === null) {
    throw new Error(
      `rawRequest: non-GraphQL response (HTTP ${response.status}): ${String(response.data).slice(0, 200)}`
    );
  }

  return {
    data: (response.data.data ?? null) as T | null,
    errors: (response.data.errors ?? []) as GqlError[],
  };
};

/** Throws on any error — for setup reads that must simply work. */
export const rawRead = async <T = Record<string, unknown>>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> => {
  const { data, errors } = await rawRequest<T>(token, query, variables);
  if (errors.length > 0 || data === null) {
    throw new Error(
      `rawRead failed: ${errors.map(e => `${e.extensions?.code}: ${e.message}`).join(' | ') || 'no data'}`
    );
  }
  return data;
};
