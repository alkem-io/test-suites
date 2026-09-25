import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { getGraphqlClient } from '@alkemio/tests-lib';
import { PLATFORM_ROLES } from '../capabilities.data';
import type { PlatformRole } from '../capabilities.data';
import { invocationFor } from '../_support/groups';
import { classify, describeOutcome } from '../_support/outcome';
import {
  accessOf,
  added,
  assignRole,
  holdersOf,
  orThrow,
  removeRole,
  revokeAllRoles,
  setServiceProfile,
} from '../_support/role-set';
import type { Access } from '../_support/role-set';
import {
  createSubject,
  createSubjectOrganization,
  deleteSubjectOrganization,
  deleteSubjects,
} from '../_support/subjects';
import type { Subject } from '../_support/subjects';
import { NEEDS_SERVICE_PROFILE } from '../_support/role-users';
import { bearer } from '../_support/types';
import type { GroupFixtures, RunContext } from '../_support/types';

/**
 * What a grant ADDS to the holder, exactly, on the platform policy and on the
 * role-set policy — measured live against the server under test, as the
 * subject, on the very next request after the grant.
 *
 * Exact sets, not `toContain`: containment cannot see a role that confers more
 * than it should. An empty row is a real expectation — that role's capability
 * sits on other policies (accounts, spaces, licensing) and must add nothing here.
 */
const GRANT_ADDS: Record<
  PlatformRole,
  { platform: string[]; roleSet: string[] }
> = {
  PLATFORM_ROLES_ADMIN: {
    platform: ['SET_SERVICE_PROFILE'],
    roleSet: [
      'FEATURE_ROLE_ASSIGN',
      'GRANT_GLOBAL_ADMINS',
      'PLATFORM_ROLE_HOLDERS_READ',
    ],
  },
  PLATFORM_CONTENT_FULL_ACCESS: {
    platform: [
      'CREATE',
      'DELETE',
      'PLATFORM_CONTENT_FULL_ACCESS',
      'READ',
      'UPDATE',
    ],
    roleSet: [
      'CREATE',
      'DELETE',
      'PLATFORM_CONTENT_FULL_ACCESS',
      'READ',
      'UPDATE',
    ],
  },
  PLATFORM_RESOURCE_ADMIN: { platform: [], roleSet: [] },
  PLATFORM_SETTINGS_ADMIN: {
    platform: ['PLATFORM_SETTINGS_ADMIN'],
    roleSet: [],
  },
  PLATFORM_OPERATIONS_ADMIN: {
    platform: ['AUTHORIZATION_RESET', 'PLATFORM_OPERATIONS_ADMIN'],
    roleSet: [],
  },
  PLATFORM_USERS_ADMIN: {
    platform: ['PLATFORM_USERS_ADMIN'],
    roleSet: ['FEATURE_ROLE_ASSIGN', 'FEATURE_ROLE_HOLDERS_READ'],
  },
  PLATFORM_SUPPORT: {
    platform: [
      'CREATE_ORGANIZATION',
      'PLATFORM_FORUM_MANAGE',
      'PLATFORM_SUPPORT_LISTS_READ',
    ],
    roleSet: ['PLATFORM_FORUM_MANAGE'],
  },
  // The console lists (spaces / organizations / users) License Manager needs to
  // find what it licenses — server 553f1c1b6, 2026-09-18.
  PLATFORM_LICENSE_MANAGER: {
    platform: ['PLATFORM_LICENSING_LISTS_READ'],
    roleSet: [],
  },
  PLATFORM_SPACES_READER: { platform: [], roleSet: [] },
  PLATFORM_AUDIT_READER: {
    platform: ['PLATFORM_AUDIT_READ'],
    roleSet: ['PLATFORM_ROLE_HOLDERS_READ'],
  },
  FEATURE_BETA_TESTER: { platform: [], roleSet: [] },
  FEATURE_VIRTUAL_ASSISTANT: {
    platform: ['ACCESS_VIRTUAL_ASSISTANT'],
    roleSet: [],
  },
  FEATURE_ORGANIZATION_CREATOR: {
    platform: ['CREATE_ORGANIZATION'],
    roleSet: [],
  },
  FEATURE_VC_CAMPAIGN: { platform: [], roleSet: [] },
};

