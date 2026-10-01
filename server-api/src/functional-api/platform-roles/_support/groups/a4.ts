import { expect } from 'vitest';
import { rawRead } from '../raw-request';
import type { GroupModule } from '../types';
import {
  deleteDisposableUsers,
  registerDisposableUser,
} from './disposable-user';
import type { DisposableUser } from './disposable-user';

/**
 * A4 — change a user's login email. Owner: Platform Users Admin.
 *
 * The positive really rewrites a login email, so it gets a user registered for
 * this run and nothing else. Negatives — and the drift-resolve call, which has
 * no drift to resolve — aim at a second user whose email must never move.
 */
type A4 = {
  changeTarget: DisposableUser;
  newEmail: string;
  denyTarget: DisposableUser;
};

const USER_EMAIL = 'query($id: UUID!) { lookup { user(ID: $id) { email } } }';

const emailOf = async (token: string, id: string): Promise<string> =>
  (
    await rawRead<{ lookup: { user: { email: string } } }>(token, USER_EMAIL, {
      id,
    })
  ).lookup.user.email;

export const A4_GROUP: GroupModule<A4> = {
  group: 'A4',

  build: async ctx => ({
    changeTarget: await registerDisposableUser(ctx.runId, 'a4change'),
    newEmail: `pra4changed.${ctx.runId}@alkem.io`,
    denyTarget: await registerDisposableUser(ctx.runId, 'a4deny'),
  }),

  teardown: async (ctx, _sdk, fx) => {
    const usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;
    const moved = await emailOf(usersAdmin, fx.denyTarget.id);
    await deleteDisposableUsers(usersAdmin, [fx.changeTarget, fx.denyTarget]);
    if (moved !== fx.denyTarget.email) {
      throw new Error(
        `A4: the deny-target's email moved to ${moved} — a refused role changed it`
      );
    }
  },

  invocations: {
    'A4.adminUserEmailChange': {
      gate: ['adminUserEmailChange'],
      call: (sdk, headers, fx, role) => {
        const allowed = role === 'PLATFORM_USERS_ADMIN';
        return sdk.adminUserEmailChange(
          {
            adminUserEmailChangeData: {
              userID: allowed ? fx.changeTarget.id : fx.denyTarget.id,
              newEmail: allowed
                ? fx.newEmail
                : `pra4refused.${role.toLowerCase()}@alkem.io`,
              reason: 'platform-roles suite',
              approver: {
                name: 'Platform Roles Suite',
                role: 'Organization Administrator',
              },
            },
          },
          headers
        );
      },
      verify: async ({ ctx, fx, data }) => {
        expect(data).toEqual({ adminUserEmailChange: { success: true } });
        expect(
          await emailOf(ctx.tokens.PLATFORM_USERS_ADMIN, fx.changeTarget.id)
        ).toBe(fx.newEmail);
      },
    },
    'A4.adminUserEmailChangeDriftResolve': {
      gate: ['adminUserEmailChangeDriftResolve'],
      call: (sdk, headers, fx) =>
        sdk.adminUserEmailChangeDriftResolve(
          {
            adminUserEmailChangeDriftResolveData: {
              userID: fx.denyTarget.id,
              canonicalEmail: fx.denyTarget.email,
            },
          },
          headers
        ),
      acceptFailure:
        /^EMAIL_CHANGE_DRIFT_NOT_FOUND: No outstanding drift to resolve for the named subject\.$/,
    },
  },
};
