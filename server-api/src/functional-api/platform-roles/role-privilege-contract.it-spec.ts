import { beforeAll, describe, expect, it } from 'vitest';
import { TestUser } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { testUserFor } from './role-action-matrix.data';

/**
 * workspace#027-platform-role-redesign — the PRIVILEGE CONTRACT, per role.
 *
 * Why this file exists, when ~988 role x surface cells already exist: the
 * matrix asserts what a role can DO. Nothing asserted what a role can SEE —
 * which privileges the API reports for it, on which policy. On 2026-08-05
 * that blind spot produced three defects in one afternoon, all client-side,
 * all the same shape:
 *
 *   - the admin nav entry never appeared for any of the thirteen roles
 *   - no role label rendered under a new-role holder's name
 *   - all nine admin sections were offered to a role that can operate one
 *
 * Each was a consumer reading `platform.authorization.myPrivileges` and
 * concluding the user had nothing, because the privileges it needed are on
 * `platform.roleSet.authorization.myPrivileges`. The server was right every
 * time; no test stated what the server reports, so no test could catch it.
 *
 * The expectations below are an INDEPENDENT restatement of
 * `server/src/platform/platform-role/verification/privilege.grants.ts`,
 * transcribed by anchor: `@platform` entries belong on the platform policy,
 * `@role-set` entries on the role set's. Deliberately not derived from a
 * shared constant — a contract test that imports its own expectation asserts
 * only that the code equals itself.
 *
 * Slice A caveat, and it is the important one: these are all POSITIVE and
 * CROSS-CONTAMINATION assertions, both of which are meaningful today. What
 * this file does NOT do is assert that a role is denied something the legacy
 * credentials still reach — at Slice A that passes for the wrong reason. The
 * fixtures here hold exactly ONE of the thirteen and no legacy `GLOBAL_*`
 * credential, which is what makes the negative assertions below sound.
 */

/** Privileges the platform ENTITY policy must report, per role. */
const PLATFORM_POLICY_CONTRACT: Partial<Record<RoleName, readonly string[]>> = {
  // SET_SERVICE_PROFILE is the Roles Admin's ONLY platform-entity privilege —
  // it marks service accounts (FR-020). Its assignment powers are on the role
  // set, which is exactly the confusion this file exists to pin.
  [RoleName.PlatformRolesAdmin]: ['SET_SERVICE_PROFILE'],
  [RoleName.PlatformUsersAdmin]: ['PLATFORM_USERS_ADMIN'],
  [RoleName.PlatformAuditReader]: ['PLATFORM_AUDIT_READ'],
  [RoleName.PlatformSupport]: ['CREATE_ORGANIZATION', 'PLATFORM_FORUM_MANAGE'],
  [RoleName.PlatformSettingsAdmin]: ['PLATFORM_SETTINGS_ADMIN'],
  [RoleName.PlatformOperationsAdmin]: [
    'AUTHORIZATION_RESET',
    'PLATFORM_OPERATIONS_ADMIN',
  ],
  [RoleName.FeatureOrganizationCreator]: ['CREATE_ORGANIZATION'],
  [RoleName.FeatureVirtualAssistant]: ['ACCESS_VIRTUAL_ASSISTANT'],
};

/** Privileges the platform ROLE SET's policy must report, per role. */
const ROLE_SET_POLICY_CONTRACT: Partial<Record<RoleName, readonly string[]>> = {
  [RoleName.PlatformRolesAdmin]: [
    'GRANT_GLOBAL_ADMINS',
    'FEATURE_ROLE_ASSIGN',
    // Without the holder read a Roles Admin can grant but never revoke: the
    // UI cannot render a list to revoke from. SC-017/A20b.
    'PLATFORM_ROLE_HOLDERS_READ',
  ],
  [RoleName.PlatformUsersAdmin]: [
    // The three `Feature ...` roles ONLY — FR-003's one-way rule.
    'FEATURE_ROLE_ASSIGN',
    'FEATURE_ROLE_HOLDERS_READ',
  ],
  [RoleName.PlatformAuditReader]: ['PLATFORM_ROLE_HOLDERS_READ'],
};

/**
 * Privileges that belong to exactly one role. Any OTHER role reporting one is
 * cross-contamination — the union-widening failure mode `sec-server-4` and
 * `sec-server-7` were raised for, where widening a shared policy hands every
 * reacher of that policy a privilege only one role should own.
 */
