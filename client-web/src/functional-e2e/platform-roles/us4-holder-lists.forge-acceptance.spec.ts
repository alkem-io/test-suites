// spec: agents-hq/specs/027-platform-role-redesign/spec.md (User Story 4 —
// Operational clarity: no dead or ambiguous roles, P2 — SC-017)
//
// Durable regression cover for the manual US4 acceptance walk (SC-017): the
// global-role holder lists remain readable after the redesign, partitioned by
// role set —
//   - the `Platform …` holder lists by Platform Roles Admin and Platform Audit
//     Reader alone;
//   - the `Feature …` holder lists by those two PLUS Platform Users Admin
//     (FR-003's revoke authority is unexercisable without this read).
//
// Also covers the documented, signed-off UI gap (repos.yaml Slice A human
// gates): Platform Audit Reader holds the API-level PLATFORM_ROLE_HOLDERS_READ
// capability over all 13 lists but has NO admin-roles UI page, because
// client-web filters the offered role sets by ASSIGNER capability and Audit
// Reader assigns nothing. Absence of that UI is EXPECTED, not a defect.
//
// Slice A caveat (additive rollout): legacy broad grants are still present, so
// only positive reachability is meaningful here. Denial assertions (e.g. a
// Platform Users Admin being rejected when reading a `Platform …` list, or a
// mixed-role-set request being rejected outright) belong to Slice B and are
// deliberately out of scope for this spec — do not add them until the
// subtractive slice removes the legacy credential paths.
//
// Fixture users (pre-seeded, single-role by construction — see
// server/src/core/bootstrap/platform-template-definitions/user/users.json and
// the platform-roles matrix fixtures):
//   platform.rolesadmin@alkem.io  -> PLATFORM_ROLES_ADMIN only
//   platform.auditreader@alkem.io -> PLATFORM_AUDIT_READER only
//   platform.usersadmin@alkem.io  -> PLATFORM_USERS_ADMIN only

import { test, expect, APIRequestContext } from '@playwright/test';
import { loginViaCrd } from '../helpers/login.helper';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const graphqlUrl =
  process.env.ALKEMIO_SERVER ||
  `${baseUrl}/api/private/non-interactive/graphql`;
const loginUrl = `${baseUrl}/api/auth/non-interactive-login`;
const testHarnessPassword =
  process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

const ROLES_ADMIN_EMAIL = 'platform.rolesadmin@alkem.io';
const AUDIT_READER_EMAIL = 'platform.auditreader@alkem.io';
const USERS_ADMIN_EMAIL = 'platform.usersadmin@alkem.io';

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

const usersInRolesQuery = `query ($roles: [RoleName!]!) {
  platform {
    roleSet {
      usersInRoles(roles: $roles) {
        role
        users { nameID }
      }
    }
  }
}`;

