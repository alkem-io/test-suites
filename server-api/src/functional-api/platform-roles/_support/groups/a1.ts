import { expect } from 'vitest';
import {
  AuthorizationCredential,
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
 * Also the surfaces NO target role may reach: the legacy GLOBAL_ADMIN payload
 * of the same two mutations, and the six raw credential mutations. Those are
 * negatives for all 14 roles.
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
 * is a Forbidden too — a denial for the wrong reason.
 */
const ACTOR_CREDENTIAL = CredentialType.AssistantAccess;
const LEGACY_CREDENTIAL = AuthorizationCredential.GlobalCommunityRead;

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

    // The legacy branch is gated on a policy no target role satisfies — not
    // even Platform Roles Admin.
    'A1.assignPlatformRoleToUser#6': {
      gate: ['assignPlatformRoleToUser'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesAssignRoleToUser(
          { roleData: { actorID: fx.denyTarget, role: RoleName.GlobalAdmin } },
          headers
        ),
    },
    'A1.removePlatformRoleFromUser#7': {
      gate: ['removePlatformRoleFromUser'],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesRemoveRoleFromUser(
          { roleData: { actorID: fx.denyTarget, role: RoleName.GlobalAdmin } },
          headers
        ),
    },

    'A1.grantCredentialToUser': {
      gate: ['grantCredentialToUser'],
      call: (sdk, headers, fx) =>
        sdk.grantCredentialToUser(
          {
            grantCredentialData: {
              userID: fx.denyTarget,
              type: LEGACY_CREDENTIAL,
            },
          },
          headers
        ),
    },
    'A1.revokeCredentialFromUser': {
      gate: ['revokeCredentialFromUser'],
      call: (sdk, headers, fx) =>
        sdk.revokeCredentialFromUser(
          {
            revokeCredentialData: {
              userID: fx.denyTarget,
              type: AuthorizationCredential.PlatformOperationsAdmin,
              resourceID: '',
            },
          },
          headers
        ),
    },
    'A1.grantCredentialToOrganization': {
      gate: ['grantCredentialToOrganization'],
      call: (sdk, headers, fx) =>
        sdk.grantCredentialToOrganization(
          {
            grantCredentialData: {
              organizationID: fx.organizationId,
              type: LEGACY_CREDENTIAL,
            },
          },
          headers
        ),
    },
    'A1.revokeCredentialFromOrganization': {
      gate: ['revokeCredentialFromOrganization'],
      call: (sdk, headers, fx) =>
        sdk.revokeCredentialFromOrganization(
          {
            revokeCredentialData: {
              organizationID: fx.organizationId,
              type: LEGACY_CREDENTIAL,
            },
          },
          headers
        ),
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
