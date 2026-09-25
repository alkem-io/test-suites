import { afterAll, beforeAll, describe, expect, inject, test } from 'vitest';
import { PLATFORM_ROLES } from '../capabilities.data';
import {
  createDisposableUser,
  deleteDisposableUser,
} from '../_support/disposable-user';
import type { DisposableUser } from '../_support/disposable-user';
import { readPrivileges } from '../_support/privileges';
import type { Privileges } from '../_support/privileges';
import { rawRead } from '../_support/raw-request';

/**
 * An organization may hold a Feature role; its admins and owners inherit it,
 * its associates never do, and no Platform role travels this way at all.
 *
 * Inheritance is resolved into the same 60-second actor cache I1 is about, so
 * every state change here lands on a WARM cache and is observed on the very
 * next request, through a READ-ONLY probe. (`createOrganization` would be the
 * obvious probe and is unusable: it makes the caller admin of the new
 * organization, which flushes the caller's cache and hides a missing flush.)
 *
 * Actors: Platform Support creates the organization and hands it to a
 * disposable owner, then leaves it — otherwise the shared Support user would
 * inherit the Feature roles too and poison its own negatives. The owner (the
 * organization's own admin) manages the organization's roles; Platform Roles
 * Admin grants the Feature roles to the organization.
 */
const FEATURE_ROLES = PLATFORM_ROLES.filter(r => r.startsWith('FEATURE_'));
const PLATFORM_FAMILY = PLATFORM_ROLES.filter(r => r.startsWith('PLATFORM_'));

const CREATE_ORG = `mutation($nameID: NameID!, $displayName: String!) {
  createOrganization(organizationData: { nameID: $nameID, profileData: { displayName: $displayName } }) { id roleSet { id } }
}`;
const DELETE_ORG =
  'mutation($id: UUID!) { deleteOrganization(deleteData: { ID: $id }) { id } }';
const orgRole = (verb: 'assign' | 'remove', role: string) =>
  `mutation($roleSetID: UUID!, $actorID: UUID!) {
    ${verb}Role${verb === 'assign' ? 'To' : 'From'}User(roleData: { roleSetID: $roleSetID, actorID: $actorID, role: ${role} }) { id }
  }`;
const platformRoleOnOrg = (verb: 'assign' | 'remove', role: string) =>
  `mutation($id: UUID!) {
    ${verb}PlatformRole${verb === 'assign' ? 'To' : 'From'}Organization(roleData: { actorID: $id, role: ${role} }) { id }
  }`;
const ORG_HOLDERS =
  'query($roles: [RoleName!]!) { platform { roleSet { organizationsInRoles(roles: $roles) { role organizations { id } } } } }';

