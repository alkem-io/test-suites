import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getGraphqlClient, TestUser, TestUserManager } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
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
 *
 * HARDENING (2026-07-29 live-verification finding): every rejection probe
 * below goes through `graphqlErrorWrapper` (aliased `asUser` here, matching
 * `assignment-rules.it-spec.ts`/`grantability.it-spec.ts`'s own
 * convention) rather than calling the raw generated SDK directly. The SDK's
 * underlying `graphql-request` client throws a `ClientError` on ANY
 * GraphQL error response (its `rawRequest` only returns a non-throwing
 * `{data, errors}` shape when no errors are present) — so a direct call
 * expecting a REJECTION throws before the `res.errors` assertion is ever
 * reached, failing the test with an unasserted exception instead of the
 * intended assertion. This was true of every rule in this file (reproduced
 * live for all five, not just the ones this feature's fixture-contamination
 * finding named), not only the ones fixture hygiene alone explains.
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

describe('flow 5 — every rejection is distinctly attributable and takes no effect (T019c)', () => {
  it('rule 1 (assigner-capability) rejection: distinct error, and the target gains no role', async () => {
    // Uses `fixtures.rolesProbeUserId` — a freshly-minted, guaranteed
    // role-free target — NOT `fixtures.targetUserId`
    // (`TestUser.NON_SPACE_MEMBER`). That shared fixture can carry a stray
    // Platform-family role left over from another file/run (both persist
    // for the whole environment's lifetime), which makes this negative
    // probe fail for the wrong reason: the mutation reaches a DIFFERENT
    // rule's rejection (e.g. the audit-reader-exclusion rule) instead of
    // rule 1's, and/or the post-check below finds the residual role still
    // there (2026-07-29 live-verification finding).
    const res = await asUser(
      token =>
        getGraphqlClient().assignPlatformRoleToUser(
          {
            roleData: {
              actorID: fixtures.rolesProbeUserId,
              role: RoleName.PlatformResourceAdmin,
            },
          },
          { authorization: `Bearer ${token}` }
        ),
      TestUser.PLATFORM_SUPPORT
    );
    expect(res.error?.errors?.[0]?.message).toContain('required to assign role');

    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformResourceAdmin },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(
        u => u.id === fixtures.rolesProbeUserId
      )
    ).toBe(false);
  });

  it('rule 2 (holder-kind) rejection: distinct error, and the organization gains no role', async () => {
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
    // wave's new `platform-roles-rules` gate track, sec-test-suites-10) —
    // same re-point as `assignment-rules.it-spec.ts`'s identical rule-2
    // test: `assertOrganizationSurfaceOrFail` (sec-server-6) now rejects
    // this surface for every non-FEATURE-family role BEFORE the shared rule
    // engine's `checkHolderKind` is ever reached, with a different literal
    // message. The property this test verifies — no role, no effect — is
    // unchanged.
    expect(res.error?.errors?.[0]?.message).toContain(
      'may not be assigned or removed through the organization surface'
    );

    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
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
    // Same fixture-hygiene reasoning as rule 1 above — a freshly-minted,
    // role-free target, never the shared `targetUserId`.
    const res = await asUser(
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
    expect(res.error?.errors?.[0]?.message).toContain(
      'may only be granted to a service account'
    );

    const rolesAdminToken = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    ).authToken;
    const holders = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformSpacesReader },
      { authorization: `Bearer ${rolesAdminToken}` }
    );
    expect(
      holders.data?.platform.roleSet.usersInRole.some(
        u => u.id === fixtures.rolesProbeUserId
      )
    ).toBe(false);
  });

  it('rule 4 (audit-reader-exclusion) rejection: distinct error, and no grant takes effect', async () => {
    // This rule needs a target that ALREADY holds a Platform role
    // (`platform-support`) so the exclusion has something to conflict with.
    // Rather than reusing the shared `TestUser.PLATFORM_SUPPORT` fixture —
    // whose role state is mutated by other probes across this file and
    // others, running possibly concurrently (2026-07-29 live-verification
    // finding) — grant `platform-support` to the disposable
    // `rolesProbeUserId` for the DURATION of this test only, and revoke it
    // again regardless of outcome.
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
              roleData: { actorID: probeUserId, role: RoleName.PlatformAuditReader },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_ROLES_ADMIN
      );
      expect(res.error?.errors?.[0]?.message).toContain('mutually exclusive');

      const holders = await getGraphqlClient().platformRoleSetUsersInRole(
        { role: RoleName.PlatformAuditReader },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(
        holders.data?.platform.roleSet.usersInRole.some(u => u.id === probeUserId)
      ).toBe(false);
    } finally {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          {
            roleData: { actorID: probeUserId, role: RoleName.PlatformSupport },
          },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — a correctly-rejected exclusion above means
          // `platform-support` was never displaced, so this always applies
        });
    }
  });

  it('rule 5 (last-roles-admin) rejection: distinct error, and the platform retains its only Roles Admin', async () => {
    const rolesAdminUser = TestUserManager.getUserModelByType(
      TestUser.PLATFORM_ROLES_ADMIN
    );
    const globalAdminToken = TestUserManager.users.globalAdmin.authToken;

    // This rule's precondition — "the platform has EXACTLY one
    // platform-roles-admin holder" — does not hold for free in a long-lived
    // environment: bootstrap seeding can leave OTHER accounts (e.g. the
    // legacy GLOBAL_ADMIN fixture) also holding the role, so a removal that
    // should be rejected (last-holder rule) instead SUCCEEDS for real —
    // `res.errors` comes back `undefined`, and the very next assertion
    // throws a type error before the intended rejection assertion ever runs
    // (2026-07-29 live-verification finding). Drive the platform to exactly
    // one holder (this fixture) first, then restore every other holder
    // afterward regardless of outcome — never assume the precondition from
    // fixture setup alone.
    const before = await getGraphqlClient().platformRoleSetUsersInRole(
      { role: RoleName.PlatformRolesAdmin },
      { authorization: `Bearer ${rolesAdminUser.authToken}` }
    );
    const holderIdsBeforeStrip = (
      before.data?.platform.roleSet.usersInRole ?? []
    ).map(u => u.id);
    const otherHolderIds = holderIdsBeforeStrip.filter(
      id => id !== rolesAdminUser.id
    );

    // THE STRIP LOOP RUNS AS `PLATFORM_ROLES_ADMIN`, NOT AS GLOBAL_ADMIN —
    // and that single token swap is what makes this test able to fail.
    //
    // Rule 6 (self-assignment) is evaluated FIRST, on revoke as well as
    // grant, and keys purely on `actorID === targetActorId`. With
    // `globalAdminToken` the loop therefore could never strip `admin@
    // alkem.io`'s OWN platform-roles-admin: rule 6 rejected it every time.
    // `admin@` always survived, the platform never reached one holder, rule 5
    // was never reachable, and the test fell through to an `else` branch
    // asserting that the revoke SUCCEEDS — the exact inverse of its own
    // title. FR-013a, the single control standing between this platform and
    // permanent administrative lockout, was exercised by nothing.
    //
    // `TestUser.PLATFORM_ROLES_ADMIN` holds `GRANT_GLOBAL_ADMINS` on the
    // role-set policy (measured: policy B = [FEATURE_ROLE_ASSIGN,
    // GRANT_GLOBAL_ADMINS, PLATFORM_ROLE_HOLDERS_READ]) and is never its own
    // target in this loop, so rule 6 does not fire and every other holder —
    // `admin@` included — actually comes off.
    const rolesAdminToken = rolesAdminUser.authToken;
    for (const id of otherHolderIds) {
      await getGraphqlClient()
        .removePlatformRoleFromUser(
          { roleData: { actorID: id, role: RoleName.PlatformRolesAdmin } },
          { authorization: `Bearer ${rolesAdminToken}` }
        )
        .catch(() => {
          // best-effort — the post-strip precondition below HARD FAILS if the
          // platform did not actually reach exactly one holder, so a silent
          // partial strip can no longer be absorbed by a conditional
        });
    }

    try {
      // THE PRECONDITION IS ASSERTED, NOT BRANCHED ON.
      //
      // This block used to read the post-strip holder list into an
      // `isLastHolder` flag and branch: last holder → assert the rejection;
      // otherwise → assert the revoke SUCCEEDS. On every environment anyone
      // actually runs, the strip could not remove `admin@alkem.io` (see the
      // token note above), so the `else` arm was the one that executed — a
      // test named "the platform retains its only Roles Admin" asserting that
      // the last Roles Admin can be removed. A conditional that can assert
      // the inverse of its own title is worse than no test, so the branch is
      // gone: if the platform is not down to exactly one holder, this run
      // cannot exercise rule 5 and says so, loudly, instead of quietly
      // testing its opposite.
      const afterStrip = await getGraphqlClient().platformRoleSetUsersInRole(
        { role: RoleName.PlatformRolesAdmin },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      const remainingHolderIds = (
        afterStrip.data?.platform.roleSet.usersInRole ?? []
      ).map(u => u.id);
      expect(
        remainingHolderIds,
        `rule 5 needs the platform down to EXACTLY one platform-roles-admin (${rolesAdminUser.id}) before the revoke below can reach it; the strip loop left [${remainingHolderIds.join(', ')}]`
      ).toEqual([rolesAdminUser.id]);

      // corr-ts-14: the actor performing this removal must be a DIFFERENT
      // identity than the target — rule 6 (self-assignment) is evaluated
      // FIRST and unconditionally blocks a self-revoke with its own,
      // distinct message, which shadowed rule 5 here identically to
      // `assignment-rules.it-spec.ts`. `GLOBAL_ADMIN` is the right actor and
      // is still sound after the strip: `GRANT_GLOBAL_ADMINS` is granted to
      // [GLOBAL_ADMIN, PLATFORM_ROLES_ADMIN], so `admin@` still passes rule 1
      // from its LEGACY credential even having just lost the new role.
      const res = await asUser(
        token =>
          getGraphqlClient().removePlatformRoleFromUser(
            {
              roleData: {
                actorID: rolesAdminUser.id,
                role: RoleName.PlatformRolesAdmin,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.GLOBAL_ADMIN
      );

      expect(res.error?.errors?.[0]?.message).toContain(
        'cannot remove the last platform-roles-admin'
      );
      // The rule engine's internal id, nested TWO levels under `extensions`
      // (`errors[0].extensions.details.ruleId`) — the message alone cannot
      // distinguish rule 5 from a differently-worded future rejection.
      expect(
        (
          res.error?.errors?.[0]?.extensions as
            | { details?: { ruleId?: unknown } }
            | undefined
        )?.details?.ruleId
      ).toBe('last-roles-admin');

      const holders = await getGraphqlClient().platformRoleSetUsersInRole(
        { role: RoleName.PlatformRolesAdmin },
        { authorization: `Bearer ${rolesAdminToken}` }
      );
      expect(
        holders.data?.platform.roleSet.usersInRole.some(
          u => u.id === rolesAdminUser.id
        ),
        'the platform must still hold at least one platform-roles-admin'
      ).toBe(true);
    } finally {
      // RESTORE AS `PLATFORM_ROLES_ADMIN`, FOR THE SAME REASON THE STRIP
      // RUNS AS IT. This loop used to re-grant with `globalAdminToken`; once
      // `admin@` is among the stripped holders that is a SELF-assignment,
      // rejected by rule 6 and then swallowed by `.catch(() => {})` — which
      // would leave the SHARED stack with exactly one platform-roles-admin,
      // permanently, and every later spec that expects `admin@` to hold it
      // red for a reason nothing in this file mentions. The leak was
      // invisible only while the strip was symmetrically blocked; making the
      // strip work makes it real.
      const restoreFailures: string[] = [];
      for (const id of otherHolderIds) {
        try {
          await getGraphqlClient().assignPlatformRoleToUser(
            { roleData: { actorID: id, role: RoleName.PlatformRolesAdmin } },
            { authorization: `Bearer ${rolesAdminToken}` }
          );
        } catch (error) {
          restoreFailures.push(
            `${id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
      // corr-ts-24 fix: the fixture ITSELF (`rolesAdminUser`) must also be
      // self-healed — if the removal above had succeeded for real, the shared
      // `platform.rolesadmin@alkem.io` fixture would lose its role
      // PERMANENTLY, breaking every other spec/file that authenticates as
      // PLATFORM_ROLES_ADMIN (exactly the 2026-07-29 outage
      // `assignment-rules.it-spec.ts`'s identical self-heal documents).
      // Idempotent re-grant: a no-op (harmless error) if the fixture never
      // lost the role. Kept on `globalAdminToken` — `rolesAdminToken` here
      // would be a self-assignment and rule 6 would refuse it.
      await getGraphqlClient()
        .assignPlatformRoleToUser(
          {
            roleData: {
              actorID: rolesAdminUser.id,
              role: RoleName.PlatformRolesAdmin,
            },
          },
          { authorization: `Bearer ${globalAdminToken}` }
        )
        .catch(() => {
          // best-effort — if the fixture never lost the role, re-granting an
          // already-held role is expected to no-op or error harmlessly.
        });

      // The restore is VERIFIED, not assumed. Without this, a restore that
      // silently failed would hand the next spec a platform with one Roles
      // Admin and no explanation.
      const afterRestore = await getGraphqlClient().platformRoleSetUsersInRole(
        { role: RoleName.PlatformRolesAdmin },
        { authorization: `Bearer ${globalAdminToken}` }
      );
      const restoredHolderIds = (
        afterRestore.data?.platform.roleSet.usersInRole ?? []
      ).map(u => u.id);
      expect(
        [...restoredHolderIds].sort(),
        `this test left the shared platform's platform-roles-admin holders CHANGED — before [${[...holderIdsBeforeStrip].sort().join(', ')}], after [${[...restoredHolderIds].sort().join(', ')}]${restoreFailures.length > 0 ? `; restore failures: ${restoreFailures.join(' | ')}` : ''}`
      ).toEqual([...holderIdsBeforeStrip].sort());
    }
  });

  // The `role_grant_rejected` RECORD for each of the five rules above
  // (naming the violated rule in `details.rejectedRule`) is Phase-V-only —
  // see this file's header and `audit-coverage.it-spec.ts`.
});
