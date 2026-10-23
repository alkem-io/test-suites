import { expect } from 'vitest';
import {
  createHostedSpace,
  spaceHost,
  removeDisposableUser,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { rawRead } from '../raw-request';
import type { GroupModule } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A16 — read across spaces. Owner: Platform Spaces Reader; Platform Content
 * Full Access reaches it as a declared extra.
 *
 * `createPlatformRolesAccess` is server-internal; what a caller can observe is
 * a READ of a PRIVATE space's CONTENT as a non-member. Two shallower probes
 * do not tell: `lookup.space` opens on READ_ABOUT, which a private space
 * still grants to every registered user, and `space.collaboration { id }` is
 * gated on READ of the SPACE itself — which Platform Resource Admin holds
 * NON-cascading on every space (the mover-only rule
 * `spacePlatformResourceAdminRead`, QA ruling (b′)), so the mover can resolve
 * the space it is about to move without seeing inside it. The callouts under
 * `collaboration.calloutsSet` are gated on READ of the callouts set, which
 * only a CASCADING space READ reaches — that is the content oracle.
 */
type A16 = {
  host: DisposableUser;
  spaceId: string;
  collaborationId: string;
  calloutIds: string[];
};

const CONTENT = `query($id: UUID!) { lookup { space(ID: $id) {
  collaboration { id calloutsSet { callouts { id } } }
} } }`;

export const A16_GROUP: GroupModule<A16> = {
  group: 'A16',

  build: ctx =>
    undoOnFailure(async undo => {
      const host = await spaceHost(ctx);
      undo(() => removeDisposableUser(ctx, host));
      const spaceId = await createHostedSpace(ctx, host, 'reader', {
        mode: 'PRIVATE',
        allowPlatformSupportAsAdmin: false,
      });
      const { lookup } = await rawRead<{
        lookup: {
          space: {
            collaboration: {
              id: string;
              calloutsSet: { callouts: { id: string }[] };
            };
          };
        };
      }>(host.token, CONTENT, { id: spaceId });
      const calloutIds = lookup.space.collaboration.calloutsSet.callouts
        .map(c => c.id)
        .sort();
      if (calloutIds.length === 0) {
        throw new Error(
          `A16 fixture: space ${spaceId} has no callouts — the content oracle would be vacuous`
        );
      }
      return {
        host,
        spaceId,
        collaborationId: lookup.space.collaboration.id,
        calloutIds,
      };
    }),

  teardown: (ctx, _sdk, fx) => removeDisposableUser(ctx, fx.host),

  invocations: {
    'A16.createPlatformRolesAccess': {
      // The refusal lands on `callouts` (READ on the callouts set); anything
      // at or above it on this path counts as the gate.
      gate: ['lookup', 'space', 'collaboration', 'calloutsSet', 'callouts'],
      call: (sdk, headers, fx) =>
        sdk.spaceCollaborationReadProbe({ spaceId: fx.spaceId }, headers),
      verify: async ({ fx, data }) => {
        const collaboration = (
          data as {
            lookup: {
              space: {
                collaboration: {
                  id: string;
                  calloutsSet: { callouts: { id: string }[] };
                };
              };
            };
          }
        ).lookup.space.collaboration;
        expect(collaboration.id).toBe(fx.collaborationId);
        // The content itself, not just the container: the same callouts the
        // host sees.
        expect(collaboration.calloutsSet.callouts.map(c => c.id).sort()).toEqual(
          fx.calloutIds
        );
      },
    },
  },
};