describe('organization inheritance', () => {
  const ctx = inject('platformRoles');
  const support = ctx.tokens.PLATFORM_SUPPORT;
  const rolesAdmin = ctx.tokens.PLATFORM_ROLES_ADMIN;

  let owner: DisposableUser;
  let admin: DisposableUser;
  let associate: DisposableUser;
  let orgId: string;
  let roleSetID: string;
  /** The owner as a plain organization admin — before the organization holds any role. */
  let ownerBaseline: Privileges;

  const grantToOrg = (role: string) =>
    rawRead(rolesAdmin, platformRoleOnOrg('assign', role), { id: orgId });

  /** Which Feature roles the organization holds right now. */
  const heldByOrg = async (): Promise<string[]> => {
    const { platform } = await rawRead<{
      platform: {
        roleSet: {
          organizationsInRoles: {
            role: string;
            organizations: { id: string }[];
          }[];
        };
      };
    }>(rolesAdmin, ORG_HOLDERS, { roles: FEATURE_ROLES });
    return platform.roleSet.organizationsInRoles
      .filter(({ organizations }) => organizations.some(o => o.id === orgId))
      .map(({ role }) => role);
  };

  beforeAll(async () => {
    owner = await createDisposableUser(ctx, 'oown');
    admin = await createDisposableUser(ctx, 'oadm');
    associate = await createDisposableUser(ctx, 'oasc');

    const { createOrganization: org } = await rawRead<{
      createOrganization: { id: string; roleSet: { id: string } };
    }>(support, CREATE_ORG, {
      nameID: `pr-inherit-${ctx.runId}`.slice(0, 25),
      displayName: `platform-roles inheritance ${ctx.runId}`,
    });
    orgId = org.id;
    roleSetID = org.roleSet.id;

    const as = (
      token: string,
      verb: 'assign' | 'remove',
      role: string,
      actorID: string
    ) => rawRead(token, orgRole(verb, role), { roleSetID, actorID });
    await as(support, 'assign', 'ASSOCIATE', owner.id);
    await as(support, 'assign', 'ADMIN', owner.id);
    await as(support, 'remove', 'ADMIN', ctx.userIds.PLATFORM_SUPPORT);
    await as(support, 'remove', 'ASSOCIATE', ctx.userIds.PLATFORM_SUPPORT);
    await as(owner.token, 'assign', 'ASSOCIATE', admin.id);
    await as(owner.token, 'assign', 'ADMIN', admin.id);
    await as(owner.token, 'assign', 'ASSOCIATE', associate.id);
    ownerBaseline = await readPrivileges(owner.token);
  });

  afterAll(async () => {
    for (const role of await heldByOrg()) {
      await rawRead(rolesAdmin, platformRoleOnOrg('remove', role), {
        id: orgId,
      });
    }
    await rawRead(support, DELETE_ORG, { id: orgId });
    for (const user of [owner, admin, associate]) {
      await deleteDisposableUser(ctx, user);
    }
  });

  describe('O1.admin-inherits-feature-role', () => {
    test('positive: the organization is granted Feature Organization Creator → its admin holds CREATE_ORGANIZATION on the next request', async () => {
      // Warm the admin's cache with "nothing inherited" first.
      expect((await readPrivileges(admin.token)).platform).not.toContain(
        'CREATE_ORGANIZATION'
      );
      await grantToOrg('FEATURE_ORGANIZATION_CREATOR');
      expect((await readPrivileges(admin.token)).platform).toContain(
        'CREATE_ORGANIZATION'
      );
    });

    test('negative: an associate never inherits it; a demoted admin loses it on the next request', async () => {
      // Precondition, and the read that warms the admin's cache WITH the privilege.
      expect((await readPrivileges(admin.token)).platform).toContain(
        'CREATE_ORGANIZATION'
      );
      expect((await readPrivileges(associate.token)).platform).not.toContain(
        'CREATE_ORGANIZATION'
      );

      await rawRead(owner.token, orgRole('remove', 'ADMIN'), {
        roleSetID,
        actorID: admin.id,
      });
      expect((await readPrivileges(admin.token)).platform).not.toContain(
        'CREATE_ORGANIZATION'
      );
    });
  });

  describe('O2.no-platform-role-via-organization', () => {
    test('negative: the admin of an organization holding every Feature role holds no Platform-role privilege on either policy', async () => {
      const alreadyHeld = await heldByOrg();
      for (const role of FEATURE_ROLES.filter(r => !alreadyHeld.includes(r))) {
        await grantToOrg(role);
      }
      const after = await readPrivileges(owner.token);

      // Inheritance is live — otherwise "holds nothing" would prove nothing.
      expect(after.platform).toEqual(
        expect.arrayContaining([
          'CREATE_ORGANIZATION',
          'ACCESS_VIRTUAL_ASSISTANT',
        ])
      );

      // Whatever any Platform-role user holds that no Feature-role user holds,
      // and that the owner did not hold as a plain organization admin.
      const held = async (roles: readonly (typeof PLATFORM_ROLES)[number][]) =>
        Promise.all(roles.map(r => readPrivileges(ctx.tokens[r])));
      const platformFamily = await held(PLATFORM_FAMILY);
      const featureFamily = await held(FEATURE_ROLES);
      const forbidden = (policy: 'platform' | 'roleSet'): string[] => {
        const allowed = new Set([
          ...featureFamily.flatMap(p => p[policy]),
          ...ownerBaseline[policy],
        ]);
        return [...new Set(platformFamily.flatMap(p => p[policy]))].filter(
          p => !allowed.has(p)
        );
      };

      expect(forbidden('platform')).toContain('PLATFORM_AUDIT_READ');
      expect(forbidden('roleSet')).toContain('GRANT_GLOBAL_ADMINS');
      expect(
        after.platform.filter(p => forbidden('platform').includes(p))
      ).toEqual([]);
      expect(
        after.roleSet.filter(p => forbidden('roleSet').includes(p))
      ).toEqual([]);
      expect(after.myRoles).toEqual(['REGISTERED']);
    });
  });
});
