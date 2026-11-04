import axios from 'axios';
import { testConfiguration } from '../config/test.configuration';
import { GraphqlActor, graphqlEndpointUrl, resolveActor } from './graphql.actor';

/**
 * POST an inline GraphQL document to the private endpoint with arbitrary
 * headers — a bearer token, a `Cookie` header, both, or neither. Never throws
 * on a non-2xx: the status/body pair IS the assertion surface.
 *
 * `graphqlErrorWrapper` (this package's usual entry point) only ever attaches
 * a `TestUser` persona's bearer, which cannot represent a freshly registered
 * disposable user or a fabricated BFF cookie session — both of which
 * 054-delete-own-account's self-branch it-specs need. Same rationale as
 * `server-api/.../graphql-guard/me-degradation.request.params.ts`'s
 * `postGraphqlRaw`, generalised to lib (T301) and to arbitrary headers rather
 * than a single bearer, so it also covers the cookie-session case.
 */
export type RawGraphqlResponse<TData> = {
  status: number;
  body: {
    data?: TData;
    errors?: Array<Record<string, unknown>>;
  };
  /** The serialised body, for assertions that scan for leaked strings. */
  raw: string;
};

export const postGraphqlRaw = async <TData>(
  query: string,
  options?: {
    variables?: Record<string, unknown>;
    /** Sent as `Authorization: Bearer <token>` when present. */
    bearerToken?: string;
    /** Sent verbatim as the `Cookie` header — e.g.
     * `<cookieName>=s:<sid>.<hmac>` from `mintBffSession`. */
    cookieHeader?: string;
  }
): Promise<RawGraphqlResponse<TData>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (options?.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }
  if (options?.cookieHeader) {
    headers.Cookie = options.cookieHeader;
  }

  const response = await axios.post(
    testConfiguration.endPoints.graphql.private,
    { query, variables: options?.variables },
    { headers, validateStatus: () => true }
  );

  return {
    status: response.status,
    body: response.data,
    raw: JSON.stringify(response.data),
  };
};

/**
 * `postGraphqlRaw` for any `GraphqlActor`: the document goes to the endpoint
 * the actor implies (bearer → non-interactive, cookie → session, anonymous →
 * private or public) with the matching header. For the few lib-owned
 * documents the generated SDK cannot carry (schema introspection, multipart
 * uploads) and for callers that assert on the HTTP status itself.
 */
export const postGraphqlRawAs = async <TData>(
  actor: GraphqlActor,
  query: string,
  variables?: Record<string, unknown>
): Promise<RawGraphqlResponse<TData>> => {
  const resolved = resolveActor(actor);
  const response = await axios.post(
    graphqlEndpointUrl(resolved.endpoint),
    { query, variables },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...resolved.headers,
      },
      validateStatus: () => true,
    }
  );
  return {
    status: response.status,
    body: response.data,
    raw: JSON.stringify(response.data),
  };
};
