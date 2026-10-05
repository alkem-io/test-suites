// Self-seeded fixture helpers for the feature 077 (richer contributor cards)
// acceptance walks. Everything is created through the API as the platform
// admin and removed again by `CardsFixture.cleanUp()`; no spec depends on data
// provisioned out of band, and none touches a shared persona's profile.
//
// Throwaway users are created with `createUser` (no Kratos identity): they are
// only ever *shown* on cards. Walks that need a signed-in viewer use the
// harness personas, which are never modified here.

import { TestUser } from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import {
  assignRoleToOrganization,
  assignRoleToUser,
  assignRoleToVirtualContributor,
  createOrganization,
  createUser,
  deleteOrganization,
  removeRoleFromUser,
} from '@alkemio/tests-lib/scenario/baseFunctions';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

export type ContributorTypeName =
  | 'USER'
  | 'ORGANIZATION'
  | 'VIRTUAL_CONTRIBUTOR';

/** The enrichment fields as the API delivers them — the oracle for the UI. */
export type ApiCard = {
  id: string;
  displayName: string;
  roleLabel: string | null;
  tagline: string | null;
  tags: string[] | null;
  joinedDate: string | null;
  website: string | null;
  associatesCount: number | null;
};

type TagsetName = 'skills' | 'keywords' | 'capabilities';
export type ProfileSeed = {
  tagline?: string;
  tags?: Partial<Record<TagsetName, string[]>>;
  location?: { city?: string; country?: string };
};

/** Run a GraphQL document as the platform admin; throw on any error. */
export const adminGql = async <T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> => {
  const res = await graphqlRequestAuth(
    { query, variables },
    TestUser.GLOBAL_ADMIN
  );
  // A refused request (rate limit, gateway error) may carry no GraphQL
  // `errors` at all — treat anything but a 200 with `data` as a failure.
  if (res.status !== 200 || res.body?.errors || !res.body?.data) {
    throw new Error(
      `GraphQL request failed (HTTP ${res.status}): ${JSON.stringify(res.body?.errors ?? res.text?.slice(0, 300))}`
    );
  }
  return res.body.data as T;
};

export const createContributorsCalloutViaApi = async (
  calloutsSetID: string,
  displayName: string
): Promise<string> =>
  (
    await adminGql<{ createCalloutOnCalloutsSet: { id: string } }>(
      'mutation($c: CreateCalloutOnCalloutsSetInput!) { createCalloutOnCalloutsSet(calloutData: $c) { id } }',
      {
        c: {
          calloutsSetID,
          framing: { profile: { displayName }, type: 'CONTRIBUTORS' },
          settings: {
            framing: {
              contributors: {
                contributorTypes: [
                  'USER',
                  'ORGANIZATION',
                  'VIRTUAL_CONTRIBUTOR',
                ],
                defaultContributorType: 'USER',
                defaultView: 'LIST',
              },
            },
          },
        },
      }
    )
  ).createCalloutOnCalloutsSet.id;

export const setSpacePrivacy = (
  spaceID: string,
  privacy: {
    mode?: 'PUBLIC' | 'PRIVATE';
    userInformationVisibility?: 'FOLLOW_SPACE_VISIBILITY' | 'MEMBERS_ONLY';
  }
) =>
  adminGql(
    'mutation($d: UpdateSpaceSettingsInput!) { updateSpaceSettings(settingsData: $d) { id } }',
    { d: { spaceID, settings: { privacy } } }
  );

/** The enriched cards of one type, read as admin — the API-side oracle. */
export const apiCards = async (
  calloutID: string,
  type: ContributorTypeName
): Promise<ApiCard[]> =>
  (
    await adminGql<{
      lookup: { callout: { framing: { contributors: ApiCard[] } } };
    }>(
      `query($id: UUID!, $t: ActorType!) { lookup { callout(ID: $id) { framing {
        contributors(type: $t) { id displayName roleLabel tagline tags joinedDate website associatesCount } } } } }`,
      { id: calloutID, t: type }
    )
  ).lookup.callout.framing.contributors;

type TagsetHolder = { profile: { tagsets: { id: string; name: string }[] } };

