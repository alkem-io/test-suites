import { getGraphqlClient, setAuthHeader, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const fullConfiguration = async () => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.fullConfiguration({}, setAuthHeader(authToken));

  return graphqlErrorWrapper(callback);
};

// Thin wrapper around the BANNER-scoped `defaultVisualTypeConstraints` query
// (test-suites#10178 — the cross-repo contract the client's crop dialog
// clamps against). Deliberately NOT added as a test inside
// `configuration.it-spec.ts`: that file carries a `test.only`, so a sibling
// test there would never run. See `visual/banner-visual-constraints.it-spec.ts`.
export const bannerVisualConstraints = async (
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.bannerVisualConstraints({}, setAuthHeader(authToken));

  return graphqlErrorWrapper(callback, userRole);
};
