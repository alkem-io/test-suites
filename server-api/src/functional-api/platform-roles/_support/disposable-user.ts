import { userExists } from './groups/disposable-user';
import { rawRead } from './raw-request';
import type { RunContext } from './types';
import { registerUser } from './users';

/**
 * A user registered for ONE run and deleted at its end.
 *
 * Fixtures that must belong to "nobody special" live on such a user: every one
 * of the 14 role users is also the subject of every negative, so a space hosted
 * by a role user would hand that role host rights and turn its negatives green
 * or red for the wrong reason.
 */
export type DisposableUser = {
  id: string;
  accountId: string;
  email: string;
  token: string;
};

type Ctx = Omit<RunContext, 'fixtures'>;

const PLANS = 'query { platform { licensingFramework { plans { id name } } } }';
const RAISE_BASELINE =
  'mutation($updateData: UpdateBaselineLicensePlanOnAccount!) { updateBaselineLicensePlanOnAccount(updateData: $updateData) { id } }';
const HOSTED_SPACES_LIMIT = 10;
const CREATE_SPACE =
  'mutation($spaceData: CreateSpaceOnAccountInput!) { createSpace(spaceData: $spaceData) { id } }';
const UPDATE_PRIVACY =
  'mutation($settingsData: UpdateSpaceSettingsInput!) { updateSpaceSettings(settingsData: $settingsData) { id } }';
const HOSTED_SPACES = 'query { me { user { account { spaces { id } } } } }';
const DELETE_SPACE =
  'mutation($id: UUID!) { deleteSpace(deleteData: { ID: $id }) { id } }';
const DELETE_USER =
  'mutation($id: UUID!) { deleteUser(deleteData: { ID: $id, deleteIdentity: true }) { id } }';

/** `tag`: lowercase letters only — it becomes part of an email local part. */
export const registerDisposableUser = async (
  ctx: Ctx,
  tag: string
): Promise<DisposableUser> => {
  const { id, accountId, email, token } = await registerUser(
    `pr${tag}.${ctx.runId}`
  );
  return { id, accountId, email, token };
};

export const planIdByName = async (token: string, name: string) => {
  const { platform } = await rawRead<{
    platform: { licensingFramework: { plans: { id: string; name: string }[] } };
  }>(token, PLANS);
  const plan = platform.licensingFramework.plans.find(p => p.name === name);
  if (!plan)
    throw new Error(`license plan ${name} is not seeded on this platform`);
  return plan.id;
};

const hosts = new Map<string, Promise<DisposableUser>>();

/**
 * THE disposable user whose account hosts this run's spaces — one per run,
 * shared by the groups that need a space (registering a user is the slowest
 * step of a build). A fresh account is entitled to no space; Platform License
 * Manager — the role that owns license usage — raises its baseline.
 *
 * Whichever group tears down first removes the host with every space on its
 * account; for the others `removeDisposableUser` then finds nothing to do.
 */
export const spaceHost = (ctx: Ctx): Promise<DisposableUser> => {
  const existing = hosts.get(ctx.runId);
  if (existing) return existing;

  const host = (async () => {
    const user = await registerDisposableUser(ctx, 'host');
    await rawRead(ctx.tokens.PLATFORM_LICENSE_MANAGER, RAISE_BASELINE, {
      updateData: { accountID: user.accountId, spaceFree: HOSTED_SPACES_LIMIT },
    });
    return user;
  })();
  hosts.set(ctx.runId, host);
  return host;
};

export type SpacePrivacy = {
  mode: 'PUBLIC' | 'PRIVATE';
  allowPlatformSupportAsAdmin: boolean;
};

/** nameID: lowercase alphanumerics and hyphens, max 25 — sanitised here. */
export const createHostedSpace = async (
  ctx: Ctx,
  host: DisposableUser,
  tag: string,
  privacy?: SpacePrivacy
): Promise<string> => {
  const { createSpace } = await rawRead<{ createSpace: { id: string } }>(
    host.token,
    CREATE_SPACE,
    {
      spaceData: {
        accountID: host.accountId,
        nameID: `pr-${tag}-${ctx.runId}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '')
          .slice(0, 25),
        about: {
          profileData: { displayName: `platform-roles ${tag} ${ctx.runId}` },
        },
        collaborationData: { addTutorialCallouts: false, calloutsSetData: {} },
      },
    }
  );
  if (privacy) {
    await rawRead(host.token, UPDATE_PRIVACY, {
      settingsData: { spaceID: createSpace.id, settings: { privacy } },
    });
  }
  return createSpace.id;
};

/** The spaces its account hosts first (a host deletes its own), then the user (Platform Users Admin). */
export const removeDisposableUser = async (
  ctx: Ctx,
  user: DisposableUser
): Promise<void> => {
  const usersAdmin = ctx.tokens.PLATFORM_USERS_ADMIN;
  // `false` only on the server's own not-found — any other error is thrown,
  // so a user that could not be READ is never mistaken for one already gone.
  if (!(await userExists(usersAdmin, user.id))) return;

  const { me } = await rawRead<{
    me: { user: { account: { spaces: { id: string }[] } } };
  }>(user.token, HOSTED_SPACES);
  for (const { id } of me.user.account.spaces) {
    await rawRead(user.token, DELETE_SPACE, { id });
  }
  await rawRead(usersAdmin, DELETE_USER, { id: user.id });
};

/** Rule specs' names for the same two operations. */
export const createDisposableUser = (
  ctx: Pick<RunContext, 'runId'>,
  tag: string
): Promise<DisposableUser> => registerUser(`pr${tag}.${ctx.runId}`);

export const deleteDisposableUser = (
  ctx: Pick<RunContext, 'tokens'>,
  user: Pick<DisposableUser, 'id' | 'email' | 'token'>
): Promise<void> => removeDisposableUser(ctx as Ctx, user as DisposableUser);
