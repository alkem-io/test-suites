import { TestUser } from '@alkemio/tests-lib';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { ContributorCollectionItem } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { postGraphqlRaw } from '../../graphql-guard/me-degradation.request.params';

/**
 * Contributor-card-enrichment fixture + query helpers
 * (workspace feature 077-richer-contributor-cards).
 *
 * The read/create helpers use the raw-request pattern of
 * `functional-api/visual/visual.request.params.ts` (`graphqlRequestAuth` with
 * an inline document) so this one-off selection of the five enrichment fields
 * never becomes a shared generated operation other specs must keep in sync.
 * Results are typed with the generated `ContributorCollectionItem`.
 */

export type ContributorCardActorType =
  | 'USER'
  | 'ORGANIZATION'
  | 'VIRTUAL_CONTRIBUTOR';

/**
 * A CONTRIBUTORS-framed callout carrying the given contributor types (all
 * three by default). The existing `createContributorsCallout` helper in
 * `functional-api/visual/visual.request.params.ts` hardcodes USER +
 * ORGANIZATION only — this feature's fixtures need a Virtual Contributors
 * segment too.
 */
export const createContributorCardsCallout = async (
  calloutsSetID: string,
  displayName: string,
  contributorTypes: ContributorCardActorType[] = [
    'USER',
    'ORGANIZATION',
    'VIRTUAL_CONTRIBUTOR',
  ],
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'CreateContributorCardsCallout',
      query: `mutation CreateContributorCardsCallout($calloutData: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $calloutData) { id }
      }`,
      variables: {
        calloutData: {
          calloutsSetID,
          framing: { profile: { displayName }, type: 'CONTRIBUTORS' },
          settings: {
            framing: {
              contributors: {
                contributorTypes,
                defaultContributorType: contributorTypes[0],
                defaultView: 'LIST',
              },
            },
          },
        },
      },
    },
    userRole
  );
};

/** One enriched card as selected by `CONTRIBUTOR_CARDS_QUERY`. */
export type ContributorCard = Pick<
  ContributorCollectionItem,
  | 'id'
  | 'type'
  | 'displayName'
  | 'roleLabel'
  | 'tagline'
  | 'tags'
  | 'joinedDate'
  | 'website'
  | 'associatesCount'
>;

export type ContributorCardCounts = {
  users: number;
  organizations: number;
  virtualContributors: number;
};

const CONTRIBUTOR_CARDS_QUERY = `query ContributorCards($calloutID: UUID!, $type: ActorType!) {
  lookup {
    callout(ID: $calloutID) {
      id
      framing {
        id
        contributorCounts { users organizations virtualContributors }
        contributors(type: $type) {
          id type displayName roleLabel
          tagline tags joinedDate website associatesCount
        }
      }
    }
  }
}`;

/**
 * The enriched contributor cards of one type on one callout, read with an
 * explicit bearer token — or with none, which is the anonymous viewer
 * (`postGraphqlRaw` omits the Authorization header when the token is
 * undefined). Returns the raw GraphQL body so a denial can be asserted by its
 * error code.
 */
export const getContributorCardsAs = async (
  calloutID: string,
  type: ContributorCardActorType,
  bearerToken: string | undefined
) =>
  postGraphqlRaw<{
    lookup: {
      callout: {
        framing: {
          contributorCounts: ContributorCardCounts;
          contributors: ContributorCard[];
        };
      };
    };
  }>(CONTRIBUTOR_CARDS_QUERY, bearerToken, { calloutID, type });

/**
 * The enriched contributor cards of one type on one callout — the existing
 * identity fields plus the five new ones (contract
 * `graphql-contributor-card-enrichment` §1/§2).
 */
export const getContributorCards = async (
  calloutID: string,
  type: ContributorCardActorType,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  graphqlRequestAuth(
    {
      operationName: 'ContributorCards',
      query: CONTRIBUTOR_CARDS_QUERY,
      variables: { calloutID, type },
    },
    userRole
  );

/**
 * An organization's platform-wide `associates` metric — the parity oracle
 * `associatesCount` must equal (contract §2, ruling R4).
 */
export const getOrganizationAssociatesMetric = async (
  organizationID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'OrganizationAssociatesMetric',
      query: `query OrganizationAssociatesMetric($organizationID: UUID!) {
        organization(ID: $organizationID) {
          id
          metrics { name value }
        }
      }`,
      variables: { organizationID },
    },
    userRole
  );
};

// ---------------------------------------------------------------------------
// Fixture-setup helpers. The existing `updateUser` / `updateOrganization`
// wrappers do not expose `tagline` + tagsets; these call the generated
// mutations with the fuller input the schema supports. Every helper throws on
// a GraphQL error or a missing tagset, so a fixture can never silently fall
// back to an empty profile and make an assertion pass for the wrong reason.
// ---------------------------------------------------------------------------

