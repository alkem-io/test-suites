import { NEUTRAL_ERROR_CODE } from '@functional-api/error-response/error-response.constants';
import { rawRequest } from '../raw-request';
import { registerUser } from '../users';
import { deleteResidue } from '../still-present';

/**
 * A user registered for ONE run and one purpose: a target that a positive may
 * consume, or a deny-target that must survive. Never a role user and never a
 * shared `TestUser` — a positive here rewrites a login email or deletes the
 * account outright.
 */
export type DisposableUser = { id: string; email: string };

/** Kratos registration + first login (which creates the Alkemio user). */
export const registerDisposableUser = async (
  runId: string,
  tag: string
): Promise<DisposableUser> => {
  const { id, email } = await registerUser(`pr${tag}.${runId}`);
  return { id, email };
};

const USER_EXISTS = 'query($id: UUID!) { lookup { user(ID: $id) { id } } }';

/**
 * `false` on the generic FORBIDDEN_POLICY answer; any other error is thrown.
 * That answer is the same for a missing user and a refused read, so `false`
 * means "gone" only for a token that read the same user successfully before.
 */
export const userExists = async (
  token: string,
  id: string
): Promise<boolean> => {
  const { data, errors } = await rawRequest<{
    lookup: { user: { id: string } | null };
  }>(token, USER_EXISTS, { id });
  if (errors.length === 0) return data?.lookup?.user?.id === id;
  if (errors.every(e => e.extensions?.code === NEUTRAL_ERROR_CODE))
    return false;
  throw new Error(`could not read user ${id}: ${errors[0].message}`);
};

const DELETE_USER =
  'mutation($id: UUID!) { deleteUser(deleteData: { ID: $id, deleteIdentity: true }) { id } }';

/** Teardown: removes the user AND its sign-in identity, as Platform Users Admin. */
export const deleteDisposableUsers = async (
  usersAdminToken: string,
  users: readonly DisposableUser[]
): Promise<void> => {
  const failures: string[] = [];
  for (const user of users) {
    const { errors } = await rawRequest(usersAdminToken, DELETE_USER, {
      id: user.id,
    });
    // A generic answer is "already gone" only if the global admin can no
    // longer read the user; otherwise the delete was refused.
    // A failed presence read is recorded too, and the loop goes on, so one
    // user never stops the others being removed.
    const residue = await deleteResidue('user', user.id, errors).catch(
      (error: unknown) =>
        `presence check failed: ${error instanceof Error ? error.message : String(error)}`
    );
    if (residue) failures.push(`${user.email}: ${residue}`);
  }
  if (failures.length > 0) {
    throw new Error(
      `could not delete disposable users — ${failures.join('; ')}`
    );
  }
};
