import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const addReaction = async (
  roomID: string,
  messageID: string,
  emoji: any,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation addReactionToMessageInRoom($reactionData: RoomAddReactionToMessageInput!){
      addReactionToMessageInRoom(reactionData: $reactionData){
        id
        emoji
        sender{email}
      }
    }
    `,
    variables: {
      reactionData: {
        roomID,
        messageID,
        emoji,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};

export const removeReaction = async (
  reactionID: string,
  roomID: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeReactionToMessageInRoom($reactionData: RoomRemoveReactionToMessageInput!){
      removeReactionToMessageInRoom(reactionData: $reactionData)
    }
    `,
    variables: {
      reactionData: {
        reactionID,
        roomID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