test.describe(
  'US4 — operational clarity: holder-list read partitioned by role set',
  { tag: '@forge-acceptance' },
  () => {
    test('SC-017 (API): Platform Roles Admin reads BOTH Platform… and Feature… holder lists', async ({
      request,
    }) => {
      const token = await loginNonInteractive(
        request,
        ROLES_ADMIN_EMAIL,
        testHarnessPassword
      );

      // Given: the operator holds exactly PLATFORM_ROLES_ADMIN.
      const me = await graphql(
        request,
        token,
        'query { platform { roleSet { myRoles } } }'
      );
      expect(me.data.platform.roleSet.myRoles).toContain(
        'PLATFORM_ROLES_ADMIN'
      );

      // When: viewing a MIXED request spanning both role sets.
      const result = await graphql(request, token, usersInRolesQuery, {
        roles: [
          'PLATFORM_ROLES_ADMIN',
          'PLATFORM_AUDIT_READER',
          'FEATURE_BETA_TESTER',
        ],
      });

      // Then: the whole call succeeds — readable, partitioned by role — with
      // no rejection for either set.
      expect(result.errors).toBeUndefined();
      const byRole: Record<string, string[]> = Object.fromEntries(
        (
          result.data.platform.roleSet.usersInRoles as Array<{
            role: string;
            users: Array<{ nameID: string }>;
          }>
        ).map(entry => [entry.role, entry.users.map(u => u.nameID)])
      );
      expect(byRole['PLATFORM_ROLES_ADMIN']).toContain('platform-rolesadmin');
      expect(byRole['FEATURE_BETA_TESTER']).toBeDefined();
    });

    test('SC-017 (API): Platform Audit Reader reads BOTH Platform… and Feature… holder lists (API capability, no UI page — see below)', async ({
      request,
    }) => {
      const token = await loginNonInteractive(
        request,
        AUDIT_READER_EMAIL,
        testHarnessPassword
      );

      const me = await graphql(
        request,
        token,
        'query { platform { roleSet { myRoles } } }'
      );
      expect(me.data.platform.roleSet.myRoles).toContain(
        'PLATFORM_AUDIT_READER'
      );

      const result = await graphql(request, token, usersInRolesQuery, {
        roles: ['PLATFORM_AUDIT_READER', 'FEATURE_BETA_TESTER'],
      });

      expect(result.errors).toBeUndefined();
      const byRole: Record<string, string[]> = Object.fromEntries(
        (
          result.data.platform.roleSet.usersInRoles as Array<{
            role: string;
            users: Array<{ nameID: string }>;
          }>
        ).map(entry => [entry.role, entry.users.map(u => u.nameID)])
      );
      expect(byRole['PLATFORM_AUDIT_READER']).toContain(
        'platform-auditreader'
      );
      expect(byRole['FEATURE_BETA_TESTER']).toBeDefined();
    });

    test('SC-017 (API): Platform Users Admin reads Feature… holder lists (FR-003 revoke authority)', async ({
      request,
    }) => {
      const token = await loginNonInteractive(
        request,
        USERS_ADMIN_EMAIL,
        testHarnessPassword
      );

      const me = await graphql(
        request,
        token,
        'query { platform { roleSet { myRoles } } }'
      );
      expect(me.data.platform.roleSet.myRoles).toContain(
        'PLATFORM_USERS_ADMIN'
      );

      const result = await graphql(request, token, usersInRolesQuery, {
        roles: ['FEATURE_BETA_TESTER', 'FEATURE_VIRTUAL_ASSISTANT'],
      });

      expect(result.errors).toBeUndefined();
      const roles = (
        result.data.platform.roleSet.usersInRoles as Array<{ role: string }>
      ).map(entry => entry.role);
      expect(roles).toEqual(
        expect.arrayContaining(['FEATURE_BETA_TESTER', 'FEATURE_VIRTUAL_ASSISTANT'])
      );
    });

    test('SC-017 (UI): Platform Roles Admin sees all 13 role tabs with readable, partitioned holder lists', async ({
      page,
    }) => {
      await loginViaCrd(page, ROLES_ADMIN_EMAIL, testHarnessPassword);
      await page.goto(`${baseUrl}/admin/authorization`);

      const roleNav = page.getByRole('navigation', { name: 'Role' });
      await expect(roleNav).toBeVisible();
      await expect(
        roleNav.getByRole('button', { name: 'Platform Roles Admin' })
      ).toBeVisible();
      await expect(
        roleNav.getByRole('button', { name: 'Platform Audit Reader' })
      ).toBeVisible();
      await expect(
        roleNav.getByRole('button', { name: 'Feature Beta Tester' })
      ).toBeVisible();
      await expect(roleNav.getByRole('button')).toHaveCount(13);

      // The current tab's holder list is readable (not blocked/hidden).
      await expect(
        page.getByRole('heading', { name: 'Current members' })
      ).toBeVisible();
    });

    test('SC-017 (UI): Platform Users Admin sees ONLY the 3 Feature… tabs — Platform… holder lists stay closed to it', async ({
      page,
    }) => {
      await loginViaCrd(page, USERS_ADMIN_EMAIL, testHarnessPassword);
      await page.goto(`${baseUrl}/admin/authorization`);

      const roleNav = page.getByRole('navigation', { name: 'Role' });
      await expect(roleNav).toBeVisible();
      await expect(roleNav.getByRole('button')).toHaveCount(3);
      await expect(
        roleNav.getByRole('button', { name: 'Feature Beta Tester' })
      ).toBeVisible();
      await expect(
        roleNav.getByRole('button', { name: 'Feature Virtual Assistant' })
      ).toBeVisible();
      await expect(
        roleNav.getByRole('button', { name: 'Feature Organization Creator' })
      ).toBeVisible();
      await expect(
        roleNav.getByRole('button', { name: 'Platform Roles Admin' })
      ).toHaveCount(0);
    });

    test('SC-017 (UI, documented gap): Platform Audit Reader has NO admin-roles page — its holder-list read is API-only', async ({
      page,
    }) => {
      await loginViaCrd(page, AUDIT_READER_EMAIL, testHarnessPassword);
      await page.goto(`${baseUrl}/admin/authorization`);

      // Expected redirect: client-web offers admin sections by ASSIGNER
      // capability, and Audit Reader assigns nothing (repos.yaml Slice A human
      // gate, signed off). This is NOT a regression.
      await page.waitForURL(/\/restricted(\?|$)/);
      await expect(
        page.getByRole('heading', { name: 'Access Restricted' })
      ).toBeVisible();
    });
  }
);
