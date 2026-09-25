import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLES } from '../capabilities.data';
import type { PlatformRole } from '../capabilities.data';
import { describeOutcome } from '../_support/outcome';
import { rawRead, rawRequest } from '../_support/raw-request';
import {
  accessOf,
  assignRole,
  holdersOf,
  orThrow,
  rejectionOf,
  removeRole,
  revokeAllRoles,
  setServiceProfile,
} from '../_support/role-set';
import {
  createSubject,
  createSubjectOrganization,
  deleteSubjectOrganization,
  deleteSubjects,
} from '../_support/subjects';
import type { Subject } from '../_support/subjects';
import type { RunContext } from '../_support/types';
import { expectRecorded, rejectedGrant } from '../_support/audit-assertions';
import { mcpTest } from '../_support/mcp-client';

/**
 * The six assignment rules. Every negative is made by a caller that PASSES the
 * resolver's "holds any assigner capability" pre-check, so the refusal comes
 * from the rule engine and not from the door in front of it.
 *
 * All grants land on disposable subjects. The acting Roles Admins of rule 6 are
 * disposable too: a broken rule would otherwise leave the shared role user with
 * a second role and poison every negative in the suite.
 */
const FEATURE_ROLES = PLATFORM_ROLES.filter(r => r.startsWith('FEATURE_'));
const PLATFORM_FAMILY = PLATFORM_ROLES.filter(r => r.startsWith('PLATFORM_'));
const EXCLUDED_BY_AUDIT_READER = PLATFORM_FAMILY.filter(
  r => r !== 'PLATFORM_AUDIT_READER'
);

/** The server's spelling of a role inside its error texts. */
const spelled = (role: PlatformRole): string =>
  role.toLowerCase().replace(/_/g, '-');

let ctx: RunContext;
let rolesAdmin: string;
let usersAdmin: string;

/** Never marked as a service account. */
let human: Subject;
/** Marked as a service account for the whole file. */
let service: Subject;
let holder: Subject;
/** Owns the private space rule 3's positive reads. */
let host: Subject;
let adminOne: Subject;
let adminTwo: Subject;
let organizationId: string;
let privateSpaceId: string;

const subjects = (): Subject[] =>
  [human, service, holder, host, adminOne, adminTwo].filter(Boolean);

const SPACE_READ =
  'query($id: UUID!) { lookup { space(ID: $id) { id collaboration { id } } } }';
type SpaceRead = {
  lookup: { space: { id: string; collaboration: { id: string } } | null };
};

beforeAll(async () => {
  ctx = inject('platformRoles');
  rolesAdmin = ctx.tokens.PLATFORM_ROLES_ADMIN;
  usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;

  human = await createSubject('human');
  service = await createSubject('service');
  holder = await createSubject('holder');
  host = await createSubject('host');
  adminOne = await createSubject('adminone');
  adminTwo = await createSubject('admintwo');

  for (const marked of [service, holder]) {
    await orThrow(
      'mark as service account',
      setServiceProfile(rolesAdmin, marked.id, true)
    );
  }
  organizationId = await createSubjectOrganization(
    ctx.tokens.PLATFORM_SUPPORT,
    ctx.runId,
    'rules'
  );

  // A private space nobody but its owner can read, made with target roles
  // only: Feature Beta Tester entitles the host's own account to one space.
  await orThrow(
    'entitle the space host',
    assignRole(usersAdmin, 'FEATURE_BETA_TESTER', host.id)
  );
  const { me } = await rawRead<{ me: { user: { account: { id: string } } } }>(
    host.token,
    'query { me { user { account { id } } } }'
  );
  const created = await rawRead<{ createSpace: { id: string } }>(
    host.token,
    'mutation($space: CreateSpaceOnAccountInput!) { createSpace(spaceData: $space) { id } }',
    {
      space: {
        accountID: me.user.account.id,
        nameID: `pr-rules-${ctx.runId}`,
        about: {
          profileData: { displayName: `platform-roles rules ${ctx.runId}` },
        },
        collaborationData: { calloutsSetData: {} },
      },
    }
  );
  privateSpaceId = created.createSpace.id;
  await rawRead(
    host.token,
    'mutation($settings: UpdateSpaceSettingsInput!) { updateSpaceSettings(settingsData: $settings) { id } }',
    {
      settings: {
        spaceID: privateSpaceId,
        settings: { privacy: { mode: 'PRIVATE' } },
      },
    }
  );
}, 180_000);