const PROFILE_OWNERS = {
  user: {
    read: 'query($id: UUID!) { user(ID: $id) { profile { tagsets { id name } } } }',
    pick: (d: unknown) => (d as { user: TagsetHolder }).user.profile.tagsets,
    update:
      'mutation($d: UpdateUserInput!) { updateUser(userData: $d) { id } }',
    wrap: (ID: string, profileData: unknown) => ({ d: { ID, profileData } }),
  },
  organization: {
    read: 'query($id: UUID!) { organization(ID: $id) { profile { tagsets { id name } } } }',
    pick: (d: unknown) =>
      (d as { organization: TagsetHolder }).organization.profile.tagsets,
    update:
      'mutation($d: UpdateOrganizationInput!) { updateOrganization(organizationData: $d) { id } }',
    wrap: (ID: string, profileData: unknown) => ({ d: { ID, profileData } }),
  },
  virtualContributor: {
    read: 'query($id: UUID!) { lookup { virtualContributor(ID: $id) { profile { tagsets { id name } } } } }',
    pick: (d: unknown) =>
      (d as { lookup: { virtualContributor: TagsetHolder } }).lookup
        .virtualContributor.profile.tagsets,
    update:
      'mutation($d: UpdateVirtualContributorInput!) { updateVirtualContributor(virtualContributorData: $d) { id } }',
    wrap: (ID: string, profileData: unknown) => ({ d: { ID, profileData } }),
  },
} as const;

/** Set tagline / tagsets / location on a user, organization or VC profile. */
export const setProfile = async (
  owner: keyof typeof PROFILE_OWNERS,
  id: string,
  seed: ProfileSeed
) => {
  const def = PROFILE_OWNERS[owner];
  const tagsets = def.pick(await adminGql(def.read, { id }));
  const profileData: Record<string, unknown> = {};
  if (seed.tagline !== undefined) profileData.tagline = seed.tagline;
  if (seed.location) profileData.location = seed.location;
  if (seed.tags) {
    profileData.tagsets = Object.entries(seed.tags).map(([name, tags]) => {
      const tagset = tagsets.find(t => t.name === name);
      if (!tagset) throw new Error(`${owner} ${id} has no '${name}' tagset`);
      return { ID: tagset.id, tags };
    });
  }
  await adminGql(def.update, def.wrap(id, profileData));
};

/**
 * Owns every entity a walk creates beyond its `TestScenarioFactory` scenario
 * and removes them children-first. Failures are collected and reported, never
 * swallowed.
 */
export class CardsFixture {
  private readonly users: string[] = [];
  private readonly organizations: string[] = [];

  /**
   * @param runToken unique per run and part of every display name this
   * fixture creates. `graphqlErrorWrapper` retries a mutation after a
   * connection reset even if the server already committed it, and
   * `createUser` generates a fresh nameID per attempt — so a retried create
   * leaves an untracked twin. `cleanUp` sweeps those by this token.
   */
  constructor(private readonly runToken: string) {}

  async user(
    displayName: string,
    roleSetID: string,
    seed?: ProfileSeed,
    roles: RoleName[] = [RoleName.Member]
  ): Promise<string> {
    if (!displayName.includes(this.runToken)) {
      throw new Error(
        `"${displayName}" must contain the run token ${this.runToken}`
      );
    }
    const res = await createUser({ profileData: { displayName } });
    if (res.error || !res.data?.createUser) {
      throw new Error(
        `createUser(${displayName}): ${JSON.stringify(res.error)}`
      );
    }
    const id = res.data.createUser.id;
    this.users.push(id);
    for (const role of roles) {
      const assigned = await assignRoleToUser(id, roleSetID, role);
      if (assigned.error) {
        throw new Error(
          `assign ${role} to ${displayName}: ${JSON.stringify(assigned.error)}`
        );
      }
    }
    if (seed) await setProfile('user', id, seed);
    return id;
  }

