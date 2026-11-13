import { randomUUID } from 'crypto';
import { RoleName } from '../../core/generated/alkemio-schema';
import { postGraphqlRaw } from '../../utils/graphql.raw.client';
import {
  assignPlatformRole,
  createOrganization,
  deleteOrganization,
} from '../baseFunctions';
import { deleteUser } from '../functions/contributtor-management/user/user.request.params';
import { BOOTSTRAP_ROLES_ADMIN_EMAIL } from '../platform-roles/platform-role-users';
import { getUserToken } from '../registration/get-user-token';
import { readServedUser } from './graphql';
import { createIdentity, deleteIdentity } from './kratos';

/**
 * Identities and organisations each spec creates for itself and deletes in
 * `finally`: no shared persona is ever enrolled, covered or reset.
 */
export type ThrowawayUser = {
  email: string;
  identityId: string;
  userId: string;
  /** A non-interactive bearer — not a sign-in, never evaluated by the rule. */
  token: string;
};

/**
 * A Kratos identity (verified email, harness password) and its platform user,
 * which the server creates on the identity's first sign-in.
 */
export const createThrowawayUser = async (tag: string): Promise<ThrowawayUser> => {
  const email = `sf.${tag}${randomUUID().slice(0, 8)}@alkem.io`;
  const identityId = await createIdentity(email);
  try {
    const token = await getUserToken(email);
    const me = await readServedUser({ bearerToken: token });
    const userId = me.body.data?.me?.user?.id;
    if (!userId) {
      throw new Error(
        `second-factor: no platform user for ${email}: ${me.raw.slice(0, 300)}`
      );
    }
    return { email, identityId, userId, token };
  } catch (error) {
    // The caller never receives this identity, so nothing else deletes it.
    // A platform user the server already created for it is left behind: a
    // test-data leak on the runner's stack, never a false green.
    await deleteIdentity(identityId);
    throw error;
  }
};

/** Deletes the platform user and its identity as Platform Users Admin. */
export const deleteThrowawayUser = async (
  user: Pick<ThrowawayUser, 'userId'>,
  usersAdminToken: string
): Promise<void> => {
  const deleted = await deleteUser(
    user.userId,
    { bearerToken: usersAdminToken },
    true
  );
  must(deleted, `delete user ${user.userId}`);
};

/**
 * Deletes every user in `users`, attempting each even when one fails, then
 * rethrows the first failure.
 */
export const deleteThrowawayUsers = async (
  users: (Pick<ThrowawayUser, 'userId'> | undefined)[],
  usersAdminToken: string
): Promise<void> => {
  const failures: unknown[] = [];
  for (const user of users) {
    if (user) {
      await deleteThrowawayUser(user, usersAdminToken).catch(error =>
        failures.push(error)
      );
    }
  }
  if (failures.length > 0) throw failures[0];
};

export type ThrowawayOrganization = { id: string; roleSetId: string };

// Selects only the id: the shared document's UserData reads the assignee's
// settings, which an organisation admin may not read.
const ASSIGN_ROLE_TO_USER =
  'mutation($d: AssignRoleOnRoleSetInput!) { assignRoleToUser(roleData: $d) { id } }';

/**
 * Makes `userId` an associate of the organisation behind `roleSetId`, as that
 * organisation's admin. The raw answer is returned for the caller to assert on.
 */
export const assignOrganizationAssociate = (
  roleSetId: string,
  userId: string,
  admin: { bearerToken: string }
) =>
  postGraphqlRaw<{ assignRoleToUser: { id: string } }>(ASSIGN_ROLE_TO_USER, {
    variables: {
      d: { actorID: userId, roleSetID: roleSetId, role: RoleName.Associate },
    },
    ...admin,
  });

const must = <T>(
  result: { data?: T; error?: { errors?: { message?: string }[] } },
  step: string
): T => {
  if (!result.data) {
    throw new Error(
      `second-factor: ${step} failed: ${result.error?.errors?.[0]?.message ?? 'no data'}`
    );
  }
  return result.data;
};

/**
 * Runs `fn` on an organisation `admin` creates (and so owns and administers),
 * with each of `associates` as its associate, and deletes it in `finally`.
 * `admin` is first granted Feature Organization Creator, the role creation needs.
 */
export const withThrowawayOrganization = async <T>(
  people: { admin: ThrowawayUser; associates: ThrowawayUser[] },
  fn: (organization: ThrowawayOrganization) => Promise<T>
): Promise<T> => {
  const actor = { bearerToken: people.admin.token };
  must(
    await assignPlatformRole(
      people.admin.userId,
      RoleName.FeatureOrganizationCreator,
      { bearerToken: await getUserToken(BOOTSTRAP_ROLES_ADMIN_EMAIL) }
    ),
    'grant Feature Organization Creator'
  );
  const nameID = `sf-${randomUUID().slice(0, 12)}`;
  const created = must(
    await createOrganization(
      `Second factor ${nameID}`,
      nameID,
      undefined,
      undefined,
      undefined,
      undefined,
      actor
    ),
    'create organisation'
  ).createOrganization;
  const organization = { id: created.id, roleSetId: created.roleSet.id };
  let result: T;
  let deleted: Awaited<ReturnType<typeof deleteOrganization>>;
  try {
    for (const associate of people.associates) {
      const assigned = await assignOrganizationAssociate(
        organization.roleSetId,
        associate.userId,
        actor
      );
      if (!assigned.body.data?.assignRoleToUser) {
        throw new Error(
          `second-factor: make ${associate.email} an associate failed: ${assigned.raw.slice(0, 300)}`
        );
      }
    }
    result = await fn(organization);
  } finally {
    deleted = await deleteOrganization(organization.id, actor);
  }
  // Reported only when `fn` passed: a throw from `finally` would hide its error.
  must(deleted, 'delete organisation');
  return result;
};
