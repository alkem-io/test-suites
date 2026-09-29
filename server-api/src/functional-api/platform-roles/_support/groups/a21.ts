import { expect } from 'vitest';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type { Sdk } from '@alkemio/tests-lib/core/generated/graphql';
import { allowedRoles, CAPABILITIES } from '../../capabilities.data';
import { classify, describeOutcome } from '../outcome';
import { bearer } from '../types';
import type { GroupModule, PerRole, RunContext } from '../types';
import { buildWithProbes, deleteProbeUsers } from './probes';

/**
 * A21 — set / clear the service-profile marker. Owner: Platform Roles Admin.
 *
 * Always through the MINIMAL `updateUserServiceProfile` document: the ordinary
 * `updateUser` selection echoes private user fields, and a forbidden sub-field
 * would read as a denial of the write itself.
 *
 * The API exposes no field that reads the marker. Its one observable effect is
 * the rule it exists for: Platform Spaces Reader can be granted to a marked
 * account only. `markerIsSet` observes exactly that, and takes the role away
 * again when the grant went through.
 */
type A21 = {
  setTargets: PerRole;
  /** Marker already set — in build(), as Platform Roles Admin. */
  clearTargets: PerRole;
  /** Every negative aims here. Its marker is SET, so a clear that wrongly went
   * through would have something to take; no positive ever touches it. */
  denyTarget: string;
};

const SET = CAPABILITIES.find(c => c.id === 'A21.updateUser#0')!;
const SERVICE_ACCOUNTS_ONLY =
  /platform-spaces-reader may only be granted to a service account/;

const markerIsSet = async (
  ctx: RunContext,
  sdk: Sdk,
  userId: string
): Promise<boolean> => {
  const rolesAdmin = bearer(ctx.tokens.PLATFORM_ROLES_ADMIN);
  const roleData = { actorID: userId, role: RoleName.PlatformSpacesReader };
  const grant = await classify(['assignPlatformRoleToUser'], () =>
    sdk.PlatformRolesAssignRoleToUser({ roleData }, rolesAdmin)
  );
  if (grant.kind === 'ok') {
    await sdk.PlatformRolesRemoveRoleFromUser({ roleData }, rolesAdmin);
    return true;
  }
  expect(grant.errors[0]?.message, describeOutcome(grant)).toMatch(
    SERVICE_ACCOUNTS_ONLY
  );
  return false;
};

export const A21_GROUP: GroupModule<A21> = {
  group: 'A21',

  build: (ctx, sdk) =>
    buildWithProbes(ctx, sdk, async probes => {
      const marked = async (tag: string) => {
        const id = await probes.user(tag);
        await sdk.updateUserServiceProfile(
          { userData: { ID: id, serviceProfile: true } },
          bearer(ctx.tokens.PLATFORM_ROLES_ADMIN)
        );
        return id;
      };

      const setTargets: PerRole = {};
      const clearTargets: PerRole = {};
      for (const [i, role] of allowedRoles(SET).entries()) {
        setTargets[role] = await probes.user(`a21set${i}`);
        clearTargets[role] = await marked(`a21clr${i}`);
      }
      return {
        setTargets,
        clearTargets,
        denyTarget: await marked('a21deny'),
      };
    }),

  teardown: (ctx, sdk, fx) =>
    deleteProbeUsers(ctx, sdk, [
      ...Object.values(fx.setTargets),
      ...Object.values(fx.clearTargets),
      fx.denyTarget,
    ]),

  invocations: {
    'A21.updateUser#0': {
      gate: ['updateUser'],
      call: (sdk, headers, fx, role) =>
        sdk.updateUserServiceProfile(
          {
            userData: {
              ID: fx.setTargets[role] ?? fx.denyTarget,
              serviceProfile: true,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, role, sdk }) =>
        expect(await markerIsSet(ctx, sdk, fx.setTargets[role] as string)).toBe(
          true
        ),
    },
    'A21.updateUser#1': {
      gate: ['updateUser'],
      call: (sdk, headers, fx, role) =>
        sdk.updateUserServiceProfile(
          {
            userData: {
              ID: fx.clearTargets[role] ?? fx.denyTarget,
              serviceProfile: false,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, role, sdk }) =>
        expect(
          await markerIsSet(ctx, sdk, fx.clearTargets[role] as string)
        ).toBe(false),
    },
  },
};
