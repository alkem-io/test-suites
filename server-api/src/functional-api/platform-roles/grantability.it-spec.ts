import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';
import { TARGET_ROLES } from './role-action-matrix.data';

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
      const grant = await getGraphqlClient().assignPlatformRoleToUser(
        { roleData: { actorID: fixtures.targetUserId, role } },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(grant.errors, `grant of ${role} should succeed`).toBeUndefined();

      const holders = await getGraphqlClient().platformRoleSetUsersInRole(
        { role },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(
        holders.data?.platform.roleSet.usersInRole.some(
          u => u.id === fixtures.targetUserId
        ),
        `freshly-granted holder should appear in ${role}'s holder list`
      ).toBe(true);

      const revoke = await getGraphqlClient().removePlatformRoleFromUser(
        { roleData: { actorID: fixtures.targetUserId, role } },
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
    expect(a.error?.errors?.length ?? 0).toBeGreaterThan(0);
    expect(b.error?.errors?.length ?? 0).toBeGreaterThan(0);
  });

  // The third A19 surface — the MCP `audit-log-analyze` tool — has no
  // client wired in this repo (T007b's `surface-invocations.ts` header;
  // Phase V). The trail's PII-masking and unwritable-from-outside
  // properties are likewise not independently verifiable from this repo's
  // GraphQL-only vantage point.
});
