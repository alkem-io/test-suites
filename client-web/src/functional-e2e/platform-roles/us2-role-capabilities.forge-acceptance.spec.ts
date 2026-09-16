// spec: agents-hq/specs/027-platform-role-redesign/spec.md (User Story 2 — Run
// sensitive identity/operational actions without god mode, P1)
//
// Durable regression cover for the manual US2 acceptance walk (SC-002, SC-003):
// an operator holding ONLY Platform Operations Admin can run an authorization
// reset; an operator holding ONLY Platform Support can update an organization's
// innovation pack. Both must succeed with no all-powerful role held.
//
// Slice A caveat (additive rollout): legacy broad grants are still present, so
// only positive reachability is meaningful here. Denial assertions belong to
// Slice B and are deliberately out of scope for this spec — do not add them
// until the subtractive slice removes the legacy credential paths.
//
// Fixture users (registered by Playwright's globalSetup, then granted their
// single role by `grantSingleRoleFixtures()` — corr-ts-15/qual-ts-12 — NOT
// `server/src/core/bootstrap/platform-template-definitions/user/users.json`,
// which seeds only admin@/notifications@/spaces-reader@):
//   platform.opsadmin@alkem.io  -> PLATFORM_OPERATIONS_ADMIN only
//   platform.support@alkem.io   -> PLATFORM_SUPPORT only
//
// This spec drives the GraphQL API directly (no browser UI is load-bearing for
// either acceptance criterion — SC-002/SC-003 are server-side authorization
// checks), following the same request-fixture pattern as
// ts7-platform-smoke.spec.ts.

import { test, expect, APIRequestContext } from '@playwright/test';

const baseUrl = process.env.ALKEMIO_BASE_URL || 'http://localhost:3000';
const graphqlUrl =
  process.env.ALKEMIO_SERVER ||
  `${baseUrl}/api/private/non-interactive/graphql`;
const loginUrl = `${baseUrl}/api/auth/non-interactive-login`;
const testHarnessPassword =
  process.env.AUTH_TEST_HARNESS_PASSWORD || 'change_me';

const OPS_ADMIN_EMAIL = 'platform.opsadmin@alkem.io';
const SUPPORT_EMAIL = 'platform.support@alkem.io';
// Discovery-only: looking up which organization owns an innovation pack needs
// broader read (Organization.account) than Platform Support holds by design —
// that's an account-read boundary, not part of SC-003's assertion. A Platform
// Roles Admin / break-glass account does the lookup; Platform Support performs
// the actual edit under test.
const DISCOVERY_EMAIL = process.env.AUTH_ADMIN_EMAIL || 'admin@alkem.io';

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

test.describe(
  'US2 — sensitive identity/operational actions without god mode',
  { tag: '@forge-acceptance' },
  () => {
    test('SC-002: an operator holding ONLY Platform Operations Admin can perform an authorization reset', async ({
      request,
    }) => {
      const token = await loginNonInteractive(
        request,
        OPS_ADMIN_EMAIL,
        testHarnessPassword
      );

      // Given: the operator holds exactly PLATFORM_OPERATIONS_ADMIN (+ REGISTERED)
      // and no all-powerful role.
      const me = await graphql(
        request,
        token,
        'query { platform { roleSet { myRoles } } }'
      );
      const myRoles: string[] = me.data.platform.roleSet.myRoles;
      expect(myRoles).toContain('PLATFORM_OPERATIONS_ADMIN');
      expect(myRoles).not.toContain('GLOBAL_ADMIN');
      expect(myRoles).not.toContain('PLATFORM_ROLES_ADMIN');

      // When: that user performs an authorization reset on the platform.
      const result = await graphql(
        request,
        token,
        'mutation { authorizationPolicyResetOnPlatform { id } }'
      );

      // Then: it succeeds — the role carries its own family's capability with
      // no god mode behind it.
      expect(result.errors).toBeUndefined();
      expect(result.data.authorizationPolicyResetOnPlatform.id).toBeTruthy();
    });

    test('SC-003: an operator holding ONLY Platform Support can update an organization innovation pack', async ({
      request,
    }) => {
      const token = await loginNonInteractive(
        request,
        SUPPORT_EMAIL,
        testHarnessPassword
      );

      // Given: the operator holds exactly PLATFORM_SUPPORT (+ REGISTERED) and no
      // all-powerful role.
      const me = await graphql(
        request,
        token,
        'query { platform { roleSet { myRoles } } }'
      );
      const myRoles: string[] = me.data.platform.roleSet.myRoles;
      expect(myRoles).toContain('PLATFORM_SUPPORT');
      expect(myRoles).not.toContain('GLOBAL_ADMIN');
      expect(myRoles).not.toContain('PLATFORM_CONTENT_FULL_ACCESS');

      // Locate an organization-owned innovation pack to edit. The platform-roles
      // matrix fixtures (organizations named `platform-roles-mat-*`) seed one
      // each; fall back to scanning all organizations if fixtures were not run.
      // Discovery runs as DISCOVERY_EMAIL: Organization.account is null for a
      // Platform Support caller (a separate, broader read boundary than the
      // A7 edit privilege under test here).
      const discoveryToken = await loginNonInteractive(
        request,
        DISCOVERY_EMAIL,
        testHarnessPassword
      );
      const orgs = await graphql(
        request,
        discoveryToken,
        `query {
          organizations {
            id
            nameID
            account { innovationPacks { id nameID listedInStore } }
          }
        }`
      );
      const orgWithPack = (orgs.data.organizations as Array<{
        id: string;
        nameID: string;
        account: { innovationPacks: Array<{ id: string; nameID: string; listedInStore: boolean }> } | null;
      }>).find(o => (o.account?.innovationPacks.length ?? 0) > 0);
      expect(
        orgWithPack,
        'expected at least one organization with an innovation pack fixture'
      ).toBeTruthy();
      const pack = orgWithPack!.account!.innovationPacks[0];

      // When: that user updates the pack's settings.
      const result = await graphql(
        request,
        token,
        `mutation ($ID: UUID!, $listedInStore: Boolean!) {
          updateInnovationPack(
            innovationPackData: { ID: $ID, listedInStore: $listedInStore }
          ) {
            id
            listedInStore
          }
        }`,
        { ID: pack.id, listedInStore: !pack.listedInStore }
      );

      // Then: it succeeds.
      expect(result.errors).toBeUndefined();
      expect(result.data.updateInnovationPack.id).toBe(pack.id);
      expect(result.data.updateInnovationPack.listedInStore).toBe(
        !pack.listedInStore
      );
    });
  }
);
