import { expect } from 'vitest';
import { getUserToken } from '@alkemio/tests-lib';
import {
  McpApiKeyOperation,
  McpApiKeyStatus,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { rawRead } from '../raw-request';
import { bearer } from '../types';
import type { GroupModule } from '../types';
import {
  deleteDisposableUsers,
  registerDisposableUser,
  userExists,
} from './disposable-user';
import type { DisposableUser } from './disposable-user';

/**
 * A5 — delete a user, reset an identity / account, administer users' MCP keys.
 * Owner: Platform Users Admin, alone.
 *
 * Every destructive positive consumes its OWN user, registered for this run.
 * Negatives aim at `survivor`, which must still exist — and still be able to
 * sign in — when the run ends. `survivor` also owns the one MCP key: the server
 * caps usable keys at 10 per user, so the key lives on a user that dies with
 * the run and is revoked at teardown regardless.
 */
type A5 = {
  deleteTarget: DisposableUser;
  accountDeleteTarget: DisposableUser;
  identityTarget: DisposableUser & { identityId: string };
  survivor: DisposableUser & { identityId: string };
  mcpKeyId: string;
};

const IDENTITIES =
  'query { platformAdmin { identity { identities { id email } } } }';
const MCP_KEYS =
  'query($userID: UUID!) { platformAdmin { mcpApiKeys(userID: $userID) { id status } } }';

const identityIdOf = async (token: string, email: string): Promise<string> => {
  const identity = (
    await rawRead<{
      platformAdmin: {
        identity: { identities: { id: string; email: string }[] };
      };
    }>(token, IDENTITIES)
  ).platformAdmin.identity.identities.find(i => i.email === email);
  if (!identity) throw new Error(`A5: no Kratos identity found for ${email}`);
  return identity.id;
};

const keysOf = async (token: string, userID: string) =>
  (
    await rawRead<{
      platformAdmin: { mcpApiKeys: { id: string; status: McpApiKeyStatus }[] };
    }>(token, MCP_KEYS, { userID })
  ).platformAdmin.mcpApiKeys;

const isUsersAdmin = (role: string): boolean => role === 'PLATFORM_USERS_ADMIN';

export const A5_GROUP: GroupModule<A5> = {
  group: 'A5',

  build: async (ctx, sdk) => {
    const usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;
    const identityTarget = await registerDisposableUser(ctx.runId, 'a5ident');
    const survivor = await registerDisposableUser(ctx.runId, 'a5keep');

    // Minting is self-service: the key's owner mints it.
    const mcpKeyId = (
      await sdk.mintMcpApiKey(
        {
          mintData: {
            name: `platform-roles ${ctx.runId}`,
            operations: [McpApiKeyOperation.Read],
          },
        },
        bearer(await getUserToken(survivor.email))
      )
    ).data.mintMcpApiKey.key.id;

    return {
      deleteTarget: await registerDisposableUser(ctx.runId, 'a5delete'),
      accountDeleteTarget: await registerDisposableUser(ctx.runId, 'a5account'),
      identityTarget: {
        ...identityTarget,
        identityId: await identityIdOf(usersAdmin, identityTarget.email),
      },
      survivor: {
        ...survivor,
        identityId: await identityIdOf(usersAdmin, survivor.email),
      },
      mcpKeyId,
    };
  },

  teardown: async (ctx, sdk, fx) => {
    const usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;
    const problems: string[] = [];
    try {
      // A refused role must have left the survivor's account AND identity alone.
      if (!(await userExists(usersAdmin, fx.survivor.id))) {
        problems.push('the survivor was deleted by a refused role');
      } else {
        await getUserToken(fx.survivor.email);
      }
    } catch (e) {
      problems.push(
        `the survivor can no longer sign in: ${(e as Error).message}`
      );
    }

    // Idempotent: a no-op when the revoke positive already ran.
    await sdk.adminRevokeMcpApiKey(
      { revokeData: { keyID: fx.mcpKeyId, userID: fx.survivor.id } },
      bearer(usersAdmin)
    );
    await deleteDisposableUsers(usersAdmin, [
      fx.deleteTarget,
      fx.accountDeleteTarget,
      fx.identityTarget,
      fx.survivor,
    ]);
    if (problems.length > 0) throw new Error(`A5: ${problems.join('; ')}`);
  },

  invocations: {
    'A5.deleteUser': {
      gate: ['deleteUser'],
      call: (sdk, headers, fx, role) =>
        sdk.deleteUser(
          {
            deleteData: {
              ID: isUsersAdmin(role) ? fx.deleteTarget.id : fx.survivor.id,
              deleteIdentity: true,
            },
          },
          headers
        ),
      verify: async ({ ctx, fx, data }) => {
        expect(data).toEqual({ deleteUser: { id: fx.deleteTarget.id } });
        expect(
          await userExists(ctx.tokens.PLATFORM_USERS_ADMIN, fx.deleteTarget.id)
        ).toBe(false);
      },
    },
    'A5.adminIdentityDeleteKratosIdentity': {
      gate: ['adminIdentityDeleteKratosIdentity'],
      call: (sdk, headers, fx, role) =>
        sdk.adminIdentityDeleteKratosIdentity(
          {
            kratosIdentityId: isUsersAdmin(role)
              ? fx.identityTarget.identityId
              : fx.survivor.identityId,
          },
          headers
        ),
      verify: async ({ fx, data }) => {
        expect(data).toEqual({ adminIdentityDeleteKratosIdentity: true });
        await expect(getUserToken(fx.identityTarget.email)).rejects.toThrow(
          /invalid_credentials/
        );
      },
    },
    'A5.adminUserAccountDelete': {
      gate: ['adminUserAccountDelete'],
      call: (sdk, headers, fx, role) =>
        sdk.adminUserAccountDelete(
          {
            userID: isUsersAdmin(role)
              ? fx.accountDeleteTarget.id
              : fx.survivor.id,
          },
          headers
        ),
      // This mutation removes the sign-in account and KEEPS the user profile
      // (the server says so in its own description): the observable effect is
      // that the user can no longer sign in, not that the user is gone.
      verify: async ({ ctx, fx, data }) => {
        expect(data).toEqual({
          adminUserAccountDelete: { id: fx.accountDeleteTarget.id },
        });
        await expect(
          getUserToken(fx.accountDeleteTarget.email)
        ).rejects.toThrow(/invalid_credentials/);
        expect(
          await userExists(
            ctx.tokens.PLATFORM_USERS_ADMIN,
            fx.accountDeleteTarget.id
          )
        ).toBe(true);
      },
    },
    'A5.mcpApiKeys': {
      gate: ['platformAdmin', 'mcpApiKeys'],
      call: (sdk, headers, fx) =>
        sdk.platformAdminMcpApiKeys({ userID: fx.survivor.id }, headers),
      verify: async ({ fx, data }) =>
        expect(
          (
            data as { platformAdmin: { mcpApiKeys: { id: string }[] } }
          ).platformAdmin.mcpApiKeys.map(k => k.id)
        ).toEqual([fx.mcpKeyId]),
    },
    'A5.adminRevokeMcpApiKey': {
      gate: ['adminRevokeMcpApiKey'],
      call: (sdk, headers, fx) =>
        sdk.adminRevokeMcpApiKey(
          { revokeData: { keyID: fx.mcpKeyId, userID: fx.survivor.id } },
          headers
        ),
      verify: async ({ ctx, fx, data }) => {
        expect(data).toEqual({ adminRevokeMcpApiKey: { id: fx.mcpKeyId } });
        expect(
          await keysOf(ctx.tokens.PLATFORM_USERS_ADMIN, fx.survivor.id)
        ).toEqual([{ id: fx.mcpKeyId, status: McpApiKeyStatus.Revoked }]);
      },
    },
  },
};