/**
 * One action the role owns, run AS THE SUBJECT while it holds the role and
 * again after the revoke. Only invocations that consume no shared target
 * qualify: a group's per-role targets belong to the role specs running in
 * parallel. A role without a row is `todo` until its group module exists.
 * The three Feature roles that own no administrative action are F1–F3.
 */
const OWNED_ACTION: Partial<Record<PlatformRole, string>> = {
  PLATFORM_SETTINGS_ADMIN: 'A10.updatePlatformSettings',
  PLATFORM_SUPPORT: 'A6.createOrganization',
  FEATURE_ORGANIZATION_CREATOR: 'A6.createOrganization',
  // Reads and idempotent calls only — nothing here consumes a per-role target.
  PLATFORM_ROLES_ADMIN: 'A20.usersInRole',
  PLATFORM_USERS_ADMIN: 'A20b.usersInRole',
  PLATFORM_AUDIT_READER: 'A19.userEmailChangeAuditEntries',
  PLATFORM_SPACES_READER: 'A16.createPlatformRolesAccess',
  PLATFORM_CONTENT_FULL_ACCESS: 'A16.createPlatformRolesAccess',
  PLATFORM_OPERATIONS_ADMIN:
    'A11.adminCommunicationEnsureAccessToCommunications',
  // This spec runs in the SECOND phase, after every role file has finished, so
  // these two may touch group fixtures: the visibility change restores itself,
  // and the VC conversion is repeatable (its effect still holds on a second call).
  PLATFORM_LICENSE_MANAGER: 'A14.updateSpacePlatformSettings',
  PLATFORM_RESOURCE_ADMIN: 'A9.convertVirtualContributorToUseKnowledgeBase',
};
const PROVEN_BY_FEATURE_SCENARIOS: ReadonlySet<PlatformRole> = new Set([
  'FEATURE_BETA_TESTER',
  'FEATURE_VIRTUAL_ASSISTANT',
  'FEATURE_VC_CAMPAIGN',
]);

const FEATURE_ROLES = PLATFORM_ROLES.filter(r => r.startsWith('FEATURE_'));

let ctx: RunContext;
let rolesAdmin: string;
let subject: Subject;
let baseline: Access;
let organizationId: string;

beforeAll(async () => {
  ctx = inject('platformRoles');
  rolesAdmin = ctx.tokens.PLATFORM_ROLES_ADMIN;
  subject = await createSubject('grantee');
  baseline = await accessOf(subject.token);
  organizationId = await createSubjectOrganization(
    ctx.tokens.PLATFORM_SUPPORT,
    ctx.runId,
    'grant'
  );
}, 120_000);

afterAll(async () => {
  const residue: string[] = [];
  const attempt = async (step: string, run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (e) {
      residue.push(`${step}: ${(e as Error).message}`);
    }
  };
  if (organizationId) {
    await attempt('delete the organization', () =>
      deleteSubjectOrganization(ctx.tokens.PLATFORM_SUPPORT, organizationId)
    );
  }
  if (subject) {
    await attempt('strip the subject', () =>
      revokeAllRoles(ctx.bootstrapToken, subject)
    );
    await attempt('delete the subject', () =>
      deleteSubjects(ctx.tokens.PLATFORM_USERS_ADMIN, [subject])
    );
  }
  if (residue.length > 0) {
    throw new Error(`grantability left residue — ${residue.join(' | ')}`);
  }
}, 120_000);

