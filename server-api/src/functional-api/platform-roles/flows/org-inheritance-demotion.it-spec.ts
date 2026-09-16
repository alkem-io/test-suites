import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from '../fixtures';
import type { MatrixFixtures } from '../fixtures';
import { isAuthorizationDenial } from '../surface-invocations';

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

/**
 * workspace#027-platform-role-redesign (T019b) — [US3]. FLOW 2: an
 * organization holds a `feature-*` role -> an organization admin/owner
 * INHERITS the feature -> demote that user to associate -> DENIED on the
 * next request, not after the 60s actor-context TTL (FR-002, FR-031).
 *
 * Asserted IMMEDIATELY, with no wait added to make it pass — a sleep would
 * turn the FR-031 assertion into its opposite and would mask a missing
 * `ActorContextCacheService.deleteByActorID` call (server T057), which is
 * the only defect this flow exists to catch.
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

describe('flow 2 — organization inheritance then demotion (T019b, FR-002/FR-031)', () => {
  it('an org admin loses an inherited Feature role on the request immediately following demotion — no TTL wait', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const standingUser = TestUserManager.getUserModelByType(
      TestUser.NON_SPACE_MEMBER
    );

    // The organization holds `feature-organization-creator` (A6's create
    // half — the one census entry this role genuinely owns, T007a).
    await getGraphqlClient().assignPlatformRoleToOrganization(
      {
        roleData: {
          actorID: fixtures.secondOrganizationId,
          role: RoleName.FeatureOrganizationCreator,
        },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    // Organization-roleSet membership (Associate/Admin) is managed by
    // organization standing, not `platform-roles-admin` — that role's scope
    // is PLATFORM role assignment only (the `assignPlatformRoleToOrganization`
    // call above), and this environment's own roleSet authorization rejects
    // `rolesAdminToken` here with `FORBIDDEN_POLICY` for lacking `grant` on
    // an arbitrary organization's roleSet (2026-07-29 live-verification
    // finding — `immediacy.it-spec.ts` hit the identical failure). The
    // legacy GLOBAL_ADMIN fixture retains its root-cascade grant privilege
    // for org-membership management through the end of Slice A
    // (test.user.ts T003), so it is the correct actor for these roleSet
    // mutations.
    const globalAdminToken = TestUserManager.users.globalAdmin.authToken;

    try {
      // Promote to ADMIN — inherits the org's credential.
      await getGraphqlClient().assignRoleToUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Admin,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );

      // Wrapped via `asUser` (`graphqlErrorWrapper`) — the raw generated SDK
      // client throws an uncaught exception on any GraphQL error response
      // instead of returning it as `.error` (2026-07-29 live-verification
      // finding). This call is expected to SUCCEED; wrapping it just means a
      // genuine inheritance-grant failure surfaces as a clean assertion
      // failure instead of an unasserted exception.
      const asAdmin = await asUser(
        token =>
          getGraphqlClient().CreateOrganization(
            {
              organizationData: {
                nameID: `flow2-admin-${Date.now()}`,
                profileData: { displayName: `flow 2 admin probe ${Date.now()}` },
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.NON_SPACE_MEMBER
      );
      expect(
        asAdmin.error,
        'the org admin must inherit the Feature role while holding admin standing'
      ).toBeUndefined();
      const createdId = asAdmin.data?.createOrganization?.id;
      if (createdId) {
        // corr-ts-17 (same defect as immediacy.it-spec.ts): `deleteOrganization`
        // gates on `anyOf[DELETE, DELETE_ORGANIZATION]`, and a single-role
        // `platform-roles-admin` fixture holds NEITHER — so cleaning up with
        // `rolesAdminToken` was itself an authorization failure that threw
        // AFTER the real assertions had already passed. Use `globalAdmin`
        // (still cascade-reachable at Slice A) and make it best-effort: a
        // failed cleanup must never fail the test, but it DOES leave a squatter
        // behind, which is why every probe displayName above is uniquified.
        try {
          await getGraphqlClient().deleteOrganization(
            { deleteData: { ID: createdId } },
            { authorization: `Bearer ${globalAdminToken}` }
          );
        } catch {
          // best-effort cleanup
        }
      }

      // DEMOTE to associate — no sleep, no re-login, no reset in between.
      await getGraphqlClient().removeRoleFromUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Admin,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );

      // DENIED — the very next request. Wrapped via `asUser` for the same
      // raw-throw reason as `asAdmin` above.
      const afterDemotion = await asUser(
        token =>
          getGraphqlClient().CreateOrganization(
            {
              organizationData: {
                nameID: `flow2-demoted-${Date.now()}`,
                profileData: {
                  displayName: `flow 2 demoted probe ${Date.now()}`,
                },
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.NON_SPACE_MEMBER
      );
      expect(
        isAuthorizationDenial(afterDemotion.error?.errors),
        'demotion must deny the very next request — a pass here would mean the actor-context cache was not invalidated (server T057)'
      ).toBe(true);
    } finally {
      await getGraphqlClient().removeRoleFromUser(
        {
          roleData: {
            roleSetID: fixtures.secondOrganizationRoleSetId,
            actorID: standingUser.id,
            role: RoleName.Associate,
          },
        },
        { authorization: `Bearer ${globalAdminToken}` }
      );
      await getGraphqlClient().removePlatformRoleFromOrganization(
        {
          roleData: {
            actorID: fixtures.secondOrganizationId,
            role: RoleName.FeatureOrganizationCreator,
          },
        },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
    }
  });
});
