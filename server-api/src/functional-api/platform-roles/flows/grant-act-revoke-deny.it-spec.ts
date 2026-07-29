import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from '../fixtures';
import type { MatrixFixtures } from '../fixtures';

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

/**
 * workspace#027-platform-role-redesign (T019a) — [US3]. FLOW 1: grant a
 * role -> the holder performs its OWNED action -> revoke -> the VERY NEXT
 * request is denied, with no authorization reset, re-login or sleep between
 * the last two steps (FR-031, SC-016).
 *
 * Distinct from `immediacy.it-spec.ts` (T013): immediacy asserts the timing
 * property on one surface in isolation; this asserts the WHOLE lifecycle
 * (grant -> act -> revoke -> deny) holds together as one continuous flow,
 * which is what FR-024 calls out as structurally inexpressible by a
 * single-call matrix cell.
 */

let fixtures: MatrixFixtures;

beforeAll(async () => {
  fixtures = await buildMatrixFixtures();
}, 300_000);

afterAll(async () => {
  if (fixtures) {
    await teardownMatrixFixtures(fixtures);
  }
});

describe('flow 1 — grant, act, revoke, deny (T019a, FR-031/SC-016)', () => {
  it('the full lifecycle holds together with no gap for an authorization reset, re-login or sleep to hide behind', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const holder = TestUserManager.getUserModelByType(
      TestUser.NON_SPACE_MEMBER
    );

    // GRANT
    const grant = await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: { actorID: fixtures.targetUserId, role: RoleName.PlatformAuditReader },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(grant.errors).toBeUndefined();

    // ACT — the holder performs its OWNED action (A19's read family).
    const act = await getGraphqlClient().userEmailChangeAuditEntries(
      { userID: fixtures.targetUserId },
      { authorization: `Bearer ${holder.authToken}` }
    );
    expect(act.errors).toBeUndefined();

    // REVOKE
    const revoke = await getGraphqlClient().removePlatformRoleFromUser(
      {
        roleData: { actorID: fixtures.targetUserId, role: RoleName.PlatformAuditReader },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(revoke.errors).toBeUndefined();

    // DENY — the VERY NEXT request, no wait of any kind in between. Wrapped
    // via `asUser` (`graphqlErrorWrapper`) — the raw generated SDK client
    // throws an uncaught exception on any GraphQL error response instead of
    // returning it as `.error` (2026-07-29 live-verification finding).
    const deny = await asUser(
      token =>
        getGraphqlClient().userEmailChangeAuditEntries(
          { userID: fixtures.targetUserId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.NON_SPACE_MEMBER
    );
    expect(
      deny.error?.errors?.length ?? 0,
      'the request immediately following a revoke must be denied — no gap for a cache/reset to hide behind'
    ).toBeGreaterThan(0);
  });
});
