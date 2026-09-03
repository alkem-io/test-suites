import { TestUser } from '@alkemio/tests-lib';
import { graphqlRequestAuth } from '@alkemio/tests-lib/utils/graphql.request';

/**
 * Raw GraphQL operations for the adjustable-banner feature (server#6346,
 * client-web#10121, Release 71).
 *
 * These use `graphqlRequestAuth` rather than the generated client for the same
 * reason feature 029 does: the lib's committed codegen output predates the 6346
 * schema, so `UpdateVisualInput.aspectRatio` and
 * `Config.defaultVisualTypeConstraints` are not in the generated types yet.
 *
 * IMPORTANT — the two sources of truth are deliberately BOTH exposed here,
 * because the whole feature hinges on them being different things:
 *
 *   getVisualTypeConstraints()  reads the CONSTANTS
 *                               (DEFAULT_VISUAL_CONSTRAINTS, compiled in).
 *                               Correct whether or not the R71 data migration
 *                               `WidenSpaceBannerVisualConstraints` ever ran.
 *
 *   getSpaceBannerVisual()      reads the STORED ROW, which is what
 *                               VisualService.validateImageWidth/Height
 *                               actually enforces on upload. Only correct if
 *                               the migration ran.
 *
 * A deployment where the first is right and the second is stale is exactly the
 * "code shipped, migration didn't" failure mode, and it is invisible to any
 * check that looks at only one of them.
 *
 * By contrast `validateAspectRatio` reads the CONSTANTS, not the row — so the
 * ratio range works with or without the migration. That asymmetry is the point
 * of this file.
 */

/** Bounds for a visual TYPE, from the platform config (the constants). */
export const getVisualTypeConstraints = async (
  visualType: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'VisualTypeConstraints',
      query: `query VisualTypeConstraints($type: VisualType!) {
        platform {
          configuration {
            defaultVisualTypeConstraints(type: $type) {
              minWidth
              maxWidth
              minHeight
              maxHeight
              aspectRatio
              minAspectRatio
              maxAspectRatio
            }
          }
        }
      }`,
      variables: { type: visualType },
    },
    userRole
  );
};

/** A Space's BANNER visual as STORED (the row the upload validator reads). */
export const getSpaceBannerVisual = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'SpaceBannerVisual',
      query: `query SpaceBannerVisual($spaceId: UUID!) {
        lookup {
          space(ID: $spaceId) {
            about {
              profile {
                visual(type: BANNER) {
                  id
                  uri
                  aspectRatio
                  minWidth
                  maxWidth
                  minHeight
                  maxHeight
                }
              }
            }
          }
        }
      }`,
      variables: { spaceId },
    },
    userRole
  );
};

/**
 * Set a visual's aspect ratio. The mutation under test.
 *
 * NOTE: `UpdateVisualInput.uri` is `String!` — REQUIRED — so a caller that only
 * wants to change the shape must still round-trip the current uri. Omitting it
 * fails at GraphQL variable coercion (`BAD_USER_INPUT`) BEFORE any of the
 * server's own aspect-ratio validation runs, which makes a forgotten uri look
 * exactly like a rejected ratio. Hence `uri` is an explicit parameter here.
 */
export const updateVisualAspectRatio = async (
  visualID: string,
  aspectRatio: number,
  uri: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'UpdateVisualAspectRatio',
      query: `mutation UpdateVisualAspectRatio($updateData: UpdateVisualInput!) {
        updateVisual(updateData: $updateData) {
          id
          aspectRatio
        }
      }`,
      variables: { updateData: { visualID, aspectRatio, uri } },
    },
    userRole
  );
};

/**
 * A Space's activityScore (server#6326). Pass no `userRole` for an ANONYMOUS
 * request — that is the leak case the R71 risk profile calls out.
 */
export const getSpaceActivityScore = async (
  spaceId: string,
  userRole?: TestUser
) => {
  return graphqlRequestAuth(
    {
      operationName: 'SpaceActivityScore',
      query: `query SpaceActivityScore($spaceId: UUID!) {
        lookup {
          space(ID: $spaceId) {
            id
            activityScore
          }
        }
      }`,
      variables: { spaceId },
    },
    userRole
  );
};

/** The actor-scoped most-active ranking (server#6326). Anonymous when no role. */
export const getExploreSpaces = async (userRole?: TestUser, limit = 30) => {
  return graphqlRequestAuth(
    {
      operationName: 'ExploreSpaces',
      query: `query ExploreSpaces($limit: Float!) {
        exploreSpaces(options: { limit: $limit }) {
          id
          nameID
          activityScore
        }
      }`,
      variables: { limit },
    },
    userRole
  );
};

/** A callout's contributors map camera (server#6313 / workspace#034). */
export const updateCalloutMapView = async (
  calloutID: string,
  mapView: { longitude: number; latitude: number; zoom: number } | null,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'UpdateCalloutMapView',
      query: `mutation UpdateCalloutMapView($calloutData: UpdateCalloutEntityInput!) {
        updateCallout(calloutData: $calloutData) {
          id
          settings {
            framing {
              contributors {
                defaultView
                mapView { longitude latitude zoom }
              }
            }
          }
        }
      }`,
      variables: {
        calloutData: {
          ID: calloutID,
          settings: { framing: { contributors: { mapView } } },
        },
      },
    },
    userRole
  );
};

/** Read back a callout's stored contributors map camera. */
export const getCalloutMapView = async (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'CalloutMapView',
      query: `query CalloutMapView($calloutID: UUID!) {
        lookup {
          callout(ID: $calloutID) {
            id
            settings {
              framing {
                contributors { defaultView mapView { longitude latitude zoom } }
              }
            }
          }
        }
      }`,
      variables: { calloutID },
    },
    userRole
  );
};

/**
 * Create a CONTRIBUTORS-framed callout.
 *
 * The shared `createCalloutOnCalloutsSet` helper cannot do this: its
 * `settings.framing` only models `commentsEnabled`, while a CONTRIBUTORS callout
 * additionally requires `settings.framing.contributors.contributorTypes`
 * (non-null). Without the right framing type the `contributors` settings group
 * is never materialised and every mapView read returns null.
 */
export const createContributorsCallout = async (
  calloutsSetID: string,
  displayName: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  return graphqlRequestAuth(
    {
      operationName: 'CreateContributorsCallout',
      query: `mutation CreateContributorsCallout($calloutData: CreateCalloutOnCalloutsSetInput!) {
        createCalloutOnCalloutsSet(calloutData: $calloutData) { id }
      }`,
      variables: {
        calloutData: {
          calloutsSetID,
          framing: { profile: { displayName }, type: 'CONTRIBUTORS' },
          settings: {
            framing: {
              contributors: {
                contributorTypes: ['USER', 'ORGANIZATION'],
                defaultContributorType: 'USER',
                defaultView: 'MAP',
              },
            },
          },
        },
      },
    },
    userRole
  );
};