afterAll(async () => {
  const residue: string[] = [];
  const attempt = async (step: string, run: () => Promise<unknown>) => {
    try {
      await run();
    } catch (e) {
      residue.push(`${step}: ${(e as Error).message}`);
    }
  };

  if (privateSpaceId) {
    await attempt('delete the private space', () =>
      rawRead(
        host.token,
        'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }',
        { id: privateSpaceId }
      )
    );
  }
  if (organizationId) {
    await attempt('delete the organization', () =>
      deleteSubjectOrganization(ctx.tokens.PLATFORM_SUPPORT, organizationId)
    );
  }
  for (const subject of subjects()) {
    await attempt(`strip ${subject.email}`, () =>
      revokeAllRoles(ctx.bootstrapToken, subject)
    );
  }
  await attempt('delete the subjects', () =>
    deleteSubjects(usersAdmin, subjects())
  );
  if (residue.length > 0) {
    throw new Error(`assignment-rules left residue — ${residue.join(' | ')}`);
  }
}, 120_000);

describe('R1.assigner-capability', () => {
  test('positive: Users Admin grants a Feature role and the holder list shows the target', async () => {
    const role = 'FEATURE_VIRTUAL_ASSISTANT';
    try {
      const granted = await assignRole(usersAdmin, role, human.id);
      expect(granted.kind, describeOutcome(granted)).toBe('ok');
      expect(await holdersOf(usersAdmin, role)).toContain(human.id);
    } finally {
      await orThrow('cleanup', removeRole(usersAdmin, role, human.id));
    }
  });

  test('negative: Users Admin grants a Platform role — refused by rule 1, target holds nothing', async () => {
    const role = 'PLATFORM_SUPPORT';
    const before = await accessOf(human.token);

    const refused = await assignRole(usersAdmin, role, human.id);

    expect(refused.kind, describeOutcome(refused)).toBe('denied');
    const { message, ruleId } = rejectionOf(refused);
    expect(ruleId).toBe('assigner-capability');
    expect(message).toMatch(
      new RegExp(`^Forbidden: \\S+ required to assign role ${spelled(role)}$`)
    );
    expect(await accessOf(human.token)).toEqual(before);
    expect(await holdersOf(rolesAdmin, role)).not.toContain(human.id);
  });

  mcpTest('negative: the refusal is recorded against the target', () =>
    expectRecorded(
      ctx.tokens.PLATFORM_AUDIT_READER,
      human.id,
      () => assignRole(usersAdmin, 'PLATFORM_SUPPORT', human.id),
      { newest: rejectedGrant('required to assign role platform-support') }
    )
  );
});

describe('R2.holder-kind', () => {
  test.each(FEATURE_ROLES)(
    'positive: %s granted to an organization shows in organizationsInRole',
    async role => {
      try {
        const granted = await assignRole(
          usersAdmin,
          role,
          organizationId,
          'organization'
        );
        expect(granted.kind, describeOutcome(granted)).toBe('ok');
        expect(await holdersOf(usersAdmin, role, 'organization')).toContain(
          organizationId
        );
      } finally {
        await orThrow(
          'cleanup',
          removeRole(usersAdmin, role, organizationId, 'organization')
        );
      }
    }
  );

  test.each(PLATFORM_FAMILY)(
    'negative: %s granted to an organization — refused for the holder kind, organization not listed',
    async role => {
      const refused = await assignRole(
        rolesAdmin,
        role,
        organizationId,
        'organization'
      );

      expect(refused.kind, describeOutcome(refused)).toBe('denied');
      const { message, ruleId } = rejectionOf(refused);
      expect(ruleId).toBe('holder-kind');
      expect(message).toBe(
        `Rejected: role ${spelled(role)} may not be assigned or removed through the organization surface`
      );
      // One frame deeper the role-set policy would refuse the same call for
      // the wrong reason (its organization limit is zero).
      expect(JSON.stringify(refused)).not.toMatch(/RoleSetPolicyRoleLimits/i);
      expect(await holdersOf(rolesAdmin, role, 'organization')).not.toContain(
        organizationId
      );
    }
  );

  test.todo(
    'negative: rejection audit record — the MCP audit tool filters by subjectUserId only, so an ORGANIZATION-subject record cannot be read without a server change'
  );
});

