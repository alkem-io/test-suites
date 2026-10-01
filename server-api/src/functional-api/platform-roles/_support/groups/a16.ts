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
 * a READ of a PRIVATE space it is no member of. `lookup.space` alone would not
 * tell: it opens on READ_ABOUT, which a private space still grants to every
 * registered user. The collaboration below it needs READ.
 */
type A16 = { host: DisposableUser; spaceId: string; collaborationId: string };

const COLLABORATION =
  'query($id: UUID!) { lookup { space(ID: $id) { collaboration { id } } } }';

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
        lookup: { space: { collaboration: { id: string } } };
      }>(host.token, COLLABORATION, { id: spaceId });
      return { host, spaceId, collaborationId: lookup.space.collaboration.id };
    }),

  teardown: (ctx, _sdk, fx) => removeDisposableUser(ctx, fx.host),

  invocations: {
    'A16.createPlatformRolesAccess': {
      gate: ['lookup', 'space', 'collaboration'],
      call: (sdk, headers, fx) =>
        sdk.spaceCollaborationReadProbe({ spaceId: fx.spaceId }, headers),
      verify: async ({ fx, data }) =>
        expect(
          (data as { lookup: { space: { collaboration: { id: string } } } })
            .lookup.space.collaboration.id
        ).toBe(fx.collaborationId),
    },
  },
};
