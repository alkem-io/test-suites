import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getGraphqlClient,
  TestUser,
  TestUserManager,
  UniqueIDGenerator,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import type { GraphQLReturnType } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  assertAuditDbReachable,
  auditCount,
  auditDbAvailable,
  auditRowsForSubject,
} from './helpers/audit-db';
import type { AuditRow } from './helpers/audit-db';
import {
  createDisposableSubject,
  destroyDisposableSubject,
} from './helpers/disposable-subject';
import type { DisposableSubject } from './helpers/disposable-subject';
import {
  createOrganization,
  deleteOrganization,
} from '@functional-api/contributor-management/organization/organization.request.params';

/**
 * workspace#027-platform-role-redesign — handover group C: the audit RECORD
 * itself (C1-C6 + C-org), read out of real Postgres.
 *
 * Until `helpers/audit-db.ts` existed this repo had NO read path for a
 * role-assignment audit row — `audit-coverage.it-spec.ts` and
 * `flows/rejection-audited.it-spec.ts` both say so in their headers, and both
 * assert only the halves observable WITHOUT the trail (the grant did/did not
 * take effect). This file closes that gap: every assertion below reads the
 * row the server actually wrote.
 *
 * THE VOCABULARY, verbatim — every paraphrase of it has produced a wrong test:
 *  * `category` for this feature is `platform_role_assignment`. The other
 *    categories 027 writes are `platform_user_record`, `platform_configuration`
 *    and `platform_resource`; `platform_operations` belongs to
 *    workspace#032-platform-ops-admin-role, not to this feature.
 *  * `outcome` is one of `role_granted` | `role_revoked` |
 *    `role_grant_rejected` | `service_profile_changed`. `operation_succeeded`
 *    belongs to `platform_operations`; there is NO `success` and NO `failure`
 *    member anywhere in the enum, so asserting `outcome === 'success'` fails
 *    everywhere and reads like a product defect rather than a test bug.
 *  * `details.role` is the KEBAB role value (`platform-audit-reader`), never
 *    the GraphQL enum key (`PLATFORM_AUDIT_READER`). The two forms are never
 *    compared to each other.
 *  * `details.rejectedRule` holds the FULL ERROR MESSAGE — the resolver
 *    passes `error.message` straight through (`platform.role.resolver
 *    .mutations.ts`'s `recordGrantRejected` call) — NOT a `ruleId`. Matched
 *    with `toContain`, never `toEqual` against a rule id. The `ruleId` lives
 *    somewhere else entirely: `errors[0].extensions.details.ruleId`.
 *
 * This file deliberately does NOT import `./fixtures` — `buildMatrixFixtures`
 * is ~35 live API writes per importing file, and every case here needs one
 * clean, disposable subject rather than the whole matrix.
 */

const asUser = <TData>(
  fn: (authToken: string | undefined) => GraphQLReturnType<TData>,
  user: TestUser
) => graphqlErrorWrapper(fn, user);

/** `errors[0].extensions.details.ruleId` — nested TWO levels under
 * `extensions`, which is the single most-repeated mistake against this
 * surface. Verified live 2026-08-05 against the running Slice A stack. */
const ruleIdOf = (
  errors: Array<Record<string, unknown>> | undefined
): unknown => {
  const extensions = errors?.[0]?.extensions as
    | { details?: { ruleId?: unknown } }
    | undefined;
  return extensions?.details?.ruleId;
};

/** The rows for `subjectId` that belong to THIS feature, newest first. Never
 * identify a row by `auditTail` position: on a shared stack an unrelated
 * write (a license reset, another spec file's fixture seeding) can land
 * between the mutation and the read. */
const assignmentRowsFor = (subjectId: string): AuditRow[] =>
  auditRowsForSubject(subjectId).filter(
    row => row.category === 'platform_role_assignment'
  );

// Skip ONLY on the explicit opt-out. An unreachable container must NOT quietly
// delete C1-C6 and C-org: they are the only assertions in this repo that read
// the audit row at all, so a silent skip turns six real cases into a green run
// and a console warning nobody tails. `assertAuditDbReachable()` in `beforeAll`
// fails the suite loudly instead.
const auditDbOptedOut = process.env.PLATFORM_ROLES_AUDIT_DB === 'off';