const EXCLUSIVE_PRIVILEGES: Record<string, RoleName> = {
  GRANT_GLOBAL_ADMINS: RoleName.PlatformRolesAdmin,
  SET_SERVICE_PROFILE: RoleName.PlatformRolesAdmin,
  PLATFORM_USERS_ADMIN: RoleName.PlatformUsersAdmin,
  FEATURE_ROLE_HOLDERS_READ: RoleName.PlatformUsersAdmin,
  PLATFORM_AUDIT_READ: RoleName.PlatformAuditReader,
  PLATFORM_SETTINGS_ADMIN: RoleName.PlatformSettingsAdmin,
  AUTHORIZATION_RESET: RoleName.PlatformOperationsAdmin,
  PLATFORM_OPERATIONS_ADMIN: RoleName.PlatformOperationsAdmin,
  PLATFORM_FORUM_MANAGE: RoleName.PlatformSupport,
  ACCESS_VIRTUAL_ASSISTANT: RoleName.FeatureVirtualAssistant,
};

/** Shared by more than one role by design — never treated as contamination. */
const SHARED_PRIVILEGES = new Set([
  // Roles Admin AND Users Admin assign the Feature family (FR-003).
  'FEATURE_ROLE_ASSIGN',
  // Roles Admin AND Audit Reader read platform holder lists.
  'PLATFORM_ROLE_HOLDERS_READ',
  // Platform Support AND Feature Organization Creator.
  'CREATE_ORGANIZATION',
  // The root cascade reaches every reader; not role-exclusive.
  'PLATFORM_CONTENT_FULL_ACCESS',
]);

/**
 * Roles that correctly report NOTHING on either platform-level policy, because
 * their privileges are anchored on ACCOUNT / SPACE / CALLOUTS-SET policies:
 * `TRANSFER_RESOURCE_*` and `ACCOUNT_LICENSE_MANAGE` @account,
 * `MOVE_CONTRIBUTION` @space.
 *
 * Measured live 2026-08-05 — not derived. Pinned because it is a live trap,
 * not a curiosity: any UI that gates on platform-level privileges alone is
 * structurally blind to these three, which is exactly how the admin section
 * mapping came to offer Resource Admin a tab keyed on a privilege the platform
 * query never returns.
 */
const NO_PLATFORM_LEVEL_PRIVILEGE: readonly RoleName[] = [
  RoleName.PlatformResourceAdmin,
  RoleName.PlatformLicenseManager,
  RoleName.FeatureBetaTester,
];

const ALL_THIRTEEN: readonly RoleName[] = [
  RoleName.PlatformRolesAdmin,
  RoleName.PlatformUsersAdmin,
  RoleName.PlatformSupport,
  RoleName.PlatformSettingsAdmin,
  RoleName.PlatformOperationsAdmin,
  RoleName.PlatformResourceAdmin,
  RoleName.PlatformLicenseManager,
  RoleName.PlatformContentFullAccess,
  RoleName.PlatformSpacesReader,
  RoleName.PlatformAuditReader,
  RoleName.FeatureBetaTester,
  RoleName.FeatureOrganizationCreator,
  RoleName.FeatureVirtualAssistant,
];

const PRIVILEGES_QUERY = {
  operationName: 'PlatformPrivilegeContract',
  query: `query PlatformPrivilegeContract {
    platform {
      authorization { myPrivileges }
      roleSet { myRoles authorization { myPrivileges } }
    }
  }`,
  variables: {},
};

type Reported = {
  platform: string[];
  roleSet: string[];
  myRoles: string[];
};

const reportedFor = async (user: TestUser): Promise<Reported> => {
  const response = await graphqlRequestAuth(PRIVILEGES_QUERY, user);
  const platform = response.body?.data?.platform;

  if (!platform) {
    // Loud, not silent: a null platform here means the fixture user could not
    // authenticate or the query was rejected outright, and every assertion
    // downstream would otherwise report "missing privilege" for a cause that
    // has nothing to do with privileges.
    throw new Error(
      `role-privilege-contract: no platform payload for ${user} — ` +
        `errors: ${JSON.stringify(response.body?.errors ?? response.body).slice(0, 400)}`
    );
  }

  return {
    platform: platform.authorization?.myPrivileges ?? [],
    roleSet: platform.roleSet?.authorization?.myPrivileges ?? [],
    myRoles: platform.roleSet?.myRoles ?? [],
  };
};

const reported = new Map<RoleName, Reported>();

beforeAll(async () => {
  for (const role of ALL_THIRTEEN) {
    reported.set(role, await reportedFor(testUserFor(role)));
  }
}, 300_000);

