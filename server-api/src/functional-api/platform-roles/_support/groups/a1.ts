import { expect } from 'vitest';
import {
  CredentialType,
  RoleName,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import { bearer } from '../types';
import type { GroupModule, PerRole } from '../types';
import { holdersOf } from './holder-list';
import {
  buildWithProbes,
  deleteProbeOrganizations,
  deleteProbeUsers,
} from './probes';

/**
 * A1 — assign / revoke a PLATFORM role. Owner: Platform Roles Admin.
 *
 * Also the two generic actor-credential mutations (FR-022 deleted the other
 * four at Slice B). They reject the role vocabulary before their gate, so they
 * are called with a non-role credential; today no target role reaches them.
 *
 * One disposable user per allowed role and per direction, so the remove
 * positive never depends on the assign positive having run first.
 */
type A1 = {
  assignTargets: PerRole;
  /** Already hold `ROLE` — granted in build(). */
  removeTargets: PerRole;
  /** Every negative aims here. It holds `ROLE`, so a remove that wrongly went
   * through would have something to take; no positive ever touches it. */
  denyTarget: string;
  organizationId: string;
};

const ROLE = RoleName.PlatformOperationsAdmin;
const ASSIGN = CAPABILITIES.find(
  c => c.id === 'A1.assignPlatformRoleToUser#0'
)!;

/**
 * Not a `platform-*` / `feature-*` credential ON PURPOSE: the actor mutations
 * reject that vocabulary BEFORE their authorization check, and that rejection
 * is a Forbidden too — a denial for the wrong reason. (`ASSISTANT_ACCESS`, the
 * Slice A choice, left the enum with the legacy credentials.)
 */
const ACTOR_CREDENTIAL = CredentialType.UserGroupMember;

export const A1_GROUP: GroupModule<A1> = {
  group: 'A1',

  build: (ctx, sdk) =>
    buildWithProbes(ctx, sdk, async probes => {
      const holder = async (tag: string) => {
        const id = await probes.user(tag);
        await sdk.PlatformRolesAssignRoleToUser(
          { roleData: { actorID: id, role: ROLE } },
          bearer(ctx.tokens.PLATFORM_ROLES_ADMIN)
        );
        return id;
      };

      const assignTargets: PerRole = {};
      const removeTargets: PerRole = {};
      for (const [i, role] of allowedRoles(ASSIGN).entries()) {
        assignTargets[role] = await probes.user(`a1asg${i}`);
        removeTargets[role] = await holder(`a1rem${i}`);
      }
      return {
        assignTargets,
        removeTargets,
        denyTarget: await holder('a1deny'),
        organizationId: await probes.organization('a1'),
      };
    }),

  teardown: async (ctx, sdk, fx) => {
    await deleteProbeOrganizations(ctx, sdk, [fx.organizationId]);
    await deleteProbeUsers(ctx, sdk, [
      ...Object.values(fx.assignTargets),
      ...Object.values(fx.removeTargets),
      fx.denyTarget,
    ]);
  },

  invocations: {
    'A1.assignPlatformRoleToUser#0': {
      gate: ['assignPlatformRoleToUser'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesAssignRoleToUser(
          {
            roleData: {
              actorID: fx.assignTargets[role] ?? fx.denyTarget,
              role: ROLE,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, role }) =>
        expect(
          await holdersOf(ctx.tokens.PLATFORM_ROLES_ADMIN, ROLE)
        ).toContain(fx.assignTargets[role]),
    },
    'A1.removePlatformRoleFromUser#1': {
      gate: ['removePlatformRoleFromUser'],
      call: (sdk, headers, fx, role) =>
        sdk.PlatformRolesRemoveRoleFromUser(
          {
            roleData: {
              actorID: fx.removeTargets[role] ?? fx.denyTarget,
              role: ROLE,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, role }) => {
        const holders = await holdersOf(ctx.tokens.PLATFORM_ROLES_ADMIN, ROLE);
        expect(holders).not.toContain(fx.removeTargets[role]);
        // Proves the list was really read, not merely empty.
        expect(holders).toContain(fx.denyTarget);
      },
    },

    'A1.grantCredentialToActor': {
      gate: ['grantCredentialToActor'],
      call: (sdk, headers, fx) =>
        sdk.grantCredentialToActor(
          { actorID: fx.denyTarget, credentialType: ACTOR_CREDENTIAL },
          headers
        ),
    },
    'A1.revokeCredentialFromActor': {
      gate: ['revokeCredentialFromActor'],
      call: (sdk, headers, fx) =>
        sdk.revokeCredentialFromActor(
          { actorID: fx.denyTarget, credentialType: ACTOR_CREDENTIAL },
          headers
        ),
    },
  },
};
