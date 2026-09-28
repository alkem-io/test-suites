import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import {
  CalloutFramingType,
  CreateCalloutOnCalloutsSetInput,
  SpaceCollectionCardVariant,
  UpdateCalloutEntityInput,
} from '@alkemio/tests-lib/core/generated/alkemio-schema';

/**
 * Creates a SPACES-framed (Subspaces collection) callout on a CalloutsSet,
 * optionally with the new card-variant settings block. Thin wrapper over the
 * generated CreateSpacesCollectionCallout SDK operation — callers pass only
 * the parts of CreateCalloutOnCalloutsSetInput they need for a given case.
 */
export const createSpacesCollectionCallout = (
  calloutData: CreateCalloutOnCalloutsSetInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.CreateSpacesCollectionCallout(
      { calloutData },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** Convenience wrapper: a SPACES callout with an explicit cardVariant. */
export const createSpacesCollectionCalloutWithVariant = (
  calloutsSetID: string,
  displayName: string,
  cardVariant?: SpaceCollectionCardVariant,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) =>
  createSpacesCollectionCallout(
    {
      calloutsSetID,
      framing: {
        type: CalloutFramingType.Spaces,
        profile: { displayName },
      },
      settings:
        cardVariant !== undefined
          ? { framing: { spaces: { cardVariant } } }
          : undefined,
    },
    userRole
  );

/**
 * Updates a callout's stored settings, optionally touching the card-variant
 * block. Thin wrapper over the generated UpdateCalloutSpacesSettings SDK
 * operation — callers pass only the parts of UpdateCalloutEntityInput they
 * need for a given case (e.g. `settings.framing.spaces: {}` for a no-op
 * partial write, or omitting `spaces` entirely).
 */
export const updateCalloutSpacesSettings = (
  calloutData: UpdateCalloutEntityInput,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.UpdateCalloutSpacesSettings(
      { calloutData },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/** Reads a callout's framing type and its settings.framing block (commentsEnabled, spaces, selection). */
export const getCalloutSpacesSettings = (
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetCalloutSpacesSettings(
      { calloutId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};
