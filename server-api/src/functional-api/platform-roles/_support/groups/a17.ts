import { CAPABILITIES } from '../../capabilities.data';
import {
  createHostedSpace,
  registerDisposableUser,
  removeDisposableUser,
  spaceHost,
} from '../disposable-user';
import type { DisposableUser } from '../disposable-user';
import type { GroupModule } from '../types';
import { undoOnFailure } from '../undo-on-failure';

/**
 * A17 — rename an entity (nameID). Slice B, FR-020. Owner: the ENTITY admin;
 * no global role reaches either surface, so every cell here is a denial.
 *
 * Two targets a role user administers nothing of: a disposable user (for
 * `updateActorNameID`) and a disposable host's space (for the protected
 * `nameID` section of `updateSpace`). A rename that wrongly went through would
 * be visible — the per-role nameID below is unique — and the owner positives
 * (`rules/rename-nameid.it-spec.ts`) prove the surfaces still work for the
 * people who own them.
 */
type A17 = { host: DisposableUser; spaceId: string; user: DisposableUser };

const ACTOR = CAPABILITIES.find(c => c.id === 'A17.updateActorNameID')!;
const SPACE = CAPABILITIES.find(c => c.id === 'A17.updateSpace.nameID')!;

/** nameID: lowercase alphanumerics and hyphens, max 25. */
const nameIdFor = (runId: string, role: string, kind: 'u' | 's') =>
  `a17${kind}-${role.toLowerCase().replace(/[^a-z]/g, '').slice(0, 8)}-${runId}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 25);

export const A17_GROUP: GroupModule<A17> = {
  group: 'A17',

  build: ctx =>
    undoOnFailure(async undo => {
      const host = await spaceHost(ctx);
      undo(() => removeDisposableUser(ctx, host));
      const user = await registerDisposableUser(ctx, 'a17user');
      undo(() => removeDisposableUser(ctx, user));
      return {
        host,
        user,
        spaceId: await createHostedSpace(ctx, host, 'a17'),
      };
    }),

  teardown: async (ctx, _sdk, fx) => {
    await removeDisposableUser(ctx, fx.user);
    await removeDisposableUser(ctx, fx.host);
  },

  invocations: {
    [ACTOR.id]: {
      gate: [ACTOR.surface],
      call: (sdk, headers, fx, role) =>
        sdk.updateActorNameID(
          {
            updateData: {
              actorID: fx.user.id,
              nameID: nameIdFor(fx.user.id.slice(0, 6), role, 'u'),
            },
          },
          headers
        ),
    },
    [SPACE.id]: {
      gate: ['updateSpace'],
      call: (sdk, headers, fx, role) =>
        sdk.updateSpace(
          {
            spaceData: {
              ID: fx.spaceId,
              nameID: nameIdFor(fx.spaceId.slice(0, 6), role, 's'),
            },
          },
          headers
        ),
    },
  },
};
