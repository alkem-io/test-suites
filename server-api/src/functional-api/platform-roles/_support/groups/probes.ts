import { acquirePoolUser, releasePoolUsers } from '../users';
import type { Sdk } from '@alkemio/tests-lib/core/generated/graphql';
import { bearer } from '../types';
import type { RunContext } from '../types';

/**
 * Subjects for the groups whose positives change WHO HOLDS WHAT (A1, A2, A20,
 * A21). Never one of the 14 role users and never a shared `TestUser`: a role or
 * marker left on those would poison every negative.
 *
 * Users come from the persistent, normalised pool (`users.ts`) — they are only
 * ever targets, never consumed. Organizations are created and deleted per run
 * by Platform Support, which owns that job.
 */
type Ctx = Omit<RunContext, 'fixtures'>;

export type Probes = {
  /** `tag`: lowercase letters/digits only — it becomes the email's local part. */
  user: (tag: string) => Promise<string>;
  /** `tag`: lowercase letters, digits and hyphens. nameID is capped at 25. */
  organization: (tag: string) => Promise<string>;
};

/**
 * Runs a group's build(). globalSetup tears down only the groups that FINISHED
 * building, so when this one throws half-way it removes what it had already
 * made before passing the error on.
 */
export const buildWithProbes = async <F>(
  ctx: Ctx,
  sdk: Sdk,
  build: (probes: Probes) => Promise<F>
): Promise<F> => {
  const organizations: string[] = [];
  const probes: Probes = {
    // Assignment targets are never consumed, so they come from the persistent,
    // normalised pool rather than being registered anew every run.
    user: async tag =>
      (await acquirePoolUser(ctx.tokens.PLATFORM_ROLES_ADMIN, tag)).id,
    organization: async tag => {
      const id = (
        await sdk.PlatformRolesCreateOrganization(
          {
            organizationData: {
              profileData: {
                displayName: `platform-roles ${tag} ${ctx.runId}`,
              },
              nameID: `pr-${tag}-${ctx.runId}`.slice(0, 25),
            },
          },
          bearer(ctx.tokens.PLATFORM_SUPPORT)
        )
      ).data.createOrganization.id;
      organizations.push(id);
      return id;
    },
  };

  try {
    return await build(probes);
  } catch (buildError) {
    try {
      await deleteProbeOrganizations(ctx, sdk, organizations);
    } catch (cleanupError) {
      console.error(
        `[platform-roles setup] a failed build left residue: ${(cleanupError as Error).message}`
      );
    }
    throw buildError;
  }
};

/** A registration is a platform user, or — never verified — only an identity. */
const deleteEach = async (
  what: string,
  ids: readonly string[],
  remove: (id: string) => Promise<unknown>
): Promise<void> => {
  const residue: string[] = [];
  for (const id of ids) {
    try {
      await remove(id);
    } catch (e) {
      residue.push(`${id} (${(e as Error).message.slice(0, 120)})`);
    }
  }
  if (residue.length > 0) {
    throw new Error(`${what} not deleted: ${residue.join('; ')}`);
  }
};

/** Pool users are released (normalised, kept); anything else is deleted. */
export const deleteProbeUsers = async (
  ctx: Ctx,
  sdk: Sdk,
  ids: readonly string[]
): Promise<void> => {
  const notPooled = await releasePoolUsers(
    ctx.tokens.PLATFORM_ROLES_ADMIN,
    ids
  );
  await deleteEach('probe users', notPooled, id =>
    sdk.deleteUser(
      { deleteData: { ID: id, deleteIdentity: true } },
      bearer(ctx.tokens.PLATFORM_USERS_ADMIN)
    )
  );
};

export const deleteProbeOrganizations = (
  ctx: Ctx,
  sdk: Sdk,
  ids: readonly string[]
): Promise<void> =>
  deleteEach('probe organizations', ids, id =>
    sdk.deleteOrganization(
      { deleteData: { ID: id } },
      bearer(ctx.tokens.PLATFORM_SUPPORT)
    )
  );
