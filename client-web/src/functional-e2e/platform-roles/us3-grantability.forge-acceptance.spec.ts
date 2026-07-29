// spec: agents-hq/specs/027-platform-role-redesign/spec.md (User Story 3 —
// Decompose god mode into purpose-specific admin roles, P1)
//
// Durable regression cover for the manual US3 grantability / assigner-filtering
// acceptance walk (FR-012, FR-002, FR-032, Slice A exit condition): the
// 13-role admin UI offers the full role set to the seeded break-glass Platform
// Roles Admin, and only the 3 `Feature …` roles to an operator holding ONLY
// Platform Users Admin. `getOfferedPlatformRoles` in client-web
// (src/domain/access/RoleSetManager/useRoleSetManager.ts) derives the offered
// set from exactly the same `myPrivileges` signal this spec asserts on, so
// this is the same decision the CRD admin-roles page makes — driven at the
// GraphQL layer for determinism (no UI login/autofill flakiness, no sleeps).
// The server rejection of an out-of-scope grant is asserted directly too:
// FR-012 requires it surface as a visible, capability-naming error, never a
// silent no-op.
//
// Slice A caveat (additive rollout): legacy broad grants are still present,
// so only positive reachability and the assigner-filter/rejection behaviour
// are meaningful here. Denial-of-the-other-families acceptance (US3 scenarios
// 1-3's "When they attempt ... Then denied") belongs to Slice B once the
// legacy credential paths are removed.
//
// Fixture users:
//   admin@alkem.io               -> seeded break-glass PLATFORM_ROLES_ADMIN
//                                    (FR-013b) — genuinely pre-seeded via
//                                    server/src/core/bootstrap/platform-template-definitions/user/users.json
//   platform.usersadmin@alkem.io -> PLATFORM_USERS_ADMIN only — registered by
//                                    Playwright's globalSetup and granted this
//                                    role by `grantSingleRoleFixtures()`
//                                    (corr-ts-15/qual-ts-12); NOT users.json,
//                                    which seeds only admin@/notifications@/
//                                    spaces-reader@
//   qa.user@alkem.io             -> REGISTERED only (assignment target, restored after use)

import { test, expect, APIRequestContext } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const graphqlUrl =
  process.env.ALKEMIO_SERVER ||
  `${baseUrl}/api/private/non-interactive/graphql`;
const loginUrl = `${baseUrl}/api/auth/non-interactive-login`;
const testHarnessPassword =
  process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

const ROLES_ADMIN_EMAIL = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';
const USERS_ADMIN_EMAIL = 'platform.usersadmin@alkem.io';
const ASSIGNMENT_TARGET_EMAIL = 'qa.user@alkem.io';

// The 13 target roles of the Slice A exit condition — the 10 `Platform …`
// administration roles plus the 3 `Feature …` roles (spec.md "Target global
// role model" table).
const PLATFORM_ADMIN_ROLES = [
  'PLATFORM_ROLES_ADMIN',
  'PLATFORM_CONTENT_FULL_ACCESS',
  'PLATFORM_RESOURCE_ADMIN',
  'PLATFORM_SETTINGS_ADMIN',
  'PLATFORM_OPERATIONS_ADMIN',
  'PLATFORM_USERS_ADMIN',
  'PLATFORM_SUPPORT',
  'PLATFORM_LICENSE_MANAGER',
  'PLATFORM_SPACES_READER',
  'PLATFORM_AUDIT_READER',
];
const FEATURE_ROLES = [
  'FEATURE_BETA_TESTER',
  'FEATURE_VIRTUAL_ASSISTANT',
  'FEATURE_ORGANIZATION_CREATOR',
];
const ALL_13_ROLES = [...PLATFORM_ADMIN_ROLES, ...FEATURE_ROLES];

async function loginNonInteractive(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const response = await request.post(loginUrl, {
    data: { email, password },
  });
  expect(
    response.ok(),
    `non-interactive-login failed for ${email}: ${await response.text()}`
  ).toBeTruthy();
  const body = await response.json();
  expect(body.api_token).toBeTruthy();
  return body.api_token as string;
}

