import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { CAPABILITIES } from '../../capabilities.data';
import {
  createHostedSpace,
  registerDisposableUser,
  removeDisposableUser,
  spaceHost,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { rawRead, rawRequest } from '../raw-request';
import type { GroupModule } from '../types';
import { undoOnFailure } from '../undo-on-failure';
import {
  createOwnedOrganization,
  removeOwnedOrganization,
} from './organization-content';

/**
 * A22 — direct add without consent (027 Session 2026-10-08, operator ruling on
 * alkem-io/server#6623). Invitation is the only way in: nobody adds a user or a
 * Virtual Contributor from another account to an L0 space directly, or a NEW
 * organization to any space. The intended holder set is empty, as A17's, so
 * every cell here is a denial.
 *
 * Targets that no role user administers: an L0 space on the run's disposable
 * host, a disposable user who is not in it, a VC on THAT user's account (so not
 * the space's account), and a bare organization that was never in the space.
 */
type A22 = {
  roleSetId: string;
  user: DisposableUser;
  virtualContributorId: string;
  organizationId: string;
};

const USER = CAPABILITIES.find(c => c.id === 'A22.assignRoleToUser')!;
const VC = CAPABILITIES.find(
  c => c.id === 'A22.assignRoleToVirtualContributor'
)!;
const ORGANIZATION = CAPABILITIES.find(
  c => c.id === 'A22.assignRoleToOrganization'
)!;

const ROLE_SET =
  'query($id: UUID!) { lookup { space(ID: $id) { community { roleSet { id } } } } }';
const ALLOW_ONE_VC =
  'mutation($accountID: UUID!) { updateBaselineLicensePlanOnAccount(updateData: { accountID: $accountID, virtualContributor: 1 }) { id } }';
const CREATE_VC = `mutation($accountID: UUID!, $displayName: String!) {
  createVirtualContributor(virtualContributorData: { accountID: $accountID, profileData: { displayName: $displayName },
    bodyOfKnowledgeType: ALKEMIO_KNOWLEDGE_BASE, aiPersona: { engine: EXPERT } }) { id } }`;
const DELETE_VC =
  'mutation($id: UUID!) { deleteVirtualContributor(deleteData: { ID: $id }) { id } }';

export const A22_GROUP: GroupModule<A22> = {
  group: 'A22',

  build: ctx =>
    undoOnFailure(async undo => {
      // The space goes with the shared host (see `spaceHost`).
      const host = await spaceHost(ctx);
      const spaceId = await createHostedSpace(ctx, host, 'a22');
      const { lookup } = await rawRead<{
        lookup: { space: { community: { roleSet: { id: string } } } };
      }>(host.token, ROLE_SET, { id: spaceId });

      const user = await registerDisposableUser(ctx, 'adirect');
      undo(() => removeDisposableUser(ctx, user));

      // A fresh account may host no VC until License Manager allows one.
      await rawRead(ctx.tokens.PLATFORM_LICENSE_MANAGER, ALLOW_ONE_VC, {
        accountID: user.accountId,
      });
      const { createVirtualContributor } = await rawRead<{
        createVirtualContributor: { id: string };
      }>(user.token, CREATE_VC, {
        accountID: user.accountId,
        displayName: `platform-roles a22 vc ${ctx.runId}`,
      });
      const virtualContributorId = createVirtualContributor.id;
      undo(() => removeVirtualContributor(ctx, virtualContributorId));

      const { organizationId } = await createOwnedOrganization(ctx, 'a22', {
        license: false,
      });

      return {
        roleSetId: lookup.space.community.roleSet.id,
        user,
        virtualContributorId,
        organizationId,
      };
    }),

  // In order (the VC lives on the user's account), but every step is attempted
  // even when an earlier one fails, so a bad VC delete cannot leak the organisation.
  teardown: async (ctx, _sdk, fx) => {
    const steps: Array<[string, () => Promise<unknown>]> = [
      ['vc', () => removeVirtualContributor(ctx, fx.virtualContributorId)],
      ['user', () => removeDisposableUser(ctx, fx.user)],
      [
        'organization',
        () =>
          removeOwnedOrganization(ctx, fx.organizationId, {
            packs: [],
            hubs: [],
            spaces: [],
          }),
      ],
    ];
    const failures: string[] = [];
    for (const [name, step] of steps) {
      try {
        await step();
      } catch (e) {
        failures.push(`${name}: ${(e as Error).message}`);
      }
    }
    if (failures.length) throw new Error(failures.join('; '));
  },

  invocations: {
    [USER.id]: {
      gate: [USER.surface],
      call: (sdk, headers, fx) =>
        sdk.assignRoleToUser(
          {
            roleData: {
              roleSetID: fx.roleSetId,
              actorID: fx.user.id,
              role: RoleName.Member,
            },
          },
          headers
        ),
    },
    [VC.id]: {
      gate: [VC.surface],
      call: (sdk, headers, fx) =>
        sdk.assignRoleToVirtualContributor(
          {
            roleData: {
              roleSetID: fx.roleSetId,
              actorID: fx.virtualContributorId,
              role: RoleName.Member,
            },
          },
          headers
        ),
    },
    [ORGANIZATION.id]: {
      gate: [ORGANIZATION.surface],
      call: (sdk, headers, fx) =>
        sdk.AssignRoleToOrganization(
          {
            roleData: {
              roleSetID: fx.roleSetId,
              actorID: fx.organizationId,
              role: RoleName.Member,
            },
          },
          headers
        ),
    },
  },
};

/** Content Full Access deletes it; already gone is fine, anything else is residue. */
const removeVirtualContributor = async (
  ctx: Parameters<GroupModule<A22>['teardown']>[0],
  id: string
): Promise<void> => {
  const { errors } = await rawRequest(
    ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS,
    DELETE_VC,
    { id }
  );
  const real = errors.filter(e => e.extensions?.code !== 'ENTITY_NOT_FOUND');
  if (real.length > 0) {
    throw new Error(`A22 VC ${id}: ${real[0].message}`);
  }
};
