import { getGraphqlClient } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import type { PlatformRole } from '../capabilities.data';
import { classify, describeOutcome } from './outcome';
import type { GqlError, Outcome } from './outcome';
import { rawRead } from './raw-request';
import { bearer } from './types';

/**
 * The platform role set, as the rule specs need it: grant / revoke through the
 * MINIMAL documents (judged by the one classifier), read a holder list, and
 * read what a token can actually do.
 */
export type HolderKind = 'user' | 'organization';

/** The generated enum's values ARE the role ids. */
export const roleName = (role: PlatformRole): RoleName =>
  role as unknown as RoleName;

export const assignRole = (
  token: string,
  role: PlatformRole,
  actorID: string,
  kind: HolderKind = 'user'
): Promise<Outcome> => {
  const roleData = { actorID, role: roleName(role) };
  const sdk = getGraphqlClient();
  return kind === 'user'
    ? classify(['assignPlatformRoleToUser'], () =>
        sdk.PlatformRolesAssignRoleToUser({ roleData }, bearer(token))
      )
    : classify(['assignPlatformRoleToOrganization'], () =>
        sdk.assignPlatformRoleToOrganization({ roleData }, bearer(token))
      );
};

export const removeRole = (
  token: string,
  role: PlatformRole,
  actorID: string,
  kind: HolderKind = 'user'
): Promise<Outcome> => {
  const roleData = { actorID, role: roleName(role) };
  const sdk = getGraphqlClient();
  return kind === 'user'
    ? classify(['removePlatformRoleFromUser'], () =>
        sdk.PlatformRolesRemoveRoleFromUser({ roleData }, bearer(token))
      )
    : classify(['removePlatformRoleFromOrganization'], () =>
        sdk.removePlatformRoleFromOrganization({ roleData }, bearer(token))
      );
};

/** For setup and cleanup steps, where anything but `ok` is a broken test. */
export const orThrow = async (
  step: string,
  outcome: Promise<Outcome>
): Promise<void> => {
  const o = await outcome;
  if (o.kind !== 'ok') throw new Error(`${step}: ${describeOutcome(o)}`);
};

/** What a refused call said: the first error's text, code and rule id. */
export type Rejection = { message: string; code?: string; ruleId?: string };

export const rejectionOf = (o: Outcome): Rejection => {
  if (o.kind === 'ok' || o.errors.length === 0) {
    throw new Error(`expected a GraphQL error, got: ${describeOutcome(o)}`);
  }
  const first = o.errors[0] as GqlError & {
    extensions?: { details?: { ruleId?: string } };
  };
  return {
    message: first.message,
    code: first.extensions?.code,
    ruleId: first.extensions?.details?.ruleId,
  };
};

/** The service-profile marker, through the minimal serviceProfile-only document. */
export const setServiceProfile = (
  token: string,
  userId: string,
  serviceProfile: boolean
): Promise<Outcome> =>
  classify(['updateUser'], () =>
    getGraphqlClient().updateUserServiceProfile(
      { userData: { ID: userId, serviceProfile } },
      bearer(token)
    )
  );

/** Holder ids of one role. `readerToken` must be allowed to read that family. */
export const holdersOf = async (
  readerToken: string,
  role: PlatformRole,
  kind: HolderKind = 'user'
): Promise<string[]> => {
  const field = kind === 'user' ? 'usersInRole' : 'organizationsInRole';
  const data = await rawRead<{
    platform: { roleSet: Record<string, { id: string }[]> };
  }>(
    readerToken,
    `query($role: RoleName!) { platform { roleSet { ${field}(role: $role) { id } } } }`,
    { role }
  );
  return data.platform.roleSet[field].map(holder => holder.id);
};

/** What `token` holds and may do, on BOTH platform policies, in one request. */
export type Access = {
  platform: string[];
  roleSet: string[];
  myRoles: string[];
};

export const accessOf = async (token: string): Promise<Access> => {
  const { platform } = await rawRead<{
    platform: {
      authorization: { myPrivileges: string[] };
      roleSet: { myRoles: string[]; authorization: { myPrivileges: string[] } };
    };
  }>(
    token,
    `query { platform {
      authorization { myPrivileges }
      roleSet { myRoles authorization { myPrivileges } }
    } }`
  );
  return {
    platform: [...platform.authorization.myPrivileges].sort(),
    roleSet: [...platform.roleSet.authorization.myPrivileges].sort(),
    myRoles: [...platform.roleSet.myRoles].sort(),
  };
};

/** Sorted values present in `after` and absent from `before`. */
export const added = (
  before: readonly string[],
  after: readonly string[]
): string[] => after.filter(value => !before.includes(value)).sort();

/** Cleanup: whatever `subject` still holds is revoked by `granterToken`. */
export const revokeAllRoles = async (
  granterToken: string,
  subject: { id: string; token: string }
): Promise<void> => {
  const { myRoles } = await accessOf(subject.token);
  for (const role of myRoles.filter(r => r !== 'REGISTERED')) {
    await orThrow(
      `cleanup: revoke ${role}`,
      removeRole(granterToken, role as PlatformRole, subject.id)
    );
  }
};
