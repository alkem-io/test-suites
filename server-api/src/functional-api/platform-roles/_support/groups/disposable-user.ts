import { rawRequest } from '../raw-request';
import { registerUser } from '../users';

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

/** `false` only on the server's own not-found; any other error is thrown. */
export const userExists = async (
  token: string,
  id: string
): Promise<boolean> => {
  const { data, errors } = await rawRequest<{
    lookup: { user: { id: string } | null };
  }>(token, USER_EXISTS, { id });
  if (errors.length === 0) return data?.lookup?.user?.id === id;
  if (errors.every(e => e.extensions?.code === 'ENTITY_NOT_FOUND'))
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
    if (!(await userExists(usersAdminToken, user.id))) continue;
    const { errors } = await rawRequest(usersAdminToken, DELETE_USER, {
      id: user.id,
    });
    if (errors.length > 0) {
      failures.push(`${user.email}: ${errors[0].message}`);
    }
  }
  if (failures.length > 0) {
    throw new Error(
      `could not delete disposable users — ${failures.join('; ')}`
    );
  }
};