async function graphql(
  request: APIRequestContext,
  token: string,
  query: string,
  variables?: Record<string, unknown>
) {
  const response = await request.post(graphqlUrl, {
    headers: { Authorization: `Bearer ${token}` },
    data: { query, variables },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

// Mirrors client-web's getOfferedPlatformRoles (useRoleSetManager.ts) — the
// ONLY client-side authorization decision this feature makes (FR-012).
function getOfferedPlatformRoles(myPrivileges: string[]): string[] {
  if (myPrivileges.includes('GRANT_GLOBAL_ADMINS')) {
    return ALL_13_ROLES;
  }
  if (myPrivileges.includes('FEATURE_ROLE_ASSIGN')) {
    return FEATURE_ROLES;
  }
  return [];
}

test.describe(
  'US3 — grantability of all 13 roles, and assigner-filtering by capability',
  { tag: '@forge-acceptance' },
  () => {
    test('grantability-all-13: the break-glass Platform Roles Admin can be offered every one of the 13 target roles', async ({
      request,
    }) => {
      const token = await loginNonInteractive(
        request,
        ROLES_ADMIN_EMAIL,
        testHarnessPassword
      );

      // Given: signed in as the seeded break-glass Platform Roles Admin.
      const result = await graphql(
        request,
        token,
        `query {
          platform {
            roleSet {
              roleNames
              authorization { myPrivileges }
            }
          }
        }`
      );
      expect(result.errors).toBeUndefined();
      const myPrivileges: string[] =
        result.data.platform.roleSet.authorization.myPrivileges;
      const roleNames: string[] = result.data.platform.roleSet.roleNames;

      // When: the admin roles page decides which roles to offer (FR-012) —
      // Then: all 13 target roles are offered and exist on the platform
      // role-set — the Slice A exit condition.
      const offered = getOfferedPlatformRoles(myPrivileges);
      expect(offered.sort()).toEqual([...ALL_13_ROLES].sort());
      for (const role of ALL_13_ROLES) {
        expect(roleNames, `platform role-set is missing ${role}`).toContain(
          role
        );
      }
    });

    test('assigner-filtering: a Platform Users Admin is offered only the 3 Feature roles, and an out-of-scope grant is rejected with a visible error', async ({
      request,
    }) => {
      const usersAdminToken = await loginNonInteractive(
        request,
        USERS_ADMIN_EMAIL,
        testHarnessPassword
      );

      // Given: an operator granted ONLY Platform Users Admin.
      const privilegesResult = await graphql(
        request,
        usersAdminToken,
        'query { platform { roleSet { authorization { myPrivileges } } } }'
      );
      expect(privilegesResult.errors).toBeUndefined();
      const myPrivileges: string[] =
        privilegesResult.data.platform.roleSet.authorization.myPrivileges;
      expect(myPrivileges).not.toContain('GRANT_GLOBAL_ADMINS');
      expect(myPrivileges).toContain('FEATURE_ROLE_ASSIGN');

      // When: that user opens the same admin roles page — Then: only the 3
      // Feature roles are offered; the 10 Platform roles are absent.
      const offered = getOfferedPlatformRoles(myPrivileges);
      expect(offered.sort()).toEqual([...FEATURE_ROLES].sort());
      for (const platformRole of PLATFORM_ADMIN_ROLES) {
        expect(offered).not.toContain(platformRole);
      }

      // Resolve the assignment target's actor id via a Platform Roles Admin
      // token — Platform Users Admin's read scope does not need to cover
      // general user lookup for this assertion.
      const rolesAdminToken = await loginNonInteractive(
        request,
        ROLES_ADMIN_EMAIL,
        testHarnessPassword
      );
      const usersResult = await graphql(
        request,
        rolesAdminToken,
        'query { users(filter: {}) { id email } }'
      );
      const targetUser = (
        usersResult.data.users as Array<{ id: string; email: string }>
      ).find(u => u.email === ASSIGNMENT_TARGET_EMAIL);
      expect(
        targetUser,
        `expected fixture user ${ASSIGNMENT_TARGET_EMAIL} to exist`
      ).toBeTruthy();

      // When: the Platform Users Admin attempts to grant an out-of-scope
      // `Platform …` role directly at the API (bypassing the client filter
      // that never offers it) — Then: the server rejects it outright, naming
      // the missing capability — never a silent no-op (FR-012).
      const forbidden = await graphql(
        request,
        usersAdminToken,
        `mutation ($actorID: UUID!) {
          assignPlatformRoleToUser(
            roleData: { actorID: $actorID, role: PLATFORM_RESOURCE_ADMIN }
          ) {
            id
          }
        }`,
        { actorID: targetUser!.id }
      );
      expect(forbidden.data).toBeNull();
      expect(forbidden.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(forbidden.errors?.[0]?.message).toContain('grant-global-admins');

      // And: the same operator CAN grant an in-scope Feature role — proving
      // the rejection above is a scoped, out-of-scope denial rather than a
      // blanket one. Cleaned up immediately after assertion.
      const granted = await graphql(
        request,
        usersAdminToken,
        `mutation ($actorID: UUID!) {
          assignPlatformRoleToUser(
            roleData: { actorID: $actorID, role: FEATURE_VIRTUAL_ASSISTANT }
          ) {
            id
          }
        }`,
        { actorID: targetUser!.id }
      );
      expect(granted.errors).toBeUndefined();
      expect(granted.data.assignPlatformRoleToUser.id).toBe(targetUser!.id);

      const revoked = await graphql(
        request,
        usersAdminToken,
        `mutation ($actorID: UUID!) {
          removePlatformRoleFromUser(
            roleData: { actorID: $actorID, role: FEATURE_VIRTUAL_ASSISTANT }
          ) {
            id
          }
        }`,
        { actorID: targetUser!.id }
      );
      expect(revoked.errors).toBeUndefined();
    });
  }
);
