import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLES } from './capabilities.data';
import type { PlatformRole } from './capabilities.data';
import { mcpTest, countFor } from './_support/mcp-client';
import {
  createDisposableUser,
  deleteDisposableUser,
} from './_support/disposable-user';
import { describeOutcome } from './_support/outcome';
import { rawOutcome } from './_support/raw-outcome';
import { rawRead, rawRequest } from './_support/raw-request';

/**
 * Who may read WHO HOLDS a role. Two families, four fields:
 *   Platform-role lists — Platform Roles Admin, Platform Audit Reader
 *   Feature-role lists  — those two, plus Platform Users Admin
 *
 * Known holders: the single-role fixture users, and one organization that holds
 * Feature Beta Tester for this file. A Platform role can never be held by an
 * organization, so the Platform × organization lists are asserted EMPTY.
 */
const PLATFORM_LIST_ROLE = 'PLATFORM_SUPPORT';
const FEATURE_LIST_ROLE = 'FEATURE_BETA_TESTER';
const FIELDS = [
  'usersInRole',
  'usersInRoles',
  'organizationsInRole',
  'organizationsInRoles',
] as const;
type Field = (typeof FIELDS)[number];

const READERS: Record<'Platform' | 'Feature', readonly PlatformRole[]> = {
  Platform: ['PLATFORM_ROLES_ADMIN', 'PLATFORM_AUDIT_READER'],
  Feature: [
    'PLATFORM_ROLES_ADMIN',
    'PLATFORM_AUDIT_READER',
    'PLATFORM_USERS_ADMIN',
  ],
};

const QUERY: Record<Field, (roles: string) => string> = {
  usersInRole: r =>
    `query { platform { roleSet { usersInRole(role: ${r}) { id } } } }`,
  usersInRoles: r =>
    `query { platform { roleSet { usersInRoles(roles: [${r}]) { role users { id } } } } }`,
  organizationsInRole: r =>
    `query { platform { roleSet { organizationsInRole(role: ${r}) { id } } } }`,
  organizationsInRoles: r =>
    `query { platform { roleSet { organizationsInRoles(roles: [${r}]) { role organizations { id } } } } }`,
};

type Row = { id: string };
type Grouped = { role: string; users?: Row[]; organizations?: Row[] };
type Lists = {
  platform: { roleSet: Partial<Record<Field, (Row | Grouped)[]>> } | null;
};

/** Every holder id a response carries, whichever of the four fields it used. */
const idsIn = (data: Lists | null, field: Field): string[] =>
  (data?.platform?.roleSet?.[field] ?? []).flatMap(row =>
    'role' in row
      ? [...(row.users ?? []), ...(row.organizations ?? [])].map(h => h.id)
      : [row.id]
  );

const CREATE_ORG = `mutation($nameID: NameID!, $displayName: String!) {
  createOrganization(organizationData: { nameID: $nameID, profileData: { displayName: $displayName } }) { id roleSet { id } }
}`;
const LEAVE_ORG = (role: string) =>
  `mutation($roleSetID: UUID!, $actorID: UUID!) { removeRoleFromUser(roleData: { roleSetID: $roleSetID, actorID: $actorID, role: ${role} }) { id } }`;
const ORG_ROLE = (verb: 'assign' | 'remove') =>
  `mutation($id: UUID!) { ${verb}PlatformRole${verb === 'assign' ? 'To' : 'From'}Organization(roleData: { actorID: $id, role: ${FEATURE_LIST_ROLE} }) { id } }`;
const DELETE_ORG =
  'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }';

const ctx = inject('platformRoles');
let holderOrgId: string;

beforeAll(async () => {
  const support = ctx.tokens.PLATFORM_SUPPORT;
  const { createOrganization: org } = await rawRead<{
    createOrganization: { id: string; roleSet: { id: string } };
  }>(support, CREATE_ORG, {
    nameID: `pr-holder-${ctx.runId}`.slice(0, 25),
    displayName: `platform-roles holder ${ctx.runId}`,
  });
  holderOrgId = org.id;
  // Support leaves the organization it created: an admin of an organization
  // INHERITS its Feature roles, and the shared Support user must not.
  for (const role of ['ADMIN', 'ASSOCIATE']) {
    await rawRead(support, LEAVE_ORG(role), {
      roleSetID: org.roleSet.id,
      actorID: ctx.userIds.PLATFORM_SUPPORT,
    });
  }
  await rawRead(ctx.tokens.PLATFORM_ROLES_ADMIN, ORG_ROLE('assign'), {
    id: holderOrgId,
  });
});