describe('R3.spaces-reader-service-account', () => {
  const readSpace = () =>
    rawRequest<SpaceRead>(service.token, SPACE_READ, { id: privateSpaceId });

  test('positive: a service account is granted Spaces Reader and reads a private space', async () => {
    const role = 'PLATFORM_SPACES_READER';
    const withoutRole = await readSpace();
    expect(withoutRole.errors[0]?.extensions?.code).toBe('FORBIDDEN_POLICY');

    try {
      const granted = await assignRole(rolesAdmin, role, service.id);
      expect(granted.kind, describeOutcome(granted)).toBe('ok');

      const withRole = await readSpace();
      expect(withRole.errors).toEqual([]);
      expect(withRole.data?.lookup.space?.collaboration.id).toMatch(
        /^[0-9a-f-]{36}$/
      );
    } finally {
      await orThrow('cleanup', removeRole(rolesAdmin, role, service.id));
    }
  });

  test('negative: a human target — refused by rule 3, not a holder', async () => {
    const role = 'PLATFORM_SPACES_READER';
    const before = await accessOf(human.token);

    const refused = await assignRole(rolesAdmin, role, human.id);

    expect(refused.kind, describeOutcome(refused)).toBe('denied');
    expect(rejectionOf(refused)).toMatchObject({
      ruleId: 'spaces-reader-service-account',
      message:
        'Rejected: platform-spaces-reader may only be granted to a service account',
    });
    expect(await accessOf(human.token)).toEqual(before);
    expect(await holdersOf(rolesAdmin, role)).not.toContain(human.id);
  });

  mcpTest('negative: the refusal is recorded against the target', () =>
    expectRecorded(
      ctx.tokens.PLATFORM_AUDIT_READER,
      human.id,
      () => assignRole(rolesAdmin, 'PLATFORM_SPACES_READER', human.id),
      { newest: rejectedGrant('may only be granted to a service account') }
    )
  );
});

describe('R4.audit-reader-exclusion', () => {
  test('positive: an Audit Reader is granted a Feature role — the boundary of the exclusion', async () => {
    try {
      await orThrow(
        'make the subject an Audit Reader',
        assignRole(rolesAdmin, 'PLATFORM_AUDIT_READER', service.id)
      );
      const granted = await assignRole(
        rolesAdmin,
        'FEATURE_VIRTUAL_ASSISTANT',
        service.id
      );
      expect(granted.kind, describeOutcome(granted)).toBe('ok');
      expect((await accessOf(service.token)).myRoles).toEqual([
        'FEATURE_VIRTUAL_ASSISTANT',
        'PLATFORM_AUDIT_READER',
        'REGISTERED',
      ]);
    } finally {
      await revokeAllRoles(rolesAdmin, service);
    }
  });

  test.each(EXCLUDED_BY_AUDIT_READER)(
    'negative: direction 1 — a %s holder is refused Audit Reader, state unchanged',
    async held => {
      try {
        await orThrow(`grant ${held}`, assignRole(rolesAdmin, held, holder.id));
        const before = await accessOf(holder.token);

        const refused = await assignRole(
          rolesAdmin,
          'PLATFORM_AUDIT_READER',
          holder.id
        );

        expect(refused.kind, describeOutcome(refused)).toBe('denied');
        expect(rejectionOf(refused)).toMatchObject({
          ruleId: 'audit-reader-exclusion',
          message: `Rejected: platform-audit-reader is mutually exclusive with ${spelled(held)}`,
        });
        expect(await accessOf(holder.token)).toEqual(before);
        expect(
          await holdersOf(rolesAdmin, 'PLATFORM_AUDIT_READER')
        ).not.toContain(holder.id);
      } finally {
        await revokeAllRoles(rolesAdmin, holder);
      }
    }
  );

  test.each(EXCLUDED_BY_AUDIT_READER)(
    'negative: direction 2 — an Audit Reader is refused %s, state unchanged',
    async wanted => {
      try {
        await orThrow(
          'make the subject an Audit Reader',
          assignRole(rolesAdmin, 'PLATFORM_AUDIT_READER', service.id)
        );
        const before = await accessOf(service.token);

        const refused = await assignRole(rolesAdmin, wanted, service.id);

        expect(refused.kind, describeOutcome(refused)).toBe('denied');
        expect(rejectionOf(refused)).toMatchObject({
          ruleId: 'audit-reader-exclusion',
          message: `Rejected: platform-audit-reader is mutually exclusive with ${spelled(wanted)}`,
        });
        expect(await accessOf(service.token)).toEqual(before);
        expect(await holdersOf(rolesAdmin, wanted)).not.toContain(service.id);
      } finally {
        await revokeAllRoles(rolesAdmin, service);
      }
    }
  );

  mcpTest(
    'negative: direction 1 — the refusal is recorded against the holder',
    async () => {
      try {
        await orThrow(
          'grant a Platform role',
          assignRole(rolesAdmin, 'PLATFORM_SUPPORT', holder.id)
        );
        await expectRecorded(
          ctx.tokens.PLATFORM_AUDIT_READER,
          holder.id,
          () => assignRole(rolesAdmin, 'PLATFORM_AUDIT_READER', holder.id),
          { newest: rejectedGrant('mutually exclusive with platform-support') }
        );
      } finally {
        await revokeAllRoles(rolesAdmin, holder);
      }
    }
  );

  mcpTest(
    'negative: direction 2 — the refusal is recorded against the Audit Reader',
    async () => {
      try {
        await orThrow(
          'make the subject an Audit Reader',
          assignRole(rolesAdmin, 'PLATFORM_AUDIT_READER', service.id)
        );
        await expectRecorded(
          ctx.tokens.PLATFORM_AUDIT_READER,
          service.id,
          () => assignRole(rolesAdmin, 'PLATFORM_SUPPORT', service.id),
          { newest: rejectedGrant('mutually exclusive with platform-support') }
        );
      } finally {
        await revokeAllRoles(rolesAdmin, service);
      }
    }
  );
});