type TagsetRef = { id: string; name: string };
type ProfileTags = {
  tagline?: string;
  tags?: Partial<Record<'skills' | 'keywords' | 'capabilities', string[]>>;
};

const tagsetInputs = (tagsets: TagsetRef[], tags: ProfileTags['tags']) =>
  Object.entries(tags ?? {}).map(([name, values]) => {
    const tagset = tagsets.find(t => t.name === name);
    if (!tagset) {
      throw new Error(
        `Profile has no '${name}' tagset (has: ${tagsets.map(t => t.name).join(', ')})`
      );
    }
    return { ID: tagset.id, tags: values ?? [] };
  });

const updateProfileOrFail = async <TRead>(
  label: string,
  readTagsets: string,
  pickTagsets: (data: TRead) => TagsetRef[],
  mutation: string,
  buildVariables: (
    profileData: Record<string, unknown>
  ) => Record<string, unknown>,
  id: string,
  profile: ProfileTags
) => {
  const read = await graphqlRequestAuth(
    { query: readTagsets, variables: { id } },
    TestUser.GLOBAL_ADMIN
  );
  if (read.body.errors) {
    throw new Error(
      `${label}: reading tagsets failed: ${JSON.stringify(read.body.errors)}`
    );
  }
  const profileData: Record<string, unknown> = {
    tagsets: tagsetInputs(pickTagsets(read.body.data as TRead), profile.tags),
  };
  if (profile.tagline !== undefined) profileData.tagline = profile.tagline;
  const res = await graphqlRequestAuth(
    { query: mutation, variables: buildVariables(profileData) },
    TestUser.GLOBAL_ADMIN
  );
  if (res.body.errors) {
    throw new Error(
      `${label}: update failed: ${JSON.stringify(res.body.errors)}`
    );
  }
};

/** Set a USER's tagline and skills/keywords. */
export const setUserProfileOrFail = (userId: string, profile: ProfileTags) =>
  updateProfileOrFail(
    `user ${userId}`,
    'query($id: UUID!) { user(ID: $id) { profile { tagsets { id name } } } }',
    (data: { user: { profile: { tagsets: TagsetRef[] } } }) =>
      data.user.profile.tagsets,
    'mutation($d: UpdateUserInput!) { updateUser(userData: $d) { id } }',
    profileData => ({ d: { ID: userId, profileData } }),
    userId,
    profile
  );

/** Set an ORGANIZATION's tagline and keywords/capabilities. */
export const setOrganizationProfileOrFail = (
  organizationId: string,
  profile: ProfileTags
) =>
  updateProfileOrFail(
    `organization ${organizationId}`,
    'query($id: UUID!) { organization(ID: $id) { profile { tagsets { id name } } } }',
    (data: { organization: { profile: { tagsets: TagsetRef[] } } }) =>
      data.organization.profile.tagsets,
    'mutation($d: UpdateOrganizationInput!) { updateOrganization(organizationData: $d) { id } }',
    profileData => ({ d: { ID: organizationId, profileData } }),
    organizationId,
    profile
  );

/** Set a VIRTUAL CONTRIBUTOR's tagline and keywords/capabilities. */
export const setVirtualContributorProfileOrFail = (
  virtualContributorId: string,
  profile: ProfileTags
) =>
  updateProfileOrFail(
    `virtual contributor ${virtualContributorId}`,
    'query($id: UUID!) { lookup { virtualContributor(ID: $id) { profile { tagsets { id name } } } } }',
    (data: {
      lookup: { virtualContributor: { profile: { tagsets: TagsetRef[] } } };
    }) => data.lookup.virtualContributor.profile.tagsets,
    'mutation($d: UpdateVirtualContributorInput!) { updateVirtualContributor(virtualContributorData: $d) { id } }',
    profileData => ({ d: { ID: virtualContributorId, profileData } }),
    virtualContributorId,
    profile
  );

/** Set a space's privacy mode and user-information visibility; throws on error. */
export const setSpacePrivacyOrFail = async (
  spaceID: string,
  privacy: {
    mode?: 'PUBLIC' | 'PRIVATE';
    userInformationVisibility?: 'FOLLOW_SPACE_VISIBILITY' | 'MEMBERS_ONLY';
  }
) => {
  const res = await graphqlRequestAuth(
    {
      query:
        'mutation($d: UpdateSpaceSettingsInput!) { updateSpaceSettings(settingsData: $d) { id } }',
      variables: { d: { spaceID, settings: { privacy } } },
    },
    TestUser.GLOBAL_ADMIN
  );
  if (res.body.errors) {
    throw new Error(
      `updateSpaceSettings failed: ${JSON.stringify(res.body.errors)}`
    );
  }
};
