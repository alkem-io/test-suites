import http from 'http';
import https from 'https';
import crossFetch from 'cross-fetch';
import { testConfiguration } from '../config/test.configuration';
import { getSdk, Sdk } from '../core/generated/graphql';
import { GraphQLClient } from 'graphql-request';
import { GraphqlEndpoint, graphqlEndpointUrl } from './graphql.actor';

/**
 * Dedicated keep-alive agents for the GraphQL client — never the shared
 * `http(s).globalAgent` pool.
 *
 * graphql-request fetches through node-fetch (cross-fetch), which by default
 * draws sockets from Node's global agent pool: keep-alive with a 5 s idle
 * timeout since Node 19. The harness drives axios through that same pool
 * (`non-interactive-login` token minting, Kratos, MailSlurper), and axios
 * leaves a 'timeout' listener on every socket it hands back that destroys the
 * socket on the next timeout event. When node-fetch then reuses such a socket
 * for a request the server takes longer than 5 s to answer — createSubspace /
 * createSpace under nightly load — the socket is destroyed mid-request:
 * `FetchError: ... socket hang up` after ~5003 ms. The wrapper retried, the
 * server had already committed, the retry came back `nameID is already taken`
 * (BAD_USER_INPUT, unlogged) and the spec saw `undefined`: the five
 * journey/subspace reds and the flaky licence-plus red of every nightly from
 * 2026-10-08 to 2026-10-26. Fresh sockets, curl and undici were never cut,
 * which is why the same mutation always succeeded outside the harness.
 *
 * Reproduced on 2026-10-26 against test-alkem.io: axios login → three
 * concurrent 8–13 s createSubspace calls through the default client → the one
 * on the reused socket hangs up at 5003 ms; with a private agent all three
 * complete. node-fetch accepts `agent` as a function of the parsed URL, so one
 * wrapper serves both the http:// local stack and the https:// clusters.
 */
const keepAliveAgents = {
  http: new http.Agent({ keepAlive: true }),
  https: new https.Agent({ keepAlive: true }),
};

const selectAgent = (parsedUrl: { protocol?: string | null }) =>
  parsedUrl.protocol === 'http:'
    ? keepAliveAgents.http
    : keepAliveAgents.https;

const fetchWithOwnAgent: typeof crossFetch = (url, init) =>
  crossFetch(url, { ...init, agent: selectAgent } as RequestInit);

let graphqlSdkClient: Sdk;

export const getGraphqlClient = (): Sdk => {
  if (!graphqlSdkClient) {
    const graphqlClient = new GraphQLClient(
      testConfiguration.endPoints.graphql.private,
      { fetch: fetchWithOwnAgent },
    );
    graphqlSdkClient = getSdk(graphqlClient);
  }
  return graphqlSdkClient;
};

/**
 * One SDK per endpoint kind, lazily built on the same private keep-alive
 * agents. `private` is the non-interactive bearer endpoint (the one
 * `getGraphqlClient()` has always targeted); `session` is the BFF
 * cookie-session endpoint a browser talks to; `public` is the anonymous one.
 * Used by `runAs` so a lib function can act as a persona, a disposable
 * user's bearer, a browser session or nobody — see `utils/graphql.actor.ts`.
 */
const sdkByEndpoint = new Map<GraphqlEndpoint, Sdk>();

export const getGraphqlClientFor = (endpoint: GraphqlEndpoint): Sdk => {
  if (endpoint === 'private') return getGraphqlClient();
  let sdk = sdkByEndpoint.get(endpoint);
  if (!sdk) {
    sdk = getSdk(
      new GraphQLClient(graphqlEndpointUrl(endpoint), {
        fetch: fetchWithOwnAgent,
      }),
    );
    sdkByEndpoint.set(endpoint, sdk);
  }
  return sdk;
};
