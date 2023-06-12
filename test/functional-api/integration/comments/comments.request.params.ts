import { TestUser } from '@test/utils';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const postCommentInCallout = async (
  roomID: string,
  message: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const requestParams = {
    operationName: null,
    query: `mutation sendMessageToRoom($messageData: RoomSendMessageInput!) {
      sendMessageToRoom(messageData: $messageData) {
        id
        message
        sender {id nameID}
        timestamp
      }
    }`,
    variables: {
      messageData: {
        roomID,
        message,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, userRole);
};
