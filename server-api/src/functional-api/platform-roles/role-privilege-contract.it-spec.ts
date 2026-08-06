import { beforeAll, describe, expect, it } from 'vitest';
import { TestUser } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { testUserFor } from './role-action-matrix.data';
import {
  expectedDeltaFor,
  GRANTABLE_TO_HUMAN,
  mustContainOn,
} from './helpers/a-row-contract';

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
 * The expectations are an INDEPENDENT restatement of
 * `server/src/platform/platform-role/verification/privilege.grants.ts`,
 * transcribed by anchor: `@platform` entries belong on the platform policy,
 * `@role-set` entries on the role set's. Still deliberately not derived from a
 * server constant — a contract test that imports its own expectation asserts
 * only that the code equals itself. It now lives in
 * `./helpers/a-row-contract`, which is a TEST-OWNED hand transcription of the
 * handover's group-A table, so the repo holds ONE copy of that table instead
 * of the three it used to (here, the grant/revoke delta spec, and the
 * handover). Correcting a row corrects every consumer at once.
 *
 * Slice A caveat, and it is the important one: these are all POSITIVE and
 * CROSS-CONTAMINATION assertions, both of which are meaningful today. What
 * this file does NOT do is assert that a role is denied something the legacy
 * credentials still reach — at Slice A that passes for the wrong reason. The
 * fixtures here hold exactly ONE of the thirteen and no legacy `GLOBAL_*`
 * credential, which is what makes the negative assertions below sound.
 */

/**
 * The per-role contract, per policy — one row per grantable role, read from
 * the single transcription in `./helpers/a-row-contract`.
 *
 * `mustContainOn` is that module's MEMBERSHIP view: the listed privileges must
 * be PRESENT on that policy for a holder of that role. It is deliberately not
 * an exact set here — every authenticated user also carries baseline
 * privileges that are nobody's grant. The EXACT-delta view (`expectedDeltaFor`)
 * belongs to the grant/revoke spec, which measures a real before/after.
 *
 * Roles whose expected list for a policy is EMPTY are filtered out rather than
 * generating an `it()` that asserts nothing: A10/A11/A12 on both policies, and
 * the role-set side of A4/A5/A8/A9. Their emptiness is a real claim and it IS
 * asserted — against a live ordinary user, in the two EDGE blocks below. A
 * zero-assertion green here would only look like coverage.
 *
 * TWO ROLES APPEAR ON BOTH POLICIES, AND BOTH ARE CORRECT — do not "fix" them
 * by deleting the role-set row:
 *
 *  - A6, `PlatformContentFullAccess`: its five CRUD privileges arrive from the
 *    ROOT cascade, which makes it the one row where a cascade change goes
 *    unnoticed everywhere else. FR-004/SC-004's single named exception.
 *  - A3, `PlatformSupport`: `PLATFORM_FORUM_MANAGE` is the only A-row
 *    credential rule created with `cascade: true`, while that role's
 *    `CREATE_ORGANIZATION` rule is `cascade: false` — which is exactly why one
 *    doubles and the other does not.
 *
 * The mechanism in both cases is INHERITANCE, not a duplicated rule: the
 * platform role-set policy is applied with `platform.authorization` as its
 * parent, so any cascading platform rule also surfaces on policy B. If either
 * ever appears on one policy only, that is a deliberate change and this case
 * is UPDATED, never deleted.
 */
const contractFor = (
  policy: 'platform' | 'roleSet'
): [RoleName, readonly string[]][] =>
  GRANTABLE_TO_HUMAN.map(
    role => [role, mustContainOn(role, policy)] as [RoleName, readonly string[]]
  ).filter(([, expected]) => expected.length > 0);

/** Privileges the platform ENTITY policy must report, per role. */
const PLATFORM_POLICY_CONTRACT = contractFor('platform');

/** Privileges the platform ROLE SET's policy must report, per role. */
const ROLE_SET_POLICY_CONTRACT = contractFor('roleSet');

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
 * Roles that correctly report NOTHING on either platform-level policy:
 *
 *  - A10 `PlatformResourceAdmin` — `TRANSFER_RESOURCE_OFFER/_ACCEPT` @account
 *    and @callouts-set, `MOVE_CONTRIBUTION` @space.
 *  - A11 `PlatformLicenseManager` — `ACCOUNT_LICENSE_MANAGE` @account.
 *  - A12 `FeatureBetaTester` — no authorization-policy privilege on ANY tree;
 *    its capability is the ACCOUNT_LICENSE_PLUS licensing entitlement granted
 *    by `assignPlatformRoleToUser` (server T040a). It is here for a different
 *    reason from the other two, and `MOVE_CONTRIBUTION` is NOT its privilege.
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

