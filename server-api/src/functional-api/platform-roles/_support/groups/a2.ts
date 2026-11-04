import { expect } from 'vitest';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import type { PlatformRole } from '../../capabilities.data';
import { bearer } from '../types';
import type { GroupModule, PerRole } from '../types';
import { holdersOf } from './holder-list';
import {
  buildWithProbes,
  deleteProbeOrganizations,
  deleteProbeUsers,
} from './probes';

/**
 * A2 — assign / revoke a FEATURE role, to a user or to an organization.
 * Owners: Platform Users Admin and Platform Roles Admin.
 *
 * Two allowed roles run in parallel workers, so every positive has its own
 * subject per role; the remove subjects already hold the role when the run
 * starts (granted here, as Platform Roles Admin).
 */
type Subjects = {
  assignTargets: PerRole;
  /** Already hold `ROLE` — granted in build(). */
  removeTargets: PerRole;
  /** Every negative aims here. It holds `ROLE`, so a remove that wrongly went
   * through would have something to take; no positive ever touches it. */
  denyTarget: string;
};
type A2 = { users: Subjects; organizations: Subjects };

/** Holdable by users AND organizations, and its grant has no side effect
 * (Feature Beta Tester / VC Campaign also write a license entitlement). */
const ROLE = RoleName.FeatureOrganizationCreator;
const ASSIGN = CAPABILITIES.find(c => c.id === 'A2.assignPlatformRoleToUser')!;

const subjects = async (
  make: (tag: string) => Promise<string>,
  grant: (id: string) => Promise<unknown>
): Promise<Subjects> => {
  const holder = async (tag: string) => {
    const id = await make(tag);
    await grant(id);
    return id;
  };
  const assignTargets: PerRole = {};
  const removeTargets: PerRole = {};
  for (const [i, role] of allowedRoles(ASSIGN).entries()) {
    assignTargets[role] = await make(`asg${i}`);
    removeTargets[role] = await holder(`rem${i}`);
  }
  return { assignTargets, removeTargets, denyTarget: await holder('deny') };
};

const all = (s: Subjects): string[] => [
  ...Object.values(s.assignTargets),
  ...Object.values(s.removeTargets),
  s.denyTarget,
];

const roleData = (targets: PerRole, role: PlatformRole, s: Subjects) => ({
  roleData: { actorID: targets[role] ?? s.denyTarget, role: ROLE },
});

const holders = (rolesAdminToken: string) => holdersOf(rolesAdminToken, ROLE);

export const A2_GROUP: GroupModule<A2> = {
  group: 'A2',

  build: (ctx, sdk) =>
    buildWithProbes(ctx, sdk, async probes => {
      const rolesAdmin = bearer(ctx.tokens.PLATFORM_ROLES_ADMIN);
      return {
        users: await subjects(
          tag => probes.user(`a2${tag}`),
          id =>
            sdk.PlatformRolesAssignRoleToUser(
              { roleData: { actorID: id, role: ROLE } },
              rolesAdmin
            )
        ),
        organizations: await subjects(
          tag => probes.organization(`a2-${tag}`),
          id =>
            sdk.assignPlatformRoleToOrganization(
              { roleData: { actorID: id, role: ROLE } },
              rolesAdmin
            )
        ),
      };
    }),

  teardown: async (ctx, sdk, fx) => {
    await deleteProbeOrganizations(ctx, sdk, all(fx.organizations));
    await deleteProbeUsers(ctx, sdk, all(fx.users));
  },

  invocations: {
    'A2.assignPlatformRoleToUser': {
      gate: ['assignPlatformRoleToUser'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesAssignRoleToUser(
          roleData(fx.users.assignTargets, role, fx.users),
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(await holders(ctx.tokens.PLATFORM_ROLES_ADMIN)).toContain(
          fx.users.assignTargets[role]
        ),
    },
    'A2.removePlatformRoleFromUser': {
      gate: ['removePlatformRoleFromUser'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesRemoveRoleFromUser(
          roleData(fx.users.removeTargets, role, fx.users),
          headers
        ),
      verify: async ({ ctx, fx, role }) => {
        const now = await holders(ctx.tokens.PLATFORM_ROLES_ADMIN);
        expect(now).not.toContain(fx.users.removeTargets[role]);
        // Proves the list was really read, not merely empty.
        expect(now).toContain(fx.users.denyTarget);
      },
    },
    'A2.assignPlatformRoleToOrganization': {
      gate: ['assignPlatformRoleToOrganization'],
      call: (sdk, headers, fx, role) =>
        sdk.assignPlatformRoleToOrganization(
          roleData(fx.organizations.assignTargets, role, fx.organizations),
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(await holders(ctx.tokens.PLATFORM_ROLES_ADMIN)).toContain(
          fx.organizations.assignTargets[role]
        ),
    },
    'A2.removePlatformRoleFromOrganization': {
      gate: ['removePlatformRoleFromOrganization'],
      call: (sdk, headers, fx, role) =>
        sdk.removePlatformRoleFromOrganization(
          roleData(fx.organizations.removeTargets, role, fx.organizations),
          headers
        ),
      verify: async ({ ctx, fx, role }) => {
        const now = await holders(ctx.tokens.PLATFORM_ROLES_ADMIN);
        expect(now).not.toContain(fx.organizations.removeTargets[role]);
        expect(now).toContain(fx.organizations.denyTarget);
      },
    },
  },
};
