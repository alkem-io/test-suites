// Resolves a "Cards" fixture persona's exact profile display name from the
// first name quickstart.md §2 actually pins (e.g. "Ada"), instead of a full
// name hardcoded in the spec files.
//
// quickstart.md pins only first names and emails/roles, never surnames — each
// fixture-provisioning run is free to pick its own, and has in practice
// picked different ones across runs (e.g. "Ada Ardent" vs. "Ada Rivera"). A
// spec that hardcodes a full name is tied to one particular run and goes red
// against a correctly re-seeded fixture. Resolving the surname here, once,
// keeps every us*-*.spec.ts file agreeing with whatever fixture is actually
// live, without assuming an email convention quickstart.md never documents
// either.

import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

/**
 * Looks up the one "Cards" fixture user whose profile display name starts
 * with `${firstName} ` and returns that full display name. Throws (rather
 * than returning an unresolved/ambiguous value) when the fixture does not
 * have exactly one such user, so a stale assumption fails loudly in
 * `beforeAll` instead of producing a downstream card-lookup timeout.
 */
export async function resolveFixturePersonaName(
  firstName: string
): Promise<string> {
  const res = await graphqlErrorWrapper(
    authToken =>
      getGraphqlClient().UsersPaginated(
        { first: 25, filter: { displayName: firstName } },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (res.error) {
    throw new Error(
      `resolveFixturePersonaName("${firstName}") failed: ${JSON.stringify(res.error)}`
    );
  }
  const candidates = Array.from(
    new Set(
      (res.data?.usersPaginated.users ?? [])
        .map(u => u.profile?.displayName)
        .filter((name): name is string => !!name && name.startsWith(`${firstName} `))
    )
  );
  if (candidates.length !== 1) {
    throw new Error(
      'Fixture precondition failed: expected exactly one "Cards" fixture user whose ' +
        `displayName starts with "${firstName} ", found ${candidates.length}` +
        (candidates.length ? ` (${candidates.join(', ')})` : '') +
        ". Re-check the Cards fixture (the workspace feature's quickstart.md §2)."
    );
  }
  return candidates[0];
}