describe('R5.last-roles-admin', () => {
  test('positive: with other holders present, revoking one Roles Admin succeeds', async () => {
    const role = 'PLATFORM_ROLES_ADMIN';
    await orThrow('grant', assignRole(ctx.bootstrapToken, role, human.id));
    try {
      const holders = await holdersOf(rolesAdmin, role);
      expect(holders).toContain(human.id);
      expect(holders.length).toBeGreaterThan(1);
    } finally {
      const revoked = await removeRole(ctx.bootstrapToken, role, human.id);
      expect(revoked.kind, describeOutcome(revoked)).toBe('ok');
    }
    expect(await holdersOf(rolesAdmin, role)).not.toContain(human.id);
    expect((await accessOf(human.token)).myRoles).toEqual(['REGISTERED']);
  });
});

describe('R6.self-assignment', () => {
  beforeAll(async () => {
    for (const admin of [adminOne, adminTwo]) {
      await orThrow(
        'make a disposable Roles Admin',
        assignRole(ctx.bootstrapToken, 'PLATFORM_ROLES_ADMIN', admin.id)
      );
    }
  });

  afterAll(async () => {
    for (const admin of [adminOne, adminTwo]) {
      await revokeAllRoles(ctx.bootstrapToken, admin);
    }
  });

  const refusedOnSelf = async (
    act: () => ReturnType<typeof assignRole>,
    role: PlatformRole
  ) => {
    const before = await accessOf(adminOne.token);

    const refused = await act();

    expect(refused.kind, describeOutcome(refused)).toBe('denied');
    expect(rejectionOf(refused)).toMatchObject({
      ruleId: 'self-assignment',
      message: `Rejected: self-assignment of role ${spelled(role)} is blocked`,
    });
    expect(await accessOf(adminOne.token)).toEqual(before);
  };

  test('negative: a Roles Admin grants itself a Platform role — refused, myRoles unchanged', () =>
    refusedOnSelf(
      () => assignRole(adminOne.token, 'PLATFORM_SUPPORT', adminOne.id),
      'PLATFORM_SUPPORT'
    ));

  test('negative: a Roles Admin grants itself a Feature role — refused, myRoles unchanged', () =>
    refusedOnSelf(
      () => assignRole(adminOne.token, 'FEATURE_BETA_TESTER', adminOne.id),
      'FEATURE_BETA_TESTER'
    ));

  test('negative: a Roles Admin revokes its own role — refused, myRoles unchanged', () =>
    refusedOnSelf(
      () => removeRole(adminOne.token, 'PLATFORM_ROLES_ADMIN', adminOne.id),
      'PLATFORM_ROLES_ADMIN'
    ));

  test('positive: the two-person path — a second Roles Admin grants the first the same role', async () => {
    const role = 'PLATFORM_SUPPORT';
    try {
      const granted = await assignRole(adminTwo.token, role, adminOne.id);
      expect(granted.kind, describeOutcome(granted)).toBe('ok');
      expect((await accessOf(adminOne.token)).myRoles).toEqual([
        'PLATFORM_ROLES_ADMIN',
        role,
        'REGISTERED',
      ]);
    } finally {
      await orThrow('cleanup', removeRole(adminTwo.token, role, adminOne.id));
    }
  });

  mcpTest(
    'negative: a self-grant refusal is recorded against the acting admin itself',
    () =>
      expectRecorded(
        ctx.tokens.PLATFORM_AUDIT_READER,
        adminOne.id,
        () => assignRole(adminOne.token, 'PLATFORM_SUPPORT', adminOne.id),
        { newest: rejectedGrant('self-assignment of role platform-support') }
      )
  );
});
