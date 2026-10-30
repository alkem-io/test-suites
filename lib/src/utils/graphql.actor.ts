import { TestUser } from "../common/enums/test.user";
import { TestUserManager } from "../scenario/TestUserManager";
import { testConfiguration } from "../config/test.configuration";

/**
 * Who a lib function acts as. Every business-action function in this package
 * takes one of these so a spec never has to know how the server is reached:
 *
 * - a `TestUser` — a shared harness persona; its bearer comes from
 *   `TestUserManager` (the pre-existing convention of `graphqlErrorWrapper`);
 * - `{ bearerToken }` — a disposable identity the spec registered itself and
 *   logged in through `getUserToken(email)`;
 * - `{ cookieHeader }` — a browser session (the BFF `alkemio_session` cookie
 *   of a Playwright context, or one fabricated by `mintBffSession`); the call
 *   goes to the session endpoint `/api/private/graphql`, exactly what a
 *   same-origin `fetch` inside `page.evaluate` reached;
 * - `{ anonymous }` — no credentials, on the private (non-interactive) or
 *   the public endpoint, for negative controls.
 */
export type GraphqlActor =
  | TestUser
  | { bearerToken: string }
  | { cookieHeader: string }
  | { anonymous: "private" | "public" };

export type GraphqlEndpoint = "private" | "session" | "public";

const serverBase = (): string =>
  testConfiguration.endPoints.server.replace(/\/$/, "");

/** The URL each endpoint kind resolves to on the server under test. */
export const graphqlEndpointUrl = (endpoint: GraphqlEndpoint): string => {
  switch (endpoint) {
    case "private":
      return testConfiguration.endPoints.graphql.private;
    case "session":
      return `${serverBase()}/api/private/graphql`;
    case "public":
      return `${serverBase()}/api/public/graphql`;
  }
};

export type ResolvedActor = {
  endpoint: GraphqlEndpoint;
  headers: Record<string, string>;
  /** Set for persona and bearer actors; what the legacy callbacks expect. */
  authToken?: string;
};

export const isTestUser = (actor: GraphqlActor): actor is TestUser =>
  typeof actor === "string";

/** Headers + endpoint for an actor. Throws when a persona has no token yet. */
export const resolveActor = (actor: GraphqlActor): ResolvedActor => {
  if (isTestUser(actor)) {
    const token = TestUserManager.getUserModelByType(actor).authToken;
    if (!token) {
      throw new Error(
        `No auth token for persona ${actor} — was TestUserManager.populateUserModelMap() awaited?`,
      );
    }
    return {
      endpoint: "private",
      headers: { authorization: `Bearer ${token}` },
      authToken: token,
    };
  }
  if ("bearerToken" in actor) {
    return {
      endpoint: "private",
      headers: { authorization: `Bearer ${actor.bearerToken}` },
      authToken: actor.bearerToken,
    };
  }
  if ("cookieHeader" in actor) {
    return { endpoint: "session", headers: { cookie: actor.cookieHeader } };
  }
  return { endpoint: actor.anonymous, headers: {} };
};
