import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { TARGET_ROLES } from './role-action-matrix.data';
import { isAuthorizationDenial } from './surface-invocations';

/**
 * workspace#027-platform-role-redesign — [US4/US3].
 *
 * T012 (SC-009): every role in the target model is grantable AND revocable
 * through the platform's own assignment surface to the holder kinds its set
 * allows, and a freshly-granted holder actually receives the capability.
 * The service-account boot path and the "seeding is not a bypass" negative
 * case (FR-013) both need a fresh stack start — Phase V (research D25; this
 * wave's gates are lint + build only, and standing rules forbid booting a
 * stack here).
 *
 * T018/T018a (FR-032/SC-017): holder-list read partitioning by role SET —
 * `Platform …` lists readable by `platform-roles-admin` +
 * `platform-audit-reader` only; `Feature …` lists ALSO readable by
 * `platform-users-admin`; a MIXED list naming both a `feature-*` and a
 * `platform-*` role is rejected wholesale (fail-closed), never a partial
 * Feature-only result.
 *
 * T019 (FR-028/SC-014): the audit trail is readable by `platform-audit-reader`
 * alone — denied to every other role, INCLUDING Platform Roles Admin (the
 * D23 capability withdrawal). All three A19 surfaces: the MCP tool
 * (no client wired in this repo — Phase V, same gap noted in T007b) and the
 * two GraphQL fields, asserted here.
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

const FEATURE_ROLES: readonly RoleName[] = [
  RoleName.FeatureBetaTester,
  RoleName.FeatureOrganizationCreator,
  RoleName.FeatureVirtualAssistant,
];

describe('grantability (T012, SC-009) — every target role is grantable + revocable through the platform surface', () => {
  it('every one of the 13 target roles round-trips: grant -> holder list shows it -> revoke -> holder list no longer shows it', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;

    for (const role of TARGET_ROLES) {
      // `platform-spaces-reader` is the one role this loop cannot grant to
      // `fixtures.targetUserId` unconditionally (corr-ts-2, 2026-07-30 fix
      // wave): rule 3 (`assignment-rules.it-spec.ts`) rejects it for any
      // holder whose `serviceProfile` is not `true`. Route it at a
      // DISPOSABLE target instead of flipping the marker on the shared
      // `NON_SPACE_MEMBER` fixture — that fixture's `serviceProfile` staying
      // `false` is exactly what `assignment-rules.it-spec.ts`'s rule-3
      // DENIAL test depends on.
      const isSpacesReader = role === RoleName.PlatformSpacesReader;
      const targetId = isSpacesReader
        ? fixtures.rolesProbeUserId
        : fixtures.targetUserId;

      if (isSpacesReader) {
        // `updateUserServiceProfile`, not the heavy `updateUser` — see
        // `surface-invocations.ts`'s A21 helper for why: the full
        // `UserData` fragment echoes the target's private `settings`,
        // independently privilege-gated, and failing THAT read must not
        // read as this write being rejected.
        const markerSet = await getGraphqlClient().updateUserServiceProfile(
          { userData: { ID: targetId, serviceProfile: true } },
          { authorization: `Bearer ${rolesAdminToken}` }
        );
        expect(
          markerSet.errors,
          'setting serviceProfile on the disposable spaces-reader target should succeed'
        ).toBeUndefined();
      }

      const grant = await getGraphqlClient().assignPlatformRoleToUser(
        { roleData: { actorID: targetId, role } },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(grant.errors, `grant of ${role} should succeed`).toBeUndefined();

      const holders = await getGraphqlClient().platformRoleSetUsersInRole(
        { role },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(
        holders.data?.platform.roleSet.usersInRole.some(u => u.id === targetId),
        `freshly-granted holder should appear in ${role}'s holder list`
      ).toBe(true);

      const revoke = await getGraphqlClient().removePlatformRoleFromUser(
        { roleData: { actorID: targetId, role } },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(revoke.errors, `revoke of ${role} should succeed`).toBeUndefined();
    }
  });

  it('each `feature-*` role is grantable and revocable to an ORGANIZATION holder', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;

    for (const role of FEATURE_ROLES) {
      const grant = await getGraphqlClient().assignPlatformRoleToOrganization(
        {
          roleData: { actorID: fixtures.secondOrganizationId, role },
        },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(
        grant.errors,
        `organization-target grant of ${role} should succeed`
      ).toBeUndefined();

      const revoke = await getGraphqlClient().removePlatformRoleFromOrganization(
        {
          roleData: { actorID: fixtures.secondOrganizationId, role },
        },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(
        revoke.errors,
        `organization-target revoke of ${role} should succeed`
      ).toBeUndefined();
      // The organization-subject audit row (FR-026) is Phase-V-only — no
      // generic audit-read surface exists in this repo (see file header).
    }
  });

  // Service-account boot path + "seeding is not a bypass" (FR-013): both
  // need a fresh stack start (research D25) — Phase V.
});

describe('self-assignment denial (T012a, spec-ts-9, FR-015)', () => {
  // Rule 6 (self-assignment, ninth clarification pass) shipped server-side
  // and enforced FIRST in `evaluate()`, but had ZERO coverage anywhere in
  // this repo — nothing would notice a regression that dropped
  // `checkSelfAssignment()` entirely. Live at stage A (the block is
  // enforced by the rule engine itself, not by the absence of a legacy
  // grant, so it is not one of D18's meaningless-before-Slice-B denials).
  const rolesAdmin = () =>
    TestUserManager.getUserModelByType(TestUser.PLATFORM_ROLES_ADMIN);

  it('a Platform Roles Admin cannot grant itself a Platform role — rejected with the separation-of-duties error, and the grant does not take effect', async () => {
    const admin = rolesAdmin();
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: { actorID: admin.id, role: RoleName.PlatformSupport },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors?.[0]?.message).toContain('self-assignment');
    expect(res.error?.errors?.[0]?.message).toContain('is blocked');

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformSupport },
      { authorization: `Bearer ${admin.authToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(u => u.id === admin.id),
      'the self-grant must not have taken effect'
    ).toBe(false);
  });

  it('a Platform Roles Admin cannot grant itself a Feature role either', async () => {
    const admin = rolesAdmin();
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: { actorID: admin.id, role: RoleName.FeatureBetaTester },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors?.[0]?.message).toContain('self-assignment');
    expect(res.error?.errors?.[0]?.message).toContain('is blocked');

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.FeatureBetaTester },
      { authorization: `Bearer ${admin.authToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(u => u.id === admin.id)
    ).toBe(false);
  });

  it('a Platform Roles Admin cannot revoke its OWN platform-roles-admin role via self-revocation', async () => {
    const admin = rolesAdmin();
    const res = await asUser(
      token =>
        getGraphqlClient().removePlatformRoleFromUser(
          {
            roleData: { actorID: admin.id, role: RoleName.PlatformRolesAdmin },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors?.[0]?.message).toContain('self-assignment');
    expect(res.error?.errors?.[0]?.message).toContain('is blocked');

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformRolesAdmin },
      { authorization: `Bearer ${admin.authToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(u => u.id === admin.id),
      'the fixture must still hold platform-roles-admin — self-revoke must not have taken effect'
    ).toBe(true);
  });

  it('the two-person path works: a Platform Roles Admin CAN grant platform-roles-admin to a DIFFERENT person', async () => {
    // Not the bootstrap-seed path (FR-013b is exempt by design and out of
    // scope here — this repo cannot restart the stack, research D25) — an
    // ordinary, live grant from one Roles Admin to a genuinely different
    // target, which rule 6 must NOT block.
    const admin = rolesAdmin();
    const probeId = fixtures.rolesProbeUserId;
    const grant = await getGraphqlClient().assignPlatformRoleToUser(
      { roleData: { actorID: probeId, role: RoleName.PlatformRolesAdmin } },
      { authorization: `Bearer ${admin.authToken}` }
    );
    try {
      expect(
        grant.errors,
        'a non-self grant of the same role the tests above block for self must succeed'
      ).toBeUndefined();
      const holders = await getGraphqlClient().platformRoleSetUsersInRole(
        { role: RoleName.PlatformRolesAdmin },
        { authorization: `Bearer ${admin.authToken}` }
      );
      expect(
        holders.data?.platform.roleSet.usersInRole.some(u => u.id === probeId)
      ).toBe(true);
    } finally {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          { roleData: { actorID: probeId, role: RoleName.PlatformRolesAdmin } },
          { authorization: `Bearer ${admin.authToken}` }
        )
        .catch(() => {
          // best-effort cleanup
        });
    }
  });
});

describe('holder-list read partitioning (T018/T018a, FR-032/SC-017)', () => {
  it('`Platform …` holder lists: readable by platform-roles-admin', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetUsersInRole(
          { role: RoleName.PlatformSupport },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error).toBeUndefined();
  });

  it('`Platform …` holder lists: readable by platform-audit-reader', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetUsersInRole(
          { role: RoleName.PlatformSupport },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_AUDIT_READER
    );
    expect(res.error).toBeUndefined();
  });

  it('`Platform …` holder lists: denied to platform-users-admin', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetUsersInRole(
          { role: RoleName.PlatformSupport },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    // sec-test-suites-3: assert an AUTHORIZATION denial specifically
    // (FORBIDDEN/FORBIDDEN_POLICY), not merely "any error" — a bare
    // failure passes identically against a validation/not-found error.
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });

  it('`Platform …` holder lists: denied to every other role (representative: platform-support)', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetUsersInRole(
          { role: RoleName.PlatformSupport },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_SUPPORT
    );
    // sec-test-suites-3: assert an AUTHORIZATION denial specifically
    // (FORBIDDEN/FORBIDDEN_POLICY), not merely "any error" — a bare
    // failure passes identically against a validation/not-found error.
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });

  it('`Feature …` holder lists: readable by platform-roles-admin, platform-audit-reader AND platform-users-admin', async () => {
    for (const caller of [
      TestUser.PLATFORM_ROLES_ADMIN,
      TestUser.PLATFORM_AUDIT_READER,
      TestUser.PLATFORM_USERS_ADMIN,
    ]) {
      const res = await asUser(
        token =>
          getGraphqlClient().platformRoleSetUsersInRole(
            { role: RoleName.FeatureBetaTester },
            { authorization: `Bearer ${token}` }
          ),
        caller
      );
      expect(res.error, `${caller} should read the Feature holder list`).toBeUndefined();
    }
  });

  it('`Feature …` holder lists: still reachable, not accidentally broken by the re-anchoring', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetUsersInRoles(
          { roles: [RoleName.FeatureBetaTester] },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    expect(res.error).toBeUndefined();
  });

  it('all four holder-list fields are covered (usersInRole/usersInRoles/organizationsInRole/organizationsInRoles) — Platform payload', async () => {
    const token = TestUserManager.getUserModelByType(TestUser.PLATFORM_ROLES_ADMIN)
      .authToken;
    const [usersInRole, usersInRoles, orgsInRole, orgsInRoles] =
      await Promise.all([
        getGraphqlClient().platformRoleSetUsersInRole(
          { role: RoleName.PlatformSupport },
          { authorization: `Bearer ${token}` }
        ),
        getGraphqlClient().platformRoleSetUsersInRoles(
          { roles: [RoleName.PlatformSupport] },
          { authorization: `Bearer ${token}` }
        ),
        getGraphqlClient().platformRoleSetOrganizationsInRole(
          { role: RoleName.FeatureOrganizationCreator },
          { authorization: `Bearer ${token}` }
        ),
        getGraphqlClient().platformRoleSetOrganizationsInRoles(
          { roles: [RoleName.FeatureOrganizationCreator] },
          { authorization: `Bearer ${token}` }
        ),
      ]);
    expect(usersInRole.errors).toBeUndefined();
    expect(usersInRoles.errors).toBeUndefined();
    expect(orgsInRole.errors).toBeUndefined();
    expect(orgsInRoles.errors).toBeUndefined();
  });

  it('T018a: a MIXED usersInRoles call (one feature-* + one platform-*) is rejected wholesale, not partially satisfied', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetUsersInRoles(
          {
            roles: [RoleName.FeatureBetaTester, RoleName.PlatformSupport],
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    // Assert on the DATA, not only the error — a partial-result
    // implementation would pass an error-only assertion identically.
    // sec-test-suites-3: assert an AUTHORIZATION denial specifically
    // (FORBIDDEN/FORBIDDEN_POLICY), not merely "any error" — a bare
    // failure passes identically against a validation/not-found error.
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
    expect(res.data?.platform.roleSet.usersInRoles ?? []).toEqual([]);
  });

  it('T018a: a MIXED organizationsInRoles call is rejected wholesale too', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().platformRoleSetOrganizationsInRoles(
          {
            roles: [
              RoleName.FeatureOrganizationCreator,
              RoleName.PlatformSupport,
            ],
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    // sec-test-suites-3: assert an AUTHORIZATION denial specifically
    // (FORBIDDEN/FORBIDDEN_POLICY), not merely "any error" — a bare
    // failure passes identically against a validation/not-found error.
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
    expect(res.data?.platform.roleSet.organizationsInRoles ?? []).toEqual([]);
  });
});

describe('audit-read (T019, FR-028/SC-014)', () => {
  it('platform-audit-reader can read latestUserEmailChangeAuditEntry', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().latestUserEmailChangeAuditEntry(
          { userID: fixtures.targetUserId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_AUDIT_READER
    );
    expect(res.error).toBeUndefined();
  });

  it('platform-audit-reader can read userEmailChangeAuditEntries', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().userEmailChangeAuditEntries(
          { userID: fixtures.targetUserId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_AUDIT_READER
    );
    expect(res.error).toBeUndefined();
  });

  it('platform-users-admin is DENIED latestUserEmailChangeAuditEntry — the D23 capability withdrawal', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().latestUserEmailChangeAuditEntry(
          { userID: fixtures.targetUserId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    // sec-test-suites-3: assert an AUTHORIZATION denial specifically
    // (FORBIDDEN/FORBIDDEN_POLICY), not merely "any error" — a bare
    // failure passes identically against a validation/not-found error.
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });

  it('platform-users-admin is DENIED userEmailChangeAuditEntries too', async () => {
    const res = await asUser(
      token =>
        getGraphqlClient().userEmailChangeAuditEntries(
          { userID: fixtures.targetUserId },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_USERS_ADMIN
    );
    // sec-test-suites-3: assert an AUTHORIZATION denial specifically
    // (FORBIDDEN/FORBIDDEN_POLICY), not merely "any error" — a bare
    // failure passes identically against a validation/not-found error.
    expect(isAuthorizationDenial(res.error?.errors)).toBe(true);
  });

  it('platform-roles-admin is DENIED both audit-read GraphQL fields too — audit read belongs to platform-audit-reader ALONE', async () => {
    const [a, b] = await Promise.all([
      asUser(
        token =>
          getGraphqlClient().latestUserEmailChangeAuditEntry(
            { userID: fixtures.targetUserId },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      ),
      asUser(
        token =>
          getGraphqlClient().userEmailChangeAuditEntries(
            { userID: fixtures.targetUserId },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      ),
    ]);
    expect(isAuthorizationDenial(a.error?.errors)).toBe(true);
    expect(isAuthorizationDenial(b.error?.errors)).toBe(true);
  });

  // The third A19 surface — the MCP `audit-log-analyze` tool — has no
  // client wired in this repo (T007b's `surface-invocations.ts` header;
  // Phase V). The trail's PII-masking and unwritable-from-outside
  // properties are likewise not independently verifiable from this repo's
  // GraphQL-only vantage point.
});
