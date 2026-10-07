import { expect } from 'vitest';
import { platformRoleEmail, seedPlatformRoleUsers } from '@alkemio/tests-lib';
import type {
  MailItem,
  PlatformRoleName,
  SeededPlatformRoleUsers,
} from '@alkemio/tests-lib';
import type { UserModel } from '@alkemio/tests-lib/scenario/models/UserModel';
import type { SettingsOwner } from '@functional-api/platform-roles/_support/platform-admin-settings';
import { rawRead } from '@functional-api/platform-roles/_support/raw-request';
import { acquirePoolUser } from '@functional-api/platform-roles/_support/users';

/**
 * Shared by the platform-admin notification specs in this directory.
 *
 * Who receives a platform-admin notification is decided by the purpose-specific
 * platform roles (workspace#065). The holders these specs reason about are the
 * 14 single-role users the platform-roles suites seed — each holds exactly its
 * one role — plus a pool user granted a role for one block. Mail to anyone
 * else on a shared stack is outside every assertion here: `mailTo` scopes the
 * mailbox to the holders a spec names.
 */

/** Someone acting with their own token, whose mail lands at `email`. */
export type Holder = SettingsOwner & { email: string };

let seeded: Promise<SeededPlatformRoleUsers> | undefined;

/** The 14 single-role users, seeded once per worker — idempotent, no writes once seeded. */
export const platformRoleHolders = (): Promise<SeededPlatformRoleUsers> => {
  seeded ??= seedPlatformRoleUsers().catch((e: unknown) => {
    seeded = undefined;
    throw e;
  });
  return seeded;
};

export const roleHolder = (
  users: SeededPlatformRoleUsers,
  role: PlatformRoleName
): Holder => ({
  id: users.userIds[role],
  token: users.tokens[role],
  email: platformRoleEmail(role),
});

export const testUserHolder = (user: UserModel): Holder => ({
  id: user.id,
  token: user.authToken,
  email: user.email,
});

/** Scope for `getMailsDataSettled`: mail with exactly `subject`, sent to one of `audience`. */
export const mailTo =
  (subject: string, audience: readonly Holder[]) =>
  (mail: MailItem): boolean => {
    const addresses = new Set(audience.map(holder => holder.email));
    return (
      mail.subject === subject &&
      (mail.toAddresses ?? []).some(address => addresses.has(address))
    );
  };

export const expectedEmail = (subject: string, toAddress: string) =>
  expect.objectContaining({ subject, toAddresses: [toAddress] });

/**
 * A pool user (registered once per environment, normalised on acquire and on
 * release — see `platform-roles/_support/users.ts`) made a holder of `role` by
 * the Platform Roles Admin. Release it with `releasePoolUsers`.
 */
export const poolHolderWithRole = async (
  users: SeededPlatformRoleUsers,
  slot: string,
  role: PlatformRoleName
): Promise<Holder> => {
  const pool = await acquirePoolUser(users.tokens.PLATFORM_ROLES_ADMIN, slot);
  await rawRead(
    users.tokens.PLATFORM_ROLES_ADMIN,
    `mutation($id: UUID!) { assignPlatformRoleToUser(roleData: { actorID: $id, role: ${role} }) { id } }`,
    { id: pool.id }
  );
  return { id: pool.id, token: pool.token, email: pool.email };
};

const CREATE_USER =
  'mutation($userData: CreateUserInput!) { createUser(userData: $userData) { id } }';
const DELETE_USER =
  'mutation($id: UUID!) { deleteUser(deleteData: { ID: $id, deleteIdentity: true }) { id } }';

/** `createUser` is gated on platform CREATE — on Slice B only Platform Content Full Access holds it. */
export const createUserAs = async (
  token: string,
  user: { email: string; nameID: string; displayName: string }
): Promise<string> => {
  const { createUser } = await rawRead<{ createUser: { id: string } }>(
    token,
    CREATE_USER,
    {
      userData: {
        email: user.email,
        nameID: user.nameID,
        firstName: 'Routing',
        lastName: 'Check',
        profileData: { displayName: user.displayName },
      },
    }
  );
  return createUser.id;
};

/** Throws when refused — a denied delete must fail as such, not as a missing mail. */
export const deleteUserAs = async (
  token: string,
  id: string
): Promise<void> => {
  await rawRead(token, DELETE_USER, { id });
};