afterAll(async () => {
  await rawRead(ctx.tokens.PLATFORM_ROLES_ADMIN, ORG_ROLE('remove'), {
    id: holderOrgId,
  });
  await rawRead(ctx.tokens.PLATFORM_SUPPORT, DELETE_ORG, { id: holderOrgId });
});

describe('H1.partitioned-read', () => {
  for (const family of ['Platform', 'Feature'] as const) {
    const listRole =
      family === 'Platform' ? PLATFORM_LIST_ROLE : FEATURE_LIST_ROLE;

    for (const field of FIELDS) {
      const read = (role: PlatformRole) =>
        rawOutcome<Lists>(
          ['platform', 'roleSet', field],
          ctx.tokens[role],
          QUERY[field](listRole)
        );

      // A Platform role is never held by an organization, so that list is
      // asserted EMPTY; every other list must show the holder this suite knows.
      const knownHolder = (): string | undefined =>
        field.startsWith('users')
          ? ctx.userIds[listRole]
          : family === 'Feature'
            ? holderOrgId
            : undefined;
      const finds =
        family === 'Platform' && field.startsWith('organizations')
          ? 'finds it empty'
          : 'finds the known holder';

      for (const role of PLATFORM_ROLES) {
        if (READERS[family].includes(role)) {
          test(`positive: ${role} reads ${field} of a ${family} role and ${finds}`, async () => {
            const outcome = await read(role);
            if (outcome.kind !== 'ok')
              throw new Error(describeOutcome(outcome));
            const holder = knownHolder();
            expect(idsIn(outcome.data, field)).toEqual(
              holder ? expect.arrayContaining([holder]) : []
            );
          });
        } else {
          test(`negative: ${role} is denied ${field} of a ${family} role`, async () => {
            const outcome = await read(role);
            expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
          });
        }
      }
    }
  }
});

describe('H2.mixed-request-fails-closed', () => {
  const usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;

  for (const field of ['usersInRoles', 'organizationsInRoles'] as const) {
    test(`negative: Users Admin naming a Feature AND a Platform role in one ${field} request gets an authorization error and zero rows`, async () => {
      // Control: the Feature half alone is readable and NOT empty.
      const alone = await rawRequest<Lists>(
        usersAdmin,
        QUERY[field](FEATURE_LIST_ROLE)
      );
      expect(alone.errors).toEqual([]);
      expect(idsIn(alone.data, field).length).toBeGreaterThan(0);

      const mixed = await rawRequest<Lists>(
        usersAdmin,
        QUERY[field](`${FEATURE_LIST_ROLE}, ${PLATFORM_LIST_ROLE}`)
      );
      expect(mixed.errors.map(e => [e.extensions?.code, e.path])).toEqual([
        ['FORBIDDEN', ['platform', 'roleSet', field]],
      ]);
      expect(mixed.errors[0].message).toMatch(
        /platform-role-holders-read required to read holders of platform-support/
      );
      expect(idsIn(mixed.data, field)).toEqual([]);
    });
  }
});

describe('H3.denied-read-writes-no-audit-record', () => {
  // A denied WRITE is recorded; a denied READ must not be. The caller is a
  // fresh user, so its record count starts at a known number and nothing else
  // in the run can move it.
  mcpTest(
    'negative: the caller’s audit record count is identical before and after a denied holder-list read',
    async () => {
      const caller = await createDisposableUser(ctx, 'h3');
      try {
        const auditReader = ctx.tokens.PLATFORM_AUDIT_READER;
        const before = await countFor(auditReader, caller.id);
        for (const field of FIELDS) {
          const outcome = await rawOutcome(
            ['platform', 'roleSet', field],
            caller.token,
            QUERY[field](PLATFORM_LIST_ROLE)
          );
          expect(outcome.kind, describeOutcome(outcome)).toBe('denied');
        }
        expect(await countFor(auditReader, caller.id)).toBe(before);
      } finally {
        await deleteDisposableUser(ctx, caller);
      }
    }
  );
});
