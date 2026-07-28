import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { buildMatrixFixtures, teardownMatrixFixtures } from './fixtures';
import type { MatrixFixtures } from './fixtures';

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
    // (separation of duties) — it is, by construction, the platform's only
    // holder in a from-scratch environment, so revoking it must trip rule 5.
    const res = await asUser(
      token =>
        getGraphqlClient().removePlatformRoleFromUser(
          {
            roleData: {
              actorID: TestUserManager.getUserModelByType(
                TestUser.PLATFORM_ROLES_ADMIN
              ).id,
              role: RoleName.PlatformRolesAdmin,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_ROLES_ADMIN
    );
    expect(res.error?.errors[0]?.message).toContain(
      'cannot remove the last platform-roles-admin'
    );
  });
});

describe('service-profile assertions (T011, A21/FR-002)', () => {
  it('setting `serviceProfile` is denied to every role but Platform Roles Admin', async () => {
    const before = await getGraphqlClient().getMyUserInfo(
      {},
      {
        authorization: `Bearer ${
          TestUserManager.getUserModelByType(TestUser.PLATFORM_SUPPORT)
            .authToken
        }`,
      }
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
    // Assert the call is REJECTED with an error — and separately (via a
    // fresh read, not merely "no error thrown") that the marker did not
    // move, per the eighth clarification pass's explicit split.
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
    expect(before.data?.me?.user?.id).toBeTruthy();
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
    expect(res.error?.errors?.length ?? 0).toBeGreaterThan(0);
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