/** Grants `role` to the subject, runs `body`, and always takes the role back. */
const whileHolding = async (
  role: PlatformRole,
  body: () => Promise<void>
): Promise<void> => {
  const marked = NEEDS_SERVICE_PROFILE.has(role);
  if (marked) {
    await orThrow(
      'set the marker',
      setServiceProfile(rolesAdmin, subject.id, true)
    );
  }
  try {
    const granted = await assignRole(rolesAdmin, role, subject.id);
    expect(granted.kind, describeOutcome(granted)).toBe('ok');
    await body();
  } finally {
    await revokeAllRoles(rolesAdmin, subject);
    if (marked) {
      await orThrow(
        'clear the marker',
        setServiceProfile(rolesAdmin, subject.id, false)
      );
    }
  }
};

const ownedAction = (role: PlatformRole) => {
  const id = OWNED_ACTION[role];
  const found = id ? invocationFor(id) : undefined;
  if (!id || !found) return undefined;
  const fx = () => ctx.fixtures[found.group.group] as GroupFixtures;
  return {
    id,
    invocation: found.invocation,
    fx,
    run: () =>
      classify(found.invocation.gate, () =>
        found.invocation.call(
          getGraphqlClient(),
          bearer(subject.token),
          fx(),
          role
        )
      ),
  };
};

describe('G1.every-role-round-trip', () => {
  describe.each(PLATFORM_ROLES)('%s', role => {
    test('positive: grant adds exactly its privileges; revoke removes them and the holder entry', async () => {
      expect(await accessOf(subject.token)).toEqual(baseline);

      await whileHolding(role, async () => {
        const held = await accessOf(subject.token);
        expect(added(baseline.myRoles, held.myRoles)).toEqual([role]);
        expect({
          platform: added(baseline.platform, held.platform),
          roleSet: added(baseline.roleSet, held.roleSet),
        }).toEqual(GRANT_ADDS[role]);
        expect(await holdersOf(rolesAdmin, role)).toContain(subject.id);
      });

      expect(await accessOf(subject.token)).toEqual(baseline);
      expect(await holdersOf(rolesAdmin, role)).not.toContain(subject.id);
    });

    if (PROVEN_BY_FEATURE_SCENARIOS.has(role)) return;

    const action = ownedAction(role);
    if (!action) {
      test.todo(
        'positive: one owned action succeeds while the role is held — no side-effect-free invocation for this role in _support/groups yet'
      );
      test.todo(
        'negative: the owned action is denied after the revoke — same enabler'
      );
      return;
    }

    test(`positive: ${action.id} succeeds while the role is held`, async () => {
      await whileHolding(role, async () => {
        const outcome = await action.run();
        expect(outcome.kind, describeOutcome(outcome)).toBe('ok');
        if (outcome.kind === 'ok' && action.invocation.verify) {
          await action.invocation.verify({
            ctx,
            fx: action.fx(),
            role,
            data: outcome.data,
            sdk: getGraphqlClient(),
            reader: bearer(ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS),
            caller: { token: subject.token, id: subject.id },
          });
        }
      });
    });

    test(`negative: ${action.id} is denied at the root field after the revoke`, async () => {
      await whileHolding(role, async () => undefined);

      const outcome = await action.run();
      expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
    });
  });
});

describe('G2.organization-holder', () => {
  test.each(FEATURE_ROLES)(
    'positive: %s — grant lists the organization, revoke removes it',
    async role => {
      const reader = ctx.tokens.PLATFORM_USERS_ADMIN;
      try {
        const granted = await assignRole(
          reader,
          role,
          organizationId,
          'organization'
        );
        expect(granted.kind, describeOutcome(granted)).toBe('ok');
        expect(await holdersOf(reader, role, 'organization')).toContain(
          organizationId
        );
      } finally {
        const revoked = await removeRole(
          reader,
          role,
          organizationId,
          'organization'
        );
        expect(revoked.kind, describeOutcome(revoked)).toBe('ok');
      }
      expect(await holdersOf(reader, role, 'organization')).not.toContain(
        organizationId
      );
    }
  );

  test.todo(
    'positive: organization-subject audit record — the MCP audit tool filters by subjectUserId only; needs a subjectOrganizationId filter on the server'
  );
});
