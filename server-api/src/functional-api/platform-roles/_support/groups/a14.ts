import { expect } from 'vitest';
import { SpaceVisibility } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { CAPABILITIES } from '../../capabilities.data';
import {
  createHostedSpace,
  spaceHost,
  removeDisposableUser,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import { rawRead } from '../raw-request';
import { bearer } from '../types';
import type { GroupModule } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A14 — space visibility. Owner: Platform License Manager.
 *
 * The mutation is renamed at Slice B. The gate follows `capability.surface`, so
 * the only place that still carries today's name is the codegen document — and
 * a stale document then fails loudly instead of passing as a denial.
 * Only `visibility` is sent: `nameID` on the same input opens a second gate.
 */
type A14 = { host: DisposableUser; spaceId: string };

const CAPABILITY = CAPABILITIES.find(
  c => c.id === 'A14.updateSpacePlatformSettings'
)!;

const VISIBILITY =
  'query($id: UUID!) { lookup { space(ID: $id) { visibility } } }';

const visibility = async (token: string, id: string) =>
  (
    await rawRead<{ lookup: { space: { visibility: SpaceVisibility } } }>(
      token,
      VISIBILITY,
      { id }
    )
  ).lookup.space.visibility;

export const A14_GROUP: GroupModule<A14> = {
  group: 'A14',

  build: ctx =>
    undoOnFailure(async undo => {
      const host = await spaceHost(ctx);
      undo(() => removeDisposableUser(ctx, host));
      return {
        host,
        spaceId: await createHostedSpace(ctx, host, 'visibility'),
      };
    }),

  teardown: (ctx, _sdk, fx) => removeDisposableUser(ctx, fx.host),

  invocations: {
    [CAPABILITY.id]: {
      gate: [CAPABILITY.surface],
      call: (sdk, headers, fx) =>
        sdk.PlatformRolesUpdateSpaceVisibility(
          {
            updateData: {
              spaceID: fx.spaceId,
              visibility: SpaceVisibility.Demo,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, sdk }) => {
        const reader = ctx.tokens.PLATFORM_CONTENT_FULL_ACCESS;
        expect(await visibility(reader, fx.spaceId)).toBe(SpaceVisibility.Demo);

        await sdk.PlatformRolesUpdateSpaceVisibility(
          {
            updateData: {
              spaceID: fx.spaceId,
              visibility: SpaceVisibility.Active,
            },
          },
          bearer(ctx.tokens.PLATFORM_LICENSE_MANAGER)
        );
        expect(await visibility(reader, fx.spaceId)).toBe(
          SpaceVisibility.Active
        );
      },
    },
  },
};