if (auditDbOptedOut) {
  console.warn(
    '========================================================================\n' +
      'platform-roles group C (audit-rows.it-spec.ts) SKIPPED — explicitly\n' +
      'disabled with PLATFORM_ROLES_AUDIT_DB=off. C1-C6 and C-org assert the\n' +
      'audit ROW itself and have no other read path in this repo.\n' +
      '========================================================================'
  );
} else if (!auditDbAvailable()) {
  console.warn(
    '========================================================================\n' +
      'platform-roles group C (audit-rows.it-spec.ts) will FAIL — the audit\n' +
      'store is not reachable (alkemio_dev_postgres down?). This is a hard\n' +
      'failure by design; set PLATFORM_ROLES_AUDIT_DB=off to opt out on\n' +
      'purpose rather than by accident.\n' +
      '========================================================================'
  );
}

describe.skipIf(auditDbOptedOut)(
  'group C — the role-assignment audit row in real Postgres',
  () => {
    let subject: DisposableSubject;

    beforeAll(async () => {
      assertAuditDbReachable();
      subject = await createDisposableSubject('audit-rows-subject');
    }, 300_000);

    afterAll(async () => {
      if (subject) {
        await destroyDisposableSubject(subject.id);
      }
    });

    it('C1/C2/C3: a user grant writes exactly one platform_role_assignment row attributed to the granter', async () => {
      const countBefore = auditCount();

      await getGraphqlClient().assignPlatformRoleToUser(
        {
          roleData: {
            actorID: subject.id,
            role: RoleName.PlatformAuditReader,
          },
        },
        {
          authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
        }
      );

      // C1 — `>=`, not `===`: this is a SHARED stack. Another spec file's
      // fixture seeding or a license reset can commit its own row between
      // these two reads, and a strict equality would then fail for a reason
      // that has nothing to do with the grant. The reference driver
      // (`specs/027-platform-role-redesign/role_drive.py`) asserts only `>`
      // for exactly this reason.
      expect(
        auditCount(),
        'a grant must write at least one platform_audit_entry row'
      ).toBeGreaterThanOrEqual(countBefore + 1);

      const rows = assignmentRowsFor(subject.id);
      expect(
        rows.length,
        'the grant must be findable by SUBJECT, not by tail position'
      ).toBeGreaterThan(0);
      const row = rows[0];

      // C2 — the row's identity. `subjectOrganizationId` is asserted NULL as
      // the other half of the XOR the migration
      // (`AlterPlatformAuditEntrySubject1785000000001`) introduced.
      expect(row.category).toBe('platform_role_assignment');
      expect(row.outcome).toBe('role_granted');
      expect(row.subjectUserId).toBe(subject.id);
      expect(row.subjectOrganizationId).toBeNull();

      // C3 — TWO accepted values, deliberately (handover §4): `admin@alkem.io`
      // holds BOTH `platform-roles-admin` and the legacy `global-admin`
      // credential, and which of them `resolveInitiatorRole` attributes
      // depends on the Slice A legacy carve-out. Pinning one is brittle for
      // no benefit; the property under test is "the row names A role that
      // could have authorized this", not which one won the tie.
      expect(['platform_roles_admin', 'platform_admin']).toContain(
        row.initiatorRole
      );
      expect(
        row.initiatorUserId,
        'the row must name the acting operator, not the subject'
      ).toBe(TestUserManager.users.globalAdmin.id);

      expect(row.details).toEqual({
        role: 'platform-audit-reader',
        seeded: false,
        targetKind: 'user',
      });
    });

    it('C4: the matching revoke writes outcome=role_revoked for the same subject', async () => {
      await getGraphqlClient().removePlatformRoleFromUser(
        {
          roleData: {
            actorID: subject.id,
            role: RoleName.PlatformAuditReader,
          },
        },
        {
          authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
        }
      );

      const row = assignmentRowsFor(subject.id)[0];
      expect(row.outcome).toBe('role_revoked');
      expect(row.category).toBe('platform_role_assignment');
      expect(row.subjectUserId).toBe(subject.id);
      expect(row.subjectOrganizationId).toBeNull();
      // Identical `details` shape to the grant — the outcome column is the
      // ONLY thing that distinguishes a revoke record from a grant record, so
      // a test that reads `details` alone cannot tell them apart.
      expect(row.details).toEqual({
        role: 'platform-audit-reader',
        seeded: false,
        targetKind: 'user',
      });
    });

    it('C-org: an organization-target grant writes subjectOrganizationId and leaves subjectUserId NULL', async () => {
      // The ONLY end-to-end observation of migration
      // `AlterPlatformAuditEntrySubject1785000000001` (subjectUserId made
      // nullable + subjectOrganizationId added). The server's unit spec
      // proves the subject XOR by construction, over a repository double —
      // it cannot show that the COLUMN accepts a null and that the other one
      // is populated, which is the half a bad migration breaks.
      //
      // Only the three `Feature …` roles are org-holdable
      // (`organizationPolicy {0,-1}`); every `Platform …` role is
      // `{0,0}` and is rejected by the org surface guard before the rule
      // engine is reached.
      const runId = UniqueIDGenerator.getID();
      const orgResult = await createOrganization(
        `audit-rows-org-${runId}`,
        `audit-rows-org-${runId}`
      );
      const organizationId = orgResult.data?.createOrganization?.id;
      expect(
        organizationId,
        `could not create the throwaway organization: ${JSON.stringify(orgResult.error)}`
      ).toBeTruthy();

      try {
        await getGraphqlClient().assignPlatformRoleToOrganization(
          {
            roleData: {
              actorID: organizationId as string,
              role: RoleName.FeatureOrganizationCreator,
            },
          },
          {
            authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
          }
        );

        const granted = assignmentRowsFor(organizationId as string)[0];
        expect(granted.outcome).toBe('role_granted');
        expect(granted.subjectOrganizationId).toBe(organizationId);
        expect(
          granted.subjectUserId,
          'an organization-target row leaves subjectUserId NULL — a query filtering on it drops every organization case silently'
        ).toBeNull();
        expect(granted.details).toEqual({
          role: 'feature-organization-creator',
          seeded: false,
          targetKind: 'organization',
        });

        await getGraphqlClient().removePlatformRoleFromOrganization(
          {
            roleData: {
              actorID: organizationId as string,
              role: RoleName.FeatureOrganizationCreator,
            },
          },
          {
            authorization: `Bearer ${TestUserManager.users.globalAdmin.authToken}`,
          }
        );

        const revoked = assignmentRowsFor(organizationId as string)[0];
        expect(revoked.outcome).toBe('role_revoked');
        expect(revoked.subjectOrganizationId).toBe(organizationId);
        expect(revoked.subjectUserId).toBeNull();
      } finally {
        if (organizationId) {
          await deleteOrganization(organizationId);
        }
      }
    });

    it('C5/C6: a self-assignment rejection by a privileged granter is recorded, naming the granter as the subject', async () => {
      const granterId = TestUserManager.users.globalAdmin.id;

      // THE TRAP THAT SILENTLY GUTS C5: an actor holding NEITHER
      // `GRANT_GLOBAL_ADMINS` NOR `FEATURE_ROLE_ASSIGN` is treated as an
      // unprivileged PROBE — `platform.role.resolver.mutations.ts` throws on
      // `!hasAnyAssignerCapability` BEFORE `recordGrantRejected` is ever
      // called, deliberately (sec-server-11: otherwise any logged-in user
      // could drive one INSERT per request with a subject id of their
      // choosing). `TestUser.PLATFORM_SUPPORT` holds neither privilege and is
      // therefore exactly the WRONG actor for this case: the rejection is
      // real, the audit row never exists, and the test would be asserting
      // nothing. Only a PRIVILEGED granter reaches the rejection record.
      //
      // Routed through `asUser`/`graphqlErrorWrapper` because the raw
      // generated SDK throws a `ClientError` on any GraphQL error response
      // instead of returning `{data, errors}` — an unwrapped denial call dies
      // before the assertion runs.
      const rejected = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: granterId,
                role: RoleName.PlatformUsersAdmin,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.GLOBAL_ADMIN
      );

      expect(rejected.error?.errors?.[0]?.message).toContain(
        'self-assignment of role'
      );
      expect(ruleIdOf(rejected.error?.errors)).toBe('self-assignment');

      const row = assignmentRowsFor(granterId)[0];
      expect(row.outcome).toBe('role_grant_rejected');
      expect(row.category).toBe('platform_role_assignment');
      // C6 — on a self-assignment the GRANTER *is* the subject. This is the
      // property that makes an attempted privilege grab findable at all: a
      // trail keyed only on "who was granted something" has no entry for the
      // grab that was refused.
      expect(row.subjectUserId).toBe(granterId);
      expect(row.initiatorUserId).toBe(granterId);
      expect(String(row.details?.rejectedRule)).toContain('self-assignment');
      expect(row.details?.role).toBe('platform-users-admin');
    });

    it('C5: a cross-family attempt by a Platform Users Admin is rejected on FR-003 and recorded', async () => {
      // The one probe in this run with a NON-admin initiator.
      // `TestUser.PLATFORM_USERS_ADMIN` holds `FEATURE_ROLE_ASSIGN`, so it IS
      // privileged (it passes `hasAnyAssignerCapability`) and its rejection IS
      // audited — unlike `PLATFORM_SUPPORT`, whose attempts leave no row at
      // all. What it does NOT hold is `GRANT_GLOBAL_ADMINS`, which every
      // `Platform …` role requires: FR-003's one-way rule.
      const rejected = await asUser(
        token =>
          getGraphqlClient().assignPlatformRoleToUser(
            {
              roleData: {
                actorID: subject.id,
                role: RoleName.PlatformSettingsAdmin,
              },
            },
            { authorization: `Bearer ${token}` }
          ),
        TestUser.PLATFORM_USERS_ADMIN
      );

      // Verbatim from `platform.role.assignment.rules.service.ts`'s
      // `checkAssignerCapability`, confirmed live 2026-08-05.
      expect(rejected.error?.errors?.[0]?.message).toContain(
        'grant-global-admins required to assign role platform-settings-admin'
      );
      expect(ruleIdOf(rejected.error?.errors)).toBe('assigner-capability');

      const row = assignmentRowsFor(subject.id)[0];
      expect(row.outcome).toBe('role_grant_rejected');
      expect(row.category).toBe('platform_role_assignment');
      expect(row.subjectUserId).toBe(subject.id);
      expect(String(row.details?.rejectedRule)).toContain(
        'required to assign role'
      );
      expect(row.details?.role).toBe('platform-settings-admin');

      // ATTRIBUTION ON A REJECTED CROSS-FAMILY ATTEMPT IS `self`, NOT
      // `platform_users_admin` — measured live 2026-08-05, and true by
      // construction. `resolveA1A2InitiatorRole*` is called with the
      // *surface's* declared owners: for a `Platform …` role that is
      // `A1_INTENDED_OWNERS = [PLATFORM_ROLES_ADMIN]` with
      // `A1_LEGACY_REACHERS = [GLOBAL_ADMIN]`. A Platform Users Admin holds
      // neither, so the strict resolver's empty-intersection branch fires and
      // `resolveInitiatorRoleBestEffort` falls back to `self` rather than
      // throwing a second exception while already handling a rejection.
      // `platform_users_admin` IS written — but only where that credential is
      // a declared owner, i.e. on a `Feature …` role. That is the case the
      // next test pins.
      expect(row.initiatorRole).toBe('self');
      expect(
        row.initiatorUserId,
        'the initiator column still identifies the actor even when the role narrows to `self`'
      ).toBe(
        TestUserManager.getUserModelByType(TestUser.PLATFORM_USERS_ADMIN).id
      );
    });

    it('C3b: a Feature-role grant by a Platform Users Admin attributes initiatorRole=platform_users_admin', async () => {
      // The Feature family's declared owners are
      // `A2_INTENDED_OWNERS = [PLATFORM_USERS_ADMIN, PLATFORM_ROLES_ADMIN]`,
      // so this is the ONE shape in which `resolveInitiatorRole` narrows to a
      // non-admin role. Everything else in this run is driven by `admin@`,
      // which resolves to `platform_roles_admin`/`platform_admin` and would
      // therefore pass even if the narrowing were broken for every other
      // credential.
      const usersAdminToken = TestUserManager.getUserModelByType(
        TestUser.PLATFORM_USERS_ADMIN
      ).authToken;

      await getGraphqlClient().assignPlatformRoleToUser(
        {
          roleData: {
            actorID: subject.id,
            role: RoleName.FeatureOrganizationCreator,
          },
        },
        { authorization: `Bearer ${usersAdminToken}` }
      );

      try {
        const row = assignmentRowsFor(subject.id)[0];
        expect(row.outcome).toBe('role_granted');
        expect(row.initiatorRole).toBe('platform_users_admin');
        expect(row.subjectUserId).toBe(subject.id);
        expect(row.details).toEqual({
          role: 'feature-organization-creator',
          seeded: false,
          targetKind: 'user',
        });
      } finally {
        // The subject is disposable, but restore it anyway: an assertion
        // failure above must not change which roles the NEXT case sees.
        await getGraphqlClient()
          .removePlatformRoleFromUser(
            {
              roleData: {
                actorID: subject.id,
                role: RoleName.FeatureOrganizationCreator,
              },
            },
            { authorization: `Bearer ${usersAdminToken}` }
          )
          .catch(() => {
            // best-effort — the subject is deleted in afterAll regardless
          });
      }
    });
  }
);
