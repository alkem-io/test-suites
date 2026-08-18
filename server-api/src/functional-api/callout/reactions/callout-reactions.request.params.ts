import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

/**
 * Adds or swaps the authenticated user's reaction on a callout.
 * Requires CONTRIBUTE permission on the callout; callout must be published and
 * not a template.
 */
export const addReactionToCallout = (
  calloutID: string,
  emoji: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AddReactionToCallout(
      { reactionData: { calloutID, emoji } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Removes the authenticated user's own reaction from a callout.
 * Idempotent: no error when the user has no reaction.
 */
export const removeReactionFromCallout = (
  calloutID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveReactionFromCallout(
      { reactionData: { calloutID } },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Fetches the tier-1 reactions summary for a callout (distinct emojis,
 * total distinct reactors, the requesting user's own choice, and the
 * allowed emoji set). Safe to call on feed renders — dataloader-batched.
 */
export const getCalloutReactionsSummary = (
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetCalloutReactionsSummary(
      { calloutId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};

/**
 * Fetches the tier-2 who-reacted list (bounded to 100 most recent, by last
 * change descending). Only call on demand — never in a feed loop.
 */
export const getCalloutReactions = (
  calloutId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.GetCalloutReactions(
      { calloutId },
      { authorization: `Bearer ${authToken}` }
    );
  return graphqlErrorWrapper(callback, userRole);
};
