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
    // 2026-07-30 live-verification finding (surfaced by this corrective
    // wave's new `platform-roles-rules` gate track, sec-test-suites-10):
    // `assignPlatformRoleToOrganization`'s resolver now runs
    // `assertOrganizationSurfaceOrFail` (sec-server-6, the org-surface
    // legacy-role-escalation block) BEFORE the shared rule engine's
    // `evaluateGrantOrFail` — every `Platform …` role (not a member of
    // `FEATURE_FAMILY_ROLES`) is rejected THERE, with its own distinct
    // message, so rule 2's `checkHolderKind` branch for this surface is
    // superseded rather than reached. The net effect this test cares about
    // — a Platform role is never actually grantable to an organization — is
    // unchanged; only the literal rejection text moved. Asserting the
    // CURRENT text rather than `checkHolderKind`'s own message (a `server`
    // finding worth raising separately: whether that branch is now dead
    // code for every real caller of this GraphQL surface).
    expect(res.error?.errors[0]?.message).toContain(
      'may not be assigned or removed through the organization surface'
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
    // corr-ts-26 fix: the shared single-role fixtures
    // (`TestUser.PLATFORM_SUPPORT`/`TestUser.PLATFORM_AUDIT_READER`) hold
    // EXACTLY one role each by construction (T003/T004) — a rule-4
    // regression that let this grant SUCCEED would leave the shared fixture
    // holding TWO roles, silently poisoning every other cell/spec that
    // authenticates as it (no revoke-on-success, no residue cleanup covers
    // the 13 role fixtures). Grant the prerequisite role to the disposable
    // `rolesProbeUserId` for the DURATION of this test only, mirroring
    // `flows/rejection-audited.it-spec.ts`'s identical rule-4 test.
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const probeUserId = fixtures.rolesProbeUserId;

    await getGraphqlClient().assignPlatformRoleToUser(
      { roleData: { actorID: probeUserId, role: RoleName.PlatformSupport } },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    try {
      const res = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: probeUserId,
                role: RoleName.PlatformAuditReader,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      );
      expect(res.error?.errors[0]?.message).toContain('mutually exclusive');
    } finally {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          { roleData: { actorID: probeUserId, role: RoleName.PlatformSupport } },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — a correctly-rejected exclusion above means
          // `platform-support` was never displaced, so this always applies
        });
    }
  });

  it('rule 4 (audit-reader-exclusion, direction 2): granting another Platform role to an Audit Reader holder is rejected', async () => {
    // corr-ts-26 fix — same reasoning as direction 1 above, the OTHER way
    // round: grant `platform-audit-reader` to the disposable
    // `rolesProbeUserId` for this test's duration only.
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const probeUserId = fixtures.rolesProbeUserId;

    await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: { actorID: probeUserId, role: RoleName.PlatformAuditReader },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );

    try {
      const res = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: probeUserId,
                role: RoleName.PlatformSupport,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      );
      expect(res.error?.errors[0]?.message).toContain('mutually exclusive');
    } finally {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          {
            roleData: {
              actorID: probeUserId,
              role: RoleName.PlatformAuditReader,
            },
          },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — a correctly-rejected exclusion above means
          // `platform-audit-reader` was never displaced, so this always
          // applies
        });
    }
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

    // corr-ts-14: the ACTOR here must be a DIFFERENT identity from the
    // target — rule 6 (self-assignment, ninth clarification pass) is
    // evaluated FIRST and unconditionally blocks a self-revoke with its own
    // distinct message, which shadowed rule 5 entirely when the fixture
    // removed its own role. `GLOBAL_ADMIN` still reaches `GRANT_GLOBAL_ADMINS`
    // via A1's legacy cascade at Slice A, so it can act here without being
    // the target.
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
      TestUser.GLOBAL_ADMIN
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

  // The DENIED case's audit contrast (T011: written vs. NOT written) needs
  // the MCP audit-read surface — Phase V (this wave's gates are lint + build
  // only, and this repo has no MCP client, T007b/T019).

  it('an account whose marker is cleared can no longer be GRANTED platform-spaces-reader (spec-ts-13 fix)', async () => {
    // spec-ts-13: the deferral reason ("needs a live serviceProfile toggle
    // round trip") does not hold — `grantability.it-spec.ts` already calls
    // `updateUserServiceProfile({serviceProfile: true})` as
    // PLATFORM_ROLES_ADMIN against the live stack, so the toggle surface is
    // wired and exercised in this very project. Uses the disposable
    // `rolesProbeUserId` (corr-ts-19 reasoning — never the shared
    // `targetUserId`, and never `targetUserId`'s own rule-3 probe above,
    // which deliberately never sets the marker at all).
    //
    // Deliberately OUT OF SCOPE (per this fix's own hint): whether clearing
    // the marker auto-REVOKES an already-held `platform-spaces-reader`
    // credential. Nothing in `platform.role.assignment.rules.service.ts`
    // suggests the server does this (rule 3 is a GRANT-time gate, not a
    // standing invariant enforced on every read), and asserting it without
    // evidence would be exactly the kind of undocumented assumption this
    // feature's rule engine exists to avoid encoding informally.
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;

    const markerSet = await getGraphqlClient().updateUserServiceProfile(
      { userData: { ID: fixtures.rolesProbeUserId, serviceProfile: true } },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      markerSet.errors,
      'setting serviceProfile on the disposable rolesProbeUserId target should succeed'
    ).toBeUndefined();

    try {
      const grantWhileMarked = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fixtures.rolesProbeUserId,
                role: RoleName.PlatformSpacesReader,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      );
      expect(grantWhileMarked.error).toBeUndefined();

      await getGraphqlClient()
        .removePlatformRoleFromUser(
          {
            roleData: {
              actorID: fixtures.rolesProbeUserId,
              role: RoleName.PlatformSpacesReader,
            },
          },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — proceed regardless; the re-grant assertion below
          // is what this test is actually about
        });

      const markerCleared = await getGraphqlClient().updateUserServiceProfile(
        { userData: { ID: fixtures.rolesProbeUserId, serviceProfile: false } },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(markerCleared.errors).toBeUndefined();

      const regrantAfterClear = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fixtures.rolesProbeUserId,
                role: RoleName.PlatformSpacesReader,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      );
      expect(regrantAfterClear.error?.errors?.[0]?.message).toContain(
        'may only be granted to a service account'
      );
    } finally {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          {
            roleData: {
              actorID: fixtures.rolesProbeUserId,
              role: RoleName.PlatformSpacesReader,
            },
          },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — a correctly-rejected re-grant means there is
          // nothing to revoke
        });
    }
  });
});

describe('FR-003 one-way assertion (T016)', () => {
  it('platform-users-admin can assign a Feature role', async () => {
    // corr-ts-19: target `fixtures.rolesProbeUserId` (a per-file disposable
    // identity), NEVER `fixtures.targetUserId` (`TestUser.NON_SPACE_MEMBER`)
    // — that fixture is shared and long-lived across 67+ other spec files
    // and every other vitest project, and this grant was never revoked,
    // leaving a permanent `feature-beta-tester` credential on it. Revoked in
    // a `finally` regardless, so a probe assertion failure never leaves the
    // grant behind either.
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    try {
      const res = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: fixtures.rolesProbeUserId,
                role: RoleName.FeatureBetaTester,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_USERS_ADMIN
      );
      expect(res.error).toBeUndefined();
    } finally {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          {
            roleData: {
              actorID: fixtures.rolesProbeUserId,
              role: RoleName.FeatureBetaTester,
            },
          },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — a correctly-rejected grant above means there is
          // nothing to revoke
        });
    }
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
