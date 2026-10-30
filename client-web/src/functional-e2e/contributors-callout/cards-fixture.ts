// Self-seeded fixture helpers for the feature 077 (richer contributor cards)
// acceptance walks. Everything is created through the API as the platform
// admin and removed again by `CardsFixture.cleanUp()`; no spec depends on data
// provisioned out of band, and none touches a shared persona's profile.
//
// Throwaway users are registered with a real Kratos identity (see
// `registerFixtureUser`), so they can JOIN the scenario Space; they are
// only ever *shown* on cards. Walks that need a signed-in viewer use the
// harness personas, which are never modified here.

import {
  ActorType,
  CalloutFramingType,
  ContributorCollectionView,
  assignRoleToOrganization,
  assignRoleToUser,
  assignRoleToVirtualContributor,
  createCalloutWithData,
  createOrganization,
  deleteOrganization,
  deleteUser,
  findUsersPaginated,
  getOrganizationIdByNameId,
  readCalloutFramingContributors,
  readOrganizationProfileTagsets,
  readUserProfileTagsets,
  readVirtualContributorProfileTagsets,
  registerInAlkemioOrFail,
  registerInKratosOrFail,
  removeRoleFromUser,
  TestUser,
  updateOrganizationData,
  updateSpaceSettingsData,
  updateUserProfile,
  updateVirtualContributorData,
  verifyInKratosOrFail,
  type SpacePrivacyMode,
  type UpdateSpaceSettingsInput,
  type UserInformationVisibility,
} from '@alkemio/tests-lib';
import { RoleName } from '@alkemio/tests-lib';
import { must } from '../helpers/lib-actor.helper';

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

/**
 * A throwaway user WITH a Kratos identity, registered through the same
 * self-service path a real person takes (sign-up, e-mail verification, first
 * sign-in). An identity is what lets the user JOIN a Space: since
 * workspace#027 Slice B no actor can assign MEMBER on an L0 space, so the
 * lib's `assignRoleToUser` falls back to signing the user in and joining —
 * impossible for a `createUser`-made record, which has no identity unless the
 * Kratos admin API is reachable (it is not from the Playwright nightly).
 *
 * The display name is derived exactly as the registration derives it
 * (`first` = first word, `last` = the rest), so the card shows `displayName`
 * verbatim. The e-mail is the slug of the name, unique through the run token.
 */
export const registerFixtureUser = async (
  displayName: string
): Promise<{ id: string; email: string }> => {
  const [first, ...rest] = displayName.trim().split(/\s+/);
  const last = rest.join(' ') || 'User';
  const email = `${displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}@alkem.io`;
  const { verificationFlowId } = await registerInKratosOrFail(first, last, email);
  await verifyInKratosOrFail(email, verificationFlowId);
  const id = await registerInAlkemioOrFail(first, last, email);
  return { id, email };
};

/** Removes a `registerFixtureUser` user together with its Kratos identity. */
export const deleteFixtureUser = async (id: string): Promise<void> => {
  const { deleteUser: deleted } = must(
    await deleteUser(id, TestUser.GLOBAL_ADMIN, true),
    `deleteUser(${id})`
  );
  if (deleted.id !== id) throw new Error(`deleted ${deleted.id} instead of ${id}`);
};

export const createContributorsCalloutViaApi = async (
  calloutsSetID: string,
  displayName: string
): Promise<string> =>
  must(
    await createCalloutWithData({
      calloutsSetID,
      framing: { profile: { displayName }, type: CalloutFramingType.Contributors },
      settings: {
        framing: {
          contributors: {
            contributorTypes: [
              ActorType.User,
              ActorType.Organization,
              ActorType.VirtualContributor,
            ],
            defaultContributorType: ActorType.User,
            defaultView: ContributorCollectionView.List,
          },
        },
      },
    }),
    `createContributorsCallout(${displayName})`
  ).createCalloutOnCalloutsSet.id;

