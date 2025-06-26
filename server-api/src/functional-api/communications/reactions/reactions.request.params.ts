/* eslint-disable @typescript-eslint/no-explicit-any */
import { getGraphqlClient, TestUser } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';

export const addReaction = async (
  roomID: string,
  messageID: string,
  emoji: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.AddReactionToMessageInRoom(
      {
        reactionData: {
          roomID,
          messageID,
          emoji,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const removeReaction = async (
  reactionID: string,
  roomID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const graphqlClient = getGraphqlClient();
  const callback = (authToken: string | undefined) =>
    graphqlClient.RemoveReactionToMessageInRoom(
      {
        reactionData: {
          reactionID,
          roomID,
        },
      },
      {
        authorization: `Bearer ${authToken}`,
      }
    );

  return graphqlErrorWrapper(callback, userRole);
};
