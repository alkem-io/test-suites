import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { isAuthorizationDenial } from './surface-invocations';

/**
 * workspace#027-platform-role-redesign — [US3].
 *
 * T010: all five assignment rules (research D7), each with its OWN distinct
 * error, exercised through the live `assignPlatformRoleToUser` /
 * `assignPlatformRoleToOrganization` / `removePlatformRoleFromUser`
 * surfaces (server `platform.role.assignment.rules.service.ts`,
 * `evaluate()`/`evaluateOrFail()`). Asserted on the RULE-ENGINE error text
 * (`ruleId`'s message), not merely "the call failed" — a bare failure
 * assertion passes identically whether the rule engine or a downstream DB
 * constraint (e.g. `RoleSetPolicyRoleLimitsException` on the holder-kind
 * case) is what actually stopped the grant, which is exactly the
 * "rule engine bypassed" defect this task exists to catch.
 *
 * T011: the A21 service-profile assertions (setting/clearing
 * `user.serviceProfile` denied to everyone but Platform Roles Admin).
 *
 * T016: the FR-003 one-way assertion — Users Admin may assign a `Feature …`
 * role but never a `Platform …` one.
 *
 * **Audit-row assertions are Phase-V-only.** Every rejection here writes a
 * `role_grant_rejected` row (server
 * `platform.role.resolver.mutations.ts#evaluateAndAuditGrant/Revoke`), but
 * this repo's only generic audit-read surface is the MCP `audit-log-analyze`
 * tool, which has no client wired here (T007b/T019 note the same gap for
 * A19). Where a rejection's downstream EFFECT is independently observable
 * through GraphQL (e.g. "the grant did not take effect"), this file asserts
 * that instead of the audit row directly — see `audit-coverage.it-spec.ts`
 * (T014) for the fuller discussion of this limitation.
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

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

describe('assignment rules (T010) — the five rules, each with its own distinct error', () => {
  it('rule 1 (assigner-capability): a role holder with no A1/A2 privilege cannot assign a Platform role', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: fixtures.targetUserId,
              role: RoleName.PlatformResourceAdmin,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_SUPPORT
    );
    expect(res.error?.errors[0]?.message).toContain(
      'required to assign role'
    );
  });

  it('rule 2 (holder-kind): a `Platform …` role may never be granted to an organization', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToOrganization(
          {
            roleData: {
              actorID: fixtures.secondOrganizationId,
              role: RoleName.PlatformSupport,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors[0]?.message).toContain(
      'may not be granted to a organization'
    );
  });

  it('rule 3 (spaces-reader-service-account): platform-spaces-reader may only be granted to a service account', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: fixtures.targetUserId,
              role: RoleName.PlatformSpacesReader,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors[0]?.message).toContain(
      'may only be granted to a service account'
    );
  });

  it('rule 4 (audit-reader-exclusion, direction 1): granting Audit Reader to a holder of another Platform role is rejected', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              // PLATFORM_SUPPORT already holds `platform-support` (T003/T004
              // single-role fixture) — this asserts the OTHER direction of
              // FR-028's bidirectional exclusion.
              actorID: TestUserManager.getUserModelByType(
                TestUser.PLATFORM_SUPPORT
              ).id,
              role: RoleName.PlatformAuditReader,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors[0]?.message).toContain('mutually exclusive');
  });

  it('rule 4 (audit-reader-exclusion, direction 2): granting another Platform role to an Audit Reader holder is rejected', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: TestUserManager.getUserModelByType(
                TestUser.PLATFORM_AUDIT_READER
              ).id,
              role: RoleName.PlatformSupport,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors[0]?.message).toContain('mutually exclusive');
  });

  it('rule 5 (last-roles-admin): the platform must always retain at least one Platform Roles Admin', async () => {
    // T003/T004's PLATFORM_ROLES_ADMIN fixture holds EXACTLY one role
    // (separation of duties). It is NOT assumed to be the platform's only
    // holder of `platform-roles-admin` — on a shared, persistent stack it
    // rarely is (the FR-013b seeded break-glass account and leftover
    // accounts from prior runs are also live holders).
    //
    // CORRECTED (2026-07-29 live-verification finding, test-bug attribution):
    // the previous version hardcoded "removal is rejected", which is only
    // true when the fixture is the SOLE holder. On this persistent stack it
    // routinely is not, so the removal legitimately succeeds and the
    // hardcoded rejection assertion fails for the wrong reason. Rule 5's
    // actual invariant is "the platform never drops to zero holders" — so
    // assert on the live holder COUNT instead of a fixed scenario: read the
    // holder list first (via PLATFORM_AUDIT_READER, whose read access does
    // not depend on the fixture retaining its role), then branch the
    // expectation on whether any OTHER holder currently exists.
    //
    // This fixture is SHARED and PERSISTENT — every other file in this
    // vitest project run (and every future run) authenticates as it. If the
    // fixture turns out to be the sole holder and the SERVER's rule 5 has a
    // bug that lets the removal through anyway, that is not a local
    // failure: every later file acting as TestUser.PLATFORM_ROLES_ADMIN
    // starts failing "Forbidden" for the rest of the run, and the real
    // seeded account stays broken afterward too (exactly what happened on
    // 2026-07-29). This suite cannot fix a server rule-5 bug, but it CAN
    // stop it from cascading: the `finally` below unconditionally
    // re-asserts the fixture's grant — a harmless idempotent no-op when the
    // fixture was never removed, and a same-test repair when it was.
    const rolesAdminId = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).id;
    const auditReaderToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_AUDIT_READER
    ).authToken;
    const holderCount = async () => {
      const holders = await getGraphqlClient().platformRoleSetUsersInRole(
        { role: RoleName.PlatformRolesAdmin },
        { authorization: `Bearer ${auditReaderToken}` }
      );
      return holders.data?.platform.roleSet.usersInRole ?? [];
    };

    const before = await holderCount();
    const otherHoldersBefore = before.filter(u => u.id !== rolesAdminId);
    const isSoleHolder = otherHoldersBefore.length === 0;

    const res = await asUser(
      token =>
        getGraphqlClient().removePlatformRoleFromUser(
          {
            roleData: {
              actorID: rolesAdminId,
              role: RoleName.PlatformRolesAdmin,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    try {
      if (isSoleHolder) {
        // The fixture is, right now, the platform's only Platform Roles
        // Admin — rule 5 MUST reject the removal and the holder count must
        // not move.
        expect(res.error?.errors[0]?.message).toContain(
          'cannot remove the last platform-roles-admin'
        );
        const after = await holderCount();
        expect(after.length).toBe(before.length);
      } else {
        // At least one other holder remains — rule 5 legitimately allows
        // the removal, and the count must drop by exactly one (the
        // fixture, and only the fixture).
        expect(res.error).toBeUndefined();
        const after = await holderCount();
        expect(after.length).toBe(before.length - 1);
        expect(after.some(u => u.id === rolesAdminId)).toBe(false);
      }
    } finally {
      // Self-heal regardless of the branch taken above. Uses GLOBAL_ADMIN
      // as grantor — its legacy root-cascade assign capability does not
      // depend on this fixture at all, so it stays available even in the
      // exact failure mode this guards against.
      try {
        await getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: rolesAdminId,
              role: RoleName.PlatformRolesAdmin,
            },
          },
          {
            authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
          }
        );
      } catch {
        // best-effort — if the fixture never lost the role, re-granting an
        // already-held role is expected to no-op or error harmlessly.
      }
    }
  });
});

describe('service-profile assertions (T011, A21/FR-002)', () => {
  it('setting `serviceProfile` is denied to every role but Platform Roles Admin', async () => {
    // spec-ts-2 (2026-07-30 fix wave): `serviceProfile` carries no GraphQL
    // `@Field()` decorator on the server (`user.interface.ts`) — it cannot
    // be read back directly over this repo's GraphQL-only vantage point.
    // The "separate, fresh-read" assertion the eighth clarification pass
    // asked for is therefore an INDIRECT probe of the marker's real effect:
    // rule 3 (`platform.role.assignment.rules.service.ts`) rejects granting
    // `platform-spaces-reader` to a non-service-account target with a
    // specific, distinct message. Probing that BEFORE and AFTER the denied
    // `updateUser` call proves the marker did not move — the previous
    // version instead read the CALLER's own `me.user.id` before the
    // mutation and asserted only that it was truthy, which could not
    // observe the TARGET's `serviceProfile` at all and would pass
    // identically against a silent partial-apply.
    // Wrapped via `asUser` (`graphqlErrorWrapper`), never the raw generated
    // SDK client directly — the raw client throws an uncaught exception on
    // any GraphQL error response instead of returning it as `.error`
    // (the same 2026-07-29 live-verification finding every other probe in
    // this repo already guards against; this probe was missed in the
    // spec-ts-2 fix wave and reproduced the identical unasserted-exception
    // failure live, 2026-07-30).
    const spacesReaderProbe = () =>
      asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fixtures.targetUserId,
                role: RoleName.PlatformSpacesReader,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      );

    const probeBefore = await spacesReaderProbe();
    expect(probeBefore.error?.errors?.[0]?.message).toContain(
      'may only be granted to a service account'
    );

    const res = await asUser(
      token =>
        getGraphqlClient().updateUser(
          {
            userData: { ID: fixtures.targetUserId, serviceProfile: true },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_SUPPORT
    );
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);

    // Fresh read: the marker did NOT move — the same rule-3 probe,
    // repeated, must still reject the target for the same reason.
    const probeAfter = await spacesReaderProbe();
    expect(probeAfter.error?.errors?.[0]?.message).toContain(
      'may only be granted to a service account'
    );
  });

  it('clearing `serviceProfile` is denied to every role but Platform Roles Admin', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().updateUser(
          {
            userData: { ID: fixtures.targetUserId, serviceProfile: false },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_OPERATIONS_ADMIN
    );
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });

  // The DENIED case's audit contrast (T011: written vs. NOT written) and the
  // "cleared marker can no longer hold platform-spaces-reader" half both
  // need the MCP audit-read surface / a live serviceProfile toggle round
  // trip respectively — Phase V (this wave's gates are lint + build only,
  // and this repo has no MCP client, T007b/T019).
});

describe('FR-003 one-way assertion (T016)', () => {
  it('platform-users-admin can assign a Feature role', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: fixtures.targetUserId,
              role: RoleName.FeatureBetaTester,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    expect(res.error).toBeUndefined();
  });

  it('platform-users-admin is denied assigning a Platform role, with the assigner-capability error', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: fixtures.targetUserId,
              role: RoleName.PlatformResourceAdmin,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    expect(res.error?.errors[0]?.message).toContain(
      'required to assign role'
    );
  });
});