/** Only the privacy block is sent — the other settings blocks are left as they are. */
export const setSpacePrivacy = async (
  spaceID: string,
  privacy: {
    mode?: 'PUBLIC' | 'PRIVATE';
    userInformationVisibility?: 'FOLLOW_SPACE_VISIBILITY' | 'MEMBERS_ONLY';
  }
) => {
  const settingsData: UpdateSpaceSettingsInput = {
    spaceID,
    settings: {
      privacy: {
        mode: privacy.mode as SpacePrivacyMode | undefined,
        userInformationVisibility: privacy.userInformationVisibility as
          | UserInformationVisibility
          | undefined,
      },
    },
  };
  return must(
    await updateSpaceSettingsData(settingsData),
    `setSpacePrivacy(${spaceID})`
  );
};

/** The enriched cards of one type, read as admin — the API-side oracle. */
export const apiCards = async (
  calloutID: string,
  type: ContributorTypeName
): Promise<ApiCard[]> =>
  // The generated type labels the DateTime scalar as `Date` and absent fields
  // as `undefined`; on the wire `joinedDate` is an ISO string and absent
  // fields are `null` — the shape `ApiCard` records.
  must(
    await readCalloutFramingContributors(calloutID, type as ActorType),
    `contributors(${type}) of ${calloutID}`
  ).lookup.callout!.framing.contributors as unknown as ApiCard[];

type Tagsets = { id: string; name: string }[];

const PROFILE_OWNERS = {
  user: {
    tagsets: async (id: string): Promise<Tagsets> =>
      must(await readUserProfileTagsets(id), `user ${id} tagsets`).user!.profile!
        .tagsets!,
    update: async (ID: string, profileData: ProfileData) =>
      must(await updateUserProfile({ ID, profileData }), `updateUser ${ID}`),
  },
  organization: {
    tagsets: async (id: string): Promise<Tagsets> =>
      must(
        await readOrganizationProfileTagsets(id),
        `organization ${id} tagsets`
      ).organization!.profile!.tagsets!,
    update: async (ID: string, profileData: ProfileData) =>
      must(
        await updateOrganizationData({ ID, profileData }),
        `updateOrganization ${ID}`
      ),
  },
  virtualContributor: {
    tagsets: async (id: string): Promise<Tagsets> =>
      must(
        await readVirtualContributorProfileTagsets(id),
        `virtualContributor ${id} tagsets`
      ).lookup.virtualContributor!.profile!.tagsets!,
    update: async (ID: string, profileData: ProfileData) =>
      must(
        await updateVirtualContributorData({ ID, profileData }),
        `updateVirtualContributor ${ID}`
      ),
  },
} as const;

/** The profile update the three owners share (`UpdateProfileInput` shape). */
type ProfileData = {
  tagline?: string;
  location?: { city?: string; country?: string };
  tagsets?: { ID: string; tags: string[] }[];
};

/** Set tagline / tagsets / location on a user, organization or VC profile. */
export const setProfile = async (
  owner: keyof typeof PROFILE_OWNERS,
  id: string,
  seed: ProfileSeed
) => {
  const def = PROFILE_OWNERS[owner];
  const tagsets = await def.tagsets(id);
  const profileData: ProfileData = {};
  if (seed.tagline !== undefined) profileData.tagline = seed.tagline;
  if (seed.location) profileData.location = seed.location;
  if (seed.tags) {
    profileData.tagsets = Object.entries(seed.tags).map(([name, tags]) => {
      const tagset = tagsets.find(t => t.name === name);
      if (!tagset) throw new Error(`${owner} ${id} has no '${name}' tagset`);
      return { ID: tagset.id, tags };
    });
  }
  await def.update(id, profileData);
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
    const { id } = await registerFixtureUser(displayName);
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
    // `lookupByName.organization` is the id itself; an error or a null
    // answer means nothing was committed under that nameID — the create
    // error stands.
    const lookup = await getOrganizationIdByNameId(nameID);
    const id = lookup.data?.lookupByName.organization ?? undefined;
    if (id && !this.organizations.includes(id)) this.organizations.push(id);
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
    const { usersPaginated } = must(
      await findUsersPaginated({ displayName: this.runToken }, 200),
      `usersPaginated(${this.runToken})`
    );
    const twins = usersPaginated.users
      .filter(u => u.profile!.displayName.includes(this.runToken))
      .map(u => u.id)
      .filter(id => !this.users.includes(id));
    for (const id of [...this.users.splice(0), ...twins]) {
      try {
        await deleteFixtureUser(id);
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