  /**
   * An organization that is a member of `spaceRoleSetID`, with exactly
   * `associates` associates platform-wide: the creating admin's automatic
   * ASSOCIATE role is removed and `associates` throwaway users are added.
   */
  async organization(
    displayName: string,
    nameID: string,
    spaceRoleSetID: string,
    options: { associates: number; website?: string; seed?: ProfileSeed },
    adminUserId: string
  ): Promise<string> {
    if (!displayName.includes(this.runToken)) {
      throw new Error(
        `"${displayName}" must contain the run token ${this.runToken}`
      );
    }
    const orgNameID = nameID.toLowerCase().slice(0, 24);
    const res = await createOrganization(
      displayName,
      orgNameID,
      undefined,
      undefined,
      options.website
    );
    if (res.error || !res.data?.createOrganization) {
      // A retried create re-fails on the fixed nameID ("already taken") even
      // though the first attempt was committed. Track that twin so `cleanUp`
      // removes it, then report the failure.
      await this.trackOrganizationByNameID(orgNameID);
      throw new Error(
        `createOrganization(${displayName}): ${JSON.stringify(res.error)}`
      );
    }
    const { id, roleSet } = res.data.createOrganization;
    this.organizations.push(id);
    await assignRoleToOrganization(id, spaceRoleSetID, RoleName.Member);
    const removed = await removeRoleFromUser(
      adminUserId,
      roleSet.id,
      RoleName.Associate
    );
    if (removed.error) {
      throw new Error(
        `remove creator ASSOCIATE on ${displayName}: ${JSON.stringify(removed.error)}`
      );
    }
    for (let i = 0; i < options.associates; i++) {
      await this.user(`${displayName} associate ${i}`, roleSet.id, undefined, [
        RoleName.Associate,
      ]);
    }
    if (options.seed) await setProfile('organization', id, options.seed);
    return id;
  }

  /** Track an organization that exists under `nameID` although its create reported a failure. */
  private async trackOrganizationByNameID(nameID: string): Promise<void> {
    try {
      const { lookupByName } = await adminGql<{
        lookupByName: { organization: { id: string } | null };
      }>(
        'query($n: NameID!) { lookupByName { organization(NAMEID: $n) { id } } }',
        { n: nameID }
      );
      const id = lookupByName.organization?.id;
      if (id && !this.organizations.includes(id)) this.organizations.push(id);
    } catch {
      /* nothing committed under that nameID — the create error stands */
    }
  }

  async virtualContributorMember(
    vcId: string,
    roleSetID: string,
    seed?: ProfileSeed
  ) {
    const assigned = await assignRoleToVirtualContributor(
      vcId,
      roleSetID,
      RoleName.Member
    );
    if (assigned.error) {
      throw new Error(`assign VC ${vcId}: ${JSON.stringify(assigned.error)}`);
    }
    if (seed) await setProfile('virtualContributor', vcId, seed);
  }

  /** Delete organizations, then users. Throws listing every failure. */
  async cleanUp(): Promise<void> {
    const failures: string[] = [];
    for (const id of this.organizations.splice(0)) {
      const res = await deleteOrganization(id);
      if (res.error)
        failures.push(`organization ${id}: ${JSON.stringify(res.error)}`);
    }
    // Retry twins: users carrying this run's token that were never tracked.
    const { usersPaginated } = await adminGql<{
      usersPaginated: {
        users: { id: string; profile: { displayName: string } }[];
      };
    }>(
      'query($f: String) { usersPaginated(first: 200, filter: { displayName: $f }) { users { id profile { displayName } } } }',
      { f: this.runToken }
    );
    const twins = usersPaginated.users
      .filter(u => u.profile.displayName.includes(this.runToken))
      .map(u => u.id)
      .filter(id => !this.users.includes(id));
    for (const id of [...this.users.splice(0), ...twins]) {
      try {
        const { deleteUser } = await adminGql<{ deleteUser: { id: string } }>(
          'mutation($d: DeleteUserInput!) { deleteUser(deleteData: $d) { id } }',
          { d: { ID: id, deleteIdentity: false } }
        );
        if (deleteUser.id !== id) throw new Error(`deleted ${deleteUser.id}`);
      } catch (e) {
        failures.push(`user ${id}: ${String(e)}`);
      }
    }
    if (failures.length) {
      throw new Error(`Cards fixture cleanup failed:\n${failures.join('\n')}`);
    }
  }
}

/** First day (UTC) of the month of `d`, as the API delivers `joinedDate`. */
export const monthStartUtcIso = (d: Date): string =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();

/** "Oct 2026" for an ISO date, from its UTC year and month (D-UTC). */
export const monthYearLabel = (iso: string, locale = 'en-US'): string =>
  new Intl.DateTimeFormat(locale, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
