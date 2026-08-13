import { TestUser, testConfiguration } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { GraphQLClient } from 'graphql-request';

const graphqlClient = new GraphQLClient(
  testConfiguration.endPoints.graphql.private
);

// --- Response type shapes -----------------------------------------------

export interface CalloutReactionsSummary {
  total: number;
  emojis: string[];
  myReactionEmoji: string | null;
  allowedEmojis: string[];
}

export interface CalloutReactionUser {
  id: string;
  nameID: string;
  profile: { displayName: string };
}

export interface CalloutReactionItem {
  id: string;
  emoji: string;
  updatedDate: string;
  user?: CalloutReactionUser | null;
}

interface AddReactionResponse {
  addReactionToCallout: {
    id: string;
    reactionsSummary: CalloutReactionsSummary;
  };
}

interface RemoveReactionResponse {
  removeReactionFromCallout: {
    id: string;
    reactionsSummary: CalloutReactionsSummary;
  };
}

interface GetSummaryResponse {
  lookup: {
    callout: {
      id: string;
      reactionsSummary: CalloutReactionsSummary;
    } | null;
  };
}

interface GetReactionsResponse {
  lookup: {
    callout: {
      id: string;
      reactions: CalloutReactionItem[];
    } | null;
  };
}

// --- GraphQL document strings -------------------------------------------

const ADD_REACTION_MUTATION = /* GraphQL */ `
  mutation AddReactionToCallout($reactionData: AddReactionToCalloutInput!) {
    addReactionToCallout(reactionData: $reactionData) {
      id
      reactionsSummary {
        total
        emojis
        myReactionEmoji
        allowedEmojis
      }
    }
  }
`;

const REMOVE_REACTION_MUTATION = /* GraphQL */ `
  mutation RemoveReactionFromCallout($reactionData: RemoveReactionFromCalloutInput!) {
    removeReactionFromCallout(reactionData: $reactionData) {
      id
      reactionsSummary {
        total
        emojis
        myReactionEmoji
        allowedEmojis
      }
    }
  }
`;

const GET_SUMMARY_QUERY = /* GraphQL */ `
  query GetCalloutReactionsSummary($calloutId: UUID!) {
    lookup {
      callout(ID: $calloutId) {
        id
        reactionsSummary {
          total
          emojis
          myReactionEmoji
          allowedEmojis
        }
      }
    }
  }
`;

const GET_REACTIONS_QUERY = /* GraphQL */ `
  query GetCalloutReactions($calloutId: UUID!) {
    lookup {
      callout(ID: $calloutId) {
        id
        reactions {
          id
          emoji
          updatedDate
          user {
            id
            nameID
            profile {
              displayName
            }
          }
        }
      }
    }
  }
`;

// --- Helper to build auth headers --------------------------------------

const authHeaders = (authToken: string | undefined) =>
  authToken ? { authorization: `Bearer ${authToken}` } : undefined;

// --- Exported request helpers ------------------------------------------

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
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<AddReactionResponse>(
      ADD_REACTION_MUTATION,
      { reactionData: { calloutID, emoji } },
      authHeaders(authToken)
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
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<RemoveReactionResponse>(
      REMOVE_REACTION_MUTATION,
      { reactionData: { calloutID } },
      authHeaders(authToken)
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
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetSummaryResponse>(
      GET_SUMMARY_QUERY,
      { calloutId },
      authHeaders(authToken)
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
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetReactionsResponse>(
      GET_REACTIONS_QUERY,
      { calloutId },
      authHeaders(authToken)
    );
  return graphqlErrorWrapper(callback, userRole);
};

