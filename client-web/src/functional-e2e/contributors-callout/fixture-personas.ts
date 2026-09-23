// Resolves a "Cards" fixture persona's exact profile display name and/or
// email from the first name quickstart.md §2 actually pins (e.g. "Ada"),
// instead of a full name or email hardcoded in the spec files.
//
// quickstart.md pins only first names and roles, never surnames or emails —
// each fixture-provisioning run is free to pick its own of either, and has
// in practice picked different ones across runs (e.g. "Ada Ardent" vs. "Ada
// Rivera", or a "nomad@cards-fixture.example" placeholder vs. the real
// "cards-nomad@alkem.io" a run actually provisions). A spec that hardcodes a
// full name or an email is tied to one particular run and goes red against a
// correctly re-seeded fixture. Resolving both here, once, keeps every
// us*-*.spec.ts file agreeing with whatever fixture is actually live,
// without assuming a naming/email convention quickstart.md never documents.

import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

interface FixturePersonaCandidate {
  displayName: string;
  email?: string;
}

/**
 * Runs the shared `UsersPaginated` lookup (as admin, which can read email)
 * filtered by `filterValue`, then keeps only the users whose profile display
 * name satisfies `matches`, deduplicated by display name.
 */
async function findFixturePersonaCandidates(
  filterValue: string,
  matches: (displayName: string) => boolean
): Promise<FixturePersonaCandidate[]> {
  const res = await graphqlErrorWrapper(
    authToken =>
      getGraphqlClient().UsersPaginated(
        { first: 25, filter: { displayName: filterValue } },
        { authorization: `Bearer ${authToken}` }
      ),
    TestUser.GLOBAL_ADMIN
  );
  if (res.error) {
    throw new Error(
      `Fixture persona lookup ("${filterValue}") failed: ${JSON.stringify(res.error)}`
    );
  }
  const seen = new Map<string, FixturePersonaCandidate>();
  for (const u of res.data?.usersPaginated.users ?? []) {
    const displayName = u.profile?.displayName;
    if (displayName && matches(displayName)) {
      seen.set(displayName, { displayName, email: u.email ?? undefined });
    }
  }
  return Array.from(seen.values());
}

/**
 * Throws (rather than returning an unresolved/ambiguous value) when
 * `candidates` does not have exactly one entry, so a stale fixture
 * assumption fails loudly in `beforeAll` instead of producing a downstream
 * card-lookup or sign-in timeout.
 */
function requireExactlyOneCandidate(
  candidates: FixturePersonaCandidate[],
  description: string
): FixturePersonaCandidate {
  if (candidates.length !== 1) {
    throw new Error(
      'Fixture precondition failed: expected exactly one "Cards" fixture user whose ' +
        `${description}, found ${candidates.length}` +
        (candidates.length
          ? ` (${candidates.map(c => c.displayName).join(', ')})`
          : '') +
        ". Re-check the Cards fixture (the workspace feature's quickstart.md §2)."
    );
  }
  return candidates[0];
}

/**
 * Looks up the one "Cards" fixture user whose profile display name starts
 * with `${firstName} ` and returns that full display name.
 */
export async function resolveFixturePersonaName(
  firstName: string
): Promise<string> {
  const candidates = await findFixturePersonaCandidates(firstName, name =>
    name.startsWith(`${firstName} `)
  );
  return requireExactlyOneCandidate(
    candidates,
    `displayName starts with "${firstName} "`
  ).displayName;
}

/**
 * Looks up the one "Cards" fixture user whose profile display name contains
 * `token` and returns that full display name. For personas whose pinned
 * quickstart.md text is not "<FirstName> <Surname>" shaped — e.g. "Quiet
 * Quinn", "Tag-heavy Tess", "member-01", "nomad" — `resolveFixturePersonaName`'s
 * `${firstName} ` prefix match doesn't apply, so this resolves by a stable
 * substring instead (still never a hardcoded full name in a spec file).
 */
export async function resolveFixturePersonaNameContaining(
  token: string
): Promise<string> {
  const candidates = await findFixturePersonaCandidates(token, name =>
    name.includes(token)
  );
  return requireExactlyOneCandidate(
    candidates,
    `displayName contains "${token}"`
  ).displayName;
}

/**
 * Looks up the one "Cards" fixture user whose profile display name starts
 * with `${firstName} ` and returns that user's email — resolved live from
 * the platform the same way `resolveFixturePersonaName` resolves the
 * display name, since quickstart.md pins neither a persona's surname nor
 * its email and each fixture-provisioning run is free to generate its own.
 */
export async function resolveFixturePersonaEmail(
  firstName: string
): Promise<string> {
  const candidates = await findFixturePersonaCandidates(firstName, name =>
    name.startsWith(`${firstName} `)
  );
  const match = requireExactlyOneCandidate(
    candidates,
    `displayName starts with "${firstName} "`
  );
  if (!match.email) {
    throw new Error(
      `resolveFixturePersonaEmail("${firstName}") found "${match.displayName}" but the platform returned no email for it.`
    );
  }
  return match.email;
}

/**
 * Same as `resolveFixturePersonaEmail`, for personas resolved by substring
 * (e.g. "nomad", which — like "Quiet Quinn" or "member-01" — is not a
 * "<FirstName> <Surname>" shaped display name).
 */
export async function resolveFixturePersonaEmailContaining(
  token: string
): Promise<string> {
  const candidates = await findFixturePersonaCandidates(token, name =>
    name.includes(token)
  );
  const match = requireExactlyOneCandidate(
    candidates,
    `displayName contains "${token}"`
  );
  if (!match.email) {
    throw new Error(
      `resolveFixturePersonaEmailContaining("${token}") found "${match.displayName}" but the platform returned no email for it.`
    );
  }
  return match.email;
}
