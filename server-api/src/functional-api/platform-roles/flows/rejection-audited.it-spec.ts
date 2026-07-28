import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { buildMatrixFixtures, teardownMatrixFixtures } from '../fixtures';
import type { MatrixFixtures } from '../fixtures';

/**
 * workspace#027-platform-role-redesign (T019c) — [US3]. FLOW 5: an
 * assignment rejected by each of the five rules writes its
 * `role_grant_rejected` audit row naming the violated rule in
 * `details.rejectedRule`, and the grant did NOT take effect (FR-018
 * outcome coverage, FR-027). Extends `assignment-rules.it-spec.ts`'s
 * error-text assertions with the RECORD half — the trail is the control,
 * so a rejection nobody can find afterwards is the same blind spot as an
 * unlogged grant.
 *
 * **The record half is not independently verifiable from this repo**: the
 * only generic audit-read surface is the MCP `audit-log-analyze` tool, with
 * no client wired here (T007b/T019/`audit-coverage.it-spec.ts`'s shared
 * note). This file therefore asserts the two halves this repo CAN prove for
 * every one of the five rules — (1) the rejection's error text names the
 * violated rule, distinctly per rule, and (2) the grant provably did not
 * take effect — and states the record-write gap explicitly rather than
 * asserting something it cannot check.
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

describe('flow 5 — every rejection is distinctly attributable and takes no effect (T019c)', () => {
  it('rule 1 (assigner-capability) rejection: distinct error, and the target gains no role', async () => {
    const res = await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: {
          actorID: fixtures.targetUserId,
          role: RoleName.PlatformResourceAdmin,
        },
      },
      {
        authorization: `Bearer ${
          TestUserManager.getUserModelByType(TestUser.PLATFORM_SUPPORT)
            .authToken
        }`,
      }
    );
    expect(res.errors?.[0]?.message).toContain('required to assign role');

    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformResourceAdmin },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(
        u => u.id === fixtures.targetUserId
      )
    ).toBe(false);
  });

  it('rule 2 (holder-kind) rejection: distinct error, and the organization gains no role', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const res = await getGraphqlClient().assignPlatformRoleToOrganization(
      {
        roleData: {
          actorID: fixtures.secondOrganizationId,
          role: RoleName.PlatformSupport,
        },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(res.errors?.[0]?.message).toContain(
      'may not be granted to a organization'
    );

    const holders = await getGraphqlClient().platformRoleSetOrganizationsInRole(
      { role: RoleName.PlatformSupport },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.organizationsInRole.some(
        (o: { id: string }) => o.id === fixtures.secondOrganizationId
      )
    ).toBe(false);
  });

  it('rule 3 (spaces-reader-service-account) rejection: distinct error, and no grant takes effect', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const res = await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: {
          actorID: fixtures.targetUserId,
          role: RoleName.PlatformSpacesReader,
        },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(res.errors?.[0]?.message).toContain(
      'may only be granted to a service account'
    );

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformSpacesReader },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(
        u => u.id === fixtures.targetUserId
      )
    ).toBe(false);
  });

  it('rule 4 (audit-reader-exclusion) rejection: distinct error, and no grant takes effect', async () => {
    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const supportUserId = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_SUPPORT
    ).id;
    const res = await getGraphqlClient().assignPlatformRoleToUser(
      {
        roleData: { actorID: supportUserId, role: RoleName.PlatformAuditReader },
      },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(res.errors?.[0]?.message).toContain('mutually exclusive');

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformAuditReader },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(u => u.id === supportUserId)
    ).toBe(false);
  });

  it('rule 5 (last-roles-admin) rejection: distinct error, and the platform retains its only Roles Admin', async () => {
    const rolesAdminUser = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    );
    const res = await getGraphqlClient().removePlatformRoleFromUser(
      {
        roleData: { actorID: rolesAdminUser.id, role: RoleName.PlatformRolesAdmin },
      },
      { authorization: `Bearer ${rolesAdminUser.authToken}` }
    );
    expect(res.errors?.[0]?.message).toContain(
      'cannot remove the last platform-roles-admin'
    );

    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformRolesAdmin },
      { authorization: `Bearer ${rolesAdminUser.authToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(
        u => u.id === rolesAdminUser.id
      ),
      'the platform must still hold at least one platform-roles-admin'
    ).toBe(true);
  });

  // The `role_grant_rejected` RECORD for each of the five rules above
  // (naming the violated rule in `details.rejectedRule`) is Phase-V-only —
  // see this file's header and `audit-coverage.it-spec.ts`.
});
