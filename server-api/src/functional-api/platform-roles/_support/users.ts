import { getUserToken, registerTestUser } from '@alkemio/tests-lib';
import { rawRequest } from './raw-request';

/**
 * THE one way this suite registers a throwaway user. Every helper that needs a
 * disposable user (`disposable-user.ts`, `subjects.ts`, `groups/probes.ts`,
 * `groups/disposable-user.ts`) delegates here.
 *
 * Two things live here because they bit during the build:
 *  - Kratos registration flows override each other when run concurrently, so
 *    registrations are SERIALIZED through one lock — which is what lets fixture
 *    groups be built in parallel safely.
 *  - The platform user is created by the verification hook and can lag behind
 *    `registerTestUser` returning; callers got "user not found" on a busy stack.
 *    So this waits, bounded and logged, until the user can actually sign in.
 */
export type RegisteredUser = {
  id: string;
  accountId: string;
  email: string;
  token: string;
};

const ME = 'query { me { user { id account { id } } } }';
const READY_TIMEOUT_MS = 90_000;
const READY_POLL_MS = 1_000;

let lock: Promise<unknown> = Promise.resolve();

const serialized = <T>(work: () => Promise<T>): Promise<T> => {
  const next = lock.then(work, work);
  lock = next.catch(() => undefined);
  return next;
};

const signIn = async (email: string): Promise<RegisteredUser | undefined> => {
  let token: string;
  try {
    token = await getUserToken(email);
  } catch {
    return undefined;
  }
  const { data } = await rawRequest<{
    me: { user: { id: string; account: { id: string } } | null };
  }>(token, ME);
  const user = data?.me?.user;
  return user
    ? { id: user.id, accountId: user.account.id, email, token }
    : undefined;
};

/** `userName`: `<first>.<last>` — lowercase letters and digits only. */
export const registerUser = (userName: string): Promise<RegisteredUser> =>
  serialized(async () => {
    const name = userName.toLowerCase();
    const email = `${name}@alkem.io`;
    // Pool users exist from the second run on — signing in is ~100 ms, a fresh
    // registration 2-5 s.
    const existing = await signIn(email);
    if (existing) return existing;
    await registerTestUser(name);

    const deadline = Date.now() + READY_TIMEOUT_MS;
    let waited = false;
    for (;;) {
      const user = await signIn(email);
      if (user) return user;
      if (Date.now() > deadline) {
        throw new Error(
          `${email} was registered but could not sign in within ${READY_TIMEOUT_MS / 1000}s`
        );
      }
      if (!waited) {
        console.log(`[platform-roles] waiting for ${email} to become usable…`);
        waited = true;
      }
      await new Promise(resolve => setTimeout(resolve, READY_POLL_MS));
    }
  });

/**
 * POOL users — throwaway in purpose, persistent in fact. A user that is only
 * ever a TARGET (granted a role, given a marker) and never consumed does not
 * need to be new every run: registration is the most expensive thing this suite
 * does. A pool user is registered once per environment and NORMALISED — every
 * platform role revoked, service-profile marker cleared — when it is acquired
 * and again when it is released, so a run starts from a known state whatever
 * the previous one left behind. Users a positive deletes or rewrites stay
 * run-unique (`registerUser`).
 */
const MY_ROLES = 'query { platform { roleSet { myRoles } } }';
const REMOVE_ROLE =
  'mutation($roleData: RemovePlatformRoleInput!) { removePlatformRoleFromUser(roleData: $roleData) { id } }';
const CLEAR_MARKER =
  'mutation($userData: UpdateUserInput!) { updateUser(userData: $userData) { id } }';

const acquired = new Map<string, RegisteredUser>();

const normalise = async (
  rolesAdminToken: string,
  user: RegisteredUser
): Promise<void> => {
  const { data } = await rawRequest<{
    platform: { roleSet: { myRoles: string[] } };
  }>(user.token, MY_ROLES);
  const held = (data?.platform.roleSet.myRoles ?? []).filter(
    role => role !== 'REGISTERED'
  );
  for (const role of held) {
    const { errors } = await rawRequest(rolesAdminToken, REMOVE_ROLE, {
      roleData: { actorID: user.id, role },
    });
    if (errors.length > 0) {
      throw new Error(
        `pool user ${user.email} still holds ${role}: ${errors[0].message}`
      );
    }
  }
  const { errors } = await rawRequest(rolesAdminToken, CLEAR_MARKER, {
    userData: { ID: user.id, serviceProfile: false },
  });
  if (errors.length > 0) {
    throw new Error(
      `could not clear the service-profile marker of ${user.email}: ${errors[0].message}`
    );
  }
};

/** `slot`: lowercase letters and digits; stable across runs. */
export const acquirePoolUser = async (
  rolesAdminToken: string,
  slot: string
): Promise<RegisteredUser> => {
  const user = await registerUser(`prpool.${slot}`);
  await normalise(rolesAdminToken, user);
  acquired.set(user.id, user);
  return user;
};

/** Leaves the users in place, in the normalised state. Ids not from the pool are returned. */
export const releasePoolUsers = async (
  rolesAdminToken: string,
  ids: readonly string[]
): Promise<string[]> => {
  const notPooled: string[] = [];
  for (const id of ids) {
    const user = acquired.get(id);
    if (user) await normalise(rolesAdminToken, user);
    else notPooled.push(id);
  }
  return notPooled;
};
