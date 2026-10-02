import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

/**
 * Contributor-card-enrichment fixture + query helpers
 * (workspace feature 077-richer-contributor-cards).
 *
 * The three read/create helpers below use the raw-request pattern of
 * `functional-api/visual/visual.request.params.ts`: `graphqlRequestAuth` with
 * an inline document, rather than the generated `@alkemio/tests-lib` SDK.
 * Two of these select the five NEW `ContributorCollectionItem` fields
 * (`tagline`, `tags`, `joinedDate`, `website`, `associatesCount`), and the
 * committed codegen is regenerated from the wave-1 server's schema
 * specifically so this it-spec can build against it — but keeping the
 * selection as an inline document (rather than a new `.graphql` operation
 * file) means this one-off query never becomes a shared generated operation
 * every other consumer has to keep in sync.
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

/**
 * The enriched contributor cards of one type on one callout — the existing
 * identity fields plus the five new ones (contract
 * `graphql-contributor-card-enrichment` §1/§2).
 */
export const getContributorCards = async (
  calloutID: string,
  type: ContributorCardActorType,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'ContributorCards',
      query: `query ContributorCards($calloutID: UUID!, $type: ActorType!) {
        lookup {
          callout(ID: $calloutID) {
            id
            framing {
              id
              contributors(type: $type) {
                id
                type
                displayName
                roleLabel
                tagline
                tags
                joinedDate
                website
                associatesCount
              }
            }
          }
        }
      }`,
      variables: { calloutID, type },
    },
    userRole
  );
};

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
// Fixture-setup helper. `updateUser` in
// `contributor-management/user/user.request.params.ts` only types
// `location`/`description` on `profileData` (its existing callers never
// needed more); this feature's fixture needs `tagline` + the `skills`/
// `keywords` tagsets too, so this calls the same already-generated
// `updateUser` mutation directly with the fuller input the schema already
// supports.
// ---------------------------------------------------------------------------

/** A profile's tagset id by reserved name ('skills' | 'keywords'), if the profile carries one. */
const findTagsetId = (
  tagsets: Array<{ id: string; name: string }> | undefined | null,
  name: string
): string | undefined => tagsets?.find(t => t.name === name)?.id;

/**
 * Set a USER's tagline and skills/keywords tagsets in one call. `tagsets` is
 * that user's current `profile.tagsets` (from `getUserData`), read first so
 * the existing tagset ids can be targeted — `UpdateTagsetInput` replaces a
 * tagset's tags by id, it does not create one.
 */
export const setUserTaglineAndTags = async (
  userId: string,
  tagsets: Array<{ id: string; name: string }>,
  options: { tagline?: string; skills?: string[]; keywords?: string[] }
) => {
  const tagsetsInput: { ID: string; tags: string[] }[] = [];
  const skillsId = findTagsetId(tagsets, 'skills');
  const keywordsId = findTagsetId(tagsets, 'keywords');
  if (skillsId && options.skills !== undefined) {
    tagsetsInput.push({ ID: skillsId, tags: options.skills });
  }
  if (keywordsId && options.keywords !== undefined) {
    tagsetsInput.push({ ID: keywordsId, tags: options.keywords });
  }
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.updateUser(
      {
        userData: {
          ID: userId,
          profileData: {
            tagline: options.tagline ?? '',
            tagsets: tagsetsInput,
          },
        },
      },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, TestUser.GLOBAL_ADMIN);
};