describe('role privilege contract — what each role SEES, per policy', () => {
  describe('fixture integrity — these assertions are only sound on single-role users', () => {
    it.each(ALL_THIRTEEN)('%s holds exactly that role and no legacy credential', role => {
      const held = reported.get(role)!.myRoles;

      // `REGISTERED` is the baseline every authenticated user carries — it is
      // not one of the thirteen and is subtracted, not asserted against.
      // Verified live 2026-08-05: the subject account reported
      // `myRoles=['REGISTERED']` before any grant.
      const platformRoles = held.filter(r => r !== 'REGISTERED');

      expect(
        platformRoles,
        `${role} fixture should hold exactly one platform role (reported: ${held.join(', ')})`
      ).toEqual([role]);
      expect(
        held.filter(r => r.startsWith('GLOBAL_')),
        `${role} fixture must hold no legacy GLOBAL_* role, or every denial below passes for the wrong reason`
      ).toEqual([]);
    });
  });

  describe('GREEN — the platform entity policy reports the expected privileges', () => {
    for (const [role, expected] of Object.entries(PLATFORM_POLICY_CONTRACT) as [
      RoleName,
      readonly string[],
    ][]) {
      it(`${role} reports ${expected.join(', ')} on platform.authorization`, () => {
        const actual = reported.get(role)!.platform;

        for (const privilege of expected) {
          expect(
            actual,
            `${role} is missing ${privilege} on the PLATFORM policy (reported: ${actual.join(', ') || 'none'})`
          ).toContain(privilege);
        }
      });
    }
  });

  describe('GREEN — the role set policy reports the expected privileges', () => {
    for (const [role, expected] of Object.entries(ROLE_SET_POLICY_CONTRACT) as [
      RoleName,
      readonly string[],
    ][]) {
      it(`${role} reports ${expected.join(', ')} on platform.roleSet.authorization`, () => {
        const actual = reported.get(role)!.roleSet;

        for (const privilege of expected) {
          expect(
            actual,
            `${role} is missing ${privilege} on the ROLE SET policy (reported: ${actual.join(', ') || 'none'})`
          ).toContain(privilege);
        }
      });
    }
  });

  describe('RED — no role reports a privilege that belongs to another role', () => {
    for (const [privilege, owner] of Object.entries(EXCLUSIVE_PRIVILEGES)) {
      const others = ALL_THIRTEEN.filter(r => r !== owner);

      it.each(others)(`${privilege} is not reported for %s`, role => {
        if (SHARED_PRIVILEGES.has(privilege)) {
          return;
        }
        const { platform, roleSet } = reported.get(role)!;

        expect(
          [...platform, ...roleSet],
          `${role} reports ${privilege}, which only ${owner} should hold — union widening (cf. sec-server-4 / sec-server-7)`
        ).not.toContain(privilege);
      });
    }
  });

  describe('RED — no new role inherits the PLATFORM_ADMIN catch-all', () => {
    // The whole point of the feature. If a new role picked this up, it would
    // be a re-badged Global Admin and every per-family privilege below it
    // would be decoration.
    it.each(ALL_THIRTEEN)('%s does not report PLATFORM_ADMIN', role => {
      const { platform, roleSet } = reported.get(role)!;

      expect(
        [...platform, ...roleSet],
        `${role} reports PLATFORM_ADMIN — the catch-all this feature exists to decompose`
      ).not.toContain('PLATFORM_ADMIN');
    });
  });

  describe('EDGE — the account/space-anchored roles report nothing at platform level', () => {
    it.each(NO_PLATFORM_LEVEL_PRIVILEGE)(
      '%s reports no privilege on either platform-level policy',
      role => {
        const { platform, roleSet } = reported.get(role)!;
        const baseline = reported.get(RoleName.FeatureBetaTester)!;

        // Compared against another anchored role rather than against [] — an
        // authenticated user carries baseline privileges that are nobody's
        // grant, and asserting emptiness outright would pin those too.
        expect(platform.sort()).toEqual(baseline.platform.sort());
        expect(roleSet.sort()).toEqual(baseline.roleSet.sort());
      }
    );
  });

  describe('EDGE — the two policies are not conflated', () => {
    // The exact defect class behind all three client bugs of 2026-08-05.
    it('assignment privileges appear on the ROLE SET policy, never on the platform policy', () => {
      const rolesAdmin = reported.get(RoleName.PlatformRolesAdmin)!;

      expect(rolesAdmin.roleSet).toContain('GRANT_GLOBAL_ADMINS');
      expect(
        rolesAdmin.platform,
        'GRANT_GLOBAL_ADMINS moved onto the platform policy — every consumer that unions both is now over-broad'
      ).not.toContain('GRANT_GLOBAL_ADMINS');
    });

    it('SET_SERVICE_PROFILE appears on the platform policy, never on the role set', () => {
      const rolesAdmin = reported.get(RoleName.PlatformRolesAdmin)!;

      expect(rolesAdmin.platform).toContain('SET_SERVICE_PROFILE');
      expect(rolesAdmin.roleSet).not.toContain('SET_SERVICE_PROFILE');
    });

    it('a Platform Roles Admin is NOT empty-handed on the union of both policies', () => {
      // Reading only the platform policy reports a single privilege and makes
      // this role look unprivileged — which is what hid the admin nav entry.
      const { platform, roleSet } = reported.get(RoleName.PlatformRolesAdmin)!;

      expect(platform).toHaveLength(1);
      expect([...platform, ...roleSet].length).toBeGreaterThan(3);
    });
  });

  describe('EDGE — FR-003, the one-way rule, is visible in the reported privileges', () => {
    it('Platform Users Admin can assign Feature roles but not Platform roles', () => {
      const { roleSet } = reported.get(RoleName.PlatformUsersAdmin)!;

      expect(roleSet).toContain('FEATURE_ROLE_ASSIGN');
      expect(
        roleSet,
        'Platform Users Admin reports GRANT_GLOBAL_ADMINS — FR-003 makes the relationship one-way'
      ).not.toContain('GRANT_GLOBAL_ADMINS');
    });

    it('Platform Users Admin can read Feature holder lists but not Platform ones', () => {
      const { roleSet } = reported.get(RoleName.PlatformUsersAdmin)!;

      expect(roleSet).toContain('FEATURE_ROLE_HOLDERS_READ');
      expect(roleSet, 'SC-017/A20').not.toContain('PLATFORM_ROLE_HOLDERS_READ');
    });
  });

  describe('EDGE — FR-028 separation of duties is visible in the reported privileges', () => {
    it('the Roles Admin cannot read the audit trail it generates', () => {
      const { platform } = reported.get(RoleName.PlatformRolesAdmin)!;

      expect(
        platform,
        'the role that grants roles must not also curate the record of grants'
      ).not.toContain('PLATFORM_AUDIT_READ');
    });

    it('the Audit Reader cannot assign roles', () => {
      const { roleSet } = reported.get(RoleName.PlatformAuditReader)!;

      expect(roleSet).not.toContain('GRANT_GLOBAL_ADMINS');
      expect(roleSet).not.toContain('FEATURE_ROLE_ASSIGN');
      // It DOES read platform holder lists — needed to interpret the trail.
      expect(roleSet).toContain('PLATFORM_ROLE_HOLDERS_READ');
    });
  });

  describe('EDGE — Slice A is additive: the legacy admin still sees everything', () => {
    it('GLOBAL_ADMIN reports a superset of every new role platform privilege', async () => {
      const legacy = await reportedFor(TestUser.GLOBAL_ADMIN);
      const union = new Set([...legacy.platform, ...legacy.roleSet]);

      const missing: string[] = [];
      for (const role of ALL_THIRTEEN) {
        const { platform, roleSet } = reported.get(role)!;
        for (const privilege of [...platform, ...roleSet]) {
          if (!union.has(privilege)) {
            missing.push(`${privilege} (held by ${role})`);
          }
        }
      }

      expect(
        missing,
        'the legacy global admin lost reach a new role has — Slice A must take nothing away'
      ).toEqual([]);
    });

    it('GLOBAL_ADMIN still reports the PLATFORM_ADMIN catch-all', () => {
      // Its removal is Slice B (T074). Seeing it gone in a Slice A build means
      // subtractive work leaked into the additive slice.
      return reportedFor(TestUser.GLOBAL_ADMIN).then(legacy => {
        expect(legacy.platform).toContain('PLATFORM_ADMIN');
      });
    });
  });

  describe('EDGE — a user holding none of the thirteen reports none of their privileges', () => {
    it('an ordinary registered user has no platform-admin privilege at all', async () => {
      const ordinary = await reportedFor(TestUser.NON_SPACE_MEMBER);
      const union = [...ordinary.platform, ...ordinary.roleSet];

      for (const privilege of Object.keys(EXCLUSIVE_PRIVILEGES)) {
        expect(
          union,
          `an ordinary user reports ${privilege} — the platform policy grants it too broadly`
        ).not.toContain(privilege);
      }
      expect(union).not.toContain('PLATFORM_ADMIN');
    });
  });
});