/**
 * Roles that carry a real platform-ENTITY privilege and add NOTHING on the
 * role set (A4/A5/A8/A9). The role-set policy is where assignment and
 * holder-read live; a role that is not in the assignment business must not
 * pick anything up there.
 *
 * This is the direction the contract maps above cannot state: an empty
 * expected list generates no assertion, so "adds nothing" has to be asserted
 * as an EQUALITY against a live ordinary user, never as an absence of an
 * expectation. It is also the concrete guard against the union-widening
 * failure mode — widening the shared role-set policy would show up here first,
 * on the four roles that should never have seen it.
 */
const PLATFORM_POLICY_ONLY_ROLES: readonly RoleName[] = [
  RoleName.PlatformSettingsAdmin,
  RoleName.PlatformOperationsAdmin,
  RoleName.FeatureVirtualAssistant,
  RoleName.FeatureOrganizationCreator,
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

/**
 * A live ordinary registered user, holding none of the thirteen — the ONLY
 * honest baseline for "this role adds nothing here".
 *
 * Measured 2026-08-05: platform = ['ACCESS_INTERACTIVE_GUIDANCE',
 * 'READ_USERS'], roleSet = [], myRoles = ['REGISTERED']. Measured rather than
 * hardcoded on purpose: those two platform privileges are whatever the
 * platform grants every authenticated user, they are not this feature's to
 * pin, and pinning them would turn an unrelated platform change into a
 * platform-roles failure.
 */
let ordinaryBaseline: Reported;

/**
 * `TestUser.NON_SPACE_MEMBER` is `fixtures.ts`'s shared `targetUserId` and is
 * used by 68+ spec files in this suite. If any of them leaks a grant onto it,
 * the baseline MOVES — and every "adds nothing" assertion below would happily
 * follow it, staying green while the thing it guards has broken. So every
 * consumer of the baseline re-states the fixture's own integrity first, using
 * the same `myRoles` idiom as the `fixture integrity` block above.
 */
const assertBaselineFixtureIsOrdinary = () => {
  expect(
    ordinaryBaseline.myRoles,
    'the NON_SPACE_MEMBER baseline has picked up a platform role — it is the ' +
      'suite-wide shared target user, and a leaked grant moves the baseline ' +
      'that every comparison in this block is made against'
  ).toEqual(['REGISTERED']);
};

beforeAll(async () => {
  for (const role of ALL_THIRTEEN) {
    reported.set(role, await reportedFor(testUserFor(role)));
  }
  ordinaryBaseline = await reportedFor(TestUser.NON_SPACE_MEMBER);
}, 300_000);

describe('role privilege contract — what each role SEES, per policy', () => {
  describe('fixture integrity — these assertions are only sound on single-role users', () => {
    it.each(ALL_THIRTEEN)(
      '%s holds exactly that role and no legacy credential',
      role => {
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
      }
    );
  });

  describe('GREEN — the platform entity policy reports the expected privileges', () => {
    for (const [role, expected] of PLATFORM_POLICY_CONTRACT) {
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
    for (const [role, expected] of ROLE_SET_POLICY_CONTRACT) {
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
        // CURRENTLY DEAD, and deliberately kept: no member of
        // SHARED_PRIVILEGES is a key of EXCLUSIVE_PRIVILEGES, so this never
        // fires today. It is the guard for the day a privilege moves from
        // exclusive to shared — without it, that move turns this block into a
        // wall of false failures and the tempting fix is to delete the rows.
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

  describe('EDGE — the platform-policy-only roles add nothing on the role set', () => {
    // A4/A5/A8/A9. Each of these four has a genuine platform-entity privilege
    // asserted in the GREEN block above; what was never stated is the other
    // half of the row — that the role set gives them nothing. The handover
    // writes that half as "—", which generates no assertion at all unless it
    // is turned into an equality against a user who holds no role.
    it.each(PLATFORM_POLICY_ONLY_ROLES)(
      '%s reports exactly an ordinary user’s privileges on the ROLE SET policy',
      role => {
        assertBaselineFixtureIsOrdinary();

        const { roleSet } = reported.get(role)!;

        expect(
          [...roleSet].sort(),
          `${role} reports something on the ROLE SET policy that an ordinary ` +
            `user does not (reported: ${roleSet.join(', ') || 'none'}) — the ` +
            'role-set policy is where assignment and holder-read live, and ' +
            'this role is in neither business'
        ).toEqual([...ordinaryBaseline.roleSet].sort());
      }
    );
  });

  describe('EDGE — the account/space-anchored roles report nothing at platform level', () => {
    it.each(NO_PLATFORM_LEVEL_PRIVILEGE)(
      '%s reports no privilege on either platform-level policy',
      role => {
        // Baselined against an ordinary registered user, NOT against another
        // member of this same list: the previous version compared each role to
        // `FeatureBetaTester` while iterating a list that CONTAINS it, so the
        // A12 iteration asserted `expect(x).toEqual(x)` and could never fail.
        // A10 and A11 were genuinely compared and stay covered; only A12 was
        // vacuous.
        //
        // Still an equality against a live user rather than against `[]` — an
        // authenticated user carries baseline privileges that are nobody's
        // grant, and asserting emptiness outright would pin those too.
        assertBaselineFixtureIsOrdinary();

        const { platform, roleSet } = reported.get(role)!;

        expect(
          [...platform].sort(),
          `${role} reports a PLATFORM policy privilege an ordinary user does not — ` +
            'its privileges are anchored on the account/space policies, so it ' +
            'should be indistinguishable from a role-less user here'
        ).toEqual([...ordinaryBaseline.platform].sort());
        expect(
          [...roleSet].sort(),
          `${role} reports a ROLE SET policy privilege an ordinary user does not`
        ).toEqual([...ordinaryBaseline.roleSet].sort());
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
      // Reading only the platform policy reports a single ADDED privilege and
      // makes this role look unprivileged — which is what hid the admin nav
      // entry. That is the claim; the count is not.
      //
      // The handover's "policy A has exactly 1" is a DELTA over an ordinary
      // user, not an absolute. Asserting `toHaveLength(1)` was red on the live
      // server: the real platform set is ['ACCESS_INTERACTIVE_GUIDANCE',
      // 'READ_USERS', 'SET_SERVICE_PROFILE'] — length 3, because every
      // authenticated user carries the first two. Stated as a delta the case
      // says what it meant to say and stops being hostage to a baseline this
      // feature does not own.
      assertBaselineFixtureIsOrdinary();

      const { platform, roleSet } = reported.get(RoleName.PlatformRolesAdmin)!;
      const platformAdded = platform
        .filter(privilege => !ordinaryBaseline.platform.includes(privilege))
        .sort();

      expect(
        platformAdded,
        'the platform ENTITY policy adds something other than the service-account ' +
          `marker for a Roles Admin (reported: ${platform.join(', ') || 'none'})`
      ).toEqual(['SET_SERVICE_PROFILE']);

      // The union half has to stay SENSITIVE, and `union.size >
      // baselineUnion.size` was not: measured live the baseline union is 2
      // ({ACCESS_INTERACTIVE_GUIDANCE, READ_USERS}), so a Roles Admin that had
      // lost its ENTIRE role-set contribution would still measure 3 > 2 and
      // pass — surviving the exact defect this case is named after. Asserted
      // as the EXACT added set on the role-set policy instead, against
      // `expectedDeltaFor` (the a-row-contract's exact-delta view, legitimate
      // here because the live baseline is subtracted first).
      const roleSetAdded = roleSet
        .filter(privilege => !ordinaryBaseline.roleSet.includes(privilege))
        .sort();

      expect(
        roleSetAdded,
        'the ROLE SET policy no longer carries the Roles Admin assignment ' +
          `privileges (reported: ${roleSet.join(', ') || 'none'}) — with only ` +
          'the service-account marker left on the platform policy, every ' +
          'consumer that reads one policy sees an unprivileged account'
      ).toEqual(
        [...expectedDeltaFor(RoleName.PlatformRolesAdmin)!.roleSet].sort()
      );

      // ...and A1's two policy contributions are DISJOINT — unlike A3/A6,
      // whose rows double by cascade. If a Roles Admin privilege ever starts
      // appearing on both policies the union stops being the sum, and that is
      // a cascade change to look at, not a rounding error.
      const union = new Set([...platform, ...roleSet]);
      const baselineUnion = new Set([
        ...ordinaryBaseline.platform,
        ...ordinaryBaseline.roleSet,
      ]);

      expect(
        union.size - baselineUnion.size,
        `a Roles Admin adds ${platformAdded.length} platform + ` +
          `${roleSetAdded.length} role-set privileges but only ` +
          `${union.size - baselineUnion.size} across the union — the two ` +
          'policies now overlap (or one contribution vanished)'
      ).toBe(platformAdded.length + roleSetAdded.length);
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
